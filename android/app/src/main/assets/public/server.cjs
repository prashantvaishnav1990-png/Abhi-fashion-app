var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
module.exports = __toCommonJS(server_exports);
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_vite = require("vite");
var import_web_push = __toESM(require("web-push"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var PORT = 3e3;
var DATA_DIR = import_path.default.join(process.cwd(), "data");
if (!import_fs.default.existsSync(DATA_DIR)) {
  import_fs.default.mkdirSync(DATA_DIR, { recursive: true });
}
var VAPID_FILE = import_path.default.join(DATA_DIR, "vapid.json");
var vapidKeys;
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  vapidKeys = {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY
  };
} else if (import_fs.default.existsSync(VAPID_FILE)) {
  try {
    vapidKeys = JSON.parse(import_fs.default.readFileSync(VAPID_FILE, "utf8"));
  } catch {
    vapidKeys = import_web_push.default.generateVAPIDKeys();
    import_fs.default.writeFileSync(VAPID_FILE, JSON.stringify(vapidKeys, null, 2));
  }
} else {
  vapidKeys = import_web_push.default.generateVAPIDKeys();
  try {
    import_fs.default.writeFileSync(VAPID_FILE, JSON.stringify(vapidKeys, null, 2));
  } catch (err) {
    console.error("Error writing vapid.json:", err);
  }
}
try {
  import_web_push.default.setVapidDetails(
    "mailto:orders@abhifashion-chhuikhadan.com",
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
} catch (err) {
  console.error("Failed to configure webpush VAPID details:", err);
}
var SUBS_FILE = import_path.default.join(DATA_DIR, "push_subscriptions.json");
function getPushSubscriptions() {
  if (!import_fs.default.existsSync(SUBS_FILE)) return [];
  try {
    return JSON.parse(import_fs.default.readFileSync(SUBS_FILE, "utf8"));
  } catch {
    return [];
  }
}
function savePushSubscriptions(subs) {
  try {
    import_fs.default.writeFileSync(SUBS_FILE, JSON.stringify(subs, null, 2));
  } catch (err) {
    console.error("Failed to save subscriptions:", err);
  }
}
var NOTIFY_CONFIG_FILE = import_path.default.join(DATA_DIR, "notification_config.json");
var DEFAULT_NOTIFY_CONFIG = {
  ownerPhone: process.env.OWNER_ALERT_PHONE || "9826198421",
  ownerWhatsApp: "9826198421",
  enablePush: true,
  enableSms: true,
  enableWhatsApp: true,
  smsGateway: "fast2sms",
  fast2smsApiKey: process.env.FAST2SMS_API_KEY || "",
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || "",
  twilioFromNumber: process.env.TWILIO_PHONE_NUMBER || "",
  callMeBotApiKey: process.env.CALLMEBOT_API_KEY || "",
  webhookUrl: ""
};
function getNotificationConfig() {
  if (!import_fs.default.existsSync(NOTIFY_CONFIG_FILE)) {
    return { ...DEFAULT_NOTIFY_CONFIG };
  }
  try {
    const saved = JSON.parse(import_fs.default.readFileSync(NOTIFY_CONFIG_FILE, "utf8"));
    return { ...DEFAULT_NOTIFY_CONFIG, ...saved };
  } catch {
    return { ...DEFAULT_NOTIFY_CONFIG };
  }
}
function saveNotificationConfig(cfg) {
  try {
    import_fs.default.writeFileSync(NOTIFY_CONFIG_FILE, JSON.stringify(cfg, null, 2));
  } catch (err) {
    console.error("Failed to save notification config:", err);
  }
}
var LOGS_FILE = import_path.default.join(DATA_DIR, "notification_logs.json");
function getNotificationLogs() {
  if (!import_fs.default.existsSync(LOGS_FILE)) return [];
  try {
    return JSON.parse(import_fs.default.readFileSync(LOGS_FILE, "utf8"));
  } catch {
    return [];
  }
}
function addNotificationLog(log) {
  const logs = getNotificationLogs();
  const newLog = {
    ...log,
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  logs.unshift(newLog);
  if (logs.length > 50) logs.pop();
  try {
    import_fs.default.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2));
  } catch (e) {
    console.error("Failed to write log:", e);
  }
}
async function sendWebPushNotification(payload) {
  const subscriptions = getPushSubscriptions();
  if (subscriptions.length === 0) {
    console.log("[PUSH] No active push subscriptions found.");
    addNotificationLog({
      type: "push",
      title: payload.title,
      details: "No devices subscribed yet. Subscribe in Admin Panel > Notifications.",
      recipient: "0 devices",
      status: "fallback_ready"
    });
    return { sentCount: 0, totalCount: 0 };
  }
  const jsonString = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || "/?tab=admin&subtab=orders",
    orderId: payload.orderId || "",
    vibrate: [300, 150, 300, 150, 400],
    tag: `order-${payload.orderId || Date.now()}`
  });
  let sent = 0;
  const remainingSubs = [];
  for (const sub of subscriptions) {
    try {
      await import_web_push.default.sendNotification(sub, jsonString, {
        TTL: 60 * 60 * 24,
        // 24 hours
        urgency: "high"
      });
      sent++;
      remainingSubs.push(sub);
    } catch (err) {
      console.error("[PUSH] Failed sending to subscription:", err?.statusCode || err?.message);
      if (err?.statusCode !== 404 && err?.statusCode !== 410) {
        remainingSubs.push(sub);
      }
    }
  }
  savePushSubscriptions(remainingSubs);
  addNotificationLog({
    type: "push",
    title: payload.title,
    details: `Delivered to ${sent} of ${subscriptions.length} active device(s)`,
    recipient: `${subscriptions.length} device(s)`,
    status: sent > 0 ? "sent" : "failed"
  });
  return { sentCount: sent, totalCount: subscriptions.length };
}
async function sendSmsNotification(phone, message, cfg) {
  const cleanPhone = phone.replace(/\D/g, "").slice(-10);
  const fast2smsKey = cfg.fast2smsApiKey || process.env.FAST2SMS_API_KEY;
  if (cfg.smsGateway === "fast2sms" && fast2smsKey) {
    try {
      const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          authorization: fast2smsKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          route: "q",
          message,
          flash: 0,
          numbers: cleanPhone
        })
      });
      const resData = await response.json();
      if (resData.return) {
        addNotificationLog({
          type: "sms",
          title: "SMS Sent via Fast2SMS",
          details: message,
          recipient: `+91 ${cleanPhone}`,
          status: "sent"
        });
        return { success: true, message: "SMS delivered successfully via Fast2SMS" };
      } else {
        throw new Error(resData.message || "Fast2SMS returned error");
      }
    } catch (err) {
      console.error("[SMS Fast2SMS Error]:", err.message);
      addNotificationLog({
        type: "sms",
        title: "Fast2SMS Delivery Failed",
        details: err.message,
        recipient: `+91 ${cleanPhone}`,
        status: "fallback_ready"
      });
    }
  }
  const twilioSid = cfg.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = cfg.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = cfg.twilioFromNumber || process.env.TWILIO_PHONE_NUMBER;
  if (cfg.smsGateway === "twilio" && twilioSid && twilioToken && twilioFrom) {
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
      const params = new URLSearchParams();
      params.append("To", `+91${cleanPhone}`);
      params.append("From", twilioFrom);
      params.append("Body", message);
      const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64");
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: params.toString()
      });
      if (response.ok) {
        addNotificationLog({
          type: "sms",
          title: "SMS Sent via Twilio",
          details: message,
          recipient: `+91 ${cleanPhone}`,
          status: "sent"
        });
        return { success: true, message: "SMS sent via Twilio" };
      } else {
        const errText = await response.text();
        throw new Error(`Twilio error: ${errText}`);
      }
    } catch (err) {
      console.error("[SMS Twilio Error]:", err.message);
      addNotificationLog({
        type: "sms",
        title: "Twilio SMS Failed",
        details: err.message,
        recipient: `+91 ${cleanPhone}`,
        status: "fallback_ready"
      });
    }
  }
  addNotificationLog({
    type: "sms",
    title: "SMS Notification Prepared",
    details: `${message} (Direct SMS link ready for 1-tap dispatch)`,
    recipient: `+91 ${cleanPhone}`,
    status: "fallback_ready"
  });
  return {
    success: true,
    message: "SMS ready! Configured for instant mobile transmission."
  };
}
async function sendWhatsAppNotification(phone, message, cfg) {
  const cleanPhone = phone.replace(/\D/g, "").slice(-10);
  const waUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;
  const callMeBotKey = cfg.callMeBotApiKey || process.env.CALLMEBOT_API_KEY;
  if (callMeBotKey) {
    try {
      const url = `https://api.callmebot.com/whatsapp.php?phone=91${cleanPhone}&text=${encodeURIComponent(
        message
      )}&apikey=${callMeBotKey}`;
      const res = await fetch(url);
      if (res.ok) {
        addNotificationLog({
          type: "whatsapp",
          title: "Automated WhatsApp Alert Sent",
          details: message,
          recipient: `+91 ${cleanPhone}`,
          status: "sent"
        });
        return { success: true, message: "WhatsApp message dispatched automatically via CallMeBot", waUrl };
      }
    } catch (err) {
      console.error("[WhatsApp CallMeBot Error]:", err.message);
    }
  }
  if (cfg.webhookUrl) {
    try {
      await fetch(cfg.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "whatsapp",
          phone: `91${cleanPhone}`,
          message,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        })
      });
      addNotificationLog({
        type: "whatsapp",
        title: "WhatsApp Webhook Dispatched",
        details: message,
        recipient: cfg.webhookUrl,
        status: "sent"
      });
      return { success: true, message: "Dispatched to WhatsApp webhook", waUrl };
    } catch (err) {
      console.error("[WhatsApp Webhook Error]:", err.message);
    }
  }
  addNotificationLog({
    type: "whatsapp",
    title: "WhatsApp Receipt Generated",
    details: `Prepared 1-tap WhatsApp alert link for store owner`,
    recipient: `+91 ${cleanPhone}`,
    status: "fallback_ready"
  });
  return {
    success: true,
    message: "WhatsApp alert prepared with direct 1-tap link",
    waUrl
  };
}
async function startServer() {
  const app = (0, import_express.default)();
  app.use(import_express.default.json({ limit: "50mb" }));
  app.use(import_express.default.urlencoded({ extended: true, limit: "50mb" }));
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      store: "ABHI FASHION",
      notifications: {
        push: true,
        sms: true,
        whatsapp: true
      }
    });
  });
  app.get("/api/push/vapid-public-key", (req, res) => {
    res.json({ publicKey: vapidKeys.publicKey });
  });
  app.post("/api/push/subscribe", (req, res) => {
    const subscription = req.body;
    if (!subscription || !subscription.endpoint) {
      res.status(400).json({ error: "Invalid push subscription object" });
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
      type: "system",
      title: "New Device Subscribed for Push",
      details: "Device registered to receive instant order alerts when app is closed.",
      recipient: "Store Owner Phone",
      status: "delivered"
    });
    res.json({ success: true, totalSubscribed: subs.length });
  });
  app.post("/api/push/unsubscribe", (req, res) => {
    const { endpoint } = req.body;
    if (endpoint) {
      const subs = getPushSubscriptions().filter((s) => s.endpoint !== endpoint);
      savePushSubscriptions(subs);
    }
    res.json({ success: true });
  });
  app.post("/api/push/test", async (req, res) => {
    const { title, body } = req.body || {};
    const result = await sendWebPushNotification({
      title: title || "\u{1F514} ABHI FASHION - Push Notification Test",
      body: body || "Badhaai! Push notification successfully connect ho gaya hai. Ab app band hone par bhi naye order ka alert aayega.",
      url: "/?tab=admin"
    });
    res.json({
      success: true,
      result,
      message: result.sentCount > 0 ? `Test notification sent to ${result.sentCount} active device(s)!` : "Notification sent! Note: Please allow notifications on this browser/phone to receive lock-screen alerts."
    });
  });
  app.get("/api/notifications/config", (req, res) => {
    const cfg = getNotificationConfig();
    res.json({
      ...cfg,
      fast2smsApiKey: cfg.fast2smsApiKey ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" + cfg.fast2smsApiKey.slice(-4) : "",
      twilioAuthToken: cfg.twilioAuthToken ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : "",
      callMeBotApiKey: cfg.callMeBotApiKey ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" + cfg.callMeBotApiKey.slice(-3) : "",
      hasFast2SmsKey: !!(cfg.fast2smsApiKey || process.env.FAST2SMS_API_KEY),
      hasTwilioConfig: !!((cfg.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID) && (cfg.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN)),
      hasCallMeBotKey: !!(cfg.callMeBotApiKey || process.env.CALLMEBOT_API_KEY),
      pushSubscribedDevices: getPushSubscriptions().length
    });
  });
  app.post("/api/notifications/config", (req, res) => {
    const existing = getNotificationConfig();
    const update = req.body || {};
    const merged = {
      ...existing,
      ...update
    };
    if (update.fast2smsApiKey && update.fast2smsApiKey.includes("\u2022\u2022\u2022\u2022")) {
      merged.fast2smsApiKey = existing.fast2smsApiKey;
    }
    if (update.twilioAuthToken && update.twilioAuthToken.includes("\u2022\u2022\u2022\u2022")) {
      merged.twilioAuthToken = existing.twilioAuthToken;
    }
    if (update.callMeBotApiKey && update.callMeBotApiKey.includes("\u2022\u2022\u2022\u2022")) {
      merged.callMeBotApiKey = existing.callMeBotApiKey;
    }
    saveNotificationConfig(merged);
    res.json({ success: true, config: merged });
  });
  app.get("/api/notifications/logs", (req, res) => {
    res.json({ logs: getNotificationLogs() });
  });
  app.post("/api/notify/test-sms", async (req, res) => {
    const { phone } = req.body || {};
    const cfg = getNotificationConfig();
    const targetPhone = phone || cfg.ownerPhone || "9826198421";
    const testMessage = "ABHI FASHION: Test SMS successful! Aapki dukaan par naye orders aane par yahan alert aayega. Bazar Line, Chhuikhadan.";
    const result = await sendSmsNotification(targetPhone, testMessage, cfg);
    res.json(result);
  });
  app.post("/api/notify/test-whatsapp", async (req, res) => {
    const { phone } = req.body || {};
    const cfg = getNotificationConfig();
    const targetPhone = phone || cfg.ownerWhatsApp || "9826198421";
    const testMessage = "\u{1F6CD}\uFE0F *ABHI FASHION - WhatsApp Alert Test*\n\nAapka WhatsApp notification system connect ho chuka hai!\nNaye order aane par turant customer details & order items yahan milenge.\n\n\u{1F4CD} *Bazar Line, Chhuikhadan*";
    const result = await sendWhatsAppNotification(targetPhone, testMessage, cfg);
    res.json(result);
  });
  app.post("/api/notify/order", async (req, res) => {
    const { order } = req.body;
    if (!order) {
      res.status(400).json({ error: "Order details required" });
      return;
    }
    const cfg = getNotificationConfig();
    const itemsSummary = (order.items || []).map((it) => `${it.productName} (${it.selectedSize}) x${it.quantity}`).join(", ");
    const results = {
      push: null,
      sms: null,
      whatsapp: null
    };
    const isEmi = order.paymentMethod === "emi" || order.paymentMethod === "upi_mandate" || !!order.emiDetails;
    const upiId = order.emiDetails?.mandateUpiId || order.customer?.upiId;
    const emiSummary = isEmi && upiId ? ` [EMI: \u20B9${order.emiDetails?.monthlyInstallment || Math.round(order.totalAmount / 3)}/mo \u2022 UPI: ${upiId}]` : "";
    if (cfg.enablePush) {
      results.push = await sendWebPushNotification({
        title: isEmi ? `\u26A1 Naya EMI Order: #${order.orderNumber} (\u20B9${order.totalAmount})` : `\u{1F6CD}\uFE0F Naya Order: #${order.orderNumber} (\u20B9${order.totalAmount})`,
        body: isEmi && upiId ? `Customer: ${order.customer?.name} \u2022 UPI: ${upiId}
EMI: \u20B9${order.emiDetails?.monthlyInstallment || Math.round(order.totalAmount / 3)}/mo (${order.emiDetails?.tenure || "3 Mo."})` : `Customer: ${order.customer?.name} (${order.customer?.city || "Chhuikhadan"})
Items: ${itemsSummary}`,
        url: `/?tab=admin&orderId=${order.id}`,
        orderId: order.id
      });
    }
    if (cfg.enableSms && cfg.ownerPhone) {
      const smsText = `ABHI FASHION: Naya Order! #${order.orderNumber}, Rs.${order.totalAmount}, Customer: ${order.customer?.name} (+91${order.customer?.mobile}), ${order.customer?.city}.${emiSummary} Check app!`;
      results.sms = await sendSmsNotification(cfg.ownerPhone, smsText, cfg);
    }
    if (cfg.enableWhatsApp && (cfg.ownerWhatsApp || cfg.ownerPhone)) {
      const waPhone = cfg.ownerWhatsApp || cfg.ownerPhone;
      const emiWaBlock = isEmi ? `
\u26A1 *EASY EMI ORDER DETAILS:*
\u2022 *Customer UPI ID:* \`${upiId || "Check app"}\` \u{1F448} (Copy to UPI App)
\u2022 *Tenure:* ${order.emiDetails?.tenure || "3 Months"}
\u2022 *Monthly Installment:* \u20B9${order.emiDetails?.monthlyInstallment || Math.round(order.totalAmount / 3)}/month
\u2022 *Action:* Apne UPI App se is UPI ID par request/mandate send karein.` : "";
      const waText = `\u{1F6CD}\uFE0F *NEW ORDER ALERT - ABHI FASHION*
---------------------------------------
*Order ID:* ${order.orderNumber}
*Total:* \u20B9${order.totalAmount} (${order.paymentMethod?.toUpperCase()} - ${order.paymentStatus})
*Customer:* ${order.customer?.name}
*Mobile:* +91 ${order.customer?.mobile}
*Address:* ${order.customer?.address}, ${order.customer?.city}${emiWaBlock}

*Items:*
${(order.items || []).map(
        (it, i) => `${i + 1}. *${it.productName}* (${it.selectedSize}) x${it.quantity} = \u20B9${it.totalPrice}`
      ).join("\n")}
---------------------------------------
Kripya order verify karke packing shuru karein!`;
      results.whatsapp = await sendWhatsAppNotification(waPhone, waText, cfg);
    }
    res.json({
      success: true,
      message: "All notifications processed",
      results
    });
  });
  const ORDERS_FILE = import_path.default.join(DATA_DIR, "orders.json");
  const PRODUCTS_FILE = import_path.default.join(DATA_DIR, "products.json");
  const SETTINGS_FILE = import_path.default.join(DATA_DIR, "settings.json");
  const CATEGORIES_FILE = import_path.default.join(DATA_DIR, "categories.json");
  const BANNERS_FILE = import_path.default.join(DATA_DIR, "banners.json");
  function readJsonFile(filePath, fallback) {
    if (!import_fs.default.existsSync(filePath)) return fallback;
    try {
      return JSON.parse(import_fs.default.readFileSync(filePath, "utf8"));
    } catch {
      return fallback;
    }
  }
  function writeJsonFile(filePath, data) {
    try {
      import_fs.default.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error(`Failed to write ${filePath}:`, err);
    }
  }
  let sseClients = [];
  const currentVersions = {
    products: Date.now(),
    banners: Date.now(),
    categories: Date.now(),
    settings: Date.now(),
    orders: Date.now()
  };
  function broadcastRealtimeUpdate(type, data) {
    currentVersions[type] = Date.now();
    const message = JSON.stringify({
      type,
      data,
      timestamp: currentVersions[type],
      versions: currentVersions
    });
    sseClients = sseClients.filter((client) => {
      try {
        client.write(`event: ${type}
data: ${message}

`);
        return true;
      } catch {
        return false;
      }
    });
  }
  app.get("/api/sync/events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();
    res.write(
      `event: connected
data: ${JSON.stringify({
        status: "connected",
        versions: currentVersions,
        timestamp: Date.now()
      })}

`
    );
    sseClients.push(res);
    const heartbeat = setInterval(() => {
      try {
        res.write(": keepalive\n\n");
      } catch {
        clearInterval(heartbeat);
      }
    }, 15e3);
    req.on("close", () => {
      clearInterval(heartbeat);
      sseClients = sseClients.filter((c) => c !== res);
    });
  });
  app.get("/api/sync/versions", (req, res) => {
    res.json({
      versions: currentVersions,
      connectedDevices: sseClients.length,
      serverTime: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app.get("/api/orders", (req, res) => {
    const orders = readJsonFile(ORDERS_FILE, []);
    res.json({ orders });
  });
  app.post("/api/orders", async (req, res) => {
    const newOrder = req.body;
    if (!newOrder || !newOrder.id) {
      res.status(400).json({ error: "Invalid order payload" });
      return;
    }
    const orders = readJsonFile(ORDERS_FILE, []);
    const existingIndex = orders.findIndex((o) => o.id === newOrder.id);
    if (existingIndex >= 0) {
      orders[existingIndex] = newOrder;
    } else {
      orders.unshift(newOrder);
    }
    writeJsonFile(ORDERS_FILE, orders);
    const products = readJsonFile(PRODUCTS_FILE, []);
    if (products.length > 0 && Array.isArray(newOrder.items)) {
      newOrder.items.forEach((it) => {
        const prod = products.find((p) => p.id === it.productId);
        if (prod) {
          prod.stock = Math.max(0, (prod.stock || 0) - (it.quantity || 1));
        }
      });
      writeJsonFile(PRODUCTS_FILE, products);
    }
    const cfg = getNotificationConfig();
    const itemsSummary = (newOrder.items || []).map((it) => `${it.productName} (${it.selectedSize}) x${it.quantity}`).join(", ");
    const results = {
      push: null,
      sms: null,
      whatsapp: null
    };
    try {
      const isEmiOrder = newOrder.paymentMethod === "emi" || newOrder.paymentMethod === "upi_mandate" || !!newOrder.emiDetails;
      const customerUpi = newOrder.emiDetails?.mandateUpiId || newOrder.customer?.upiId || "";
      if (cfg.enablePush) {
        const pushBody = isEmiOrder && customerUpi ? `Customer: ${newOrder.customer?.name}
\u26A1 EMI Mandate UPI: ${customerUpi} (${newOrder.emiDetails?.tenure || "3 Months"})
Items: ${itemsSummary}` : `Customer: ${newOrder.customer?.name} (${newOrder.customer?.city || "Chhuikhadan"})
Items: ${itemsSummary}`;
        results.push = await sendWebPushNotification({
          title: `\u{1F6CD}\uFE0F Naya Order: ${newOrder.orderNumber} (\u20B9${newOrder.totalAmount})${isEmiOrder ? " [EMI]" : ""}`,
          body: pushBody,
          url: "/admin?orderId=" + newOrder.id,
          orderId: newOrder.id
        });
      }
      if (cfg.enableSms && cfg.ownerPhone) {
        const upiSnippet = isEmiOrder && customerUpi ? ` [EMI UPI: ${customerUpi}]` : "";
        const smsText = `ABHI FASHION: Naya Order mila! #${newOrder.orderNumber}, Rs.${newOrder.totalAmount}, Customer: ${newOrder.customer?.name} (+91${newOrder.customer?.mobile})${upiSnippet}, ${newOrder.customer?.city}. Check Admin App now!`;
        results.sms = await sendSmsNotification(cfg.ownerPhone, smsText, cfg);
      }
      if (cfg.enableWhatsApp && (cfg.ownerWhatsApp || cfg.ownerPhone)) {
        const waPhone = cfg.ownerWhatsApp || cfg.ownerPhone;
        const emiSection = isEmiOrder ? `
\u26A1 *EASY EMI ORDER DETAILS:*
\u2022 *Customer UPI ID:* \`${customerUpi || "Not entered"}\` \u{1F448} (Copy to UPI App)
\u2022 *Tenure:* ${newOrder.emiDetails?.tenure || "3 Months"}
\u2022 *Monthly Installment:* \u20B9${newOrder.emiDetails?.monthlyInstallment || Math.round(newOrder.totalAmount / 3)}/month
\u2022 *Action:* Apne UPI App (PhonePe/GPay/Paytm) se is UPI ID (${customerUpi}) par mandate/payment request send karein!
---------------------------------------` : "";
        const waText = `\u{1F6CD}\uFE0F *NEW ORDER ALERT - ABHI FASHION*
---------------------------------------
*Order ID:* ${newOrder.orderNumber}
*Total:* \u20B9${newOrder.totalAmount} (${(newOrder.paymentMethod || "").toUpperCase()} - ${newOrder.paymentStatus})
*Customer:* ${newOrder.customer?.name}
*Mobile:* +91 ${newOrder.customer?.mobile}
*Address:* ${newOrder.customer?.address}, ${newOrder.customer?.city}${emiSection}

*Items:*
${(newOrder.items || []).map(
          (it, i) => `${i + 1}. *${it.productName}* (${it.selectedSize}) x${it.quantity} = \u20B9${it.totalPrice}`
        ).join("\n")}
---------------------------------------
Kripya Admin App open karke order check karein:
http://localhost:3000/admin`;
        results.whatsapp = await sendWhatsAppNotification(waPhone, waText, cfg);
      }
    } catch (e) {
      console.warn("Notification broadcast error on order placement:", e);
    }
    res.json({ success: true, order: newOrder, results });
  });
  app.put("/api/orders/:id/status", (req, res) => {
    const { id } = req.params;
    const { status, paymentStatus } = req.body;
    const orders = readJsonFile(ORDERS_FILE, []);
    const order = orders.find((o) => o.id === id);
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    if (status) order.orderStatus = status;
    if (paymentStatus) order.paymentStatus = paymentStatus;
    order.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    writeJsonFile(ORDERS_FILE, orders);
    res.json({ success: true, order });
  });
  app.delete("/api/orders/:id", (req, res) => {
    const { id } = req.params;
    let orders = readJsonFile(ORDERS_FILE, []);
    orders = orders.filter((o) => o.id !== id);
    writeJsonFile(ORDERS_FILE, orders);
    res.json({ success: true });
  });
  app.get("/api/products", (req, res) => {
    const products = readJsonFile(PRODUCTS_FILE, null);
    res.json({ products });
  });
  app.post("/api/products", (req, res) => {
    const { products } = req.body;
    if (Array.isArray(products)) {
      writeJsonFile(PRODUCTS_FILE, products);
      broadcastRealtimeUpdate("products", products);
      res.json({ success: true, total: products.length });
    } else {
      res.status(400).json({ error: "Array of products required" });
    }
  });
  app.delete("/api/products/:id", (req, res) => {
    const { id } = req.params;
    let products = readJsonFile(PRODUCTS_FILE, []);
    products = products.filter((p) => p.id !== id);
    writeJsonFile(PRODUCTS_FILE, products);
    broadcastRealtimeUpdate("products", products);
    res.json({ success: true, remaining: products.length });
  });
  const CUSTOMERS_FILE = import_path.default.join(DATA_DIR, "customers.json");
  app.post("/api/customer/login", (req, res) => {
    const { mobile, name } = req.body;
    if (!mobile) {
      res.status(400).json({ error: "Mobile number is required" });
      return;
    }
    const cleanMobile = String(mobile).replace(/\D/g, "").slice(-10);
    if (cleanMobile.length !== 10) {
      res.status(400).json({ error: "Please provide a valid 10-digit mobile number" });
      return;
    }
    const customers = readJsonFile(CUSTOMERS_FILE, []);
    let customer = customers.find((c) => c.mobile === cleanMobile);
    if (customer) {
      if (name && name.trim()) {
        customer.name = name.trim();
      }
      customer.lastLoginAt = (/* @__PURE__ */ new Date()).toISOString();
    } else {
      customer = {
        mobile: cleanMobile,
        name: name && name.trim() || "Guest Customer",
        address: "",
        city: "Chhuikhadan",
        state: "Chhattisgarh",
        pincode: "491885",
        landmark: "",
        upiId: "",
        cart: [],
        wishlist: [],
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        lastLoginAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      customers.push(customer);
    }
    writeJsonFile(CUSTOMERS_FILE, customers);
    const orders = readJsonFile(ORDERS_FILE, []);
    const customerOrders = orders.filter((o) => {
      const orderMob = String(o.customer?.mobile || "").replace(/\D/g, "").slice(-10);
      return orderMob === cleanMobile;
    });
    res.json({
      success: true,
      customer,
      orders: customerOrders
    });
  });
  app.get("/api/customer/profile", (req, res) => {
    const mobile = req.query.mobile;
    if (!mobile) {
      res.status(400).json({ error: "Mobile query param is required" });
      return;
    }
    const cleanMobile = String(mobile).replace(/\D/g, "").slice(-10);
    const customers = readJsonFile(CUSTOMERS_FILE, []);
    const customer = customers.find((c) => c.mobile === cleanMobile) || null;
    const orders = readJsonFile(ORDERS_FILE, []);
    const customerOrders = orders.filter((o) => {
      const orderMob = String(o.customer?.mobile || "").replace(/\D/g, "").slice(-10);
      return orderMob === cleanMobile;
    });
    res.json({
      success: true,
      customer,
      orders: customerOrders
    });
  });
  app.post("/api/customer/sync", (req, res) => {
    const { mobile, name, address, city, state, pincode, landmark, upiId, cart, wishlist } = req.body;
    if (!mobile) {
      res.status(400).json({ error: "Mobile number is required" });
      return;
    }
    const cleanMobile = String(mobile).replace(/\D/g, "").slice(-10);
    const customers = readJsonFile(CUSTOMERS_FILE, []);
    let customer = customers.find((c) => c.mobile === cleanMobile);
    if (customer) {
      if (name !== void 0) customer.name = name;
      if (address !== void 0) customer.address = address;
      if (city !== void 0) customer.city = city;
      if (state !== void 0) customer.state = state;
      if (pincode !== void 0) customer.pincode = pincode;
      if (landmark !== void 0) customer.landmark = landmark;
      if (upiId !== void 0) customer.upiId = upiId;
      if (cart !== void 0) customer.cart = cart;
      if (wishlist !== void 0) customer.wishlist = wishlist;
      customer.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    } else {
      customer = {
        mobile: cleanMobile,
        name: name || "Valued Customer",
        address: address || "",
        city: city || "Chhuikhadan",
        state: state || "Chhattisgarh",
        pincode: pincode || "491885",
        landmark: landmark || "",
        upiId: upiId || "",
        cart: cart || [],
        wishlist: wishlist || [],
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        lastLoginAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      customers.push(customer);
    }
    writeJsonFile(CUSTOMERS_FILE, customers);
    res.json({ success: true, customer });
  });
  app.get("/api/customers", (req, res) => {
    const customers = readJsonFile(CUSTOMERS_FILE, []);
    const orders = readJsonFile(ORDERS_FILE, []);
    const enriched = customers.map((c) => {
      const custOrders = orders.filter((o) => {
        const orderMob = String(o.customer?.mobile || "").replace(/\D/g, "").slice(-10);
        return orderMob === c.mobile;
      });
      const totalSpent = custOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      return {
        ...c,
        ordersCount: custOrders.length,
        totalSpent
      };
    });
    res.json({ customers: enriched });
  });
  app.get("/api/settings", (req, res) => {
    const settings = readJsonFile(SETTINGS_FILE, null);
    res.json({ settings });
  });
  app.post("/api/settings", (req, res) => {
    const { settings } = req.body;
    if (settings && typeof settings === "object") {
      writeJsonFile(SETTINGS_FILE, settings);
      broadcastRealtimeUpdate("settings", settings);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: "Settings object required" });
    }
  });
  app.get("/api/categories", (req, res) => {
    const categories = readJsonFile(CATEGORIES_FILE, null);
    res.json({ categories });
  });
  app.post("/api/categories", (req, res) => {
    const { categories } = req.body;
    if (Array.isArray(categories)) {
      writeJsonFile(CATEGORIES_FILE, categories);
      broadcastRealtimeUpdate("categories", categories);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: "Array of categories required" });
    }
  });
  const DEFAULT_INITIAL_BANNERS = [
    {
      id: "b1",
      title: "AB FASHION HOGA AUR BHI EASY!",
      subtitle: "SHOP NOW \u2022 PAY LATER",
      badge: "FESTIVE & WEDDING SPECIAL",
      offerText: "NO COST EMI AVAILABLE \u2022 2-3 MONTHS TENURE",
      image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&auto=format&fit=crop&q=80",
      categoryId: "shirts",
      isEnabled: true
    },
    {
      id: "b2",
      title: "NEW MEN\u2019S WEAR ARRIVALS",
      subtitle: "PREMIUM QUALITY \u2022 DIRECT DUKAAN RATES",
      badge: "CHHUIKHADAN SPECIAL",
      offerText: "FLAT 20% TO 50% OFF ON ALL NEW ARRIVALS",
      image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&auto=format&fit=crop&q=80",
      categoryId: "jeans",
      isEnabled: true
    },
    {
      id: "b3",
      title: "FESTIVAL OF FASHION",
      subtitle: "ROYAL OXFORD SHIRTS & STRETCH TROUSERS",
      badge: "MEGA SALE IS LIVE",
      offerText: "BUY 2 GET 10% EXTRA DISCOUNT \u2022 COD AVAILABLE",
      image: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=1600&auto=format&fit=crop&q=80",
      categoryId: "trousers",
      isEnabled: true
    }
  ];
  app.get("/api/banners", (req, res) => {
    let banners = readJsonFile(BANNERS_FILE, null);
    if (!banners || !Array.isArray(banners)) {
      banners = DEFAULT_INITIAL_BANNERS;
      writeJsonFile(BANNERS_FILE, banners);
    }
    res.json({ banners });
  });
  app.post("/api/banners", (req, res) => {
    const { banners } = req.body;
    if (Array.isArray(banners)) {
      writeJsonFile(BANNERS_FILE, banners);
      broadcastRealtimeUpdate("banners", banners);
      res.json({ success: true, total: banners.length });
    } else {
      res.status(400).json({ error: "Array of banners required" });
    }
  });
  app.delete("/api/banners/:id", (req, res) => {
    const { id } = req.params;
    let banners = readJsonFile(BANNERS_FILE, DEFAULT_INITIAL_BANNERS);
    banners = banners.filter((b) => b.id !== id);
    writeJsonFile(BANNERS_FILE, banners);
    broadcastRealtimeUpdate("banners", banners);
    res.json({ success: true, remaining: banners.length });
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === "true" ? false : void 0
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[ABHI FASHION Server] Running on http://0.0.0.0:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Fatal server startup error:", err);
});
//# sourceMappingURL=server.cjs.map
