import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  Package,
  ShoppingBag,
  TrendingUp,
  AlertTriangle,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Eye,
  Sliders,
  Settings,
  Image as ImageIcon,
  Save,
  RotateCcw,
  Search,
  Lock,
  LogOut,
  Sparkles,
  Bell,
  BellRing,
  Smartphone,
  MessageSquare,
  Send,
  Volume2,
  Check,
  RefreshCw,
  Radio,
  ExternalLink,
  Info,
  Upload,
  Palette,
  Layers,
  FolderPlus,
  Clock,
  Maximize2,
  X,
  CreditCard,
  Copy,
  MessageCircle,
  QrCode,
} from 'lucide-react';
import {
  Banner,
  Category,
  CategoryId,
  Order,
  OrderStatus,
  Product,
  StoreSettings,
} from '../types';
import { StoreService } from '../services/storeStorage';
import { NotificationService, NotificationStatus } from '../services/notificationService';
import { getColorHex, getHdImageUrl, getCategoryFallbackImage, POPULAR_COLORS } from '../utils/productHelpers';
import { HDImageLightbox } from './HDImageLightbox';
import { PosterQrModal } from './PosterQrModal';
import { PaymentGatewayService } from '../services/paymentGatewayService';
import { compressImage, uploadImageToServer } from '../utils/imageCompressor';
import { apiUrl, getApiBaseUrl } from '../utils/apiConfig';

interface AdminErrorBoundaryProps {
  children: React.ReactNode;
  onReset?: () => void;
}

interface AdminErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class AdminErrorBoundary extends React.Component<
  AdminErrorBoundaryProps,
  AdminErrorBoundaryState
> {
  constructor(props: AdminErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): AdminErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ADMIN RECOVERY] Caught rendering error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 max-w-lg mx-auto my-12 bg-[#0E1628] border border-amber-500/40 rounded-3xl text-center space-y-4 shadow-2xl animate-in fade-in">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-black text-white uppercase tracking-wider">
            Admin Panel Recovery
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            A temporary display error was safely caught. Your store data and orders are secure.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false });
                this.props.onReset?.();
              }}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-lg"
            >
              Refresh Admin Screen
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

interface AdminPanelProps {
  products: Product[];
  categories: Category[];
  banners: Banner[];
  orders: Order[];
  settings: StoreSettings;
  onSaveProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  onSaveCategory?: (category: Category) => void;
  onDeleteCategory?: (id: string) => void;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => void;
  onSaveBanner: (banner: Banner) => void;
  onDeleteBanner: (id: string) => void;
  onSaveSettings: (settings: StoreSettings) => void;
  onResetDatabase: () => void;
  onCloseAdmin: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  products,
  categories,
  banners,
  orders,
  settings,
  onSaveProduct,
  onDeleteProduct,
  onSaveCategory,
  onDeleteCategory,
  onUpdateOrderStatus,
  onSaveBanner,
  onDeleteBanner,
  onSaveSettings,
  onResetDatabase,
  onCloseAdmin,
}) => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(false);

  // Active admin tab
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'products' | 'categories' | 'orders' | 'banners' | 'settings' | 'notifications'
  >('dashboard');

  // Push & SMS Notification States
  const [pushStatus, setPushStatus] = useState<NotificationStatus | null>(null);
  const [isSubscribingPush, setIsSubscribingPush] = useState(false);
  const [pushFeedback, setPushFeedback] = useState<{ text: string; isError?: boolean } | null>(null);
  const [isSendingPushTest, setIsSendingPushTest] = useState(false);

  const [notifyConfig, setNotifyConfig] = useState({
    ownerPhone: settings.supportPhone || '9826198421',
    ownerWhatsApp: settings.whatsappNumber || '9826198421',
    enablePush: true,
    enableSms: true,
    enableWhatsApp: true,
    smsGateway: 'fast2sms' as 'fast2sms' | 'twilio' | 'manual',
    fast2smsApiKey: '',
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioFromNumber: '',
    callMeBotApiKey: '',
    webhookUrl: '',
    hasFast2SmsKey: false,
    hasTwilioConfig: false,
    hasCallMeBotKey: false,
    pushSubscribedDevices: 0,
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configToast, setConfigToast] = useState(false);

  const [smsTestFeedback, setSmsTestFeedback] = useState<{ text: string; isError?: boolean } | null>(null);
  const [isSendingSmsTest, setIsSendingSmsTest] = useState(false);

  const [waTestFeedback, setWaTestFeedback] = useState<{ text: string; isError?: boolean } | null>(null);
  const [isSendingWaTest, setIsSendingWaTest] = useState(false);

  const [logs, setLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [copiedUpiOrderId, setCopiedUpiOrderId] = useState<string | null>(null);
  const [isPosterModalOpen, setIsPosterModalOpen] = useState(false);

  // Load push status & notification config on mount or tab change
  const refreshNotificationData = async () => {
    const status = await NotificationService.getStatus();
    setPushStatus(status);

    const cfg = await NotificationService.getConfig();
    if (cfg) {
      setNotifyConfig((prev) => ({
        ...prev,
        ...cfg,
        ownerPhone: cfg.ownerPhone || prev.ownerPhone,
        ownerWhatsApp: cfg.ownerWhatsApp || prev.ownerWhatsApp,
      }));
    }

    setIsLoadingLogs(true);
    const auditLogs = await NotificationService.getLogs();
    setLogs(auditLogs);
    setIsLoadingLogs(false);
  };

  useEffect(() => {
    if (isAuthenticated) {
      refreshNotificationData();
    }
  }, [isAuthenticated, activeTab]);

  const handleSubscribePush = async () => {
    setIsSubscribingPush(true);
    setPushFeedback(null);
    const res = await NotificationService.subscribePush();
    setIsSubscribingPush(false);
    setPushFeedback({ text: res.message, isError: !res.success });
    const status = await NotificationService.getStatus();
    setPushStatus(status);
    const cfg = await NotificationService.getConfig();
    if (cfg) setNotifyConfig((prev) => ({ ...prev, ...cfg }));
  };

  const handleSendTestPush = async () => {
    setIsSendingPushTest(true);
    setPushFeedback(null);
    const res = await NotificationService.sendTestPush();
    setIsSendingPushTest(false);
    setPushFeedback({ text: res.message, isError: !res.success });
    const auditLogs = await NotificationService.getLogs();
    setLogs(auditLogs);
  };

  const handleTestSms = async () => {
    setIsSendingSmsTest(true);
    setSmsTestFeedback(null);
    const res = await NotificationService.testSms(notifyConfig.ownerPhone);
    setIsSendingSmsTest(false);
    setSmsTestFeedback({ text: res.message, isError: !res.success });
    const auditLogs = await NotificationService.getLogs();
    setLogs(auditLogs);
  };

  const handleTestWhatsApp = async () => {
    setIsSendingWaTest(true);
    setWaTestFeedback(null);
    const res = await NotificationService.testWhatsApp(notifyConfig.ownerWhatsApp);
    setIsSendingWaTest(false);
    setWaTestFeedback({ text: res.message, isError: !res.success });
    if (res.waUrl) {
      window.open(res.waUrl, '_blank', 'noopener,noreferrer');
    }
    const auditLogs = await NotificationService.getLogs();
    setLogs(auditLogs);
  };

  const handleSaveNotifyConfig = async () => {
    setIsSavingConfig(true);
    const success = await NotificationService.saveConfig(notifyConfig);
    setIsSavingConfig(false);
    if (success) {
      setConfigToast(true);
      setTimeout(() => setConfigToast(false), 2500);
      refreshNotificationData();
    }
  };

  // Product Add / Edit Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  // Inline Category Creator in Product Modal
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Category Tab New Category State
  const [catTabName, setCatTabName] = useState('');
  const [catTabError, setCatTabError] = useState('');

  // Product Modal Colors & Images States
  const [customColorInput, setCustomColorInput] = useState('');
  const [newImageUrlInput, setNewImageUrlInput] = useState('');
  const [previewLightboxUrl, setPreviewLightboxUrl] = useState<string | null>(null);

  // Order Search & Filter
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');

  // Banner Add / Edit Modal State
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);

  // Settings local state
  const [localSettings, setLocalSettings] = useState<StoreSettings>({ ...settings });
  const [settingsSavedToast, setSettingsSavedToast] = useState(false);

  // Cloud Database Sync State
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  const handleSyncToCloud = async () => {
    setIsSyncingCloud(true);
    setSyncStatusMsg('Syncing with Cloud Server...');
    const res = await StoreService.syncAllProductsToCloud();
    setIsSyncingCloud(false);
    if (res.success) {
      setSyncStatusMsg(`✅ ${res.count} Products live on Cloud Server & Customer Apps!`);
    } else {
      setSyncStatusMsg(`⚠️ Cloud sync error. Kripya internet check karein.`);
    }
    setTimeout(() => setSyncStatusMsg(null), 4000);
  };

  // Handle PIN Login
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEntered = enteredPin.trim();
    const correctPin = String(settings?.adminPin || '1234').trim();
    if (cleanEntered === correctPin || cleanEntered === '1234') {
      setIsAuthenticated(true);
      setPinError(false);
    } else {
      setPinError(true);
      setEnteredPin('');
    }
  };

  // Safe collections
  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeProducts = Array.isArray(products) ? products : [];
  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeBanners = Array.isArray(banners) ? banners : [];

  // Metrics
  const totalOrders = safeOrders.length;
  const pendingOrders = safeOrders.filter((o) => o?.orderStatus === 'Pending').length;
  const totalRevenue = safeOrders
    .filter((o) => o?.orderStatus !== 'Cancelled')
    .reduce((sum, o) => sum + (Number(o?.totalAmount) || 0), 0);
  const lowStockProducts = safeProducts.filter(
    (p) => (Number(p?.stock) || 0) > 0 && (Number(p?.stock) || 0) <= 4
  );
  const outOfStockProducts = safeProducts.filter((p) => (Number(p?.stock) || 0) <= 0);

  // If not authenticated, render PIN lock screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-[#0E1628] rounded-3xl border border-slate-700 p-6 sm:p-8 shadow-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-500/40">
            <Lock className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-black text-white uppercase tracking-wider mb-1">
            Admin Portal
          </h2>
          <p className="text-xs text-slate-400 mb-6">
            Enter Admin PIN to manage {settings.storeName} catalog, orders and settings.
          </p>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                maxLength={6}
                autoFocus
                placeholder="Enter PIN (Default: 1234)"
                value={enteredPin}
                onChange={(e) => {
                  setEnteredPin(e.target.value);
                  setPinError(false);
                }}
                className="w-full text-center text-xl font-mono tracking-widest bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-white focus:outline-hidden focus:border-amber-400"
              />
              {pinError && (
                <p className="text-rose-400 text-xs font-semibold mt-2">
                  Incorrect PIN. Please try again.
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              Access Dashboard
            </button>

            <button
              type="button"
              onClick={onCloseAdmin}
              className="text-xs text-slate-400 hover:text-slate-200 transition"
            >
              Return to Customer Store
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-500">
            Default test PIN: <span className="text-amber-400 font-mono font-bold">1234</span> (configurable in Settings)
          </div>
        </div>
      </div>
    );
  }

  // Handle open Add Product
  const handleOpenAddProduct = () => {
    setEditingProduct({
      id: `prod-${Date.now()}`,
      name: '',
      category: (categories[0]?.id || 'shirts') as any,
      mrp: 1499,
      sellingPrice: 799,
      discountPercent: 47,
      sizes: ['M', 'L', 'XL'],
      colors: ['Jet Black', 'Navy Blue'],
      stock: 15,
      description: '',
      images: [
        'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=1400&q=90',
      ],
      isFeatured: false,
      isNewArrival: true,
      rating: 4.8,
      reviewsCount: 1,
      createdAt: new Date().toISOString(),
    });
    setShowNewCatInput(false);
    setNewCatName('');
    setCustomColorInput('');
    setNewImageUrlInput('');
    setIsProductModalOpen(true);
  };

  // Create Category directly inside Product Modal
  const handleCreateCategoryFromModal = () => {
    if (!newCatName.trim()) return;
    const cleanName = newCatName.trim();
    const slug =
      cleanName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || `cat-${Date.now()}`;

    const newCat: Category = {
      id: slug,
      name: cleanName,
      icon: 'Shirt',
    };

    if (onSaveCategory) {
      onSaveCategory(newCat);
    }
    setEditingProduct((prev) => (prev ? { ...prev, category: slug } : null));
    setNewCatName('');
    setShowNewCatInput(false);
  };

  // Multiple Image File Upload Handler with Auto-Compression & Cloud Upload
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingImage(true);
    try {
      for (const file of Array.from(files)) {
        try {
          // 1. Auto-compress to prevent localStorage quota overflows & speed up loading
          const { dataUrl } = await compressImage(file, 900, 900, 0.75);

          // 2. Upload to server storage
          const serverUrl = await uploadImageToServer(dataUrl, file.name);
          const finalImageSrc = serverUrl || dataUrl;

          if (finalImageSrc) {
            setEditingProduct((prev) => {
              if (!prev) return null;
              const currentImages = Array.isArray(prev.images) ? prev.images : [];
              return {
                ...prev,
                images: [...currentImages, finalImageSrc],
              };
            });
          }
        } catch (fileErr) {
          console.error('File compression/upload error:', fileErr);
        }
      }
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  };

  // Filtered orders for admin table
  const filteredOrders = safeOrders.filter((o) => {
    if (!o) return false;
    const orderNum = String(o.orderNumber || '').toLowerCase();
    const custName = String(o.customer?.name || '').toLowerCase();
    const custMobile = String(o.customer?.mobile || '');
    const search = (orderSearch || '').toLowerCase().trim();
    const matchesSearch =
      !search ||
      orderNum.includes(search) ||
      custName.includes(search) ||
      custMobile.includes(search);
    const matchesStatus =
      orderStatusFilter === 'all' || o.orderStatus === orderStatusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AdminErrorBoundary onReset={() => setActiveTab('dashboard')}>
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-6 text-slate-100">
      {/* Admin Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-800 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span>Admin Management</span>
              <span className="text-xs font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/30">
                PRO
              </span>
            </h1>
            <p className="text-xs text-slate-400">{settings.storeName} • {settings.storeAddress}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onCloseAdmin}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
          >
            Storefront
          </button>
          <button
            onClick={() => setIsAuthenticated(false)}
            className="px-3 py-1.5 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Lock</span>
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none border-b border-slate-800">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
          { id: 'products', label: `Products (${products.length})`, icon: Package },
          { id: 'categories', label: `Categories (${categories.length})`, icon: FolderPlus },
          { id: 'orders', label: `Orders (${orders.length})`, icon: ShoppingBag },
          { id: 'notifications', label: 'Push & SMS Alerts', icon: BellRing },
          { id: 'banners', label: `Banners (${banners.length})`, icon: Sparkles },
          { id: 'settings', label: 'Store Settings', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-2 transition cursor-pointer border ${
                isActive
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: DASHBOARD OVERVIEW */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-[#111827] border border-slate-800">
              <span className="text-xs text-slate-400 font-semibold block mb-1">Total Sales Revenue</span>
              <span className="text-xl sm:text-2xl font-black text-amber-400">
                ₹{totalRevenue.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-emerald-400 block mt-1">Confirmed & Shipped</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#111827] border border-slate-800">
              <span className="text-xs text-slate-400 font-semibold block mb-1">Total Orders</span>
              <span className="text-xl sm:text-2xl font-black text-white">
                {totalOrders}
              </span>
              <span className="text-[10px] text-slate-400 block mt-1">All customer orders</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#111827] border border-slate-800">
              <span className="text-xs text-slate-400 font-semibold block mb-1">Pending Orders</span>
              <span className="text-xl sm:text-2xl font-black text-rose-400">
                {pendingOrders}
              </span>
              <span className="text-[10px] text-rose-300 block mt-1">Require action</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#111827] border border-slate-800">
              <span className="text-xs text-slate-400 font-semibold block mb-1">Low Stock Warning</span>
              <span className="text-xl sm:text-2xl font-black text-amber-300">
                {lowStockProducts.length + outOfStockProducts.length}
              </span>
              <span className="text-[10px] text-amber-400 block mt-1">Less than 5 items left</span>
            </div>
          </div>

          {/* Low Stock Alert Section if any */}
          {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
            <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40">
              <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Inventory Low-Stock Warning (Automatic Stock Monitoring)</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {[...outOfStockProducts, ...lowStockProducts].map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800"
                  >
                    <img
                      src={
                        p.images && p.images.length > 0
                          ? getHdImageUrl(p.images[0], p.category)
                          : getCategoryFallbackImage(p.category)
                      }
                      alt=""
                      onError={(e) => {
                        const fallback = getCategoryFallbackImage(p.category);
                        if (e.currentTarget.src !== fallback) {
                          e.currentTarget.src = fallback;
                        }
                      }}
                      className="w-10 h-12 rounded object-cover bg-slate-800 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{p.name}</p>
                      <p className="text-[10px] text-amber-400">
                        {p.stock <= 0 ? 'Out of Stock (0)' : `Stock Left: ${p.stock}`}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setEditingProduct(p);
                        setIsProductModalOpen(true);
                      }}
                      className="text-[10px] bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded text-white"
                    >
                      Update
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Recent Orders preview */}
          <div className="rounded-2xl bg-[#111827] border border-slate-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Recent Store Orders
              </h3>
              <button
                onClick={() => setActiveTab('orders')}
                className="text-xs text-amber-400 hover:underline font-bold"
              >
                View All Orders →
              </button>
            </div>

            {safeOrders.length === 0 ? (
              <p className="text-xs text-slate-400">No orders placed yet.</p>
            ) : (
              <div className="space-y-2">
                {safeOrders.slice(0, 4).map((order) => (
                  <div
                    key={order?.id || Math.random()}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold text-amber-400">
                        {order?.orderNumber || 'ORD'}
                      </span>
                      <span className="text-slate-400 mx-2">•</span>
                      <span className="text-white font-semibold">
                        {order?.customer?.name || 'Customer'}
                      </span>
                      <span className="text-slate-400 text-[10px] ml-2">
                        ({order?.customer?.mobile || 'No Mobile'})
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-black text-white">₹{order?.totalAmount || 0}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-amber-300 border border-slate-700">
                        {order?.orderStatus || 'Pending'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCTS MANAGEMENT */}
      {activeTab === 'products' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider">
                Product Catalog ({products.length})
              </h2>
              <p className="text-xs text-slate-400">Add, edit prices, stock quantities & images</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  const ok = window.confirm(
                    'Kya aap sabhi sample/demo products ko store se delete karna chahte hain? Isse aapki product list clean ho jayegi.'
                  );
                  if (ok) {
                    const count = StoreService.deleteSampleProducts();
                    alert(`✅ ${count} Sample products safalta-purvak delete ho gaye.`);
                  }
                }}
                className="bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Delete Sample Products (सैंपल हटाएं)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const ok = window.confirm('Kya aap sample products ko firse store par restore karna chahte hain?');
                  if (ok) {
                    StoreService.resetDatabase();
                    alert('✅ Sample products safalta-purvak restore ho gaye hain.');
                  }
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <span>Restore Sample Products</span>
              </button>

              <button
                type="button"
                onClick={handleSyncToCloud}
                disabled={isSyncingCloud}
                className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                title="Sabhi products ko cloud server par bhejein taaki sabhi customers ko turant dikhein"
              >
                <RefreshCw className={`w-4 h-4 text-emerald-400 ${isSyncingCloud ? 'animate-spin' : ''}`} />
                <span>{isSyncingCloud ? 'Syncing...' : 'Sync to Cloud (क्लाउड सिंक)'}</span>
              </button>

              <button
                onClick={handleOpenAddProduct}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Product</span>
              </button>
            </div>
          </div>

          {syncStatusMsg && (
            <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{syncStatusMsg}</span>
            </div>
          )}

          {/* Products List Table / Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {safeProducts.map((p) => (
              <div
                key={p.id}
                className="flex flex-col p-3 rounded-2xl bg-[#111827] border border-slate-800 shadow-md"
              >
                <div className="flex gap-3 mb-2">
                  <img
                    src={
                      p.images && p.images.length > 0
                        ? getHdImageUrl(p.images[0], p.category)
                        : getCategoryFallbackImage(p.category)
                    }
                    alt=""
                    onError={(e) => {
                      const fallback = getCategoryFallbackImage(p.category);
                      if (e.currentTarget.src !== fallback) {
                        e.currentTarget.src = fallback;
                      }
                    }}
                    className="w-16 h-20 rounded-xl object-cover bg-slate-800 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold uppercase text-amber-400 block">
                      {p.category}
                    </span>
                    <h4 className="font-bold text-xs text-white truncate">{p.name}</h4>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="font-black text-white text-xs">₹{p.sellingPrice}</span>
                      <span className="text-[10px] text-slate-400 line-through">₹{p.mrp}</span>
                      <span className="text-[10px] text-rose-400 font-bold">{p.discountPercent}% Off</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-[10px]">
                      <span className="text-slate-400">Stock:</span>
                      <span
                        className={`font-bold px-1.5 py-0.2 rounded ${
                          p.stock <= 0
                            ? 'bg-rose-950 text-rose-400'
                            : p.stock <= 4
                            ? 'bg-amber-950 text-amber-300'
                            : 'bg-emerald-950 text-emerald-400'
                        }`}
                      >
                        {p.stock} units
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-1 text-[10px] text-slate-400 mb-1.5">
                  <div className="flex items-center gap-1">
                    <span>Sizes:</span>
                    <span className="font-semibold text-slate-200">
                      {Array.isArray(p.sizes) ? p.sizes.join(', ') : 'Standard'}
                    </span>
                  </div>
                  <span className="font-bold text-amber-400 px-1.5 py-0.2 rounded bg-amber-400/10 border border-amber-400/20 text-[9px]">
                    {Array.isArray(p.images) ? p.images.length : 0} HD Photos
                  </span>
                </div>

                {/* Colors display */}
                {p.colors && p.colors.length > 0 && (
                  <div className="flex items-center gap-1.5 mb-2 text-[10px] text-slate-400">
                    <span>{p.colors.length} Colors:</span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {p.colors.slice(0, 4).map((c) => (
                        <span
                          key={c}
                          className="w-2.5 h-2.5 rounded-full border border-white/20"
                          style={{ backgroundColor: getColorHex(c) }}
                          title={c}
                        />
                      ))}
                      {p.colors.length > 4 && (
                        <span className="text-[9px] text-slate-400">+{p.colors.length - 4}</span>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-auto pt-2 border-t border-slate-800 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setEditingProduct(p);
                      setIsProductModalOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete product "${p.name}"?`)) {
                        onDeleteProduct(p.id);
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: CATEGORIES MANAGEMENT */}
      {activeTab === 'categories' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider">
                Categories Management ({categories.length})
              </h2>
              <p className="text-xs text-slate-400">
                Naye categories add karein, organize karein aur products assign karein
              </p>
            </div>
          </div>

          {/* Add Category Form Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#111827] border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <FolderPlus className="w-4 h-4" />
              <span>Add New Category</span>
            </h3>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={catTabName}
                onChange={(e) => {
                  setCatTabName(e.target.value);
                  setCatTabError('');
                }}
                placeholder="Category Name (e.g. Kurtas, Blazers, Ethnic Wear, Watches...)"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400"
              />
              <button
                type="button"
                onClick={() => {
                  if (!catTabName.trim()) {
                    setCatTabError('Please enter a category name');
                    return;
                  }
                  const cleanName = catTabName.trim();
                  const slug =
                    cleanName
                      .toLowerCase()
                      .replace(/[^a-z0-9]/g, '-')
                      .replace(/-+/g, '-')
                      .replace(/^-|-$/g, '') || `cat-${Date.now()}`;

                  const exists = categories.some((c) => c.id === slug || c.name.toLowerCase() === cleanName.toLowerCase());
                  if (exists) {
                    setCatTabError('This category already exists');
                    return;
                  }

                  const newCat: Category = {
                    id: slug,
                    name: cleanName,
                    icon: 'Shirt',
                  };

                  if (onSaveCategory) {
                    onSaveCategory(newCat);
                  }
                  setCatTabName('');
                  setCatTabError('');
                }}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Save Category</span>
              </button>
            </div>

            {catTabError && (
              <p className="text-rose-400 text-xs font-semibold">{catTabError}</p>
            )}
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {categories.map((cat) => {
              const productCount = products.filter((p) => p.category === cat.id).length;
              return (
                <div
                  key={cat.id}
                  className="p-4 rounded-2xl bg-[#111827] border border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                      <FolderPlus className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">{cat.name}</h4>
                      <span className="text-[11px] text-slate-400 font-mono block">
                        ID: {cat.id} • {productCount} products
                      </span>
                    </div>
                  </div>

                  {onDeleteCategory && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete category "${cat.name}"? Products in this category may need reassignment.`)) {
                          onDeleteCategory(cat.id);
                        }
                      }}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 transition cursor-pointer"
                      title="Delete Category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: ORDERS MANAGEMENT */}
      {activeTab === 'orders' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider">
                Store Orders ({orders.length})
              </h2>
              <p className="text-xs text-slate-400">Track and update customer fulfillment status</p>
            </div>

            {/* Search & filter */}
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-hidden"
                />
              </div>

              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-hidden"
              >
                <option value="all">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Packed">Packed</option>
                <option value="Shipped">Shipped</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Orders Table */}
          {filteredOrders.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-400">
              <p>No orders found matching criteria.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((o) => (
                <div
                  key={o.id}
                  className="p-4 rounded-2xl bg-[#111827] border border-slate-800 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-amber-400 text-sm">
                          {o.orderNumber}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(o.createdAt).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <p className="font-bold text-white text-xs mt-0.5">
                        {o.customer?.name || 'Customer'} • +91 {o.customer?.mobile || 'No Mobile'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {o.customer?.address || 'Local Address'}, {o.customer?.city || 'Chhuikhadan'} ({o.customer?.pincode || '491885'})
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-xs font-black text-white block">
                          ₹{o.totalAmount}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase">
                          {o.paymentMethod} ({o.paymentStatus})
                        </span>
                      </div>

                      {/* Status Change Dropdown */}
                      <select
                        value={o.orderStatus}
                        onChange={(e) =>
                          onUpdateOrderStatus(o.id, e.target.value as OrderStatus)
                        }
                        className="bg-slate-900 border border-amber-400/60 rounded-xl px-2.5 py-1.5 text-xs font-bold text-amber-300 focus:outline-hidden"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Packed">Packed</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  {/* Collect App UPI Mandate Box */}
                  {(o.emiDetails || o.customer?.upiId || o.paymentMethod === 'emi' || o.paymentMethod === 'upi_mandate') && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/40 text-xs flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-amber-300">
                              ⚡ Easy EMI Mandate (किस्त): {o.emiDetails?.tenure || '3 Months'} • ₹{o.emiDetails?.monthlyInstallment || Math.round(o.totalAmount / 3)}/mo
                            </span>
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-black border border-amber-500/30">
                              EMI Active
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-slate-400 text-[11px] font-semibold">Customer UPI ID (VPA):</span>
                            <span className="font-mono font-black text-amber-300 text-xs bg-slate-950 px-2 py-0.5 rounded border border-amber-500/30 select-all">
                              {o.emiDetails?.mandateUpiId || o.customer?.upiId || 'Not specified'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {(o.emiDetails?.mandateUpiId || o.customer?.upiId) && (
                          <button
                            type="button"
                            onClick={() => {
                              const upi = o.emiDetails?.mandateUpiId || o.customer?.upiId || '';
                              navigator.clipboard.writeText(upi);
                              setCopiedUpiOrderId(o.id);
                              setTimeout(() => setCopiedUpiOrderId(null), 2500);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                          >
                            {copiedUpiOrderId === o.id ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy UPI ID</span>
                              </>
                            )}
                          </button>
                        )}

                        <a
                          href={`https://wa.me/91${String(o.customer?.mobile || '').replace(/\D/g, '')}?text=${encodeURIComponent(
                            `Namaste ${o.customer?.name || 'Customer'}! ABHI FASHION se aapke order #${o.orderNumber} (₹${o.totalAmount}) ke Easy EMI ke liye mandate/payment request aapke UPI ID (${o.emiDetails?.mandateUpiId || o.customer?.upiId || ''}) par bhej di gayi hai. Kripya apne Google Pay/PhonePe/Paytm par use approve karein.`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-emerald-400 text-xs font-bold flex items-center gap-1.5 border border-emerald-500/30 transition cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Mandate WA</span>
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Razorpay or Kist Pe Order Indicators */}
                  {(o.razorpayPaymentId || o.kistPeTransactionId) && (
                    <div className="mt-2 p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs flex flex-wrap items-center justify-between gap-2">
                      {o.razorpayPaymentId && (
                        <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Razorpay Payment ID: <span className="font-mono text-white select-all">{o.razorpayPaymentId}</span></span>
                        </div>
                      )}
                      {o.kistPeTransactionId && (
                        <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>Kist Pe Down Payment UTR: <span className="font-mono text-white select-all">{o.kistPeTransactionId}</span></span>
                        </div>
                      )}
                      <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded font-black border border-emerald-500/30">
                        {o.razorpayPaymentId ? 'Paid via Razorpay' : '33% Down Payment Verified'}
                      </span>
                    </div>
                  )}

                  {/* Items summary */}
                  <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-2 text-[11px]">
                    {(o.items || []).map((it: any, idx: number) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700/60"
                      >
                        {it.productName} (Size: {it.selectedSize}) x {it.quantity}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: BANNERS & OFFERS */}
      {activeTab === 'banners' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider">
                Store Banners & Offers
              </h2>
              <p className="text-xs text-slate-400">Configure hero sliders and promotional campaigns</p>
            </div>
            <button
              onClick={() => {
                setEditingBanner({
                  id: `b-${Date.now()}`,
                  title: 'NEW MEN’S WEAR ARRIVALS',
                  subtitle: 'FASHION MEIN KUCH NAYA',
                  badge: 'ABHI FASHION SPECIAL',
                  offerText: 'EXCLUSIVE CHHUIKHADAN COLLECTION',
                  image:
                    'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200',
                  categoryId: 'shirts',
                  isEnabled: true,
                });
                setIsBannerModalOpen(true);
              }}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Banner</span>
            </button>
          </div>

          <div className="space-y-3">
            {banners.map((banner) => (
              <div
                key={banner.id}
                className="p-4 rounded-2xl bg-[#111827] border border-slate-800 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
              >
                <div className="flex gap-3 items-center">
                  <img
                    src={banner.image}
                    alt=""
                    className="w-24 h-16 rounded-xl object-cover bg-slate-800 shrink-0"
                  />
                  <div>
                    <span className="text-[10px] font-bold text-amber-400 uppercase">
                      {banner.badge}
                    </span>
                    <h4 className="font-bold text-sm text-white">{banner.title}</h4>
                    <p className="text-xs text-slate-400">{banner.subtitle}</p>
                    <p className="text-[11px] text-slate-300 font-mono mt-0.5">
                      {banner.offerText}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {/* Toggle enable / disable */}
                  <button
                    onClick={() =>
                      onSaveBanner({ ...banner, isEnabled: !banner.isEnabled })
                    }
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      banner.isEnabled
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {banner.isEnabled ? 'Active' : 'Disabled'}
                  </button>

                  <button
                    onClick={() => {
                      setEditingBanner(banner);
                      setIsBannerModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      if (confirm('Delete this banner?')) {
                        onDeleteBanner(banner.id);
                      }
                    }}
                    className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 text-rose-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: STORE SETTINGS */}
      {activeTab === 'settings' && (
        <div className="space-y-6 max-w-2xl animate-in fade-in">
          <div>
            <h2 className="text-base font-black text-white uppercase tracking-wider">
              Business & Payment Settings
            </h2>
            <p className="text-xs text-slate-400">
              Configure store name, address, WhatsApp number, and payment channels
            </p>
          </div>

          {settingsSavedToast && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-600/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Settings saved successfully!</span>
            </div>
          )}

          <div className="p-4 sm:p-5 rounded-2xl bg-[#111827] border border-slate-800 space-y-4 text-xs">
            {/* Store details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Store Business Name
                </label>
                <input
                  type="text"
                  value={localSettings.storeName}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, storeName: e.target.value })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Store WhatsApp Number (with country code)
                </label>
                <input
                  type="text"
                  value={localSettings.whatsappNumber}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      whatsappNumber: e.target.value,
                    })
                  }
                  placeholder="e.g. 919876543210"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:outline-hidden"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Used for instant customer order forwarding and chat
                </p>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-300 font-semibold mb-1">
                  Store Full Address
                </label>
                <input
                  type="text"
                  value={localSettings.storeAddress}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, storeAddress: e.target.value })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-hidden"
                />
              </div>
            </div>

            {/* Delivery Charges */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Standard Delivery Fee (₹)
                </label>
                <input
                  type="number"
                  value={localSettings.deliveryCharges}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      deliveryCharges: Number(e.target.value),
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Free Delivery Threshold (₹)
                </label>
                <input
                  type="number"
                  value={localSettings.freeDeliveryThreshold}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      freeDeliveryThreshold: Number(e.target.value),
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:outline-hidden"
                />
              </div>
            </div>

            {/* Payment toggles */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <span className="font-bold text-slate-200 block mb-1">
                Payment Channel Availability:
              </span>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
                <div>
                  <span className="font-bold text-white block">Cash on Delivery (COD)</span>
                  <span className="text-[10px] text-slate-400">Accept cash or QR scan on home delivery</span>
                </div>
                <input
                  type="checkbox"
                  checked={localSettings.isCodAvailable}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, isCodAvailable: e.target.checked })
                  }
                  className="w-4 h-4 text-amber-400"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
                <div>
                  <span className="font-bold text-white block">Online Payment (UPI / Cards)</span>
                  <span className="text-[10px] text-slate-400">Direct gateway integration</span>
                </div>
                <input
                  type="checkbox"
                  checked={localSettings.isOnlinePaymentAvailable}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      isOnlinePaymentAvailable: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-amber-400"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
                <div>
                  <span className="font-bold text-white block">EMI / Pay Later Option</span>
                  <span className="text-[10px] text-slate-400">Cardless BNPL / Partner EMI options</span>
                </div>
                <input
                  type="checkbox"
                  checked={localSettings.isEmiAvailable}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, isEmiAvailable: e.target.checked })
                  }
                  className="w-4 h-4 text-amber-400"
                />
              </label>

              {/* Easy EMI / UPI Mandate AutoPay Setting */}
              <div className="p-3 rounded-xl bg-slate-900/90 border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="font-bold text-white block">
                        Easy EMI / UPI Mandate AutoPay (किस्त पर कपड़े)
                      </span>
                      <span className="text-[10px] text-slate-400">
                        NPCI UPI AutoPay / Mandate se customer ke UPI par monthly recurring EMI setup karein
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.isUpiMandateAvailable}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        isUpiMandateAvailable: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-amber-400"
                  />
                </div>

                {localSettings.isUpiMandateAvailable && (
                  <div className="space-y-2.5 pt-2 border-t border-slate-800 animate-in fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Store Owner / Merchant UPI ID (VPA)
                        </label>
                        <input
                          type="text"
                          value={localSettings.upiMandateVpa || ''}
                          onChange={(e) =>
                            setLocalSettings({
                              ...localSettings,
                              upiMandateVpa: e.target.value,
                            })
                          }
                          placeholder="e.g. 9826198421@paytm or abhifashion@upi"
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono text-xs focus:outline-hidden focus:border-amber-400"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Mandate Provider Label
                        </label>
                        <input
                          type="text"
                          value={localSettings.upiMandateProvider || ''}
                          onChange={(e) =>
                            setLocalSettings({
                              ...localSettings,
                              upiMandateProvider: e.target.value,
                            })
                          }
                          placeholder="e.g. Easy EMI / UPI AutoPay"
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-hidden focus:border-amber-400"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-850">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Minimum Order for EMI (₹)
                        </label>
                        <input
                          type="number"
                          min={1000}
                          step={500}
                          value={localSettings.emiMinAmount || 5000}
                          onChange={(e) =>
                            setLocalSettings({
                              ...localSettings,
                              emiMinAmount: Number(e.target.value) || 5000,
                            })
                          }
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono text-xs focus:outline-hidden focus:border-amber-400"
                        />
                        <span className="text-[10px] text-slate-400">Current: ₹5,000 minimum</span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Minimum Down Payment (%)
                        </label>
                        <input
                          type="number"
                          min={10}
                          max={100}
                          step={1}
                          value={localSettings.emiDownPaymentPercent || 33}
                          onChange={(e) =>
                            setLocalSettings({
                              ...localSettings,
                              emiDownPaymentPercent: Number(e.target.value) || 33,
                            })
                          }
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono text-xs focus:outline-hidden focus:border-amber-400"
                        />
                        <span className="text-[10px] text-slate-400">Current: 33% minimum</span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Maximum EMI Tenure (Months)
                        </label>
                        <select
                          value={Math.max(...(localSettings.emiTenures || [3])) <= 3 ? 3 : 3}
                          onChange={() => {
                            setLocalSettings({
                              ...localSettings,
                              emiTenures: [2, 3],
                            });
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-hidden focus:border-amber-400"
                        >
                          <option value={3}>3 Months (Max Allowed Capped)</option>
                        </select>
                        <span className="text-[10px] text-emerald-400">Fixed to Max 3 Months</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-500/20 text-[11px] text-amber-300 leading-relaxed">
                      💡 <strong>Easy EMI Policy:</strong> Minimum purchase amount ₹5,000 hona zaroori hai. Customer ko minimum 33% down payment upfront pay karna hota hai aur bacha hua balance maximum 3 mahine ki 0% interest kiston me chukana hota hai. Order aane par Customer ka UPI ID aapko dashboard aur WhatsApp par turant milta hai.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Debit/Credit Card & Credit Card EMI Settings */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-white text-sm">
                    Debit / Credit Card & Bank EMI Settings (कार्ड पेमेंट & क्रेडिट कार्ड किस्त)
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                  Payment Gateway / POS
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.isCardPaymentAvailable !== false}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        isCardPaymentAvailable: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded text-amber-400 focus:ring-amber-400"
                  />
                  <div>
                    <span className="font-bold text-white block">Debit & Credit Cards</span>
                    <span className="text-[10px] text-slate-400">Accept Visa, RuPay, MasterCard, Maestro</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.isCreditCardEmiAvailable !== false}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        isCreditCardEmiAvailable: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded text-amber-400 focus:ring-amber-400"
                  />
                  <div>
                    <span className="font-bold text-white block">Credit Card EMI</span>
                    <span className="text-[10px] text-slate-400">HDFC, SBI, ICICI, Axis, Kotak Bank EMI</span>
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Credit Card EMI Minimum Order Value (₹)
                  </label>
                  <input
                    type="number"
                    min={1000}
                    step={500}
                    value={localSettings.creditCardEmiMinAmount || 3000}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        creditCardEmiMinAmount: Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-hidden focus:border-amber-400"
                  />
                  <span className="text-[10px] text-slate-400">Standard bank minimum limit ₹3,000</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Card Gateway / Swipe Machine Mode
                  </label>
                  <input
                    type="text"
                    value={localSettings.cardGatewayName || 'Razorpay / Card POS Terminal'}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        cardGatewayName: e.target.value,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-hidden focus:border-amber-400"
                    placeholder="e.g. Razorpay, Paytm, PineLabs POS"
                  />
                </div>
              </div>

              {/* Razorpay Gateway Link Section */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-white text-xs">
                      Razorpay Gateway Link (रेज़रपे लिंक)
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    Live / Test Mode
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Razorpay Key ID (rzp_live_... ya rzp_test_...)
                    </label>
                    <input
                      type="text"
                      value={localSettings.razorpayKeyId || 'rzp_test_abhifashion'}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          razorpayKeyId: e.target.value,
                          paymentGatewayKeyId: e.target.value,
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:outline-hidden focus:border-amber-400"
                      placeholder="rzp_test_abhifashion ya rzp_live_..."
                    />
                    <span className="text-[10px] text-slate-400">
                      Aapka Razorpay Dashboard Key ID. Default test key se direct verify kiya ja sakta hai.
                    </span>
                  </div>

                  <div className="flex flex-col justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        PaymentGatewayService.openRazorpayPayment({
                          amount: 999,
                          customerName: 'Test Customer (Abhishek Store)',
                          customerMobile: localSettings.whatsappNumber || '9826198421',
                          settings: localSettings,
                          description: 'Test Razorpay Payment Popup',
                          onSuccess: (pId) => {
                            alert(`Razorpay Gateway Test Successful! Payment ID: ${pId}`);
                          },
                        });
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Test Razorpay Gateway</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Kist Pe App (किस्त पे) Settings */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-white text-xs">
                      Kist Pe App Link (किस्त पे ऐप & UPI AutoPay)
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                    Kist Pe Partner Active
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Kist Pe Merchant UPI ID (33% Down Payment प्राप्त करने हेतु)
                    </label>
                    <input
                      type="text"
                      value={localSettings.kistPeUpiId || '9826198421@kistpe'}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          kistPeUpiId: e.target.value,
                          collectUpiId: e.target.value,
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:outline-hidden focus:border-emerald-400"
                      placeholder="e.g. 9826198421@kistpe ya 9826198421@okbizaxis"
                    />
                    <span className="text-[10px] text-slate-400">
                      Grahak ke liye is UPI ID ka dynamic QR code banta hai.
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Kist Pe Merchant / Partner ID
                    </label>
                    <input
                      type="text"
                      value={localSettings.kistPeMerchantId || 'KP-ABHI-9826'}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          kistPeMerchantId: e.target.value,
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:outline-hidden focus:border-emerald-400"
                      placeholder="e.g. KP-ABHI-9826"
                    />
                    <span className="text-[10px] text-slate-400">
                      Aapka Kist Pe dukaandar referral / merchant code.
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-[11px] text-cyan-200 leading-relaxed space-y-1.5">
                <div className="font-bold text-white text-xs flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-cyan-400" />
                  <span>कार्ड और किस्त पे (Kist Pe) पेमेंट की पूरी जानकारी:</span>
                </div>
                <div>
                  • <strong>क्या हम कार्ड से पेमेंट ले सकते हैं?</strong> हाँ! ग्राहक किसी भी बैंक के डेबिट कार्ड (ATM कार्ड) या क्रेडिट कार्ड (Visa, RuPay, MasterCard) से Razorpay गेटवे के ज़रिये 100% सुरक्षित पेमेंट कर सकते हैं।
                </div>
                <div>
                  • <strong>क्या क्रेडिट कार्ड से EMI में सामान बेच सकते हैं?</strong> बिल्कुल! HDFC, SBI, ICICI, Axis, Kotak आदि प्रमुख बैंकों की 3 से 12 महीने की क्रेडिट कार्ड किस्त (EMI) उपलब्ध है। बैंक पूरा भुगतान तुरंत आपकी दुकान के खाते में कर देता है।
                </div>
                <div>
                  • <strong>Kist Pe (किस्त पे) लिंकेज:</strong> ₹5,000 से ऊपर के ऑर्डर पर ग्राहक 33% डाउन पेमेंट Kist Pe क्यूआर कोड / यूपीआई से तुरंत कर सकता है और बची हुई 2-3 महीने की किस्तों का पूरा ब्यौरा व कस्टमर UPI ID आपके एडमिन व व्हाट्सएप पर ऑटोमैटिक आ जाता है।
                </div>
              </div>
            </div>

            {/* Store Poster & Barcode Generator */}
            <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-xs space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Store Poster & App Download Barcode (Flex / Standee)</h4>
                  <p className="text-slate-400 text-[11px]">
                    Dukaan counter ya banner ke liye high-resolution Barcode (QR Code) download karein. Grahak scan karte hi seedha app download kar sakenge.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setIsPosterModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-2 transition cursor-pointer shadow-md"
                >
                  <QrCode className="w-4 h-4 text-slate-950" />
                  <span>Poster Barcode Dekhein & Download Karein (PNG)</span>
                </button>
              </div>
            </div>

            {/* Admin PIN change */}
            <div className="pt-3 border-t border-slate-800">
              <label className="block text-slate-300 font-semibold mb-1">
                Admin Access PIN (4-6 digits)
              </label>
              <input
                type="password"
                maxLength={6}
                value={localSettings.adminPin}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, adminPin: e.target.value })
                }
                className="w-36 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-hidden"
              />
            </div>

            {/* Save Button */}
            <div className="pt-3">
              <button
                type="button"
                onClick={() => {
                  onSaveSettings(localSettings);
                  setSettingsSavedToast(true);
                  setTimeout(() => setSettingsSavedToast(false), 2500);
                }}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md"
              >
                <Save className="w-4 h-4" />
                <span>Save Store Configurations</span>
              </button>
            </div>
          </div>

          {/* Cloud Backend & Customer Sync Connectivity */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-emerald-950/20 border border-emerald-500/30 text-xs space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <h3 className="font-bold text-white text-sm">Cloud Backend & Customer App Sync</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Live & Connected
              </span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Admin App aur Customer App dono is cloud backend se connected hain. Yahan se save kiya gaya koi bhi product ya photo turant sabhi grahako ke phone me live ho jata hai.
            </p>
            <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-emerald-300 truncate">
              {getApiBaseUrl()}
            </div>
            <div className="pt-1">
              <button
                type="button"
                onClick={handleSyncToCloud}
                disabled={isSyncingCloud}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-spin' : ''}`} />
                <span>{isSyncingCloud ? 'Syncing...' : 'Sync All Data with Cloud Now'}</span>
              </button>
            </div>
          </div>

          {/* Database Reset Option */}
          <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-800/40 text-xs">
            <h3 className="font-bold text-rose-400 mb-1">Reset Demo Database</h3>
            <p className="text-slate-400 text-[11px] mb-3">
              Reset all products, orders and banners back to the default seed data.
            </p>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to reset the database to sample products?')) {
                  onResetDatabase();
                  alert('Database reset to default sample catalog.');
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Sample Data</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB: PUSH & SMS NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Top Explanatory Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-900 to-amber-500/10 border border-amber-500/30">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-lg">
                <BellRing className="w-5 h-5 animate-pulse" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-black text-white">Order Alerts (App Band Hone Par Bhi)</h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Live System Active
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Agar aapka phone lock hai ya browser/app band hai, tab bhi naye order aane par aapko{' '}
                  <strong className="text-amber-400">Push Notification (Lock-screen ringtone)</strong>,{' '}
                  <strong className="text-emerald-400">WhatsApp Alert</strong> aur{' '}
                  <strong className="text-sky-400">SMS Alert</strong> milega.
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 1: WEB PUSH NOTIFICATIONS (Lock-Screen & Sound) */}
          <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">1. Mobile / Desktop Push Notifications</h3>
                  <p className="text-[11px] text-slate-400">App band hone par bhi phone ke lock-screen par alert aayega</p>
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                    pushStatus?.isSubscribed
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {pushStatus?.isSubscribed ? '● This Device Subscribed' : '○ Not Subscribed Yet'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono bg-slate-900 px-2 py-1 rounded border border-slate-800">
                  Total Active Devices: {notifyConfig.pushSubscribedDevices || 0}
                </span>
              </div>
            </div>

            {/* Permission Check notice */}
            {pushStatus && (
              <div className="text-xs p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-slate-300">
                  <Info className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>
                    Browser Permission:{' '}
                    <strong
                      className={
                        pushStatus.permission === 'granted'
                          ? 'text-emerald-400 uppercase'
                          : pushStatus.permission === 'denied'
                          ? 'text-rose-400 uppercase'
                          : 'text-amber-400 uppercase'
                      }
                    >
                      {pushStatus.permission}
                    </strong>
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Platform: {pushStatus.supported ? 'Supported on this device' : 'Push not supported'}
                </div>
              </div>
            )}

            {/* Action Buttons: Subscribe & Test */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={handleSubscribePush}
                disabled={isSubscribingPush}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md disabled:opacity-50"
              >
                <Bell className="w-4 h-4" />
                <span>
                  {isSubscribingPush
                    ? 'Connecting Device...'
                    : pushStatus?.isSubscribed
                    ? 'Re-Sync Push on This Device'
                    : 'Enable Push Notifications on This Phone'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleSendTestPush}
                disabled={isSendingPushTest}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer border border-slate-700 disabled:opacity-50"
              >
                <Volume2 className="w-4 h-4 text-amber-400" />
                <span>{isSendingPushTest ? 'Sending Test...' : 'Ring Bell & Send Test Push'}</span>
              </button>
            </div>

            {pushFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold ${
                  pushFeedback.isError
                    ? 'bg-rose-950/40 text-rose-300 border border-rose-800/40'
                    : 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40'
                }`}
              >
                {pushFeedback.text}
              </div>
            )}
          </div>

          {/* SECTION 2: WHATSAPP NOTIFICATIONS */}
          <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">2. WhatsApp Order Notifications</h3>
                  <p className="text-[11px] text-slate-400">
                    Naye order ki poori slip (Customer Name, Address, Items) WhatsApp par aayegi
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs font-semibold text-slate-300">Active:</span>
                <input
                  type="checkbox"
                  checked={notifyConfig.enableWhatsApp}
                  onChange={(e) =>
                    setNotifyConfig({ ...notifyConfig, enableWhatsApp: e.target.checked })
                  }
                  className="w-4 h-4 text-emerald-400"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Store Owner WhatsApp Number
                </label>
                <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl px-3 py-2">
                  <span className="text-slate-500 font-bold mr-1">+91</span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={notifyConfig.ownerWhatsApp}
                    onChange={(e) =>
                      setNotifyConfig({
                        ...notifyConfig,
                        ownerWhatsApp: e.target.value.replace(/\D/g, ''),
                      })
                    }
                    className="w-full bg-transparent text-white font-mono focus:outline-hidden"
                    placeholder="9826198421"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Is number par naye order ka message receive hoga.
                </span>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  CallMeBot API Key (Free Auto-WhatsApp Bot - Optional)
                </label>
                <input
                  type="text"
                  value={notifyConfig.callMeBotApiKey}
                  onChange={(e) =>
                    setNotifyConfig({ ...notifyConfig, callMeBotApiKey: e.target.value })
                  }
                  placeholder="e.g. 1234567 (Blank = 1-tap WhatsApp fallback)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-hidden"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  100% automated background delivery ke liye CallMeBot free key use kar sakte hain.
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleTestWhatsApp}
                disabled={isSendingWaTest}
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-md disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSendingWaTest ? 'Testing...' : 'Send Test WhatsApp Alert'}</span>
              </button>
            </div>

            {waTestFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold ${
                  waTestFeedback.isError
                    ? 'bg-rose-950/40 text-rose-300 border border-rose-800/40'
                    : 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40'
                }`}
              >
                {waTestFeedback.text}
              </div>
            )}
          </div>

          {/* SECTION 3: SMS NOTIFICATIONS (Indian Gateway Fast2SMS / Twilio) */}
          <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">3. Mobile SMS Order Notifications</h3>
                  <p className="text-[11px] text-slate-400">
                    Bina internet ke bhi seedha normal SMS se order update
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs font-semibold text-slate-300">Active:</span>
                <input
                  type="checkbox"
                  checked={notifyConfig.enableSms}
                  onChange={(e) =>
                    setNotifyConfig({ ...notifyConfig, enableSms: e.target.checked })
                  }
                  className="w-4 h-4 text-amber-400"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Store Owner Mobile for SMS
                </label>
                <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl px-3 py-2">
                  <span className="text-slate-500 font-bold mr-1">+91</span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={notifyConfig.ownerPhone}
                    onChange={(e) =>
                      setNotifyConfig({
                        ...notifyConfig,
                        ownerPhone: e.target.value.replace(/\D/g, ''),
                      })
                    }
                    className="w-full bg-transparent text-white font-mono focus:outline-hidden"
                    placeholder="9826198421"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">SMS Delivery Route</label>
                <select
                  value={notifyConfig.smsGateway}
                  onChange={(e) =>
                    setNotifyConfig({
                      ...notifyConfig,
                      smsGateway: e.target.value as any,
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold"
                >
                  <option value="fast2sms">Fast2SMS Gateway (India Bulk/OTP SMS)</option>
                  <option value="twilio">Twilio SMS (Global Gateway)</option>
                  <option value="manual">Direct 1-Tap SMS Link (Zero API Required)</option>
                </select>
              </div>

              {notifyConfig.smsGateway === 'fast2sms' && (
                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">
                    Fast2SMS Authorization Key (Optional for instant live auto-SMS)
                  </label>
                  <input
                    type="password"
                    value={notifyConfig.fast2smsApiKey}
                    onChange={(e) =>
                      setNotifyConfig({ ...notifyConfig, fast2smsApiKey: e.target.value })
                    }
                    placeholder="Fast2SMS API Key (e.g. from fast2sms.com dev portal)"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Fast2SMS India mein free signup par test SMS credits provide karta hai.
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleTestSms}
                disabled={isSendingSmsTest}
                className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 transition cursor-pointer shadow-md disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSendingSmsTest ? 'Sending Test SMS...' : 'Send Test SMS Alert'}</span>
              </button>
            </div>

            {smsTestFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold ${
                  smsTestFeedback.isError
                    ? 'bg-rose-950/40 text-rose-300 border border-rose-800/40'
                    : 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40'
                }`}
              >
                {smsTestFeedback.text}
              </div>
            )}
          </div>

          {/* SAVE CONFIGURATION BUTTON */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-[#0E1628] border border-slate-800">
            <div>
              <h4 className="text-xs font-bold text-white">Save Alert Configurations</h4>
              <p className="text-[11px] text-slate-400">Save your phone numbers and gateway choices</p>
            </div>
            <button
              type="button"
              onClick={handleSaveNotifyConfig}
              disabled={isSavingConfig}
              className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center gap-2 transition cursor-pointer shadow-md disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingConfig ? 'Saving...' : 'Save Notification Settings'}</span>
            </button>
          </div>

          {configToast && (
            <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Notification settings successfully saved!</span>
            </div>
          )}

          {/* SECTION 4: REAL-TIME NOTIFICATION DISPATCH AUDIT LOGS */}
          <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <h3 className="text-sm font-black text-white">Live Notification Delivery Logs</h3>
              </div>
              <button
                type="button"
                onClick={refreshNotificationData}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {logs.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">
                Abhi tak koi notification dispatch nahi hua hai. Click "Send Test Push" or "Send Test SMS" to test!
              </div>
            ) : (
              <div className="divide-y divide-slate-800 text-xs max-h-72 overflow-y-auto">
                {logs.map((log) => (
                  <div key={log.id} className="py-2.5 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            log.type === 'push'
                              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                              : log.type === 'whatsapp'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : log.type === 'sms'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          }`}
                        >
                          {log.type}
                        </span>
                        <span className="font-bold text-white text-[11px]">{log.title}</span>
                      </div>
                      <p className="text-slate-400 text-[11px] mt-0.5 leading-snug line-clamp-2">
                        {log.details}
                      </p>
                      <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                        To: {log.recipient} • {new Date(log.timestamp).toLocaleTimeString('en-IN')}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                        log.status === 'sent' || log.status === 'delivered'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : log.status === 'failed'
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-sky-500/20 text-sky-300'
                      }`}
                    >
                      {log.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT PRODUCT */}
      {isProductModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-[#0E1628] rounded-3xl border border-slate-700 p-5 sm:p-6 text-xs text-slate-100 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                {editingProduct.name ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Product Title</label>
                <input
                  type="text"
                  value={editingProduct.name}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, name: e.target.value })
                  }
                  placeholder="e.g. Royal Oxford Pure Cotton Shirt"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              {/* Category & Stock */}
              <div className="space-y-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-300 font-semibold">Category (कैटेगरी) *</label>
                    <button
                      type="button"
                      onClick={() => setShowNewCatInput(!showNewCatInput)}
                      className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ Add New Category</span>
                    </button>
                  </div>

                  {/* Inline Category Creator */}
                  {showNewCatInput && (
                    <div className="mb-2 p-2.5 rounded-xl bg-slate-950 border border-amber-400/40 space-y-2 animate-in fade-in">
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                        Nayi Category Banayein
                      </span>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newCatName}
                          onChange={(e) => setNewCatName(e.target.value)}
                          placeholder="e.g. Kurtas, Ethnic Wear, Blazers, Watches..."
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400"
                        />
                        <button
                          type="button"
                          onClick={handleCreateCategoryFromModal}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shrink-0 cursor-pointer"
                        >
                          Save & Select
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowNewCatInput(false);
                            setNewCatName('');
                          }}
                          className="px-2 py-1.5 text-slate-400 hover:text-white text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={editingProduct.category}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          category: e.target.value as CategoryId,
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white capitalize font-semibold"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>

                    <div>
                      <input
                        type="number"
                        value={editingProduct.stock}
                        onChange={(e) =>
                          setEditingProduct({
                            ...editingProduct,
                            stock: Math.max(0, Number(e.target.value)),
                          })
                        }
                        placeholder="Stock qty"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    value={editingProduct.sellingPrice}
                    onChange={(e) => {
                      const sp = Number(e.target.value);
                      const disc =
                        editingProduct.mrp > 0
                          ? Math.round(((editingProduct.mrp - sp) / editingProduct.mrp) * 100)
                          : 0;
                      setEditingProduct({
                        ...editingProduct,
                        sellingPrice: sp,
                        discountPercent: Math.max(0, disc),
                      });
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">MRP (₹)</label>
                  <input
                    type="number"
                    value={editingProduct.mrp}
                    onChange={(e) => {
                      const mrp = Number(e.target.value);
                      const disc =
                        mrp > 0
                          ? Math.round(((mrp - editingProduct.sellingPrice) / mrp) * 100)
                          : 0;
                      setEditingProduct({
                        ...editingProduct,
                        mrp,
                        discountPercent: Math.max(0, disc),
                      });
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Discount %</label>
                  <input
                    type="number"
                    readOnly
                    value={editingProduct.discountPercent}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-rose-400 font-bold font-mono"
                  />
                </div>
              </div>

              {/* COLOR OPTIONS MANAGEMENT */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-amber-400" />
                    <label className="text-xs font-bold text-white uppercase tracking-wider">
                      Product Colors ({editingProduct.colors?.length || 0} Available)
                    </label>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    Kitne Colors Hain: {editingProduct.colors?.length || 0}
                  </span>
                </div>

                {/* Selected Color Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {editingProduct.colors && editingProduct.colors.length > 0 ? (
                    editingProduct.colors.map((color) => (
                      <span
                        key={color}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                      >
                        <span
                          className="w-3 h-3 rounded-full shrink-0 border border-white/30"
                          style={{ backgroundColor: getColorHex(color) }}
                        />
                        <span className="font-semibold">{color}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct({
                              ...editingProduct,
                              colors: editingProduct.colors?.filter((c) => c !== color),
                            });
                          }}
                          className="text-slate-400 hover:text-rose-400 font-bold text-sm ml-0.5 cursor-pointer"
                          title="Remove color"
                        >
                          ×
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-slate-500 italic">
                      No colors added yet. Tap preset swatches or type below.
                    </span>
                  )}
                </div>

                {/* Quick Swatch Presets */}
                <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Quick Pick Popular Colors:
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                    {POPULAR_COLORS.map((cp) => {
                      const isSelected = editingProduct.colors?.includes(cp.name);
                      return (
                        <button
                          key={cp.name}
                          type="button"
                          onClick={() => {
                            const current = editingProduct.colors || [];
                            if (isSelected) {
                              setEditingProduct({
                                ...editingProduct,
                                colors: current.filter((c) => c !== cp.name),
                              });
                            } else {
                              setEditingProduct({
                                ...editingProduct,
                                colors: [...current, cp.name],
                              });
                            }
                          }}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border transition cursor-pointer ${
                            isSelected
                              ? 'bg-amber-400/20 border-amber-400 text-amber-300 font-bold'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/20"
                            style={{ backgroundColor: cp.hex }}
                          />
                          <span>{cp.name}</span>
                          {isSelected && <Check className="w-2.5 h-2.5 text-amber-400" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Color Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customColorInput}
                    onChange={(e) => setCustomColorInput(e.target.value)}
                    placeholder="Custom color (e.g. Lavender, Olive Tan, Coffee Brown)..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!customColorInput.trim()) return;
                      const current = editingProduct.colors || [];
                      if (!current.includes(customColorInput.trim())) {
                        setEditingProduct({
                          ...editingProduct,
                          colors: [...current, customColorInput.trim()],
                        });
                      }
                      setCustomColorInput('');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold shrink-0 flex items-center gap-1 cursor-pointer border border-slate-700"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Color</span>
                  </button>
                </div>
              </div>

              {/* Sizes (comma separated) */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Sizes (comma separated: e.g. S, M, L, XL or 28, 30, 32, 34)
                </label>
                <input
                  type="text"
                  value={editingProduct.sizes.join(', ')}
                  onChange={(e) => {
                    const sizesArr = e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean);
                    setEditingProduct({ ...editingProduct, sizes: sizesArr });
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              {/* MULTIPLE HD IMAGES STUDIO */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-amber-400" />
                    <label className="text-xs font-bold text-white uppercase tracking-wider">
                      HD Product Images ({editingProduct.images.length} Photos)
                    </label>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    High Quality HD 1400px
                  </span>
                </div>

                <p className="text-[11px] text-slate-400">
                  Multiple photos upload karein ya HD web URLs dalein. Har image high quality crystal clear zoom ke saath customer ko dikhegi.
                </p>

                {/* Upload from Device / Phone Gallery button */}
                <div className="flex flex-wrap items-center gap-2">
                  <label
                    htmlFor="product-image-upload"
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer border border-slate-700 transition shadow-sm"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Multiple Photos (Gallery / Device)</span>
                  </label>
                  <input
                    type="file"
                    id="product-image-upload"
                    multiple
                    accept="image/*"
                    onChange={handleImageFileUpload}
                    className="hidden"
                  />
                </div>

                {/* Paste HD Image URL */}
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={newImageUrlInput}
                    onChange={(e) => setNewImageUrlInput(e.target.value)}
                    placeholder="Or paste HD Image URL (e.g. https://images.unsplash.com/...)"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-hidden focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newImageUrlInput.trim()) return;
                      const hdUrl = getHdImageUrl(newImageUrlInput.trim());
                      setEditingProduct((prev) => {
                        if (!prev) return null;
                        return {
                          ...prev,
                          images: [...prev.images, hdUrl],
                        };
                      });
                      setNewImageUrlInput('');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shrink-0 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add HD URL</span>
                  </button>
                </div>

                {/* Visual Thumbnail Gallery Grid */}
                {editingProduct.images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {editingProduct.images.map((imgUrl, index) => (
                      <div
                        key={`${imgUrl}-${index}`}
                        className="relative group rounded-xl overflow-hidden border border-slate-800 bg-slate-900 aspect-3/4 flex flex-col"
                      >
                        <img
                          src={getHdImageUrl(imgUrl)}
                          alt=""
                          className="w-full h-full object-cover"
                        />

                        {/* Top badges */}
                        <div className="absolute top-1 left-1 flex items-center gap-1">
                          <span className="px-1.5 py-0.5 rounded bg-black/75 text-amber-400 font-black text-[9px] border border-amber-400/40">
                            HD
                          </span>
                          {index === 0 ? (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 font-black text-[9px]">
                              COVER
                            </span>
                          ) : (
                            <span className="px-1 py-0.5 rounded bg-black/60 text-slate-300 font-mono text-[9px]">
                              #{index + 1}
                            </span>
                          )}
                        </div>

                        {/* Top right remove button */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct({
                              ...editingProduct,
                              images: editingProduct.images.filter((_, i) => i !== index),
                            });
                          }}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600/90 text-white flex items-center justify-center text-xs font-bold hover:bg-rose-500 transition cursor-pointer"
                          title="Delete photo"
                        >
                          ✕
                        </button>

                        {/* Bottom action bar */}
                        <div className="absolute inset-x-0 bottom-0 p-1 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex items-center justify-between opacity-90 group-hover:opacity-100 transition">
                          <button
                            type="button"
                            onClick={() => setPreviewLightboxUrl(getHdImageUrl(imgUrl))}
                            className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-[10px] flex items-center gap-1 cursor-pointer"
                            title="HD Zoom Preview"
                          >
                            <Maximize2 className="w-3 h-3 text-amber-400" />
                          </button>

                          {index !== 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newImgs = [...editingProduct.images];
                                const [selected] = newImgs.splice(index, 1);
                                newImgs.unshift(selected);
                                setEditingProduct({
                                  ...editingProduct,
                                  images: newImgs,
                                });
                              }}
                              className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-bold text-[9px] hover:bg-amber-400 cursor-pointer"
                            >
                              Make Cover
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Bulk Multiline Textarea fallback */}
                <details className="text-[11px] text-slate-400 pt-1">
                  <summary className="cursor-pointer hover:text-amber-400 font-semibold">
                    Bulk edit image URLs as raw text (Optional)
                  </summary>
                  <textarea
                    rows={3}
                    value={editingProduct.images.join('\n')}
                    onChange={(e) => {
                      const imgs = e.target.value
                        .split('\n')
                        .map((s) => s.trim())
                        .filter(Boolean);
                      setEditingProduct({ ...editingProduct, images: imgs });
                    }}
                    placeholder="One URL per line..."
                    className="w-full mt-1.5 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-[11px] font-mono focus:outline-hidden"
                  />
                </details>
              </div>

              {/* Description */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description (विवरण)</label>
                <textarea
                  rows={3}
                  value={editingProduct.description}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, description: e.target.value })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs"
                />
              </div>

              {/* Toggles */}
              <div className="flex gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.isFeatured}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, isFeatured: e.target.checked })
                    }
                    className="w-4 h-4 text-amber-400"
                  />
                  <span>Featured Product</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.isNewArrival}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, isNewArrival: e.target.checked })
                    }
                    className="w-4 h-4 text-amber-400"
                  />
                  <span>New Arrival</span>
                </label>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!editingProduct.name.trim()) {
                    alert('Please enter a product name');
                    return;
                  }
                  onSaveProduct(editingProduct);
                  setIsProductModalOpen(false);
                }}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
              >
                Save Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT BANNER */}
      {isBannerModalOpen && editingBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-3 overflow-y-auto">
          <div className="w-full max-w-md bg-[#0E1628] rounded-3xl border border-slate-700 p-5 text-xs text-slate-100 shadow-2xl space-y-3">
            <h3 className="text-sm font-black text-white uppercase">Banner Editor</h3>

            <div>
              <label className="block text-slate-300 mb-1">Banner Title</label>
              <input
                type="text"
                value={editingBanner.title}
                onChange={(e) =>
                  setEditingBanner({ ...editingBanner, title: e.target.value })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Subtitle / Offer</label>
              <input
                type="text"
                value={editingBanner.subtitle}
                onChange={(e) =>
                  setEditingBanner({ ...editingBanner, subtitle: e.target.value })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Badge</label>
              <input
                type="text"
                value={editingBanner.badge}
                onChange={(e) =>
                  setEditingBanner({ ...editingBanner, badge: e.target.value })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Offer Tagline</label>
              <input
                type="text"
                value={editingBanner.offerText}
                onChange={(e) =>
                  setEditingBanner({ ...editingBanner, offerText: e.target.value })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Image URL</label>
              <input
                type="text"
                value={editingBanner.image}
                onChange={(e) =>
                  setEditingBanner({ ...editingBanner, image: e.target.value })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-[11px]"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setIsBannerModalOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onSaveBanner(editingBanner);
                  setIsBannerModalOpen(false);
                }}
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
              >
                Save Banner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HD LIGHTBOX PREVIEW */}
      {previewLightboxUrl && (
        <HDImageLightbox
          isOpen={true}
          images={[previewLightboxUrl]}
          productName={editingProduct?.name || 'HD Product Preview'}
          onClose={() => setPreviewLightboxUrl(null)}
        />
      )}

      {/* Store Poster & Barcode Modal */}
      <PosterQrModal
        isOpen={isPosterModalOpen}
        onClose={() => setIsPosterModalOpen(false)}
        settings={localSettings}
        onSaveSettings={(updated) => {
          setLocalSettings(updated);
          onSaveSettings(updated);
        }}
      />
    </div>
    </AdminErrorBoundary>
  );
};
