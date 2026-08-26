import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc, query, where, orderBy, limit, startAfter, serverTimestamp, increment, onSnapshot, runTransaction } from 'firebase/firestore';
import { db, auth, getAppCheckTokenSafe } from '../firebase/config';
import { uploadFile } from '../supabase/config';
import { applyWatermark } from '../utils/watermark';
import { WALLET_TYPES } from './walletService';
import { getSettings, estVendeurProActif } from './settingsService';
import { creerNotification } from './notificationsService';
// #nouveau (demande utilisateur, "recommander en main propre s'il n'y a pas
// encore de livreurs disponibles dans cette ville") : users/{uid} est privé
// (illisible directement par un client normal, cf. firestore.rules), donc ce
// simple booléen passe par une Edge Function dédiée (compte de service),
// jamais une requête Firestore directe depuis ce fichier.
export const verifierLivreursDisponibles = async (ville) => {
  if (!auth.currentUser || !ville) return true;
  try {
    const firebaseIdToken = await auth.currentUser.getIdToken();
    const appCheckToken = await getAppCheckTokenSafe();
    const res = await fetch('https://cekiqtkdgjgawxxerjdf.supabase.co/functions/v1/check-livreurs-ville', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'X-Firebase-Token': firebaseIdToken,
        ...(appCheckToken ? { 'X-Firebase-AppCheck': appCheckToken } : {})
      },
      body: JSON.stringify({ ville })
    });
    if (!res.ok) return true;
    const data = await res.json();
    return !!data.disponible;
  } catch {
    // Best-effort : une panne de ce contrôle ne doit jamais bloquer la
    // publication — on suppose des livreurs disponibles par défaut plutôt
    // que de gêner un vendeur pour un souci réseau sans rapport.
    return true;
  }
};
export const BOOST_LEVELS = [{
  id: 'standard',
  label: 'Boost Standard',
  description: 'Mise en avant dans sa catégorie'
}, {
  id: 'premium',
  label: 'Boost Premium',
  description: 'Mise en avant + bandeau Boost'
}, {
  id: 'max',
  label: 'Boost Max',
  description: 'Top des résultats + Stories + Bandeau'
}];
// #nouveau (retour utilisateur, "les boosts ne sont plus en pourcentages") :
// prix fixe en XAF par catégorie, configuré dans settings.boostPrix
// ({ [categorieId]: { standard, premium, max, flash } }) — plus de calcul en
// pourcentage du prix de l'annonce. `prix: null` (catégorie jamais configurée
// pour ce niveau) signale un boost VOLONTAIREMENT indisponible, pas un défaut
// à 0 — cf. payerEtActiver, qui refuse tout niveau sans prix explicite.
export const getBoostLevels = (settings, categorie) => BOOST_LEVELS.map(b => ({
  ...b,
  prix: settings?.boostPrix?.[categorie]?.[b.id] ?? null
}));
const BOOST_WEIGHTS = {
  max: 3,
  premium: 2,
  standard: 1
};
export const boostWeight = annonce => isBoostActive(annonce) ? (BOOST_WEIGHTS[annonce.boost] || 0) : 0;
// #nouveau (demande utilisateur, "classer aussi par score de fiabilité") :
// le boost reste le critère dominant (c'est un achat réel, revenu MAKET —
// un vendeur qui paie doit voir un effet net) ; le score de fiabilité du
// vendeur (0-5) ne sert qu'à départager DANS un même palier de boost —
// ×10 garantit qu'un écart de boost l'emporte toujours sur un écart de
// score (5 au maximum). `scores` : map vendeurId -> score (cf.
// profilPublicService.getScoresParVendeur), score absent traité comme 0
// (jamais recalculé encore, pas de biais en sa faveur ni en sa défaveur
// au hasard).
// #nouveau (demande utilisateur, "priorité de tri même sans boost pour
// Vendeur Pro") : bonus fixe (4) volontairement < 10 (poids du PLUS FAIBLE
// boost payant) — même au score de fiabilité maximum (5, donc 4+5=9), un
// vendeur Pro non boosté ne peut jamais dépasser une annonce réellement
// boostée : juste un léger coup de pouce au-dessus des annonces non
// boostées et non-Pro. `vendeurPro` : map vendeurId -> vendeurProExpiry
// (cf. profilPublicService.getVendeurProParVendeur), même motif que scores.
export const annonceSortWeight = (annonce, scores, vendeurPro) =>
  boostWeight(annonce) * 10 +
  (estVendeurProActif({ vendeurProExpiry: vendeurPro?.[annonce?.userId] }) ? 4 : 0) +
  (scores?.[annonce?.userId] ?? 0);
export const publierAnnonce = async (userId, data, photos, video, facture) => {
  if (!Number.isFinite(data.prix) || data.prix <= 0) throw new Error('PRIX_INVALIDE');
  // #nouveau (refonte parrainage v2, plafond d'annonces) : pré-vérification pour
  // un message d'erreur clair avant même l'upload des photos — le vrai filet de
  // sécurité reste la règle Firestore (annonces/{id} create), jamais cette
  // vérification client seule.
  const profilSnap = await getDoc(doc(db, 'users', userId));
  const settings = await getSettings();
  const limiteAnnonces = profilSnap.data()?.limiteAnnoncesVente ?? settings.limiteAnnoncesVenteBase ?? 10;
  const nombreEnVente = profilSnap.data()?.nombreAnnoncesEnVente ?? 0;
  if (nombreEnVente >= limiteAnnonces) throw new Error('LIMITE_ANNONCES_ATTEINTE');
  const photoUrls = [];
  for (let i = 0; i < photos.length; i++) {
    const watermarked = await applyWatermark(photos[i]).catch(() => photos[i]);
    const upload = await uploadFile('annonces', `${userId}/${Date.now()}_photo_${i}`, watermarked);
    photoUrls.push(upload.publicUrl);
  }
  let videoUrl = null;
  if (video) {
    const v = await uploadFile('annonces', `${userId}/${Date.now()}_video`, video);
    videoUrl = v.publicUrl;
  }
  let factureUrl = null;
  if (facture) {
    const f = await uploadFile('factures', `${userId}/${Date.now()}_facture`, facture);
    factureUrl = f.path;
  }
  // #nouveau (demande utilisateur, "chaque nouvelle annonce d'un Vendeur Pro
  // sort directement en flash 24h gratuit, ensuite il paie comme tout le
  // monde") : avantage ponctuel à LA PUBLICATION seulement (pas permanent
  // tant que le pass est actif, contrairement à l'ancien calcul EN DIRECT —
  // cf. isFlashActive) — mêmes champs/durée qu'un vrai flash payé
  // (creerFlashAnnonce), juste sans débit de solde. Miroir exact de la
  // dérogation firestore.rules (annonces/{id} create).
  const vendeurProActifMaintenant = estVendeurProActif({ vendeurProExpiry: profilSnap.data()?.vendeurProExpiry });
  const flashGratuitExpiry = vendeurProActifMaintenant
    ? new Date(Date.now() + (settings.flashDureeHeures ?? 24) * 60 * 60 * 1000)
    : null;
  const annonce = {
    ...data,
    userId,
    photos: photoUrls,
    videoUrl,
    factureUrl,
    statut: 'en_attente',
    vues: 0,
    favoris: 0,
    boost: null,
    boostExpiry: null,
    flash: vendeurProActifMaintenant,
    flashExpiry: flashGratuitExpiry,
    masquee: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  const ref = await addDoc(collection(db, 'annonces'), annonce);
  return ref.id;
};
// #nouveau (demande utilisateur, "un Vendeur Pro n'a le flash gratuit QUE
// sur les 24h suivant la publication, ensuite il paie comme tout le
// monde") : flash/flashExpiry stockés sur l'annonce comme un flash payé
// normal (posés une seule fois à la publication si Pro actif à ce
// moment-là, cf. publierAnnonce) — plus de calcul en direct sur
// vendeurProExpiry qui rendait le flash permanent tant que le pass était
// actif, quel que soit l'âge de l'annonce. isFlashActiveOuPro a été retiré :
// isFlashActive suffit à nouveau, comme pour un flash payé classique.
export const isFlashActive = annonce => {
  if (!annonce?.flash) return false;
  if (!annonce.flashExpiry) return true;
  const expiry = annonce.flashExpiry.toDate ? annonce.flashExpiry.toDate() : new Date(annonce.flashExpiry);
  return expiry > Date.now();
};
// #nouveau (demande utilisateur, "les boosts ont maintenant une durée
// configurable par plan") : même principe qu'isFlashActive — boostExpiry
// absent (annonces boostées avant ce correctif) reste actif indéfiniment
// plutôt que d'expirer rétroactivement une mise en avant déjà payée.
export const isBoostActive = annonce => {
  if (!annonce?.boost) return false;
  if (!annonce.boostExpiry) return true;
  const expiry = annonce.boostExpiry.toDate ? annonce.boostExpiry.toDate() : new Date(annonce.boostExpiry);
  return expiry > Date.now();
};
const enTableau = v => v === undefined || v === null || v === '' || Array.isArray(v) && v.length === 0 ? [] : Array.isArray(v) ? v : [v];
const PAGE_SIZE = 50;

// Pagination par curseur (startAfter) plutôt qu'un simple limit(50) fixe —
// sans ça le catalogue ne pouvait jamais montrer plus de 50 annonces, quel
// que soit le nombre réel qui correspond aux filtres, et l'affichage "X
// articles trouvés" était donc trompeur (c'était un plafond de chargement,
// pas un vrai total). `cursor` est le dernier document de la page
// précédente (snap.docs.at(-1)) — cf. CataloguePage pour l'usage "Charger
// plus". Renvoie aussi `lastDoc`/`hasMore` pour permettre de continuer.
export const getAnnonces = async (filters = {}, cursor = null) => {
  const categories = enTableau(filters.categorie);
  const sousCategories = enTableau(filters.sousCategorie);
  const villes = enTableau(filters.ville);
  const prixMin = filters.prixMin ? parseInt(filters.prixMin) : null;
  const prixMax = filters.prixMax ? parseInt(filters.prixMax) : null;
  const clauses = [where('statut', '==', 'en_vente'), where('masquee', '==', false)];
  let inUtilise = false;
  const appliquer = (champ, valeurs) => {
    if (valeurs.length === 0) return;
    if (valeurs.length === 1) {
      clauses.push(where(champ, '==', valeurs[0]));
      return;
    }
    if (!inUtilise) {
      clauses.push(where(champ, 'in', valeurs.slice(0, 30)));
      inUtilise = true;
    }
  };
  appliquer('categorie', categories);
  appliquer('sousCategorie', sousCategories);
  appliquer('ville', villes);
  // #optimisation : fourchette de prix filtrée par Firestore lui-même (pas
  // après coup côté navigateur) — avant ce correctif, une page de 50 pouvait
  // ne renvoyer que quelques annonces réellement dans la fourchette après
  // filtrage local, obligeant à enchaîner plusieurs "charger plus" juste
  // pour remplir l'écran. Contrainte Firestore : un filtre d'inégalité
  // impose que le PREMIER orderBy porte sur ce même champ — donc le tri par
  // date (par défaut) devient un tri par prix dès qu'une fourchette est
  // active (createdAt reste le critère secondaire, à égalité de prix).
  if (prixMin != null) clauses.push(where('prix', '>=', prixMin));
  if (prixMax != null) clauses.push(where('prix', '<=', prixMax));
  const filtreParPrix = prixMin != null || prixMax != null;
  const tri = filtreParPrix ? [orderBy('prix', 'asc'), orderBy('createdAt', 'desc')] : [orderBy('createdAt', 'desc')];
  const curseurs = cursor ? [startAfter(cursor)] : [];
  const q = query(collection(db, 'annonces'), ...clauses, ...tri, ...curseurs, limit(PAGE_SIZE));
  const snap = await getDocs(q);
  let list = snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));
  if (categories.length > 1) list = list.filter(a => categories.includes(a.categorie));
  if (sousCategories.length > 1) list = list.filter(a => sousCategories.includes(a.sousCategorie));
  if (villes.length > 1) list = list.filter(a => villes.includes(a.ville));
  return {
    list,
    lastDoc: snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null,
    hasMore: snap.docs.length === PAGE_SIZE
  };
};
export const getAnnonceById = async id => {
  const snap = await getDoc(doc(db, 'annonces', id));
  if (!snap.exists()) return null;
  try {
    await updateDoc(doc(db, 'annonces', id), {
      vues: increment(1)
    });
  } catch (e) {}
  return {
    id: snap.id,
    ...snap.data()
  };
};
export const getAnnoncePourEdition = async id => {
  const snap = await getDoc(doc(db, 'annonces', id));
  return snap.exists() ? {
    id: snap.id,
    ...snap.data()
  } : null;
};
export const modifierAnnonceComplete = async (annonceId, data, photosAGarder, nouvellesPhotos, video, facture, videoUrlExistante, factureUrlExistante) => {
  if (!Number.isFinite(data.prix) || data.prix <= 0) throw new Error('PRIX_INVALIDE');
  const nouvellesUrls = [];
  for (let i = 0; i < nouvellesPhotos.length; i++) {
    const watermarked = await applyWatermark(nouvellesPhotos[i]).catch(() => nouvellesPhotos[i]);
    const upload = await uploadFile('annonces', `${data.userId}/${Date.now()}_photo_${i}`, watermarked);
    nouvellesUrls.push(upload.publicUrl);
  }
  const photos = [...photosAGarder, ...nouvellesUrls];
  if (photos.length === 0) throw new Error('PHOTO_REQUISE');
  let videoUrl = videoUrlExistante || null;
  if (video) {
    const v = await uploadFile('annonces', `${data.userId}/${Date.now()}_video`, video);
    videoUrl = v.publicUrl;
  }
  let factureUrl = factureUrlExistante || null;
  if (facture) {
    const f = await uploadFile('factures', `${data.userId}/${Date.now()}_facture`, facture);
    factureUrl = f.path;
  }
  const {
    userId,
    ...champsAutorises
  } = data;
  // #bug CRITIQUE (corrigé, audit — course avec un achat concurrent) :
  // l'ancien code lisait le statut AVANT la boucle d'upload (potentiellement
  // lente, watermark + Storage), puis écrivait 'en_attente' en aveugle si
  // l'annonce ÉTAIT en_vente à ce moment-là — sans jamais revérifier au
  // moment de l'écriture. Si un acheteur achète pendant l'upload
  // (creerCommande passe l'annonce à 'vendu', décrémente déjà
  // nombreAnnoncesEnVente), cette modification écrasait ensuite 'vendu' par
  // 'en_attente' sur une annonce ayant pourtant une vraie commande payée en
  // cours, ET décrémentait nombreAnnoncesEnVente une seconde fois pour la
  // même vente. Le statut n'est désormais lu et remis à 'en_attente' que
  // DANS la transaction, juste avant l'écriture — jamais si l'annonce est
  // entre-temps devenue 'vendu' (ou autre chose que 'en_vente').
  let remisEnAttente = false;
  await runTransaction(db, async tx => {
    const snap = await tx.get(doc(db, 'annonces', annonceId));
    const etaitEnVente = snap.exists() && snap.data().statut === 'en_vente';
    remisEnAttente = etaitEnVente;
    tx.update(doc(db, 'annonces', annonceId), {
      ...champsAutorises,
      photos,
      videoUrl,
      factureUrl,
      updatedAt: serverTimestamp(),
      ...(etaitEnVente ? { statut: 'en_attente' } : {})
    });
    if (etaitEnVente) {
      tx.update(doc(db, 'users', userId), {
        nombreAnnoncesEnVente: increment(-1),
        annonceId
      });
    }
  });
  return { remisEnAttente };
};
export const getAnnoncesByUser = async userId => {
  const q = query(collection(db, 'annonces'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));
};
export const getAnnoncesPublicByUser = async userId => {
  const q = query(collection(db, 'annonces'), where('userId', '==', userId), where('statut', '==', 'en_vente'), where('masquee', '==', false), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));
};
export const searchAnnonces = async searchTerm => {
  // #nouveau (demande utilisateur, "les plus anciens doivent d'abord
  // s'afficher pour la recherche") : jusqu'ici aucun orderBy — l'ordre à
  // égalité de boost/score (appliquerFiltresEtTri, CataloguePage) dépendait
  // de l'ordre arbitraire renvoyé par Firestore, pas de la date. N'affecte
  // que la recherche texte, jamais le parcours normal (getAnnonces), qui
  // reste trié du plus récent au plus ancien.
  const snap = await getDocs(query(collection(db, 'annonces'), where('statut', '==', 'en_vente'), where('masquee', '==', false), orderBy('createdAt', 'asc')));
  return snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  })).filter(a => a.titre?.toLowerCase().includes(searchTerm.toLowerCase()) || a.description?.toLowerCase().includes(searchTerm.toLowerCase()));
};
export const toggleFavori = async (userId, annonceId) => {
  const favRef = doc(db, 'favoris', `${userId}_${annonceId}`);
  const annonceRef = doc(db, 'annonces', annonceId);
  return runTransaction(db, async tx => {
    const favSnap = await tx.get(favRef);
    if (favSnap.exists()) {
      tx.delete(favRef);
      tx.update(annonceRef, {
        favoris: increment(-1)
      });
      return false;
    } else {
      tx.set(favRef, {
        userId,
        annonceId,
        createdAt: serverTimestamp()
      });
      tx.update(annonceRef, {
        favoris: increment(1)
      });
      return true;
    }
  });
};
export const isFavori = async (userId, annonceId) => {
  const snap = await getDoc(doc(db, 'favoris', `${userId}_${annonceId}`));
  return snap.exists();
};
export const getFavoris = async userId => {
  const q = query(collection(db, 'favoris'), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));
};
export const masquerAnnonce = async annonceId => {
  await updateDoc(doc(db, 'annonces', annonceId), {
    masquee: true,
    updatedAt: serverTimestamp()
  });
};
export const demasquerAnnonce = async annonceId => {
  await updateDoc(doc(db, 'annonces', annonceId), {
    masquee: false,
    updatedAt: serverTimestamp()
  });
};
export const supprimerAnnoncePropre = async annonceId => {
  const annonceRef = doc(db, 'annonces', annonceId);
  // #nouveau (refonte parrainage v2, plafond d'annonces) : nombreAnnoncesEnVente
  // du propriétaire décrémenté DANS LA MÊME transaction que la suppression
  // réelle, uniquement si l'annonce était bien en_vente (cf. firestore.rules,
  // branche dédiée users/{uid} update).
  await runTransaction(db, async tx => {
    const snap = await tx.get(annonceRef);
    if (!snap.exists()) return;
    const annonce = snap.data();
    if (annonce.statut === 'en_vente' && annonce.userId) {
      tx.update(doc(db, 'users', annonce.userId), {
        nombreAnnoncesEnVente: increment(-1),
        annonceId
      });
    }
    tx.delete(annonceRef);
  });
};
export const signalerAnnonce = async (userId, annonceId, raison) => {
  await addDoc(collection(db, 'signalements'), {
    userId,
    annonceId,
    raison,
    createdAt: serverTimestamp()
  });
};
export const getSignalementsByUser = async userId => {
  const q = query(collection(db, 'signalements'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));
};
export const creerAlerteRecherche = async (userId, {
  categorie,
  motCle
}) => {
  if (!categorie && !motCle?.trim()) throw new Error('CRITERES_VIDES');
  await addDoc(collection(db, 'alertesRecherche'), {
    userId,
    categorie: categorie || null,
    motCle: motCle?.trim() || null,
    createdAt: serverTimestamp()
  });
};
export const getAlertesByUser = async userId => {
  const q = query(collection(db, 'alertesRecherche'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));
};
export const supprimerAlerteRecherche = async alerteId => {
  await deleteDoc(doc(db, 'alertesRecherche', alerteId));
};
export const getBoostPrix = (settings, categorie, niveau) => settings?.boostPrix?.[categorie]?.[niveau] ?? null;
// #nouveau (campagne de lancement) : sourceWallet ('principal' par défaut ou
// 'bonus') — le solde bonus des parrains gagnants sert notamment à financer
// boost/flash/Vendeur Pro, jamais convertible en argent réel (cf.
// firestore.rules, soldeBonus ne peut que diminuer côté client).
const payerEtActiver = async (annonceId, niveau, settings, userId, type, description, annonceUpdate, precondition, sourceWallet = 'principal') => {
  const champSolde = sourceWallet === 'bonus' ? 'soldeBonus' : 'solde';
  return runTransaction(db, async tx => {
    const annonceRef = doc(db, 'annonces', annonceId);
    const userRef = doc(db, 'users', userId);
    const [annonceSnap, userSnap] = await Promise.all([tx.get(annonceRef), tx.get(userRef)]);
    if (!annonceSnap.exists()) throw new Error('Annonce introuvable');
    if (!userSnap.exists()) throw new Error('Utilisateur introuvable');
    if (precondition) precondition(annonceSnap.data());
    // #nouveau (retour utilisateur, "les boosts ne sont plus en pourcentages") :
    // prix fixe par catégorie — lu sur la catégorie RÉELLE de l'annonce (lecture
    // fraîche dans cette même transaction, jamais une valeur fournie par
    // l'appelant). Aucun prix configuré pour cette catégorie/niveau == boost
    // volontairement indisponible, pas un défaut à 0.
    const prixBase = getBoostPrix(settings, annonceSnap.data().categorie, niveau);
    if (prixBase == null) throw new Error('BOOST_INDISPONIBLE_CATEGORIE');
    // #nouveau (demande utilisateur, "réduction sur les boosts payés pour
    // Vendeur Pro") : même compte que celui qui paie (userSnap, self-boost
    // uniquement) — cf. firestore.rules prixBoostReduit(), qui applique EXACTEMENT
    // la même formule pour vérifier ce débit.
    const reduction = estVendeurProActif(userSnap.data()) ? (settings.vendeurProReductionBoost ?? 0) : 0;
    const montant = Math.round(prixBase * (100 - reduction) / 100);
    const solde = userSnap.data()[champSolde] || 0;
    if (solde < montant) throw new Error('SOLDE_INSUFFISANT');
    tx.update(userRef, {
      [champSolde]: increment(-montant)
    });
    tx.set(doc(collection(db, 'transactions')), {
      userId,
      type,
      montant: -montant,
      sourceWallet,
      description,
      annonceId,
      createdAt: serverTimestamp()
    });
    tx.update(annonceRef, annonceUpdate);
    return montant;
  });
};
const bloquerSiBoostActif = annonce => {
  if (isBoostActive(annonce)) throw new Error('BOOST_DEJA_ACTIF');
};
export const boosterAnnonce = async (annonceId, boostLevel, userId, sourceWallet = 'principal') => {
  const level = BOOST_LEVELS.find(b => b.id === boostLevel);
  if (!level) throw new Error('Niveau de boost invalide');
  const settings = await getSettings();
  // #nouveau (demande utilisateur, "les boosts ont maintenant une durée
  // configurable par plan") : settings.boostDureeJours[niveau], 7 jours par
  // défaut si jamais configuré (cohérent avec le comportement précédent où
  // aucune expiration n'existait — un défaut raisonnable plutôt qu'un boost
  // qui expirerait immédiatement faute de configuration).
  const dureeJours = settings.boostDureeJours?.[boostLevel] ?? 7;
  const expiry = new Date(Date.now() + dureeJours * 24 * 60 * 60 * 1000);
  return payerEtActiver(annonceId, boostLevel, settings, userId, WALLET_TYPES.BOOST, `${level.label} sur une annonce`, {
    boost: boostLevel,
    boostedAt: serverTimestamp(),
    boostExpiry: expiry
  }, bloquerSiBoostActif, sourceWallet);
};
export const creerFlashAnnonce = async (annonceId, userId, sourceWallet = 'principal') => {
  const settings = await getSettings();
  // #nouveau (audit "qu'est-ce qui manque dans les paramètres métiers") :
  // était figé à 24h dans le code, maintenant settings.flashDureeHeures.
  const expiry = new Date(Date.now() + (settings.flashDureeHeures ?? 24) * 60 * 60 * 1000);
  return payerEtActiver(annonceId, 'flash', settings, userId, WALLET_TYPES.FLASH, 'Mise en avant Flash (24h)', {
    flash: true,
    flashExpiry: expiry
  }, null, sourceWallet);
};
// #nouveau (audit — "offre acceptée" périmée si un autre acheteur est ensuite
// accepté sur la même annonce) : offreAcceptee ne porte qu'un seul acheteur à
// la fois — un vendeur qui accepte l'offre d'un second acheteur écrase
// silencieusement celle du premier, dont le message de chat reste pourtant
// affiché "acceptée, finalisez l'achat" (jamais mis à jour lui-même). Écoute
// en direct pour permettre au chat de vérifier, au moment de l'affichage, que
// SON acheteur est toujours le bénéficiaire réel — la page d'achat
// (AchatPage.jsx) applique déjà cette même vérification côté prix, ceci
// n'ajoute qu'un affichage cohérent en amont, jamais un nouveau garde-fou
// financier (déjà assuré par firestore.rules/prixLegitime).
export const listenOffreAcceptee = (annonceId, callback) => {
  return onSnapshot(doc(db, 'annonces', annonceId), snap => {
    callback(snap.exists() ? snap.data()?.offreAcceptee ?? null : null);
  }, e => {
    console.error('Écoute offreAcceptee échouée :', e);
  });
};
export const listenQuestions = (annonceId, callback) => {
  const q = query(collection(db, 'annonces', annonceId, 'questions'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => callback(snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }))), e => {
    console.error('Écoute des questions échouée :', e);
    callback([]);
  });
};
export const poserQuestion = async (annonceId, auteurId, question) => {
  const q = (question || '').trim();
  if (!q) throw new Error('QUESTION_VIDE');
  await addDoc(collection(db, 'annonces', annonceId, 'questions'), {
    auteurId,
    question: q,
    reponse: null,
    repondantId: null,
    repondedAt: null,
    createdAt: serverTimestamp()
  });
  // #bug (corrigé, "le vendeur n'est pas notifié") : cette écriture n'a
  // jamais déclenché la moindre notification — le vendeur ne découvrait une
  // question qu'en revisitant sa propre annonce par hasard.
  try {
    const annonceSnap = await getDoc(doc(db, 'annonces', annonceId));
    const vendeurId = annonceSnap.data()?.userId;
    if (vendeurId && vendeurId !== auteurId) {
      await creerNotification({
        userId: vendeurId,
        type: 'annonce',
        titre: 'Nouvelle question sur votre annonce',
        message: `Un acheteur potentiel a une question sur "${annonceSnap.data()?.titre || 'votre annonce'}".`,
        link: `/annonce/${annonceId}`
      });
    }
  } catch (e) {
    console.error('Notification nouvelle question échouée :', e);
  }
};
export const repondreQuestion = async (annonceId, questionId, reponse, repondantId) => {
  const r = (reponse || '').trim();
  if (!r) throw new Error('REPONSE_VIDE');
  await updateDoc(doc(db, 'annonces', annonceId, 'questions', questionId), {
    reponse: r,
    repondantId,
    repondedAt: serverTimestamp()
  });
};
