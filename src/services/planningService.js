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
  // #nouveau (retour utilisateur, "je ne vois pas pour chaque service la
  // liste des médecins et leurs horaires de travail") : chaque document
  // `plannings` porte déjà heureDebut/heureFin (cf. hospito-admin,
  // definirRosterDuJour) — jusqu'ici jetés ici, alors qu'un même jour peut
  // avoir 2 documents (matin + après-midi) pour UNE seule plage saisie par
  // l'admin ; on les regroupe donc par date pour n'afficher qu'une seule
  // plage horaire par jour et par médecin.
  const parMedecin = {};
  snap.docs.forEach((d) => {
    const c = d.data();
    if (!parMedecin[c.personnelUid]) parMedecin[c.personnelUid] = { uid: c.personnelUid, nom: c.personnelNom, creneaux: new Map() };
    parMedecin[c.personnelUid].creneaux.set(c.date, { date: c.date, heureDebut: c.heureDebut, heureFin: c.heureFin });
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
    .map((m) => {
      const horaires = [...m.creneaux.values()].sort((a, b) => a.date.localeCompare(b.date));
      return { uid: m.uid, nom: m.nom, dates: horaires.map((h) => h.date), horaires, photoURL: photos[m.uid] || null };
    })
    .sort((a, b) => a.nom.localeCompare(b.nom));
};
