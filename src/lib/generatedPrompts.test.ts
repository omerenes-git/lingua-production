import { describe, expect, it } from 'vitest';
import { parseGeneratedPrompts, toGeneratedPrompt } from './generatedPrompts';

function validCandidate(overrides: Record<string, unknown> = {}) {
  return {
    domain: 'travel',
    intensityLevel: 'beginner',
    turkishSentence: 'Bagajımı nereye bırakabilirim?',
    targetReference: 'Where can I leave my luggage?',
    targetVariants: ['Where can I drop off my luggage?'],
    keyTerms: ['leave my luggage'],
    grammarPattern: 'Where can I + verb?',
    hintLadder: {
      partOfSpeech: 'Question',
      firstLetters: 'W... c... I... l...',
      partialWords: 'Whe... can I lea...',
      patternHint: 'Where can I + verb + object?',
      keyWordsGiven: 'where / can I / leave / luggage',
      fullAnswer: 'Where can I leave my luggage?',
    },
    ...overrides,
  };
}

describe('toGeneratedPrompt', () => {
  it('accepts a well-formed candidate and stamps an id namespaced by language', () => {
    const prompt = toGeneratedPrompt(validCandidate(), 'en', 'general', 'seed_0');
    expect(prompt).not.toBeNull();
    expect(prompt!.id).toBe('ai_en_seed_0');
    expect(prompt!.domain).toBe('travel');
    expect(prompt!.intensityLevel).toBe('beginner');
    expect(prompt!.targetReference).toBe('Where can I leave my luggage?');
    expect(prompt!.hintLadder.fullAnswer).toBe('Where can I leave my luggage?');
  });

  it('drops a candidate missing the target sentence', () => {
    expect(toGeneratedPrompt(validCandidate({ targetReference: '' }), 'en', 'general', 'seed_0')).toBeNull();
  });

  it('drops a candidate missing the Turkish prompt', () => {
    expect(toGeneratedPrompt(validCandidate({ turkishSentence: '   ' }), 'en', 'general', 'seed_0')).toBeNull();
  });

  it('falls back to the caller-provided domain when the AI returns an unrecognized one', () => {
    const prompt = toGeneratedPrompt(validCandidate({ domain: 'not-a-real-domain' }), 'en', 'clinical', 'seed_0');
    expect(prompt!.domain).toBe('clinical');
  });

  it('drops an unrecognized intensity level rather than fabricating one', () => {
    const prompt = toGeneratedPrompt(validCandidate({ intensityLevel: 'expert' }), 'en', 'general', 'seed_0');
    expect(prompt!.intensityLevel).toBeUndefined();
  });

  it('defaults the level-6 hint to the target sentence when the model omits it', () => {
    const prompt = toGeneratedPrompt(validCandidate({ hintLadder: { patternHint: 'x' } }), 'en', 'general', 'seed_0');
    expect(prompt!.hintLadder.fullAnswer).toBe('Where can I leave my luggage?');
  });

  it('returns null for non-object input', () => {
    expect(toGeneratedPrompt(null, 'en', 'general', 'seed_0')).toBeNull();
    expect(toGeneratedPrompt('a string', 'en', 'general', 'seed_0')).toBeNull();
  });
});

describe('parseGeneratedPrompts', () => {
  it('parses a batch of valid candidates', () => {
    const batch = [validCandidate(), validCandidate({ targetReference: 'Can you recommend a good restaurant nearby?', turkishSentence: 'Yakınlarda iyi bir restoran önerir misiniz?' })];
    const result = parseGeneratedPrompts(batch, { language: 'en', fallbackDomain: 'general', existingTargetTexts: [] });
    expect(result).toHaveLength(2);
  });

  it('drops a candidate that duplicates an already-existing prompt (case/punctuation-insensitive)', () => {
    const batch = [validCandidate({ targetReference: 'WHERE can i leave my luggage' })];
    const result = parseGeneratedPrompts(batch, {
      language: 'en',
      fallbackDomain: 'general',
      existingTargetTexts: ['Where can I leave my luggage?'],
    });
    expect(result).toHaveLength(0);
  });

  it('drops a duplicate that appears twice within the same batch', () => {
    const batch = [validCandidate(), validCandidate()];
    const result = parseGeneratedPrompts(batch, { language: 'en', fallbackDomain: 'general', existingTargetTexts: [] });
    expect(result).toHaveLength(1);
  });

  it('silently drops malformed entries instead of throwing', () => {
    const batch = [validCandidate(), null, 'garbage', { turkishSentence: 'eksik' }];
    const result = parseGeneratedPrompts(batch, { language: 'en', fallbackDomain: 'general', existingTargetTexts: [] });
    expect(result).toHaveLength(1);
  });

  it('returns an empty array when the raw payload is not an array', () => {
    expect(parseGeneratedPrompts(undefined, { language: 'en', fallbackDomain: 'general', existingTargetTexts: [] })).toEqual([]);
    expect(parseGeneratedPrompts({ prompts: [] }, { language: 'en', fallbackDomain: 'general', existingTargetTexts: [] })).toEqual([]);
  });

  it('produces distinct ids across a batch so React keys and prompt lookup never collide', () => {
    const batch = [
      validCandidate({ targetReference: 'Sentence A' }),
      validCandidate({ targetReference: 'Sentence B' }),
      validCandidate({ targetReference: 'Sentence C' }),
    ];
    const result = parseGeneratedPrompts(batch, { language: 'en', fallbackDomain: 'general', existingTargetTexts: [], idSeed: 'fixed-seed' });
    expect(new Set(result.map((p) => p.id)).size).toBe(3);
  });
});
