import { AIEvaluationResult, IntensityLevel, RegisterOption, TargetLanguage } from '../types';

export interface EvaluateRequest {
  language: TargetLanguage;
  turkishPrompt: string;
  targetReference: string;
  userAnswer: string;
  hintsUsedCount: number;
  intensityLevel?: IntensityLevel;
}

export async function evaluateProduction(req: EvaluateRequest): Promise<AIEvaluationResult> {
  try {
    const res = await fetch('/api/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend evaluation call failed, falling back to local evaluator:', err);
  }

  // Fallback heuristic evaluation
  return fallbackEvaluate(req);
}

export async function fetchHowDoISay(turkishText: string, language: TargetLanguage): Promise<RegisterOption[]> {
  try {
    const res = await fetch('/api/how-do-i-say', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ turkishText, language }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.options;
    }
  } catch (err) {
    console.warn('Backend how-do-i-say call failed, falling back to local generator:', err);
  }

  return fallbackHowDoISay(turkishText, language);
}

export async function sendChatMessage(
  personaId: string,
  language: TargetLanguage,
  history: Array<{ sender: 'user' | 'persona'; text: string }>,
  newUserMessage: string,
  customSystemInstruction?: string,
  modelPreference?: string
): Promise<{ text: string; translationTr: string; grammarCorrection?: string }> {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personaId,
        language,
        history,
        newUserMessage,
        customSystemInstruction,
        modelPreference,
      }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend chat call failed, falling back to local persona response:', err);
  }

  return fallbackChat(personaId, language, newUserMessage);
}

// Client-side fallback heuristics when server API is offline or without key
function fallbackEvaluate(req: EvaluateRequest): AIEvaluationResult {
  const normUser = req.userAnswer.trim().toLowerCase().replace(/[.,!?:;]/g, '');
  const normTarget = req.targetReference.trim().toLowerCase().replace(/[.,!?:;]/g, '');

  const userWords = new Set(normUser.split(/\s+/));
  const targetWords = normTarget.split(/\s+/);

  let matchCount = 0;
  for (const tw of targetWords) {
    if (userWords.has(tw)) matchCount++;
  }

  const ratio = targetWords.length > 0 ? matchCount / targetWords.length : 0;

  const langPraiseMap: Record<TargetLanguage, string> = {
    de: 'Tebrikler! Almanca cümleniz son derece akıcı ve V2 dizilimine tam uygun. Mükemmel bir üretim!',
    sr: 'Bravo! Sırpça cümleniz çok doğal ve gramer dizilimi harika. Harika iş çıkardınız!',
    en: 'Tebrikler! Cümleniz dilbilgisi, anlam ve kelime seçimi açısından eksiksiz ve doğal.'
  };

  const langMinorIssueTip: Record<TargetLanguage, string> = {
    de: '🎓 Uzman İpucu (Almanca): Ana düşünceniz çok net anlaşıldı! Almancada başlangıç seviyesinde "weil/wenn" gibi yan cümle karmaşasına girmeden V2 kuralına uygun kısa, yalın cümlelerle ilerlemek özgüven kazandırır.',
    sr: '🎓 Uzman İpucu (Sırpça): Harika bir çaba! Sırpçada ilk aşamada karmaşık bağlaçlı cümleler yerine "Molim vas...", "Zdravo, ja sam..." gibi bağlaçsız, yalın günlük cümleler kurmak zihninde akıcılığı hızlandırır.',
    en: '🎓 Uzman İpucu (İngilizce): Cümleniz gayet güzel anlaşıldı. İngilizcede edat bağlantılarına ve Özne+Fiil+Nesne dizilimine dikkat ederek daha da doğal olabilirsiniz.'
  };

  if (normUser === normTarget || ratio >= 0.9) {
    return {
      overallVerdict: 'correct',
      suggestedRating: 'easy',
      errorSeverity: 'none',
      errors: [],
      naturalAlternatives: [req.targetReference],
      explanationTr: langPraiseMap[req.language] || langPraiseMap.en,
    };
  }

  if (ratio >= 0.7) {
    return {
      overallVerdict: 'natural_variant',
      suggestedRating: 'good',
      errorSeverity: 'minor',
      errors: [
        {
          category: 'style',
          message: 'Anlamınız tamamen anlaşılır ve doğru! Küçük bir üslup veya dizilim dokunuşuyla daha da doğal olabilir.',
          suggestion: req.targetReference
        }
      ],
      naturalAlternatives: [req.targetReference],
      explanationTr: 'Güzel bir üretim! Cümleniz anlaşılıyor; günlük konuşmada kullanılan alternatif dizilimi de inceleyebilirsiniz.',
    };
  }

  if (ratio >= 0.4) {
    return {
      overallVerdict: 'minor_issue',
      suggestedRating: 'hard',
      errorSeverity: 'moderate',
      errors: [
        {
          category: 'grammar',
          message: 'Hata yapmak dil öğreniminin en doğal parçasıdır. Kelime sırası veya ek kullanımında küçük bir düzeltme gerekiyor.',
          userPart: req.userAnswer,
          suggestion: req.targetReference
        }
      ],
      naturalAlternatives: [req.targetReference],
      explanationTr: langMinorIssueTip[req.language] || langMinorIssueTip.en,
      selfCorrectionPrompt: 'Cümleyi referansa bakarak yalın ve doğru biçimde yeniden yazmayı dene.'
    };
  }

  return {
    overallVerdict: 'incorrect',
    suggestedRating: 'again',
    errorSeverity: 'critical',
    errors: [
      {
        category: 'vocabulary',
        message: 'Endişelenmeyin, bu kuralı pekiştirmek için harika bir fırsat! Doğru kelimeleri adım adım oturtacağız.',
        userPart: req.userAnswer,
        suggestion: req.targetReference
      }
    ],
    naturalAlternatives: [req.targetReference],
    explanationTr: `🎓 Uzman Koç Notu: Bu aşamada karmaşık yapılar kurmak yerine hedef dildeki (${req.language.toUpperCase()}) en temel kelime öbeğiyle başlamak zihinsel yükünü hafifletir.`,
    selfCorrectionPrompt: 'Aşağıdaki ipucu merdiveninden faydalanarak doğru cümleyi tekrar inşa et.'
  };
}

function fallbackHowDoISay(turkishText: string, language: TargetLanguage): RegisterOption[] {
  if (language === 'de') {
    return [
      {
        register: 'natural',
        titleTr: 'Doğal / Gündelik (Standart Almanca)',
        textTarget: `Halten Sie beim Exercising nicht den Atem an, sondern atmen Sie langsam aus. (${turkishText})`,
        explanationTr: 'Almancada klinik ve egzersiz anlatımlarında yaygın doğrudan Sie-Form emri.'
      },
      {
        register: 'clinical',
        titleTr: 'Klinik / Tıbbi Anlatım',
        textTarget: 'Während der Durchführung der Übungen ist das Anhalten der Atmung zu vermeiden; atmen Sie kontrolliert aus.',
        explanationTr: 'Tıbbi raporda veya fizyoterapi anlatımında tercih edilen formal yapı.'
      }
    ];
  }

  if (language === 'sr') {
    return [
      {
        register: 'natural',
        titleTr: 'Doğal / Samimi (Sırpça)',
        textTarget: `Nemojte zadržavati dah tokom vežbanja, polako izdišite. (${turkishText})`,
        explanationTr: 'Gündelik hayatta ve aile ortamında en rahat kullanılan yapı.'
      }
    ];
  }

  // Default English
  return [
    {
      register: 'natural',
      titleTr: 'Doğal & Akıcı (Gündelik/Klinik)',
      textTarget: `Do not hold your breath during exercise; breathe out slowly. (${turkishText})`,
      explanationTr: 'Hasta eğitiminde en net ve anlaşılır doğrudan talimat biçimi.'
    },
    {
      register: 'clinical',
      titleTr: 'Resmî / Klinik Terminoloji',
      textTarget: 'Avoid breath-holding during therapeutic exertion; maintain a slow and controlled exhalation.',
      explanationTr: 'Klinik raporlarda ve vaka tartışmalarında kullanılan akademik ifade.'
    },
    {
      register: 'simple',
      titleTr: 'Basit / A1-A2 Düzeyi',
      textTarget: 'Don’t hold your breath. Breathe slowly.',
      explanationTr: 'Kısa ve doğrudan komut.'
    }
  ];
}

function fallbackChat(
  personaId: string,
  language: TargetLanguage,
  userMsg: string
): { text: string; translationTr: string; grammarCorrection?: string } {
  if (language === 'de') {
    return {
      text: 'Das ist ein sehr wichtiger Punkt in der Physiotherapie! Können Sie mir mehr über die Symptome des Patienten erzählen?',
      translationTr: 'Fizyoterapide bu çok önemli bir nokta! Bana hastanın semptomları hakkında daha fazla bilgi verebilir misiniz?',
      grammarCorrection: userMsg.toLowerCase().includes('ich') ? undefined : 'Tipp: Denken Sie an die Großschreibung von Substantiven im Deutschen.'
    };
  }
  if (language === 'sr') {
    return {
      text: 'Odlično rečeno! Drago mi je da razgovaramo o tome. Kako je prošao vaš dan na poslu?',
      translationTr: 'Çok güzel söylendi! Bunu konuştuğumuza sevindim. İşteki gününüz nasıl geçti?',
    };
  }
  return {
    text: 'That is a very relevant clinical observation! How did the patient respond when you applied the mobilization technique?',
    translationTr: 'Bu çok ilgili bir klinik gözlem! Mobilizasyon tekniğini uyguladığınızda hasta nasıl tepki verdi?',
    grammarCorrection: userMsg.length > 5 && !userMsg.endsWith('.') && !userMsg.endsWith('?') ? 'Pro tip: Remember to conclude your clinical notes with punctuation.' : undefined
  };
}
