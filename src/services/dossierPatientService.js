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

const localFetch = async (path) => {
  const res = await fetch(`${LOCAL_API_URL}/${path}`);
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
