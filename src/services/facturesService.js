import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase/config';

// Facturation (§4.12) — paiement direct par transaction, sans solde (décision
// explicite : la facturation d'établissement ne passe jamais par le wallet
// marketplace). Confirmation via hospito-facture-paiement, fonction dédiée et
// séparée de dynamic-processor/campay-webhook (MAKET) — ne partage aucun code
// ni aucune écriture avec transactions/solde.
const SUPABASE_FUNCTION_URL = 'https://cekiqtkdgjgawxxerjdf.supabase.co/functions/v1/hospito-facture-paiement';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const factureProxy = async (action, payload) => {
  if (!auth.currentUser) throw new Error('Vous devez être connecté');
  const firebaseIdToken = await auth.currentUser.getIdToken();
  const res = await fetch(SUPABASE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'X-Firebase-Token': firebaseIdToken,
    },
    body: JSON.stringify({ action, payload }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || 'Erreur de paiement');
  return data;
};

export async function listerFacturesEnAttente(patientUid, etablissementId) {
  const q = query(
    collection(db, 'factures'),
    where('patientUid', '==', patientUid),
    where('etablissementId', '==', etablissementId),
    where('statut', '==', 'en_attente'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function initierPaiementFacture(factureId, phoneNumber) {
  const externalId = `facture_${factureId}_${Date.now()}`;
  return factureProxy('initier_paiement_facture', { factureId, phoneNumber, externalId });
}

// Polling — même approche que attendreConfirmationDepot (walletService.js),
// jamais de webhook (format CamPay non observé/non documenté à ce jour).
export async function attendreConfirmationFacture(factureId, { intervalMs = 3500, timeoutMs = 90000 } = {}) {
  const debut = Date.now();
  while (Date.now() - debut < timeoutMs) {
    const resultat = await factureProxy('confirmer_paiement_facture', { factureId });
    if (resultat?.statut === 'payee') return { statut: 'payee' };
    if (resultat?.statut === 'FAILED') return { statut: 'echoue' };
    if (resultat?.statut === 'ECART_MONTANT') return { statut: 'ecart_montant', message: resultat.message };
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return { statut: 'timeout' };
}
