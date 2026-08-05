import React, { useEffect, useMemo, useState } from 'react';
import { TargetLanguage, LearningItem, ProductionPrompt, ProductionAttempt, FossilizedError, PromptHistory } from './types';
import { INITIAL_PROMPTS } from './data/initialData';
import { calculateNextMasteryState, scheduleReview } from './lib/engine';
import { AI_SERVICE_UNAVAILABLE_MARKER } from './lib/aiService';
import { normalizeSentenceText } from './lib/text';
import {
  CLOUD_DATA_APPLIED_EVENT,
  persistSyncedLocalValue,
  removeSyncedLocalValue,
} from './lib/supabaseDataSync';
import { readPromptHistory, recordPromptCompleted, recordPromptShown } from './lib/promptHistory';
import { removeLegacyDemoLearningItems } from './lib/progressData';
import {
  DAILY_GOAL,
  crossedDailyGoal,
  calculateLanguageStreak,
  getDailyCount,
  incrementDailyCount,
  todayKey,
} from './lib/dailyProgress';
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
import { SessionCompleteModal } from './components/SessionCompleteModal';
import { FloatingAssistantChat } from './components/FloatingAssistantChat';

const normalizeText = normalizeSentenceText;

const SESSION_SEEN_KEY = 'lingua_session_seen';
const PROMPT_HISTORY_KEY = 'lingua_prompt_history';
const EMPTY_SEEN: Record<TargetLanguage, string[]> = { en: [], de: [], sr: [] };

function readSessionSeen(): Record<TargetLanguage, string[]> {
  try {
    const saved = JSON.parse(localStorage.getItem(SESSION_SEEN_KEY) || '{}');
    return { ...EMPTY_SEEN, ...saved };
  } catch {
    return { ...EMPTY_SEEN };
  }
}

function readHistory(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem('lingua_daily_history') || '{}'); } catch { return {}; }
}

function readLearningItems(): LearningItem[] {
  try {
    const saved = localStorage.getItem('lingua_items');
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? removeLegacyDemoLearningItems(parsed as LearningItem[]) : [];
  } catch {
    return [];
  }
}

export function App() {
  const [currentLanguage, setCurrentLanguage] = useState<TargetLanguage>('en');
  const [activeTab, setActiveTab] = useState<string>('bugun');
  const [darkMode, setDarkMode] = useState<boolean>(() => localStorage.getItem('lingua_dark_mode') === 'true');
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showCloudSyncModal, setShowCloudSyncModal] = useState(false);
  const [showPwaModal, setShowPwaModal] = useState(false);
  const [dailyHistory, setDailyHistory] = useState<Record<string, number>>(readHistory);
  const [promptHistory, setPromptHistory] = useState<PromptHistory>(() => readPromptHistory(localStorage.getItem(PROMPT_HISTORY_KEY)));
  // Prompt ids already shown during the current practice session, per language.
  // Kept local-only (not synced to Supabase): "already seen this session" is a
  // per-device presentation concern, not learning data that should be shared
  // across devices. See docs/DECISIONS_AND_OPEN_QUESTIONS.md.
  const [sessionSeenIds, setSessionSeenIds] = useState<Record<TargetLanguage, string[]>>(readSessionSeen);
  const [sessionCompleteLanguage, setSessionCompleteLanguage] = useState<TargetLanguage | null>(null);

  const dailyGoalProgress = getDailyCount(dailyHistory, currentLanguage, todayKey());
  const streakCount = useMemo(() => calculateLanguageStreak(dailyHistory, currentLanguage), [dailyHistory, currentLanguage]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    persistSyncedLocalValue('lingua_dark_mode', darkMode);
  }, [darkMode]);

  const [prompts, setPrompts] = useState<ProductionPrompt[]>(() => {
    try { const saved = localStorage.getItem('lingua_prompts'); return saved ? JSON.parse(saved) : INITIAL_PROMPTS; } catch { return INITIAL_PROMPTS; }
  });
  const [learningItems, setLearningItems] = useState<LearningItem[]>(readLearningItems);
  const [fossilizedErrors, setFossilizedErrors] = useState<FossilizedError[]>(() => {
    try { const saved = localStorage.getItem('lingua_fossilized'); return saved ? JSON.parse(saved) : []; } catch { return []; }
  });

  useEffect(() => persistSyncedLocalValue('lingua_prompts', prompts), [prompts]);
  useEffect(() => persistSyncedLocalValue('lingua_items', learningItems), [learningItems]);
  useEffect(() => persistSyncedLocalValue('lingua_fossilized', fossilizedErrors), [fossilizedErrors]);
  useEffect(() => persistSyncedLocalValue('lingua_daily_history', dailyHistory), [dailyHistory]);
  useEffect(() => persistSyncedLocalValue(PROMPT_HISTORY_KEY, promptHistory), [promptHistory]);
  useEffect(() => localStorage.setItem(SESSION_SEEN_KEY, JSON.stringify(sessionSeenIds)), [sessionSeenIds]);

  // A background Supabase sync can merge in data from another device at any
  // time. It used to force a full page reload to pick that up, which threw
  // away in-memory UI state (active tab, in-progress Üret session) — now it
  // notifies this listener instead so state updates in place.
  useEffect(() => {
    const handleCloudDataApplied = (event: Event) => {
      const detail = (event as CustomEvent<Record<string, unknown>>).detail || {};
      if (Array.isArray(detail.lingua_prompts)) setPrompts(detail.lingua_prompts as ProductionPrompt[]);
      if (Array.isArray(detail.lingua_items)) {
        setLearningItems(removeLegacyDemoLearningItems(detail.lingua_items as LearningItem[]));
      }
      if (Array.isArray(detail.lingua_fossilized)) setFossilizedErrors(detail.lingua_fossilized as FossilizedError[]);
      if (detail.lingua_daily_history && typeof detail.lingua_daily_history === 'object') {
        setDailyHistory(detail.lingua_daily_history as Record<string, number>);
      }
      if (detail.lingua_prompt_history && typeof detail.lingua_prompt_history === 'object') {
        setPromptHistory(readPromptHistory(JSON.stringify(detail.lingua_prompt_history)));
      }
      if (typeof detail.lingua_dark_mode === 'boolean') setDarkMode(detail.lingua_dark_mode);
    };
    window.addEventListener(CLOUD_DATA_APPLIED_EVENT, handleCloudDataApplied);
    return () => window.removeEventListener(CLOUD_DATA_APPLIED_EVENT, handleCloudDataApplied);
  }, []);

  const recordCompletedExercise = (language: TargetLanguage) => {
    const key = todayKey();
    const before = getDailyCount(dailyHistory, language, key);
    const updated = incrementDailyCount(dailyHistory, language, key);
    setDailyHistory(updated);
    if (crossedDailyGoal(before, getDailyCount(updated, language, key))) {
      setSessionCompleteLanguage(language);
    }
  };

  const handlePromptShown = (promptId: string) => {
    setPromptHistory((previous) => recordPromptShown(previous, currentLanguage, promptId));
    setSessionSeenIds((previous) => {
      const existing = previous[currentLanguage] || [];
      if (existing.includes(promptId)) return previous;
      return { ...previous, [currentLanguage]: [...existing, promptId] };
    });
  };

  const handleContinueSession = () => setSessionCompleteLanguage(null);

  const handleEndSession = () => {
    const language = sessionCompleteLanguage ?? currentLanguage;
    setSessionCompleteLanguage(null);
    setSessionSeenIds((previous) => ({ ...previous, [language]: [] }));
    setActiveTab('bugun');
  };

  const handleRecordAttempt = (attempt: ProductionAttempt) => {
    if (attempt.evaluation.explanationTr.startsWith(AI_SERVICE_UNAVAILABLE_MARKER)) return;

    setPromptHistory((previous) => recordPromptCompleted(
      previous,
      attempt.language,
      attempt.promptId,
      attempt.finalRating,
      new Date(attempt.createdAt),
    ));
    recordCompletedExercise(attempt.language);
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
    const target = fossilizedErrors.find((error) => error.id === id);
    setFossilizedErrors((previous) => previous.map((error) => error.id === id ? { ...error, resolved: true } : error));
    recordCompletedExercise(target?.language ?? currentLanguage);
  };

  const handleClearData = () => {
    if (!confirm('Tüm kişisel pratik verilerini sıfırlamak istediğinize emin misiniz?')) return;
    const syncedKeys = ['lingua_prompts', 'lingua_items', 'lingua_fossilized', 'lingua_daily_history', PROMPT_HISTORY_KEY] as const;
    syncedKeys.forEach((key) => removeSyncedLocalValue(key));
    localStorage.removeItem(SESSION_SEEN_KEY);
    setPrompts(INITIAL_PROMPTS);
    setLearningItems([]);
    setFossilizedErrors([]);
    setDailyHistory({});
    setPromptHistory({});
    setSessionSeenIds({ ...EMPTY_SEEN });
    setSessionCompleteLanguage(null);
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
        {activeTab === 'uret' && (
          <UretTab
            currentLanguage={currentLanguage}
            prompts={prompts}
            learningItems={learningItems}
            fossilizedErrors={fossilizedErrors}
            seenPromptIds={sessionSeenIds[currentLanguage] || []}
            promptHistory={promptHistory}
            onPromptShown={handlePromptShown}
            onRecordAttempt={handleRecordAttempt}
            onAddLearningItem={handleAddLearningItem}
            onImportPrompts={handleImportPrompts}
          />
        )}
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
      <SessionCompleteModal
        language={sessionCompleteLanguage}
        dailyGoal={DAILY_GOAL}
        onContinue={handleContinueSession}
        onEndSession={handleEndSession}
      />
      <FloatingAssistantChat currentLanguage={currentLanguage} onLanguageChange={setCurrentLanguage} activeTab={activeTab} onTabChange={setActiveTab} darkMode={darkMode} onToggleDarkMode={setDarkMode} onOpenNotifications={() => setShowNotificationModal(true)} onOpenCloudSync={() => setShowCloudSyncModal(true)} />
    </div>
  );
}
