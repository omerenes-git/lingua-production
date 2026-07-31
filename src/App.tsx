import React, { useState, useEffect } from 'react';
import { TargetLanguage, LearningItem, ProductionPrompt, ProductionAttempt, FossilizedError } from './types';
import { INITIAL_PROMPTS, INITIAL_ITEMS } from './data/initialData';
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
import { auth, ensureAnonymousUser, syncLearningItemsToCloud, syncFossilizedErrorsToCloud, db } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot } from 'firebase/firestore';

export function App() {
  const [currentLanguage, setCurrentLanguage] = useState<TargetLanguage>('en');
  const [activeTab, setActiveTab] = useState<string>('bugun');

  // Dark mode state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('lingua_dark_mode') === 'true';
  });

  // Notification, PWA & Cloud sync modal states
  const [showNotificationModal, setShowNotificationModal] = useState<boolean>(false);
  const [showCloudSyncModal, setShowCloudSyncModal] = useState<boolean>(false);
  const [showPwaModal, setShowPwaModal] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [dailyGoalProgress, setDailyGoalProgress] = useState<number>(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    try {
      const historyRaw = localStorage.getItem('lingua_daily_history') || '{}';
      const history = JSON.parse(historyRaw);
      return history[todayStr] || 0;
    } catch {
      return 0;
    }
  });

  // Initialize Anonymous user or load current auth
  useEffect(() => {
    ensureAnonymousUser();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('lingua_dark_mode', darkMode.toString());
  }, [darkMode]);

  const [prompts, setPrompts] = useState<ProductionPrompt[]>(() => {
    try {
      const saved = localStorage.getItem('lingua_prompts');
      return saved ? JSON.parse(saved) : INITIAL_PROMPTS;
    } catch (e) {
      console.warn('Failed to parse lingua_prompts from localStorage:', e);
      return INITIAL_PROMPTS;
    }
  });

  const [learningItems, setLearningItems] = useState<LearningItem[]>(() => {
    try {
      const saved = localStorage.getItem('lingua_items');
      return saved ? JSON.parse(saved) : INITIAL_ITEMS;
    } catch (e) {
      console.warn('Failed to parse lingua_items from localStorage:', e);
      return INITIAL_ITEMS;
    }
  });

  const [fossilizedErrors, setFossilizedErrors] = useState<FossilizedError[]>(() => {
    try {
      const saved = localStorage.getItem('lingua_fossilized');
      return saved ? JSON.parse(saved) : [
        {
          id: 'f_1',
          language: 'en',
          domain: 'clinical',
          turkishPrompt: 'Egzersiz sırasında omuz ağrınız artarsa hareketi derhal durdurun.',
          userAnswer: 'If shoulder pain rise, stop movement.',
          correctReference: 'If your shoulder pain increases during exercise, stop the movement immediately.',
          errorDescription: 'Emin olunan yüksek güvenli dilbilgisi ve edat hatası.',
          confidence: 'certain',
          date: new Date().toISOString(),
          resolved: false,
        }
      ];
    } catch (e) {
      console.warn('Failed to parse lingua_fossilized from localStorage:', e);
      return [];
    }
  });

  // Listen to Firestore real-time updates for learningItems
  useEffect(() => {
    if (!currentUser) return;

    const itemsRef = collection(db, 'users', currentUser.uid, 'learningItems');
    const unsubscribe = onSnapshot(itemsRef, (snapshot) => {
      if (!snapshot.empty) {
        const cloudItems: LearningItem[] = [];
        snapshot.forEach((docSnap) => {
          cloudItems.push(docSnap.data() as LearningItem);
        });
        if (cloudItems.length > 0) {
          console.log(`[DataFlow Audit] Loaded ${cloudItems.length} learning items from Firestore cloud database.`);
          setLearningItems(cloudItems);
        }
      }
    }, (err: any) => {
      if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota exceeded')) {
        console.warn('[DataFlow Audit] LearningItems Firestore sync quota reached. Using local storage fallback.');
      } else {
        console.error('[DataFlow Audit] LearningItems sync snapshot error:', err);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Listen to Firestore real-time updates for fossilizedErrors
  useEffect(() => {
    if (!currentUser) return;

    const errorsRef = collection(db, 'users', currentUser.uid, 'fossilizedErrors');
    const unsubscribe = onSnapshot(errorsRef, (snapshot) => {
      if (!snapshot.empty) {
        const cloudErrors: FossilizedError[] = [];
        snapshot.forEach((docSnap) => {
          cloudErrors.push(docSnap.data() as FossilizedError);
        });
        if (cloudErrors.length > 0) {
          console.log(`[DataFlow Audit] Loaded ${cloudErrors.length} fossilized errors from Firestore cloud database.`);
          setFossilizedErrors(cloudErrors);
        }
      }
    }, (err: any) => {
      if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota exceeded')) {
        console.warn('[DataFlow Audit] FossilizedErrors Firestore sync quota reached. Using local storage fallback.');
      } else {
        console.error('[DataFlow Audit] FossilizedErrors sync snapshot error:', err);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('lingua_prompts', JSON.stringify(prompts));
  }, [prompts]);

  useEffect(() => {
    localStorage.setItem('lingua_items', JSON.stringify(learningItems));
  }, [learningItems]);

  useEffect(() => {
    localStorage.setItem('lingua_fossilized', JSON.stringify(fossilizedErrors));
  }, [fossilizedErrors]);

  const handleRecordAttempt = (attempt: ProductionAttempt) => {
    if (attempt.isFossilizedError) {
      const matchedPrompt = prompts.find((p) => p.id === attempt.promptId);
      const newFossilized: FossilizedError = {
        id: `foss_${Date.now()}`,
        language: attempt.language,
        domain: matchedPrompt?.domain || 'clinical',
        turkishPrompt: matchedPrompt?.turkishSentence || 'Klinik İfade',
        userAnswer: attempt.userAnswer,
        correctReference: matchedPrompt?.targetReference || attempt.evaluation.naturalAlternatives[0] || 'Referans İfade',
        errorDescription: attempt.evaluation.explanationTr,
        confidence: attempt.confidence,
        date: new Date().toISOString(),
        resolved: false,
      };

      setFossilizedErrors((prev) => {
        const updated = [newFossilized, ...prev];
        if (currentUser) {
          syncFossilizedErrorsToCloud(currentUser.uid, [newFossilized]);
        }
        return updated;
      });
    }
  };

  const handleAddLearningItem = (newItem: LearningItem) => {
    setLearningItems((prev) => {
      const updated = [newItem, ...prev];
      if (currentUser) {
        syncLearningItemsToCloud(currentUser.uid, [newItem]);
      }
      return updated;
    });
  };

  const handleAddLearningItems = (items: LearningItem[]) => {
    setLearningItems((prev) => {
      const updated = [...items, ...prev];
      if (currentUser) {
        syncLearningItemsToCloud(currentUser.uid, items);
      }
      return updated;
    });
  };

  const handleImportPrompts = (newPrompts: ProductionPrompt[]) => {
    setPrompts((prev) => [...newPrompts, ...prev]);
  };

  const handleResolveFossilizedError = (id: string) => {
    setFossilizedErrors((prev) => {
      const updated = prev.map((e) => (e.id === id ? { ...e, resolved: true } : e));
      const resolvedItem = updated.find((e) => e.id === id);
      if (currentUser && resolvedItem) {
        syncFossilizedErrorsToCloud(currentUser.uid, [resolvedItem]);
        console.log(`[DataFlow] Resolved fossilized error ${id} synced to Firestore & LocalStorage.`);
      } else {
        console.log(`[DataFlow] Resolved fossilized error ${id} saved to LocalStorage.`);
      }
      return updated;
    });
  };

  const handleClearData = () => {
    if (confirm('Tüm kişisel pratik verilerini sıfırlamak istediğinize emin misiniz?')) {
      localStorage.clear();
      setPrompts(INITIAL_PROMPTS);
      setLearningItems(INITIAL_ITEMS);
      setFossilizedErrors([]);
      setDailyGoalProgress(0);
    }
  };

  const activeCount = learningItems.filter(
    (i) => i.language === currentLanguage && i.isActiveVocabulary
  ).length;

  const passiveCount = learningItems.filter(
    (i) => i.language === currentLanguage && !i.isActiveVocabulary
  ).length;

  const dueCount = learningItems.filter(
    (i) => i.language === currentLanguage && new Date(i.nextReviewDate) <= new Date()
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-sky-100 selection:text-sky-900 transition-colors">
      {/* Notification Modal */}
      <NotificationModal
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        dueCount={dueCount}
        currentLanguage={currentLanguage}
        dailyGoalProgress={dailyGoalProgress}
      />

      {/* Cloud Sync Modal */}
      <CloudSyncModal
        isOpen={showCloudSyncModal}
        onClose={() => setShowCloudSyncModal(false)}
        itemCount={learningItems.length}
        errorCount={fossilizedErrors.length}
      />

      {/* Header Bar */}
      <Header
        currentLanguage={currentLanguage}
        onLanguageChange={setCurrentLanguage}
        streakCount={7}
        dueCount={dueCount}
        activeCount={activeCount}
        passiveCount={passiveCount}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onOpenNotifications={() => setShowNotificationModal(true)}
        onOpenCloudSync={() => setShowCloudSyncModal(true)}
        onOpenPwaModal={() => setShowPwaModal(true)}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'bugun' && (
          <BugunTab
            currentLanguage={currentLanguage}
            learningItems={learningItems}
            fossilizedErrors={fossilizedErrors}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'uret' && (
          <UretTab
            currentLanguage={currentLanguage}
            prompts={prompts}
            onRecordAttempt={handleRecordAttempt}
            onAddLearningItem={handleAddLearningItem}
          />
        )}

        {activeTab === 'gramer_pratigi' && (
          <GramerPratigiTab
            currentLanguage={currentLanguage}
            fossilizedErrors={fossilizedErrors}
            onAddLearningItem={handleAddLearningItem}
            onMarkErrorResolved={handleResolveFossilizedError}
          />
        )}

        {activeTab === 'nasil_soylerim' && (
          <NasilSoylerimTab
            currentLanguage={currentLanguage}
            onAddLearningItem={handleAddLearningItem}
          />
        )}

        {activeTab === 'sohbet' && (
          <SohbetTab currentLanguage={currentLanguage} />
        )}

        {activeTab === 'hikayeler' && (
          <HikayelerTab
            currentLanguage={currentLanguage}
            onAddLearningItem={handleAddLearningItem}
          />
        )}

        {activeTab === 'ilerleme' && (
          <IlerlemeTab
            currentLanguage={currentLanguage}
            learningItems={learningItems}
            fossilizedErrors={fossilizedErrors}
            onResolveFossilizedError={handleResolveFossilizedError}
            onClearData={handleClearData}
            onImportPrompts={handleImportPrompts}
            onAddLearningItems={handleAddLearningItems}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-4 mt-auto transition-colors pb-16 sm:pb-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 flex-wrap gap-2">
          <p>© 2026 Lingua Production Coach — Yabancı Dil Öğrenme & Aktif Üretim Koçu (EN/DE/SR)</p>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowPwaModal(true)}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold flex items-center gap-1"
            >
              📱 Telefona Yükle (PWA)
            </button>
            <button
              onClick={() => setShowNotificationModal(true)}
              className="text-slate-600 dark:text-slate-300 hover:underline font-semibold"
            >
              🔔 Bildirim Ayarları
            </button>
          </div>
        </div>
      </footer>

      {/* PWA Mobile Installation Modal */}
      <PwaInstallModal
        isOpen={showPwaModal}
        onClose={() => setShowPwaModal(false)}
      />

      {/* Floating AI Chatbot Assistant */}
      <FloatingAssistantChat
        currentLanguage={currentLanguage}
        onLanguageChange={setCurrentLanguage}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        darkMode={darkMode}
        onToggleDarkMode={(val) => setDarkMode(val)}
        onOpenNotifications={() => setShowNotificationModal(true)}
        onOpenCloudSync={() => setShowCloudSyncModal(true)}
      />
    </div>
  );
}
