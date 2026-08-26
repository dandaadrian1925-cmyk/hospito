import { collection, updateDoc, setDoc, deleteDoc, doc, getDoc, getDocs, query, where, orderBy, serverTimestamp, onSnapshot, runTransaction, increment } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { WALLET_TYPES } from './walletService';
import { creerNotification } from './notificationsService';
import { getSettings, getTauxCommissionVendeur } from './settingsService';
export const STATUTS_COMMANDE = {
  PAIEMENT_CONFIRME: 'paiement_confirme',
  EN_ATTENTE_VENDEUR: 'en_attente_vendeur',
  PREPARATION: 'preparation',
  EN_ATTENTE_LIVREUR: 'en_attente_livreur',
  PRIX_PROPOSE: 'prix_propose',
  LIVREUR_ASSIGNE: 'livreur_assigne',
  EN_ROUTE_COLLECTE: 'en_route_collecte',
  DEPOSE_AGENCE: 'depose_agence',
  RECUPERE_AGENCE: 'recupere_agence',
  EN_ROUTE_LIVRAISON: 'en_route_livraison',
  RETRACTATION: 'retractation',
  TERMINE: 'termine',
  LITIGE: 'litige',
  ANNULE: 'annule'
};
export const STATUT_LABELS = {
  paiement_confirme: 'Paiement confirmé',
  en_attente_vendeur: 'En attente vendeur',
  preparation: 'Article prêt',
  en_attente_livreur: 'En attente d\'un livreur',
  prix_propose: 'Frais de livraison proposés',
  livreur_assigne: 'Livreur en préparation',
  en_route_collecte: 'Livreur en route (collecte)',
  depose_agence: 'Déposé à l\'agence',
  recupere_agence: 'Récupéré à l\'agence',
  en_route_livraison: 'Livreur en route (livraison)',
  retractation: 'Période de rétractation',
  termine: 'Terminé',
  litige: 'Litige ouvert',
  annule: 'Annulé'
};
const genererCodeRemise = () => String(Math.floor(1000 + Math.random() * 9000));
const compterAnnulationsRecentes = async (acheteurId, settings) => {
  const fenetreMs = (settings.fenetreAnnulationsJours ?? 30) * 24 * 60 * 60 * 1000;
  const debut = new Date(Date.now() - fenetreMs);
  const q = query(collection(db, 'commandes'), where('acheteurId', '==', acheteurId), where('statut', '==', STATUTS_COMMANDE.ANNULE), where('annulePar', '==', 'acheteur'));
  const snap = await getDocs(q);
  return snap.docs.filter(d => {
    const updatedAt = d.data().updatedAt;
    const date = updatedAt?.toDate ? updatedAt.toDate() : new Date(updatedAt);
    return date >= debut;
  }).length;
};
export const creerCommande = async (acheteurId, vendeurId, annonceId, data, sourceWallet = 'principal') => {
  const settings = await getSettings();
  const seuil = settings.seuilAnnulationsRestriction ?? 3;
  const nbAnnulations = await compterAnnulationsRecentes(acheteurId, settings);
  if (nbAnnulations >= seuil) throw new Error('COMPTE_RESTREINT_ANNULATIONS');
  const annonceRef = doc(db, 'annonces', annonceId);
  const acheteurRef = doc(db, 'users', acheteurId);
  const commandeRef = doc(collection(db, 'commandes'));
  const codeRemise = genererCodeRemise();
  await runTransaction(db, async tx => {
    const [annonceSnap, acheteurSnap] = await Promise.all([tx.get(annonceRef), tx.get(acheteurRef)]);
    if (!annonceSnap.exists()) throw new Error('ANNONCE_INTROUVABLE');
    const annonce = annonceSnap.data();
    if (annonce.statut !== 'en_vente' || annonce.masquee) throw new Error('ANNONCE_INDISPONIBLE');
    if (acheteurSnap.data()?.soldeSuspect) throw new Error('COMPTE_SUSPENDU_VERIFICATION');
    if (annonce.userId !== vendeurId) throw new Error('VENDEUR_INVALIDE');
    const offre = annonce.offreAcceptee;
    const montant = offre && offre.acheteurId === acheteurId ? offre.montant || 0 : annonce.prix || 0;
    const total = montant;
    const montantPreleve = total;
    const modeLivraisonAnnonce = annonce.modeLivraison || 'main_propre';
    const modesAutorises = modeLivraisonAnnonce === 'les_deux' ? ['main_propre', 'livraison'] : [modeLivraisonAnnonce === 'livreurs' ? 'livraison' : 'main_propre'];
    const modeRemise = modesAutorises.includes(data.modeRemise) ? data.modeRemise : modesAutorises[0];
    if (modeRemise === 'livraison' && !data.adresseLivraison?.ville) throw new Error('ADRESSE_LIVRAISON_MANQUANTE');
    let acheteurNomReel = null;
    let vendeurNomReel = null;
    if (modeRemise === 'livraison') {
      // CRITIQUE (trouvé en conditions réelles, corrigé) : lisait users/{vendeurId}
      // (profil PRIVÉ) — un acheteur normal n'a aucun droit de lecture dessus
      // (firestore.rules : users/{uid} réservé au propriétaire ou à un admin),
      // donc CHAQUE achat en mode livraison échouait en permission-denied.
      // profils_publics contient les mêmes champs (displayName/prenom/nom) et
      // est public en lecture — c'est exactement fait pour ce genre de besoin.
      const vendeurPublicSnap = await tx.get(doc(db, 'profils_publics', vendeurId));
      const acheteurData = acheteurSnap.data() || {};
      const vendeurData = vendeurPublicSnap.data() || {};
      acheteurNomReel = acheteurData.displayName || `${acheteurData.prenom || ''} ${acheteurData.nom || ''}`.trim() || null;
      vendeurNomReel = vendeurData.displayName || `${vendeurData.prenom || ''} ${vendeurData.nom || ''}`.trim() || null;
    }
    // #nouveau (refonte parrainage) : un achat peut être payé depuis le solde
    // principal OU le solde de parrainage (jamais un mélange des deux — pas de
    // répartition partielle en V1), au choix de l'acheteur.
    const soldeSource = sourceWallet === 'parrainage' ? acheteurSnap.data()?.soldeParrainage || 0 : acheteurSnap.data()?.solde || 0;
    if (montantPreleve > 0 && soldeSource < montantPreleve) throw new Error('SOLDE_INSUFFISANT');
    tx.update(annonceRef, {
      statut: 'vendu',
      commandeActiveId: commandeRef.id,
      updatedAt: serverTimestamp()
    });
    // #nouveau (refonte parrainage v2, plafond d'annonces) : nombreAnnoncesEnVente
    // du vendeur décrémenté DANS LA MÊME transaction que le flip en_vente ->
    // vendu (cf. firestore.rules, branche dédiée users/{uid} update, corrélée
    // à cette même commande fraîchement créée).
    tx.update(doc(db, 'users', vendeurId), {
      nombreAnnoncesEnVente: increment(-1),
      commandeId: commandeRef.id
    });
    if (montantPreleve > 0) {
      tx.update(acheteurRef, {
        ...(sourceWallet === 'parrainage' ? { soldeParrainage: increment(-montantPreleve) } : { solde: increment(-montantPreleve) }),
        totalAchats: increment(1)
      });
      tx.set(doc(collection(db, 'transactions')), {
        userId: acheteurId,
        type: WALLET_TYPES.ACHAT,
        montant: -montantPreleve,
        sourceWallet,
        annonceId,
        description: `Achat : ${data.titreAnnonce || 'annonce'}`,
        createdAt: serverTimestamp()
      });
    } else {
      tx.update(acheteurRef, {
        totalAchats: increment(1)
      });
    }
    tx.set(commandeRef, {
      acheteurId,
      vendeurId,
      annonceId,
      titreAnnonce: data.titreAnnonce || null,
      photoAnnonce: data.photoAnnonce || null,
      estLot: data.estLot || false,
      nombreArticlesLot: data.estLot ? data.nombreArticlesLot || 2 : null,
      // #nouveau (demande utilisateur, "améliorons la vente en lots") : copié
      // depuis l'annonce (jamais depuis `data`, potentiellement périmé côté
      // client) — figé à l'achat, comme prixAfficheAuMoment. firestore.rules
      // (commandes/{id} create) exige une correspondance EXACTE avec l'annonce.
      articlesLot: data.estLot ? annonce.articlesLot || [] : [],
      montant,
      total,
      montantPreleve,
      // #sécurité (corrigé, audit) : figé à l'achat, jamais réévalué — permet
      // au remboursement (annulerCommande/annulerSiVendeurExpire/
      // annulerSiLivraisonExpire) de créditer EXACTEMENT ce wallet plus tard,
      // jamais toujours solde (firestore.rules, refundChampsCorrects).
      sourceWalletAchat: sourceWallet,
      categorie: annonce.categorie || null,
      prixAfficheAuMoment: annonce.prix ?? null,
      offreAccepteeAuMoment: offre && offre.acheteurId === acheteurId ? {
        acheteurId: offre.acheteurId,
        montant: offre.montant
      } : null,
      // #nouveau (campagne de lancement) : figé à l'achat comme le reste —
      // jamais réévalué à la finalisation (l'annonce a pu changer entretemps).
      commissionOffertePourLancement: annonce.commissionOffertePourLancement === true,
      adressePickup: {
        ville: annonce.ville || null,
        quartier: annonce.quartier || null
      },
      modeRemise,
      adresseLivraison: modeRemise === 'livraison' ? {
        ville: data.adresseLivraison.ville,
        quartier: data.adresseLivraison.quartier || null
      } : null,
      interVilles: modeRemise === 'livraison' ? (annonce.ville || null) !== (data.adresseLivraison.ville || null) : null,
      statut: STATUTS_COMMANDE.PAIEMENT_CONFIRME,
      historiqueStatuts: [{
        statut: STATUTS_COMMANDE.PAIEMENT_CONFIRME,
        date: new Date().toISOString()
      }],
      escrowActif: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    tx.set(doc(db, 'commandes', commandeRef.id, 'prive', 'remise'), {
      code: codeRemise,
      createdAt: serverTimestamp()
    });
    if (modeRemise === 'livraison') {
      tx.set(doc(db, 'commandes', commandeRef.id, 'prive', 'identites'), {
        acheteurNomReel,
        vendeurNomReel,
        createdAt: serverTimestamp()
      });
    }
  });
  await creerNotification({
    userId: vendeurId,
    type: 'commande',
    titre: 'Nouvelle commande reçue',
    message: `Votre annonce "${data.titreAnnonce || ''}" vient d'être achetée.`,
    link: `/commande/${commandeRef.id}`
  });
  await creerNotification({
    userId: acheteurId,
    type: 'commande',
    titre: 'Commande confirmée',
    message: `Votre paiement pour "${data.titreAnnonce || ''}" est confirmé et sécurisé.`,
    link: `/commande/${commandeRef.id}`
  });
  return commandeRef.id;
};
export const mettreAjourStatut = async (commandeId, newStatut) => {
  const ref = doc(db, 'commandes', commandeId);
  const snap = await getDoc(ref);
  const data = snap.data();
  const historique = data.historiqueStatuts || [];
  historique.push({
    statut: newStatut,
    date: new Date().toISOString()
  });
  await updateDoc(ref, {
    statut: newStatut,
    historiqueStatuts: historique,
    updatedAt: serverTimestamp()
  });
};
export const confirmerPreparation = async commandeId => {
  const snap = await getDoc(doc(db, 'commandes', commandeId));
  if (!snap.exists()) throw new Error('COMMANDE_INTROUVABLE');
  const commande = snap.data();
  if (commande.statut !== STATUTS_COMMANDE.PAIEMENT_CONFIRME) throw new Error('STATUT_INVALIDE');
  await mettreAjourStatut(commandeId, STATUTS_COMMANDE.EN_ATTENTE_VENDEUR);
  if (commande.acheteurId) {
    await creerNotification({
      userId: commande.acheteurId,
      type: 'commande',
      titre: 'Commande confirmée par le vendeur',
      message: `Le vendeur a confirmé "${commande.titreAnnonce || 'votre commande'}". Organisez la remise en main propre via le chat.`,
      link: `/commande/${commandeId}`
    });
  }
};
export const marquerArticlePret = async commandeId => {
  const ref = doc(db, 'commandes', commandeId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('COMMANDE_INTROUVABLE');
  const commande = snap.data();
  const dejaEnAttenteLivreur = commande.statut === STATUTS_COMMANDE.EN_ATTENTE_LIVREUR;
  if (commande.statut !== STATUTS_COMMANDE.EN_ATTENTE_VENDEUR && commande.statut !== STATUTS_COMMANDE.PREPARATION && !dejaEnAttenteLivreur) {
    throw new Error('STATUT_INVALIDE');
  }
  if (dejaEnAttenteLivreur || commande.statut === STATUTS_COMMANDE.PREPARATION && commande.modeRemise !== 'livraison') {
    return;
  }
  if (commande.statut === STATUTS_COMMANDE.EN_ATTENTE_VENDEUR) {
    await mettreAjourStatut(commandeId, STATUTS_COMMANDE.PREPARATION);
  }
  if (commande.modeRemise === 'livraison') {
    const codeSnap = await getDoc(doc(db, 'commandes', commandeId, 'prive', 'collecte'));
    if (!codeSnap.exists()) {
      await setDoc(doc(db, 'commandes', commandeId, 'prive', 'collecte'), {
        code: genererCodeRemise(),
        createdAt: serverTimestamp()
      });
    }
    await mettreAjourStatut(commandeId, STATUTS_COMMANDE.EN_ATTENTE_LIVREUR);
  }
  if (commande.acheteurId) {
    await creerNotification({
      userId: commande.acheteurId,
      type: 'commande',
      titre: 'Article prêt',
      message: commande.modeRemise === 'livraison' ? `"${commande.titreAnnonce || 'Votre article'}" est prêt — en attente qu'un livreur se propose.` : `"${commande.titreAnnonce || 'Votre article'}" est prêt — convenez d'un lieu et d'une heure de remise avec le vendeur.`,
      link: `/commande/${commandeId}`
    });
  }
};
export const confirmerRemiseParCode = async (commandeId, codeSaisi) => {
  const ref = doc(db, 'commandes', commandeId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('COMMANDE_INTROUVABLE');
  const commande = snap.data();
  if (![STATUTS_COMMANDE.EN_ATTENTE_VENDEUR, STATUTS_COMMANDE.PREPARATION].includes(commande.statut)) {
    throw new Error('STATUT_INVALIDE');
  }
  if ((commande.tentativesCode || 0) >= 8) throw new Error('TROP_TENTATIVES');
  await updateDoc(ref, {
    tentativesCode: increment(1)
  });
  const historique = commande.historiqueStatuts || [];
  historique.push({
    statut: STATUTS_COMMANDE.RETRACTATION,
    date: new Date().toISOString()
  });
  try {
    await updateDoc(ref, {
      statut: STATUTS_COMMANDE.RETRACTATION,
      historiqueStatuts: historique,
      codeSoumis: (codeSaisi || '').trim(),
      retractationAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch {
    throw new Error('CODE_INVALIDE');
  }
  if (commande.acheteurId) {
    await creerNotification({
      userId: commande.acheteurId,
      type: 'commande',
      titre: 'Remise confirmée',
      message: `Le vendeur a confirmé la remise de "${commande.titreAnnonce || 'votre article'}". Vous avez 24h pour signaler un problème.`,
      link: `/commande/${commandeId}`
    });
  }
};
// #nouveau (audit "qu'est-ce qui manque dans les paramètres métiers") :
// était figé à 24h — maintenant settings.retractationHeures (défaut 24 si
// jamais configuré), en miroir du VRAI délai serveur (firestore.rules,
// commandes/{id}, retractation -> termine).
export const isRetractationExpiree = (commande, retractationHeures = 24) => {
  if (!commande || commande.statut !== STATUTS_COMMANDE.RETRACTATION) return false;
  const entry = (commande.historiqueStatuts || []).find(h => h.statut === STATUTS_COMMANDE.RETRACTATION);
  if (!entry) return false;
  return Date.now() - new Date(entry.date).getTime() > retractationHeures * 60 * 60 * 1000;
};
export const finaliserCommandeSiExpiree = async (commandeId, commandeHint) => {
  const settings = await getSettings();
  const retractationHeures = settings.retractationHeures ?? 24;
  if (!isRetractationExpiree(commandeHint, retractationHeures)) return false;
  const ref = doc(db, 'commandes', commandeId);
  let aNotifier = null;
  await runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const commande = snap.data();
    if (!isRetractationExpiree(commande, retractationHeures)) return;
    const vendeurRef = doc(db, 'users', commande.vendeurId);
    // CRITIQUE (trouvé en conditions réelles, corrigé) : cette finalisation se
    // déclenche "paresseusement" au chargement de CommandePage — par l'acheteur
    // OU le vendeur, selon qui consulte la commande en premier après le délai.
    // users/{uid} est privé (firestore.rules : propriétaire ou admin
    // uniquement) — quand c'est l'ACHETEUR qui déclenche, cette lecture était
    // refusée (permission-denied), et la commande restait bloquée en
    // "retractation" indéfiniment si le vendeur ne revisitait jamais sa page
    // (vendeur jamais payé). Lit son propre profil privé si c'est bien le
    // vendeur qui déclenche (cas normal), sinon se rabat sur profils_publics
    // (public en lecture) — totalVentes y est disponible, seul parainId
    // (réduction de commission parrainage) peut manquer dans ce cas précis,
    // dégradation mineure largement préférable à un blocage total.
    const vendeurSnap = auth.currentUser?.uid === commande.vendeurId
      ? await tx.get(vendeurRef)
      : await tx.get(doc(db, 'profils_publics', commande.vendeurId));
    const vendeurData = vendeurSnap.data();
    // #nouveau (refonte parrainage v2) : lu AVANT toute écriture (contrainte
    // Firestore : toutes les lectures d'une transaction précèdent ses écritures).
    // parainId peut manquer si le déclencheur est l'acheteur (vendeurData vient
    // alors de profils_publics, pas du profil privé complet) — dégradation
    // mineure déjà assumée pour getTauxCommissionVendeur juste au-dessus, même
    // logique ici : le crédit parrain est alors simplement sauté cette fois-ci.
    // #bug CRITIQUE (corrigé, "litige en faveur du vendeur toujours en
    // échec" — même incident ici, chemin bien plus fréquent) : totalVentesAvant
    // vient DÉJÀ de vendeurData, lu AVANT de décider de lire le parrain — un
    // parrain déjà au max de son quota de ventes récompensées ne doit JAMAIS
    // être lu s'il ne sera pas écrit ensuite, sinon Firestore ajoute une
    // contrainte "verify" sur son document dans la transaction, qui fait
    // échouer toute la finalisation de vente en permission-denied.
    const parrainId = vendeurData?.parainId || null;
    const totalVentesAvant = vendeurData?.totalVentes || 0;
    const nombreVentesRecompensees = settings.nombreVentesRecompensees ?? 3;
    const parrainEligible = !!parrainId && totalVentesAvant < nombreVentesRecompensees;
    const parrainSnap = parrainEligible ? await tx.get(doc(db, 'users', parrainId)) : null;
    const historique = commande.historiqueStatuts || [];
    historique.push({
      statut: STATUTS_COMMANDE.TERMINE,
      date: new Date().toISOString()
    });
    const montant = commande.montant ?? 0;
    // #nouveau (campagne de lancement) : commission forcée à 0 pour les
    // commandes figées "sans commission" à l'achat — jamais recalculée
    // dynamiquement (le taux normal pourrait avoir changé entretemps).
    const taux = commande.commissionOffertePourLancement === true ? 0 : getTauxCommissionVendeur(settings, commande.categorie, vendeurData);
    const commission = Math.round(montant * taux);
    const net = montant - commission;
    tx.update(ref, {
      statut: STATUTS_COMMANDE.TERMINE,
      historiqueStatuts: historique,
      updatedAt: serverTimestamp(),
      venteCreditee: true,
      livraisonCreditee: true,
      // #nouveau (refonte parrainage v2) : lu par la branche de crédit parrain
      // (users/{uid} update) via getAfter() — jamais fait confiance à une
      // valeur fournie par le bénéficiaire du crédit lui-même.
      commissionMaket: commission
    });
    tx.update(vendeurRef, {
      solde: increment(net),
      totalVentes: increment(1),
      commandeId
    });
    tx.set(doc(collection(db, 'transactions')), {
      userId: commande.vendeurId,
      type: WALLET_TYPES.VENTE,
      montant: net,
      sourceWallet: 'principal',
      commandeId,
      commissionMaket: commission,
      description: `Crédit vente commande #${commandeId.slice(0, 8).toUpperCase()} (commission MAKET ${Math.round(taux * 1000) / 10}% déduite : ${commission.toLocaleString('fr-FR')} XAF)`,
      createdAt: serverTimestamp()
    });
    tx.set(doc(db, 'profils_publics', commande.vendeurId), {
      totalVentes: increment(1),
      commandeId
    }, {
      merge: true
    });
    // #nouveau (refonte parrainage v2) : le parrain touche
    // pourcentageCommissionParrain% de la commission MAKET sur chacune des
    // nombreVentesRecompensees premières VRAIES ventes de son filleul — et, à la
    // toute première (totalVentes AVANT cette transaction == 0), un bonus
    // unique et permanent sur son plafond d'annonces en vente (jamais répété).
    if (parrainSnap?.exists()) {
        const partParrain = Math.round(commission * (settings.pourcentageCommissionParrain ?? 100) / 100);
        const premiereVente = totalVentesAvant === 0;
        // #bug CRITIQUE (corrigé, même incident que litigesService.js/maket-admin,
        // trouvé via le payload réseau complet) : increment() sur
        // limiteAnnoncesVente pour un parrain qui ne l'a JAMAIS eu (premier
        // bonus) part de 0 côté Firestore, alors que la règle attend
        // (valeur actuelle OU limiteAnnoncesVenteBase par défaut) + bonus —
        // rejeté dès que ce champ est absent. Valeur absolue désormais.
        const limiteActuelle = parrainSnap.data()?.limiteAnnoncesVente ?? settings.limiteAnnoncesVenteBase ?? 10;
        tx.update(doc(db, 'users', parrainId), {
          soldeParrainage: increment(partParrain),
          commandeId,
          ...(premiereVente ? { limiteAnnoncesVente: limiteActuelle + (settings.limiteAnnoncesParFilleulQualifie ?? 2) } : {})
        });
        tx.set(doc(collection(db, 'transactions')), {
          userId: parrainId,
          type: WALLET_TYPES.CREDIT_PARRAINAGE,
          montant: partParrain,
          sourceWallet: 'parrainage',
          commandeId,
          description: `Commission parrainage — vente de votre filleul, commande #${commandeId.slice(0, 8).toUpperCase()}`,
          createdAt: serverTimestamp()
        });
    }
    const livreursCredites = [];
    if (commande.modeRemise === 'livraison' && commande.livreurCollecteId) {
      const tauxLivraison = (settings.commissionLivraisonPercent ?? 0) / 100;
      const crediterLivreur = (livreurId, frais) => {
        if (!livreurId || !frais) return;
        const commissionL = Math.round(frais * tauxLivraison);
        const netL = frais - commissionL;
        tx.update(doc(db, 'users', livreurId), {
          solde: increment(netL),
          commandeId
        });
        tx.set(doc(collection(db, 'transactions')), {
          userId: livreurId,
          type: WALLET_TYPES.LIVRAISON,
          montant: netL,
          sourceWallet: 'principal',
          commandeId,
          commissionMaket: commissionL,
          description: `Crédit livraison commande #${commandeId.slice(0, 8).toUpperCase()} (commission MAKET ${settings.commissionLivraisonPercent ?? 0}% déduite : ${commissionL.toLocaleString('fr-FR')} XAF)`,
          createdAt: serverTimestamp()
        });
        livreursCredites.push({
          livreurId,
          net: netL
        });
      };
      const secondLivreurDistinct = commande.interVilles && commande.livreurLivraisonId && commande.livreurLivraisonId !== commande.livreurCollecteId;
      crediterLivreur(commande.livreurCollecteId, commande.fraisLivraison);
      if (secondLivreurDistinct) crediterLivreur(commande.livreurLivraisonId, commande.fraisLivraisonInterVilles);
    }
    aNotifier = {
      vendeurId: commande.vendeurId,
      net,
      titreAnnonce: commande.titreAnnonce,
      livreursCredites
    };
  });
  if (!aNotifier) return false;
  await creerNotification({
    userId: aNotifier.vendeurId,
    type: 'commande',
    titre: 'Vente finalisée',
    message: `Le paiement de "${aNotifier.titreAnnonce || ''}" a été libéré : ${aNotifier.net.toLocaleString('fr-FR')} XAF crédités sur votre solde.`,
    link: `/commande/${commandeId}`
  });
  for (const {
    livreurId,
    net: netL
  } of aNotifier.livreursCredites) {
    await creerNotification({
      userId: livreurId,
      type: 'commande',
      titre: 'Livraison payée',
      message: `Votre course pour "${aNotifier.titreAnnonce || ''}" est terminée : ${netL.toLocaleString('fr-FR')} XAF crédités sur votre solde.`,
      link: `/commande/${commandeId}`
    });
  }
  return true;
};
// #bug (corrigé, "3e trou d'automatisation trouvé par audit") : ne couvrait
// que PAIEMENT_CONFIRME (confirmerPreparation) — une fois le vendeur passé à
// EN_ATTENTE_VENDEUR (marquerArticlePret pas encore appelé), rien ne
// revisitait plus jamais cette commande côté client (le cron scheduled-tasks,
// corrigé en même temps, la rattrape désormais sous 15 min dans tous les cas
// — ce déclencheur "paresseux" reste juste un confort d'affichage immédiat).
export const annulerSiVendeurExpire = async (commandeId, commandeHint) => {
  const settings = await getSettings();
  const DELAIS_MS = {
    [STATUTS_COMMANDE.PAIEMENT_CONFIRME]: (settings.delaiConfirmationVendeurHeures ?? 24) * 60 * 60 * 1000,
    [STATUTS_COMMANDE.EN_ATTENTE_VENDEUR]: (settings.delaiEnAttenteVendeurHeures ?? 24) * 60 * 60 * 1000
  };
  const STATUTS_CONCERNES = [STATUTS_COMMANDE.PAIEMENT_CONFIRME, STATUTS_COMMANDE.EN_ATTENTE_VENDEUR];
  if (!commandeHint || !STATUTS_CONCERNES.includes(commandeHint.statut)) return false;
  const entry = (commandeHint.historiqueStatuts || []).find(h => h.statut === commandeHint.statut);
  if (!entry || Date.now() - new Date(entry.date).getTime() <= DELAIS_MS[commandeHint.statut]) return false;
  const ref = doc(db, 'commandes', commandeId);
  let commandeData = null;
  await runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const commande = snap.data();
    if (!STATUTS_CONCERNES.includes(commande.statut)) return;
    const entryFraiche = (commande.historiqueStatuts || []).find(h => h.statut === commande.statut);
    if (!entryFraiche || Date.now() - new Date(entryFraiche.date).getTime() <= DELAIS_MS[commande.statut]) return;
    commandeData = commande;
    const historique = commande.historiqueStatuts || [];
    historique.push({
      statut: STATUTS_COMMANDE.ANNULE,
      date: new Date().toISOString()
    });
    tx.update(ref, {
      statut: STATUTS_COMMANDE.ANNULE,
      annulePar: 'vendeur_expire',
      fraisAnnulationRetenus: 0,
      historiqueStatuts: historique,
      updatedAt: serverTimestamp(),
      rembourseCredite: true
    });
    if (commande.annonceId) {
      tx.update(doc(db, 'annonces', commande.annonceId), {
        statut: 'en_vente',
        updatedAt: serverTimestamp()
      });
    }
    // #nouveau (refonte parrainage v2, plafond d'annonces) : nombreAnnoncesEnVente
    // du vendeur réincrémenté DANS LA MÊME transaction que le retour vendu ->
    // en_vente (cf. firestore.rules, branche dédiée users/{uid} update).
    if (commande.vendeurId) {
      tx.update(doc(db, 'users', commande.vendeurId), {
        nombreAnnoncesEnVente: increment(1),
        commandeId
      });
    }
    if (commande.montantPreleve > 0 && commande.acheteurId) {
      // #sécurité (corrigé, audit) : crédite sourceWalletAchat, jamais
      // toujours solde — mêmes raisons qu'annulerCommande ci-dessus.
      const champWallet = code => code === 'parrainage' ? 'soldeParrainage' : (code === 'bonus' ? 'soldeBonus' : 'solde');
      tx.update(doc(db, 'users', commande.acheteurId), {
        [champWallet(commande.sourceWalletAchat || 'principal')]: increment(commande.montantPreleve),
        commandeId
      });
      tx.set(doc(collection(db, 'transactions')), {
        userId: commande.acheteurId,
        type: WALLET_TYPES.REMBOURSEMENT,
        montant: commande.montantPreleve,
        sourceWallet: commande.sourceWalletAchat || 'principal',
        commandeId,
        description: `Remboursement automatique — le vendeur n'a pas confirmé la commande #${commandeId.slice(0, 8).toUpperCase()}`,
        createdAt: serverTimestamp()
      });
    }
  });
  if (!commandeData) return false;
  // #dysfonctionnement (audit, corrigé) : seul l'acheteur était notifié — le
  // vendeur qui a laissé expirer le délai n'apprenait jamais que sa vente
  // avait été annulée et l'annonce repassée en_vente, contrairement à
  // annulerSiLivraisonExpire (juste en dessous) qui notifie déjà toutes les
  // parties concernées.
  const aPrevenir = new Set([commandeData.acheteurId, commandeData.vendeurId].filter(Boolean));
  for (const uid of aPrevenir) {
    await creerNotification({
      userId: uid,
      type: 'commande',
      titre: 'Commande annulée automatiquement',
      message: uid === commandeData.acheteurId
        ? `Le vendeur n'a pas répondu à temps pour "${commandeData.titreAnnonce || 'votre commande'}" — remboursement intégral effectué.`
        : `Vous n'avez pas confirmé "${commandeData.titreAnnonce || 'la commande'}" à temps — elle a été annulée et l'annonce remise en vente.`,
      link: `/commande/${commandeId}`
    });
  }
  return true;
};
// #nouveau (demande utilisateur, "délai configurable pour chaque étape") :
// en_attente_livreur et prix_propose avaient un seul délai partagé
// (delaiLivraisonSansReponseHeures) — désormais réglables indépendamment
// (pas de contrepartie côté firestore.rules : ce délai n'annule qu'au
// bénéfice du vendeur/acheteur eux-mêmes, jamais un enjeu de sécurité).
export const annulerSiLivraisonExpire = async (commandeId, commandeHint) => {
  const settings = await getSettings();
  const repli = (settings.delaiLivraisonSansReponseHeures ?? 48) * 60 * 60 * 1000;
  const DELAIS_MS = {
    [STATUTS_COMMANDE.EN_ATTENTE_LIVREUR]: settings.delaiEnAttenteLivreurHeures ? settings.delaiEnAttenteLivreurHeures * 60 * 60 * 1000 : repli,
    [STATUTS_COMMANDE.PRIX_PROPOSE]: settings.delaiPrixProposeHeures ? settings.delaiPrixProposeHeures * 60 * 60 * 1000 : repli
  };
  const STATUTS_CONCERNES = [STATUTS_COMMANDE.EN_ATTENTE_LIVREUR, STATUTS_COMMANDE.PRIX_PROPOSE];
  if (!commandeHint || !STATUTS_CONCERNES.includes(commandeHint.statut)) return false;
  const entry = (commandeHint.historiqueStatuts || []).find(h => h.statut === commandeHint.statut);
  if (!entry || Date.now() - new Date(entry.date).getTime() <= DELAIS_MS[commandeHint.statut]) return false;
  const ref = doc(db, 'commandes', commandeId);
  let commandeData = null;
  await runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const commande = snap.data();
    if (!STATUTS_CONCERNES.includes(commande.statut)) return;
    const entryFraiche = (commande.historiqueStatuts || []).find(h => h.statut === commande.statut);
    if (!entryFraiche || Date.now() - new Date(entryFraiche.date).getTime() <= DELAIS_MS[commande.statut]) return;
    commandeData = commande;
    const historique = commande.historiqueStatuts || [];
    historique.push({
      statut: STATUTS_COMMANDE.ANNULE,
      date: new Date().toISOString()
    });
    tx.update(ref, {
      statut: STATUTS_COMMANDE.ANNULE,
      annulePar: 'livraison_expiree',
      fraisAnnulationRetenus: 0,
      historiqueStatuts: historique,
      updatedAt: serverTimestamp(),
      rembourseCredite: true
    });
    if (commande.annonceId) {
      tx.update(doc(db, 'annonces', commande.annonceId), {
        statut: 'en_vente',
        updatedAt: serverTimestamp()
      });
    }
    // #nouveau (refonte parrainage v2, plafond d'annonces) : nombreAnnoncesEnVente
    // du vendeur réincrémenté DANS LA MÊME transaction que le retour vendu ->
    // en_vente (cf. firestore.rules, branche dédiée users/{uid} update).
    if (commande.vendeurId) {
      tx.update(doc(db, 'users', commande.vendeurId), {
        nombreAnnoncesEnVente: increment(1),
        commandeId
      });
    }
    if (commande.montantPreleve > 0 && commande.acheteurId) {
      // #sécurité (corrigé, audit) : crédite sourceWalletAchat, jamais
      // toujours solde — mêmes raisons qu'annulerCommande plus haut.
      const champWallet = code => code === 'parrainage' ? 'soldeParrainage' : (code === 'bonus' ? 'soldeBonus' : 'solde');
      tx.update(doc(db, 'users', commande.acheteurId), {
        [champWallet(commande.sourceWalletAchat || 'principal')]: increment(commande.montantPreleve),
        commandeId
      });
      tx.set(doc(collection(db, 'transactions')), {
        userId: commande.acheteurId,
        type: WALLET_TYPES.REMBOURSEMENT,
        montant: commande.montantPreleve,
        sourceWallet: commande.sourceWalletAchat || 'principal',
        commandeId,
        description: `Remboursement automatique — aucun accord de livraison trouvé sous 48h #${commandeId.slice(0, 8).toUpperCase()}`,
        createdAt: serverTimestamp()
      });
    }
  });
  if (!commandeData) return false;
  const aPrevenir = new Set([commandeData.acheteurId, commandeData.vendeurId, commandeData.livreurCollecteId, commandeData.livreurLivraisonId].filter(Boolean));
  for (const uid of aPrevenir) {
    await creerNotification({
      userId: uid,
      type: 'commande',
      titre: 'Commande annulée automatiquement',
      message: `La commande #${commandeId.slice(0, 8).toUpperCase()} a été annulée : aucun accord de livraison trouvé sous 48h.`,
      link: `/commande/${commandeId}`
    });
  }
  return true;
};
export const getCommandesAcheteur = async acheteurId => {
  const q = query(collection(db, 'commandes'), where('acheteurId', '==', acheteurId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));
};
export const getCommandesVendeur = async vendeurId => {
  const q = query(collection(db, 'commandes'), where('vendeurId', '==', vendeurId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));
};
// #nouveau (demande utilisateur, "gratuite pour l'acheteur comme pour le
// vendeur mais ça joue quand même sur le score de fiabilité") : plus aucun
// frais retenu, quel que soit le statut ou qui annule — remplacé par un
// impact réputationnel (annulationsCommande, cf. annulerCommande ci-dessous
// et scoreFiabiliteService.js), jamais monétaire. L'annulation reste de toute
// façon strictement impossible une fois le livreur parti chercher l'article
// (cf. ANNULATION_AUTORISEE plus bas, inchangé) — au-delà, seul un litige
// peut trancher.
export const calculerRemboursementAnnulation = (montantPreleve) => ({
  remboursement: montantPreleve || 0,
  fraisRetenus: 0
});
// #nouveau (demande utilisateur) : l'acheteur refuse un prix de livraison
// proposé SANS annuler toute la commande — jusqu'ici, son seul recours
// ("Refuser") ouvrait l'annulation complète (fraisAnnulationPreparation
// retenus), alors qu'aucun montant n'a jamais été débité pour cette
// livraison à ce stade (le paiement n'intervient qu'à 'livreur_assigne',
// via payerFraisLivraison). Remet juste la commande en attente d'un
// nouveau livreur, gratuitement, sans toucher à l'achat de l'article.
// #nouveau (demande utilisateur, 2e passe) : deux garde-fous en plus, tous
// deux vérifiés par firestore.rules (jamais seulement ici) — sans eux, un
// acheteur pouvait refuser indéfiniment (la commande ne se bloquait jamais)
// et un livreur déjà refusé pouvait reproposer aussitôt le même prix.
// #nouveau (demande utilisateur, "négocier les frais de livraison") : contre-
// offre de l'acheteur, seulement à SON tour (negociationProposePar absent ou
// 'livreur', jamais 'acheteur' — un tour de retard signifie que sa propre
// contre-offre précédente est encore en attente du livreur) et sous 2 tours
// déjà utilisés. Non-inter-villes uniquement (même limite que la règle) —
// deux livreurs indépendants sur un prix combiné, pas de répartition évidente.
export const contrePropositionAcheteur = async (commandeId, acheteurId, montant) => {
  if (!(montant > 0)) throw new Error('MONTANT_INVALIDE');
  const ref = doc(db, 'commandes', commandeId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('COMMANDE_INTROUVABLE');
  const commande = snap.data();
  if (commande.acheteurId !== acheteurId) throw new Error('COMMANDE_INVALIDE');
  if (commande.statut !== 'prix_propose' || commande.interVilles) throw new Error('STATUT_INVALIDE');
  if ((commande.negociationProposePar || 'livreur') !== 'livreur') throw new Error('PAS_VOTRE_TOUR');
  const settings = await getSettings();
  if ((commande.negociationTour || 0) >= (settings.negociationFraisLivraisonMaxTours ?? 2)) throw new Error('LIMITE_NEGOCIATION_ATTEINTE');
  if (montant > (settings.fraisLivraisonMax ?? 50000)) throw new Error('MONTANT_TROP_ELEVE');
  await updateDoc(ref, {
    fraisLivraison: montant,
    negociationTour: (commande.negociationTour || 0) + 1,
    negociationProposePar: 'acheteur',
    updatedAt: serverTimestamp()
  });
};
export const refuserPrixLivraison = async (commandeId, acheteurId) => {
  const ref = doc(db, 'commandes', commandeId);
  const settings = await getSettings();
  const maxRefus = settings.maxRefusLivraisonAvantAnnulation ?? 3;
  let commandeData = null;
  await runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('COMMANDE_INTROUVABLE');
    const commande = snap.data();
    if (commande.acheteurId !== acheteurId) throw new Error('COMMANDE_INVALIDE');
    if (commande.statut !== 'prix_propose') throw new Error('STATUT_INVALIDE');
    const nbRefusActuel = commande.nbRefusLivraison || 0;
    if (nbRefusActuel >= maxRefus) throw new Error('LIMITE_REFUS_ATTEINTE');
    commandeData = commande;
    const historique = commande.historiqueStatuts || [];
    historique.push({ statut: 'en_attente_livreur', date: new Date().toISOString() });
    const refuses = new Set(commande.livreursRefuses || []);
    [commande.livreurCollecteId, commande.livreurLivraisonId].filter(Boolean).forEach(id => refuses.add(id));
    tx.update(ref, {
      statut: 'en_attente_livreur',
      livreurCollecteId: null,
      livreurLivraisonId: null,
      fraisLivraison: null,
      fraisLivraisonInterVilles: null,
      nbRefusLivraison: nbRefusActuel + 1,
      livreursRefuses: [...refuses],
      historiqueStatuts: historique,
      updatedAt: serverTimestamp()
    });
  });
  // Prévenir le(s) livreur(s) évincé(s) — sans ça, ils ne l'apprennent qu'en
  // revenant vérifier la commande de leur côté.
  const aPrevenir = new Set([commandeData?.livreurCollecteId, commandeData?.livreurLivraisonId].filter(Boolean));
  for (const livreurId of aPrevenir) {
    await creerNotification({
      userId: livreurId,
      type: 'commande',
      titre: 'Proposition de livraison refusée',
      message: `L'acheteur n'a pas accepté votre prix pour "${commandeData?.titreAnnonce || 'cette commande'}" — elle est de nouveau disponible pour un autre livreur.`,
      link: '/opportunites'
    });
  }
};
export const annulerCommande = async (commandeId, currentUserId) => {
  const ref = doc(db, 'commandes', commandeId);
  let commandeData = null;
  let remboursementInfo = null;
  let parQui = null;
  await runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('COMMANDE_INTROUVABLE');
    const commande = snap.data();
    // CRITIQUE (variant analysis, corrigé) : `parQui` était auparavant fourni
    // tel quel par l'appelant (déduit côté UI d'une comparaison locale) — un
    // appel SDK direct pouvait annoncer "vendeur" en étant en réalité
    // l'acheteur, faisant croire à calculerRemboursementAnnulation qu'aucun
    // frais ne s'applique (seul "acheteur" déclenche une retenue). Déterminé
    // ici depuis l'identité réelle de l'appelant relue DANS la transaction,
    // jamais depuis un paramètre libre — même principe que ouvrirLitige.
    if (commande.acheteurId === currentUserId) parQui = 'acheteur';
    else if (commande.vendeurId === currentUserId) parQui = 'vendeur';
    else throw new Error('COMMANDE_AUTRUI');
    const ANNULATION_AUTORISEE = [STATUTS_COMMANDE.PAIEMENT_CONFIRME, STATUTS_COMMANDE.EN_ATTENTE_VENDEUR, STATUTS_COMMANDE.PREPARATION, STATUTS_COMMANDE.EN_ATTENTE_LIVREUR, STATUTS_COMMANDE.PRIX_PROPOSE, STATUTS_COMMANDE.LIVREUR_ASSIGNE];
    if (!ANNULATION_AUTORISEE.includes(commande.statut)) {
      throw new Error('COMMANDE_DEJA_FINALISEE');
    }
    commandeData = commande;
    remboursementInfo = calculerRemboursementAnnulation(commande.montantPreleve);
    const {
      remboursement,
      fraisRetenus
    } = remboursementInfo;
    tx.update(ref, {
      statut: STATUTS_COMMANDE.ANNULE,
      annulePar: parQui,
      fraisAnnulationRetenus: fraisRetenus,
      updatedAt: serverTimestamp(),
      rembourseCredite: true
    });
    if (commande.annonceId) {
      tx.update(doc(db, 'annonces', commande.annonceId), {
        statut: 'en_vente',
        updatedAt: serverTimestamp()
      });
    }
    // #bug (corrigé, "annuler une commande renvoie 'erreur survenue'") :
    // annulationsCommande était écrit via un tx.update() SÉPARÉ sur
    // users/{currentUserId} — quand le vendeur annule, ce même document
    // reçoit AUSSI le tx.update() nombreAnnoncesEnVente juste en dessous ;
    // quand l'acheteur annule, ce même document reçoit AUSSI le tx.update()
    // solde plus bas. Deux tx.update() sur LE MÊME docRef dans UNE SEULE
    // transaction se sont avérés en conflit — fusionnés en un seul appel par
    // document désormais, jamais deux.
    // #nouveau (refonte parrainage v2, plafond d'annonces) : nombreAnnoncesEnVente
    // du vendeur réincrémenté DANS LA MÊME transaction que le retour vendu ->
    // en_vente (cf. firestore.rules, branche dédiée users/{uid} update).
    if (commande.vendeurId) {
      tx.update(doc(db, 'users', commande.vendeurId), {
        nombreAnnoncesEnVente: increment(1),
        // #nouveau (demande utilisateur, "gratuite mais ça joue quand même
        // sur le score de fiabilité") : compteur sur le profil de celui qui
        // annule (jamais l'autre partie) — même poids qu'un avertissement de
        // chat (cf. scoreFiabiliteService.js). Fusionné ici quand c'est le
        // vendeur qui annule (même document que nombreAnnoncesEnVente
        // ci-dessus) ; sinon écrit avec le solde acheteur plus bas.
        ...(parQui === 'vendeur' ? { annulationsCommande: increment(1) } : {}),
        commandeId
      });
    }
    const fraisLivraisonPayes = commande.statut === STATUTS_COMMANDE.LIVREUR_ASSIGNE ? (commande.fraisLivraison || 0) + (commande.interVilles ? commande.fraisLivraisonInterVilles || 0 : 0) : 0;
    // #sécurité (corrigé, audit) : crédite le wallet RÉELLEMENT débité à
    // l'achat/au paiement des frais (sourceWalletAchat/sourceWalletLivraison,
    // figés à leur débit respectif), jamais toujours solde — sinon un
    // paiement en soldeBonus (jamais retirable) remboursé en solde le
    // blanchit en argent retirable (firestore.rules, refundChampsCorrects).
    const champWallet = code => code === 'parrainage' ? 'soldeParrainage' : (code === 'bonus' ? 'soldeBonus' : 'solde');
    const champArticle = champWallet(commande.sourceWalletAchat || 'principal');
    const champLivraison = champWallet(commande.sourceWalletLivraison || 'principal');
    if (remboursement > 0 && commande.acheteurId) {
      tx.set(doc(collection(db, 'transactions')), {
        userId: commande.acheteurId,
        type: WALLET_TYPES.REMBOURSEMENT,
        montant: remboursement,
        sourceWallet: commande.sourceWalletAchat || 'principal',
        commandeId,
        description: fraisRetenus > 0 ? `Remboursement commande annulée #${commandeId.slice(0, 8).toUpperCase()} (${fraisRetenus.toLocaleString('fr-FR')} XAF de frais de service retenus)` : `Remboursement commande annulée #${commandeId.slice(0, 8).toUpperCase()}`,
        createdAt: serverTimestamp()
      });
    }
    if (fraisLivraisonPayes > 0) {
      tx.set(doc(collection(db, 'transactions')), {
        userId: commande.acheteurId,
        type: WALLET_TYPES.REMBOURSEMENT,
        montant: fraisLivraisonPayes,
        sourceWallet: commande.sourceWalletLivraison || 'principal',
        commandeId,
        description: `Remboursement frais de livraison — commande annulée #${commandeId.slice(0, 8).toUpperCase()}`,
        createdAt: serverTimestamp()
      });
    }
    if ((remboursement > 0 || fraisLivraisonPayes > 0) && commande.acheteurId) {
      const deltas = {};
      if (remboursement > 0) deltas[champArticle] = (deltas[champArticle] || 0) + remboursement;
      if (fraisLivraisonPayes > 0) deltas[champLivraison] = (deltas[champLivraison] || 0) + fraisLivraisonPayes;
      tx.update(doc(db, 'users', commande.acheteurId), {
        ...Object.fromEntries(Object.entries(deltas).map(([champ, montant]) => [champ, increment(montant)])),
        // Fusionné ici quand c'est l'acheteur qui annule (même document que
        // le crédit ci-dessus) — voir commentaire jumeau plus haut.
        ...(parQui === 'acheteur' ? { annulationsCommande: increment(1) } : {}),
        commandeId
      });
    } else if (parQui === 'acheteur' && commande.acheteurId) {
      // Filet de sécurité (montantPreleve théoriquement à 0, cas jamais
      // rencontré en pratique — prix > 0 est déjà exigé à la publication) :
      // aucune autre écriture ne cible ce document dans ce cas précis, donc
      // pas de conflit à fusionner ici.
      tx.update(doc(db, 'users', commande.acheteurId), {
        annulationsCommande: increment(1),
        commandeId
      });
    }
  });
  const autrePartieId = parQui === 'acheteur' ? commandeData?.vendeurId : commandeData?.acheteurId;
  if (autrePartieId) {
    await creerNotification({
      userId: autrePartieId,
      type: 'commande',
      titre: 'Commande annulée',
      message: `La commande #${commandeId.slice(0, 8).toUpperCase()} a été annulée par ${parQui === 'acheteur' ? "l'acheteur" : 'le vendeur'}.`,
      link: `/commande/${commandeId}`
    });
  }
  const livreursANotifier = new Set([commandeData?.livreurCollecteId, commandeData?.livreurLivraisonId].filter(Boolean));
  await Promise.all([...livreursANotifier].map(livreurId => creerNotification({
    userId: livreurId,
    type: 'commande',
    titre: 'Commande annulée',
    message: `La commande #${commandeId.slice(0, 8).toUpperCase()} a été annulée — inutile de vous déplacer.`,
    link: `/commandes/${commandeId}`
  }).catch(e => console.error('Notification livreur (annulation) échouée :', e))));
  return remboursementInfo;
};
export const listenCommande = (commandeId, callback) => {
  return onSnapshot(doc(db, 'commandes', commandeId), snap => {
    if (snap.exists()) callback({
      id: snap.id,
      ...snap.data()
    });
  });
};
export const getCodeRemise = async commandeId => {
  const snap = await getDoc(doc(db, 'commandes', commandeId, 'prive', 'remise'));
  return snap.exists() ? snap.data().code : null;
};
export const getCodeCollecte = async commandeId => {
  const snap = await getDoc(doc(db, 'commandes', commandeId, 'prive', 'collecte'));
  return snap.exists() ? snap.data().code : null;
};
// #nouveau (demande utilisateur, "que le vendeur confirme aussi qu'il a
// reçu sa commande") : code connu du vendeur seul, généré au paiement du
// retour (walletService.payerRetourLivraison) — donné au livreur en main
// propre à la remise, jamais lu par lui directement.
export const getCodeRetourRemise = async commandeId => {
  const snap = await getDoc(doc(db, 'commandes', commandeId, 'prive', 'retour_remise'));
  return snap.exists() ? snap.data().code : null;
};
// #nouveau (demande utilisateur, "carte main propre acheteur/vendeur") :
// partage ponctuel, à l'initiative de chacun — jamais de suivi continu. Le
// champ écrit dépend du rôle de l'appelant (firestore.rules n'autorise
// chacun qu'à toucher SON propre champ, jamais celui de l'autre partie).
export const partagerMaPosition = async (commandeId, estAcheteur, lat, lng) => {
  await updateDoc(doc(db, 'commandes', commandeId), estAcheteur
    ? { positionAcheteur: { lat, lng, updatedAt: serverTimestamp() } }
    : { positionVendeur: { lat, lng, updatedAt: serverTimestamp() } });
};
export const arreterPartagePosition = async (commandeId, estAcheteur) => {
  await updateDoc(doc(db, 'commandes', commandeId), estAcheteur
    ? { positionAcheteur: null }
    : { positionVendeur: null });
};
// #nouveau (demande utilisateur, "carte livreur acheteur/vendeur") : distinct
// de partagerMaPosition (positionAcheteur/positionVendeur, mode main_propre
// uniquement) — écrit ici dans commandes/{id}/positions/{role}, le même
// sous-document que lit maket-livreur (listenPosition). Jamais autorisé sans
// une demande active du livreur pour CE rôle précis (cf. firestore.rules,
// positionAcheteurVendeurAutorisee) — c'est ce qui fait office de "consentement".
export const partagerPositionLivraison = async (commandeId, role, lat, lng) => {
  await setDoc(doc(db, 'commandes', commandeId, 'positions', role), { lat, lng, updatedAt: serverTimestamp() });
};
export const arreterPartagePositionLivraison = async (commandeId, role) => {
  await deleteDoc(doc(db, 'commandes', commandeId, 'positions', role));
};
// Écoute MA PROPRE position déjà partagée (pour l'état du bouton "partager"/
// "ne plus partager") — même sous-document que lit maket-livreur.
export const listenMaPositionLivraison = (commandeId, role, callback) => {
  return onSnapshot(doc(db, 'commandes', commandeId, 'positions', role), snap => {
    callback(snap.exists() ? snap.data() : null);
  }, () => callback(null));
};
// Écoute la position live du livreur — champ direct sur la commande (cf.
// maket-livreur updateLivreurPosition), déjà incluse dans listenCommande,
// mais exposée ici en écoute dédiée pour un composant qui n'a besoin QUE de
// ce champ (évite de dupliquer un onSnapshot complet sur toute la commande).
export const listenLivreurPosition = (commandeId, callback) => {
  return onSnapshot(doc(db, 'commandes', commandeId), snap => {
    callback(snap.exists() ? snap.data().livreurPosition || null : null);
  }, () => callback(null));
};
