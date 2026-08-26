import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, getDocs, doc, updateDoc, getDoc, setDoc, increment, runTransaction } from 'firebase/firestore';
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
// #nouveau (demande utilisateur, "une offre expire après 24h si pas de
// réponse") : même délai que la règle Firestore (source de vérité réelle,
// cf. repondreOffre/firestore.rules) — utilisé ici uniquement pour
// l'affichage (masquer les boutons accepter/refuser, montrer "Offre
// expirée" avant même qu'un cron n'ait quoi que ce soit à faire, puisque
// rien ne réécrit jamais le statut du message).
export const isOffreExpiree = (message, settings) => {
  if (message?.type !== 'offre' || message?.statut !== 'en_attente') return false;
  const createdMs = message.createdAt?.toDate ? message.createdAt.toDate().getTime() : message.createdAt ? new Date(message.createdAt).getTime() : null;
  if (!createdMs) return false;
  const expirationMs = (settings?.offreExpirationHeures ?? 24) * 60 * 60 * 1000;
  return Date.now() - createdMs > expirationMs;
};
// #nouveau (demande utilisateur, "on peut négocier lors de l'envoi d'offre") :
// contre-offre ajoutée à côté d'accepter/refuser. Contrainte structurelle
// (firestore.rules) : offreAcceptee ne peut être écrit QUE par le
// propriétaire de l'annonce (le vendeur) — donc seul un "accepte" déclenché
// PAR LE VENDEUR finalise réellement l'achat. Si c'est l'ACHETEUR qui clique
// "Accepter" sur une contre-offre du vendeur, on ne peut pas écrire
// offreAcceptee à sa place : on retransmet sa confirmation comme une
// nouvelle offre 'en_attente' à ce même montant, que le vendeur valide d'un
// clic (chemin déjà existant, aucune règle supplémentaire nécessaire —
// create autorise déjà n'importe quel participant à poser un message
// 'offre', quel que soit le montant, cf. firestore.rules).
export const repondreOffre = async (conversationId, messageId, decision, callerId, contreMontant = null) => {
  const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
  const settings = await getSettings();
  let autrePartieId, montantOffre, nouvelleOffre = null;
  // #bug CRITIQUE (corrigé, "l'acceptation/refus d'offre a des erreurs de
  // permissions" + "finaliser à ce prix reste le prix de départ") : deux
  // problèmes combinés ici, trouvés via inspection directe des données de
  // prod (conversations avec plusieurs offres sur des annonces différentes) :
  // (1) annonceId venait de conversations/{id}.annonceId, posé UNE SEULE FOIS
  // à la création de la conversation (getOrCreateConversation) et jamais mis
  // à jour — dès que les 2 mêmes utilisateurs négocient sur une 2e annonce
  // dans le même thread, TOUTES les offres suivantes pointaient vers la 1ère
  // annonce jamais discutée dans ce thread, pas celle réellement concernée
  // par CE message. Chaque message d'offre porte déjà son propre annonceId
  // (AnnoncePage.jsx, à l'envoi) — c'est la seule source fiable, utilisée
  // maintenant. (2) les 2 écritures (message + annonce) n'étaient PAS
  // atomiques (2 updateDoc séparés) : quand la 2e (annonce, mauvaise cible à
  // cause de (1)) était rejetée par firestore.rules, la 1ère (statut du
  // message déjà passé à 'accepte'/'refuse') restait acquise — offre bloquée
  // pour toujours en OFFRE_DEJA_TRAITEE, sans jamais avoir réellement abouti.
  // runTransaction rend les deux écritures tout-ou-rien.
  await runTransaction(db, async tx => {
    const msgSnap = await tx.get(msgRef);
    if (!msgSnap.exists()) throw new Error('Offre introuvable');
    const data = msgSnap.data();
    if (data.statut !== 'en_attente') throw new Error('OFFRE_DEJA_TRAITEE');
    if (isOffreExpiree(data, settings)) throw new Error('OFFRE_EXPIREE');
    autrePartieId = data.senderId;
    montantOffre = data.montantOffre;
    const annonceId = data.annonceId;
    if (!annonceId) throw new Error('Annonce introuvable');
    const annonceRef = doc(db, 'annonces', annonceId);
    const annonceSnap = await tx.get(annonceRef);
    if (!annonceSnap.exists()) throw new Error('Annonce introuvable');
    const prixActuel = annonceSnap.data().prix;
    const vendeurId = annonceSnap.data().userId;

    if (decision === 'contre') {
      // #nouveau (demande utilisateur, "le nombre d'aller-retour doit avoir
      // son propre paramètre métier") : jusqu'ici aucune limite — une
      // négociation d'offre pouvait continuer indéfiniment. tourNegociation
      // porté par chaque message (0 sur l'offre initiale), incrémenté à
      // chaque contre-offre — même idiome que negociationTour côté commandes.
      const tourActuel = data.tourNegociation ?? 0;
      const maxTours = settings.negociationOffreMaxTours ?? 3;
      if (tourActuel >= maxTours) throw new Error('LIMITE_NEGOCIATION_ATTEINTE');
      const montant = parseInt(contreMontant, 10);
      if (!montant || montant <= 0) throw new Error('Montant de contre-offre invalide');
      if (montant >= prixActuel) throw new Error('La contre-offre doit être inférieure au prix affiché');
      tx.update(msgRef, {
        statut: 'contre'
      });
      montantOffre = montant;
      nouvelleOffre = {
        senderId: callerId,
        message: `🔁 Contre-offre : ${montant.toLocaleString('fr-FR')} XAF (prix demandé : ${prixActuel.toLocaleString('fr-FR')} XAF)`,
        type: 'offre',
        montantOffre: montant,
        statut: 'en_attente',
        tourNegociation: tourActuel + 1,
        lu: false,
        createdAt: serverTimestamp(),
        annonceId,
        titreAnnonce: data.titreAnnonce ?? null,
        prixDemande: prixActuel
      };
      tx.set(doc(collection(db, 'conversations', conversationId, 'messages')), nouvelleOffre);
      return;
    }
    // #robustesse (retour utilisateur, "il n'y aura plus jamais d'erreur
    // j'espère") : firestore.rules exige montant < prix ACTUEL de l'annonce
    // (jamais le prix au moment de l'offre) — si le vendeur baisse son prix
    // entre-temps à un niveau ≤ l'offre, l'acceptation serait rejetée par la
    // règle avec un permission-denied opaque. Vérifié ici en amont pour un
    // message clair ; la règle reste le vrai garde-fou (source de vérité
    // inchangée, ce n'est qu'un message d'erreur plus lisible).
    if (decision === 'accepte' && montantOffre >= prixActuel) {
      throw new Error('Le prix de cette annonce a changé depuis l\'offre — elle n\'est plus valable, l\'acheteur peut acheter directement au nouveau prix.');
    }
    if (decision === 'accepte' && vendeurId !== callerId) {
      // L'acheteur accepte une contre-offre du vendeur — impossible de
      // finaliser ici (offreAcceptee réservé au vendeur), on retransmet sa
      // confirmation comme une offre classique, à valider par le vendeur.
      tx.update(msgRef, {
        statut: 'confirme'
      });
      nouvelleOffre = {
        senderId: callerId,
        message: `✅ Contre-offre acceptée : ${montantOffre.toLocaleString('fr-FR')} XAF — en attente de votre validation.`,
        type: 'offre',
        montantOffre,
        statut: 'en_attente',
        // #bug CRITIQUE (corrigé, audit — "le nombre d'aller-retour doit avoir
        // son propre paramètre métier") : ce message relais oubliait de porter
        // tourNegociation, retombant à 0 côté UI/serveur — un côté pouvait
        // alors relancer une négociation ("Négocier" réapparaissait) après
        // avoir déjà épuisé le plafond, en répétant indéfiniment ce relais.
        // Reporté tel quel (pas de round réellement négocié ici, juste une
        // confirmation), jamais réinitialisé.
        tourNegociation: data.tourNegociation ?? 0,
        lu: false,
        createdAt: serverTimestamp(),
        annonceId,
        titreAnnonce: data.titreAnnonce ?? null,
        prixDemande: prixActuel
      };
      tx.set(doc(collection(db, 'conversations', conversationId, 'messages')), nouvelleOffre);
      return;
    }
    tx.update(msgRef, {
      statut: decision
    });
    if (decision === 'accepte') {
      tx.update(annonceRef, {
        offreAcceptee: {
          acheteurId: data.senderId,
          montant: montantOffre,
          conversationId
        }
      });
    }
  });
  const messageSysteme = decision === 'contre' ? `🔁 Contre-offre envoyée à ${montantOffre?.toLocaleString('fr-FR')} XAF.` : nouvelleOffre ? `✅ Contre-offre acceptée à ${montantOffre?.toLocaleString('fr-FR')} XAF — en attente de la validation du vendeur.` : decision === 'accepte' ? `✅ Offre acceptée à ${montantOffre?.toLocaleString('fr-FR')} XAF — l'acheteur peut maintenant finaliser l'achat à ce prix.` : '❌ Offre refusée.';
  await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
    senderId: 'system',
    message: messageSysteme,
    lu: false,
    createdAt: serverTimestamp()
  });
  // #nouveau (demande utilisateur, "liste des conversations façon
  // WhatsApp") : ce message système n'existait que dans la sous-collection
  // messages — la conversation elle-même (aperçu + tri par activité
  // récente) ne reflétait jamais cette réponse. lastMessageSenderId==callerId
  // (celui qui vient de trancher) — jamais 'system', qui n'est pas un vrai
  // participant de cette conversation.
  await updateDoc(doc(db, 'conversations', conversationId), {
    lastMessage: messageSysteme,
    lastMessageAt: serverTimestamp(),
    lastMessageSenderId: callerId,
    [`nonLu.${autrePartieId}`]: true
  }).catch(e => console.error('Mise à jour aperçu conversation (réponse offre) échouée :', e));
  try {
    await creerNotification({
      userId: autrePartieId,
      type: 'annonce',
      titre: decision === 'contre' ? 'Contre-offre reçue' : nouvelleOffre ? 'Contre-offre acceptée' : decision === 'accepte' ? 'Offre acceptée !' : 'Offre refusée',
      message: decision === 'contre' ? `Contre-offre reçue : ${montantOffre?.toLocaleString('fr-FR')} XAF.` : nouvelleOffre ? `Votre contre-offre de ${montantOffre?.toLocaleString('fr-FR')} XAF a été acceptée — confirmez-la pour finaliser.` : decision === 'accepte' ? `Votre offre de ${montantOffre?.toLocaleString('fr-FR')} XAF a été acceptée — vous pouvez finaliser l'achat à ce prix.` : `Votre offre de ${montantOffre?.toLocaleString('fr-FR')} XAF a été refusée.`,
      link: `/chat/${conversationId}`
    });
  } catch (e) {
    console.error('Notification réponse offre échouée :', e);
  }
};
// #nouveau (demande utilisateur, "liste des conversations façon WhatsApp,
// non-lu en gras") : appelée à l'ouverture d'une conversation — ne touche
// QUE la clé du destinataire lui-même (cf. firestore.rules), jamais celle
// de l'autre participant. Best-effort : ne bloque jamais l'affichage des
// messages si elle échoue.
export const marquerConversationLue = async (conversationId, userId) => {
  try {
    await updateDoc(doc(db, 'conversations', conversationId), {
      [`nonLu.${userId}`]: false
    });
  } catch (e) {
    console.error('marquerConversationLue a échoué :', e);
  }
};
export const getUserProfile = async userId => {
  const snap = await getDoc(doc(db, 'profils_publics', userId));
  return snap.exists() ? {
    id: snap.id,
    ...snap.data()
  } : null;
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
export const getConversations = (userId, callback) => {
  const q = query(collection(db, 'conversations'), where('participants', 'array-contains', userId), orderBy('lastMessageAt', 'desc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    })));
  });
};
