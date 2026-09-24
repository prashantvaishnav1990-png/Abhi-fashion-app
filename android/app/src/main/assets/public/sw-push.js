// Service Worker Push Notification Handler for ABHI FASHION PWA

self.addEventListener('push', function (event) {
  let data = {
    title: '🛍️ ABHI FASHION - Naya Order!',
    body: 'Aapki dukaan par ek naya order aaya hai. Dekhne ke liye click karein.',
    url: '/?tab=admin&subtab=orders',
    orderId: '',
    vibrate: [300, 100, 300, 100, 300],
    tag: 'order-alert',
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text() || data.body;
    }
  }

  const title = data.title;
  const options = {
    body: data.body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: data.vibrate || [300, 100, 300, 100, 300],
    tag: data.tag || 'abhi-order-alert',
    renotify: true,
    requireInteraction: true, // keeps notification visible until dismissed
    data: {
      url: data.url || '/?tab=admin&subtab=orders',
      orderId: data.orderId,
    },
    actions: [
      { action: 'open_order', title: '👁️ View Order' },
      { action: 'close', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const urlToOpen = (event.notification.data && event.notification.data.url) || '/?tab=admin&subtab=orders';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(urlToOpen);
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Direct message from client to display local notification
self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, url, tag } = event.data;
    self.registration.showNotification(title || '🛍️ Naya Order - ABHI FASHION', {
      body: body || 'Order receive ho gaya hai!',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      vibrate: [250, 100, 250],
      tag: tag || 'direct-order-notice',
      data: { url: url || '/?tab=admin&subtab=orders' },
    });
  }
});
