import {
  doc, getDoc, addDoc, collection, serverTimestamp, updateDoc, query, where, onSnapshot,
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { getSessionIdLocal } from './authService';

// Marketplace téléconsultation d'urgence — même passerelle CamPay que
// abonnementService.js/walletService.js (initier_paiement, agnostique du
// type de transaction), mais le montant n'est PAS un prix plateforme fixe :
// c'est le tarif publié par le médecin choisi (medecins_publics), déjà
// revalidé par firestore.rules à la création du doc teleconsultations_urgence
// (empêche un patient de fixer lui-même un montant arbitraire).
const SUPABASE_FUNCTION_URL = 'https://cekiqtkdgjgawxxerjdf.supabase.co/functions/v1/hospito-dynamic-processor';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const campayProxy = async (action, payload) => {
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
  if (!res.ok) throw new Error(data.error || data.message || 'Erreur CamPay');
  return data;
};

// Annuaire public des médecins de garde — medecins_publics est déjà lisible
// de tous (voir firestore.rules), filtré ici côté client sur deGardeActif :
// pas d'index composite nécessaire pour une liste dont la taille reste
// modeste (un `where` unique + tri/filtre en mémoire).
export const listenMedecinsDeGarde = (callback) => {
  const q = query(collection(db, 'medecins_publics'), where('deGardeActif', '==', true));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (e) => { console.error('Écoute des médecins de garde échouée :', e); callback([]); },
  );
};

export const initierTeleconsultationUrgence = async (patientUid, patientNom, medecin, motif, phoneNumber) => {
  const tarifFCFA = medecin.tarifTeleconsultationFCFA;
  const teleRef = await addDoc(collection(db, 'teleconsultations_urgence'), {
    patientUid, patientNom,
    medecinUid: medecin.uid, medecinNom: medecin.nom,
    etablissementId: medecin.etablissementId,
    motif: motif || '',
    tarifFCFA,
    statut: 'attente_paiement',
    createdAt: serverTimestamp(),
  });

  const externalId = `teleurg_${patientUid}_${Date.now()}`;
  const txRef = await addDoc(collection(db, 'transactions'), {
    userId: patientUid,
    type: 'teleconsultation_urgence',
    montant: tarifFCFA,
    sourceWallet: 'principal',
    campayExternalId: externalId,
    phoneNumber,
    statut: 'pending',
    description: `Téléconsultation d'urgence — ${medecin.nom}`,
    createdAt: serverTimestamp(),
  });

  try {
    const data = await campayProxy('initier_paiement', {
      amount: tarifFCFA,
      phoneNumber,
      externalId,
      description: "Téléconsultation d'urgence HostoConnect",
      transactionId: txRef.id,
      sessionId: getSessionIdLocal(),
    });
    return { teleconsultationId: teleRef.id, transactionId: txRef.id, reference: data.reference };
  } catch (e) {
    await updateDoc(txRef, { statut: 'echoue' }).catch(() => {});
    await updateDoc(doc(db, 'teleconsultations_urgence', teleRef.id), { statut: 'annulee' }).catch(() => {});
    throw e;
  }
};

const verifierEtCreerTeleconsultation = async (teleconsultationId, transactionId) => {
  try {
    return await campayProxy('confirmer_et_creer_teleconsultation_urgence', { teleconsultationId, transactionId, sessionId: getSessionIdLocal() });
  } catch (e) {
    console.warn('Confirmation de la téléconsultation d’urgence échouée :', e.message);
    return { statut: 'VERIFICATION_ECHOUEE', message: 'Impossible de vérifier le paiement pour le moment. Réessayez dans quelques instants.' };
  }
};

export const attendreConfirmationTeleconsultationUrgence = async (teleconsultationId, transactionId, { intervalMs = 3500, timeoutMs = 90000 } = {}) => {
  const teleRef = doc(db, 'teleconsultations_urgence', teleconsultationId);
  const debut = Date.now();
  while (Date.now() - debut < timeoutMs) {
    const teleSnap = await getDoc(teleRef);
    const teleData = teleSnap.data();
    if (!teleData) throw new Error('Téléconsultation introuvable');
    if (['payee', 'en_cours', 'terminee'].includes(teleData.statut)) return { statut: 'completed' };
    if (teleData.statut === 'annulee') return { statut: 'echoue' };
    const resultat = await verifierEtCreerTeleconsultation(teleconsultationId, transactionId);
    if (resultat?.statut === 'completed') return { statut: 'completed' };
    if (resultat?.statut === 'FAILED') return { statut: 'echoue' };
    if (resultat?.statut === 'ECART_MONTANT') return { statut: 'ecart_montant', message: resultat.message };
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return { statut: 'timeout' };
};

export const listenMaTeleconsultationUrgence = (teleconsultationId, callback) => {
  return onSnapshot(doc(db, 'teleconsultations_urgence', teleconsultationId), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
};

const AGORA_TOKEN_URL = 'https://cekiqtkdgjgawxxerjdf.supabase.co/functions/v1/hospito-agora-token';

export const getAgoraTokenTeleconsultationUrgence = async (teleconsultationId) => {
  const idToken = await auth.currentUser.getIdToken();
  const res = await fetch(AGORA_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'X-Firebase-Token': idToken,
    },
    body: JSON.stringify({ teleconsultationId, contexte: 'teleconsultation_urgence' }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Jeton d'appel indisponible");
  return data;
};
