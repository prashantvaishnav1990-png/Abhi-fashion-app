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

// Background Server Sync
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

// Start polling in browser
if (typeof window !== 'undefined') {
  setTimeout(() => {
    syncOrdersFromServer();
    setInterval(syncOrdersFromServer, 3500);
  }, 1000);
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
      return JSON.parse(data);
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
  },

  deleteProduct(id: string): void {
    const products = this.getProducts().filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    notifyListeners();
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
  },

  deleteCategory(id: string): void {
    const categories = this.getCategories().filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    notifyListeners();
  },

  // BANNERS
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
  },

  deleteBanner(id: string): void {
    const banners = this.getBanners().filter((b) => b.id !== id);
    localStorage.setItem(STORAGE_KEYS.BANNERS, JSON.stringify(banners));
    notifyListeners();
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
      if (!parsed.emiMinAmount || parsed.emiMinAmount === 999) {
        parsed.emiMinAmount = 3000;
      }
      if (!parsed.emiTenures || parsed.emiTenures.some((t: number) => t > 3)) {
        parsed.emiTenures = [2, 3];
      }
      return { ...INITIAL_SETTINGS, ...parsed };
    } catch {
      return INITIAL_SETTINGS;
    }
  },

  saveSettings(settings: StoreSettings): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    notifyListeners();
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
