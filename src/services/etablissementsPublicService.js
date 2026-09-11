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

export async function listerServicesActifs(etablissementId) {
  const q = query(collection(db, 'services'), where('etablissementId', '==', etablissementId), where('actif', '==', true));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// #nouveau (demande utilisateur, "découvrir un établissement" — bug trouvé :
// la recherche promettait "un établissement, une ville, un service" mais ne
// filtrait jamais réellement sur les services) : tous les services actifs,
// toutes établissements confondus, pour permettre une recherche du type
// "cardiologie" côté client (EtablissementsPage.jsx) sans une requête par
// établissement.
export async function listerTousLesServicesActifs() {
  const q = query(collection(db, 'services'), where('actif', '==', true));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// #nouveau (demande utilisateur, "page de découvrir un établissement comme
// un site web complet") : tarif de consultation, information publique par
// nature (afficher le prix avant de prendre RDV) — voir firestore.rules,
// tarifs_consultation.allow read.
export async function listerTarifsConsultation(etablissementId) {
  const q = query(collection(db, 'tarifs_consultation'), where('etablissementId', '==', etablissementId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
