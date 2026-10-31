import React, { useState, useEffect } from 'react';
import {
  X,
  Star,
  ShoppingBag,
  Zap,
  Check,
  ShieldCheck,
  Truck,
  RotateCcw,
  CreditCard,
  Ruler,
  AlertCircle,
  Sparkles,
  Maximize2,
  Trash2,
} from 'lucide-react';
import { Product, StoreSettings } from '../types';
import { HDImageLightbox } from './HDImageLightbox';
import { getColorHex, getHdImageUrl, getCategoryFallbackImage } from '../utils/productHelpers';
import { useBackHandler } from '../hooks/useBackHandler';

interface ProductDetailsModalProps {
  product: Product | null;
  settings?: StoreSettings;
  onClose: () => void;
  onAddToCart: (product: Product, size: string, quantity: number, color?: string) => void;
  onBuyNow: (product: Product, size: string, quantity: number, color?: string) => void;
  onDeleteProduct?: (product: Product) => void;
}

export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({
  product,
  settings,
  onClose,
  onAddToCart,
  onBuyNow,
  onDeleteProduct,
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState<string | undefined>(
    product?.colors && product.colors.length > 0 ? product.colors[0] : undefined
  );
  const [quantity, setQuantity] = useState(1);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [addedNotice, setAddedNotice] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [sizeError, setSizeError] = useState<string | null>(null);

  // Phone back button: close image lightbox first, then size guide
  useBackHandler(Boolean(product && isLightboxOpen), () => setIsLightboxOpen(false), 30, 'ProductLightbox');
  useBackHandler(Boolean(product && showSizeGuide), () => setShowSizeGuide(false), 26, 'ProductSizeGuide');

  // Sync selected size/color if product changes
  useEffect(() => {
    if (product) {
      setSelectedSize('');
      setSizeError(null);
      setSelectedColor(product.colors && product.colors.length > 0 ? product.colors[0] : undefined);
      setSelectedImageIndex(0);
      setQuantity(1);
    }
  }, [product]);

  if (!product) return null;

  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 4;
  const images = product.images && product.images.length > 0 ? product.images : [
    'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=1200'
  ];

  const handleAddToCart = () => {
    if (isOutOfStock) return;

    // Strict validation: size must be chosen first!
    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      setSizeError('⚠️ Kripya aage badhne se pehle apna SIZE select karein!');
      return;
    }

    if (selectedSize && product.sizeStock && (product.sizeStock[selectedSize] ?? 1) <= 0) {
      setSizeError(`⚠️ Size "${selectedSize}" out of stock hai, kripya doosra size select karein.`);
      return;
    }

    onAddToCart(product, selectedSize || 'Standard', quantity, selectedColor);
    setAddedNotice(true);
    setSizeError(null);
    setTimeout(() => setAddedNotice(false), 2000);
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;

    // Strict validation: size must be chosen first!
    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      setSizeError('⚠️ Kripya aage badhne se pehle apna SIZE select karein!');
      return;
    }

    if (selectedSize && product.sizeStock && (product.sizeStock[selectedSize] ?? 1) <= 0) {
      setSizeError(`⚠️ Size "${selectedSize}" out of stock hai, kripya doosra size select karein.`);
      return;
    }

    onBuyNow(product, selectedSize || 'Standard', quantity, selectedColor);
  };

  // Monthly EMI estimate: 33% down payment, remaining split in max 3 months
  const emiThreshold = settings?.emiMinAmount || 5000;
  const downPayment = Math.round(product.sellingPrice * 0.33);
  const remainingFinanced = product.sellingPrice - downPayment;
  const monthlyEmi = Math.round(remainingFinanced / 3);

  return (
    <>
      <div
        id="product-details-backdrop"
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto"
        onClick={onClose}
      >
        <div
          id="product-details-content"
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-4xl max-h-[92vh] sm:max-h-[90vh] bg-[#0F172A] rounded-t-3xl sm:rounded-3xl border border-slate-800 text-slate-100 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200"
        >
          {/* Sticky Header with Close */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-[#0B132B]/80 sticky top-0 z-20">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                {product.category}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/40 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                HD Quality
              </span>
            </div>
            <button
              id="btn-close-details"
              onClick={onClose}
              aria-label="Close details"
              className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Scrollable Body */}
          <div className="overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Image Gallery */}
            <div className="flex flex-col gap-3">
              {/* Main Large Image */}
              <div
                className="group relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 cursor-zoom-in"
                onClick={() => setIsLightboxOpen(true)}
              >
                <img
                  src={getHdImageUrl(images[selectedImageIndex] || images[0], product.category)}
                  alt={product.name}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = getCategoryFallbackImage(product.category);
                  }}
                  className="w-full h-full object-cover object-center transition duration-300 group-hover:scale-105"
                />
                {product.discountPercent > 0 && (
                  <div className="absolute top-3 left-3 bg-rose-600 text-white text-xs font-black px-2.5 py-1 rounded-md shadow-md uppercase">
                    {product.discountPercent}% OFF
                  </div>
                )}

                {/* HD Tap to Zoom Badge */}
                <div className="absolute bottom-3 right-3 bg-black/75 hover:bg-black text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 border border-white/20 shadow-lg">
                  <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>View Full HD ({selectedImageIndex + 1}/{images.length})</span>
                </div>
              </div>

              {/* Thumbnail Selectors */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 items-center">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`relative w-16 h-20 rounded-xl overflow-hidden shrink-0 border-2 transition cursor-pointer ${
                        selectedImageIndex === idx
                          ? 'border-amber-400 ring-2 ring-amber-400/30 scale-105'
                          : 'border-slate-800 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={getHdImageUrl(img, product.category)}
                        alt=""
                        onError={(e) => {
                          const fallback = getCategoryFallbackImage(product.category);
                          if (e.currentTarget.src !== fallback) {
                            e.currentTarget.src = fallback;
                          }
                        }}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-0.5 right-0.5 bg-black/60 text-[9px] text-white px-1 rounded font-mono">
                        HD
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Information & Actions */}
            <div className="flex flex-col">
              {/* Title & Brand */}
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/30">
                    ABHI FASHION EXCLUSIVE
                  </span>
                  <div className="flex items-center gap-1 text-xs text-amber-400">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-bold">{product.rating}</span>
                    <span className="text-slate-400">({product.reviewsCount} reviews)</span>
                  </div>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                  {product.name}
                </h2>
              </div>

              {/* Price & Savings */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90 mb-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-2xl sm:text-3xl font-black text-white">
                    ₹{product.sellingPrice.toLocaleString('en-IN')}
                  </span>
                  {product.mrp > product.sellingPrice && (
                    <span className="text-sm text-slate-400 line-through">
                      MRP ₹{product.mrp.toLocaleString('en-IN')}
                    </span>
                  )}
                  <span className="text-xs font-bold text-rose-400">
                    Save ₹{(product.mrp - product.sellingPrice).toLocaleString('en-IN')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Inclusive of all local taxes</p>

                {/* EMI Callout */}
                <div className="mt-2.5 pt-2.5 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                    <CreditCard className="w-4 h-4 text-amber-400" />
                    {product.sellingPrice >= emiThreshold ? (
                      <span>EMI: 33% Down (₹{downPayment.toLocaleString('en-IN')}) + ₹{monthlyEmi.toLocaleString('en-IN')}/mo (Max 3 Mo.)</span>
                    ) : (
                      <span>Easy EMI on cart ₹5,000+ (33% Down • Max 3 Mo.)</span>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                    Easy EMI (Max 3 Mo.)
                  </span>
                </div>
              </div>

            {/* Stock Availability */}
            <div className="mb-4">
              {isOutOfStock ? (
                <div className="flex items-center gap-2 text-rose-400 text-xs font-bold bg-rose-950/30 border border-rose-800/40 p-2.5 rounded-xl">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Currently Out of Stock. Check back soon or WhatsApp store!</span>
                </div>
              ) : isLowStock ? (
                <div className="flex items-center gap-2 text-amber-300 text-xs font-bold bg-amber-950/40 border border-amber-500/40 p-2.5 rounded-xl animate-pulse">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Hurry! Only {product.stock} left in stock at our Bazar Line store.</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium">
                  <Check className="w-4 h-4" />
                  <span>In Stock & ready for instant dispatch in Chhuikhadan</span>
                </div>
              )}
            </div>

            {/* Color Selector (If colors available) */}
            {product.colors && product.colors.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                    <span>Select Colour ({product.colors.length} Available):</span>
                  </label>
                  <span className="text-xs font-semibold text-amber-400">
                    {selectedColor || product.colors[0]}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {product.colors.map((colorName) => {
                    const hex = getColorHex(colorName);
                    const isSelected = (selectedColor || product.colors?.[0]) === colorName;
                    return (
                      <button
                        key={colorName}
                        type="button"
                        onClick={() => setSelectedColor(colorName)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                          isSelected
                            ? 'bg-amber-400 text-slate-950 border-amber-400 ring-2 ring-amber-400/40 shadow-md'
                            : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/40 shrink-0"
                          style={{ backgroundColor: hex }}
                        />
                        <span>{colorName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Size Selector */}
            <div className={`mb-4 p-3 rounded-2xl transition border ${sizeError ? 'border-amber-400 bg-amber-400/5 ring-2 ring-amber-400/40' : 'border-slate-800/80 bg-slate-900/40'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-bold text-white uppercase tracking-wider">
                    Select Size:
                  </label>
                  {selectedSize ? (
                    <span className="text-xs font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">
                      Selected: {selectedSize}
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-amber-400 animate-pulse">
                      *(Size chunna jaruri hai)
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowSizeGuide(!showSizeGuide)}
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                >
                  <Ruler className="w-3.5 h-3.5" />
                  <span>Size Chart</span>
                </button>
              </div>

              {/* Alert message if customer tries to add/buy without choosing size */}
              {sizeError && (
                <div className="mb-3 p-2.5 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-200 text-xs font-black flex items-center gap-2 animate-bounce">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{sizeError}</span>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => {
                  const sizeQty = product.sizeStock?.[size];
                  const isSoldOut = sizeQty !== undefined && sizeQty <= 0;
                  const isSelected = selectedSize === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      disabled={isSoldOut}
                      onClick={() => {
                        setSelectedSize(size);
                        setSizeError(null);
                      }}
                      className={`min-w-14 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer border flex flex-col items-center gap-0.5 ${
                        isSoldOut
                          ? 'bg-slate-900/60 text-slate-500 border-slate-800 line-through opacity-50 cursor-not-allowed'
                          : isSelected
                          ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md ring-2 ring-amber-400/50 scale-105 font-black'
                          : 'bg-slate-900 text-slate-200 border-slate-700 hover:border-amber-400/60'
                      }`}
                    >
                      <span className="font-mono text-sm">{size}</span>
                      <span className={`text-[9px] ${isSelected ? 'text-slate-900 font-bold' : isSoldOut ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {isSoldOut
                          ? 'Out of Stock'
                          : sizeQty !== undefined
                          ? `${sizeQty} in stock`
                          : 'In Stock'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Size Chart Tooltip / Drawer */}
              {showSizeGuide && (
                <div className="mt-3 p-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300 animate-in fade-in">
                  <h4 className="font-bold text-white mb-1.5">Standard Size Guide (Chest / Waist in inches):</h4>
                  <div className="grid grid-cols-4 gap-1.5 text-center text-[11px]">
                    <div className="bg-slate-800 p-1.5 rounded">S / 38: 38"</div>
                    <div className="bg-slate-800 p-1.5 rounded">M / 40: 40"</div>
                    <div className="bg-slate-800 p-1.5 rounded">L / 42: 42"</div>
                    <div className="bg-slate-800 p-1.5 rounded">XL / 44: 44"</div>
                  </div>
                </div>
              )}
            </div>

            {/* Quantity Selector */}
            <div className="mb-5 flex items-center gap-4">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Quantity:
              </label>
              <div className="flex items-center rounded-xl bg-slate-900 border border-slate-700 p-1">
                <button
                  type="button"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold flex items-center justify-center transition cursor-pointer"
                >
                  -
                </button>
                <span className="w-10 text-center text-sm font-bold text-white">
                  {quantity}
                </span>
                <button
                  type="button"
                  disabled={quantity >= product.stock}
                  onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold flex items-center justify-center transition cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Action Buttons: Add to Bag & Buy Now */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                type="button"
                id="modal-add-to-cart-btn"
                disabled={isOutOfStock}
                onClick={handleAddToCart}
                className={`py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                  isOutOfStock
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : addedNotice
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                }`}
              >
                {addedNotice ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>Added to Bag!</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4 text-amber-400" />
                    <span>Add to Bag</span>
                  </>
                )}
              </button>

              <button
                type="button"
                id="modal-buy-now-btn"
                disabled={isOutOfStock}
                onClick={handleBuyNow}
                className={`py-3 px-4 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition cursor-pointer shadow-lg ${
                  isOutOfStock
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-slate-950 shadow-amber-500/20 active:scale-95'
                }`}
              >
                <Zap className="w-4 h-4 text-slate-950 fill-current" />
                <span>Buy Now</span>
              </button>
            </div>

            {/* 10 Minute Express Delivery Callout */}
            <div className="mb-3.5 p-3 rounded-2xl bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/15 border border-amber-500/30 text-xs text-slate-200">
              <div className="flex items-center gap-2 text-amber-300 font-black mb-1">
                <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span>⚡ 10 MINUTE DELIVERY (छुईखदान लोकल)</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  FREE
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Chhuikhadan (491885) ke sabhi mohallon me order confirm hone ke <strong>10 minute ke andar</strong> aapke ghar par delivery ki jayegi!
              </p>
            </div>

            {/* Payment & EMI Callout Box */}
            <div className="mb-4 p-3 rounded-2xl bg-slate-900/90 border border-slate-700 text-xs text-slate-300 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-400 font-bold">
                  <CreditCard className="w-4 h-4 text-cyan-400" />
                  <span>Card Payment & Credit Card EMI</span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                  Major Banks
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Debit Card (ATM), Credit Card (Visa, RuPay, MasterCard) ya <strong>Credit Card EMI</strong> (HDFC, SBI, ICICI, Axis, Kotak) se aasan kiston par khareedein. Saath hi <strong>Kist Pe (किस्त पे) Easy EMI (33% Down Payment)</strong> aur <strong>Razorpay</strong> Gateway bhi uplabdh hai.
              </p>
              {product.sellingPrice >= 3000 && (
                <div className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 p-1.5 rounded-lg border border-emerald-500/20">
                  💳 Credit Card EMI starts at approx <strong>₹{Math.round(product.sellingPrice / 3)}/mo</strong> (3 Months)
                </div>
              )}
            </div>

            {/* Description */}
            <div className="mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Product Description
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Store Guarantees */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                <span>100% Genuine</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>⚡ 10 Min Delivery</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Cards & EMI Accepted</span>
              </div>
            </div>

            {/* Dukaan Owner Quick Delete Option */}
            {onDeleteProduct && (
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80">
                <span className="text-xs text-slate-400">Dukaan Owner Action:</span>
                <button
                  type="button"
                  onClick={() => {
                    const ok = window.confirm(`Kya aap "${product.name}" ko dukaan se delete karna chahte hain?`);
                    if (ok) {
                      onDeleteProduct(product);
                      onClose();
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Ye Product Delete Karein</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Fullscreen Ultra HD Zoom Lightbox */}
    <HDImageLightbox
      isOpen={isLightboxOpen}
      images={images}
      initialIndex={selectedImageIndex}
      productName={product.name}
      onClose={() => setIsLightboxOpen(false)}
    />
  </>
  );
};
