import { FSRSRating, PromptHistory, PromptHistoryEntry, TargetLanguage } from '../types';

/** Skipped/unanswered prompts should not bounce back on the next app launch. */
export const PROMPT_RESHOW_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export function promptHistoryKey(language: TargetLanguage, promptId: string): string {
  return `${language}::${promptId}`;
}

export function getPromptHistoryEntry(
  history: PromptHistory,
  language: TargetLanguage,
  promptId: string,
): PromptHistoryEntry | undefined {
  return history[promptHistoryKey(language, promptId)];
}

export function recordPromptShown(
  history: PromptHistory,
  language: TargetLanguage,
  promptId: string,
  shownAt = new Date(),
): PromptHistory {
  const key = promptHistoryKey(language, promptId);
  const existing = history[key];
  return {
    ...history,
    [key]: {
      promptId,
      language,
      shownCount: Math.max(0, existing?.shownCount || 0) + 1,
      lastShownAt: shownAt.toISOString(),
      completedCount: Math.max(0, existing?.completedCount || 0),
      ...(existing?.lastCompletedAt ? { lastCompletedAt: existing.lastCompletedAt } : {}),
      ...(existing?.lastRating ? { lastRating: existing.lastRating } : {}),
    },
  };
}

export function recordPromptCompleted(
  history: PromptHistory,
  language: TargetLanguage,
  promptId: string,
  rating: FSRSRating,
  completedAt = new Date(),
): PromptHistory {
  const key = promptHistoryKey(language, promptId);
  const existing = history[key];
  const timestamp = completedAt.toISOString();
  return {
    ...history,
    [key]: {
      promptId,
      language,
      shownCount: Math.max(1, existing?.shownCount || 0),
      lastShownAt: existing?.lastShownAt || timestamp,
      completedCount: Math.max(0, existing?.completedCount || 0) + 1,
      lastCompletedAt: timestamp,
      lastRating: rating,
    },
  };
}

export function nextPromptPresentationAt(
  entry: PromptHistoryEntry | undefined,
  now = new Date(),
): Date | null {
  if (!entry || entry.completedCount > 0) return null;
  const shownAt = Date.parse(entry.lastShownAt);
  if (!Number.isFinite(shownAt)) return now;
  return new Date(shownAt + PROMPT_RESHOW_COOLDOWN_MS);
}

export function readPromptHistory(raw: string | null): PromptHistory {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const history: PromptHistory = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
      const entry = value as Partial<PromptHistoryEntry>;
      if (
        typeof entry.promptId !== 'string' ||
        !['en', 'de', 'sr'].includes(String(entry.language)) ||
        typeof entry.lastShownAt !== 'string'
      ) continue;
      history[key] = {
        promptId: entry.promptId,
        language: entry.language as TargetLanguage,
        shownCount: Math.max(0, Number(entry.shownCount) || 0),
        lastShownAt: entry.lastShownAt,
        completedCount: Math.max(0, Number(entry.completedCount) || 0),
        ...(typeof entry.lastCompletedAt === 'string' ? { lastCompletedAt: entry.lastCompletedAt } : {}),
        ...(['again', 'hard', 'good', 'easy'].includes(String(entry.lastRating))
          ? { lastRating: entry.lastRating as FSRSRating }
          : {}),
      };
    }
    return history;
  } catch {
    return {};
  }
}
