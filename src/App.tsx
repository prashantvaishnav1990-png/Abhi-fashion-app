import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  Flame,
  Clock,
  Tag,
  MapPin,
  Phone,
  MessageCircle,
  ShieldCheck,
  CreditCard,
  Truck,
  RotateCcw,
  ArrowRight,
  Filter,
  Trash2,
  Trash,
  Smartphone,
  User,
  X,
  Plus,
  RefreshCw,
  Package,
  Radio,
  Image as ImageIcon,
} from 'lucide-react';
import { INITIAL_PRODUCTS } from './data/initialData';
import {
  Banner,
  CartItem,
  Category,
  CategoryId,
  CustomerAddress,
  CustomerProfile,
  Order,
  OrderStatus,
  PaymentMethod,
  Product,
  StoreSettings,
} from './types';
import { StoreService, subscribeToStore } from './services/storeStorage';
import { CustomerService } from './services/customerService';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HeroSlider } from './components/HeroSlider';
import { CategoryChips } from './components/CategoryChips';
import { ProductCard } from './components/ProductCard';
import { ProductDetailsModal } from './components/ProductDetailsModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { OrderConfirmationModal } from './components/OrderConfirmationModal';
import { OrdersView } from './components/OrdersView';
import { SearchModal } from './components/SearchModal';
import { AdminPanel } from './components/AdminPanel';
import { AdminApp } from './components/AdminApp';
import { CustomerLoginModal } from './components/CustomerLoginModal';
import { OfferBannerModal } from './components/OfferBannerModal';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { OfflineIndicator } from './components/OfflineIndicator';

export default function App() {
  // App Mode State: 'customer' (Client Storefront) vs 'admin' (Store Owner App)
  const [appMode, setAppMode] = useState<'customer' | 'admin'>(() => {
    if (typeof window !== 'undefined') {
      if ((window as any).__APP_TARGET_MODE__ === 'admin') {
        return 'admin';
      }
      const params = new URLSearchParams(window.location.search);
      if (params.get('app') === 'admin' || params.get('tab') === 'admin') {
        return 'admin';
      }
      if (params.get('app') === 'customer') {
        return 'customer';
      }
      const path = window.location.pathname;
      if (path.startsWith('/admin')) {
        return 'admin';
      }
      try {
        const savedMode = localStorage.getItem('abhi_fashion_app_mode');
        if (savedMode === 'admin' || savedMode === 'customer') {
          return savedMode;
        }
      } catch {}
    }
    return 'customer';
  });

  const handleSwitchMode = (mode: 'customer' | 'admin') => {
    setAppMode(mode);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('abhi_fashion_app_mode', mode);
      } catch {}
      const newPath = mode === 'admin' ? '/admin' : '/';
      window.history.pushState({}, '', newPath);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Detect whether running in dedicated Admin APK (com.abhifashion.admin) or Customer APK (com.abhifashion.store)
  useEffect(() => {
    (window as any).__onAppTargetMode = (mode: 'customer' | 'admin') => {
      setAppMode(mode);
    };

    import('@capacitor/app')
      .then(({ App: CapApp }) => {
        CapApp.getInfo()
          .then((info) => {
            if (info?.id === 'com.abhifashion.admin') {
              setAppMode('admin');
            } else if (info?.id === 'com.abhifashion.store') {
              const params = new URLSearchParams(window.location.search);
              if (!params.get('app') && !window.location.pathname.startsWith('/admin')) {
                setAppMode('customer');
              }
            }
          })
          .catch(() => {});
      })
      .catch(() => {});
  }, []);

  // Sync with browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      if (
        path.startsWith('/admin') ||
        params.get('app') === 'admin' ||
        params.get('tab') === 'admin'
      ) {
        setAppMode('admin');
      } else {
        setAppMode('customer');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Store dynamic data state
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(StoreService.getSettings());
  const [orders, setOrders] = useState<Order[]>([]);

  // Customer Profile & Multi-Device Mobile Sync State
  const [customer, setCustomer] = useState<CustomerProfile | null>(() =>
    CustomerService.getCurrentCustomer()
  );
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);

  // Customer Navigation State (No Admin tab in customer navigation!)
  const [activeTab, setActiveTab] = useState<'home' | 'categories' | 'cart' | 'orders'>('home');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'all'>('all');

  // Cart State (Persisted in localStorage & Synced with Customer Mobile on Server)
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('abhi_fashion_cart_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modals & Drawers
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  // Load store data and subscribe to changes
  useEffect(() => {
    const refreshData = () => {
      setProducts(StoreService.getProducts());
      setCategories(StoreService.getCategories());
      setBanners(StoreService.getBanners());
      setSettings(StoreService.getSettings());
      setOrders(StoreService.getOrders());
    };

    refreshData();
    const unsubscribe = subscribeToStore(refreshData);
    const unsubCustomer = CustomerService.subscribe((c) => setCustomer(c));
    return () => {
      unsubscribe();
      unsubCustomer();
    };
  }, []);

  // Automatic Mobile Login Prompt on First App Open/Download & Cloud Sync
  useEffect(() => {
    if (customer && customer.mobile) {
      // Sync fresh profile & previous orders from server
      CustomerService.refreshProfile(customer.mobile).then((res) => {
        if (res.customer) {
          setCustomer(res.customer);
          // Restore cloud cart if available
          if (res.customer.cart && res.customer.cart.length > 0 && cart.length === 0) {
            setCart(res.customer.cart);
          }
        }
      });
    } else {
      // Prompt user to login with mobile number when opening/downloading app
      const hasPrompted = sessionStorage.getItem('abhi_login_prompted');
      if (!hasPrompted) {
        sessionStorage.setItem('abhi_login_prompted', 'true');
        const timer = setTimeout(() => {
          setIsLoginModalOpen(true);
        }, 700);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  // Save Cart locally and sync to customer account on server
  useEffect(() => {
    try {
      localStorage.setItem('abhi_fashion_cart_v1', JSON.stringify(cart));
    } catch (e) {
      console.error('Failed to save cart:', e);
    }
    if (customer && customer.mobile) {
      CustomerService.syncCartToServer(cart);
    }
  }, [cart, customer]);

  // Handle Deleting Sample Products directly from the screen
  const handleDeleteSampleProducts = () => {
    const ok = window.confirm(
      'Kya aap screen par dikh rahe sabhi sample/demo products ko delete karna chahte hain? Isse aapki catalog screen bilkul saaf ho jayegi aur aap apne naye products daal sakenge.'
    );
    if (!ok) return;

    const count = StoreService.deleteSampleProducts();
    setDeleteNotice(`✅ ${count} Sample products safalta-purvak screen se delete ho gaye.`);
    setTimeout(() => setDeleteNotice(null), 4000);
  };

  const handleDeleteSingleProduct = (product: Product) => {
    StoreService.deleteProduct(product.id);
    setDeleteNotice(`🗑️ "${product.name}" screen se delete ho gaya.`);
    setTimeout(() => setDeleteNotice(null), 3000);
  };

  const handleSaveBanner = (banner: Banner) => {
    StoreService.saveBanner(banner);
    setBanners(StoreService.getBanners());
    setDeleteNotice(`✅ Offer "${banner.title}" save ho gaya aur sabhi customer ke app me live hai!`);
    setTimeout(() => setDeleteNotice(null), 3500);
  };

  const handleDeleteBanner = (id: string) => {
    StoreService.deleteBanner(id);
    setBanners(StoreService.getBanners());
    setDeleteNotice(`🗑️ Offer banner screen se hata diya gaya.`);
    setTimeout(() => setDeleteNotice(null), 3000);
  };

  const handleRestoreSampleProducts = () => {
    const ok = window.confirm('Kya aap sample products ko wapas screen par lana chahte hain?');
    if (!ok) return;
    fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products: INITIAL_PRODUCTS }),
    })
      .then(() => {
        localStorage.setItem('abhi_fashion_products_v1', JSON.stringify(INITIAL_PRODUCTS));
        setProducts(INITIAL_PRODUCTS);
        setDeleteNotice('✅ Sample products wapas restore ho gaye hain!');
        setTimeout(() => setDeleteNotice(null), 3500);
      })
      .catch(() => {});
  };

  const handleCustomerLoginSuccess = (loggedInCustomer: CustomerProfile, customerOrders: Order[]) => {
    setCustomer(loggedInCustomer);
    if (loggedInCustomer.cart && loggedInCustomer.cart.length > 0) {
      setCart(loggedInCustomer.cart);
    }
    setOrders(StoreService.getOrders());
  };

  // Cart Actions
  const handleAddToCart = (product: Product, size: string, quantity = 1) => {
    setCart((prevCart) => {
      const itemKey = `${product.id}-${size}`;
      const existingIdx = prevCart.findIndex((i) => i.id === itemKey);
      if (existingIdx >= 0) {
        const updated = [...prevCart];
        updated[existingIdx].quantity += quantity;
        return updated;
      } else {
        return [
          ...prevCart,
          {
            id: itemKey,
            productId: product.id,
            product,
            selectedSize: size,
            quantity,
          },
        ];
      }
    });
  };

  const handleUpdateCartQuantity = (cartItemId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveCartItem(cartItemId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.id === cartItemId ? { ...item, quantity: newQty } : item))
    );
  };

  const handleRemoveCartItem = (cartItemId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== cartItemId));
  };

  const handleBuyNow = (product: Product, size: string, quantity = 1) => {
    handleAddToCart(product, size, quantity);
    setSelectedProduct(null);
    setIsCheckoutOpen(true);
  };

  // Order Placement
  const handleCreateOrder = (payload: {
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
  }) => {
    const newOrder = StoreService.createOrder(payload);
    setCart([]); // Clear cart
    setIsCheckoutOpen(false);
    setIsCartOpen(false);
    setConfirmedOrder(newOrder);
    return newOrder;
  };

  // Filtered Products for Home/Category Views
  const displayedProducts =
    selectedCategory === 'all'
      ? products
      : products.filter((p) => p.category === selectedCategory);

  const featuredProducts = products.filter((p) => p.isFeatured);
  const newArrivalProducts = products.filter((p) => p.isNewArrival);
  const discountedProducts = products.filter((p) => p.discountPercent >= 48);

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // -------------------------------------------------------------
  // DEDICATED ADMIN APP MODE (For Store Owner / Order Notifications)
  // -------------------------------------------------------------
  if (appMode === 'admin') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        {/* Top App Switcher Bar */}
        <div className="bg-slate-900 border-b border-slate-800/90 py-1.5 px-3 sm:px-4 flex items-center justify-between text-xs sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-semibold hidden sm:inline">
              Active App:
            </span>
            <div className="inline-flex rounded-lg p-0.5 bg-slate-950 border border-slate-800">
              <button
                onClick={() => handleSwitchMode('customer')}
                className="px-2.5 py-1 rounded-md text-[11px] font-bold text-slate-400 hover:text-white transition cursor-pointer"
              >
                🛍️ Customer App (ग्राहक)
              </button>
              <button className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-500 text-slate-950 shadow-xs cursor-default">
                🛡️ Admin App (दुकानदार)
              </button>
            </div>
          </div>

          <button
            onClick={() => handleSwitchMode('customer')}
            className="text-amber-400 hover:text-amber-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <span>Open Customer Storefront</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <AdminApp onSwitchToCustomerApp={() => handleSwitchMode('customer')} />
      </div>
    );
  }

  // -------------------------------------------------------------
  // DEDICATED CUSTOMER APP MODE (For Shoppers & Buyers)
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#0A0F1D] text-slate-100 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950 pb-20 md:pb-0">
      {/* Top App Mode Switcher Banner */}
      <div className="bg-slate-900/95 border-b border-slate-800/90 py-1.5 px-3 sm:px-4 flex items-center justify-between text-xs backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 font-semibold hidden sm:inline">
            Active App:
          </span>
          <div className="inline-flex rounded-lg p-0.5 bg-slate-950 border border-slate-800">
            <button className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-500 text-slate-950 shadow-xs cursor-default">
              🛍️ Customer App (ग्राहक)
            </button>
            <button
              onClick={() => handleSwitchMode('admin')}
              className="px-2.5 py-1 rounded-md text-[11px] font-bold text-slate-400 hover:text-white transition cursor-pointer"
            >
              🛡️ Admin App (दुकानदार)
            </button>
          </div>
        </div>

        <button
          onClick={() => handleSwitchMode('admin')}
          className="text-amber-400 hover:text-amber-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
        >
          <span>Store Owner? Open Admin App</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* PWA In-App Install Prompt Banner */}
      <PWAInstallBanner />

      {/* Offline Status Warning */}
      <OfflineIndicator />

      {/* Header */}
      <Header
        settings={settings}
        cartCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onNavigateHome={() => {
          setActiveTab('home');
          setSelectedCategory('all');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenAdmin={() => handleSwitchMode('admin')}
        showAdminButton={false}
        activeView={activeTab}
        currentCustomer={customer}
        onOpenLogin={() => setIsLoginModalOpen(true)}
      />

      {/* Main Content Areas */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-4 py-4">
        {/* Delete Feedback Toast Notice */}
        {deleteNotice && (
          <div className="mb-4 p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-between shadow-lg animate-in fade-in">
            <span>{deleteNotice}</span>
            <button
              onClick={() => setDeleteNotice(null)}
              className="p-1 rounded-full hover:bg-emerald-900 text-emerald-300 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* VIEW 1: HOME PAGE */}
        {activeTab === 'home' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Hero Slider */}
            <HeroSlider
              banners={banners}
              onSelectCategory={(catId) => {
                setSelectedCategory(catId);
                setActiveTab('categories');
              }}
              onShopNow={() => {
                const catalogEl = document.getElementById('store-catalog-section');
                catalogEl?.scrollIntoView({ behavior: 'smooth' });
              }}
            />

            {/* Category Cards Carousel */}
            <CategoryChips
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={(catId) => {
                setSelectedCategory(catId);
                if (catId !== 'all') {
                  setActiveTab('categories');
                }
              }}
            />

            {/* Promotional Offer / Pay Later Callout Banner */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-600/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0 border border-amber-500/30">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                    FLEXIBLE SHOPPING AT CHHUIKHADAN
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    Shop Now • Pay Later with Easy EMI
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Upgrade your wardrobe today with cardless installments or pay Cash on Delivery.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer shadow-md"
                >
                  Explore Trending Fits
                </button>
              </div>
            </div>

            {/* Featured Products Section */}
            {featuredProducts.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <div>
                      <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider">
                        Featured Styles
                      </h2>
                      <p className="text-xs text-slate-400">Handpicked top performers for men</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCategory('all');
                      setActiveTab('categories');
                    }}
                    className="text-xs text-amber-400 hover:underline font-bold flex items-center gap-1"
                  >
                    <span>View All</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                  {featuredProducts.map((prod) => (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      onSelectProduct={setSelectedProduct}
                      onAddToCart={(p, s) => handleAddToCart(p, s)}
                      onBuyNow={(p, s) => handleBuyNow(p, s)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* New Arrivals Section */}
            {newArrivalProducts.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-rose-500" />
                    <div>
                      <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider">
                        New Arrivals
                      </h2>
                      <p className="text-xs text-slate-400">Fresh weekly drops just in store</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                  {newArrivalProducts.map((prod) => (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      onSelectProduct={setSelectedProduct}
                      onAddToCart={(p, s) => handleAddToCart(p, s)}
                      onBuyNow={(p, s) => handleBuyNow(p, s)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Offers & Discount Section */}
            {discountedProducts.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Tag className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider">
                        Steal Deals & Offers
                      </h2>
                      <p className="text-xs text-slate-400">Up to 50% discount on premium selections</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                  {discountedProducts.map((prod) => (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      onSelectProduct={setSelectedProduct}
                      onAddToCart={(p, s) => handleAddToCart(p, s)}
                      onBuyNow={(p, s) => handleBuyNow(p, s)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Complete Store Catalog Section with Filter & Tabs */}
            <section id="store-catalog-section" className="pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider">
                    Full Store Collection
                  </h2>
                  <p className="text-xs text-slate-400">
                    Browsing {displayedProducts.length} items in Chhuikhadan store
                  </p>
                </div>
              </div>

              {displayedProducts.length === 0 ? (
                <div className="p-8 sm:p-12 text-center rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
                    <Package className="w-7 h-7" />
                  </div>
                  <div className="max-w-md mx-auto">
                    <h3 className="text-base font-black text-white uppercase">Is Category Me Products Jald Hi Aa Rahe Hain</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Kripya doosri category browse karein ya sabhi collections check karein.
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer"
                  >
                    View All Products
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                  {displayedProducts.map((prod) => (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      onSelectProduct={setSelectedProduct}
                      onAddToCart={(p, s) => handleAddToCart(p, s)}
                      onBuyNow={(p, s) => handleBuyNow(p, s)}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* VIEW 2: CATEGORIES DEDICATED VIEW */}
        {activeTab === 'categories' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider">
                Category Browser
              </h1>
              <p className="text-xs text-slate-400">Select a menswear category to filter</p>
            </div>

            {/* Category Switcher Pills */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition border ${
                  selectedCategory === 'all'
                    ? 'bg-amber-400 text-slate-950 border-amber-400'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                All Menswear ({products.length})
              </button>

              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition border ${
                    selectedCategory === cat.id
                      ? 'bg-amber-400 text-slate-950 border-amber-400'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {cat.name} ({products.filter((p) => p.category === cat.id).length})
                </button>
              ))}
            </div>

            {/* Active Category Products Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {displayedProducts.map((prod) => (
                <ProductCard
                  key={prod.id}
                  product={prod}
                  onSelectProduct={setSelectedProduct}
                  onAddToCart={(p, s) => handleAddToCart(p, s)}
                  onBuyNow={(p, s) => handleBuyNow(p, s)}
                />
              ))}
            </div>
          </div>
        )}

        {/* VIEW 3: CART VIEW (if navigated via bottom nav) */}
        {activeTab === 'cart' && (
          <div className="max-w-2xl mx-auto py-4">
            <h1 className="text-xl font-black text-white uppercase tracking-wider mb-4">
              Shopping Bag
            </h1>
            <CartDrawer
              isOpen={true}
              onClose={() => setActiveTab('home')}
              items={cart}
              settings={settings}
              onUpdateQuantity={handleUpdateCartQuantity}
              onRemoveItem={handleRemoveCartItem}
              onProceedToCheckout={() => setIsCheckoutOpen(true)}
              onExploreProducts={() => setActiveTab('home')}
            />
          </div>
        )}

        {/* VIEW 4: MY ORDERS VIEW */}
        {activeTab === 'orders' && (
          <OrdersView
            orders={
              customer?.mobile
                ? orders.filter((o) => {
                    const oMob = String(o.customer?.mobile || '').replace(/\D/g, '').slice(-10);
                    return oMob === customer.mobile;
                  })
                : orders
            }
            settings={settings}
            currentCustomer={customer}
            onOpenLogin={() => setIsLoginModalOpen(true)}
            onCancelOrder={(orderId) => StoreService.updateOrderStatus(orderId, 'Cancelled')}
            onContinueShopping={() => setActiveTab('home')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 bg-[#070B14] border-t border-slate-800/80 pt-8 pb-16 md:pb-8 text-xs text-slate-400">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Brand Col */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xs">
                AF
              </div>
              <span className="font-black text-white tracking-wider text-sm uppercase">
                {settings.storeName}
              </span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Premium men's clothing store located at Bazar Line, Chhuikhadan. Modern fits, party wear & casuals.
            </p>
            <div className="pt-1 flex items-center gap-1.5 text-amber-400 font-semibold">
              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>{settings.storeAddress}</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-white uppercase tracking-wider mb-2.5">
              Men's Categories
            </h4>
            <ul className="space-y-1.5">
              {['Shirts', 'T-Shirts', 'Jeans', 'Trousers', 'Jackets', 'Footwear', 'Accessories'].map(
                (c) => (
                  <li key={c}>
                    <button
                      onClick={() => {
                        setSelectedCategory(c.toLowerCase().replace(' ', '-') as any);
                        setActiveTab('categories');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="hover:text-amber-400 transition"
                    >
                      {c}
                    </button>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Customer Trust */}
          <div>
            <h4 className="font-bold text-white uppercase tracking-wider mb-2.5">
              Store Advantages
            </h4>
            <ul className="space-y-2 text-slate-300">
              <li className="flex items-center gap-2">
                <Truck className="w-3.5 h-3.5 text-amber-400" />
                <span>Fast Chhuikhadan Local Delivery</span>
              </li>
              <li className="flex items-center gap-2">
                <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                <span>Shop Now • Pay Later / EMI</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Cash on Delivery (COD)</span>
              </li>
              <li className="flex items-center gap-2">
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Hassle-Free Size Exchange</span>
              </li>
            </ul>
          </div>

          {/* Support & Admin */}
          <div>
            <h4 className="font-bold text-white uppercase tracking-wider mb-2.5">
              Contact & Support
            </h4>
            <p className="text-slate-300 mb-2">Have sizing or delivery questions? Connect with our store team directly:</p>
            <div className="space-y-2">
              <a
                href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 px-3 py-1.5 rounded-xl font-bold transition"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp: +{settings.whatsappNumber}</span>
              </a>

              <div>
                <button
                  onClick={() => handleSwitchMode('admin')}
                  className="text-amber-400/80 hover:text-amber-300 text-xs font-semibold underline block mt-2 cursor-pointer"
                >
                  🔒 Store Owner / Admin App Login ↗
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 mt-8 pt-4 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
          <span>
            © {new Date().getFullYear()} {settings.storeName}. All rights reserved. Bazar Line, Chhuikhadan.
          </span>
          <span className="text-slate-400">Progressive Web App (PWA) • Installable & Offline-Ready</span>
        </div>
      </footer>

      {/* Mobile Sticky Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'cart') {
            setIsCartOpen(true);
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        cartCount={totalCartCount}
      />

      {/* Customer Mobile Login Modal */}
      <CustomerLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        currentCustomer={customer}
        onLoginSuccess={handleCustomerLoginSuccess}
        onLogout={() => {
          CustomerService.logout();
          setCustomer(null);
        }}
      />

      {/* Product Details Modal */}
      <ProductDetailsModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
      />

      {/* Slide-out Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen && activeTab !== 'cart'}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        settings={settings}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
        onExploreProducts={() => {
          setIsCartOpen(false);
          setActiveTab('home');
        }}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cart}
        settings={settings}
        currentCustomer={customer}
        onCreateOrder={handleCreateOrder}
        onOrderSuccess={(order) => {
          setConfirmedOrder(order);
        }}
      />

      {/* Order Confirmation Screen */}
      <OrderConfirmationModal
        order={confirmedOrder}
        settings={settings}
        onClose={() => setConfirmedOrder(null)}
        onViewAllOrders={() => {
          setConfirmedOrder(null);
          setActiveTab('orders');
        }}
      />

      {/* Search & Filter Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        products={products}
        onSelectProduct={setSelectedProduct}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
      />

      {/* Top Box Offer & Banner Manager Modal */}
      {isOfferModalOpen && (
        <OfferBannerModal
          banners={banners}
          onSaveBanner={handleSaveBanner}
          onDeleteBanner={handleDeleteBanner}
          onClose={() => setIsOfferModalOpen(false)}
        />
      )}
    </div>
  );
}
