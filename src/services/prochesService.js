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
