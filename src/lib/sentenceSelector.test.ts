import { describe, expect, it } from 'vitest';
import { selectNextPrompt } from './sentenceSelector';
import { LearningItem, ProductionPrompt, TargetLanguage } from '../types';

function makePrompt(overrides: Partial<ProductionPrompt> & { id: string; language: TargetLanguage; targetReference: string }): ProductionPrompt {
  return {
    domain: 'general',
    turkishSentence: `Türkçe: ${overrides.id}`,
    targetVariants: [],
    keyTerms: [],
    hintLadder: {
      partOfSpeech: '',
      firstLetters: '',
      partialWords: '',
      patternHint: '',
      keyWordsGiven: '',
      fullAnswer: overrides.targetReference,
    },
    ...overrides,
  };
}

function makeItem(overrides: Partial<LearningItem> & { language: TargetLanguage; targetText: string; nextReviewDate: string }): LearningItem {
  return {
    id: `item_${overrides.targetText}`,
    domain: 'general',
    turkishText: 'x',
    keyTermOrPattern: 'x',
    masteryState: 'new',
    isActiveVocabulary: false,
    contextCount: 1,
    stability: 1,
    difficulty: 5,
    fossilizedCount: 0,
    ...overrides,
  };
}

function buildPool(language: TargetLanguage, count: number): ProductionPrompt[] {
  return Array.from({ length: count }, (_, i) =>
    makePrompt({ id: `${language}_${i}`, language, targetReference: `Sentence number ${i} in ${language}` }),
  );
}

describe('selectNextPrompt', () => {
  it('returns no_content when the filter matches nothing for the language', () => {
    const prompts = buildPool('en', 3);
    const result = selectNextPrompt({ prompts, language: 'de', domain: 'all', intensity: 'all', seenPromptIds: [], learningItems: [] });
    expect(result.status).toBe('no_content');
  });

  it('never repeats a prompt id already seen this session while unseen ones remain', () => {
    const prompts = buildPool('en', 5);
    const seen = new Set<string>();
    const shownOrder: string[] = [];

    for (let i = 0; i < 5; i += 1) {
      const result = selectNextPrompt({ prompts, language: 'en', domain: 'all', intensity: 'all', seenPromptIds: seen, learningItems: [] });
      expect(result.status).toBe('ok');
      if (result.status !== 'ok') throw new Error('unreachable');
      expect(seen.has(result.prompt.id)).toBe(false);
      seen.add(result.prompt.id);
      shownOrder.push(result.prompt.id);
    }

    expect(new Set(shownOrder).size).toBe(5);
  });

  it('reports pool_exhausted once every prompt in the filter has been seen this session', () => {
    const prompts = buildPool('en', 3);
    const seen = new Set(prompts.map((p) => p.id));
    const result = selectNextPrompt({ prompts, language: 'en', domain: 'all', intensity: 'all', seenPromptIds: seen, learningItems: [] });
    expect(result.status).toBe('pool_exhausted');
  });

  it('does not silently loop back to an already-shown prompt even with a hostile always-0 RNG', () => {
    const prompts = buildPool('en', 4);
    const seen = new Set<string>();
    for (let i = 0; i < 4; i += 1) {
      const result = selectNextPrompt({ prompts, language: 'en', domain: 'all', intensity: 'all', seenPromptIds: seen, learningItems: [], random: () => 0 });
      expect(result.status).toBe('ok');
      if (result.status !== 'ok') throw new Error('unreachable');
      expect(seen.has(result.prompt.id)).toBe(false);
      seen.add(result.prompt.id);
    }
    const final = selectNextPrompt({ prompts, language: 'en', domain: 'all', intensity: 'all', seenPromptIds: seen, learningItems: [], random: () => 0 });
    expect(final.status).toBe('pool_exhausted');
  });

  it('excludes a completed sentence until its FSRS nextReviewDate arrives (not-yet-due filtering)', () => {
    const prompts = buildPool('en', 2);
    const now = new Date('2026-01-01T12:00:00.000Z');
    const futureReview = new Date('2026-01-02T12:00:00.000Z').toISOString();
    const learningItems: LearningItem[] = [
      makeItem({ language: 'en', targetText: prompts[0].targetReference, nextReviewDate: futureReview }),
    ];

    const result = selectNextPrompt({
      prompts,
      language: 'en',
      domain: 'all',
      intensity: 'all',
      seenPromptIds: [],
      learningItems,
      now,
    });

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') throw new Error('unreachable');
    expect(result.prompt.id).toBe(prompts[1].id);
  });

  it('reports awaiting_schedule (not a silent repeat) when unseen prompts exist but none are due yet', () => {
    const prompts = buildPool('en', 1);
    const now = new Date('2026-01-01T12:00:00.000Z');
    const futureReview = new Date('2026-01-02T12:00:00.000Z').toISOString();
    const learningItems: LearningItem[] = [
      makeItem({ language: 'en', targetText: prompts[0].targetReference, nextReviewDate: futureReview }),
    ];

    const result = selectNextPrompt({ prompts, language: 'en', domain: 'all', intensity: 'all', seenPromptIds: [], learningItems, now });
    expect(result.status).toBe('awaiting_schedule');
    if (result.status !== 'awaiting_schedule') throw new Error('unreachable');
    expect(result.nextDueAt).toBe(futureReview);
  });

  it('makes a completed item eligible again once its scheduled review time has passed', () => {
    const prompts = buildPool('en', 1);
    const pastReview = new Date('2020-01-01T00:00:00.000Z').toISOString();
    const learningItems: LearningItem[] = [
      makeItem({ language: 'en', targetText: prompts[0].targetReference, nextReviewDate: pastReview }),
    ];

    const result = selectNextPrompt({ prompts, language: 'en', domain: 'all', intensity: 'all', seenPromptIds: [], learningItems, now: new Date('2026-01-01T00:00:00.000Z') });
    expect(result.status).toBe('ok');
  });

  it('treats minor punctuation/case/whitespace variants of an already-seen prompt as the same content', () => {
    const prompts: ProductionPrompt[] = [
      makePrompt({ id: 'a', language: 'en', targetReference: 'Excuse me, how can I get to the station?' }),
      makePrompt({ id: 'b', language: 'en', targetReference: '  excuse me how can i get to the station  ' }),
    ];
    const result = selectNextPrompt({ prompts, language: 'en', domain: 'all', intensity: 'all', seenPromptIds: ['a'], learningItems: [] });
    expect(result.status).toBe('pool_exhausted');
  });

  it('keeps English, German and Serbian selection fully independent', () => {
    const prompts = [...buildPool('en', 3), ...buildPool('de', 3), ...buildPool('sr', 3)];
    const seenEn = new Set(prompts.filter((p) => p.language === 'en').map((p) => p.id));

    const de = selectNextPrompt({ prompts, language: 'de', domain: 'all', intensity: 'all', seenPromptIds: seenEn, learningItems: [] });
    const sr = selectNextPrompt({ prompts, language: 'sr', domain: 'all', intensity: 'all', seenPromptIds: seenEn, learningItems: [] });

    expect(de.status).toBe('ok');
    expect(sr.status).toBe('ok');
  });

  it('runs a simulated 10-sentence session per language without repeats when the pool is large enough', () => {
    for (const language of ['en', 'de', 'sr'] as TargetLanguage[]) {
      const prompts = buildPool(language, 10);
      const seen = new Set<string>();
      const shown: string[] = [];
      for (let i = 0; i < 10; i += 1) {
        const result = selectNextPrompt({ prompts, language, domain: 'all', intensity: 'all', seenPromptIds: seen, learningItems: [] });
        expect(result.status).toBe('ok');
        if (result.status !== 'ok') throw new Error('unreachable');
        seen.add(result.prompt.id);
        shown.push(result.prompt.id);
      }
      expect(new Set(shown).size).toBe(10);
    }
  });

  it('a never-attempted prompt (no learning item yet) is always eligible', () => {
    const prompts = buildPool('en', 1);
    const result = selectNextPrompt({ prompts, language: 'en', domain: 'all', intensity: 'all', seenPromptIds: [], learningItems: [] });
    expect(result.status).toBe('ok');
  });

  it('filters by domain and intensity in addition to language', () => {
    const prompts: ProductionPrompt[] = [
      makePrompt({ id: 'a', language: 'en', domain: 'travel', intensityLevel: 'beginner', targetReference: 'Sentence A' }),
      makePrompt({ id: 'b', language: 'en', domain: 'clinical', intensityLevel: 'advanced', targetReference: 'Sentence B' }),
    ];
    const result = selectNextPrompt({ prompts, language: 'en', domain: 'travel', intensity: 'beginner', seenPromptIds: [], learningItems: [] });
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') throw new Error('unreachable');
    expect(result.prompt.id).toBe('a');
  });

  describe('preferredIntensity (soft "auto level" bias, distinct from the hard `intensity` filter)', () => {
    it('picks a prompt matching preferredIntensity over other eligible ones when intensity is unfiltered (\'all\')', () => {
      const prompts: ProductionPrompt[] = [
        makePrompt({ id: 'hard', language: 'en', intensityLevel: 'advanced', targetReference: 'Hard sentence' }),
        makePrompt({ id: 'easy', language: 'en', intensityLevel: 'beginner', targetReference: 'Easy sentence' }),
      ];
      // random() => 0 would pick index 0 of whatever pool is considered; with
      // no bias that's 'hard' (array order), so this only passes if the
      // preference actually narrows the pool to the beginner-tagged prompt.
      const result = selectNextPrompt({
        prompts,
        language: 'en',
        domain: 'all',
        intensity: 'all',
        preferredIntensity: 'beginner',
        seenPromptIds: [],
        learningItems: [],
        random: () => 0,
      });
      expect(result.status).toBe('ok');
      if (result.status !== 'ok') throw new Error('unreachable');
      expect(result.prompt.id).toBe('easy');
    });

    it('falls back to the full eligible set (never pool_exhausted) when nothing matches preferredIntensity', () => {
      const prompts: ProductionPrompt[] = [
        makePrompt({ id: 'a', language: 'en', intensityLevel: 'advanced', targetReference: 'Sentence A' }),
        makePrompt({ id: 'b', language: 'en', intensityLevel: 'intermediate', targetReference: 'Sentence B' }),
      ];
      const result = selectNextPrompt({
        prompts,
        language: 'en',
        domain: 'all',
        intensity: 'all',
        preferredIntensity: 'beginner',
        seenPromptIds: [],
        learningItems: [],
      });
      expect(result.status).toBe('ok');
    });

    it('does not change how many picks it takes to exhaust the pool compared to no preference at all', () => {
      const prompts = buildPool('en', 5);
      const withPreference = new Set<string>();
      for (let i = 0; i < 5; i += 1) {
        const result = selectNextPrompt({ prompts, language: 'en', domain: 'all', intensity: 'all', preferredIntensity: 'beginner', seenPromptIds: withPreference, learningItems: [] });
        expect(result.status).toBe('ok');
        if (result.status !== 'ok') throw new Error('unreachable');
        withPreference.add(result.prompt.id);
      }
      const exhausted = selectNextPrompt({ prompts, language: 'en', domain: 'all', intensity: 'all', preferredIntensity: 'beginner', seenPromptIds: withPreference, learningItems: [] });
      expect(exhausted.status).toBe('pool_exhausted');
    });

    it('is ignored when intensity is already filtered to a concrete level (no double-filtering)', () => {
      const prompts: ProductionPrompt[] = [
        makePrompt({ id: 'a', language: 'en', intensityLevel: 'intermediate', targetReference: 'Sentence A' }),
      ];
      const result = selectNextPrompt({
        prompts,
        language: 'en',
        domain: 'all',
        intensity: 'intermediate',
        preferredIntensity: 'beginner',
        seenPromptIds: [],
        learningItems: [],
      });
      expect(result.status).toBe('ok');
      if (result.status !== 'ok') throw new Error('unreachable');
      expect(result.prompt.id).toBe('a');
    });
  });
});
