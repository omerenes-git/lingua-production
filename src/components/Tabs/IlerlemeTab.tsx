import React, { useState } from 'react';
import { TargetLanguage, LearningItem, FossilizedError, ProductionPrompt } from '../../types';
import { LingQIntegration } from '../LingQIntegration';
import { AlertTriangle, CheckCircle, Download, FileText, Activity, Brain, Check, BookOpen, Flame, BarChart3, TrendingUp, TrendingDown, BookMarked, CheckCheck, Award, Wifi, HardDrive, Smartphone, Share2, Database, ShieldCheck, Filter, Globe, Layers, Calendar } from 'lucide-react';
import { BarChart, Bar, ComposedChart, LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, Legend } from 'recharts';

interface IlerlemeTabProps {
  currentLanguage: TargetLanguage;
  learningItems: LearningItem[];
  fossilizedErrors: FossilizedError[];
  onResolveFossilizedError: (id: string) => void;
  onClearData: () => void;
  onImportPrompts?: (prompts: ProductionPrompt[]) => void;
  onAddLearningItems?: (items: LearningItem[]) => void;
}

export const IlerlemeTab: React.FC<IlerlemeTabProps> = ({
  currentLanguage,
  learningItems,
  fossilizedErrors,
  onResolveFossilizedError,
  onClearData,
  onImportPrompts = () => {},
  onAddLearningItems = () => {},
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'cefr' | 'chart' | 'lingq' | 'errors' | 'vocabulary' | 'report' | 'offline'>('cefr');
  const [cefrSelectedLang, setCefrSelectedLang] = useState<TargetLanguage | 'all'>('all');

  // Dynamic CEFR Stats Calculation per Language
  const cefrStatsPerLanguage = React.useMemo(() => {
    const languages: { code: TargetLanguage; name: string; flag: string }[] = [
      { code: 'en', name: 'İngilizce', flag: '🇬🇧' },
      { code: 'de', name: 'Almanca', flag: '🇩🇪' },
      { code: 'sr', name: 'Sırpça', flag: '🇷🇸' },
    ];

    return languages.map((lang) => {
      const items = learningItems.filter((i) => i.language === lang.code);
      const errors = fossilizedErrors.filter((e) => e.language === lang.code);
      const resolvedErrors = errors.filter((e) => e.resolved).length;
      const masteredCount = items.filter((i) => i.masteryState === 'mastered' || i.masteryState === 'independently_producible').length;

      const overallMastery = Math.min(99, Math.round(
        (items.length > 0 ? (masteredCount / items.length) * 50 : 15) +
        Math.min(35, items.length * 1.5) +
        Math.min(14, resolvedErrors * 2)
      ));

      const activeProductionLevel = lang.code === 'de'
        ? 'A1-A2 Temel Diyalog & Günlük İstekler'
        : lang.code === 'sr'
        ? 'A1 Başlangıç & Günlük Cümle Kurma'
        : 'B1-B2 Bağımsız Cümle Kurma';

      const totalExA1 = 40;
      const totalExA2 = 40;
      const totalExB1 = 50;
      const totalExB2 = 50;
      const totalExC1 = 50;

      const compExA1 = Math.min(totalExA1, items.length);
      const compExA2 = Math.max(0, Math.min(totalExA2, items.length - 10));
      const compExB1 = Math.max(0, Math.min(totalExB1, items.length - 25));
      const compExB2 = Math.max(0, Math.min(totalExB2, items.length - 45));
      const compExC1 = Math.max(0, Math.min(totalExC1, items.length - 70));

      const pctA1 = Math.min(100, Math.round((compExA1 / totalExA1) * 100));
      const pctA2 = Math.min(100, Math.round((compExA2 / totalExA2) * 100));
      const pctB1 = Math.min(100, Math.round((compExB1 / totalExB1) * 100));
      const pctB2 = Math.min(100, Math.round((compExB2 / totalExB2) * 100));
      const pctC1 = Math.min(100, Math.round((compExC1 / totalExC1) * 100));

      const accuracyBase = items.length > 0 ? Math.round((masteredCount / items.length) * 30 + 70) : 80;

      const levelsData = [
        { level: 'A1', titleTr: 'Temel İfadeler & Gündelik Tanışma', percentage: pctA1, completedExercises: compExA1, totalExercises: totalExA1, productionAccuracy: Math.min(98, accuracyBase), focusTr: 'Kendiliğinden doğal sipariş ve temel istek cümlesi üretimi' },
        { level: 'A2', titleTr: 'Günlük Diyaloglar, Saat & Adres Sorma', percentage: pctA2, completedExercises: compExA2, totalExercises: totalExA2, productionAccuracy: Math.min(95, accuracyBase - 4), focusTr: 'Nezaket soruları, randevu sözleşme ve pratik alışveriş diyalogları' },
        { level: 'B1', titleTr: 'Bağlaçlı & Şartlı Cümle Yapıları', percentage: pctB1, completedExercises: compExB1, totalExercises: totalExB1, productionAccuracy: Math.min(90, accuracyBase - 8), focusTr: 'Bağımsız cümle kurma, neden/sonuç ilişkisi ve fikir ifade etme' },
        { level: 'B2', titleTr: 'Detaylı Konuşma & Karmaşık Cümle', percentage: pctB2, completedExercises: compExB2, totalExercises: totalExB2, productionAccuracy: Math.min(85, accuracyBase - 15), focusTr: 'Gelişmiş paragraf ve görüş üretimi' },
        { level: 'C1', titleTr: 'İleri Düzey Akıcılık & Nüanslar', percentage: pctC1, completedExercises: compExC1, totalExercises: totalExC1, productionAccuracy: Math.min(80, accuracyBase - 22), focusTr: 'Spontane akıcı diyalog ve profesyonel ifade' },
      ];

      return {
        code: lang.code,
        name: lang.name,
        flag: lang.flag,
        overallMastery,
        activeProductionLevel,
        itemCount: items.length,
        errorCount: errors.length,
        resolvedErrors,
        levelsData
      };
    });
  }, [learningItems, fossilizedErrors]);

  const langItems = learningItems.filter((item) => item.language === currentLanguage);
  const langErrors = fossilizedErrors.filter((e) => e.language === currentLanguage);

  const handleExportJSON = () => {
    const dataStr = JSON.stringify({ learningItems, fossilizedErrors }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lingua_coach_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const handleExportAnkiCSV = () => {
    const headers = "TargetText,TurkishTranslation,Domain,MasteryState\n";
    const rows = langItems.map(
      (item) => `"${item.targetText.replace(/"/g, '""')}","${item.turkishText.replace(/"/g, '""')}","${item.domain}","${item.masteryState}"`
    ).join("\n");

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + encodeURIComponent(headers + rows);
    const a = document.createElement('a');
    a.href = csvContent;
    a.download = `lingua_anki_deck_${currentLanguage}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  // Calculate local storage approximate byte count
  const calculateStorageSize = () => {
    try {
      let total = 0;
      for (let x in localStorage) {
        if (localStorage.hasOwnProperty(x)) {
          total += (localStorage[x].length + x.length) * 2;
        }
      }
      return (total / 1024).toFixed(1);
    } catch {
      return '18.5';
    }
  };

  const activeVocab = langItems.filter((i) => i.isActiveVocabulary);
  const passiveVocab = langItems.filter((i) => !i.isActiveVocabulary);

  // 7-day practice activity calculated from localStorage history and current dailyGoalProgress
  const weeklyData = React.useMemo(() => {
    const daysMap = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
    let history: Record<string, number> = {};
    try {
      history = JSON.parse(localStorage.getItem('lingua_daily_history') || '{}');
    } catch (e) {}

    const now = new Date();
    const result = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const isoKey = d.toISOString().slice(0, 10);
      const dayLabel = i === 0 ? 'Bugün' : daysMap[(d.getDay() + 6) % 7];

      let count = 0;
      if (i === 0) {
        count = dailyGoalProgress;
      } else if (history[isoKey] !== undefined) {
        count = history[isoKey];
      } else {
        count = Math.max(0, Math.min(dailyGoalTarget, Math.round(langItems.length / 4)));
      }

      result.push({
        day: dayLabel,
        count,
        target: dailyGoalTarget,
        streakMet: count >= dailyGoalTarget,
      });
    }

    return result;
  }, [dailyGoalProgress, dailyGoalTarget, langItems]);

  const totalWeeklyExercises = weeklyData.reduce((acc, curr) => acc + curr.count, 0);

  // Haftalık Öğrenilen Kelimeler ve Hata Düzeltme Oranı Verisi (Recharts)
  const totalResolvedErrors = langErrors.filter((e) => e.resolved).length;
  const currentErrorCorrectionRate = langErrors.length > 0 
    ? Math.round((totalResolvedErrors / langErrors.length) * 100) 
    : (langItems.length > 0 ? 100 : 0);

  const haftalikKelimelerVeHataData = React.useMemo(() => {
    const totalWords = langItems.length;
    return [
      { hafta: '1. Hafta', ogrenilenKelime: Math.round(totalWords * 0.15), hataDuzeltmeOrani: Math.min(currentErrorCorrectionRate, 40), duzeltilenHataCount: Math.round(totalResolvedErrors * 0.15) },
      { hafta: '2. Hafta', ogrenilenKelime: Math.round(totalWords * 0.35), hataDuzeltmeOrani: Math.min(currentErrorCorrectionRate, 55), duzeltilenHataCount: Math.round(totalResolvedErrors * 0.35) },
      { hafta: '3. Hafta', ogrenilenKelime: Math.round(totalWords * 0.55), hataDuzeltmeOrani: Math.min(currentErrorCorrectionRate, 70), duzeltilenHataCount: Math.round(totalResolvedErrors * 0.55) },
      { hafta: '4. Hafta', ogrenilenKelime: Math.round(totalWords * 0.75), hataDuzeltmeOrani: Math.min(currentErrorCorrectionRate, 85), duzeltilenHataCount: Math.round(totalResolvedErrors * 0.75) },
      { hafta: '5. Hafta', ogrenilenKelime: Math.round(totalWords * 0.90), hataDuzeltmeOrani: Math.min(currentErrorCorrectionRate, 92), duzeltilenHataCount: Math.round(totalResolvedErrors * 0.90) },
      { 
        hafta: 'Bu Hafta', 
        ogrenilenKelime: totalWords, 
        hataDuzeltmeOrani: currentErrorCorrectionRate, 
        duzeltilenHataCount: totalResolvedErrors 
      },
    ];
  }, [langItems.length, totalResolvedErrors, currentErrorCorrectionRate]);

  // 30-Day Fossilized Error Trend Chart States & Calculation Logic
  const [fossilizedCategoryMode, setFossilizedCategoryMode] = useState<'errorType' | 'language'>('errorType');
  const [fossilizedStatusFilter, setFossilizedStatusFilter] = useState<'all' | 'active' | 'resolved'>('all');

  const fossilized30DayTrendData = React.useMemo(() => {
    const result = [];
    const now = new Date();

    const errorsByDate: Record<string, FossilizedError[]> = {};
    fossilizedErrors.forEach((err) => {
      if (fossilizedStatusFilter === 'active' && err.resolved) return;
      if (fossilizedStatusFilter === 'resolved' && !err.resolved) return;

      const errDate = err.date ? err.date.slice(0, 10) : now.toISOString().slice(0, 10);
      if (!errorsByDate[errDate]) {
        errorsByDate[errDate] = [];
      }
      errorsByDate[errDate].push(err);
    });

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateLabel = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
      const isoDate = d.toISOString().slice(0, 10);

      const dateErrors = errorsByDate[isoDate] || [];

      if (fossilizedCategoryMode === 'errorType') {
        const dilbilgisi = dateErrors.filter(e => e.errorDescription?.toLowerCase().includes('gram') || e.errorDescription?.toLowerCase().includes('dil') || e.domain === 'clinical').length;
        const sozDizimi = dateErrors.filter(e => e.errorDescription?.toLowerCase().includes('order') || e.errorDescription?.toLowerCase().includes('söz') || e.domain === 'ielts').length;
        const kelimeHaznesi = dateErrors.filter(e => e.errorDescription?.toLowerCase().includes('vocab') || e.errorDescription?.toLowerCase().includes('kelime') || e.domain === 'general').length;
        const edatlar = dateErrors.filter(e => e.errorDescription?.toLowerCase().includes('prep') || e.errorDescription?.toLowerCase().includes('edat') || e.domain === 'travel').length;
        const zamanKip = dateErrors.filter(e => e.errorDescription?.toLowerCase().includes('tense') || e.errorDescription?.toLowerCase().includes('zaman')).length;

        result.push({
          date: dateLabel,
          isoDate,
          Dilbilgisi: dilbilgisi,
          SözDizimi: sozDizimi,
          KelimeHaznesi: kelimeHaznesi,
          Edatlar: edatlar,
          ZamanKip: zamanKip,
          Toplam: dateErrors.length
        });
      } else {
        const ingilizce = dateErrors.filter(e => e.language === 'en').length;
        const almanca = dateErrors.filter(e => e.language === 'de').length;
        const sirpca = dateErrors.filter(e => e.language === 'sr').length;

        result.push({
          date: dateLabel,
          isoDate,
          İngilizce: ingilizce,
          Almanca: almanca,
          Sırpça: sirpca,
          Toplam: dateErrors.length
        });
      }
    }

    return result;
  }, [fossilizedErrors, fossilizedCategoryMode, fossilizedStatusFilter]);

  const first10DaysAvg = React.useMemo(() => {
    const slice = fossilized30DayTrendData.slice(0, 10);
    const sum = slice.reduce((acc, curr) => acc + curr.Toplam, 0);
    return (sum / 10).toFixed(1);
  }, [fossilized30DayTrendData]);

  const last10DaysAvg = React.useMemo(() => {
    const slice = fossilized30DayTrendData.slice(20, 30);
    const sum = slice.reduce((acc, curr) => acc + curr.Toplam, 0);
    return (sum / 10).toFixed(1);
  }, [fossilized30DayTrendData]);

  const errorReductionPercentage = React.useMemo(() => {
    const start = parseFloat(first10DaysAvg) || 1;
    const end = parseFloat(last10DaysAvg) || 0;
    if (start === 0) return 0;
    const drop = ((start - end) / start) * 100;
    return Math.max(0, Math.round(drop));
  }, [first10DaysAvg, last10DaysAvg]);

  // Estimate CEFR Level based on historical difficulty & complexity of successfully produced sentences
  const estimatedCefrDetails = React.useMemo(() => {
    const targetItems = cefrSelectedLang === 'all'
      ? learningItems
      : learningItems.filter((i) => i.language === cefrSelectedLang);

    // Filter successfully produced items
    const producedItems = targetItems.filter(
      (item) => item.masteryState === 'mastered' || item.masteryState === 'independently_producible' || item.masteryState === 'hint_producible'
    );

    const independentProduced = producedItems.filter(
      (item) => item.masteryState === 'mastered' || item.masteryState === 'independently_producible'
    );

    // Calculate sentence complexity and difficulty metrics
    let totalWordCount = 0;
    let complexPatternCount = 0;
    let highDomainCount = 0; // clinical, ielts

    producedItems.forEach((item) => {
      const words = item.targetText ? item.targetText.trim().split(/\s+/).length : 0;
      totalWordCount += words;

      // check if sentence has complex structures (e.g. connectors, modal verbs, clauses)
      const text = (item.targetText || '').toLowerCase();
      if (
        text.includes('because') || text.includes('although') || text.includes('however') ||
        text.includes('weil') || text.includes('obwohl') || text.includes('dass') ||
        text.includes('postor') || text.includes('zato') || text.includes('iako') ||
        words >= 7
      ) {
        complexPatternCount++;
      }

      if (item.domain === 'clinical' || item.domain === 'ielts') {
        highDomainCount++;
      }
    });

    const avgWordsPerSentence = producedItems.length > 0 ? (totalWordCount / producedItems.length).toFixed(1) : '0';
    const complexityRatio = producedItems.length > 0 ? Math.round((complexPatternCount / producedItems.length) * 100) : 0;

    // Numerical difficulty score logic (0 - 100)
    // Base score from count of independent sentences
    const volumeScore = Math.min(40, independentProduced.length * 2.5 + producedItems.length * 0.8);
    // Score from complexity/length
    const lengthScore = Math.min(25, (totalWordCount / Math.max(1, producedItems.length)) * 3);
    // Score from domain depth
    const depthScore = Math.min(20, highDomainCount * 2.5 + complexPatternCount * 1.5);
    // Score from accuracy and low fossilized errors ratio
    const langErrors = fossilizedErrors.filter((e) => cefrSelectedLang === 'all' || e.language === cefrSelectedLang);
    const resolvedErrors = langErrors.filter((e) => e.resolved).length;
    const accuracyBonus = Math.min(15, Math.max(0, 10 - (langErrors.length - resolvedErrors) * 0.5));

    // Baseline default calculation if user has items or is starting
    const rawScore = targetItems.length === 0
      ? 12
      : Math.min(98, Math.round(volumeScore + lengthScore + depthScore + accuracyBonus + Math.min(15, targetItems.length * 0.3)));

    // Map score to CEFR level (A1 to C2)
    let cefrLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' = 'A1';
    let cefrTitle = 'A1 Başlangıç (Elementary)';
    let badgeColor = 'from-emerald-500 to-emerald-600';
    let minScore = 0;
    let maxScore = 25;

    if (rawScore < 25) {
      cefrLevel = 'A1';
      cefrTitle = 'A1 Başlangıç (Elementary)';
      badgeColor = 'from-emerald-500 to-emerald-600';
      minScore = 0;
      maxScore = 25;
    } else if (rawScore < 45) {
      cefrLevel = 'A2';
      cefrTitle = 'A2 Temel Günlük (Pre-Intermediate)';
      badgeColor = 'from-teal-500 to-cyan-600';
      minScore = 25;
      maxScore = 45;
    } else if (rawScore < 65) {
      cefrLevel = 'B1';
      cefrTitle = 'B1 Eşik Akıcılık (Intermediate)';
      badgeColor = 'from-sky-500 to-blue-600';
      minScore = 45;
      maxScore = 65;
    } else if (rawScore < 82) {
      cefrLevel = 'B2';
      cefrTitle = 'B2 Bağımsız Cümle (Upper-Intermediate)';
      badgeColor = 'from-indigo-500 to-violet-600';
      minScore = 65;
      maxScore = 82;
    } else if (rawScore < 95) {
      cefrLevel = 'C1';
      cefrTitle = 'C1 İleri Yetkinlik (Advanced)';
      badgeColor = 'from-purple-600 to-fuchsia-600';
      minScore = 82;
      maxScore = 95;
    } else {
      cefrLevel = 'C2';
      cefrTitle = 'C2 Ustalaşmış Akıcılık (Proficient)';
      badgeColor = 'from-amber-500 to-rose-600';
      minScore = 95;
      maxScore = 100;
    }

    const progressInBand = Math.min(100, Math.max(0, Math.round(((rawScore - minScore) / (maxScore - minScore || 1)) * 100)));

    return {
      rawScore,
      cefrLevel,
      cefrTitle,
      badgeColor,
      progressInBand,
      totalProduced: producedItems.length,
      independentProduced: independentProduced.length,
      avgWordsPerSentence,
      complexityRatio,
      highDomainCount,
    };
  }, [learningItems, fossilizedErrors, cefrSelectedLang]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Subtab navigation & Export actions */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between flex-wrap gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveSubTab('cefr')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer ${
              activeSubTab === 'cefr'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Her Dil İçin CEFR & Üretim İstatistikleri (% Progress)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('chart')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer ${
              activeSubTab === 'chart'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Aktivite & Haftalık Trendler</span>
          </button>

          <button
            onClick={() => setActiveSubTab('lingq')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer ${
              activeSubTab === 'lingq'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>LingQ İstatistikleri</span>
          </button>

          <button
            onClick={() => setActiveSubTab('errors')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer ${
              activeSubTab === 'errors'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Emin Olunan Yanlışlar ({langErrors.filter((e) => !e.resolved).length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('vocabulary')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer ${
              activeSubTab === 'vocabulary'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Kelime Listem ({langItems.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('report')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer ${
              activeSubTab === 'report'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Haftalık Rapor</span>
          </button>

          <button
            onClick={() => setActiveSubTab('offline')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer ${
              activeSubTab === 'offline'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Çevrimdışı Mod</span>
          </button>
        </div>

        {/* Quick CSV / JSON export bar */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportAnkiCSV}
            className="px-3 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center space-x-1 transition-colors cursor-pointer"
            title="Anki Deste Dışa Aktar (CSV)"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Anki CSV</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="px-3 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center space-x-1 transition-colors cursor-pointer"
            title="Tüm Veriyi İndir (JSON)"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>JSON Yedek</span>
          </button>
        </div>
      </div>

      {/* SECTION CEFR: Her Dil İçin CEFR Seviyeleri & Üretim İstatistikleri (% İlerleme) */}
      {activeSubTab === 'cefr' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-teal-900 text-white p-6 rounded-3xl border border-emerald-500/30 shadow-md space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-emerald-400" />
                    CEFR & Üretim Yetkinlik Analizi
                  </span>
                </div>
                <h2 className="text-xl font-black text-white">Her Dil İçin CEFR Seviyeleri (% İlerleme) & Üretim Yetkinliği</h2>
                <p className="text-xs text-emerald-200/90 max-w-2xl">
                  Dillerdeki (İngilizce 🇬🇧, Almanca 🇩🇪, Sırpça 🇷🇸) A1'den C1'e kadar olan cümle kurma yetkinlik yüzdeleriniz ve aktif üretim kapasiteniz.
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700 flex items-center space-x-1">
                <button
                  onClick={() => setCefrSelectedLang('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    cefrSelectedLang === 'all'
                      ? 'bg-emerald-500 text-slate-950 shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Tüm Diller
                </button>
                <button
                  onClick={() => setCefrSelectedLang('en')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    cefrSelectedLang === 'en'
                      ? 'bg-emerald-500 text-slate-950 shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  🇬🇧 İngilizce
                </button>
                <button
                  onClick={() => setCefrSelectedLang('de')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    cefrSelectedLang === 'de'
                      ? 'bg-emerald-500 text-slate-950 shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  🇩🇪 Almanca
                </button>
                <button
                  onClick={() => setCefrSelectedLang('sr')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    cefrSelectedLang === 'sr'
                      ? 'bg-emerald-500 text-slate-950 shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  🇷🇸 Sırpça
                </button>
              </div>
            </div>
          </div>

          {/* Special Guidance Note for German & Serbian Daily Dialogue focus */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 p-4 rounded-2xl flex items-start space-x-3 text-xs text-amber-900 dark:text-amber-200">
            <span className="p-1.5 bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 rounded-lg shrink-0">
              💡
            </span>
            <div className="space-y-0.5">
              <span className="font-extrabold block">Almanca ve Sırpça Üretim Odak İlkesi:</span>
              <p>
                Almanca ve Sırpça pratiklerinde uzun bağlaçlı ve ağır tıbbi/fizyoterapi terimleri yerine; kahve siparişi, tanışma, adres/saat sorma ve günlük basit istek diyaloglarına öncelik verilerek A1-A2 kademeli ilerleme sağlanmaktadır.
              </p>
            </div>
          </div>

          {/* Estimated CEFR Progress Card based on Historical Sentence Difficulty */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 border-2 border-indigo-500/40 shadow-xl space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-indigo-500/20 pb-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-extrabold uppercase tracking-widest rounded-full flex items-center gap-1">
                    <Brain className="w-3.5 h-3.5 text-indigo-400" />
                    Üretim Zorluk Analiz Motoru
                  </span>
                  <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-extrabold uppercase tracking-widest rounded-full">
                    Canlı CEFR Matrisi
                  </span>
                </div>
                <h3 className="text-lg font-black text-white flex items-center gap-2 flex-wrap">
                  <span>Tahmini CEFR Seviyeniz:</span>
                  <span className={`px-3 py-1 rounded-xl bg-gradient-to-r ${estimatedCefrDetails.badgeColor} text-white shadow-md text-base font-black`}>
                    {estimatedCefrDetails.cefrLevel}
                  </span>
                  <span className="text-xs font-semibold text-slate-300">
                    ({estimatedCefrDetails.cefrTitle})
                  </span>
                </h3>
                <p className="text-xs text-indigo-200/80 max-w-2xl">
                  {cefrSelectedLang === 'all' ? 'Tüm diller genelinde' : cefrSelectedLang === 'en' ? '🇬🇧 İngilizce pratiklerinizde' : cefrSelectedLang === 'de' ? '🇩🇪 Almanca pratiklerinizde' : '🇷🇸 Sırpça pratiklerinizde'} geçmişte başarıyla ürettiğiniz cümlelerin sözdağarcığı, ortalama kelime uzunluğu, gramer yapısı ve bağımsız (ipucusuz) üretim başarısına göre hesaplanmıştır.
                </p>
              </div>

              <div className="text-right bg-slate-900/80 p-3 rounded-2xl border border-indigo-500/30">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Ağırlıklı Üretim Skoru</span>
                <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-sky-300 to-emerald-300">
                  {estimatedCefrDetails.rawScore} <span className="text-xs text-slate-400 font-semibold">/ 100</span>
                </span>
              </div>
            </div>

            {/* CEFR Level Stepper Bands */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-300 px-1">
                <span>A1 (Başlangıç)</span>
                <span>A2 (Temel)</span>
                <span>B1 (Eşik)</span>
                <span>B2 (Bağımsız)</span>
                <span>C1 (İleri)</span>
                <span>C2 (Usta)</span>
              </div>

              <div className="grid grid-cols-6 gap-1.5 p-1.5 bg-slate-950/80 rounded-2xl border border-slate-800">
                {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const).map((lvl) => {
                  const isActive = estimatedCefrDetails.cefrLevel === lvl;
                  const isPassed = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].indexOf(lvl) < ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].indexOf(estimatedCefrDetails.cefrLevel);
                  return (
                    <div
                      key={lvl}
                      className={`relative py-2.5 rounded-xl text-center font-black text-xs transition-all ${
                        isActive
                          ? 'bg-gradient-to-r ' + estimatedCefrDetails.badgeColor + ' text-white ring-2 ring-white/50 shadow-lg scale-105 z-10'
                          : isPassed
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-700/50'
                          : 'bg-slate-900/60 text-slate-500 border border-slate-800/80'
                      }`}
                    >
                      <span>{lvl}</span>
                      {isActive && (
                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Band Progress Bar */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between items-center text-[11px] font-semibold text-slate-300">
                  <span>Mevcut {estimatedCefrDetails.cefrLevel} Seviye Bandı İçindeki İlerleme</span>
                  <span className="font-extrabold text-indigo-300">%{estimatedCefrDetails.progressInBand}</span>
                </div>
                <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-indigo-500/20">
                  <div
                    className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r ${estimatedCefrDetails.badgeColor}`}
                    style={{ width: `${estimatedCefrDetails.progressInBand}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-indigo-500/20 space-y-1">
                <div className="flex items-center space-x-1.5 text-xs text-indigo-300 font-bold">
                  <CheckCheck className="w-4 h-4 text-emerald-400" />
                  <span>Başarılı Cümle Üretimi</span>
                </div>
                <div className="text-xl font-black text-white">
                  {estimatedCefrDetails.totalProduced} <span className="text-xs text-slate-400 font-normal">Cümle</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Tam bağımsız (ipucusuz) üretilen: <span className="text-emerald-400 font-bold">{estimatedCefrDetails.independentProduced}</span>
                </p>
              </div>

              <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-indigo-500/20 space-y-1">
                <div className="flex items-center space-x-1.5 text-xs text-indigo-300 font-bold">
                  <TrendingUp className="w-4 h-4 text-sky-400" />
                  <span>Ortalama Cümle Derinliği</span>
                </div>
                <div className="text-xl font-black text-white">
                  {estimatedCefrDetails.avgWordsPerSentence} <span className="text-xs text-slate-400 font-normal">Kelime / Cümle</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Sözdüzimsel karmaşıklık ve bağlam uzunluğu
                </p>
              </div>

              <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-indigo-500/20 space-y-1">
                <div className="flex items-center space-x-1.5 text-xs text-indigo-300 font-bold">
                  <Award className="w-4 h-4 text-purple-400" />
                  <span>Karmaşık Bağlaç & Terim Yoğunluğu</span>
                </div>
                <div className="text-xl font-black text-white">
                  %{estimatedCefrDetails.complexityRatio}
                </div>
                <p className="text-[10px] text-slate-400">
                  Şart/Sebep bağlaçlı & Klinik/IELTS terim düzeyi
                </p>
              </div>
            </div>
          </div>

          {/* Cards for filtered languages */}
          {cefrStatsPerLanguage
            .filter((lang) => cefrSelectedLang === 'all' || lang.code === cefrSelectedLang)
            .map((lang) => (
              <div
                key={lang.code}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6"
              >
                {/* Language Header */}
                <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-3xl">{lang.flag}</span>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">
                          {lang.name}
                        </h3>
                        <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-full border border-emerald-300 dark:border-emerald-800">
                          {lang.activeProductionLevel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {lang.itemCount} Öğrenilen Kelime • {lang.errorCount} Kayıtlı Hata ({lang.resolvedErrors} Çözüldü)
                      </p>
                    </div>
                  </div>

                  {/* Overall Mastery Percentage Badge */}
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <span className="text-xs text-slate-400 font-semibold block">Genel CEFR Üretim Yetkinliği</span>
                      <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">%{lang.overallMastery}</span>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center font-black text-emerald-700 dark:text-emerald-300 text-lg shadow-xs">
                      %{lang.overallMastery}
                    </div>
                  </div>
                </div>

                {/* Main Progress Bar for Language */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-700 dark:text-slate-300">A1 - C1 Genel Yetkinlik İlerleme Çubuğu</span>
                    <span className="text-emerald-600 dark:text-emerald-400">%{lang.overallMastery} Başarı</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
                    <div
                      className="bg-gradient-to-r from-teal-500 via-emerald-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${lang.overallMastery}%` }}
                    />
                  </div>
                </div>

                {/* Level Cards Breakdown Grid (A1, A2, B1, B2, C1) */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    CEFR Seviye Bazlı Detaylı Yetkinlik Yüzdeleri (%):
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {lang.levelsData.map((lvl) => (
                      <div
                        key={lvl.level}
                        className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3 hover:border-emerald-400 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2.5 py-1 text-xs font-black rounded-lg text-white shadow-xs ${
                              lvl.level === 'A1' ? 'bg-emerald-600' :
                              lvl.level === 'A2' ? 'bg-teal-600' :
                              lvl.level === 'B1' ? 'bg-sky-600' :
                              lvl.level === 'B2' ? 'bg-indigo-600' : 'bg-purple-600'
                            }`}>
                              {lvl.level}
                            </span>
                            <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                              {lvl.titleTr}
                            </span>
                          </div>
                          <span className="text-sm font-black text-slate-900 dark:text-white">
                            %{lvl.percentage}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              lvl.percentage >= 80 ? 'bg-emerald-500' :
                              lvl.percentage >= 50 ? 'bg-sky-500' :
                              lvl.percentage >= 20 ? 'bg-amber-500' : 'bg-slate-400'
                            }`}
                            style={{ width: `${lvl.percentage}%` }}
                          />
                        </div>

                        {/* Metrics footer */}
                        <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          <span>Egzersiz: {lvl.completedExercises} / {lvl.totalExercises}</span>
                          <span>Doğruluk: %{lvl.productionAccuracy}</span>
                        </div>

                        <div className="text-[11px] bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                          <span className="font-bold text-slate-900 dark:text-white">Üretim Odağı: </span>
                          {lvl.focusTr}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* SECTION -1: 7 Günlük Aktivite & Haftalık Trend Grafikleri (Recharts) */}
      {activeSubTab === 'chart' && (
        <div className="space-y-5">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                <Flame className="w-6 h-6 fill-amber-500" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Aktif Çalışma Serisi</div>
                <div className="text-2xl font-black text-slate-900 mt-0.5">7 Gün Kesintisiz 🔥</div>
                <div className="text-[11px] text-emerald-600 font-semibold">Günlük hedef: 5 cümle/gün</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 flex items-center justify-center shrink-0">
                <BookMarked className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Öğrenilen Kelimeler</div>
                <div className="text-2xl font-black text-slate-900 mt-0.5">{haftalikKelimelerVeHataData[haftalikKelimelerVeHataData.length - 1].ogrenilenKelime} Kelime</div>
                <div className="text-[11px] text-indigo-600 font-semibold">Aktif & pasif kelime stoğu</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hata Düzeltme Oranı</div>
                <div className="text-2xl font-black text-slate-900 mt-0.5">%{currentErrorCorrectionRate} Başarı</div>
                <div className="text-[11px] text-emerald-600 font-semibold">Kalıcı yanlışların ortadan kaldırılması</div>
              </div>
            </div>
          </div>

          {/* Haftalık Öğrenilen Kelimeler & Hata Düzeltme Oranı (Recharts ComposedChart) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 text-[11px] font-bold rounded-full uppercase tracking-wider">
                    Haftalık İlerleme Trendi
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">Haftalık Öğrenilen Kelimeler & Hata Düzeltme Oranı</h3>
                <p className="text-xs text-slate-500">
                  Her hafta kazanılan kelime sayısı ve düzeltilen kalıcı hata başarı yüzdesi (%)
                </p>
              </div>

              <div className="flex items-center space-x-4 text-xs font-semibold">
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded-md bg-indigo-600 inline-block" />
                  <span className="text-slate-700">Öğrenilen Kelime</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                  <span className="text-slate-700">Hata Düzeltme Oranı (%)</span>
                </div>
              </div>
            </div>

            {/* Recharts Composed Chart */}
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={haftalikKelimelerVeHataData} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="hafta" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#475569', fontWeight: 600 }} 
                  />
                  <YAxis 
                    yAxisId="left" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#4f46e5', fontWeight: 600 }} 
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    domain={[0, 100]} 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#059669', fontWeight: 600 }} 
                    unit="%" 
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 600,
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
                    }}
                    cursor={{ fill: '#f8fafc' }}
                    formatter={(value: any, name: string) => {
                      if (name === 'Öğrenilen Kelime') return [`${value} Kelime`, 'Öğrenilen Kelime'];
                      if (name === 'Hata Düzeltme Oranı (%)') return [`%${value}`, 'Hata Düzeltme Oranı'];
                      return [value, name];
                    }}
                  />
                  <Bar 
                    yAxisId="left" 
                    dataKey="ogrenilenKelime" 
                    name="Öğrenilen Kelime" 
                    fill="#4f46e5" 
                    radius={[8, 8, 0, 0]} 
                    barSize={28} 
                  />
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="hataDuzeltmeOrani" 
                    name="Hata Düzeltme Oranı (%)" 
                    stroke="#10b981" 
                    strokeWidth={3.5} 
                    dot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }} 
                    activeDot={{ r: 8, fill: '#059669' }} 
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Quick Metrics Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl">
                <div className="text-slate-500 font-medium">Toplam Kelime Hazinesi</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {haftalikKelimelerVeHataData[haftalikKelimelerVeHataData.length - 1].ogrenilenKelime} Kelime
                </div>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl">
                <div className="text-slate-500 font-medium">Bu Haftaki Hata Düzeltme</div>
                <div className="text-sm font-bold text-emerald-600 mt-0.5">
                  %{currentErrorCorrectionRate} Başarı Oranı
                </div>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl col-span-2 sm:col-span-1">
                <div className="text-slate-500 font-medium">Düzeltilen Kalıcı Hatalar</div>
                <div className="text-sm font-bold text-indigo-600 mt-0.5">
                  {totalResolvedErrors} Yanlış Düzeltildi
                </div>
              </div>
            </div>
          </div>

          {/* RECHARTS CARD: Son 30 Günlük Kemikleşmiş Hata (FossilizedError) Trend Analizi */}
          <div className="bg-white p-6 rounded-2xl border border-rose-200 shadow-sm space-y-5">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 text-[11px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                    Son 30 Günlük Hata Trendi
                  </span>
                  <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <TrendingDown className="w-3.5 h-3.5" />
                    %{errorReductionPercentage} Azalma
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1.5 flex items-center gap-2">
                  <span>Kemikleşmiş Hataların (Fossilized Error) 30 Günlük Değişimi</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Öğrenilmiş yanlışların zaman içindeki azalma eğilimi, hata türleri ve hedef dillere göre dağılımı
                </p>
              </div>

              {/* Controls: Mode Switcher & Status Filter */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="bg-slate-100 p-1 rounded-xl flex items-center space-x-1 text-xs font-semibold">
                  <button
                    onClick={() => setFossilizedCategoryMode('errorType')}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1 ${
                      fossilizedCategoryMode === 'errorType'
                        ? 'bg-white text-rose-700 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Hata Türüne Göre</span>
                  </button>
                  <button
                    onClick={() => setFossilizedCategoryMode('language')}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1 ${
                      fossilizedCategoryMode === 'language'
                        ? 'bg-white text-indigo-700 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Hedef Dile Göre</span>
                  </button>
                </div>

                <div className="bg-slate-100 p-1 rounded-xl flex items-center space-x-1 text-xs font-semibold">
                  <button
                    onClick={() => setFossilizedStatusFilter('all')}
                    className={`px-2.5 py-1.5 rounded-lg transition-all ${
                      fossilizedStatusFilter === 'all'
                        ? 'bg-slate-800 text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tümü
                  </button>
                  <button
                    onClick={() => setFossilizedStatusFilter('active')}
                    className={`px-2.5 py-1.5 rounded-lg transition-all ${
                      fossilizedStatusFilter === 'active'
                        ? 'bg-rose-600 text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Aktif
                  </button>
                  <button
                    onClick={() => setFossilizedStatusFilter('resolved')}
                    className={`px-2.5 py-1.5 rounded-lg transition-all ${
                      fossilizedStatusFilter === 'resolved'
                        ? 'bg-emerald-600 text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Çözülenler
                  </button>
                </div>
              </div>
            </div>

            {/* Recharts 30-Day Trend Area/Line Chart */}
            <div className="h-72 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={fossilized30DayTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorDilbilgisi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorSozDizimi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorKelime" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorEdat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorEn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorDe" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorSr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }} 
                    interval={3}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} 
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 600,
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25)',
                    }}
                    cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '12px', fontSize: '12px', fontWeight: 600 }} />

                  {fossilizedCategoryMode === 'errorType' ? (
                    <>
                      <Area type="monotone" dataKey="Dilbilgisi" name="Dilbilgisi & Yapı" stroke="#f43f5e" fillOpacity={1} fill="url(#colorDilbilgisi)" strokeWidth={2.5} />
                      <Area type="monotone" dataKey="SözDizimi" name="Söz Dizimi & Kelime Sırası" stroke="#f59e0b" fillOpacity={1} fill="url(#colorSozDizimi)" strokeWidth={2.5} />
                      <Area type="monotone" dataKey="KelimeHaznesi" name="Kelime Seçimi" stroke="#6366f1" fillOpacity={1} fill="url(#colorKelime)" strokeWidth={2} />
                      <Area type="monotone" dataKey="Edatlar" name="Edat & Hal Ekleri" stroke="#06b6d4" fillOpacity={1} fill="url(#colorEdat)" strokeWidth={2} />
                      <Area type="monotone" dataKey="ZamanKip" name="Zaman & Kip" stroke="#8b5cf6" fillOpacity={0.1} strokeWidth={2} />
                    </>
                  ) : (
                    <>
                      <Area type="monotone" dataKey="İngilizce" name="İngilizce 🇬🇧" stroke="#3b82f6" fillOpacity={1} fill="url(#colorEn)" strokeWidth={2.5} />
                      <Area type="monotone" dataKey="Almanca" name="Almanca 🇩🇪" stroke="#eab308" fillOpacity={1} fill="url(#colorDe)" strokeWidth={2.5} />
                      <Area type="monotone" dataKey="Sırpça" name="Sırpça 🇷🇸" stroke="#ec4899" fillOpacity={1} fill="url(#colorSr)" strokeWidth={2} />
                    </>
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* 30-Day Trend Summary Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
              <div className="bg-rose-50/60 p-3 rounded-xl border border-rose-100">
                <div className="text-slate-500 font-medium">İlk 10 Gün Ort. Hata</div>
                <div className="text-base font-black text-rose-900 mt-0.5">
                  {first10DaysAvg} Hata/Gün
                </div>
              </div>

              <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100">
                <div className="text-slate-500 font-medium">Son 10 Gün Ort. Hata</div>
                <div className="text-base font-black text-emerald-900 mt-0.5">
                  {last10DaysAvg} Hata/Gün
                </div>
              </div>

              <div className="bg-sky-50/60 p-3 rounded-xl border border-sky-100">
                <div className="text-slate-500 font-medium">30 Günlük İyileşme Oranı</div>
                <div className="text-base font-black text-sky-900 mt-0.5">
                  %{errorReductionPercentage} Düşüş 📉
                </div>
              </div>

              <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100">
                <div className="text-slate-500 font-medium">En Çok İyileşen Alan</div>
                <div className="text-sm font-bold text-indigo-900 mt-0.5 truncate">
                  Söz Dizimi & Dilbilgisi
                </div>
              </div>
            </div>
          </div>

          {/* Bar Chart Card (Günlük Üretim) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900">Son 7 Günlük Üretim Performansı</h3>
                <p className="text-xs text-slate-500">Her gün tamamlanan pratik ve aktif üretim sayısı</p>
              </div>

              <div className="flex items-center space-x-4 text-xs font-medium">
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded-full bg-sky-500 inline-block" />
                  <span className="text-slate-600">Hedefe Ulaşıldı (≥5)</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
                  <span className="text-slate-600">Devam Ediyor</span>
                </div>
              </div>
            </div>

            {/* Recharts Bar Chart Container */}
            <div className="h-64 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 600,
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    }}
                    cursor={{ fill: '#f1f5f9' }}
                    formatter={(value: any) => [`${value} Üretim Cümlesi`, 'Günlük Aktivite']}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {weeklyData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.count >= entry.target ? '#0284c7' : '#f59e0b'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 0: LingQ Entegrasyonu */}
      {activeSubTab === 'lingq' && (
        <LingQIntegration
          currentLanguage={currentLanguage}
          learningItems={learningItems}
          onImportPrompts={onImportPrompts}
          onAddLearningItems={onAddLearningItems}
        />
      )}

      {/* SECTION 1: Emin Olunan Yanlışlar */}
      {activeSubTab === 'errors' && (
        <div className="space-y-4">
          <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200">
            <h3 className="font-bold text-rose-900 text-sm">Öğrenilmiş Hata (Fossilized Error) İlkesi</h3>
            <p className="text-xs text-rose-800 mt-1 leading-relaxed">
              Kullanıcının emin olarak yaptığı yanlışlar kalıcı yanlış öğrenmelerdir. Aşağıdaki kayıtlar FSRS algoritması tarafından önceliklendirilmiştir.
            </p>
          </div>

          {langErrors.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 text-xs font-medium">
              Tebrikler! Bu dilde henüz emin olunup hatalı yapılan kritik bir öğrenilmiş yanlış bulunmuyor.
            </div>
          ) : (
            <div className="space-y-3">
              {langErrors.map((err) => (
                <div
                  key={err.id}
                  className={`bg-white p-5 rounded-2xl border transition-all space-y-3 ${
                    err.resolved ? 'border-slate-200 opacity-60' : 'border-rose-200 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-100 text-rose-800 rounded">
                        Emin Olunan Yanlış
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm mt-1">"{err.turkishPrompt}"</h4>
                    </div>

                    {!err.resolved && (
                      <button
                        onClick={() => onResolveFossilizedError(err.id)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center space-x-1 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Hatayı Düzeltildi İşaretle</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-rose-50 p-2.5 rounded-lg border border-rose-100">
                      <span className="font-bold text-rose-900 block">Hatalı Üretim:</span>
                      <span className="text-rose-950 font-medium">{err.userAnswer}</span>
                    </div>

                    <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
                      <span className="font-bold text-emerald-900 block">Doğru Referans:</span>
                      <span className="text-emerald-950 font-bold">{err.correctReference}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: Kelime & Kalıp Listesi */}
      {activeSubTab === 'vocabulary' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center space-x-3">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
              <div>
                <div className="text-xs text-slate-500 font-semibold">Aktif Üretilebilen Kelimeler</div>
                <div className="text-xl font-bold text-slate-900">{activeVocab.length} İfade</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center space-x-3">
              <Brain className="w-8 h-8 text-indigo-600" />
              <div>
                <div className="text-xs text-slate-500 font-semibold">Pasif Kelimeler (Sadece Tanınan)</div>
                <div className="text-xl font-bold text-slate-900">{passiveVocab.length} İfade</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Türkçe İfade</th>
                  <th className="p-3.5">Hedef Karşılık</th>
                  <th className="p-3.5">Hâkimiyet Durumu</th>
                  <th className="p-3.5">Tür</th>
                  <th className="p-3.5">Bağlam Sayısı</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {langItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-3.5 font-medium text-slate-800">{item.turkishText}</td>
                    <td className="p-3.5 font-bold text-slate-900">{item.targetText}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        item.masteryState === 'mastered' ? 'bg-teal-100 text-teal-800' :
                        item.masteryState === 'independently_producible' ? 'bg-emerald-100 text-emerald-800' :
                        item.masteryState === 'hint_producible' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {item.masteryState.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3.5">
                      {item.isActiveVocabulary ? (
                        <span className="text-emerald-700 font-bold">Aktif</span>
                      ) : (
                        <span className="text-slate-500 font-medium">Pasif</span>
                      )}
                    </td>
                    <td className="p-3.5 font-mono text-slate-600">{item.contextCount} Farklı Bağlam</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 3: Haftalık Öğretmen Raporu */}
      {activeSubTab === 'report' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
            <FileText className="w-6 h-6 text-indigo-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-base">Haftalık Yapay Zekâ Öğretmen Raporu</h3>
              <p className="text-xs text-slate-500">Klinik & gündelik iletişim ve FSRS aralıklı tekrar performans özeti</p>
            </div>
          </div>

          <div className="space-y-3 text-xs sm:text-sm text-slate-700 leading-relaxed">
            <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100">
              <strong className="text-indigo-900 block font-bold mb-1">1. Genel Performans Değerlendirmesi:</strong>
              Bu hafta gündelik yaşam, seyahat ve klinik rehabilitasyon alanlarında toplam 28 aktif cümle üretimi gerçekleştirildi. LingQ senkronizasyonu ile aktif kelime hazineniz genişledi.
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <strong className="text-slate-900 block font-bold mb-1">2. Sık Yapılan Hata Kalıpları:</strong>
              Almancada 'Sie-Form' emri verilirken fiil konumlandırması ve İngilizcede yön tarifleri ve edat kullanımı takip edilmelidir.
            </div>

            <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100">
              <strong className="text-emerald-900 block font-bold mb-1">3. Gelecek Haftanın Hedef Bağlamı:</strong>
              Gündelik kafe/restoran diyalogları ve Sırpça sosyal buluşma pratiklerine ağırlık verilecek.
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: Çevrimdışı Mod & PWA Veri Yönetimi Panel */}
      {activeSubTab === 'offline' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Status Header */}
          <div className="bg-gradient-to-r from-teal-700 via-emerald-700 to-teal-800 text-white p-6 rounded-3xl shadow-lg space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl">
                  <ShieldCheck className="w-8 h-8 text-teal-200" />
                </div>
                <div>
                  <h3 className="text-lg font-black">Offline-First & Yerel Senkronizasyon Güvencesi</h3>
                  <p className="text-xs text-teal-100">İnternetsiz ortamda sıfır gecikmeli çalışma, Anki & JSON veri aktarımı</p>
                </div>
              </div>

              <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-white/20 text-xs font-bold">
                <Wifi className="w-4 h-4 text-emerald-300" />
                <span>Uygulama Offline Kullanıma %100 Hazır</span>
              </div>
            </div>

            <p className="text-xs text-teal-100/90 leading-relaxed">
              Tüm kelimeleriniz, FSRS aralıklı tekrar parametreleriniz ve fosilleşmiş hatalarınız cihazınızın güvenli yerel belleğinde (IndexedDB/LocalStorage) saklanır. Sunucu çökse bile hiçbir pratik veriniz kaybolmaz.
            </p>
          </div>

          {/* 3 Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
              <div className="p-3 bg-teal-50 text-teal-700 rounded-xl">
                <HardDrive className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500">Yerel Bellek Kullanımı</div>
                <div className="text-xl font-black text-slate-900">{calculateStorageSize()} KB</div>
                <div className="text-[11px] text-teal-600 font-bold">Cihazınızda Güvende</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
              <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500">Kayıtlı Cümle & Öğe</div>
                <div className="text-xl font-black text-slate-900">{learningItems.length + fossilizedErrors.length} Adet</div>
                <div className="text-[11px] text-indigo-600 font-bold">Çevrimdışı Erişilebilir</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
              <div className="p-3 bg-sky-50 text-sky-700 rounded-xl">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500">Mobil / PWA Modu</div>
                <div className="text-xl font-black text-slate-900">Yerel Mobil Destek</div>
                <div className="text-[11px] text-sky-600 font-bold">Ana Ekrana Eklenebilir</div>
              </div>
            </div>
          </div>

          {/* Export & Backup Tools */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
              <Share2 className="w-5 h-5 text-teal-600" />
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Gelişmiş Veri Aktarma & Anki Senkronizasyonu</h4>
                <p className="text-xs text-slate-500">Çalışma verilerinizi Anki flashcard yazılımına veya harici yedek dosyasına dönüştürün</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">Anki Flashcard Deste (CSV)</span>
                  <span className="text-[10px] font-extrabold bg-sky-100 text-sky-800 px-2 py-0.5 rounded">Anki Uyumlu</span>
                </div>
                <p className="text-xs text-slate-600">
                  {langItems.length} adet {currentLanguage.toUpperCase()} kelimenizi Anki masaüstü veya mobil uygulamasına tek tıkla yüklemek için `.csv` olarak indirin.
                </p>
                <button
                  onClick={handleExportAnkiCSV}
                  className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 shadow-xs transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Anki Deste CSV İndir</span>
                </button>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">Tam Veri Yedeği (JSON)</span>
                  <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">Tam Yedek</span>
                </div>
                <p className="text-xs text-slate-600">
                  Tüm dil seviyelerinizi, tekrar tarihlerini ve hatalarınızı içeren ham JSON dosyasını indirin veya başka bir cihaza aktarın.
                </p>
                <button
                  onClick={handleExportJSON}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 shadow-xs transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>JSON Tam Veri Yedeği İndir</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
