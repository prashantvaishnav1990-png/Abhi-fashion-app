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
import { useBackHandler } from '../hooks/useBackHandler';

const VERIFIED_GOOGLE_DRIVE_URL =
  'https://drive.google.com/uc?export=download&id=1t2FkhgLeFDTbK_WPmgA1aaii7vzXpgtz';

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
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);
  const [generatedPosterUrl, setGeneratedPosterUrl] = useState<string | null>(null);
  const [showPosterSaveModal, setShowPosterSaveModal] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  // Phone back button: close sub-modals within poster modal
  useBackHandler(isOpen && showPosterSaveModal, () => setShowPosterSaveModal(false), 26, 'PosterSaveModal');
  useBackHandler(isOpen && !showPosterSaveModal && showHowTo, () => setShowHowTo(false), 24, 'PosterHowTo');

  const rawPhone =
    settings.whatsappNumber && !settings.whatsappNumber.includes('98261')
      ? settings.whatsappNumber
      : settings.supportPhone && !settings.supportPhone.includes('98261')
      ? settings.supportPhone
      : '8982147180';
  const cleanDigits = rawPhone.replace(/\D/g, '');
  const last10 = cleanDigits.slice(-10);
  const formattedPhoneNumber =
    last10.length === 10
      ? `+91 ${last10.slice(0, 5)} ${last10.slice(5)}`
      : '+91 89821 47180';

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

  // Canvas generator for full professional shop poster image
  const generatePosterCanvas = (qrSource: string): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 1680;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(qrSource);

      const drawRoundRect = (
        x: number,
        y: number,
        w: number,
        h: number,
        r: number,
        fill?: string,
        stroke?: string,
        strokeWidth?: number
      ) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        if (fill) {
          ctx.fillStyle = fill;
          ctx.fill();
        }
        if (stroke) {
          ctx.strokeStyle = stroke;
          ctx.lineWidth = strokeWidth || 2;
          ctx.stroke();
        }
      };

      // 1. Crisp White Background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 1200, 1680);

      // 2. Elegant Outer Gold Border
      drawRoundRect(24, 24, 1152, 1632, 36, undefined, '#F59E0B', 10);
      drawRoundRect(40, 40, 1120, 1600, 26, undefined, '#FEF3C7', 2);

      // 3. Top Tag: OFFICIAL STORE APPLICATION
      drawRoundRect(400, 68, 400, 48, 24, '#0B132B');
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 18px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('OFFICIAL STORE APPLICATION', 600, 99);

      // 4. Store Name
      ctx.fillStyle = '#0B132B';
      ctx.font = '900 64px system-ui, -apple-system, sans-serif';
      ctx.fillText((settings.storeName || 'ABHI FASHION').toUpperCase(), 600, 190);

      // 5. Store Tagline
      ctx.fillStyle = '#D97706';
      ctx.font = '800 24px system-ui, -apple-system, sans-serif';
      ctx.fillText(
        (settings.storeTagline || "Men's Luxury & Streetwear Store").toUpperCase(),
        600,
        230
      );

      // 6. Address
      ctx.fillStyle = '#475569';
      ctx.font = '600 20px system-ui, -apple-system, sans-serif';
      ctx.fillText(
        `📍 ${settings.storeAddress || 'Bazar Line, Chhuikhadan (Dist. KCG, C.G.)'}`,
        600,
        268
      );

      // 7. Divider Line
      const grad = ctx.createLinearGradient(160, 300, 1040, 300);
      grad.addColorStop(0, 'rgba(245, 158, 11, 0.1)');
      grad.addColorStop(0.5, '#F59E0B');
      grad.addColorStop(1, 'rgba(245, 158, 11, 0.1)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(160, 305);
      ctx.lineTo(1040, 305);
      ctx.stroke();

      // 8. Callout Title: SCAN TO DOWNLOAD APP
      ctx.fillStyle = '#0B132B';
      ctx.font = '900 36px system-ui, -apple-system, sans-serif';
      ctx.fillText('📱 SCAN TO DOWNLOAD OFFICIAL APP', 600, 365);

      ctx.fillStyle = '#64748B';
      ctx.font = '600 22px system-ui, -apple-system, sans-serif';
      ctx.fillText(
        'Google Lens, Phone Camera ya Paytm / PhonePe se scan karein!',
        600,
        405
      );

      // 9. Load & Draw QR Code Image
      const qrImg = new Image();
      qrImg.crossOrigin = 'anonymous';
      qrImg.onload = () => {
        // Outer card behind QR
        drawRoundRect(340, 450, 520, 520, 30, '#FFFFFF', '#0B132B', 4);

        // Draw QR image
        ctx.drawImage(qrImg, 365, 475, 470, 470);

        // Center AF Badge
        drawRoundRect(550, 660, 100, 100, 24, '#F59E0B', '#FFFFFF', 6);
        ctx.fillStyle = '#0B132B';
        ctx.font = '900 46px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('AF', 600, 730);

        // 10. Store Highlights (Useful information only!)
        // Feature 1: Express Delivery
        drawRoundRect(140, 1020, 920, 85, 20, '#ECFDF5', '#A7F3D0', 2);
        ctx.fillStyle = '#065F46';
        ctx.font = '800 24px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('⚡ 10 Minute Express Delivery:', 170, 1070);
        ctx.fillStyle = '#1F2937';
        ctx.font = '600 22px system-ui, -apple-system, sans-serif';
        ctx.fillText('Chhuikhadan me matra 10 minute me Free Home Delivery!', 540, 1070);

        // Feature 2: Cards & EMI
        drawRoundRect(140, 1125, 920, 85, 20, '#ECFEFF', '#A5F3FC', 2);
        ctx.fillStyle = '#0E7490';
        ctx.font = '800 24px system-ui, -apple-system, sans-serif';
        ctx.fillText('💳 Cards & Credit Card EMI:', 170, 1175);
        ctx.fillStyle = '#1F2937';
        ctx.font = '600 22px system-ui, -apple-system, sans-serif';
        ctx.fillText('Debit/Credit Card, RuPay, Visa, MasterCard Accepted', 500, 1175);

        // Feature 3: Easy EMI
        drawRoundRect(140, 1230, 920, 85, 20, '#FFFBEB', '#FDE68A', 2);
        ctx.fillStyle = '#B45309';
        ctx.font = '800 24px system-ui, -apple-system, sans-serif';
        ctx.fillText('🛍️ Easy EMI (किस्त पे):', 170, 1280);
        ctx.fillStyle = '#1F2937';
        ctx.font = '600 22px system-ui, -apple-system, sans-serif';
        ctx.fillText('₹5,000+ orders par 33% Down Payment & 0% Byaj Kist', 450, 1280);

        // 11. Footer Phone & Contact
        ctx.strokeStyle = '#CBD5E1';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(140, 1370);
        ctx.lineTo(1060, 1370);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#0B132B';
        ctx.font = '900 30px system-ui, -apple-system, sans-serif';
        ctx.fillText(`Store Contact / WhatsApp: ${formattedPhoneNumber}`, 600, 1435);

        ctx.fillStyle = '#64748B';
        ctx.font = '600 20px system-ui, -apple-system, sans-serif';
        ctx.fillText('ABHI FASHION • Bazar Line, Chhuikhadan (Dist. KCG, Chhattisgarh)', 600, 1480);

        resolve(canvas.toDataURL('image/png', 1.0));
      };

      qrImg.onerror = () => {
        resolve(qrSource);
      };

      qrImg.src = qrSource;
    });
  };

  // Full Poster Download Handler (Android proof + Gallery Save Sheet)
  const handleDownloadPoster = async () => {
    if (!qrDataUrl) return;
    setIsGeneratingPoster(true);

    try {
      const posterData = await generatePosterCanvas(qrDataUrl);
      setGeneratedPosterUrl(posterData);
      setShowPosterSaveModal(true);

      // Trigger standard anchor download
      const a = document.createElement('a');
      a.href = posterData;
      a.download = 'ABHI-FASHION-Store-Poster.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setShareSuccess('Poster taiyar hai! Gallery me save ya WhatsApp karein.');
      setTimeout(() => setShareSuccess(null), 4000);
    } catch (e) {
      console.error(e);
      setShareSuccess('Poster tayar ho gaya!');
    } finally {
      setIsGeneratingPoster(false);
    }
  };

  // Barcode-only Download Handler
  const handleDownloadOnlyQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = 'ABHI-FASHION-App-QR.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setShareSuccess('Barcode PNG downloaded!');
    setTimeout(() => setShareSuccess(null), 3000);
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
                onClick={handleDownloadPoster}
                disabled={isGeneratingPoster}
                className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
              >
                <Download className="w-4 h-4 text-slate-950" />
                <span>{isGeneratingPoster ? 'Generating...' : 'Download Full Poster'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadOnlyQr}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Barcode Only</span>
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
                Live Poster Preview (Clean Print Ready)
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
                  onClick={handleDownloadOnlyQr}
                  title="Click to Download Barcode"
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

                <div className="mt-3 text-center">
                  <span className="inline-block px-3 py-1 bg-amber-50 border border-amber-300 rounded-full text-[10px] font-black text-slate-900 tracking-wider uppercase">
                    SCAN TO INSTALL • 100% FREE OFFICIAL APP
                  </span>
                </div>
              </div>

              {/* Store Highlights / Key Benefits */}
              <div className="grid grid-cols-1 gap-2 pt-2 border-t border-slate-200 text-xs">
                <div className="flex items-center gap-2 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                  <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-[11px] text-slate-800 font-bold">
                    ⚡ <strong>10 Minute Express Delivery:</strong> Chhuikhadan me matra 10 minute me Free Home Delivery!
                  </span>
                </div>

                <div className="flex items-center gap-2 bg-cyan-50 p-2.5 rounded-xl border border-cyan-200">
                  <CreditCard className="w-4 h-4 text-cyan-700 shrink-0" />
                  <span className="text-[11px] text-slate-800 font-bold">
                    💳 <strong>Cards & Credit Card EMI:</strong> Debit/Credit Card & Bank EMI (HDFC, SBI, ICICI, Axis)
                  </span>
                </div>

                <div className="flex items-center gap-2 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                  <CreditCard className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-[11px] text-slate-800 font-bold">
                    ⚡ <strong>Easy EMI (किस्त):</strong> ₹5,000+ orders par 33% Down Payment & Max 3 Mahine EMI
                  </span>
                </div>
              </div>

              {/* Footer Phone Number */}
              <div className="mt-4 pt-3 border-t-2 border-dashed border-slate-300 text-center">
                <p className="text-[11px] font-bold text-slate-700">
                  Store Contact / WhatsApp: <span className="text-[#0B132B] font-black">{formattedPhoneNumber}</span>
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
                <strong>Full Poster (पूरा पोस्टर):</strong> <strong>"Download Full Poster"</strong> dabayein — isme high-resolution 1200x1680 poster download hoga jisme na mobile tip hogi aur na bada link, bilkul clean dukan poster ready!
              </li>
              <li>
                <strong>Flex / Standee Printing:</strong> <strong>"Share on WA (Flex Shop)"</strong> se poster flex shop wale ko direct bhej kar standee ya banner print karwayein.
              </li>
              <li>
                <strong>Counter Standee / A4 Print:</strong> <strong>"Print Poster"</strong> button se A4 glossy sheet par print karke dukaan ke billing counter par standee me lagayein.
              </li>
            </ul>
          </div>
        </div>

        {/* Sticky Mobile Modal Footer (Always Visible!) */}
        <div className="p-3 sm:p-4 bg-[#0B132B] border-t border-slate-800 flex flex-wrap justify-between items-center gap-2 sticky bottom-0 z-10 shadow-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPoster}
              disabled={isGeneratingPoster}
              className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-slate-950" />
              <span>{isGeneratingPoster ? 'Generating...' : 'Download Poster'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadOnlyQr}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition cursor-pointer shadow-sm active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Barcode Only</span>
            </button>
            <button
              type="button"
              onClick={handleShareToWhatsApp}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md"
              title="Share on WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">WhatsApp</span>
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

        {/* Android / WebView Proof Save Sheet Modal */}
        {showPosterSaveModal && generatedPosterUrl && (
          <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Download className="w-5 h-5 text-amber-400" />
                    <span>Poster Download Ready!</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Flex Printing & Counter Standee Poster</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPosterSaveModal(false)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Poster Preview */}
              <div className="bg-white rounded-2xl p-2 border-2 border-amber-400 max-h-[48vh] overflow-hidden flex items-center justify-center shadow-inner">
                <img
                  src={generatedPosterUrl}
                  alt="Generated ABHI FASHION Poster"
                  className="w-full h-auto max-h-[46vh] object-contain rounded-xl select-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <a
                  href={generatedPosterUrl}
                  download="ABHI-FASHION-Store-Poster.png"
                  className="w-full py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-98 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition"
                >
                  <Download className="w-4 h-4 text-slate-950" />
                  <span>Save to Phone Gallery / Files</span>
                </a>

                <button
                  type="button"
                  onClick={handleShareToWhatsApp}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Share on WhatsApp (Flex Print Shop)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPosterSaveModal(false)}
                  className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
