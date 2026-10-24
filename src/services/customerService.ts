import { CartItem, CustomerProfile, Order } from '../types';
import { apiUrl } from '../utils/apiConfig';

const CUSTOMER_SESSION_KEY = 'abhi_fashion_customer_session_v1';
type CustomerListener = (customer: CustomerProfile | null) => void;
const listeners: Set<CustomerListener> = new Set();

function notifyCustomerListeners(customer: CustomerProfile | null) {
  listeners.forEach((listener) => {
    try {
      listener(customer);
    } catch (e) {
      console.error('Customer listener error:', e);
    }
  });
}

export const CustomerService = {
  // Get currently logged-in customer profile from local storage
  getCurrentCustomer(): CustomerProfile | null {
    try {
      const data = localStorage.getItem(CUSTOMER_SESSION_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  // Check if customer is logged in
  isLoggedIn(): boolean {
    const cust = this.getCurrentCustomer();
    return !!(cust && cust.mobile && cust.mobile.length === 10);
  },

  // Subscribe to customer login/logout/profile changes
  subscribe(listener: CustomerListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  // Login with mobile number and optional name
  async login(
    mobile: string,
    name?: string
  ): Promise<{ success: boolean; customer: CustomerProfile; orders: Order[]; message?: string }> {
    const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
    if (cleanMobile.length !== 10) {
      throw new Error('Kripya 10 ankon ka valid mobile number darj karein.');
    }

    try {
      const res = await fetch(apiUrl('/api/customer/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: cleanMobile, name: name?.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Login failed. Kripya punah prayas karein.');
      }

      const data = await res.json();
      const customer: CustomerProfile = data.customer;
      const orders: Order[] = data.orders || [];

      // Save active session locally
      localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(customer));
      notifyCustomerListeners(customer);

      return {
        success: true,
        customer,
        orders,
      };
    } catch (networkErr: any) {
      // Offline fallback: if network is offline, save local customer profile
      console.warn('Network login error, falling back to local storage:', networkErr);
      const fallbackCustomer: CustomerProfile = {
        mobile: cleanMobile,
        name: name?.trim() || 'Valued Customer',
        city: 'Chhuikhadan',
        state: 'Chhattisgarh',
        pincode: '491885',
        lastLoginAt: new Date().toISOString(),
      };
      localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(fallbackCustomer));
      notifyCustomerListeners(fallbackCustomer);
      return {
        success: true,
        customer: fallbackCustomer,
        orders: [],
      };
    }
  },

  // Refresh customer profile and get their cloud orders
  async refreshProfile(mobile?: string): Promise<{ customer: CustomerProfile | null; orders: Order[] }> {
    const active = this.getCurrentCustomer();
    const targetMobile = mobile || active?.mobile;
    if (!targetMobile) return { customer: null, orders: [] };

    const cleanMobile = targetMobile.replace(/\D/g, '').slice(-10);
    try {
      const res = await fetch(`/api/customer/profile?mobile=${cleanMobile}`);
      if (!res.ok) return { customer: active, orders: [] };

      const data = await res.json();
      if (data.customer) {
        localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(data.customer));
        notifyCustomerListeners(data.customer);
      }
      return {
        customer: data.customer || active,
        orders: data.orders || [],
      };
    } catch {
      return { customer: active, orders: [] };
    }
  },

  // Sync customer details (e.g. shipping address, cart, etc.) to the server
  async syncCustomer(updates: Partial<CustomerProfile>): Promise<CustomerProfile | null> {
    const current = this.getCurrentCustomer();
    if (!current) return null;

    const merged: CustomerProfile = {
      ...current,
      ...updates,
      mobile: current.mobile,
    };

    localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(merged));
    notifyCustomerListeners(merged);

    // Sync to server in background
    try {
      await fetch(apiUrl('/api/customer/sync'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged),
      });
    } catch (e) {
      console.warn('Failed to sync customer updates to server:', e);
    }

    return merged;
  },

  // Save current cart to customer profile on server
  async syncCartToServer(cart: CartItem[]): Promise<void> {
    const current = this.getCurrentCustomer();
    if (!current || !current.mobile) return;

    try {
      await fetch(apiUrl('/api/customer/sync'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile: current.mobile,
          cart,
        }),
      });
    } catch (e) {
      // Silent catch
    }
  },

  // Logout
  logout(): void {
    localStorage.removeItem(CUSTOMER_SESSION_KEY);
    notifyCustomerListeners(null);
  },
};
