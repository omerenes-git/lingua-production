import React, { useEffect, useMemo, useState } from 'react';
import { ErrorCategory, FossilizedError, LearningItem, TargetLanguage } from '../../types';
import { callLinguaApi } from '../../lib/linguaApi';
import { VocabularyTooltip } from '../VocabularyTooltip';
import {
  AlertTriangle,
  BookOpen,
  Brain,
  CheckCircle2,
  Flame,
  Lightbulb,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';

interface GrammarDrill {
  id: string;
  grammarTopic: string;
  cefrLevel: string;
  turkishSentence: string;
  targetReference: string;
  targetVariants?: string[];
  grammarPattern: string;
  fossilizedErrorFocus: string;
  hintLadder?: {
    patternHint?: string;
    keyWordsGiven?: string;
    fullAnswer?: string;
  };
}

interface GrammarDrillsResponse {
  drills?: unknown[];
}

interface GrammarHint {
  levelTailoredHint: string;
  stepByStepSolution?: string[];
}

type GrammarVerdict = 'correct' | 'natural_variant' | 'minor_issue' | 'major_issue' | 'incorrect';

interface EvaluationResult {
  overallVerdict: GrammarVerdict;
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
      id: 'curated-en-a2-request',
      grammarTopic: 'Polite requests',
      cefrLevel: 'A2',
      turkishSentence: 'Lütfen bana yeni randevu saatini e-postayla gönderir misiniz?',
      targetReference: 'Could you please send me the new appointment time by email?',
      targetVariants: ['Can you email me the new appointment time, please?'],
      grammarPattern: 'Could you please + verb + object?',
      fossilizedErrorFocus: 'Kibar isteklerde yardımcı fiil ve kelime sırası.',
      hintLadder: {
        patternHint: 'Could you please + fiilin yalın hâli + nesne?',
        keyWordsGiven: 'could / please / send / appointment time / by email',
        fullAnswer: 'Could you please send me the new appointment time by email?',
      },
    },
    {
      id: 'curated-en-b1-condition',
      grammarTopic: 'If clause + imperative',
      cefrLevel: 'B1',
      turkishSentence: 'Egzersiz sırasında ağrı artarsa hareketi durdurun.',
      targetReference: 'If the pain increases during exercise, stop the movement.',
      targetVariants: ['Stop the movement if the pain increases during exercise.'],
      grammarPattern: 'If + present simple, imperative',
      fossilizedErrorFocus: 'Şart cümlesi ile emir cümlesinin doğru dizilimi.',
      hintLadder: {
        patternHint: 'If + özne + geniş zaman, emir fiili + nesne.',
        keyWordsGiven: 'if / pain / increase / during exercise / stop',
        fullAnswer: 'If the pain increases during exercise, stop the movement.',
      },
    },
  ],
  de: [
    {
      id: 'curated-de-a1-order',
      grammarTopic: 'Sipariş ve Akkusativ',
      cefrLevel: 'A1',
      turkishSentence: 'Bir kahve ve bir şişe su istiyorum.',
      targetReference: 'Ich möchte einen Kaffee und eine Flasche Wasser.',
      targetVariants: ['Ich hätte gern einen Kaffee und eine Flasche Wasser.'],
      grammarPattern: 'Ich möchte + Akkusativ',
      fossilizedErrorFocus: 'Eril isimlerde Akkusativ artikel kullanımı.',
      hintLadder: {
        patternHint: 'Ich möchte + einen/eine + isim.',
        keyWordsGiven: 'möchte / einen Kaffee / eine Flasche Wasser',
        fullAnswer: 'Ich möchte einen Kaffee und eine Flasche Wasser.',
      },
    },
    {
      id: 'curated-de-b1-wenn',
      grammarTopic: 'Wenn yan cümlesi',
      cefrLevel: 'B1',
      turkishSentence: 'Zamanım olduğunda seni arayacağım.',
      targetReference: 'Wenn ich Zeit habe, rufe ich dich an.',
      targetVariants: ['Ich rufe dich an, wenn ich Zeit habe.'],
      grammarPattern: 'Wenn + özne + ... + fiil, ana cümle',
      fossilizedErrorFocus: 'Yan cümlede çekimli fiilin sona gitmesi.',
      hintLadder: {
        patternHint: 'Wenn cümlesinde çekimli fiil sona gelir.',
        keyWordsGiven: 'wenn / Zeit haben / anrufen',
        fullAnswer: 'Wenn ich Zeit habe, rufe ich dich an.',
      },
    },
  ],
  sr: [
    {
      id: 'curated-sr-a1-order',
      grammarTopic: 'Sipariş ve Akuzativ',
      cefrLevel: 'A1',
      turkishSentence: 'Lütfen bir kahve ve bir su.',
      targetReference: 'Molim vas, jednu kafu i jednu vodu.',
      targetVariants: ['Jednu kafu i jednu vodu, molim vas.'],
      grammarPattern: 'Molim vas + Akuzativ',
      fossilizedErrorFocus: 'Kafa ve voda isimlerinin nesne hâli.',
      hintLadder: {
        patternHint: 'jedna kafa → jednu kafu; jedna voda → jednu vodu',
        keyWordsGiven: 'molim vas / jednu kafu / jednu vodu',
        fullAnswer: 'Molim vas, jednu kafu i jednu vodu.',
      },
    },
    {
      id: 'curated-sr-a2-meeting',
      grammarTopic: 'Gelecek zaman',
      cefrLevel: 'A2',
      turkishSentence: 'Yarın saat üçte buluşacağız.',
      targetReference: 'Sastaćemo se sutra u tri sata.',
      targetVariants: ['Sutra ćemo se sastati u tri sata.'],
      grammarPattern: 'Futur I + povratna zamenica',
      fossilizedErrorFocus: 'Gelecek zaman ve se zamirinin konumu.',
      hintLadder: {
        patternHint: 'sastaćemo se + zaman ifadesi',
        keyWordsGiven: 'sastaćemo se / sutra / u tri sata',
        fullAnswer: 'Sastaćemo se sutra u tri sata.',
      },
    },
  ],
};

const normalize = (value: string) =>
  value
    .toLocaleLowerCase()
    .normalize('NFKC')
    .replace(/[.,!?;:'"()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

// --- Kişisel Gramer Koçu: kategori bazlı 2-3 dakikalık mini dersler ---
const CATEGORY_LESSONS: Record<ErrorCategory, { label: string; emoji: string; summary: string; steps: string[]; tip: string }> = {
  grammar: {
    label: 'Dilbilgisi & Ekler',
    emoji: '📘',
    summary: 'Hedef dilin çekim ekleri ve gramer kalıpları Türkçeden farklı işler.',
    steps: [
      'Cümleyi kurarken önce "hangi zaman/kip" olduğuna karar ver: geçmiş, şimdiki, gelecek...',
      'Fiili özneye göre çekimle: İngilizcede I go / he goes, Almancada ich habe / er hat, Sırpçada ja imam / on ima.',
      'Ekleri Türkçedeki karşılıklarıyla birebir eşleştirmeye çalışma; kalıbı bir bütün olarak ezberle.',
    ],
    tip: 'Yanlış yaptığın cümleyi yüksek sesle oku. Kulağa "garip" geliyorsa büyük ihtimalle ek veya kip hatasıdır.',
  },
  word_order: {
    label: 'Kelime Sırası',
    emoji: '🔀',
    summary: 'Türkçe özne-nesne-fiil (SOV) düzenini kullanır; İngilizce ve Almanca özne-fiil-nesne (SVO), Sırpça esnek ama SVO temellidir.',
    steps: [
      'Temel düzeni hatırla: Özne + Fiil + Nesne (örn. "I drink coffee", "Ich trinke Kaffee").',
      'Almancada ana cümlede çekimli fiil daima 2. sıradadır; yan cümlede (wenn, dass...) fiil sona gider.',
      'Soru cümlelerinde fiil öznenin önüne geçer: "Do you like...?" / "Hast du...?".',
    ],
    tip: 'Cümleni kurduktan sonra kelimeleri özne-fiil-nesne sırasıyla gözden geçir.',
  },
  vocabulary: {
    label: 'Kelime Seçimi',
    emoji: '🗣️',
    summary: 'Anlam olarak yakın ama bağlama uymayan kelimeler seçiliyor.',
    steps: [
      'Türkçeden kelime kelime çevirme; hedef dilde o bağlamda hangi kelimenin doğal olduğunu düşün.',
      'Aynı Türkçe kelimenin hedef dilde birden çok karşılığı olabilir (örn. "yapmak": make/do).',
      'Bilmediğin kelime yerine bildiğin güvenli bir eş anlamlıyla cümleyi tamamla.',
    ],
    tip: 'Kelime seçiminde takılırsan o bağlamdaki doğal karşılığı sözlükte değil, örnek cümlelerde ara.',
  },
  spelling: {
    label: 'Yazım',
    emoji: '✍️',
    summary: 'Hedef dilin yazım kuralları ve aksan işaretleri atlanıyor.',
    steps: [
      'Uzun ve aksanlı harflere dikkat et (Almanca ä/ö/ü/ß, Sırpça č/ć/š/ž).',
      'Kelimeyi telaffuzuna göre değil, yazımına göre yaz; İngilizcede telaffuz-yazım farkı büyüktür.',
      'Büyük harf kurallarını kontrol et (Almancada tüm isimler büyük yazılır).',
    ],
    tip: 'Şüpheli harf varsa önce yazımı kontrol et, sonra gönder.',
  },
  style: {
    label: 'Üslup & Doğallık',
    emoji: '🎭',
    summary: 'Cümle gramer olarak doğru ama hedef dilde kulağa yapay geliyor.',
    steps: [
      'Resmi/gündelik ayrımını gözet: "Could you..." kibar, "Can you..." gündelik, "Give me..." kaba olabilir.',
      'Kısaltmalar ve kalıpları doğal kullan (örn. yazılı dilde "gonna" yerine "going to").',
      'Hedef dilde sık kullanılan kalıp ifadeleri ezberle; çeviri değil, kalıp üret.',
    ],
    tip: 'Kendine sor: "Bu cümleyi hedef dilde bir anadili böyle söyler miydi?"',
  },
};

const LANGUAGE_GRAMMAR_NOTES: Record<TargetLanguage, Partial<Record<ErrorCategory, string>>> = {
  en: {
    grammar: 'İngilizcede -s takısı (3. tekil), -ing ve düzensiz fiiller en sık hata kaynağıdır.',
    word_order: 'İngilizce sorularda do/does yardımcı fiili öznenin önüne gelir.',
    vocabulary: 'make/do, say/tell, borrow/lend gibi ikililer bağlama göre değişir.',
    spelling: 'through/though/thought gibi kelimeler telaffuzdan farklı yazılır.',
    style: 'Kibar istekler genelde "Could you...?" ile başlar.',
  },
  de: {
    grammar: 'Almancada isimlerin cinsiyeti (der/die/das) ve Akkusativ/Dativ ekleri kritiktir.',
    word_order: 'Almancada yan cümlelerde (wenn/dass) fiil cümlenin sonuna gider.',
    vocabulary: 'Almancada birleşik isimler yaygındır (Handschuh = el + ayakkabı → eldiven).',
    spelling: 'ä, ö, ü ve ß harfleri atlanmamalı; tüm isimler büyük harfle başlar.',
    style: 'Sie (resmi) / du (samimi) ayrımı konuşmanın tonunu belirler.',
  },
  sr: {
    grammar: 'Sırpçada isimlerin 7 hâli vardır; en çok akuzativ (nesne hâli) karıştırılır.',
    word_order: 'Sırpça sıralama esnektir ama enklitikler (ga, se, mu) kurala göre yerleşir.',
    vocabulary: 'Vurgu ve uzunluk anlamı değiştirebilir (grad = şehir / dolu).',
    spelling: 'č/ć, š/ž, dž/dj farklı seslerdir; karıştırılmamalı.',
    style: 'molim hem "lütfen" hem "rica ederim"dir; bağlama göre kullanılır.',
  },
};

// --- Oyunlaştırılmış hata testi ---
interface QuizQuestion {
  id: string;
  fossilizedErrorId: string | null;
  errorCategory: string;
  turkishPrompt: string;
  options: string[];
  correctOptionIndex: number;
  explanationTr: string;
}

interface QuizResponse {
  quizTitle?: string;
  questions?: unknown[];
}

const validQuizQuestion = (value: unknown): value is QuizQuestion => {
  if (!value || typeof value !== 'object') return false;
  const question = value as Record<string, unknown>;
  return Boolean(
    typeof question.turkishPrompt === 'string' &&
      Array.isArray(question.options) &&
      question.options.length >= 2 &&
      typeof question.correctOptionIndex === 'number',
  );
};

const GRAMMAR_POINTS_KEY = 'lingua_grammar_points';
const GRAMMAR_STREAK_KEY = 'lingua_grammar_streak';
const GRAMMAR_LAST_QUIZ_DATE_KEY = 'lingua_grammar_last_quiz_date';

const validDrill = (value: unknown): value is GrammarDrill => {
  if (!value || typeof value !== 'object') return false;
  const drill = value as Record<string, unknown>;
  return Boolean(
    typeof drill.id === 'string' &&
      typeof drill.grammarTopic === 'string' &&
      typeof drill.cefrLevel === 'string' &&
      typeof drill.turkishSentence === 'string' &&
      typeof drill.targetReference === 'string' &&
      typeof drill.grammarPattern === 'string' &&
      typeof drill.fossilizedErrorFocus === 'string',
  );
};

const validHint = (value: unknown): value is GrammarHint => {
  if (!value || typeof value !== 'object') return false;
  const hint = value as Record<string, unknown>;
  return typeof hint.levelTailoredHint === 'string' && hint.levelTailoredHint.trim().length > 0;
};

const validEvaluation = (value: unknown): value is EvaluationResult => {
  if (!value || typeof value !== 'object') return false;
  const evaluation = value as Record<string, unknown>;
  return ['correct', 'natural_variant', 'minor_issue', 'major_issue', 'incorrect'].includes(
    String(evaluation.overallVerdict),
  );
};

const isSuccessfulVerdict = (verdict: GrammarVerdict | undefined) =>
  verdict === 'correct' || verdict === 'natural_variant';

export const GramerPratigiTab: React.FC<GramerPratigiTabProps> = ({
  currentLanguage,
  fossilizedErrors,
  onAddLearningItem,
  onMarkErrorResolved,
}) => {
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

  // Kişisel Gramer Koçu: hata profili + mini ders + oyunlaştırılmış test
  const [selectedLessonCategory, setSelectedLessonCategory] = useState<ErrorCategory | null>(null);
  const [points, setPoints] = useState<number>(() => {
    try { return Number(localStorage.getItem(GRAMMAR_POINTS_KEY)) || 0; } catch { return 0; }
  });
  const [streak, setStreak] = useState<number>(() => {
    try { return Number(localStorage.getItem(GRAMMAR_STREAK_KEY)) || 0; } catch { return 0; }
  });
  const [quizTitle, setQuizTitle] = useState('');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [quizStatus, setQuizStatus] = useState<string | null>(null);

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

  // Hata profili: kayıtlı hataları kategorilere göre sayar (kişiselleştirmenin temeli)
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const error of fossilizedErrors) {
      const category = (error as unknown as { errorCategory?: string }).errorCategory;
      if (category) counts[category] = (counts[category] || 0) + 1;
    }
    return counts;
  }, [fossilizedErrors]);

  const topCategory = useMemo<ErrorCategory | null>(() => {
    let top: ErrorCategory | null = null;
    let topCount = 0;
    for (const [category, count] of Object.entries(categoryCounts)) {
      if (count > topCount) {
        top = category as ErrorCategory;
        topCount = count;
      }
    }
    return top;
  }, [categoryCounts]);

  const activeLessonCategory = selectedLessonCategory ?? topCategory ?? 'grammar';

  const currentDrill = visibleDrills[Math.min(activeIndex, Math.max(0, visibleDrills.length - 1))];
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
      const errorTopics = languageErrors
        .map((error) => {
          const item = error as unknown as Record<string, unknown>;
          return String(item.errorDescription || item.category || '').trim();
        })
        .filter(Boolean);

      const payload = await callLinguaApi<GrammarDrillsResponse>('/api/generate-grammar-drills', {
        language: currentLanguage,
        cefrLevel,
        errorTopics,
      });
      const generated = Array.isArray(payload.drills) ? payload.drills.filter(validDrill) : [];
      if (!generated.length) throw new Error('Sunucu geçerli alıştırma döndürmedi.');

      setDrills(generated);
      setSource('ai');
      setActiveIndex(0);
      setUserAnswer('');
      setStatus('AI tarafından üretilen yeni alıştırmalar yüklendi.');
    } catch (error) {
      setStatus(
        `AI alıştırması oluşturulamadı: ${
          error instanceof Error ? error.message : 'Bilinmeyen hata'
        }. Hazır alıştırmalar korunuyor.`,
      );
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
      const payload = await callLinguaApi<unknown>('/api/generate-grammar-hint', {
        language: currentLanguage,
        cefrLevel,
        turkishSentence: currentDrill.turkishSentence,
        targetReference: currentDrill.targetReference,
        grammarPattern: currentDrill.grammarPattern,
        userAnswer,
      });
      if (!validHint(payload)) throw new Error('Sunucu geçerli ipucu döndürmedi.');
      setHint(payload);
    } catch (error) {
      setStatus(
        `AI ipucu alınamadı: ${
          error instanceof Error ? error.message : 'Bilinmeyen hata'
        }. Aşağıdaki hazır kalıp ipucunu kullanabilirsiniz.`,
      );
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
      const payload = await callLinguaApi<unknown>('/api/evaluate', {
        language: currentLanguage,
        turkishPrompt: currentDrill.turkishSentence,
        targetReference: currentDrill.targetReference,
        targetVariants: currentDrill.targetVariants || [],
        userAnswer: userAnswer.trim(),
        cefrLevel,
        hintsUsedCount: hint ? 1 : 0,
      });
      if (!validEvaluation(payload)) throw new Error('Sunucu geçerli değerlendirme döndürmedi.');
      setEvaluation(payload);
    } catch (error) {
      const accepted = [currentDrill.targetReference, ...(currentDrill.targetVariants || [])];
      const exactMatch = accepted.some((answer) => normalize(answer) === normalize(userAnswer));
      if (exactMatch) {
        setEvaluation({
          overallVerdict: 'correct',
          explanationTr:
            'Yanıt, kayıtlı referans cevaplardan biriyle metinsel olarak tam eşleşiyor. Bu sonuç AI değerlendirmesi değildir.',
        });
      } else {
        setStatus(
          `AI değerlendirmesi yapılamadı: ${
            error instanceof Error ? error.message : 'Bilinmeyen hata'
          }. Yanıtınız puanlanmadı ve ilerlemeye yazılmadı.`,
        );
      }
    } finally {
      setIsEvaluating(false);
    }
  };

  const addToReviewDeck = () => {
    if (!currentDrill || !isSuccessfulVerdict(evaluation?.overallVerdict)) return;
    const item: LearningItem = {
      id: `grammar_${currentDrill.id}_${Date.now()}`,
      language: currentLanguage,
      domain: 'general',
      turkishText: currentDrill.turkishSentence,
      targetText: currentDrill.targetReference,
      keyTermOrPattern: currentDrill.grammarPattern,
      masteryState: 'noticed',
      isActiveVocabulary: false,
      contextCount: 1,
      nextReviewDate: new Date().toISOString(),
      stability: 1.5,
      difficulty: 4,
      fossilizedCount: 0,
    };
    onAddLearningItem(item);
    setStatus('Alıştırma uygulamanın tekrar destesine eklendi.');
  };

  const markRelatedErrorResolved = () => {
    if (!onMarkErrorResolved || !isSuccessfulVerdict(evaluation?.overallVerdict)) return;
    const first = languageErrors[0] as unknown as Record<string, unknown> | undefined;
    if (first?.id) {
      onMarkErrorResolved(String(first.id));
      setStatus('İlgili hata çözüldü olarak işaretlendi.');
    }
  };

  const awardPoints = (earned: number) => {
    setPoints((previous) => {
      const next = previous + earned;
      try { localStorage.setItem(GRAMMAR_POINTS_KEY, String(next)); } catch { /* localStorage kullanılamıyor */ }
      return next;
    });
  };

  const updateStreak = () => {
    const today = new Date().toISOString().slice(0, 10);
    let lastDate: string | null = null;
    try { lastDate = localStorage.getItem(GRAMMAR_LAST_QUIZ_DATE_KEY); } catch { /* localStorage kullanılamıyor */ }
    setStreak((previous) => {
      let next = previous;
      if (lastDate !== today) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        next = lastDate === yesterday ? previous + 1 : 1;
      }
      try {
        localStorage.setItem(GRAMMAR_STREAK_KEY, String(next));
        localStorage.setItem(GRAMMAR_LAST_QUIZ_DATE_KEY, today);
      } catch { /* localStorage kullanılamıyor */ }
      return next;
    });
  };

  const startQuiz = async () => {
    setIsQuizLoading(true);
    setQuizStatus(null);
    setQuizFinished(false);
    setQuizIndex(0);
    setSelectedOption(null);
    setQuizScore(0);
    setQuizQuestions([]);
    try {
      const errorTopics = languageErrors
        .slice(0, 8)
        .map((error) => {
          const item = error as unknown as Record<string, unknown>;
          const category = typeof item.errorCategory === 'string' ? item.errorCategory : '';
          const description = String(item.errorDescription || '').trim();
          return category ? `[${category}] ${description}` : description;
        })
        .filter(Boolean);

      const payload = await callLinguaApi<QuizResponse>('/api/generate-error-quiz', {
        language: currentLanguage,
        errorTopics,
        focusCategory: topCategory ?? undefined,
      });
      const questions = Array.isArray(payload.questions) ? payload.questions.filter(validQuizQuestion) : [];
      if (!questions.length) throw new Error('Sunucu geçerli test sorusu döndürmedi.');
      setQuizQuestions(questions);
      setQuizTitle(typeof payload.quizTitle === 'string' && payload.quizTitle.trim() ? payload.quizTitle : 'Kişisel Hata Testi');
    } catch (error) {
      setQuizStatus(`Test oluşturulamadı: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}. Hata kaydın yoksa önce Üret bölümünde pratik yap.`);
    } finally {
      setIsQuizLoading(false);
    }
  };

  const selectQuizOption = (optionIndex: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(optionIndex);
    const question = quizQuestions[quizIndex];
    if (optionIndex === question.correctOptionIndex) {
      setQuizScore((previous) => previous + 1);
      awardPoints(10);
    }
  };

  const nextQuizQuestion = () => {
    if (quizIndex >= quizQuestions.length - 1) {
      setQuizFinished(true);
      updateStreak();
    } else {
      setQuizIndex((previous) => previous + 1);
      setSelectedOption(null);
    }
  };

  if (!currentDrill) {
    return <div className="p-6 text-sm text-slate-600">Bu dil için gramer alıştırması bulunamadı.</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Kişisel Gramer Koçu — hata profili + mini ders + oyunlaştırılmış test */}
      <section className="bg-white rounded-3xl border-2 border-violet-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Brain className="w-5 h-5 text-violet-600" />
          <h2 className="font-black text-slate-900">Kişisel Gramer Koçu</h2>
          <span className="ml-auto flex items-center gap-3 text-xs font-bold">
            <span className="flex items-center gap-1 text-amber-600"><Trophy className="w-4 h-4" /> {points} Puan</span>
            <span className="flex items-center gap-1 text-orange-600"><Flame className="w-4 h-4" /> {streak} Gün Seri</span>
          </span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Üret bölümünde yaptığın hatalardan ders çıkarır: en zayıf olduğun alanı bulur, 2-3 dakikalık mini ders verir ve seni o konuda test eder.
        </p>

        {/* Hata profili */}
        <div>
          <span className="text-[10px] uppercase tracking-wider font-black text-violet-600">Hata Profilin</span>
          {Object.keys(categoryCounts).length === 0 ? (
            <div className="mt-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
              Henüz kayıtlı hatan yok. Üret bölümünde pratik yaptıkça burada en çok zorlandığın alanlar ve sana özel dersler görünecek.
            </div>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              {(Object.keys(CATEGORY_LESSONS) as ErrorCategory[]).map((category) => {
                const count = categoryCounts[category] || 0;
                if (count === 0) return null;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedLessonCategory(category)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      activeLessonCategory === category
                        ? 'bg-violet-600 text-white border-violet-600 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-violet-400'
                    }`}
                    title="Bu konudaki mini dersi aç"
                  >
                    {CATEGORY_LESSONS[category].emoji} {CATEGORY_LESSONS[category].label} ×{count}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 2-3 dakikalık mini ders */}
        <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/70 to-sky-50/50 p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-black text-violet-900">
              ⏱️ 2-3 Dakikalık Mini Ders: {CATEGORY_LESSONS[activeLessonCategory].emoji} {CATEGORY_LESSONS[activeLessonCategory].label}
            </span>
            {selectedLessonCategory && (
              <button
                type="button"
                onClick={() => setSelectedLessonCategory(null)}
                className="text-[10px] text-violet-500 hover:text-violet-700 font-bold underline cursor-pointer"
              >
                En zayıf alanıma dön
              </button>
            )}
          </div>
          <p className="text-xs text-slate-700 font-medium leading-relaxed">{CATEGORY_LESSONS[activeLessonCategory].summary}</p>
          <ol className="space-y-1.5">
            {CATEGORY_LESSONS[activeLessonCategory].steps.map((step, index) => (
              <li key={index} className="text-xs text-slate-700 flex gap-2 leading-relaxed">
                <span className="w-4 h-4 rounded-full bg-violet-200 text-violet-800 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{index + 1}</span>
                {step}
              </li>
            ))}
          </ol>
          {LANGUAGE_GRAMMAR_NOTES[currentLanguage][activeLessonCategory] && (
            <div className="p-2.5 rounded-xl bg-white/70 border border-violet-200/60 text-[11px] text-violet-900 leading-relaxed">
              <strong>{currentLanguage.toUpperCase()} için:</strong> {LANGUAGE_GRAMMAR_NOTES[currentLanguage][activeLessonCategory]}
            </div>
          )}
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/70 text-[11px] text-amber-900 leading-relaxed">
            💡 <strong>Pratik ipucu:</strong> {CATEGORY_LESSONS[activeLessonCategory].tip}
          </div>
        </div>

        {/* Oyunlaştırılmış hata testi */}
        <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-black text-slate-900">🎮 Kişisel Hata Testi</span>
            {!isQuizLoading && quizQuestions.length === 0 && !quizFinished && (
              <button
                type="button"
                onClick={() => void startQuiz()}
                disabled={Object.keys(categoryCounts).length === 0}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs font-black shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
                title={Object.keys(categoryCounts).length === 0 ? 'Önce Üret bölümünde pratik yaparak hata kaydı oluştur' : 'Hatalarına göre test oluştur'}
              >
                <Target className="w-4 h-4" /> Testi Başlat (+10 Puan/Doğru)
              </button>
            )}
          </div>

          {quizStatus && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">{quizStatus}</div>
          )}

          {isQuizLoading && (
            <div className="flex items-center gap-2 text-xs text-violet-700 py-3">
              <Loader2 className="w-4 h-4 animate-spin" /> Hatalarına göre test hazırlanıyor...
            </div>
          )}

          {!isQuizLoading && quizQuestions.length > 0 && !quizFinished && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                <span>{quizTitle}</span>
                <span>Soru {quizIndex + 1}/{quizQuestions.length} · Doğru: {quizScore}</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all"
                  style={{ width: `${((quizIndex + (selectedOption !== null ? 1 : 0)) / quizQuestions.length) * 100}%` }}
                />
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 leading-relaxed">
                {quizQuestions[quizIndex].turkishPrompt}
              </div>
              <div className="space-y-2">
                {quizQuestions[quizIndex].options.map((option, optionIndex) => {
                  const isCorrectOption = optionIndex === quizQuestions[quizIndex].correctOptionIndex;
                  let style = 'bg-white border-slate-200 text-slate-700 hover:border-violet-400 hover:bg-violet-50';
                  if (selectedOption !== null) {
                    if (isCorrectOption) style = 'bg-emerald-50 border-emerald-400 text-emerald-900';
                    else if (selectedOption === optionIndex) style = 'bg-rose-50 border-rose-400 text-rose-900';
                    else style = 'bg-slate-50 border-slate-200 text-slate-400';
                  }
                  return (
                    <button
                      key={optionIndex}
                      type="button"
                      disabled={selectedOption !== null}
                      onClick={() => selectQuizOption(optionIndex)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all ${style} disabled:cursor-default`}
                    >
                      {String.fromCharCode(65 + optionIndex)}) {option}
                    </button>
                  );
                })}
              </div>
              {selectedOption !== null && (
                <div className={`p-3 rounded-xl text-xs leading-relaxed ${
                  quizQuestions[quizIndex].correctOptionIndex === selectedOption
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border border-rose-200 text-rose-900'
                }`}>
                  <strong>{quizQuestions[quizIndex].correctOptionIndex === selectedOption ? '✅ Doğru! +10 puan' : '❌ Yanlış'}</strong>
                  <p className="mt-1">{quizQuestions[quizIndex].explanationTr}</p>
                  <button
                    type="button"
                    onClick={nextQuizQuestion}
                    className="mt-2 w-full py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-black cursor-pointer"
                  >
                    {quizIndex >= quizQuestions.length - 1 ? 'Testi Bitir' : 'Sonraki Soru'}
                  </button>
                </div>
              )}
            </div>
          )}

          {!isQuizLoading && quizFinished && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-200 text-center space-y-2">
              <div className="text-2xl">{quizScore === quizQuestions.length ? '🏆' : quizScore >= Math.ceil(quizQuestions.length / 2) ? '🎉' : '💪'}</div>
              <div className="font-black text-violet-900 text-sm">Test Tamamlandı: {quizScore}/{quizQuestions.length} doğru</div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {quizScore === quizQuestions.length
                  ? 'Mükemmel! Bu konuda sağlamlaştın.'
                  : quizScore >= Math.ceil(quizQuestions.length / 2)
                    ? 'İyi gidiyorsun! Yanlış yaptığın soruların açıklamalarını mini derste tekrar oku.'
                    : 'Zorlandığın alan net: yukarıdaki mini dersi tekrar oku, sonra testi yeniden dene.'}
              </p>
              <button
                type="button"
                onClick={() => { setQuizQuestions([]); setQuizFinished(false); setQuizStatus(null); }}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-black cursor-pointer"
              >
                Yeni Test Oluştur
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-violet-600" />
              <h2 className="font-black text-slate-900">Cümle Kurma Alıştırmaları</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              İçerik kaynağı:{' '}
              <strong>{source === 'ai' ? 'AI üretimi' : 'önceden hazırlanmış alıştırma'}</strong>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {['A1', 'A2', 'B1', 'B2'].map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => {
                  setCefrLevel(level);
                  setActiveIndex(0);
                  resetAttempt();
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                  cefrLevel === level
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={generateWithAi}
            disabled={isGenerating}
            className="px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-2"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            AI ile yeni alıştırma üret
          </button>
          <button
            type="button"
            onClick={loadCurated}
            className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Hazır alıştırmaları yükle
          </button>
        </div>
        {status && (
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{status}</span>
          </div>
        )}
      </section>

      <section className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-black text-violet-600">
              {currentDrill.cefrLevel} · {currentDrill.grammarTopic}
            </span>
            <h3 className="font-black text-slate-900 mt-1">{currentDrill.turkishSentence}</h3>
            <p className="text-xs text-slate-500 mt-2">Kalıp: {currentDrill.grammarPattern}</p>
          </div>
          <span className="text-[10px] px-2 py-1 rounded-lg bg-slate-100 text-slate-600 font-bold">
            {activeIndex + 1}/{visibleDrills.length}
          </span>
        </div>

        <textarea
          value={userAnswer}
          onChange={(event) => setUserAnswer(event.target.value)}
          rows={4}
          placeholder="Hedef dilde cevabınızı yazın..."
          className="w-full p-4 rounded-2xl border border-slate-300 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30"
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={evaluateAnswer}
            disabled={!userAnswer.trim() || isEvaluating}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-2"
          >
            {isEvaluating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Değerlendir
          </button>
          <button
            type="button"
            onClick={requestHint}
            disabled={isHintLoading}
            className="px-4 py-2 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold disabled:opacity-50 flex items-center gap-2"
          >
            {isHintLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}
            AI ipucu iste
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveIndex((index) => (index + 1) % visibleDrills.length);
              resetAttempt();
            }}
            className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
          >
            Sonraki alıştırma
          </button>
        </div>

        {!hint && currentDrill.hintLadder?.patternHint && (
          <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200 text-xs text-sky-900">
            <strong>Hazır kalıp ipucu:</strong> {currentDrill.hintLadder.patternHint}
          </div>
        )}

        {hint && (
          <div className="p-4 rounded-2xl bg-violet-50 border border-violet-200 space-y-2 text-sm">
            <div className="font-black text-violet-900">AI ipucu</div>
            <p className="text-violet-950">{hint.levelTailoredHint}</p>
            {hint.stepByStepSolution?.length ? (
              <ol className="list-decimal pl-5 text-xs text-violet-900 space-y-1">
                {hint.stepByStepSolution.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            ) : null}
          </div>
        )}

        {evaluation && (
          <div
            className={`p-4 rounded-2xl border space-y-3 ${
              isSuccessfulVerdict(evaluation.overallVerdict)
                ? 'bg-emerald-50 border-emerald-200'
                : evaluation.overallVerdict === 'minor_issue'
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-rose-50 border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2 font-black text-sm">
              {isSuccessfulVerdict(evaluation.overallVerdict) ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              )}
              {evaluation.overallVerdict === 'correct'
                ? 'Doğru'
                : evaluation.overallVerdict === 'natural_variant'
                  ? 'Doğal ve doğru alternatif'
                : evaluation.overallVerdict === 'minor_issue'
                  ? 'Küçük düzeltme gerekli'
                  : 'Önemli düzeltme gerekli'}
            </div>
            {evaluation.explanationTr && <p className="text-xs text-slate-700">{evaluation.explanationTr}</p>}
            {evaluation.errors?.map((error, index) => (
              <div key={index} className="text-xs text-slate-700">
                {error.message}
                {error.suggestion ? ` Öneri: ${error.suggestion}` : ''}
              </div>
            ))}
            <div className="text-xs text-slate-700">
              <strong>Referans:</strong>{' '}
              <VocabularyTooltip
                text={currentDrill.targetReference}
                language={currentLanguage}
                contextSentence={currentDrill.targetReference}
                onAddLearningItem={onAddLearningItem}
              />
            </div>
            {isSuccessfulVerdict(evaluation.overallVerdict) && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={addToReviewDeck}
                  className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  Tekrar destesine ekle
                </button>
                {onMarkErrorResolved && languageErrors.length > 0 && (
                  <button
                    type="button"
                    onClick={markRelatedErrorResolved}
                    className="px-3 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold"
                  >
                    İlgili hatayı çözüldü işaretle
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
