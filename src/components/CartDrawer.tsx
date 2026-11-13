import React from 'react';
import { X, Trash2, ShoppingBag, ArrowRight, ShieldCheck, Truck, CreditCard, Zap, Crown, Gift } from 'lucide-react';
import { CartItem, CustomerProfile, Order, StoreSettings } from '../types';
import { getCategoryFallbackImage, getProductCode, getColorHex } from '../utils/productHelpers';
import { calculateCustomerLoyalty, calculateLoyaltyDiscountAmount } from '../utils/loyaltyHelper';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  settings: StoreSettings;
  orders?: Order[];
  currentCustomer?: CustomerProfile | null;
  onUpdateQuantity: (cartItemId: string, newQty: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onProceedToCheckout: () => void;
  onExploreProducts: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  settings,
  orders = [],
  currentCustomer,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  onExploreProducts,
}) => {
  if (!isOpen) return null;

  const subtotal = items.reduce(
    (sum, item) => sum + item.product.sellingPrice * item.quantity,
    0
  );
  const totalMrp = items.reduce(
    (sum, item) => sum + item.product.mrp * item.quantity,
    0
  );
  const totalSavings = totalMrp - subtotal;

  const loyalty = calculateCustomerLoyalty(orders, currentCustomer?.mobile, settings);
  const loyaltyDiscount = calculateLoyaltyDiscountAmount(subtotal, loyalty);

  const isFreeDelivery = subtotal >= settings.freeDeliveryThreshold;
  const deliveryFee = items.length === 0 ? 0 : isFreeDelivery ? 0 : settings.deliveryCharges;
  const grandTotal = Math.max(0, subtotal - loyaltyDiscount + deliveryFee);

  const amountNeededForFreeDelivery = Math.max(0, settings.freeDeliveryThreshold - subtotal);

  return (
    <div
      id="cart-drawer-backdrop"
      className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-xs transition-opacity animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="cart-drawer-container"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md h-full bg-[#0E1628] text-slate-100 border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800 bg-[#0A0F1D]">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-black text-white uppercase tracking-wider">
              Your Bag ({items.reduce((s, i) => s + i.quantity, 0)})
            </h2>
          </div>
          <button
            id="btn-close-cart"
            onClick={onClose}
            aria-label="Close cart"
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Delivery Incentive Progress Bar */}
        {items.length > 0 && (
          <div className="bg-slate-900/90 px-4 py-2 border-b border-slate-800/80 text-xs">
            {isFreeDelivery ? (
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <Truck className="w-4 h-4" />
                <span>Congratulations! You unlocked FREE Delivery in Chhuikhadan!</span>
              </div>
            ) : (
              <div>
                <div className="flex justify-between text-slate-300 font-medium mb-1">
                  <span>Add ₹{amountNeededForFreeDelivery} more for FREE Delivery</span>
                  <span className="text-amber-400 font-bold">{Math.round((subtotal / settings.freeDeliveryThreshold) * 100)}%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (subtotal / settings.freeDeliveryThreshold) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Cart Items List or Empty State */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/80 flex items-center justify-center mb-3">
                <ShoppingBag className="w-8 h-8 text-slate-500" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Your bag is empty</h3>
              <p className="text-xs text-slate-400 mb-5 max-w-xs">
                Explore our premium collection of shirts, jeans, and menswear to add your favorites.
              </p>
              <button
                id="btn-cart-empty-explore"
                onClick={() => {
                  onClose();
                  onExploreProducts();
                }}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md transition cursor-pointer"
              >
                <span>Browse Men's Wear</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                id={`cart-item-${item.id}`}
                className="flex gap-3 p-3 rounded-2xl bg-[#131C31] border border-slate-800/80"
              >
                {/* Thumbnail */}
                <img
                  src={item.product.images[0] || getCategoryFallbackImage(item.product.category)}
                  alt={item.product.name}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = getCategoryFallbackImage(item.product.category);
                  }}
                  className="w-20 h-24 rounded-xl object-cover bg-slate-900 shrink-0"
                />

                {/* Details */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-xs sm:text-sm text-white truncate">
                        {item.product.name}
                      </h4>
                      <button
                        onClick={() => onRemoveItem(item.id)}
                        aria-label="Remove item"
                        className="text-slate-400 hover:text-rose-400 p-1 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                        #{getProductCode(item.product)}
                      </span>
                      <span className="text-[11px] font-semibold bg-slate-800 text-slate-200 px-2 py-0.5 rounded border border-slate-700">
                        Size: {item.selectedSize}
                      </span>
                      {item.selectedColor && (
                        <span className="text-[11px] font-semibold bg-slate-800 text-amber-300 px-2 py-0.5 rounded border border-slate-700 flex items-center gap-1">
                          <span
                            className="w-2 h-2 rounded-full border border-white/40 shrink-0"
                            style={{ backgroundColor: getColorHex(item.selectedColor) }}
                          />
                          <span>{item.selectedColor}</span>
                        </span>
                      )}
                      {item.product.discountPercent > 0 && (
                        <span className="text-[10px] font-bold text-rose-400">
                          {item.product.discountPercent}% Off
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/60">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-black text-white">
                        ₹{(item.product.sellingPrice * item.quantity).toLocaleString('en-IN')}
                      </span>
                      {item.product.mrp > item.product.sellingPrice && (
                        <span className="text-[11px] text-slate-400 line-through">
                          ₹{(item.product.mrp * item.quantity).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center rounded-lg bg-slate-900 border border-slate-700">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                        className="w-6 h-6 rounded-l-lg hover:bg-slate-800 text-slate-300 font-bold flex items-center justify-center text-xs cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-white">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        className="w-6 h-6 rounded-r-lg hover:bg-slate-800 text-slate-300 font-bold flex items-center justify-center text-xs cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer: Bill Summary & Checkout */}
        {items.length > 0 && (
          <div className="p-4 bg-[#0A0F1D] border-t border-slate-800 space-y-3">
            {/* 10 Minute Express Delivery Badge */}
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-black text-amber-300">
                <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span>⚡ 10 Min Delivery in Chhuikhadan</span>
              </span>
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                FREE
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)</span>
                <span className="font-semibold text-white">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Charge</span>
                <span>
                  {deliveryFee === 0 ? (
                    <span className="text-emerald-400 font-bold uppercase">FREE</span>
                  ) : (
                    <span>₹{deliveryFee}</span>
                  )}
                </span>
              </div>
              {totalSavings > 0 && (
                <div className="flex justify-between text-emerald-400 font-semibold">
                  <span>MRP Discount Savings</span>
                  <span>-₹{totalSavings.toLocaleString('en-IN')}</span>
                </div>
              )}
              {loyalty.isEnabled && loyaltyDiscount > 0 && (
                <div className="flex justify-between text-amber-300 font-bold bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/30">
                  <span className="flex items-center gap-1">
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    <span>VIP Loyalty Reward (Extra {loyalty.discountPercent}% OFF)</span>
                  </span>
                  <span>-₹{loyaltyDiscount.toLocaleString('en-IN')}</span>
                </div>
              )}
              {loyalty.isEnabled && !loyalty.isDiscountUnlocked && (
                <div className="p-2 rounded-xl bg-slate-900/90 border border-amber-500/20 text-[11px] flex items-start gap-2">
                  <Gift className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-slate-300 leading-snug">
                    {loyalty.hasCustomerMobile ? (
                      loyalty.totalOrdersValue + subtotal >= loyalty.nextMilestoneAmount ? (
                        <span className="text-emerald-300 font-semibold">
                          🎉 Is order ke baad aap ₹{loyalty.nextMilestoneAmount.toLocaleString('en-IN')} paar kar lenge — agle order par <strong>Extra {loyalty.discountPercent}% OFF</strong> unlock hoga!
                        </span>
                      ) : (
                        <span>
                          VIP Total: <strong className="text-white">₹{loyalty.totalOrdersValue.toLocaleString('en-IN')}</strong> / ₹{loyalty.nextMilestoneAmount.toLocaleString('en-IN')} • ₹{(loyalty.amountNeededForNext).toLocaleString('en-IN')} aur orders par agle purchase me <strong className="text-amber-300">Extra {loyalty.discountPercent}% OFF!</strong>
                        </span>
                      )
                    ) : (
                      <span>
                        <strong className="text-amber-300">VIP Offer:</strong> Total ₹{loyalty.threshold.toLocaleString('en-IN')} ke orders poore karne par agle purchase me <strong className="text-white">Extra {loyalty.discountPercent}% OFF</strong> paayein!
                      </span>
                    )}
                  </div>
                </div>
              )}
              <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline text-sm">
                <span className="font-black text-white">Grand Total</span>
                <span className="text-lg font-black text-amber-400">
                  ₹{grandTotal.toLocaleString('en-IN')}
                </span>
              </div>

              {/* EMI Eligibility Callout */}
              <div className="pt-1">
                {grandTotal >= (settings.emiMinAmount || 5000) ? (
                  <div className="flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300">
                    <span className="flex items-center gap-1 font-semibold">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                      Easy EMI Eligible (33% Down):
                    </span>
                    <span className="font-bold text-white">
                      ₹{Math.round((grandTotal * 0.67) / 3)}/mo (Max 3 Mo.)
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-lg bg-amber-950/20 border border-amber-500/20 text-slate-300">
                    <span className="flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                      EMI starts at ₹{(settings.emiMinAmount || 5000).toLocaleString('en-IN')} (Max 3 Mo.):
                    </span>
                    <span className="text-amber-400 font-bold">Add ₹{((settings.emiMinAmount || 5000) - grandTotal).toLocaleString('en-IN')} more</span>
                  </div>
                )}
              </div>
            </div>

            <button
              id="btn-proceed-checkout"
              onClick={onProceedToCheckout}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-98 transition cursor-pointer"
            >
              <span>PROCEED TO CHECKOUT</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Safe & Secure Checkout • ABHI FASHION Chhuikhadan</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
