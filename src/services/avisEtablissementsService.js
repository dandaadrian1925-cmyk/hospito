import { collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

// Avis patient sur un établissement (comparaison MAKET "avis") — ID composite
// {patientUid}_{etablissementId} : un seul avis par patient et par
// établissement, écrasé (pas dupliqué) à la modification.
const avisId = (patientUid, etablissementId) => `${patientUid}_${etablissementId}`;

export async function getMonAvis(patientUid, etablissementId) {
  const snap = await getDoc(doc(db, 'avis_etablissements', avisId(patientUid, etablissementId)));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function deposerAvis({ patientUid, patientNom, etablissementId, note, commentaire }) {
  await setDoc(doc(db, 'avis_etablissements', avisId(patientUid, etablissementId)), {
    patientUid, patientNom, etablissementId,
    note, commentaire: commentaire?.trim() || null,
    statut: 'visible', createdAt: serverTimestamp(),
  });
}

// Avis publics visibles d'un établissement — annuaire (avant même de choisir
// l'établissement) et onglet Avis de son espace.
export async function getAvisEtablissement(etablissementId) {
  const q = query(
    collection(db, 'avis_etablissements'),
    where('etablissementId', '==', etablissementId), where('statut', '==', 'visible'),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
