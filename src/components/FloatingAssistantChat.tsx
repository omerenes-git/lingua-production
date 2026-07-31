import React, { useState, useRef, useEffect } from 'react';
import { TargetLanguage } from '../types';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  Zap,
  HelpCircle,
  Minimize2,
  RefreshCw
} from 'lucide-react';

interface AppAction {
  type: string;
  value?: any;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  actionsExecuted?: string[];
  timestamp: string;
}

interface FloatingAssistantChatProps {
  currentLanguage: TargetLanguage;
  onLanguageChange: (lang: TargetLanguage) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  darkMode: boolean;
  onToggleDarkMode: (val: boolean) => void;
  onOpenNotifications: () => void;
  onOpenCloudSync: () => void;
}

export const FloatingAssistantChat: React.FC<FloatingAssistantChatProps> = ({
  currentLanguage,
  onLanguageChange,
  activeTab,
  onTabChange,
  darkMode,
  onToggleDarkMode,
  onOpenNotifications,
  onOpenCloudSync,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm_welcome',
      role: 'assistant',
      text: 'Merhaba! Aklına takılan herhangi bir dil kuralını, "Bu niye böyle?" dediğin gramer konusunu sorabilir veya uygulamanın sekme/dil/tema ayarlarını değiştirmemi isteyebilirsin. Nasıl yardımcı olabilirim?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const executeActions = (actions?: AppAction[]): string[] => {
    if (!actions || !Array.isArray(actions) || actions.length === 0) return [];

    const executed: string[] = [];

    actions.forEach((act) => {
      switch (act.type) {
        case 'CHANGE_LANGUAGE':
          if (['en', 'de', 'sr'].includes(act.value)) {
            onLanguageChange(act.value as TargetLanguage);
            const langNames: Record<string, string> = { en: 'İngilizce', de: 'Almanca', sr: 'Sırpça' };
            executed.push(`Dil ${langNames[act.value] || act.value} olarak değiştirildi`);
          }
          break;
        case 'CHANGE_TAB':
          if (act.value) {
            onTabChange(act.value);
            executed.push(`Sekme değiştirildi: ${act.value}`);
          }
          break;
        case 'TOGGLE_DARK_MODE':
          if (typeof act.value === 'boolean') {
            onToggleDarkMode(act.value);
            executed.push(`Karanlık mod ${act.value ? 'açıldı' : 'kapatıldı'}`);
          } else {
            onToggleDarkMode(!darkMode);
            executed.push('Tema değiştirildi');
          }
          break;
        case 'OPEN_NOTIFICATIONS':
          onOpenNotifications();
          executed.push('Bildirim ayarları açıldı');
          break;
        case 'OPEN_CLOUD_SYNC':
          onOpenCloudSync();
          executed.push('Bulut senkronizasyon penceresi açıldı');
          break;
      }
    });

    return executed;
  };

  const extractActiveScreenContext = (): string => {
    try {
      const contextEl = document.querySelector('[data-active-context-type]') as HTMLElement | null;
      if (contextEl) {
        const d = contextEl.dataset;
        const type = d.activeContextType;

        if (type === 'uret') {
          return `[Aktif Üretim Pratiği Modülü]
• Türkçe Cümle İsteği: "${d.turkishPrompt || ''}"
• Doğru Hedef Referans: "${d.targetReference || ''}"
• Kullanıcının Yazdığı Cevap: "${d.userAnswer || '(Henüz yanıt girilmedi)'}"
• AI Değerlendirme Sonucu: "${d.evaluationVerdict || 'Değerlendirilmedi'}"
• Hatalar/Notlar: "${d.evaluationNotes || 'Yok'}"`;
        }

        if (type === 'gramer_pratigi') {
          return `[Gramer Koçu Modülü]
• Gramer Konusu: "${d.grammarTopic || ''}"
• Türkçe Cümle: "${d.turkishSentence || ''}"
• Doğru Hedef Referans: "${d.targetReference || ''}"
• Kullanıcının Yazdığı Yanıt: "${d.userAnswer || '(Henüz yanıt girilmedi)'}"
• Kemikleşmiş Hata Odağı: "${d.fossilizedFocus || ''}"`;
        }

        if (type === 'nasil_soylerim') {
          return `[Bunu Nasıl Söylerim Modülü]
• Kullanıcının Türkçe Aratması: "${d.inputText || ''}"
• Üretilen Register Seçenekleri: "${d.generatedOptions || ''}"`;
        }
      }

      // General fallback: read text from active main container
      const mainEl = document.querySelector('main');
      if (mainEl) {
        const textContent = mainEl.innerText.slice(0, 600).replace(/\s+/g, ' ');
        return `[Ekran Metni Kesiti]\n${textContent}`;
      }
    } catch (e) {
      console.warn('Context extraction error:', e);
    }
    return '';
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputQuery;
    if (!query.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const activeScreenSummary = extractActiveScreenContext();
      const response = await fetch('/api/assistant-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map((m) => ({ role: m.role, text: m.text })),
          userQuery: query,
          currentContext: {
            currentLanguage,
            activeTab,
            darkMode,
            sectionContextSummary: activeScreenSummary,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('API Hatası');
      }

      const data = await response.json();
      const executedNotes = executeActions(data.actions);

      const assistantMsg: ChatMessage = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        text: data.text || 'Anlaşıldı! Yardımcı olabileceğim başka bir konu var mı?',
        actionsExecuted: executedNotes,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `a_err_${Date.now()}`,
          role: 'assistant',
          text: 'Üzgünüm, şu an bağlantıda bir sorun oluştu. Lütfen tekrar deneyin.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = [
    'Bu niye böyle? Gramer kuralını anlat',
    'Dili Almanca yap',
    'Gramer pratiği sekmesine geç',
    'Aktif vs pasif kelime farkı nedir?',
  ];

  return (
    <div className="fixed bottom-5 right-5 z-50 font-sans">
      {/* Floating Panel */}
      {isOpen && (
        <div className="mb-3 w-96 max-w-[calc(100vw-2.5rem)] h-[530px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ease-out animate-in fade-in slide-in-from-bottom-4">
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-r from-sky-600 to-indigo-600 text-white flex items-center justify-between shadow-xs">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-md">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight flex items-center space-x-1.5">
                  <span>Lingua Asistan</span>
                  <span className="text-[10px] bg-emerald-400 text-slate-950 font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                    AI
                  </span>
                </h3>
                <p className="text-[11px] text-sky-100 font-medium">
                  Dil soruları & Canlı uygulama kontrolü
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() =>
                  setMessages([
                    {
                      id: 'm_reset',
                      role: 'assistant',
                      text: 'Sohbet sıfırlandı. Kafana takılan soru veya uygulama talebini yazabilirsin!',
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    },
                  ])
                }
                title="Sohbeti Sıfırla"
                className="p-1.5 text-sky-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-sky-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick suggestions header tags */}
          <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">Hızlı Sor:</span>
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(s)}
                disabled={isLoading}
                className="text-[11px] px-2 py-0.5 bg-white dark:bg-slate-700 hover:bg-sky-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-md border border-slate-200 dark:border-slate-600 font-medium whitespace-nowrap transition-colors shrink-0"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5 bg-slate-50/50 dark:bg-slate-900/50">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start space-x-2 ${
                    isUser ? 'flex-row-reverse space-x-reverse' : ''
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-full shrink-0 ${
                      isUser
                        ? 'bg-sky-600 text-white'
                        : 'bg-indigo-600 text-white'
                    }`}
                  >
                    {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>

                  <div
                    className={`max-w-[82%] rounded-2xl p-3 text-xs leading-relaxed shadow-xs ${
                      isUser
                        ? 'bg-sky-600 text-white rounded-tr-none'
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700/80 rounded-tl-none'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.text}</div>

                    {/* App Actions Executed Badge */}
                    {msg.actionsExecuted && msg.actionsExecuted.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 space-y-1">
                        {msg.actionsExecuted.map((actNote, i) => (
                          <div
                            key={i}
                            className="flex items-center space-x-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800"
                          >
                            <Zap className="w-3 h-3 text-emerald-500" />
                            <span>{actNote}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div
                      className={`text-[9px] mt-1 text-right font-mono ${
                        isUser ? 'text-sky-200' : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {msg.timestamp}
                    </div>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400 text-xs italic">
                <div className="p-1.5 bg-indigo-600 text-white rounded-full animate-pulse">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <span>Lingua Asistan düşünüyor ve açıklıyor...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-2.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center space-x-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder='Gramer sorusu sor veya "Dili Almanca yap" de...'
              disabled={isLoading}
              className="flex-1 px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500 dark:text-slate-100 placeholder-slate-400"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || isLoading}
              className="p-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all flex items-center justify-center shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`group relative flex items-center space-x-2 px-4 py-3 rounded-full shadow-xl transition-all duration-300 transform active:scale-95 ${
          isOpen
            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
            : 'bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 hover:from-sky-500 hover:to-purple-500 text-white ring-4 ring-sky-500/20'
        }`}
      >
        {isOpen ? (
          <>
            <X className="w-5 h-5" />
            <span className="text-xs font-bold">Kapat</span>
          </>
        ) : (
          <>
            <div className="relative">
              <MessageSquare className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>
            <div className="text-left">
              <div className="text-xs font-black tracking-tight flex items-center space-x-1">
                <span>Lingua Asistan</span>
                <HelpCircle className="w-3 h-3 text-sky-200" />
              </div>
              <div className="text-[10px] text-sky-100 font-medium">
                Soru sor & komut ver
              </div>
            </div>
          </>
        )}
      </button>
    </div>
  );
};
