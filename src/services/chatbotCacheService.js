import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

// Cache partagé entre TOUS les visiteurs (pas seulement le même navigateur) —
// beaucoup de questions au premier tour de conversation sont des questions
// FAQ génériques ("Comment prendre rendez-vous ?") dont la réponse ne dépend
// pas de l'utilisateur qui pose la question. Ne sert que sur le PREMIER
// message d'une conversation (cf. SupportChatWidget) : au-delà, la réponse
// dépend de l'historique et des données propres à l'utilisateur, donc jamais
// mise en cache ni servie depuis le cache.
const normaliser = (texte) => texte.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[?!.,;:]+$/g, '');

const hasher = async (texte) => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texte));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
};

export const getReponseEnCache = async (question) => {
  try {
    const id = await hasher(normaliser(question));
    const ref = doc(db, 'chatbot_cache', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    updateDoc(ref, { hits: increment(1) }).catch(() => {});
    return snap.data().reply;
  } catch {
    return null;
  }
};

export const enregistrerReponseEnCache = async (question, reply) => {
  try {
    const id = await hasher(normaliser(question));
    await setDoc(doc(db, 'chatbot_cache', id), {
      question: normaliser(question).slice(0, 300),
      reply: reply.slice(0, 4000),
      hits: 1,
      createdAt: serverTimestamp(),
    });
  } catch {
    // Best-effort — un échec d'écriture cache ne doit jamais casser la réponse déjà affichée.
  }
};
