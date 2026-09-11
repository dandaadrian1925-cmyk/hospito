import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
const CHAMPS_PUBLICS = ['displayName', 'photoURL', 'ville', 'cniVerifie', 'boutiqueBio', 'prenom', 'nom', 'createdAt', 'lastActiveAt'];

// #nouveau (demande utilisateur, "la page En savoir plus... prend toutes
// les informations entrées par l'admin qui gère ce service") : résout
// service.chefServiceId (un uid) en nom/photo affichables — profils_publics
// est déjà lisible sans connexion (cf. photos des médecins). Renvoie null
// si ce membre n'a encore aucun profil public (jamais uploadé de photo) :
// pas de nom affiché plutôt qu'un nom inventé.
export const getProfilPublic = async (uid) => {
  if (!uid) return null;
  const snap = await getDoc(doc(db, 'profils_publics', uid));
  return snap.exists() ? snap.data() : null;
};

export const syncProfilPublic = async (uid, data) => {
  const champs = Object.fromEntries(Object.entries(data).filter(([k, v]) => CHAMPS_PUBLICS.includes(k) && v !== undefined));
  if (Object.keys(champs).length === 0) return;
  await setDoc(doc(db, 'profils_publics', uid), champs, {
    merge: true
  });
};
