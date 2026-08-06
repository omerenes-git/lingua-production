import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  TargetLanguage,
  Domain,
  IntensityLevel,
  ProductionPrompt,
  ConfidenceLevel,
  AIEvaluationResult,
  ProductionAttempt,
  FSRSRating,
  LearningItem,
  FossilizedError
} from '../../types';
import { decideFinalRating } from '../../lib/engine';
import { evaluateProduction } from '../../lib/aiService';
import { callLinguaApi } from '../../lib/linguaApi';
import { selectNextPrompt, SelectPromptResult } from '../../lib/sentenceSelector';
import { parseGeneratedPrompts } from '../../lib/generatedPrompts';
import { cefrToIntensity, DEFAULT_CEFR_LEVEL, estimateCefrLevel } from '../../lib/proficiency';
import { InteractiveWordDictionary } from '../InteractiveWordDictionary';
import { VocabularyTooltip } from '../VocabularyTooltip';
import { GrammarDeepDiveModal } from '../GrammarDeepDiveModal';
import { PronunciationAnalyzerModal } from '../PronunciationAnalyzerModal';
import { ContextMnemonicModal } from '../ContextMnemonicModal';
import {
  Mic,
  MicOff,
  Send,
  CheckCircle,
  RefreshCw,
  Lightbulb,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Volume2,
  BookOpen,
  Gauge,
  Zap,
  HelpCircle,
  Brain,
  Clock,
  PartyPopper,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface UretTabProps {
  currentLanguage: TargetLanguage;
  prompts: ProductionPrompt[];
  learningItems: LearningItem[];
  fossilizedErrors: FossilizedError[];
  seenPromptIds: string[];
  onPromptShown: (promptId: string) => void;
  onRecordAttempt: (attempt: ProductionAttempt) => void;
  onAddLearningItem?: (item: LearningItem) => void;
  onImportPrompts: (prompts: ProductionPrompt[]) => void;
}

export const UretTab: React.FC<UretTabProps> = ({
  currentLanguage,
  prompts,
  learningItems,
  fossilizedErrors,
  seenPromptIds,
  onPromptShown,
  onRecordAttempt,
  onAddLearningItem,
  onImportPrompts,
}) => {
  const [selectedDomain, setSelectedDomain] = useState<Domain | 'all'>('all');
  const [selectedIntensity, setSelectedIntensity] = useState<IntensityLevel | 'all'>('all');
  const [currentPrompt, setCurrentPrompt] = useState<ProductionPrompt | null>(null);
  const [selectionState, setSelectionState] = useState<SelectPromptResult | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiGenerationStatus, setAiGenerationStatus] = useState<string | null>(null);

  // "Otomatik Seviye Ayarlı" (selectedIntensity === 'all') resolves to a
  // concrete level derived from real production evidence for this language —
  // new learners start at beginner/A1 instead of seeing unfiltered content
  // (which could include advanced/IELTS prompts on their very first card).
  const cefrEstimate = useMemo(() => estimateCefrLevel(learningItems, currentLanguage), [learningItems, currentLanguage]);
  const autoIntensity = cefrToIntensity(cefrEstimate.level ?? DEFAULT_CEFR_LEVEL);
  const effectiveIntensity: IntensityLevel = selectedIntensity === 'all' ? autoIntensity : selectedIntensity;

  // Interactive Dictionary Modal state
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [contextSentence, setContextSentence] = useState<string>('');

  // Practice state
  const [userAnswer, setUserAnswer] = useState('');
  const [confidence, setConfidence] = useState<ConfidenceLevel>('certain');
  const [activeHintLevel, setActiveHintLevel] = useState<number>(0);
  const [showHints, setShowHints] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<AIEvaluationResult | null>(null);
  const [finalRatingInfo, setFinalRatingInfo] = useState<{ rating: FSRSRating; isFossilized: boolean; reasonTr: string } | null>(null);

  // Self-correction state
  const [correctionInput, setCorrectionInput] = useState('');
  const [correctionSuccess, setCorrectionSuccess] = useState(false);

  // New Feature Modals state
  const [showGrammarModal, setShowGrammarModal] = useState(false);
  const [showPronunciationModal, setShowPronunciationModal] = useState(false);
  const [showMnemonicModal, setShowMnemonicModal] = useState(false);

  // Total prompts available for the current language/domain/intensity filter (for the "Kart X / Y" counter).
  const availablePrompts = prompts.filter(
    (p) =>
      p.language === currentLanguage &&
      (selectedDomain === 'all' || p.domain === selectedDomain) &&
      (selectedIntensity === 'all' || !p.intensityLevel || p.intensityLevel === selectedIntensity)
  );
  const seenCountInFilter = availablePrompts.filter((p) => seenPromptIds.includes(p.id)).length;

  // "Otomatik" (selectedIntensity === 'all') never removes content — it only
  // soft-prefers the learner's current auto-detected level so an easier
  // sentence is picked first when one is available, without ever narrowing
  // the pool enough to get the learner stuck (see preferredIntensity below).
  const preferredIntensity = selectedIntensity === 'all' ? autoIntensity : undefined;

  // Latest selection inputs kept in a ref so the mount/filter-change effect
  // below can read fresh values without re-running every time `prompts` or
  // `learningItems` gets a new array reference from unrelated app state
  // changes (that used to yank the user onto a different sentence mid-typing).
  const selectionInputsRef = useRef({ prompts, learningItems, seenPromptIds, currentLanguage, selectedDomain, selectedIntensity, preferredIntensity, onPromptShown });
  selectionInputsRef.current = { prompts, learningItems, seenPromptIds, currentLanguage, selectedDomain, selectedIntensity, preferredIntensity, onPromptShown };

  const pickNext = () => {
    const inputs = selectionInputsRef.current;
    const result = selectNextPrompt({
      prompts: inputs.prompts,
      language: inputs.currentLanguage,
      domain: inputs.selectedDomain,
      intensity: inputs.selectedIntensity,
      preferredIntensity: inputs.preferredIntensity,
      seenPromptIds: inputs.seenPromptIds,
      learningItems: inputs.learningItems,
    });
    setSelectionState(result);
    setCurrentPrompt(result.status === 'ok' ? result.prompt : null);
    setUserAnswer('');
    setActiveHintLevel(0);
    setEvaluation(null);
    setFinalRatingInfo(null);
    setCorrectionInput('');
    setCorrectionSuccess(false);
    if (result.status === 'ok') inputs.onPromptShown(result.prompt.id);
  };

  useEffect(() => {
    pickNext();
  }, [currentLanguage, selectedDomain, selectedIntensity]);

  // Speech Recognition (Web Speech API)
  const toggleSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Tarayıcınız ses kaydı özelliğini desteklemiyor. Metin kutusunu kullanabilirsiniz.');
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;

      const langMap: Record<TargetLanguage, string> = {
        en: 'en-US',
        de: 'de-DE',
        sr: 'sr-RS',
      };
      recognition.lang = langMap[currentLanguage];

      recognition.onstart = () => setIsRecording(true);
      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result) => result.transcript)
          .join('');
        setUserAnswer(transcript);
      };
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);

      recognition.start();
    } catch (err) {
      console.error(err);
      setIsRecording(false);
    }
  };

  // TTS Speech Synthesis
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const langMap: Record<TargetLanguage, string> = {
        en: 'en-US',
        de: 'de-DE',
        sr: 'sr-RS',
      };
      utterance.lang = langMap[currentLanguage];
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleRevealNextHint = () => {
    if (activeHintLevel < 6) {
      setActiveHintLevel((prev) => prev + 1);
    }
  };

  const handleSubmit = async () => {
    if (!userAnswer.trim() || !currentPrompt) return;

    setIsEvaluating(true);
    const startTime = Date.now();

    // 1. Get AI Evaluation (via backend or fallback)
    const evalResult = await evaluateProduction({
      language: currentLanguage,
      turkishPrompt: currentPrompt.turkishSentence,
      targetReference: currentPrompt.targetReference,
      userAnswer: userAnswer.trim(),
      hintsUsedCount: activeHintLevel,
      intensityLevel: selectedIntensity === 'all' ? (currentPrompt.intensityLevel || 'intermediate') : selectedIntensity,
    });

    const responseTimeMs = Date.now() - startTime;

    // 2. Pass to deterministic engine (decideFinalRating)
    const decision = decideFinalRating({
      aiResult: evalResult,
      maxHintLevelUsed: activeHintLevel,
      confidence,
      responseTimeMs,
    });

    setEvaluation(evalResult);
    setFinalRatingInfo({
      rating: decision.finalRating,
      isFossilized: decision.isFossilizedError,
      reasonTr: decision.reasonTr,
    });

    // 3. Record attempt
    onRecordAttempt({
      id: `attempt_${Date.now()}`,
      promptId: currentPrompt.id,
      language: currentLanguage,
      userAnswer: userAnswer.trim(),
      hintsUsedCount: activeHintLevel,
      maxHintLevel: activeHintLevel,
      confidence,
      responseTimeMs,
      evaluation: evalResult,
      finalRating: decision.finalRating,
      isFossilizedError: decision.isFossilizedError,
      createdAt: new Date().toISOString(),
    });

    setIsEvaluating(false);
  };

  const handleNextPrompt = () => {
    pickNext();
  };

  // On-demand, effectively unlimited sentence variety: instead of being
  // capped by the fixed prompt bank (INITIAL_PROMPTS), ask the AI for fresh
  // ones tailored to the learner's current level and recent mistakes, add
  // them to the pool, and jump straight to one. Available any time, not only
  // when the fixed pool runs out.
  const handleGenerateWithAi = async () => {
    setIsGeneratingAi(true);
    setAiGenerationStatus(null);
    try {
      const inputs = selectionInputsRef.current;
      const languagePrompts = inputs.prompts.filter((p) => p.language === inputs.currentLanguage);
      const avoidSentences = languagePrompts.map((p) => p.targetReference).slice(-40);
      const errorTopics = fossilizedErrors
        .filter((error) => error.language === currentLanguage && !error.resolved)
        .slice(0, 5)
        .map((error) => error.errorDescription)
        .filter(Boolean);

      const payload = await callLinguaApi<{ prompts?: unknown }>('/api/generate-production-prompts', {
        language: currentLanguage,
        domain: selectedDomain === 'all' ? undefined : selectedDomain,
        intensityLevel: effectiveIntensity,
        cefrLevel: cefrEstimate.level ?? DEFAULT_CEFR_LEVEL,
        errorTopics,
        avoidSentences,
        count: 6,
      });

      const generated = parseGeneratedPrompts(payload.prompts, {
        language: currentLanguage,
        fallbackDomain: selectedDomain === 'all' ? 'general' : selectedDomain,
        existingTargetTexts: avoidSentences,
      });

      if (generated.length === 0) {
        setAiGenerationStatus('AI yeni ve tekrar etmeyen bir cümle üretemedi. Lütfen tekrar deneyin.');
        return;
      }

      onImportPrompts(generated);
      const [firstNew] = generated;
      setSelectionState({ status: 'ok', prompt: firstNew });
      setCurrentPrompt(firstNew);
      setUserAnswer('');
      setActiveHintLevel(0);
      setEvaluation(null);
      setFinalRatingInfo(null);
      setCorrectionInput('');
      setCorrectionSuccess(false);
      onPromptShown(firstNew.id);
      setAiGenerationStatus(`${generated.length} yeni AI cümlesi eklendi.`);
    } catch (error) {
      setAiGenerationStatus(
        `AI ile yeni cümle üretilemedi: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}.`,
      );
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleCheckCorrection = () => {
    if (!currentPrompt) return;
    const normCorrection = correctionInput.trim().toLowerCase().replace(/[.,!?:;]/g, '');
    const normTarget = currentPrompt.targetReference.trim().toLowerCase().replace(/[.,!?:;]/g, '');

    if (normCorrection === normTarget || normCorrection.length > normTarget.length * 0.8) {
      setCorrectionSuccess(true);
    } else {
      alert('Doğru cümleyle tam olarak eşleşmedi. Lütfen referans cümleyi tekrar inceleyip tam olarak yazın.');
    }
  };

  const handleWordClick = (word: string, context: string) => {
    setSelectedWord(word);
    setContextSentence(context);
  };

  const aiGenerateButton = (label: string) => (
    <div className="space-y-2">
      <button
        onClick={handleGenerateWithAi}
        disabled={isGeneratingAi}
        className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center space-x-2"
      >
        {isGeneratingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        <span>{label}</span>
      </button>
      {aiGenerationStatus && <p className="text-xs text-slate-500 max-w-md mx-auto">{aiGenerationStatus}</p>}
    </div>
  );

  if (!currentPrompt || !selectionState || selectionState.status !== 'ok') {
    if (selectionState?.status === 'awaiting_schedule') {
      const dueDate = new Date(selectionState.nextDueAt);
      return (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-4">
          <Clock className="w-12 h-12 text-sky-500 mx-auto" />
          <h3 className="text-xl font-bold text-slate-800">Bu Turdaki Cümleler Tamamlandı</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Bu filtredeki tüm cümleleri gördün. Kalanlar FSRS planlı tekrar sırasında; henüz tekrar zamanları gelmedi
            {dueDate && Number.isFinite(dueDate.getTime()) ? ` (sıradaki: ${dueDate.toLocaleString('tr-TR')})` : ''}.
            Sessizce aynı cümleyi tekrar göstermek yerine bu turu burada bitiriyoruz.
          </p>
          <p className="text-xs text-slate-400">Farklı bir alan veya yoğunluk seviyesi seçebilir, ya da AI'dan hemen yeni cümle isteyebilirsin.</p>
          {aiGenerateButton('AI ile Sınırsız Yeni Cümle Üret')}
        </div>
      );
    }

    if (selectionState?.status === 'pool_exhausted') {
      return (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-4">
          <PartyPopper className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="text-xl font-bold text-slate-800">Bu Oturumdaki Tüm Cümleleri Tamamladın</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Seçili alan/yoğunlukta bu oturumda gösterilecek başka cümle kalmadı; aynı cümle sessizce tekrar
            gösterilmeyecek. Farklı bir alan seçebilir, oturumu bitirebilir veya AI'dan hemen yeni cümle isteyebilirsin.
          </p>
          {aiGenerateButton('AI ile Sınırsız Yeni Cümle Üret')}
        </div>
      );
    }

    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-4">
        <Sparkles className="w-12 h-12 text-sky-500 mx-auto" />
        <h3 className="text-xl font-bold text-slate-800">Bu Alan ve Dilde Cümle Bulunmadı</h3>
        <p className="text-sm text-slate-500">
          Lütfen diğer alanları seçin, LingQ senkronizasyonu ile yeni cümle ekleyin veya AI'dan cümle iste.
        </p>
        {aiGenerateButton('AI ile Cümle Üret')}
      </div>
    );
  }

  const domainLabels: Record<Domain | 'all', string> = {
    all: 'Tüm Alanlar',
    general: 'Gündelik Yaşam',
    travel: 'Seyahat',
    social: 'Sosyal Sohbet',
    clinical: 'Klinik / Fizyoterapi',
    ielts: 'IELTS Hazırlığı',
    family: 'Aile Bağlamı',
  };

  // Language Learning Expert Coaching Strategy Guide
  const langCoachPedagogy: Record<TargetLanguage, { title: string; subtitle: string; advice: string; strategyBadge: string }> = {
    de: {
      title: '🎓 Almanca Dil Öğrenme Uzmanı Rehberi',
      subtitle: 'V2 Kuralı ve Yalın Üretim Stratejisi',
      strategyBadge: 'Öneri: Yalın, Bağlaçsız Cümleler',
      advice: 'Almanca öğreniminde başlangıç seviyesinde "weil / wenn / dass" gibi karmaşık yan cümleler kurmaya çalışmak zihinsel yükü artırır. Dil uzmanı tavsiyemiz: Önce fiilin 2. sırada olduğu (V2 kuralı) kısa, yalın ve günlük cümlelere odaklanın (Örn: "Ich möchte bitte einen Kaffee.", "Kann ich bitte bestellen?"). Yan cümle yapısı bu temelin üzerine inşa edilecektir.'
    },
    sr: {
      title: '🎓 Sırpça Dil Öğrenme Uzmanı Rehberi',
      subtitle: 'Yalın Diyalog ve Doğal Akıcılık Stratejisi',
      strategyBadge: 'Öneri: Yalın & Tek Yargılı Cümleler',
      advice: 'Sırpça öğreniminde başlangıç seviyesinde "da, jer, ako" gibi bağlaçlarla cümleleri uzatmaya çalışmak acemilik dönemini zorlaştırır. Uzman koç tavsiyemiz: Tek yargılı, bağlaçsız ve dolaysız gündelik cümlelerle başlayın (Örn: "Zdravo, ja sam...", "Molim vas, jednu kafu..."). Nesne durumundaki Akuzativ (-u) eki ve "sam/ste" yardımcı fiillerini oturtmak birinci hedefinizdir.'
    },
    en: {
      title: '🎓 İngilizce Dil Öğrenme Uzmanı Rehberi',
      subtitle: 'SVO Şablonu ve Doğal Nezaket Kalıpları',
      strategyBadge: 'Öneri: Özgüvenli & Doğrudan Üretim',
      advice: 'İngilizce öğreniminde özgüvenli ve akıcı üretim için Özne + Fiil + Nesne (SVO) temel diziliminden ayrılmayın. Günlük hayatta ve klinik/sosyal iletişimde kibar rica kalıplarını ("Could I please...", "I would like to...") doğrudan kullanarak konuşma hızınızı katlayın.'
    }
  };

  const currentCoachGuide = langCoachPedagogy[currentLanguage] || langCoachPedagogy.en;

  // Helper to split text into tap-friendly interactive tokens
  const renderInteractiveWords = (text: string) => {
    const tokens = text.split(/(\s+)/);
    return tokens.map((token, i) => {
      const clean = token.trim();
      if (!clean) return <span key={i}>{token}</span>;
      return (
        <button
          key={i}
          type="button"
          onClick={() => handleWordClick(clean, text)}
          className="inline-block hover:bg-sky-100 hover:text-sky-900 rounded px-1 underline decoration-sky-300 decoration-dotted cursor-pointer transition-colors"
          title="Sözlükte Gör / LingQ Olarak Ekle"
        >
          {token}
        </button>
      );
    });
  };

  return (
    <div 
      className="max-w-4xl mx-auto space-y-6"
      data-active-context-type="uret"
      data-turkish-prompt={currentPrompt?.turkishSentence || ''}
      data-target-reference={currentPrompt?.targetReference || ''}
      data-user-answer={userAnswer}
      data-evaluation-verdict={evaluation?.overallVerdict || ''}
      data-evaluation-notes={evaluation?.errors?.map(e => `${e.userPart || ''} -> ${e.suggestion || ''}: ${e.message}`).join(' | ') || ''}
    >
      {/* Interactive Word Dictionary Popover Modal */}
      {selectedWord && (
        <InteractiveWordDictionary
          word={selectedWord}
          contextSentence={contextSentence}
          language={currentLanguage}
          isOpen={Boolean(selectedWord)}
          onClose={() => setSelectedWord(null)}
          onAddLearningItem={(item) => {
            if (onAddLearningItem) onAddLearningItem(item);
          }}
        />
      )}

      {/* Top Controls: Domain & Intensity Level Selectors */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        {/* Domain Selector */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pratik Alanı:</span>
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'general', 'travel', 'social', 'clinical', 'ielts', 'family'] as (Domain | 'all')[]).map((dom) => (
                <button
                  key={dom}
                  onClick={() => setSelectedDomain(dom)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    selectedDomain === dom
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {domainLabels[dom]}
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs text-slate-500 font-mono">
            Kart: {Math.min(seenCountInFilter, availablePrompts.length)} / {availablePrompts.length}
          </div>
        </div>

        {/* Intensity Level Selector */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider">
              <Gauge className="w-4 h-4 text-sky-600" />
              <span>Yoğunluk Seviyesi:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'beginner', 'intermediate', 'advanced'] as (IntensityLevel | 'all')[]).map((lvl) => {
                const isSelected = selectedIntensity === lvl;
                return (
                  <button
                    key={lvl}
                    onClick={() => setSelectedIntensity(lvl)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center space-x-1 ${
                      isSelected
                        ? lvl === 'beginner'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : lvl === 'intermediate'
                          ? 'bg-sky-600 text-white shadow-xs'
                          : lvl === 'advanced'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-slate-800 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>
                      {lvl === 'all'
                        ? 'Tümü'
                        : lvl === 'beginner'
                        ? 'Başlangıç'
                        : lvl === 'intermediate'
                        ? 'Orta'
                        : 'İleri'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Intensity Mode Info */}
          <div className="text-[11px] font-medium text-slate-500 flex items-center space-x-1 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>
              AI Değerlendirme: {' '}
              <strong className="text-slate-800">
                {selectedIntensity === 'beginner'
                  ? 'Başlangıç (Esnek & Teşvik Edici)'
                  : selectedIntensity === 'advanced'
                  ? 'İleri (Titiz Üslup & Klinik Hassasiyet)'
                  : selectedIntensity === 'intermediate'
                  ? 'Orta (Dengeli Gramer & Yapı)'
                  : `Otomatik Seviye Ayarlı (Şu an: ${cefrEstimate.level ?? DEFAULT_CEFR_LEVEL} · ${
                      autoIntensity === 'beginner' ? 'Başlangıç' : autoIntensity === 'intermediate' ? 'Orta' : 'İleri'
                    })`}
              </strong>
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <button
            onClick={handleGenerateWithAi}
            disabled={isGeneratingAi}
            className="px-3.5 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center space-x-2"
            title="İstediğin an, tekrar etmeyen yeni bir cümle üretir"
          >
            {isGeneratingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>AI ile Sınırsız Yeni Cümle Üret</span>
          </button>
          {aiGenerationStatus && <p className="text-xs text-slate-500">{aiGenerationStatus}</p>}
        </div>
      </div>

      {/* Language Learning Expert Pedagogical Guidance Banner */}
      <div className="bg-gradient-to-r from-sky-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-5 shadow-lg space-y-3 relative overflow-hidden border border-sky-800">
        <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
          <Brain className="w-40 h-40 text-white" />
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-sky-800/80 pb-3 relative z-10">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-500 text-slate-950 rounded-2xl shadow-xs flex items-center justify-center font-black">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-2">
                {currentCoachGuide.title}
              </h3>
              <p className="text-xs text-sky-200 font-medium">{currentCoachGuide.subtitle}</p>
            </div>
          </div>

          <span className="px-3 py-1 bg-amber-400 text-slate-950 font-black text-xs rounded-full shadow-xs border border-amber-300">
            {currentCoachGuide.strategyBadge}
          </span>
        </div>

        <p className="text-xs sm:text-sm text-sky-100 leading-relaxed font-medium relative z-10 bg-white/10 p-3.5 rounded-2xl backdrop-blur-xs border border-white/10">
          {currentCoachGuide.advice}
        </p>
      </div>

      {/* Main Prompt Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 space-y-6">
        {/* Prompt Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="px-2.5 py-1 text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200 rounded-md">
                {domainLabels[currentPrompt.domain]}
              </span>
              {currentPrompt.intensityLevel && (
                <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${
                  currentPrompt.intensityLevel === 'beginner'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : currentPrompt.intensityLevel === 'advanced'
                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                    : 'bg-sky-50 text-sky-700 border border-sky-200'
                }`}>
                  {currentPrompt.intensityLevel === 'beginner'
                    ? 'Başlangıç'
                    : currentPrompt.intensityLevel === 'advanced'
                    ? 'İleri'
                    : 'Orta'}
                </span>
              )}
              <span className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1">
                <BookOpen className="w-3.5 h-3.5 text-sky-600" />
                <span>Dokunulabilir Kelimeler Etkin</span>
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-2">
              Aşağıdaki Türkçe cümlenin hedef dildeki karşılığını kendin üret (Bilinmeyen kelimelerin üzerine basarak LingQ sözlüğüne bakabilirsin):
            </p>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 leading-snug">
              "{renderInteractiveWords(currentPrompt.turkishSentence)}"
            </h3>
          </div>

          <button
            onClick={handleNextPrompt}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium flex items-center space-x-1 shrink-0"
            title="Sonraki Karta Geç"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Sonraki Kart</span>
          </button>
        </div>

        {/* Key terms chips */}
        {currentPrompt.keyTerms && currentPrompt.keyTerms.length > 0 && (
          <div className="flex items-center space-x-2 flex-wrap gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Önemli Kalıplar:</span>
            {currentPrompt.keyTerms.map((term, i) => (
              <button
                key={i}
                onClick={() => handleWordClick(term, currentPrompt.turkishSentence)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-sky-50 text-slate-800 hover:text-sky-900 border border-slate-200 rounded-lg text-xs font-medium transition-colors"
              >
                {term}
              </button>
            ))}
          </div>
        )}

        {/* Graduated Hint Ladder Section (collapsible toggle) */}
        {!showHints ? (
          <button
            type="button"
            onClick={() => setShowHints(true)}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs font-bold text-amber-900 dark:bg-amber-950/40 dark:border-amber-800/60 dark:text-amber-200 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4" />
              İpucu Al {activeHintLevel > 0 ? `(Aşama ${activeHintLevel}/6 açık)` : ''}
            </span>
            <ChevronDown className="w-4 h-4" />
          </button>
        ) : (
        <div className="bg-gradient-to-br from-amber-50/60 via-slate-50 to-indigo-50/40 rounded-2xl p-4 sm:p-5 border-2 border-amber-300/80 dark:border-amber-700/60 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-amber-200/80">
            <div className="flex items-center space-x-2">
              <div className={`p-1.5 rounded-xl ${activeHintLevel > 0 ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                <Lightbulb className="w-4 h-4 fill-current" />
              </div>
              <div>
                <span className="text-xs font-black text-slate-900 block">
                  🎓 Adım Adım Dil Koçu İpucu Rehberi (Aşama {activeHintLevel}/6)
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  Takıldığınız an pes etmeden, adım adım cümleyi kurmanıza destek olur
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowHints(false)}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-700 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 flex items-center space-x-1 cursor-pointer"
                title="İpucu panelini küçült"
              >
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Küçült</span>
              </button>
              {activeHintLevel < 6 && (
                <button
                  type="button"
                  onClick={handleRevealNextHint}
                  className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-black rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>+ Seviye {activeHintLevel + 1} İpucu Aç</span>
                </button>
              )}
            </div>
          </div>

          {activeHintLevel === 0 && (
            <div className="bg-white/80 p-3 rounded-xl border border-amber-200/60 text-xs text-slate-600 flex items-center space-x-2">
              <Brain className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Henüz ipucu istemediniz. Kendinize güvenin! Zorlanırsanız yukarıdaki <strong>"+ İpucu Aç"</strong> butonuna basarak adım adım kelime ve gramer desteği alabilirsiniz.
              </span>
            </div>
          )}

          {/* Render Active Revealed Hints */}
          <div className="space-y-2.5">
            {/* Level 1: Grammar Pattern & Sentence Logic */}
            {activeHintLevel >= 1 && (
              <div className="text-xs bg-white p-3 rounded-xl border border-sky-200 shadow-2xs space-y-1">
                <div className="flex items-center space-x-1.5 text-sky-900 font-black">
                  <BookOpen className="w-3.5 h-3.5 text-sky-600" />
                  <span>1. Cümle İskeleti & Gramer Mantığı:</span>
                </div>
                <div className="text-slate-800 font-semibold pl-5">
                  {currentPrompt.grammarPattern || currentPrompt.hintLadder.partOfSpeech}
                </div>
                <div className="text-[11px] text-slate-500 pl-5 italic">
                  💡 İpucu: Önce ana özneyi ve eylemi (fiili) hedef dilin söz dizimi kuralına göre zihninizde konumlandırın.
                </div>
              </div>
            )}

            {/* Level 2: Key Vocabulary with Meanings */}
            {activeHintLevel >= 2 && (
              <div className="text-xs bg-white p-3 rounded-xl border border-emerald-200 shadow-2xs space-y-1.5">
                <div className="flex items-center space-x-1.5 text-emerald-900 font-black">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>2. Kilit Kelimeler Kadrosu (Sözlük Desteği):</span>
                </div>
                <div className="pl-5">
                  <VocabularyTooltip
                    text={currentPrompt.keyTerms ? currentPrompt.keyTerms.join(' • ') : currentPrompt.hintLadder.keyWordsGiven}
                    language={currentLanguage}
                  />
                </div>
                <div className="text-[11px] text-slate-500 pl-5">
                  👆 Kelimelere tıklayın: anlamı hedef dilde (İngilizce/Almanca/Sırpça) gösterilir.
                </div>
              </div>
            )}

            {/* Level 3: How to Start the Sentence */}
            {activeHintLevel >= 3 && (
              <div className="text-xs bg-white p-3 rounded-xl border border-indigo-200 shadow-2xs space-y-1">
                <div className="flex items-center space-x-1.5 text-indigo-900 font-black">
                  <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
                  <span>3. Cümle Giriş Kalıbı (Başlangıç Desteği):</span>
                </div>
                <div className="text-indigo-950 font-bold pl-5 text-sm bg-indigo-50/60 p-2 rounded-lg border border-indigo-100 inline-block">
                  "{currentPrompt.targetReference.trim().split(/\s+/).slice(0, Math.min(3, currentPrompt.targetReference.trim().split(/\s+/).length)).join(' ')}..."
                </div>
                <div className="text-[11px] text-slate-500 pl-5">
                  Cümlenizin ilk kelimeleri hazır! Geri kalanı bu başlangıcın üzerine inşa edin.
                </div>
              </div>
            )}

            {/* Level 4: Functional Template / Pattern */}
            {activeHintLevel >= 4 && (
              <div className="text-xs bg-white p-3 rounded-xl border border-purple-200 shadow-2xs space-y-1">
                <div className="flex items-center space-x-1.5 text-purple-900 font-black">
                  <Zap className="w-3.5 h-3.5 text-purple-600" />
                  <span>4. Kullanıma Hazır Cümle Şablonu:</span>
                </div>
                <div className="text-purple-950 font-semibold pl-5">
                  {currentPrompt.hintLadder.patternHint}
                </div>
              </div>
            )}

            {/* Level 5: Fill in the Blank Sentence */}
            {activeHintLevel >= 5 && (
              <div className="text-xs bg-amber-50 p-3 rounded-xl border border-amber-300 shadow-2xs space-y-1">
                <div className="flex items-center space-x-1.5 text-amber-950 font-black">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>5. Eksik Kelimeli Cümle İskeleti (Çözüme Çok Yakın!):</span>
                </div>
                <div className="text-amber-950 font-bold text-sm pl-5 bg-white p-2 rounded-lg border border-amber-200">
                  {(() => {
                    const words = currentPrompt.targetReference.trim().split(/\s+/);
                    if (words.length <= 3) return `${words[0]} [ _____ ]`;
                    const copy = [...words];
                    const blankIdx = Math.floor(words.length * 0.6);
                    copy[blankIdx] = '[ _____ ]';
                    return copy.join(' ');
                  })()}
                </div>
                <div className="text-[11px] text-amber-800 pl-5">
                  Cümle neredeyse tamam! Sadece boşluğu tamamlayıp kutucuğa yazın.
                </div>
              </div>
            )}

            {/* Level 6: Complete Reference Answer */}
            {activeHintLevel >= 6 && (
              <div className="text-xs bg-emerald-50 p-3.5 rounded-xl border-2 border-emerald-300 text-emerald-950 font-bold space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center space-x-1.5 text-emerald-900 font-black">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>6. Tam Referans Cümle (Çözüm):</span>
                  </span>

                  <button
                    onClick={() => speakText(currentPrompt.targetReference)}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] flex items-center space-x-1 transition-colors cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Dinle</span>
                  </button>
                </div>

                <div className="text-sm sm:text-base font-black text-slate-900 bg-white p-2.5 rounded-lg border border-emerald-200">
                  {currentPrompt.targetReference}
                </div>
              </div>
            )}
          </div>
        </div>
        )}

        {/* User Answer Input & Voice Record */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700">Senin Cümlen ({currentLanguage.toUpperCase()}):</label>

            <button
              onClick={toggleSpeechRecognition}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                isRecording 
                  ? 'bg-rose-600 text-white animate-pulse' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-sky-600" />}
              <span>{isRecording ? 'Dinleniyor...' : 'Bas-Konuş (Sesle Üret)'}</span>
            </button>
          </div>

          <textarea
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            disabled={isEvaluating}
            placeholder="Cümleni buraya yaz veya mikrofonla söyle..."
            rows={3}
            className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-slate-900 font-medium text-sm sm:text-base resize-none transition-all"
          />

          {/* Confidence Level Radio Selector */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-slate-600">Cevabına Güvenin:</span>

            <div className="flex flex-wrap gap-2">
              {[
                { id: 'certain', label: 'Emin' },
                { id: 'partially_certain', label: 'Kısmen Emin' },
                { id: 'uncertain', label: 'Emin Değil' },
                { id: 'random', label: 'Rastgele' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setConfidence(c.id as ConfidenceLevel)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    confidence === c.id
                      ? 'bg-slate-900 text-white shadow-xs font-semibold'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Action Button */}
          <button
            onClick={handleSubmit}
            disabled={!userAnswer.trim() || isEvaluating}
            className="w-full py-3 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-200 text-white font-bold text-sm rounded-xl shadow-md transition-colors flex items-center justify-center space-x-2"
          >
            {isEvaluating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>AI Değerlendiriyor & FSRS Hesaplanıyor...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Cevabı Gönder & Otomatik Değerlendir</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* AI & Deterministic Evaluation Result Card */}
      {evaluation && finalRatingInfo && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 space-y-6 border-t-4 border-t-sky-600 animate-fadeIn">
          {/* Verdict Header */}
          <div className="flex items-start justify-between flex-wrap gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  evaluation.overallVerdict === 'correct' ? 'bg-emerald-100 text-emerald-800' :
                  evaluation.overallVerdict === 'natural_variant' ? 'bg-sky-100 text-sky-800' :
                  evaluation.overallVerdict === 'minor_issue' ? 'bg-amber-100 text-amber-800' :
                  'bg-rose-100 text-rose-800'
                }`}>
                  {evaluation.overallVerdict === 'correct' ? 'Kusursuz Üretim' :
                   evaluation.overallVerdict === 'natural_variant' ? 'Doğal Varyasyon' :
                   evaluation.overallVerdict === 'minor_issue' ? 'Küçük Hata / Nüans' : 'Yanlış / Kritik Sapma'}
                </span>

                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                  finalRatingInfo.rating === 'easy' ? 'bg-emerald-600 text-white' :
                  finalRatingInfo.rating === 'good' ? 'bg-sky-600 text-white' :
                  finalRatingInfo.rating === 'hard' ? 'bg-amber-600 text-white' : 'bg-rose-600 text-white'
                }`}>
                  FSRS: {finalRatingInfo.rating.toUpperCase()}
                </span>
              </div>

              <p className="text-xs text-slate-500 mt-2 font-medium">
                {finalRatingInfo.reasonTr}
              </p>
            </div>

            <div className="flex items-center flex-wrap gap-2">
              <button
                onClick={() => speakText(currentPrompt.targetReference)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors"
              >
                <Volume2 className="w-4 h-4 text-sky-600" />
                <span>Dinle</span>
              </button>

              <button
                onClick={() => setShowPronunciationModal(true)}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-lg flex items-center space-x-1.5 transition-colors"
              >
                <Mic className="w-4 h-4 text-emerald-600" />
                <span>Gölgeleme & Telaffuz Testi</span>
              </button>

              <button
                onClick={() => setShowGrammarModal(true)}
                className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold rounded-lg flex items-center space-x-1.5 transition-colors"
              >
                <HelpCircle className="w-4 h-4 text-purple-600" />
                <span>Neden Yanlış? Gramer Analizi</span>
              </button>

              <button
                onClick={() => setShowMnemonicModal(true)}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-bold rounded-lg flex items-center space-x-1.5 transition-colors"
              >
                <Brain className="w-4 h-4 text-indigo-600" />
                <span>Collocation & Kanca</span>
              </button>
            </div>
          </div>

          {/* Fossilized Error Alert Banner if High Confidence + Critical Error */}
          {finalRatingInfo.isFossilized && (
            <div className="bg-rose-50 border-2 border-rose-300 p-4 rounded-xl flex items-start space-x-3">
              <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-rose-900 text-sm">Öğrenilmiş Yanlış (Fossilized Error) Tespiti!</h4>
                <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
                  Bu soruda <strong>Emin</strong> olduğunu belirttin ancak cevabın kritik bir hata içeriyor. Sistem bu kartı öncelikli düzeltme listesine ekledi ve FSRS zorluk derecesini güncelledi.
                </p>
              </div>
            </div>
          )}

          {/* Reference vs User Answer comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Senin Cümlen:</span>
              <p className="text-slate-900 font-medium text-sm">{userAnswer}</p>
            </div>

            <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block mb-1">Referans Doğru Cümle (Kelimelere Basabilirsin):</span>
              <p className="text-emerald-950 font-bold text-sm leading-relaxed">
                {renderInteractiveWords(currentPrompt.targetReference)}
              </p>
            </div>
          </div>

          {/* AI Feedback & Errors List */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Brain className="w-4 h-4 text-sky-600" />
              <h4 className="text-sm font-black text-slate-900">
                🎓 Uzman Dil Eğitmeni Raporu & Nazik Rehberlik
              </h4>
            </div>

            <p className="text-xs sm:text-sm text-slate-800 bg-sky-50/60 p-3.5 rounded-2xl border border-sky-200/80 leading-relaxed font-semibold">
              {evaluation.explanationTr}
            </p>

            {evaluation.errors.length > 0 && (
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider block">
                  💡 Öğretici Düzeltme & Yapıcı İpuçları:
                </span>
                {evaluation.errors.map((err, idx) => (
                  <div key={idx} className="bg-amber-50/90 border border-amber-200 p-3.5 rounded-2xl text-xs space-y-1 shadow-2xs">
                    <div className="font-black text-amber-950 flex items-center justify-between">
                      <span className="capitalize text-[11px] bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded-md font-bold">
                        Gelişim Alanı: {err.category === 'word_order' ? 'Kelime Sırası' : err.category === 'grammar' ? 'Dilbilgisi / Ek' : err.category === 'vocabulary' ? 'Kelime Seçimi' : err.category === 'spelling' ? 'Yazım' : 'Üslup'}
                      </span>
                      <span className="text-[10px] text-amber-800 font-semibold">Nazik Öğretici Düzeltme</span>
                    </div>
                    <p className="text-slate-800 font-medium pt-1 leading-relaxed">{err.message}</p>
                    {err.suggestion && (
                      <div className="text-amber-950 font-bold text-xs mt-1 bg-white/80 p-2 rounded-xl border border-amber-200/60">
                        ✨ Tavsiye Edilen Yalın İfade: <span className="text-indigo-900 font-extrabold">{err.suggestion}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Natural Alternatives */}
          {evaluation.naturalAlternatives && evaluation.naturalAlternatives.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Doğal & Akıcı Alternatifler:</h4>
              <ul className="space-y-1.5">
                {evaluation.naturalAlternatives.map((alt, i) => (
                  <li key={i} className="text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-slate-800 flex items-center justify-between">
                    <span>
                      • <VocabularyTooltip text={alt} language={currentLanguage} onAddLearningItem={onAddLearningItem} />
                    </span>
                    <button
                      onClick={() => speakText(alt)}
                      className="p-1 text-slate-400 hover:text-sky-600"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Self-Correction Rewrite Requirement (If answer was not perfect) */}
          {evaluation.overallVerdict !== 'correct' && (
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 space-y-3">
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-4 h-4 text-amber-700" />
                <h4 className="font-bold text-amber-900 text-xs">Yeniden Üretim Zorunluluğu (Doğru Cümleyi Yaz)</h4>
              </div>
              <p className="text-xs text-amber-800">
                "Üretim, tanıma değildir" ilkesi gereğince doğru cümleyi buraya bakarak yazıp onaylayın:
              </p>

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={correctionInput}
                  onChange={(e) => setCorrectionInput(e.target.value)}
                  placeholder="Referans cümleyi buraya yeniden yaz..."
                  className="flex-1 p-2.5 bg-white border border-amber-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500"
                />
                <button
                  onClick={handleCheckCorrection}
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-xs"
                >
                  Onayla
                </button>
              </div>

              {correctionSuccess && (
                <div className="text-xs font-bold text-emerald-700 flex items-center space-x-1">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Harika! Yeniden üretimi tamamladın.</span>
                </div>
              )}
            </div>
          )}

          {/* Next Card Button */}
          <button
            onClick={handleNextPrompt}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-colors flex items-center justify-center space-x-2"
          >
            <span>Sonraki Karta Geç</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Grammar Deep-Dive Modal */}
      {evaluation && (
        <GrammarDeepDiveModal
          isOpen={showGrammarModal}
          onClose={() => setShowGrammarModal(false)}
          prompt={currentPrompt}
          evaluation={evaluation}
          userAnswer={userAnswer}
          language={currentLanguage}
        />
      )}

      {/* Shadowing & Pronunciation Modal */}
      <PronunciationAnalyzerModal
        isOpen={showPronunciationModal}
        onClose={() => setShowPronunciationModal(false)}
        targetSentence={currentPrompt.targetReference}
        language={currentLanguage}
      />

      {/* Context Mnemonic & Collocation Modal */}
      <ContextMnemonicModal
        isOpen={showMnemonicModal}
        onClose={() => setShowMnemonicModal(false)}
        wordOrPhrase={currentPrompt.keyTerms?.[0] || currentPrompt.grammarPattern || currentPrompt.targetReference.split(' ')[0]}
        language={currentLanguage}
        contextSentence={currentPrompt.targetReference}
      />
    </div>
  );
};
