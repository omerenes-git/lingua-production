export type TargetLanguage = 'en' | 'de' | 'sr';

export type Domain = 'clinical' | 'general' | 'travel' | 'ielts' | 'social' | 'family';

export type IntensityLevel = 'beginner' | 'intermediate' | 'advanced';

export type MasteryState = 
  | 'new'                      // Henüz karşılaşılmadı
  | 'noticed'                  // Anlamına bakıldı
  | 'recognized_in_context'    // Bağlamda tanındı
  | 'hint_producible'          // İpucuyla üretildi
  | 'independently_producible' // Bağımsız üretildi
  | 'mastered';                // Kalıcı hâkimiyet (Çoklu bağlam + FSRS)

export type ErrorSeverity = 'critical' | 'moderate' | 'minor' | 'style_only' | 'none';

export type FSRSRating = 'again' | 'hard' | 'good' | 'easy';

export type ConfidenceLevel = 'certain' | 'partially_certain' | 'uncertain' | 'random';

export interface ProductionPrompt {
  id: string;
  language: TargetLanguage;
  domain: Domain;
  intensityLevel?: IntensityLevel;
  turkishSentence: string;
  targetReference: string;
  targetVariants: string[];
  keyTerms: string[]; // e.g. ["flexion", "range of motion"]
  grammarPattern?: string;
  hintLadder: {
    partOfSpeech: string;       // Level 1
    firstLetters: string;      // Level 2
    partialWords: string;      // Level 3
    patternHint: string;        // Level 4
    keyWordsGiven: string;      // Level 5
    fullAnswer: string;         // Level 6
  };
}

export interface AIEvaluationResult {
  overallVerdict: 'correct' | 'natural_variant' | 'minor_issue' | 'major_issue' | 'incorrect';
  suggestedRating: FSRSRating;
  errorSeverity: ErrorSeverity;
  errors: Array<{
    category: 'grammar' | 'vocabulary' | 'word_order' | 'style' | 'spelling';
    message: string;
    userPart?: string;
    suggestion?: string;
  }>;
  naturalAlternatives: string[];
  explanationTr: string;
  selfCorrectionPrompt?: string; // "Bu cevapta edat kullanımına dikkat edip tekrar dene..."
}

export interface ProductionAttempt {
  id: string;
  promptId: string;
  language: TargetLanguage;
  userAnswer: string;
  hintsUsedCount: number;
  maxHintLevel: number;
  confidence: ConfidenceLevel;
  responseTimeMs: number;
  evaluation: AIEvaluationResult;
  finalRating: FSRSRating;
  isFossilizedError: boolean;
  createdAt: string;
}

export interface LearningItem {
  id: string;
  language: TargetLanguage;
  domain: Domain;
  turkishText: string;
  targetText: string;
  keyTermOrPattern: string;
  masteryState: MasteryState;
  isActiveVocabulary: boolean; // hint_producible+ -> true
  contextCount: number;        // Kaç farklı bağlamda üretildi
  nextReviewDate: string;      // ISO string
  stability: number;
  difficulty: number;
  lastRating?: FSRSRating;
  fossilizedCount: number;     // Emin + yanlış sayısı
}

export interface FossilizedError {
  id: string;
  language: TargetLanguage;
  domain: Domain;
  turkishPrompt: string;
  userAnswer: string;
  correctReference: string;
  errorDescription: string;
  confidence: ConfidenceLevel;
  date: string;
  resolved: boolean;
}

export interface RegisterOption {
  register: 'natural' | 'formal' | 'clinical' | 'simple';
  titleTr: string;
  textTarget: string;
  explanationTr: string;
}

export interface Persona {
  id: string;
  name: string;
  roleTr: string;
  avatarUrl?: string;
  languages: TargetLanguage[];
  descriptionTr: string;
  greetingTr: string;
  greetingTarget: Record<TargetLanguage, string>;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'persona';
  text: string;
  translationTr?: string;
  grammarCorrection?: string;
  timestamp: string;
}

export interface StorySentence {
  targetText: string;
  turkishText: string;
  vocabulary: Array<{
    term: string;
    meaningTr: string;
    isKey: boolean;
  }>;
}

export interface AdaptiveStory {
  id: string;
  titleTarget: string;
  titleTr: string;
  language: TargetLanguage;
  domain: Domain;
  level: string; // e.g. "B1-B2 Clinical"
  sentences: StorySentence[];
  summaryTr: string;
}
