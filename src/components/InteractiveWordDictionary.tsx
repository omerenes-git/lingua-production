import React, { useEffect, useState } from 'react';
import { TargetLanguage, LearningItem } from '../types';
import { callLinguaApi } from '../lib/linguaApi';
import { Volume2, Plus, Check, BookOpen, X, Brain, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { ContextMnemonicModal } from './ContextMnemonicModal';

interface WordLookupModalProps {
  word: string;
  contextSentence?: string;
  language: TargetLanguage;
  isOpen: boolean;
  onClose: () => void;
  onAddLearningItem: (item: LearningItem) => void;
  isAlreadyAdded?: boolean;
}

interface LookupData {
  meaningTarget: string;
  translationTr: string;
  grammaticalRole: string;
  cefrLevel: string;
  exampleSentence: string;
  exampleTranslationTr: string;
}

const MEANING_LABELS: Record<TargetLanguage, { label: string; lang: string }> = {
  en: { label: 'Meaning in English', lang: 'İngilizce' },
  de: { label: 'Bedeutung auf Deutsch', lang: 'Almanca' },
  sr: { label: 'Značenje na srpskom', lang: 'Sırpça' },
};

export const InteractiveWordDictionary: React.FC<WordLookupModalProps> = ({
  word,
  contextSentence,
  language,
  isOpen,
  onClose,
  onAddLearningItem,
  isAlreadyAdded = false,
}) => {
  const [added, setAdded] = useState(isAlreadyAdded);
  const [customMeaning, setCustomMeaning] = useState('');
  const [showMnemonicModal, setShowMnemonicModal] = useState(false);
  const [lookupData, setLookupData] = useState<LookupData | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const lookupWord = async (targetWord: string) => {
    setLoading(true);
    setLookupData(null);
    setLookupError(null);
    try {
      const data = await callLinguaApi<Partial<LookupData>>('/api/lookup-word', {
        word: targetWord,
        contextSentence: contextSentence || targetWord,
        language,
      });
      if (typeof data.meaningTarget !== 'string' || !data.meaningTarget.trim()) {
        throw new Error('Sözlük servisi geçerli bir hedef dil karşılığı döndürmedi.');
      }
      setLookupData({
        meaningTarget: data.meaningTarget.trim(),
        translationTr: typeof data.translationTr === 'string' ? data.translationTr.trim() : '',
        grammaticalRole: typeof data.grammaticalRole === 'string' ? data.grammaticalRole : '',
        cefrLevel: typeof data.cefrLevel === 'string' ? data.cefrLevel : '',
        exampleSentence: typeof data.exampleSentence === 'string' ? data.exampleSentence : '',
        exampleTranslationTr: typeof data.exampleTranslationTr === 'string' ? data.exampleTranslationTr : '',
      });
    } catch (error) {
      setLookupError(error instanceof Error && error.message ? error.message : 'Sözlük sorgusu tamamlanamadı.');
    } finally {
      setLoading(false);
    }
  };

  // Modal her açıldığında kelimeyi HEDEF DİLDE çözmek için sözlük servisini çağır.
  useEffect(() => {
    if (!isOpen || !word) return;
    const targetWord = word.trim().replace(/[.,!?:;"'()]/g, '');
    if (!targetWord || targetWord.length < 2) return;
    void lookupWord(targetWord);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, word, language]);

  if (!isOpen || !word) return null;

  const cleanWord = word.trim().replace(/[.,!?:;"'()]/g, '');

  const speak = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanWord);
      const langMap: Record<TargetLanguage, string> = {
        en: 'en-US',
        de: 'de-DE',
        sr: 'sr-RS',
      };
      utterance.lang = langMap[language];
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSaveToDeck = () => {
    const newItem: LearningItem = {
      id: `item_lingq_${Date.now()}`,
      language,
      domain: 'general',
      turkishText: customMeaning.trim() || lookupData?.translationTr?.trim() || `Sözlük İfadesi (${cleanWord})`,
      targetText: cleanWord,
      keyTermOrPattern: cleanWord,
      masteryState: 'noticed',
      isActiveVocabulary: false,
      contextCount: 1,
      nextReviewDate: new Date().toISOString(),
      stability: 1.0,
      difficulty: 5.0,
      fossilizedCount: 0,
    };

    onAddLearningItem(newItem);
    setAdded(true);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4 relative">
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 p-1 text-slate-400 hover:text-slate-700 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-sky-700 uppercase tracking-wider">LingQ Dokunulabilir Sözlük</div>
              <h3 className="text-xl font-bold text-slate-900 leading-tight">{cleanWord}</h3>
            </div>
          </div>

          {/* Hedef dilde anlam (AI sözlük) */}
          {loading ? (
            <div className="flex items-center justify-center space-x-2 py-3 text-xs text-sky-700 bg-sky-50/60 border border-sky-200 rounded-xl">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{MEANING_LABELS[language].lang} karşılık aranıyor...</span>
            </div>
          ) : lookupError ? (
            <div className="space-y-2">
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{lookupError}</span>
              </div>
              <button
                type="button"
                onClick={() => void lookupWord(cleanWord)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Tekrar Dene
              </button>
            </div>
          ) : lookupData ? (
            <div className="bg-sky-50/70 border border-sky-200 rounded-xl p-3 space-y-2">
              <div className="text-[10px] font-black text-sky-700 uppercase tracking-wider">
                {MEANING_LABELS[language].label}
              </div>
              <div className="text-sm font-bold text-slate-900 leading-relaxed">{lookupData.meaningTarget}</div>
              {lookupData.translationTr && (
                <div className="text-[11px] text-slate-500">
                  <span className="text-slate-400">Türkçe karşılık:</span> <span className="text-slate-700 font-semibold">{lookupData.translationTr}</span>
                </div>
              )}
              {lookupData.grammaticalRole && <div className="text-[10px] text-slate-400 italic">{lookupData.grammaticalRole}</div>}
              {lookupData.exampleSentence && (
                <div className="text-[11px] text-slate-600 bg-white/70 rounded-lg p-2 border border-sky-100 italic">
                  “{lookupData.exampleSentence}”
                  {lookupData.exampleTranslationTr && <span className="block not-italic text-[10px] text-slate-400 mt-0.5">({lookupData.exampleTranslationTr})</span>}
                </div>
              )}
            </div>
          ) : null}

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={speak}
              className="py-2 bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition-colors border border-sky-200"
            >
              <Volume2 className="w-4 h-4 text-sky-600" />
              <span>Seslendir ({language.toUpperCase()})</span>
            </button>

            <button
              onClick={() => setShowMnemonicModal(true)}
              className="py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition-colors border border-indigo-200"
            >
              <Brain className="w-4 h-4 text-indigo-600" />
              <span>Collocation & Kanca</span>
            </button>
          </div>

          {contextSentence && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs text-slate-700">
              <strong className="text-slate-900 block font-bold mb-0.5">Geçtiği Bağlam:</strong>
              <p className="italic">"{contextSentence}"</p>
            </div>
          )}

          {/* Custom Meaning or quick translation input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Kendi Notun (isteğe bağlı):
            </label>
            <input
              type="text"
              value={customMeaning}
              onChange={(e) => setCustomMeaning(e.target.value)}
              placeholder="Bu kelimeyle ilgili kendi notunu ekle..."
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:bg-white"
            />
          </div>

          {/* Save button */}
          <button
            onClick={handleSaveToDeck}
            disabled={added}
            className={`w-full py-2.5 px-3 text-xs font-bold rounded-xl flex items-center justify-center space-x-2 transition-all ${
              added
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                : 'bg-sky-600 hover:bg-sky-700 text-white shadow-md shadow-sky-200'
            }`}
          >
            {added ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span>LingQ / FSRS Deste'ne Eklendi!</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>LingQ Kelimelerim Listesine Ekle</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Mnemonic & Collocation Modal */}
      <ContextMnemonicModal
        isOpen={showMnemonicModal}
        onClose={() => setShowMnemonicModal(false)}
        wordOrPhrase={cleanWord}
        language={language}
        contextSentence={contextSentence}
      />
    </>
  );
};

