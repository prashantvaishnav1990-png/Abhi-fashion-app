import React, { useState } from 'react';
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
import { getColorHex, getHdImageUrl } from '../utils/productHelpers';

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
  if (!product) return null;

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState(
    product.sizes.length > 0 ? product.sizes[0] : 'Standard'
  );
  const [selectedColor, setSelectedColor] = useState<string | undefined>(
    product.colors && product.colors.length > 0 ? product.colors[0] : undefined
  );
  const [quantity, setQuantity] = useState(1);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [addedNotice, setAddedNotice] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 4;
  const images = product.images && product.images.length > 0 ? product.images : [
    'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=1200'
  ];

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    onAddToCart(product, selectedSize, quantity, selectedColor);
    setAddedNotice(true);
    setTimeout(() => setAddedNotice(false), 2000);
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    onBuyNow(product, selectedSize, quantity, selectedColor);
  };

  // Monthly EMI estimate (e.g. 3 months)
  const monthlyEmi = Math.round(product.sellingPrice / 3);

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
                  src={getHdImageUrl(images[selectedImageIndex] || images[0])}
                  alt={product.name}
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
                      <img src={getHdImageUrl(img)} alt="" className="w-full h-full object-cover" />
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
                    {product.sellingPrice >= 3000 ? (
                      <span>EMI starts from ₹{monthlyEmi}/month (Max 3 Months)</span>
                    ) : (
                      <span>EMI / Mandate on orders ₹3,000+ (Max 3 Mo.)</span>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                    Collect App AutoPay (Max 3 Mo.)
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
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Select Size:
                </label>
                <button
                  type="button"
                  onClick={() => setShowSizeGuide(!showSizeGuide)}
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                >
                  <Ruler className="w-3.5 h-3.5" />
                  <span>Size Chart</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`min-w-11 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      selectedSize === size
                        ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md scale-105'
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    {size}
                  </button>
                ))}
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

            {/* UPI Mandate EMI Callout Box */}
            <div className="mb-4 p-3 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-xs text-slate-300">
              <div className="flex items-center gap-2 text-amber-400 font-bold mb-1">
                <CreditCard className="w-4 h-4" />
                <span>UPI Mandate / Collect App EMI Available (किस्त पर कपड़े)</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Collect App / UPI AutoPay ke zariye aap easy monthly installments (किस्त) par khareed sakte hain. Checkout par "UPI Mandate EMI" chunein!
              </p>
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
                <Truck className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Express Delivery</span>
              </div>
              <div className="flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Easy Size Exchange</span>
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
