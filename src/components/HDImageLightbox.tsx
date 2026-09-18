import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { getHdImageUrl } from '../utils/productHelpers';

interface HDImageLightboxProps {
  isOpen: boolean;
  images: string[];
  initialIndex?: number;
  productName: string;
  onClose: () => void;
}

export const HDImageLightbox: React.FC<HDImageLightboxProps> = ({
  isOpen,
  images,
  initialIndex = 0,
  productName,
  onClose,
}) => {
  if (!isOpen || images.length === 0) return null;

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);

  const currentRawUrl = images[currentIndex] || images[0];
  const hdUrl = getHdImageUrl(currentRawUrl);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
    setIsZoomed(false);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    setIsZoomed(false);
  };

  return (
    <div
      id="hd-image-lightbox"
      className="fixed inset-0 z-60 bg-black/95 backdrop-blur-md flex flex-col justify-between animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Top Bar */}
      <div
        className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-md bg-amber-500 text-slate-950 text-xs font-black tracking-wider uppercase flex items-center gap-1 shadow-md">
            <Sparkles className="w-3.5 h-3.5" />
            ULTRA HD
          </span>
          <span className="text-white text-xs sm:text-sm font-bold truncate max-w-[200px] sm:max-w-md">
            {productName}
          </span>
          <span className="text-slate-400 text-xs font-mono">
            ({currentIndex + 1}/{images.length})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsZoomed(!isZoomed)}
            aria-label="Toggle Zoom"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer"
            title={isZoomed ? 'Zoom Out' : 'Zoom In HD'}
          >
            {isZoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close HD Viewer"
            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div
        className="flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`relative max-w-full max-h-full flex items-center justify-center transition-all duration-300 ${
            isZoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'
          }`}
          onClick={() => setIsZoomed(!isZoomed)}
        >
          <img
            src={hdUrl}
            alt={productName}
            className="max-h-[80vh] w-auto object-contain rounded-xl shadow-2xl select-none"
            style={{ imageRendering: 'auto' }}
          />
        </div>

        {/* Previous / Next buttons */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous Image"
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-900/80 border border-slate-700 hover:bg-amber-500 hover:text-slate-950 text-white transition cursor-pointer shadow-xl"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next Image"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-900/80 border border-slate-700 hover:bg-amber-500 hover:text-slate-950 text-white transition cursor-pointer shadow-xl"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Bottom Thumbnail Strip */}
      {images.length > 1 && (
        <div
          className="p-3 bg-gradient-to-t from-black/90 to-transparent flex justify-center gap-2 overflow-x-auto z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setCurrentIndex(idx);
                setIsZoomed(false);
              }}
              className={`w-12 h-16 rounded-lg overflow-hidden border-2 transition cursor-pointer shrink-0 ${
                currentIndex === idx
                  ? 'border-amber-400 ring-2 ring-amber-400/50 scale-105'
                  : 'border-slate-800 opacity-60 hover:opacity-100'
              }`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
