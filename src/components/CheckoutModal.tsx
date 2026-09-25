import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  CreditCard,
  Banknote,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  ArrowRight,
  Info,
  User,
} from 'lucide-react';
import { CartItem, CustomerAddress, CustomerProfile, Order, PaymentMethod, StoreSettings } from '../types';
import { CustomerService } from '../services/customerService';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  settings: StoreSettings;
  currentCustomer?: CustomerProfile | null;
  onOrderSuccess: (order: Order) => void;
  onCreateOrder: (payload: {
    customer: CustomerAddress;
    items: any[];
    subtotal: number;
    deliveryFee: number;
    discount: number;
    totalAmount: number;
    paymentMethod: PaymentMethod;
    paymentStatus: 'Pending' | 'Paid';
    notes?: string;
    emiDetails?: { tenure: string; monthlyInstallment: number; providerNote: string };
  }) => Order;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  settings,
  currentCustomer,
  onOrderSuccess,
  onCreateOrder,
}) => {
  if (!isOpen || items.length === 0) return null;

  const [formData, setFormData] = useState<CustomerAddress>(() => ({
    name: currentCustomer?.name || '',
    mobile: currentCustomer?.mobile || '',
    address: currentCustomer?.address || '',
    city: currentCustomer?.city || 'Chhuikhadan',
    state: currentCustomer?.state || 'Chhattisgarh',
    pincode: currentCustomer?.pincode || '491885',
    upiId: currentCustomer?.upiId || '',
  }));

  useEffect(() => {
    if (currentCustomer) {
      setFormData((prev) => ({
        ...prev,
        name: currentCustomer.name || prev.name,
        mobile: currentCustomer.mobile || prev.mobile,
        address: currentCustomer.address || prev.address,
        city: currentCustomer.city || prev.city,
        state: currentCustomer.state || prev.state,
        pincode: currentCustomer.pincode || prev.pincode,
        upiId: currentCustomer.upiId || prev.upiId,
      }));
      if (currentCustomer.upiId) {
        setUpiId(currentCustomer.upiId);
      }
    }
  }, [currentCustomer, isOpen]);

  const [orderNotes, setOrderNotes] = useState('');
  const [upiId, setUpiId] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>(
    settings.isCodAvailable ? 'cod' : settings.isOnlinePaymentAvailable ? 'online' : 'upi_mandate'
  );
  const [selectedEmiTenure, setSelectedEmiTenure] = useState<'2' | '3'>('3');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const subtotal = items.reduce(
    (sum, item) => sum + item.product.sellingPrice * item.quantity,
    0
  );
  const isFreeDelivery = subtotal >= settings.freeDeliveryThreshold;
  const deliveryFee = isFreeDelivery ? 0 : settings.deliveryCharges;
  const totalAmount = subtotal + deliveryFee;

  // EMI minimum amount (default 3000) & max tenure (3 months)
  const minEmiAmount = settings.emiMinAmount || 3000;
  const isEmiEligible = totalAmount >= minEmiAmount;

  // EMI calculations (Max 3 Months)
  const emi3Month = Math.round(totalAmount / 3);
  const emi2Month = Math.round(totalAmount / 2);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrorMsg('');
  };

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Validations
    if (!formData.name.trim()) {
      setErrorMsg('Please enter customer full name.');
      return;
    }
    const cleanMobile = formData.mobile.replace(/\D/g, '');
    if (cleanMobile.length < 10) {
      setErrorMsg('Please provide a valid 10-digit mobile number.');
      return;
    }
    if (!formData.address.trim()) {
      setErrorMsg('Please enter your complete delivery street address.');
      return;
    }
    if (!formData.pincode.trim() || formData.pincode.length < 6) {
      setErrorMsg('Please enter a valid 6-digit Pincode.');
      return;
    }

    if ((selectedPayment === 'upi_mandate' || selectedPayment === 'emi') && !isEmiEligible) {
      setErrorMsg(`EMI / UPI Mandate ke liye minimum order value ₹${minEmiAmount.toLocaleString('en-IN')} hona zaroori hai. (Aapka Order: ₹${totalAmount.toLocaleString('en-IN')})`);
      return;
    }

    if (selectedPayment === 'upi_mandate' || selectedPayment === 'emi') {
      const trimmedUpi = upiId.trim();
      if (!trimmedUpi) {
        setErrorMsg('Apna UPI ID (VPA) darj karein taaki dukan (ABHI FASHION) aapko Collect App se Mandate bhej sake (e.g. 9826198421@paytm)');
        return;
      }
      if (!trimmedUpi.includes('@') || trimmedUpi.startsWith('@') || trimmedUpi.endsWith('@')) {
        setErrorMsg('Kripya valid UPI ID darj karein jisme "@" ho (jaise 9826198421@paytm ya yourname@okhdfcbank)');
        return;
      }
    }

    setIsProcessing(true);

    // Simulate short secure processing / payment handoff
    setTimeout(() => {
      const orderItems = items.map((i) => ({
        productId: i.product.id,
        productName: i.product.name,
        image: i.product.images[0] || '',
        selectedSize: i.selectedSize,
        quantity: i.quantity,
        unitPrice: i.product.sellingPrice,
        unitMrp: i.product.mrp,
        totalPrice: i.product.sellingPrice * i.quantity,
      }));

      const isEmi = selectedPayment === 'upi_mandate' || selectedPayment === 'emi';
      const cleanUpi = upiId.trim();

      const emiDetails = isEmi
        ? {
            tenure: `${selectedEmiTenure} Months (Max 3 Months)`,
            monthlyInstallment: selectedEmiTenure === '3' ? emi3Month : emi2Month,
            providerNote: `Collect App / UPI AutoPay Mandate to ${cleanUpi} (${settings.upiMandateProvider || 'Collect App / NPCI AutoPay'})`,
            mandateUpiId: cleanUpi,
            mandateType: 'Collect App' as const,
            mandateStatus: 'Mandate Pending Dispatch',
          }
        : undefined;

      const createdOrder = onCreateOrder({
        customer: {
          ...formData,
          mobile: cleanMobile,
          upiId: isEmi ? cleanUpi : (cleanUpi || undefined),
        },
        items: orderItems,
        subtotal,
        deliveryFee,
        discount: 0,
        totalAmount,
        paymentMethod: selectedPayment,
        paymentStatus: selectedPayment === 'online' ? 'Paid' : 'Pending',
        notes: orderNotes.trim() || undefined,
        emiDetails,
      });

      // Save customer profile and delivery address to server
      CustomerService.syncCustomer({
        mobile: cleanMobile,
        name: formData.name.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
        upiId: isEmi ? cleanUpi : (cleanUpi || undefined),
      }).catch(() => {});

      setIsProcessing(false);
      onOrderSuccess(createdOrder);
    }, 900);
  };

  return (
    <div
      id="checkout-modal-backdrop"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="checkout-modal-container"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[94vh] sm:max-h-[90vh] bg-[#0F172A] rounded-t-3xl sm:rounded-3xl border border-slate-800 text-slate-100 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-[#0B132B]">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-400" />
            <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
              Fast Delivery Checkout
            </h2>
          </div>
          <button
            id="btn-close-checkout"
            onClick={onClose}
            aria-label="Close checkout"
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handlePlaceOrder} className="overflow-y-auto p-4 sm:p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Customer & Delivery Address */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-1.5">
              <span>1. Delivery Details</span>
              <span className="text-[10px] text-slate-400 lowercase font-normal">(Chhuikhadan & surrounding areas)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Customer Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  id="checkout-name"
                  required
                  placeholder="e.g. Rahul Verma"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  10-Digit Mobile Number *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                    +91
                  </span>
                  <input
                    type="tel"
                    name="mobile"
                    id="checkout-mobile"
                    required
                    maxLength={10}
                    placeholder="9876543210"
                    value={formData.mobile}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-11 pr-3 py-2.5 text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-300 font-semibold mb-1">
                  Complete Address (House / Shop No., Landmark, Bazar) *
                </label>
                <textarea
                  name="address"
                  id="checkout-address"
                  required
                  rows={2}
                  placeholder="e.g. Main Bazar Line, Near Hanuman Temple"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  City / Town
                </label>
                <input
                  type="text"
                  name="city"
                  id="checkout-city"
                  required
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-hidden focus:border-amber-400 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    name="state"
                    id="checkout-state"
                    required
                    value={formData.state}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-hidden focus:border-amber-400 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Pincode *
                  </label>
                  <input
                    type="text"
                    name="pincode"
                    id="checkout-pincode"
                    required
                    maxLength={6}
                    value={formData.pincode}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-hidden focus:border-amber-400 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-300 font-semibold mb-1">
                  Delivery Notes / Landmark (Optional)
                </label>
                <input
                  type="text"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="e.g. Call before coming, deliver in afternoon"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Payment Options */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3">
              2. Payment Options
            </h3>

            <div className="space-y-2.5">
              {/* Cash on Delivery */}
              {settings.isCodAvailable && (
                <label
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border transition cursor-pointer ${
                    selectedPayment === 'cod'
                      ? 'bg-amber-950/30 border-amber-400 ring-1 ring-amber-400/30'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={selectedPayment === 'cod'}
                    onChange={() => setSelectedPayment('cod')}
                    className="mt-1 text-amber-400 focus:ring-amber-400"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Banknote className="w-4 h-4 text-emerald-400" />
                        <span className="font-bold text-sm text-white">
                          Cash on Delivery (COD)
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                        Popular
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Pay cash or scan UPI QR code upon home delivery at your doorstep in Chhuikhadan.
                    </p>
                  </div>
                </label>
              )}

              {/* Online Payment */}
              {settings.isOnlinePaymentAvailable && (
                <label
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border transition cursor-pointer ${
                    selectedPayment === 'online'
                      ? 'bg-amber-950/30 border-amber-400 ring-1 ring-amber-400/30'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="online"
                    checked={selectedPayment === 'online'}
                    onChange={() => setSelectedPayment('online')}
                    className="mt-1 text-amber-400 focus:ring-amber-400"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-cyan-400" />
                        <span className="font-bold text-sm text-white">
                          Online Payment (Instant Gateway)
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                        Fast & Direct
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Pay via Google Pay, PhonePe, Paytm, BHIM UPI, Debit/Credit Card or Netbanking.
                    </p>
                  </div>
                </label>
              )}

              {/* EMI / Pay Later */}
              {settings.isEmiAvailable && (
                <label
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border transition cursor-pointer ${
                    selectedPayment === 'emi'
                      ? 'bg-amber-950/30 border-amber-400 ring-1 ring-amber-400/30'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="emi"
                    checked={selectedPayment === 'emi'}
                    onChange={() => setSelectedPayment('emi')}
                    className="mt-1 text-amber-400 focus:ring-amber-400"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span className="font-bold text-sm text-white">
                          EMI / Pay Later (Buy Now, Pay Later)
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                        Min ₹3,000 • Max 3 Mo.
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 mt-1">
                      Split your payment into easy monthly installments (Maximum 3 Months) via Collect App UPI Mandate.
                    </p>

                    {!isEmiEligible && (
                      <div className="mt-2 p-2 rounded-xl bg-amber-950/40 border border-amber-500/40 text-[11px] text-amber-300 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>
                          EMI minimum <strong>₹{minEmiAmount.toLocaleString('en-IN')}</strong> ke order par uplabdh hai (Aapka Order: ₹{totalAmount.toLocaleString('en-IN')}).
                        </span>
                      </div>
                    )}

                    {/* Accurate EMI disclosure & UPI ID input */}
                    {selectedPayment === 'emi' && (
                      <div className="mt-2.5 p-3 rounded-xl bg-slate-950/90 border border-amber-400/30 text-xs text-slate-200 space-y-2.5 animate-in fade-in">
                        <div className="flex items-center justify-between text-[11px] text-amber-400 font-semibold border-b border-slate-800 pb-1.5">
                          <div className="flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5 shrink-0" />
                            <span>Choose Installment Tenure:</span>
                          </div>
                          <span className="text-[10px] text-slate-400">Max 3 Months Limit</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedEmiTenure('3')}
                            className={`p-2 rounded-lg text-left border transition cursor-pointer ${
                              selectedEmiTenure === '3'
                                ? 'bg-amber-400/15 border-amber-400 text-white'
                                : 'bg-slate-900 border-slate-700 text-slate-400'
                            }`}
                          >
                            <div className="font-bold text-amber-300">3 Months (Max)</div>
                            <div className="font-black text-white text-xs">₹{emi3Month}/mo</div>
                            <div className="text-[9px] text-emerald-400">Recommended • 0% Interest</div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedEmiTenure('2')}
                            className={`p-2 rounded-lg text-left border transition cursor-pointer ${
                              selectedEmiTenure === '2'
                                ? 'bg-amber-400/15 border-amber-400 text-white'
                                : 'bg-slate-900 border-slate-700 text-slate-400'
                            }`}
                          >
                            <div className="font-bold text-amber-300">2 Months</div>
                            <div className="font-black text-white text-xs">₹{emi2Month}/mo</div>
                            <div className="text-[9px] text-slate-400">Fast Payoff</div>
                          </button>
                        </div>

                        {/* Customer UPI ID Input */}
                        <div className="pt-1">
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            Aapka UPI ID / VPA (Mandate bhejne ke liye) *
                          </label>
                          <input
                            type="text"
                            value={upiId}
                            onChange={(e) => setUpiId(e.target.value)}
                            placeholder="e.g. 9826198421@paytm ya rahul@okaxis"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400 text-xs font-mono"
                          />

                          {/* Quick Suffix Suggestions */}
                          <div className="flex flex-wrap gap-1.5 mt-1.5 items-center">
                            <span className="text-[10px] text-slate-400">Quick suffix:</span>
                            {['@paytm', '@ybl', '@okaxis', '@okhdfcbank', '@ibl'].map((suf) => (
                              <button
                                key={suf}
                                type="button"
                                onClick={() => {
                                  const base = upiId.includes('@') ? upiId.split('@')[0] : (upiId || formData.mobile || '');
                                  setUpiId(base + suf);
                                }}
                                className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-mono border border-slate-700 transition cursor-pointer"
                              >
                                {suf}
                              </button>
                            ))}
                            {formData.mobile && formData.mobile.length >= 10 && (
                              <button
                                type="button"
                                onClick={() => setUpiId(`${formData.mobile.replace(/\D/g, '')}@paytm`)}
                                className="px-2 py-0.5 rounded-md bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 text-[10px] font-bold border border-amber-400/40 transition cursor-pointer"
                              >
                                Auto: {formData.mobile.replace(/\D/g, '')}@paytm
                              </button>
                            )}
                          </div>

                          <p className="text-[10px] text-emerald-400/90 mt-2 bg-emerald-950/30 p-2 rounded-lg border border-emerald-500/20">
                            ⚡ Dukan (ABHI FASHION) Collect App se aapke is UPI ID par mandate request bhejegi jise PhonePe / GPay / Paytm par approve karna hoga.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </label>
              )}

              {/* UPI Mandate / Collect App AutoPay Option */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-2xl border transition cursor-pointer ${
                  selectedPayment === 'upi_mandate'
                    ? 'bg-amber-950/30 border-amber-400 ring-1 ring-amber-400/30'
                    : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="upi_mandate"
                  checked={selectedPayment === 'upi_mandate'}
                  onChange={() => setSelectedPayment('upi_mandate')}
                  className="mt-1 text-amber-400 focus:ring-amber-400"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-sm text-white">
                        UPI Mandate / Collect App EMI (किस्त पर कपड़े)
                      </span>
                    </div>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                      Min ₹3,000 • Max 3 Mo.
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 mt-1">
                    Collect App / UPI AutoPay ke jariye monthly installment set karein (Max 3 Mahine). GPay / PhonePe / Paytm par mandate approve karein.
                  </p>

                  {!isEmiEligible && (
                    <div className="mt-2 p-2 rounded-xl bg-rose-950/40 border border-rose-500/40 text-[11px] text-rose-300 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>
                        Collect App EMI sirf <strong>₹{minEmiAmount.toLocaleString('en-IN')}</strong> ya usse adhik ke orders par uplabdh hai (Aapka Order: ₹{totalAmount.toLocaleString('en-IN')}).
                      </span>
                    </div>
                  )}

                  {/* Mandate Details & Inputs when selected */}
                  {selectedPayment === 'upi_mandate' && (
                    <div className="mt-2.5 p-3 rounded-xl bg-slate-950/90 border border-amber-400/30 text-xs text-slate-200 space-y-2.5 animate-in fade-in">
                      <div className="flex items-center justify-between text-[11px] text-amber-400 font-semibold border-b border-slate-800 pb-1.5">
                        <span>Select Installment Tenure (Max 3 Months):</span>
                        <span className="text-emerald-400 font-bold">Zero Documentation</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedEmiTenure('3')}
                          className={`p-2 rounded-lg text-left border transition cursor-pointer ${
                            selectedEmiTenure === '3'
                              ? 'bg-amber-400/15 border-amber-400 text-white'
                              : 'bg-slate-900 border-slate-700 text-slate-400'
                          }`}
                        >
                          <div className="font-bold text-amber-300">3 Months Mandate (Max)</div>
                          <div className="font-black text-white text-xs">₹{emi3Month}/month</div>
                          <div className="text-[10px] text-emerald-400">Recommended • 0% Interest</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedEmiTenure('2')}
                          className={`p-2 rounded-lg text-left border transition cursor-pointer ${
                            selectedEmiTenure === '2'
                              ? 'bg-amber-400/15 border-amber-400 text-white'
                              : 'bg-slate-900 border-slate-700 text-slate-400'
                          }`}
                        >
                          <div className="font-bold text-amber-300">2 Months Mandate</div>
                          <div className="font-black text-white text-xs">₹{emi2Month}/month</div>
                          <div className="text-[10px] text-slate-400">Fast Auto-Debit</div>
                        </button>
                      </div>

                      {/* UPI ID input for mandate */}
                      <div className="pt-1">
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Aapka UPI ID / VPA (Mandate bhejne ke liye) *
                        </label>
                        <input
                          type="text"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          placeholder="e.g. 9826198421@paytm ya yourname@okhdfcbank"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400 text-xs font-mono"
                        />

                        {/* Quick Suffix Suggestions */}
                        <div className="flex flex-wrap gap-1.5 mt-1.5 items-center">
                          <span className="text-[10px] text-slate-400">Quick suffix:</span>
                          {['@paytm', '@ybl', '@okaxis', '@okhdfcbank', '@ibl'].map((suf) => (
                            <button
                              key={suf}
                              type="button"
                              onClick={() => {
                                const base = upiId.includes('@') ? upiId.split('@')[0] : (upiId || formData.mobile || '');
                                setUpiId(base + suf);
                              }}
                              className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-mono border border-slate-700 transition cursor-pointer"
                            >
                              {suf}
                            </button>
                          ))}
                          {formData.mobile && formData.mobile.length >= 10 && (
                            <button
                              type="button"
                              onClick={() => setUpiId(`${formData.mobile.replace(/\D/g, '')}@paytm`)}
                              className="px-2 py-0.5 rounded-md bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 text-[10px] font-bold border border-amber-400/40 transition cursor-pointer"
                            >
                              Auto: {formData.mobile.replace(/\D/g, '')}@paytm
                            </button>
                          )}
                        </div>

                        <p className="text-[10px] text-emerald-400/90 mt-2 bg-emerald-950/30 p-2 rounded-lg border border-emerald-500/20">
                          ⚡ Dukan (ABHI FASHION) Collect App se aapke is UPI ID par mandate request bhejegi jise PhonePe / GPay / Paytm par approve karna hoga.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Section 3: Order Summary & Place Order */}
          <div className="pt-3 border-t border-slate-800">
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Items Total ({items.reduce((s, i) => s + i.quantity, 0)} items):</span>
                <span className="font-semibold text-white">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Delivery Charge to {formData.city || 'Chhuikhadan'}:</span>
                <span className="font-semibold text-emerald-400">
                  {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline">
                <span className="font-bold text-sm text-white">Total Payable:</span>
                <span className="text-xl font-black text-amber-400">
                  ₹{totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <button
              type="submit"
              id="btn-confirm-place-order"
              disabled={isProcessing}
              className="mt-4 w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 active:scale-98 transition disabled:opacity-50 cursor-pointer"
            >
              {isProcessing ? (
                <span>Securing Order...</span>
              ) : (
                <>
                  <span>CONFIRM & PLACE ORDER (₹{totalAmount.toLocaleString('en-IN')})</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
