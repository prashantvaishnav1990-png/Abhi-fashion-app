import React, { useState } from 'react';
import {
  Download,
  Share2,
  Smartphone,
  CheckCircle2,
  Truck,
  CreditCard,
  ShoppingBag,
  ShieldCheck,
  MapPin,
  QrCode,
  ArrowRight,
  Store,
  Sparkles,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { StoreSettings } from '../types';

interface AppDownloadViewProps {
  settings: StoreSettings;
  onOpenStore: () => void;
}

export const AppDownloadView: React.FC<AppDownloadViewProps> = ({
  settings,
  onOpenStore,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [installSuccess, setInstallSuccess] = useState(false);

  const handleInstallClick = async () => {
    if (isInstallable) {
      const res = await install();
      if (res) {
        setInstallSuccess(true);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#070D1F] text-slate-100 flex flex-col justify-between py-6 px-4">
      <div className="max-w-xl mx-auto w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-black tracking-widest uppercase">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>OFFICIAL STORE APPLICATION</span>
          </div>

          <div className="flex items-center justify-center gap-3 pt-1">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-rose-600 p-0.5 shadow-xl">
              <div className="w-full h-full bg-[#0B132B] rounded-[14px] flex items-center justify-center">
                <span className="font-black text-amber-400 text-xl tracking-tight">AF</span>
              </div>
            </div>
            <div className="text-left">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide uppercase">
                {settings.storeName}
              </h1>
              <p className="text-xs text-amber-400 font-bold uppercase tracking-wider">
                {settings.storeTagline || "Men's Luxury & Streetwear Store"}
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5 pt-1">
            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span>{settings.storeAddress || 'Bazar Line, Chhuikhadan (C.G.)'}</span>
          </p>
        </div>

        {/* Hero Card with Direct Download */}
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-amber-500/30 shadow-2xl space-y-5 text-center relative overflow-hidden">
          <div className="space-y-2">
            <h2 className="text-lg sm:text-xl font-black text-white">
              📱 Poster Barcode Scan Safal Hua!
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
              Apne mobile me <strong>{settings.storeName}</strong> app download karein aur Chhuikhadan me best luxury shirts, jeans aur t-shirts ghar baithe mangaayein.
            </p>
          </div>

          {/* Primary Action Button */}
          <div className="space-y-3 max-w-md mx-auto">
            {isInstalled || installSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 flex items-center justify-center gap-2 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>App Aapke Phone Me Install Ho Chuka Hai!</span>
              </div>
            ) : isInstallable ? (
              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:brightness-110 text-slate-950 font-black text-base flex items-center justify-center gap-2.5 shadow-xl shadow-amber-400/25 active:scale-98 transition cursor-pointer"
              >
                <Download className="w-5 h-5 text-slate-950" />
                <span>⚡ 1-Click App Download Karein</span>
              </button>
            ) : isIOS ? (
              <div className="p-4 rounded-2xl bg-slate-800 border border-amber-500/30 text-left space-y-2">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                  <Smartphone className="w-4 h-4" />
                  <span>iPhone / iPad Me Install Kaise Karein:</span>
                </div>
                <ol className="text-[11px] text-slate-300 space-y-1 list-decimal list-inside leading-relaxed">
                  <li>Safari browser me neeche diye gaye <strong className="text-amber-400">Share (📤)</strong> icon par tap karein.</li>
                  <li>List me scroll karke <strong className="text-amber-400">'Add to Home Screen'</strong> chunein.</li>
                  <li>Abhi Fashion app aapki home screen par add ho jayega!</li>
                </ol>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenStore}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:brightness-110 text-slate-950 font-black text-base flex items-center justify-center gap-2.5 shadow-xl shadow-amber-400/25 active:scale-98 transition cursor-pointer"
              >
                <ShoppingBag className="w-5 h-5 text-slate-950" />
                <span>🛍️ Open App & Start Shopping</span>
              </button>
            )}

            {/* Direct APK Download Button */}
            {settings.appPublicUrl && (
              <a
                href={settings.appPublicUrl}
                download="ABHI-FASHION.apk"
                className="w-full py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-950" />
                <span>📥 Direct Android APK Download Karein</span>
              </a>
            )}

            {/* Direct Open Web Store Button */}
            <button
              type="button"
              onClick={onOpenStore}
              className="w-full py-3 px-4 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition cursor-pointer"
            >
              <span>Dukaan Ke Kapde Browse Karein (Open Store)</span>
              <ArrowRight className="w-4 h-4 text-amber-400" />
            </button>
          </div>
        </div>

        {/* Store Perks & Delivery Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-200 space-y-1">
            <div className="flex items-center gap-2 font-bold text-white">
              <Truck className="w-4 h-4 text-emerald-400" />
              <span>⚡ 10 Minute Express Delivery (Chhuikhadan)</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              Chhuikhadan local town me order confirm hote hi <strong>10 minute ke andar</strong> FREE delivery (₹0 Delivery Fee).
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-amber-200 space-y-1">
            <div className="flex items-center gap-2 font-bold text-white">
              <Truck className="w-4 h-4 text-amber-400" />
              <span>Under 10 km: ₹50 Delivery</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              4 km se 10 km tak sirf ₹50 delivery charge (Prepaid Online orders).
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/40 text-cyan-200 space-y-1 sm:col-span-2">
            <div className="flex items-center gap-2 font-bold text-white">
              <CreditCard className="w-4 h-4 text-cyan-400" />
              <span>💳 Debit Card, Credit Card & Credit Card EMI Uplabdh</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              Debit Card, Credit Card (Visa, RuPay, MasterCard) ya major banks (HDFC, SBI, ICICI, Axis, Kotak) se 3, 6, 9, 12 mahine ki <strong>Credit Card EMI</strong> par kapde khareedein!
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-amber-200 space-y-1 sm:col-span-2">
            <div className="flex items-center gap-2 font-bold text-white">
              <CreditCard className="w-4 h-4 text-amber-400" />
              <span>⚡ Kist Pe (किस्त पे) & Razorpay: Min ₹5,000 • 33% Down Payment (Max 3 Mo.)</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              Bina credit card ke Kist Pe / UPI AutoPay se 33% down payment karein aur baaki amount 2 ya 3 mahine ki 0% interest kiston me chukayein! Saath hi Razorpay gateway se Debit/Credit Card bhi accepted hai.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 space-y-1 sm:col-span-2">
            <div className="flex items-center gap-2 font-bold text-white">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Prepaid Orders for 4 km and Above & WhatsApp Confirmation</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              4 km aur usse door ke sabhi orders Prepaid honge. Har order bina valid mobile number ke place nahi hoga aur WhatsApp par confirm kiya jata hai.
            </p>
          </div>
        </div>

      </div>

      {/* Footer */}
      <footer className="text-center pt-8 text-[11px] text-slate-400 space-y-1">
        <p>© {new Date().getFullYear()} {settings.storeName} • Bazar Line, Chhuikhadan (Dist. KCG, Chhattisgarh)</p>
        <p>Support WhatsApp: +91 {settings.whatsappNumber || '8982147180'}</p>
      </footer>
    </div>
  );
};
