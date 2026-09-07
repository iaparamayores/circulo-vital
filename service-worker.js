// ============================================
// SERVICE WORKER — CÍRCULO VITAL
// Estrategia: network-first para HTML (se actualiza solo)
//             cache-first para íconos y manifest
// ============================================

const VERSION = 'v8';  // ← subir solo si cambiás íconos o manifest
const CACHE_NAME = `circulo-vital-${VERSION}`;

// Archivos que se guardan sí o sí al instalar la app
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// ============================================
// INSTALACIÓN: guarda los archivos base
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
// ACTIVACIÓN: limpia cachés viejas y toma el control
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
// INTERCEPTAR PETICIONES
// ============================================
self.addEventListener('fetch', event => {
  const request = event.request;

  // Solo manejamos GET y peticiones http(s)
  if (request.method !== 'GET' || !request.url.startsWith('http')) return;

  // 🔴 HTML (navegación): NETWORK-FIRST
  // Siempre busca lo más nuevo en internet; usa caché solo si no hay red.
  // Así los cambios al index.html llegan solos, sin tocar VERSION.
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
          console.log('[SW] Sin red para HTML, usando caché');
          return caches.match('./index.html');
        })
    );
    return;
  }

  // 🔵 Todo lo demás (íconos, manifest, imágenes): CACHE-FIRST
  // Usa lo guardado; solo va a internet si no está cacheado.
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
});