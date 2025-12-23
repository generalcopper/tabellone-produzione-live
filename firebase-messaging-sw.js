/* Firebase Messaging Service Worker (compat) - Hub Linea Polveri
   Nota: questo file deve stare nella stessa cartella dell'HTML su GitHub Pages
*/
importScripts('https://www.gstatic.com/firebasejs/12.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBiyB4pilnPpVj8vImD4PI6LF2_RtyDnv4",
  authDomain: "tabellone-produzione-liv-e313e.firebaseapp.com",
  projectId: "tabellone-produzione-liv-e313e",
  storageBucket: "tabellone-produzione-liv-e313e.firebasestorage.app",
  messagingSenderId: "537555699968",
  appId: "1:537555699968:web:4d04cb9596b67bfb0e4be5"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || "Aggiornamento produzione";
  const body  = payload?.notification?.body  || "";
  const data  = payload?.data || {};

  // link: preferisci quello inviato dal server
  const link =
    (payload?.fcmOptions && payload.fcmOptions.link) ||
    data.link ||
    "./hub_linea_polveri_PWA_PUSH_v21.html";

  const icon  = data.icon  || "icons/icon-192.png";
  const badge = data.badge || "icons/badge-72.png";

  self.registration.showNotification(title, {
    body,
    icon,
    badge,
    data: { link, ...data }
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification?.data?.link || "./hub_linea_polveri_PWA_PUSH_v21.html";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        // se c'è già una tab dell'app, portala davanti
        if (client.url.includes("/tabellone-produzione-live/")) {
          return client.focus().then(() => client.navigate(link));
        }
      }
      return clients.openWindow(link);
    })
  );
});
