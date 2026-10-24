import QRCode from 'qrcode';
import { Order, StoreSettings } from '../types';

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
    description?: string;
    notes?: Record<string, string>;
    onSuccess: (paymentId: string) => void;
    onDismiss?: () => void;
  }): Promise<boolean> {
    const isLoaded = await this.loadRazorpayScript();

    const keyId = params.settings.razorpayKeyId || params.settings.paymentGatewayKeyId || 'rzp_test_abhifashion';
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
        return true;
      } catch (err) {
        console.warn('Razorpay checkout initialization error:', err);
      }
    }

    return false;
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
