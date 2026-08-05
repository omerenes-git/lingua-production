import React, { useState, useEffect } from 'react';
import { Bell, BellRing, Clock, CheckCircle2, ShieldCheck, Sparkles, X, AlertCircle } from 'lucide-react';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  dueCount: number;
}

interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'fsrs' | 'streak' | 'achievement' | 'tip';
  read: boolean;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  dueCount,
}) => {
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [reminderTime, setReminderTime] = useState<string>('20:00');
  const [notifications, setNotifications] = useState<AppNotification[]>([
    {
      id: 'notif_1',
      title: 'FSRS Aralıklı Tekrar Hatırlatması',
      message: `${dueCount > 0 ? dueCount : 3} adet kelime hafızanızda zayıflamak üzere! Kalıcı kılmak için 2 dakika tekrar yapın.`,
      time: '10 dakika önce',
      type: 'fsrs',
      read: false,
    },
    {
      id: 'notif_2',
      title: 'Seri Koruma Uyarısı',
      message: 'Bugünkü 5 pratik hedefine ulaşmak için 1 cümle daha kurmanız gerekiyor.',
      time: '1 saat önce',
      type: 'streak',
      read: false,
    },
    {
      id: 'notif_3',
      title: 'Dil İpucu: Klinik Cümle Yapısı',
      message: 'İngilizce klinik ifadelerde emir kipleri (Imperatives) doğrudan ve net kullanılır.',
      time: 'Dün',
      type: 'tip',
      read: true,
    },
  ]);

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestBrowserPermission = async () => {
    if (!('Notification' in window)) {
      alert('Tarayıcınız masaüstü bildirimlerini desteklemiyor.');
      return;
    }

    const perm = await Notification.requestPermission();
    setNotificationPermission(perm);

    if (perm === 'granted') {
      new Notification('Lingua Production Coach', {
        body: 'Günlük pratik bildirimleri ve FSRS tekrar uyarıları başarıyla etkinleştirildi! 🎉',
        icon: '/favicon.ico',
      });
    }
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-sky-600 to-indigo-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl">
              <BellRing className="w-6 h-6 text-sky-200 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Akıllı Bildirim & Hatırlatıcı</h3>
              <p className="text-xs text-sky-100">FSRS unutma eğrisini yenmek için günlük rutin</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-xl transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar flex-1">
          {/* Push Notification Card */}
          <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                <span className="font-bold text-sm">Tarayıcı Bildirim İzni</span>
              </div>
              <span className={`text-xs px-2.5 py-0.5 font-bold rounded-full ${
                notificationPermission === 'granted'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
              }`}>
                {notificationPermission === 'granted' ? 'Etkin' : 'İzin Bekliyor'}
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Tekrar saati geldiğinde veya seri bozulma riski doğduğunda masaüstünüzde ve telefonunuzda anlık anımsatma uyarısı alın.
            </p>

            {notificationPermission !== 'granted' && (
              <button
                type="button"
                onClick={requestBrowserPermission}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2"
              >
                <Bell className="w-4 h-4" />
                <span>Bildirim İznini Etkinleştir</span>
              </button>
            )}
          </div>

          {/* Daily Schedule Time Picker */}
          <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="font-bold text-xs">Günlük Pratik Saati Hatırlatıcı</span>
              </div>
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold"
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Her gün saat {reminderTime}’de 5 dakikalık üretim hatırlatması gönderilir.
            </p>
          </div>

          {/* Notification List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Son Bildirimler</span>
              <button
                onClick={markAllRead}
                className="text-[11px] text-sky-600 dark:text-sky-400 font-semibold hover:underline"
              >
                Tümünü Okundu İşaretle
              </button>
            </div>

            <div className="space-y-2">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3 rounded-2xl border transition-all text-xs flex items-start space-x-3 ${
                    notif.read
                      ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      : 'bg-sky-50/70 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/80 text-slate-900 dark:text-slate-100 font-medium'
                  }`}
                >
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 mt-0.5">
                    {notif.type === 'fsrs' ? (
                      <Sparkles className="w-4 h-4 text-sky-600" />
                    ) : notif.type === 'streak' ? (
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{notif.title}</span>
                      <span className="text-[10px] text-slate-400">{notif.time}</span>
                    </div>
                    <p className="text-[11px] mt-0.5 text-slate-600 dark:text-slate-300 leading-snug">
                      {notif.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs rounded-xl hover:opacity-90 transition-all"
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
};
