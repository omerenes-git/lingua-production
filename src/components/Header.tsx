import React from 'react';
import { motion } from 'framer-motion';
import { TargetLanguage } from '../types';
import {
  Flame,
  Clock,
  Zap,
  Moon,
  Sun,
  Bell,
  Cloud,
  Smartphone,
  BookOpen,
  LogOut,
  Sparkles,
} from 'lucide-react';

interface HeaderProps {
  currentLanguage: TargetLanguage;
  onLanguageChange: (lang: TargetLanguage) => void;
  streakCount: number;
  dueCount: number;
  activeCount: number;
  passiveCount: number;
  activeTab: string;
  onTabChange: (tab: string) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenNotifications: () => void;
  onOpenCloudSync: () => void;
  onOpenPwaModal?: () => void;
  onSignOut?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentLanguage,
  onLanguageChange,
  streakCount,
  dueCount,
  activeCount,
  passiveCount,
  activeTab,
  onTabChange,
  darkMode,
  onToggleDarkMode,
  onOpenNotifications,
  onOpenCloudSync,
  onOpenPwaModal,
  onSignOut,
}) => {
  const languageNames: Record<TargetLanguage, { name: string; flag: string }> = {
    en: { name: 'İngilizce', flag: '🇬🇧' },
    de: { name: 'Almanca', flag: '🇩🇪' },
    sr: { name: 'Sırpça', flag: '🇷🇸' },
  };

  const tabs = [
    { id: 'bugun', label: 'Bugün', icon: Sparkles },
    { id: 'uret', label: 'Üret (Pratik)', icon: Zap },
    { id: 'gramer_pratigi', label: 'Gramer Koçu', icon: BookOpen },
    { id: 'nasil_soylerim', label: 'Nasıl Söylerim?', icon: Sparkles },
    { id: 'sohbet', label: 'Sohbet', icon: Bell },
    { id: 'ilerleme', label: 'İlerleme & Hatalarım', icon: Clock },
  ];

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 transition-colors duration-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <motion.div
              whileHover={{ rotate: 10, scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-indigo-600 flex items-center justify-center text-white shadow-md font-bold text-xl"
            >
              L
            </motion.div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 dark:from-emerald-400 dark:via-teal-400 dark:to-indigo-400 bg-clip-text text-transparent leading-tight">
                Lingua Production Coach
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                Pasif ezber değil, aktif üretim & FSRS aralıklı tekrar
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
            {(['en', 'de', 'sr'] as TargetLanguage[]).map((lang) => {
              const isActive = currentLanguage === lang;
              return (
                <button
                  key={lang}
                  onClick={() => onLanguageChange(lang)}
                  aria-label={`${languageNames[lang].flag} ${languageNames[lang].name}`}
                  className={`relative px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
                    isActive
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{languageNames[lang].flag}</span>
                  <span className="hidden md:inline">{languageNames[lang].name}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center space-x-2">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-semibold"
              title="Günlük Çalışma Serisi"
            >
              <Flame className="w-4 h-4 text-amber-500 fill-amber-500 animate-pulse" />
              <span>{streakCount} Gün</span>
            </motion.div>

            {dueCount > 0 && (
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-xs font-semibold"
                title="Tekrar Bekleyen Kartlar"
              >
                <Clock className="w-4 h-4 text-indigo-500" />
                <span>{dueCount} Tekrar</span>
              </motion.div>
            )}

            <button
              onClick={onOpenCloudSync}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Bulut Senkronizasyon Status"
              aria-label="Bulut Senkronize"
            >
              <Cloud className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenNotifications}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Bildirim Ayarları"
              aria-label="Bildirimler"
            >
              <Bell className="w-4 h-4" />
            </button>

            <button
              onClick={onToggleDarkMode}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={darkMode ? 'Aydınlık Tema' : 'Koyu Tema'}
              aria-label={darkMode ? 'Aydınlık Tema' : 'Koyu Tema'}
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {onOpenPwaModal && (
              <button
                onClick={onOpenPwaModal}
                className="hidden lg:flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-medium hover:bg-emerald-500/20 transition-colors"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Telefona Yükle</span>
              </button>
            )}

            {onSignOut && (
              <button
                onClick={onSignOut}
                className="p-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                title="Oturumu Kapat"
                aria-label="Oturumu kapat"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <nav className="flex items-center space-x-1 mt-3 overflow-x-auto no-scrollbar pb-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`relative px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex items-center space-x-2 ${
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-500' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
