import React, { FormEvent, useEffect, useState } from 'react';
import {
  KeyRound,
  LockKeyhole,
  LogIn,
  LogOut,
  MailCheck,
  ShieldCheck,
} from 'lucide-react';
import {
  AUTH_REQUIRED_EVENT,
  consumeRecoverySessionFromUrl,
  getValidSession,
  requestPasswordReset,
  signInWithPassword,
  signOut,
  updatePassword,
  type WebSession,
} from '../lib/supabaseWeb';

interface SupabaseAuthGateProps {
  children: React.ReactNode;
}

export const SupabaseAuthGate: React.FC<SupabaseAuthGateProps> = ({ children }) => {
  const [session, setSession] = useState<WebSession | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const initializeAuth = async () => {
      const recovery = await consumeRecoverySessionFromUrl();
      if (!active) return;

      if (recovery.isRecovery) {
        setIsRecoveryMode(Boolean(recovery.session));
        setSession(recovery.session);
        setError(recovery.error);
        setNotice(
          recovery.session
            ? 'Parola sıfırlama bağlantısı doğrulandı. Şimdi yeni şifreni belirle.'
            : null,
        );
        setIsChecking(false);
        return;
      }

      const current = await getValidSession();
      if (!active) return;
      setSession(current);
      setIsChecking(false);
    };

    void initializeAuth();

    const handleAuthRequired = () => {
      setSession(null);
      setIsRecoveryMode(false);
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setNotice('Oturum süren doldu. Lütfen yeniden giriş yap.');
    };
    window.addEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired);

    return () => {
      active = false;
      window.removeEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired);
    };
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) return;

    setIsSubmitting(true);
    setError(null);
    setNotice(null);
    const result = await signInWithPassword(email, password);
    setIsSubmitting(false);

    if (result.error || !result.session) {
      setError(result.error ?? 'Oturum açılamadı.');
      return;
    }

    setPassword('');
    setSession(result.session);
  };

  const handlePasswordReset = async () => {
    if (!email.trim()) {
      setError('Önce Supabase hesabındaki e-posta adresini yaz.');
      return;
    }

    setIsResetting(true);
    setError(null);
    setNotice(null);
    const result = await requestPasswordReset(email);
    setIsResetting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setNotice('Parola sıfırlama bağlantısı e-posta adresine gönderildi.');
  };

  const handleUpdatePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (!session) {
      setError('Parola kurtarma oturumu bulunamadı. Yeni bağlantı iste.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Yeni şifre en az 8 karakter olmalı.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Yeni şifreler birbiriyle eşleşmiyor.');
      return;
    }

    setIsUpdatingPassword(true);
    setError(null);
    setNotice(null);
    const result = await updatePassword(newPassword, session);
    setIsUpdatingPassword(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setNewPassword('');
    setConfirmPassword('');
    setIsRecoveryMode(false);
    setNotice('Şifren başarıyla güncellendi. Oturum açık; uygulamayı kullanabilirsin.');
  };

  const handleSignOut = async () => {
    await signOut();
    // Aynı cihazda başka bir hesapla giriş yapılırsa önceki kullanıcının yerel
    // öğrenme verileri görünmesin (veri sızıntısı/gizlilik). Supabase sync,
    // yeniden girişte kullanıcının kendi verisini buluttan geri getirir.
    try {
      ['lingua_prompts', 'lingua_items', 'lingua_fossilized', 'lingua_daily_history', 'lingua_session_seen', 'lingua_supabase_session_v1'].forEach((key) => localStorage.removeItem(key));
    } catch {
      // localStorage kullanılamıyorsa sessizce geç
    }
    setSession(null);
    setIsRecoveryMode(false);
    setPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-sm font-semibold text-slate-300">
          <div className="h-5 w-5 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
          Güvenli oturum kontrol ediliyor…
        </div>
      </div>
    );
  }

  if (isRecoveryMode && session) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-5">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/95 p-6 sm:p-8 shadow-2xl">
          <div className="flex items-start gap-4 mb-7">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 text-emerald-300 flex items-center justify-center shrink-0">
              <KeyRound className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-emerald-400 font-bold mb-1">
                Parola kurtarma
              </div>
              <h1 className="text-2xl font-black tracking-tight">Yeni şifre belirle</h1>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                Bağlantı doğrulandı. Yeni şifren en az 8 karakter olmalı.
              </p>
            </div>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-slate-300">Yeni şifre</span>
              <input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                minLength={8}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                required
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-slate-300">Yeni şifreyi tekrar yaz</span>
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={8}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                required
              />
            </label>

            {error && (
              <div className="rounded-xl border border-rose-900/70 bg-rose-950/40 px-3.5 py-3 text-xs text-rose-200">
                {error}
              </div>
            )}

            {notice && (
              <div className="flex items-start gap-2 rounded-xl border border-emerald-800/70 bg-emerald-950/40 px-3.5 py-3 text-xs text-emerald-200">
                <MailCheck className="h-4 w-4 shrink-0" />
                {notice}
              </div>
            )}

            <button
              type="submit"
              disabled={
                isUpdatingPassword ||
                newPassword.length < 8 ||
                confirmPassword.length < 8
              }
              className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700 flex items-center justify-center gap-2"
            >
              {isUpdatingPassword ? (
                <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              {isUpdatingPassword ? 'Şifre güncelleniyor…' : 'Yeni şifreyi kaydet'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-5">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/95 p-6 sm:p-8 shadow-2xl">
          <div className="flex items-start gap-4 mb-7">
            <div className="h-12 w-12 rounded-2xl bg-sky-500/15 text-sky-300 flex items-center justify-center shrink-0">
              <LockKeyhole className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-sky-400 font-bold mb-1">
                Lingua Production Coach
              </div>
              <h1 className="text-2xl font-black tracking-tight">Güvenli giriş</h1>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                AI özellikleri ve kişisel öğrenme verileri yalnız Supabase oturumuyla açılır.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-slate-300">E-posta</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Supabase hesabındaki e-posta"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                required
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-slate-300">Şifre</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Supabase şifren"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                required
              />
            </label>

            {error && (
              <div className="rounded-xl border border-rose-900/70 bg-rose-950/40 px-3.5 py-3 text-xs text-rose-200">
                {error}
              </div>
            )}

            {notice && (
              <div className="flex items-start gap-2 rounded-xl border border-emerald-800/70 bg-emerald-950/40 px-3.5 py-3 text-xs text-emerald-200">
                <MailCheck className="h-4 w-4 shrink-0" />
                {notice}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !email.trim() || !password}
              className="w-full rounded-xl bg-sky-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-700 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              {isSubmitting ? 'Giriş yapılıyor…' : 'Uygulamaya gir'}
            </button>

            <button
              type="button"
              onClick={handlePasswordReset}
              disabled={isResetting}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-xs font-bold text-slate-300 transition hover:border-sky-700 hover:text-sky-200 disabled:cursor-wait disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <KeyRound className="h-4 w-4" />
              {isResetting ? 'Bağlantı gönderiliyor…' : 'Şifremi unuttum'}
            </button>
          </form>

          <div className="mt-5 flex items-start gap-2 text-[11px] leading-relaxed text-slate-500">
            <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            Şifren GitHub’a veya uygulama koduna yazılmaz. Süresi dolan oturum otomatik olarak giriş ekranına döner.
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleSignOut}
        className="fixed right-3 bottom-3 z-[70] rounded-xl border border-slate-300 bg-white/95 px-3 py-2 text-[11px] font-bold text-slate-700 shadow-lg backdrop-blur hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200 dark:hover:bg-slate-800 flex items-center gap-1.5"
        title="Supabase oturumunu kapat"
      >
        <LogOut className="h-3.5 w-3.5" />
        Oturumu kapat
      </button>
      {notice && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[80] max-w-[calc(100vw-2rem)] rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900 shadow-lg">
          {notice}
        </div>
      )}
      {children}
    </>
  );
};
