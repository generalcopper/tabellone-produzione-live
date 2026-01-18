/*
  GC Service Worker (v1)
  - Cache "app shell" (HTML/CSS/JS/IMG) per evitare che i moduli si riscarichino ogni volta.
  - Strategia: stale-while-revalidate (veloce, e si aggiorna in background).
  - Esclude /__/ (Firebase reserved) e richieste non-GET.
*/

const VERSION = "2026-01-18_v1";
const CACHE_SHELL = `gc-shell-${VERSION}`;
const CACHE_RUNTIME = `gc-runtime-${VERSION}`;

const CORE_ASSETS = [
  "/",
  "/gc_perf.css",
  "/gc_perf.js",
  "/gc_sw.js",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_SHELL);
      await Promise.all(
        CORE_ASSETS.map((url) =>
          cache.add(new Request(url, { cache: "reload" })).catch(() => null)
        )
      );
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((k) => {
          if (k.startsWith("gc-shell-") && k !== CACHE_SHELL)
            return caches.delete(k);
          if (k.startsWith("gc-runtime-") && k !== CACHE_RUNTIME)
            return caches.delete(k);
          return null;
        })
      );
      await self.clients.claim();
    })()
  );
});

function isCacheableRequest(req) {
  try {
    if (!req || req.method !== "GET") return false;
    const url = new URL(req.url);

    // Solo stesso origin
    if (url.origin !== self.location.origin) return false;

    // Firebase reserved & auth handlers: mai cache
    if (url.pathname.startsWith("/__/")) return false;

    // Non cacheare endpoint API custom, se presenti
    if (url.pathname.startsWith("/api/")) return false;

    // Evita query con token espliciti
    if (
      url.search &&
      /(token=|auth=|id_token=|access_token=)/i.test(url.search)
    )
      return false;

    return true;
  } catch (_e) {
    return false;
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);

  const cached = await cache.match(req, { ignoreVary: true });

  const fetchPromise = fetch(req)
    .then((resp) => {
      try {
        // Cache solo risposte "basic" e ok
        if (resp && resp.status === 200 && resp.type === "basic") {
          cache.put(req, resp.clone());
        }
      } catch (_e) {}
      return resp;
    })
    .catch(() => null);

  if (cached) {
    // aggiorna in background
    fetchPromise.catch(() => null);
    return cached;
  }

  const fresh = await fetchPromise;
  if (fresh) return fresh;

  return cached || Response.error();
}

self.addEventListener("fetch", (event) => {
  try {
    const req = event.request;
    if (!isCacheableRequest(req)) return;

    const url = new URL(req.url);
    const dest = req.destination;

    // Navigazioni / documenti (HTML)
    if (
      req.mode === "navigate" ||
      dest === "document" ||
      url.pathname.endsWith(".html")
    ) {
      event.respondWith(staleWhileRevalidate(req, CACHE_SHELL));
      return;
    }

    // Assets statici
    if (
      dest === "script" ||
      dest === "style" ||
      dest === "image" ||
      dest === "font"
    ) {
      event.respondWith(staleWhileRevalidate(req, CACHE_RUNTIME));
      return;
    }

    // Default
    event.respondWith(staleWhileRevalidate(req, CACHE_RUNTIME));
  } catch (_e) {
    // no-op
  }
});
