import React, { useEffect, useState } from 'react';
import {
  Cloud,
  RefreshCw,
  LogOut,
  CheckCircle2,
  X,
  ShieldCheck,
  Loader2,
  AlertTriangle,
  MailCheck,
} from 'lucide-react';
import { getValidSession, signOut } from '../lib/supabaseWeb';
import { getLastSyncedAt, syncNow } from '../lib/supabaseDataSync';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemCount: number;
  errorCount: number;
}

function formatSyncTime(iso: string | null): string {
  if (!iso) return 'Henüz senkronize edilmedi';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Bilinmiyor';
  return date.toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  itemCount,
  errorCount,
}) => {
  const [email, setEmail] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setNotice(null);
    setLastSyncedAt(getLastSyncedAt());
    void getValidSession().then((session) => setEmail(session?.user.email ?? null));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setError(null);
    setNotice(null);
    try {
      const resolution = await syncNow();
      if (resolution === 'no-session') {
        setError('Oturum bulunamadı. Senkronizasyon için yeniden giriş yap.');
        return;
      }
      if (resolution === 'error') {
        setError('Buluta şu anda ulaşılamadı. Verilerin cihazında güvende, birazdan tekrar dene.');
        return;
      }
      setLastSyncedAt(getLastSyncedAt());
      if (resolution === 'merged') {
        setNotice('Başka bir cihazdaki verilerle birleştirildi ve ekrana yansıtıldı.');
        return;
      }
      setNotice(resolution === 'uploaded' ? 'Verilerin buluta yüklendi.' : 'Zaten güncel, senkronize edilecek değişiklik yok.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Senkronizasyon başarısız oldu.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      onClose();
      window.location.reload();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 relative text-slate-900 dark:text-white">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-300 rounded-2xl">
            <Cloud className="w-7 h-7" />
          </div>
          <div>
            <div className="text-[10px] font-extrabold text-sky-600 dark:text-sky-400 uppercase tracking-widest">
              Supabase Bulut Senkronizasyonu
            </div>
            <h3 className="text-xl font-black leading-tight">Çoklu Cihaz Senkronizasyonu</h3>
          </div>
        </div>

        {/* Account status */}
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <MailCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                  {email || 'Oturum bilgisi alınamadı'}
                </div>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                  Bu Supabase hesabıyla giriş yaptığın her cihaz aynı veriyi görür.
                </div>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed font-medium">
            Son senkronizasyon: <strong>{formatSyncTime(lastSyncedAt)}</strong>
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {notice && (
          <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs text-sky-800 dark:text-sky-200 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{notice}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleSyncNow}
            disabled={isSyncing}
            className="flex-1 py-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 shadow-xs transition-all"
          >
            {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span>{isSyncing ? 'Senkronize ediliyor…' : 'Şimdi senkronize et'}</span>
          </button>
          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-60 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Oturumu kapat</span>
          </button>
        </div>

        {/* Sync Summary Stats */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-400 font-bold block">Senkronize Kelimeler</span>
            <span className="text-base font-black text-slate-900 dark:text-white">{itemCount} Adet</span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-400 font-bold block">Fosilleşmiş Hatalar</span>
            <span className="text-base font-black text-slate-900 dark:text-white">{errorCount} Kayıt</span>
          </div>
        </div>

        {/* Sync Info Footer */}
        <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Verilerin Supabase (PostgreSQL) üzerinde, satır düzeyi güvenlik (RLS) ile yalnızca bu hesaba açık şekilde saklanır. Değişiklikler arka planda otomatik olarak da senkronize edilir.</span>
        </div>
      </div>
    </div>
  );
};
