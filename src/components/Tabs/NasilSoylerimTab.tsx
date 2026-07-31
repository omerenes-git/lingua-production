import React, { useState } from 'react';
import { TargetLanguage, RegisterOption, LearningItem } from '../../types';
import { fetchHowDoISay } from '../../lib/aiService';
import { HelpCircle, Sparkles, Plus, Check, Volume2, AlertTriangle } from 'lucide-react';

interface NasilSoylerimTabProps {
  currentLanguage: TargetLanguage;
  onAddLearningItem: (item: LearningItem) => void;
}

export const NasilSoylerimTab: React.FC<NasilSoylerimTabProps> = ({ currentLanguage, onAddLearningItem }) => {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [options, setOptions] = useState<RegisterOption[]>([]);
  const [addedRegisters, setAddedRegisters] = useState<Record<string, boolean>>({});
  const [errorMessage, setErrorMessage] = useState('');

  const handleGenerate = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    setAddedRegisters({});
    setOptions([]);
    setErrorMessage('');
    try {
      setOptions(await fetchHowDoISay(inputText.trim(), currentLanguage));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Çeviri servisine ulaşılamadı.');
    } finally {
      setIsLoading(false);
    }
  };

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = { en: 'en-US', de: 'de-DE', sr: 'sr-RS' }[currentLanguage];
    window.speechSynthesis.speak(utterance);
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
      stability: 1,
      difficulty: 5,
      fossilizedCount: 0,
    };
    onAddLearningItem(newItem);
    setAddedRegisters((previous) => ({ ...previous, [opt.register]: true }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-active-context-type="nasil_soylerim" data-input-text={inputText} data-generated-options={options.map((option) => `[${option.register}]: ${option.textTarget}`).join(' | ')}>
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><HelpCircle className="w-6 h-6" /></div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">“Bunu Nasıl Söylerim?”</h2>
            <p className="text-xs text-slate-500">Türkçe ifadeyi doğal, klinik veya resmî kullanımlarla hedef dile çevir.</p>
          </div>
        </div>
        <textarea value={inputText} onChange={(event) => setInputText(event.target.value)} placeholder="Çevirmek istediğin Türkçe ifadeyi yaz..." rows={3} className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 resize-none" />
        <button onClick={handleGenerate} disabled={!inputText.trim() || isLoading} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white font-bold text-sm rounded-xl flex items-center justify-center space-x-2">
          <Sparkles className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'AI çevirisi hazırlanıyor...' : `Çeviri seçeneklerini üret (${currentLanguage.toUpperCase()})`}</span>
        </button>
        {errorMessage && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div><strong>Çeviri oluşturulamadı.</strong><p className="text-xs mt-1">{errorMessage} Bağlantıyı kontrol edip yeniden deneyin. Örnek veya sabit çeviri gösterilmedi.</p></div>
          </div>
        )}
      </div>

      {options.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-slate-900">Üretilen anlatım seçenekleri</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {options.map((option, index) => {
              const isAdded = addedRegisters[option.register];
              return (
                <div key={`${option.register}-${index}`} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between"><span className="px-2.5 py-1 text-xs font-bold bg-indigo-50 text-indigo-700 rounded-md">{option.titleTr}</span><button onClick={() => speakText(option.textTarget)} className="p-1.5 text-slate-400 hover:text-indigo-600" title="Dinle"><Volume2 className="w-4 h-4" /></button></div>
                    <p className="text-sm font-bold text-slate-900">“{option.textTarget}”</p>
                    <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border">{option.explanationTr}</p>
                  </div>
                  <button onClick={() => handleAddToDeck(option)} disabled={isAdded} className={`w-full py-2 px-3 text-xs font-semibold rounded-lg border flex items-center justify-center space-x-1.5 ${isAdded ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'}`}>
                    {isAdded ? <><Check className="w-3.5 h-3.5" /><span>Öğrenme destesine eklendi</span></> : <><Plus className="w-3.5 h-3.5" /><span>Öğrenme destesine ekle</span></>}
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
