import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { creerNotification } from './notificationsService';
import { getSettings } from './settingsService';
// ÉLEVÉE (audit sécurité, corrigé) : /\b\d{9,}\b/ exigeait 9 chiffres CONTIGUS
// — "6 91 23 45 67" ou "691.234.567" passait intact. Remplacé par un motif
// qui accepte des séparateurs (espace/point/tiret) entre les chiffres — même
// assouplissement appliqué en miroir côté firestore.rules (le vrai filet de
// sécurité), pas une protection parfaite contre toute forme d'évasion.
const MOTS_INTERDITS = [/(?:\d[ .\-]*){9,}/g, /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, /https?:\/\/[^\s]+/g, /whatsapp/gi, /telegram/gi, /appelle.?moi/gi, /en dehors/gi, /hors app/gi, /mon num/gi, /mon numéro/gi, /contacte.?moi/gi];
export const filtrerMessage = message => {
  let filtered = message;
  let detected = false;
  MOTS_INTERDITS.forEach(pattern => {
    if (pattern.test(filtered)) {
      detected = true;
      filtered = filtered.replace(pattern, '***');
    }
  });
  return {
    filtered,
    detected
  };
};
export const getOrCreateConversation = async (user1Id, user2Id, annonceId) => {
  const convId = [user1Id, user2Id].sort().join('_');
  const ref = doc(db, 'conversations', convId);
  const snap = await getDoc(ref);
  if (snap.exists()) return convId;
  await setDoc(ref, {
    participants: [user1Id, user2Id],
    annonceId,
    lastMessage: null,
    lastMessageAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    avertissements: {
      [user1Id]: 0,
      [user2Id]: 0
    },
    suspensions: {}
  });
  return convId;
};
export const envoyerMessage = async (conversationId, senderId, message) => {
  const convRef = doc(db, 'conversations', conversationId);
  const preSnap = await getDoc(convRef);
  const suspensionUntil = preSnap.data()?.suspensions?.[senderId];
  if (suspensionUntil && new Date(suspensionUntil) > new Date()) {
    throw new Error('CHAT_SUSPENDU');
  }
  const {
    filtered,
    detected
  } = filtrerMessage(message);
  let nbAvert = 0;
  if (detected) {
    const settings = await getSettings();
    const data = preSnap.data();
    nbAvert = (data.avertissements?.[senderId] || 0) + 1;
    await updateDoc(convRef, {
      [`avertissements.${senderId}`]: nbAvert
    });
    if (nbAvert >= (settings.chatAvertissementsAvantSuspension ?? 2)) {
      const until = new Date(Date.now() + (settings.chatSuspensionHeures ?? 24) * 60 * 60 * 1000).toISOString();
      await updateDoc(convRef, {
        [`suspensions.${senderId}`]: until
      });
    }
    try {
      const userSnap = await getDoc(doc(db, 'users', senderId));
      const avertissementsCompte = (userSnap.data()?.avertissements || 0) + 1;
      await updateDoc(doc(db, 'users', senderId), {
        avertissements: avertissementsCompte
      });
    } catch (e) {
      console.error('Incrément avertissements compte échoué :', e);
    }
  }
  await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
    senderId,
    message: filtered,
    lu: false,
    createdAt: serverTimestamp()
  });
  const autreUserId = (preSnap.data()?.participants || []).find(p => p !== senderId);
  await updateDoc(doc(db, 'conversations', conversationId), {
    lastMessage: filtered,
    lastMessageAt: serverTimestamp(),
    lastMessageSenderId: senderId,
    // #nouveau (demande utilisateur, "liste des conversations façon
    // WhatsApp") : marque le DESTINATAIRE non-lu — l'expéditeur, lui, vient
    // de voir passer son propre message, jamais marqué non-lu pour lui-même.
    ...(autreUserId ? { [`nonLu.${autreUserId}`]: true } : {})
  });
  try {
    if (autreUserId) {
      await creerNotification({
        userId: autreUserId,
        type: 'message',
        titre: 'Nouveau message',
        message: filtered.length > 80 ? `${filtered.slice(0, 80)}…` : filtered,
        link: `/chat/${conversationId}`
      });
    }
  } catch (e) {
    console.error('Notification nouveau message échouée :', e);
  }
  return {
    censured: detected,
    avertissements: detected ? nbAvert : undefined
  };
};
export const listenMessages = (conversationId, callback) => {
  const q = query(collection(db, 'conversations', conversationId, 'messages'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    })));
  });
};
