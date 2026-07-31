import React, { useState, useRef } from 'react';
import { TargetLanguage } from '../types';
import { Mic, MicOff, Volume2, Sparkles, CheckCircle2, AlertTriangle, X, Play, RefreshCw } from 'lucide-react';

interface PronunciationAnalyzerModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetSentence: string;
  language: TargetLanguage;
}

export const PronunciationAnalyzerModal: React.FC<PronunciationAnalyzerModalProps> = ({
  isOpen,
  onClose,
  targetSentence,
  language,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [wordMatches, setWordMatches] = useState<{ word: string; matched: boolean }[]>([]);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(0.9);
  const [shadowingMode, setShadowingMode] = useState<'shadowing' | 'repeat'>('shadowing');

  if (!isOpen) return null;

  const speakReference = (speedRate: number = playbackSpeed) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(targetSentence);
      const langMap: Record<TargetLanguage, string> = {
        en: 'en-US',
        de: 'de-DE',
        sr: 'sr-RS',
      };
      utterance.lang = langMap[language];
      utterance.rate = speedRate;
      window.speechSynthesis.speak(utterance);
    }
  };

  const startPronunciationCheck = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Tarayıcınız ses tanıma özelliğini desteklemiyor.');
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    // Shadowing mode: play model audio concurrently when recording starts
    if (shadowingMode === 'shadowing') {
      speakReference(playbackSpeed);
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
      recognition.lang = langMap[language];

      recognition.onstart = () => {
        setIsRecording(true);
        setTranscript('');
        setScore(null);
      };

      recognition.onresult = (event: any) => {
        const text = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result) => result.transcript)
          .join('');
        setTranscript(text);
      };

      recognition.onerror = () => setIsRecording(false);

      recognition.onend = () => {
        setIsRecording(false);
        analyzePronunciation();
      };

      recognition.start();
    } catch (err) {
      console.error(err);
      setIsRecording(false);
    }
  };

  const analyzePronunciation = () => {
    if (!transcript) return;

    const targetWords = targetSentence
      .toLowerCase()
      .replace(/[.,!?:;"'()]/g, '')
      .split(/\s+/);

    const transcriptWords = transcript
      .toLowerCase()
      .replace(/[.,!?:;"'()]/g, '')
      .split(/\s+/);

    let matchCount = 0;
    const matches = targetWords.map((targetW) => {
      const matched = transcriptWords.some((tw) => tw.includes(targetW) || targetW.includes(tw));
      if (matched) matchCount++;
      return { word: targetW, matched };
    });

    const calculatedScore = Math.min(100, Math.round((matchCount / targetWords.length) * 100));
    setScore(calculatedScore);
    setWordMatches(matches);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl text-emerald-200">
              <Mic className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] font-extrabold text-emerald-200 uppercase tracking-widest">
                Gölgeleme & Akıcılık Koçu
              </div>
              <h3 className="text-lg font-black">Shadowing & Telaffuz Stüdyosu</h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-xl transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Speed & Mode Bar */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 px-6 shrink-0 flex-wrap">
          {/* Shadowing Mode Toggle */}
          <div className="flex items-center bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
            <button
              onClick={() => setShadowingMode('shadowing')}
              className={`px-3 py-1 rounded-lg transition-all ${
                shadowingMode === 'shadowing'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Shadowing (Eşzamanlı)
            </button>
            <button
              onClick={() => setShadowingMode('repeat')}
              className={`px-3 py-1 rounded-lg transition-all ${
                shadowingMode === 'repeat'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Dinle & Tekrar Et
            </button>
          </div>

          {/* Speed selector */}
          <div className="flex items-center space-x-1 text-xs font-bold">
            {[0.75, 0.9, 1.1].map((speed) => (
              <button
                key={speed}
                onClick={() => {
                  setPlaybackSpeed(speed);
                  speakReference(speed);
                }}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-extrabold border transition-all ${
                  playbackSpeed === speed
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                {speed === 0.75 ? '0.75x Yavaş' : speed === 0.9 ? '1.0x Normal' : '1.25x Hızlı'}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Reference Sentence */}
          <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hedef Cümle</span>
              <button
                onClick={() => speakReference()}
                className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center space-x-1 hover:underline"
              >
                <Volume2 className="w-4 h-4" />
                <span>Model Sesi Dinle</span>
              </button>
            </div>

            <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
              "{targetSentence}"
            </p>
          </div>

          {/* Recording Controls & Wave Simulation */}
          <div className="text-center py-3 space-y-3">
            {isRecording && (
              <div className="flex items-center justify-center space-x-1.5 h-6 animate-pulse">
                <span className="w-1 bg-emerald-500 h-3 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 bg-emerald-500 h-6 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 bg-emerald-500 h-4 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="w-1 bg-emerald-500 h-7 rounded-full animate-bounce" style={{ animationDelay: '450ms' }} />
                <span className="w-1 bg-emerald-500 h-3 rounded-full animate-bounce" style={{ animationDelay: '600ms' }} />
              </div>
            )}

            <button
              onClick={startPronunciationCheck}
              className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center transition-all shadow-lg ${
                isRecording
                  ? 'bg-rose-600 text-white animate-pulse ring-8 ring-rose-300 dark:ring-rose-900/50'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-200 dark:shadow-none'
              }`}
            >
              {isRecording ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
            </button>

            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {isRecording 
                ? (shadowingMode === 'shadowing' ? 'Gölgeleme Aktif! Model sesle eşzamanlı konuşun...' : 'Dinleniyor... Cümleyi okuyun') 
                : 'Mikrofona basıp Shadowing pratiğini başlatın'}
            </p>
          </div>

          {/* User Transcript & Score Output */}
          {transcript && (
            <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Algılanan Sesiniz:</span>
              <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 italic">
                "{transcript}"
              </p>

              {score !== null && (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Telaffuz Doğruluk Skoru:</span>
                    <span className={`text-sm font-black px-3 py-1 rounded-xl ${
                      score >= 80
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                        : score >= 50
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300'
                    }`}>
                      %{score}
                    </span>
                  </div>

                  {/* Word-by-Word Visual Feedback */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {wordMatches.map((wm, i) => (
                      <span
                        key={i}
                        className={`px-2 py-1 text-xs font-bold rounded-md ${
                          wm.matched
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                        }`}
                      >
                        {wm.word}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
