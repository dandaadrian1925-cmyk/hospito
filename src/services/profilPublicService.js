import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
const CHAMPS_PUBLICS = ['displayName', 'photoURL', 'ville', 'cniVerifie', 'boutiqueBio', 'prenom', 'nom', 'createdAt', 'lastActiveAt'];
export const syncProfilPublic = async (uid, data) => {
  const champs = Object.fromEntries(Object.entries(data).filter(([k, v]) => CHAMPS_PUBLICS.includes(k) && v !== undefined));
  if (Object.keys(champs).length === 0) return;
  await setDoc(doc(db, 'profils_publics', uid), champs, {
    merge: true
  });
};
