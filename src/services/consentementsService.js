import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

// Signature électronique des consentements (§4.13) — un consentement signé
// est un document IMMUABLE (jamais de update/delete, cf. firestore.rules,
// même principe que `remboursements`) : une nouvelle signature (ex. après
// une opposition levée) crée un NOUVEAU document plutôt que de réécrire
// l'ancien, pour garder la trace complète de l'historique de consentement.
export const TEXTE_CONSENTEMENT_PARTAGE = "Je consens à ce que le personnel soignant et administratif de cet établissement accède à mon dossier médical partagé (antécédents, allergies, constantes, comptes-rendus, prescriptions, examens) dans le cadre de ma prise en charge, conformément à la loi n°2024/017 relative à la protection des données à caractère personnel.";

// Deux égalités pures, sans orderBy — comme le reste de ce projet, aucun
// index composite requis. Le tri (le plus récent d'abord) se fait client,
// une poignée de documents par patient/établissement tout au plus.
export const getMonConsentement = async (patientUid, etablissementId) => {
  const snap = await getDocs(query(
    collection(db, 'consentements'),
    where('patientUid', '==', patientUid), where('etablissementId', '==', etablissementId),
  ));
  if (snap.empty) return null;
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  docs.sort((a, b) => (b.signeAt?.toMillis?.() || 0) - (a.signeAt?.toMillis?.() || 0));
  return docs[0];
};

export const signerConsentement = async ({ patientUid, patientNom, etablissementId, signatureDataUrl }) => {
  await addDoc(collection(db, 'consentements'), {
    patientUid, patientNom, etablissementId,
    texte: TEXTE_CONSENTEMENT_PARTAGE, signatureDataUrl,
    signeAt: serverTimestamp(),
  });
};
