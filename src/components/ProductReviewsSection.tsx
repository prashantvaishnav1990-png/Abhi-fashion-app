import React, { useMemo, useState } from 'react';
import {
  Star,
  CheckCircle2,
  ShieldCheck,
  MessageSquarePlus,
  Lock,
  Send,
  Clock,
  Award,
} from 'lucide-react';
import { CustomerProfile, Order, Product, ProductReview } from '../types';
import { StoreService } from '../services/storeStorage';

const RATING_LABELS: Record<number, { label: string; colorClass: string }> = {
  1: { label: 'Poor (खराब)', colorClass: 'text-rose-400' },
  2: { label: 'Fair (ठीक-ठाक)', colorClass: 'text-orange-400' },
  3: { label: 'Good (अच्छा)', colorClass: 'text-amber-300' },
  4: { label: 'Very Good (बहुत बढ़िया)', colorClass: 'text-emerald-300' },
  5: { label: 'Excellent (लाजवाब!)', colorClass: 'text-emerald-400' },
};

interface QuickReviewFormProps {
  productId: string;
  productName: string;
  order: Order;
  selectedSize?: string;
  selectedColor?: string;
  defaultCustomerName?: string;
  onSuccess?: (review: ProductReview) => void;
  onCancel?: () => void;
}

export const QuickReviewForm: React.FC<QuickReviewFormProps> = ({
  productId,
  productName,
  order,
  selectedSize,
  selectedColor,
  defaultCustomerName,
  onSuccess,
  onCancel,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [customerName, setCustomerName] = useState<string>(
    defaultCustomerName || order.customer?.name || ''
  );
  const [comment, setComment] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const activeRating = hoveredRating || rating;
  const ratingMeta = RATING_LABELS[activeRating] || RATING_LABELS[5];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = StoreService.submitReview({
      productId,
      orderId: order.id,
      rating,
      comment,
      customerName: customerName.trim() || order.customer?.name || 'Verified Customer',
      selectedSize,
      selectedColor,
    });

    setSubmitting(false);

    if (!result.success || !result.review) {
      setError(result.error || 'Review submit karne me samasya aayi.');
      return;
    }

    setComment('');
    onSuccess?.(result.review);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-3.5 rounded-2xl bg-slate-900/90 border border-amber-500/30 space-y-3 animate-in fade-in"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            Verified Delivered Order #{order.orderNumber}
          </span>
          <h4 className="text-xs sm:text-sm font-bold text-white mt-0.5 line-clamp-1">
            Rate: {productName}
          </h4>
        </div>
        {(selectedSize || selectedColor) && (
          <div className="flex items-center gap-1.5 text-[10px] text-slate-300">
            {selectedSize && (
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-semibold">
                Size: {selectedSize}
              </span>
            )}
            {selectedColor && (
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-semibold">
                {selectedColor}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Interactive Star Picker */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold text-slate-300">Your Rating:</span>
          <span className={`text-xs font-black ${ratingMeta.colorClass}`}>
            {activeRating}/5 • {ratingMeta.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((starValue) => {
            const isFilled = starValue <= activeRating;
            return (
              <button
                key={starValue}
                type="button"
                aria-label={`Rate ${starValue} star${starValue > 1 ? 's' : ''}`}
                onMouseEnter={() => setHoveredRating(starValue)}
                onMouseLeave={() => setHoveredRating(0)}
                onClick={() => setRating(starValue)}
                className={`p-1.5 rounded-xl border transition cursor-pointer ${
                  isFilled
                    ? 'bg-amber-400/15 border-amber-400/50 scale-105'
                    : 'bg-slate-800/70 border-slate-700 hover:border-slate-600'
                }`}
              >
                <Star
                  className={`w-5 h-5 transition ${
                    isFilled ? 'fill-amber-400 text-amber-400' : 'text-slate-500'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Customer Name */}
      <div>
        <label className="block text-[11px] font-bold text-slate-300 mb-1">
          Your Name
        </label>
        <input
          type="text"
          maxLength={120}
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Apna naam likhein..."
          className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400"
        />
      </div>

      {/* Feedback Comment */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] font-bold text-slate-300">
            Your Feedback (Fitting, Kapda / Quality)
          </label>
          <span className="text-[10px] text-slate-500">{comment.length}/1000</span>
        </div>
        <textarea
          rows={3}
          maxLength={1000}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Kapde ki quality, fitting aur delivery experience ke baare me likhein..."
          className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400 resize-none"
        />
      </div>

      {error && (
        <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-semibold">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting || comment.trim().length < 3}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-md"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{submitting ? 'Submitting...' : 'Submit Review'}</span>
        </button>
      </div>
    </form>
  );
};

interface ProductReviewsSectionProps {
  product: Product;
  orders: Order[];
  reviews: ProductReview[];
  currentCustomer?: CustomerProfile | null;
}

export const ProductReviewsSection: React.FC<ProductReviewsSectionProps> = ({
  product,
  orders,
  reviews,
  currentCustomer,
}) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);

  const productReviews = useMemo(
    () =>
      [...reviews]
        .filter((r) => r.productId === product.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [reviews, product.id]
  );

  const cleanCustomerMobile = currentCustomer?.mobile
    ? String(currentCustomer.mobile).replace(/\D/g, '').slice(-10)
    : '';

  // Orders for this customer (or local device orders) containing this product
  const matchingCustomerOrders = useMemo(() => {
    return orders.filter((order) => {
      const hasProduct =
        Array.isArray(order.items) && order.items.some((it) => it.productId === product.id);
      if (!hasProduct) return false;
      if (cleanCustomerMobile) {
        const orderMob = String(order.customer?.mobile || '').replace(/\D/g, '').slice(-10);
        return orderMob === cleanCustomerMobile;
      }
      return true;
    });
  }, [orders, product.id, cleanCustomerMobile]);

  const eligibleDeliveredOrders = useMemo(() => {
    return matchingCustomerOrders.filter((order) => {
      if (order.orderStatus !== 'Delivered') return false;
      const alreadyReviewed = productReviews.some(
        (r) => r.orderId === order.id && r.productId === product.id
      );
      return !alreadyReviewed;
    });
  }, [matchingCustomerOrders, productReviews, product.id]);

  const alreadyReviewedDeliveredOrders = useMemo(() => {
    return matchingCustomerOrders.filter(
      (order) =>
        order.orderStatus === 'Delivered' &&
        productReviews.some((r) => r.orderId === order.id && r.productId === product.id)
    );
  }, [matchingCustomerOrders, productReviews, product.id]);

  const pendingUndeliveredOrders = useMemo(() => {
    return matchingCustomerOrders.filter(
      (order) => order.orderStatus !== 'Delivered' && order.orderStatus !== 'Cancelled'
    );
  }, [matchingCustomerOrders]);

  const activeOrder =
    eligibleDeliveredOrders.find((o) => o.id === selectedOrderId) ||
    eligibleDeliveredOrders[0] ||
    null;

  const activeOrderItem = activeOrder?.items.find((it) => it.productId === product.id);

  // Average & breakdown calculations
  const totalVerifiedCount = productReviews.length;
  const averageRating = useMemo(() => {
    if (totalVerifiedCount > 0) {
      const sum = productReviews.reduce((acc, r) => acc + Number(r.rating || 0), 0);
      return Math.round((sum / totalVerifiedCount) * 10) / 10;
    }
    return product.rating || 0;
  }, [productReviews, totalVerifiedCount, product.rating]);

  const starCounts = useMemo(() => {
    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    productReviews.forEach((r) => {
      const rounded = Math.min(5, Math.max(1, Math.round(r.rating)));
      counts[rounded] = (counts[rounded] || 0) + 1;
    });
    return counts;
  }, [productReviews]);

  return (
    <div className="mt-4 pt-4 border-t border-slate-800/90 space-y-4">
      {/* Section Heading */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-400" />
            <span>Ratings & Verified Reviews</span>
          </h3>
          <p className="text-[11px] text-slate-400">
            Real feedback from delivered ABHI FASHION orders
          </p>
        </div>
        {totalVerifiedCount > 0 && (
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
            {totalVerifiedCount} Verified {totalVerifiedCount === 1 ? 'Review' : 'Reviews'}
          </span>
        )}
      </div>

      {/* Rating Summary Card */}
      <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 grid grid-cols-1 sm:grid-cols-5 gap-4 items-center">
        <div className="sm:col-span-2 flex sm:flex-col items-center sm:items-start justify-between sm:justify-center gap-2 sm:border-r border-slate-800 sm:pr-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-white">
              {averageRating > 0 ? averageRating.toFixed(1) : 'New'}
            </span>
            <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
          </div>
          <div className="text-right sm:text-left">
            <p className="text-xs font-bold text-emerald-400">
              {averageRating >= 4.5
                ? 'Customer Favorite'
                : averageRating >= 4
                ? 'Very Good'
                : averageRating >= 3
                ? 'Good Quality'
                : totalVerifiedCount > 0
                ? 'Rated by Buyers'
                : 'Awaiting Reviews'}
            </p>
            <p className="text-[11px] text-slate-400">
              {totalVerifiedCount > 0
                ? `Based on ${totalVerifiedCount} verified ${
                    totalVerifiedCount === 1 ? 'review' : 'reviews'
                  }`
                : `${product.reviewsCount || 0} store ratings`}
            </p>
          </div>
        </div>

        <div className="sm:col-span-3 space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = starCounts[star] || 0;
            const pct = totalVerifiedCount > 0 ? Math.round((count / totalVerifiedCount) * 100) : 0;
            return (
              <div key={star} className="flex items-center gap-2 text-[11px]">
                <span className="w-6 font-bold text-slate-300 flex items-center gap-0.5 shrink-0">
                  {star}
                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                </span>
                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      star >= 4 ? 'bg-emerald-400' : star === 3 ? 'bg-amber-400' : 'bg-rose-400'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-6 text-right text-slate-400 font-mono text-[10px]">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feedback Submitted Toast */}
      {showSuccessBanner && (
        <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Dhanyawad! Aapka verified review aur rating publish ho gaya hai.</span>
        </div>
      )}

      {/* Eligibility-Gated Review Form */}
      {activeOrder ? (
        <div className="space-y-2">
          {eligibleDeliveredOrders.length > 1 && (
            <div className="flex items-center gap-2 text-xs">
              <label className="text-slate-400 font-semibold shrink-0">Select Delivered Order:</label>
              <select
                value={activeOrder.id}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-hidden focus:border-amber-400"
              >
                {eligibleDeliveredOrders.map((ord) => (
                  <option key={ord.id} value={ord.id}>
                    #{ord.orderNumber} ({new Date(ord.createdAt).toLocaleDateString('en-IN')})
                  </option>
                ))}
              </select>
            </div>
          )}

          <QuickReviewForm
            productId={product.id}
            productName={product.name}
            order={activeOrder}
            selectedSize={activeOrderItem?.selectedSize}
            selectedColor={activeOrderItem?.selectedColor}
            defaultCustomerName={currentCustomer?.name || activeOrder.customer?.name}
            onSuccess={() => {
              setShowSuccessBanner(true);
              setTimeout(() => setShowSuccessBanner(false), 4500);
            }}
          />
        </div>
      ) : alreadyReviewedDeliveredOrders.length > 0 ? (
        <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Aapne apne delivered order (#{alreadyReviewedDeliveredOrders[0].orderNumber}) ke liye apna verified review submit kar diya hai!
          </span>
        </div>
      ) : pendingUndeliveredOrders.length > 0 ? (
        <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2">
          <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            Aapka order <strong>#{pendingUndeliveredOrders[0].orderNumber}</strong> abhi{' '}
            <strong>{pendingUndeliveredOrders[0].orderStatus}</strong> stage par hai. Order{' '}
            <strong>Delivered</strong> mark hone ke baad rating & feedback ka form yahan khul jayega!
          </span>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 text-xs flex items-center gap-2">
          <Lock className="w-4 h-4 text-slate-500 shrink-0" />
          <span>
            Verified Purchase Rule: Sirf wahi customers review de sakte hain jinka is product ka order{' '}
            <strong className="text-slate-200">Delivered</strong> ho chuka ho.
          </span>
        </div>
      )}

      {/* Review List */}
      <div className="space-y-2.5">
        {productReviews.length === 0 ? (
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/70 text-center text-xs text-slate-400">
            <MessageSquarePlus className="w-6 h-6 text-slate-600 mx-auto mb-1.5" />
            Abhi tak koi customer review nahi hai. Delivery ke baad apna pehla experience share karein!
          </div>
        ) : (
          productReviews.map((review) => (
            <div
              key={review.id}
              className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-black flex items-center gap-1 ${
                      review.rating >= 4
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : review.rating === 3
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    <span>{review.rating}</span>
                    <Star className="w-3 h-3 fill-current" />
                  </span>
                  <span className="text-xs font-bold text-white">{review.customerName}</span>
                </div>

                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Verified Buyer
                </span>
              </div>

              <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                {review.comment}
              </p>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                <div className="flex items-center gap-2">
                  {review.selectedSize && <span>Size: {review.selectedSize}</span>}
                  {review.selectedColor && <span>• Colour: {review.selectedColor}</span>}
                </div>
                <span>
                  {new Date(review.createdAt).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
