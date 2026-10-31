import React, { useState, useEffect } from 'react';
import {
  Shield,
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  Share2,
  ExternalLink,
  Phone,
  MessageCircle,
  Clock,
  CheckCircle,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  ShoppingBag,
  Sparkles,
  ChevronRight,
  Printer,
  X,
  QrCode,
  CreditCard,
} from 'lucide-react';
import {
  Banner,
  Category,
  Order,
  OrderStatus,
  Product,
  StoreSettings,
} from '../types';
import { AdminPanel } from './AdminPanel';
import { PosterQrModal } from './PosterQrModal';
import { GlobalErrorBoundary } from './GlobalErrorBoundary';
import { StoreService, subscribeToNewOrders, subscribeToStore } from '../services/storeStorage';
import { NotificationService, playOrderAlertSound } from '../services/notificationService';
import { useBackHandler } from '../hooks/useBackHandler';

interface AdminAppProps {
  onSwitchToCustomerApp: () => void;
}

export const AdminApp: React.FC<AdminAppProps> = ({ onSwitchToCustomerApp }) => {
  // Store Data
  const [products, setProducts] = useState<Product[]>(() => StoreService.getProducts());
  const [categories, setCategories] = useState<Category[]>(() => StoreService.getCategories());
  const [banners, setBanners] = useState<Banner[]>(() => StoreService.getBanners());
  const [settings, setSettings] = useState<StoreSettings>(() => StoreService.getSettings());
  const [orders, setOrders] = useState<Order[]>(() => StoreService.getOrders());

  // Sound and Alert State
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('abhi_admin_sound_enabled') !== 'false';
  });
  const [incomingOrder, setIncomingOrder] = useState<Order | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<{ supported: boolean; isSubscribed: boolean; permission: string } | null>(null);
  const [isPosterModalOpen, setIsPosterModalOpen] = useState(false);

  // Phone back button: close incoming order popup or poster modal
  useBackHandler(Boolean(incomingOrder), () => setIncomingOrder(null), 25, 'AdminIncomingOrderAlert');
  useBackHandler(isPosterModalOpen, () => setIsPosterModalOpen(false), 20, 'AdminPosterModal');

  // Load store data
  const refreshData = () => {
    setProducts(StoreService.getProducts());
    setCategories(StoreService.getCategories());
    setBanners(StoreService.getBanners());
    setSettings(StoreService.getSettings());
    setOrders(StoreService.getOrders());
  };

  useEffect(() => {
    refreshData();
    const unsubStore = subscribeToStore(refreshData);

    // Subscribe to brand new orders arriving from customer app
    const unsubNewOrders = subscribeToNewOrders((newOrder) => {
      setIncomingOrder(newOrder);
      if (isSoundEnabled) {
        playOrderAlertSound();
      }
      try {
        if ('vibrate' in navigator) {
          navigator.vibrate([300, 150, 300, 150, 400]);
        }
      } catch {}
    });

    // Check Push status
    NotificationService.getStatus().then(setPushStatus).catch(() => {});

    return () => {
      unsubStore();
      unsubNewOrders();
    };
  }, [isSoundEnabled]);

  const toggleSound = () => {
    const next = !isSoundEnabled;
    setIsSoundEnabled(next);
    localStorage.setItem('abhi_admin_sound_enabled', next ? 'true' : 'false');
    if (next) {
      playOrderAlertSound();
    }
  };

  const handleTestSound = () => {
    playOrderAlertSound();
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
    } catch {}
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      await StoreService.syncWithServerNow();
      refreshData();
      setSyncFeedback('Orders synced with server!');
      setTimeout(() => setSyncFeedback(null), 2500);
    } catch {
      setSyncFeedback('Sync failed. Please check network.');
    } finally {
      setIsSyncing(false);
    }
  };

  const customerAppUrl = typeof window !== 'undefined' ? `${window.location.origin}/` : '/';

  const handleCopyCustomerLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(customerAppUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleShareOnWhatsApp = () => {
    const text = `🛍️ *${settings.storeName} - Chhuikhadan*\n\nHumari new fashion collection online browse karein aur ghar baithe order karein:\n👉 ${customerAppUrl}\n\n✨ Shop Now • Pay Later with UPI Mandate EMI available!`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleEnablePush = async () => {
    const res = await NotificationService.subscribePush();
    const st = await NotificationService.getStatus();
    setPushStatus(st);
    if (res.success) {
      NotificationService.sendTestPush();
    }
  };

  return (
    <div id="admin-standalone-app" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Admin App Header */}
      <header className="sticky top-0 z-40 bg-[#070D1F] border-b border-amber-500/20 shadow-xl backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Brand & Badge */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 p-0.5 shadow-md">
              <div className="w-full h-full bg-[#070D1F] rounded-[10px] flex items-center justify-center">
                <Shield className="w-4 h-4 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black tracking-wide text-white uppercase">
                  {settings.storeName}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/40 uppercase">
                  STORE OWNER / ADMIN APP
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live Server Synced
                </span>
                <span>•</span>
                <span>{orders.length} Total Orders</span>
              </div>
            </div>
          </div>

          {/* Quick Action Controls */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Sync Button */}
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              title="Sync orders with server now"
              className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Sound Toggle */}
            <button
              onClick={toggleSound}
              title={isSoundEnabled ? 'Order Bell Sound ON' : 'Order Bell Sound MUTED'}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                isSoundEnabled
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20'
                  : 'bg-rose-500/10 border-rose-500/40 text-rose-300 hover:bg-rose-500/20'
              }`}
            >
              {isSoundEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Order Bell: ON</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                  <span>Sound Muted</span>
                </>
              )}
            </button>

            {/* Sound Test Button */}
            <button
              onClick={handleTestSound}
              title="Test Order Ringtone"
              className="px-2 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
            >
              <span>🔔 Test Chime</span>
            </button>

            {/* Share Customer Store Link */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopyCustomerLink}
                title="Copy Customer App Link to send on WhatsApp"
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden md:inline">{isCopied ? 'Link Copied!' : 'Copy Customer Link'}</span>
              </button>

              <button
                onClick={handleShareOnWhatsApp}
                title="Share Customer App Link on WhatsApp"
                className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Share on WA</span>
              </button>

              <button
                onClick={() => setIsPosterModalOpen(true)}
                title="App Download Barcode & Poster Generator"
                className="px-2.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              >
                <QrCode className="w-3.5 h-3.5 text-slate-950" />
                <span>Poster Barcode</span>
              </button>
            </div>

            {/* Switch to Customer App Button */}
            <button
              onClick={onSwitchToCustomerApp}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:brightness-110 text-slate-950 font-black text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-slate-950" />
              <span>Customer Store ↗</span>
            </button>
          </div>
        </div>

        {/* Sync Toast */}
        {syncFeedback && (
          <div className="bg-emerald-900/60 border-t border-emerald-500/40 text-emerald-200 text-xs py-1 text-center font-medium">
            {syncFeedback}
          </div>
        )}
      </header>

      {/* Push Notification Activation Banner (if not subscribed) */}
      {pushStatus && !pushStatus.isSubscribed && (
        <div className="bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-amber-600/15 border-b border-amber-500/30 px-4 py-2.5">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-amber-200 font-medium">
              <BellRing className="w-4 h-4 text-amber-400 animate-bounce shrink-0" />
              <span>
                <strong>Mobile Alert Recommendation:</strong> Is phone par push notification enable karein taaki app band hone par bhi naye order ka alert aaye.
              </span>
            </div>
            <button
              onClick={handleEnablePush}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-3 py-1 rounded-lg text-xs transition cursor-pointer shrink-0 shadow-xs"
            >
              🔔 Enable Order Push Notifications
            </button>
          </div>
        </div>
      )}

      {/* Standalone Admin Panel Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6">
        <GlobalErrorBoundary
          fallbackTitle="Admin Management Portal"
          fallbackMessage="Admin panel loading ya data processing me issue ko safely catch kiya gaya hai. Reload karke retry karein."
          onReset={refreshData}
        >
          <AdminPanel
            products={products}
            categories={categories}
            banners={banners}
            orders={orders}
            settings={settings}
            onSaveProduct={(p) => StoreService.saveProduct(p)}
            onDeleteProduct={(id) => StoreService.deleteProduct(id)}
            onSaveCategory={(c) => StoreService.saveCategory(c)}
            onDeleteCategory={(id) => StoreService.deleteCategory(id)}
            onUpdateOrderStatus={(orderId, status) => StoreService.updateOrderStatus(orderId, status)}
            onSaveBanner={(b) => StoreService.saveBanner(b)}
            onDeleteBanner={(id) => StoreService.deleteBanner(id)}
            onSaveSettings={(s) => StoreService.saveSettings(s)}
            onResetDatabase={() => StoreService.resetDatabase()}
            onCloseAdmin={onSwitchToCustomerApp}
          />
        </GlobalErrorBoundary>
      </div>

      {/* ========================================================================= */}
      {/* 🚨 REAL-TIME NEW INCOMING ORDER FLASH MODAL 🚨                            */}
      {/* ========================================================================= */}
      {incomingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#0F172A] border-2 border-amber-400 rounded-3xl p-5 sm:p-6 shadow-[0_0_50px_rgba(251,191,36,0.3)] animate-in zoom-in-95 duration-200">
            {/* Flashing Top Alert Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-rose-500 animate-ping" />
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 text-xs font-black uppercase tracking-wider">
                  🚨 NAYA ORDER AAYA!
                </span>
              </div>
              <button
                onClick={() => setIncomingOrder(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Order Highlight Box */}
            <div className="bg-gradient-to-br from-amber-500/10 to-rose-500/10 border border-amber-500/30 rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-semibold">Order Number</span>
                  <h3 className="text-xl font-black text-amber-400">#{incomingOrder.orderNumber}</h3>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 font-semibold">Total Amount</span>
                  <div className="text-2xl font-black text-emerald-400">₹{incomingOrder.totalAmount}</div>
                  <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700 uppercase">
                    {incomingOrder.paymentMethod} • {incomingOrder.paymentStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Customer Details */}
            <div className="space-y-2 mb-4 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 text-xs">
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Customer Name:</span>
                <span className="font-black text-white">{incomingOrder?.customer?.name || 'Customer'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Mobile Number:</span>
                <a
                  href={`tel:${incomingOrder?.customer?.mobile || ''}`}
                  className="font-bold text-amber-400 hover:underline flex items-center gap-1"
                >
                  <Phone className="w-3 h-3 text-emerald-400" />
                  +91 {incomingOrder?.customer?.mobile || 'No Mobile'}
                </a>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Delivery Address:</span>
                <span className="font-semibold text-slate-200 text-right max-w-[220px]">
                  {incomingOrder?.customer?.address || ''}, {incomingOrder?.customer?.city || 'Chhuikhadan'}
                </span>
              </div>

              {incomingOrder.razorpayPaymentId && (
                <div className="bg-cyan-950/50 border border-cyan-500/40 p-2.5 rounded-xl text-xs flex items-center justify-between text-cyan-200">
                  <span className="font-bold flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Razorpay Payment ID:</span>
                  </span>
                  <span className="font-mono text-white select-all text-xs">{incomingOrder.razorpayPaymentId}</span>
                </div>
              )}

              {incomingOrder.kistPeTransactionId && (
                <div className="bg-amber-950/50 border border-amber-500/40 p-2.5 rounded-xl text-xs flex items-center justify-between text-amber-200">
                  <span className="font-bold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Kist Pe Down Payment UTR:</span>
                  </span>
                  <span className="font-mono text-white select-all text-xs">{incomingOrder.kistPeTransactionId}</span>
                </div>
              )}

              {(incomingOrder.emiDetails || incomingOrder.customer.upiId) && (
                <div className="bg-amber-950/40 border border-amber-500/50 p-3 rounded-2xl text-amber-200 text-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      ⚡ Easy EMI Mandate Order (किस्त)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-black border border-amber-500/30">
                      {incomingOrder.emiDetails?.tenure || '3 Months'}
                    </span>
                  </div>

                  {/* Customer UPI Address Row */}
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-amber-500/40 flex items-center justify-between gap-2 shadow-inner">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-slate-400 block font-semibold">Customer UPI ID (Mandate VPA):</span>
                      <span className="font-mono font-black text-amber-300 text-sm truncate block select-all">
                        {incomingOrder.emiDetails?.mandateUpiId || incomingOrder?.customer?.upiId || 'Not specified'}
                      </span>
                    </div>

                    {(incomingOrder.emiDetails?.mandateUpiId || incomingOrder?.customer?.upiId) && (
                      <button
                        type="button"
                        onClick={() => {
                          const id = incomingOrder.emiDetails?.mandateUpiId || incomingOrder?.customer?.upiId || '';
                          navigator.clipboard.writeText(id);
                          setCopiedUpi(true);
                          setTimeout(() => setCopiedUpi(false), 2500);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-md ${
                          copiedUpi
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950'
                        }`}
                      >
                        {copiedUpi ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedUpi ? 'Copied!' : 'Copy UPI ID'}</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-300 pt-1 border-t border-amber-900/40">
                    <span>Monthly Installment:</span>
                    <span className="font-black text-white text-xs">
                      ₹{incomingOrder.emiDetails?.monthlyInstallment || Math.round(incomingOrder.totalAmount / 3)}/month
                    </span>
                  </div>

                  <p className="text-[11px] text-amber-200/90 leading-tight bg-slate-950/60 p-2 rounded-lg border border-amber-500/20">
                    👉 <strong>Next Step:</strong> Customer ka UPI ID copy karein aur apne UPI App (PhonePe / Google Pay / Paytm / Mandate portal) me paste karke ₹{incomingOrder.emiDetails?.monthlyInstallment || Math.round(incomingOrder.totalAmount / 3)}/mo ka mandate ya payment request send karein.
                  </p>
                </div>
              )}
            </div>

            {/* Items Ordered */}
            <div className="mb-4">
              <div className="text-xs font-bold uppercase text-slate-400 mb-2">Ordered Items:</div>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {incomingOrder.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                    <span className="font-bold text-slate-200 truncate max-w-[220px]">
                      {item.productName} ({item.selectedSize}) x{item.quantity}
                    </span>
                    <span className="font-black text-amber-300 shrink-0">₹{item.totalPrice}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <a
                href={`https://wa.me/91${incomingOrder.customer.mobile.replace(/\D/g, '')}?text=${encodeURIComponent(
                  `Namaste ${incomingOrder.customer.name}! Aapka order #${incomingOrder.orderNumber} (₹${incomingOrder.totalAmount}) ABHI FASHION Chhuikhadan mein receive ho gaya hai. Hum jaldi process kar rahe hain.`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp Customer</span>
              </a>

              <button
                onClick={() => {
                  StoreService.updateOrderStatus(incomingOrder.id, 'Confirmed');
                  setIncomingOrder(null);
                }}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Confirm Order</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Store Poster & Barcode Modal */}
      <PosterQrModal
        isOpen={isPosterModalOpen}
        onClose={() => setIsPosterModalOpen(false)}
        settings={settings}
        onSaveSettings={(updated) => setSettings(updated)}
      />
    </div>
  );
};
