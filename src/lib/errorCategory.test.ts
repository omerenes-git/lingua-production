import { describe, expect, it } from 'vitest';
import { deriveErrorCategory, countUnresolvedErrorCategories } from './errorCategory';
import { FossilizedError } from '../types';

function makeError(overrides: Partial<FossilizedError> = {}): FossilizedError {
  return {
    id: 'e1',
    language: 'de',
    domain: 'general',
    turkishPrompt: 'Türkçe kaynak',
    userAnswer: 'yanlış cevap',
    correctReference: 'doğru cevap',
    errorDescription: 'açıklama',
    confidence: 'certain',
    date: new Date().toISOString(),
    resolved: false,
    ...overrides,
  };
}

describe('deriveErrorCategory', () => {
  it('boş hata listesi için undefined döner', () => {
    expect(deriveErrorCategory([])).toBeUndefined();
    expect(deriveErrorCategory(undefined)).toBeUndefined();
  });

  it('en sık tekrarlanan kategoriyi seçer', () => {
    const result = deriveErrorCategory([
      { category: 'grammar', message: 'a' },
      { category: 'word_order', message: 'b' },
      { category: 'grammar', message: 'c' },
    ]);
    expect(result).toBe('grammar');
  });

  it('kategorisiz hataları atlar', () => {
    const result = deriveErrorCategory([
      { message: 'kategorisiz hata' },
      { category: 'spelling', message: 'yazım' },
    ]);
    expect(result).toBe('spelling');
  });

  it('eşitlik durumunda ilk görülen kategoriyi döner', () => {
    const result = deriveErrorCategory([
      { category: 'grammar', message: 'a' },
      { category: 'vocabulary', message: 'b' },
    ]);
    expect(result).toBe('grammar');
  });

  it('tümü kategorisizse undefined döner', () => {
    const result = deriveErrorCategory([{ message: 'a' }, { message: 'b' }]);
    expect(result).toBeUndefined();
  });
});

describe('countUnresolvedErrorCategories', () => {
  it('çözülmemiş hataları kategoriye göre sayar', () => {
    const errors = [
      makeError({ errorCategory: 'grammar' }),
      makeError({ errorCategory: 'grammar' }),
      makeError({ errorCategory: 'word_order' }),
    ];
    expect(countUnresolvedErrorCategories(errors)).toEqual({ grammar: 2, word_order: 1 });
  });

  it('çözülmüş hataları SAYMAZ (başarı sonrası öncelik azalır)', () => {
    const errors = [
      makeError({ errorCategory: 'grammar', resolved: false }),
      makeError({ errorCategory: 'grammar', resolved: true }),
      makeError({ errorCategory: 'grammar', resolved: true }),
    ];
    expect(countUnresolvedErrorCategories(errors)).toEqual({ grammar: 1 });
  });

  it('errorCategory olmayan hataları saymaz', () => {
    const errors = [makeError({}), makeError({ errorCategory: 'style' })];
    expect(countUnresolvedErrorCategories(errors)).toEqual({ style: 1 });
  });

  it('boş liste için boş nesne döner', () => {
    expect(countUnresolvedErrorCategories([])).toEqual({});
  });
});
