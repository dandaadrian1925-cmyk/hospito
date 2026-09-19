import { doc, getDoc, addDoc, collection, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { getSessionIdLocal } from './authService';

// Souscription annuelle patient obligatoire (5000 FCFA/an par défaut, prix
// configurable — voir getPrixAbonnement) : même passerelle CamPay que
// walletService.js (initierDepot), réutilisée telle quelle côté serveur
// (l'action `initier_paiement` ne connaît pas le type de transaction) — seule
// la confirmation diffère (`confirmer_et_activer_abonnement`, qui active
// abonnementActif/abonnementExpireAt sur users/{uid} au lieu de créditer un
// solde). Voir hospito-dynamic-processor/index.ts pour le détail serveur.
const SUPABASE_FUNCTION_URL = 'https://cekiqtkdgjgawxxerjdf.supabase.co/functions/v1/hospito-dynamic-processor';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const campayProxy = async (action, payload) => {
  if (!auth.currentUser) throw new Error('Vous devez être connecté');
  const firebaseIdToken = await auth.currentUser.getIdToken();
  const res = await fetch(SUPABASE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'X-Firebase-Token': firebaseIdToken,
    },
    body: JSON.stringify({ action, payload }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || 'Erreur CamPay');
  return data;
};

const PRIX_ABONNEMENT_DEFAUT = 5000;

// Prix affiché avant paiement — public (parametres_plateforme, lecture
// libre), modifiable uniquement depuis hospito-plateforme. `.get(clé,
// défaut)` côté règles Firestore n'empêche pas le document de ne pas exister
// du tout : ce cas retombe ici sur le même défaut que côté serveur.
export const getPrixAbonnement = async () => {
  const snap = await getDoc(doc(db, 'parametres_plateforme', 'global'));
  return snap.exists() ? (snap.data().prixAbonnementPatientFCFA ?? PRIX_ABONNEMENT_DEFAUT) : PRIX_ABONNEMENT_DEFAUT;
};

export const initierAbonnement = async (userId, montant, phoneNumber) => {
  const externalId = `abonnement_${userId}_${Date.now()}`;
  const txRef = await addDoc(collection(db, 'transactions'), {
    userId,
    type: 'abonnement',
    montant,
    sourceWallet: 'principal',
    campayExternalId: externalId,
    phoneNumber,
    statut: 'pending',
    description: 'Abonnement annuel HostoConnect',
    createdAt: serverTimestamp(),
  });
  try {
    const data = await campayProxy('initier_paiement', {
      amount: montant,
      phoneNumber,
      externalId,
      description: 'Abonnement annuel HostoConnect',
      transactionId: txRef.id,
      sessionId: getSessionIdLocal(),
    });
    return { transactionId: txRef.id, reference: data.reference };
  } catch (e) {
    await updateDoc(txRef, { statut: 'echoue' }).catch(() => {});
    throw e;
  }
};

const verifierEtActiverAbonnement = async (transactionId) => {
  try {
    return await campayProxy('confirmer_et_activer_abonnement', { transactionId, sessionId: getSessionIdLocal() });
  } catch (e) {
    console.warn('Confirmation/activation de l’abonnement échouée :', e.message);
    return { statut: 'VERIFICATION_ECHOUEE', message: 'Impossible de vérifier le paiement pour le moment. Réessayez dans quelques instants.' };
  }
};

export const attendreConfirmationAbonnement = async (transactionId, { intervalMs = 3500, timeoutMs = 90000 } = {}) => {
  const txRef = doc(db, 'transactions', transactionId);
  const debut = Date.now();
  while (Date.now() - debut < timeoutMs) {
    const txSnap = await getDoc(txRef);
    const txData = txSnap.data();
    if (!txData) throw new Error('Transaction introuvable');
    if (txData.statut === 'completed') return { statut: 'completed' };
    if (txData.statut === 'echoue' || txData.statut === 'ecart_montant') return { statut: txData.statut };
    const resultat = await verifierEtActiverAbonnement(transactionId);
    if (resultat?.statut === 'completed') return { statut: 'completed' };
    if (resultat?.statut === 'FAILED') return { statut: 'echoue' };
    if (resultat?.statut === 'ECART_MONTANT') return { statut: 'ecart_montant', message: resultat.message };
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return { statut: 'timeout' };
};
