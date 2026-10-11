/* Hub Centrale: HTML aggiornato, fallback offline e installazione tollerante
   alle risorse opzionali mancanti. La cache non contiene dati/permessi Firebase. */
const CACHE_NAME = 'gc-hub-v20261011-startup';
const OPTIONAL_ASSETS = [
  '/manifest.webmanifest',
  '/logo%20general%20copper.png',
  '/icons/icon-180.png'
];

async function fetchWithTimeout(request, options={}){
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(),8000);
  try{return await fetch(request,{...options,signal:controller.signal});}
  finally{clearTimeout(timer);}
}

async function cachedResponse(request){
  try{
    const cache = await caches.open(CACHE_NAME);
    return await cache.match(request);
  }catch(_error){return null;}
}

async function cacheResponse(request,response){
  if(!response?.ok) return;
  try{
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request,response);
  }catch(_error){}
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache = await caches.open(CACHE_NAME);
    const home = await fetchWithTimeout('/index.html',{cache:'reload'});
    if(!home.ok) throw new Error('Hub index unavailable');
    await cache.put('/index.html',home);
    // Un'icona o un manifest mancante non deve annullare l'intera installazione.
    await Promise.allSettled(OPTIONAL_ASSETS.map(async url=>{
      const response = await fetchWithTimeout(url,{cache:'reload'});
      if(response.ok) await cache.put(url,response);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys = await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith('gc-hub-') && key !== CACHE_NAME).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  const req = event.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== self.location.origin || url.pathname.startsWith('/__/')) return;

  if(req.mode === 'navigate' || req.destination === 'document'){
    event.respondWith((async()=>{
      let response;
      try{
        response = await fetchWithTimeout(req,{cache:'no-cache'});
        if(response.ok){
          // Mantieni un'unica copia della home anche per / e /?pwa=1.
          const key = url.pathname === '/' || url.pathname === '/index.html' ? '/index.html' : req;
          event.waitUntil(cacheResponse(key,response.clone()));
          return response;
        }
        if(response.status !== 404 && response.status < 500) return response;
      }catch(_error){}
      return (await cachedResponse(req)) || (await cachedResponse('/index.html')) || response ||
        new Response('Connessione assente. Riprova quando la rete torna disponibile.',{
          status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}
        });
    })());
    return;
  }

  // Asset locali: mantieni la cache leggera e non intercettare l'autenticazione.
  event.respondWith((async()=>{
    const cached = await cachedResponse(req);
    if(cached) return cached;
    try{
      const response = await fetch(req);
      if(response.ok && ['script','style','image','font'].includes(req.destination)){
        event.waitUntil(cacheResponse(req,response.clone()));
      }
      return response;
    }catch(_error){return new Response('',{status:504});}
  })());
});
