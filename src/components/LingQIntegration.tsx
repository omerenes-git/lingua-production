import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, KeyRound, RefreshCw, ShieldCheck, TriangleAlert } from 'lucide-react';
import { LearningItem, ProductionPrompt, TargetLanguage } from '../types';

interface LingQStats {
  knownWordsCount: number;
  lingqsCreatedCount: number;
  lingqsLearnedCount: number;
  level: string;
  streakDays: number;
  lastSyncTime: string;
}

interface TargetWord {
  id?: number | string;
  term?: string;
  text?: string;
  status?: number;
  translation?: string;
}

interface LingQResponse {
  success?: boolean;
  isRealApi?: boolean;
  stats?: LingQStats;
  error?: string;
  warning?: string;
  cardsEndpointVerified?: boolean;
  targetWords?: TargetWord[];
}

interface LingQIntegrationProps {
  currentLanguage: TargetLanguage;
  learningItems?: LearningItem[];
  onImportPrompts: (prompts: ProductionPrompt[]) => void;
  onAddLearningItems: (items: LearningItem[]) => void;
}

const languageNames: Record<TargetLanguage, string> = { en: 'İngilizce', de: 'Almanca', sr: 'Sırpça' };

export const LingQIntegration: React.FC<LingQIntegrationProps> = ({
  currentLanguage,
  learningItems = [],
  onImportPrompts,
  onAddLearningItems,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [stats, setStats] = useState<LingQStats | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const localStats = useMemo<LingQStats>(() => {
    const items = learningItems.filter((item) => item.language === currentLanguage);
    return {
      knownWordsCount: items.filter((item) => ['mastered', 'independently_producible'].includes(item.masteryState)).length,
      lingqsCreatedCount: items.length,
      lingqsLearnedCount: items.filter((item) => item.masteryState === 'mastered').length,
      level: 'Yalnızca uygulama içi veriler',
      streakDays: 0,
      lastSyncTime: 'LingQ bağlantısı yapılmadı',
    };
  }, [currentLanguage, learningItems]);

  useEffect(() => {
    setStats(localStats);
    setIsConnected(false);
    setMessage(null);
  }, [currentLanguage, localStats]);

  const importTargetWords = (words: TargetWord[]) => {
    const existing = new Set(
      learningItems
        .filter((item) => item.language === currentLanguage)
        .map((item) => item.targetText.trim().toLocaleLowerCase()),
    );

    const valid = words.filter((word) => {
      const term = (word.term ?? word.text ?? '').trim();
      return term && [2, 3, 4].includes(Number(word.status)) && !existing.has(term.toLocaleLowerCase());
    }).slice(0, 50);

    if (valid.length === 0) return 0;
    const now = Date.now();
    const items: LearningItem[] = valid.map((word, index) => {
      const term = (word.term ?? word.text ?? '').trim();
      const status = Number(word.status);
      return {
        id: `lingq_${currentLanguage}_${word.id ?? `${now}_${index}`}`,
        language: currentLanguage,
        domain: 'general',
        turkishText: word.translation?.trim() || 'Çeviri LingQ yanıtında bulunmadı',
        targetText: term,
        keyTermOrPattern: term,
        masteryState: status === 4 ? 'hint_producible' : status === 3 ? 'recognized_in_context' : 'noticed',
        isActiveVocabulary: status >= 3,
        contextCount: 1,
        nextReviewDate: new Date().toISOString(),
        stability: status === 4 ? 3 : status === 3 ? 2 : 1,
        difficulty: status === 4 ? 3 : status === 3 ? 4 : 6,
        fossilizedCount: 0,
      };
    });
    onAddLearningItems(items);

    const prompts: ProductionPrompt[] = valid.slice(0, 8).map((word, index) => {
      const term = (word.term ?? word.text ?? '').trim();
      return {
        id: `lingq_prompt_${currentLanguage}_${word.id ?? `${now}_${index}`}`,
        language: currentLanguage,
        domain: 'general',
        turkishSentence: `“${term}” kelimesini kullanarak gündelik ve anlamlı bir cümle kur.`,
        targetReference: term,
        targetVariants: [term],
        keyTerms: [term],
        grammarPattern: `LingQ durum ${word.status} hedef kelime üretimi`,
        hintLadder: {
          partOfSpeech: 'LingQ hedef kelimesi',
          firstLetters: term.slice(0, 2),
          partialWords: term.slice(0, Math.max(2, Math.ceil(term.length / 2))),
          patternHint: 'Kelimeyi doğal bir gündelik bağlamda kullan.',
          keyWordsGiven: term,
          fullAnswer: term,
        },
      };
    });
    onImportPrompts(prompts);
    return items.length;
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setMessage(null);
    try {
      const response = await fetch('/api/lingq/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: currentLanguage, ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}) }),
      });
      const data = (await response.json().catch(() => ({}))) as LingQResponse;
      if (!response.ok || !data.success || !data.stats) throw new Error(data.error || `LingQ isteği başarısız (${response.status}).`);

      setStats(data.stats);
      setIsConnected(Boolean(data.isRealApi));
      const imported = data.cardsEndpointVerified && data.targetWords ? importTargetWords(data.targetWords) : 0;
      if (data.cardsEndpointVerified) {
        setMessage(imported > 0 ? `${imported} yeni durum 2–3–4 kelimesi içeri aktarıldı.` : 'Kart uç noktası doğrulandı; yeni veya uygun durum 2–3–4 kelimesi bulunmadı.');
      } else {
        setMessage(data.warning || 'Profil istatistikleri alındı fakat kart uç noktası doğrulanamadı; kelime aktarımı yapılmadı.');
      }
      setApiKey('');
    } catch (error) {
      setStats(localStats);
      setIsConnected(false);
      setMessage(error instanceof Error ? error.message : 'LingQ bağlantısı kurulamadı.');
    } finally {
      setIsSyncing(false);
    }
  };

  const shown = stats ?? localStats;

  return (
    <section className="space-y-5 rounded-3xl border border-sky-800/80 bg-gradient-to-br from-sky-950 to-slate-950 p-5 text-white shadow-xl sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-400/30 bg-sky-500/15 text-sky-300"><BookOpen className="h-6 w-6" /></div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-sky-400/30 bg-sky-500/15 px-2.5 py-1 text-[10px] font-bold uppercase text-sky-200">LingQ entegrasyonu</span>
              <span className={`flex items-center gap-1 text-xs font-semibold ${isConnected ? 'text-emerald-300' : 'text-amber-300'}`}>
                {isConnected ? <CheckCircle2 className="h-3.5 w-3.5" /> : <TriangleAlert className="h-3.5 w-3.5" />}
                {isConnected ? 'Gerçek API verisi' : 'Yerel veri görünümü'}
              </span>
            </div>
            <h3 className="mt-2 text-lg font-black">{languageNames[currentLanguage]} LingQ verileri</h3>
            <p className="mt-1 max-w-2xl text-xs text-slate-300">Yalnız doğrulanmış gerçek kart yanıtındaki durum 2–3–4 kelimeleri aktarılır. Uç nokta başarısızsa sahte kelime oluşturulmaz.</p>
          </div>
        </div>
        <button type="button" onClick={handleSync} disabled={isSyncing} className="flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-xs font-black text-slate-950 disabled:bg-slate-700 disabled:text-slate-300">
          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />{isSyncing ? 'Senkronize ediliyor…' : 'LingQ’yu senkronize et'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Bilinen kelimeler', shown.knownWordsCount],
          ['Oluşturulan LingQ', shown.lingqsCreatedCount],
          ['Öğrenilen LingQ', shown.lingqsLearnedCount],
          ['LingQ serisi', `${shown.streakDays} gün`],
        ].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-white/10 bg-white/5 p-3.5"><div className="text-[11px] font-semibold text-sky-200">{label}</div><div className="mt-1 text-xl font-black">{value}</div></div>)}
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-start gap-2 text-xs text-slate-300"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />Anahtar tarayıcıda kaydedilmez. Sunucuda LINGQ_API_KEY tanımlıysa alan boş bırakılabilir.</div>
        <div className="relative"><KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} autoComplete="off" placeholder="LingQ API anahtarı" className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-9 pr-3 text-xs font-mono text-white outline-none focus:border-sky-500" /></div>
        <div className="text-[11px] text-slate-400">Son durum: {shown.lastSyncTime} · {shown.level}</div>
        {message && <div className={`rounded-xl border px-3 py-2.5 text-xs ${isConnected ? 'border-emerald-700/60 bg-emerald-950/40 text-emerald-200' : 'border-amber-700/60 bg-amber-950/40 text-amber-200'}`}>{message}</div>}
      </div>
    </section>
  );
};
