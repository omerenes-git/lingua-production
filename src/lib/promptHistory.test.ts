import { describe, expect, it } from 'vitest';
import {
  getPromptHistoryEntry,
  nextPromptPresentationAt,
  PROMPT_RESHOW_COOLDOWN_MS,
  readPromptHistory,
  recordPromptCompleted,
  recordPromptShown,
} from './promptHistory';

describe('prompt history', () => {
  it('records presentations and completions without losing either counter', () => {
    const shownAt = new Date('2026-08-05T08:00:00.000Z');
    const completedAt = new Date('2026-08-05T08:02:00.000Z');
    const afterShown = recordPromptShown({}, 'de', 'prompt-1', shownAt);
    const completed = recordPromptCompleted(afterShown, 'de', 'prompt-1', 'good', completedAt);
    const entry = getPromptHistoryEntry(completed, 'de', 'prompt-1');

    expect(entry).toMatchObject({ shownCount: 1, completedCount: 1, lastRating: 'good' });
    expect(entry?.lastShownAt).toBe(shownAt.toISOString());
    expect(entry?.lastCompletedAt).toBe(completedAt.toISOString());
  });

  it('keeps an unanswered prompt out for a full day', () => {
    const shownAt = new Date('2026-08-05T08:00:00.000Z');
    const history = recordPromptShown({}, 'en', 'prompt-1', shownAt);
    const entry = getPromptHistoryEntry(history, 'en', 'prompt-1');
    expect(nextPromptPresentationAt(entry)?.toISOString()).toBe(
      new Date(shownAt.getTime() + PROMPT_RESHOW_COOLDOWN_MS).toISOString(),
    );
  });

  it('sanitizes malformed persisted entries', () => {
    const parsed = readPromptHistory(JSON.stringify({
      'en::valid': {
        promptId: 'valid', language: 'en', shownCount: 2, lastShownAt: '2026-08-05T08:00:00.000Z', completedCount: 0,
      },
      broken: { promptId: 12 },
    }));
    expect(Object.keys(parsed)).toEqual(['en::valid']);
  });
});
