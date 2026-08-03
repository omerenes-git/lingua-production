import { Domain, IntensityLevel, LearningItem, ProductionPrompt, TargetLanguage } from '../types';
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
  now?: Date;
  /** Injectable RNG (0 <= x < 1) so tests can make selection deterministic. */
  random?: () => number;
}

export type SelectPromptResult =
  /** A prompt was chosen; safe to show. */
  | { status: 'ok'; prompt: ProductionPrompt }
  /** The domain/intensity filter matches zero prompts for this language at all. */
  | { status: 'no_content' }
  /** Every prompt for this filter has already been shown this session and none are due again. */
  | { status: 'pool_exhausted' }
  /** Unseen prompts exist but their scheduled review time hasn't arrived yet. */
  | { status: 'awaiting_schedule'; nextDueAt: string };

function learningItemKey(language: TargetLanguage, text: string): string {
  return `${language}::${normalizeSentenceText(text)}`;
}

function buildLearningItemIndex(learningItems: readonly LearningItem[], language: TargetLanguage): Map<string, LearningItem> {
  const index = new Map<string, LearningItem>();
  for (const item of learningItems) {
    if (item.language !== language) continue;
    index.set(learningItemKey(item.language, item.targetText), item);
  }
  return index;
}

function isDue(prompt: ProductionPrompt, index: Map<string, LearningItem>, now: Date): boolean {
  const item = index.get(learningItemKey(prompt.language, prompt.targetReference));
  if (!item) return true; // never attempted before -> always eligible
  const dueAt = Date.parse(item.nextReviewDate);
  return !Number.isFinite(dueAt) || dueAt <= now.getTime();
}

/**
 * Picks the next production prompt for a practice session.
 *
 * Filters out (in order): content outside the selected domain/intensity,
 * prompts already shown this session, prompts whose normalized text matches
 * one already shown this session (near-duplicate content under a different
 * id), and prompts whose FSRS `nextReviewDate` hasn't arrived yet. Never
 * silently loops back to already-seen content — callers must render the
 * `pool_exhausted` / `awaiting_schedule` states explicitly instead of
 * re-showing a prompt.
 */
export function selectNextPrompt(args: SelectPromptArgs): SelectPromptResult {
  const { prompts, language, domain, intensity, learningItems, now = new Date(), random = Math.random } = args;
  const seenIds = args.seenPromptIds instanceof Set ? args.seenPromptIds : new Set(args.seenPromptIds);

  const filtered = prompts.filter(
    (p) =>
      p.language === language &&
      (domain === 'all' || p.domain === domain) &&
      (intensity === 'all' || !p.intensityLevel || p.intensityLevel === intensity),
  );
  if (filtered.length === 0) return { status: 'no_content' };

  const seenNormalizedTexts = new Set(
    filtered.filter((p) => seenIds.has(p.id)).map((p) => normalizeSentenceText(p.targetReference)),
  );

  const unseen = filtered.filter(
    (p) => !seenIds.has(p.id) && !seenNormalizedTexts.has(normalizeSentenceText(p.targetReference)),
  );
  if (unseen.length === 0) return { status: 'pool_exhausted' };

  const learningIndex = buildLearningItemIndex(learningItems, language);
  const eligible = unseen.filter((p) => isDue(p, learningIndex, now));

  if (eligible.length > 0) {
    const index = Math.min(eligible.length - 1, Math.floor(random() * eligible.length));
    return { status: 'ok', prompt: eligible[index] };
  }

  let nextDueAt: string | null = null;
  for (const p of unseen) {
    const item = learningIndex.get(learningItemKey(p.language, p.targetReference));
    if (!item) continue;
    if (!nextDueAt || Date.parse(item.nextReviewDate) < Date.parse(nextDueAt)) nextDueAt = item.nextReviewDate;
  }
  return { status: 'awaiting_schedule', nextDueAt: nextDueAt ?? now.toISOString() };
}
