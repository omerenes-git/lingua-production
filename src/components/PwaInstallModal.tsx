import React, { useState } from 'react';
import { Smartphone, Share, PlusSquare, MoreVertical, Copy, Check, Globe, Cloud, X, Sparkles, Download } from 'lucide-react';

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({ isOpen, onClose }) => {
  const [copiedAppUrl, setCopiedAppUrl] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'ios' | 'android' | 'sync'>('ios');

  const sharedAppUrl = 'https://ais-pre-gczn3eguikxvycw2jm6gv4-488178637388.europe-west3.run.app';
  const devAppUrl = 'https://ais-dev-gczn3eguikxvycw2jm6gv4-488178637388.europe-west3.run.app';

  if (!isOpen) return null;

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedAppUrl(true);
    setTimeout(() => setCopiedAppUrl(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden transition-all">
        
        {/* Header Decor */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Kapat"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-5">
          <div className="p-3 bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 rounded-xl shadow-xs">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Telefon ve Tablete Yükle (PWA)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              App Store / Play Store indirmesi gerekmeden ana ekrana ekleyin
            </p>
          </div>
        </div>

        {/* App Link Box */}
        <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-sky-500" />
              Uygulama Mobil Erişim Bağlantısı (URL):
            </span>
            {copiedAppUrl && (
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3" /> Kopyalandı!
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={sharedAppUrl}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 rounded-lg px-3 py-2 font-mono select-all focus:outline-hidden"
            />
            <button
              onClick={() => handleCopyUrl(sharedAppUrl)}
              className="px-3 py-2 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 whitespace-nowrap transition-all shadow-xs"
            >
              {copiedAppUrl ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>Kopyala</span>
            </button>
          </div>
          
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Dev Önizleme URL'si:</span>
            <button 
              onClick={() => handleCopyUrl(devAppUrl)}
              className="text-sky-600 dark:text-sky-400 hover:underline font-medium"
            >
              Geliştirici URL'sini Kopyala
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 mb-4 gap-2">
          <button
            onClick={() => setActiveTab('ios')}
            className={`flex-1 py-2 text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'ios'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Share className="w-3.5 h-3.5" />
            iOS (iPhone / iPad)
          </button>
          <button
            onClick={() => setActiveTab('android')}
            className={`flex-1 py-2 text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'android'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Android (Chrome)
          </button>
          <button
            onClick={() => setActiveTab('sync')}
            className={`flex-1 py-2 text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'sync'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            Senkronizasyon
          </button>
        </div>

        {/* Instructions Content */}
        {activeTab === 'ios' && (
          <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-900 dark:text-amber-200">
              iPhone veya iPad'inizde <strong>Safari</strong> tarayıcısını açıp yukarıdaki adresi yapıştırın.
            </div>
            
            <ol className="space-y-2.5 list-decimal list-inside pl-1">
              <li className="leading-relaxed">
                Safari'nin alt menü çubuğundaki <strong className="inline-flex items-center px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-slate-900 dark:text-white font-semibold"><Share className="w-3 h-3 mr-1" /> Paylaş</strong> butonuna dokunun.
              </li>
              <li className="leading-relaxed">
                Açılan menüyü aşağı kaydırıp <strong className="inline-flex items-center px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-slate-900 dark:text-white font-semibold"><PlusSquare className="w-3 h-3 mr-1" /> Ana Ekrana Ekle</strong> seçeneğini bulun ve dokunun.
              </li>
              <li className="leading-relaxed">
                Sağ üst köşedeki <strong>"Ekle"</strong> butonuna basın.
              </li>
            </ol>

            <div className="bg-sky-50 dark:bg-sky-950/50 p-3 rounded-xl border border-sky-100 dark:border-sky-800 text-sky-800 dark:text-sky-300 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
              <span>
                <strong>Sonuç:</strong> Uygulama, Safari menüleri olmadan tıpkı App Store'dan indirilmiş tam ekran bir mobil uygulama gibi ana ekranınızda açılacaktır.
              </span>
            </div>
          </div>
        )}

        {activeTab === 'android' && (
          <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-900 dark:text-emerald-200">
              Android telefon veya tabletinizde <strong>Chrome</strong> tarayıcısını açıp adrese gidin.
            </div>

            <ol className="space-y-2.5 list-decimal list-inside pl-1">
              <li className="leading-relaxed">
                Chrome tarayıcısının sağ üstündeki <strong className="inline-flex items-center px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-slate-900 dark:text-white font-semibold"><MoreVertical className="w-3 h-3 mr-1" /> Üç Nokta (⋮)</strong> menüsüne dokunun.
              </li>
              <li className="leading-relaxed">
                Menüden <strong className="inline-flex items-center px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-slate-900 dark:text-white font-semibold"><Download className="w-3 h-3 mr-1" /> Uygulamayı Yükle</strong> veya <strong>Ana Ekrana Ekle</strong> seçeneğine dokunun.
              </li>
              <li className="leading-relaxed">
                Ekrana gelen onay iletişim kutusunda <strong>"Yükle"</strong> butonuna basın.
              </li>
            </ol>

            <div className="bg-sky-50 dark:bg-sky-950/50 p-3 rounded-xl border border-sky-100 dark:border-sky-800 text-sky-800 dark:text-sky-300 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
              <span>
                <strong>Sonuç:</strong> Lingua Production Coach uygulama ikonu cihazınızın uygulama çekmecesine ve ana ekranına eklenecektir.
              </span>
            </div>
          </div>
        )}

        {activeTab === 'sync' && (
          <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
            <div className="p-3.5 bg-slate-100 dark:bg-slate-800 rounded-xl space-y-2 border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Cloud className="w-4 h-4 text-sky-500" />
                Cihazlar Arası Veri Senkronizasyonu (Firestore)
              </h4>
              <p className="leading-relaxed">
                Uygulamanız arka planda <strong>Google Cloud Firestore</strong> bulut veritabanı ile canlı olarak bağlıdır.
              </p>
            </div>

            <ul className="space-y-2 list-disc list-inside text-slate-600 dark:text-slate-300">
              <li><strong>Kelime ve Kalıplar:</strong> Eklediğiniz her yeni kelime, FSRS tekrar kartı ve örnek cümle bulutta saklanır.</li>
              <li><strong>Seri ve İlerleme:</strong> Günlük çalışma seriniz (Streak) ve çözdüğünüz pratikler tüm cihazlarınızda anında güncellenir.</li>
              <li><strong>Otomatik Anonim/Hesap Eşleşmesi:</strong> Telefon veya bilgisayarınızda oturum açmanıza gerek kalmadan cihaz kimliğiniz üzerinden veriler güvenle eşleştirilir.</li>
            </ul>
          </div>
        )}

        {/* Modal Footer */}
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 font-bold text-xs rounded-xl transition-colors shadow-sm"
          >
            Anladım, Tamam
          </button>
        </div>

      </div>
    </div>
  );
};
