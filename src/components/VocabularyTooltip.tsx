import React, { useRef, useState } from 'react';
import { TargetLanguage, LearningItem } from '../types';
import { Volume2, BookOpen, PlusCircle, Check, Loader2, X, AlertTriangle, RefreshCw } from 'lucide-react';

interface LookupData {
  translationTr: string;
  grammaticalRole: string;
  cefrLevel: string;
  exampleSentence: string;
  exampleTranslationTr: string;
}

interface VocabularyTooltipProps {
  text: string;
  language: TargetLanguage;
  contextSentence?: string;
  onAddLearningItem?: (item: LearningItem) => void;
  className?: string;
}

const readErrorMessage = async (response: Response): Promise<string> => {
  try {
    const body = await response.json();
    if (typeof body?.error === 'string' && body.error.trim()) return body.error.trim();
  } catch {
    // The response was not JSON. Use the status-based message below.
  }
  return `Sözlük servisi yanıt vermedi (${response.status}).`;
};

export const VocabularyTooltip: React.FC<VocabularyTooltipProps> = ({
  text,
  language,
  contextSentence,
  onAddLearningItem,
  className = '',
}) => {
  const [activeWord, setActiveWord] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lookupData, setLookupData] = useState<LookupData | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const speakText = (word: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = { en: 'en-US', de: 'de-DE', sr: 'sr-RS' }[language];
    window.speechSynthesis.speak(utterance);
  };

  const lookupWord = async (cleanWord: string) => {
    setLoading(true);
    setLookupData(null);
    setLookupError(null);
    setAdded(false);

    try {
      const response = await fetch('/api/lookup-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: cleanWord,
          contextSentence: contextSentence || text,
          language,
        }),
      });

      if (!response.ok) throw new Error(await readErrorMessage(response));

      const data = await response.json();
      if (!data || typeof data.translationTr !== 'string' || !data.translationTr.trim()) {
        throw new Error('Sözlük servisi geçerli bir Türkçe anlam döndürmedi.');
      }

      setLookupData({
        translationTr: data.translationTr.trim(),
        grammaticalRole: typeof data.grammaticalRole === 'string' ? data.grammaticalRole : '',
        cefrLevel: typeof data.cefrLevel === 'string' ? data.cefrLevel : '',
        exampleSentence: typeof data.exampleSentence === 'string' ? data.exampleSentence : '',
        exampleTranslationTr:
          typeof data.exampleTranslationTr === 'string' ? data.exampleTranslationTr : '',
      });
    } catch (error) {
      setLookupError(
        error instanceof Error && error.message
          ? error.message
          : 'Sözlük sorgusu tamamlanamadı. Lütfen tekrar deneyin.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleWordClick = (word: string, event: React.MouseEvent<HTMLSpanElement>) => {
    event.stopPropagation();
    const cleanWord = word.trim().replace(/[.,!?:;"'()]/g, '');
    if (!cleanWord || cleanWord.length < 2) return;

    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: Math.min(Math.max(rect.left, 16), Math.max(16, window.innerWidth - 304)),
      y: Math.min(rect.bottom + 6, Math.max(16, window.innerHeight - 360)),
    });
    setActiveWord(cleanWord);
    void lookupWord(cleanWord);
  };

  const handleAdd = () => {
    if (!activeWord || !lookupData || !onAddLearningItem || added) return;

    onAddLearningItem({
      id: `vocab_tool_${Date.now()}`,
      language,
      domain: 'general',
      turkishText: lookupData.translationTr,
      targetText: activeWord,
      keyTermOrPattern: activeWord,
      masteryState: 'noticed',
      isActiveVocabulary: false,
      contextCount: 1,
      nextReviewDate: new Date().toISOString(),
      stability: 1.5,
      difficulty: 4.0,
      fossilizedCount: 0,
    });
    setAdded(true);
  };

  const closeTooltip = () => {
    setActiveWord(null);
    setLookupData(null);
    setLookupError(null);
    setAdded(false);
  };

  const tokens = text.split(/(\s+)/);

  return (
    <div ref={containerRef} className={`relative inline ${className}`}>
      {tokens.map((token, index) => {
        const clean = token.trim().replace(/[.,!?:;"'()]/g, '');
        if (!clean) return <span key={index}>{token}</span>;
        const isSelected = activeWord?.toLowerCase() === clean.toLowerCase();

        return (
          <span
            key={index}
            onClick={(event) => handleWordClick(token, event)}
            className={`inline-block cursor-pointer rounded px-0.5 transition-all ${
              isSelected
                ? 'bg-sky-500 text-white font-bold shadow-xs'
                : 'hover:bg-sky-100 hover:text-sky-900 border-b border-dotted border-sky-400'
            }`}
            title="Bağlamsal sözlük için tıkla"
          >
            {token}
          </span>
        );
      })}

      {activeWord && (
        <div
          style={{
            position: 'fixed',
            left: `${tooltipPos?.x || 20}px`,
            top: `${tooltipPos?.y || 100}px`,
            zIndex: 9999,
          }}
          className="w-72 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-sky-500/40 animate-fadeIn space-y-3"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2 min-w-0">
              <BookOpen className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="font-bold text-sm text-sky-300 capitalize truncate">{activeWord}</span>
              {lookupData?.cefrLevel && (
                <span className="px-1.5 py-0.5 bg-sky-500/20 text-sky-300 text-[10px] font-bold rounded border border-sky-400/30">
                  {lookupData.cefrLevel}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-1 shrink-0">
              <button type="button" onClick={() => speakText(activeWord)} className="p-1 hover:bg-slate-800 text-sky-400 rounded-lg" title="Sesli dinle">
                <Volume2 className="w-4 h-4" />
              </button>
              <button type="button" onClick={closeTooltip} className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg" title="Kapat">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-4 flex items-center justify-center space-x-2 text-xs text-sky-300">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Bağlamsal sözlük sorgulanıyor...</span>
            </div>
          ) : lookupError ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-amber-700/60 bg-amber-950/50 p-3 text-xs text-amber-100">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Doğrulanmış anlam alınamadı</div>
                    <p className="mt-1 text-[11px] text-amber-200">{lookupError}</p>
                    <p className="mt-1 text-[10px] text-amber-300">Bu nedenle kelime tekrar destesine eklenemez.</p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void lookupWord(activeWord)}
                className="w-full py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Tekrar Dene</span>
              </button>
            </div>
          ) : lookupData ? (
            <div className="space-y-2 text-xs">
              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/80">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Türkçe anlamı</div>
                <div className="font-bold text-sm text-emerald-400 mt-0.5">{lookupData.translationTr}</div>
                {lookupData.grammaticalRole && <div className="text-[10px] text-slate-400 mt-0.5 italic">{lookupData.grammaticalRole}</div>}
              </div>

              {lookupData.exampleSentence && (
                <div className="text-[11px] text-slate-300 bg-slate-800/50 p-2 rounded-lg italic border border-slate-800">
                  “{lookupData.exampleSentence}”
                  {lookupData.exampleTranslationTr && (
                    <span className="block text-slate-400 not-italic text-[10px] mt-0.5">({lookupData.exampleTranslationTr})</span>
                  )}
                </div>
              )}

              {onAddLearningItem && (
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={added}
                  className={`w-full py-2 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition-all ${
                    added ? 'bg-emerald-600 text-white' : 'bg-sky-600 hover:bg-sky-500 text-white shadow-md'
                  }`}
                >
                  {added ? (
                    <><Check className="w-3.5 h-3.5" /><span>Uygulama Tekrar Destesine Eklendi</span></>
                  ) : (
                    <><PlusCircle className="w-3.5 h-3.5" /><span>Kelimeyi Tekrar Destesine Ekle</span></>
                  )}
                </button>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
