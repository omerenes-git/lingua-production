/**
 * Shared text normalization so that trivial punctuation/whitespace/case
 * variants of the same sentence are treated as the same content across the
 * app (prompt de-duplication, learning-item matching, cloud merge keys).
 */
export function normalizeSentenceText(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[.,!?;:'"“”()]/g, '')
    .replace(/\s+/g, ' ');
}
