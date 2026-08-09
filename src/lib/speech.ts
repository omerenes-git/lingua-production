import { TargetLanguage } from '../types';

/**
 * Web Speech API wrapper for cross-platform Speech Synthesis in Lingua Coach.
 * Supports English, German, Serbian, and Turkish with fallback mechanisms.
 */
export function speakText(text: string, language: TargetLanguage | 'tr'): void {
  if (!('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported in this browser.');
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  // Map language codes to IETF BCP 47 language tags
  const langMap: Record<string, string[]> = {
    en: ['en-US', 'en-GB'],
    de: ['de-DE', 'de-AT'],
    sr: ['sr-RS', 'sr-Latn-RS', 'hr-HR', 'bs-BA'],
    tr: ['tr-TR'],
  };

  const preferredLangs = langMap[language] || ['en-US'];

  // Get available voices
  const voices = window.speechSynthesis.getVoices();
  let selectedVoice = voices.find((v) => preferredLangs.some((lang) => v.lang.startsWith(lang)));

  if (!selectedVoice && voices.length > 0) {
    // Fallback to language prefix match
    selectedVoice = voices.find((v) => v.lang.startsWith(language));
  }

  if (selectedVoice) {
    utterance.voice = selectedVoice;
    utterance.lang = selectedVoice.lang;
  } else {
    utterance.lang = preferredLangs[0];
  }

  // Speech parameters
  utterance.rate = 0.9; // Slightly slower for language learners
  utterance.pitch = 1.0;

  window.speechSynthesis.speak(utterance);
}
