// "En ligne" est une approximation : chaque app écrit lastActiveAt toutes les 60s
// tant qu'un utilisateur a l'app ouverte (cf. AuthContext.jsx des 4 apps MAKET) —
// pas de vraie présence temps réel possible avec Firestore seul (contrairement à
// Realtime Database et son onDisconnect()). Marge de 2x l'intervalle du battement
// pour absorber un battement manqué (latence réseau, onglet en veille...).
const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

function timeAgo(ms) {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  if (hours < 24) return `il y a ${hours}h`;
  return `il y a ${days}j`;
}

export function getPresence(lastActiveAt) {
  const ms = lastActiveAt?.toDate ? lastActiveAt.toDate().getTime() : null;
  if (!ms) return { online: false, label: 'Jamais connecté' };
  if (Date.now() - ms < ONLINE_THRESHOLD_MS) return { online: true, label: 'En ligne' };
  return { online: false, label: `Vu ${timeAgo(ms)}` };
}
