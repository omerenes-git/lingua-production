import React, { useEffect, useRef, useState } from 'react';
import { TargetLanguage, Persona, ChatMessage } from '../../types';
import { INITIAL_PERSONAS } from '../../data/initialData';
import { sendChatMessage } from '../../lib/aiService';
import {
  MessageSquare,
  Send,
  Mic,
  MicOff,
  Volume2,
  Sparkles,
  User,
  Bot,
  RotateCcw,
  Terminal,
  Cpu,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface SohbetTabProps {
  currentLanguage: TargetLanguage;
}

interface PersonaRolePreset extends Persona {
  systemPrompt: string;
}

const nowLabel = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export const SohbetTab: React.FC<SohbetTabProps> = ({ currentLanguage }) => {
  const personaPresets: PersonaRolePreset[] = [
    ...INITIAL_PERSONAS.map((persona) => ({
      ...persona,
      systemPrompt:
        persona.id === 'dr_sarah'
          ? `You are Dr. Sarah Jenkins, an expert clinical physiotherapist and healthcare colleague in ${currentLanguage}. Respond professionally, discussing clinical cases and patient rehabilitation.`
          : persona.id === 'alex_examiner'
            ? `You are Alex Vance, an IELTS speaking examiner in ${currentLanguage}. Ask structured questions and provide constructive feedback.`
            : `You are a friendly conversational partner in ${currentLanguage}. Discuss daily life, hobbies and travel in a warm, engaging tone.`,
    })),
    {
      id: 'p_barista',
      name: 'Lukas (Sipariş Baristası)',
      roleTr: 'Kafe Sipariş & Günlük Diyalog',
      languages: ['en', 'de', 'sr'],
      descriptionTr: 'Sipariş verme, öneri isteme ve gündelik kafe konuşmaları.',
      greetingTr: 'Hoş geldiniz! Bugün ne içmek istersiniz?',
      greetingTarget: {
        en: 'Welcome! What can I get started for you today?',
        de: 'Herzlich willkommen! Was darf ich Ihnen heute zubereiten?',
        sr: 'Dobrodošli! Šta mogu da vam pripremim danas?',
      },
      systemPrompt: `You are Lukas, a warm cafe barista in ${currentLanguage}. Take orders politely and practise everyday dialogue.`,
    },
    {
      id: 'p_custom',
      name: 'Özel Sistem Promptlu Bot',
      roleTr: 'Kendi Rolünü Tanımla',
      languages: ['en', 'de', 'sr'],
      descriptionTr: 'Sohbet rolünü kendi sistem komutunuzla belirleyin.',
      greetingTr: 'Merhaba! Özel rolünüzle konuşmaya başlayabiliriz.',
      greetingTarget: {
        en: 'Hello! Your custom system role is active.',
        de: 'Hallo! Ihre benutzerdefinierte Systemrolle ist aktiv.',
        sr: 'Zdravo! Vaša prilagođena uloga je aktivna.',
      },
      systemPrompt: `You are a helpful language-learning chatbot in ${currentLanguage}. Adapt to the learner's level.`,
    },
  ];

  const availablePersonas = personaPresets.filter((persona) => persona.languages.includes(currentLanguage));
  const defaultPersona = availablePersonas[0] || personaPresets[0];
  const [selectedPersona, setSelectedPersona] = useState<PersonaRolePreset>(defaultPersona);
  const [customPromptText, setCustomPromptText] = useState(defaultPersona.systemPrompt);
  const [showSystemPromptEditor, setShowSystemPromptEditor] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_greet',
      sender: 'persona',
      text: defaultPersona.greetingTarget[currentLanguage] || defaultPersona.greetingTr,
      translationTr: defaultPersona.greetingTr,
      timestamp: nowLabel(),
    },
  ]);
  const [userInput, setUserInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showTranslations, setShowTranslations] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  useEffect(() => {
    const next = availablePersonas[0] || personaPresets[0];
    setSelectedPersona(next);
    setCustomPromptText(next.systemPrompt);
    setMessages([
      {
        id: `msg_greet_${Date.now()}`,
        sender: 'persona',
        text: next.greetingTarget[currentLanguage] || next.greetingTr,
        translationTr: next.greetingTr,
        timestamp: nowLabel(),
      },
    ]);
    setShowTranslations({});
  }, [currentLanguage]);

  const resetThread = (persona = selectedPersona) => {
    setMessages([
      {
        id: `msg_greet_${Date.now()}`,
        sender: 'persona',
        text: persona.greetingTarget[currentLanguage] || persona.greetingTr,
        translationTr: persona.greetingTr,
        timestamp: nowLabel(),
      },
    ]);
    setShowTranslations({});
  };

  const selectPersona = (persona: PersonaRolePreset) => {
    setSelectedPersona(persona);
    setCustomPromptText(persona.systemPrompt);
    resetThread(persona);
  };

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = { en: 'en-US', de: 'de-DE', sr: 'sr-RS' }[currentLanguage];
    window.speechSynthesis.speak(utterance);
  };

  const toggleSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Tarayıcınız ses kaydını desteklemiyor.');
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
      recognition.lang = { en: 'en-US', de: 'de-DE', sr: 'sr-RS' }[currentLanguage];
      recognition.onstart = () => setIsRecording(true);
      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0]?.transcript || '')
          .join('');
        setUserInput(transcript);
      };
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);
      recognition.start();
    } catch {
      setIsRecording(false);
    }
  };

  const handleSend = async (overrideText?: string) => {
    const userText = (overrideText || userInput).trim();
    if (!userText || isSending) return;
    if (!overrideText) setUserInput('');

    const userMessage: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: nowLabel(),
    };
    const updatedHistory = [...messages, userMessage];
    setMessages(updatedHistory);
    setIsSending(true);

    try {
      const aiResponse = await sendChatMessage(
        selectedPersona.id,
        currentLanguage,
        updatedHistory.map((message) => ({ sender: message.sender, text: message.text })),
        userText,
        customPromptText,
      );
      setMessages((previous) => [
        ...previous,
        {
          id: `msg_persona_${Date.now()}`,
          sender: 'persona',
          text: aiResponse.text,
          translationTr: aiResponse.translationTr,
          grammarCorrection: aiResponse.grammarCorrection,
          timestamp: nowLabel(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const quickSuggestions: Record<TargetLanguage, string[]> = {
    en: ['Hello, how is your day going?', 'Could I order a coffee, please?', 'What do you recommend for lunch?'],
    de: ['Hallo, wie geht es dir heute?', 'Ich möchte bitte einen Kaffee bestellen.', 'Wo ist die nächste Haltestelle?'],
    sr: ['Zdravo, kako si danas?', 'Molim vas, jednu kafu sa mlekom.', 'Gde se nalazi centar grada?'],
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl"><MessageSquare className="w-5 h-5" /></div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Rol Odaklı Çok Turlu Sohbet</h3>
              <p className="text-xs text-slate-500 font-medium">Seçilen rol ve özel sistem komutuyla hedef dilde konuşma pratiği</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-2xl border border-slate-200">
            <Cpu className="w-4 h-4 text-emerald-700" />
            <div>
              <div className="text-[11px] font-bold text-slate-700">Sunucu tarafından yönetilen AI modeli</div>
              <div className="text-[10px] text-slate-500">Aktif model Supabase Edge Function ayarından belirlenir.</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {availablePersonas.map((persona) => {
            const active = selectedPersona.id === persona.id;
            return (
              <button
                key={persona.id}
                onClick={() => selectPersona(persona)}
                className={`p-3 rounded-2xl border text-left transition-all ${active ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
              >
                <div className="font-extrabold text-xs text-slate-900">{persona.name}</div>
                <div className="text-[10px] text-emerald-700 font-bold mt-1">{persona.roleTr}</div>
                <p className="text-[10px] text-slate-500 mt-2 line-clamp-2">{persona.descriptionTr}</p>
              </button>
            );
          })}
        </div>

        <div className="bg-slate-900 text-slate-100 rounded-2xl p-3 border border-slate-800 space-y-2">
          <button
            onClick={() => setShowSystemPromptEditor((value) => !value)}
            className="w-full flex items-center justify-between text-xs font-bold text-emerald-400"
          >
            <span className="flex items-center gap-2"><Terminal className="w-4 h-4" /> Sistem Komutu — {selectedPersona.name}</span>
            {showSystemPromptEditor ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showSystemPromptEditor && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <textarea
                value={customPromptText}
                onChange={(event) => setCustomPromptText(event.target.value)}
                rows={3}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-emerald-300"
              />
              <button onClick={() => setCustomPromptText(selectedPersona.systemPrompt)} className="text-[10px] text-emerald-400 font-bold hover:underline">Varsayılana sıfırla</button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-md flex flex-col h-[520px]">
        <div className="p-3.5 border-b border-slate-100 bg-slate-50 rounded-t-3xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-xs font-extrabold text-slate-800">{selectedPersona.name} ile sohbet</span>
            <span className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md font-bold">Sunucu modeli</span>
          </div>
          <button onClick={() => resetThread()} className="text-xs font-bold text-slate-500 hover:text-rose-600 flex items-center gap-1"><RotateCcw className="w-3.5 h-3.5" /> Sıfırla</button>
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gradient-to-b from-white via-slate-50/30 to-white">
          {messages.map((message) => {
            const isUser = message.sender === 'user';
            const showTranslation = showTranslations[message.id];
            return (
              <div key={message.id} className={`flex items-start gap-2.5 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-2xl flex items-center justify-center shrink-0 ${isUser ? 'bg-slate-900 text-white' : 'bg-emerald-600 text-white'}`}>
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className="space-y-1">
                  <div className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${isUser ? 'bg-slate-900 text-white rounded-tr-none' : 'bg-white text-slate-900 rounded-tl-none border border-slate-200'}`}>
                    <p className="font-semibold">{message.text}</p>
                    {!isUser && (
                      <div className="flex items-center gap-3 mt-2.5 pt-2 border-t border-slate-100">
                        <button onClick={() => speakText(message.text)} className="text-[11px] text-emerald-700 font-bold flex items-center gap-1"><Volume2 className="w-3.5 h-3.5" /> Dinle</button>
                        {message.translationTr && <button onClick={() => setShowTranslations((previous) => ({ ...previous, [message.id]: !previous[message.id] }))} className="text-[11px] text-slate-500 font-semibold">{showTranslation ? 'Çeviriyi gizle' : 'Çeviriyi göster'}</button>}
                      </div>
                    )}
                    {showTranslation && message.translationTr && <div className="mt-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-slate-700">TR: {message.translationTr}</div>}
                  </div>
                  {message.grammarCorrection && <div className="text-xs bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-amber-900">🎓 {message.grammarCorrection}</div>}
                  <span className="text-[10px] text-slate-400 px-1 block font-mono">{message.timestamp}</span>
                </div>
              </div>
            );
          })}
          {isSending && <div className="flex items-center gap-2 text-xs text-slate-500 italic"><Sparkles className="w-4 h-4 text-emerald-600 animate-spin" /> {selectedPersona.name} yanıt oluşturuyor...</div>}
          <div ref={messagesEndRef} />
        </div>

        <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-200 flex items-center gap-2 overflow-x-auto">
          {quickSuggestions[currentLanguage].map((suggestion) => <button key={suggestion} onClick={() => handleSend(suggestion)} disabled={isSending} className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 text-[11px] font-semibold rounded-xl whitespace-nowrap">{suggestion}</button>)}
        </div>

        <div className="p-3 border-t border-slate-200 bg-white rounded-b-3xl flex items-center gap-2">
          <button onClick={toggleSpeechRecognition} className={`p-2.5 rounded-2xl ${isRecording ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-100 border border-slate-300 text-slate-700'}`}>
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-emerald-600" />}
          </button>
          <input
            type="text"
            value={userInput}
            onChange={(event) => setUserInput(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && void handleSend()}
            placeholder={`${currentLanguage.toUpperCase()} dilinde bir şey yaz...`}
            className="flex-1 p-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs sm:text-sm font-medium"
          />
          <button onClick={() => void handleSend()} disabled={!userInput.trim() || isSending} className="p-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white rounded-2xl"><Send className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
};
