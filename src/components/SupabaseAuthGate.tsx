import React, { FormEvent, useEffect, useState } from 'react';
import { LockKeyhole, LogIn, LogOut, ShieldCheck } from 'lucide-react';
import {
  getValidSession,
  signInWithPassword,
  signOut,
  type WebSession,
} from '../lib/supabaseWeb';

interface SupabaseAuthGateProps {
  children: React.ReactNode;
}

export const SupabaseAuthGate: React.FC<SupabaseAuthGateProps> = ({ children }) => {
  const [session, setSession] = useState<WebSession | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isChecking, setIsChecking] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getValidSession().then((current) => {
      if (!active) return;
      setSession(current);
      setIsChecking(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) return;

    setIsSubmitting(true);
    setError(null);
    const result = await signInWithPassword(email, password);
    setIsSubmitting(false);

    if (result.error || !result.session) {
      setError(result.error ?? 'Oturum açılamadı.');
      return;
    }

    setPassword('');
    setSession(result.session);
  };

  const handleSignOut = async () => {
    await signOut();
    setSession(null);
    setPassword('');
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
                AI özellikleri ve kişisel öğrenme verileri yalnız Supabase hesabındaki oturumla açılır.
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
          </form>

          <div className="mt-5 flex items-start gap-2 text-[11px] leading-relaxed text-slate-500">
            <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            Şifren uygulama koduna veya GitHub’a yazılmaz. Tarayıcı yalnız kısa ömürlü Supabase oturum belirtecini saklar.
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
      {children}
    </>
  );
};
