import { TargetLanguage } from '../types';

/**
 * Daily practice counters used to be a flat `{ [date]: count }` map shared by
 * every target language, which silently merged English/German/Serbian
 * progress into one number. Keys are now namespaced per language
 * (`${language}::${date}`). Old un-namespaced date keys are left untouched
 * in storage (never deleted) but are no longer read by the UI.
 */
export type DailyHistory = Record<string, number>;

export const DAILY_GOAL = 5;

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function dailyHistoryKey(language: TargetLanguage, date: string): string {
  return `${language}::${date}`;
}

export function getDailyCount(history: DailyHistory, language: TargetLanguage, date: string): number {
  return history[dailyHistoryKey(language, date)] || 0;
}

export function incrementDailyCount(history: DailyHistory, language: TargetLanguage, date: string): DailyHistory {
  const key = dailyHistoryKey(language, date);
  return { ...history, [key]: (history[key] || 0) + 1 };
}

export function calculateLanguageStreak(history: DailyHistory, language: TargetLanguage, referenceDate = new Date()): number {
  let streak = 0;
  const cursor = new Date(referenceDate);
  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (getDailyCount(history, language, key) <= 0) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function lastNDays(n: number, referenceDate = new Date()): string[] {
  const days: string[] = [];
  for (let offset = n - 1; offset >= 0; offset -= 1) {
    const day = new Date(referenceDate);
    day.setDate(day.getDate() - offset);
    days.push(day.toISOString().slice(0, 10));
  }
  return days;
}

/** True only on the exact submission that pushes today's count from below the goal to at/above it. */
export function crossedDailyGoal(previousCount: number, newCount: number, goal = DAILY_GOAL): boolean {
  return previousCount < goal && newCount >= goal;
}
