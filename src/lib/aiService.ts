import { AIEvaluationResult, IntensityLevel, RegisterOption, TargetLanguage } from '../types';
import { callLinguaApi } from './linguaApi';

export const AI_SERVICE_UNAVAILABLE_MARKER = '__AI_SERVICE_UNAVAILABLE__';

export interface EvaluateRequest {
  language: TargetLanguage;
  turkishPrompt: string;
  targetReference: string;
  userAnswer: string;
  hintsUsedCount: number;
  intensityLevel?: IntensityLevel;
}

function unavailableEvaluation(message: string): AIEvaluationResult {
  return {
    overallVerdict: 'minor_issue',
    suggestedRating: 'again',
    errorSeverity: 'style_only',
    errors: [],
    naturalAlternatives: [],
    explanationTr: `${AI_SERVICE_UNAVAILABLE_MARKER} AI değerlendirme servisine ulaşılamadı. Bu deneme günlük hedefe, tekrar zamanlayıcısına veya hata kayıtlarına işlenmedi. ${message}`,
    selfCorrectionPrompt: 'İnternet bağlantısını kontrol edip yeniden deneyin.',
  };
}

function isEvaluation(value: unknown): value is AIEvaluationResult {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.overallVerdict === 'string' && typeof record.explanationTr === 'string';
}

export async function evaluateProduction(req: EvaluateRequest): Promise<AIEvaluationResult> {
  try {
    const data = await callLinguaApi<unknown>('/api/evaluate', req);
    if (!isEvaluation(data)) throw new Error('Değerlendirme servisi beklenen yanıt biçimini döndürmedi.');
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ağ bağlantısı kurulamadı.';
    return unavailableEvaluation(message);
  }
}

export async function fetchHowDoISay(turkishText: string, language: TargetLanguage): Promise<RegisterOption[]> {
  const data = await callLinguaApi<{ options?: RegisterOption[] }>('/api/how-do-i-say', { turkishText, language });
  if (!Array.isArray(data.options) || data.options.length === 0) {
    throw new Error('Çeviri servisi geçerli bir seçenek döndürmedi.');
  }
  return data.options;
}

export async function sendChatMessage(
  personaId: string,
  language: TargetLanguage,
  history: Array<{ sender: 'user' | 'persona'; text: string }>,
  newUserMessage: string,
  customSystemInstruction?: string,
): Promise<{ text: string; translationTr: string; grammarCorrection?: string }> {
  try {
    const data = await callLinguaApi<{ text?: string; translationTr?: string; grammarCorrection?: string }>('/api/chat', {
      personaId,
      language,
      history,
      newUserMessage,
      customSystemInstruction,
    });
    if (typeof data.text !== 'string' || typeof data.translationTr !== 'string') {
      throw new Error('Sohbet servisi beklenen yanıt biçimini döndürmedi.');
    }
    return {
      text: data.text,
      translationTr: data.translationTr,
      ...(data.grammarCorrection ? { grammarCorrection: data.grammarCorrection } : {}),
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Ağ bağlantısı kurulamadı.';
    return {
      text: 'AI sohbet servisine şu anda ulaşılamıyor. Bu mesaj yapay bir sohbet yanıtı değildir; bağlantıyı kontrol edip yeniden deneyin.',
      translationTr: `Servis hatası: ${detail}`,
    };
  }
}
