import React from 'react';
import { TargetLanguage, LearningItem, FossilizedError } from '../../types';
import { 
  Play, 
  HelpCircle, 
  MessageSquare, 
  BookOpen, 
  AlertTriangle, 
  Brain, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface BugunTabProps {
  currentLanguage: TargetLanguage;
  learningItems: LearningItem[];
  fossilizedErrors: FossilizedError[];
  onNavigateTab: (tab: string) => void;
}

export const BugunTab: React.FC<BugunTabProps> = ({
  currentLanguage,
  learningItems,
  fossilizedErrors,
  onNavigateTab,
}) => {
  const langItems = learningItems.filter((item) => item.language === currentLanguage);
  const activeItems = langItems.filter((item) => item.isActiveVocabulary);
  const passiveItems = langItems.filter((item) => !item.isActiveVocabulary);
  const dueItems = langItems.filter((item) => new Date(item.nextReviewDate) <= new Date());
  const activeFossilized = fossilizedErrors.filter((e) => e.language === currentLanguage && !e.resolved);

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

  return (
    <div className="space-y-6">
      {/* Welcome & Daily Goal Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-900 to-indigo-950 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-center">
          <Brain className="w-64 h-64 text-white" />
        </div>

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
        </div>
      </div>

      {/* Overview Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Due Cards */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tekrar Zamanı Gelen</div>
            <div className="text-2xl font-bold text-slate-900">{dueItems.length} Kart</div>
            <div className="text-xs text-slate-500 mt-0.5">FSRS algoritması zamanladı</div>
          </div>
        </div>

        {/* Card 2: Active Vocabulary */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Aktif Üretilen Kelimeler</div>
            <div className="text-2xl font-bold text-emerald-700">{activeItems.length} İfade</div>
            <div className="text-xs text-slate-500 mt-0.5">İpucusuz/İpucuyla üretilebilen</div>
          </div>
        </div>

        {/* Card 3: Passive Vocabulary */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pasif Kelimeler</div>
            <div className="text-2xl font-bold text-slate-800">{passiveItems.length} İfade</div>
            <div className="text-xs text-slate-500 mt-0.5">Sadece anlamı biliniyor</div>
          </div>
        </div>

        {/* Card 4: Fossilized Errors */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Emin Olunan Yanlışlar</div>
            <div className="text-2xl font-bold text-rose-700">{activeFossilized.length} Hata</div>
            <div className="text-xs text-slate-500 mt-0.5">Öncelikli düzeltme bekliyor</div>
          </div>
        </div>
      </div>

      {/* Mastery States Breakdown */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
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
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-xs font-medium text-slate-500">1. Yeni</div>
            <div className="text-xl font-bold text-slate-800 mt-1">{masteryCounts.new}</div>
          </div>
          <div className="p-3 bg-sky-50/50 rounded-xl border border-sky-100">
            <div className="text-xs font-medium text-sky-700">2. Anlamına Bakıldı</div>
            <div className="text-xl font-bold text-sky-900 mt-1">{masteryCounts.noticed}</div>
          </div>
          <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
            <div className="text-xs font-medium text-indigo-700">3. Bağlamda Tanındı</div>
            <div className="text-xl font-bold text-indigo-900 mt-1">{masteryCounts.recognized_in_context}</div>
          </div>
          <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100">
            <div className="text-xs font-medium text-amber-700">4. İpucuyla Üretildi</div>
            <div className="text-xl font-bold text-amber-900 mt-1">{masteryCounts.hint_producible}</div>
          </div>
          <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
            <div className="text-xs font-medium text-emerald-700">5. Bağımsız Üretildi</div>
            <div className="text-xl font-bold text-emerald-900 mt-1">{masteryCounts.independently_producible}</div>
          </div>
          <div className="p-3 bg-teal-50/50 rounded-xl border border-teal-100">
            <div className="text-xs font-medium text-teal-700">6. Kalıcı Hâkimiyet</div>
            <div className="text-xl font-bold text-teal-900 mt-1">{masteryCounts.mastered}</div>
          </div>
        </div>
      </div>

      {/* Quick Action Cards Grid */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-slate-900">Modüller & Hızlı Erişim</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Action 1: Üret */}
          <button
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
          </button>

          {/* Action 2: Nasıl Söylerim? */}
          <button
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
          </button>

          {/* Action 3: Persona Sohbeti */}
          <button
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
          </button>

          {/* Action 4: Hikâyeler */}
          <button
            onClick={() => onNavigateTab('hikayeler')}
            className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-amber-400 hover:shadow-md transition-all text-left group flex flex-col justify-between space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                i+1 Seviye
              </span>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-base group-hover:text-amber-700 transition-colors">
                Adaptif Hikâyeler
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Kullandığın kelimelere göre üretilmiş klinik & gündelik okuma/dinleme hikâyeleri.
              </p>
            </div>
            <div className="pt-2 flex items-center text-xs font-semibold text-amber-600 group-hover:translate-x-1 transition-transform">
              <span>Hikâye Oku / Dinle</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </button>

          {/* Action 5: Emin Olunan Yanlışlar */}
          <button
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
          </button>
        </div>
      </div>
    </div>
  );
};
