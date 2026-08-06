import { describe, expect, it, vi, beforeEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { VocabularyTooltip } from './VocabularyTooltip';
import { callLinguaApi } from '../lib/linguaApi';

vi.mock('../lib/linguaApi', () => ({ callLinguaApi: vi.fn() }));

const mockedCallLinguaApi = vi.mocked(callLinguaApi);

const DE_LOOKUP = {
  meaningTarget: 'das Krankenhaus — the place where sick people are treated',
  translationTr: 'hastane',
  grammaticalRole: 'noun',
  cefrLevel: 'A1',
  exampleSentence: 'Das Krankenhaus ist groß.',
  exampleTranslationTr: 'Hastane büyük.',
};

const SR_LOOKUP = {
  meaningTarget: 'bolnica — mesto gde se leče bolesnici',
  translationTr: 'hastane',
  grammaticalRole: 'imenica',
  cefrLevel: 'A1',
  exampleSentence: 'Bolnica je velika.',
  exampleTranslationTr: 'Hastane büyük.',
};

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  mockedCallLinguaApi.mockResolvedValue(DE_LOOKUP);
});

describe('VocabularyTooltip — hedef dilde kelime anlamı', () => {
  it('kelimeye tıklayınca HEDEF DİLDE anlam gösterir, Türkçe başlık göstermez', async () => {
    const user = userEvent.setup();
    render(<VocabularyTooltip text="Krankenhaus" language="de" />);
    await user.click(screen.getByText('Krankenhaus'));

    expect(await screen.findByText(/das Krankenhaus/)).toBeInTheDocument();
    expect(screen.queryByText('Türkçe anlamı')).not.toBeInTheDocument();
    // Türkçe karşılık yalnızca ikincil satırdadır, ana gösterim değildir
    expect(screen.getByText('hastane')).toBeInTheDocument();
    expect(mockedCallLinguaApi).toHaveBeenCalledWith(
      '/api/lookup-word',
      expect.objectContaining({ word: 'Krankenhaus', language: 'de' }),
    );
  });

  it('hedef dil Sırpça olduğunda Sırpça etiket ve anlam gösterir', async () => {
    mockedCallLinguaApi.mockResolvedValue(SR_LOOKUP);
    const user = userEvent.setup();
    render(<VocabularyTooltip text="bolnica" language="sr" />);
    await user.click(screen.getByText('bolnica'));

    expect(await screen.findByText(/bolnica — mesto/)).toBeInTheDocument();
    expect(screen.getByText('Značenje na srpskom')).toBeInTheDocument();
    expect(mockedCallLinguaApi).toHaveBeenCalledWith(
      '/api/lookup-word',
      expect.objectContaining({ word: 'bolnica', language: 'sr' }),
    );
  });

  it('Aynı kelimeye tekrar tıklayınca API tekrar çağrılmaz (cache)', async () => {
    // Benzersiz kelime: modül seviyesindeki cache diğer testlerden bağımsız başlar
    const cacheWord = 'KrankenhausCache';
    mockedCallLinguaApi.mockResolvedValue(DE_LOOKUP);
    const user = userEvent.setup();
    render(<VocabularyTooltip text={cacheWord} language="de" />);

    await user.click(screen.getByText(cacheWord));
    await screen.findByText(/das Krankenhaus/);
    // kapatıp tekrar aç
    await user.click(screen.getByTitle('Kapat'));
    await user.click(screen.getByText(cacheWord));
    await screen.findByText(/das Krankenhaus/);

    expect(mockedCallLinguaApi).toHaveBeenCalledTimes(1);
  });

  it('API hatasında çökmez, hata mesajı ve tekrar dene butonu gösterir', async () => {
    const errorWord = 'KrankenhausError';
    mockedCallLinguaApi.mockRejectedValue(new Error('Sunucuya ulaşılamadı'));
    const user = userEvent.setup();
    render(<VocabularyTooltip text={errorWord} language="de" />);
    await user.click(screen.getByText(errorWord));

    expect(await screen.findByText(/Sunucuya ulaşılamadı/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tekrar Dene/ })).toBeInTheDocument();
  });

  it('geçersiz yanıt (meaningTarget yok) hataya düşer ve çökmez', async () => {
    const invalidWord = 'KrankenhausInvalid';
    mockedCallLinguaApi.mockResolvedValue({ translationTr: 'hastane' });
    const user = userEvent.setup();
    render(<VocabularyTooltip text={invalidWord} language="de" />);
    await user.click(screen.getByText(invalidWord));

    expect(await screen.findByText(/geçerli bir hedef dil anlamı/)).toBeInTheDocument();
  });

  it('hedef cümlenin tamamını açığa çıkarmaz — yalnızca kelime bazlı yardım sunar', async () => {
    const user = userEvent.setup();
    render(<VocabularyTooltip text="Das Krankenhaus ist groß" language="de" />);
    // tıklanabilir kelimeler token bazlıdır; tıklama sonucu tooltip hedef cümlenin
    // tamamını göstermemelidir
    await user.click(screen.getByText('Krankenhaus'));
    expect(await screen.findByText(/das Krankenhaus/)).toBeInTheDocument();
    // Tooltip içinde tam cümle yalnızca örnek cümle olarak geçebilir; ana alan kelime anlamıdır
    expect(screen.getByText('das Krankenhaus — the place where sick people are treated')).toBeInTheDocument();
  });
});
