import { collection, getDocs, query, where, documentId } from 'firebase/firestore';
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

  // Photo de profil (demande utilisateur, "chaque médecin peut charger sa
  // photo... ça s'affiche... chez le patient") : `affiliations.photoUrl`
  // n'est jamais lisible par un patient (règles Firestore) — `profils_publics`
  // l'est, et un médecin y a désormais un miroir de sa photo (cf.
  // hospito-medecin/profilService.js::uploaderMaPhoto). Chunké par 30 comme
  // les autres résolutions par lot du projet.
  const uids = Object.keys(parMedecin);
  const photos = {};
  for (let i = 0; i < uids.length; i += 30) {
    const chunk = uids.slice(i, i + 30);
    if (!chunk.length) continue;
    const snapPublics = await getDocs(query(collection(db, 'profils_publics'), where(documentId(), 'in', chunk)));
    snapPublics.docs.forEach((d) => { photos[d.id] = d.data().photoURL || null; });
  }

  return Object.values(parMedecin)
    .map((m) => ({ ...m, dates: [...m.dates].sort(), photoURL: photos[m.uid] || null }))
    .sort((a, b) => a.nom.localeCompare(b.nom));
};
