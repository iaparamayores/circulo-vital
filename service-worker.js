// service-worker.js — Círculo Vital
// 👇 IMPORTANTE: cambialo cada vez que actualices archivos
const VERSION = 'v4';
const CACHE_NAME = `circulo-vital-${VERSION}`;

// Archivos básicos para funcionar offline
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json'
];

// ===== INSTALACIÓN =====
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting(); // ✅ Fuerza activación inmediata del SW nuevo
});

// ===== ACTIVACIÓN (borra cachés viejas) =====
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ===== PETICIONES =====
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Ignorar peticiones no-GET y no-http
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;

  // ✅ ESTRATEGIA NETWORK-FIRST para NAVEGACIÓN (index.html)
  // Siempre intenta traer la versión fresca; solo usa caché si no hay internet
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req)
        .then((response) => {
          // Si descargó bien, actualizar caché con la nueva versión
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put('./index.html', responseClone);
          });
          return response;
        })
        .catch(() => {
          // Si no hay internet, servir la versión guardada
          return caches.match('./index.html');
        })
    );
    return;
  }

  // ✅ ESTRATEGIA CACHE-FIRST para ASSETS (imágenes, manifest, etc)
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((response) => {
        // Guardar en caché para la próxima
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, responseClone));
        }
        return response;
      });
    })
  );
});