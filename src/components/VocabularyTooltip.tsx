import React, { useState, useRef, useEffect } from 'react';
import { TargetLanguage, LearningItem } from '../types';
import { Volume2, BookOpen, PlusCircle, Check, Loader2, Sparkles, X } from 'lucide-react';

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
  const [added, setAdded] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const speakText = (word: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      const langMap: Record<TargetLanguage, string> = {
        en: 'en-US',
        de: 'de-DE',
        sr: 'sr-RS',
      };
      utterance.lang = langMap[language];
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleWordClick = async (word: string, e: React.MouseEvent<HTMLSpanElement>) => {
    e.stopPropagation();
    const cleanWord = word.trim().replace(/[.,!?:;"'()]/g, '');
    if (!cleanWord || cleanWord.length < 2) return;

    setActiveWord(cleanWord);
    setLoading(true);
    setAdded(false);

    // Get position relative to viewport/container
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: Math.min(Math.max(rect.left, 16), window.innerWidth - 300),
      y: rect.bottom + window.scrollY + 6,
    });

    try {
      const res = await fetch('/api/lookup-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: cleanWord,
          contextSentence: contextSentence || text,
          language,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setLookupData(data);
      } else {
        // Fallback simulated translation
        setLookupData({
          translationTr: `${cleanWord} (Türkçe Anlamı)`,
          grammaticalRole: 'Kelime',
          cefrLevel: 'B1',
          exampleSentence: `Context: ${contextSentence || text}`,
          exampleTranslationTr: 'Bağlamsal kullanım',
        });
      }
    } catch {
      setLookupData({
        translationTr: `${cleanWord} (Sözlük Anlamı)`,
        grammaticalRole: 'İfade',
        cefrLevel: 'B1',
        exampleSentence: text,
        exampleTranslationTr: 'Türkçe karşılık',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    if (!activeWord || !onAddLearningItem) return;

    const newItem: LearningItem = {
      id: `vocab_tool_${Date.now()}`,
      language,
      domain: 'general',
      turkishText: lookupData?.translationTr || activeWord,
      targetText: activeWord,
      keyTermOrPattern: activeWord,
      masteryState: 'noticed',
      isActiveVocabulary: false,
      contextCount: 1,
      nextReviewDate: new Date().toISOString(),
      stability: 1.5,
      difficulty: 4.0,
      fossilizedCount: 0,
    };

    onAddLearningItem(newItem);
    setAdded(true);
  };

  const closeTooltip = () => {
    setActiveWord(null);
    setLookupData(null);
  };

  // Split sentence into tap-friendly tokens
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
            onClick={(e) => handleWordClick(token, e)}
            className={`inline-block cursor-pointer rounded px-0.5 transition-all ${
              isSelected
                ? 'bg-sky-500 text-white font-bold shadow-xs'
                : 'hover:bg-sky-100 hover:text-sky-900 border-b border-dotted border-sky-400'
            }`}
            title="Sözlük & Anlam için tıkla"
          >
            {token}
          </span>
        );
      })}

      {/* Floating Tooltip Popover */}
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
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-sky-400" />
              <span className="font-bold text-sm text-sky-300 capitalize">{activeWord}</span>
              {lookupData?.cefrLevel && (
                <span className="px-1.5 py-0.2 bg-sky-500/20 text-sky-300 text-[10px] font-bold rounded border border-sky-400/30">
                  {lookupData.cefrLevel}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => speakText(activeWord)}
                className="p-1 hover:bg-slate-800 text-sky-400 rounded-lg"
                title="Sesli Dinle"
              >
                <Volume2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={closeTooltip}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          {loading ? (
            <div className="py-4 flex items-center justify-center space-x-2 text-xs text-sky-300">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Yapay zekâ sözlüğü sorguluyor...</span>
            </div>
          ) : lookupData ? (
            <div className="space-y-2 text-xs">
              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/80">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Türkçe Anlamı</div>
                <div className="font-bold text-sm text-emerald-400 mt-0.5">{lookupData.translationTr}</div>
                {lookupData.grammaticalRole && (
                  <div className="text-[10px] text-slate-400 mt-0.5 italic">{lookupData.grammaticalRole}</div>
                )}
              </div>

              {lookupData.exampleSentence && (
                <div className="text-[11px] text-slate-300 bg-slate-800/50 p-2 rounded-lg italic border border-slate-800">
                  "{lookupData.exampleSentence}"
                  <span className="block text-slate-400 not-italic text-[10px] mt-0.5">
                    ({lookupData.exampleTranslationTr})
                  </span>
                </div>
              )}

              {/* Action */}
              {onAddLearningItem && (
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={added}
                  className={`w-full py-2 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition-all ${
                    added
                      ? 'bg-emerald-600 text-white'
                      : 'bg-sky-600 hover:bg-sky-500 text-white shadow-md'
                  }`}
                >
                  {added ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>LingQ / FSRS Destesine Eklendi!</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>+ Kelime Destesine Ekle</span>
                    </>
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
