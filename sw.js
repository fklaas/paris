const CACHE = 'paris-2026-location-place-v1';
const STATIC_ASSETS = [
  './manifest.webmanifest','./icon-192.png','./icon-512.png',
  './ambient.css','./ambient.js','./location-service.js','./onboarding.js','./profile-center.js','./gallery.css','./reisebuch.css','./reisebuch.js',
  './live-moments.css','./smart-photo-moments.css','./revue.css','./day-closure.css'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const isAppCode = event.request.mode === 'navigate' || /\.(?:html|js)$/i.test(url.pathname);

  if (isAppCode) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => caches.match(event.request).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(hit => hit || fetch(event.request).then(response => {
      if (response.ok && url.origin === self.location.origin) {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
      }
      return response;
    }))
  );
});
