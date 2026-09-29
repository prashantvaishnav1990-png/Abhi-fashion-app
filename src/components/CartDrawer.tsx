import React from 'react';
import { X, Trash2, ShoppingBag, ArrowRight, ShieldCheck, Truck, CreditCard } from 'lucide-react';
import { CartItem, StoreSettings } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  settings: StoreSettings;
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

  const isFreeDelivery = subtotal >= settings.freeDeliveryThreshold;
  const deliveryFee = items.length === 0 ? 0 : isFreeDelivery ? 0 : settings.deliveryCharges;
  const grandTotal = subtotal + deliveryFee;

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
                  src={item.product.images[0] || 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600'}
                  alt={item.product.name}
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

                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-semibold bg-slate-800 text-amber-300 px-2 py-0.5 rounded border border-slate-700">
                        Size: {item.selectedSize}
                      </span>
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
                  <span>Total Discount Savings</span>
                  <span>-₹{totalSavings.toLocaleString('en-IN')}</span>
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
                {grandTotal >= (settings.emiMinAmount || 3000) ? (
                  <div className="flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300">
                    <span className="flex items-center gap-1 font-semibold">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                      Easy EMI Eligible:
                    </span>
                    <span className="font-bold text-white">₹{Math.round(grandTotal / 3)}/mo (Max 3 Mo.)</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-lg bg-amber-950/20 border border-amber-500/20 text-slate-300">
                    <span className="flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                      EMI starts at ₹{(settings.emiMinAmount || 3000).toLocaleString('en-IN')} (Max 3 Mo.):
                    </span>
                    <span className="text-amber-400 font-bold">Add ₹{((settings.emiMinAmount || 3000) - grandTotal).toLocaleString('en-IN')} more</span>
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
