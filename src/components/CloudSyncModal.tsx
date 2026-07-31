import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  CloudCheck, 
  CloudRain, 
  RefreshCw, 
  LogOut, 
  Smartphone, 
  Laptop, 
  Tablet, 
  CheckCircle2, 
  X, 
  ShieldCheck, 
  Zap,
  User as UserIcon
} from 'lucide-react';
import { auth, signInWithGoogle, signOutUser } from '../lib/firebase';
import { User, onAuthStateChanged } from 'firebase/auth';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemCount: number;
  errorCount: number;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  itemCount,
  errorCount
}) => {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [loading, setLoading] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      setSyncStatus('synced');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOutUser();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
              Otomatik Bulut Senkronizasyonu
            </div>
            <h3 className="text-xl font-black leading-tight">Çoklu Cihaz Senkronizasyonu</h3>
          </div>
        </div>

        {/* Device Sync Visual */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center justify-between">
            <span>Bağlı Cihazlarınız (PC, Telefon, Tablet)</span>
            <span className="flex items-center text-emerald-600 dark:text-emerald-400 font-extrabold text-[11px] bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping mr-1.5" />
              Canlı Senkronize
            </span>
          </div>

          <div className="flex items-center justify-around py-2 text-slate-700 dark:text-slate-300">
            <div className="flex flex-col items-center space-y-1">
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800">
                <Laptop className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              </div>
              <span className="text-[10px] font-bold">Bilgisayar</span>
            </div>

            <div className="h-0.5 w-8 bg-sky-300 dark:bg-sky-700 animate-pulse" />

            <div className="flex flex-col items-center space-y-1">
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800">
                <Smartphone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-[10px] font-bold">Telefon</span>
            </div>

            <div className="h-0.5 w-8 bg-sky-300 dark:bg-sky-700 animate-pulse" />

            <div className="flex flex-col items-center space-y-1">
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800">
                <Tablet className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-[10px] font-bold">Tablet</span>
            </div>
          </div>
        </div>

        {/* User Auth Status Box */}
        {user && !user.isAnonymous ? (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Avatar" className="w-8 h-8 rounded-full" />
                  ) : (
                    user.displayName ? user.displayName[0] : <UserIcon className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                    {user.displayName || 'Google Kullanıcısı'}
                  </div>
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                    {user.email}
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 px-2 py-1 rounded-lg">
                Google Bağlı
              </span>
            </div>

            <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed font-medium">
              Hesabınız Firestore Bulut Veritabanına bağlı. Telefon, tablet veya bilgisayarınızdan aynı Google hesabıyla girdiğiniz an tüm pratikleriniz eşitlenir.
            </p>

            <button
              onClick={handleSignOut}
              disabled={loading}
              className="mt-2 text-xs font-bold text-red-600 dark:text-red-400 hover:underline flex items-center space-x-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Oturumu Kapat</span>
            </button>
          </div>
        ) : (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl space-y-3">
            <div className="flex items-center space-x-2 text-amber-900 dark:text-amber-200">
              <Zap className="w-4 h-4 text-amber-600 fill-amber-500 shrink-0" />
              <span className="text-xs font-bold">Cihazlar Arası Eşitlemeyi Aktifleştirin</span>
            </div>
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              Şu an bu cihazda anonim oturum çalışıyor. Bilgisayar, telefon ve tabletinizde aynı ilerlemeyi canlı görmek için 1 tıkla Google Hesabınızı bağlayın:
            </p>

            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 border border-slate-300 dark:border-slate-600 shadow-sm transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>{loading ? 'Bağlanıyor...' : 'Google ile Tüm Cihazlarda Eşitle'}</span>
            </button>
          </div>
        )}

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
          <span>Verileriniz Firebase Firestore 256-bit şifrelenmiş bulut sunucularında korunur.</span>
        </div>
      </div>
    </div>
  );
};
