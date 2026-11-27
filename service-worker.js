// ============================================
// SERVICE WORKER — CÍRCULO VITAL v11
// ============================================

const VERSION = 'v11';
const CACHE_NAME = `circulo-vital-${VERSION}`;
const BASE_PATH = '/circulo-vital';

const APP_SHELL = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/manifest.json`,
  `${BASE_PATH}/icon-192.png`,
  `${BASE_PATH}/icon-512.png`
];

self.addEventListener('install', event => {
  console.log('[SW] Instalando v11');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
      .catch(err => console.error('[SW] Error install:', err))
  );
});

self.addEventListener('activate', event => {
  console.log('[SW] Activando v11');
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

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

// ============================================
// PUSH — con vibración FUERTE para SOS (como Ruta)
// ============================================
self.addEventListener('push', function(event) {
  console.log('[SW] Push recibido:', event.data ? event.data.text() : 'sin datos');

  event.waitUntil((async () => {
    let data = {};
    try {
      data = event.data ? event.data.json() : {};
    } catch (e) {
      data = { title: '🚨 Círculo Vital', body: 'Alerta de emergencia' };
    }

    const tipo = (data.data && data.data.tipo) || 'general';

    // Vibración según gravedad (igual que Ruta)
    let vibrate = [500, 200, 500];
    if (tipo === 'sos') vibrate = [1000, 500, 1000, 500, 1000, 500, 1000];

    // URL para el click: abre la app en modo emergencia cuidador
    let url = `${BASE_PATH}/`;
    if (tipo === 'sos') {
      const lat = data.data && data.data.lat ? data.data.lat : '';
      const lon = data.data && data.data.lon ? data.data.lon : '';
      url = `${BASE_PATH}/?sos=1&lat=${lat}&lon=${lon}`;
    }

    await self.registration.showNotification(data.title || '🚨 Círculo Vital', {
      body: data.body || 'Tienes una nueva alerta',
      icon: `${BASE_PATH}/icon-192.png`,
      badge: `${BASE_PATH}/icon-192.png`,
      tag: tipo === 'sos' ? 'cv-sos' : 'cv-alerta',
      renotify: true,
      requireInteraction: true,
      vibrate: vibrate,
      data: { url: url, tipo: tipo, lat: data.data ? data.data.lat : null, lon: data.data ? data.data.lon : null }
    });
  })());
});

// ============================================
// CLICK — abre la app en pantalla de EMERGENCIA
// ============================================
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = event.notification.data ? event.notification.data.url : `${BASE_PATH}/`;

  event.waitUntil((async () => {
    const clientes = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of clientes) {
      if (c.url.includes('circulo-vital') && 'focus' in c) {
        await c.focus();
        if (event.notification.data && event.notification.data.tipo === 'sos') {
          c.postMessage({ tipo: 'cv-sos', lat: event.notification.data.lat, lon: event.notification.data.lon });
        }
        return;
      }
    }
    await clients.openWindow(url);
  })());
});
