import React, { useState, useEffect } from 'react';
import { TargetLanguage, AdaptiveStory, LearningItem } from '../../types';
import { INITIAL_STORIES } from '../../data/initialData';
import { VocabularyTooltip } from '../VocabularyTooltip';
import { BookOpen, Volume2, Plus, Check, Eye, EyeOff, Layers } from 'lucide-react';

interface HikayelerTabProps {
  currentLanguage: TargetLanguage;
  onAddLearningItem: (item: LearningItem) => void;
}

export const HikayelerTab: React.FC<HikayelerTabProps> = ({
  currentLanguage,
  onAddLearningItem,
}) => {
  const languageStories = INITIAL_STORIES.filter((s) => s.language === currentLanguage);
  const [selectedStoryId, setSelectedStoryId] = useState<string>(
    languageStories[0]?.id || INITIAL_STORIES[0].id
  );

  // Automatically switch active story when target language changes
  useEffect(() => {
    const available = INITIAL_STORIES.filter((s) => s.language === currentLanguage);
    if (available.length > 0) {
      setSelectedStoryId(available[0].id);
    }
  }, [currentLanguage]);

  const activeStory =
    languageStories.find((s) => s.id === selectedStoryId) ||
    languageStories[0] ||
    INITIAL_STORIES[0];

  const [showAllTranslations, setShowAllTranslations] = useState(false);
  const [addedVocab, setAddedVocab] = useState<Record<string, boolean>>({});

  const speakSentence = (text: string) => {
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

  const handleAddVocabToDeck = (term: string, meaningTr: string) => {
    const newItem: LearningItem = {
      id: `item_story_${Date.now()}`,
      language: currentLanguage,
      domain: activeStory.domain,
      turkishText: meaningTr,
      targetText: term,
      keyTermOrPattern: term,
      masteryState: 'noticed',
      isActiveVocabulary: false,
      contextCount: 1,
      nextReviewDate: new Date().toISOString(),
      stability: 1.0,
      difficulty: 5.0,
      fossilizedCount: 0,
    };

    onAddLearningItem(newItem);
    setAddedVocab((prev) => ({ ...prev, [term]: true }));
  };

  const languageLabels: Record<TargetLanguage, string> = {
    en: 'İngilizce',
    de: 'Almanca',
    sr: 'Sırpça',
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Story Selection Selector bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm">
              {languageLabels[currentLanguage]} Hikaye Koleksiyonu
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Aktif dilde i+1 okuma & dinleme metinlerini keşfedin
            </p>
          </div>
        </div>

        {/* Story Tabs */}
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar">
          {languageStories.map((s) => {
            const isSelected = s.id === activeStory.id;
            return (
              <button
                key={s.id}
                onClick={() => setSelectedStoryId(s.id)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{s.titleTr}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                    isSelected
                      ? 'bg-amber-700 text-amber-100'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {s.level}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Story Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex justify-between items-start flex-wrap gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 rounded-md">
                i+1 Okuma & Dinleme
              </span>
              <span className="text-xs font-semibold text-slate-500">{activeStory.level}</span>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mt-2">
              <VocabularyTooltip
                text={activeStory.titleTarget}
                language={currentLanguage}
                onAddLearningItem={onAddLearningItem}
              />
            </h2>
            <p className="text-sm font-semibold text-amber-900 mt-0.5">{activeStory.titleTr}</p>
          </div>

          <button
            onClick={() => setShowAllTranslations((prev) => !prev)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-colors"
          >
            {showAllTranslations ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-amber-600" />}
            <span>{showAllTranslations ? 'Tüm Çevirileri Gizle' : 'Tüm Çevirileri Göster'}</span>
          </button>
        </div>

        <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <strong>Özet:</strong> {activeStory.summaryTr}
        </p>
      </div>

      {/* Story Sentences Stream */}
      <div className="space-y-4">
        {activeStory.sentences.map((sentence, idx) => (
          <div
            key={idx}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-300 transition-all space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-slate-400">Cümle {idx + 1}</span>
                <div className="text-base font-bold text-slate-900 leading-relaxed">
                  <VocabularyTooltip
                    text={sentence.targetText}
                    language={currentLanguage}
                    contextSentence={sentence.targetText}
                    onAddLearningItem={onAddLearningItem}
                  />
                </div>

                {(showAllTranslations || true) && (
                  <p className="text-xs font-medium text-slate-600 italic pt-1">
                    "{sentence.turkishText}"
                  </p>
                )}
              </div>

              <button
                onClick={() => speakSentence(sentence.targetText)}
                className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl shrink-0 transition-colors"
                title="Cümleyi Sesli Dinle"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>

            {/* Sentence Vocabulary Chips */}
            {sentence.vocabulary.length > 0 && (
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Önemli İfadeler:</span>
                {sentence.vocabulary.map((vocab, vIdx) => {
                  const isAdded = addedVocab[vocab.term];

                  return (
                    <div
                      key={vIdx}
                      className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    >
                      <span className="font-bold text-slate-800">{vocab.term}</span>
                      <span className="text-slate-400">({vocab.meaningTr})</span>

                      <button
                        onClick={() => handleAddVocabToDeck(vocab.term, vocab.meaningTr)}
                        disabled={isAdded}
                        className={`ml-1 p-0.5 rounded transition-colors ${
                          isAdded ? 'text-emerald-600' : 'text-slate-400 hover:text-sky-600'
                        }`}
                        title="SRS Destesine Ekle"
                      >
                        {isAdded ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      </button>
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
