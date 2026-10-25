import React, { useState } from 'react';
import { ShoppingBag, Zap, Eye, Check, Sparkles, Trash2 } from 'lucide-react';
import { Product } from '../types';
import { getColorHex, getHdImageUrl, getCategoryFallbackImage } from '../utils/productHelpers';

interface ProductCardProps {
  product: Product;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product, size: string, color?: string) => void;
  onBuyNow: (product: Product, size: string, color?: string) => void;
  onDeleteProduct?: (product: Product) => void;
  isDeleteMode?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelectProduct,
  onAddToCart,
  onBuyNow,
  onDeleteProduct,
  isDeleteMode = false,
}) => {
  const [selectedSize, setSelectedSize] = useState<string>(
    product?.sizes && product.sizes.length > 0 ? product.sizes[0] : 'Standard'
  );
  const [selectedColor, setSelectedColor] = useState<string | undefined>(
    product?.colors && product.colors.length > 0 ? product.colors[0] : undefined
  );
  const [justAdded, setJustAdded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOutOfStock = (product?.stock ?? 0) <= 0;
  const isLowStock = (product?.stock ?? 0) > 0 && (product?.stock ?? 0) <= 4;
  const mainImage =
    product?.images && product.images.length > 0
      ? product.images[0]
      : getCategoryFallbackImage(product?.category);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    onAddToCart(product, selectedSize, selectedColor);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    onBuyNow(product, selectedSize, selectedColor);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDeleteProduct) return;
    const confirmDelete = window.confirm(
      `Kya aap "${product.name}" ko dukaan ke screen se delete karna chahte hain?`
    );
    if (confirmDelete) {
      setIsDeleting(true);
      onDeleteProduct(product);
    }
  };

  return (
    <div
      id={`product-card-${product.id}`}
      onClick={() => onSelectProduct(product)}
      className="group relative flex flex-col bg-[#111827] rounded-2xl border border-slate-800/80 hover:border-amber-400/50 overflow-hidden shadow-lg hover:shadow-2xl transition duration-300 cursor-pointer"
    >
      {/* Product Image Area */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-900">
        <img
          src={getHdImageUrl(mainImage, product?.category)}
          alt={product.name}
          loading="lazy"
          onError={(e) => {
            const fallback = getCategoryFallbackImage(product?.category);
            if (e.currentTarget.src !== fallback) {
              e.currentTarget.src = fallback;
            }
          }}
          className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
        />

        {/* Badges Overlay */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
          {product.discountPercent > 0 && (
            <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
              {product.discountPercent}% OFF
            </span>
          )}
          {product.isNewArrival && (
            <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
              NEW
            </span>
          )}
          <span className="px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-amber-400 border border-amber-400/40 text-[9px] font-black uppercase tracking-wider flex items-center gap-0.5 shadow-sm">
            <Sparkles className="w-2.5 h-2.5" />
            HD
          </span>
        </div>

        {/* Stock status indicator */}
        <div className="absolute bottom-2.5 left-2.5 z-10">
          {isOutOfStock ? (
            <span className="px-2 py-0.5 rounded-md bg-slate-900/90 text-rose-400 border border-rose-500/40 text-[10px] font-bold">
              Sold Out
            </span>
          ) : isLowStock ? (
            <span className="px-2 py-0.5 rounded-md bg-amber-950/90 text-amber-300 border border-amber-500/40 text-[10px] font-bold animate-pulse">
              Only {product.stock} Left
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold">
              In Stock
            </span>
          )}
        </div>

        {/* Delete Product from Screen Button */}
        {onDeleteProduct && (
          <button
            type="button"
            onClick={handleDeleteClick}
            disabled={isDeleting}
            title="Dukaan ke screen se ye product delete karein"
            aria-label={`Delete ${product.name}`}
            className={`absolute top-2.5 right-2.5 z-20 p-2 rounded-xl transition duration-200 cursor-pointer shadow-md flex items-center gap-1 ${
              isDeleteMode
                ? 'bg-rose-600 text-white hover:bg-rose-700 ring-2 ring-white/80 scale-105'
                : 'bg-slate-900/85 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            {isDeleteMode && (
              <span className="text-[10px] font-black uppercase">Delete</span>
            )}
          </button>
        )}

        {/* Quick view floating hint on desktop */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex items-center justify-center pointer-events-none">
          <span className="px-3 py-1.5 rounded-full bg-slate-900/90 text-white text-xs font-semibold flex items-center gap-1.5 border border-slate-700 shadow-xl">
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            View HD Details
          </span>
        </div>
      </div>

      {/* Product Content Details */}
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        {/* Category Tag */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold tracking-wider uppercase text-amber-400/90">
            {product.category}
          </span>
          {product.images && product.images.length > 1 && (
            <span className="text-[10px] font-mono text-slate-400">
              {product.images.length} Photos
            </span>
          )}
        </div>

        {/* Product Name */}
        <h3 className="font-bold text-sm text-slate-100 group-hover:text-amber-300 transition line-clamp-2 leading-snug mb-2">
          {product.name}
        </h3>

        {/* Pricing: Selling Price, MRP, Discount */}
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-base sm:text-lg font-black text-white">
            ₹{product.sellingPrice.toLocaleString('en-IN')}
          </span>
          {product.mrp > product.sellingPrice && (
            <span className="text-xs text-slate-400 line-through">
              ₹{product.mrp.toLocaleString('en-IN')}
            </span>
          )}
          <span className="text-xs font-bold text-emerald-400">
            Save ₹{(product.mrp - product.sellingPrice).toLocaleString('en-IN')}
          </span>
        </div>

        {/* Available Colors Row */}
        {product.colors && product.colors.length > 0 && (
          <div
            className="mb-2 flex items-center justify-between text-[11px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[10px]">Colors:</span>
              <div className="flex items-center -space-x-1">
                {product.colors.slice(0, 4).map((colorName) => {
                  const hex = getColorHex(colorName);
                  const isCurrent = (selectedColor || product.colors?.[0]) === colorName;
                  return (
                    <button
                      key={colorName}
                      type="button"
                      onClick={() => setSelectedColor(colorName)}
                      title={colorName}
                      className={`w-3.5 h-3.5 rounded-full border transition cursor-pointer ${
                        isCurrent
                          ? 'border-amber-400 ring-2 ring-amber-400/60 scale-110 z-10'
                          : 'border-slate-900 opacity-85 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  );
                })}
              </div>
            </div>
            <span className="text-[10px] font-semibold text-slate-300">
              {product.colors.length} {product.colors.length === 1 ? 'Color' : 'Colors'}
            </span>
          </div>
        )}

        {/* Available Sizes Pills */}
        <div
          className="mb-3 flex items-center gap-1.5 flex-wrap"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-[10px] font-medium text-slate-400">Sizes:</span>
          {product.sizes.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => setSelectedSize(size)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer border ${
                selectedSize === size
                  ? 'bg-amber-400 text-slate-950 border-amber-400 font-bold'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-500'
              }`}
            >
              {size}
            </button>
          ))}
        </div>

        {/* Action Buttons: Add to Cart & Buy Now */}
        <div className="mt-auto grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            id={`btn-add-cart-${product.id}`}
            disabled={isOutOfStock}
            onClick={handleAddToCart}
            className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
              isOutOfStock
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : justAdded
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            {justAdded ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span>Added</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                <span>Add to Bag</span>
              </>
            )}
          </button>

          <button
            type="button"
            id={`btn-buy-now-${product.id}`}
            disabled={isOutOfStock}
            onClick={handleBuyNow}
            className={`py-2 px-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1 transition cursor-pointer shadow-md ${
              isOutOfStock
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-slate-950 active:scale-95'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-slate-950 fill-current" />
            <span>Buy Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};
