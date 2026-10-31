import React from 'react';
import {
  CheckCircle2,
  Share2,
  ShoppingBag,
  MapPin,
  Calendar,
  CreditCard,
  PackageCheck,
  MessageCircle,
  ArrowRight,
  Copy,
  Check,
  BellRing,
  Smartphone,
} from 'lucide-react';
import { Order, StoreSettings } from '../types';

interface OrderConfirmationModalProps {
  order: Order | null;
  settings: StoreSettings;
  onClose: () => void;
  onViewAllOrders: () => void;
}

export const OrderConfirmationModal: React.FC<OrderConfirmationModalProps> = ({
  order,
  settings,
  onClose,
  onViewAllOrders,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!order) return null;

  const formattedDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleCopyOrderId = () => {
    navigator.clipboard.writeText(order.orderNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Pre-formatted WhatsApp Message for store owner
  const handleSendToWhatsApp = () => {
    const itemLines = order.items
      .map(
        (it, i) =>
          `${i + 1}. *${it.productName}* (Size: ${it.selectedSize}) x ${it.quantity} = ₹${it.totalPrice}`
      )
      .join('\n');

    let emiText = '';
    if (order.emiDetails || order.paymentMethod === 'emi') {
      emiText = `\n⚡ *EASY EMI DETAILS (33% Down Payment + Max 3 Months):*
• *Down Payment (33%):* ₹${order.emiDetails?.downPaymentAmount || Math.round(order.totalAmount * 0.33)}
• *Monthly EMI:* ₹${order.emiDetails?.monthlyInstallment || Math.round((order.totalAmount * 0.67) / 3)}/month (${order.emiDetails?.tenure || '3 Months'})
• *Customer UPI ID:* ${order.emiDetails?.mandateUpiId || order.customer.upiId || 'Not provided'}`;
    }

    const message = `🛍️ *ORDER CONFIRMATION - ${settings.storeName}*
---------------------------------------
*Order ID:* ${order.orderNumber}
*Date:* ${formattedDate}
*Customer:* ${order.customer.name}
*Mobile:* +91 ${order.customer.mobile}
*Address:* ${order.customer.address}, ${order.customer.city}, ${order.customer.state} - ${order.customer.pincode}${emiText}

*Items Ordered:*
${itemLines}

*Total Payable:* ₹${order.totalAmount}
*Payment Method:* ${order.paymentMethod.toUpperCase()} (${order.paymentStatus})
*Status:* ${order.orderStatus}
${order.notes ? `*Notes:* ${order.notes}\n` : ''}---------------------------------------
Namaste Abhishek bhaiya! Maine ABHI FASHION se ye order place kiya hai. Kripya confirm karein! 🙏`;

    // Clean phone number (strip spaces, +, hyphens)
    const cleanPhone = (settings.whatsappNumber || '8982147180').replace(/\D/g, '');
    const encoded = encodeURIComponent(message);
    const targetPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
    const whatsappUrl = `https://wa.me/${targetPhone}?text=${encoded}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSendToSms = () => {
    if (!order) return;
    const cleanPhone = (settings.supportPhone || '8982147180').replace(/\D/g, '');
    const smsBody = `NEW ORDER ${order.orderNumber} at ABHI FASHION by ${order.customer.name}, Amount: Rs ${order.totalAmount}, Mobile: ${order.customer.mobile}`;
    const encoded = encodeURIComponent(smsBody);
    window.location.href = `sms:+91${cleanPhone}?body=${encoded}`;
  };

  return (
    <div
      id="order-confirmation-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in"
    >
      <div
        id="order-confirmation-container"
        className="relative w-full max-w-lg bg-[#0E1628] rounded-3xl border border-slate-700 text-slate-100 shadow-2xl overflow-hidden flex flex-col my-auto"
      >
        {/* Top Banner Celebration */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 text-center text-white relative">
          <div className="w-14 h-14 bg-white text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg animate-bounce">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">Order Placed Successfully!</h2>
          <p className="text-xs sm:text-sm text-emerald-100 mt-1">
            Thank you for shopping at {settings.storeName}, Chhuikhadan.
          </p>
        </div>

        {/* Order Details Body */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[65vh] overflow-y-auto text-xs">
          {/* Order ID & Date Header */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900 border border-slate-800">
            <div>
              <span className="text-slate-400 block text-[11px]">Order Reference ID</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono font-black text-sm text-amber-400">
                  {order.orderNumber}
                </span>
                <button
                  onClick={handleCopyOrderId}
                  className="p-1 text-slate-400 hover:text-white"
                  title="Copy Order ID"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="text-right">
              <span className="text-slate-400 block text-[11px]">Current Status</span>
              <span className="inline-block px-2 py-0.5 mt-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                {order.orderStatus}
              </span>
            </div>
          </div>

          {/* Automated Store Alert Dispatch Status */}
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-sm">
              <BellRing className="w-4 h-4 animate-pulse" />
            </div>
            <div className="flex-1 text-[11px] leading-tight">
              <span className="font-bold text-white block">Order Alert Dispatched to Store</span>
              <span className="text-slate-300">
                Push sound notification and order summary sent to ABHI FASHION (+91 {settings.whatsappNumber}).
              </span>
            </div>
          </div>

          {/* WhatsApp & SMS Direct Send Buttons */}
          <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-600/40 text-emerald-200 space-y-2.5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-white text-xs">Direct WhatsApp & SMS Receipt</h4>
                <p className="text-[11px] text-emerald-300/80 mt-0.5">
                  Share receipt directly with store manager (+91 {settings.whatsappNumber}) for instant packing & priority dispatch.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                id="btn-send-order-whatsapp"
                onClick={handleSendToWhatsApp}
                className="w-full py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                <span>Send on WhatsApp</span>
              </button>
              <button
                id="btn-send-order-sms"
                onClick={handleSendToSms}
                className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 shadow-md transition cursor-pointer"
              >
                <Smartphone className="w-4 h-4 text-sky-400" />
                <span>Send SMS to Store</span>
              </button>
            </div>
          </div>

          {/* Ordered Products list */}
          <div>
            <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[11px] mb-2">
              Ordered Items ({order.items.length})
            </h4>
            <div className="space-y-2">
              {order.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800"
                >
                  <img
                    src={item.image}
                    alt={item.productName}
                    className="w-12 h-14 rounded-lg object-cover bg-slate-800 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-white truncate text-xs">{item.productName}</h5>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span>Size: {item.selectedSize}</span>
                      <span>•</span>
                      <span>Qty: {item.quantity}</span>
                    </div>
                  </div>
                  <div className="font-bold text-white text-xs">
                    ₹{item.totalPrice.toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery & Payment Info */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 font-semibold block mb-1">Delivery Address</span>
              <p className="font-bold text-white">{order.customer.name}</p>
              <p className="text-slate-300 line-clamp-2">{order.customer.address}</p>
              <p className="text-slate-400">{order.customer.city}, {order.customer.pincode}</p>
              <p className="text-amber-400 font-mono mt-1">Ph: +91 {order.customer.mobile}</p>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 font-semibold block mb-1">Payment Method</span>
              <p className="font-bold text-white uppercase">{order.paymentMethod}</p>
              <p className="text-emerald-400 font-medium">Status: {order.paymentStatus}</p>
              <div className="mt-2 pt-1 border-t border-slate-800">
                <span className="text-slate-400 block text-[10px]">Total Amount</span>
                <span className="font-black text-sm text-amber-400">₹{order.totalAmount}</span>
              </div>
            </div>

            {(order.emiDetails || order.customer.upiId) && (
              <div className="col-span-2 p-3 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-[11px] text-amber-200 space-y-1.5">
                <div className="flex items-center justify-between font-bold text-amber-300">
                  <span>⚡ Easy EMI Mandate (Max 3 Months):</span>
                  <span className="text-white font-mono font-black text-xs">
                    ₹{order.emiDetails?.monthlyInstallment || Math.round((order.totalAmount * 0.67) / 3)}/mo
                  </span>
                </div>
                <div className="flex justify-between text-slate-300 border-t border-amber-500/20 pt-1">
                  <span>Down Payment (33%):</span>
                  <span className="font-bold text-amber-400">
                    ₹{order.emiDetails?.downPaymentAmount || Math.round(order.totalAmount * 0.33)}
                  </span>
                </div>
                <p className="text-slate-300">
                  Customer UPI ID: <span className="font-mono font-bold text-amber-300">{order.emiDetails?.mandateUpiId || order.customer.upiId}</span>
                </p>
                <p className="text-slate-400 text-[10px] mt-0.5">
                  ABHI FASHION aapke is UPI ID par EMI payment/mandate request bhejegi jise PhonePe / Google Pay / Paytm par approve karna hoga.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-[#0A0F1D] border-t border-slate-800 flex gap-2">
          <button
            onClick={() => {
              onClose();
              onViewAllOrders();
            }}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer"
          >
            Track All Orders
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition cursor-pointer"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
};
