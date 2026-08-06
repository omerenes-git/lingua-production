import { ErrorCategory, FossilizedError } from '../types';

export type EvaluationErrorLike = {
  category?: ErrorCategory | string;
  message?: string;
  userPart?: string;
  suggestion?: string;
};

/**
 * AI değerlendirmesindeki hata listesinden EN SIK tekrarlanan kategoriyi türetir.
 * Boş liste veya kategorisiz hatalar için undefined döner.
 * Bu, Gramer Koçu kişiselleştirmesinin temelidir.
 */
export function deriveErrorCategory(errors: EvaluationErrorLike[] | undefined): ErrorCategory | undefined {
  if (!errors || errors.length === 0) return undefined;
  const counts = new Map<string, number>();
  for (const error of errors) {
    if (!error.category) continue;
    counts.set(error.category, (counts.get(error.category) || 0) + 1);
  }
  let top: string | undefined;
  let topCount = 0;
  for (const [category, count] of counts) {
    if (count > topCount) {
      top = category;
      topCount = count;
    }
  }
  return top as ErrorCategory | undefined;
}

/**
 * ÇÖZÜLMEMİŞ hataları kategorilere göre sayar. Çözülen hatalar sayılmaz,
 * böylece kullanıcı bir konuda başarılı oldukça o konunun önceliği düşer.
 */
export function countUnresolvedErrorCategories(errors: FossilizedError[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const error of errors) {
    if (error.resolved) continue;
    if (error.errorCategory) counts[error.errorCategory] = (counts[error.errorCategory] || 0) + 1;
  }
  return counts;
}
