/* Firebase Messaging Service Worker (no-op fetch handler removed) */
/* eslint-disable no-undef */

importScripts("https://www.gstatic.com/firebasejs/12.7.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.7.0/firebase-messaging-compat.js");

firebase.initializeApp({
    apiKey: "AIzaSyBiyB4pilnPpVj8vImD4PI6LF2_RtyDnv4",
    authDomain: "tabellone-produzione-liv-e313e.firebaseapp.com",
    projectId: "tabellone-produzione-liv-e313e",
    storageBucket: "tabellone-produzione-liv-e313e.firebasestorage.app",
    messagingSenderId: "537555699968",
    appId: "1:537555699968:web:4d04cb9596b67bfb0e4be5"
  });

const messaging = firebase.messaging();

// Optional: show notifications for background messages (no fetch handler here).
messaging.onBackgroundMessage((payload) => {
  try {
    const title = payload?.notification?.title || "Notifica";
    const options = {
      body: payload?.notification?.body || "",
      icon: payload?.notification?.icon || "/favicon.ico",
      data: payload?.data || {}
    };
    self.registration.showNotification(title, options);
  } catch (e) {
    // swallow
  }
});

self.addEventListener("notificationclick", (event) => {
  try {
    event.notification.close();
    event.waitUntil(clients.openWindow("/"));
  } catch (e) {
    // swallow
  }
});
