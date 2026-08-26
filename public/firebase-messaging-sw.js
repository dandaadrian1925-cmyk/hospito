// Service worker requis par Firebase Cloud Messaging pour recevoir les
// notifications push quand aucun onglet MAKET n'est ouvert au premier plan.
// Doit être servi à la racine (/firebase-messaging-sw.js) — Vite copie tout
// public/ tel quel, à la fois en dev et en build.
//
// Config Firebase codée en dur : ce ne sont PAS des secrets (apiKey ici n'est
// qu'un identifiant de projet, la vraie protection vient des règles Firestore/
// Storage), et un service worker ne peut pas lire les variables d'environnement
// Vite au runtime — c'est le seul moyen pour ce fichier statique de les avoir.
importScripts('https://www.gstatic.com/firebasejs/11.0.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyB7PJY3hNWLnHXm-WgONJogwKLx3lpyras',
  authDomain: 'maket-922e2.firebaseapp.com',
  projectId: 'maket-922e2',
  storageBucket: 'maket-922e2.firebasestorage.app',
  messagingSenderId: '537042129990',
  appId: '1:537042129990:web:1a1477582221b94210a647',
});

const messaging = firebase.messaging();

// #sécurité : link vient d'un payload FCM (potentiellement dérivé d'un champ
// `link` Firestore écrit "à distance" par n'importe quel compte connecté) —
// jamais fiable tel quel. Un lien du type '//evil.com' résolu par `new URL()`
// donnerait une vraie origine externe, ouverte ici avec `openWindow` — même
// défense qu'ailleurs dans l'app (cf. src/lib/safeLink.js), dupliquée ici car
// un service worker ne peut pas importer ce module ES.
const cheminInterneSur = (link) => {
  if (typeof link !== 'string') return '/';
  if (link === '/') return link;
  return /^\/[^/].*/.test(link) ? link : '/';
};

// Notification reçue alors qu'aucun onglet MAKET n'a le focus — FCM envoie déjà
// une notification native quand `notification` est présent dans le payload (cf.
// send-push-notification), ce handler ne sert qu'à personnaliser l'affichage.
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  const link = cheminInterneSur(payload.fcmOptions?.link || payload.data?.link);
  self.registration.showNotification(title || 'MAKET', {
    body: body || '',
    icon: '/icon-192.png',
    data: { link },
  });
});

// Clic sur la notification : ouvre (ou refocus) l'app sur le lien concerné.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = cheminInterneSur(event.notification.data?.link);
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      const target = new URL(link, self.location.origin).href;
      const existing = clientsArr.find((c) => c.url === target);
      if (existing) return existing.focus();
      return self.clients.openWindow(target);
    })
  );
});
