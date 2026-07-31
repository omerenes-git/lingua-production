import { 
  AIEvaluationResult, 
  ConfidenceLevel, 
  ErrorSeverity, 
  FSRSRating, 
  MasteryState 
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

/**
 * Deterministik karar motoru: LEARNING_ENGINE.md §3 & §4
 * AI sadece kalite sinyali ve öneri verir; nihai rating ve fossilized error bayrağı
 * bu saf fonksiyon ile belirlenir.
 */
export function decideFinalRating(input: RatingDecisionInput): RatingDecisionOutput {
  const { aiResult, maxHintLevelUsed, confidence, responseTimeMs } = input;
  const { errorSeverity, suggestedRating } = aiResult;

  // Rule 1: Critical error + High confidence -> AGAIN & Fossilized Error
  if (errorSeverity === 'critical' && confidence === 'certain') {
    return {
      finalRating: 'again',
      isFossilizedError: true,
      reasonTr: 'Emin olunan kritik hata tespiti (Öğrenilmiş Yanlış). Kart sıfırlandı.',
    };
  }

  // Rule 2: Critical error
  if (errorSeverity === 'critical') {
    return {
      finalRating: 'again',
      isFossilizedError: false,
      reasonTr: 'Kritik anlam/dilbilgisi hatası nedeniyle kart baştan alınacak.',
    };
  }

  // Rule 3: Full word or answer hint used (Level 5 or 6)
  if (maxHintLevelUsed >= 5) {
    return {
      finalRating: 'again',
      isFossilizedError: false,
      reasonTr: 'Tam kelime/cevap ipucu kullanıldığı için kart tekrar edilecek.',
    };
  }

  // Rule 4: Moderate error
  if (errorSeverity === 'moderate') {
    return {
      finalRating: 'hard',
      isFossilizedError: confidence === 'certain',
      reasonTr: 'Orta seviye hata tespiti. Zor (Hard) seviye olarak zamanlandı.',
    };
  }

  // Rule 5: Partial hint used (Level 3 or 4)
  if (maxHintLevelUsed >= 3) {
    return {
      finalRating: 'hard',
      isFossilizedError: false,
      reasonTr: 'Kısmi ipucu yardımıyla doğru yanıt verildi. Zor (Hard) olarak işaretlendi.',
    };
  }

  // Rule 6: Minor error or Level 1-2 hint
  if (errorSeverity === 'minor' || (maxHintLevelUsed >= 1 && maxHintLevelUsed <= 2)) {
    return {
      finalRating: 'good',
      isFossilizedError: false,
      reasonTr: 'Küçük aksaklık veya hafif ipucuyla başarılı yanıt. Başarılı (Good) zamanlama.',
    };
  }

  // Rule 7: Style issue only + independent production
  if (errorSeverity === 'style_only' && maxHintLevelUsed === 0) {
    const isEasy = suggestedRating === 'easy' && responseTimeMs < 12000;
    return {
      finalRating: isEasy ? 'easy' : 'good',
      isFossilizedError: false,
      reasonTr: isEasy 
        ? 'Sadece üslup nüansı, hızlı ve bağımsız üretim. Kolay (Easy).' 
        : 'Üslup önerisi mevcut, başarılı bağımsız üretim.',
    };
  }

  // Rule 8: Perfect, hintless, fast
  if (maxHintLevelUsed === 0 && (errorSeverity === 'none' || errorSeverity === 'style_only')) {
    const isFast = responseTimeMs < 10000;
    const finalR = (suggestedRating === 'easy' || isFast) ? 'easy' : 'good';
    return {
      finalRating: finalR,
      isFossilizedError: false,
      reasonTr: `İpucusuz, bağımsız ve akıcı üretim! Nihai rating: ${finalR.toUpperCase()}.`,
    };
  }

  // Default fallback
  return {
    finalRating: suggestedRating || 'good',
    isFossilizedError: false,
    reasonTr: 'Otomatik değerlendirme tamamlandı.',
  };
}

/**
 * Mastery state transition rule engine (LEARNING_ENGINE.md §7)
 */
export function calculateNextMasteryState(
  currentState: MasteryState,
  finalRating: FSRSRating,
  hasHints: boolean,
  contextCount: number
): MasteryState {
  // If rating is 'again', demote one step
  if (finalRating === 'again') {
    if (currentState === 'mastered' || currentState === 'independently_producible') {
      return 'hint_producible';
    }
    if (currentState === 'hint_producible') {
      return 'recognized_in_context';
    }
    return currentState;
  }

  // Successful production without hints
  if (!hasHints && (finalRating === 'good' || finalRating === 'easy')) {
    if (contextCount >= 3 && currentState === 'independently_producible') {
      return 'mastered';
    }
    if (currentState === 'new' || currentState === 'noticed' || currentState === 'recognized_in_context' || currentState === 'hint_producible') {
      return 'independently_producible';
    }
  }

  // Successful production with hints
  if (hasHints && (finalRating === 'good' || finalRating === 'hard')) {
    if (currentState === 'new' || currentState === 'noticed' || currentState === 'recognized_in_context') {
      return 'hint_producible';
    }
  }

  return currentState;
}
