import { describe, expect, it } from 'vitest';
import {
  DAILY_GOAL,
  calculateLanguageStreak,
  crossedDailyGoal,
  dailyHistoryKey,
  getDailyCount,
  incrementDailyCount,
  lastNDays,
} from './dailyProgress';

describe('dailyHistoryKey / getDailyCount / incrementDailyCount', () => {
  it('namespaces counts per language so languages never mix', () => {
    let history = {};
    history = incrementDailyCount(history, 'en', '2026-08-03');
    history = incrementDailyCount(history, 'en', '2026-08-03');
    history = incrementDailyCount(history, 'de', '2026-08-03');

    expect(getDailyCount(history, 'en', '2026-08-03')).toBe(2);
    expect(getDailyCount(history, 'de', '2026-08-03')).toBe(1);
    expect(getDailyCount(history, 'sr', '2026-08-03')).toBe(0);
  });

  it('leaves legacy un-namespaced date keys untouched (never deletes old data)', () => {
    const legacy = { '2026-08-01': 4 };
    const updated = incrementDailyCount(legacy, 'en', '2026-08-03');
    expect(updated['2026-08-01']).toBe(4);
    expect(updated[dailyHistoryKey('en', '2026-08-03')]).toBe(1);
  });

  it('increments are additive and each call increases the count by exactly one', () => {
    let history = {};
    for (let i = 0; i < 5; i += 1) history = incrementDailyCount(history, 'sr', '2026-08-03');
    expect(getDailyCount(history, 'sr', '2026-08-03')).toBe(5);
  });
});

describe('crossedDailyGoal', () => {
  it('is true only on the exact submission that reaches the goal', () => {
    expect(crossedDailyGoal(DAILY_GOAL - 1, DAILY_GOAL)).toBe(true);
  });

  it('is false before the goal is reached', () => {
    expect(crossedDailyGoal(0, 1)).toBe(false);
    expect(crossedDailyGoal(DAILY_GOAL - 2, DAILY_GOAL - 1)).toBe(false);
  });

  it('is false for every submission after the goal was already reached (fires once)', () => {
    expect(crossedDailyGoal(DAILY_GOAL, DAILY_GOAL + 1)).toBe(false);
    expect(crossedDailyGoal(DAILY_GOAL + 3, DAILY_GOAL + 4)).toBe(false);
  });

  it('simulated 10-sentence session crosses the goal exactly once', () => {
    let history = {};
    let crossings = 0;
    for (let i = 0; i < 10; i += 1) {
      const before = getDailyCount(history, 'en', '2026-08-03');
      history = incrementDailyCount(history, 'en', '2026-08-03');
      const after = getDailyCount(history, 'en', '2026-08-03');
      if (crossedDailyGoal(before, after)) crossings += 1;
    }
    expect(crossings).toBe(1);
  });
});

describe('calculateLanguageStreak', () => {
  it('counts consecutive days ending today for one language only', () => {
    const today = new Date('2026-08-03T10:00:00.000Z');
    let history = {};
    history = incrementDailyCount(history, 'en', '2026-08-03');
    history = incrementDailyCount(history, 'en', '2026-08-02');
    history = incrementDailyCount(history, 'en', '2026-08-01');
    // A German entry on a day English has none must not extend the English streak.
    history = incrementDailyCount(history, 'de', '2026-07-31');

    expect(calculateLanguageStreak(history, 'en', today)).toBe(3);
    expect(calculateLanguageStreak(history, 'de', today)).toBe(0);
  });

  it('breaks the streak on a gap day', () => {
    const today = new Date('2026-08-03T10:00:00.000Z');
    let history = {};
    history = incrementDailyCount(history, 'en', '2026-08-03');
    history = incrementDailyCount(history, 'en', '2026-08-01'); // gap on 08-02
    expect(calculateLanguageStreak(history, 'en', today)).toBe(1);
  });
});

describe('lastNDays', () => {
  it('returns n ascending ISO date strings ending at the reference date', () => {
    const days = lastNDays(3, new Date('2026-08-03T00:00:00.000Z'));
    expect(days).toEqual(['2026-08-01', '2026-08-02', '2026-08-03']);
  });
});
