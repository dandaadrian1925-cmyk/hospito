import { collection, query, where, limit, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

// Dossier médical + prescriptions du patient, UNIQUE et partagé entre tous
// ses établissements (continuité des soins) — voir mémoire
// patient_dossier_partage. #démo-soutenance : ce contenu clinique ne vit pas
// sur Firestore mais sur le backend local Apache/PHP/MySQL de
// hospito-dossier-local/ (jamais déployé), interrogé ici par le CNI du
// patient (userProfile.numeroIdentiteNational). Actif uniquement quand
// VITE_DOSSIER_API_MODE=local (machine de soutenance) — sinon no-op, l'appelant
// doit garder son état "Disponible prochainement" en dehors de ce mode.
const LOCAL_MODE = import.meta.env.VITE_DOSSIER_API_MODE === 'local';
const LOCAL_API_URL = import.meta.env.VITE_DOSSIER_API_URL || 'http://localhost/hospito-dossier-local';

export const dossierLocalDisponible = LOCAL_MODE;

// #nouveau (décision utilisateur, "retirer cette validation à la plateforme
// et l'accorder à chaque établissement... avant de pouvoir accéder à son
// dossier médical en ligne") : le simple fait d'avoir TAPÉ un numéro de CNI
// dans Mon compte ne prouve rien — n'importe qui pouvait taper le numéro de
// quelqu'un d'autre et voir SON dossier partagé (tous établissements
// confondus). Réutilise la vérification CNI qui existe déjà, faite EN
// PERSONNE par le personnel d'UN établissement sur la fiche patients/{id}
// (hospito-admin::traiterCniVerification, PatientDetailPage.jsx) — jamais
// une revue à distance par un tiers qui ne voit jamais le patient. Le
// dossier partagé s'active dès qu'AU MOINS UN établissement a vérifié cette
// identité, cohérent avec "un seul dossier partagé entre tous les
// établissements" : une fois vérifié quelque part, plus besoin de l'être
// partout.
//
// #corrigé (retour utilisateur, "un dossier n'est lié qu'à une seule
// adresse mail ?") : cette vérification ne comparait QUE le numéro de CNI,
// jamais QUEL compte a été vérifié — le verrou anti-doublon qui empêchait
// deux comptes différents de déclarer le même CNI ayant été retiré plus tôt
// (décision utilisateur, vérification par établissement plutôt que par
// plateforme), un numéro de CNI (pas vraiment un secret) suffisait à
// N'IMPORTE QUEL compte tapant ce numéro pour hériter de la vérification
// faite pour le VRAI titulaire. `patientUid` (posé sur la fiche par
// rechercherCompteAppParCni, hospito-admin, à chaque création/modification)
// lie désormais la vérification au compte réellement associé à cette
// fiche — un second compte déclarant le même CNI ne trouve simplement aucune
// fiche qui LUI soit liée, et reste donc non vérifié.
export const ecouterIdentiteVerifieeParUnEtablissement = (cni, uid, callback) => {
  if (!cni || !uid) { callback(false); return () => {}; }
  const q = query(
    collection(db, 'patients'),
    where('numeroIdentiteNational', '==', cni),
    where('cniStatut', '==', 'verifie'),
    where('patientUid', '==', uid),
    limit(1),
  );
  return onSnapshot(q, (snap) => callback(!snap.empty), () => callback(false));
};

const toFirestoreLikeTimestamp = (mysqlDateString) => {
  if (!mysqlDateString) return null;
  const date = new Date(mysqlDateString.replace(' ', 'T'));
  return { toDate: () => date, toMillis: () => date.getTime() };
};

const mapEntree = (row) => ({
  id: String(row.id),
  etablissementId: row.etablissement_id,
  etablissementNom: row.etablissement_nom || null,
  type: row.type,
  contenu: row.contenu,
  auteurNom: row.auteur_nom,
  createdAt: toFirestoreLikeTimestamp(row.created_at),
});

const mapPrescription = (row) => ({
  id: String(row.id),
  etablissementId: row.etablissement_id,
  etablissementNom: row.etablissement_nom || null,
  medecinNom: row.medecin_nom,
  medicaments: row.medicaments,
  statut: row.statut,
  createdAt: toFirestoreLikeTimestamp(row.created_at),
});

// #nouveau (audit labo/imagerie, "le dossier partagé n'inclut jamais les
// examens, alors que le texte de consentement le promet") : miroir best-effort
// alimenté par examensService.js (hospito-medecin) à chaque demande/
// changement de statut/résultat — jamais la source de vérité (qui reste
// Firestore, scopée par établissement, pour le vrai suivi opérationnel du
// labo/de l'imagerie), juste ce que le dossier PARTAGÉ doit montrer.
const mapExamen = (row) => ({
  id: String(row.id),
  etablissementId: row.etablissement_id,
  etablissementNom: row.etablissement_nom || null,
  prescripteurNom: row.prescripteur_nom,
  type: row.type,
  nature: row.nature,
  statut: row.statut,
  resultat: row.resultat || null,
  createdAt: toFirestoreLikeTimestamp(row.created_at),
});

export const MESSAGE_BACKEND_INDISPONIBLE = 'Backend local indisponible — vérifiez que XAMPP (Apache/MySQL) est actif sur cette machine.';

const localFetch = async (path) => {
  let res;
  try {
    res = await fetch(`${LOCAL_API_URL}/${path}`);
  } catch {
    throw new Error(MESSAGE_BACKEND_INDISPONIBLE);
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur du serveur local');
  return data;
};

export const getMonDossier = async (cni) => {
  if (!LOCAL_MODE || !cni) return [];
  const rows = await localFetch(`get_dossier.php?patient_cni=${encodeURIComponent(cni)}`);
  return rows.map(mapEntree);
};

export const getMesPrescriptions = async (cni) => {
  if (!LOCAL_MODE || !cni) return [];
  const rows = await localFetch(`get_prescriptions_patient.php?patient_cni=${encodeURIComponent(cni)}`);
  return rows.map(mapPrescription);
};

export const getMesExamensPartages = async (cni) => {
  if (!LOCAL_MODE || !cni) return [];
  const rows = await localFetch(`get_examens_patient.php?patient_cni=${encodeURIComponent(cni)}`);
  return rows.map(mapExamen);
};
