import React, { useEffect, useMemo, useState } from 'react';
import { TargetLanguage, LearningItem, ProductionPrompt, ProductionAttempt, FossilizedError } from './types';
import { INITIAL_PROMPTS, INITIAL_ITEMS } from './data/initialData';
import { calculateNextMasteryState, scheduleReview } from './lib/engine';
import { AI_SERVICE_UNAVAILABLE_MARKER } from './lib/aiService';
import { Header } from './components/Header';
import { BugunTab } from './components/Tabs/BugunTab';
import { UretTab } from './components/Tabs/UretTab';
import { NasilSoylerimTab } from './components/Tabs/NasilSoylerimTab';
import { SohbetTab } from './components/Tabs/SohbetTab';
import { HikayelerTab } from './components/Tabs/HikayelerTab';
import { GramerPratigiTab } from './components/Tabs/GramerPratigiTab';
import { IlerlemeTab } from './components/Tabs/IlerlemeTab';
import { NotificationModal } from './components/NotificationModal';
import { CloudSyncModal } from './components/CloudSyncModal';
import { PwaInstallModal } from './components/PwaInstallModal';
import { FloatingAssistantChat } from './components/FloatingAssistantChat';

const todayKey = () => new Date().toISOString().slice(0, 10);
const normalizeText = (value: string) => value.trim().toLocaleLowerCase().replace(/[.,!?;:'“”"()]/g, '').replace(/\s+/g, ' ');

function readHistory(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem('lingua_daily_history') || '{}'); } catch { return {}; }
}

function calculateStreak(history: Record<string, number>): number {
  let streak = 0;
  const cursor = new Date();
  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if ((history[key] || 0) <= 0) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function App() {
  const [currentLanguage, setCurrentLanguage] = useState<TargetLanguage>('en');
  const [activeTab, setActiveTab] = useState<string>('bugun');
  const [darkMode, setDarkMode] = useState<boolean>(() => localStorage.getItem('lingua_dark_mode') === 'true');
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showCloudSyncModal, setShowCloudSyncModal] = useState(false);
  const [showPwaModal, setShowPwaModal] = useState(false);
  const [dailyHistory, setDailyHistory] = useState<Record<string, number>>(readHistory);

  const dailyGoalProgress = dailyHistory[todayKey()] || 0;
  const streakCount = useMemo(() => calculateStreak(dailyHistory), [dailyHistory]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('lingua_dark_mode', String(darkMode));
  }, [darkMode]);

  const [prompts, setPrompts] = useState<ProductionPrompt[]>(() => {
    try { const saved = localStorage.getItem('lingua_prompts'); return saved ? JSON.parse(saved) : INITIAL_PROMPTS; } catch { return INITIAL_PROMPTS; }
  });
  const [learningItems, setLearningItems] = useState<LearningItem[]>(() => {
    try { const saved = localStorage.getItem('lingua_items'); return saved ? JSON.parse(saved) : INITIAL_ITEMS; } catch { return INITIAL_ITEMS; }
  });
  const [fossilizedErrors, setFossilizedErrors] = useState<FossilizedError[]>(() => {
    try { const saved = localStorage.getItem('lingua_fossilized'); return saved ? JSON.parse(saved) : []; } catch { return []; }
  });

  useEffect(() => localStorage.setItem('lingua_prompts', JSON.stringify(prompts)), [prompts]);
  useEffect(() => localStorage.setItem('lingua_items', JSON.stringify(learningItems)), [learningItems]);
  useEffect(() => localStorage.setItem('lingua_fossilized', JSON.stringify(fossilizedErrors)), [fossilizedErrors]);
  useEffect(() => localStorage.setItem('lingua_daily_history', JSON.stringify(dailyHistory)), [dailyHistory]);

  const recordCompletedExercise = () => {
    const key = todayKey();
    setDailyHistory((previous) => ({ ...previous, [key]: (previous[key] || 0) + 1 }));
  };

  const handleRecordAttempt = (attempt: ProductionAttempt) => {
    if (attempt.evaluation.explanationTr.startsWith(AI_SERVICE_UNAVAILABLE_MARKER)) return;

    recordCompletedExercise();
    const matchedPrompt = prompts.find((prompt) => prompt.id === attempt.promptId);

    if (matchedPrompt) {
      const normalizedTarget = normalizeText(matchedPrompt.targetReference);
      setLearningItems((previous) => {
        const existingIndex = previous.findIndex(
          (item) => item.language === attempt.language && normalizeText(item.targetText) === normalizedTarget,
        );
        const hasHints = attempt.maxHintLevel > 0;

        if (existingIndex >= 0) {
          const existing = previous[existingIndex];
          const contextCount = attempt.finalRating === 'again' ? existing.contextCount : existing.contextCount + 1;
          const schedule = scheduleReview(existing, attempt.finalRating);
          const updated: LearningItem = {
            ...existing,
            ...schedule,
            contextCount,
            masteryState: calculateNextMasteryState(existing.masteryState, attempt.finalRating, hasHints, contextCount),
            isActiveVocabulary: attempt.finalRating !== 'again' && (!hasHints || existing.isActiveVocabulary),
            fossilizedCount: existing.fossilizedCount + (attempt.isFossilizedError ? 1 : 0),
          };
          return previous.map((item, index) => index === existingIndex ? updated : item);
        }

        const base: LearningItem = {
          id: `practice_${attempt.language}_${Date.now()}`,
          language: attempt.language,
          domain: matchedPrompt.domain,
          turkishText: matchedPrompt.turkishSentence,
          targetText: matchedPrompt.targetReference,
          keyTermOrPattern: matchedPrompt.keyTerms[0] || matchedPrompt.grammarPattern || matchedPrompt.targetReference,
          masteryState: 'new',
          isActiveVocabulary: false,
          contextCount: attempt.finalRating === 'again' ? 0 : 1,
          nextReviewDate: new Date().toISOString(),
          stability: 1,
          difficulty: 5,
          fossilizedCount: attempt.isFossilizedError ? 1 : 0,
        };
        const schedule = scheduleReview(base, attempt.finalRating);
        const created: LearningItem = {
          ...base,
          ...schedule,
          masteryState: calculateNextMasteryState(base.masteryState, attempt.finalRating, hasHints, base.contextCount),
          isActiveVocabulary: attempt.finalRating !== 'again' && !hasHints,
        };
        return [created, ...previous];
      });
    }

    if (!attempt.isFossilizedError) return;
    const newError: FossilizedError = {
      id: `foss_${Date.now()}`,
      language: attempt.language,
      domain: matchedPrompt?.domain || 'general',
      turkishPrompt: matchedPrompt?.turkishSentence || 'Üretim ifadesi',
      userAnswer: attempt.userAnswer,
      correctReference: matchedPrompt?.targetReference || attempt.evaluation.naturalAlternatives[0] || 'Referans ifade',
      errorDescription: attempt.evaluation.explanationTr,
      confidence: attempt.confidence,
      date: new Date().toISOString(),
      resolved: false,
    };
    setFossilizedErrors((previous) => [newError, ...previous]);
  };

  const handleAddLearningItem = (item: LearningItem) => setLearningItems((previous) => {
    const exists = previous.some((entry) => entry.language === item.language && normalizeText(entry.targetText) === normalizeText(item.targetText));
    return exists ? previous : [item, ...previous];
  });
  const handleAddLearningItems = (items: LearningItem[]) => setLearningItems((previous) => {
    const seen = new Set(previous.map((item) => `${item.language}:${normalizeText(item.targetText)}`));
    const unique = items.filter((item) => {
      const key = `${item.language}:${normalizeText(item.targetText)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return [...unique, ...previous];
  });
  const handleImportPrompts = (items: ProductionPrompt[]) => setPrompts((previous) => {
    const ids = new Set(previous.map((item) => item.id));
    return [...items.filter((item) => !ids.has(item.id)), ...previous];
  });
  const handleResolveFossilizedError = (id: string) => {
    setFossilizedErrors((previous) => previous.map((error) => error.id === id ? { ...error, resolved: true } : error));
    recordCompletedExercise();
  };

  const handleClearData = () => {
    if (!confirm('Tüm kişisel pratik verilerini sıfırlamak istediğinize emin misiniz?')) return;
    ['lingua_prompts', 'lingua_items', 'lingua_fossilized', 'lingua_daily_history'].forEach((key) => localStorage.removeItem(key));
    setPrompts(INITIAL_PROMPTS);
    setLearningItems(INITIAL_ITEMS);
    setFossilizedErrors([]);
    setDailyHistory({});
  };

  const now = Date.now();
  const activeCount = learningItems.filter((item) => item.language === currentLanguage && item.isActiveVocabulary).length;
  const passiveCount = learningItems.filter((item) => item.language === currentLanguage && !item.isActiveVocabulary).length;
  const dueCount = learningItems.filter((item) => item.language === currentLanguage && Number.isFinite(Date.parse(item.nextReviewDate)) && Date.parse(item.nextReviewDate) <= now).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-sky-100 selection:text-sky-900 transition-colors">
      <NotificationModal isOpen={showNotificationModal} onClose={() => setShowNotificationModal(false)} dueCount={dueCount} currentLanguage={currentLanguage} dailyGoalProgress={dailyGoalProgress} />
      <CloudSyncModal isOpen={showCloudSyncModal} onClose={() => setShowCloudSyncModal(false)} itemCount={learningItems.length} errorCount={fossilizedErrors.length} />
      <Header currentLanguage={currentLanguage} onLanguageChange={setCurrentLanguage} streakCount={streakCount} dueCount={dueCount} activeCount={activeCount} passiveCount={passiveCount} activeTab={activeTab} onTabChange={setActiveTab} darkMode={darkMode} onToggleDarkMode={() => setDarkMode(!darkMode)} onOpenNotifications={() => setShowNotificationModal(true)} onOpenCloudSync={() => setShowCloudSyncModal(true)} onOpenPwaModal={() => setShowPwaModal(true)} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'bugun' && <BugunTab currentLanguage={currentLanguage} learningItems={learningItems} fossilizedErrors={fossilizedErrors} onNavigateTab={setActiveTab} />}
        {activeTab === 'uret' && <UretTab currentLanguage={currentLanguage} prompts={prompts} onRecordAttempt={handleRecordAttempt} onAddLearningItem={handleAddLearningItem} />}
        {activeTab === 'gramer_pratigi' && <GramerPratigiTab currentLanguage={currentLanguage} fossilizedErrors={fossilizedErrors} onAddLearningItem={handleAddLearningItem} onMarkErrorResolved={handleResolveFossilizedError} />}
        {activeTab === 'nasil_soylerim' && <NasilSoylerimTab currentLanguage={currentLanguage} onAddLearningItem={handleAddLearningItem} />}
        {activeTab === 'sohbet' && <SohbetTab currentLanguage={currentLanguage} />}
        {activeTab === 'hikayeler' && <HikayelerTab currentLanguage={currentLanguage} onAddLearningItem={handleAddLearningItem} />}
        {activeTab === 'ilerleme' && <IlerlemeTab currentLanguage={currentLanguage} learningItems={learningItems} fossilizedErrors={fossilizedErrors} onResolveFossilizedError={handleResolveFossilizedError} onClearData={handleClearData} onImportPrompts={handleImportPrompts} onAddLearningItems={handleAddLearningItems} />}
      </main>
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-4 mt-auto transition-colors pb-16 sm:pb-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 flex-wrap gap-2">
          <p>© 2026 Lingua Production Coach — Yabancı Dil Öğrenme & Aktif Üretim Koçu (EN/DE/SR)</p>
          <div className="flex items-center space-x-4">
            <button onClick={() => setShowPwaModal(true)} className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold">📱 Telefona Yükle (PWA)</button>
            <button onClick={() => setShowNotificationModal(true)} className="text-slate-600 dark:text-slate-300 hover:underline font-semibold">🔔 Bildirim Ayarları</button>
          </div>
        </div>
      </footer>
      <PwaInstallModal isOpen={showPwaModal} onClose={() => setShowPwaModal(false)} />
      <FloatingAssistantChat currentLanguage={currentLanguage} onLanguageChange={setCurrentLanguage} activeTab={activeTab} onTabChange={setActiveTab} darkMode={darkMode} onToggleDarkMode={setDarkMode} onOpenNotifications={() => setShowNotificationModal(true)} onOpenCloudSync={() => setShowCloudSyncModal(true)} />
    </div>
  );
}
