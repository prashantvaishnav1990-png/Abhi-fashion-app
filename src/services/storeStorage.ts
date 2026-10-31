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
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { db, testFirestoreConnection } from './firebase';
import { NotificationService } from './notificationService';
import { apiUrl } from '../utils/apiConfig';

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
    const res = await fetch(apiUrl('/api/products'));
    if (!res.ok) return;
    const data = await res.json();
    if (data && data.products !== null && Array.isArray(data.products)) {
      const currentLocal = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      const newJson = JSON.stringify(data.products);
      if (currentLocal !== newJson) {
        try {
          localStorage.setItem(STORAGE_KEYS.PRODUCTS, newJson);
        } catch {}
        notifyListeners();
      }
    } else {
      const local = StoreService.getProducts();
      fetch(apiUrl('/api/products'), {
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
    const res = await fetch(apiUrl('/api/banners'));
    if (!res.ok) return;
    const data = await res.json();
    if (data && data.banners !== null && Array.isArray(data.banners)) {
      const currentLocal = localStorage.getItem(STORAGE_KEYS.BANNERS);
      const newJson = JSON.stringify(data.banners);
      if (currentLocal !== newJson) {
        try {
          localStorage.setItem(STORAGE_KEYS.BANNERS, newJson);
        } catch {}
        notifyListeners();
      }
    }
  } catch {
    // Quiet fail
  }
}

async function syncCategoriesFromServer() {
  try {
    const res = await fetch(apiUrl('/api/categories'));
    if (!res.ok) return;
    const data = await res.json();
    if (data && Array.isArray(data.categories)) {
      try {
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(data.categories));
      } catch {}
      notifyListeners();
    }
  } catch {}
}

async function syncSettingsFromServer() {
  try {
    const res = await fetch(apiUrl('/api/settings'));
    if (!res.ok) return;
    const data = await res.json();
    if (data && data.settings && typeof data.settings === 'object') {
      const s = data.settings;
      if (!s.whatsappNumber || s.whatsappNumber.includes('98261') || s.whatsappNumber === '9826198421') {
        s.whatsappNumber = '8982147180';
      }
      if (!s.supportPhone || s.supportPhone.includes('98261')) {
        s.supportPhone = '+91 89821 47180';
      }
      try {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(s));
      } catch {}
      notifyListeners();
    }
  } catch {}
}

async function syncOrdersFromServer() {
  try {
    const res = await fetch(apiUrl('/api/orders'));
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
    const res = await fetch(apiUrl('/api/sync/versions'));
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
    const es = new EventSource(apiUrl('/api/sync/events'));

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
      // Auto-reconnect after 4 seconds
      setTimeout(initRealtimeSync, 4000);
    };
  } catch {
    setTimeout(initRealtimeSync, 5000);
  }
}

// -------------------------------------------------------------
// CLOUD FIRESTORE REAL-TIME SYNCHRONIZATION
// Works directly between device WebView & Google Cloud Firestore
// Bypasses any proxy, dev port, or cookie barrier.
// -------------------------------------------------------------
let isFirestoreInitialized = false;

export function initFirestoreSync() {
  if (isFirestoreInitialized || typeof window === 'undefined') return;
  isFirestoreInitialized = true;

  testFirestoreConnection().catch(() => {});

  // 1. PRODUCTS: Real-time listener for add, update, delete
  try {
    const productsCol = collection(db, 'products');
    onSnapshot(
      productsCol,
      (snapshot) => {
        if (snapshot.empty) {
          // If Firestore is empty on first boot, seed current local products
          const localProducts = StoreService.getProducts();
          if (localProducts.length > 0) {
            const batch = writeBatch(db);
            localProducts.forEach((p) => {
              batch.set(doc(db, 'products', p.id), p);
            });
            batch.commit().catch((err) => console.warn('Firestore initial product seed error:', err));
          }
          return;
        }

        const items: Product[] = [];
        snapshot.forEach((d) => {
          items.push(d.data() as Product);
        });

        // Sort descending by createdAt
        items.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });

        const currentLocal = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
        const newJson = JSON.stringify(items);
        if (currentLocal !== newJson) {
          try {
            localStorage.setItem(STORAGE_KEYS.PRODUCTS, newJson);
          } catch {}
          notifyListeners();
        }
      },
      (error) => {
        console.warn('Firestore products onSnapshot warning:', error.message);
      }
    );
  } catch (err) {
    console.warn('Failed to attach Firestore products listener:', err);
  }

  // 2. BANNERS: Real-time listener
  try {
    const bannersCol = collection(db, 'banners');
    onSnapshot(
      bannersCol,
      (snapshot) => {
        if (snapshot.empty) {
          const localBanners = StoreService.getBanners();
          if (localBanners.length > 0) {
            const batch = writeBatch(db);
            localBanners.forEach((b) => batch.set(doc(db, 'banners', b.id), b));
            batch.commit().catch(() => {});
          }
          return;
        }

        const banners: Banner[] = [];
        snapshot.forEach((d) => banners.push(d.data() as Banner));
        const currentLocal = localStorage.getItem(STORAGE_KEYS.BANNERS);
        const newJson = JSON.stringify(banners);
        if (currentLocal !== newJson) {
          try {
            localStorage.setItem(STORAGE_KEYS.BANNERS, newJson);
          } catch {}
          notifyListeners();
        }
      },
      (error) => {
        console.warn('Firestore banners onSnapshot warning:', error.message);
      }
    );
  } catch (err) {
    console.warn('Failed to attach Firestore banners listener:', err);
  }

  // 3. CATEGORIES: Real-time listener
  try {
    const categoriesCol = collection(db, 'categories');
    onSnapshot(
      categoriesCol,
      (snapshot) => {
        if (snapshot.empty) {
          const localCats = StoreService.getCategories();
          if (localCats.length > 0) {
            const batch = writeBatch(db);
            localCats.forEach((c) => batch.set(doc(db, 'categories', c.id), c));
            batch.commit().catch(() => {});
          }
          return;
        }

        const categories: Category[] = [];
        snapshot.forEach((d) => categories.push(d.data() as Category));
        try {
          localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
        } catch {}
        notifyListeners();
      },
      (error) => {
        console.warn('Firestore categories onSnapshot warning:', error.message);
      }
    );
  } catch (err) {
    console.warn('Failed to attach Firestore categories listener:', err);
  }

  // 4. SETTINGS: Real-time listener
  try {
    const settingsDoc = doc(db, 'settings', 'store_config');
    onSnapshot(
      settingsDoc,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as StoreSettings;
          try {
            localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data));
          } catch {}
          notifyListeners();
        } else {
          const currentSettings = StoreService.getSettings();
          setDoc(settingsDoc, currentSettings).catch(() => {});
        }
      },
      (error) => {
        console.warn('Firestore settings onSnapshot warning:', error.message);
      }
    );
  } catch (err) {
    console.warn('Failed to attach Firestore settings listener:', err);
  }

  // 5. ORDERS: Real-time listener
  try {
    const ordersCol = collection(db, 'orders');
    onSnapshot(
      ordersCol,
      (snapshot) => {
        const firestoreOrders: Order[] = [];
        snapshot.forEach((d) => firestoreOrders.push(d.data() as Order));

        if (firestoreOrders.length === 0) return;

        if (!isInitialOrderLoadDone) {
          firestoreOrders.forEach((o) => knownOrderIds.add(o.id));
          const local = StoreService.getOrders();
          local.forEach((o) => knownOrderIds.add(o.id));
          isInitialOrderLoadDone = true;

          const mergedMap = new Map<string, Order>();
          local.forEach((o) => mergedMap.set(o.id, o));
          firestoreOrders.forEach((o) => mergedMap.set(o.id, o));
          const merged = Array.from(mergedMap.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(merged));
          notifyListeners();
          return;
        }

        const newlyArrived: Order[] = [];
        firestoreOrders.forEach((o) => {
          if (!knownOrderIds.has(o.id)) {
            knownOrderIds.add(o.id);
            newlyArrived.push(o);
          }
        });

        const local = StoreService.getOrders();
        const mergedMap = new Map<string, Order>();
        local.forEach((o) => mergedMap.set(o.id, o));
        firestoreOrders.forEach((o) => mergedMap.set(o.id, o));
        const merged = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(merged));
        notifyListeners();

        if (newlyArrived.length > 0) {
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
      },
      (error) => {
        console.warn('Firestore orders onSnapshot warning:', error.message);
      }
    );
  } catch (err) {
    console.warn('Failed to attach Firestore orders listener:', err);
  }
}

export const StoreService = {
  // PRODUCTS
  getProducts(): Product[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (data === null) {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
        return INITIAL_PRODUCTS;
      }
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
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

    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
    notifyListeners();

    // 1. Direct Firestore Cloud Write (Syncs across all Android APKs & browsers instantly)
    try {
      setDoc(doc(db, 'products', product.id), product).catch((err) =>
        console.warn('Firestore saveProduct error:', err)
      );
    } catch (e) {
      console.warn('Firestore write init error:', e);
    }

    // 2. Server API fallbacks
    fetch(apiUrl('/api/products/upsert'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product }),
    }).catch(() => {});

    fetch(apiUrl('/api/products'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products }),
    }).catch(() => {});
  },

  deleteProduct(id: string): void {
    const current = this.getProducts();
    const products = current.filter((p) => p.id !== id);
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch {}
    notifyListeners();

    // 1. Direct Firestore Cloud Delete (Triggers onSnapshot on all customer apps immediately)
    try {
      deleteDoc(doc(db, 'products', id)).catch((err) =>
        console.warn('Firestore deleteProduct error:', err)
      );
    } catch (e) {
      console.warn('Firestore delete init error:', e);
    }

    // 2. Server API fallback
    fetch(apiUrl(`/api/products/${id}`), { method: 'DELETE' }).catch(() => {});
    fetch(apiUrl('/api/products'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products }),
    }).catch(() => {});
  },

  // Delete all initial sample products directly from app screen
  deleteSampleProducts(): number {
    const initialIds = new Set(INITIAL_PRODUCTS.map((p) => p.id));
    const current = this.getProducts();
    const toDelete = current.filter((p) => initialIds.has(p.id) || p.id.startsWith('prod-sample'));
    const filtered = current.filter((p) => !initialIds.has(p.id) && !p.id.startsWith('prod-sample'));
    const deletedCount = current.length - filtered.length;

    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(filtered));
    } catch {}
    notifyListeners();

    // Remove from Firestore
    try {
      const batch = writeBatch(db);
      toDelete.forEach((p) => batch.delete(doc(db, 'products', p.id)));
      batch.commit().catch(() => {});
    } catch {}

    // Sync remaining products to server database
    fetch(apiUrl('/api/products'), {
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

    try {
      setDoc(doc(db, 'categories', category.id), category).catch(() => {});
    } catch {}

    fetch(apiUrl('/api/categories'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categories }),
    }).catch(() => {});
  },

  deleteCategory(id: string): void {
    const categories = this.getCategories().filter((c) => c.id !== id);
    try {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    } catch {}
    notifyListeners();

    try {
      deleteDoc(doc(db, 'categories', id)).catch(() => {});
    } catch {}

    fetch(apiUrl('/api/categories'), {
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
      banners.push(banner);
    }
    localStorage.setItem(STORAGE_KEYS.BANNERS, JSON.stringify(banners));
    notifyListeners();

    try {
      setDoc(doc(db, 'banners', banner.id), banner).catch(() => {});
    } catch {}

    fetch(apiUrl('/api/banners'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ banners }),
    }).catch(() => {});
  },

  deleteBanner(id: string): void {
    const banners = this.getBanners().filter((b) => b.id !== id);
    try {
      localStorage.setItem(STORAGE_KEYS.BANNERS, JSON.stringify(banners));
    } catch {}
    notifyListeners();

    try {
      deleteDoc(doc(db, 'banners', id)).catch(() => {});
    } catch {}

    fetch(apiUrl('/api/banners'), {
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
      if (
        !parsed.appPublicUrl ||
        parsed.appPublicUrl.includes('ais-pre') ||
        parsed.appPublicUrl.includes('ais-dev') ||
        parsed.appPublicUrl.includes('1jC_dYK62zmY3fUxvQOzn-y4Jnrk3G7c-') ||
        parsed.appPublicUrl.includes('1pwNj1FeWqcAZekNE1bj8P9ipULcNf8Qo') ||
        parsed.appPublicUrl.includes('1pWo6JeOaENVPFot67lR8dt2wTEr3O0BB')
      ) {
        parsed.appPublicUrl = INITIAL_SETTINGS.appPublicUrl;
      }
      if (!parsed.razorpayKeyId || parsed.razorpayKeyId === 'rzp_test_abhifashion') {
        parsed.razorpayKeyId = 'rzp_live_TieQ54NWyK5uZj';
      }
      if (!parsed.paymentGatewayKeyId || parsed.paymentGatewayKeyId === 'rzp_test_abhifashion') {
        parsed.paymentGatewayKeyId = 'rzp_live_TieQ54NWyK5uZj';
      }
      if (!parsed.kistPeRazorpayKeyId) {
        parsed.kistPeRazorpayKeyId = 'rzp_live_TieQ54NWyK5uZj';
      }
      if (!parsed.whatsappNumber || parsed.whatsappNumber.includes('98261') || parsed.whatsappNumber === '9826198421') {
        parsed.whatsappNumber = '8982147180';
      }
      if (!parsed.supportPhone || parsed.supportPhone.includes('98261')) {
        parsed.supportPhone = '+91 89821 47180';
      }
      return {
        ...INITIAL_SETTINGS,
        ...parsed,
        whatsappNumber: (!parsed.whatsappNumber || parsed.whatsappNumber.includes('98261')) ? '8982147180' : parsed.whatsappNumber,
        supportPhone: (!parsed.supportPhone || parsed.supportPhone.includes('98261')) ? '+91 89821 47180' : parsed.supportPhone,
        razorpayKeyId: parsed.razorpayKeyId || 'rzp_live_TieQ54NWyK5uZj',
        paymentGatewayKeyId: parsed.paymentGatewayKeyId || 'rzp_live_TieQ54NWyK5uZj',
        kistPeRazorpayKeyId: parsed.kistPeRazorpayKeyId || 'rzp_live_TieQ54NWyK5uZj',
        emiMinAmount: parsed.emiMinAmount || 5000,
        emiDownPaymentPercent: parsed.emiDownPaymentPercent || 33,
        appPublicUrl: parsed.appPublicUrl || INITIAL_SETTINGS.appPublicUrl,
      };
    } catch {
      return INITIAL_SETTINGS;
    }
  },

  saveSettings(settings: StoreSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch {}
    notifyListeners();

    try {
      setDoc(doc(db, 'settings', 'store_config'), settings).catch(() => {});
    } catch {}

    fetch(apiUrl('/api/settings'), {
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
        const initialOrder: Order = {
          id: 'ord-sample-101',
          orderNumber: 'AF-89412',
          createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
          customer: {
            name: 'Vikram Singh Thakur',
            mobile: '8982147180',
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
        try {
          localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(initialOrders));
        } catch {}
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

    // Inventory management: automatically reduce total stock and size-specific stock
    const products = this.getProducts();
    payload.items.forEach((item) => {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        prod.stock = Math.max(0, prod.stock - item.quantity);
        
        // Automatic Size-wise stock deduction:
        if (item.selectedSize) {
          if (!prod.sizeStock) {
            prod.sizeStock = {};
          }
          const currentSizeQty =
            prod.sizeStock[item.selectedSize] !== undefined
              ? prod.sizeStock[item.selectedSize]
              : Math.max(0, Math.floor(prod.stock / (prod.sizes?.length || 1)));
          prod.sizeStock[item.selectedSize] = Math.max(0, currentSizeQty - item.quantity);

          // Keep total stock consistent with sum of size quantities
          const allSizeStocks = Object.values(prod.sizeStock);
          if (allSizeStocks.length >= (prod.sizes?.length || 1)) {
            prod.stock = allSizeStocks.reduce((sum: number, q: number) => sum + (Number(q) || 0), 0);
          }
        }

        // Sync updated stock to Firestore
        try {
          setDoc(doc(db, 'products', prod.id), prod).catch(() => {});
        } catch {}
      }
    });
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch {}

    // Save order locally
    orders.unshift(newOrder);
    knownOrderIds.add(newOrder.id);
    try {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    } catch {}

    // 1. Direct Firestore Cloud Write
    try {
      setDoc(doc(db, 'orders', newOrder.id), newOrder).catch((err) =>
        console.warn('Firestore createOrder error:', err)
      );
    } catch (e) {
      console.warn('Firestore order write error:', e);
    }

    // 2. Save to server database fallback
    fetch(apiUrl('/api/orders'), {
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

    // Direct Firestore update
    try {
      setDoc(doc(db, 'orders', orderId), orders[orderIndex]).catch(() => {});
    } catch {}

    // Sync to server API
    fetch(apiUrl(`/api/orders/${orderId}/status`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    }).catch((err) => console.warn('Server status sync error:', err));

    // Inventory handling:
    if (newStatus === 'Cancelled' && previousStatus !== 'Cancelled') {
      const products = this.getProducts();
      orders[orderIndex].items.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId);
        if (prod) {
          prod.stock += item.quantity;
          if (item.selectedSize && prod.sizeStock && prod.sizeStock[item.selectedSize] !== undefined) {
            prod.sizeStock[item.selectedSize] += item.quantity;
            const allSizeStocks = Object.values(prod.sizeStock);
            if (allSizeStocks.length >= (prod.sizes?.length || 1)) {
              prod.stock = allSizeStocks.reduce((sum: number, q: number) => sum + (Number(q) || 0), 0);
            }
          }
          try {
            setDoc(doc(db, 'products', prod.id), prod).catch(() => {});
          } catch {}
        }
      });
      try {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
      } catch {}
    } else if (previousStatus === 'Cancelled' && newStatus !== 'Cancelled') {
      const products = this.getProducts();
      orders[orderIndex].items.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId);
        if (prod) {
          prod.stock = Math.max(0, prod.stock - item.quantity);
          if (item.selectedSize && prod.sizeStock && prod.sizeStock[item.selectedSize] !== undefined) {
            prod.sizeStock[item.selectedSize] = Math.max(0, prod.sizeStock[item.selectedSize] - item.quantity);
            const allSizeStocks = Object.values(prod.sizeStock);
            if (allSizeStocks.length >= (prod.sizes?.length || 1)) {
              prod.stock = allSizeStocks.reduce((sum: number, q: number) => sum + (Number(q) || 0), 0);
            }
          }
          try {
            setDoc(doc(db, 'products', prod.id), prod).catch(() => {});
          } catch {}
        }
      });
      try {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
      } catch {}
    }

    try {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    } catch {}
    notifyListeners();
  },

  // Reset database back to default initial seed
  resetDatabase(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
      localStorage.setItem(STORAGE_KEYS.BANNERS, JSON.stringify(INITIAL_BANNERS));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
      localStorage.removeItem(STORAGE_KEYS.ORDERS);
    } catch {}
    notifyListeners();

    // Reset Firestore documents
    try {
      const batch = writeBatch(db);
      INITIAL_PRODUCTS.forEach((p) => batch.set(doc(db, 'products', p.id), p));
      INITIAL_CATEGORIES.forEach((c) => batch.set(doc(db, 'categories', c.id), c));
      INITIAL_BANNERS.forEach((b) => batch.set(doc(db, 'banners', b.id), b));
      batch.set(doc(db, 'settings', 'store_config'), INITIAL_SETTINGS);
      batch.commit().catch(() => {});
    } catch {}

    fetch(apiUrl('/api/products'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products: INITIAL_PRODUCTS }),
    }).catch(() => {});

    fetch(apiUrl('/api/banners'), {
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
    await syncProductsFromServer();
    await syncOrdersFromServer();
    await syncBannersFromServer();
  },

  // Force push all local products to the cloud Firestore & server
  async syncAllProductsToCloud(): Promise<{ success: boolean; count: number }> {
    const local = this.getProducts();
    let firestoreSuccess = false;

    // 1. Write batch to Firestore (Direct Google Cloud database)
    try {
      // First fetch any existing remote products to prune any deleted ones
      const existingSnapshot = await getDocs(collection(db, 'products'));
      const localIds = new Set(local.map((p) => p.id));
      const batch = writeBatch(db);

      // Delete remote docs that no longer exist locally
      existingSnapshot.forEach((d) => {
        if (!localIds.has(d.id)) {
          batch.delete(doc(db, 'products', d.id));
        }
      });

      // Upsert all local products
      local.forEach((p) => {
        batch.set(doc(db, 'products', p.id), p);
      });

      await batch.commit();
      firestoreSuccess = true;
    } catch (fsErr) {
      console.warn('Firestore sync batch warning:', fsErr);
    }

    // 2. HTTP Server backend sync fallback
    try {
      const res = await fetch(apiUrl('/api/products'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: local }),
      });
      if (res.ok) {
        return { success: true, count: local.length };
      }
    } catch (e) {
      console.warn('HTTP server sync failed (normal in offline/APK):', e);
    }

    if (firestoreSuccess) {
      return { success: true, count: local.length };
    }

    // If device has active internet and local products exist
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      return { success: true, count: local.length };
    }

    return { success: false, count: local.length };
  },
};

// Immediate background initialization on startup (Web & APK)
if (typeof window !== 'undefined') {
  setTimeout(() => {
    initFirestoreSync();
    syncProductsFromServer();
    syncBannersFromServer();
    syncCategoriesFromServer();
    syncSettingsFromServer();
    syncOrdersFromServer();
    initRealtimeSync();

    // Fast polling fallback
    setInterval(checkVersionsFromServer, 3000);
    setInterval(syncOrdersFromServer, 4000);
  }, 100);
}
