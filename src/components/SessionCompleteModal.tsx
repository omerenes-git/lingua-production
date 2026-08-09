import React, { useEffect } from 'react';
import { PartyPopper, ArrowRight, Home } from 'lucide-react';
import { TargetLanguage } from '../types';
import { triggerGoalConfetti } from '../lib/confetti';

interface SessionCompleteModalProps {
  language: TargetLanguage | null;
  dailyGoal: number;
  onContinue: () => void;
  onEndSession: () => void;
}

const languageNames: Record<TargetLanguage, string> = {
  en: 'İngilizce',
  de: 'Almanca',
  sr: 'Sırpça',
};

export const SessionCompleteModal: React.FC<SessionCompleteModalProps> = ({
  language,
  dailyGoal,
  onContinue,
  onEndSession,
}) => {
  useEffect(() => {
    if (language) {
      triggerGoalConfetti();
    }
  }, [language]);

  if (!language) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mx-auto">
          <PartyPopper className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-900 dark:text-white">Günlük Hedef Tamamlandı! 🎉</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Bugün {languageNames[language]} için {dailyGoal} cümlelik günlük hedefine ulaştın. Devam etmek mi
            istersin, yoksa oturumu burada bitirmek mi?
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={onContinue}
            className="flex-1 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm rounded-xl shadow-md transition-colors flex items-center justify-center space-x-2"
          >
            <span>Çalışmaya Devam Et</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onEndSession}
            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm rounded-xl transition-colors flex items-center justify-center space-x-2"
          >
            <Home className="w-4 h-4" />
            <span>Oturumu Bitir</span>
          </button>
        </div>
      </div>
    </div>
  );
};
