import { AIEvaluationResult, IntensityLevel, RegisterOption, TargetLanguage } from '../types';

export const AI_SERVICE_UNAVAILABLE_MARKER = '__AI_SERVICE_UNAVAILABLE__';

export interface EvaluateRequest {
  language: TargetLanguage;
  turkishPrompt: string;
  targetReference: string;
  userAnswer: string;
  hintsUsedCount: number;
  intensityLevel?: IntensityLevel;
}

async function readApiError(response: Response, fallbackMessage: string): Promise<string> {
  try {
    const body = await response.json() as { error?: string; message?: string };
    return body.error || body.message || `${fallbackMessage} (${response.status})`;
  } catch {
    return `${fallbackMessage} (${response.status})`;
  }
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

export async function evaluateProduction(req: EvaluateRequest): Promise<AIEvaluationResult> {
  try {
    const res = await fetch('/api/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) return unavailableEvaluation(await readApiError(res, 'Değerlendirme isteği başarısız'));
    return await res.json() as AIEvaluationResult;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ağ bağlantısı kurulamadı.';
    return unavailableEvaluation(message);
  }
}

export async function fetchHowDoISay(turkishText: string, language: TargetLanguage): Promise<RegisterOption[]> {
  const res = await fetch('/api/how-do-i-say', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ turkishText, language }),
  });
  if (!res.ok) throw new Error(await readApiError(res, 'Çeviri servisi isteği başarısız'));
  const data = await res.json() as { options?: RegisterOption[] };
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
  modelPreference?: string,
): Promise<{ text: string; translationTr: string; grammarCorrection?: string }> {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personaId, language, history, newUserMessage, customSystemInstruction, modelPreference }),
    });
    if (!res.ok) throw new Error(await readApiError(res, 'Sohbet isteği başarısız'));
    return await res.json() as { text: string; translationTr: string; grammarCorrection?: string };
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Ağ bağlantısı kurulamadı.';
    return {
      text: 'AI sohbet servisine şu anda ulaşılamıyor. Bu mesaj yapay bir sohbet yanıtı değildir; bağlantıyı kontrol edip yeniden deneyin.',
      translationTr: `Servis hatası: ${detail}`,
    };
  }
}
