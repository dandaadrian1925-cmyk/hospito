import { collection, doc, addDoc, getDoc, getDocs, updateDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { notifierPersonnel } from './notificationsService';

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
  const fiche = await getMaFicheIci(patientUid, etablissementId);
  return !!fiche;
};

// #nouveau (retour utilisateur, "remets cette page à l'état initiale pour
// que je puisse à nouveau soumettre la demande de vérification") : version
// qui renvoie la fiche elle-même (pas juste un booléen) — nécessaire pour
// lire son cniStatut et proposer une resoumission quand elle vaut 'rejete'.
export const getMaFicheIci = async (patientUid, etablissementId) => {
  const userSnap = await getDoc(doc(db, 'users', patientUid));
  const cni = userSnap.exists() ? userSnap.data().numeroIdentiteNational : null;
  if (!cni) return null;
  const snap = await getDocs(query(
    collection(db, 'patients'),
    where('etablissementId', '==', etablissementId),
    where('numeroIdentiteNational', '==', cni),
  ));
  const fiche = snap.docs.find((d) => !d.data().fusionneDans);
  return fiche ? { id: fiche.id, ...fiche.data() } : null;
};

// Resoumission après un rejet — même fiche, jamais une 2e créée. Autorisée
// par firestore.rules UNIQUEMENT depuis cniStatut 'rejete', et seulement
// sur les champs de vérification (hasOnly) : jamais l'identité déclarée.
export const resoumettreVerificationCni = async (ficheId, { cniRectoPath, cniVersoPath, cniSelfiePath }) => {
  await updateDoc(doc(db, 'patients', ficheId), {
    cniRectoPath, cniVersoPath, cniSelfiePath,
    cniStatut: 'en_attente',
    cniSoumisAt: serverTimestamp(),
    cniVerifiePar: null, cniVerifieAt: null, cniMotifRejet: null,
  });
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
  // #nouveau (demande utilisateur, "toutes les notifications soient
  // fonctionnelles pour toutes les opérations") : seul le rôle 'admin' gère
  // les patients (hospito-admin, ALLOWED_ROLES=['admin']) — jusqu'ici, une
  // nouvelle demande n'était visible qu'en rouvrant "Patients & admissions".
  notifierPersonnel(etablissementId, ['admin'], {
    type: 'inscription', titre: 'Nouvelle demande d\'inscription',
    message: `${prenom.trim()} ${nom.trim()} souhaite devenir patient de votre établissement.`,
    link: '/patients',
  });
};
