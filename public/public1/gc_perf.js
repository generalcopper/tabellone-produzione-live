/*
  GC PERF BOOT
  - mette classi su <body> per CSS conditional (Android / iOS / lite)
  - safe-area “ridotta” ma non azzerata
  - non tocca la tua logica app (solo perf/UX)
*/

(function(){
  try{
    const ua = (navigator.userAgent || "").toLowerCase();
    const isAndroid = /android/.test(ua);
    const isIOS = /iphone|ipad|ipod/.test(ua) || (!!window.navigator.standalone);

    const root = document.documentElement;
    const body = document.body;

    if(isAndroid){ root.classList.add('is-android'); body.classList.add('is-android'); }
    if(isIOS){ root.classList.add('is-ios'); body.classList.add('is-ios'); }

    // Safe-area multiplier:
    // - iOS: leggermente ridotta (ma senza azzerarla)
    // - Android: praticamente nulla (0) perché non serve e “spreca” spazio
    let safeMult = 0.82;
    if(isAndroid) safeMult = 0.00;

    root.style.setProperty('--gc-safe-mult', String(safeMult));

    // Lite mode (solo su Android): riduce blur/ombre/animazioni dove serve
    // Trigger:
    // - saveData on
    // - deviceMemory bassa
    // - hardwareConcurrency bassa
    let lite = false;
    try{
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if(conn && conn.saveData) lite = true;
    }catch(_e){}

    try{
      const mem = navigator.deviceMemory;
      if(typeof mem === 'number' && mem > 0 && mem <= 4) lite = true;
    }catch(_e){}

    try{
      const hc = navigator.hardwareConcurrency;
      if(typeof hc === 'number' && hc > 0 && hc <= 4) lite = true;
    }catch(_e){}

    if(isAndroid && lite){ root.classList.add('gc-lite'); body.classList.add('gc-lite'); }

    // IMPORTANTISSIMO: su Android evita listener touch non-passivi aggiuntivi.
    // Qui non aggiungiamo nulla che blocchi lo scroll.

    // Fix micro: qualche WebView Android soffre con 100vh; forziamo 100dvh se supportato.
    try{
      const vv = window.visualViewport;
      if(vv && isAndroid){
        const setVh = ()=>{
          const h = Math.round(vv.height);
          root.style.setProperty('--gc-vh', h + 'px');
        };
        setVh();
        vv.addEventListener('resize', setVh, {passive:true});
        vv.addEventListener('scroll', setVh, {passive:true});
      }
    }catch(_e){}

  }catch(_e){}
})();
