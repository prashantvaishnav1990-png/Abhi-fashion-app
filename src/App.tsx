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
} from 'lucide-react';
import {
  Banner,
  CartItem,
  Category,
  CategoryId,
  CustomerAddress,
  Order,
  OrderStatus,
  PaymentMethod,
  Product,
  StoreSettings,
} from './types';
import { StoreService, subscribeToStore } from './services/storeStorage';
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
import { WhatsAppFloatingButton } from './components/WhatsAppFloatingButton';
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

  // Customer Navigation State (No Admin tab in customer navigation!)
  const [activeTab, setActiveTab] = useState<'home' | 'categories' | 'cart' | 'orders'>('home');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'all'>('all');

  // Cart State (Persisted in localStorage)
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
    return () => unsubscribe();
  }, []);

  // Save Cart on change
  useEffect(() => {
    try {
      localStorage.setItem('abhi_fashion_cart_v1', JSON.stringify(cart));
    } catch (e) {
      console.error('Failed to save cart:', e);
    }
  }, [cart]);

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
      />

      {/* Main Content Areas */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-4 py-4">
        {/* VIEW 1: HOME PAGE */}
        {activeTab === 'home' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Hero Slider with exact prompt banner slogans */}
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
            orders={orders}
            settings={settings}
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

      {/* Floating WhatsApp Action Button */}
      <WhatsAppFloatingButton settings={settings} />

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
    </div>
  );
}
