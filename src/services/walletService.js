import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp, runTransaction, query, where, orderBy, getDocs, increment, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { creerNotification } from './notificationsService';
import { getSettings } from './settingsService';
import { getSessionIdLocal } from './authService';
export const COMMISSION_VENTE = 0.05;
export const RETRAIT_MINIMUM = 1000;
const SUPABASE_FUNCTION_URL = 'https://cekiqtkdgjgawxxerjdf.supabase.co/functions/v1/hospito-dynamic-processor';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const WALLET_TYPES = {
  DEPOT: 'depot',
  RETRAIT: 'retrait',
  COMMISSION_PUB: 'commission_publication',
  VENTE: 'credit_vente',
  ACHAT: 'achat_commande',
  REMBOURSEMENT: 'remboursement_commande',
  BOOST: 'boost_annonce',
  FLASH: 'flash_annonce',
  CREDIT_PARRAINAGE: 'credit_parrainage',
  ACHAT_LIVRAISON: 'achat_livraison',
  LIVRAISON: 'credit_livraison',
  TRANSFERT_PARRAINAGE: 'transfert_parrainage',
  // #nouveau (flux retour, litige gagné par l'acheteur) : débit vendeur,
  // double des frais de livraison déjà figés sur la commande.
  RETOUR_LIVRAISON: 'retour_livraison',
  // #nouveau (demande utilisateur, "Vendeur Pro") : pass à durée fixe,
  // paiement ponctuel — même famille que BOOST/FLASH, pas un abonnement.
  VENDEUR_PRO: 'vendeur_pro',
  // #nouveau (espace patient) : paiement d'une facture d'établissement de
  // santé depuis le solde — même mécanique que ACHAT_LIVRAISON, sans lien
  // vers une "commande" marketplace.
  PAIEMENT_FACTURE: 'facture'
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
const TYPES_BANCAIRES = [WALLET_TYPES.DEPOT, WALLET_TYPES.RETRAIT];
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
      description: 'Dépôt MAKET Wallet',
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
  let attenduParrainage = 0;
  for (const t of txSnap.docs.map(d => d.data())) {
    if (t.type === WALLET_TYPES.DEPOT && t.statut !== 'completed') continue;
    if (t.type === WALLET_TYPES.RETRAIT && t.statut === 'rejete') continue;
    if (t.sourceWallet === 'parrainage') attenduParrainage += t.montant || 0;else attenduSolde += t.montant || 0;
  }
  const soldeReel = userSnap.data().solde || 0;
  const parrainageReel = userSnap.data().soldeParrainage || 0;
  if (soldeReel !== attenduSolde || parrainageReel !== attenduParrainage) {
    await updateDoc(doc(db, 'users', userId), {
      soldeSuspect: true
    }).catch(() => {});
  }
};
export const initierRetrait = async (userId, montant, phoneNumber, operateur) => {
  const {
    retraitMinimum,
    retraitMaximum
  } = await getSettings();
  if (montant < retraitMinimum) throw new Error(`Montant minimum : ${retraitMinimum} XAF`);
  if (retraitMaximum && montant > retraitMaximum) throw new Error(`Montant maximum par retrait : ${retraitMaximum} XAF`);
  // #nouveau (demande utilisateur, "avant qu'un retrait ne soit possible,
  // refaire le calcul pour voir si le solde est faux") : verifierEcartSoldePropre
  // n'était déclenché que passivement au chargement de WalletPage — un compte
  // pouvait donc tenter un retrait avant ce recalcul (ou entre deux visites de
  // la page). Recalcul EXPLICITE juste avant, jamais après — s'il détecte un
  // écart, il gèle soldeSuspect (self-service, false→true uniquement, cf.
  // firestore.rules), et la vérification déjà présente dans la transaction
  // ci-dessous (userSnap.data()?.soldeSuspect) bloque alors le retrait avec
  // le message existant. La vraie déconnexion suit via le listener temps réel
  // déjà en place (AuthContext), pas quelque chose à refaire ici.
  await verifierEcartSoldePropre(userId);
  await runTransaction(db, async tx => {
    const userRef = doc(db, 'users', userId);
    const userSnap = await tx.get(userRef);
    if (userSnap.data()?.soldeSuspect) throw new Error('COMPTE_SUSPENDU_VERIFICATION');
    const solde = userSnap.data()?.solde || 0;
    if (solde < montant) throw new Error(`Solde insuffisant (${solde} XAF disponibles)`);
    tx.update(userRef, {
      solde: increment(-montant)
    });
    tx.set(doc(collection(db, 'transactions')), {
      userId,
      type: WALLET_TYPES.RETRAIT,
      montant: -montant,
      sourceWallet: 'principal',
      phoneNumber,
      operateur,
      statut: 'en_cours',
      description: `Retrait vers ${phoneNumber} (${operateur})`,
      createdAt: serverTimestamp()
    });
  });
  await creerNotification({
    userId,
    type: 'retrait',
    titre: 'Demande de retrait envoyée',
    message: `Votre demande de retrait de ${montant.toLocaleString('fr-FR')} XAF vers ${phoneNumber} est en cours de traitement.`,
    link: '/wallet'
  });
};
// #nouveau (refonte parrainage v2) : transfert self-service du solde de
// parrainage vers le solde principal — ensuite retirable comme n'importe quel
// solde normal (retraitMinimum/retraitMaximum, initierRetrait ci-dessus),
// aucun nouveau chemin de retrait à créer. Deux lignes de grand livre
// appariées (une par wallet) pour que la réconciliation (verifierEcartSoldePropre)
// reste cohérente, même idiome que achat_commande côté firestore.rules.
export const transfererSoldeParrainage = async (userId, montant) => {
  const { transfertParrainageMinimum } = await getSettings();
  if (montant < (transfertParrainageMinimum ?? 5000)) {
    throw new Error(`Montant minimum : ${transfertParrainageMinimum ?? 5000} XAF`);
  }
  await runTransaction(db, async tx => {
    const userRef = doc(db, 'users', userId);
    const userSnap = await tx.get(userRef);
    if (userSnap.data()?.soldeSuspect) throw new Error('COMPTE_SUSPENDU_VERIFICATION');
    const soldeParrainage = userSnap.data()?.soldeParrainage || 0;
    if (soldeParrainage < montant) throw new Error(`Solde de parrainage insuffisant (${soldeParrainage} XAF disponibles)`);
    tx.update(userRef, {
      soldeParrainage: increment(-montant),
      solde: increment(montant)
    });
    tx.set(doc(collection(db, 'transactions')), {
      userId,
      type: WALLET_TYPES.TRANSFERT_PARRAINAGE,
      montant: -montant,
      sourceWallet: 'parrainage',
      description: 'Transfert vers le solde principal',
      createdAt: serverTimestamp()
    });
    tx.set(doc(collection(db, 'transactions')), {
      userId,
      type: WALLET_TYPES.TRANSFERT_PARRAINAGE,
      montant,
      sourceWallet: 'principal',
      description: 'Transfert depuis le solde de parrainage',
      createdAt: serverTimestamp()
    });
  });
};
// #nouveau (campagne de lancement) : sourceWallet 'bonus' possible.
export const payerFraisLivraison = async (commandeId, acheteurId, sourceWallet = 'principal') => {
  const commandeRef = doc(db, 'commandes', commandeId);
  const acheteurRef = doc(db, 'users', acheteurId);
  const champSolde = sourceWallet === 'bonus' ? 'soldeBonus' : 'solde';
  let montantPaye = 0;
  let titreAnnonce = '';
  let vendeurId = null;
  let livreurCollecteId = null;
  let livreurLivraisonId = null;
  await runTransaction(db, async tx => {
    const [commandeSnap, acheteurSnap] = await Promise.all([tx.get(commandeRef), tx.get(acheteurRef)]);
    if (!commandeSnap.exists()) throw new Error('COMMANDE_INTROUVABLE');
    const commande = commandeSnap.data();
    if (commande.acheteurId !== acheteurId) throw new Error('COMMANDE_INVALIDE');
    if (commande.statut !== 'prix_propose') throw new Error('STATUT_INVALIDE');
    const montant = (commande.fraisLivraison || 0) + (commande.interVilles ? commande.fraisLivraisonInterVilles || 0 : 0);
    const solde = acheteurSnap.data()?.[champSolde] || 0;
    if (montant > 0 && solde < montant) throw new Error('SOLDE_INSUFFISANT');
    tx.update(acheteurRef, {
      [champSolde]: increment(-montant)
    });
    tx.set(doc(collection(db, 'transactions')), {
      userId: acheteurId,
      type: WALLET_TYPES.ACHAT_LIVRAISON,
      montant: -montant,
      sourceWallet,
      commandeId,
      description: `Frais de livraison : ${commande.titreAnnonce || 'commande'}`,
      createdAt: serverTimestamp()
    });
    const historique = commande.historiqueStatuts || [];
    historique.push({
      statut: 'livreur_assigne',
      date: new Date().toISOString()
    });
    tx.update(commandeRef, {
      statut: 'livreur_assigne',
      historiqueStatuts: historique,
      updatedAt: serverTimestamp(),
      // #sécurité (corrigé, audit) : figé au paiement, jamais réévalué — voir
      // sourceWalletAchat plus haut, même principe (firestore.rules,
      // refundChampsCorrects).
      sourceWalletLivraison: sourceWallet
    });
    montantPaye = montant;
    titreAnnonce = commande.titreAnnonce || '';
    vendeurId = commande.vendeurId;
    livreurCollecteId = commande.livreurCollecteId || null;
    livreurLivraisonId = commande.livreurLivraisonId || null;
  });
  if (vendeurId) {
    await creerNotification({
      userId: vendeurId,
      type: 'commande',
      titre: 'Livraison confirmée',
      message: `L'acheteur a payé les frais de livraison pour "${titreAnnonce}" — le livreur va venir chercher l'article.`,
      link: `/commande/${commandeId}`
    });
  }
  const livreursANotifier = new Set([livreurCollecteId, livreurLivraisonId].filter(Boolean));
  await Promise.all([...livreursANotifier].map(livreurId => creerNotification({
    userId: livreurId,
    type: 'commande',
    titre: 'Frais de livraison payés',
    message: `L'acheteur a payé les frais pour "${titreAnnonce}" — vous pouvez récupérer l'article.`,
    link: `/commandes/${commandeId}`
  }).catch(e => console.error('Notification livreur (paiement frais) échouée :', e))));
  return montantPaye;
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
const genererCodeRetour = () => String(Math.floor(1000 + Math.random() * 9000));
export const payerRetourLivraison = async (commandeId, vendeurId) => {
  const commandeRef = doc(db, 'commandes', commandeId);
  const vendeurRef = doc(db, 'users', vendeurId);
  const codeRetourRef = doc(db, 'commandes', commandeId, 'prive', 'retour_remise');
  const codeRetour = genererCodeRetour();
  let montantPaye = 0;
  let titreAnnonce = '';
  let retourLivreurId = null;
  await runTransaction(db, async tx => {
    const [commandeSnap, vendeurSnap] = await Promise.all([tx.get(commandeRef), tx.get(vendeurRef)]);
    if (!commandeSnap.exists()) throw new Error('COMMANDE_INTROUVABLE');
    const commande = commandeSnap.data();
    if (commande.vendeurId !== vendeurId) throw new Error('COMMANDE_INVALIDE');
    if (commande.statut !== 'annule' || !commande.retourEligible) throw new Error('RETOUR_NON_ELIGIBLE');
    if (commande.retourStatut) throw new Error('RETOUR_DEJA_PAYE');
    const montant = 2 * ((commande.fraisLivraison || 0) + (commande.interVilles ? commande.fraisLivraisonInterVilles || 0 : 0));
    const solde = vendeurSnap.data()?.solde || 0;
    if (montant > 0 && solde < montant) throw new Error('SOLDE_INSUFFISANT');
    tx.update(vendeurRef, {
      solde: increment(-montant),
      commandeId
    });
    tx.set(codeRetourRef, { code: codeRetour, createdAt: serverTimestamp() });
    tx.set(doc(collection(db, 'transactions')), {
      userId: vendeurId,
      type: WALLET_TYPES.RETOUR_LIVRAISON,
      montant: -montant,
      sourceWallet: 'principal',
      commandeId,
      description: `Retour livraison (double frais) : ${commande.titreAnnonce || 'commande'}`,
      createdAt: serverTimestamp()
    });
    const livreurId = commande.livreurLivraisonId || commande.livreurCollecteId;
    const historique = commande.retourHistorique || [];
    historique.push({ statut: 'paye', date: new Date().toISOString() });
    tx.update(commandeRef, {
      retourStatut: 'paye',
      retourLivreurId: livreurId,
      retourFraisPayes: montant,
      retourHistorique: historique,
      updatedAt: serverTimestamp()
    });
    montantPaye = montant;
    titreAnnonce = commande.titreAnnonce || '';
    retourLivreurId = livreurId;
  });
  if (retourLivreurId) {
    await creerNotification({
      userId: retourLivreurId,
      type: 'commande',
      titre: 'Retour à effectuer',
      message: `Le vendeur a payé le retour pour "${titreAnnonce}" — allez récupérer le colis chez l'acheteur.`,
      // #bug (corrigé) : /commandes/{id} (maket-livreur) est la page de
      // livraison normale — un retour a sa propre page dédiée (/retours/{id},
      // RetourDetailPage), jamais atteinte depuis cette notification jusqu'ici.
      link: `/retours/${commandeId}`
    }).catch(e => console.error('Notification livreur (retour payé) échouée :', e));
  }
  return montantPaye;
};

// #nouveau (demande utilisateur, "Vendeur Pro") : pass à durée fixe, paiement
// ponctuel — même famille que boosterAnnonce (annoncesService.js), mais sur
// le profil du vendeur plutôt qu'une annonce précise. Rachat AVANT expiration
// = prolonge depuis l'expiration actuelle (aucun jour perdu) ; racheté APRÈS
// expiration = repart de maintenant.
// #nouveau (campagne de lancement) : sourceWallet 'bonus' possible, même
// principe que payerEtActiver (annoncesService.js).
export const acheterVendeurPro = async (uid, sourceWallet = 'principal') => {
  const settings = await getSettings();
  const prix = settings.vendeurProPrix ?? 5000;
  const dureeJours = settings.vendeurProDureeJours ?? 30;
  const champSolde = sourceWallet === 'bonus' ? 'soldeBonus' : 'solde';
  const userRef = doc(db, 'users', uid);
  let nouvelleExpiry = null;
  await runTransaction(db, async tx => {
    const snap = await tx.get(userRef);
    if (!snap.exists()) throw new Error('COMPTE_INTROUVABLE');
    const data = snap.data();
    if (data.role && data.role !== 'client') throw new Error('ROLE_NON_ELIGIBLE');
    if (!data.cniVerifie) throw new Error('CNI_NON_VERIFIEE');
    const solde = data[champSolde] || 0;
    if (solde < prix) throw new Error('SOLDE_INSUFFISANT');
    const expiryActuelle = data.vendeurProExpiry?.toDate?.();
    const depart = expiryActuelle && expiryActuelle.getTime() > Date.now() ? expiryActuelle.getTime() : Date.now();
    nouvelleExpiry = new Date(depart + dureeJours * 24 * 60 * 60 * 1000);
    tx.update(userRef, {
      [champSolde]: increment(-prix),
      vendeurProExpiry: nouvelleExpiry
    });
    // #nouveau (demande utilisateur, "badge Vendeur Pro visible partout") :
    // AnnoncePage/ProductCard/VendeurPage lisent profils_publics, jamais
    // users/{uid} (privé) — sans ce mirror, le badge ne pourrait jamais
    // s'afficher publiquement. Corrélé exactement à l'écriture ci-dessus
    // (cf. firestore.rules, jamais une valeur libre).
    tx.set(doc(db, 'profils_publics', uid), { vendeurProExpiry: nouvelleExpiry }, { merge: true });
    tx.set(doc(collection(db, 'transactions')), {
      userId: uid,
      type: WALLET_TYPES.VENDEUR_PRO,
      montant: -prix,
      sourceWallet,
      description: `Pass Vendeur Pro (${dureeJours} jours)`,
      createdAt: serverTimestamp()
    });
  });
  return nouvelleExpiry;
};

// #nouveau (espace patient) : débite le solde pour régler une facture d'un
// établissement de santé. Aucune collection "factures" n'existe encore côté
// personnel (facturation = Phase 4 de la feuille de route SGIH) — cette
// fonction est prête à être appelée dès qu'un factureId réel existera.
export const payerFacture = async (patientId, etablissementId, factureId, montant) => {
  const patientRef = doc(db, 'users', patientId);
  await runTransaction(db, async tx => {
    const patientSnap = await tx.get(patientRef);
    const solde = patientSnap.data()?.solde || 0;
    if (montant > solde) throw new Error('SOLDE_INSUFFISANT');
    tx.update(patientRef, {
      solde: increment(-montant)
    });
    tx.set(doc(collection(db, 'transactions')), {
      userId: patientId,
      type: WALLET_TYPES.PAIEMENT_FACTURE,
      montant: -montant,
      sourceWallet: 'principal',
      etablissementId,
      factureId,
      description: 'Paiement de facture',
      createdAt: serverTimestamp()
    });
  });
};
