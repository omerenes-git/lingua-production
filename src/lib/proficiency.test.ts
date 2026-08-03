import { describe, expect, it } from 'vitest';
import { cefrToIntensity, DEFAULT_CEFR_LEVEL, estimateCefrLevel } from './proficiency';
import { LearningItem, MasteryState, TargetLanguage } from '../types';

function makeItem(overrides: Partial<LearningItem> & { masteryState: MasteryState }): LearningItem {
  return {
    id: `item_${Math.random()}`,
    language: 'en',
    domain: 'general',
    turkishText: 'x',
    targetText: 'a short target sentence here',
    keyTermOrPattern: 'x',
    isActiveVocabulary: true,
    contextCount: 1,
    nextReviewDate: new Date().toISOString(),
    stability: 1,
    difficulty: 5,
    fossilizedCount: 0,
    ...overrides,
  };
}

describe('estimateCefrLevel', () => {
  it('returns no level (not "Yetersiz veri" text) when there is little production evidence yet', () => {
    const items = [makeItem({ masteryState: 'hint_producible' }), makeItem({ masteryState: 'new' })];
    const estimate = estimateCefrLevel(items, 'en');
    expect(estimate.level).toBeNull();
    expect(estimate.score).toBeNull();
    expect(estimate.confidence).toBe('Düşük');
  });

  it('only counts items for the requested language', () => {
    const items = Array.from({ length: 6 }, () => makeItem({ masteryState: 'independently_producible', language: 'de' as TargetLanguage }));
    const estimate = estimateCefrLevel(items, 'en');
    expect(estimate.level).toBeNull();
    expect(estimate.evidenceCount).toBe(0);
  });

  it('estimates a higher level as independent-production evidence grows', () => {
    const fewItems = Array.from({ length: 5 }, () => makeItem({ masteryState: 'hint_producible' }));
    const manyIndependent = Array.from({ length: 30 }, () =>
      makeItem({ masteryState: 'mastered', targetText: 'a considerably longer independently produced sentence example here' }),
    );

    const lowEstimate = estimateCefrLevel(fewItems, 'en');
    const highEstimate = estimateCefrLevel(manyIndependent, 'en');

    expect(lowEstimate.level).not.toBeNull();
    expect(highEstimate.level).not.toBeNull();
    const order: string[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    expect(order.indexOf(highEstimate.level!)).toBeGreaterThan(order.indexOf(lowEstimate.level!));
    expect(highEstimate.confidence).toBe('Orta');
  });
});

describe('cefrToIntensity', () => {
  it('maps A1/A2 to beginner, B1/B2 to intermediate, C1/C2 to advanced', () => {
    expect(cefrToIntensity('A1')).toBe('beginner');
    expect(cefrToIntensity('A2')).toBe('beginner');
    expect(cefrToIntensity('B1')).toBe('intermediate');
    expect(cefrToIntensity('B2')).toBe('intermediate');
    expect(cefrToIntensity('C1')).toBe('advanced');
    expect(cefrToIntensity('C2')).toBe('advanced');
  });

  it('the default level for brand-new learners maps to beginner', () => {
    expect(cefrToIntensity(DEFAULT_CEFR_LEVEL)).toBe('beginner');
  });
});
