import { collection, doc, setDoc, getDocs, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { creerNotification } from './notificationsService';
const idAvis = (commandeId, auteurId, cibleId) => `${commandeId}_${auteurId}_${cibleId}`;
export const laisserAvis = async (commandeId, auteurId, cibleId, note, commentaire) => {
  if (note < 1 || note > 5) throw new Error('La note doit être entre 1 et 5');
  const deja = await hasAvisLeft(commandeId, auteurId, cibleId);
  if (deja) throw new Error('Vous avez déjà laissé un avis pour cette transaction');
  await setDoc(doc(db, 'avis', idAvis(commandeId, auteurId, cibleId)), {
    commandeId,
    auteurId,
    cibleId,
    note,
    commentaire: commentaire || '',
    createdAt: serverTimestamp()
  });
  await creerNotification({
    userId: cibleId,
    type: 'avis',
    titre: 'Nouvel avis reçu',
    message: `Vous avez reçu un avis ${note}/5${commentaire ? ' : ' + commentaire : '.'}`,
    link: `/commande/${commandeId}`
  });
};
export const hasAvisLeft = async (commandeId, auteurId, cibleId) => {
  const clauses = [where('commandeId', '==', commandeId), where('auteurId', '==', auteurId)];
  if (cibleId) clauses.push(where('cibleId', '==', cibleId));
  const q = query(collection(db, 'avis'), ...clauses);
  const snap = await getDocs(q);
  return !snap.empty;
};
export const getAvisByUser = async userId => {
  const q = query(collection(db, 'avis'), where('cibleId', '==', userId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  const avis = snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));
  const moyenne = avis.length ? Math.round(avis.reduce((s, a) => s + a.note, 0) / avis.length * 10) / 10 : null;
  return {
    avis,
    moyenne,
    total: avis.length
  };
};
