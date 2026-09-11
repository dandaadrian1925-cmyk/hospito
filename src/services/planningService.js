import { collection, getDocs, query, where, documentId } from 'firebase/firestore';
import { db } from '../firebase/config';

const LABELS_JOUR = { lundi: 'Lundi', mardi: 'Mardi', mercredi: 'Mercredi', jeudi: 'Jeudi', vendredi: 'Vendredi', samedi: 'Samedi', dimanche: 'Dimanche' };
const ORDRE_JOUR = Object.keys(LABELS_JOUR);
const INDEX_JOUR = { dimanche: 0, lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6 };
const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Projette un jour de la semaine récurrent (ex. "mercredi") sur ses
// `nombre` prochaines occurrences calendaires réelles, à partir
// d'aujourd'hui inclus — jamais toISOString() (UTC), qui décalerait le jour
// selon le fuseau horaire du navigateur.
const prochainesOccurrences = (jour, nombre) => {
  const cible = INDEX_JOUR[jour];
  if (cible === undefined) return [];
  const dates = [];
  const curseur = new Date();
  curseur.setHours(0, 0, 0, 0);
  while (dates.length < nombre) {
    if (curseur.getDay() === cible) dates.push(toISO(curseur));
    curseur.setDate(curseur.getDate() + 1);
  }
  return dates;
};

// #nouveau (demande utilisateur, "la page Médecins doit lister tous les
// médecins de l'établissement, filtrables par service, avec leurs horaires
// de travail habituelles") : s'appuie sur `medecins_publics`
// (hospito-admin/personnelService.js), le vrai annuaire — tout médecin actif
// y figure, avec ou sans horaires habituels renseignés. Suspendus/bannis en
// sont déjà absents (le miroir est supprimé côté admin dès la suspension) —
// jamais un filtre à refaire ici.
export const listerMedecinsDeLEtablissement = async (etablissementId, serviceId) => {
  const clauses = [where('etablissementId', '==', etablissementId)];
  if (serviceId) clauses.push(where('serviceId', '==', serviceId));
  const snap = await getDocs(query(collection(db, 'medecins_publics'), ...clauses));
  const medecins = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const uids = medecins.map((m) => m.uid);
  const photos = {};
  for (let i = 0; i < uids.length; i += 30) {
    const chunk = uids.slice(i, i + 30);
    if (!chunk.length) continue;
    const snapPublics = await getDocs(query(collection(db, 'profils_publics'), where(documentId(), 'in', chunk)));
    snapPublics.docs.forEach((d) => { photos[d.id] = d.data().photoURL || null; });
  }

  return medecins
    .map((m) => ({
      ...m,
      photoURL: photos[m.uid] || null,
      horairesHabituels: (m.horairesHabituels || []).slice().sort((a, b) => ORDRE_JOUR.indexOf(a.jour) - ORDRE_JOUR.indexOf(b.jour)),
    }))
    .sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
};

export const LABEL_JOUR_SEMAINE = LABELS_JOUR;

// #refonte (demande utilisateur, "efface la logique de planning du
// personnel actuelle... l'accueil de chaque service entre les horaires de
// travail générales") : remplace l'ancienne lecture de `plannings` (roster
// daté, jamais renseigné en pratique) par une projection des horaires
// hebdomadaires récurrents (`horairesHabituels`, issus de `medecins_publics`
// via listerMedecinsDeLEtablissement — déjà public, déjà cross-service) sur
// leurs prochaines occurrences calendaires réelles. Même forme de retour que
// l'ancienne fonction (uid/nom/dates/horaires/photoURL), pour ne rien
// changer au rendu existant (chips de dates cliquables). Un médecin sans
// horairesHabituels renseignés n'apparaît simplement pas ici — jamais une
// date inventée.
export const listerSpecialistesAvecCreneaux = async (etablissementId, serviceId, semaines = 3) => {
  if (!serviceId) return [];
  const medecins = await listerMedecinsDeLEtablissement(etablissementId, serviceId);
  return medecins
    .map((m) => {
      const horaires = (m.horairesHabituels || [])
        .flatMap((h) => prochainesOccurrences(h.jour, semaines).map((date) => ({ date, heureDebut: h.heureDebut, heureFin: h.heureFin })))
        .sort((a, b) => a.date.localeCompare(b.date));
      return { uid: m.uid, nom: m.nom, dates: horaires.map((h) => h.date), horaires, photoURL: m.photoURL };
    })
    .filter((m) => m.horaires.length > 0)
    .sort((a, b) => a.nom.localeCompare(b.nom));
};
