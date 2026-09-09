import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp, runTransaction, query, where, orderBy, getDocs, increment, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { creerNotification } from './notificationsService';
import { getSessionIdLocal } from './authService';
const SUPABASE_FUNCTION_URL = 'https://cekiqtkdgjgawxxerjdf.supabase.co/functions/v1/hospito-dynamic-processor';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const WALLET_TYPES = {
  DEPOT: 'depot',
  // #nouveau (demande utilisateur, "c'est avec le solde du compte qu'on peut
  // payer les factures et autres") : débit du solde pour une facture
  // hospitalière (HostoConnect) — voir facturesService.js::payerFactureAvecSolde,
  // écrit par hospito-facture-paiement (edge function), jamais par ce client
  // directement (contrairement aux autres débits ci-dessus), car le paiement
  // doit rester atomique avec la bascule des articles liés (examen/panier).
  PAIEMENT_FACTURE: 'paiement_facture'
};
const campayProxy = async (action, payload) => {
  if (!auth.currentUser) throw new Error('Vous devez être connecté');
  const firebaseIdToken = await auth.currentUser.getIdToken();
  const res = await fetch(SUPABASE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'X-Firebase-Token': firebaseIdToken
    },
    body: JSON.stringify({
      action,
      payload
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || 'Erreur CamPay');
  return data;
};
export const getWallet = async userId => {
  const snap = await getDoc(doc(db, 'users', userId));
  if (!snap.exists()) return {
    solde: 0,
    soldeParrainage: 0
  };
  const d = snap.data();
  return {
    solde: d.solde || 0,
    soldeParrainage: d.soldeParrainage || 0
  };
};
export const listenWallet = (userId, callback) => {
  return onSnapshot(doc(db, 'users', userId), snap => {
    if (!snap.exists()) {
      callback({
        solde: 0,
        soldeParrainage: 0,
        soldeBonus: 0
      });
      return;
    }
    const d = snap.data();
    callback({
      solde: d.solde || 0,
      soldeParrainage: d.soldeParrainage || 0,
      // #bug (corrigé, campagne de lancement) : soldeBonus n'était jamais
      // remonté — invisible partout où le wallet est affiché (header, page
      // Wallet) malgré un vrai crédit en base.
      soldeBonus: d.soldeBonus || 0
    });
  });
};
export const getTransactions = async userId => {
  const q = query(collection(db, 'transactions'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));
};
const TYPES_BANCAIRES = [WALLET_TYPES.DEPOT];
export const getTransactionsBancaires = async userId => {
  const all = await getTransactions(userId);
  return all.filter(t => TYPES_BANCAIRES.includes(t.type));
};
export const getOperations = async userId => {
  const all = await getTransactions(userId);
  return all.filter(t => !TYPES_BANCAIRES.includes(t.type));
};
export const initierDepot = async (userId, montant, phoneNumber) => {
  const soldeSuspectSnap = await getDoc(doc(db, 'users', userId));
  if (soldeSuspectSnap.data()?.soldeSuspect) throw new Error('COMPTE_SUSPENDU_VERIFICATION');
  const externalId = `depot_${userId}_${Date.now()}`;
  const txRef = await addDoc(collection(db, 'transactions'), {
    userId,
    type: WALLET_TYPES.DEPOT,
    montant,
    sourceWallet: 'principal',
    campayExternalId: externalId,
    // MOYENNE (audit sécurité, corrigé) : enregistré pour alimenter
    // users/{uid}.numerosDepotConnus à la confirmation (cf. dynamic-processor,
    // crediterDepotAtomique) — la liste que firestore.rules exige désormais
    // pour autoriser un retrait, afin qu'un compte compromis ne puisse pas
    // rediriger un retrait vers un numéro jamais associé à ce compte.
    phoneNumber,
    statut: 'pending',
    description: 'Dépôt via CamPay',
    createdAt: serverTimestamp()
  });
  let data;
  try {
    data = await campayProxy('initier_paiement', {
      amount: montant,
      phoneNumber,
      externalId,
      description: 'Dépôt HostoConnect',
      transactionId: txRef.id,
      sessionId: getSessionIdLocal()
    });
  } catch (e) {
    // #nouveau (audit wallet, corrigé) : si CETTE écriture de secours échoue
    // aussi (même incident réseau que l'appel CamPay ci-dessus), la transaction
    // restait bloquée en 'pending' SANS campayReference — invisible à la fois
    // pour l'utilisateur (a déjà vu l'erreur) et pour reconcilierDepotsEnAttente
    // (qui ignore explicitement les lignes sans campayReference). Loggé pour
    // qu'un dépôt fantôme ne reste plus totalement silencieux.
    await updateDoc(txRef, {
      statut: 'echoue'
    }).catch(err => console.error('Marquage du dépôt en échec a lui-même échoué :', err));
    throw e;
  }
  // CRITIQUE (audit sécurité, corrigé) : campayReference est désormais écrit
  // par le serveur (dynamic-processor, initier_paiement) dans le même appel
  // que /collect/, jamais par le client — la règle Firestore ne laisse plus
  // ce champ modifiable par le propriétaire (il ne prouvait auparavant rien
  // sur la provenance réelle de la référence).
  return {
    transactionId: txRef.id,
    reference: data.reference
  };
};
export const verifierPaiement = async reference => {
  return await campayProxy('verifier_paiement', {
    reference
  });
};
const verifierEtCrediterDepot = async (txDoc, txData) => {
  if (txData.statut === 'completed') return {
    dejaCreditee: true
  };
  let resultat;
  try {
    resultat = await campayProxy('confirmer_et_crediter_depot', {
      transactionId: txDoc.id,
      sessionId: getSessionIdLocal()
    });
  } catch (e) {
    console.warn('Confirmation/crédit du dépôt échoué :', e.message);
    return {
      statut: 'VERIFICATION_ECHOUEE',
      message: 'Impossible de vérifier le paiement pour le moment. Réessayez dans quelques instants.'
    };
  }
  if (resultat.statut === 'completed') {
    if (!resultat.dejaCreditee) {
      await creerNotification({
        userId: txData.userId,
        type: 'depot',
        titre: 'Dépôt confirmé',
        message: `Votre dépôt de ${(resultat.montant ?? txData.montant ?? 0).toLocaleString('fr-FR')} XAF a été crédité sur votre solde.`,
        link: '/wallet'
      });
    }
    return {
      statut: 'completed',
      montant: resultat.montant,
      dejaCreditee: resultat.dejaCreditee
    };
  }
  return {
    statut: resultat.statut,
    message: resultat.message
  };
};
export const attendreConfirmationDepot = async (transactionId, {
  intervalMs = 3500,
  timeoutMs = 90000
} = {}) => {
  const txRef = doc(db, 'transactions', transactionId);
  const debut = Date.now();
  while (Date.now() - debut < timeoutMs) {
    const txSnap = await getDoc(txRef);
    const txData = txSnap.data();
    if (!txData) throw new Error('Transaction introuvable');
    if (txData.statut === 'completed') return {
      statut: 'completed'
    };
    if (txData.statut === 'echoue' || txData.statut === 'ecart_montant') return {
      statut: txData.statut
    };
    const resultat = await verifierEtCrediterDepot(txSnap, txData);
    if (resultat?.dejaCreditee || resultat?.statut === 'completed') return {
      statut: 'completed'
    };
    if (resultat?.statut === 'FAILED') return {
      statut: 'echoue'
    };
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  return {
    statut: 'timeout'
  };
};
// Au-delà de ce délai, un dépôt encore "pending" est considéré abandonné —
// un dépôt mobile money légitime se confirme en quelques secondes à
// quelques minutes chez CamPay, jamais en heures. Avant ce correctif, un
// dépôt jamais confirmé (USSD refusé/ignoré, coupure réseau...) restait
// "pending" indéfiniment : aucune expiration, donc invisible pour
// l'utilisateur ET l'admin, sans jamais bloquer de solde (aucun crédit n'a
// lieu tant que le statut n'est pas "completed") mais restant un dépôt
// "fantôme" qui ne se résout jamais tout seul.
const DEPOT_STALE_MS = 45 * 60 * 1000;

// Au-delà de ce délai depuis sa création, un dépôt "echoue" (expiré par
// DEPOT_STALE_MS ci-dessus) n'est plus jamais re-vérifié — un paiement mobile
// money légitime mais anormalement lent se confirme largement dans cette
// fenêtre ; au-delà, considéré définitivement mort (évite un appel CamPay
// inutile à chaque reconnexion pour un dépôt réellement abandonné).
const DEPOT_ECHOUE_REVERIF_MS = 48 * 60 * 60 * 1000;

export const reconcilierDepotsEnAttente = async userId => {
  // MOYENNE (audit sécurité, corrigé) : "echoue" inclus désormais, pas
  // seulement "pending" — avant, un dépôt expiré par le timeout ci-dessous
  // n'était plus JAMAIS revérifié, même si CamPay confirmait le paiement
  // (retard réseau, validation différée) une fois le timeout dépassé :
  // l'argent était réellement débité côté client mais jamais crédité côté
  // MAKET, sans aucun moyen automatique de rattraper l'écart. Le serveur
  // (dynamic-processor, confirmer_et_crediter_depot) accepte maintenant lui
  // aussi de re-vérifier un dépôt "echoue" contre CamPay.
  const q = query(collection(db, 'transactions'), where('userId', '==', userId), where('type', '==', WALLET_TYPES.DEPOT), where('statut', 'in', ['pending', 'echoue']));
  const snap = await getDocs(q);
  const resultats = [];
  for (const txDoc of snap.docs) {
    const txData = txDoc.data();
    const createdMs = txData.createdAt?.toDate?.()?.getTime();
    // #nouveau (audit wallet, corrigé) : un dépôt sans campayReference (échec
    // avant même l'appel CamPay, cf. initierDepot) ne peut PAS être revérifié
    // auprès de CamPay (aucune référence à interroger) — il restait "pending"
    // pour toujours, invisible à l'utilisateur ET aux admins. Marqué "echoue"
    // directement une fois passé DEPOT_STALE_MS, sans aller-retour CamPay.
    if (!txData.campayReference) {
      if (txData.statut === 'pending' && createdMs && Date.now() - createdMs > DEPOT_STALE_MS) {
        await updateDoc(doc(db, 'transactions', txDoc.id), {
          statut: 'echoue'
        }).catch(err => console.error('Marquage du dépôt sans référence en échec a échoué :', err));
      }
      continue;
    }
    if (txData.statut === 'echoue' && (!createdMs || Date.now() - createdMs > DEPOT_ECHOUE_REVERIF_MS)) continue;
    try {
      const resultat = await verifierEtCrediterDepot(txDoc, txData);
      if (resultat?.statut === 'completed' || resultat?.dejaCreditee) {
        resultats.push({
          id: txDoc.id,
          ...resultat
        });
        continue;
      }
      // Toujours pas résolu même après cette vérification en direct auprès de
      // CamPay — on n'expire QUE si le dépôt est vraiment ancien, jamais sur
      // la seule absence de confirmation immédiate (un dépôt tout juste créé
      // doit garder sa chance normale via attendreConfirmationDepot).
      // Champ modifié seul (statut) : c'est exactement ce qu'autorise déjà la
      // règle Firestore (transactions/{id} allow update, cas dépôt
      // pending→echoue) — n'y ajouter aucun autre champ dans le même appel.
      if (txData.statut === 'pending' && createdMs && Date.now() - createdMs > DEPOT_STALE_MS) {
        await updateDoc(doc(db, 'transactions', txDoc.id), {
          statut: 'echoue'
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('Réconciliation dépôt échouée pour', txDoc.id, ':', e.message);
    }
  }
  return resultats;
};
// #nouveau (demande utilisateur, détection resserrée) : reconcilierSoldes
// (maket-admin) ne détecte un écart que lorsqu'un admin ouvre la page Wallet
// & transactions — un compte compromis pouvait donc rester utilisable
// indéfiniment entre deux ouvertures de cette page. Ce contrôle "paresseux"
// (même pattern que reconcilierDepotsEnAttente ci-dessus) compare le solde/
// soldeParrainage réels de L'UTILISATEUR CONNECTÉ à ceux reconstruits depuis
// SES PROPRES transactions (lecture déjà autorisée par les règles), et gèle
// son propre compte si un écart est détecté — la règle Firestore n'autorise
// cette écriture que dans le sens false → true (jamais l'inverse), donc sans
// aucun risque : ça ne peut que RESTREINDRE ce que l'appelant peut faire sur
// SON PROPRE compte. Best-effort, jamais bloquant pour l'utilisateur.
export const verifierEcartSoldePropre = async userId => {
  const userSnap = await getDoc(doc(db, 'users', userId));
  if (!userSnap.exists() || userSnap.data().soldeSuspect) return;
  const txSnap = await getDocs(query(collection(db, 'transactions'), where('userId', '==', userId)));
  let attenduSolde = 0;
  // Ignore les lignes historiques sourceWallet:'parrainage' (fonctionnalité
  // retirée) — solde/{parrainage} n'est plus jamais renseigné pour un nouveau
  // compte, mais un compte déjà existant peut encore en porter d'anciennes.
  for (const t of txSnap.docs.map(d => d.data())) {
    if (t.sourceWallet === 'parrainage') continue;
    if (t.type === WALLET_TYPES.DEPOT && t.statut !== 'completed') continue;
    attenduSolde += t.montant || 0;
  }
  const soldeReel = userSnap.data().solde || 0;
  if (soldeReel !== attenduSolde) {
    await updateDoc(doc(db, 'users', userId), {
      soldeSuspect: true
    }).catch(() => {});
  }
};
// #nouveau (flux retour, litige gagné par l'acheteur, demande utilisateur
// "le vendeur va payer doublement les frais de transport pour aller
// récupérer l'article et lui remettre. Rien à faire quand il aura payé les
// frais double le livreur ira récupérer") : déclenché par le VENDEUR
// lui-même depuis la page de la commande — jamais automatique, jamais de
// relance en tâche de fond tant qu'il n'a pas cliqué. Le double des frais
// déjà figés sur la commande sert ENTIÈREMENT à payer le livreur pour ses
// DEUX vrais trajets (collecte chez l'acheteur, puis remise au vendeur) —
// jamais un remboursement caché à MAKET (cf. maket-livreur/commandesService.js
// confirmerRetourCollecte + la fonction équivalente pour le trajet retour) :
// chaque trajet applique séparément commissionLivraisonPercent, comme une
// livraison normale — MAKET touche donc sa commission deux fois, une par
// trajet, jamais une seule fois sur "le double". Même livreur que le dernier
// tronçon (seul à connaître l'adresse de l'acheteur) — l'admin garde la main
// pour réassigner si besoin (cf. maket-admin).
// #nouveau (demande utilisateur, "que le vendeur confirme aussi qu'il a
// reçu sa commande") : même générateur que le code de remise normal
// (commandesService.js, non exporté — copié ici pour éviter une dépendance
// croisée entre les deux services).

