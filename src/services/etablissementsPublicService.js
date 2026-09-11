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

// #nouveau (demande utilisateur, "il ne doit plus avoir les autres services
// affichés... une page d'information de ce service") : un service devient
// une vraie page dédiée (route services/:serviceId) au lieu d'un panneau
// déplié sous la liste — a besoin de sa propre lecture directe par id.
export async function getService(serviceId) {
  const snap = await getDoc(doc(db, 'services', serviceId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
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

// #nouveau (demande utilisateur, "c'est le super admin qui les ajoutes
// dynamiquement") : "À propos" (histoire, mission, valeurs, agrément,
// chiffres clés, couleur du site) — saisi par le sysadmin depuis
// hospito-super-admin (cf. contenuVitrineService.js), doc public, absent
// tant que rien n'a été saisi (jamais de contenu inventé côté patient).
export async function getAPropos(etablissementId) {
  const snap = await getDoc(doc(db, 'apropos', etablissementId));
  return snap.exists() ? snap.data() : null;
}

// Actualités publiées uniquement (statut=='publie') — un brouillon n'est
// jamais lisible ici, cf. firestore.rules.
export async function listerActualitesPubliees(etablissementId) {
  const q = query(
    collection(db, 'actualites'),
    where('etablissementId', '==', etablissementId),
    where('statut', '==', 'publie'),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
}

export async function getActualite(actualiteId) {
  const snap = await getDoc(doc(db, 'actualites', actualiteId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
