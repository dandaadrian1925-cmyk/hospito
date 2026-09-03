import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';

const aujourdHui = () => new Date().toISOString().slice(0, 10);

// Vue patient du planning des médecins (lecture seule — géré côté accueil/
// admin) : pour un service donné, la liste des spécialistes qui y sont de
// garde à un moment ou un autre, chacun avec les dates où le retrouver.
// Sert à choisir un médecin de préférence AVANT de soumettre une demande de
// RDV — la confirmation finale (date/heure/médecin) reste faite par
// l'accueil, cf. feedback utilisateur.
export const listerSpecialistesDuService = async (etablissementId, serviceId) => {
  if (!serviceId) return [];
  const snap = await getDocs(query(
    collection(db, 'plannings'),
    where('etablissementId', '==', etablissementId),
    where('serviceId', '==', serviceId),
    where('date', '>=', aujourdHui()),
  ));
  const parMedecin = {};
  snap.docs.forEach((d) => {
    const c = d.data();
    if (!parMedecin[c.personnelUid]) parMedecin[c.personnelUid] = { uid: c.personnelUid, nom: c.personnelNom, dates: new Set() };
    parMedecin[c.personnelUid].dates.add(c.date);
  });
  return Object.values(parMedecin)
    .map((m) => ({ ...m, dates: [...m.dates].sort() }))
    .sort((a, b) => a.nom.localeCompare(b.nom));
};
