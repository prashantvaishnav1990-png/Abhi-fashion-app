import { Order } from '../types';

// Helper to convert base64 to Uint8Array for VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Synthesize pleasant order chime with Web Audio API
export function playOrderAlertSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // Tone 1: High crisp chime (880 Hz - A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.5);

    // Tone 2: Harmonious lower chime (1174.66 Hz - D6)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1174.66, now + 0.15);
    gain2.gain.setValueAtTime(0.35, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.8);

    // Tone 3: Rich closing bell (1760 Hz - A6)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(1760, now + 0.35);
    gain3.gain.setValueAtTime(0.4, now + 0.35);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.35);
    osc3.stop(now + 1.2);
  } catch (e) {
    console.warn('Audio alert could not play:', e);
  }
}

export interface NotificationStatus {
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
  isSubscribed: boolean;
}

export const NotificationService = {
  // Play chime sound
  playOrderAlertSound,

  // Check browser push status
  async getStatus(): Promise<NotificationStatus> {
    const supported =
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window;

    if (!supported) {
      return {
        supported: false,
        permission: 'unsupported',
        isSubscribed: false,
      };
    }

    let isSubscribed = false;
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        isSubscribed = !!sub;
      }
    } catch {
      isSubscribed = false;
    }

    return {
      supported: true,
      permission: Notification.permission,
      isSubscribed,
    };
  },

  // Subscribe current device to Web Push (Works when app is closed!)
  async subscribePush(): Promise<{ success: boolean; message: string }> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return {
        success: false,
        message: 'Push notifications are not supported by this browser.',
      };
    }

    try {
      // 1. Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return {
          success: false,
          message:
            permission === 'denied'
              ? 'Notification permission was denied in browser settings.'
              : 'Notification permission was dismissed.',
        };
      }

      // 2. Fetch VAPID public key from backend
      const vapidRes = await fetch('/api/push/vapid-public-key');
      if (!vapidRes.ok) {
        throw new Error('Failed to retrieve VAPID key from server');
      }
      const { publicKey } = await vapidRes.json();

      // 3. Get or register service worker
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw-push.js');
      }
      await navigator.serviceWorker.ready;

      // 4. Subscribe with PushManager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // 5. Save subscription to backend
      const subRes = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      });

      if (!subRes.ok) {
        throw new Error('Server could not save push subscription');
      }

      // Play chime to confirm activation
      playOrderAlertSound();

      return {
        success: true,
        message:
          'Push Notifications successfully enabled! You will now receive lock-screen alerts for new orders.',
      };
    } catch (err: any) {
      console.error('Push subscription failed:', err);
      return {
        success: false,
        message: err.message || 'Could not complete push subscription.',
      };
    }
  },

  // Send a test push notification
  async sendTestPush(): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('/api/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '🛍️ ABHI FASHION - Push Notification Test',
          body: 'Order notification setup active hai! App band hone par bhi naye order ka alert aayega.',
        }),
      });
      const data = await res.json();
      playOrderAlertSound();
      return {
        success: true,
        message: data.message || 'Push notification sent to your device!',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Failed to trigger test push notification.',
      };
    }
  },

  // Dispatch all notifications (Push, SMS, WhatsApp) on new order
  async dispatchNewOrderAlert(order: Order): Promise<any> {
    // 1. Play in-app audio chime if window is active
    playOrderAlertSound();

    // 2. Local Service Worker fallback notification if active
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          title: `🛍️ Naya Order: ${order.orderNumber} (₹${order.totalAmount})`,
          body: `${order.customer.name} - ${order.customer.city} • ${order.items.length} items`,
          url: `/?tab=admin&orderId=${order.id}`,
        });
      }
    } catch (e) {
      console.warn('Local service worker message error:', e);
    }

    // 3. Central backend broadcast (Web Push to all subscribed devices + SMS + WhatsApp)
    try {
      const res = await fetch('/api/notify/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Backend notification dispatch error:', err);
    }

    return null;
  },

  // Test SMS Gateway
  async testSms(phone: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('/api/notify/test-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'SMS test request failed.' };
    }
  },

  // Test WhatsApp Gateway
  async testWhatsApp(phone: string): Promise<{ success: boolean; message: string; waUrl?: string }> {
    try {
      const res = await fetch('/api/notify/test-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'WhatsApp test request failed.' };
    }
  },

  // Fetch notification audit logs
  async getLogs(): Promise<any[]> {
    try {
      const res = await fetch('/api/notifications/logs');
      if (res.ok) {
        const data = await res.json();
        return data.logs || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  // Fetch backend notification settings
  async getConfig(): Promise<any> {
    try {
      const res = await fetch('/api/notifications/config');
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch {
      return null;
    }
  },

  // Save backend notification settings
  async saveConfig(config: any): Promise<boolean> {
    try {
      const res = await fetch('/api/notifications/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  // Generate 1-tap direct WhatsApp link
  formatWhatsAppReceipt(order: Order, storeName: string, ownerNumber: string): string {
    const cleanPhone = ownerNumber.replace(/\D/g, '');
    const itemLines = order.items
      .map(
        (it, i) =>
          `${i + 1}. *${it.productName}* (${it.selectedSize}) x ${it.quantity} = ₹${it.totalPrice}`
      )
      .join('\n');

    const isEmi = order.paymentMethod === 'emi' || order.paymentMethod === 'upi_mandate' || !!order.emiDetails;
    const upiId = order.emiDetails?.mandateUpiId || order.customer.upiId;

    const emiBlock = isEmi
      ? `\n⚡ *EASY EMI ORDER (UPI MANDATE):*
• *Customer UPI ID:* \`${upiId || 'Provided at checkout'}\` 👈 (Copy to UPI App)
• *Tenure:* ${order.emiDetails?.tenure || '3 Months'}
• *Monthly EMI:* ₹${order.emiDetails?.monthlyInstallment || Math.round(order.totalAmount / 3)}/month
• *Next Step:* Customer ke is UPI ID par monthly request/mandate send karein.`
      : '';

    const msg = `🛍️ *NEW ORDER - ${storeName}*
---------------------------------------
*Order ID:* ${order.orderNumber}
*Customer:* ${order.customer.name}
*Mobile:* +91 ${order.customer.mobile}
*Address:* ${order.customer.address}, ${order.customer.city} - ${order.customer.pincode}${emiBlock}

*Items:*
${itemLines}

*Total Payable:* ₹${order.totalAmount} (${order.paymentMethod.toUpperCase()})
*Payment Status:* ${order.paymentStatus}
*Order Status:* ${order.orderStatus}
${order.notes ? `*Notes:* ${order.notes}\n` : ''}---------------------------------------
Aapka order confirm karne ke liye ye message bheja gaya hai.`;

    return `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`;
  },

  // Generate 1-tap direct SMS link
  formatSmsLink(order: Order, ownerNumber: string): string {
    const cleanPhone = ownerNumber.replace(/\D/g, '').slice(-10);
    const isEmi = order.paymentMethod === 'emi' || order.paymentMethod === 'upi_mandate' || !!order.emiDetails;
    const upiId = order.emiDetails?.mandateUpiId || order.customer.upiId;
    const emiNote = isEmi && upiId ? ` [EMI UPI: ${upiId}]` : '';

    const body = `ABHI FASHION Order #${order.orderNumber} placed. Rs.${order.totalAmount} by ${order.customer.name} (+91${order.customer.mobile})${emiNote}, ${order.customer.city}. Total items: ${order.items.length}.`;
    return `sms:+91${cleanPhone}?body=${encodeURIComponent(body)}`;
  },
};
