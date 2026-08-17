const VERSION = 'v6';
const CACHE_NAME = `circulo-vital-${VERSION}`;
const APP_SHELL = ['./', './index.html', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || !r.url.startsWith('http')) return;
  if (r.mode === 'navigate' || r.destination === 'document') {
    e.respondWith(fetch(r).then(res => {
      const c = res.clone();
      caches.open(CACHE_NAME).then(cache => cache.put('./index.html', c));
      return res;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(r).then(c => c || fetch(r).then(res => {
    if (res.ok) { const c = res.clone(); caches.open(CACHE_NAME).then(cache => cache.put(r, c)); }
    return res;
  })));
});