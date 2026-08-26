import { collection, doc, getDoc, getDocs, query, where, runTransaction, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

// #nouveau (demande utilisateur, "suivre un vendeur") : même forme que
// favoris (annoncesService.js) — id déterministe {followerId}_{vendeurId},
// une seule transaction qui écrit à la fois le lien follows/{id} et le
// compteur public profils_publics/{vendeurId}.abonnes (cf. firestore.rules,
// qui exige cette corrélation exacte, même rigueur que totalVentes).
export const toggleSuivi = async (followerId, vendeurId) => {
  const followId = `${followerId}_${vendeurId}`;
  const followRef = doc(db, 'follows', followId);
  const profilRef = doc(db, 'profils_publics', vendeurId);
  return await runTransaction(db, async tx => {
    const followSnap = await tx.get(followRef);
    if (followSnap.exists()) {
      tx.delete(followRef);
      tx.update(profilRef, { abonnes: increment(-1), followId });
      return false;
    }
    tx.set(followRef, { followerId, vendeurId, createdAt: serverTimestamp() });
    tx.update(profilRef, { abonnes: increment(1), followId });
    return true;
  });
};

export const estAbonne = async (followerId, vendeurId) => {
  const snap = await getDoc(doc(db, 'follows', `${followerId}_${vendeurId}`));
  return snap.exists();
};

export const getAbonnements = async followerId => {
  const q = query(collection(db, 'follows'), where('followerId', '==', followerId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};
