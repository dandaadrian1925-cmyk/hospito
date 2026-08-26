import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, doc, updateDoc, getDoc, runTransaction } from 'firebase/firestore';
import { db } from '../firebase/config';
import { uploadFile } from '../supabase/config';
import { STATUTS_COMMANDE } from './commandesService';
import { creerNotification } from './notificationsService';
// #nouveau (demande utilisateur, "améliorons la vente en lots") :
// articleLotConcerne (optionnel, texte libre choisi/saisi par l'acheteur
// parmi commande.articlesLot) donne à l'admin le contexte de QUEL article du
// lot pose problème — la résolution reste néanmoins globale (tout le lot est
// remboursé ou validé ensemble, jamais un remboursement partiel : décision
// produit assumée, le lot reste un bloc indivisible).
export const ouvrirLitige = async (commandeId, acheteurId, raison, preuvePhotos, articleLotConcerne = null) => {
  const commandeRef = doc(db, 'commandes', commandeId);
  const commandeSnapPre = await getDoc(commandeRef);
  if (!commandeSnapPre.exists()) throw new Error('COMMANDE_INTROUVABLE');
  const commandePre = commandeSnapPre.data();
  if (commandePre.acheteurId !== acheteurId) throw new Error('COMMANDE_AUTRUI');
  if (commandePre.statut !== STATUTS_COMMANDE.RETRACTATION) throw new Error('STATUT_INVALIDE');
  const preuveUrls = [];
  for (let i = 0; i < preuvePhotos.length; i++) {
    const upload = await uploadFile('litiges', `${commandeId}/${Date.now()}_preuve_${i}`, preuvePhotos[i]);
    preuveUrls.push(upload.publicUrl);
  }
  const litigeRef = doc(collection(db, 'litiges'));
  let vendeurId = null;
  await runTransaction(db, async tx => {
    const commandeSnap = await tx.get(commandeRef);
    if (!commandeSnap.exists()) throw new Error('COMMANDE_INTROUVABLE');
    const commande = commandeSnap.data();
    if (commande.acheteurId !== acheteurId) throw new Error('COMMANDE_AUTRUI');
    if (commande.statut !== STATUTS_COMMANDE.RETRACTATION) throw new Error('STATUT_INVALIDE');
    const historique = commande.historiqueStatuts || [];
    historique.push({
      statut: 'litige',
      date: new Date().toISOString()
    });
    tx.update(commandeRef, {
      statut: 'litige',
      historiqueStatuts: historique,
      updatedAt: serverTimestamp()
    });
    vendeurId = commande.vendeurId;
    tx.set(litigeRef, {
      commandeId,
      acheteurId,
      vendeurId,
      raison,
      preuveUrls,
      statut: 'ouvert',
      decision: null,
      articleLotConcerne: commande.estLot ? (articleLotConcerne || null) : null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  });
  if (vendeurId) {
    await creerNotification({
      userId: vendeurId,
      type: 'commande',
      titre: 'Litige ouvert',
      message: `L'acheteur a ouvert un litige sur la commande #${commandeId.slice(0, 8).toUpperCase()} : ${raison}`,
      link: `/commande/${commandeId}`
    });
  }
  return litigeRef.id;
};
export const getLitigesByUser = async userId => {
  const [enTantQuAcheteur, enTantQueVendeur] = await Promise.all([getDocs(query(collection(db, 'litiges'), where('acheteurId', '==', userId), orderBy('createdAt', 'desc'))), getDocs(query(collection(db, 'litiges'), where('vendeurId', '==', userId), orderBy('createdAt', 'desc')))]);
  const parId = new Map();
  [...enTantQuAcheteur.docs, ...enTantQueVendeur.docs].forEach(d => parId.set(d.id, {
    id: d.id,
    ...d.data()
  }));
  return [...parId.values()].sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
};
