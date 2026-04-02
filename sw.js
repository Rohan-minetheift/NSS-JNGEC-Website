// ─────────────────────────────────────────────────────────────────
// NSS JNGEC — Service Worker (Push Notifications + Offline Cache)
// ─────────────────────────────────────────────────────────────────

const CACHE_NAME = 'nss-jngec-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;700&family=Inter:wght@300;400;500;600&display=swap',
  'https://upload.wikimedia.org/wikipedia/commons/4/4b/National_Service_Scheme_logo.svg'
];

// ── Install Event: Cache essential assets ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// ── Activate Event: Clean old caches ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// ── Fetch Event: Network-first strategy with cache fallback ──
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone and cache successful responses
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ── Push Event: Show notification when admin sends one ──
self.addEventListener('push', (event) => {
  let data = {
    title: 'NSS JNGEC',
    body: 'New update from NSS Unit!',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/National_Service_Scheme_logo.svg',
    badge: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/National_Service_Scheme_logo.svg',
    url: './',
    tag: 'nss-notification',
    vibrate: [200, 100, 200]
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: data.vibrate,
    tag: data.tag,
    renotify: true,
    requireInteraction: true,
    actions: [
      { action: 'open', title: '🔗 Open Site' },
      { action: 'dismiss', title: '✕ Dismiss' }
    ],
    data: {
      url: data.url || './'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ── Notification Click: Open site when user taps notification ──
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || './';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if open
        for (const client of clientList) {
          if (client.url.includes('index.html') || client.url.endsWith('/')) {
            client.focus();
            return;
          }
        }
        // Otherwise open new window
        return clients.openWindow(targetUrl);
      })
  );
});
