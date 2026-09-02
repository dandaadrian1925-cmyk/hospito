import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

// Attente & transparence (Phase 5) — lecture publique de l'agrégat calculé
// côté accueil (voir hospito-accueil-medecin/transparenceService.js).
export async function getTransparenceAttente(etablissementId) {
  const snap = await getDoc(doc(db, 'transparence_attente', etablissementId));
  return snap.exists() ? snap.data() : null;
}
