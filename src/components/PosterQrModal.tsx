import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Printer,
  Download,
  Copy,
  Check,
  Smartphone,
  Sparkles,
  QrCode,
  Share2,
  Truck,
  CreditCard,
  ShieldCheck,
  Store,
  ExternalLink,
  Globe,
  Link2,
  HelpCircle,
  Save,
  MessageCircle,
} from 'lucide-react';
import { StoreSettings } from '../types';
import { StoreService } from '../services/storeStorage';

const VERIFIED_GOOGLE_DRIVE_URL =
  'https://drive.google.com/uc?export=download&id=1jC_dYK62zmY3fUxvQOzn-y4Jnrk3G7c-';

interface PosterQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StoreSettings;
  onSaveSettings?: (settings: StoreSettings) => void;
}

export const PosterQrModal: React.FC<PosterQrModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const defaultDownloadUrl =
    currentOrigin && !currentOrigin.includes('localhost')
      ? `${currentOrigin}/download`
      : VERIFIED_GOOGLE_DRIVE_URL;

  const initialUrl =
    settings.appPublicUrl && !settings.appPublicUrl.includes('localhost')
      ? settings.appPublicUrl
      : VERIFIED_GOOGLE_DRIVE_URL;

  const [customUrl, setCustomUrl] = useState<string>(initialUrl);
  const [activeUrlMode, setActiveUrlMode] = useState<'custom' | 'default'>('custom');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);
  const [printNotice, setPrintNotice] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  // Sync with settings whenever modal opens or settings update
  useEffect(() => {
    if (isOpen) {
      if (settings.appPublicUrl && !settings.appPublicUrl.includes('localhost')) {
        setCustomUrl(settings.appPublicUrl);
      } else {
        setCustomUrl(VERIFIED_GOOGLE_DRIVE_URL);
      }
      setActiveUrlMode('custom');
    }
  }, [isOpen, settings.appPublicUrl]);

  // Determine the active link to encode inside the Barcode
  let activeDownloadUrl =
    activeUrlMode === 'custom' && customUrl.trim() ? customUrl.trim() : defaultDownloadUrl;

  // Never allow localhost inside the QR code for shop posters!
  if (activeDownloadUrl.includes('localhost') || !activeDownloadUrl.startsWith('http')) {
    activeDownloadUrl = VERIFIED_GOOGLE_DRIVE_URL;
  }

  useEffect(() => {
    if (!isOpen) return;

    // Generate high resolution QR code (1024x1024 for crisp printing on posters)
    QRCode.toDataURL(activeDownloadUrl, {
      width: 800,
      margin: 1.5,
      color: {
        dark: '#0B132B',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR code:', err));
  }, [isOpen, activeDownloadUrl]);

  if (!isOpen) return null;

  const handleSaveCustomUrl = () => {
    const target = activeUrlMode === 'custom' ? customUrl.trim() : VERIFIED_GOOGLE_DRIVE_URL;
    const updated: StoreSettings = {
      ...settings,
      appPublicUrl: target,
    };
    StoreService.saveSettings(updated);
    if (onSaveSettings) {
      onSaveSettings(updated);
    }
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(activeDownloadUrl);
    setCopied(true);
    setShareSuccess('Link copied to clipboard!');
    setTimeout(() => {
      setCopied(false);
      setShareSuccess(null);
    }, 2500);
  };

  // Android & Mobile proof download and share
  const handleDownloadQrPng = async () => {
    if (!qrDataUrl) return;

    // 1. Try Native Web Share API first (Opens Gallery / WhatsApp / Print sheet on Android phone)
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        const res = await fetch(qrDataUrl);
        const blob = await res.blob();
        const file = new File([blob], 'AbhiFashion-Store-QR.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'ABHI FASHION - Poster Barcode',
            text: `ABHI FASHION Official Store App Download Barcode:\n${activeDownloadUrl}`,
            files: [file],
          });
          setShareSuccess('Shared / Saved successfully!');
          setTimeout(() => setShareSuccess(null), 3000);
          return;
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Native share fallback:', err);
      } else {
        return; // User cancelled share sheet
      }
    }

    // 2. Direct HTTP server download (Android DownloadManager triggers for real HTTP file URLs)
    try {
      const serverUrl = `/api/poster-qr/download?url=${encodeURIComponent(activeDownloadUrl)}`;
      const link = document.createElement('a');
      link.href = serverUrl;
      link.download = 'AbhiFashion-App-Download-QR.png';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setShareSuccess('QR Code downloading to your phone!');
      setTimeout(() => setShareSuccess(null), 3000);
    } catch {
      // 3. Fallback: Data URL download for standard browsers
      const link = document.createElement('a');
      link.href = qrDataUrl;
      link.download = 'AbhiFashion-App-Download-QR.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setShareSuccess('QR Code downloaded!');
      setTimeout(() => setShareSuccess(null), 3000);
    }
  };

  // Direct 1-tap WhatsApp Share (Sends image link to flex printer or contacts)
  const handleShareToWhatsApp = () => {
    const text = `🛍️ *${settings.storeName} - Dukaan Poster Barcode*\n\nCustomer ke liye App Download Barcode link:\n👉 ${activeDownloadUrl}\n\nIs link se customer direct Android APK download kar sakte hain!`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    try {
      window.print();
    } catch {
      setPrintNotice(true);
      setTimeout(() => setPrintNotice(false), 4500);
    }
  };

  return (
    <div
      id="poster-qr-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="poster-qr-modal-container"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-[#0F172A] rounded-3xl border border-slate-800 text-slate-100 shadow-2xl flex flex-col max-h-[94vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#0B132B]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider">
                Store Poster & App Download Barcode
              </h2>
              <p className="text-[11px] text-slate-400">
                Poster me print karne ke liye high-resolution Barcode / QR Code (Custom Domain Ready)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Custom Link Setup Box (Hides AI Studio URL) */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-black uppercase text-white tracking-wide">
                  QR Code Ka Link Chunein (AI Studio Link Hatane Ke Liye)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowHowTo(!showHowTo)}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{showHowTo ? 'Hide Guide' : 'Kaise Kaam Karta Hai?'}</span>
              </button>
            </div>

            {showHowTo && (
              <div className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/20 text-[11px] text-slate-300 space-y-1.5 leading-relaxed">
                <p className="text-amber-300 font-bold">
                  ✨ Google AI Studio ka link camera scan me kaise na dikhe?
                </p>
                <p>
                  Jab koi customer phone camera se QR scan karta hai, toh scanner wahi domain dikhata hai jo QR me set hota hai.
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  <li>
                    <strong>Tareeqa 1 (Sabse Aasan):</strong> Free shortener jaise{' '}
                    <strong className="text-white">bit.ly</strong> ya{' '}
                    <strong className="text-white">tinyurl.com</strong> par jaakar apni dukaan ka link daalein aur{' '}
                    <span className="text-amber-300 font-mono">bit.ly/abhifashion-app</span> banayein.
                  </li>
                  <li>
                    <strong>Tareeqa 2 (Apna Custom Domain):</strong> Agar aapne{' '}
                    <span className="text-amber-300 font-mono">abhifashion.in</span> khareeda hai toh yahan{' '}
                    <span className="text-amber-300 font-mono">https://abhifashion.in/download</span> dalein.
                  </li>
                  <li>
                    <strong>Tareeqa 3 (Direct APK):</strong> Agar aapne APK file Google Drive/GitHub par rakhi hai toh uska direct link dalein. Scan karte hi turant APK download shuru ho jayegi!
                  </li>
                </ul>
              </div>
            )}

            {/* Mode Selector Tabs */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveUrlMode('custom')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeUrlMode === 'custom'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Custom Branded / Short Link</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveUrlMode('default')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeUrlMode === 'default'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Current Web Store Link</span>
              </button>
            </div>

            {/* Custom URL Input Field */}
            {activeUrlMode === 'custom' ? (
              <div className="space-y-2 pt-1">
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="e.g. https://bit.ly/abhifashion-app ya https://abhifashion.in"
                    className="flex-1 bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder:text-slate-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleSaveCustomUrl}
                    className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1 transition cursor-pointer shadow-sm"
                  >
                    {isSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                    <span>{isSaved ? 'Saved!' : 'Save'}</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 text-[10px]">
                  <span className="text-slate-400">Quick suggestions:</span>
                  <button
                    type="button"
                    onClick={() => setCustomUrl('https://bit.ly/abhifashion-store')}
                    className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono"
                  >
                    bit.ly/abhifashion-store
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomUrl('https://abhifashion.in/download')}
                    className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono"
                  >
                    abhifashion.in/download
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400">
                Current App URL active: <span className="font-mono text-amber-300">{defaultDownloadUrl}</span>
              </p>
            )}
          </div>

          {/* Feedback Toasts */}
          {shareSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{shareSuccess}</span>
            </div>
          )}

          {printNotice && (
            <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center gap-2 animate-in fade-in">
              <Smartphone className="w-4 h-4 text-amber-400" />
              <span>Mobile WebView me direct print support nahi hai. Kripya "Share on WA / Flex" se image bhejein ya PC se print karein.</span>
            </div>
          )}

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="text-xs">
              <span className="text-slate-400 block text-[10px]">QR Code Me Encoded Link:</span>
              <span className="font-mono font-bold text-amber-300 text-xs break-all">
                {activeDownloadUrl}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadQrPng}
                className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md active:scale-95"
              >
                <Download className="w-4 h-4 text-slate-950" />
                <span>Download QR Image</span>
              </button>
              <button
                type="button"
                onClick={handleShareToWhatsApp}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md active:scale-95"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Share on WA (Flex Shop)</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                <span>Print Poster</span>
              </button>
            </div>
          </div>

          {/* Printable Poster Preview Container */}
          <div className="border border-slate-700 rounded-2xl p-4 bg-slate-950/80">
            <div className="text-center mb-3">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
                Live Poster Preview (Ready to Print)
              </span>
            </div>

            {/* Poster Card (A4 Aspect Ratio Ready) */}
            <div
              ref={posterRef}
              id="printable-poster"
              className="bg-white text-slate-900 rounded-2xl p-6 sm:p-8 max-w-md mx-auto shadow-2xl border-4 border-amber-400 relative overflow-hidden"
            >
              {/* Background Accents */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-400/20 rounded-full blur-xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-rose-500/20 rounded-full blur-xl pointer-events-none" />

              {/* Poster Header */}
              <div className="text-center space-y-1 relative">
                <div className="inline-block bg-[#0B132B] text-white px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase mb-1">
                  OFFICIAL STORE APP
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#0B132B] uppercase">
                  {settings.storeName}
                </h1>
                <p className="text-xs font-bold text-amber-600 tracking-wide uppercase">
                  {settings.storeTagline || "Men's Luxury & Streetwear Store"}
                </p>
                <p className="text-[11px] text-slate-600 font-semibold">
                  📍 {settings.storeAddress || 'Bazar Line, Chhuikhadan (C.G.)'}
                </p>
              </div>

              {/* Divider */}
              <div className="h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent my-4" />

              {/* Scan Callout */}
              <div className="text-center space-y-1">
                <div className="text-sm font-black text-[#0B132B] uppercase tracking-wider flex items-center justify-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-amber-600" />
                  <span>Scan to Download App</span>
                </div>
                <p className="text-[11px] text-slate-600 font-medium">
                  Google Lens, Phone Camera ya Paytm/PhonePe se scan karein!
                </p>
              </div>

              {/* QR Code In Center */}
              <div className="my-4 flex flex-col items-center justify-center">
                <div
                  onClick={handleDownloadQrPng}
                  title="Click to Download or Share"
                  className="p-3 bg-white rounded-2xl border-2 border-slate-900 shadow-xl relative group cursor-pointer hover:scale-102 transition"
                >
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="ABHI FASHION App Download QR Code"
                      className="w-48 h-48 sm:w-56 sm:h-56 object-contain select-none"
                    />
                  ) : (
                    <div className="w-48 h-48 sm:w-56 sm:h-56 bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
                      Generating Barcode...
                    </div>
                  )}
                  {/* Center Badge */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md border-2 border-white">
                      AF
                    </div>
                  </div>
                </div>

                {/* Mobile Long Press Tip */}
                <div className="mt-2 p-2 rounded-xl bg-amber-50 border border-amber-200 text-center max-w-xs">
                  <p className="text-[10px] text-amber-900 font-bold leading-tight">
                    💡 <strong>Mobile Tip:</strong> Photo gallery me save karne ke liye upar Barcode par <strong>1 second ungli daba kar rakhein (Long Press)</strong> aur <strong>"Download image"</strong> chunein!
                  </p>
                </div>

                <span className="text-[11px] font-mono font-extrabold text-[#0B132B] mt-2 break-all max-w-[280px] text-center px-2 py-0.5 rounded-md bg-amber-50 border border-amber-300">
                  {activeDownloadUrl}
                </span>
                <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest mt-1">
                  Direct 1-Click App Download • 100% Free
                </span>
              </div>

              {/* Store Highlights / Key Benefits */}
              <div className="grid grid-cols-1 gap-2 pt-2 border-t border-slate-200 text-xs">
                <div className="flex items-center gap-2 bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                  <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-[11px] text-slate-800 font-bold">
                    ⚡ <strong>10 Minute Express Delivery:</strong> Chhuikhadan me matra 10 minute me Free Home Delivery!
                  </span>
                </div>

                <div className="flex items-center gap-2 bg-cyan-50 p-2 rounded-xl border border-cyan-200">
                  <CreditCard className="w-4 h-4 text-cyan-700 shrink-0" />
                  <span className="text-[11px] text-slate-800 font-bold">
                    💳 <strong>Cards & Credit Card EMI:</strong> Debit/Credit Card & Bank EMI (HDFC, SBI, ICICI, Axis)
                  </span>
                </div>

                <div className="flex items-center gap-2 bg-amber-50 p-2 rounded-xl border border-amber-200">
                  <CreditCard className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-[11px] text-slate-800 font-bold">
                    ⚡ <strong>Easy EMI (किस्त):</strong> ₹5,000+ orders par 33% Down Payment & Max 3 Mahine EMI
                  </span>
                </div>
              </div>

              {/* Footer Phone Number */}
              <div className="mt-4 pt-3 border-t-2 border-dashed border-slate-300 text-center">
                <p className="text-[11px] font-bold text-slate-700">
                  Store Contact / WhatsApp: <span className="text-[#0B132B] font-black">+91 {settings.whatsappNumber || '9826198421'}</span>
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  ABHI FASHION • Bazar Line, Chhuikhadan (Dist. KCG, Chhattisgarh)
                </p>
              </div>
            </div>
          </div>

          {/* Printing Press Guide */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs space-y-2 text-slate-300">
            <h4 className="font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Poster Printing Tips:</span>
            </h4>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300 leading-relaxed">
              <li>
                <strong>Flex / Standee Printing:</strong> Upar diye gaye <strong>"Download QR Image"</strong> ya <strong>"Share on WA"</strong> button se Barcode PNG flex printing shop ko WhatsApp kar sakte hain.
              </li>
              <li>
                <strong>Dukaan me Direct Print:</strong> <strong>"Print Poster"</strong> button dabayein aur apne printer se A4 size photo paper ya glossy sheet par print karke counter par standee me laga dein.
              </li>
              <li>
                <strong>Automatic Scan:</strong> Koi bhi customer apne phone ke Camera, Google Lens, ya Paytm/GPay se scan karega, toh turant Google Drive se Abhi Fashion App download hone lagega!
              </li>
            </ul>
          </div>
        </div>

        {/* Sticky Mobile Modal Footer (Always Visible!) */}
        <div className="p-3 sm:p-4 bg-[#0B132B] border-t border-slate-800 flex flex-wrap justify-between items-center gap-2 sticky bottom-0 z-10 shadow-2xl">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadQrPng}
              className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md active:scale-95"
            >
              <Download className="w-4 h-4 text-slate-950" />
              <span>Download Barcode</span>
            </button>
            <button
              type="button"
              onClick={handleShareToWhatsApp}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md"
              title="Share on WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">WhatsApp Share</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={activeDownloadUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 px-2 py-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Test Link</span>
            </a>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
