import { collection, doc, addDoc, getDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

// #nouveau (demande utilisateur, "le patient puisse donner l'autorisation à
// chaque établissement d'accéder à ses dossiers médicaux, et envoie une
// demande pour être dans la liste des patients de cet établissement") :
// jusqu'ici, seule une visite physique (fiche créée par l'accueil/admin)
// donnait accès à un établissement — un patient qui n'y est jamais allé ne
// pouvait jamais s'y inscrire lui-même. Même principe de validation que les
// demandes de RDV : le patient soumet, le personnel (permission
// `patients`:`write`) valide et crée la vraie fiche.

// Une fiche existe déjà si le CNI du compte correspond à une fiche non
// fusionnée de CET établissement — même garde `fusionneDans` que partout
// ailleurs dans le projet (fusionnerPatients, hospito-admin).
export const aDejaUneFicheIci = async (patientUid, etablissementId) => {
  const userSnap = await getDoc(doc(db, 'users', patientUid));
  const cni = userSnap.exists() ? userSnap.data().numeroIdentiteNational : null;
  if (!cni) return false;
  const snap = await getDocs(query(
    collection(db, 'patients'),
    where('etablissementId', '==', etablissementId),
    where('numeroIdentiteNational', '==', cni),
  ));
  return snap.docs.some((d) => !d.data().fusionneDans);
};

// Deux égalités pures, sans orderBy — comme consentementsService.js, aucun
// index composite requis. Le tri (le plus récent d'abord) se fait client.
export const getMaDemandeInscription = async (patientUid, etablissementId) => {
  const snap = await getDocs(query(
    collection(db, 'demandes_inscription_patient'),
    where('patientUid', '==', patientUid), where('etablissementId', '==', etablissementId),
  ));
  if (snap.empty) return null;
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  docs.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  return docs[0];
};

// #nouveau (décision utilisateur, "c'est cette vérification-ci [recto/verso/
// selfie] qui doit être envoyée avec la signature de consentement") : la
// demande d'inscription porte désormais aussi les 3 photos — le personnel
// qui approuve la demande (hospito-admin) les retrouve directement sur la
// fiche créée, dans la même section "Vérification CNI" qui existait déjà
// pour une photo prise en personne au guichet.
export const creerDemandeInscription = async ({
  patientUid, etablissementId, nom, prenom, dateNaissance, sexe, telephone, numeroIdentiteNational,
  cniRectoPath, cniVersoPath, cniSelfiePath,
}) => {
  await addDoc(collection(db, 'demandes_inscription_patient'), {
    patientUid, etablissementId,
    nom: nom.trim(), prenom: prenom.trim(),
    dateNaissance: dateNaissance || null, sexe: sexe || null,
    telephone: telephone?.trim() || null,
    numeroIdentiteNational: numeroIdentiteNational?.trim() || null,
    cniRectoPath: cniRectoPath || null, cniVersoPath: cniVersoPath || null, cniSelfiePath: cniSelfiePath || null,
    statut: 'en_attente',
    createdAt: serverTimestamp(),
  });
};
