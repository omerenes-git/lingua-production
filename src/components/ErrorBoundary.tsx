import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2, Copy, Check, ChevronDown, ChevronUp, Download, Terminal } from 'lucide-react';

interface Props {
  children: ReactNode;
}

export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  url: string;
  userAgent: string;
  errorName: string;
  errorMessage: string;
  errorStack?: string;
  componentStack?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorLog: ErrorLogEntry | null;
  showDetails: boolean;
  copied: boolean;
  logHistoryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    errorLog: null,
    showDetails: false,
    copied: false,
    logHistoryCount: 0,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const timestamp = new Date().toISOString();
    const url = typeof window !== 'undefined' ? window.location.href : 'N/A';
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A';

    const logEntry: ErrorLogEntry = {
      id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp,
      url,
      userAgent,
      errorName: error.name || 'Error',
      errorMessage: error.message || 'Bilinmeyen Çalışma Zamanı Hatası',
      errorStack: error.stack,
      componentStack: errorInfo.componentStack || undefined,
    };

    // 1. Console Structured Detailed Grouping
    if (console && console.groupCollapsed) {
      console.groupCollapsed(`🚨 [LinguaCoach ErrorBoundary] ${logEntry.errorName}: ${logEntry.errorMessage}`);
      console.error('Error Object:', error);
      console.error('Component Stack:', errorInfo.componentStack);
      console.info('Context Info:', { timestamp, url, userAgent });
      console.groupEnd();
    } else {
      console.error('[LinguaCoach ErrorBoundary]:', error, errorInfo);
    }

    // 2. Persist to LocalStorage for debugging persistence
    let existingLogs: ErrorLogEntry[] = [];
    try {
      const raw = localStorage.getItem('lingua_error_logs');
      if (raw) existingLogs = JSON.parse(raw);
    } catch {
      existingLogs = [];
    }

    // Keep last 15 error records
    const updatedLogs = [logEntry, ...existingLogs].slice(0, 15);
    try {
      localStorage.setItem('lingua_error_logs', JSON.stringify(updatedLogs));
    } catch (e) {
      console.warn('Failed to save error logs to localStorage:', e);
    }

    this.setState({
      errorInfo,
      errorLog: logEntry,
      logHistoryCount: updatedLogs.length,
    });
  }

  private handleCopyLog = async () => {
    if (!this.state.errorLog) return;
    const logData = JSON.stringify(this.state.errorLog, null, 2);
    try {
      await navigator.clipboard.writeText(logData);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    } catch {
      // Fallback
      console.log('Error Log Payload:\n', logData);
    }
  };

  private handleDownloadLog = () => {
    if (!this.state.errorLog) return;
    const blob = new Blob([JSON.stringify(this.state.errorLog, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lingua-error-log-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  private handleResetCache = () => {
    try {
      localStorage.removeItem('lingua_items');
      localStorage.removeItem('lingua_fossilized');
      localStorage.removeItem('lingua_prompts');
      localStorage.removeItem('lingua_daily_history');
    } catch (e) {
      console.error('Failed to clear cache:', e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const { error, errorLog, showDetails, copied, logHistoryCount } = this.state;

      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 font-sans">
          <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            
            {/* Header Icon & Title */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-100 flex items-center gap-2">
                  Çalışma Zamanı Hatası Yakalandı
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Uygulama çalışırken beklenmeyen bir hata oluştu. Detaylar günlüğe kaydedildi.
                </p>
              </div>
            </div>

            {/* Error Message Summary Box */}
            <div className="bg-slate-950 border border-red-900/40 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-red-400 font-semibold uppercase tracking-wider">
                <span>Hata Tanımı</span>
                {errorLog?.timestamp && (
                  <span className="text-slate-500 font-normal normal-case">
                    {new Date(errorLog.timestamp).toLocaleTimeString()}
                  </span>
                )}
              </div>
              <p className="text-sm font-mono text-red-300 break-words font-medium">
                {error?.message || 'Bilinmeyen Hata'}
              </p>
            </div>

            {/* Actions Toolbar */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => window.location.reload()}
                className="py-3 px-4 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-2xl transition shadow-lg shadow-sky-600/20 flex items-center justify-center gap-2 text-xs sm:text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Sayfayı Yenile
              </button>

              <button
                onClick={this.handleResetCache}
                className="py-3 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold rounded-2xl transition flex items-center justify-center gap-2 text-xs sm:text-sm"
              >
                <Trash2 className="w-4 h-4 text-amber-400" />
                Önbelleği Temizle
              </button>
            </div>

            {/* Detailed Diagnostic Toggle & Export Controls */}
            <div className="border-t border-slate-800 pt-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <button
                  onClick={() => this.setState({ showDetails: !showDetails })}
                  className="flex items-center gap-1.5 text-sky-400 hover:text-sky-300 font-medium transition"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  {showDetails ? 'Detaylı Hata Günlüğünü Gizle' : 'Teknik Hata Detaylarını Göster'}
                  {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={this.handleCopyLog}
                    title="Log verisini kopyala"
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg transition flex items-center gap-1 text-[11px]"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Kopyalandı' : 'Kopyala'}</span>
                  </button>

                  <button
                    onClick={this.handleDownloadLog}
                    title="JSON Raporunu İndir"
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg transition flex items-center gap-1 text-[11px]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>JSON İndir</span>
                  </button>
                </div>
              </div>

              {/* Expandable Technical Log Box */}
              {showDetails && (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-slate-300 space-y-3 overflow-hidden">
                  {errorLog?.url && (
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">URL</span>
                      <span className="text-slate-300 break-all">{errorLog.url}</span>
                    </div>
                  )}

                  {errorLog?.errorStack && (
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider mb-1">
                        JavaScript Stack Trace
                      </span>
                      <pre className="p-2.5 bg-slate-900 rounded-xl text-red-300/90 overflow-x-auto text-[11px] leading-relaxed max-h-40 whitespace-pre-wrap break-all">
                        {errorLog.errorStack}
                      </pre>
                    </div>
                  )}

                  {errorLog?.componentStack && (
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider mb-1">
                        React Component Stack
                      </span>
                      <pre className="p-2.5 bg-slate-900 rounded-xl text-sky-300/90 overflow-x-auto text-[11px] leading-relaxed max-h-40 whitespace-pre-wrap break-all">
                        {errorLog.componentStack}
                      </pre>
                    </div>
                  )}

                  {logHistoryCount > 0 && (
                    <div className="text-[10px] text-slate-500 text-right pt-1 border-t border-slate-900">
                      Kaydedilmiş toplam hata kaydı: {logHistoryCount}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

