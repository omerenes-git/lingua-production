import React, { useState } from 'react';
import { TargetLanguage, RegisterOption, LearningItem } from '../../types';
import { fetchHowDoISay } from '../../lib/aiService';
import { HelpCircle, Sparkles, Plus, Check, Volume2, ArrowRight } from 'lucide-react';

interface NasilSoylerimTabProps {
  currentLanguage: TargetLanguage;
  onAddLearningItem: (item: LearningItem) => void;
}

export const NasilSoylerimTab: React.FC<NasilSoylerimTabProps> = ({
  currentLanguage,
  onAddLearningItem,
}) => {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [options, setOptions] = useState<RegisterOption[]>([]);
  const [addedRegisters, setAddedRegisters] = useState<Record<string, boolean>>({});

  const handleGenerate = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    setAddedRegisters({});

    const res = await fetchHowDoISay(inputText.trim(), currentLanguage);
    setOptions(res);
    setIsLoading(false);
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const langMap: Record<TargetLanguage, string> = {
        en: 'en-US',
        de: 'de-DE',
        sr: 'sr-RS',
      };
      utterance.lang = langMap[currentLanguage];
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleAddToDeck = (opt: RegisterOption) => {
    const newItem: LearningItem = {
      id: `item_custom_${Date.now()}`,
      language: currentLanguage,
      domain: opt.register === 'clinical' ? 'clinical' : 'general',
      turkishText: inputText.trim(),
      targetText: opt.textTarget,
      keyTermOrPattern: opt.textTarget.slice(0, 30),
      masteryState: 'new',
      isActiveVocabulary: false,
      contextCount: 0,
      nextReviewDate: new Date().toISOString(),
      stability: 1.0,
      difficulty: 5.0,
      fossilizedCount: 0,
    };

    onAddLearningItem(newItem);
    setAddedRegisters((prev) => ({ ...prev, [opt.register]: true }));
  };

  return (
    <div 
      className="max-w-4xl mx-auto space-y-6"
      data-active-context-type="nasil_soylerim"
      data-input-text={inputText}
      data-generated-options={options.map(o => `[${o.register}]: ${o.textTarget}`).join(' | ')}
    >
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">"Bunu Nasıl Söylerim?" Sorgulama Modülü</h2>
            <p className="text-xs text-slate-500">Aklına takılan herhangi bir Türkçe ifadeyi farklı register'larda (klinik, doğal, resmî) çevir</p>
          </div>
        </div>

        {/* Input Form */}
        <div className="space-y-3 pt-2">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Örn: Hasta fizyoterapi seansında dirseğinde hafif bir sızı hissettiğini belirtti..."
            rows={3}
            className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition-all"
          />

          <button
            onClick={handleGenerate}
            disabled={!inputText.trim() || isLoading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-colors flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Çoklu Register İfadeler Üretiliyor...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Çoklu Register Çıktıları Üret ({currentLanguage.toUpperCase()})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Generated Multi-Register Results */}
      {options.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-slate-900">Üretilen Anlatım Seçenekleri</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {options.map((opt, idx) => {
              const isAdded = addedRegisters[opt.register];

              return (
                <div
                  key={idx}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-all space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 text-xs font-bold bg-indigo-50 text-indigo-700 rounded-md">
                        {opt.titleTr}
                      </span>
                      <button
                        onClick={() => speakText(opt.textTarget)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100"
                        title="Dinle"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-sm font-bold text-slate-900 leading-snug">
                      "{opt.textTarget}"
                    </p>

                    <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      {opt.explanationTr}
                    </p>
                  </div>

                  <button
                    onClick={() => handleAddToDeck(opt)}
                    disabled={isAdded}
                    className={`w-full py-2 px-3 text-xs font-semibold rounded-lg border flex items-center justify-center space-x-1.5 transition-all ${
                      isAdded
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 cursor-default'
                        : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>FSRS Destesine Eklendi</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Öğrenme Destesine Ekle</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
