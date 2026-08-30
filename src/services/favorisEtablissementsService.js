import { collection, doc, setDoc, deleteDoc, getDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

const favId = (uid, etablissementId) => `${uid}_${etablissementId}`;

export async function isFavori(uid, etablissementId) {
  const snap = await getDoc(doc(db, 'favoris_etablissements', favId(uid, etablissementId)));
  return snap.exists();
}

export async function toggleFavori(uid, etablissementId, etablissementNom) {
  const ref = doc(db, 'favoris_etablissements', favId(uid, etablissementId));
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await deleteDoc(ref);
    return false;
  }
  await setDoc(ref, {
    userId: uid,
    etablissementId,
    etablissementNom: etablissementNom || null,
    createdAt: serverTimestamp(),
  });
  return true;
}

export async function getMesFavoris(uid) {
  const snap = await getDocs(query(collection(db, 'favoris_etablissements'), where('userId', '==', uid)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
