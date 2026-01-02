// Minimal SW: keeps app "installable" without aggressive caching.
// You can add caching later if you want offline support.
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Pass-through fetch (no caching)
self.addEventListener('fetch', () => {});
