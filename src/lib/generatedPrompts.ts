import { Domain, IntensityLevel, ProductionPrompt, TargetLanguage } from '../types';
import { normalizeSentenceText } from './text';

const VALID_DOMAINS: readonly Domain[] = ['clinical', 'general', 'travel', 'ielts', 'social', 'family'];
const VALID_INTENSITIES: readonly IntensityLevel[] = ['beginner', 'intermediate', 'advanced'];

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    : [];
}

function hintField(hintLadder: Record<string, unknown>, key: string, fallback: string): string {
  const value = hintLadder[key];
  return typeof value === 'string' && value.trim() ? value : fallback;
}

/**
 * Converts one AI-returned candidate into a ProductionPrompt, or null if it's
 * missing a field a prompt can't function without. Never throws — a
 * malformed candidate is dropped so one bad item doesn't fail the whole
 * generation batch.
 */
export function toGeneratedPrompt(
  raw: unknown,
  language: TargetLanguage,
  fallbackDomain: Domain,
  idSeed: string,
): ProductionPrompt | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  const turkishSentence = typeof value.turkishSentence === 'string' ? value.turkishSentence.trim() : '';
  const targetReference = typeof value.targetReference === 'string' ? value.targetReference.trim() : '';
  if (!turkishSentence || !targetReference) return null;

  const domain = VALID_DOMAINS.includes(value.domain as Domain) ? (value.domain as Domain) : fallbackDomain;
  const intensityLevel = VALID_INTENSITIES.includes(value.intensityLevel as IntensityLevel)
    ? (value.intensityLevel as IntensityLevel)
    : undefined;
  const hintLadderRaw =
    value.hintLadder && typeof value.hintLadder === 'object' ? (value.hintLadder as Record<string, unknown>) : {};
  const grammarPattern = typeof value.grammarPattern === 'string' ? value.grammarPattern.trim() : '';

  return {
    id: `ai_${language}_${idSeed}`,
    language,
    domain,
    ...(intensityLevel ? { intensityLevel } : {}),
    turkishSentence,
    targetReference,
    targetVariants: asStringArray(value.targetVariants),
    keyTerms: asStringArray(value.keyTerms),
    ...(grammarPattern ? { grammarPattern } : {}),
    hintLadder: {
      partOfSpeech: hintField(hintLadderRaw, 'partOfSpeech', ''),
      firstLetters: hintField(hintLadderRaw, 'firstLetters', ''),
      partialWords: hintField(hintLadderRaw, 'partialWords', ''),
      patternHint: hintField(hintLadderRaw, 'patternHint', ''),
      keyWordsGiven: hintField(hintLadderRaw, 'keyWordsGiven', ''),
      fullAnswer: hintField(hintLadderRaw, 'fullAnswer', targetReference),
    },
  };
}

export interface ParseGeneratedPromptsArgs {
  language: TargetLanguage;
  fallbackDomain: Domain;
  /** Normalized-or-not target texts already in the pool; duplicates of these are dropped. */
  existingTargetTexts: Iterable<string>;
  idSeed?: string;
}

/**
 * Parses a raw AI response batch into valid, de-duplicated ProductionPrompts.
 * Drops anything that duplicates (by normalized text) a prompt already in
 * `existingTargetTexts` or an earlier candidate in the same batch — "unlimited
 * variety" only means something if repeats actually get filtered out here.
 */
export function parseGeneratedPrompts(rawList: unknown, args: ParseGeneratedPromptsArgs): ProductionPrompt[] {
  const list = Array.isArray(rawList) ? rawList : [];
  const seen = new Set(Array.from(args.existingTargetTexts, (text) => normalizeSentenceText(text)));
  const seed = args.idSeed ?? String(Date.now());
  const result: ProductionPrompt[] = [];

  list.forEach((entry, index) => {
    const prompt = toGeneratedPrompt(entry, args.language, args.fallbackDomain, `${seed}_${index}`);
    if (!prompt) return;
    const normalized = normalizeSentenceText(prompt.targetReference);
    if (seen.has(normalized)) return;
    seen.add(normalized);
    result.push(prompt);
  });

  return result;
}
