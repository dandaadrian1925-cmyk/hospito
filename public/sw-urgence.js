// Service worker DÉDIÉ à la fiche d'urgence hors connexion (§5.6) — scope
// volontairement restreint à /urgence (jamais la racine '/', où
// firebase-messaging-sw.js contrôle déjà les notifications push : les deux
// coexistent sans conflit grâce à des scopes disjoints, voir enregistrement
// dans main.jsx). Stratégie network-first avec repli sur le cache : la
// première visite en ligne peuple le cache, une visite hors connexion
// ultérieure sert la dernière version connue.
const CACHE_NAME = 'hospito-urgence-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  // Seules les requêtes same-origin sont mises en cache — jamais les appels
  // Firebase/Firestore/Supabase : Firestore gère déjà son propre cache
  // offline (cf. firebase/config.js, persistentLocalCache), ce service
  // worker ne doit rien changer à ce comportement réseau.
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copie = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copie));
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('/urgence')))
  );
});
