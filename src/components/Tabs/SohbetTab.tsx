import React, { useState, useRef, useEffect } from 'react';
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
  Sliders,
  Terminal,
  Cpu,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface SohbetTabProps {
  currentLanguage: TargetLanguage;
}

type GeminiModelOption = 'gemini-3.5-flash' | 'gemini-3.1-flash-lite' | 'gemini-3.1-pro-preview';

interface PersonaRolePreset extends Persona {
  systemPrompt: string;
}

export const SohbetTab: React.FC<SohbetTabProps> = ({ currentLanguage }) => {
  // Pre-defined personas with explicit system instructions
  const personaPresets: PersonaRolePreset[] = [
    ...INITIAL_PERSONAS.map((p) => ({
      ...p,
      systemPrompt:
        p.id === 'dr_sarah'
          ? `You are Dr. Sarah Jenkins, an expert clinical physiotherapist and healthcare colleague in ${currentLanguage}. Respond professionally, discussing clinical cases and patient rehabilitation.`
          : p.id === 'alex_examiner'
          ? `You are Alex Vance, an official IELTS Speaking examiner in ${currentLanguage}. Ask structured interview questions, evaluate vocabulary usage, and provide constructive feedback.`
          : `You are Alex/Sophia, a friendly conversational partner in ${currentLanguage}. Talk about daily life, hobbies, and travel in a warm, engaging tone.`
    })),
    {
      id: 'p_barista',
      name: 'Lukas (Sipariş Baristası)',
      roleTr: 'Kafe Sipariş & Günlük Diyalog',
      languages: ['en', 'de', 'sr'],
      descriptionTr: 'Müşteri siparişi alma, kahve/yiyecek önerileri ve sıcak kafe sohbeti pratiği.',
      greetingTr: 'Hoş geldiniz! Bugün ne içmek istersiniz? Size özel taze bir kahve hazırlayabilirim.',
      greetingTarget: {
        en: 'Welcome! What can I get started for you today? We have freshly roasted coffee!',
        de: 'Herzlich willkommen! Was darf ich Ihnen heute zubereiten? Ein frischer Kaffee?',
        sr: 'Dobrodošli! Šta mogu da vam pripremim danas? Imamo svežu kafu!'
      },
      systemPrompt: `You are Lukas, a warm cafe barista in ${currentLanguage}. Take customer orders politely, recommend food and beverages, and practice daily conversational dialogue.`
    },
    {
      id: 'p_custom',
      name: 'Özel Sistem Promptlu Bot',
      roleTr: 'Kendi Sistem Promptunu Tanımla',
      languages: ['en', 'de', 'sr'],
      descriptionTr: 'Bota istediğiniz rolü ve davranışı kendi sistem promptunuz ile doğrudan tanımlayın.',
      greetingTr: 'Merhaba! Sistem promptunuz tanımlandı. İstediğiniz konuda konuşmaya başlayabiliriz.',
      greetingTarget: {
        en: 'Hello! Your custom system role is active. What would you like to discuss?',
        de: 'Hallo! Ihre benutzerdefinierte Systemrolle ist aktiv. Worüber möchten Sie sprechen?',
        sr: 'Zdravo! Vaša prilagođena uloga je aktivna. O čemu želite da razgovaramo?'
      },
      systemPrompt: `You are a helpful language learning chatbot in ${currentLanguage}. Adapt to the student's level and assist with conversational fluency.`
    }
  ];

  const availablePersonas = personaPresets.filter((p) => p.languages.includes(currentLanguage));
  const [selectedPersona, setSelectedPersona] = useState<PersonaRolePreset>(availablePersonas[0] || personaPresets[0]);

  // Model complexity selection
  const [selectedModel, setSelectedModel] = useState<GeminiModelOption>('gemini-3.5-flash');

  // Custom system prompt state
  const [customPromptText, setCustomPromptText] = useState(selectedPersona.systemPrompt);
  const [showSystemPromptEditor, setShowSystemPromptEditor] = useState(false);

  // Multi-turn messages history
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_greet',
      sender: 'persona',
      text: selectedPersona.greetingTarget[currentLanguage] || selectedPersona.greetingTr,
      translationTr: selectedPersona.greetingTr,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [userInput, setUserInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showTranslations, setShowTranslations] = useState<Record<string, boolean>>({});

  // Auto-scroll ref
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  // Switch persona reset
  const handleSelectPersona = (p: PersonaRolePreset) => {
    setSelectedPersona(p);
    setCustomPromptText(p.systemPrompt);
    setMessages([
      {
        id: `msg_greet_${Date.now()}`,
        sender: 'persona',
        text: p.greetingTarget[currentLanguage] || p.greetingTr,
        translationTr: p.greetingTr,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleResetThread = () => {
    setMessages([
      {
        id: `msg_greet_${Date.now()}`,
        sender: 'persona',
        text: selectedPersona.greetingTarget[currentLanguage] || selectedPersona.greetingTr,
        translationTr: selectedPersona.greetingTr,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const toggleTranslation = (id: string) => {
    setShowTranslations((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const speakText = (text: string) => {
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

      const langMap: Record<TargetLanguage, string> = {
        en: 'en-US',
        de: 'de-DE',
        sr: 'sr-RS',
      };
      recognition.lang = langMap[currentLanguage];

      recognition.onstart = () => setIsRecording(true);
      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result) => result.transcript)
          .join('');
        setUserInput(transcript);
      };
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);

      recognition.start();
    } catch (err) {
      console.error(err);
      setIsRecording(false);
    }
  };

  const handleSend = async (overrideText?: string) => {
    const messageToSend = overrideText || userInput;
    if (!messageToSend.trim() || isSending) return;

    const userText = messageToSend.trim();
    if (!overrideText) setUserInput('');

    const newMsg: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedHistory = [...messages, newMsg];
    setMessages(updatedHistory);
    setIsSending(true);

    const formattedHistory = updatedHistory.map((m) => ({
      sender: m.sender,
      text: m.text,
    }));

    const aiRes = await sendChatMessage(
      selectedPersona.id,
      currentLanguage,
      formattedHistory,
      userText,
      customPromptText,
      selectedModel
    );

    const personaMsg: ChatMessage = {
      id: `msg_persona_${Date.now()}`,
      sender: 'persona',
      text: aiRes.text,
      translationTr: aiRes.translationTr,
      grammarCorrection: aiRes.grammarCorrection,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, personaMsg]);
    setIsSending(false);
  };

  // Quick suggestions based on selected language
  const quickSuggestions: Record<TargetLanguage, string[]> = {
    en: [
      'Hello, how is your day going?',
      'Could I order a coffee, please?',
      'What do you recommend for lunch?'
    ],
    de: [
      'Hallo, wie geht es dir heute?',
      'Ich möchte bitte einen Kaffee bestellen.',
      'Wo ist die nächste Haltestelle?'
    ],
    sr: [
      'Zdravo, kako si danas?',
      'Molim vas, jednu kafu sa mlekom.',
      'Gde se nalazi centar grada?'
    ]
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header: Persona Selection & Gemini Model Config */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                Gemini Rol Odaklı Çok Turlu Sohbet Botu
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Seçilen role özel sistem komutu ve Gemini modeli ile interaktif sohbet
              </p>
            </div>
          </div>

          {/* Gemini Model Selector */}
          <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80">
            <Cpu className="w-4 h-4 text-emerald-700 ml-1.5 shrink-0" />
            <div className="flex space-x-1">
              {[
                { id: 'gemini-3.5-flash', label: 'gemini-3.5-flash', title: 'Genel Görevler & Dengeli' },
                { id: 'gemini-3.1-flash-lite', label: '3.1-flash-lite', title: 'Yüksek Hız & Anlık Yanıt' },
                { id: 'gemini-3.1-pro-preview', label: '3.1-pro-preview', title: 'Karmaşık Mantık & Analiz' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedModel(m.id as GeminiModelOption)}
                  title={m.title}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-xl transition-all ${
                    selectedModel === m.id
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Personas / System Instruction Role Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {availablePersonas.map((p) => {
            const isSelected = selectedPersona.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handleSelectPersona(p)}
                className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-2 ${
                  isSelected
                    ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'bg-slate-50/80 border-slate-200 hover:bg-slate-100/80'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                    isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {p.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-xs text-slate-900 truncate">{p.name}</div>
                    <div className="text-[10px] text-emerald-700 font-bold truncate">{p.roleTr}</div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 line-clamp-2 leading-tight">
                  {p.descriptionTr}
                </p>
              </button>
            );
          })}
        </div>

        {/* Expandable System Instruction Editor */}
        <div className="bg-slate-900 text-slate-100 rounded-2xl p-3 border border-slate-800 space-y-2">
          <div
            onClick={() => setShowSystemPromptEditor(!showSystemPromptEditor)}
            className="flex items-center justify-between cursor-pointer select-none text-xs font-bold text-emerald-400 hover:text-emerald-300"
          >
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>Sistem Komutu (System Instruction) Yapılandırması</span>
              <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 text-[10px] rounded-full border border-emerald-800 font-mono">
                {selectedPersona.name}
              </span>
            </div>
            <div className="flex items-center space-x-1 text-slate-400 text-[11px]">
              <span>{showSystemPromptEditor ? 'Düzenleyiciyi Gizle' : 'Görüntüle / Düzenle'}</span>
              {showSystemPromptEditor ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>

          {showSystemPromptEditor && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <p className="text-[11px] text-slate-400">
                Gemini chatbot modeline aktarılan aktif sistem rolünü buradan özelleştirebilirsiniz:
              </p>
              <textarea
                value={customPromptText}
                onChange={(e) => setCustomPromptText(e.target.value)}
                rows={3}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="Örnek: You are a strict grammar coach in German..."
              />
              <div className="flex justify-between items-center text-[10px] text-slate-400">
                <span>Otomatik olarak her mesaja sistem rolü olarak eklenir.</span>
                <button
                  onClick={() => setCustomPromptText(selectedPersona.systemPrompt)}
                  className="text-emerald-400 hover:underline font-bold"
                >
                  Varsayılana Sıfırla
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Multi-turn Chat Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-md flex flex-col h-[520px]">
        {/* Header Bar within Chat */}
        <div className="p-3.5 border-b border-slate-100 bg-slate-50/80 rounded-t-3xl flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-extrabold text-slate-800">
              {selectedPersona.name} ile Sohbet
            </span>
            <span className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md font-mono font-bold">
              {selectedModel}
            </span>
          </div>

          <button
            onClick={handleResetThread}
            className="text-xs font-bold text-slate-500 hover:text-rose-600 flex items-center space-x-1 transition-colors px-2.5 py-1 rounded-xl hover:bg-slate-200/60"
            title="Geçmişi Temizle ve Sıfırla"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Sohbeti Sıfırla</span>
          </button>
        </div>

        {/* Messages Scroll Thread */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar bg-gradient-to-b from-white via-slate-50/30 to-white">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            const showTr = showTranslations[msg.id];

            return (
              <div
                key={msg.id}
                className={`flex items-start space-x-2.5 max-w-[85%] ${
                  isUser ? 'ml-auto flex-row-reverse space-x-reverse' : ''
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-2xl flex items-center justify-center shrink-0 text-xs font-black shadow-xs ${
                    isUser ? 'bg-slate-900 text-white' : 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div className="space-y-1">
                  <div
                    className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs ${
                      isUser
                        ? 'bg-slate-900 text-white rounded-tr-none'
                        : 'bg-white text-slate-900 rounded-tl-none border border-slate-200/90 shadow-xs'
                    }`}
                  >
                    <p className="font-semibold">{msg.text}</p>

                    {/* Persona Controls */}
                    {!isUser && (
                      <div className="flex items-center space-x-3 mt-2.5 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => speakText(msg.text)}
                          className="text-[11px] text-emerald-700 hover:text-emerald-900 font-extrabold flex items-center space-x-1"
                        >
                          <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Sesli Dinle</span>
                        </button>

                        <button
                          onClick={() => toggleTranslation(msg.id)}
                          className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold"
                        >
                          {showTr ? 'Türkçe Çeviriyi Gizle' : 'Türkçe Çeviriyi Göster'}
                        </button>
                      </div>
                    )}

                    {/* Translation Foldout */}
                    {showTr && msg.translationTr && (
                      <div className="mt-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-slate-700 font-medium italic">
                        TR: {msg.translationTr}
                      </div>
                    )}
                  </div>

                  {/* Inline Grammar Correction Note */}
                  {msg.grammarCorrection && (
                    <div className="text-xs bg-amber-50/90 p-2.5 rounded-xl border border-amber-200 text-amber-900 font-medium space-y-1">
                      <span className="font-bold text-amber-800 flex items-center gap-1 text-[11px]">
                        🎓 Gramer / Üslup Önerisi:
                      </span>
                      <p>{msg.grammarCorrection}</p>
                    </div>
                  )}

                  <span className="text-[10px] text-slate-400 px-1 block font-mono">{msg.timestamp}</span>
                </div>
              </div>
            );
          })}

          {isSending && (
            <div className="flex items-center space-x-2 text-xs text-slate-500 italic bg-slate-100/80 p-3 rounded-2xl w-max border border-slate-200/60 animate-pulse">
              <Sparkles className="w-4 h-4 text-emerald-600 animate-spin" />
              <span>{selectedPersona.name} yanıt oluşturuyor...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggested Input Chips */}
        <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-200/60 flex items-center space-x-2 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider shrink-0">
            Hızlı Cümleler:
          </span>
          {quickSuggestions[currentLanguage]?.map((sug, i) => (
            <button
              key={i}
              onClick={() => handleSend(sug)}
              disabled={isSending}
              className="px-2.5 py-1 bg-white hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 text-slate-700 text-[11px] font-semibold rounded-xl whitespace-nowrap shrink-0 transition-all"
            >
              {sug}
            </button>
          ))}
        </div>

        {/* Chat Input Bar */}
        <div className="p-3 border-t border-slate-200 bg-white rounded-b-3xl flex items-center space-x-2">
          <button
            onClick={toggleSpeechRecognition}
            className={`p-2.5 rounded-2xl transition-all ${
              isRecording
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-slate-100 border border-slate-300 text-slate-700 hover:bg-slate-200'
            }`}
            title="Mikrofon ile Konuş"
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-emerald-600" />}
          </button>

          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={`${selectedPersona.name} ile konuşmak için ${currentLanguage.toUpperCase()} dilinde bir şeyler yaz...`}
            className="flex-1 p-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
          />

          <button
            onClick={() => handleSend()}
            disabled={!userInput.trim() || isSending}
            className="p-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white font-bold rounded-2xl shadow-xs transition-all flex items-center justify-center shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
