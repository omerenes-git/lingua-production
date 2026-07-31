import React, { useEffect, useMemo, useState } from 'react';
import { FossilizedError, LearningItem, TargetLanguage } from '../../types';
import { VocabularyTooltip } from '../VocabularyTooltip';
import { AlertTriangle, BookOpen, Brain, CheckCircle2, Lightbulb, Loader2, RefreshCw, Send, Sparkles } from 'lucide-react';

interface GrammarDrill {
  id: string;
  grammarTopic: string;
  cefrLevel: string;
  turkishSentence: string;
  targetReference: string;
  targetVariants?: string[];
  grammarPattern: string;
  fossilizedErrorFocus: string;
  hintLadder?: { patternHint?: string; keyWordsGiven?: string; fullAnswer?: string };
}

interface GrammarHint {
  levelTailoredHint: string;
  stepByStepSolution?: string[];
}

interface EvaluationResult {
  overallVerdict: 'correct' | 'minor_issue' | 'major_issue';
  errors?: Array<{ message?: string; suggestion?: string }>;
  explanationTr?: string;
}

interface GramerPratigiTabProps {
  currentLanguage: TargetLanguage;
  fossilizedErrors: FossilizedError[];
  onAddLearningItem: (item: LearningItem) => void;
  onMarkErrorResolved?: (errorId: string) => void;
}

type ContentSource = 'curated' | 'ai';

const CURATED_DRILLS: Record<TargetLanguage, GrammarDrill[]> = {
  en: [
    {
      id: 'curated-en-a2-request', grammarTopic: 'Polite requests', cefrLevel: 'A2',
      turkishSentence: 'Lütfen bana yeni randevu saatini e-postayla gönderir misiniz?',
      targetReference: 'Could you please send me the new appointment time by email?',
      targetVariants: ['Can you email me the new appointment time, please?'],
      grammarPattern: 'Could you please + verb + object?',
      fossilizedErrorFocus: 'Kibar isteklerde yardımcı fiil ve kelime sırası.',
      hintLadder: { patternHint: 'Could you please + fiilin yalın hâli + nesne?', keyWordsGiven: 'could / please / send / appointment time / by email', fullAnswer: 'Could you please send me the new appointment time by email?' },
    },
    {
      id: 'curated-en-b1-condition', grammarTopic: 'If clause + imperative', cefrLevel: 'B1',
      turkishSentence: 'Egzersiz sırasında ağrı artarsa hareketi durdurun.',
      targetReference: 'If the pain increases during exercise, stop the movement.',
      targetVariants: ['Stop the movement if the pain increases during exercise.'],
      grammarPattern: 'If + present simple, imperative',
      fossilizedErrorFocus: 'Şart cümlesi ile emir cümlesinin doğru dizilimi.',
      hintLadder: { patternHint: 'If + özne + geniş zaman, emir fiili + nesne.', keyWordsGiven: 'if / pain / increase / during exercise / stop', fullAnswer: 'If the pain increases during exercise, stop the movement.' },
    },
  ],
  de: [
    {
      id: 'curated-de-a1-order', grammarTopic: 'Sipariş ve Akkusativ', cefrLevel: 'A1',
      turkishSentence: 'Bir kahve ve bir şişe su istiyorum.',
      targetReference: 'Ich möchte einen Kaffee und eine Flasche Wasser.',
      targetVariants: ['Ich hätte gern einen Kaffee und eine Flasche Wasser.'],
      grammarPattern: 'Ich möchte + Akkusativ',
      fossilizedErrorFocus: 'Eril isimlerde Akkusativ artikel kullanımı.',
      hintLadder: { patternHint: 'Ich möchte + einen/eine + isim.', keyWordsGiven: 'möchte / einen Kaffee / eine Flasche Wasser', fullAnswer: 'Ich möchte einen Kaffee und eine Flasche Wasser.' },
    },
    {
      id: 'curated-de-b1-wenn', grammarTopic: 'Wenn yan cümlesi', cefrLevel: 'B1',
      turkishSentence: 'Zamanım olduğunda seni arayacağım.',
      targetReference: 'Wenn ich Zeit habe, rufe ich dich an.',
      targetVariants: ['Ich rufe dich an, wenn ich Zeit habe.'],
      grammarPattern: 'Wenn + özne + ... + fiil, ana cümle',
      fossilizedErrorFocus: 'Yan cümlede çekimli fiilin sona gitmesi.',
      hintLadder: { patternHint: 'Wenn cümlesinde habe en sona gelir.', keyWordsGiven: 'wenn / Zeit haben / anrufen', fullAnswer: 'Wenn ich Zeit habe, rufe ich dich an.' },
    },
  ],
  sr: [
    {
      id: 'curated-sr-a1-order', grammarTopic: 'Sipariş ve Akuzativ', cefrLevel: 'A1',
      turkishSentence: 'Lütfen bir kahve ve bir su.',
      targetReference: 'Molim vas, jednu kafu i jednu vodu.',
      targetVariants: ['Jednu kafu i jednu vodu, molim vas.'],
      grammarPattern: 'Molim vas + Akuzativ',
      fossilizedErrorFocus: 'Kafa ve voda isimlerinin nesne hâli.',
      hintLadder: { patternHint: 'jedna kafa → jednu kafu; jedna voda → jednu vodu', keyWordsGiven: 'molim vas / jednu kafu / jednu vodu', fullAnswer: 'Molim vas, jednu kafu i jednu vodu.' },
    },
    {
      id: 'curated-sr-a2-meeting', grammarTopic: 'Gelecek zaman', cefrLevel: 'A2',
      turkishSentence: 'Yarın saat üçte buluşacağız.',
      targetReference: 'Sastaćemo se sutra u tri sata.',
      targetVariants: ['Sutra ćemo se sastati u tri sata.'],
      grammarPattern: 'Futur I + povratna zamenica',
      fossilizedErrorFocus: 'Gelecek zaman ve se zamirinin konumu.',
      hintLadder: { patternHint: 'sastaćemo se + zaman ifadesi', keyWordsGiven: 'sastaćemo se / sutra / u tri sata', fullAnswer: 'Sastaćemo se sutra u tri sata.' },
    },
  ],
};

const normalize = (value: string) => value.toLocaleLowerCase().normalize('NFKC').replace(/[.,!?;:'"()]/g, '').replace(/\s+/g, ' ').trim();

const validDrill = (value: unknown): value is GrammarDrill => {
  if (!value || typeof value !== 'object') return false;
  const drill = value as Record<string, unknown>;
  return Boolean(typeof drill.id === 'string' && typeof drill.grammarTopic === 'string' && typeof drill.turkishSentence === 'string' && typeof drill.targetReference === 'string' && typeof drill.grammarPattern === 'string');
};

export const GramerPratigiTab: React.FC<GramerPratigiTabProps> = ({ currentLanguage, fossilizedErrors, onAddLearningItem, onMarkErrorResolved }) => {
  const [cefrLevel, setCefrLevel] = useState('A2');
  const [drills, setDrills] = useState<GrammarDrill[]>(CURATED_DRILLS[currentLanguage]);
  const [source, setSource] = useState<ContentSource>('curated');
  const [activeIndex, setActiveIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [hint, setHint] = useState<GrammarHint | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isHintLoading, setIsHintLoading] = useState(false);

  useEffect(() => {
    setDrills(CURATED_DRILLS[currentLanguage]);
    setSource('curated');
    setActiveIndex(0);
    setUserAnswer('');
    setEvaluation(null);
    setHint(null);
    setStatus(null);
  }, [currentLanguage]);

  const visibleDrills = useMemo(() => {
    const sameLevel = drills.filter((drill) => drill.cefrLevel === cefrLevel);
    return sameLevel.length ? sameLevel : drills;
  }, [drills, cefrLevel]);

  const currentDrill = visibleDrills[Math.min(activeIndex, visibleDrills.length - 1)];
  const languageErrors = fossilizedErrors.filter((error) => {
    const item = error as unknown as Record<string, unknown>;
    return !item.language || item.language === currentLanguage;
  });

  const resetAttempt = () => {
    setUserAnswer('');
    setEvaluation(null);
    setHint(null);
    setStatus(null);
  };

  const loadCurated = () => {
    setDrills(CURATED_DRILLS[currentLanguage]);
    setSource('curated');
    setActiveIndex(0);
    resetAttempt();
  };

  const generateWithAi = async () => {
    setIsGenerating(true);
    setStatus(null);
    setEvaluation(null);
    setHint(null);
    try {
      const errorTopics = languageErrors.map((error) => {
        const item = error as unknown as Record<string, unknown>;
        return String(item.errorDescription || item.category || '').trim();
      }).filter(Boolean);
      const response = await fetch('/api/generate-grammar-drills', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: currentLanguage, cefrLevel, errorTopics }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || `HTTP ${response.status}`);
      const generated = Array.isArray(payload?.drills) ? payload.drills.filter(validDrill) : [];
      if (!generated.length) throw new Error('Sunucu geçerli alıştırma döndürmedi.');
      setDrills(generated);
      setSource('ai');
      setActiveIndex(0);
      setUserAnswer('');
      setStatus('AI tarafından üretilen yeni alıştırmalar yüklendi.');
    } catch (error) {
      setStatus(`AI alıştırması oluşturulamadı: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}. Hazır alıştırmalar korunuyor.`);
    } finally {
      setIsGenerating(false);
    }
  };

  const requestHint = async () => {
    if (!currentDrill) return;
    setIsHintLoading(true);
    setHint(null);
    setStatus(null);
    try {
      const response = await fetch('/api/generate-grammar-hint', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: currentLanguage, cefrLevel, turkishSentence: currentDrill.turkishSentence, targetReference: currentDrill.targetReference, grammarPattern: currentDrill.grammarPattern, userAnswer }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || `HTTP ${response.status}`);
      if (!payload || typeof payload.levelTailoredHint !== 'string') throw new Error('Sunucu geçerli ipucu döndürmedi.');
      setHint(payload as GrammarHint);
    } catch (error) {
      setStatus(`AI ipucu alınamadı: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}. Aşağıdaki hazır kalıp ipucunu kullanabilirsiniz.`);
    } finally {
      setIsHintLoading(false);
    }
  };

  const evaluateAnswer = async () => {
    if (!currentDrill || !userAnswer.trim()) return;
    setIsEvaluating(true);
    setEvaluation(null);
    setStatus(null);
    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: currentLanguage, turkishPrompt: currentDrill.turkishSentence, targetReference: currentDrill.targetReference, targetVariants: currentDrill.targetVariants || [], userAnswer: userAnswer.trim(), cefrLevel }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || `HTTP ${response.status}`);
      if (!['correct', 'minor_issue', 'major_issue'].includes(payload?.overallVerdict)) throw new Error('Sunucu geçerli değerlendirme döndürmedi.');
      setEvaluation(payload as EvaluationResult);
    } catch (error) {
      const accepted = [currentDrill.targetReference, ...(currentDrill.targetVariants || [])];
      const exactMatch = accepted.some((answer) => normalize(answer) === normalize(userAnswer));
      if (exactMatch) {
        setEvaluation({ overallVerdict: 'correct', explanationTr: 'Yanıt, kayıtlı referans cevaplardan biriyle metinsel olarak tam eşleşiyor. Bu sonuç AI değerlendirmesi değildir.' });
      } else {
        setStatus(`AI değerlendirmesi yapılamadı: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}. Yanıtınız puanlanmadı ve ilerlemeye yazılmadı.`);
      }
    } finally {
      setIsEvaluating(false);
    }
  };

  const addToReviewDeck = () => {
    if (!currentDrill || evaluation?.overallVerdict !== 'correct') return;
    const item: LearningItem = {
      id: `grammar_${currentDrill.id}_${Date.now()}`, language: currentLanguage, domain: 'general',
      turkishText: currentDrill.turkishSentence, targetText: currentDrill.targetReference,
      keyTermOrPattern: currentDrill.grammarPattern, masteryState: 'noticed', isActiveVocabulary: false,
      contextCount: 1, nextReviewDate: new Date().toISOString(), stability: 1.5, difficulty: 4, fossilizedCount: 0,
    };
    onAddLearningItem(item);
    setStatus('Alıştırma uygulamanın tekrar destesine eklendi.');
  };

  const markRelatedErrorResolved = () => {
    if (!onMarkErrorResolved || evaluation?.overallVerdict !== 'correct') return;
    const first = languageErrors[0] as unknown as Record<string, unknown> | undefined;
    if (first?.id) {
      onMarkErrorResolved(String(first.id));
      setStatus('İlgili hata çözüldü olarak işaretlendi.');
    }
  };

  if (!currentDrill) return <div className="p-6 text-sm text-slate-600">Bu dil için gramer alıştırması bulunamadı.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <section className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><Brain className="w-5 h-5 text-violet-600" /><h2 className="font-black text-slate-900">Gramer Pratiği</h2></div>
            <p className="text-xs text-slate-500 mt-1">İçerik kaynağı: <strong>{source === 'ai' ? 'AI üretimi' : 'önceden hazırlanmış alıştırma'}</strong></p>
          </div>
          <div className="flex flex-wrap gap-2">
            {['A1', 'A2', 'B1', 'B2'].map((level) => (
              <button key={level} onClick={() => { setCefrLevel(level); setActiveIndex(0); resetAttempt(); }} className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${cefrLevel === level ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-600 border-slate-200'}`}>{level}</button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={generateWithAi} disabled={isGenerating} className="px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-2">{isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}AI ile yeni alıştırma üret</button>
          <button onClick={loadCurated} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-2"><RefreshCw className="w-4 h-4" />Hazır alıştırmaları yükle</button>
        </div>
        {status && <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /><span>{status}</span></div>}
      </section>

      <section className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div><span className="text-[10px] uppercase tracking-wider font-black text-violet-600">{currentDrill.cefrLevel} · {currentDrill.grammarTopic}</span><h3 className="font-black text-slate-900 mt-1">{currentDrill.turkishSentence}</h3><p className="text-xs text-slate-500 mt-2">Kalıp: {currentDrill.grammarPattern}</p></div>
          <span className="text-[10px] px-2 py-1 rounded-lg bg-slate-100 text-slate-600 font-bold">{activeIndex + 1}/{visibleDrills.length}</span>
        </div>
        <textarea value={userAnswer} onChange={(event) => setUserAnswer(event.target.value)} rows={4} placeholder="Hedef dilde cevabınızı yazın..." className="w-full p-4 rounded-2xl border border-slate-300 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
        <div className="flex flex-wrap gap-2">
          <button onClick={evaluateAnswer} disabled={!userAnswer.trim() || isEvaluating} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-2">{isEvaluating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}Değerlendir</button>
          <button onClick={requestHint} disabled={isHintLoading} className="px-4 py-2 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold disabled:opacity-50 flex items-center gap-2">{isHintLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}AI ipucu iste</button>
          <button onClick={() => { setActiveIndex((index) => (index + 1) % visibleDrills.length); resetAttempt(); }} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">Sonraki alıştırma</button>
        </div>
        {!hint && currentDrill.hintLadder?.patternHint && <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200 text-xs text-sky-900"><strong>Hazır kalıp ipucu:</strong> {currentDrill.hintLadder.patternHint}</div>}
        {hint && <div className="p-4 rounded-2xl bg-violet-50 border border-violet-200 space-y-2 text-sm"><div className="font-black text-violet-900">AI ipucu</div><p className="text-violet-950">{hint.levelTailoredHint}</p>{hint.stepByStepSolution?.length ? <ol className="list-decimal pl-5 text-xs text-violet-900 space-y-1">{hint.stepByStepSolution.map((step, index) => <li key={index}>{step}</li>)}</ol> : null}</div>}
        {evaluation && (
          <div className={`p-4 rounded-2xl border space-y-3 ${evaluation.overallVerdict === 'correct' ? 'bg-emerald-50 border-emerald-200' : evaluation.overallVerdict === 'minor_issue' ? 'bg-amber-50 border-amber-200' : 'bg-rose-50 border-rose-200'}`}>
            <div className="flex items-center gap-2 font-black text-sm">{evaluation.overallVerdict === 'correct' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-amber-600" />}{evaluation.overallVerdict === 'correct' ? 'Doğru' : evaluation.overallVerdict === 'minor_issue' ? 'Küçük düzeltme gerekli' : 'Önemli düzeltme gerekli'}</div>
            {evaluation.explanationTr && <p className="text-xs text-slate-700">{evaluation.explanationTr}</p>}
            {evaluation.errors?.map((error, index) => <div key={index} className="text-xs text-slate-700">{error.message}{error.suggestion ? ` Öneri: ${error.suggestion}` : ''}</div>)}
            <div className="text-xs text-slate-700"><strong>Referans:</strong>{' '}<VocabularyTooltip text={currentDrill.targetReference} language={currentLanguage} contextSentence={currentDrill.targetReference} onAddLearningItem={onAddLearningItem} /></div>
            {evaluation.overallVerdict === 'correct' && <div className="flex flex-wrap gap-2"><button onClick={addToReviewDeck} className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-2"><BookOpen className="w-4 h-4" />Tekrar destesine ekle</button>{onMarkErrorResolved && languageErrors.length > 0 && <button onClick={markRelatedErrorResolved} className="px-3 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold">İlgili hatayı çözüldü işaretle</button>}</div>}
          </div>
        )}
      </section>
    </div>
  );
};
