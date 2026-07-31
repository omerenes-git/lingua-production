import React, { useMemo, useState } from 'react';
import { Activity, AlertTriangle, Award, BookOpen, Check, CheckCircle2, Download, FileText, HardDrive, ShieldCheck } from 'lucide-react';
import { FossilizedError, LearningItem, ProductionPrompt, TargetLanguage } from '../../types';
import { LingQIntegration } from '../LingQIntegration';

interface IlerlemeTabProps {
  currentLanguage: TargetLanguage;
  learningItems: LearningItem[];
  fossilizedErrors: FossilizedError[];
  onResolveFossilizedError: (id: string) => void;
  onClearData: () => void;
  onImportPrompts?: (prompts: ProductionPrompt[]) => void;
  onAddLearningItems?: (items: LearningItem[]) => void;
}

type SubTab = 'overview' | 'activity' | 'lingq' | 'errors' | 'vocabulary' | 'report' | 'offline';

const languageNames: Record<TargetLanguage, string> = {
  en: 'İngilizce',
  de: 'Almanca',
  sr: 'Sırpça',
};

function readDailyHistory(): Record<string, number> {
  try {
    const parsed = JSON.parse(localStorage.getItem('lingua_daily_history') || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function calculateStreak(history: Record<string, number>): number {
  let total = 0;
  const cursor = new Date();
  while ((history[dateKey(cursor)] || 0) > 0) {
    total += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return total;
}

function storageSizeKb(): string {
  try {
    let bytes = 0;
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key) continue;
      bytes += (key.length + (localStorage.getItem(key)?.length || 0)) * 2;
    }
    return (bytes / 1024).toFixed(1);
  } catch {
    return 'Hesaplanamadı';
  }
}

export const IlerlemeTab: React.FC<IlerlemeTabProps> = ({
  currentLanguage,
  learningItems,
  fossilizedErrors,
  onResolveFossilizedError,
  onClearData,
  onImportPrompts = () => undefined,
  onAddLearningItems = () => undefined,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('overview');
  const history = readDailyHistory();
  const langItems = learningItems.filter((item) => item.language === currentLanguage);
  const langErrors = fossilizedErrors.filter((error) => error.language === currentLanguage);
  const resolvedErrors = langErrors.filter((error) => error.resolved);
  const activeItems = langItems.filter((item) => item.isActiveVocabulary);
  const producedItems = langItems.filter((item) =>
    ['hint_producible', 'independently_producible', 'mastered'].includes(item.masteryState),
  );
  const independentItems = langItems.filter((item) =>
    ['independently_producible', 'mastered'].includes(item.masteryState),
  );

  const sevenDayData = useMemo(() => {
    const rows: Array<{ key: string; label: string; count: number }> = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const day = new Date();
      day.setDate(day.getDate() - offset);
      const key = dateKey(day);
      rows.push({
        key,
        label: offset === 0 ? 'Bugün' : day.toLocaleDateString('tr-TR', { weekday: 'short' }),
        count: Number(history[key] || 0),
      });
    }
    return rows;
  }, [JSON.stringify(history)]);

  const weeklyExerciseCount = sevenDayData.reduce((sum, row) => sum + row.count, 0);
  const streak = calculateStreak(history);
  const correctionRate = langErrors.length > 0
    ? Math.round((resolvedErrors.length / langErrors.length) * 100)
    : null;

  const estimatedCefr = useMemo(() => {
    const evidenceCount = producedItems.length;
    if (evidenceCount < 5) return { level: 'Yetersiz veri', confidence: 'Düşük', score: null as number | null };

    const averageWords = producedItems.reduce((sum, item) => {
      return sum + item.targetText.trim().split(/\s+/).filter(Boolean).length;
    }, 0) / evidenceCount;
    const independentRatio = independentItems.length / evidenceCount;
    const score = Math.min(100, Math.round(evidenceCount * 1.5 + averageWords * 4 + independentRatio * 35));
    const level = score < 25 ? 'A1' : score < 42 ? 'A2' : score < 60 ? 'B1' : score < 78 ? 'B2' : score < 92 ? 'C1' : 'C2';
    const confidence = evidenceCount >= 30 ? 'Orta' : 'Düşük';
    return { level, confidence, score };
  }, [producedItems, independentItems]);

  const handleExportJson = () => {
    const payload = JSON.stringify({ learningItems, fossilizedErrors, dailyHistory: history }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `lingua-backup-${dateKey(new Date())}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const tabs: Array<{ id: SubTab; label: string }> = [
    { id: 'overview', label: 'Gerçek Özet' },
    { id: 'activity', label: 'Aktivite' },
    { id: 'lingq', label: 'LingQ' },
    { id: 'errors', label: `Hatalar (${langErrors.filter((error) => !error.resolved).length})` },
    { id: 'vocabulary', label: `Kelimeler (${langItems.length})` },
    { id: 'report', label: 'Haftalık Rapor' },
    { id: 'offline', label: 'Veri & Çevrimdışı' },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              className={`rounded-xl px-3 py-2 text-xs font-bold ${activeSubTab === tab.id ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={handleExportJson} className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <Download className="h-4 w-4" /> JSON yedek
        </button>
      </div>

      {activeSubTab === 'overview' && (
        <div className="space-y-5">
          <div className="rounded-3xl border border-indigo-800 bg-gradient-to-br from-slate-950 to-indigo-950 p-6 text-white">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-200"><Award className="h-4 w-4" /> Kanıta dayalı uygulama içi tahmin</div>
                <h2 className="mt-2 text-2xl font-black">Tahmini CEFR: {estimatedCefr.level}</h2>
                <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-300">
                  Bu sonuç resmî bir CEFR sınavı değildir. Yalnızca uygulamadaki {producedItems.length} üretilebilir kayıt ve {independentItems.length} bağımsız üretim üzerinden hesaplanır.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-right">
                <div className="text-[10px] font-bold uppercase text-slate-400">Güven düzeyi</div>
                <div className="text-xl font-black">{estimatedCefr.confidence}</div>
                <div className="text-xs text-slate-400">{estimatedCefr.score === null ? 'Skor üretilmedi' : `${estimatedCefr.score}/100 uygulama skoru`}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Toplam kayıt', langItems.length],
              ['Aktif kelime', activeItems.length],
              ['Bağımsız üretim', independentItems.length],
              ['Çözülen hata', resolvedErrors.length],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="text-xs font-semibold text-slate-500">{label}</div>
                <div className="mt-1 text-2xl font-black">{value}</div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            CEFR yüzdeleri, geçmiş haftalara dağıtılmış kelime sayıları veya doğruluk oranları veri yokken oluşturulmaz. Daha güvenilir bir seviye için farklı zorluklarda en az 30 gerçek üretim kaydı gerekir.
          </div>
        </div>
      )}

      {activeSubTab === 'activity' && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div className="text-xs text-slate-500">Gerçek seri</div><div className="text-2xl font-black">{streak} gün</div></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div className="text-xs text-slate-500">Son 7 gün</div><div className="text-2xl font-black">{weeklyExerciseCount} çalışma</div></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div className="text-xs text-slate-500">Hata çözme oranı</div><div className="text-2xl font-black">{correctionRate === null ? 'Veri yok' : `%${correctionRate}`}</div></div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-black">Son 7 günün kayıtlı çalışmaları</h3>
            <div className="mt-4 grid grid-cols-7 gap-2">
              {sevenDayData.map((row) => (
                <div key={row.key} className="text-center">
                  <div className="flex h-28 items-end justify-center rounded-xl bg-slate-100 p-2 dark:bg-slate-800">
                    <div className="w-full rounded-lg bg-sky-600" style={{ height: `${Math.max(4, Math.min(100, row.count * 16))}%` }} title={`${row.count} çalışma`} />
                  </div>
                  <div className="mt-2 text-[11px] font-bold text-slate-500">{row.label}</div>
                  <div className="text-xs font-black">{row.count}</div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-500">Kayıt bulunmayan günler sıfır gösterilir; geçmiş günler tahmini değerlerle doldurulmaz.</p>
          </div>
        </div>
      )}

      {activeSubTab === 'lingq' && (
        <LingQIntegration currentLanguage={currentLanguage} learningItems={learningItems} onImportPrompts={onImportPrompts} onAddLearningItems={onAddLearningItems} />
      )}

      {activeSubTab === 'errors' && (
        <div className="space-y-3">
          {langErrors.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">Bu dil için kayıtlı hata yok.</div>
          ) : langErrors.map((error) => (
            <div key={error.id} className={`rounded-2xl border bg-white p-4 dark:bg-slate-900 ${error.resolved ? 'border-slate-200 opacity-70 dark:border-slate-800' : 'border-rose-200 dark:border-rose-900'}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><div className="text-xs font-bold text-rose-600">{error.turkishPrompt}</div><div className="mt-2 text-sm"><span className="font-bold">Yanıt:</span> {error.userAnswer}</div><div className="mt-1 text-sm"><span className="font-bold">Referans:</span> {error.correctReference}</div></div>
                {!error.resolved && <button type="button" onClick={() => onResolveFossilizedError(error.id)} className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white"><Check className="h-4 w-4" /> Düzeltildi</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeSubTab === 'vocabulary' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50 p-3 text-xs font-bold dark:border-slate-800 dark:bg-slate-950"><span>Hedef ifade</span><span>Türkçe</span><span>Durum</span></div>
          {langItems.length === 0 ? <div className="p-6 text-center text-sm text-slate-500">Kayıt yok.</div> : langItems.map((item) => (
            <div key={item.id} className="grid grid-cols-3 gap-3 border-b border-slate-100 p-3 text-xs last:border-0 dark:border-slate-800"><span className="font-bold">{item.targetText}</span><span>{item.turkishText}</span><span>{item.masteryState.replaceAll('_', ' ')}</span></div>
          ))}
        </div>
      )}

      {activeSubTab === 'report' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2"><FileText className="h-5 w-5 text-indigo-600" /><h3 className="font-black">Gerçek haftalık özet</h3></div>
          <div className="mt-4 space-y-3 text-sm">
            <p>Son 7 günde <strong>{weeklyExerciseCount}</strong> kayıtlı çalışma yapıldı.</p>
            <p>{languageNames[currentLanguage]} için <strong>{langItems.length}</strong> kelime/kalıp ve <strong>{langErrors.length}</strong> hata kaydı bulunuyor.</p>
            <p>{resolvedErrors.length} hata çözüldü. {correctionRate === null ? 'Oran hesaplamak için hata kaydı yok.' : `Kayıtlı hata çözme oranı %${correctionRate}.`}</p>
            <p className="text-xs text-slate-500">Bu rapor yapay geçmiş veya sabit cümle sayısı kullanmaz.</p>
          </div>
        </div>
      )}

      {activeSubTab === 'offline' && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-teal-800 bg-teal-950 p-6 text-white"><div className="flex items-center gap-2 font-black"><ShieldCheck className="h-5 w-5" /> Yerel veri ve Supabase yedeği</div><p className="mt-2 text-xs leading-relaxed text-teal-100">Mevcut çalışma verileri localStorage içinde tutulur ve giriş yapılmış hesapla Supabase’e senkronize edilir. Yapay zekâ ve LingQ çağrıları internet gerektirir; bu nedenle uygulamanın tüm özellikleri çevrimdışı çalışıyor olarak gösterilmez.</p></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center gap-2 text-xs font-bold text-slate-500"><HardDrive className="h-4 w-4" /> Yerel kullanım</div><div className="mt-1 text-2xl font-black">{storageSizeKb()} KB</div></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center gap-2 text-xs font-bold text-slate-500"><Activity className="h-4 w-4" /> Kayıtlı öğeler</div><div className="mt-1 text-2xl font-black">{learningItems.length + fossilizedErrors.length}</div></div>
          </div>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={handleExportJson} className="flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white"><Download className="h-4 w-4" /> Verileri indir</button><button type="button" onClick={onClearData} className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white"><AlertTriangle className="h-4 w-4" /> Pratik verilerini sıfırla</button></div>
        </div>
      )}
    </div>
  );
};
