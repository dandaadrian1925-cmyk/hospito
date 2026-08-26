import { collection, addDoc, serverTimestamp, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { pousserNotification } from '../supabase/config';
export const creerNotification = async ({
  userId,
  type = 'commande',
  titre,
  message,
  link
}) => {
  if (!userId) return;
  try {
    const ref = await addDoc(collection(db, 'notifications'), {
      userId,
      type,
      titre,
      message: message || '',
      lu: false,
      createdAt: serverTimestamp(),
      link: link || null
    });
    pousserNotification(ref.id);
  } catch (e) {
    console.error('Création de notification échouée :', e);
  }
};
export const listenUnreadNotificationsCount = (userId, callback) => {
  if (!userId) return () => {};
  const q = query(collection(db, 'notifications'), where('userId', '==', userId), where('lu', '==', false));
  return onSnapshot(q, snap => callback(snap.size), err => {
    console.error('Écoute notifications non lues échouée :', err);
    callback(0);
  });
};
