import { IntensityLevel, LearningItem, TargetLanguage } from '../types';

export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface CefrEstimate {
  /** null means there is not yet enough production evidence to estimate a level. */
  level: CefrLevel | null;
  confidence: 'Düşük' | 'Orta';
  score: number | null;
  evidenceCount: number;
}

const MIN_EVIDENCE_FOR_ESTIMATE = 5;
const HIGH_CONFIDENCE_EVIDENCE = 30;

/**
 * A brand-new learner (or one who keeps making mistakes and never
 * accumulates independent production evidence) starts here — never on
 * intermediate/advanced content by default. This is the one constant that
 * keeps "başlangıçta çok zor cümleler çıkmasın" true even when nothing has
 * been produced yet.
 */
export const DEFAULT_CEFR_LEVEL: CefrLevel = 'A1';

/**
 * Same in-app proficiency estimate used for the İlerleme tab's "Tahmini
 * CEFR" card, reused here so Üret content selection and the progress
 * display never disagree about what level the learner is at. Deliberately
 * not a calibrated CEFR test — see İlerleme tab copy for that disclaimer.
 */
export function estimateCefrLevel(items: readonly LearningItem[], language: TargetLanguage): CefrEstimate {
  const langItems = items.filter((item) => item.language === language);
  const producedItems = langItems.filter((item) =>
    ['hint_producible', 'independently_producible', 'mastered'].includes(item.masteryState),
  );
  const independentItems = langItems.filter((item) =>
    ['independently_producible', 'mastered'].includes(item.masteryState),
  );

  const evidenceCount = producedItems.length;
  if (evidenceCount < MIN_EVIDENCE_FOR_ESTIMATE) {
    return { level: null, confidence: 'Düşük', score: null, evidenceCount };
  }

  const averageWords =
    producedItems.reduce((sum, item) => sum + item.targetText.trim().split(/\s+/).filter(Boolean).length, 0) /
    evidenceCount;
  const independentRatio = independentItems.length / evidenceCount;
  const score = Math.min(100, Math.round(evidenceCount * 1.5 + averageWords * 4 + independentRatio * 35));
  const level: CefrLevel =
    score < 25 ? 'A1' : score < 42 ? 'A2' : score < 60 ? 'B1' : score < 78 ? 'B2' : score < 92 ? 'C1' : 'C2';
  const confidence = evidenceCount >= HIGH_CONFIDENCE_EVIDENCE ? 'Orta' : 'Düşük';
  return { level, confidence, score, evidenceCount };
}

/** Maps the six-step CEFR ladder onto the three Üret intensity buckets. */
export function cefrToIntensity(level: CefrLevel): IntensityLevel {
  if (level === 'A1' || level === 'A2') return 'beginner';
  if (level === 'B1' || level === 'B2') return 'intermediate';
  return 'advanced';
}
