import {
  Domain,
  IntensityLevel,
  LearningItem,
  ProductionPrompt,
  PromptHistory,
  TargetLanguage,
} from '../types';
import { getPromptHistoryEntry, nextPromptPresentationAt } from './promptHistory';
import { normalizeSentenceText } from './text';

export interface SelectPromptArgs {
  prompts: readonly ProductionPrompt[];
  language: TargetLanguage;
  domain: Domain | 'all';
  intensity: IntensityLevel | 'all';
  /** Prompt ids already shown to the user during the current practice session (this language). */
  seenPromptIds: ReadonlySet<string> | readonly string[];
  /** Full learning-item store; only entries for `language` are consulted. */
  learningItems: readonly LearningItem[];
  /** Durable, cross-device history for exact prompts. */
  promptHistory?: PromptHistory;
  now?: Date;
  /** Injectable RNG (0 <= x < 1) so tests can make selection deterministic. */
  random?: () => number;
  /**
   * Soft difficulty bias for the "auto" level mode: when at least one
   * eligible prompt matches this intensity, only those are considered for
   * this pick. Unlike `intensity`, this never removes content outright — if
   * nothing eligible matches, selection falls back to the full eligible set.
   */
  preferredIntensity?: IntensityLevel;
}

export type SelectPromptResult =
  /** A prompt was chosen; safe to show. */
  | { status: 'ok'; prompt: ProductionPrompt }
  /** The domain/intensity filter matches zero prompts for this language at all. */
  | { status: 'no_content' }
  /** Every prompt for this filter has already been shown this session. */
  | { status: 'pool_exhausted' }
  /** Unanswered prompts exist but their schedule/presentation cooldown has not elapsed. */
  | { status: 'awaiting_schedule'; nextDueAt: string }
  /** Every exact sentence in this filter was already completed; a new context is required. */
  | { status: 'needs_fresh_content' };

function learningItemKey(language: TargetLanguage, text: string): string {
  return `${language}::${normalizeSentenceText(text)}`;
}

function buildLearningItemIndex(
  learningItems: readonly LearningItem[],
  language: TargetLanguage,
): Map<string, LearningItem> {
  const index = new Map<string, LearningItem>();
  for (const item of learningItems) {
    if (item.language !== language) continue;
    index.set(learningItemKey(item.language, item.targetText), item);
  }
  return index;
}

function isDue(prompt: ProductionPrompt, index: Map<string, LearningItem>, now: Date): boolean {
  const item = index.get(learningItemKey(prompt.language, prompt.targetReference));
  if (!item) return true;
  const dueAt = Date.parse(item.nextReviewDate);
  return !Number.isFinite(dueAt) || dueAt <= now.getTime();
}

function hasExactCompletionEvidence(
  prompt: ProductionPrompt,
  index: Map<string, LearningItem>,
  history: PromptHistory,
): boolean {
  const historyEntry = getPromptHistoryEntry(history, prompt.language, prompt.id);
  if ((historyEntry?.completedCount || 0) > 0) return true;

  // Prompt history was introduced after the first production build. Existing
  // real attempts can be migrated without replaying them because practice
  // items carry a deterministic id prefix and/or a scheduler rating.
  const item = index.get(learningItemKey(prompt.language, prompt.targetReference));
  return Boolean(item?.lastRating || item?.id.startsWith('practice_'));
}

/**
 * Picks the next production prompt for a practice session.
 *
 * Exact completed sentences are never served again as fresh practice; their
 * vocabulary/pattern must return in a newly generated context. Skipped
 * prompts receive a 24-hour cooldown across app restarts, and globally new
 * prompts are preferred so a small random subset cannot dominate each day.
 */
export function selectNextPrompt(args: SelectPromptArgs): SelectPromptResult {
  const {
    prompts,
    language,
    domain,
    intensity,
    learningItems,
    promptHistory = {},
    now = new Date(),
    random = Math.random,
    preferredIntensity,
  } = args;
  const seenIds = args.seenPromptIds instanceof Set ? args.seenPromptIds : new Set(args.seenPromptIds);

  const filtered = prompts.filter(
    (prompt) =>
      prompt.language === language &&
      (domain === 'all' || prompt.domain === domain) &&
      (intensity === 'all' || !prompt.intensityLevel || prompt.intensityLevel === intensity),
  );
  if (filtered.length === 0) return { status: 'no_content' };

  const seenNormalizedTexts = new Set(
    filtered
      .filter((prompt) => seenIds.has(prompt.id))
      .map((prompt) => normalizeSentenceText(prompt.targetReference)),
  );
  const unseenThisSession = filtered.filter(
    (prompt) =>
      !seenIds.has(prompt.id) &&
      !seenNormalizedTexts.has(normalizeSentenceText(prompt.targetReference)),
  );
  if (unseenThisSession.length === 0) return { status: 'pool_exhausted' };

  const learningIndex = buildLearningItemIndex(learningItems, language);
  const incompleteExactPrompts = unseenThisSession.filter(
    (prompt) => !hasExactCompletionEvidence(prompt, learningIndex, promptHistory),
  );
  if (incompleteExactPrompts.length === 0) return { status: 'needs_fresh_content' };

  const scheduled = incompleteExactPrompts.filter((prompt) => isDue(prompt, learningIndex, now));
  const eligible = scheduled.filter((prompt) => {
    const availableAt = nextPromptPresentationAt(
      getPromptHistoryEntry(promptHistory, prompt.language, prompt.id),
      now,
    );
    return !availableAt || availableAt.getTime() <= now.getTime();
  });

  if (eligible.length > 0) {
    const globallyNew = eligible.filter((prompt) => {
      const entry = getPromptHistoryEntry(promptHistory, prompt.language, prompt.id);
      return !entry || entry.shownCount === 0;
    });
    const noveltyPool = globallyNew.length > 0 ? globallyNew : eligible;
    const preferred = preferredIntensity
      ? noveltyPool.filter((prompt) => !prompt.intensityLevel || prompt.intensityLevel === preferredIntensity)
      : [];
    const pool = preferred.length > 0 ? preferred : noveltyPool;
    const selectedIndex = Math.min(pool.length - 1, Math.floor(random() * pool.length));
    return { status: 'ok', prompt: pool[selectedIndex] };
  }

  let nextDueAt: string | null = null;
  const considerDueAt = (candidate: string) => {
    if (!nextDueAt || Date.parse(candidate) < Date.parse(nextDueAt)) nextDueAt = candidate;
  };
  for (const prompt of incompleteExactPrompts) {
    const item = learningIndex.get(learningItemKey(prompt.language, prompt.targetReference));
    if (item && Number.isFinite(Date.parse(item.nextReviewDate)) && Date.parse(item.nextReviewDate) > now.getTime()) {
      considerDueAt(item.nextReviewDate);
    }
    const presentationAt = nextPromptPresentationAt(
      getPromptHistoryEntry(promptHistory, prompt.language, prompt.id),
      now,
    );
    if (presentationAt && presentationAt.getTime() > now.getTime()) considerDueAt(presentationAt.toISOString());
  }
  return { status: 'awaiting_schedule', nextDueAt: nextDueAt ?? now.toISOString() };
}
