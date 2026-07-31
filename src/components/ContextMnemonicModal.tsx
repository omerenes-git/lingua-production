import React, { useState } from 'react';
import { TargetLanguage } from '../types';
import { 
  X, 
  Brain, 
  Sparkles, 
  Volume2, 
  Layers, 
  GitFork, 
  BookOpen, 
  Image as ImageIcon, 
  Check, 
  ArrowRight,
  Zap,
  Lightbulb
} from 'lucide-react';

interface ContextMnemonicModalProps {
  isOpen: boolean;
  onClose: () => void;
  wordOrPhrase: string;
  language: TargetLanguage;
  contextSentence?: string;
}

// Memory mnemonics & collocation dictionary mock helper for top terms
const MNEMONIC_DATABASE: Record<string, {
  phonetic: string;
  mnemonicTr: string;
  visualConcept: string;
  visualEmoji: string;
  collocations: { category: string; terms: string[] }[];
  contextExamples: { domain: string; sentence: string; translationTr: string }[];
}> = {
  default: {
    phonetic: '/kənˈtekst/ /fɹeɪz/',
    mnemonicTr: 'Bu kelimeyi zihninizde ana eylemi ve hissettirdiği nesneyi birleştirerek görselleştirin.',
    visualConcept: 'Zihinsel Çağrışım Kancası',
    visualEmoji: '🧠⚡',
    collocations: [
      { category: 'Sık Kullanılan Fiiller', terms: ['apply', 'assess', 'increase', 'reduce'] },
      { category: 'Niteleyici Sıfatlar', terms: ['acute', 'gradual', 'clinical', 'essential'] },
      { category: 'Bağlantılı Edatlar', terms: ['during', 'in context of', 'related to'] }
    ],
    contextExamples: [
      { domain: 'Klinik / Tıbbi', sentence: 'Assess the patient for any signs of acute discomfort.', translationTr: 'Hastayı herhangi bir akut rahatsızlık belirtisi açısından değerlendirin.' },
      { domain: 'Günlük Yaşam', sentence: 'Take a short break if you feel gradual fatigue.', translationTr: 'Kademeli bir yorgunluk hissederseniz kısa bir ara verin.' },
      { domain: 'Akademik / IELTS', sentence: 'This concept plays an essential role in modern practice.', translationTr: 'Bu kavram modern uygulamada temel bir rol oynar.' }
    ]
  },
  pain: {
    phonetic: '/peɪn/',
    mnemonicTr: 'PAIN -> "P-A-I-N" -> Physical Ailment In Nerves (Sinirlerdeki Fiziksel Sızı). Zihninde kırmızı bir uyarı şimşeği canlandır.',
    visualConcept: 'Kırmızı Uyarı Sinyali & Şimşek',
    visualEmoji: '⚡🩺',
    collocations: [
      { category: 'Sık Kullanılan Fiiller', terms: ['relieve pain', 'exacerbate pain', 'radiate pain', 'manage pain'] },
      { category: 'Sıfat Kombinasyonları', terms: ['sharp pain', 'dull pain', 'chronic pain', 'radiating pain'] },
      { category: 'Edatlı Kalıplar', terms: ['pain in shoulder', 'pain upon movement', 'pain scale'] }
    ],
    contextExamples: [
      { domain: 'Klinik', sentence: 'The patient reported sharp pain radiating down the arm.', translationTr: 'Hasta koluna yayılan keskin bir ağrı bildirdi.' },
      { domain: 'Günlük', sentence: 'I felt a sudden pain in my knee during the run.', translationTr: 'Koşu sırasında dizimde ani bir ağrı hissettim.' }
    ]
  },
  flexion: {
    phonetic: '/ˈflek.ʃən/',
    mnemonicTr: 'FLEXION -> "FLEX" (Kası sıkmak, bükmek). Dirseğinizi veya dizinizi bükerek açı daraltma hareketini zihninizde bükülen bir yay ile eşleştirin.',
    visualConcept: 'Bükülen Esnek Eklem Yayı',
    visualEmoji: '🦾📐',
    collocations: [
      { category: 'Eylem Fiilleri', terms: ['perform flexion', 'limit flexion', 'restore range of flexion'] },
      { category: 'Anatomik Bağlam', terms: ['knee flexion', 'hip flexion', 'cervical flexion'] }
    ],
    contextExamples: [
      { domain: 'Klinik', sentence: 'Measure passive knee flexion angle up to 90 degrees.', translationTr: 'Pasif diz fleksiyon açısını 90 dereceye kadar ölçün.' }
    ]
  },
  motion: {
    phonetic: '/ˈmoʊ.ʃən/',
    mnemonicTr: 'MOTION -> "Move in Ocean" (Okyanustaki akıcı hareket). "Range of Motion" kalıbını eklemin hareket açıklığı dairesi olarak kodla.',
    visualConcept: 'Dönel Açı Açıklık Dairesi',
    visualEmoji: '🔄📐',
    collocations: [
      { category: 'Kalıplaşmış İfadeler', terms: ['range of motion (ROM)', 'active motion', 'passive motion'] },
      { category: 'Klinik Fiiller', terms: ['assess motion', 'restrict motion', 'improve motion'] }
    ],
    contextExamples: [
      { domain: 'Klinik', sentence: 'Passive range of motion was restricted due to joint stiffness.', translationTr: 'Eklem sertliği nedeniyle pasif hareket açıklığı kısıtlıydı.' }
    ]
  }
};

export const ContextMnemonicModal: React.FC<ContextMnemonicModalProps> = ({
  isOpen,
  onClose,
  wordOrPhrase,
  language,
  contextSentence
}) => {
  const [activeTab, setActiveTab] = useState<'collocation' | 'mnemonic' | 'context'>('collocation');

  if (!isOpen || !wordOrPhrase) return null;

  const cleanWord = wordOrPhrase.trim().toLowerCase().replace(/[.,!?:;"'()]/g, '');
  const data = MNEMONIC_DATABASE[cleanWord] || MNEMONIC_DATABASE.default;

  const speak = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanWord);
      const langMap: Record<TargetLanguage, string> = {
        en: 'en-US',
        de: 'de-DE',
        sr: 'sr-RS',
      };
      utterance.lang = langMap[language];
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl text-amber-300">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>Görsel & Bağlamsal Bellek Kancası</span>
              </div>
              <h3 className="text-xl font-black capitalize tracking-tight">{wordOrPhrase}</h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-xl transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Word Audio & Phonetic Banner */}
        <div className="bg-indigo-50/80 dark:bg-slate-800/90 p-4 px-6 border-b border-indigo-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 shrink-0">
          <div className="flex items-center space-x-3">
            <button
              onClick={speak}
              className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-xs transition-all flex items-center space-x-1.5 text-xs font-bold"
            >
              <Volume2 className="w-4 h-4" />
              <span>Model Ses</span>
            </button>
            <span className="text-xs font-mono font-semibold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 px-3 py-1 rounded-lg border border-indigo-200 dark:border-slate-700">
              {data.phonetic}
            </span>
          </div>

          <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
            Anadili Gibi Kullanım Haritası
          </span>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0">
          <button
            onClick={() => setActiveTab('collocation')}
            className={`flex-1 py-3 px-3 text-xs font-bold flex items-center justify-center space-x-1.5 border-b-2 transition-all ${
              activeTab === 'collocation'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            <GitFork className="w-4 h-4" />
            <span>Collocation (Eşdizim Ağ Haritası)</span>
          </button>

          <button
            onClick={() => setActiveTab('mnemonic')}
            className={`flex-1 py-3 px-3 text-xs font-bold flex items-center justify-center space-x-1.5 border-b-2 transition-all ${
              activeTab === 'mnemonic'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <span>Görsel Zihin Kancası</span>
          </button>

          <button
            onClick={() => setActiveTab('context')}
            className={`flex-1 py-3 px-3 text-xs font-bold flex items-center justify-center space-x-1.5 border-b-2 transition-all ${
              activeTab === 'context'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>3 Farklı Bağlam</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: COLLOCATION NETWORK */}
          {activeTab === 'collocation' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-indigo-50/60 dark:bg-indigo-950/30 p-3.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-200">
                <p className="font-semibold leading-relaxed">
                  <strong>Eşdizim (Collocation) Nedir?</strong> Anadili İngilizce/Almanca olanların bu kelimeyi otomatik olarak hangi fiiller, sıfatlar ve edatlarla yan yana kullandığını gösteren doğal kelime ağıdır.
                </p>
              </div>

              <div className="space-y-3">
                {data.collocations.map((colGroup, idx) => (
                  <div key={idx} className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center space-x-1">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                      <span>{colGroup.category}</span>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {colGroup.terms.map((term, tIdx) => (
                        <span
                          key={tIdx}
                          className="px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center space-x-1 hover:border-indigo-400 cursor-pointer"
                          onClick={() => {
                            if ('speechSynthesis' in window) {
                              const u = new SpeechSynthesisUtterance(term);
                              u.lang = 'en-US';
                              window.speechSynthesis.speak(u);
                            }
                          }}
                        >
                          <span>{term}</span>
                          <Volume2 className="w-3 h-3 text-slate-400 hover:text-indigo-600" />
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: VISUAL MNEMONIC HOOK */}
          {activeTab === 'mnemonic' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-amber-50 dark:bg-amber-950/30 p-5 rounded-2xl border border-amber-200 dark:border-amber-900/40 flex items-start space-x-4">
                <div className="text-4xl p-2 bg-amber-100 dark:bg-amber-900/50 rounded-2xl shrink-0">
                  {data.visualEmoji}
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-300 uppercase tracking-widest">
                    Zihinsel Kodlama İpucu
                  </span>
                  <h4 className="text-sm font-bold text-amber-950 dark:text-amber-100">
                    {data.visualConcept}
                  </h4>
                  <p className="text-xs text-amber-900/80 dark:text-amber-200 leading-relaxed pt-1">
                    "{data.mnemonicTr}"
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Kalıcı Hafıza İçin 3 Adımlı Teknik:</span>
                </h5>
                <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-decimal list-inside pl-1 leading-relaxed">
                  <li>Görseldeki sembolü zihninizde en az 5 saniye boyunca canlandırın.</li>
                  <li>Kelimeyi yüksek sesle söylerken zihninizdeki sahneyle bağlayın.</li>
                  <li>Kendi cümlenizde sadece bu kelimeyi değil, yanındaki collocation grubuyla birlikte kullanın.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 3: CONTEXT SHIFT EXAMPLES */}
          {activeTab === 'context' && (
            <div className="space-y-3 animate-fadeIn">
              {contextSentence && (
                <div className="bg-indigo-50 dark:bg-slate-800 p-4 rounded-2xl border border-indigo-200 dark:border-slate-700 space-y-1">
                  <div className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                    Mevcut Uygulama Bağlamınız:
                  </div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 italic">
                    "{contextSentence}"
                  </p>
                </div>
              )}

              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider pt-1">
                Farklı Alanlardaki Doğal Kullanımları:
              </div>

              {data.contextExamples.map((ex, i) => (
                <div key={i} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-1.5">
                  <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-extrabold rounded-full">
                    {ex.domain}
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                    "{ex.sentence}"
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                    → {ex.translationTr}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-indigo-200 dark:shadow-none"
          >
            Anladım, Pratiğe Dön
          </button>
        </div>
      </div>
    </div>
  );
};
