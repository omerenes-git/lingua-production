import {
  AIEvaluationResult,
  ConfidenceLevel,
  FSRSRating,
  LearningItem,
  MasteryState,
} from '../types';

export interface RatingDecisionInput {
  aiResult: AIEvaluationResult;
  maxHintLevelUsed: number;
  confidence: ConfidenceLevel;
  responseTimeMs: number;
}

export interface RatingDecisionOutput {
  finalRating: FSRSRating;
  isFossilizedError: boolean;
  reasonTr: string;
}

export interface ReviewScheduleUpdate {
  stability: number;
  difficulty: number;
  nextReviewDate: string;
  lastRating: FSRSRating;
}

export function decideFinalRating(input: RatingDecisionInput): RatingDecisionOutput {
  const { aiResult, maxHintLevelUsed, confidence, responseTimeMs } = input;
  const { errorSeverity, suggestedRating } = aiResult;

  if (errorSeverity === 'critical' && confidence === 'certain') {
    return { finalRating: 'again', isFossilizedError: true, reasonTr: 'Emin olunan kritik hata tespiti. Kart kısa aralıkla tekrar edilecek.' };
  }
  if (errorSeverity === 'critical') {
    return { finalRating: 'again', isFossilizedError: false, reasonTr: 'Kritik hata nedeniyle kart kısa aralıkla tekrar edilecek.' };
  }
  if (maxHintLevelUsed >= 5) {
    return { finalRating: 'again', isFossilizedError: false, reasonTr: 'Tam kelime veya cevap ipucu kullanıldığı için kart tekrar edilecek.' };
  }
  if (errorSeverity === 'moderate') {
    return { finalRating: 'hard', isFossilizedError: confidence === 'certain', reasonTr: 'Orta düzey hata nedeniyle zor olarak zamanlandı.' };
  }
  if (maxHintLevelUsed >= 3) {
    return { finalRating: 'hard', isFossilizedError: false, reasonTr: 'Kısmi ipucuyla üretildiği için zor olarak zamanlandı.' };
  }
  if (errorSeverity === 'minor' || (maxHintLevelUsed >= 1 && maxHintLevelUsed <= 2)) {
    return { finalRating: 'good', isFossilizedError: false, reasonTr: 'Küçük hata veya hafif ipucuyla başarılı üretim.' };
  }
  if (errorSeverity === 'style_only' && maxHintLevelUsed === 0) {
    const isEasy = suggestedRating === 'easy' && responseTimeMs < 12000;
    return { finalRating: isEasy ? 'easy' : 'good', isFossilizedError: false, reasonTr: isEasy ? 'Hızlı ve bağımsız üretim.' : 'Başarılı bağımsız üretim.' };
  }
  if (maxHintLevelUsed === 0 && (errorSeverity === 'none' || errorSeverity === 'style_only')) {
    const finalRating: FSRSRating = suggestedRating === 'easy' || responseTimeMs < 10000 ? 'easy' : 'good';
    return { finalRating, isFossilizedError: false, reasonTr: `İpucusuz başarılı üretim: ${finalRating.toUpperCase()}.` };
  }
  return { finalRating: suggestedRating || 'good', isFossilizedError: false, reasonTr: 'Otomatik değerlendirme tamamlandı.' };
}

export function calculateNextMasteryState(
  currentState: MasteryState,
  finalRating: FSRSRating,
  hasHints: boolean,
  contextCount: number,
): MasteryState {
  if (finalRating === 'again') {
    if (currentState === 'mastered' || currentState === 'independently_producible') return 'hint_producible';
    if (currentState === 'hint_producible') return 'recognized_in_context';
    return currentState;
  }

  if (!hasHints && (finalRating === 'good' || finalRating === 'easy')) {
    if (contextCount >= 3 && currentState === 'independently_producible') return 'mastered';
    if (['new', 'noticed', 'recognized_in_context', 'hint_producible'].includes(currentState)) return 'independently_producible';
  }

  if (hasHints && (finalRating === 'good' || finalRating === 'hard')) {
    if (['new', 'noticed', 'recognized_in_context'].includes(currentState)) return 'hint_producible';
  }

  return currentState;
}

/**
 * Deterministic spaced-repetition scheduler using FSRS concepts (stability and
 * difficulty). This is intentionally a transparent local approximation rather
 * than a claim of implementing the full upstream FSRS reference algorithm.
 */
export function scheduleReview(item: Pick<LearningItem, 'stability' | 'difficulty'>, rating: FSRSRating, now = new Date()): ReviewScheduleUpdate {
  const previousStability = Math.max(0.2, Number(item.stability) || 1);
  const previousDifficulty = Math.min(10, Math.max(1, Number(item.difficulty) || 5));

  const difficultyDelta: Record<FSRSRating, number> = {
    again: 1.2,
    hard: 0.35,
    good: -0.25,
    easy: -0.65,
  };
  const difficulty = Math.min(10, Math.max(1, previousDifficulty + difficultyDelta[rating]));

  let stability: number;
  let intervalDays: number;
  if (rating === 'again') {
    stability = Math.max(0.25, previousStability * 0.45);
    intervalDays = 10 / (24 * 60); // 10 minutes
  } else if (rating === 'hard') {
    stability = Math.max(0.5, previousStability * 1.2);
    intervalDays = Math.max(1, Math.round(stability * 0.8));
  } else if (rating === 'good') {
    stability = Math.max(1, previousStability * (1.8 + (10 - difficulty) * 0.04));
    intervalDays = Math.max(1, Math.round(stability));
  } else {
    stability = Math.max(2, previousStability * (2.5 + (10 - difficulty) * 0.06));
    intervalDays = Math.max(2, Math.round(stability * 1.3));
  }

  const nextReview = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  return {
    stability: Number(stability.toFixed(2)),
    difficulty: Number(difficulty.toFixed(2)),
    nextReviewDate: nextReview.toISOString(),
    lastRating: rating,
  };
}
