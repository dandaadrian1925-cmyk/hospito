import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

// Fiche d'urgence (§5.6) — auto-déclarée par le patient, PAS une donnée
// clinique vérifiée par un soignant (le vrai dossier médical, par
// établissement, est protégé par le secret médical et hors de portée d'une
// écriture patient). Vit sur users/{uid} — un seul endroit, pas un par
// établissement, cohérent avec l'idée d'une carte d'urgence personnelle.
export const getFicheUrgence = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    groupeSanguin: d.groupeSanguin || '',
    allergiesConnues: d.allergiesConnues || '',
    maladiesChroniques: d.maladiesChroniques || '',
  };
};

export const mettreAJourFicheUrgence = async (uid, { groupeSanguin, allergiesConnues, maladiesChroniques }) => {
  await updateDoc(doc(db, 'users', uid), {
    groupeSanguin: groupeSanguin?.trim() || '',
    allergiesConnues: allergiesConnues?.trim() || '',
    maladiesChroniques: maladiesChroniques?.trim() || '',
  });
};
