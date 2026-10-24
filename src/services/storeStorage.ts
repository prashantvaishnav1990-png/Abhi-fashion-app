import {
  INITIAL_BANNERS,
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_SETTINGS,
} from '../data/initialData';
import {
  Banner,
  Category,
  CustomerAddress,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  Product,
  StoreSettings,
} from '../types';
import { NotificationService } from './notificationService';

const STORAGE_KEYS = {
  PRODUCTS: 'abhi_fashion_products_v1',
  CATEGORIES: 'abhi_fashion_categories_v1',
  BANNERS: 'abhi_fashion_banners_v1',
  SETTINGS: 'abhi_fashion_settings_v1',
  ORDERS: 'abhi_fashion_orders_v1',
  ADMIN_AUTH: 'abhi_fashion_admin_session_v1',
};

// Listeners for reactivity across components
type StorageListener = () => void;
type NewOrderListener = (order: Order) => void;
const listeners: Set<StorageListener> = new Set();
const newOrderListeners: Set<NewOrderListener> = new Set();

let isInitialOrderLoadDone = false;
const knownOrderIds: Set<string> = new Set();

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error('Listener error:', e);
    }
  });
}

export function subscribeToStore(listener: StorageListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function subscribeToNewOrders(listener: NewOrderListener): () => void {
  newOrderListeners.add(listener);
  return () => {
    newOrderListeners.delete(listener);
  };
}

// Background Server Sync & Real-Time Sync State
let lastKnownVersions: Record<string, number> = {};

async function syncProductsFromServer() {
  try {
    const res = await fetch('/api/products');
    if (!res.ok) return;
    const data = await res.json();
    if (data && data.products !== null && Array.isArray(data.products)) {
      const currentLocal = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      const newJson = JSON.stringify(data.products);
      if (currentLocal !== newJson) {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, newJson);
        notifyListeners();
      }
    } else {
      const local = StoreService.getProducts();
      fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: local }),
      }).catch(() => {});
    }
  } catch {
    // Quiet fail on network hiccups
  }
}

async function syncBannersFromServer() {
  try {
    const res = await fetch('/api/banners');
    if (!res.ok) return;
    const data = await res.json();
    if (data && data.banners !== null && Array.isArray(data.banners)) {
      const currentLocal = localStorage.getItem(STORAGE_KEYS.BANNERS);
      const newJson = JSON.stringify(data.banners);
      if (currentLocal !== newJson) {
        localStorage.setItem(STORAGE_KEYS.BANNERS, newJson);
        notifyListeners();
      }
    }
  } catch {
    // Quiet fail
  }
}

async function syncCategoriesFromServer() {
  try {
    const res = await fetch('/api/categories');
    if (!res.ok) return;
    const data = await res.json();
    if (data && Array.isArray(data.categories)) {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(data.categories));
      notifyListeners();
    }
  } catch {}
}

async function syncSettingsFromServer() {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return;
    const data = await res.json();
    if (data && data.settings && typeof data.settings === 'object') {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
      notifyListeners();
    }
  } catch {}
}

async function syncOrdersFromServer() {
  try {
    const res = await fetch('/api/orders');
    if (!res.ok) return;
    const data = await res.json();
    const serverOrders: Order[] = data.orders || [];

    if (!isInitialOrderLoadDone) {
      serverOrders.forEach((o) => knownOrderIds.add(o.id));
      const local = StoreService.getOrders();
      local.forEach((o) => knownOrderIds.add(o.id));
      isInitialOrderLoadDone = true;

      // Merge server + local
      const mergedMap = new Map<string, Order>();
      local.forEach((o) => mergedMap.set(o.id, o));
      serverOrders.forEach((o) => mergedMap.set(o.id, o));
      const merged = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(merged));
      notifyListeners();
      return;
    }

    // Subsequent polls: check if brand new order has arrived
    const newlyArrived: Order[] = [];
    serverOrders.forEach((o) => {
      if (!knownOrderIds.has(o.id)) {
        knownOrderIds.add(o.id);
        newlyArrived.push(o);
      }
    });

    if (newlyArrived.length > 0) {
      // Merge into local storage
      const local = StoreService.getOrders();
      const mergedMap = new Map<string, Order>();
      local.forEach((o) => mergedMap.set(o.id, o));
      serverOrders.forEach((o) => mergedMap.set(o.id, o));
      const merged = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(merged));
      notifyListeners();

      // Trigger alerts
      newlyArrived.forEach((order) => {
        try {
          NotificationService.playOrderAlertSound();
        } catch {}
        newOrderListeners.forEach((cb) => {
          try {
            cb(order);
          } catch (e) {
            console.error('New order listener error:', e);
          }
        });
      });
    }
  } catch (err) {
    // Quiet fail on network hiccups
  }
}

// Check versions on server for fast continuous sync
async function checkVersionsFromServer() {
  try {
    const res = await fetch('/api/sync/versions');
    if (!res.ok) return;
    const { versions } = await res.json();
    if (!versions) return;

    if (lastKnownVersions.products && versions.products !== lastKnownVersions.products) {
      syncProductsFromServer();
    }
    if (lastKnownVersions.banners && versions.banners !== lastKnownVersions.banners) {
      syncBannersFromServer();
    }
    if (lastKnownVersions.categories && versions.categories !== lastKnownVersions.categories) {
      syncCategoriesFromServer();
    }
    if (lastKnownVersions.settings && versions.settings !== lastKnownVersions.settings) {
      syncSettingsFromServer();
    }
    if (lastKnownVersions.orders && versions.orders !== lastKnownVersions.orders) {
      syncOrdersFromServer();
    }
    lastKnownVersions = versions;
  } catch {}
}

// Real-Time SSE Listener
function initRealtimeSync() {
  if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;

  try {
    const es = new EventSource('/api/sync/events');

    es.addEventListener('connected', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.versions) lastKnownVersions = payload.versions;
      } catch {}
    });

    es.addEventListener('products', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.data && Array.isArray(payload.data)) {
          localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(payload.data));
          notifyListeners();
        } else {
          syncProductsFromServer();
        }
      } catch {
        syncProductsFromServer();
      }
    });

    es.addEventListener('banners', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.data && Array.isArray(payload.data)) {
          localStorage.setItem(STORAGE_KEYS.BANNERS, JSON.stringify(payload.data));
          notifyListeners();
        } else {
          syncBannersFromServer();
        }
      } catch {
        syncBannersFromServer();
      }
    });

    es.addEventListener('categories', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.data && Array.isArray(payload.data)) {
          localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(payload.data));
          notifyListeners();
        }
      } catch {}
    });

    es.addEventListener('settings', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.data) {
          localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(payload.data));
          notifyListeners();
        }
      } catch {}
    });

    es.addEventListener('orders', () => {
      syncOrdersFromServer();
    });

    es.onerror = () => {
      es.close();
      // Auto-reconnect after 3 seconds
      setTimeout(initRealtimeSync, 3000);
    };
  } catch {
    setTimeout(initRealtimeSync, 5000);
  }
}

// Start real-time sync & polling in browser
if (typeof window !== 'undefined') {
  setTimeout(() => {
    syncProductsFromServer();
    syncBannersFromServer();
    syncOrdersFromServer();
    initRealtimeSync();

    // Fast polling fallback (every 2.5s) to guarantee instant reflection even if SSE drops
    setInterval(checkVersionsFromServer, 2500);
    setInterval(syncOrdersFromServer, 3500);
  }, 400);
}

export const StoreService = {
  // PRODUCTS
  getProducts(): Product[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
        return INITIAL_PRODUCTS;
      }
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      return INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  },

  getProductById(id: string): Product | undefined {
    return this.getProducts().find((p) => p.id === id);
  },

  saveProduct(product: Product): void {
    const products = this.getProducts();
    const index = products.findIndex((p) => p.id === product.id);
    if (index >= 0) {
      products[index] = product;
    } else {
      products.unshift(product);
    }
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    notifyListeners();

    // Sync to server database
    fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products }),
    }).catch(() => {});
  },

  deleteProduct(id: string): void {
    const products = this.getProducts().filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    notifyListeners();

    // Sync deletion to server database
    fetch(`/api/products/${id}`, { method: 'DELETE' }).catch(() => {});
    fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products }),
    }).catch(() => {});
  },

  // Delete all initial sample products directly from app screen
  deleteSampleProducts(): number {
    const initialIds = new Set(INITIAL_PRODUCTS.map((p) => p.id));
    const current = this.getProducts();
    const filtered = current.filter((p) => !initialIds.has(p.id) && !p.id.startsWith('prod-sample'));
    const deletedCount = current.length - filtered.length;

    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(filtered));
    notifyListeners();

    // Sync remaining products to server database
    fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products: filtered }),
    }).catch(() => {});

    return deletedCount;
  },

  // CATEGORIES
  getCategories(): Category[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
        return INITIAL_CATEGORIES;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_CATEGORIES;
    }
  },

  saveCategory(category: Category): void {
    const categories = this.getCategories();
    const index = categories.findIndex((c) => c.id === category.id);
    if (index >= 0) {
      categories[index] = category;
    } else {
      categories.push(category);
    }
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    notifyListeners();

    fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categories }),
    }).catch(() => {});
  },

  deleteCategory(id: string): void {
    const categories = this.getCategories().filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    notifyListeners();

    fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categories }),
    }).catch(() => {});
  },

  // BANNERS (Hero Box Promotional Offers)
  getBanners(): Banner[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BANNERS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.BANNERS, JSON.stringify(INITIAL_BANNERS));
        return INITIAL_BANNERS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_BANNERS;
    }
  },

  saveBanner(banner: Banner): void {
    const banners = this.getBanners();
    const index = banners.findIndex((b) => b.id === banner.id);
    if (index >= 0) {
      banners[index] = banner;
    } else {
      banners.unshift(banner);
    }
    localStorage.setItem(STORAGE_KEYS.BANNERS, JSON.stringify(banners));
    notifyListeners();

    // Instant real-time broadcast to all customers across all devices
    fetch('/api/banners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ banners }),
    }).catch(() => {});
  },

  deleteBanner(id: string): void {
    const banners = this.getBanners().filter((b) => b.id !== id);
    localStorage.setItem(STORAGE_KEYS.BANNERS, JSON.stringify(banners));
    notifyListeners();

    // Instant deletion broadcast to all customers
    fetch(`/api/banners/${id}`, { method: 'DELETE' }).catch(() => {});
    fetch('/api/banners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ banners }),
    }).catch(() => {});
  },

  // SETTINGS
  getSettings(): StoreSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
        return INITIAL_SETTINGS;
      }
      const parsed = JSON.parse(data);
      if (!parsed.emiMinAmount || parsed.emiMinAmount === 999 || parsed.emiMinAmount === 3000) {
        parsed.emiMinAmount = 5000;
      }
      if (!parsed.emiDownPaymentPercent) {
        parsed.emiDownPaymentPercent = 33;
      }
      if (!parsed.emiTenures || parsed.emiTenures.some((t: number) => t > 3)) {
        parsed.emiTenures = [2, 3];
      }
      return { ...INITIAL_SETTINGS, ...parsed, emiMinAmount: parsed.emiMinAmount || 5000, emiDownPaymentPercent: parsed.emiDownPaymentPercent || 33 };
    } catch {
      return INITIAL_SETTINGS;
    }
  },

  saveSettings(settings: StoreSettings): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    notifyListeners();

    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings }),
    }).catch(() => {});
  },

  // ORDERS
  getOrders(): Order[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ORDERS);
      if (!data) {
        // Seed an initial demo order so admin has a realistic preview immediately
        const initialOrder: Order = {
          id: 'ord-sample-101',
          orderNumber: 'AF-89412',
          createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
          customer: {
            name: 'Vikram Singh Thakur',
            mobile: '9826198421',
            address: 'Near Old Bus Stand, Ward 4',
            city: 'Chhuikhadan',
            state: 'Chhattisgarh',
            pincode: '491885',
          },
          items: [
            {
              productId: 'prod-1',
              productName: 'Royal Oxford Luxury Cotton Shirt',
              image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&auto=format&fit=crop&q=80',
              selectedSize: '40',
              quantity: 1,
              unitPrice: 999,
              unitMrp: 1999,
              totalPrice: 999,
            },
          ],
          subtotal: 999,
          deliveryFee: 0,
          discount: 0,
          totalAmount: 999,
          paymentMethod: 'cod',
          paymentStatus: 'Pending',
          orderStatus: 'Confirmed',
          notes: 'Call before delivery',
        };
        const initialOrders = [initialOrder];
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(initialOrders));
        return initialOrders;
      }
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  getOrderById(id: string): Order | undefined {
    return this.getOrders().find((o) => o.id === id || o.orderNumber === id);
  },

  createOrder(payload: {
    customer: CustomerAddress;
    items: OrderItem[];
    subtotal: number;
    deliveryFee: number;
    discount: number;
    totalAmount: number;
    paymentMethod: PaymentMethod;
    paymentStatus: 'Pending' | 'Paid';
    notes?: string;
    emiDetails?: { tenure: string; monthlyInstallment: number; providerNote: string };
  }): Order {
    const orders = this.getOrders();
    const randNum = Math.floor(10000 + Math.random() * 90000);
    const orderNumber = `AF-${randNum}`;
    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber,
      createdAt: new Date().toISOString(),
      customer: payload.customer,
      items: payload.items,
      subtotal: payload.subtotal,
      deliveryFee: payload.deliveryFee,
      discount: payload.discount,
      totalAmount: payload.totalAmount,
      paymentMethod: payload.paymentMethod,
      paymentStatus: payload.paymentStatus,
      orderStatus: 'Pending',
      notes: payload.notes,
      emiDetails: payload.emiDetails,
    };

    // Inventory management: automatically reduce stock
    const products = this.getProducts();
    payload.items.forEach((item) => {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        prod.stock = Math.max(0, prod.stock - item.quantity);
      }
    });
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));

    // Save order
    orders.unshift(newOrder);
    knownOrderIds.add(newOrder.id);
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));

    // Save to server database
    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOrder),
    }).catch((err) => console.warn('Server order sync error:', err));

    // Dispatch background Push, SMS, and WhatsApp alerts to store owner
    try {
      NotificationService.dispatchNewOrderAlert(newOrder);
    } catch (notifyErr) {
      console.warn('Order notification dispatch error:', notifyErr);
    }

    notifyListeners();
    return newOrder;
  },

  updateOrderStatus(orderId: string, newStatus: OrderStatus): void {
    const orders = this.getOrders();
    const orderIndex = orders.findIndex((o) => o.id === orderId);
    if (orderIndex < 0) return;

    const previousStatus = orders[orderIndex].orderStatus;
    orders[orderIndex].orderStatus = newStatus;

    // Sync to server API
    fetch(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    }).catch((err) => console.warn('Server status sync error:', err));

    // Inventory handling:
    // If order was cancelled and wasn't previously cancelled, restore stock
    if (newStatus === 'Cancelled' && previousStatus !== 'Cancelled') {
      const products = this.getProducts();
      orders[orderIndex].items.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId);
        if (prod) {
          prod.stock += item.quantity;
        }
      });
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    }
    // If order was resurrected from cancelled, reduce stock again
    else if (previousStatus === 'Cancelled' && newStatus !== 'Cancelled') {
      const products = this.getProducts();
      orders[orderIndex].items.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId);
        if (prod) {
          prod.stock = Math.max(0, prod.stock - item.quantity);
        }
      });
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    }

    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    notifyListeners();
  },

  // Reset database back to default initial seed
  resetDatabase(): void {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
    localStorage.setItem(STORAGE_KEYS.BANNERS, JSON.stringify(INITIAL_BANNERS));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
    localStorage.removeItem(STORAGE_KEYS.ORDERS);
    notifyListeners();

    fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products: INITIAL_PRODUCTS }),
    }).catch(() => {});

    fetch('/api/banners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ banners: INITIAL_BANNERS }),
    }).catch(() => {});
  },

  // ADMIN AUTHENTICATION
  isAdminLoggedIn(): boolean {
    return sessionStorage.getItem(STORAGE_KEYS.ADMIN_AUTH) === 'true';
  },

  loginAdmin(pin: string): boolean {
    const settings = this.getSettings();
    if (pin.trim() === settings.adminPin.trim()) {
      sessionStorage.setItem(STORAGE_KEYS.ADMIN_AUTH, 'true');
      return true;
    }
    return false;
  },

  logoutAdmin(): void {
    sessionStorage.removeItem(STORAGE_KEYS.ADMIN_AUTH);
  },

  async syncWithServerNow(): Promise<void> {
    await syncOrdersFromServer();
  },
};
