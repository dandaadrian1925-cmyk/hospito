import { auth } from '../firebase/config';

// Téléconsultation (§4.14) — jeton vidéo scopé à une demande de rendez-vous
// confirmée par l'accueil avec un médecin assigné. Fichier séparé de
// callService.js (appels vocaux commande acheteur/vendeur↔livreur, hérité de
// MAKET, jamais modifié) même si les deux appellent la même Edge Function
// hospito-agora-token — juste un contexte différent côté serveur.
const AGORA_TOKEN_URL = 'https://cekiqtkdgjgawxxerjdf.supabase.co/functions/v1/hospito-agora-token';

export const getAgoraTokenTeleconsultation = async (demandeId) => {
  const idToken = await auth.currentUser.getIdToken();
  const res = await fetch(AGORA_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'X-Firebase-Token': idToken,
    },
    body: JSON.stringify({ demandeId, contexte: 'teleconsultation' }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Jeton d'appel indisponible");
  return data;
};
