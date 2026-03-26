// Basic Service Worker to satisfy PWA install criteria
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  // Just a pass-through
  event.respondWith(fetch(event.request));
});
