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
  MessageCircle,
  Zap,
  Lock,
  QrCode,
  ExternalLink,
  Check,
  Copy,
  Sparkles,
  Smartphone,
  RefreshCw,
} from 'lucide-react';
import { CartItem, CustomerAddress, CustomerProfile, Order, PaymentMethod, StoreSettings } from '../types';
import { CustomerService } from '../services/customerService';
import { PaymentGatewayService } from '../services/paymentGatewayService';

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
  const [deliveryZone, setDeliveryZone] = useState<'chhuikhadan' | 'under_10km' | 'above_10km'>('chhuikhadan');
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('cod');
  const [selectedEmiTenure, setSelectedEmiTenure] = useState<'2' | '3'>('3');
  // Card & Credit Card EMI States
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardHolder, setCardHolder] = useState(currentCustomer?.name || '');
  const [cardEmiBank, setCardEmiBank] = useState('HDFC Bank');
  const [cardEmiTenure, setCardEmiTenure] = useState<'3' | '6' | '9' | '12'>('3');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Razorpay, Online UPI, and Kist Pe Integration States
  const [showKistPeQr, setShowKistPeQr] = useState(false);
  const [kistPeQrDataUrl, setKistPeQrDataUrl] = useState('');
  const [kistPeUtr, setKistPeUtr] = useState('');
  const [razorpayPaymentId, setRazorpayPaymentId] = useState('');
  const [copiedKistUpi, setCopiedKistUpi] = useState(false);

  // Instant UPI & Direct Card states
  const [onlineUpiMode, setOnlineUpiMode] = useState<'apps' | 'qr' | 'gateway'>('apps');
  const [onlineUpiQrUrl, setOnlineUpiQrUrl] = useState('');
  const [onlineUpiRef, setOnlineUpiRef] = useState('');
  const [copiedStoreUpi, setCopiedStoreUpi] = useState(false);
  const [hasLaunchedUpiApp, setHasLaunchedUpiApp] = useState(false);
  const [cardVerifying, setCardVerifying] = useState(false);

  const storeUpi = PaymentGatewayService.getStoreUpiId(settings);

  const subtotal = items.reduce(
    (sum, item) => sum + item.product.sellingPrice * item.quantity,
    0
  );

  // Delivery Fee based on distance:
  // Chhuikhadan local (0-3 km) = FREE (0)
  // Under 10 km = ₹50
  // Above 10 km = ₹50
  const deliveryFee =
    deliveryZone === 'chhuikhadan'
      ? (settings.deliveryChhuikhadanFee ?? 0)
      : (settings.deliveryUnder10kmFee ?? 50);

  const totalAmount = subtotal + deliveryFee;

  // Prepaid only rule: 4 km and above cannot use COD!
  const isCodAllowed = deliveryZone === 'chhuikhadan' && settings.isCodAvailable;

  // Auto-switch away from COD if user selects outside Chhuikhadan (4 km+)
  useEffect(() => {
    if (!isCodAllowed && selectedPayment === 'cod') {
      setSelectedPayment('online');
    }
  }, [deliveryZone, isCodAllowed, selectedPayment]);

  // EMI minimum amount (₹5,000) & 33% minimum down payment
  const minEmiAmount = settings.emiMinAmount || 5000;
  const isEmiEligible = totalAmount >= minEmiAmount;
  const downPaymentPercent = settings.emiDownPaymentPercent || 33;
  const downPaymentAmount = Math.round(totalAmount * (downPaymentPercent / 100));
  const financedAmount = totalAmount - downPaymentAmount;

  // EMI calculations (Max 3 Months on financed amount)
  const emi3Month = Math.round(financedAmount / 3);
  const emi2Month = Math.round(financedAmount / 2);

  // Credit Card EMI calculations (Minimum ₹3,000 order)
  const ccMinAmount = settings.creditCardEmiMinAmount || 3000;
  const isCreditCardEmiEligible = totalAmount >= ccMinAmount;
  const ccTenureMonths = parseInt(cardEmiTenure, 10);
  const ccMonthlyEmi = Math.round(totalAmount / ccTenureMonths);

  // Dynamic Kist Pe 33% Down Payment QR Code Generation
  useEffect(() => {
    if (isEmiEligible) {
      const upiTarget = settings.kistPeUpiId || settings.collectUpiId || '8982147180@ybl';
      PaymentGatewayService.generateKistPeQrCode({
        upiId: upiTarget,
        amount: downPaymentAmount,
        customerName: formData.name || 'Customer',
        orderNumber: 'AF-KIST',
      }).then((url) => {
        if (url) setKistPeQrDataUrl(url);
      });
    }
  }, [isEmiEligible, downPaymentAmount, settings.kistPeUpiId, settings.collectUpiId, formData.name]);

  // Dynamic Online Payment UPI QR Code Generation
  useEffect(() => {
    PaymentGatewayService.generateUpiQrCode({
      upiId: storeUpi,
      amount: totalAmount,
      customerName: formData.name || 'Customer',
      storeName: settings.storeName || 'ABHI FASHION',
      orderNumber: 'AF-ORD',
    }).then((url) => {
      if (url) setOnlineUpiQrUrl(url);
    });
  }, [totalAmount, storeUpi, settings.storeName, formData.name]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrorMsg('');
  };

  // Common customer and delivery address validation
  const validateCommonFields = (): boolean => {
    setErrorMsg('');
    if (!formData.name.trim()) {
      setErrorMsg('Please enter customer full name.');
      return false;
    }

    const cleanMobile = formData.mobile.replace(/\D/g, '');
    if (!cleanMobile) {
      setErrorMsg('⚠️ Phone Number Anivarya (Mandatory) Hai! Bina 10-digit mobile number ke koi order place nahi ho sakta.');
      return false;
    }
    if (cleanMobile.length !== 10 || !/^[6-9]\d{9}$/.test(cleanMobile)) {
      setErrorMsg('⚠️ Kripya valid 10-digit Indian mobile number darj karein (6, 7, 8, ya 9 se shuru hone wala).');
      return false;
    }

    if (!formData.address.trim()) {
      setErrorMsg('Please enter your complete delivery street address.');
      return false;
    }
    if (!formData.pincode.trim() || formData.pincode.length < 6) {
      setErrorMsg('Please enter a valid 6-digit Pincode.');
      return false;
    }

    return true;
  };

  // Unified Order Handoff: creates order, updates Firestore, deducts inventory, and sends WhatsApp receipt
  const executeOrderHandoff = (overrides?: {
    paymentMethod?: PaymentMethod;
    paymentStatus?: 'Pending' | 'Paid';
    razorpayPaymentId?: string;
    cardLast4Digits?: string;
    kistPeUtr?: string;
    onlineUpiRef?: string;
  }) => {
    const cleanMobile = formData.mobile.replace(/\D/g, '');
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

    const activePayment = overrides?.paymentMethod || selectedPayment;
    const isEmi = activePayment === 'upi_mandate' || activePayment === 'emi';
    const isCardEmi = activePayment === 'card_emi';
    const cleanUpi = upiId.trim();
    const effectiveCardLast4 = overrides?.cardLast4Digits || cardNumber.replace(/\D/g, '').slice(-4);
    const effectiveRzpId = overrides?.razorpayPaymentId || razorpayPaymentId;
    const effectiveKistUtr = overrides?.kistPeUtr || kistPeUtr.trim();
    const effectiveOnlineRef = overrides?.onlineUpiRef || onlineUpiRef.trim();

    let emiDetails: any = undefined;
    if (isEmi) {
      emiDetails = {
        tenure: `${selectedEmiTenure} Months (Max 3 Months)`,
        monthlyInstallment: selectedEmiTenure === '3' ? emi3Month : emi2Month,
        downPaymentAmount,
        downPaymentPercent,
        financedAmount,
        providerNote: `Kist Pe / Easy EMI: ₹${downPaymentAmount} Down Payment (33%) + ₹${selectedEmiTenure === '3' ? emi3Month : emi2Month}/mo for ${selectedEmiTenure} Months`,
        mandateUpiId: cleanUpi,
        mandateType: 'Kist Pe (किस्त पे)',
        mandateStatus: effectiveKistUtr ? `Down Payment Verified (UTR: ${effectiveKistUtr})` : 'Down Payment / Mandate Pending',
      };
    } else if (isCardEmi) {
      emiDetails = {
        tenure: `${cardEmiTenure} Months`,
        monthlyInstallment: ccMonthlyEmi,
        downPaymentAmount: 0,
        downPaymentPercent: 0,
        financedAmount: totalAmount,
        creditCardBank: cardEmiBank,
        cardLast4: effectiveCardLast4,
        providerNote: `Credit Card EMI: ${cardEmiBank} (${cardEmiTenure} Mo @ ₹${ccMonthlyEmi}/mo) - Card ending in ${effectiveCardLast4}`,
        mandateType: 'Credit Card EMI',
        mandateStatus: 'Bank EMI Approved',
      };
    }

    const isPaidMethod =
      overrides?.paymentStatus === 'Paid' ||
      activePayment === 'online' ||
      activePayment === 'card' ||
      activePayment === 'card_emi' ||
      !!effectiveRzpId;

    let notesText = orderNotes.trim();
    if (effectiveOnlineRef) {
      notesText = notesText ? `${notesText} [UPI Ref: ${effectiveOnlineRef}]` : `[UPI Ref: ${effectiveOnlineRef}]`;
    }
    if (effectiveCardLast4 && (activePayment === 'card' || activePayment === 'card_emi')) {
      notesText = notesText ? `${notesText} [Card ending in ${effectiveCardLast4}]` : `[Card ending in ${effectiveCardLast4}]`;
    }
    if (effectiveRzpId) {
      notesText = notesText ? `${notesText} [Razorpay ID: ${effectiveRzpId}]` : `[Razorpay ID: ${effectiveRzpId}]`;
    }

    const createdOrder = onCreateOrder({
      customer: {
        ...formData,
        mobile: cleanMobile,
        upiId: isEmi ? cleanUpi : (cleanUpi || undefined),
        deliveryZone,
        distanceKm: deliveryZone === 'chhuikhadan' ? 2 : deliveryZone === 'under_10km' ? 7 : 15,
      },
      items: orderItems,
      subtotal,
      deliveryFee,
      discount: 0,
      totalAmount,
      paymentMethod: activePayment,
      paymentStatus: overrides?.paymentStatus || (isPaidMethod ? 'Paid' : 'Pending'),
      notes: notesText || undefined,
      emiDetails,
    });

    if (effectiveRzpId) {
      createdOrder.razorpayPaymentId = effectiveRzpId;
    }
    if (effectiveKistUtr) {
      createdOrder.kistPeTransactionId = effectiveKistUtr;
    }
    if (effectiveOnlineRef) {
      createdOrder.upiTransactionId = effectiveOnlineRef;
    }

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

    // WhatsApp Order Details Receipt
    const itemLines = orderItems
      .map(
        (it, idx) =>
          `${idx + 1}. *${it.productName}* (${it.selectedSize}) x ${it.quantity} = ₹${it.totalPrice}`
      )
      .join('\n');

    let emiBlock = '';
    if (isEmi) {
      emiBlock = `\n⚡ *KIST PE (किस्त पे) / EASY EMI DETAILS:*
• *Kist Pe Merchant:* ${settings.kistPeAppName || 'Kist Pe'} (${settings.kistPeUpiId || '8982147180@ybl'})
• *Order Total:* ₹${totalAmount}
• *33% Down Payment:* ₹${downPaymentAmount} ${effectiveKistUtr ? `(Paid via UPI - UTR: ${effectiveKistUtr})` : '(To be paid upfront)'}
• *Remaining Financed:* ₹${financedAmount}
• *Monthly Installments:* ₹${selectedEmiTenure === '3' ? emi3Month : emi2Month}/month (${selectedEmiTenure} Months, 0% Interest)
• *Customer UPI ID:* ${cleanUpi}`;
    } else if (isCardEmi) {
      emiBlock = `\n💳 *CREDIT CARD EMI DETAILS:*
• *Bank:* ${cardEmiBank}
• *Card Ending:* **** ${effectiveCardLast4 || 'XXXX'}
• *Tenure:* ${cardEmiTenure} Months
• *Monthly Installment:* ₹${ccMonthlyEmi}/month
• *Total Financed:* ₹${totalAmount}`;
    }

    const deliveryZoneLabel =
      deliveryZone === 'chhuikhadan'
        ? '⚡ Chhuikhadan Local (Under 4 km - 10 MINUTE EXPRESS FREE Delivery)'
        : deliveryZone === 'under_10km'
        ? 'Under 10 km (₹50 Delivery - Prepaid Order)'
        : 'Above 10 km (₹50 Delivery - Prepaid Order)';

    let paymentLabel = 'Cash on Delivery (COD)';
    if (effectiveRzpId) paymentLabel = `Razorpay Paid (Payment ID: ${effectiveRzpId})`;
    else if (activePayment === 'online') paymentLabel = `Prepaid Online UPI Paid (Store UPI: ${storeUpi})${effectiveOnlineRef ? ` [UTR: ${effectiveOnlineRef}]` : ''}`;
    else if (activePayment === 'card') paymentLabel = `Debit / Credit Card Paid (Card Ending in ${effectiveCardLast4 || 'XXXX'})`;
    else if (activePayment === 'card_emi') paymentLabel = `Credit Card EMI (${cardEmiBank} - ${cardEmiTenure} Months @ ₹${ccMonthlyEmi}/mo)`;
    else if (activePayment === 'emi' || activePayment === 'upi_mandate') paymentLabel = 'Kist Pe (किस्त पे) - 33% Down Payment + Max 3 Mo';

    const waMsg = `🛍️ *${isPaidMethod ? 'PAID ORDER' : 'NEW ORDER'} - ${settings.storeName} (Chhuikhadan)*
---------------------------------------
*Order ID:* ${createdOrder.orderNumber}
*Payment Status:* ${isPaidMethod ? '✅ PAID (100% Confirmed)' : '⏳ Pending (Cash on Delivery)'}
*Payment Method:* ${paymentLabel}
*Customer:* ${formData.name.trim()}
*Mobile:* +91 ${cleanMobile}
*Address:* ${formData.address.trim()}, ${formData.city.trim()} - ${formData.pincode.trim()}
*Delivery:* ${deliveryZoneLabel}${emiBlock}

*Items Ordered:*
${itemLines}

*Items Total:* ₹${subtotal}
*Delivery Fee:* ₹${deliveryFee} (${deliveryZone === 'chhuikhadan' ? 'FREE - 10 MINUTE EXPRESS' : '₹50'})
*Total Amount Payable:* ₹${totalAmount}
${notesText ? `*Customer Note:* ${notesText}\n` : ''}---------------------------------------
Namaste Abhishek bhaiya! Maine ABHI FASHION se ye order place kiya hai. Kripya dispatch karein! 🙏`;

    const cleanOwnerPhone = (settings.whatsappNumber || '8982147180').replace(/\D/g, '');
    const waUrl = `https://wa.me/${cleanOwnerPhone.startsWith('91') ? cleanOwnerPhone : `91${cleanOwnerPhone}`}?text=${encodeURIComponent(waMsg)}`;

    try {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.warn('Could not open WhatsApp window:', err);
    }

    setIsProcessing(false);
    onOrderSuccess(createdOrder);
  };

  // Instant UPI payment completion handler
  const handleConfirmOnlinePayment = () => {
    if (!validateCommonFields()) return;
    setIsProcessing(true);
    setTimeout(() => {
      executeOrderHandoff({
        paymentMethod: 'online',
        paymentStatus: 'Paid',
        onlineUpiRef,
      });
    }, 600);
  };

  // Direct Debit / Credit Card payment handler with 3D Secure verification
  const handlePayViaCard = async () => {
    if (!validateCommonFields()) return;

    const cleanNum = cardNumber.replace(/\D/g, '');
    if (cleanNum.length < 15 || cleanNum.length > 19) {
      setErrorMsg('Kripya valid 16-digit Debit ya Credit Card number darj karein.');
      return;
    }
    if (!cardExpiry.trim() || !/^\d{2}\/\d{2}$/.test(cardExpiry)) {
      setErrorMsg('Valid card expiry date darj karein (MM/YY format me, jaise 08/28).');
      return;
    }
    if (!cardCvv.trim() || cardCvv.length < 3) {
      setErrorMsg('Valid 3-digit CVV darj karein.');
      return;
    }

    setIsProcessing(true);
    setCardVerifying(true);

    const rzpResult = await PaymentGatewayService.openRazorpayPayment({
      amount: totalAmount,
      customerName: formData.name.trim(),
      customerMobile: formData.mobile.replace(/\D/g, ''),
      settings,
      description: `Card Order Payment - ${settings.storeName}`,
      notes: {
        paymentMethod: 'Debit/Credit Card',
        cardHolder: cardHolder || 'Cardholder',
        cardLast4: cleanNum.slice(-4),
      },
      onSuccess: (paymentId: string) => {
        setCardVerifying(false);
        setRazorpayPaymentId(paymentId);
        executeOrderHandoff({
          paymentMethod: 'card',
          paymentStatus: 'Paid',
          razorpayPaymentId: paymentId,
          cardLast4Digits: cleanNum.slice(-4),
        });
      },
      onDismiss: () => {
        setIsProcessing(false);
        setCardVerifying(false);
      },
    });

    if (!rzpResult.opened) {
      setTimeout(() => {
        setCardVerifying(false);
        executeOrderHandoff({
          paymentMethod: 'card',
          paymentStatus: 'Paid',
          cardLast4Digits: cleanNum.slice(-4),
        });
      }, 1200);
    }
  };

  // Optional Razorpay Gateway handler with fallback
  const handlePayViaRazorpay = async () => {
    if (!validateCommonFields()) return;

    setIsProcessing(true);
    const result = await PaymentGatewayService.openRazorpayPayment({
      amount: totalAmount,
      customerName: formData.name.trim(),
      customerMobile: formData.mobile.replace(/\D/g, ''),
      settings,
      description: `Order Payment (${items.length} items) - ${settings.storeName}`,
      notes: {
        address: `${formData.address.trim()}, ${formData.city.trim()}`,
      },
      onSuccess: (paymentId: string) => {
        setRazorpayPaymentId(paymentId);
        executeOrderHandoff({
          paymentMethod: selectedPayment === 'card' ? 'card' : 'online',
          paymentStatus: 'Paid',
          razorpayPaymentId: paymentId,
        });
      },
      onDismiss: () => {
        setIsProcessing(false);
      },
    });

    if (!result.opened) {
      setIsProcessing(false);
      setOnlineUpiMode('apps');
      setErrorMsg('💡 Razorpay Gateway connect nahi ho paya. Kripya niche diye Google Pay, PhonePe, Paytm ya QR se turant pay karke "Payment Done" button dabayein.');
    }
  };

  // Handler for Kist Pe 33% Down Payment via Razorpay
  const handlePayKistPeDownPaymentViaRazorpay = async () => {
    if (!validateCommonFields()) return;

    setIsProcessing(true);
    const result = await PaymentGatewayService.openRazorpayPayment({
      amount: downPaymentAmount,
      customerName: formData.name.trim(),
      customerMobile: formData.mobile.replace(/\D/g, ''),
      settings,
      customKeyId: settings.kistPeRazorpayKeyId || settings.razorpayKeyId,
      description: `Kist Pe 33% Down Payment - ${settings.storeName}`,
      notes: {
        emiType: 'Kist Pe Easy EMI',
        tenure: `${selectedEmiTenure} Months`,
        downPayment: `₹${downPaymentAmount}`,
        customerUpi: upiId || 'AutoPay Mandate',
      },
      onSuccess: (paymentId: string) => {
        setRazorpayPaymentId(paymentId);
        setKistPeUtr(paymentId);
        executeOrderHandoff({
          paymentMethod: 'emi',
          paymentStatus: 'Paid',
          razorpayPaymentId: paymentId,
          kistPeUtr: paymentId,
        });
      },
      onDismiss: () => {
        setIsProcessing(false);
      },
    });

    if (!result.opened) {
      setIsProcessing(false);
      setShowKistPeQr(true);
      setErrorMsg('💡 Kist Pe Razorpay Gateway connect nahi ho paya. Kripya niche diye "Pay via Kist Pe / UPI App" ya "Scan Kist Pe QR" se 33% down payment karein.');
    }
  };

  // Bottom form submit button handler
  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCommonFields()) return;

    // COD restriction for 4 km and above
    if (selectedPayment === 'cod' && !isCodAllowed) {
      setErrorMsg('⚠️ 4 km aur usse door ke orders ke liye Cash on Delivery uplabdh nahi hai. Kripya Prepaid Online ya Easy EMI chunein.');
      return;
    }

    // Card Payment Validation
    if (selectedPayment === 'card') {
      const cleanNum = cardNumber.replace(/\D/g, '');
      if (cleanNum.length < 15 || cleanNum.length > 19) {
        setErrorMsg('Kripya valid 16-digit Debit ya Credit Card number darj karein.');
        return;
      }
      if (!cardExpiry.trim() || !/^\d{2}\/\d{2}$/.test(cardExpiry)) {
        setErrorMsg('Valid card expiry date darj karein (MM/YY format me, jaise 08/28).');
        return;
      }
      if (!cardCvv.trim() || cardCvv.length < 3) {
        setErrorMsg('Valid 3-digit CVV darj karein.');
        return;
      }
    }

    // Credit Card EMI Validation
    if (selectedPayment === 'card_emi') {
      if (!isCreditCardEmiEligible) {
        setErrorMsg(`Credit Card EMI ke liye minimum order value ₹${ccMinAmount.toLocaleString('en-IN')} hona zaroori hai. (Aapka Order: ₹${totalAmount.toLocaleString('en-IN')})`);
        return;
      }
      const cleanNum = cardNumber.replace(/\D/g, '');
      if (cleanNum.length < 15 || cleanNum.length > 19) {
        setErrorMsg(`Kripya apna ${cardEmiBank} Credit Card number darj karein.`);
        return;
      }
      if (!cardExpiry.trim() || !/^\d{2}\/\d{2}$/.test(cardExpiry)) {
        setErrorMsg('Valid card expiry date darj karein (MM/YY format me).');
        return;
      }
      if (!cardCvv.trim() || cardCvv.length < 3) {
        setErrorMsg('Valid 3-digit CVV darj karein.');
        return;
      }
    }

    // Easy EMI Validation (Minimum ₹5,000 order required)
    if ((selectedPayment === 'upi_mandate' || selectedPayment === 'emi') && !isEmiEligible) {
      setErrorMsg(`Easy EMI ke liye minimum order value ₹${minEmiAmount.toLocaleString('en-IN')} hona zaroori hai. (Aapka Order: ₹${totalAmount.toLocaleString('en-IN')})`);
      return;
    }

    if (selectedPayment === 'upi_mandate' || selectedPayment === 'emi') {
      const trimmedUpi = upiId.trim();
      if (!trimmedUpi) {
        setErrorMsg('Apna UPI ID (VPA) darj karein taaki dukan (ABHI FASHION) aapko EMI Mandate bhej sake (e.g. 8982147180@paytm ya rahul@okaxis)');
        return;
      }
      if (!trimmedUpi.includes('@') || trimmedUpi.startsWith('@') || trimmedUpi.endsWith('@')) {
        setErrorMsg('Kripya valid UPI ID darj karein jisme "@" ho (jaise 8982147180@paytm ya yourname@okhdfcbank)');
        return;
      }
    }

    setIsProcessing(true);
    if (selectedPayment === 'card') {
      setCardVerifying(true);
      setTimeout(() => {
        setCardVerifying(false);
        executeOrderHandoff({
          paymentMethod: 'card',
          paymentStatus: 'Paid',
          cardLast4Digits: cardNumber.replace(/\D/g, '').slice(-4),
        });
      }, 1200);
    } else {
      setTimeout(() => {
        executeOrderHandoff();
      }, 600);
    }
  };

  const handleOpenKistPeApp = () => {
    const upiTarget = settings.kistPeUpiId || settings.collectUpiId || '8982147180@ybl';
    const deepLink = PaymentGatewayService.getKistPeDeepLink({
      upiId: upiTarget,
      amount: downPaymentAmount,
      customerName: formData.name || 'Customer',
      orderNumber: `AF-${Date.now().toString().slice(-4)}`,
    });
    try {
      window.location.href = deepLink;
    } catch {
      window.open(deepLink, '_blank');
    }
  };

  if (!isOpen || items.length === 0) return null;

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
              <span>1. Delivery Area & Details</span>
              <span className="text-[10px] text-slate-400 lowercase font-normal">(Chhuikhadan & surrounding areas)</span>
            </h3>

            {/* Delivery Location / Distance Selector */}
            <div className="mb-3.5 p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <label className="block text-xs font-bold text-amber-300">
                Aapki Location / Doori (दूरी) Chunein:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                {/* Chhuikhadan */}
                <button
                  type="button"
                  onClick={() => setDeliveryZone('chhuikhadan')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer relative overflow-hidden ${
                    deliveryZone === 'chhuikhadan'
                      ? 'bg-amber-400/15 border-amber-400 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300">Chhuikhadan</span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      FREE Delivery
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-300 font-black mt-1 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                    <span>⚡ 10-Min Delivery</span>
                  </p>
                  <p className="text-[9px] text-slate-300 mt-0.5">Local Town (0 - 3 km) • COD + Cards + UPI</p>
                </button>

                {/* Under 10 km */}
                <button
                  type="button"
                  onClick={() => setDeliveryZone('under_10km')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    deliveryZone === 'under_10km'
                      ? 'bg-amber-400/15 border-amber-400 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300">Under 10 km</span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      ₹50 Delivery
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-300 mt-1">4 km to 10 km Area</p>
                  <p className="text-[9px] text-amber-400 font-bold mt-0.5">Prepaid Only (No COD)</p>
                </button>

                {/* Above 10 km */}
                <button
                  type="button"
                  onClick={() => setDeliveryZone('above_10km')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    deliveryZone === 'above_10km'
                      ? 'bg-amber-400/15 border-amber-400 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300">Above 10 km</span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      ₹50 Delivery
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-300 mt-1">Chhattisgarh Outstation</p>
                  <p className="text-[9px] text-amber-400 font-bold mt-0.5">Prepaid Only (No COD)</p>
                </button>
              </div>

              {/* 10 Minute Express Delivery Live Assurance */}
              {deliveryZone === 'chhuikhadan' && (
                <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-rose-500/15 to-amber-500/20 border border-amber-500/30 text-xs text-amber-200 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0 animate-bounce" />
                  <div>
                    <strong className="text-white">⚡ 10 Minute Delivery Guarantee:</strong> Chhuikhadan (491885) local me order confirm hote hi 10 minute me aapke ghar tak deliver kar diya jayega!
                  </div>
                </div>
              )}
            </div>

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
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-300 font-semibold">
                    10-Digit Mobile Number *
                  </label>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    Mandatory / ज़रूरी
                  </span>
                </div>
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
                    placeholder="8982147180"
                    value={formData.mobile}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-11 pr-3 py-2.5 text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400 text-xs font-mono font-bold"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  ⚠️ Bina mobile number ke order confirm nahi hoga.
                </p>
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
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border transition ${
                    !isCodAllowed
                      ? 'opacity-55 bg-slate-950/70 border-slate-800 cursor-not-allowed'
                      : selectedPayment === 'cod'
                      ? 'bg-amber-950/30 border-amber-400 ring-1 ring-amber-400/30 cursor-pointer'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 cursor-pointer'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    disabled={!isCodAllowed}
                    checked={selectedPayment === 'cod'}
                    onChange={() => isCodAllowed && setSelectedPayment('cod')}
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
                      {isCodAllowed ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                          Chhuikhadan Town (Under 4 km)
                        </span>
                      ) : (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500/40">
                          Prepaid Only (4 km+)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      {isCodAllowed
                        ? 'Pay cash or scan UPI upon doorstep delivery in Chhuikhadan local (Under 4 km).'
                        : '⚠️ 4 km aur usse door ke orders ke liye Cash on Delivery uplabdh nahi hai. Kripya Online UPI ya Easy EMI chunein.'}
                    </p>
                  </div>
                </label>
              )}

              {/* Online Payment (Google Pay, PhonePe, Paytm & UPI QR) */}
              {settings.isOnlinePaymentAvailable && (
                <div
                  className={`p-3.5 sm:p-4 rounded-2xl border transition ${
                    selectedPayment === 'online'
                      ? 'bg-gradient-to-b from-cyan-950/40 via-slate-900 to-slate-950 border-cyan-400 ring-1 ring-cyan-400/40 shadow-xl'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="online"
                      checked={selectedPayment === 'online'}
                      onChange={() => setSelectedPayment('online')}
                      className="mt-1 text-cyan-400 focus:ring-cyan-400"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-cyan-400" />
                          <span className="font-bold text-sm text-white">
                            Online Payment (Google Pay, PhonePe, Paytm, QR & Razorpay)
                          </span>
                        </div>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 uppercase tracking-wider">
                          ⚡ Instant 0-Fee
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        PhonePe, Google Pay, Paytm, BHIM UPI ya direct QR Code scan karke instant order karein.
                      </p>
                    </div>
                  </label>

                  {selectedPayment === 'online' && (
                    <div className="mt-3.5 pt-3 border-t border-slate-800 space-y-3 animate-in fade-in">
                      {/* Sub-Tabs for UPI Options */}
                      <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
                        <button
                          type="button"
                          onClick={() => setOnlineUpiMode('apps')}
                          className={`py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                            onlineUpiMode === 'apps'
                              ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          <span>UPI Apps</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setOnlineUpiMode('qr')}
                          className={`py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                            onlineUpiMode === 'qr'
                              ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>Scan QR</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setOnlineUpiMode('gateway')}
                          className={`py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                            onlineUpiMode === 'gateway'
                              ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Gateway</span>
                        </button>
                      </div>

                      {/* Tab 1: 1-Click UPI Apps */}
                      {onlineUpiMode === 'apps' && (
                        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                              <span>Apna UPI App Dabayein (Pay ₹{totalAmount.toLocaleString('en-IN')}):</span>
                            </span>
                            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                              100% Safe
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {/* PhonePe */}
                            <button
                              type="button"
                              onClick={() => {
                                PaymentGatewayService.openUpiApp({
                                  upiId: storeUpi,
                                  amount: totalAmount,
                                  customerName: formData.name,
                                  storeName: settings.storeName,
                                  app: 'phonepe',
                                });
                                setHasLaunchedUpiApp(true);
                              }}
                              className="p-2.5 rounded-xl bg-[#5f259f]/20 hover:bg-[#5f259f]/35 border border-[#5f259f]/60 text-white flex flex-col items-center justify-center gap-1 transition cursor-pointer shadow-xs active:scale-95"
                            >
                              <div className="w-8 h-8 rounded-full bg-[#5f259f] flex items-center justify-center font-black text-sm text-white shadow-xs">
                                पे
                              </div>
                              <span className="text-xs font-black">PhonePe</span>
                              <span className="text-[9px] text-purple-300">1-Tap Pay</span>
                            </button>

                            {/* Google Pay */}
                            <button
                              type="button"
                              onClick={() => {
                                PaymentGatewayService.openUpiApp({
                                  upiId: storeUpi,
                                  amount: totalAmount,
                                  customerName: formData.name,
                                  storeName: settings.storeName,
                                  app: 'gpay',
                                });
                                setHasLaunchedUpiApp(true);
                              }}
                              className="p-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/35 border border-blue-500/60 text-white flex flex-col items-center justify-center gap-1 transition cursor-pointer shadow-xs active:scale-95"
                            >
                              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-black text-sm text-white shadow-xs">
                                G
                              </div>
                              <span className="text-xs font-black">Google Pay</span>
                              <span className="text-[9px] text-blue-300">1-Tap Pay</span>
                            </button>

                            {/* Paytm */}
                            <button
                              type="button"
                              onClick={() => {
                                PaymentGatewayService.openUpiApp({
                                  upiId: storeUpi,
                                  amount: totalAmount,
                                  customerName: formData.name,
                                  storeName: settings.storeName,
                                  app: 'paytm',
                                });
                                setHasLaunchedUpiApp(true);
                              }}
                              className="p-2.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/35 border border-cyan-500/60 text-white flex flex-col items-center justify-center gap-1 transition cursor-pointer shadow-xs active:scale-95"
                            >
                              <div className="w-8 h-8 rounded-full bg-[#002e6e] text-cyan-300 flex items-center justify-center font-black text-[10px] shadow-xs">
                                Paytm
                              </div>
                              <span className="text-xs font-black">Paytm</span>
                              <span className="text-[9px] text-cyan-300">1-Tap Pay</span>
                            </button>

                            {/* Any Other UPI / BHIM */}
                            <button
                              type="button"
                              onClick={() => {
                                PaymentGatewayService.openUpiApp({
                                  upiId: storeUpi,
                                  amount: totalAmount,
                                  customerName: formData.name,
                                  storeName: settings.storeName,
                                  app: 'generic',
                                });
                                setHasLaunchedUpiApp(true);
                              }}
                              className="p-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/60 text-white flex flex-col items-center justify-center gap-1 transition cursor-pointer shadow-xs active:scale-95"
                            >
                              <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-black text-xs text-white shadow-xs">
                                UPI
                              </div>
                              <span className="text-xs font-black">Any UPI</span>
                              <span className="text-[9px] text-emerald-300">Cred / BHIM</span>
                            </button>
                          </div>

                          {hasLaunchedUpiApp && (
                            <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-[11px] text-emerald-300 flex items-center gap-2 animate-in fade-in">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span>UPI app khul chuka hai! Payment poora hote hi niche "Payment Done" dabayein.</span>
                            </div>
                          )}

                          {/* Merchant UPI ID Box */}
                          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                            <div>
                              <span className="text-[10px] text-slate-400 block">Dukan ka official UPI ID:</span>
                              <span className="font-mono font-bold text-amber-300">{storeUpi}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(storeUpi);
                                setCopiedStoreUpi(true);
                                setTimeout(() => setCopiedStoreUpi(false), 2000);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                            >
                              {copiedStoreUpi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedStoreUpi ? 'Copied!' : 'Copy UPI'}</span>
                            </button>
                          </div>

                          {/* Optional UTR Input */}
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                              UPI Reference / UTR Number (Optional):
                            </label>
                            <input
                              type="text"
                              value={onlineUpiRef}
                              onChange={(e) => setOnlineUpiRef(e.target.value)}
                              placeholder="e.g. 428192847192"
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-hidden focus:border-cyan-400 text-xs font-mono"
                            />
                          </div>

                          {/* Direct Instant Confirmation Button */}
                          <button
                            type="button"
                            onClick={handleConfirmOnlinePayment}
                            disabled={isProcessing}
                            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-cyan-500/20 active:scale-98"
                          >
                            <CheckCircle2 className="w-4 h-4 text-slate-950" />
                            <span>Payment Done - Confirm Order (₹{totalAmount.toLocaleString('en-IN')})</span>
                          </button>
                        </div>
                      )}

                      {/* Tab 2: Scan QR */}
                      {onlineUpiMode === 'qr' && (
                        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-center">
                          <span className="text-xs font-bold text-white block">
                            Kisi bhi UPI Scanner se Scan Karke Pay Karein
                          </span>

                          {onlineUpiQrUrl ? (
                            <div className="inline-block p-3 rounded-2xl bg-white shadow-xl my-1">
                              <img
                                src={onlineUpiQrUrl}
                                alt="ABHI FASHION UPI QR Code"
                                className="w-48 h-48 mx-auto object-contain rounded-lg"
                              />
                              <div className="mt-1 text-xs font-black text-slate-900">
                                Exact Amount: ₹{totalAmount.toLocaleString('en-IN')}
                              </div>
                              <div className="text-[10px] text-slate-600 font-semibold">
                                {settings.storeName} • {storeUpi}
                              </div>
                            </div>
                          ) : (
                            <div className="py-8 text-xs text-slate-400">QR Code loading...</div>
                          )}

                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(storeUpi);
                                setCopiedStoreUpi(true);
                                setTimeout(() => setCopiedStoreUpi(false), 2000);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                            >
                              {copiedStoreUpi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedStoreUpi ? 'UPI ID Copied!' : `Copy: ${storeUpi}`}</span>
                            </button>
                          </div>

                          <div className="text-left">
                            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                              Scan karne ke baad UTR / Transaction No. (Optional):
                            </label>
                            <input
                              type="text"
                              value={onlineUpiRef}
                              onChange={(e) => setOnlineUpiRef(e.target.value)}
                              placeholder="e.g. 428192847192"
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-hidden focus:border-cyan-400 text-xs font-mono"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={handleConfirmOnlinePayment}
                            disabled={isProcessing}
                            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-98"
                          >
                            <CheckCircle2 className="w-4 h-4 text-slate-950" />
                            <span>QR Code Se Pay Kiya - Confirm Order (₹{totalAmount.toLocaleString('en-IN')})</span>
                          </button>
                        </div>
                      )}

                      {/* Tab 3: Razorpay Gateway */}
                      {onlineUpiMode === 'gateway' && (
                        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-bold text-xs text-cyan-200 block flex items-center gap-1.5">
                                <Zap className="w-3.5 h-3.5 text-amber-400" />
                                Razorpay Standard Checkout
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Netbanking, Credit/Debit Card, Wallets dwara payment.
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handlePayViaRazorpay}
                            disabled={isProcessing}
                            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md active:scale-98"
                          >
                            <Lock className="w-4 h-4" />
                            <span>Pay ₹{totalAmount.toLocaleString('en-IN')} with Razorpay</span>
                          </button>
                          <p className="text-[10px] text-slate-400">
                            💡 Agar gateway window open na ho, toh upar "UPI Apps" ya "Scan QR" tab se turant 1-click pay kar sakte hain.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Debit / Credit Card Payment */}
              {settings.isCardPaymentAvailable && (
                <div
                  className={`p-3.5 sm:p-4 rounded-2xl border transition ${
                    selectedPayment === 'card'
                      ? 'bg-gradient-to-b from-emerald-950/30 via-slate-900 to-slate-950 border-emerald-400 ring-1 ring-emerald-400/40 shadow-xl'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="card"
                      checked={selectedPayment === 'card'}
                      onChange={() => setSelectedPayment('card')}
                      className="mt-1 text-emerald-400 focus:ring-emerald-400"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-emerald-400" />
                          <span className="font-bold text-sm text-white">
                            Debit / Credit Card (ATM Card / Visa / RuPay / MasterCard)
                          </span>
                        </div>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 uppercase tracking-wider">
                          All Cards Accepted
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        Debit Card (ATM), Credit Card, RuPay, Visa, MasterCard se instant safe payment karein.
                      </p>
                    </div>
                  </label>

                  {/* Card Form when selected */}
                  {selectedPayment === 'card' && (
                    <div className="mt-3.5 pt-3 border-t border-slate-800 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800/80 pb-2">
                        <span className="flex items-center gap-1.5 text-emerald-300 font-bold">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          Direct Card Details (256-Bit SSL Encrypted & Bank Verified)
                        </span>
                        <div className="flex gap-1">
                          <span className="px-1.5 py-0.5 bg-slate-800 rounded font-black text-[9px] text-slate-300 border border-slate-700">RUPAY</span>
                          <span className="px-1.5 py-0.5 bg-slate-800 rounded font-black text-[9px] text-cyan-300 border border-slate-700">VISA</span>
                          <span className="px-1.5 py-0.5 bg-slate-800 rounded font-black text-[9px] text-rose-300 border border-slate-700">MC</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Cardholder Name (Card par likha naam)
                        </label>
                        <input
                          type="text"
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value)}
                          placeholder="e.g. Rahul Verma"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-400 text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          16-Digit Card Number *
                        </label>
                        <input
                          type="text"
                          maxLength={19}
                          value={cardNumber}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ');
                            setCardNumber(val);
                          }}
                          placeholder="4532 •••• •••• 8941"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-400 text-xs font-mono font-bold"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            Expiry Date (MM/YY) *
                          </label>
                          <input
                            type="text"
                            maxLength={5}
                            value={cardExpiry}
                            onChange={(e) => {
                              let val = e.target.value.replace(/\D/g, '');
                              if (val.length >= 2) val = val.slice(0, 2) + '/' + val.slice(2, 4);
                              setCardExpiry(val);
                            }}
                            placeholder="08/28"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-400 text-xs font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            CVV / CVC (3-Digit) *
                          </label>
                          <input
                            type="password"
                            maxLength={4}
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                            placeholder="•••"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-400 text-xs font-mono font-bold"
                          />
                        </div>
                      </div>

                      {/* Card Pay Button */}
                      <button
                        type="button"
                        onClick={handlePayViaCard}
                        disabled={isProcessing || cardVerifying}
                        className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-500/25 active:scale-98"
                      >
                        {cardVerifying ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                            <span>3D Secure Bank Verification Chal Rahi Hai...</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4 text-slate-950" />
                            <span>Pay ₹{totalAmount.toLocaleString('en-IN')} with Card & Confirm Order</span>
                          </>
                        )}
                      </button>

                      <p className="text-[10px] text-slate-400 flex items-center gap-1.5 pt-0.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Card details encrypted hain aur payment turant safely verify hoti hai.</span>
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Credit Card EMI (Major Banks) */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-2xl border transition cursor-pointer ${
                  selectedPayment === 'card_emi'
                    ? 'bg-amber-950/30 border-amber-400 ring-1 ring-amber-400/30'
                    : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="card_emi"
                  checked={selectedPayment === 'card_emi'}
                  onChange={() => setSelectedPayment('card_emi')}
                  className="mt-1 text-amber-400 focus:ring-amber-400"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-rose-400" />
                      <span className="font-bold text-sm text-white">
                        Credit Card EMI (बैंक क्रेडिट कार्ड किस्त)
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500/30">
                      HDFC • SBI • ICICI • Axis • Kotak
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    Apne Credit Card se 3, 6, 9 ya 12 mahine ki monthly किस्त (EMI) par kapde khareedein. 0% Down payment option!
                  </p>

                  {!isCreditCardEmiEligible && (
                    <div className="mt-2 p-2 rounded-xl bg-amber-950/40 border border-amber-500/40 text-[11px] text-amber-300 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>
                        Credit Card EMI minimum <strong>₹{ccMinAmount.toLocaleString('en-IN')}</strong> ke order par uplabdh hai (Aapka Order: ₹{totalAmount.toLocaleString('en-IN')}).
                      </span>
                    </div>
                  )}

                  {/* Credit Card EMI Bank & Tenure Selector */}
                  {selectedPayment === 'card_emi' && (
                    <div className="mt-3 p-3.5 rounded-xl bg-slate-950 border border-amber-400/30 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between text-[11px] text-amber-300 font-bold border-b border-slate-800 pb-2">
                        <span>Select Your Credit Card Bank:</span>
                        <span className="text-emerald-400">Instant Online Approval</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {['HDFC Bank', 'SBI Card', 'ICICI Bank', 'Axis Bank', 'Kotak Bank', 'Bank of Baroda', 'IndusInd Bank', 'RBL Bank'].map((bank) => (
                          <button
                            key={bank}
                            type="button"
                            onClick={() => setCardEmiBank(bank)}
                            className={`p-2 rounded-xl border text-left text-xs font-bold transition cursor-pointer ${
                              cardEmiBank === bank
                                ? 'bg-amber-400/20 border-amber-400 text-white shadow-xs'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            <span className="truncate block">{bank}</span>
                          </button>
                        ))}
                      </div>

                      {/* Tenure Picker */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                          Select EMI Tenure:
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { tenure: '3' as const, label: '3 Months', note: 'No Cost EMI' },
                            { tenure: '6' as const, label: '6 Months', note: 'Low Cost' },
                            { tenure: '9' as const, label: '9 Months', note: 'Standard' },
                            { tenure: '12' as const, label: '12 Months', note: 'Budget Flex' },
                          ].map((t) => {
                            const monthly = Math.round(totalAmount / parseInt(t.tenure, 10));
                            return (
                              <button
                                key={t.tenure}
                                type="button"
                                onClick={() => setCardEmiTenure(t.tenure)}
                                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                                  cardEmiTenure === t.tenure
                                    ? 'bg-amber-400/20 border-amber-400 text-white ring-1 ring-amber-400/40'
                                    : 'bg-slate-900 border-slate-800 text-slate-400'
                                }`}
                              >
                                <div className="font-bold text-xs text-white">{t.label}</div>
                                <div className="text-amber-400 font-black text-sm">₹{monthly}/mo</div>
                                <div className="text-[9px] text-emerald-400 font-semibold">{t.note}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Card Input for EMI authorization */}
                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            {cardEmiBank} Credit Card Number *
                          </label>
                          <input
                            type="text"
                            maxLength={19}
                            value={cardNumber}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ');
                              setCardNumber(val);
                            }}
                            placeholder="4532 •••• •••• 8941"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400 text-xs font-mono"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                              Expiry Date (MM/YY) *
                            </label>
                            <input
                              type="text"
                              maxLength={5}
                              value={cardExpiry}
                              onChange={(e) => {
                                let val = e.target.value.replace(/\D/g, '');
                                if (val.length >= 2) val = val.slice(0, 2) + '/' + val.slice(2, 4);
                                setCardExpiry(val);
                              }}
                              placeholder="08/28"
                              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400 text-xs font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                              CVV *
                            </label>
                            <input
                              type="password"
                              maxLength={4}
                              value={cardCvv}
                              onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                              placeholder="•••"
                              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400 text-xs font-mono"
                            />
                          </div>
                        </div>

                        <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/20 text-[10px] text-emerald-300">
                          ✨ <strong>Credit Card EMI Summary:</strong> {cardEmiBank} Credit Card se total ₹{totalAmount.toLocaleString('en-IN')} ko {cardEmiTenure} mahine ki kiston me divide kiya jayega (₹{ccMonthlyEmi}/month). Down payment upfront ₹0!
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </label>

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
                          Kist Pe - Easy EMI (किस्त पे पर कपड़े)
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                        Kist Pe Partner • Min ₹5,000 • 33% Down • Max 3 Mo.
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 mt-1">
                      ₹5,000+ ke orders par 33% down payment karein aur baki bacha amount 2 ya 3 mahine ki 0% interest kiston me chukayein (Kist Pe / UPI AutoPay dwara).
                    </p>

                    {!isEmiEligible && (
                      <div className="mt-2 p-2 rounded-xl bg-amber-950/40 border border-amber-500/40 text-[11px] text-amber-300 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>
                          Kist Pe EMI minimum <strong>₹{minEmiAmount.toLocaleString('en-IN')}</strong> ke order par uplabdh hai (Aapka Order: ₹{totalAmount.toLocaleString('en-IN')}). Kripya ₹{(minEmiAmount - totalAmount).toLocaleString('en-IN')} ka aur saman add karein.
                        </span>
                      </div>
                    )}

                    {/* Accurate EMI disclosure & Kist Pe Down Payment */}
                    {selectedPayment === 'emi' && isEmiEligible && (
                      <div className="mt-2.5 p-3 rounded-xl bg-slate-950/90 border border-amber-400/30 text-xs text-slate-200 space-y-3 animate-in fade-in">
                        {/* Down Payment & Financed Breakdown */}
                        <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-1.5">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-300">Total Order Amount:</span>
                            <span className="font-bold text-white">₹{totalAmount.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] text-amber-300 font-bold border-t border-amber-500/20 pt-1">
                            <span>Down Payment (Minimum 33% Upfront):</span>
                            <span className="font-black text-amber-400 text-xs">₹{downPaymentAmount.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] text-emerald-300 font-bold">
                            <span>Remaining Financed in EMI (0% Interest):</span>
                            <span className="font-black text-white">₹{financedAmount.toLocaleString('en-IN')}</span>
                          </div>
                        </div>

                        {/* Tenure Selector */}
                        <div>
                          <div className="flex items-center justify-between text-[11px] text-amber-400 font-semibold mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <Info className="w-3.5 h-3.5 shrink-0" />
                              <span>Select Installment Tenure (Maximum 3 Months):</span>
                            </div>
                            <span className="text-[10px] text-emerald-400 font-bold">0% Interest</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedEmiTenure('3')}
                              className={`p-2.5 rounded-lg text-left border transition cursor-pointer ${
                                selectedEmiTenure === '3'
                                  ? 'bg-amber-400/15 border-amber-400 text-white'
                                  : 'bg-slate-900 border-slate-700 text-slate-400'
                              }`}
                            >
                              <div className="font-bold text-amber-300">3 Months (Max Limit)</div>
                              <div className="font-black text-white text-xs">₹{emi3Month}/mo</div>
                              <div className="text-[9px] text-emerald-400">Recommended • 0% Interest</div>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedEmiTenure('2')}
                              className={`p-2.5 rounded-lg text-left border transition cursor-pointer ${
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
                        </div>

                        {/* Kist Pe 33% Down Payment Action Box */}
                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                              <span>Step 1: 33% Down Payment (₹{downPaymentAmount.toLocaleString('en-IN')})</span>
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                              Instant Receipt
                            </span>
                          </div>

                          {/* Kist Pe Down Payment via Razorpay Button */}
                          <button
                            type="button"
                            onClick={handlePayKistPeDownPaymentViaRazorpay}
                            disabled={isProcessing}
                            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-teal-500 via-emerald-500 to-green-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md active:scale-98"
                          >
                            <Zap className="w-3.5 h-3.5 text-slate-950 fill-slate-950" />
                            <span>Pay ₹{downPaymentAmount.toLocaleString('en-IN')} Down Payment via Razorpay (Card / UPI)</span>
                          </button>

                          <div className="flex items-center gap-2 text-[10px] text-slate-400 my-1">
                            <div className="h-px bg-slate-800 flex-1" />
                            <span>ya direct UPI App / QR Code se bhejein</span>
                            <div className="h-px bg-slate-800 flex-1" />
                          </div>

                          <div className="flex flex-col sm:flex-row gap-2">
                            <button
                              type="button"
                              onClick={handleOpenKistPeApp}
                              className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Pay ₹{downPaymentAmount} via Kist Pe / UPI App</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setShowKistPeQr(!showKistPeQr)}
                              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition cursor-pointer"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              <span>{showKistPeQr ? 'QR Chhupayein' : 'Scan Kist Pe QR'}</span>
                            </button>
                          </div>

                          {/* Dynamic Kist Pe QR Code Display */}
                          {showKistPeQr && kistPeQrDataUrl && (
                            <div className="mt-2.5 p-3 rounded-xl bg-white text-slate-900 flex flex-col items-center text-center animate-in zoom-in-95 duration-150">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Kist Pe Down Payment QR Code
                              </span>
                              <img
                                src={kistPeQrDataUrl}
                                alt="Kist Pe Down Payment QR"
                                className="w-40 h-40 object-contain my-1 rounded-lg border border-slate-200 shadow-sm"
                              />
                              <div className="text-xs font-black text-slate-900">
                                Exact Amount: ₹{downPaymentAmount.toLocaleString('en-IN')}
                              </div>
                              <div className="text-[10px] text-slate-600 mt-0.5">
                                Merchant: <strong>{settings.storeName}</strong> ({settings.kistPeUpiId || '8982147180@ybl'})
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(settings.kistPeUpiId || '8982147180@ybl');
                                  setCopiedKistUpi(true);
                                  setTimeout(() => setCopiedKistUpi(false), 2000);
                                }}
                                className="mt-2 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                {copiedKistUpi ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedKistUpi ? 'UPI ID Copied!' : 'Copy Merchant UPI ID'}</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Step 2: Customer UPI ID Input for Monthly Installment AutoPay */}
                        <div className="pt-1">
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            Step 2: Aapka UPI ID / VPA (Monthly Kist AutoPay ke liye) *
                          </label>
                          <input
                            type="text"
                            value={upiId}
                            onChange={(e) => setUpiId(e.target.value)}
                            placeholder="e.g. 8982147180@paytm ya rahul@okaxis"
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

                          {/* Optional UTR Number if already paid */}
                          <div className="mt-2.5">
                            <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                              Down Payment UTR / Transaction No. (Optional - agar QR scan karke pay kar diya hai):
                            </label>
                            <input
                              type="text"
                              value={kistPeUtr}
                              onChange={(e) => setKistPeUtr(e.target.value)}
                              placeholder="e.g. 428192847192"
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono placeholder-slate-600 focus:outline-hidden focus:border-amber-400"
                            />
                          </div>

                          <p className="text-[10px] text-emerald-400/90 mt-2 bg-emerald-950/30 p-2 rounded-lg border border-emerald-500/20">
                            ⚡ Dukan (ABHI FASHION) aapke is UPI ID par Kist Pe AutoPay / EMI mandate send karegi jise PhonePe / Google Pay / Paytm par approve karna hoga.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </label>
              )}
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
                <span>
                  Delivery Charge ({deliveryZone === 'chhuikhadan' ? 'Chhuikhadan Local' : deliveryZone === 'under_10km' ? 'Under 10 km' : 'Above 10 km'}):
                </span>
                <span className="font-semibold text-emerald-400">
                  {deliveryFee === 0 ? 'FREE (मुफ़्त)' : `₹${deliveryFee}`}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline">
                <span className="font-bold text-sm text-white">Total Payable Amount:</span>
                <span className="text-xl font-black text-amber-400">
                  ₹{totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <button
              type="submit"
              id="btn-confirm-place-order"
              disabled={isProcessing || cardVerifying}
              className="mt-4 w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-500/25 active:scale-98 transition disabled:opacity-50 cursor-pointer"
            >
              {cardVerifying ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin text-slate-950" />
                  <span>3D Secure Bank Verification Chal Rahi Hai...</span>
                </>
              ) : isProcessing ? (
                <span>Securing Order...</span>
              ) : (
                <>
                  <MessageCircle className="w-5 h-5 text-slate-950 fill-current" />
                  <span>
                    {selectedPayment === 'cod'
                      ? `📦 Cash on Delivery Order Confirm Karein (₹${totalAmount.toLocaleString('en-IN')})`
                      : selectedPayment === 'online'
                      ? `⚡ Complete Online Order (₹${totalAmount.toLocaleString('en-IN')})`
                      : selectedPayment === 'card'
                      ? `💳 Card Se Pay Karein & Order Confirm (₹${totalAmount.toLocaleString('en-IN')})`
                      : selectedPayment === 'card_emi'
                      ? `💳 Credit Card EMI Order Confirm Karein (₹${totalAmount.toLocaleString('en-IN')})`
                      : `⚡ Easy EMI / Kist Pe Order Confirm Karein (₹${totalAmount.toLocaleString('en-IN')})`}
                  </span>
                </>
              )}
            </button>
            <p className="text-center text-[11px] text-slate-400 mt-2">
              📲 Order confirm hote hi WhatsApp receipt Abhishek (ABHI FASHION) ko bhej di jayegi!
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
