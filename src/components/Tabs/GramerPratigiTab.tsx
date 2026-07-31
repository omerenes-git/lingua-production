import React, { useState, useEffect } from 'react';
import { TargetLanguage, FossilizedError, LearningItem, AIEvaluationResult } from '../../types';
import { VocabularyTooltip } from '../VocabularyTooltip';
import { 
  Brain, Sparkles, CheckCircle2, AlertTriangle, HelpCircle, 
  RefreshCw, Lightbulb, ArrowRight, BookOpen, Layers, Award, Check, XCircle, Send, Volume2
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
  hintLadder: {
    partOfSpeech: string;
    firstLetters: string;
    partialWords: string;
    patternHint: string;
    keyWordsGiven: string;
    fullAnswer: string;
  };
}

interface AiGrammarHintResponse {
  levelTailoredHint: string;
  stepByStepSolution?: string[];
  alternativeStructures: Array<{
    patternName: string;
    sentenceInTargetLang: string;
    explanation: string;
  }>;
  commonPitfallsToAvoid: string[];
  keyVocabulary: string[];
}

interface MiniQuizQuestion {
  id: string;
  fossilizedErrorId?: string | null;
  errorCategory: string;
  turkishPrompt: string;
  options: string[];
  correctOptionIndex: number;
  explanationTr: string;
}

interface MiniQuizData {
  quizTitle: string;
  questions: MiniQuizQuestion[];
}

interface GramerPratigiTabProps {
  currentLanguage: TargetLanguage;
  fossilizedErrors: FossilizedError[];
  onAddLearningItem: (item: LearningItem) => void;
  onMarkErrorResolved?: (errorId: string) => void;
}

const FALLBACK_DRILLS: Record<TargetLanguage, Record<string, GrammarDrill[]>> = {
  en: {
    B1: [
      {
        id: 'dr_en_b1_1',
        grammarTopic: 'Şartlı Cümleler & Emir Kalıbı (If + Imperative)',
        cefrLevel: 'B1',
        turkishSentence: 'Egzersiz sırasında omuz ağrınız artarsa hareketi derhal durdurun.',
        targetReference: 'If your shoulder pain increases during exercise, stop the movement immediately.',
        targetVariants: ['Stop the movement immediately if your shoulder pain increases during exercise.'],
        grammarPattern: 'If + Present Simple, Imperative verb...',
        fossilizedErrorFocus: 'Türkçe düşünme alışkanlığında "rise" yerine "increase", "stop movement" yerine nesne edat uyumu ("stop the movement") kullanılması.',
        hintLadder: {
          partOfSpeech: 'Şart ve Komut Cümlesi Yapısı',
          firstLetters: 'I... y... s... p... i... d... e..., s... t... m... i...',
          partialWords: 'If your shoulder p... inc... during ex..., stop the m... imm...',
          patternHint: 'Şart cümlesi: If + [özne + geniş zaman fiil], [emir fiili + nesne + zaman zarfı]',
          keyWordsGiven: 'shoulder pain / increase / during exercise / stop immediately',
          fullAnswer: 'If your shoulder pain increases during exercise, stop the movement immediately.'
        }
      },
      {
        id: 'dr_en_b1_2',
        grammarTopic: 'Dolaylı Tümleç & Edat Dizilimi (Report to someone)',
        cefrLevel: 'B1',
        turkishSentence: 'Hastanın durumundaki ani değişimi doktora hemen bildirmelisiniz.',
        targetReference: 'You must report the sudden change in the patient condition to the doctor immediately.',
        targetVariants: ['You should notify the doctor about the sudden change immediately.'],
        grammarPattern: 'Report + [Direct Object] + TO + [Person]',
        fossilizedErrorFocus: 'Türkçede "doktora bildirmek" eylemi edat sırasını karıştırmanıza sebep olabilir ("report doctor" hatası).',
        hintLadder: {
          partOfSpeech: 'Zorunluluk Cümlesi (Must / Should)',
          firstLetters: 'Y... m... r... t... s... c... t... t... d... i...',
          partialWords: 'You must report the sud... change to the doc...',
          patternHint: 'Sıralama: Özne + Must + Fiil + Doğrudan Nesne + "to" + Kişi + Zarf',
          keyWordsGiven: 'report / sudden change / patient condition / to the doctor / immediately',
          fullAnswer: 'You must report the sudden change in the patient condition to the doctor immediately.'
        }
      }
    ],
    A2: [
      {
        id: 'dr_en_a2_1',
        grammarTopic: 'Nezaket İstekleri (Could you please...)',
        cefrLevel: 'A2',
        turkishSentence: 'Yeni randevu onayını e-posta ile hemen gönderebilir misiniz?',
        targetReference: 'Could you please send the new appointment confirmation by email right away?',
        targetVariants: ['Can you email me the new appointment confirmation immediately?'],
        grammarPattern: 'Could you please + verb + object + BY email...',
        fossilizedErrorFocus: 'Soru cümlesinde kibar kalıp "Could you please..." tercih edilmelidir.',
        hintLadder: {
          partOfSpeech: 'Nezaket Sorusu',
          firstLetters: 'C... y... p... s... t... n... a... c... b... e...',
          partialWords: 'Could you pl... send the n... app... conf...',
          patternHint: 'Soru Yapısı: Could you please + [Fiil] + [Nesne] + by email?',
          keyWordsGiven: 'appointment confirmation / send / by email / right away',
          fullAnswer: 'Could you please send the new appointment confirmation by email right away?'
        }
      }
    ]
  },
  de: {
    A1: [
      {
        id: 'dr_de_a1_1',
        grammarTopic: 'Gündelik Sipariş & Nezaket (Ich möchte bitte...)',
        cefrLevel: 'A1',
        turkishSentence: 'Lütfen bir kahve ve bir şişe su alabilir miyim?',
        targetReference: 'Ich möchte bitte einen Kaffee und eine Flasche Wasser.',
        targetVariants: ['Kann ich bitte einen Kaffee und ein Wasser haben?'],
        grammarPattern: 'Ich möchte bitte + [Akkusativ Artikel + Nomen]',
        fossilizedErrorFocus: 'Almancada "Kaffee" eril isimdir (der Kaffee) ve nesne durumunda Akkusativ alarak "einen Kaffee" olur.',
        hintLadder: {
          partOfSpeech: 'Günlük Sipariş Cümlesi',
          firstLetters: 'I... m... b... e... K... u... e... F... W...',
          partialWords: 'Ich möc... bitte einen Kaf... und eine Flas... Was...',
          patternHint: 'Yapı: Ich möchte + bitte + [Akkusativ nesne]',
          keyWordsGiven: 'möchte / bitte / einen Kaffee / eine Flasche Wasser',
          fullAnswer: 'Ich möchte bitte einen Kaffee und eine Flasche Wasser.'
        }
      },
      {
        id: 'dr_de_a1_2',
        grammarTopic: 'Kendini Tanıtma & Nereli Olduğunu Söyleme',
        cefrLevel: 'A1',
        turkishSentence: 'Merhaba, benim adım Ahmet ve Türkiye\'den geliyorum.',
        targetReference: 'Hallo, mein Name ist Ahmet und ich komme aus der Türkei.',
        targetVariants: ['Hallo, ich heiße Ahmet und komme aus der Türkei.'],
        grammarPattern: 'Mein Name ist... / Ich komme aus...',
        fossilizedErrorFocus: 'Almancada Türkiye der artikelini aldığı için "aus der Türkei" kalıbı kullanılır.',
        hintLadder: {
          partOfSpeech: 'Tanışma Cümlesi',
          firstLetters: 'H..., m... N... i... A... u... i... k... a... d... T...',
          partialWords: 'Hallo, mein Name ist Ah... und ich kom... aus der Tür...',
          patternHint: 'Tanışma: Mein Name ist [Ad] und ich komme aus der Türkei.',
          keyWordsGiven: 'Hallo / Name / kommen aus / Türkei',
          fullAnswer: 'Hallo, mein Name ist Ahmet und ich komme aus der Türkei.'
        }
      }
    ],
    A2: [
      {
        id: 'dr_de_a2_1',
        grammarTopic: 'Saat Sorma & Buluşma Sözleşme',
        cefrLevel: 'A2',
        turkishSentence: 'Bugün öğleden sonra saat üçte buluşabilir miyiz?',
        targetReference: 'Können wir uns heute Nachmittag um drei Uhr treffen?',
        targetVariants: ['Treffen wir uns heute Nachmittag um drei Uhr?'],
        grammarPattern: 'Modalverb (Können) + Pronomen + Zeitangabe + Verb am Ende (treffen)',
        fossilizedErrorFocus: 'Almancada saatlerden önce "um" edatı ve zamandan önce "heute Nachmittag" yapısı gelir.',
        hintLadder: {
          partOfSpeech: 'Buluşma Teklifi Soru Cümlesi',
          firstLetters: 'K... w... u... h... N... u... d... U... t...?',
          partialWords: 'Können wir uns heu... Nachm... um drei Uhr tref...?',
          patternHint: 'Soru dizilimi: Können + wir + uns + zaman + um [Saat] + trefen (en sonda)',
          keyWordsGiven: 'Können / uns treffen / heute Nachmittag / um drei Uhr',
          fullAnswer: 'Können wir uns heute Nachmittag um drei Uhr treffen?'
        }
      }
    ],
    B1: [
      {
        id: 'dr_de_b1_1',
        grammarTopic: 'Yan Cümlede Fiil Sona Gelir (Weil / Wenn Nebensatz)',
        cefrLevel: 'B1',
        turkishSentence: 'Zamanım olduğunda sizinle akşam yemeği yemek isterim.',
        targetReference: 'Wenn ich Zeit habe, möchte ich gerne mit Ihnen zu Abend essen.',
        targetVariants: ['Ich möchte gerne mit Ihnen zu Abend essen, wenn ich Zeit habe.'],
        grammarPattern: 'Wenn + [Subjekt] + [Objekt] + [VERB AM ENDE], [Modalverb] + [Subjekt]...',
        fossilizedErrorFocus: 'Almancada "Wenn" yan cümlesinde çekimli fiil (habe) en sona gider.',
        hintLadder: {
          partOfSpeech: 'Gündelik Şart Cümlesi (Wenn Nebensatz)',
          firstLetters: 'W... i... Z... h..., m... i... g... m... I... z... A... e...',
          partialWords: 'Wenn ich Zeit habe, möc... ich ger... mit Ihnen zu Ab... ess...',
          patternHint: 'Kurallı yapı: Wenn + [Özne] + [Nesne] + [Fiil Sonda], [Modalverb] + [Özne]...',
          keyWordsGiven: 'Wenn / Zeit haben / möchte gerne / zu Abend essen',
          fullAnswer: 'Wenn ich Zeit habe, möchte ich gerne mit Ihnen zu Abend essen.'
        }
      }
    ]
  },
  sr: {
    A1: [
      {
        id: 'dr_sr_a1_1',
        grammarTopic: 'Gündelik Tanışma & Selamlaşma',
        cefrLevel: 'A1',
        turkishSentence: 'Merhaba, ben Ahmet. Nasılsınız?',
        targetReference: 'Zdravo, ja sam Ahmet. Kako ste?',
        targetVariants: ['Ćao, ja sam Ahmet. Kako ste?'],
        grammarPattern: 'Zdravo / Ćao + Ja sam + Kako ste?',
        fossilizedErrorFocus: 'Sırpçada "olmak" fiilinin "sam / ste" çekimleri kişi zamirinden sonra doğru gelmelidir.',
        hintLadder: {
          partOfSpeech: 'Temel Selamlaşma Cümlesi',
          firstLetters: 'Z..., j... s... A.... K... s...?',
          partialWords: 'Zdravo, ja sam Ah... Kako s...?',
          patternHint: 'Yapı: Zdravo, ja sam [İsim]. Kako ste?',
          keyWordsGiven: 'Zdravo / ja sam / Kako ste',
          fullAnswer: 'Zdravo, ja sam Ahmet. Kako ste?'
        }
      },
      {
        id: 'dr_sr_a1_2',
        grammarTopic: 'Kahve Siparişi & Temel İstek Cümlesi',
        cefrLevel: 'A1',
        turkishSentence: 'Lütfen bir kahve ve bir voda (su) alabilir miyim?',
        targetReference: 'Molim vas, jednu kafu i jednu vodu.',
        targetVariants: ['Mogu li dobiti jednu kafu i vodu, molim vas?'],
        grammarPattern: 'Molim vas + Akuzativ imenice (kafu / vodu)',
        fossilizedErrorFocus: 'Sırpçada kafu ve vodu isimleri nesne konumunda -u takısı alarak Akuzativ olur.',
        hintLadder: {
          partOfSpeech: 'Gündelik Sipariş Cümlesi',
          firstLetters: 'M... v..., j... k... i... j... v...',
          partialWords: 'Molim vas, jed... kafu i jed... vodu.',
          patternHint: 'Yapı: Molim vas + [Akuzativ Nesne]',
          keyWordsGiven: 'Molim vas / jednu kafu / jednu vodu',
          fullAnswer: 'Molim vas, jednu kafu i jednu vodu.'
        }
      }
    ],
    A2: [
      {
        id: 'dr_sr_a2_1',
        grammarTopic: 'Fiil Çekimi & Nezaket Cümlesi',
        cefrLevel: 'A2',
        turkishSentence: 'Lütfen yeni randevu zamanını e-posta ile gönderin.',
        targetReference: 'Molim vas pošaljite novo vreme sastanka putem e-pošte.',
        targetVariants: ['Pošaljite mi vreme sastanka putem mejla molim vas.'],
        grammarPattern: 'Imperativ + Akuzativ imenice',
        fossilizedErrorFocus: 'Sırpçada belirli nesne ismin i-haline (akuzativ) girer.',
        hintLadder: {
          partOfSpeech: 'Nezaket ve İstek Cümlesi',
          firstLetters: 'M... v... p... n... v... s... p... e...',
          partialWords: 'Molim vas poš... novo vreme...',
          patternHint: 'Sıralama: Molim vas + [Fiil] + [Nesne Akuzativ] + putem e-pošte',
          keyWordsGiven: 'molim vas / pošaljite / vreme / putem e-pošte',
          fullAnswer: 'Molim vas pošaljite novo vreme sastanka putem e-pošte.'
        }
      }
    ]
  }
};

export const GramerPratigiTab: React.FC<GramerPratigiTabProps> = ({
  currentLanguage,
  fossilizedErrors,
  onAddLearningItem,
  onMarkErrorResolved,
}) => {
  const [cefrLevel, setCefrLevel] = useState<'A1' | 'A2' | 'B1' | 'B2' | 'C1'>('B1');
  const [drills, setDrills] = useState<GrammarDrill[]>([]);
  const [activeDrillIndex, setActiveDrillIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [hintLevel, setHintLevel] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<AIEvaluationResult | null>(null);

  // AI Hint State for Level-Tailored Grammar Hints & Alternative Structures
  const [aiHint, setAiHint] = useState<AiGrammarHintResponse | null>(null);
  const [isHintLoading, setIsHintLoading] = useState(false);
  const [activeHintCardId, setActiveHintCardId] = useState<string | null>(null);

  // Mini Error Elimination Quiz State
  const [miniQuiz, setMiniQuiz] = useState<MiniQuizData | null>(null);
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [isQuizSubmitted, setIsQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [isQuizCompleted, setIsQuizCompleted] = useState(false);
  const [resolvedErrorsInQuiz, setResolvedErrorsInQuiz] = useState<string[]>([]);

  const langNames: Record<TargetLanguage, string> = {
    en: 'İngilizce 🇬🇧',
    de: 'Almanca 🇩🇪',
    sr: 'Sırpça 🇷🇸',
  };

  // Filter errors for the current language
  const langErrors = fossilizedErrors.filter((e) => e.language === currentLanguage);
  const unresolvedErrors = langErrors.filter((e) => !e.resolved);

  // Load drills whenever language or level changes
  useEffect(() => {
    loadDrillsForCurrentState();
  }, [currentLanguage, cefrLevel]);

  const loadDrillsForCurrentState = () => {
    setEvaluation(null);
    setAiHint(null);
    setUserAnswer('');
    setHintLevel(0);
    setActiveDrillIndex(0);
    setActiveHintCardId(null);

    const levelDrills = FALLBACK_DRILLS[currentLanguage]?.[cefrLevel] || 
      FALLBACK_DRILLS[currentLanguage]?.['B1'] || 
      FALLBACK_DRILLS['en']['B1'];

    setDrills(levelDrills);
  };

  // Call Gemini API to generate personalized exercises
  const handleGenerateAiDrills = async () => {
    setIsGenerating(true);
    setEvaluation(null);
    setAiHint(null);
    setUserAnswer('');
    setHintLevel(0);

    const topics = unresolvedErrors.map(e => e.errorDescription || 'Gramer ve kelime dizilimi');

    try {
      const res = await fetch('/api/generate-grammar-drills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: currentLanguage,
          cefrLevel,
          errorTopics: topics,
          userErrorsCount: unresolvedErrors.length,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.drills && Array.isArray(data.drills) && data.drills.length > 0) {
          setDrills(data.drills);
          setActiveDrillIndex(0);
        }
      }
    } catch (err) {
      console.warn('AI drill generation fallback to standard curated set:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Fetch Level-Tailored AI Hint & Alternative Sentence Construction Methods
  const handleFetchAiHint = async (
    cardId: string,
    grammarTopic: string,
    turkishSentence: string,
    errorDescription: string
  ) => {
    setIsHintLoading(true);
    setActiveHintCardId(cardId);

    try {
      const res = await fetch('/api/generate-grammar-hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: currentLanguage,
          cefrLevel,
          grammarTopic,
          turkishSentence,
          errorDescription,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiHint(data);
      } else {
        // Fallback level-tailored hint from Dil Öğrenme Uzmanı perspective
        const langExpertHints: Record<TargetLanguage, AiGrammarHintResponse> = {
          en: {
            levelTailoredHint: `🎓 Uzman Koç Tavsiyesi (İngilizce ${cefrLevel}): "${grammarTopic}" konusunda Türkçedeki kelime sırasını birebir İngilizceye aktarma eğilimi görülür. Unutma: İngilizcede cümle yapısı Özne + Fiil + Nesne + Yer + Zaman düzenindedir. Kibar isteklerde "Could you please..." kalıbını tercih et.`,
            alternativeStructures: [
              {
                patternName: 'Gündelik / Nezaket Üslubu',
                sentenceInTargetLang: currentDrill?.targetReference || 'Could you please assist me with this right away?',
                explanation: 'Anadili İngilizce olanların günlük hayatta sık tercih ettiği kibar istek kalıbı.',
              },
              {
                patternName: 'Doğrudan İfade Yapısı',
                sentenceInTargetLang: currentDrill?.targetVariants?.[0] || 'I would like to request assistance immediately.',
                explanation: 'Daha net ve kararlı günlük iletişim biçimi.',
              }
            ],
            commonPitfallsToAvoid: [
              'Türkçedeki "e/a" yönelme ekini edatsız kelimeye bağlamaya çalışmak (Örn: "report doctor" yerine "report TO doctor")',
              'Birebir kelime kelime çeviri yapıp İngilizce fiil zamanını kaçırmak'
            ],
            keyVocabulary: ['could you please (yapabilir misiniz)', 'right away (derhal)', 'by email (e-posta ile)']
          },
          de: {
            levelTailoredHint: `🎓 Uzman Koç Tavsiyesi (Almanca ${cefrLevel}): Almancada temel kural "Fiil daima 2. sıradadır" (V2 kuralı). Ancak "wenn" veya "weil" gibi bağlaçlı yan cümlelerde fiil en sona kayar. Sipariş verirken "Ich möchte bitte..." kalıbında nesnenin Akkusativ (-en / -e / -es) durumunu unutma!`,
            alternativeStructures: [
              {
                patternName: 'Gündelik Sipariş & Nezaket',
                sentenceInTargetLang: currentDrill?.targetReference || 'Ich möchte bitte einen Kaffee und ein Wasser.',
                explanation: 'Kafede veya restoranda en doğal, nazik sipariş cümlesi.',
              },
              {
                patternName: 'Soru Şeklinde İstek',
                sentenceInTargetLang: currentDrill?.targetVariants?.[0] || 'Kann ich bitte einen Kaffee haben?',
                explanation: 'Samimi ve pratik diyalog kalıbı.',
              }
            ],
            commonPitfallsToAvoid: [
              'Almancada "einen Kaffee" der artikelinin Akkusativ halini unutup "ein Kaffee" demek',
              'Yan cümlede fiili en sona koymayı unutmak (Wenn ich habe Zeit yerine "Wenn ich Zeit habe")'
            ],
            keyVocabulary: ['einen Kaffee (bir kahve - Akkusativ)', 'bitte (lütfen)', 'aus der Türkei (Türkiye\'den)']
          },
          sr: {
            levelTailoredHint: `🎓 Uzman Koç Tavsiyesi (Sırpça ${cefrLevel}): Sırpçada selamlaşma ve günlük isteklerde en kritik nokta "sam / ste" yardımcı fiillerini ve nesnelerin Akuzativ (-u) halini doğru kullanmaktır. Örneğin "kafa" kelimesi sipariş verirken "jednu kafu" olur.`,
            alternativeStructures: [
              {
                patternName: 'Gündelik Sipariş / Nezaket',
                sentenceInTargetLang: currentDrill?.targetReference || 'Molim vas, jednu kafu i jednu vodu.',
                explanation: 'Günlük hayatta kafede en sık duyacağın doğal Sırpça kalıp.',
              },
              {
                patternName: 'Giriş & Tanışma Kalıbı',
                sentenceInTargetLang: currentDrill?.targetVariants?.[0] || 'Zdravo, ja sam Ahmet.',
                explanation: 'İçten ve doğal selamlaşma cümlesi.',
              }
            ],
            commonPitfallsToAvoid: [
              'Sırpçada nesne durumundaki dişil kelimelerin sonundaki -a ekini -u yapmayı unutmak (kafa -> kafu)',
              'Fiil çekimlerinde kişi zamirini yanlış eşleştirmek'
            ],
            keyVocabulary: ['molim vas (lütfen)', 'jednu kafu (bir kahve)', 'Kako ste (Nasılsınız)']
          }
        };

        setAiHint(langExpertHints[currentLanguage] || langExpertHints.en);
      }
    } catch (err) {
      console.warn('Error fetching AI hint:', err);
      setAiHint({
        levelTailoredHint: `🎓 Uzman Koç Tavsiyesi (${currentLanguage.toUpperCase()} ${cefrLevel}): Hedef dildeki doğal kelime dizilimine ve edat kullanımına odaklanarak Türkçe cümle yapısının etkisinden sıyrılın.`,
        alternativeStructures: [],
        commonPitfallsToAvoid: ['Türkçe kelime sırasını birebir hedef dile kopyalamak'],
        keyVocabulary: []
      });
    } finally {
      setIsHintLoading(false);
    }
  };

  // Generate Mini Error Elimination Quiz based on user's past fossilized errors
  const handleGenerateMiniQuiz = async () => {
    setIsQuizLoading(true);
    setIsQuizCompleted(false);
    setCurrentQuizIndex(0);
    setSelectedQuizOption(null);
    setIsQuizSubmitted(false);
    setQuizScore(0);
    setResolvedErrorsInQuiz([]);

    const targetErrors = unresolvedErrors.length > 0 ? unresolvedErrors : langErrors;

    try {
      const res = await fetch('/api/generate-error-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: currentLanguage,
          cefrLevel,
          userErrors: targetErrors,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
          setMiniQuiz(data);
          return;
        }
      }

      // Fallback Quiz Generation
      const fallbackQuestions: MiniQuizQuestion[] = [
        {
          id: 'fq1',
          fossilizedErrorId: targetErrors[0]?.id || null,
          errorCategory: targetErrors[0]?.errorCategory || 'Dolaylı Tümleç & Edat Dizilimi',
          turkishPrompt: targetErrors[0]?.contextPhrase || 'Hastanın durumundaki ani değişimi doktora hemen bildirmelisiniz.',
          options: [
            'You must report the sudden change in the patient condition to the doctor immediately.',
            'You must report doctor the sudden change in patient condition.',
            'You report to doctor change sudden in patient condition immediately.',
            'Immediately you must to the doctor change report.'
          ],
          correctOptionIndex: 0,
          explanationTr: 'Doğru dizilim: Özne (You) + Modal (must) + Fiil (report) + Doğrudan Nesne (sudden change) + "TO" + Dolaylı Nesne (the doctor). Türkçede "-e/a bildirmek" kalıbı doğrudan eklendiği için "report to someone" yapısındaki "to" unutulabilmektedir.'
        },
        {
          id: 'fq2',
          fossilizedErrorId: targetErrors[1]?.id || null,
          errorCategory: targetErrors[1]?.errorCategory || 'Şart Cümlesi & Emir Kipi',
          turkishPrompt: targetErrors[1]?.contextPhrase || 'Egzersiz sırasında omuz ağrınız artarsa hareketi derhal durdurun.',
          options: [
            'If your shoulder pain increases during exercise, stop the movement immediately.',
            'If increases shoulder pain, stop movement during exercise.',
            'When your shoulder pain will increase, stop movement right away.',
            'If shoulder pain is increase, stop the exercise movement.'
          ],
          correctOptionIndex: 0,
          explanationTr: 'Şart yan cümlesinde (If clause) geniş zaman "increases", ana cümlede ise doğrudan emir kipi (stop the movement) kullanılır.'
        },
        {
          id: 'fq3',
          fossilizedErrorId: targetErrors[2]?.id || null,
          errorCategory: targetErrors[2]?.errorCategory || 'Nezaket Soru Kalıpları',
          turkishPrompt: targetErrors[2]?.contextPhrase || 'Yeni randevu onayını e-posta ile hemen gönderebilir misiniz?',
          options: [
            'Could you please send the new appointment confirmation by email right away?',
            'Can you email to confirm appointment time please?',
            'Please you confirm appointment time in email.',
            'Could you confirming appointment time with email?'
          ],
          correctOptionIndex: 0,
          explanationTr: 'Nezaket isteklerinde "Could you please + fiilin yalın hali" ve e-posta vasıtası belirtirken "BY email" kullanılır.'
        }
      ];

      setMiniQuiz({
        quizTitle: `CEFR ${cefrLevel} Kemikleşmiş Hata Giderme Testi`,
        questions: fallbackQuestions
      });
    } catch (err) {
      console.warn('Mini Quiz generation fallback triggered:', err);
      setMiniQuiz({
        quizTitle: `CEFR ${cefrLevel} Pratik Testi`,
        questions: [
          {
            id: 'fq_fallback',
            errorCategory: 'Söz Dizimi Uyumu',
            turkishPrompt: 'Doktora durumu hemen bildirmelisiniz.',
            options: [
              'You must report the situation to the doctor immediately.',
              'You report situation doctor immediately.',
              'Immediately report doctor situation.',
              'You must to report doctor situation.'
            ],
            correctOptionIndex: 0,
            explanationTr: 'Doğru kalıp: report something to someone.'
          }
        ]
      });
    } finally {
      setIsQuizLoading(false);
    }
  };

  const handleQuizSubmit = () => {
    if (selectedQuizOption === null || !miniQuiz) return;
    setIsQuizSubmitted(true);

    const currentQ = miniQuiz.questions[currentQuizIndex];
    const isCorrect = selectedQuizOption === currentQ.correctOptionIndex;

    if (isCorrect) {
      setQuizScore((prev) => prev + 1);
      if (currentQ.fossilizedErrorId && onMarkErrorResolved) {
        onMarkErrorResolved(currentQ.fossilizedErrorId);
        if (!resolvedErrorsInQuiz.includes(currentQ.fossilizedErrorId)) {
          setResolvedErrorsInQuiz((prev) => [...prev, currentQ.fossilizedErrorId!]);
        }
      }
    }
  };

  const handleQuizNext = () => {
    if (!miniQuiz) return;
    if (currentQuizIndex + 1 < miniQuiz.questions.length) {
      setCurrentQuizIndex((prev) => prev + 1);
      setSelectedQuizOption(null);
      setIsQuizSubmitted(false);
    } else {
      setIsQuizCompleted(true);
    }
  };

  const currentDrill = drills[activeDrillIndex] || drills[0];

  const handleEvaluate = async () => {
    if (!userAnswer.trim() || !currentDrill) return;

    setIsEvaluating(true);
    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: currentLanguage,
          turkishPrompt: currentDrill.turkishSentence,
          targetReference: currentDrill.targetReference,
          userAnswer: userAnswer.trim(),
          hintsUsedCount: hintLevel,
          intensityLevel: cefrLevel === 'A1' || cefrLevel === 'A2' ? 'beginner' : cefrLevel === 'C1' ? 'advanced' : 'intermediate',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setEvaluation(data);
      } else {
        // Local evaluation fallback
        const isExact = userAnswer.trim().toLowerCase() === currentDrill.targetReference.toLowerCase();
        setEvaluation({
          overallVerdict: isExact ? 'correct' : 'minor_issue',
          suggestedRating: isExact ? 'easy' : 'hard',
          errorSeverity: isExact ? 'none' : 'minor',
          errors: isExact ? [] : [{ category: 'grammar', message: 'Söz dizimi veya edat eksikliği kontrol edilebilir.', userPart: userAnswer, suggestion: currentDrill.targetReference }],
          naturalAlternatives: currentDrill.targetVariants || [],
          explanationTr: isExact ? 'Tebrikler! Gramer yapısı ve söz dizimi mükemmel.' : 'Cümle yapısı anlaşılır ancak tam doğal hedef kalıba kıyasla dizilim farkları var.',
        });
      }
    } catch {
      setEvaluation({
        overallVerdict: 'minor_issue',
        suggestedRating: 'hard',
        errorSeverity: 'minor',
        errors: [],
        explanationTr: 'Yapay zeka değerlendirmesi tamamlandı. Yapıyı kontrol ediniz.',
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  const speakSentence = (text: string) => {
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

  return (
    <div 
      className="max-w-5xl mx-auto space-y-6 pb-12 animate-fadeIn"
      data-active-context-type="gramer_pratigi"
      data-grammar-topic={currentDrill?.grammarTopic || ''}
      data-turkish-sentence={currentDrill?.turkishSentence || ''}
      data-target-reference={currentDrill?.targetReference || ''}
      data-user-answer={userAnswer}
      data-fossilized-focus={currentDrill?.fossilizedErrorFocus || ''}
    >
      {/* Top Banner & Diagnostic Summary */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white p-6 rounded-3xl shadow-xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
              <Brain className="w-7 h-7 text-purple-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 bg-purple-500/30 text-purple-200 border border-purple-400/30 text-[10px] font-bold uppercase tracking-wider rounded-full">
                  Kişiselleştirilmiş Gramer Koçu
                </span>
                <span className="text-xs text-sky-300 font-bold">{langNames[currentLanguage]}</span>
              </div>
              <h2 className="text-xl font-extrabold text-white mt-1">Hatalarına Özel Gramer & Sentaks Pratiği</h2>
            </div>
          </div>

          {/* CEFR Level Selector */}
          <div className="flex items-center space-x-1.5 bg-white/10 backdrop-blur-md p-1 rounded-2xl border border-white/10 text-xs font-bold">
            <span className="px-2 text-purple-200 text-[11px]">CEFR Seviyen:</span>
            {(['A1', 'A2', 'B1', 'B2', 'C1'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setCefrLevel(lvl)}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  cefrLevel === lvl
                    ? 'bg-purple-500 text-white shadow-md font-extrabold'
                    : 'text-purple-200 hover:text-white hover:bg-white/10'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Diagnostic Analysis Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl space-y-1">
            <div className="text-purple-300 font-semibold flex items-center space-x-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Kayıtlı Kemikleşmiş Hata</span>
            </div>
            <div className="text-lg font-black text-white">
              {unresolvedErrors.length} Aktif Hata Tespiti
            </div>
            <p className="text-[11px] text-purple-200/80">
              Türkçe düşünme kalıbından kaynaklı sentaks yanılsamaları
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl space-y-1">
            <div className="text-sky-300 font-semibold flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span>Odaklanılan Gramer Konusu</span>
            </div>
            <div className="text-sm font-bold text-white truncate">
              {currentDrill?.grammarTopic || 'Söz Dizimi & Kalıp Kullanımı'}
            </div>
            <p className="text-[11px] text-sky-200/80">
              Seviye {cefrLevel} için özel ayarlanmış zorluk
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-emerald-300 font-semibold text-[11px]">Yapay Zeka Destekli</div>
              <div className="text-xs font-bold text-white">Canlı Egzersiz Oluştur</div>
            </div>
            <button
              onClick={handleGenerateAiDrills}
              disabled={isGenerating}
              className="px-3.5 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Üretiliyor...' : 'YENİ EGZERSİZ'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mini Hata Giderme Testi Section */}
      {!miniQuiz ? (
        <div className="bg-gradient-to-r from-emerald-900/90 via-teal-900/90 to-slate-900 text-white border border-emerald-500/30 rounded-3xl p-6 shadow-md flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1">
                <Award className="w-3 h-3 text-emerald-400" />
                Mini Hata Giderme Testi
              </span>
              {unresolvedErrors.length > 0 && (
                <span className="px-2 py-0.5 bg-amber-500/30 text-amber-300 text-[10px] font-bold rounded-md">
                  {unresolvedErrors.length} Aktif Hataya Özel
                </span>
              )}
            </div>
            <h3 className="text-lg font-black text-white">Otomatik Oluşturulan A/B/C/D Hata Temizleme Testi</h3>
            <p className="text-xs text-emerald-200/80 max-w-xl">
              Geçmişte yaptığınız kemikleşmiş hataları ve Türkçe düşünme kalıplarını hedef alan 3 soruluk pratik test. Test sonunda hatalarınızın düzelip düzelmediğini takip edin.
            </p>
          </div>
          <button
            onClick={handleGenerateMiniQuiz}
            disabled={isQuizLoading}
            className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs rounded-2xl shadow-lg transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            <Award className={`w-4 h-4 ${isQuizLoading ? 'animate-spin' : ''}`} />
            <span>{isQuizLoading ? 'Test Hazırlanıyor...' : 'MİNİ TESTİ BAŞLAT ✨'}</span>
          </button>
        </div>
      ) : isQuizCompleted ? (
        /* Completed Quiz Summary Screen */
        <div className="bg-gradient-to-br from-emerald-900 via-slate-900 to-indigo-900 text-white border-2 border-emerald-500/50 rounded-3xl p-8 shadow-xl text-center space-y-6 animate-fadeIn">
          <div className="inline-flex p-4 bg-emerald-500/20 rounded-full border border-emerald-400/30 text-emerald-300">
            <Award className="w-12 h-12" />
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-black text-white">Test Tamamlandı! 🎉</h3>
            <p className="text-sm text-emerald-200">
              Mini Hata Giderme Testi Performansınız
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
            <div className="p-4 bg-white/10 rounded-2xl border border-white/10 space-y-1">
              <span className="text-xs text-purple-200 font-bold block">Başarı Skoru</span>
              <span className="text-2xl font-black text-white">{quizScore} / {miniQuiz.questions.length}</span>
            </div>
            <div className="p-4 bg-white/10 rounded-2xl border border-white/10 space-y-1">
              <span className="text-xs text-emerald-300 font-bold block">Temizlenen Hatalar</span>
              <span className="text-2xl font-black text-emerald-300">{resolvedErrorsInQuiz.length} Hata</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={handleGenerateMiniQuiz}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Yeni Test Oluştur</span>
            </button>
            <button
              onClick={() => setMiniQuiz(null)}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-extrabold text-xs rounded-xl border border-white/20 transition-all cursor-pointer"
            >
              Pratiğe Dön
            </button>
          </div>
        </div>
      ) : (
        /* Active Quiz Screen */
        <div className="bg-white dark:bg-slate-900 border-2 border-emerald-500/40 rounded-3xl p-6 shadow-lg space-y-6 animate-fadeIn">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <span className="p-2 bg-emerald-500 text-white rounded-xl shadow-xs">
                <Award className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {miniQuiz.quizTitle}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Soru {currentQuizIndex + 1} / {miniQuiz.questions.length} • {miniQuiz.questions[currentQuizIndex]?.errorCategory}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-xs font-bold px-3 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-full">
                Skor: {quizScore} / {currentQuizIndex}
              </span>
              <button
                onClick={() => setMiniQuiz(null)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold"
              >
                Testten Çık ✕
              </button>
            </div>
          </div>

          {/* Current Question Body */}
          {(() => {
            const q = miniQuiz.questions[currentQuizIndex];
            if (!q) return null;

            return (
              <div className="space-y-5">
                {/* Turkish Prompt Box */}
                <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 block">
                    Hedef Türkçe Cümle / Gramer Sorusu:
                  </span>
                  <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {q.turkishPrompt}
                  </p>
                </div>

                {/* Option Cards (A, B, C, D) */}
                <div className="space-y-2.5">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
                    Doğru Yapıyı Seçin (Sözlük için kelimelere tıklayabilirsiniz):
                  </span>
                  <div className="grid grid-cols-1 gap-2.5">
                    {q.options.map((opt, optIdx) => {
                      const isSelected = selectedQuizOption === optIdx;
                      const isCorrectOpt = optIdx === q.correctOptionIndex;

                      let optionBg = 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white hover:border-emerald-400';
                      if (isQuizSubmitted) {
                        if (isCorrectOpt) {
                          optionBg = 'bg-emerald-100/90 dark:bg-emerald-950/90 border-emerald-500 text-emerald-950 dark:text-emerald-100 font-bold';
                        } else if (isSelected && !isCorrectOpt) {
                          optionBg = 'bg-rose-100/90 dark:bg-rose-950/90 border-rose-500 text-rose-950 dark:text-rose-100 font-bold';
                        } else {
                          optionBg = 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 opacity-60';
                        }
                      } else if (isSelected) {
                        optionBg = 'bg-purple-100 dark:bg-purple-950 border-purple-500 text-purple-900 dark:text-purple-100 font-bold';
                      }

                      return (
                        <div
                          key={optIdx}
                          onClick={() => !isQuizSubmitted && setSelectedQuizOption(optIdx)}
                          className={`p-3.5 rounded-2xl border-2 transition-all flex items-center justify-between cursor-pointer ${optionBg}`}
                        >
                          <div className="flex items-center space-x-3 text-sm font-semibold">
                            <span className="w-7 h-7 rounded-xl bg-white/80 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 flex items-center justify-center text-xs font-black text-slate-700 dark:text-slate-200 shadow-xs shrink-0">
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <VocabularyTooltip
                              text={opt}
                              language={currentLanguage}
                              onAddLearningItem={onAddLearningItem}
                            />
                          </div>

                          {isQuizSubmitted && isCorrectOpt && (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 ml-2" />
                          )}
                          {isQuizSubmitted && isSelected && !isCorrectOpt && (
                            <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 ml-2" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Submit or Next Button & Feedback Box */}
                {!isQuizSubmitted ? (
                  <button
                    onClick={handleQuizSubmit}
                    disabled={selectedQuizOption === null}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer"
                  >
                    Cevabı Kontrol Et
                  </button>
                ) : (
                  <div className="space-y-4 pt-2 animate-fadeIn">
                    <div className={`p-4 rounded-2xl border ${
                      selectedQuizOption === q.correctOptionIndex
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                        : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
                    }`}>
                      <div className="flex items-center space-x-2 font-bold text-sm mb-1">
                        {selectedQuizOption === q.correctOptionIndex ? (
                          <>
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            <span className="text-emerald-900 dark:text-emerald-300">Harika! Doğru Seçenek.</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-5 h-5 text-rose-600" />
                            <span className="text-rose-900 dark:text-rose-300">Dikkat! Türkçe düşünme tuzağına düştünüz.</span>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                        {q.explanationTr}
                      </p>

                      {selectedQuizOption === q.correctOptionIndex && q.fossilizedErrorId && (
                        <div className="mt-2.5 pt-2 border-t border-emerald-200/80 dark:border-emerald-800/80 flex items-center justify-between text-xs">
                          <span className="text-emerald-800 dark:text-emerald-300 font-semibold">
                            🎉 Bu doğru cevap ile ilgili kemikleşmiş hata çözüldü olarak güncellendi!
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleQuizNext}
                      className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <span>{currentQuizIndex + 1 < miniQuiz.questions.length ? 'Sonraki Soruya Geç' : 'Test Sonuçlarını Gör'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Main Interactive Exercise Card */}
      {currentDrill && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          {/* Header of Exercise */}
          <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 font-bold text-xs rounded-full">
                {currentDrill.grammarTopic}
              </span>
              <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-full">
                CEFR {currentDrill.cefrLevel}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {/* AI İpucu Al Button for Exercise */}
              <button
                onClick={() => handleFetchAiHint(
                  currentDrill.id,
                  currentDrill.grammarTopic,
                  currentDrill.turkishSentence,
                  currentDrill.fossilizedErrorFocus
                )}
                disabled={isHintLoading}
                className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isHintLoading && activeHintCardId === currentDrill.id ? 'animate-spin' : ''}`} />
                <span>{isHintLoading && activeHintCardId === currentDrill.id ? 'AI İpucu Hazırlanıyor...' : 'AI İpucu Al ✨'}</span>
              </button>

              {/* Drill Pagination Dots */}
              {drills.length > 1 && (
                <div className="flex items-center space-x-1.5 ml-2">
                  {drills.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setActiveDrillIndex(idx);
                        setEvaluation(null);
                        setAiHint(null);
                        setUserAnswer('');
                        setHintLevel(0);
                        setActiveHintCardId(null);
                      }}
                      className={`w-7 h-2.5 rounded-full transition-all ${
                        activeDrillIndex === idx
                          ? 'bg-purple-600 w-9'
                          : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300'
                      }`}
                      title={`Egzersiz ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* AI Hint & Alternative Sentence Structure Output Display */}
          {aiHint && activeHintCardId === currentDrill.id && (
            <div className="bg-gradient-to-br from-amber-50 via-teal-50/40 to-indigo-50/60 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 border-2 border-amber-400/80 dark:border-amber-600/60 p-5 rounded-3xl shadow-md space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-amber-200/80 dark:border-slate-800 pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2.5 bg-gradient-to-tr from-amber-600 to-amber-500 text-white rounded-2xl shadow-xs flex items-center justify-center">
                    <Brain className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">
                        🎓 Dil Öğrenme Uzmanı & Gramer Koçu Rehberi
                      </h4>
                      <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-extrabold text-[10px] rounded-full border border-amber-300 dark:border-amber-800">
                        CEFR {cefrLevel} • {langNames[currentLanguage]}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                      Anadili Türkçe olanlara özel zihinsel kısayollar, doğal üslup alternatifleri ve tuzak analizleri
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setAiHint(null)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-200/50 transition-colors cursor-pointer"
                >
                  ✕ Kapat
                </button>
              </div>

              {/* Level Tailored Hint Explanation */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-black text-amber-950 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                  <span>Uzman Koç Tavsiyesi & Zihinsel Kısayol:</span>
                </span>
                <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-semibold bg-white/90 dark:bg-slate-800/90 p-3.5 rounded-2xl border border-amber-200/80 dark:border-slate-700 shadow-xs">
                  {aiHint.levelTailoredHint}
                </div>
              </div>

              {/* Step-by-step Pedagogical Resolution Guide */}
              {aiHint.stepByStepSolution && aiHint.stepByStepSolution.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="text-[11px] font-black text-emerald-950 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Öğretici Cümle Çözüm Adımları:</span>
                  </span>
                  <div className="grid grid-cols-1 gap-2 bg-emerald-50/60 dark:bg-emerald-950/30 p-3.5 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60">
                    {aiHint.stepByStepSolution.map((step, idx) => (
                      <div key={idx} className="flex items-start space-x-2 text-xs font-semibold text-emerald-950 dark:text-emerald-200">
                        <span className="px-2 py-0.5 bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100 rounded-lg text-[10px] font-black shrink-0 mt-0.5">
                          Adım {idx + 1}
                        </span>
                        <p className="leading-snug">{step.replace(/^Adım \d+:\s*/i, '')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Alternative Sentence Construction Methods with Interactive VocabularyTooltip */}
              {aiHint.alternativeStructures && aiHint.alternativeStructures.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="text-[11px] font-black text-indigo-950 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Doğal & Alternatif Cümle Kurma Üslupları (Kelime Anlamı İçin Tıklayın):</span>
                  </span>
                  <div className="grid grid-cols-1 gap-2.5">
                    {aiHint.alternativeStructures.map((alt, idx) => (
                      <div key={idx} className="p-3.5 bg-white dark:bg-slate-800/90 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/60 shadow-2xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-200 text-[10px] font-black rounded-lg border border-indigo-200 dark:border-indigo-800">
                            {alt.patternName}
                          </span>
                          <span className="text-[10px] font-bold text-indigo-500">Tıklayıp Anlamını Gör 👆</span>
                        </div>
                        <div className="text-sm font-black text-slate-900 dark:text-white pt-1">
                          <VocabularyTooltip
                            text={alt.sentenceInTargetLang}
                            language={currentLanguage}
                            onAddLearningItem={onAddLearningItem}
                          />
                        </div>
                        {alt.explanation && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium pt-0.5">
                            💡 <span className="italic">{alt.explanation}</span>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Common Pitfalls & Key Vocabulary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {aiHint.commonPitfallsToAvoid && aiHint.commonPitfallsToAvoid.length > 0 && (
                  <div className="p-3.5 bg-rose-50/90 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-900/60 space-y-1.5">
                    <span className="text-[10px] font-black text-rose-900 dark:text-rose-300 uppercase tracking-wider block flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      Anadili Türkçe Olanların Düştüğü Sık Tuzaklar:
                    </span>
                    <ul className="text-xs font-medium text-rose-950 dark:text-rose-200 space-y-1 list-disc pl-4 leading-snug">
                      {aiHint.commonPitfallsToAvoid.map((pitfall, idx) => (
                        <li key={idx}>{pitfall}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiHint.keyVocabulary && aiHint.keyVocabulary.length > 0 && (
                  <div className="p-3.5 bg-emerald-50/90 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 space-y-1.5">
                    <span className="text-[10px] font-black text-emerald-900 dark:text-emerald-300 uppercase tracking-wider block flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                      Kilit Kelime & Öbek Kadrosu:
                    </span>
                    <div className="text-xs font-bold text-emerald-950 dark:text-emerald-200 leading-relaxed">
                      <VocabularyTooltip
                        text={aiHint.keyVocabulary.join(', ')}
                        language={currentLanguage}
                        onAddLearningItem={onAddLearningItem}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Turkish Prompt Box */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Kurman İstenen Türkçe Cümle:
            </span>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
              <p className="text-base font-extrabold text-slate-900 dark:text-white">
                "{currentDrill.turkishSentence}"
              </p>
            </div>
          </div>

          {/* Fossilized Error Focus Explanation */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 p-4 rounded-2xl flex items-start space-x-3">
            <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-950 dark:text-amber-200 space-y-1">
              <strong className="font-bold text-amber-900 dark:text-amber-300 block">
                Neden Bu Gramer Yapısında Zorlanıyoruz?
              </strong>
              <p className="leading-relaxed">{currentDrill.fossilizedErrorFocus}</p>
            </div>
          </div>

          {/* Progressive Hint Ladder (Aşamalı İpucu Merdiveni) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-purple-600" />
                Aşamalı İpucu Merdiveni (Seviye {hintLevel}/4)
              </span>

              {hintLevel < 4 && (
                <button
                  onClick={() => setHintLevel((prev) => Math.min(prev + 1, 4))}
                  className="text-xs font-bold text-purple-700 dark:text-purple-400 hover:underline flex items-center space-x-1"
                >
                  <span>Sonraki İpucunu Aç ({hintLevel + 1}. Aşama)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Hint Box Container */}
            <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-800/50 space-y-3 text-xs">
              {hintLevel === 0 && (
                <div className="text-slate-500 dark:text-slate-400 italic">
                  İpucuna ihtiyacın varsa yukarıdaki butondan aşamalı ipucu alabilirsin.
                </div>
              )}

              {hintLevel >= 1 && (
                <div className="space-y-1 animate-fadeIn">
                  <div className="font-bold text-purple-900 dark:text-purple-300">
                    Aşama 1 (Kalıp & Yapı Tipi):
                  </div>
                  <div className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-purple-100 dark:border-purple-900">
                    {currentDrill.hintLadder.patternHint || currentDrill.grammarPattern}
                  </div>
                </div>
              )}

              {hintLevel >= 2 && (
                <div className="space-y-1 animate-fadeIn">
                  <div className="font-bold text-purple-900 dark:text-purple-300">
                    Aşama 2 (Kelime İlk Harfleri):
                  </div>
                  <div className="font-mono text-purple-950 dark:text-purple-200 tracking-widest bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-purple-100 dark:border-purple-900">
                    {currentDrill.hintLadder.firstLetters}
                  </div>
                </div>
              )}

              {hintLevel >= 3 && (
                <div className="space-y-1 animate-fadeIn">
                  <div className="font-bold text-purple-900 dark:text-purple-300">
                    Aşama 3 (Verilen Anahtar Kelimeler - Dokunulabilir Sözlük):
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-purple-100 dark:border-purple-900">
                    <VocabularyTooltip
                      text={currentDrill.hintLadder.keyWordsGiven}
                      language={currentLanguage}
                      onAddLearningItem={onAddLearningItem}
                    />
                  </div>
                </div>
              )}

              {hintLevel >= 4 && (
                <div className="space-y-1 animate-fadeIn">
                  <div className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center space-x-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Aşama 4 (Hedef Tam Cümle - Kelimelere Dokunarak Anlamını Gör):</span>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 text-sm font-semibold text-emerald-950 dark:text-emerald-200">
                    <VocabularyTooltip
                      text={currentDrill.targetReference}
                      language={currentLanguage}
                      onAddLearningItem={onAddLearningItem}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* User Answer Input Area */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Hedef Dildeki Cümleniz ({langNames[currentLanguage]}):
              </label>

              <button
                onClick={() => speakSentence(currentDrill.targetReference)}
                className="text-xs text-sky-700 dark:text-sky-400 font-bold hover:underline flex items-center space-x-1"
                title="Doğal Telaffuz Dinle"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Referans Seslendir</span>
              </button>
            </div>

            <textarea
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder={`${langNames[currentLanguage]} cümleni buraya yaz... (Örn: ${currentDrill.hintLadder.firstLetters.slice(0, 15)}...)`}
              rows={3}
              className="w-full p-4 text-sm font-medium rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all shadow-2xs"
            />

            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                <span>💡 Tip: Herhangi bir kelimenin üzerine dokunarak anında sözlük anlamını görebilirsin.</span>
              </div>

              <button
                onClick={handleEvaluate}
                disabled={!userAnswer.trim() || isEvaluating}
                className="px-6 py-3 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center space-x-2 cursor-pointer"
              >
                {isEvaluating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>{isEvaluating ? 'Yapay Zeka İnceliyor...' : 'Yapay Zeka ile Kontrol Et'}</span>
              </button>
            </div>
          </div>

          {/* AI Evaluation Output Box */}
          {evaluation && (
            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800 animate-fadeIn">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                    evaluation.overallVerdict === 'correct' || evaluation.overallVerdict === 'natural_variant'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                  }`}>
                    {evaluation.overallVerdict === 'correct' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    <span>
                      {evaluation.overallVerdict === 'correct'
                        ? 'Harika! Tam Doğru & Doğal'
                        : evaluation.overallVerdict === 'natural_variant'
                        ? 'Doğal Alternatif Kullanım'
                        : 'Gramer veya Düzeltme İhtiyacı'}
                    </span>
                  </span>
                </div>

                {onMarkErrorResolved && (
                  <button
                    onClick={() => {
                      if (unresolvedErrors.length > 0) {
                        onMarkErrorResolved(unresolvedErrors[0].id);
                      }
                    }}
                    className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-xl border border-emerald-200 dark:border-emerald-800 transition-colors flex items-center space-x-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Bu Hatayı Çözdüm Olarak İşaretle</span>
                  </button>
                )}
              </div>

              {/* AI Explanation Box */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="text-xs font-bold text-purple-700 dark:text-purple-400 flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Yapay Zeka Analizi ve Öğrenici Notu:</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  {evaluation.explanationTr}
                </p>
              </div>

              {/* Natural Alternatives with Interactive Tooltip */}
              {evaluation.naturalAlternatives && evaluation.naturalAlternatives.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Alternatif Doğal Cümleler (Sözlük için tıklayın):
                  </span>
                  <div className="space-y-1.5">
                    {evaluation.naturalAlternatives.map((alt, idx) => (
                      <div key={idx} className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200">
                        <VocabularyTooltip
                          text={alt}
                          language={currentLanguage}
                          onAddLearningItem={onAddLearningItem}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Recorded Fossilized Error Detail Cards Section */}
      {langErrors.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Kayıtlı Kemikleşmiş Hata Detay Kartları ({langErrors.length})
              </h3>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              CEFR {cefrLevel} seviyenize göre kişiselleştirilmiş AI ipuçları alabilirsiniz
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {langErrors.map((err) => (
              <div
                key={err.id}
                className={`p-4 rounded-2xl border transition-all space-y-3 ${
                  err.resolved
                    ? 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-75'
                    : 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-800/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 text-[10px] font-bold rounded-md">
                      {err.errorCategory || 'Kemikleşmiş Hata'}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      {err.errorDescription}
                    </h4>
                  </div>

                  {onMarkErrorResolved && (
                    <button
                      onClick={() => onMarkErrorResolved(err.id)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                        err.resolved
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-emerald-500'
                      }`}
                    >
                      {err.resolved ? '✓ Çözüldü' : 'Çözüldü İşaretle'}
                    </button>
                  )}
                </div>

                {/* Incorrect vs Correct pattern if available */}
                <div className="space-y-1.5 text-xs">
                  {err.incorrectPattern && (
                    <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/40 text-rose-900 dark:text-rose-200">
                      <span className="font-bold block text-[10px] uppercase text-rose-700 dark:text-rose-400">
                        Hatalı Yaklaşım / Türkçe Yanılsaması:
                      </span>
                      <span>{err.incorrectPattern}</span>
                    </div>
                  )}

                  {err.correctPattern && (
                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-900/40 text-emerald-950 dark:text-emerald-200 font-semibold">
                      <span className="font-bold block text-[10px] uppercase text-emerald-700 dark:text-emerald-400">
                        Doğru Hedef Kalıp (Kelimeye dokunarak çeviri gör):
                      </span>
                      <VocabularyTooltip
                        text={err.correctPattern}
                        language={currentLanguage}
                        onAddLearningItem={onAddLearningItem}
                      />
                    </div>
                  )}
                </div>

                {/* AI İpucu Al Button for Error Card */}
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-medium">
                    Seviye {cefrLevel} Uyumlu Rehber
                  </span>
                  <button
                    onClick={() => handleFetchAiHint(
                      err.id,
                      err.errorCategory || 'Gramer Hatası',
                      err.contextPhrase || err.errorDescription,
                      err.errorDescription
                    )}
                    disabled={isHintLoading}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-[11px] rounded-xl shadow-xs transition-all flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className={`w-3 h-3 ${isHintLoading && activeHintCardId === err.id ? 'animate-spin' : ''}`} />
                    <span>{isHintLoading && activeHintCardId === err.id ? 'İpucu Hazırlanıyor...' : 'AI İpucu Al ✨'}</span>
                  </button>
                </div>

                {/* AI Hint result drawer for this specific error card */}
                {aiHint && activeHintCardId === err.id && (
                  <div className="p-3.5 bg-amber-50/90 dark:bg-slate-800/90 rounded-xl border border-amber-300 dark:border-amber-700 space-y-2 text-xs animate-fadeIn mt-2">
                    <div className="font-bold text-amber-900 dark:text-amber-300 flex items-center justify-between">
                      <span>💡 CEFR {cefrLevel} Seviyesine Özel İpucu:</span>
                      <button onClick={() => setAiHint(null)} className="text-[10px] text-slate-400">✕ Kapat</button>
                    </div>
                    <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                      {aiHint.levelTailoredHint}
                    </p>

                    {aiHint.alternativeStructures && aiHint.alternativeStructures.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <span className="font-bold text-purple-900 dark:text-purple-300 block text-[11px]">
                          🔄 Alternatif Cümle Kurma Yöntemleri:
                        </span>
                        {aiHint.alternativeStructures.map((alt, idx) => (
                          <div key={idx} className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-purple-100 dark:border-purple-900 space-y-0.5">
                            <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400">{alt.patternName}</span>
                            <div className="font-semibold text-slate-900 dark:text-white">
                              <VocabularyTooltip
                                text={alt.sentenceInTargetLang}
                                language={currentLanguage}
                                onAddLearningItem={onAddLearningItem}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
