import { collection, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

export async function listerEtablissementsActifs() {
  const q = query(collection(db, 'etablissements'), where('statut', '==', 'actif'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getEtablissement(etablissementId) {
  const snap = await getDoc(doc(db, 'etablissements', etablissementId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
