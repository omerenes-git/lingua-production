import { describe, expect, it } from 'vitest';
import { LearningItem } from '../types';
import { removeLegacyDemoLearningItems } from './progressData';

function item(id: string, targetText: string): LearningItem {
  return {
    id,
    language: 'en',
    domain: 'general',
    turkishText: '',
    targetText,
    keyTermOrPattern: targetText,
    masteryState: 'new',
    isActiveVocabulary: false,
    contextCount: 0,
    nextReviewDate: new Date(0).toISOString(),
    stability: 1,
    difficulty: 5,
    fossilizedCount: 0,
  };
}

describe('removeLegacyDemoLearningItems', () => {
  it('removes only the five known prototype demo signatures', () => {
    const result = removeLegacyDemoLearningItems([
      item('item_1', 'nearest subway station'),
      item('item_5', 'naći se u centru grada'),
      item('practice_en_1', 'A real sentence'),
    ]);
    expect(result.map((entry) => entry.id)).toEqual(['practice_en_1']);
  });

  it('preserves a real item that merely reuses a legacy-looking id', () => {
    expect(removeLegacyDemoLearningItems([item('item_1', 'My real imported phrase')])).toHaveLength(1);
  });
});
