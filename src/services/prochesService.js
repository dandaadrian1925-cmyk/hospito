import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

// #nouveau (demande utilisateur, "un bébé ou une personne âgée sans compte
// doit aussi pouvoir être pris en compte") : un tuteur gère un proche
// (bébé sans CNI, personne âgée sans compte) via le champ geePar posé sur
// sa fiche par l'admin/accueil (hospito-admin/patientsService.js) — jamais
// écrit depuis ce compte patient. La règle Firestore (patients.allow read)
// autorise déjà cette lecture pour geePar == son propre uid.
export async function listerMesProches(uid) {
  const snap = await getDocs(query(collection(db, 'patients'), where('geePar', '==', uid)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Même requête, filtrée en plus à UN établissement — utilisée par TabRdv
// pour savoir si un sélecteur "Pour qui ?" a un sens sur CE site précis.
export async function listerMesProchesDansEtablissement(uid, etablissementId) {
  const snap = await getDocs(query(
    collection(db, 'patients'),
    where('geePar', '==', uid),
    where('etablissementId', '==', etablissementId),
  ));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// #nouveau (retour utilisateur, "modifier mon compte ne fait rien ? le nom
// ne change pas chez les autres comptes médecin, accueil...") : la fiche
// administrative patients/{id} de chaque établissement est détenue par SON
// personnel, indépendamment du compte hospito-patient — changer son nom dans
// "Mon compte" ne peut PAS (et ne doit pas) la réécrire directement, sous
// peine de laisser un patient modifier unilatéralement une identité
// administrative déjà vérifiée. Cette jointure par CNI (même principe que le
// dossier partagé/les billets) sert uniquement à PRÉVENIR le personnel
// concerné pour qu'il vérifie et mette à jour lui-même, si besoin.
export async function listerMesFichesParCni(cni) {
  if (!cni) return [];
  const snap = await getDocs(query(collection(db, 'patients'), where('numeroIdentiteNational', '==', cni)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
