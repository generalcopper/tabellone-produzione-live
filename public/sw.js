/*
  Service Worker — Hub Centrale
  Obiettivo: evitare "Page not found" all'avvio in modalità App/PWA e dare un fallback robusto.

  NOTE Hosting (Firebase): imposta Cache-Control: no-cache su /sw.js e /manifest.webmanifest
  così gli update arrivano subito.
*/

const CACHE_NAME = 'gc-hub-v20260118';

// Pagine/asset minimi: tieni leggero per non creare problemi se qualche file cambia.
const PRECACHE = [
  '/',
  '/?pwa=1',
  '/index.html',
  '/manifest.webmanifest',
  '/logo%20general%20copper.png',
  '/icons/icon-180.png',
  '/public1/app.css',
  '/public1/app.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    // cache:'reload' forza bypass cache HTTP (utile quando il browser ha roba vecchia)
    await cache.addAll(PRECACHE.map((u) => new Request(u, { cache: 'reload' })));

    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // NAVIGAZIONE (documenti): network-first con fallback se 404 o offline
  if (req.mode === 'navigate' || (req.destination === 'document')) {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);

        // Se il server risponde 404 (tipico quando start_url punta a un path non esistente)
        // allora ricadiamo sul root.
        if (res && res.status === 404) {
          const cache = await caches.open(CACHE_NAME);
          return (
            (await cache.match('/?pwa=1')) ||
            (await cache.match('/')) ||
            (await cache.match('/index.html')) ||
            res
          );
        }

        // Aggiorna cache dei documenti (best effort)
        try {
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, res.clone());
        } catch (_e) {}

        return res;
      } catch (_err) {
        const cache = await caches.open(CACHE_NAME);
        return (
          (await cache.match(req)) ||
          (await cache.match('/?pwa=1')) ||
          (await cache.match('/')) ||
          (await cache.match('/index.html')) ||
          new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
        );
      }
    })());
    return;
  }

  // ASSET: cache-first leggero
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    if (cached) return cached;

    try {
      const res = await fetch(req);
      if (res && res.ok) {
        // cache best-effort per asset statici
        if (
          req.destination === 'script' ||
          req.destination === 'style' ||
          req.destination === 'image' ||
          req.destination === 'font'
        ) {
          try { cache.put(req, res.clone()); } catch (_e) {}
        }
      }
      return res;
    } catch (_err) {
      return cached || new Response('', { status: 504 });
    }
  })());
});
