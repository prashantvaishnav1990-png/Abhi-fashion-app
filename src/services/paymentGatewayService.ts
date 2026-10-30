import QRCode from 'qrcode';
import { StoreSettings } from '../types';

export interface RazorpayOptions {
  key: string;
  amount: number; // in paise
  currency: string;
  name: string;
  description: string;
  image?: string;
  order_id?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  handler?: (response: {
    razorpay_payment_id: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
  }) => void;
  modal?: {
    ondismiss?: () => void;
    escape?: boolean;
    backdropclose?: boolean;
  };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open: () => void;
      on: (event: string, callback: (response: any) => void) => void;
    };
  }
}

export const PaymentGatewayService = {
  // Store default UPI ID
  getStoreUpiId(settings?: StoreSettings): string {
    return (
      settings?.collectUpiId ||
      settings?.upiMandateVpa ||
      settings?.kistPeUpiId ||
      '8982147180@ybl'
    ).trim();
  },

  // Generate UPI deep-link for specific or generic UPI apps
  getUpiDeepLink(params: {
    upiId?: string;
    amount: number;
    customerName?: string;
    storeName?: string;
    orderNumber?: string;
    note?: string;
    app?: 'gpay' | 'phonepe' | 'paytm' | 'bhim' | 'generic';
  }): string {
    const cleanUpi = (params.upiId || '8982147180@ybl').trim();
    const cleanAmount = params.amount.toFixed(2);
    const store = (params.storeName || 'ABHI FASHION').trim();
    const payeeName = encodeURIComponent(store);
    const noteText = (params.note || `Order Payment ${params.orderNumber || ''} - ${store}`).trim();
    const encodedNote = encodeURIComponent(noteText);

    // Standard UPI URI query string
    const query = `pa=${cleanUpi}&pn=${payeeName}&am=${cleanAmount}&cu=INR&tn=${encodedNote}`;

    switch (params.app) {
      case 'phonepe':
        return `phonepe://pay?${query}`;
      case 'paytm':
        return `paytmmp://pay?${query}`;
      case 'gpay':
        return `tez://upi/pay?${query}`;
      case 'bhim':
      case 'generic':
      default:
        return `upi://pay?${query}`;
    }
  },

  // Open UPI app on phone
  openUpiApp(params: {
    upiId?: string;
    amount: number;
    customerName?: string;
    storeName?: string;
    orderNumber?: string;
    note?: string;
    app?: 'gpay' | 'phonepe' | 'paytm' | 'bhim' | 'generic';
  }): boolean {
    const deepLink = this.getUpiDeepLink(params);
    const genericLink = this.getUpiDeepLink({ ...params, app: 'generic' });

    try {
      // First attempt target app URL
      window.location.href = deepLink;
      // Also fallback if protocol handler failed on some Android webviews
      setTimeout(() => {
        try {
          if (params.app !== 'generic') {
            window.location.href = genericLink;
          }
        } catch {}
      }, 500);
      return true;
    } catch (err) {
      console.warn('Could not open UPI deep link:', err);
      try {
        window.open(genericLink, '_blank');
        return true;
      } catch {
        return false;
      }
    }
  },

  // Generate high-resolution live UPI QR Code
  async generateUpiQrCode(params: {
    upiId?: string;
    amount: number;
    customerName?: string;
    storeName?: string;
    orderNumber?: string;
    note?: string;
  }): Promise<string> {
    const deepLink = this.getUpiDeepLink({
      ...params,
      app: 'generic',
    });

    try {
      const qrDataUrl = await QRCode.toDataURL(deepLink, {
        width: 320,
        margin: 1.5,
        color: {
          dark: '#0B132B',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'M',
      });
      return qrDataUrl;
    } catch (e) {
      console.error('Error generating UPI QR Code:', e);
      return '';
    }
  },

  // Dynamically load Razorpay SDK
  loadRazorpayScript(): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve(false);
        return;
      }
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const existingScript = document.querySelector('script[src*="checkout.razorpay.com"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(true));
        existingScript.addEventListener('error', () => resolve(false));
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => {
        console.warn('Could not load official Razorpay script from CDN.');
        resolve(false);
      };
      document.body.appendChild(script);
    });
  },

  // Open Razorpay Standard Checkout
  async openRazorpayPayment(params: {
    amount: number; // in Rupees
    customerName: string;
    customerMobile: string;
    settings: StoreSettings;
    customKeyId?: string;
    description?: string;
    notes?: Record<string, string>;
    onSuccess: (paymentId: string) => void;
    onDismiss?: () => void;
  }): Promise<{ opened: boolean; reason?: string }> {
    const keyId =
      params.customKeyId ||
      params.settings.kistPeRazorpayKeyId ||
      params.settings.razorpayKeyId ||
      params.settings.paymentGatewayKeyId ||
      '';

    // If key is a placeholder or not provided, report clear reason so UI can offer instant UPI/Card directly
    if (!keyId || keyId === 'rzp_test_abhifashion' || keyId.length < 10) {
      return { opened: false, reason: 'unconfigured_key' };
    }

    const isLoaded = await this.loadRazorpayScript();
    const amountInPaise = Math.round(params.amount * 100);

    if (isLoaded && window.Razorpay) {
      try {
        const rzp = new window.Razorpay({
          key: keyId,
          amount: amountInPaise,
          currency: 'INR',
          name: params.settings.storeName || 'ABHI FASHION',
          description: params.description || `Order Payment - ${params.customerName}`,
          image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&auto=format&fit=crop&q=80',
          prefill: {
            name: params.customerName,
            contact: params.customerMobile,
          },
          notes: {
            store: 'ABHI FASHION Chhuikhadan',
            ...params.notes,
          },
          theme: {
            color: '#D97706', // amber-600
          },
          handler: (response) => {
            params.onSuccess(response.razorpay_payment_id);
          },
          modal: {
            ondismiss: () => {
              if (params.onDismiss) params.onDismiss();
            },
          },
        });

        rzp.open();
        return { opened: true };
      } catch (err: any) {
        console.warn('Razorpay checkout initialization error:', err);
        return { opened: false, reason: err?.message || 'init_error' };
      }
    }

    return { opened: false, reason: 'script_not_loaded' };
  },

  // Generate Kist Pe dynamic UPI deep-link for instant down payment
  getKistPeDeepLink(params: {
    upiId: string;
    amount: number;
    customerName: string;
    orderNumber?: string;
  }): string {
    const cleanUpi = (params.upiId || '9826198421@kistpe').trim();
    const cleanAmount = params.amount.toFixed(2);
    const note = encodeURIComponent(`KistPe 33% DownPayment Order ${params.orderNumber || ''}`.trim());
    const payeeName = encodeURIComponent('ABHI FASHION');

    return `upi://pay?pa=${cleanUpi}&pn=${payeeName}&am=${cleanAmount}&cu=INR&tn=${note}`;
  },

  // Generate high-resolution Kist Pe Down Payment QR Code
  async generateKistPeQrCode(params: {
    upiId: string;
    amount: number;
    customerName: string;
    orderNumber?: string;
  }): Promise<string> {
    const deepLink = this.getKistPeDeepLink(params);
    try {
      const qrDataUrl = await QRCode.toDataURL(deepLink, {
        width: 320,
        margin: 1.5,
        color: {
          dark: '#0F172A',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'M',
      });
      return qrDataUrl;
    } catch (e) {
      console.error('Error generating Kist Pe QR Code:', e);
      return '';
    }
  },
};
