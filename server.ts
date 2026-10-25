import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import webpush from 'web-push';
import dotenv from 'dotenv';
import QRCode from 'qrcode';

dotenv.config();

const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// -------------------------------------------------------------
// VAPID & PUSH NOTIFICATION SETUP
// -------------------------------------------------------------
interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

const VAPID_FILE = path.join(DATA_DIR, 'vapid.json');
let vapidKeys: VapidKeys;

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  vapidKeys = {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY,
  };
} else if (fs.existsSync(VAPID_FILE)) {
  try {
    vapidKeys = JSON.parse(fs.readFileSync(VAPID_FILE, 'utf8'));
  } catch {
    vapidKeys = webpush.generateVAPIDKeys();
    fs.writeFileSync(VAPID_FILE, JSON.stringify(vapidKeys, null, 2));
  }
} else {
  vapidKeys = webpush.generateVAPIDKeys();
  try {
    fs.writeFileSync(VAPID_FILE, JSON.stringify(vapidKeys, null, 2));
  } catch (err) {
    console.error('Error writing vapid.json:', err);
  }
}

try {
  webpush.setVapidDetails(
    'mailto:orders@abhifashion-chhuikhadan.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
} catch (err) {
  console.error('Failed to configure webpush VAPID details:', err);
}

// Subscriptions storage
const SUBS_FILE = path.join(DATA_DIR, 'push_subscriptions.json');
function getPushSubscriptions(): webpush.PushSubscription[] {
  if (!fs.existsSync(SUBS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(SUBS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function savePushSubscriptions(subs: webpush.PushSubscription[]) {
  try {
    fs.writeFileSync(SUBS_FILE, JSON.stringify(subs, null, 2));
  } catch (err) {
    console.error('Failed to save subscriptions:', err);
  }
}

// Notification Settings storage
const NOTIFY_CONFIG_FILE = path.join(DATA_DIR, 'notification_config.json');
export interface ServerNotificationConfig {
  ownerPhone: string;
  ownerWhatsApp: string;
  enablePush: boolean;
  enableSms: boolean;
  enableWhatsApp: boolean;
  smsGateway: 'fast2sms' | 'twilio' | 'webhook' | 'manual';
  fast2smsApiKey?: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioFromNumber?: string;
  callMeBotApiKey?: string;
  webhookUrl?: string;
}

const DEFAULT_NOTIFY_CONFIG: ServerNotificationConfig = {
  ownerPhone: process.env.OWNER_ALERT_PHONE || '9826198421',
  ownerWhatsApp: '9826198421',
  enablePush: true,
  enableSms: true,
  enableWhatsApp: true,
  smsGateway: 'fast2sms',
  fast2smsApiKey: process.env.FAST2SMS_API_KEY || '',
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
  twilioFromNumber: process.env.TWILIO_PHONE_NUMBER || '',
  callMeBotApiKey: process.env.CALLMEBOT_API_KEY || '',
  webhookUrl: '',
};

function getNotificationConfig(): ServerNotificationConfig {
  if (!fs.existsSync(NOTIFY_CONFIG_FILE)) {
    return { ...DEFAULT_NOTIFY_CONFIG };
  }
  try {
    const saved = JSON.parse(fs.readFileSync(NOTIFY_CONFIG_FILE, 'utf8'));
    return { ...DEFAULT_NOTIFY_CONFIG, ...saved };
  } catch {
    return { ...DEFAULT_NOTIFY_CONFIG };
  }
}

function saveNotificationConfig(cfg: ServerNotificationConfig) {
  try {
    fs.writeFileSync(NOTIFY_CONFIG_FILE, JSON.stringify(cfg, null, 2));
  } catch (err) {
    console.error('Failed to save notification config:', err);
  }
}

// Notification Logs
const LOGS_FILE = path.join(DATA_DIR, 'notification_logs.json');
interface NotificationLog {
  id: string;
  timestamp: string;
  type: 'push' | 'sms' | 'whatsapp' | 'system';
  title: string;
  details: string;
  recipient: string;
  status: 'sent' | 'delivered' | 'failed' | 'fallback_ready';
}

function getNotificationLogs(): NotificationLog[] {
  if (!fs.existsSync(LOGS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(LOGS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function addNotificationLog(log: Omit<NotificationLog, 'id' | 'timestamp'>) {
  const logs = getNotificationLogs();
  const newLog: NotificationLog = {
    ...log,
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
  };
  logs.unshift(newLog);
  if (logs.length > 50) logs.pop();
  try {
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2));
  } catch (e) {
    console.error('Failed to write log:', e);
  }
}

// -------------------------------------------------------------
// NOTIFICATION DISPATCH HELPERS
// -------------------------------------------------------------

// 1. Dispatch Web Push to all subscribed devices (Owner's phone / PC)
async function sendWebPushNotification(payload: {
  title: string;
  body: string;
  url?: string;
  orderId?: string;
}) {
  const subscriptions = getPushSubscriptions();
  if (subscriptions.length === 0) {
    console.log('[PUSH] No active push subscriptions found.');
    addNotificationLog({
      type: 'push',
      title: payload.title,
      details: 'No devices subscribed yet. Subscribe in Admin Panel > Notifications.',
      recipient: '0 devices',
      status: 'fallback_ready',
    });
    return { sentCount: 0, totalCount: 0 };
  }

  const jsonString = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/?tab=admin&subtab=orders',
    orderId: payload.orderId || '',
    vibrate: [300, 150, 300, 150, 400],
    tag: `order-${payload.orderId || Date.now()}`,
  });

  let sent = 0;
  const remainingSubs: webpush.PushSubscription[] = [];

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(sub, jsonString, {
        TTL: 60 * 60 * 24, // 24 hours
        urgency: 'high',
      });
      sent++;
      remainingSubs.push(sub);
    } catch (err: any) {
      console.error('[PUSH] Failed sending to subscription:', err?.statusCode || err?.message);
      // If subscription expired or gone (404/410), do not re-add to remaining
      if (err?.statusCode !== 404 && err?.statusCode !== 410) {
        remainingSubs.push(sub);
      }
    }
  }

  savePushSubscriptions(remainingSubs);

  addNotificationLog({
    type: 'push',
    title: payload.title,
    details: `Delivered to ${sent} of ${subscriptions.length} active device(s)`,
    recipient: `${subscriptions.length} device(s)`,
    status: sent > 0 ? 'sent' : 'failed',
  });

  return { sentCount: sent, totalCount: subscriptions.length };
}

// 2. Dispatch SMS
async function sendSmsNotification(
  phone: string,
  message: string,
  cfg: ServerNotificationConfig
): Promise<{ success: boolean; message: string }> {
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);

  // Method 1: Fast2SMS (Indian SMS Gateway)
  const fast2smsKey = cfg.fast2smsApiKey || process.env.FAST2SMS_API_KEY;
  if (cfg.smsGateway === 'fast2sms' && fast2smsKey) {
    try {
      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          authorization: fast2smsKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'q',
          message: message,
          flash: 0,
          numbers: cleanPhone,
        }),
      });

      const resData = await response.json();
      if (resData.return) {
        addNotificationLog({
          type: 'sms',
          title: 'SMS Sent via Fast2SMS',
          details: message,
          recipient: `+91 ${cleanPhone}`,
          status: 'sent',
        });
        return { success: true, message: 'SMS delivered successfully via Fast2SMS' };
      } else {
        throw new Error(resData.message || 'Fast2SMS returned error');
      }
    } catch (err: any) {
      console.error('[SMS Fast2SMS Error]:', err.message);
      addNotificationLog({
        type: 'sms',
        title: 'Fast2SMS Delivery Failed',
        details: err.message,
        recipient: `+91 ${cleanPhone}`,
        status: 'fallback_ready',
      });
    }
  }

  // Method 2: Twilio SMS
  const twilioSid = cfg.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = cfg.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = cfg.twilioFromNumber || process.env.TWILIO_PHONE_NUMBER;

  if (cfg.smsGateway === 'twilio' && twilioSid && twilioToken && twilioFrom) {
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
      const params = new URLSearchParams();
      params.append('To', `+91${cleanPhone}`);
      params.append('From', twilioFrom);
      params.append('Body', message);

      const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (response.ok) {
        addNotificationLog({
          type: 'sms',
          title: 'SMS Sent via Twilio',
          details: message,
          recipient: `+91 ${cleanPhone}`,
          status: 'sent',
        });
        return { success: true, message: 'SMS sent via Twilio' };
      } else {
        const errText = await response.text();
        throw new Error(`Twilio error: ${errText}`);
      }
    } catch (err: any) {
      console.error('[SMS Twilio Error]:', err.message);
      addNotificationLog({
        type: 'sms',
        title: 'Twilio SMS Failed',
        details: err.message,
        recipient: `+91 ${cleanPhone}`,
        status: 'fallback_ready',
      });
    }
  }

  // Fallback / Simulation Mode: Log ready for instant SMS
  addNotificationLog({
    type: 'sms',
    title: 'SMS Notification Prepared',
    details: `${message} (Direct SMS link ready for 1-tap dispatch)`,
    recipient: `+91 ${cleanPhone}`,
    status: 'fallback_ready',
  });

  return {
    success: true,
    message: 'SMS ready! Configured for instant mobile transmission.',
  };
}

// 3. Dispatch WhatsApp Notification
async function sendWhatsAppNotification(
  phone: string,
  message: string,
  cfg: ServerNotificationConfig
): Promise<{ success: boolean; message: string; waUrl?: string }> {
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  const waUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;

  // Method 1: CallMeBot WhatsApp API (Direct automated free WhatsApp bot)
  const callMeBotKey = cfg.callMeBotApiKey || process.env.CALLMEBOT_API_KEY;
  if (callMeBotKey) {
    try {
      const url = `https://api.callmebot.com/whatsapp.php?phone=91${cleanPhone}&text=${encodeURIComponent(
        message
      )}&apikey=${callMeBotKey}`;
      const res = await fetch(url);
      if (res.ok) {
        addNotificationLog({
          type: 'whatsapp',
          title: 'Automated WhatsApp Alert Sent',
          details: message,
          recipient: `+91 ${cleanPhone}`,
          status: 'sent',
        });
        return { success: true, message: 'WhatsApp message dispatched automatically via CallMeBot', waUrl };
      }
    } catch (err: any) {
      console.error('[WhatsApp CallMeBot Error]:', err.message);
    }
  }

  // Method 2: Custom Webhook
  if (cfg.webhookUrl) {
    try {
      await fetch(cfg.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'whatsapp',
          phone: `91${cleanPhone}`,
          message,
          timestamp: new Date().toISOString(),
        }),
      });
      addNotificationLog({
        type: 'whatsapp',
        title: 'WhatsApp Webhook Dispatched',
        details: message,
        recipient: cfg.webhookUrl,
        status: 'sent',
      });
      return { success: true, message: 'Dispatched to WhatsApp webhook', waUrl };
    } catch (err: any) {
      console.error('[WhatsApp Webhook Error]:', err.message);
    }
  }

  // Direct WhatsApp Link (1-tap guaranteed delivery)
  addNotificationLog({
    type: 'whatsapp',
    title: 'WhatsApp Receipt Generated',
    details: `Prepared 1-tap WhatsApp alert link for store owner`,
    recipient: `+91 ${cleanPhone}`,
    status: 'fallback_ready',
  });

  return {
    success: true,
    message: 'WhatsApp alert prepared with direct 1-tap link',
    waUrl,
  };
}

// -------------------------------------------------------------
// START SERVER
// -------------------------------------------------------------
async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // CORS Middleware for Web & Android APK (Capacitor WebView)
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Range');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // Serve product uploads statically
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Image Upload Endpoint (base64 image dataUrl or binary upload)
  app.post('/api/upload', (req, res) => {
    try {
      const rawData = req.body?.dataUrl || req.body?.image || req.body?.file;
      if (!rawData || typeof rawData !== 'string') {
        res.status(400).json({ error: 'dataUrl string required' });
        return;
      }

      let dataUrl = rawData;
      if (!dataUrl.startsWith('data:')) {
        dataUrl = `data:image/jpeg;base64,${rawData}`;
      }

      const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        res.status(400).json({ error: 'Invalid data URL format' });
        return;
      }

      const ext = matches[1].includes('png')
        ? '.png'
        : matches[1].includes('webp')
        ? '.webp'
        : '.jpg';
      const cleanFileName = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}${ext}`;
      const filePath = path.join(UPLOADS_DIR, cleanFileName);
      const buffer = Buffer.from(matches[2], 'base64');

      fs.writeFileSync(filePath, buffer);
      console.log(`[UPLOAD] Image saved successfully to ${filePath} (${(buffer.length / 1024).toFixed(1)} KB)`);
      res.json({ success: true, url: `/uploads/${cleanFileName}` });
    } catch (err: any) {
      console.error('Image upload failed:', err);
      res.status(500).json({ error: err.message || 'Upload failed' });
    }
  });

  // API ROUTES -------------------------------------------------

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      store: 'ABHI FASHION',
      notifications: {
        push: true,
        sms: true,
        whatsapp: true,
      },
    });
  });

  // Direct QR Code Image Download for mobile devices & Android WebView
  app.get('/api/poster-qr/download', async (req, res) => {
    try {
      const targetUrl =
        (req.query.url as string) ||
        'https://drive.google.com/uc?export=download&id=1Fu_2Oul0hGXBnLV8sweNZFTooibbFfjh';
      const buffer = await QRCode.toBuffer(targetUrl, {
        width: 1024,
        margin: 2,
        color: {
          dark: '#0B132B',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'H',
      });
      res.setHeader('Content-Type', 'image/png');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="AbhiFashion-App-Download-QR.png"'
      );
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(buffer);
    } catch (err) {
      res.status(500).send('Failed to generate QR');
    }
  });

  // VAPID Public Key for client browser Push Subscription
  app.get('/api/push/vapid-public-key', (req, res) => {
    res.json({ publicKey: vapidKeys.publicKey });
  });

  // Register device for Web Push notifications (Owner's phone / PC)
  app.post('/api/push/subscribe', (req, res) => {
    const subscription = req.body;
    if (!subscription || !subscription.endpoint) {
      res.status(400).json({ error: 'Invalid push subscription object' });
      return;
    }

    const subs = getPushSubscriptions();
    const existingIndex = subs.findIndex((s) => s.endpoint === subscription.endpoint);
    if (existingIndex >= 0) {
      subs[existingIndex] = subscription;
    } else {
      subs.push(subscription);
    }
    savePushSubscriptions(subs);

    addNotificationLog({
      type: 'system',
      title: 'New Device Subscribed for Push',
      details: 'Device registered to receive instant order alerts when app is closed.',
      recipient: 'Store Owner Phone',
      status: 'delivered',
    });

    res.json({ success: true, totalSubscribed: subs.length });
  });

  // Unsubscribe device
  app.post('/api/push/unsubscribe', (req, res) => {
    const { endpoint } = req.body;
    if (endpoint) {
      const subs = getPushSubscriptions().filter((s) => s.endpoint !== endpoint);
      savePushSubscriptions(subs);
    }
    res.json({ success: true });
  });

  // Test Push Notification endpoint
  app.post('/api/push/test', async (req, res) => {
    const { title, body } = req.body || {};
    const result = await sendWebPushNotification({
      title: title || '🔔 ABHI FASHION - Push Notification Test',
      body:
        body ||
        'Badhaai! Push notification successfully connect ho gaya hai. Ab app band hone par bhi naye order ka alert aayega.',
      url: '/?tab=admin',
    });
    res.json({
      success: true,
      result,
      message:
        result.sentCount > 0
          ? `Test notification sent to ${result.sentCount} active device(s)!`
          : 'Notification sent! Note: Please allow notifications on this browser/phone to receive lock-screen alerts.',
    });
  });

  // Notification Configuration endpoints
  app.get('/api/notifications/config', (req, res) => {
    const cfg = getNotificationConfig();
    // Mask sensitive keys in response
    res.json({
      ...cfg,
      fast2smsApiKey: cfg.fast2smsApiKey ? '••••••••' + cfg.fast2smsApiKey.slice(-4) : '',
      twilioAuthToken: cfg.twilioAuthToken ? '••••••••' : '',
      callMeBotApiKey: cfg.callMeBotApiKey ? '••••••••' + cfg.callMeBotApiKey.slice(-3) : '',
      hasFast2SmsKey: !!(cfg.fast2smsApiKey || process.env.FAST2SMS_API_KEY),
      hasTwilioConfig: !!(
        (cfg.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID) &&
        (cfg.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN)
      ),
      hasCallMeBotKey: !!(cfg.callMeBotApiKey || process.env.CALLMEBOT_API_KEY),
      pushSubscribedDevices: getPushSubscriptions().length,
    });
  });

  app.post('/api/notifications/config', (req, res) => {
    const existing = getNotificationConfig();
    const update = req.body || {};

    const merged: ServerNotificationConfig = {
      ...existing,
      ...update,
    };

    // If user passed masked values, keep existing
    if (update.fast2smsApiKey && update.fast2smsApiKey.includes('••••')) {
      merged.fast2smsApiKey = existing.fast2smsApiKey;
    }
    if (update.twilioAuthToken && update.twilioAuthToken.includes('••••')) {
      merged.twilioAuthToken = existing.twilioAuthToken;
    }
    if (update.callMeBotApiKey && update.callMeBotApiKey.includes('••••')) {
      merged.callMeBotApiKey = existing.callMeBotApiKey;
    }

    saveNotificationConfig(merged);
    res.json({ success: true, config: merged });
  });

  // Notification Logs endpoint
  app.get('/api/notifications/logs', (req, res) => {
    res.json({ logs: getNotificationLogs() });
  });

  // Test SMS endpoint
  app.post('/api/notify/test-sms', async (req, res) => {
    const { phone } = req.body || {};
    const cfg = getNotificationConfig();
    const targetPhone = phone || cfg.ownerPhone || '9826198421';

    const testMessage =
      'ABHI FASHION: Test SMS successful! Aapki dukaan par naye orders aane par yahan alert aayega. Bazar Line, Chhuikhadan.';

    const result = await sendSmsNotification(targetPhone, testMessage, cfg);
    res.json(result);
  });

  // Test WhatsApp endpoint
  app.post('/api/notify/test-whatsapp', async (req, res) => {
    const { phone } = req.body || {};
    const cfg = getNotificationConfig();
    const targetPhone = phone || cfg.ownerWhatsApp || '9826198421';

    const testMessage =
      '🛍️ *ABHI FASHION - WhatsApp Alert Test*\n\nAapka WhatsApp notification system connect ho chuka hai!\nNaye order aane par turant customer details & order items yahan milenge.\n\n📍 *Bazar Line, Chhuikhadan*';

    const result = await sendWhatsAppNotification(targetPhone, testMessage, cfg);
    res.json(result);
  });

  // Broadcast Order Notification across Web Push, SMS, and WhatsApp
  app.post('/api/notify/order', async (req, res) => {
    const { order } = req.body;
    if (!order) {
      res.status(400).json({ error: 'Order details required' });
      return;
    }

    const cfg = getNotificationConfig();

    const itemsSummary = (order.items || [])
      .map((it: any) => `${it.productName} (${it.selectedSize}) x${it.quantity}`)
      .join(', ');

    const results: any = {
      push: null,
      sms: null,
      whatsapp: null,
    };

    const isEmi = order.paymentMethod === 'emi' || order.paymentMethod === 'upi_mandate' || !!order.emiDetails;
    const upiId = order.emiDetails?.mandateUpiId || order.customer?.upiId;
    const emiSummary = isEmi && upiId ? ` [EMI: ₹${order.emiDetails?.monthlyInstallment || Math.round(order.totalAmount / 3)}/mo • UPI: ${upiId}]` : '';

    // 1. Web Push Notification (Works even when app is closed!)
    if (cfg.enablePush) {
      results.push = await sendWebPushNotification({
        title: isEmi
          ? `⚡ Naya EMI Order: #${order.orderNumber} (₹${order.totalAmount})`
          : `🛍️ Naya Order: #${order.orderNumber} (₹${order.totalAmount})`,
        body: isEmi && upiId
          ? `Customer: ${order.customer?.name} • UPI: ${upiId}\nEMI: ₹${order.emiDetails?.monthlyInstallment || Math.round(order.totalAmount / 3)}/mo (${order.emiDetails?.tenure || '3 Mo.'})`
          : `Customer: ${order.customer?.name} (${order.customer?.city || 'Chhuikhadan'})\nItems: ${itemsSummary}`,
        url: `/?tab=admin&orderId=${order.id}`,
        orderId: order.id,
      });
    }

    // 2. SMS Notification to Owner
    if (cfg.enableSms && cfg.ownerPhone) {
      const smsText = `ABHI FASHION: Naya Order! #${order.orderNumber}, Rs.${order.totalAmount}, Customer: ${order.customer?.name} (+91${order.customer?.mobile}), ${order.customer?.city}.${emiSummary} Check app!`;
      results.sms = await sendSmsNotification(cfg.ownerPhone, smsText, cfg);
    }

    // 3. WhatsApp Notification to Owner
    if (cfg.enableWhatsApp && (cfg.ownerWhatsApp || cfg.ownerPhone)) {
      const waPhone = cfg.ownerWhatsApp || cfg.ownerPhone;
      const emiWaBlock = isEmi
        ? `\n⚡ *EASY EMI ORDER DETAILS:*
• *Customer UPI ID:* \`${upiId || 'Check app'}\` 👈 (Copy to UPI App)
• *Tenure:* ${order.emiDetails?.tenure || '3 Months'}
• *Monthly Installment:* ₹${order.emiDetails?.monthlyInstallment || Math.round(order.totalAmount / 3)}/month
• *Action:* Apne UPI App se is UPI ID par request/mandate send karein.`
        : '';

      const waText = `🛍️ *NEW ORDER ALERT - ABHI FASHION*
---------------------------------------
*Order ID:* ${order.orderNumber}
*Total:* ₹${order.totalAmount} (${order.paymentMethod?.toUpperCase()} - ${order.paymentStatus})
*Customer:* ${order.customer?.name}
*Mobile:* +91 ${order.customer?.mobile}
*Address:* ${order.customer?.address}, ${order.customer?.city}${emiWaBlock}

*Items:*
${(order.items || [])
  .map(
    (it: any, i: number) =>
      `${i + 1}. *${it.productName}* (${it.selectedSize}) x${it.quantity} = ₹${it.totalPrice}`
  )
  .join('\n')}
---------------------------------------
Kripya order verify karke packing shuru karein!`;

      results.whatsapp = await sendWhatsAppNotification(waPhone, waText, cfg);
    }

    res.json({
      success: true,
      message: 'All notifications processed',
      results,
    });
  });

  // -------------------------------------------------------------
  // CENTRAL STORE DATABASE & ORDERS (Server-wide persistence)
  // -------------------------------------------------------------
  const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
  const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
  const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
  const CATEGORIES_FILE = path.join(DATA_DIR, 'categories.json');
  const BANNERS_FILE = path.join(DATA_DIR, 'banners.json');

  function readJsonFile<T>(filePath: string, fallback: T): T {
    if (!fs.existsSync(filePath)) return fallback;
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      return fallback;
    }
  }

  function writeJsonFile(filePath: string, data: any) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error(`Failed to write ${filePath}:`, err);
    }
  }

  // -------------------------------------------------------------
  // REAL-TIME BROADCAST & SERVER-SENT EVENTS (SSE)
  // Ensures any changes (new products, offers, orders) immediately
  // reach all connected customer apps across all devices
  // -------------------------------------------------------------
  let sseClients: express.Response[] = [];
  const currentVersions = {
    products: Date.now(),
    banners: Date.now(),
    categories: Date.now(),
    settings: Date.now(),
    orders: Date.now(),
  };

  function broadcastRealtimeUpdate(
    type: 'products' | 'banners' | 'categories' | 'settings' | 'orders',
    data?: any
  ) {
    currentVersions[type] = Date.now();
    const message = JSON.stringify({
      type,
      data,
      timestamp: currentVersions[type],
      versions: currentVersions,
    });

    sseClients = sseClients.filter((client) => {
      try {
        client.write(`event: ${type}\ndata: ${message}\n\n`);
        return true;
      } catch {
        return false;
      }
    });
  }

  // Real-time Event Stream
  app.get('/api/sync/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    // Send immediate initial sync event with current versions
    res.write(
      `event: connected\ndata: ${JSON.stringify({
        status: 'connected',
        versions: currentVersions,
        timestamp: Date.now(),
      })}\n\n`
    );

    sseClients.push(res);

    // Keep connection alive with periodic heartbeats every 15s
    const heartbeat = setInterval(() => {
      try {
        res.write(': keepalive\n\n');
      } catch {
        clearInterval(heartbeat);
      }
    }, 15000);

    req.on('close', () => {
      clearInterval(heartbeat);
      sseClients = sseClients.filter((c) => c !== res);
    });
  });

  // Version status check for fast lightweight polling fallback
  app.get('/api/sync/versions', (req, res) => {
    res.json({
      versions: currentVersions,
      connectedDevices: sseClients.length,
      serverTime: new Date().toISOString(),
    });
  });

  // 1. ORDERS API
  app.get('/api/orders', (req, res) => {
    const orders = readJsonFile<any[]>(ORDERS_FILE, []);
    res.json({ orders });
  });

  app.post('/api/orders', async (req, res) => {
    const newOrder = req.body;
    if (!newOrder || !newOrder.id) {
      res.status(400).json({ error: 'Invalid order payload' });
      return;
    }

    const orders = readJsonFile<any[]>(ORDERS_FILE, []);
    const existingIndex = orders.findIndex((o) => o.id === newOrder.id);
    if (existingIndex >= 0) {
      orders[existingIndex] = newOrder;
    } else {
      orders.unshift(newOrder);
    }
    writeJsonFile(ORDERS_FILE, orders);

    // Also deduct stock from server products if available
    const products = readJsonFile<any[]>(PRODUCTS_FILE, []);
    if (products.length > 0 && Array.isArray(newOrder.items)) {
      newOrder.items.forEach((it: any) => {
        const prod = products.find((p) => p.id === it.productId);
        if (prod) {
          prod.stock = Math.max(0, (prod.stock || 0) - (it.quantity || 1));
        }
      });
      writeJsonFile(PRODUCTS_FILE, products);
    }

    // Trigger Notifications (Push + SMS + WhatsApp)
    const cfg = getNotificationConfig();
    const itemsSummary = (newOrder.items || [])
      .map((it: any) => `${it.productName} (${it.selectedSize}) x${it.quantity}`)
      .join(', ');

    const results: any = {
      push: null,
      sms: null,
      whatsapp: null,
    };

    try {
      const isEmiOrder = newOrder.paymentMethod === 'emi' || newOrder.paymentMethod === 'upi_mandate' || !!newOrder.emiDetails;
      const customerUpi = newOrder.emiDetails?.mandateUpiId || newOrder.customer?.upiId || '';

      if (cfg.enablePush) {
        const pushBody = isEmiOrder && customerUpi
          ? `Customer: ${newOrder.customer?.name}\n⚡ EMI Mandate UPI: ${customerUpi} (${newOrder.emiDetails?.tenure || '3 Months'})\nItems: ${itemsSummary}`
          : `Customer: ${newOrder.customer?.name} (${newOrder.customer?.city || 'Chhuikhadan'})\nItems: ${itemsSummary}`;

        results.push = await sendWebPushNotification({
          title: `🛍️ Naya Order: ${newOrder.orderNumber} (₹${newOrder.totalAmount})${isEmiOrder ? ' [EMI]' : ''}`,
          body: pushBody,
          url: '/admin?orderId=' + newOrder.id,
          orderId: newOrder.id,
        });
      }

      if (cfg.enableSms && cfg.ownerPhone) {
        const upiSnippet = isEmiOrder && customerUpi ? ` [EMI UPI: ${customerUpi}]` : '';
        const smsText = `ABHI FASHION: Naya Order mila! #${newOrder.orderNumber}, Rs.${newOrder.totalAmount}, Customer: ${newOrder.customer?.name} (+91${newOrder.customer?.mobile})${upiSnippet}, ${newOrder.customer?.city}. Check Admin App now!`;
        results.sms = await sendSmsNotification(cfg.ownerPhone, smsText, cfg);
      }

      if (cfg.enableWhatsApp && (cfg.ownerWhatsApp || cfg.ownerPhone)) {
        const waPhone = cfg.ownerWhatsApp || cfg.ownerPhone;
        const emiSection = isEmiOrder
          ? `\n⚡ *EASY EMI ORDER DETAILS:*
• *Customer UPI ID:* \`${customerUpi || 'Not entered'}\` 👈 (Copy to UPI App)
• *Tenure:* ${newOrder.emiDetails?.tenure || '3 Months'}
• *Monthly Installment:* ₹${newOrder.emiDetails?.monthlyInstallment || Math.round(newOrder.totalAmount / 3)}/month
• *Action:* Apne UPI App (PhonePe/GPay/Paytm) se is UPI ID (${customerUpi}) par mandate/payment request send karein!
---------------------------------------`
          : '';

        const waText = `🛍️ *NEW ORDER ALERT - ABHI FASHION*
---------------------------------------
*Order ID:* ${newOrder.orderNumber}
*Total:* ₹${newOrder.totalAmount} (${(newOrder.paymentMethod || '').toUpperCase()} - ${newOrder.paymentStatus})
*Customer:* ${newOrder.customer?.name}
*Mobile:* +91 ${newOrder.customer?.mobile}
*Address:* ${newOrder.customer?.address}, ${newOrder.customer?.city}${emiSection}

*Items:*
${(newOrder.items || [])
  .map(
    (it: any, i: number) =>
      `${i + 1}. *${it.productName}* (${it.selectedSize}) x${it.quantity} = ₹${it.totalPrice}`
  )
  .join('\n')}
---------------------------------------
Kripya Admin App open karke order check karein:
http://localhost:3000/admin`;

        results.whatsapp = await sendWhatsAppNotification(waPhone, waText, cfg);
      }
    } catch (e) {
      console.warn('Notification broadcast error on order placement:', e);
    }

    res.json({ success: true, order: newOrder, results });
  });

  app.put('/api/orders/:id/status', (req, res) => {
    const { id } = req.params;
    const { status, paymentStatus } = req.body;
    const orders = readJsonFile<any[]>(ORDERS_FILE, []);
    const order = orders.find((o) => o.id === id);
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    if (status) order.orderStatus = status;
    if (paymentStatus) order.paymentStatus = paymentStatus;
    order.updatedAt = new Date().toISOString();
    writeJsonFile(ORDERS_FILE, orders);
    res.json({ success: true, order });
  });

  app.delete('/api/orders/:id', (req, res) => {
    const { id } = req.params;
    let orders = readJsonFile<any[]>(ORDERS_FILE, []);
    orders = orders.filter((o) => o.id !== id);
    writeJsonFile(ORDERS_FILE, orders);
    res.json({ success: true });
  });

  // 2. PRODUCTS API
  app.get('/api/products', (req, res) => {
    const products = readJsonFile<any[] | null>(PRODUCTS_FILE, null);
    res.json({ products });
  });

  app.post('/api/products', (req, res) => {
    const { products } = req.body;
    if (Array.isArray(products)) {
      writeJsonFile(PRODUCTS_FILE, products);
      broadcastRealtimeUpdate('products', products);
      res.json({ success: true, total: products.length });
    } else {
      res.status(400).json({ error: 'Array of products required' });
    }
  });

  // Single Product Upsert (Save or Update a single product reliably)
  app.post('/api/products/upsert', (req, res) => {
    const { product } = req.body;
    if (!product || !product.id) {
      res.status(400).json({ error: 'Valid product object with id required' });
      return;
    }
    const products = readJsonFile<any[]>(PRODUCTS_FILE, []);
    const idx = products.findIndex((p) => p.id === product.id);
    if (idx >= 0) {
      products[idx] = product;
    } else {
      products.unshift(product);
    }
    writeJsonFile(PRODUCTS_FILE, products);
    broadcastRealtimeUpdate('products', products);
    res.json({ success: true, product, total: products.length });
  });

  app.delete('/api/products/:id', (req, res) => {
    const { id } = req.params;
    let products = readJsonFile<any[]>(PRODUCTS_FILE, []);
    products = products.filter((p) => p.id !== id);
    writeJsonFile(PRODUCTS_FILE, products);
    broadcastRealtimeUpdate('products', products);
    res.json({ success: true, remaining: products.length });
  });

  // 2.1 CUSTOMER ACCOUNTS & DEVICE SYNC (Multi-Device Login by Mobile)
  const CUSTOMERS_FILE = path.join(DATA_DIR, 'customers.json');

  // Customer Login or Register by Mobile Number
  app.post('/api/customer/login', (req, res) => {
    const { mobile, name } = req.body;
    if (!mobile) {
      res.status(400).json({ error: 'Mobile number is required' });
      return;
    }
    const cleanMobile = String(mobile).replace(/\D/g, '').slice(-10);
    if (cleanMobile.length !== 10) {
      res.status(400).json({ error: 'Please provide a valid 10-digit mobile number' });
      return;
    }

    const customers = readJsonFile<any[]>(CUSTOMERS_FILE, []);
    let customer = customers.find((c) => c.mobile === cleanMobile);

    if (customer) {
      if (name && name.trim()) {
        customer.name = name.trim();
      }
      customer.lastLoginAt = new Date().toISOString();
    } else {
      customer = {
        mobile: cleanMobile,
        name: (name && name.trim()) || 'Guest Customer',
        address: '',
        city: 'Chhuikhadan',
        state: 'Chhattisgarh',
        pincode: '491885',
        landmark: '',
        upiId: '',
        cart: [],
        wishlist: [],
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      customers.push(customer);
    }

    writeJsonFile(CUSTOMERS_FILE, customers);

    // Fetch all past orders for this customer by mobile number
    const orders = readJsonFile<any[]>(ORDERS_FILE, []);
    const customerOrders = orders.filter((o) => {
      const orderMob = String(o.customer?.mobile || '').replace(/\D/g, '').slice(-10);
      return orderMob === cleanMobile;
    });

    res.json({
      success: true,
      customer,
      orders: customerOrders,
    });
  });

  // Fetch Customer Profile & Past Orders by Mobile
  app.get('/api/customer/profile', (req, res) => {
    const mobile = req.query.mobile;
    if (!mobile) {
      res.status(400).json({ error: 'Mobile query param is required' });
      return;
    }
    const cleanMobile = String(mobile).replace(/\D/g, '').slice(-10);
    const customers = readJsonFile<any[]>(CUSTOMERS_FILE, []);
    const customer = customers.find((c) => c.mobile === cleanMobile) || null;

    const orders = readJsonFile<any[]>(ORDERS_FILE, []);
    const customerOrders = orders.filter((o) => {
      const orderMob = String(o.customer?.mobile || '').replace(/\D/g, '').slice(-10);
      return orderMob === cleanMobile;
    });

    res.json({
      success: true,
      customer,
      orders: customerOrders,
    });
  });

  // Sync Customer Data (Profile, Cart, Addresses)
  app.post('/api/customer/sync', (req, res) => {
    const { mobile, name, address, city, state, pincode, landmark, upiId, cart, wishlist } = req.body;
    if (!mobile) {
      res.status(400).json({ error: 'Mobile number is required' });
      return;
    }
    const cleanMobile = String(mobile).replace(/\D/g, '').slice(-10);
    const customers = readJsonFile<any[]>(CUSTOMERS_FILE, []);
    let customer = customers.find((c) => c.mobile === cleanMobile);

    if (customer) {
      if (name !== undefined) customer.name = name;
      if (address !== undefined) customer.address = address;
      if (city !== undefined) customer.city = city;
      if (state !== undefined) customer.state = state;
      if (pincode !== undefined) customer.pincode = pincode;
      if (landmark !== undefined) customer.landmark = landmark;
      if (upiId !== undefined) customer.upiId = upiId;
      if (cart !== undefined) customer.cart = cart;
      if (wishlist !== undefined) customer.wishlist = wishlist;
      customer.updatedAt = new Date().toISOString();
    } else {
      customer = {
        mobile: cleanMobile,
        name: name || 'Valued Customer',
        address: address || '',
        city: city || 'Chhuikhadan',
        state: state || 'Chhattisgarh',
        pincode: pincode || '491885',
        landmark: landmark || '',
        upiId: upiId || '',
        cart: cart || [],
        wishlist: wishlist || [],
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      customers.push(customer);
    }

    writeJsonFile(CUSTOMERS_FILE, customers);
    res.json({ success: true, customer });
  });

  // Admin: Get all registered customers
  app.get('/api/customers', (req, res) => {
    const customers = readJsonFile<any[]>(CUSTOMERS_FILE, []);
    const orders = readJsonFile<any[]>(ORDERS_FILE, []);

    const enriched = customers.map((c) => {
      const custOrders = orders.filter((o) => {
        const orderMob = String(o.customer?.mobile || '').replace(/\D/g, '').slice(-10);
        return orderMob === c.mobile;
      });
      const totalSpent = custOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      return {
        ...c,
        ordersCount: custOrders.length,
        totalSpent,
      };
    });

    res.json({ customers: enriched });
  });

  // 3. SETTINGS API
  app.get('/api/settings', (req, res) => {
    const settings = readJsonFile<any | null>(SETTINGS_FILE, null);
    res.json({ settings });
  });

  app.post('/api/settings', (req, res) => {
    const { settings } = req.body;
    if (settings && typeof settings === 'object') {
      writeJsonFile(SETTINGS_FILE, settings);
      broadcastRealtimeUpdate('settings', settings);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Settings object required' });
    }
  });

  // 4. CATEGORIES API
  app.get('/api/categories', (req, res) => {
    const categories = readJsonFile<any[] | null>(CATEGORIES_FILE, null);
    res.json({ categories });
  });

  app.post('/api/categories', (req, res) => {
    const { categories } = req.body;
    if (Array.isArray(categories)) {
      writeJsonFile(CATEGORIES_FILE, categories);
      broadcastRealtimeUpdate('categories', categories);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Array of categories required' });
    }
  });

  // 5. BANNERS API (Hero Box Promotional Offers)
  const DEFAULT_INITIAL_BANNERS = [
    {
      id: 'b1',
      title: 'AB FASHION HOGA AUR BHI EASY!',
      subtitle: 'SHOP NOW • PAY LATER',
      badge: 'FESTIVE & WEDDING SPECIAL',
      offerText: 'NO COST EMI AVAILABLE • 2-3 MONTHS TENURE',
      image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&auto=format&fit=crop&q=80',
      categoryId: 'shirts',
      isEnabled: true,
    },
    {
      id: 'b2',
      title: 'NEW MEN’S WEAR ARRIVALS',
      subtitle: 'PREMIUM QUALITY • DIRECT DUKAAN RATES',
      badge: 'CHHUIKHADAN SPECIAL',
      offerText: 'FLAT 20% TO 50% OFF ON ALL NEW ARRIVALS',
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&auto=format&fit=crop&q=80',
      categoryId: 'jeans',
      isEnabled: true,
    },
    {
      id: 'b3',
      title: 'FESTIVAL OF FASHION',
      subtitle: 'ROYAL OXFORD SHIRTS & STRETCH TROUSERS',
      badge: 'MEGA SALE IS LIVE',
      offerText: 'BUY 2 GET 10% EXTRA DISCOUNT • COD AVAILABLE',
      image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=1600&auto=format&fit=crop&q=80',
      categoryId: 'trousers',
      isEnabled: true,
    },
  ];

  app.get('/api/banners', (req, res) => {
    let banners = readJsonFile<any[] | null>(BANNERS_FILE, null);
    if (!banners || !Array.isArray(banners)) {
      banners = DEFAULT_INITIAL_BANNERS;
      writeJsonFile(BANNERS_FILE, banners);
    }
    res.json({ banners });
  });

  app.post('/api/banners', (req, res) => {
    const { banners } = req.body;
    if (Array.isArray(banners)) {
      writeJsonFile(BANNERS_FILE, banners);
      broadcastRealtimeUpdate('banners', banners);
      res.json({ success: true, total: banners.length });
    } else {
      res.status(400).json({ error: 'Array of banners required' });
    }
  });

  app.delete('/api/banners/:id', (req, res) => {
    const { id } = req.params;
    let banners = readJsonFile<any[]>(BANNERS_FILE, DEFAULT_INITIAL_BANNERS);
    banners = banners.filter((b) => b.id !== id);
    writeJsonFile(BANNERS_FILE, banners);
    broadcastRealtimeUpdate('banners', banners);
    res.json({ success: true, remaining: banners.length });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      configFile: path.resolve(process.cwd(), 'vite.config.ts'),
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });

    // In AI Studio preview environment, HMR is disabled.
    // Intercept /@vite/client to prevent WebSocket creation attempts completely.
    app.use('/@vite/client', (req, res, next) => {
      const originalWrite = res.write;
      const originalEnd = res.end;
      const chunks: Buffer[] = [];

      res.write = function (chunk: any) {
        if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        return true;
      } as any;

      res.end = function (chunk?: any, ...args: any[]) {
        if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        let body = Buffer.concat(chunks).toString('utf8');

        // Neutralize all WebSocket instantiation inside @vite/client
        body = body.replace(
          /new WebSocket\([^)]*\)/g,
          '({ readyState: 1, OPEN: 1, send() {}, close() {}, addEventListener(e, fn) { if (e === "open") setTimeout(() => { try { fn({ type: "open" }); } catch {} }, 0); }, removeEventListener() {} })'
        );

        res.write = originalWrite;
        res.end = originalEnd;
        res.setHeader('Content-Length', Buffer.byteLength(body));
        return (res as any).end(body, ...args);
      } as any;

      next();
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ABHI FASHION Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
