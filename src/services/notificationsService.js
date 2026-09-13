import { collection, addDoc, getDocs, serverTimestamp, query, where, onSnapshot } from 'firebase/firestore';
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
// #nouveau (demande utilisateur, "toutes les notifications soient
// fonctionnelles pour toutes les opérations", direction patient→personnel) :
// jusqu'ici, une nouvelle inscription ou demande de RDV n'était visible que
// si le personnel ouvrait lui-même la bonne page — jamais poussé vers lui.
// Deux égalités pures (etablissementId, actif) — aucun index composite
// requis (cf. firestore.rules, même principe que le reste du projet) — le
// rôle se filtre côté client. Best-effort, jamais bloquant pour l'action du
// patient si la notification échoue.
export const notifierPersonnel = async (etablissementId, roles, { type, titre, message, link }) => {
  try {
    const snap = await getDocs(query(
      collection(db, 'affiliations'),
      where('etablissementId', '==', etablissementId),
      where('actif', '==', true),
    ));
    const destinataires = snap.docs
      .map((d) => d.data())
      .filter((a) => roles.includes(a.role))
      .map((a) => a.userId);
    await Promise.all([...new Set(destinataires)].map((userId) => creerNotification({ userId, type, titre, message, link })));
  } catch (e) {
    console.error('Notification du personnel échouée :', e);
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
