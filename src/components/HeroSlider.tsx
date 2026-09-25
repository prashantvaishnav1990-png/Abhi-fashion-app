import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, CreditCard, ArrowRight } from 'lucide-react';
import { Banner, CategoryId } from '../types';

interface HeroSliderProps {
  banners: Banner[];
  onSelectCategory: (category: CategoryId) => void;
  onShopNow: () => void;
  onOpenOfferManager?: () => void;
}

export const HeroSlider: React.FC<HeroSliderProps> = ({
  banners,
  onSelectCategory,
  onShopNow,
  onOpenOfferManager,
}) => {
  const activeBanners = banners.filter((b) => b.isEnabled);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
    }, 5500);
    return () => clearInterval(interval);
  }, [activeBanners.length]);

  if (activeBanners.length === 0) return null;

  const currentBanner = activeBanners[currentIndex];

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-slate-900 border border-slate-800/80 shadow-2xl">
      <div className="relative min-h-[380px] sm:min-h-[420px] flex items-center">
        {/* Quick Offer Manager Button directly on top box */}
        {onOpenOfferManager && (
          <button
            onClick={onOpenOfferManager}
            className="absolute top-3.5 right-3.5 z-30 px-3 py-1.5 rounded-xl bg-slate-950/85 hover:bg-slate-900 text-amber-400 hover:text-amber-300 border border-amber-500/40 text-xs font-black backdrop-blur-md shadow-xl flex items-center gap-1.5 transition active:scale-95 cursor-pointer group"
            title="Uper ke box me naya offer photo ke sath jodein"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition-transform" />
            <span>+ नया ऑफर जोड़ें (Manage Box)</span>
          </button>
        )}

        {/* Background Image with Dark Vignette & Gradient Overlays */}
        <img
          src={currentBanner.image}
          alt={currentBanner.title}
          className="absolute inset-0 w-full h-full object-cover object-center transition-all duration-700 brightness-[0.45]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F1D] via-[#0A0F1D]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0F1D] via-[#0A0F1D]/70 to-transparent" />

        {/* Content Container */}
        <div className="relative z-10 p-5 sm:p-8 md:p-10 max-w-xl text-left">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>{currentBanner.badge}</span>
          </div>

          {/* User Prompt Slogan Headline */}
          <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight tracking-tight uppercase">
            {currentBanner.title}
          </h1>

          {/* Subtitle */}
          <p className="text-amber-400 font-extrabold text-sm sm:text-base mt-2 tracking-widest uppercase">
            {currentBanner.subtitle}
          </p>

          {/* EMI & Offer Tagline */}
          <div className="mt-3 flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-300 bg-slate-800/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/70 w-fit">
            <CreditCard className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{currentBanner.offerText}</span>
          </div>

          {/* Action Buttons */}
          <div className="mt-5 sm:mt-6 flex flex-wrap items-center gap-3">
            <button
              id="hero-shop-now-btn"
              onClick={onShopNow}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition cursor-pointer"
            >
              <span>EXPLORE COLLECTION</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {currentBanner.categoryId && (
              <button
                id="hero-category-btn"
                onClick={() => onSelectCategory(currentBanner.categoryId!)}
                className="bg-slate-800/80 hover:bg-slate-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm border border-slate-700 transition cursor-pointer"
              >
                View {currentBanner.categoryId.toUpperCase()}
              </button>
            )}
          </div>
        </div>

        {/* Carousel controls */}
        {activeBanners.length > 1 && (
          <>
            <button
              onClick={() =>
                setCurrentIndex((prev) => (prev === 0 ? activeBanners.length - 1 : prev - 1))
              }
              aria-label="Previous Slide"
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white/80 hover:text-white backdrop-blur-xs transition z-20"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentIndex((prev) => (prev + 1) % activeBanners.length)}
              aria-label="Next Slide"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white/80 hover:text-white backdrop-blur-xs transition z-20"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Slide Indicator Dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
              {activeBanners.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentIndex ? 'w-6 bg-amber-400' : 'w-2 bg-slate-600 hover:bg-slate-400'
                  }`}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Trust bar underneath hero */}
      <div className="grid grid-cols-3 divide-x divide-slate-800 bg-[#070B14] py-2.5 px-2 text-center text-[11px] sm:text-xs text-slate-300">
        <div>
          <span className="font-bold text-amber-400">100% Original</span> Men's Wear
        </div>
        <div>
          <span className="font-bold text-amber-400">Cash on Delivery</span> Available
        </div>
        <div>
          <span className="font-bold text-amber-400">Local Pickup / Fast</span> Chhuikhadan
        </div>
      </div>
    </div>
  );
};
