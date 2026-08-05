import { LearningItem } from '../types';
import { normalizeSentenceText } from './text';

/**
 * The first prototype shipped five showcase rows as if they were the user's
 * own progress. Match both id and text so a real imported row that happens to
 * reuse a short id is never removed.
 */
const LEGACY_DEMO_ITEM_SIGNATURES: Record<string, string> = {
  item_1: 'nearest subway station',
  item_2: 'spinal stability',
  item_3: 'stop the movement immediately',
  item_4: 'Café in der Nähe',
  item_5: 'naći se u centru grada',
};

export function isLegacyDemoLearningItem(item: Pick<LearningItem, 'id' | 'targetText'>): boolean {
  if (typeof item?.id !== 'string' || typeof item?.targetText !== 'string') return false;
  const expected = LEGACY_DEMO_ITEM_SIGNATURES[item.id];
  return Boolean(expected) && normalizeSentenceText(item.targetText) === normalizeSentenceText(expected);
}

export function removeLegacyDemoLearningItems(items: readonly LearningItem[]): LearningItem[] {
  return items.filter((item) => !isLegacyDemoLearningItem(item));
}
