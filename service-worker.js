// ============================================
// SERVICE WORKER — CÍRCULO VITAL
// ============================================

const VERSION = 'v10';
const CACHE_NAME = `circulo-vital-${VERSION}`;
const BASE_PATH = '/circulo-vital';

const APP_SHELL = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/manifest.json`,
  `${BASE_PATH}/icon-192.png`,
  `${BASE_PATH}/icon-512.png`
];

// 1. INSTALACIÓN
self.addEventListener('install', event => {
  console.log('[SW] Instalando v10');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
      .catch(err => console.error('[SW] Error install:', err))
  );
});

// 2. ACTIVACIÓN
self.addEventListener('activate', event => {
  console.log('[SW] Activando v10');
  event.waitUntil(
    caches.keys().then(names => 
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

// 3. FETCH
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;

  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(`${BASE_PATH}/index.html`, clone));
          }
          return res;
        })
        .catch(() => caches.match(`${BASE_PATH}/index.html`))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone));
        }
        return res;
      });
    })
  );
});

// 4. PUSH - ¡Aquí está la magia!
self.addEventListener('push', function(event) {
  console.log('[SW] Push recibido:', event.data ? event.data.text() : 'sin datos');
  
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body || 'Tienes una nueva notificación',
        icon: `${BASE_PATH}/icon-192.png`,
        badge: `${BASE_PATH}/icon-192.png`,
        vibrate: [200, 100, 200, 100, 200],
        tag: 'circulo-vital-alerta',
        requireInteraction: true,
        sound: 'default'
      };
      event.waitUntil(
        self.registration.showNotification(data.title || '🚨 Círculo Vital', options)
      );
    } catch (e) {
      console.error('[SW] Error parseando push:', e);
      event.waitUntil(
        self.registration.showNotification('🚨 Círculo Vital', {
          body: 'Alerta de emergencia',
          icon: `${BASE_PATH}/icon-192.png`,
          vibrate: [200, 100, 200]
        })
      );
    }
  }
});

// 5. CLICK EN NOTIFICACIÓN
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (let c of clientList) {
        if (c.url.includes('circulo-vital') && 'focus' in c) return c.focus();
      }
      return clients.openWindow(`${BASE_PATH}/`);
    })
  );
});
