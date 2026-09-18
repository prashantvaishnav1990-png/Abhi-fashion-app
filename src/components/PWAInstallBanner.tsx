import React, { useState } from 'react';
import { Download, Share2, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (isInstalled || dismissed) {
    return null;
  }

  // Show if either installable (Android/Chromium) or iOS
  return (
    <>
      <aside
        id="pwa-install-banner"
        aria-label="App installation prompt"
        className="bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-amber-600/20 border-b border-amber-500/30 px-3 py-2 text-xs md:text-sm text-amber-200 flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs shrink-0 shadow">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="truncate">
            <span className="font-semibold text-white">Install ABHI FASHION App</span>
            <span className="hidden sm:inline text-amber-200/80"> — Fast, offline & instant access on your home screen</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isInstallable && (
            <button
              id="btn-pwa-install"
              onClick={install}
              className="bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 px-3 py-1 rounded-full font-bold text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install PWA</span>
            </button>
          )}

          {isIOS && !isInstallable && (
            <button
              id="btn-pwa-install-ios"
              onClick={() => setShowIOSGuide(true)}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 px-3 py-1 rounded-full font-bold text-xs flex items-center gap-1 shadow transition cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Add to Home</span>
            </button>
          )}

          <button
            id="btn-dismiss-pwa-banner"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss banner"
            className="text-amber-200/60 hover:text-white p-1 rounded transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-[#111927] border border-slate-700 p-6 text-slate-100 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-amber-400" />
                Install on iPhone / iPad
              </h3>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <ol className="space-y-3 text-sm text-slate-300">
              <li className="flex gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold flex items-center justify-center shrink-0">1</span>
                <span>Open in <strong>Safari</strong> on your iPhone.</span>
              </li>
              <li className="flex gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold flex items-center justify-center shrink-0">2</span>
                <span>Tap the <strong className="text-amber-300">Share</strong> icon (square with arrow) at the bottom toolbar.</span>
              </li>
              <li className="flex gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold flex items-center justify-center shrink-0">3</span>
                <span>Scroll down and tap <strong className="text-amber-300">Add to Home Screen</strong>.</span>
              </li>
            </ol>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-2.5 text-sm font-bold text-slate-950 hover:from-amber-400 hover:to-amber-500 transition shadow cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
