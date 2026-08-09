import React from 'react';
import { motion } from 'framer-motion';
import { TargetLanguage, LearningItem, FossilizedError } from '../../types';
import { getDailyCount, todayKey, DAILY_GOAL } from '../../lib/dailyProgress';
import {
  Play,
  HelpCircle,
  MessageSquare,
  AlertTriangle,
  Brain,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Target,
} from 'lucide-react';

interface BugunTabProps {
  currentLanguage: TargetLanguage;
  learningItems: LearningItem[];
  fossilizedErrors: FossilizedError[];
  dailyHistory: Record<string, number>;
  onNavigateTab: (tab: string) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
};

export const BugunTab: React.FC<BugunTabProps> = ({
  currentLanguage,
  learningItems,
  fossilizedErrors,
  dailyHistory,
  onNavigateTab,
}) => {
  const langItems = learningItems.filter((item) => item.language === currentLanguage);
  const activeItems = langItems.filter((item) => item.isActiveVocabulary);
  const passiveItems = langItems.filter((item) => !item.isActiveVocabulary);
  const dueItems = langItems.filter((item) => new Date(item.nextReviewDate) <= new Date());
  const activeFossilized = fossilizedErrors.filter((e) => e.language === currentLanguage && !e.resolved);

  const todayCount = getDailyCount(dailyHistory, currentLanguage, todayKey());
  const dailyProgressPct = Math.min(100, Math.round((todayCount / DAILY_GOAL) * 100));

  const langNames: Record<TargetLanguage, string> = {
    en: 'İngilizce',
    de: 'Almanca',
    sr: 'Sırpça',
  };

  const masteryCounts = {
    new: langItems.filter((i) => i.masteryState === 'new').length,
    noticed: langItems.filter((i) => i.masteryState === 'noticed').length,
    recognized_in_context: langItems.filter((i) => i.masteryState === 'recognized_in_context').length,
    hint_producible: langItems.filter((i) => i.masteryState === 'hint_producible').length,
    independently_producible: langItems.filter((i) => i.masteryState === 'independently_producible').length,
    mastered: langItems.filter((i) => i.masteryState === 'mastered').length,
  };
  const maxMastery = Math.max(1, ...Object.values(masteryCounts));

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* Welcome & Daily Goal Banner */}
      <motion.div
        variants={itemVariants}
        className="bg-gradient-to-r from-slate-900 via-sky-900 to-indigo-950 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden"
      >
        <motion.div
          animate={{ rotate: [0, -4, 4, 0], scale: [1, 1.04, 1] }}
          transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
          className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-center"
        >
          <Brain className="w-64 h-64 text-white" />
        </motion.div>

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-sky-500/20 border border-sky-400/30 rounded-full text-xs font-medium text-sky-200">
            <Sparkles className="w-3.5 h-3.5 text-sky-300" />
            <span>Aktif Üretim Felsefesi: Tanımak Yetmez, Üret!</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Hoş geldin! Bugüne Özel {langNames[currentLanguage]} Üretim Pratiği Hazır.
          </h2>

          <p className="text-sm text-slate-300 leading-relaxed">
            Fizyoterapi kliniği, IELTS ve gündelik yaşamda bağımsız cümle kurma yeteneğini geliştirmek için FSRS aralıklı tekrar sistemi devrede.
          </p>

          {/* Daily Goal Progress Bar */}
          <div className="mt-2 p-4 rounded-xl bg-white/10 border border-white/15 backdrop-blur-xs">
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <span className="flex items-center gap-1.5 text-sky-200">
                <Target className="w-4 h-4" /> Günlük Hedef: {todayCount}/{DAILY_GOAL} üretim
              </span>
              <span className="text-sky-100">{dailyProgressPct}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-white/15 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${dailyProgressPct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={`h-full rounded-full ${dailyProgressPct >= 100 ? 'bg-emerald-400' : 'bg-gradient-to-r from-sky-400 to-indigo-400'}`}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Overview Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Due Cards */}
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -4 }}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-4 transition-shadow hover:shadow-md"
        >
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tekrar Zamanı Gelen</div>
            <div className="text-2xl font-bold text-slate-900">{dueItems.length} Kart</div>
            <div className="text-xs text-slate-500 mt-0.5">FSRS algoritması zamanladı</div>
          </div>
        </motion.div>

        {/* Card 2: Active Vocabulary */}
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -4 }}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-4 transition-shadow hover:shadow-md"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Aktif Üretilen Kelimeler</div>
            <div className="text-2xl font-bold text-emerald-700">{activeItems.length} İfade</div>
            <div className="text-xs text-slate-500 mt-0.5">İpucusuz/İpucuyla üretilebilen</div>
          </div>
        </motion.div>

        {/* Card 3: Passive Vocabulary */}
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -4 }}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-4 transition-shadow hover:shadow-md"
        >
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pasif Kelimeler</div>
            <div className="text-2xl font-bold text-slate-800">{passiveItems.length} İfade</div>
            <div className="text-xs text-slate-500 mt-0.5">Sadece anlamı biliniyor</div>
          </div>
        </motion.div>

        {/* Card 4: Fossilized Errors */}
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -4 }}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-4 transition-shadow hover:shadow-md"
        >
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Emin Olunan Yanlışlar</div>
            <div className="text-2xl font-bold text-rose-700">{activeFossilized.length} Hata</div>
            <div className="text-xs text-slate-500 mt-0.5">Öncelikli düzeltme bekliyor</div>
          </div>
        </motion.div>
      </div>

      {/* Mastery States Breakdown */}
      <motion.div
        variants={itemVariants}
        className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4"
      >
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900">Kelime & Kalıp Hâkimiyet Katmanları</h3>
            <p className="text-xs text-slate-500">Pasif tanımadan bağımsız üretime 6 aşamalı takip</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 rounded-lg text-slate-700">
            Toplam {langItems.length} Öğe
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
          {[
            { label: '1. Yeni', count: masteryCounts.new, bar: 'bg-slate-400', text: 'text-slate-800' },
            { label: '2. Anlamına Bakıldı', count: masteryCounts.noticed, bar: 'bg-sky-500', text: 'text-sky-900' },
            { label: '3. Bağlamda Tanındı', count: masteryCounts.recognized_in_context, bar: 'bg-indigo-500', text: 'text-indigo-900' },
            { label: '4. İpucuyla Üretildi', count: masteryCounts.hint_producible, bar: 'bg-amber-500', text: 'text-amber-900' },
            { label: '5. Bağımsız Üretildi', count: masteryCounts.independently_producible, bar: 'bg-emerald-500', text: 'text-emerald-900' },
            { label: '6. Kalıcı Hâkimiyet', count: masteryCounts.mastered, bar: 'bg-teal-500', text: 'text-teal-900' },
          ].map((entry) => (
            <div key={entry.label} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-xs font-medium text-slate-500">{entry.label}</div>
              <div className={`text-xl font-bold mt-1 ${entry.text}`}>{entry.count}</div>
              <div className="mt-2 h-1.5 rounded-full bg-slate-200/70 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(8, (entry.count / maxMastery) * 100)}%` }}
                  transition={{ duration: 0.7, delay: 0.2 }}
                  className={`h-full rounded-full ${entry.bar}`}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Quick Action Cards Grid */}
      <motion.div variants={itemVariants} className="space-y-3">
        <h3 className="text-base font-bold text-slate-900">Modüller & Hızlı Erişim</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Action 1: Üret */}
          <motion.button
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigateTab('uret')}
            className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-sky-400 hover:shadow-md transition-all text-left group flex flex-col justify-between space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold">
                <Play className="w-5 h-5 fill-white" />
              </div>
              <span className="text-xs font-medium text-sky-600 bg-sky-50 px-2.5 py-1 rounded-full group-hover:bg-sky-100">
                Ana Pratik
              </span>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-base group-hover:text-sky-700 transition-colors">
                Üret (Aktif Cümle Pratiği)
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Klinik, seyahat, IELTS senaryolarında kendi cümleni kur. AI ve FSRS ile değerlendir.
              </p>
            </div>
            <div className="pt-2 flex items-center text-xs font-semibold text-sky-600 group-hover:translate-x-1 transition-transform">
              <span>Hemen Başla ({dueItems.length} tekrar hazır)</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </motion.button>

          {/* Action 2: Nasıl Söylerim? */}
          <motion.button
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigateTab('nasil_soylerim')}
            className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all text-left group flex flex-col justify-between space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                <HelpCircle className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                Serbest Çeviri
              </span>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-base group-hover:text-indigo-700 transition-colors">
                Nasıl Söylerim?
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Aklındaki Türkçe ifadeyi yaz; klinik, resmî veya doğal alternatifleri keşfet, destene ekle.
              </p>
            </div>
            <div className="pt-2 flex items-center text-xs font-semibold text-indigo-600 group-hover:translate-x-1 transition-transform">
              <span>İfade Sorgula</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </motion.button>

          {/* Action 3: Persona Sohbeti */}
          <motion.button
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigateTab('sohbet')}
            className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-emerald-400 hover:shadow-md transition-all text-left group flex flex-col justify-between space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                AI Koç
              </span>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-base group-hover:text-emerald-700 transition-colors">
                Kişilik Sahibi Sohbet
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Dr. Sarah (Meslektaş), Marko (Sırpça dost) veya Alex (IELTS) ile sesli/yazılı sohbet et.
              </p>
            </div>
            <div className="pt-2 flex items-center text-xs font-semibold text-emerald-600 group-hover:translate-x-1 transition-transform">
              <span>Sohbete Başla</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </motion.button>

          {/* Action 4: Emin Olunan Yanlışlar */}
          <motion.button
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigateTab('ilerleme')}
            className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-rose-400 hover:shadow-md transition-all text-left group flex flex-col justify-between space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full">
                {activeFossilized.length} Bekleyen
              </span>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-base group-hover:text-rose-700 transition-colors">
                Emin Olunan Yanlışlar
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Emin olarak yaptığın ama hatalı olan 'kalıplaşmış yanlışları' öncelikle gözden geçir.
              </p>
            </div>
            <div className="pt-2 flex items-center text-xs font-semibold text-rose-600 group-hover:translate-x-1 transition-transform">
              <span>Hataları Temizle</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};
