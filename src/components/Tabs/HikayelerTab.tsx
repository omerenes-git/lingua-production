import React, { useEffect, useMemo, useState } from 'react';
import { TargetLanguage, LearningItem } from '../../types';
import { INITIAL_STORIES } from '../../data/initialData';
import { VocabularyTooltip } from '../VocabularyTooltip';
import { BookOpen, Volume2, Plus, Check, Eye, EyeOff, Layers } from 'lucide-react';

interface HikayelerTabProps {
  currentLanguage: TargetLanguage;
  onAddLearningItem: (item: LearningItem) => void;
}

export const HikayelerTab: React.FC<HikayelerTabProps> = ({ currentLanguage, onAddLearningItem }) => {
  const languageStories = useMemo(
    () => INITIAL_STORIES.filter((story) => story.language === currentLanguage),
    [currentLanguage],
  );
  const [selectedStoryId, setSelectedStoryId] = useState<string>('');
  const [showAllTranslations, setShowAllTranslations] = useState(false);
  const [addedVocab, setAddedVocab] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setSelectedStoryId(languageStories[0]?.id || '');
    setShowAllTranslations(false);
    setAddedVocab({});
  }, [languageStories]);

  const activeStory = languageStories.find((story) => story.id === selectedStoryId) || languageStories[0];

  const speakSentence = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = { en: 'en-US', de: 'de-DE', sr: 'sr-RS' }[currentLanguage];
    window.speechSynthesis.speak(utterance);
  };

  const handleAddVocabToDeck = (term: string, meaningTr: string) => {
    if (!activeStory) return;
    const key = `${currentLanguage}:${term.toLocaleLowerCase()}`;
    const newItem: LearningItem = {
      id: `item_story_${currentLanguage}_${Date.now()}`,
      language: currentLanguage,
      domain: activeStory.domain,
      turkishText: meaningTr,
      targetText: term,
      keyTermOrPattern: term,
      masteryState: 'noticed',
      isActiveVocabulary: false,
      contextCount: 1,
      nextReviewDate: new Date().toISOString(),
      stability: 1,
      difficulty: 5,
      fossilizedCount: 0,
    };
    onAddLearningItem(newItem);
    setAddedVocab((previous) => ({ ...previous, [key]: true }));
  };

  const languageLabels: Record<TargetLanguage, string> = {
    en: 'İngilizce',
    de: 'Almanca',
    sr: 'Sırpça',
  };

  if (!activeStory) {
    return (
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
        <BookOpen className="w-10 h-10 text-amber-600 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">{languageLabels[currentLanguage]} için hazır hikâye bulunmuyor</h2>
        <p className="text-sm text-slate-500">Başka dil seçebilir veya daha sonra canlı hikâye üretimi eklendiğinde bu bölümü kullanabilirsiniz.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-amber-100 text-amber-800 rounded-xl"><Layers className="w-5 h-5" /></div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm">{languageLabels[currentLanguage]} Hazır Hikâyeleri</h3>
            <p className="text-xs text-slate-500 font-medium">Uygulamaya önceden eklenmiş okuma ve dinleme metinleri</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar">
          {languageStories.map((story) => {
            const selected = story.id === activeStory.id;
            return (
              <button key={story.id} onClick={() => { setSelectedStoryId(story.id); setShowAllTranslations(false); }} className={`px-3.5 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap flex items-center space-x-1.5 ${selected ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                <span>{story.titleTr}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${selected ? 'bg-amber-700 text-amber-100' : 'bg-slate-200 text-slate-600'}`}>{story.level}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex justify-between items-start flex-wrap gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 rounded-md">Hazır okuma metni</span>
              <span className="text-xs font-semibold text-slate-500">{activeStory.level}</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mt-2"><VocabularyTooltip text={activeStory.titleTarget} language={currentLanguage} onAddLearningItem={onAddLearningItem} /></h2>
            <p className="text-sm font-semibold text-amber-900 mt-0.5">{activeStory.titleTr}</p>
          </div>
          <button onClick={() => setShowAllTranslations((previous) => !previous)} className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center space-x-1.5">
            {showAllTranslations ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-amber-600" />}
            <span>{showAllTranslations ? 'Çevirileri Gizle' : 'Çevirileri Göster'}</span>
          </button>
        </div>
        <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200"><strong>Özet:</strong> {activeStory.summaryTr}</p>
      </div>

      <div className="space-y-4">
        {activeStory.sentences.map((sentence, index) => (
          <div key={`${activeStory.id}_${index}`} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-300 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-slate-400">Cümle {index + 1}</span>
                <div className="text-base font-bold text-slate-900 leading-relaxed"><VocabularyTooltip text={sentence.targetText} language={currentLanguage} contextSentence={sentence.targetText} onAddLearningItem={onAddLearningItem} /></div>
                {showAllTranslations && <p className="text-xs font-medium text-slate-600 italic pt-1">“{sentence.turkishText}”</p>}
              </div>
              <button onClick={() => speakSentence(sentence.targetText)} className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl shrink-0" title="Cümleyi dinle"><Volume2 className="w-5 h-5" /></button>
            </div>
            {sentence.vocabulary.length > 0 && (
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Önemli ifadeler:</span>
                {sentence.vocabulary.map((vocab, vocabIndex) => {
                  const key = `${currentLanguage}:${vocab.term.toLocaleLowerCase()}`;
                  const added = Boolean(addedVocab[key]);
                  return (
                    <div key={`${key}_${vocabIndex}`} className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                      <span className="font-bold text-slate-800">{vocab.term}</span>
                      <span className="text-slate-400">({vocab.meaningTr})</span>
                      <button onClick={() => handleAddVocabToDeck(vocab.term, vocab.meaningTr)} disabled={added} className={`ml-1 p-0.5 rounded ${added ? 'text-emerald-600' : 'text-slate-400 hover:text-sky-600'}`} title="Öğrenme destesine ekle">{added ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
