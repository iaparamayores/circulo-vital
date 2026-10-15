// ============================================
// SERVICE WORKER — CÍRCULO VITAL
// Estrategia: network-first para HTML, cache-first para el resto
// ============================================

const VERSION = 'v9';  // ← Subimos a v9 para forzar la actualización del SW roto
const CACHE_NAME = `circulo-vital-${VERSION}`;

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// ============================================
// 1. INSTALACIÓN
// ============================================
self.addEventListener('install', event => {
  console.log('[SW] Instalando nueva versión:', VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cacheando APP_SHELL');
        return cache.addAll(APP_SHELL);
      })
      .then(() => {
        console.log('[SW] Instalación lista, activando al toque');
        return self.skipWaiting();
      })
      .catch(err => console.error('[SW] Error en install:', err))
  );
});

// ============================================
// 2. ACTIVACIÓN
// ============================================
self.addEventListener('activate', event => {
  console.log('[SW] Activando versión:', VERSION);
  event.waitUntil(
    caches.keys().then(cacheNames => {
      const promesas = cacheNames
        .filter(name => name !== CACHE_NAME)
        .map(name => {
          console.log('[SW] Borrando caché vieja:', name);
          return caches.delete(name);
        });
      return Promise.all(promesas);
    }).then(() => {
      console.log('[SW] Tomando control de las pestañas abiertas');
      return self.clients.claim();
    }).catch(err => console.error('[SW] Error en activate:', err))
  );
});

// ============================================
// 3. INTERCEPTAR PETICIONES (FETCH)
// ============================================
self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET' || !request.url.startsWith('http')) return;

  // HTML: NETWORK-FIRST
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put('./index.html', responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match('./index.html');
        })
    );
    return;
  }

  // Todo lo demás: CACHE-FIRST
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
        }
        return response;
      });
    })
  );
}); // <--- AQUÍ TERMINA CORRECTAMENTE EL FETCH

// ============================================
// 4. ESCUCHAR EVENTOS PUSH ENTRANTES
// ============================================
self.addEventListener('push', function(event) {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body || 'Tienes una nueva notificación',
            icon: './icon-192.png',
            badge: './icon-192.png',
            vibrate: [200, 100, 200, 100, 200], // Vibración más notoria para emergencias
            tag: 'circulo-vital-alerta',
            requireInteraction: true // Mantiene la notificación en pantalla hasta que se toque
        };
        event.waitUntil(
            self.registration.showNotification(data.title || '🚨 Círculo Vital', options)
        );
    }
});

// ============================================
// 5. QUÉ PASA AL TOCAR LA NOTIFICACIÓN
// ============================================
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/') // Abre la app en la raíz
    );
});
