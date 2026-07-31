import React, { useRef, useState } from 'react';
import { TargetLanguage } from '../types';
import { Mic, MicOff, Volume2, X } from 'lucide-react';

interface PronunciationAnalyzerModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetSentence: string;
  language: TargetLanguage;
}

interface WordMatch {
  word: string;
  matched: boolean;
}

const normalizeWords = (value: string): string[] =>
  value
    .toLocaleLowerCase()
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

function buildOrderedMatch(targetWords: string[], spokenWords: string[]): { score: number; matches: WordMatch[] } {
  const rows = targetWords.length + 1;
  const cols = spokenWords.length + 1;
  const table = Array.from({ length: rows }, () => Array<number>(cols).fill(0));

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      table[i][j] = targetWords[i - 1] === spokenWords[j - 1]
        ? table[i - 1][j - 1] + 1
        : Math.max(table[i - 1][j], table[i][j - 1]);
    }
  }

  const matchedIndexes = new Set<number>();
  let i = targetWords.length;
  let j = spokenWords.length;
  while (i > 0 && j > 0) {
    if (targetWords[i - 1] === spokenWords[j - 1]) {
      matchedIndexes.add(i - 1);
      i -= 1;
      j -= 1;
    } else if (table[i - 1][j] >= table[i][j - 1]) {
      i -= 1;
    } else {
      j -= 1;
    }
  }

  const orderedMatches = table[targetWords.length][spokenWords.length];
  return {
    score: targetWords.length ? Math.round((orderedMatches / targetWords.length) * 100) : 0,
    matches: targetWords.map((word, index) => ({ word, matched: matchedIndexes.has(index) })),
  };
}

export const PronunciationAnalyzerModal: React.FC<PronunciationAnalyzerModalProps> = ({
  isOpen,
  onClose,
  targetSentence,
  language,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [wordMatches, setWordMatches] = useState<WordMatch[]>([]);
  const [playbackSpeed, setPlaybackSpeed] = useState(0.9);
  const [shadowingMode, setShadowingMode] = useState<'shadowing' | 'repeat'>('shadowing');
  const finalTranscriptRef = useRef('');

  if (!isOpen) return null;

  const speakReference = (rate = playbackSpeed) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(targetSentence);
    utterance.lang = { en: 'en-US', de: 'de-DE', sr: 'sr-RS' }[language];
    utterance.rate = rate;
    window.speechSynthesis.speak(utterance);
  };

  const analyzeTranscript = (spokenText: string) => {
    const targetWords = normalizeWords(targetSentence);
    const spokenWords = normalizeWords(spokenText);
    if (!spokenWords.length) {
      setMatchScore(null);
      setWordMatches([]);
      return;
    }
    const result = buildOrderedMatch(targetWords, spokenWords);
    setMatchScore(result.score);
    setWordMatches(result.matches);
  };

  const startSpeechCheck = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Tarayıcınız konuşma tanıma özelliğini desteklemiyor.');
      return;
    }
    if (isRecording) return;

    if (shadowingMode === 'shadowing') speakReference(playbackSpeed);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = { en: 'en-US', de: 'de-DE', sr: 'sr-RS' }[language];

    recognition.onstart = () => {
      finalTranscriptRef.current = '';
      setTranscript('');
      setMatchScore(null);
      setWordMatches([]);
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      let complete = '';
      for (let index = 0; index < event.results.length; index += 1) {
        complete += event.results[index][0]?.transcript || '';
      }
      finalTranscriptRef.current = complete.trim();
      setTranscript(finalTranscriptRef.current);
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      analyzeTranscript(finalTranscriptRef.current);
    };

    try {
      recognition.start();
    } catch {
      setIsRecording(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl"><Mic className="w-6 h-6" /></div>
            <div>
              <div className="text-[10px] font-extrabold text-emerald-200 uppercase tracking-widest">Shadowing ve konuşma tanıma</div>
              <h3 className="text-lg font-black">Sesli Tekrar Stüdyosu</h3>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-xl"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 px-6 flex-wrap">
          <div className="flex items-center bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
            <button onClick={() => setShadowingMode('shadowing')} className={`px-3 py-1 rounded-lg ${shadowingMode === 'shadowing' ? 'bg-emerald-600 text-white' : 'text-slate-600 dark:text-slate-400'}`}>Eşzamanlı</button>
            <button onClick={() => setShadowingMode('repeat')} className={`px-3 py-1 rounded-lg ${shadowingMode === 'repeat' ? 'bg-emerald-600 text-white' : 'text-slate-600 dark:text-slate-400'}`}>Dinle ve tekrar et</button>
          </div>
          <div className="flex gap-1">
            {[0.75, 0.9, 1.1].map((speed) => (
              <button key={speed} onClick={() => { setPlaybackSpeed(speed); speakReference(speed); }} className={`px-2 py-1 rounded-lg text-[11px] font-bold border ${playbackSpeed === speed ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-white text-slate-600 border-slate-200'}`}>
                {speed === 0.75 ? 'Yavaş' : speed === 0.9 ? 'Normal' : 'Hızlı'}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase">Hedef cümle</span>
              <button onClick={() => speakReference()} className="text-xs text-emerald-600 font-bold flex items-center gap-1"><Volume2 className="w-4 h-4" />Dinle</button>
            </div>
            <p className="text-sm sm:text-base font-bold">“{targetSentence}”</p>
          </div>

          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900 leading-relaxed">
            Bu araç gerçek fonetik telaffuz puanı üretmez. Tarayıcının konuşmanızı hangi kelimeler olarak algıladığını, hedef cümleyle kelime sırasını koruyarak karşılaştırır.
          </div>

          <div className="text-center py-2 space-y-3">
            <button onClick={startSpeechCheck} disabled={isRecording} className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center shadow-lg ${isRecording ? 'bg-rose-600 text-white animate-pulse' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}>
              {isRecording ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
            </button>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{isRecording ? 'Konuşmanız yazıya çevriliyor…' : 'Mikrofona basıp cümleyi söyleyin'}</p>
          </div>

          {transcript && (
            <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <span className="text-xs font-bold text-slate-500 uppercase">Tarayıcının algıladığı metin</span>
              <p className="text-sm font-semibold italic">“{transcript}”</p>
              {matchScore !== null && (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Sıra duyarlı metin eşleşmesi</span>
                    <span className="text-sm font-black px-3 py-1 rounded-xl bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100">%{matchScore}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {wordMatches.map((entry, index) => (
                      <span key={`${entry.word}_${index}`} className={`px-2 py-1 text-xs font-bold rounded-md ${entry.matched ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{entry.word}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button onClick={onClose} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl">Kapat</button>
        </div>
      </div>
    </div>
  );
};
