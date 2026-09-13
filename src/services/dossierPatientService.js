import { collection, query, where, limit, getDocs } from 'firebase/firestore';
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
export const estIdentiteVerifieeParUnEtablissement = async (cni) => {
  if (!cni) return false;
  const snap = await getDocs(query(
    collection(db, 'patients'),
    where('numeroIdentiteNational', '==', cni),
    where('cniStatut', '==', 'verifie'),
    limit(1),
  ));
  return !snap.empty;
};

const toFirestoreLikeTimestamp = (mysqlDateString) => {
  if (!mysqlDateString) return null;
  const date = new Date(mysqlDateString.replace(' ', 'T'));
  return { toDate: () => date, toMillis: () => date.getTime() };
};

const mapEntree = (row) => ({
  id: String(row.id),
  etablissementId: row.etablissement_id,
  type: row.type,
  contenu: row.contenu,
  auteurNom: row.auteur_nom,
  createdAt: toFirestoreLikeTimestamp(row.created_at),
});

const mapPrescription = (row) => ({
  id: String(row.id),
  etablissementId: row.etablissement_id,
  medecinNom: row.medecin_nom,
  medicaments: row.medicaments,
  statut: row.statut,
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
