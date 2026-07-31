import React from 'react';
import { TargetLanguage, ProductionPrompt, AIEvaluationResult } from '../types';
import { BookOpen, HelpCircle, ArrowRight, Lightbulb, CheckCircle2, XCircle, X } from 'lucide-react';

interface GrammarDeepDiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: ProductionPrompt;
  evaluation: AIEvaluationResult;
  userAnswer: string;
  language: TargetLanguage;
}

export const GrammarDeepDiveModal: React.FC<GrammarDeepDiveModalProps> = ({
  isOpen,
  onClose,
  prompt,
  evaluation,
  userAnswer,
  language,
}) => {
  if (!isOpen) return null;

  const langNames: Record<TargetLanguage, string> = {
    en: 'İngilizce',
    de: 'Almanca',
    sr: 'Sırpça',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-purple-700 via-indigo-700 to-sky-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl">
              <HelpCircle className="w-6 h-6 text-purple-200" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Derinlemesine Gramer & Mantık Analizi</h3>
              <p className="text-xs text-purple-100">Türkçe düşünme kalıbı vs. {langNames[language]} Sentaksı</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-xl transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          {/* Sentence Pair Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* User Attempt */}
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 space-y-2">
              <div className="flex items-center space-x-2 text-rose-700 dark:text-rose-400 font-bold text-xs">
                <XCircle className="w-4 h-4 shrink-0" />
                <span>Sizin Cümleniz (Tespit Edilen Yanılsama)</span>
              </div>
              <p className="text-sm font-semibold text-rose-950 dark:text-rose-200">
                "{userAnswer}"
              </p>
            </div>

            {/* Ideal Reference */}
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
              <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Doğal / İdeal Hedef Yapı</span>
              </div>
              <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-200">
                "{prompt.targetReference}"
              </p>
            </div>
          </div>

          {/* Detailed Grammar Explanation */}
          <div className="bg-slate-50 dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center space-x-2 text-sky-700 dark:text-sky-400 font-bold text-sm">
              <BookOpen className="w-4 h-4" />
              <span>Gramer & Sentaks Farkı Açıklaması</span>
            </div>

            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-normal">
              {evaluation.explanationTr || 'Cümlede fiil zamanı, bağlaç seçimi veya kelime dizilimi Türkçe mantığının birebir aktarılması sebebiyle uyuşmuyor.'}
            </p>
          </div>

          {/* Contrastive Linguistics Box: Türkçe Düşünme Tuzakları */}
          <div className="bg-amber-50/80 dark:bg-amber-950/40 p-5 rounded-2xl border border-amber-200 dark:border-amber-800/60 space-y-3">
            <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
              <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Türkçe Öğrenici Tuzağı & {langNames[language]} Zihinsel Gramer Kuralı</span>
            </div>

            <ul className="space-y-2.5 text-xs text-amber-950 dark:text-amber-200 leading-relaxed">
              {language === 'de' && (
                <>
                  <li className="flex items-start space-x-2">
                    <ArrowRight className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>V2 Fiil Konumu Kuralı (Verb-Second):</strong> Türkçede yüklem cümlenin en sonuna giderken, Almanca düz cümlelerde çekimli fiil HER ZAMAN 2. pozisyondadır (Özne/Zaman + Fiil + Nesne).
                    </span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <ArrowRight className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Artikel ve Nesne Halleri (Akkusativ/Dativ):</strong> Doğrudan nesnelerde Akkusativ (der -&gt; den / einen Kaffee), edatlı/ayrılma durumlarında Dativ (aus der Türkei) seçimine dikkat edilmelidir.
                    </span>
                  </li>
                </>
              )}

              {language === 'sr' && (
                <>
                  <li className="flex items-start space-x-2">
                    <ArrowRight className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Yardımcı Fiil Konumu (Enclitics):</strong> Sırpçada "biti" yardımcı fiilinin çekimleri (sam, si, je, smo, ste, su) cümlenin ilk vurgulu kelimesinden hemen sonra gelir ("Ja sam...", "Da li ste...").
                    </span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <ArrowRight className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Dişil Nesne Akuzativ Bükümü:</strong> Sonu "-a" ile biten dişil isimler doğrudan nesne olduğunda "-u" takısı alır (kafa -&gt; jednu kafu, voda -&gt; jednu vodu).
                    </span>
                  </li>
                </>
              )}

              {language === 'en' && (
                <>
                  <li className="flex items-start space-x-2">
                    <ArrowRight className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Özne + Fiil + Nesne (SVO) Dizilimi:</strong> Türkçedeki fiili sona koyma eğilimi yerine fiil öznenin hemen ardına getirilmelidir.
                    </span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <ArrowRight className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Edat Birlikteliği (Collocations):</strong> "report to someone", "send by email" gibi kalıplaşmış edat bağlantılarına dikkat edilmelidir.
                    </span>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Natural Alternatives List */}
          {evaluation.naturalAlternatives && evaluation.naturalAlternatives.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Alternatif Doğal Kullanımlar</span>
              <div className="space-y-1.5">
                {evaluation.naturalAlternatives.map((alt, i) => (
                  <div key={i} className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200">
                    • {alt}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition-all"
          >
            Anladım, Pratike Dön
          </button>
        </div>
      </div>
    </div>
  );
};
