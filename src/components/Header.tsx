import React from 'react';
import { TargetLanguage } from '../types';
import { Flame, Activity, Stethoscope, RefreshCw, CheckCircle2, Moon, Sun, Bell, Cloud, Smartphone } from 'lucide-react';

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
}) => {
  const languageNames: Record<TargetLanguage, { name: string; flag: string }> = {
    en: { name: 'İngilizce', flag: '🇬🇧' },
    de: { name: 'Almanca', flag: '🇩🇪' },
    sr: { name: 'Sırpça', flag: '🇷🇸' },
  };

  const [isOnline, setIsOnline] = React.useState<boolean>(() => navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const navItems = [
    { id: 'bugun', label: 'Bugün' },
    { id: 'uret', label: 'Üret (Pratik)' },
    { id: 'gramer_pratigi', label: 'Gramer Koçu' },
    { id: 'nasil_soylerim', label: 'Nasıl Söylerim?' },
    { id: 'sohbet', label: 'Sohbet' },
    { id: 'hikayeler', label: 'Hikâyeler' },
    { id: 'ilerleme', label: 'İlerleme & Hatalarım' },
  ];

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-sm transition-colors">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-200 dark:shadow-none">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Lingua Production Coach</h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Pasif ezber değil, aktif üretim & FSRS aralıklı tekrar</p>
          </div>
        </div>

        {/* Status Badges & Controls */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-3">
          {/* Target Language Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            {(['en', 'de', 'sr'] as TargetLanguage[]).map((lang) => (
              <button
                key={lang}
                onClick={() => onLanguageChange(lang)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all flex items-center space-x-1 ${
                  currentLanguage === lang
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{languageNames[lang].flag}</span>
                <span>{languageNames[lang].name}</span>
              </button>
            ))}
          </div>

          {/* PWA Install Button */}
          {onOpenPwaModal && (
            <button
              onClick={onOpenPwaModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-all shadow-2xs"
              title="Telefona veya Tablete Yükle (PWA & Ana Ekrana Ekle)"
            >
              <Smartphone className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Telefona Yükle</span>
            </button>
          )}

          {/* Cloud Sync Button */}
          <button
            onClick={onOpenCloudSync}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900 transition-all shadow-2xs"
            title="Bulut Senkronizasyon Durumu (Çoklu Cihaz Eşitleme)"
          >
            <Cloud className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span className="hidden sm:inline">Bulut Senkronize</span>
          </button>

          {/* Notification Button */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all"
            title="Bildirimler & Hatırlatıcı"
          >
            <Bell className="w-4 h-4" />
            {dueCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center animate-bounce">
                {dueCount}
              </span>
            )}
          </button>

          {/* Dark Mode Toggle Button */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all"
            title={darkMode ? 'Aydınlık Mod' : 'Koyu Tema'}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {/* Streak Badge */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 rounded-xl text-xs font-medium">
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>{streakCount} Gün Seri</span>
          </div>

          {/* SRS Due Badge */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/60 rounded-xl text-xs font-medium">
            <RefreshCw className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>{dueCount} Tekrar Bekliyor</span>
          </div>

          {/* Online / Offline Network Badge */}
          <div className={`hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${
            isOnline 
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60'
              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span>{isOnline ? 'Çevrimiçi' : 'Çevrimdışı (PWA)'}</span>
          </div>

          {/* Active vs Passive Badge */}
          <div className="hidden lg:flex items-center space-x-2 text-xs bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
            <span className="flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span><strong>{activeCount}</strong> Aktif</span>
            </span>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <span className="flex items-center space-x-1">
              <Activity className="w-3.5 h-3.5 text-indigo-500" />
              <span><strong>{passiveCount}</strong> Pasif</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-100 dark:border-slate-800 overflow-x-auto custom-scrollbar">
        <nav className="flex space-x-1 py-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
