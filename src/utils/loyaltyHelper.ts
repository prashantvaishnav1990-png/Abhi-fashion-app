import { Order, StoreSettings } from '../types';

export interface CustomerLoyaltyStatus {
  isEnabled: boolean;
  hasCustomerMobile: boolean;
  cleanMobile: string;
  totalOrdersValue: number;
  validOrderCount: number;
  threshold: number;
  discountPercent: number;
  unlockedMilestones: number;
  redeemedCount: number;
  availableRewards: number;
  isDiscountUnlocked: boolean;
  nextMilestoneAmount: number;
  amountNeededForNext: number;
  progressPercent: number;
}

/**
 * Computes VIP Loyalty status for a customer based on their non-cancelled order history.
 * Every ₹10,000 of cumulative valid orders unlocks an Extra 5% discount for their NEXT purchase.
 */
export function calculateCustomerLoyalty(
  orders: Order[],
  mobile?: string,
  settings?: StoreSettings
): CustomerLoyaltyStatus {
  const isEnabled = settings?.isLoyaltyDiscountEnabled !== false;
  const threshold = Math.max(1000, Number(settings?.loyaltyThreshold) || 10000);
  const discountPercent = Math.max(1, Math.min(50, Number(settings?.loyaltyDiscountPercent) || 5));
  const cleanMobile = String(mobile || '').replace(/\D/g, '').slice(-10);
  const hasCustomerMobile = cleanMobile.length === 10;

  if (!hasCustomerMobile) {
    return {
      isEnabled,
      hasCustomerMobile: false,
      cleanMobile: '',
      totalOrdersValue: 0,
      validOrderCount: 0,
      threshold,
      discountPercent,
      unlockedMilestones: 0,
      redeemedCount: 0,
      availableRewards: 0,
      isDiscountUnlocked: false,
      nextMilestoneAmount: threshold,
      amountNeededForNext: threshold,
      progressPercent: 0,
    };
  }

  const validOrders = (Array.isArray(orders) ? orders : []).filter((o) => {
    if (!o || o.id === 'ord-sample-101') return false;
    if (o.orderStatus === 'Cancelled') return false;
    const oMob = String(o.customer?.mobile || '').replace(/\D/g, '').slice(-10);
    return oMob === cleanMobile;
  });

  const totalOrdersValue = validOrders.reduce(
    (sum, o) => sum + (Number(o.totalAmount) || 0),
    0
  );

  const unlockedMilestones = Math.floor(totalOrdersValue / threshold);

  const redeemedCount = validOrders.filter(
    (o) =>
      Boolean(o.loyaltyDiscountApplied) ||
      (Number(o.discount) > 0 &&
        String(o.notes || '').toLowerCase().includes('loyalty'))
  ).length;

  const availableRewards = isEnabled ? Math.max(0, unlockedMilestones - redeemedCount) : 0;
  const isDiscountUnlocked = availableRewards > 0;

  const nextMilestoneAmount = isDiscountUnlocked
    ? unlockedMilestones * threshold
    : (redeemedCount + 1) * threshold;

  const amountNeededForNext = isDiscountUnlocked
    ? 0
    : Math.max(0, nextMilestoneAmount - totalOrdersValue);

  const cycleBase = redeemedCount * threshold;
  const cycleSpend = Math.max(0, totalOrdersValue - cycleBase);
  const progressPercent = isDiscountUnlocked
    ? 100
    : Math.min(100, Math.round((cycleSpend / threshold) * 100));

  return {
    isEnabled,
    hasCustomerMobile: true,
    cleanMobile,
    totalOrdersValue,
    validOrderCount: validOrders.length,
    threshold,
    discountPercent,
    unlockedMilestones,
    redeemedCount,
    availableRewards,
    isDiscountUnlocked,
    nextMilestoneAmount,
    amountNeededForNext,
    progressPercent,
  };
}

/**
 * Calculates the rupee discount for a given subtotal if the customer has unlocked the VIP discount.
 */
export function calculateLoyaltyDiscountAmount(
  subtotal: number,
  loyalty: CustomerLoyaltyStatus
): number {
  if (!loyalty.isEnabled || !loyalty.isDiscountUnlocked || subtotal <= 0) {
    return 0;
  }
  return Math.round((subtotal * loyalty.discountPercent) / 100);
}
