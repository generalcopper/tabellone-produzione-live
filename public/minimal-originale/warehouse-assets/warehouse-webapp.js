// Installation support only. The authenticated dashboard owns all business data.
const root = document.documentElement;
const standalone = matchMedia('(display-mode: standalone)');
const systemTheme = matchMedia('(prefers-color-scheme: dark)');
function syncShell() {
  root.dataset.standalone = String(standalone.matches || navigator.standalone === true);
  root.dataset.fullscreen = String(!!document.fullscreenEnabled && typeof root.requestFullscreen === 'function');
  const theme = document.querySelector('meta[name="theme-color"]');
  if (theme) theme.content = getComputedStyle(root).getPropertyValue('--bg').trim() || '#ffffff';
}
syncShell();
standalone.addEventListener('change', syncShell);
systemTheme.addEventListener('change', syncShell);
new MutationObserver(syncShell).observe(root, {attributes:true, attributeFilter:['data-theme']});
window.addEventListener('pageshow', syncShell);

function syncConnection() {
  const banner = document.getElementById('warehouse-connection');
  if (banner) banner.hidden = navigator.onLine;
}
window.addEventListener('online', syncConnection);
window.addEventListener('offline', syncConnection);
syncConnection();

if ('serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/minimal-originale/warehouse-sw.js', {
        scope:'/minimal-originale/', updateViaCache:'none'
      });
      // A normal load already checks for updates. Long-running installations check on resume,
      // at most once per six hours. This does not touch Firebase or any dashboard endpoint.
      let lastCheck = Date.now();
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && Date.now() - lastCheck >= 6 * 60 * 60_000) {
          lastCheck = Date.now();
          void registration.update().catch(() => {});
        }
      });
    } catch {
      // Private browsing or disabled service workers must not prevent the online cockpit.
    }
  }, {once:true});
}
