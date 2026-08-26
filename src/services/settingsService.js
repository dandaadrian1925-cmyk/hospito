import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
const DEFAULTS = {
  retraitMinimum: 1000,
  retraitMaximum: 500000,
  commissionVenteDefaut: 0.05,
  commissionVenteParCategorie: {},
  commissionFilleulReduite: 0.03,
  nombreVentesReduitesFilleul: 10,
  pourcentageCommissionParrain: 100,
  nombreVentesRecompensees: 3,
  transfertParrainageMinimum: 5000,
  limiteAnnoncesVenteBase: 10,
  limiteAnnoncesParFilleulQualifie: 2,
  // #nouveau (demande utilisateur, "Vendeur Pro") : pass à durée fixe
  // (comme un boost), pas un abonnement récurrent — CamPay ne supporte que
  // le paiement ponctuel dans ce projet. Doit rester synchronisé avec
  // firestore.rules (achat vendeurProExpiry) et scheduled-tasks (commission
  // réduite server-side).
  vendeurProDureeJours: 30,
  vendeurProPrix: 5000,
  // Points de pourcentage entiers (2 = -2 points), pas une fraction — même
  // convention que pourcentageCommissionParrain, pas commissionVenteDefaut.
  vendeurProReductionCommission: 2,
  vendeurProLimiteAnnoncesBonus: 10,
  // #nouveau (demande utilisateur, "réduction sur les boosts payés") :
  // pourcentage simple (50 = -50% sur le prix affiché), pas des points comme
  // vendeurProReductionCommission — cf. prixBoostReduit (firestore.rules).
  vendeurProReductionBoost: 50,
  delaiConfirmationVendeurHeures: 24,
  seuilAnnulationsRestriction: 3,
  fenetreAnnulationsJours: 30,
  dureeRestrictionJours: 7,
  // #nouveau (retour utilisateur, "les boosts ne sont plus en pourcentages") :
  // prix fixe XAF par catégorie et par niveau, { [categorieId]: { standard,
  // premium, max, flash } } — vide par défaut, un niveau sans prix explicite
  // pour une catégorie est VOLONTAIREMENT indisponible (cf. annoncesService.js
  // getBoostPrix), jamais un défaut à 0 XAF.
  boostPrix: {},
  // #nouveau (demande utilisateur, "durée configurable par plan") : jours
  // avant expiration automatique d'un boost, par niveau.
  boostDureeJours: { standard: 7, premium: 7, max: 7 },
  commissionLivraisonPercent: 0,
  fraisLivraisonMax: 50000,
  maxRefusLivraisonAvantAnnulation: 3,
  // #nouveau (demande utilisateur, "le nombre d'aller-retour doit avoir son
  // propre paramètre métier") : plafond de tours pour la négociation des
  // frais de livraison (commandes) — était figé à 2 en dur (firestore.rules
  // + commandesService.js des 2 apps + CommandePage.jsx).
  negociationFraisLivraisonMaxTours: 2,
  // Même principe pour la négociation d'offre de prix sur une annonce (chat).
  negociationOffreMaxTours: 3,
  maxPhotosAnnonce: 10,
  // #nouveau (demande utilisateur, "améliorons la vente en lots") : doit
  // rester synchronisé avec firestore.rules (estLotValide, valeurs en dur
  // 2/50 avant ce correctif) — lu dynamiquement désormais.
  lotArticlesMin: 2,
  lotArticlesMax: 50,
  flashDureeHeures: 24,
  // #nouveau (demande utilisateur, "une offre expire après 24h si pas de
  // réponse") : passé ce délai, le vendeur ne peut plus accepter/refuser
  // (cf. firestore.rules, même délai) — évite une offre "en attente" qui
  // reste indéfiniment actionnable des semaines plus tard, à un prix qui
  // n'a plus de sens.
  offreExpirationHeures: 24,
  chatAvertissementsAvantSuspension: 2,
  chatSuspensionHeures: 24,
  retractationHeures: 24,
  // #nouveau (demande utilisateur, "délai d'inactivité configurable pour
  // chaque étape") : chaque statut de commande a désormais son propre délai
  // indépendant — auparavant delaiLivraisonSansReponseHeures était partagé
  // entre en_attente_livreur ET prix_propose (impossible de régler l'un sans
  // l'autre) ; conservé comme valeur par défaut de repli uniquement.
  delaiLivraisonSansReponseHeures: 48,
  delaiEnAttenteVendeurHeures: 24,
  delaiEnAttenteLivreurHeures: 48,
  delaiPrixProposeHeures: 48,
  delaiPreparationHeures: 24,
  delaiLivreurDepartHeures: 24,
  // #nouveau (demande utilisateur, "campagne de lancement") : lancementDateFin
  // absent/null = pas de campagne en cours (comportement normal, aucun
  // compte à rebours affiché). lancementAnnoncesCommissionZeroUtilisees
  // n'est PAS un réglage mais un compteur d'état — vit ici par simplicité
  // (même doc que le reste des paramètres métier), incrémenté à chaque
  // validation admin qui consomme une place, jamais réinitialisé
  // manuellement (comparé au total configuré pour savoir ce qui reste).
  // #bug (corrigé, retour utilisateur — "je ne vois pas les 10000 XAF") : des
  // valeurs par défaut non nulles ici affichaient "1000 places"/"10 000 XAF"
  // comme si c'était réellement configuré, alors que settings/global ne
  // contenait que la date — le serveur (scheduled-tasks, sans ces défauts)
  // créditait alors 0 XAF en silence. Zéro partout : un champ non rempli
  // s'affiche maintenant honnêtement comme non configuré, jamais un chiffre
  // qui laisse croire à une vraie promesse.
  lancementDateFin: null,
  lancementNombreAnnonces: 0,
  lancementAnnoncesCommissionZeroUtilisees: 0,
  lancementNombreParrains: 0,
  lancementBonusMontant: 0,
  lancementVendeurProMois: 0,
  // #nouveau (demande utilisateur, "jamais le rang exact, juste il manque X
  // filleuls") : seuil = nombre de filleuls du dernier admis dans le top N,
  // calculé et stocké côté serveur (recalculerClassementParrainage, cron
  // ?job=lancement) — jamais par utilisateur, donc aucun rang individuel
  // n'a besoin de transiter jusqu'au client (cf. CompteARebours.jsx).
  lancementSeuilTopN: 0,
  // #nouveau (demande utilisateur, "modifier les données affichées, pas les
  // données réelles") : décalage purement cosmétique ajouté au nombre de
  // places restantes affiché (cf. CompteARebours.jsx) — n'affecte jamais
  // lancementAnnoncesCommissionZeroUtilisees ni le vrai quota.
  lancementAffichageAjustement: 0,
  // #nouveau (demande utilisateur, "ajuster le classement comme pour les
  // annonces") : même principe, mais appliqué au seuil du top N plutôt qu'au
  // nombre de places — décale uniquement l'écart affiché ("plus que X
  // filleuls pour entrer dans le top", cf. CompteARebours.jsx), jamais le
  // vrai seuil utilisé par le cron pour désigner les gagnants réels.
  lancementAffichageAjustementSeuil: 0,
  // #nouveau (demande utilisateur, "plutôt ajouter un nombre de parrains
  // cosmétique qui décale les rangs de tout le monde") : plus intuitif et
  // prévisible que le décalage de seuil ci-dessus — lancementRang est un
  // entier unique 1..N sans doublon, donc "Ajouter 5" démote toujours
  // exactement les 5 derniers du vrai top, contrairement au seuil (en
  // filleuls) dont l'effet dépend de la répartition réelle. Cf.
  // CompteARebours.jsx : ne peut jamais transformer un "hors du top" réel en
  // "dans le top" affiché, seulement l'inverse.
  lancementAffichageDecalageRang: 0,
  // #nouveau (demande utilisateur, "indiquer qu'il faut 5 min pour afficher
  // les résultats") : la révélation (annonces + bonus) n'est pas instantanée
  // à l'échéance — elle attend le prochain passage du cron ?job=lancement
  // (programmé par le super-admin lui-même via pg_cron, hors de ce dépôt).
  // Ce délai doit rester cohérent avec CETTE fréquence réelle — affiché en
  // "publication en cours" plutôt qu'un site qui semble juste vide entre les
  // deux (cf. CompteARebours.jsx, campagneActive/revelationEnCours).
  lancementDelaiRevelationMinutes: 5,
  // #nouveau (demande utilisateur, "rendre villes/quartiers dynamiques
  // depuis les paramètres métiers, dans tout le site client") : reprend
  // exactement l'ancienne liste codée en dur (annoncesService.js VILLES/
  // QUARTIERS avant ce changement) comme valeur de repli — aucune régression
  // tant que le super-admin n'a rien reconfiguré. 'Autre ville'/'Autre' ne
  // sont JAMAIS stockés ici : ce sont des sentinelles ajoutées par l'UI
  // elle-même (cf. getVillesFormulaire/getQuartiersFormulaire ci-dessous),
  // pour que l'admin ne puisse pas les supprimer ou les mal placer par erreur.
  villes: ['Yaoundé', 'Douala', 'Bafoussam', 'Dschang', 'Mbouda', 'Bafang', 'Bamenda', 'Kumbo', 'Wum', 'Buea', 'Limbe', 'Kumba', 'Mamfe', 'Tiko', 'Garoua', 'Guider', 'Maroua', 'Kousséri', 'Mokolo', 'Ngaoundéré', 'Meiganga', 'Bertoua', 'Batouri', 'Ebolowa', 'Kribi', 'Sangmélima', 'Mbalmayo', 'Obala', 'Nkongsamba', 'Edéa'],
  quartiersParVille: {
    'Yaoundé': ['Bastos', 'Nlongkak', 'Biyem-Assi', 'Mvan', 'Omnisport', 'Melen', 'Essos', 'Nkomo', 'Mvog-Mbi'],
    'Douala': ['Akwa', 'Bonanjo', 'Bonapriso', 'Deido', 'Bepanda', 'Logbessou', 'Makepe']
  }
};
// #nouveau (demande utilisateur, "rendre villes/quartiers dynamiques") :
// liste "brute" (sans sentinelle), pour les usages qui ne sont PAS un
// formulaire de saisie — ex. un filtre de catalogue, où "Autre ville" n'a
// aucun sens comme valeur filtrable puisqu'aucune annonce n'a jamais
// littéralement cette ville.
export const getVilles = settings => settings?.villes?.length ? settings.villes : DEFAULTS.villes;
export const getQuartiers = (settings, ville) => (settings?.quartiersParVille ?? DEFAULTS.quartiersParVille)[ville] ?? null;
// Pour les formulaires de saisie (inscription, profil, publication d'annonce,
// adresse de livraison) : ajoute la sentinelle 'Autre ville'/'Autre' en
// dernière position, pour laisser l'utilisateur saisir une ville/un quartier
// absent de la liste — comportement identique à l'ancien tableau codé en dur.
export const getVillesFormulaire = settings => [...getVilles(settings), 'Autre ville'];
export const getQuartiersFormulaire = (settings, ville) => {
  const base = getQuartiers(settings, ville);
  return base ? [...base, 'Autre'] : null;
};
export const getTauxCommission = (settings, categorie) => {
  const parCategorie = settings.commissionVenteParCategorie?.[categorie];
  return parCategorie != null ? parCategorie : settings.commissionVenteDefaut;
};
// #nouveau (demande utilisateur, "Vendeur Pro") : même idiome que
// isBoostActive/isFlashActive — un vendeurProExpiry dépassé ne compte plus,
// pas besoin d'un flag séparé à réinitialiser.
export const estVendeurProActif = (vendeurData) => {
  const exp = vendeurData?.vendeurProExpiry;
  const ms = exp?.toDate ? exp.toDate().getTime() : (exp ? new Date(exp).getTime() : null);
  return !!ms && ms > Date.now();
};
export const getTauxCommissionVendeur = (settings, categorie, vendeurData) => {
  const enPeriodeReduite = !!vendeurData?.parainId && (vendeurData?.totalVentes || 0) < settings.nombreVentesReduitesFilleul;
  const taux = enPeriodeReduite ? settings.commissionFilleulReduite : getTauxCommission(settings, categorie);
  // Se cumule avec la réduction filleul si les deux s'appliquent — les deux
  // sont des réductions légitimes (l'une gagnée par le parrainage, l'autre
  // achetée), aucune raison de les rendre exclusives l'une de l'autre.
  // Plancher à 1% : jamais une commission nulle ou négative, même avec une
  // réduction Vendeur Pro mal configurée par le super admin.
  if (estVendeurProActif(vendeurData)) {
    return Math.max(0.01, taux - (settings.vendeurProReductionCommission ?? 0) / 100);
  }
  return taux;
};
let cache = null;
export const getSettings = async () => {
  if (cache) return cache;
  try {
    const snap = await getDoc(doc(db, 'settings', 'global'));
    cache = snap.exists() ? {
      ...DEFAULTS,
      ...snap.data()
    } : DEFAULTS;
  } catch {
    cache = DEFAULTS;
  }
  return cache;
};
