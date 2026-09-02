import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

// Droits du patient & consentement (§4.16, Loi n°2024/017) — un patient peut
// demander l'accès, la rectification, la suppression ou s'opposer au
// traitement de ses données, par établissement.
export const TYPES_DEMANDE_DROIT = [
  { value: 'acces', label: 'Accès à mes données' },
  { value: 'rectification', label: 'Rectification de mes données' },
  { value: 'suppression', label: 'Suppression de mes données' },
  { value: 'opposition', label: 'Opposition au traitement' },
];

export async function creerDemandeDroit({ patientUid, patientNom, etablissementId, type, description }) {
  await addDoc(collection(db, 'demandes_droits_patient'), {
    patientUid, patientNom, etablissementId, type, description: description.trim(),
    statut: 'en_attente', reponse: null, createdAt: serverTimestamp(),
  });
}

export async function getMesDemandesDroits(patientUid) {
  const q = query(collection(db, 'demandes_droits_patient'), where('patientUid', '==', patientUid), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
