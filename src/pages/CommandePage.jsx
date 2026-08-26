import { useState, useEffect, lazy, Suspense } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, Package, AlertTriangle, XCircle, ArrowLeft, Shield, Star, KeyRound, Truck, MapPin } from 'lucide-react';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { listenCommande, confirmerPreparation, marquerArticlePret, confirmerRemiseParCode, annulerCommande, calculerRemboursementAnnulation, finaliserCommandeSiExpiree, annulerSiVendeurExpire, annulerSiLivraisonExpire, refuserPrixLivraison, contrePropositionAcheteur, getCodeRemise, getCodeCollecte, getCodeRetourRemise, partagerMaPosition, arreterPartagePosition, partagerPositionLivraison, arreterPartagePositionLivraison, listenMaPositionLivraison, STATUTS_COMMANDE, STATUT_LABELS } from '../services/commandesService';
import MainPropreMap from '../components/commande/MainPropreMap';
import LivraisonMap from '../components/commande/LivraisonMap';
// #perf : le SDK Agora (~1.2 Mo) ne doit jamais alourdir le chargement de
// CETTE page pour toute commande sans appel actif — chargé uniquement quand
// le widget s'affiche réellement (trajet actif ou retour en cours).
const CallWidget = lazy(() => import('../components/commande/CallWidget'));
import ConfirmDialog from '../components/common/ConfirmDialog';
import { payerFraisLivraison, payerRetourLivraison } from '../services/walletService';
import { ouvrirLitige } from '../services/litigesService';
import { laisserAvis, hasAvisLeft } from '../services/avisService';
import { getOrCreateConversation } from '../services/chatService';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
const STATUT_ICONS = {
  paiement_confirme: Shield,
  en_attente_vendeur: Clock,
  preparation: Package,
  en_attente_livreur: Clock,
  prix_propose: Truck,
  livreur_assigne: Truck,
  en_route_collecte: Truck,
  depose_agence: Package,
  recupere_agence: Package,
  en_route_livraison: Truck,
  retractation: Clock,
  termine: CheckCircle,
  litige: AlertTriangle,
  annule: XCircle
};
const STATUT_COLORS = {
  paiement_confirme: 'text-primary-600 bg-primary-50',
  en_attente_vendeur: 'text-yellow-600 bg-yellow-50',
  preparation: 'text-orange-600 bg-orange-50',
  en_attente_livreur: 'text-yellow-600 bg-yellow-50',
  prix_propose: 'text-blue-600 bg-blue-50',
  livreur_assigne: 'text-blue-600 bg-blue-50',
  en_route_collecte: 'text-blue-600 bg-blue-50',
  depose_agence: 'text-blue-600 bg-blue-50',
  recupere_agence: 'text-blue-600 bg-blue-50',
  en_route_livraison: 'text-blue-600 bg-blue-50',
  retractation: 'text-orange-600 bg-orange-50',
  termine: 'text-green-600 bg-green-50',
  litige: 'text-red-600 bg-red-50',
  annule: 'text-gray-600 bg-gray-100'
};
// #bug (retour utilisateur, "les messages d'erreur affichent juste 'Erreur'") :
// chaque handler ne mappait qu'un ou deux codes précis, laissant tomber tout
// le reste (COMMANDE_INTROUVABLE, COMMANDE_AUTRUI, COMMANDE_INVALIDE,
// STATUT_INVALIDE, RETOUR_NON_ELIGIBLE, RETOUR_DEJA_PAYE...) sur le mot brut
// 'Erreur', jamais utile à l'utilisateur. Table partagée par tous les
// handlers de cette page — un handler garde son propre mapping inline pour
// un code avec un message plus précis dans son contexte (ex. SOLDE_INSUFFISANT
// côté paiement livraison vs retour), et retombe sur cette table sinon.
const ERREUR_COMMANDE_MESSAGES = {
  COMMANDE_INTROUVABLE: 'Cette commande est introuvable — elle a peut-être été supprimée.',
  COMMANDE_AUTRUI: "Vous n'êtes pas autorisé à agir sur cette commande.",
  COMMANDE_INVALIDE: 'Cette action ne correspond plus à cette commande.',
  STATUT_INVALIDE: "Cette commande n'est plus dans le bon état pour cette action.",
  COMMANDE_DEJA_FINALISEE: 'Cette commande a déjà été annulée ou finalisée.',
  RETOUR_NON_ELIGIBLE: "Le retour n'est pas (ou plus) disponible pour cette commande.",
  RETOUR_DEJA_PAYE: 'Le retour a déjà été payé pour cette commande.',
  SOLDE_INSUFFISANT: 'Solde insuffisant.',
};
const messageErreurCommande = (e, fallback = 'Une erreur est survenue — réessayez dans quelques instants.') =>
  ERREUR_COMMANDE_MESSAGES[e?.message] || fallback;
const getTimelineSteps = commande => {
  const base = [{
    statut: 'paiement_confirme',
    label: 'Paiement sécurisé',
    desc: 'Votre paiement est protégé par CamPay'
  }, {
    statut: 'en_attente_vendeur',
    label: 'Confirmation vendeur',
    desc: 'Le vendeur a confirmé la commande'
  }, {
    statut: 'preparation',
    label: 'Article prêt',
    desc: commande?.modeRemise === 'livraison' ? 'Ouvert aux livreurs de la ville du vendeur' : 'Convenez d\'un lieu et d\'une heure de remise'
  }];
  if (commande?.modeRemise !== 'livraison') {
    return [...base, {
      statut: 'retractation',
      label: 'Remise confirmée',
      desc: 'Vous avez 24h pour signaler un problème'
    }, {
      statut: 'termine',
      label: 'Terminé',
      desc: 'Transaction complétée avec succès'
    }];
  }
  const trajet = commande?.interVilles ? [{
    statut: 'en_route_collecte',
    label: 'Collecte en cours',
    desc: 'Le livreur va chercher l\'article chez le vendeur'
  }, {
    statut: 'depose_agence',
    label: 'Déposé à l\'agence',
    desc: 'L\'article est en transit entre les deux villes'
  }, {
    statut: 'recupere_agence',
    label: 'Récupéré à l\'agence',
    desc: 'Le livreur de votre ville a récupéré l\'article'
  }, {
    statut: 'en_route_livraison',
    label: 'Livraison en cours',
    desc: 'Le livreur vous apporte l\'article'
  }] : [{
    statut: 'en_route_collecte',
    label: 'Livraison en cours',
    desc: 'Le livreur a récupéré l\'article et vous l\'apporte'
  }];
  return [...base, {
    statut: 'en_attente_livreur',
    label: 'Recherche d\'un livreur',
    desc: 'En attente qu\'un livreur se propose'
  }, {
    statut: 'prix_propose',
    label: 'Frais de livraison proposés',
    desc: 'Acceptez et payez les frais pour que le livreur parte'
  }, {
    statut: 'livreur_assigne',
    label: 'Livreur en préparation',
    desc: 'Le livreur prépare son passage'
  }, ...trajet, {
    statut: 'retractation',
    label: 'Livré',
    desc: 'Vous avez 24h pour signaler un problème'
  }, {
    statut: 'termine',
    label: 'Terminé',
    desc: 'Transaction complétée avec succès'
  }];
};
export default function CommandePage() {
  const {
    id
  } = useParams();
  const {
    user,
    userProfile
  } = useAuth();
  const navigate = useNavigate();
  const [commande, setCommande] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLitige, setShowLitige] = useState(false);
  const [litigeRaison, setLitigeRaison] = useState('');
  const [litigePhotos, setLitigePhotos] = useState([]);
  const [litigeArticleLot, setLitigeArticleLot] = useState('');
  const [litigeLoading, setLitigeLoading] = useState(false);
  const [showAvis, setShowAvis] = useState(false);
  const [avisNote, setAvisNote] = useState(0);
  const [avisCommentaire, setAvisCommentaire] = useState('');
  const [avisLoading, setAvisLoading] = useState(false);
  const [avisDejaLaisse, setAvisDejaLaisse] = useState(false);
  // #nouveau (demande utilisateur, "le système de notation des livreurs
  // fonctionne vraiment ?") : jusqu'ici AUCUN flux ne créait jamais d'avis
  // avec cibleId == un livreur — la carte "Ma réputation" côté maket-livreur
  // affichait donc toujours "Aucun avis" pour tout le monde. Seul l'acheteur
  // note le(s) livreur(s) (1 ou 2 en inter-villes) qui l'ont réellement servi.
  const [showAvisLivreur, setShowAvisLivreur] = useState(null);
  const [avisLivreurNote, setAvisLivreurNote] = useState(0);
  const [avisLivreurCommentaire, setAvisLivreurCommentaire] = useState('');
  const [avisLivreurLoading, setAvisLivreurLoading] = useState(false);
  const [livreursDejaNotes, setLivreursDejaNotes] = useState({});
  // #nouveau (demande utilisateur, "les clients doivent avoir les infos du
  // livreur, photo de préférence") : rien n'affichait jamais l'identité du
  // livreur assigné — seul son prix proposé apparaissait pendant la
  // négociation. profils_publics est déjà public (photoURL/displayName).
  const [livreursProfils, setLivreursProfils] = useState({});
  const [partageLoading, setPartageLoading] = useState(false);
  const [maPositionLivraison, setMaPositionLivraison] = useState(null);
  const handlePartagerPosition = async (lat, lng) => {
    setPartageLoading(true);
    try {
      await partagerMaPosition(id, isAcheteur, lat, lng);
    } catch (e) {
      toast.error('Erreur lors du partage de votre position');
    } finally {
      setPartageLoading(false);
    }
  };
  const handleArreterPartage = async () => {
    setPartageLoading(true);
    try {
      await arreterPartagePosition(id, isAcheteur);
    } catch (e) {
      toast.error('Erreur');
    } finally {
      setPartageLoading(false);
    }
  };
  // #nouveau (demande utilisateur, "carte côté acheteur/vendeur pour voir le
  // livreur en direct") : monRoleLivraison (isAcheteur/isVendeur) défini plus
  // bas — ces deux handlers ne le lisent qu'au moment de l'appel (fermeture),
  // jamais à la définition, donc l'ordre de déclaration n'a pas d'importance ici.
  const handlePartagerPositionLivraison = async (lat, lng) => {
    setPartageLoading(true);
    try {
      await partagerPositionLivraison(id, monRoleLivraison, lat, lng);
    } catch (e) {
      toast.error('Erreur lors du partage de votre position');
    } finally {
      setPartageLoading(false);
    }
  };
  const handleArreterPartageLivraison = async () => {
    setPartageLoading(true);
    try {
      await arreterPartagePositionLivraison(id, monRoleLivraison);
    } catch (e) {
      toast.error('Erreur');
    } finally {
      setPartageLoading(false);
    }
  };
  const [preparationLoading, setPreparationLoading] = useState(false);
  const [pretLoading, setPretLoading] = useState(false);
  const [showAnnuler, setShowAnnuler] = useState(false);
  const [annulerLoading, setAnnulerLoading] = useState(false);
  const [monCode, setMonCode] = useState(null);
  const [codeSaisi, setCodeSaisi] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [monCodeCollecte, setMonCodeCollecte] = useState(null);
  const [monCodeRetour, setMonCodeRetour] = useState(null);
  const [payerLivraisonLoading, setPayerLivraisonLoading] = useState(false);
  const [payerRetourLoading, setPayerRetourLoading] = useState(false);
  const [confirmPayerLivraison, setConfirmPayerLivraison] = useState(false);
  const [confirmPayerRetour, setConfirmPayerRetour] = useState(false);
  const [refuserLivraisonLoading, setRefuserLivraisonLoading] = useState(false);
  const [contrePropositionLoading, setContrePropositionLoading] = useState(false);
  const [showContreProposition, setShowContreProposition] = useState(false);
  const [montantContreProposition, setMontantContreProposition] = useState('');
  useEffect(() => {
    if (!id) return;
    const unsub = listenCommande(id, data => {
      setCommande(data);
      setLoading(false);
      finaliserCommandeSiExpiree(id, data).catch(e => console.error('finaliserCommandeSiExpiree a échoué :', e));
      annulerSiVendeurExpire(id, data).catch(e => console.error('annulerSiVendeurExpire a échoué :', e));
      annulerSiLivraisonExpire(id, data).catch(e => console.error('annulerSiLivraisonExpire a échoué :', e));
    });
    return unsub;
  }, [id]);
  const isAcheteur = commande?.acheteurId === user?.uid;
  const isVendeur = commande?.vendeurId === user?.uid;
  // #nouveau (demande utilisateur, "carte côté acheteur/vendeur pour voir le
  // livreur en direct") : mon rôle réel dans CETTE commande, jamais les deux
  // — sert à savoir quel champ demandePosition.role me concerne et sous
  // quel rôle partager ma position (positions/{role}).
  const monRoleLivraison = isAcheteur ? 'acheteur' : isVendeur ? 'vendeur' : null;
  const STATUTS_TRAJET_ACTIF = [STATUTS_COMMANDE.LIVREUR_ASSIGNE, STATUTS_COMMANDE.EN_ROUTE_COLLECTE, STATUTS_COMMANDE.DEPOSE_AGENCE, STATUTS_COMMANDE.RECUPERE_AGENCE, STATUTS_COMMANDE.EN_ROUTE_LIVRAISON];
  useEffect(() => {
    if (!id || !monRoleLivraison || !commande || commande.modeRemise !== 'livraison' || !STATUTS_TRAJET_ACTIF.includes(commande.statut)) {
      setMaPositionLivraison(null);
      return;
    }
    return listenMaPositionLivraison(id, monRoleLivraison, setMaPositionLivraison);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, monRoleLivraison, commande?.statut, commande?.modeRemise]);
  useEffect(() => {
    if (!id || !isAcheteur || !commande) {
      setMonCode(null);
      return;
    }
    const statutsAffichage = commande.modeRemise === 'livraison' ? [STATUTS_COMMANDE.EN_ROUTE_COLLECTE, STATUTS_COMMANDE.EN_ROUTE_LIVRAISON] : [STATUTS_COMMANDE.PAIEMENT_CONFIRME, STATUTS_COMMANDE.EN_ATTENTE_VENDEUR, STATUTS_COMMANDE.PREPARATION];
    if (!statutsAffichage.includes(commande.statut)) return;
    getCodeRemise(id).then(setMonCode).catch(() => {});
  }, [id, isAcheteur, commande?.statut, commande?.modeRemise]);
  useEffect(() => {
    if (!id || !isVendeur || !commande || commande.modeRemise !== 'livraison') {
      setMonCodeCollecte(null);
      return;
    }
    if (![STATUTS_COMMANDE.EN_ATTENTE_LIVREUR, STATUTS_COMMANDE.PRIX_PROPOSE, STATUTS_COMMANDE.LIVREUR_ASSIGNE].includes(commande.statut)) return;
    getCodeCollecte(id).then(setMonCodeCollecte).catch(() => {});
  }, [id, isVendeur, commande?.statut, commande?.modeRemise]);
  // #nouveau (demande utilisateur, "que le vendeur confirme aussi qu'il a
  // reçu sa commande") : le code existe dès le paiement du retour ('paye'),
  // pas seulement une fois le livreur en route ('collecte') — le vendeur
  // peut ainsi le retrouver à tout moment sur cette page.
  useEffect(() => {
    if (!id || !isVendeur || !commande || !['paye', 'collecte'].includes(commande.retourStatut)) {
      setMonCodeRetour(null);
      return;
    }
    getCodeRetourRemise(id).then(setMonCodeRetour).catch(() => {});
  }, [id, isVendeur, commande?.retourStatut]);
  useEffect(() => {
    if (commande?.statut === 'termine' && user) {
      const cibleId = isAcheteur ? commande.vendeurId : commande.acheteurId;
      hasAvisLeft(id, user.uid, cibleId).then(setAvisDejaLaisse).catch(e => console.error('hasAvisLeft a échoué :', e));
    }
  }, [commande?.statut, user, id]);
  const livreurIds = commande?.modeRemise === 'livraison'
    ? [...new Set([commande.livreurCollecteId, commande.livreurLivraisonId].filter(Boolean))]
    : [];
  useEffect(() => {
    const manquants = livreurIds.filter(lid => !livreursProfils[lid]);
    if (manquants.length === 0) return;
    Promise.all(manquants.map(lid => getDoc(doc(db, 'profils_publics', lid)).then(s => [lid, s.exists() ? s.data() : null])))
      .then(entries => setLivreursProfils(prev => ({ ...prev, ...Object.fromEntries(entries) })))
      .catch(e => console.error('Chargement profil livreur échoué :', e));
  }, [livreurIds.join(',')]);
  useEffect(() => {
    if (commande?.statut !== 'termine' || !isAcheteur || !user || livreurIds.length === 0) return;
    Promise.all(livreurIds.map(lid => hasAvisLeft(id, user.uid, lid).then(deja => [lid, deja])))
      .then(entries => setLivreursDejaNotes(Object.fromEntries(entries)))
      .catch(e => console.error('hasAvisLeft (livreur) a échoué :', e));
  }, [commande?.statut, isAcheteur, user, id, livreurIds.join(',')]);
  const handleLaisserAvisLivreur = async () => {
    if (avisLivreurNote < 1) {
      toast.error('Sélectionnez une note');
      return;
    }
    setAvisLivreurLoading(true);
    try {
      await laisserAvis(id, user.uid, showAvisLivreur, avisLivreurNote, avisLivreurCommentaire);
      toast.success('Avis publié, merci !');
      setLivreursDejaNotes(prev => ({ ...prev, [showAvisLivreur]: true }));
      setShowAvisLivreur(null);
      setAvisLivreurNote(0);
      setAvisLivreurCommentaire('');
    } catch (e) {
      toast.error(e.message || 'Erreur');
    } finally {
      setAvisLivreurLoading(false);
    }
  };
  const handleLaisserAvis = async () => {
    if (avisNote < 1) {
      toast.error('Sélectionnez une note');
      return;
    }
    setAvisLoading(true);
    try {
      const cibleId = isAcheteur ? commande.vendeurId : commande.acheteurId;
      await laisserAvis(id, user.uid, cibleId, avisNote, avisCommentaire);
      toast.success('Avis publié, merci !');
      setAvisDejaLaisse(true);
      setShowAvis(false);
    } catch (e) {
      toast.error(e.message || 'Erreur');
    } finally {
      setAvisLoading(false);
    }
  };
  const timelineSteps = getTimelineSteps(commande);
  const currentStepIndex = timelineSteps.findIndex(s => s.statut === commande?.statut);
  const handleConfirmerPreparation = async () => {
    setPreparationLoading(true);
    try {
      await confirmerPreparation(id);
      toast.success('Commande confirmée ! Organisez la remise avec l\'acheteur via le chat.');
    } catch (e) {
      toast.error(messageErreurCommande(e));
    } finally {
      setPreparationLoading(false);
    }
  };
  const handleMarquerPret = async () => {
    setPretLoading(true);
    try {
      await marquerArticlePret(id);
      toast.success('Article marqué prêt !');
    } catch (e) {
      toast.error(messageErreurCommande(e));
    } finally {
      setPretLoading(false);
    }
  };
  const handleConfirmerRemise = async () => {
    if (codeSaisi.trim().length !== 4) {
      toast.error('Le code fait 4 chiffres');
      return;
    }
    setCodeLoading(true);
    try {
      await confirmerRemiseParCode(id, codeSaisi.trim());
      toast.success('Remise confirmée ! Le paiement sera libéré sous 24h.');
      setCodeSaisi('');
    } catch (e) {
      toast.error(e.message === 'CODE_INVALIDE' ? 'Code incorrect — demandez-le à nouveau à l\'acheteur.' : e.message === 'TROP_TENTATIVES' ? 'Trop de tentatives incorrectes — contactez le support MAKET pour débloquer cette commande.' : messageErreurCommande(e));
    } finally {
      setCodeLoading(false);
    }
  };
  // #nouveau (campagne de lancement) : solde bonus utilisé en priorité s'il
  // couvre le montant — argent "à dépenser sur la plateforme", jamais
  // convertible, donc plus logique de le consommer avant le solde principal.
  const payerLivraisonAvecBonus = (userProfile?.soldeBonus || 0) >= fraisLivraisonTotal && fraisLivraisonTotal > 0;
  const handlePayerLivraison = async () => {
    setConfirmPayerLivraison(false);
    setPayerLivraisonLoading(true);
    try {
      await payerFraisLivraison(id, user.uid, payerLivraisonAvecBonus ? 'bonus' : 'principal');
      toast.success('Frais de livraison payés ! Le livreur va venir chercher l\'article.');
    } catch (e) {
      toast.error(e.message === 'SOLDE_INSUFFISANT' ? 'Solde insuffisant pour payer les frais de livraison.' : messageErreurCommande(e));
    } finally {
      setPayerLivraisonLoading(false);
    }
  };
  const handlePayerRetour = async () => {
    setConfirmPayerRetour(false);
    setPayerRetourLoading(true);
    try {
      await payerRetourLivraison(id, user.uid);
      toast.success('Retour payé ! Le livreur va récupérer le colis chez l\'acheteur.');
    } catch (e) {
      toast.error(e.message === 'SOLDE_INSUFFISANT' ? 'Solde insuffisant pour payer le retour — rechargez votre solde puis réessayez.' : messageErreurCommande(e));
    } finally {
      setPayerRetourLoading(false);
    }
  };
  const handleRefuserLivraison = async () => {
    setRefuserLivraisonLoading(true);
    try {
      await refuserPrixLivraison(id, user.uid);
      toast.success('Proposition refusée — en attente d\'un nouveau livreur.');
    } catch (e) {
      if (e.message === 'LIMITE_REFUS_ATTEINTE') {
        toast.error('Vous avez atteint la limite de refus gratuits pour cette commande. Annulez-la si vous ne souhaitez plus continuer.', { duration: 7000 });
      } else {
        toast.error(e.message === 'STATUT_INVALIDE' ? 'Cette proposition n\'est plus valide.' : messageErreurCommande(e));
      }
    } finally {
      setRefuserLivraisonLoading(false);
    }
  };
  const handleContreProposition = async () => {
    const montant = parseInt(montantContreProposition, 10);
    if (!(montant > 0)) {
      toast.error('Entrez un montant valide.');
      return;
    }
    setContrePropositionLoading(true);
    try {
      await contrePropositionAcheteur(id, user.uid, montant);
      toast.success('Contre-proposition envoyée au livreur.');
      setShowContreProposition(false);
      setMontantContreProposition('');
    } catch (e) {
      const messages = {
        MONTANT_INVALIDE: 'Entrez un montant valide.',
        MONTANT_TROP_ELEVE: 'Ce montant dépasse le maximum autorisé.',
        PAS_VOTRE_TOUR: "Ce n'est pas votre tour — attendez la réponse du livreur.",
        LIMITE_NEGOCIATION_ATTEINTE: 'Vous avez atteint la limite de contre-propositions pour cette commande.',
        STATUT_INVALIDE: "Cette proposition n'est plus valide."
      };
      toast.error(messages[e.message] || messageErreurCommande(e));
    } finally {
      setContrePropositionLoading(false);
    }
  };
  const handleAnnuler = async () => {
    setAnnulerLoading(true);
    try {
      await annulerCommande(id, user.uid);
      toast.success('Commande annulée. Remboursement intégral en cours.');
      setShowAnnuler(false);
    } catch (e) {
      toast.error(messageErreurCommande(e));
    } finally {
      setAnnulerLoading(false);
    }
  };
  const handleContacter = async autreUserId => {
    try {
      const convId = await getOrCreateConversation(user.uid, autreUserId, commande.annonceId);
      navigate(`/chat/${convId}`);
    } catch (e) {
      toast.error('Impossible d\'ouvrir la conversation');
    }
  };
  const handleLitige = async () => {
    if (!litigeRaison) {
      toast.error('Précisez la raison du litige');
      return;
    }
    if (litigePhotos.length === 0) {
      toast.error('Ajoutez au moins une photo comme preuve');
      return;
    }
    setLitigeLoading(true);
    try {
      await ouvrirLitige(id, user.uid, litigeRaison, litigePhotos, commande.estLot ? litigeArticleLot.trim() || null : null);
      toast.success('Litige ouvert. Notre équipe tranchera dans les 48h.');
      setShowLitige(false);
    } catch (e) {
      toast.error(e.message === 'STATUT_INVALIDE' ? 'Cette commande n\'est plus dans la période de rétractation.' : messageErreurCommande(e));
    } finally {
      setLitigeLoading(false);
    }
  };
  if (loading) return <div className="max-w-2xl mx-auto px-6 py-8 space-y-4">
      {Array(4).fill(0).map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse"></div>)}
    </div>;
  if (!commande) return <div className="max-w-2xl mx-auto px-6 py-16 text-center">
      <p className="text-gray-500">Commande introuvable</p>
      <Link to="/mon-compte/achats" className="btn-primary mt-4 inline-flex">Mes achats</Link>
    </div>;
  const StatutIcon = STATUT_ICONS[commande.statut] || Clock;
  const statutColor = STATUT_COLORS[commande.statut] || 'text-gray-600 bg-gray-100';
  const estLivraison = commande.modeRemise === 'livraison';
  const remiseEnCours = !estLivraison && [STATUTS_COMMANDE.EN_ATTENTE_VENDEUR, STATUTS_COMMANDE.PREPARATION].includes(commande.statut);
  const fraisLivraisonTotal = (commande.fraisLivraison || 0) + (commande.interVilles ? commande.fraisLivraisonInterVilles || 0 : 0);
  const enTransitLivraison = [STATUTS_COMMANDE.EN_ROUTE_COLLECTE, STATUTS_COMMANDE.DEPOSE_AGENCE, STATUTS_COMMANDE.RECUPERE_AGENCE, STATUTS_COMMANDE.EN_ROUTE_LIVRAISON].includes(commande.statut);
  return <>
    <div className="max-w-2xl mx-auto px-6 py-8 print:hidden">
      {}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-gray-600 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>

      {}
      <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} className={`rounded-2xl p-6 mb-6 ${statutColor}`}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/60 rounded-xl flex items-center justify-center">
            <StatutIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold opacity-70">Statut actuel</p>
            <h2 className="text-xl font-black" style={{
              fontFamily: 'var(--font-display)'
            }}>{STATUT_LABELS[commande.statut]}</h2>
          </div>
        </div>
        <p className="text-sm mt-3 opacity-80">Commande #{id.slice(0, 8).toUpperCase()}</p>
      </motion.div>

      {}
      {commande.statut !== 'annule' && commande.statut !== 'litige' && <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h3 className="font-bold mb-5" style={{
          fontFamily: 'var(--font-display)'
        }}>Suivi de commande</h3>
          <div className="space-y-0">
            {timelineSteps.map((step, i) => {
            const isDone = currentStepIndex > i;
            const isCurrent = currentStepIndex === i;
            const isPending = currentStepIndex < i;
            return <div key={step.statut} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${isDone ? 'bg-green-500' : isCurrent ? 'bg-primary-600' : 'bg-gray-200'}`}>
                      {isDone ? <CheckCircle className="w-4 h-4 text-white" /> : isCurrent ? <div className="w-3 h-3 bg-white rounded-full animate-pulse" /> : <div className="w-2 h-2 bg-gray-400 rounded-full" />}
                    </div>
                    {i < timelineSteps.length - 1 && <div className={`w-0.5 h-10 mt-1 ${isDone ? 'bg-green-400' : 'bg-gray-200'}`}></div>}
                  </div>
                  <div className="pb-8 flex-1">
                    <p className={`font-semibold text-sm ${isPending ? 'text-gray-400' : 'text-gray-900'}`}>{step.label}</p>
                    <p className={`text-xs mt-0.5 ${isPending ? 'text-gray-300' : 'text-gray-500'}`}>{step.desc}</p>
                    {isCurrent && commande.historiqueStatuts?.find(h => h.statut === step.statut) && <p className="text-xs text-primary-500 mt-1 font-medium">
                        {new Date(commande.historiqueStatuts.find(h => h.statut === step.statut).date).toLocaleString('fr-FR')}
                      </p>}
                  </div>
                </div>;
          })}
          </div>
        </div>}

      {}
      {isVendeur && commande.statut === 'annule' && commande.retourEligible && <div className="bg-white rounded-2xl border-2 border-orange-100 p-5 mb-6">
          <h3 className="font-bold mb-2" style={{
          fontFamily: 'var(--font-display)'
        }}>Retour de l'article</h3>
          {!commande.retourStatut && <>
              <p className="text-sm text-gray-600 mb-4">
                Le litige a été tranché en faveur de l'acheteur : l'article doit vous être retourné. En payant le double des frais de livraison
                ({(2 * ((commande.fraisLivraison || 0) + (commande.interVilles ? commande.fraisLivraisonInterVilles || 0 : 0))).toLocaleString('fr-FR')} XAF),
                le livreur qui a effectué la livraison ira récupérer le colis chez l'acheteur et vous le remettra.
              </p>
              <button onClick={() => setConfirmPayerRetour(true)} disabled={payerRetourLoading} className="btn-primary w-full justify-center py-3 text-sm">
                {payerRetourLoading ? 'Paiement…' : 'Payer le retour'}
              </button>
            </>}
          {commande.retourStatut === 'paye' && <p className="text-sm text-orange-600 font-medium">Retour payé — le livreur va récupérer le colis chez l'acheteur.</p>}
          {commande.retourStatut === 'collecte' && <p className="text-sm text-orange-600 font-medium">Le livreur a récupéré le colis et est en route pour vous le remettre.</p>}
          {commande.retourStatut === 'termine' && <p className="text-sm text-green-600 font-medium">Retour terminé — l'article vous a été remis.</p>}
        </div>}

      {}
      {isAcheteur && monCode && remiseEnCours && <div className="bg-white rounded-2xl border-2 border-primary-100 p-5 mb-6 text-center">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Votre code de remise</p>
          <p className="text-4xl font-black text-primary-600 tracking-[0.3em]" style={{
          fontFamily: 'var(--font-display)'
        }}>{monCode}</p>
          <p className="text-xs text-gray-500 mt-3">Donnez ce code au vendeur au moment de la remise en main propre — c'est ce qui libère votre paiement.</p>
        </div>}

      {}
      {isVendeur && remiseEnCours && <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <KeyRound className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="font-bold text-sm">Code de remise du client</p>
              <p className="text-xs text-gray-500">Demandez-le à l'acheteur au moment de la remise</p>
            </div>
          </div>
          <div className="flex gap-2">
            <input value={codeSaisi} onChange={e => setCodeSaisi(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="0000" inputMode="numeric" maxLength={4} className="input-field text-center text-lg font-bold tracking-[0.3em] flex-1" />
            <button onClick={handleConfirmerRemise} disabled={codeLoading || codeSaisi.length !== 4} className="btn-primary px-6">
              {codeLoading ? '…' : 'Valider'}
            </button>
          </div>
        </div>}

      {}
      {isVendeur && monCodeCollecte && <div className="bg-white rounded-2xl border-2 border-primary-100 p-5 mb-6 text-center">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Votre code de ramassage</p>
          <p className="text-4xl font-black text-primary-600 tracking-[0.3em]" style={{
          fontFamily: 'var(--font-display)'
        }}>{monCodeCollecte}</p>
          <p className="text-xs text-gray-500 mt-3">Donnez ce code au livreur quand il vient chercher l'article — c'est ce qui lui permet de partir avec.</p>
        </div>}

      {}
      {isVendeur && monCodeRetour && <div className="bg-white rounded-2xl border-2 border-orange-100 p-5 mb-6 text-center">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Votre code de confirmation de retour</p>
          <p className="text-4xl font-black text-orange-600 tracking-[0.3em]" style={{
          fontFamily: 'var(--font-display)'
        }}>{monCodeRetour}</p>
          <p className="text-xs text-gray-500 mt-3">Donnez ce code au livreur quand il vous remet l'article — c'est ce qui confirme que vous l'avez bien reçu.</p>
        </div>}

      {}
      {isAcheteur && monCode && estLivraison && [STATUTS_COMMANDE.EN_ROUTE_COLLECTE, STATUTS_COMMANDE.EN_ROUTE_LIVRAISON].includes(commande.statut) && <div className="bg-white rounded-2xl border-2 border-primary-100 p-5 mb-6 text-center">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Votre code de remise</p>
          <p className="text-4xl font-black text-primary-600 tracking-[0.3em]" style={{
          fontFamily: 'var(--font-display)'
        }}>{monCode}</p>
          <p className="text-xs text-gray-500 mt-3">Donnez ce code au livreur quand il vous remet l'article — c'est ce qui libère votre paiement.</p>
        </div>}

      {}
      {estLivraison && commande.statut === STATUTS_COMMANDE.EN_ATTENTE_LIVREUR && <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 flex items-start gap-3">
          <Truck className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm">En attente d'un livreur</p>
            <p className="text-xs text-gray-500 mt-1">
              {commande.adresseLivraison?.ville ? `Visible par les livreurs de ${commande.adressePickup?.ville || 'la ville du vendeur'}${commande.interVilles ? ` et de ${commande.adresseLivraison.ville}` : ''}.` : 'Visible par les livreurs de la ville du vendeur.'} Dès qu'un livreur propose un prix, vous serez notifié pour l'accepter et le payer.
            </p>
          </div>
        </div>}

      {}
      {estLivraison && commande.statut === STATUTS_COMMANDE.PRIX_PROPOSE && (isAcheteur ? <div className="bg-white rounded-2xl border-2 border-blue-100 p-5 mb-6">
            {(commande.negociationProposePar || 'livreur') === 'acheteur' ? <>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Votre contre-proposition : {fraisLivraisonTotal.toLocaleString('fr-FR')} XAF</p>
                    <p className="text-xs text-gray-500">En attente de la réponse du livreur</p>
                  </div>
                </div>
                <button onClick={handleRefuserLivraison} disabled={refuserLivraisonLoading} className="btn-outline w-full justify-center py-3 text-sm">
                  {refuserLivraisonLoading ? '…' : 'Annuler la négociation'}
                </button>
              </> : <>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Truck className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Un livreur propose {fraisLivraisonTotal.toLocaleString('fr-FR')} XAF</p>
                    <p className="text-xs text-gray-500">Frais de livraison — rien n'est engagé tant que vous n'avez pas accepté</p>
                  </div>
                </div>
                {showContreProposition ? <div className="mb-3">
                    <div className="flex gap-2">
                      <input type="number" min="1" value={montantContreProposition} onChange={e => setMontantContreProposition(e.target.value)} placeholder="Votre prix (XAF)" className="input-field text-sm flex-1" />
                      <button onClick={handleContreProposition} disabled={contrePropositionLoading} className="btn-primary px-4 text-sm">
                        {contrePropositionLoading ? '…' : 'Envoyer'}
                      </button>
                    </div>
                    <button onClick={() => setShowContreProposition(false)} className="text-xs text-gray-400 mt-1.5">Annuler</button>
                  </div> : <div className="flex gap-3">
                    <button onClick={handleRefuserLivraison} disabled={refuserLivraisonLoading} className="btn-outline flex-1 justify-center py-3 text-sm">
                      {refuserLivraisonLoading ? '…' : 'Refuser ce prix'}
                    </button>
                    <button onClick={() => setConfirmPayerLivraison(true)} disabled={payerLivraisonLoading} className="btn-primary flex-1 justify-center py-3 text-sm">
                      {payerLivraisonLoading ? '…' : `Accepter et payer`}
                    </button>
                  </div>}
                {!showContreProposition && !commande.interVilles && <button onClick={() => setShowContreProposition(true)} className="text-xs font-semibold text-primary-600 mt-2 w-full text-center">
                    Proposer un autre prix
                  </button>}
                <p className="text-xs text-gray-400 mt-2 text-center">Refuser ce prix ne coûte rien et ne touche pas à votre achat — la commande repasse en attente d'un autre livreur.</p>
              </>}
          </div> : <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">{(commande.negociationProposePar || 'livreur') === 'acheteur' ? "L'acheteur a proposé un autre prix" : "En attente de paiement de l'acheteur"}</p>
              <p className="text-xs text-gray-500 mt-1">{(commande.negociationProposePar || 'livreur') === 'acheteur' ? `L'acheteur propose ${fraisLivraisonTotal.toLocaleString('fr-FR')} XAF au lieu du prix initial — le livreur peut l'accepter ou faire une contre-proposition depuis son app.` : `Un livreur a proposé ${fraisLivraisonTotal.toLocaleString('fr-FR')} XAF de frais — dès que l'acheteur les accepte et les paie, le livreur pourra venir chercher l'article.`}</p>
            </div>
          </div>)}

      {}
      {estLivraison && (commande.statut === STATUTS_COMMANDE.LIVREUR_ASSIGNE || enTransitLivraison) && <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 flex items-start gap-3">
          <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm">{STATUT_LABELS[commande.statut]}</p>
            <p className="text-xs text-gray-500 mt-1">
              {commande.statut === STATUTS_COMMANDE.LIVREUR_ASSIGNE && 'Le livreur va bientôt venir chercher l\'article chez le vendeur.'}
              {commande.statut === STATUTS_COMMANDE.EN_ROUTE_COLLECTE && (commande.interVilles ? 'Le livreur récupère l\'article avant de le déposer à l\'agence de transport.' : 'Le livreur a récupéré l\'article et se dirige vers vous.')}
              {commande.statut === STATUTS_COMMANDE.DEPOSE_AGENCE && 'L\'article est en transit entre les deux villes via l\'agence de transport partenaire.'}
              {commande.statut === STATUTS_COMMANDE.RECUPERE_AGENCE && 'Le livreur de votre ville a récupéré l\'article à l\'agence.'}
              {commande.statut === STATUTS_COMMANDE.EN_ROUTE_LIVRAISON && 'Le livreur se dirige vers vous pour la remise finale.'}
            </p>
          </div>
        </div>}

      {}
      {estLivraison && (commande.statut === STATUTS_COMMANDE.LIVREUR_ASSIGNE || enTransitLivraison) && livreurIds.length > 0 && <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 space-y-3">
          {livreurIds.map(lid => {
          const p = livreursProfils[lid];
          return <div key={lid} className="flex items-center gap-3">
                {p?.photoURL ? <img src={p.photoURL} alt="" className="w-11 h-11 rounded-full object-cover flex-shrink-0" /> : <div className="w-11 h-11 rounded-full bg-primary-100 text-primary-600 font-bold flex items-center justify-center flex-shrink-0">
                    {(p?.pseudo || p?.displayName || '?')[0]?.toUpperCase()}
                  </div>}
                <div>
                  <p className="font-bold text-sm">{p?.pseudo || p?.displayName || 'Votre livreur'}</p>
                  <p className="text-xs text-gray-500">{livreurIds.length > 1 ? (lid === commande.livreurCollecteId ? 'Collecte' : 'Livraison finale') : 'Livreur'}</p>
                </div>
              </div>;
        })}
        </div>}

      {}
      {commande.modeRemise === 'main_propre' && !['termine', 'annule'].includes(commande.statut) && (isAcheteur || isVendeur) && <MainPropreMap
          positionAcheteur={commande.positionAcheteur}
          positionVendeur={commande.positionVendeur}
          maPosition={isAcheteur ? commande.positionAcheteur : commande.positionVendeur}
          autrePosition={isAcheteur ? commande.positionVendeur : commande.positionAcheteur}
          onPartager={handlePartagerPosition}
          onArreter={handleArreterPartage}
          partageLoading={partageLoading}
        />}

      {}
      {commande.modeRemise === 'livraison' && monRoleLivraison && (STATUTS_TRAJET_ACTIF.includes(commande.statut) || ['paye', 'collecte'].includes(commande.retourStatut)) && <LivraisonMap
          livreurPosition={commande.livreurPosition}
          destination={isAcheteur ? commande.destinationGeocode : commande.pickupGeocode}
          maPosition={maPositionLivraison}
          demandeActive={commande.demandePosition?.role === monRoleLivraison}
          onPartager={handlePartagerPositionLivraison}
          onArreter={handleArreterPartageLivraison}
          partageLoading={partageLoading}
        />}

      {}
      {commande.modeRemise === 'livraison' && monRoleLivraison && (STATUTS_TRAJET_ACTIF.includes(commande.statut) || ['paye', 'collecte'].includes(commande.retourStatut)) && <div className="mb-6">
          <Suspense fallback={null}>
            <CallWidget
              commandeId={id}
              contexte={isAcheteur ? 'acheteur' : 'vendeur'}
              appelEnCours={commande.appelEnCours}
              currentUid={user?.uid}
              label="Appeler le livreur"
            />
          </Suspense>
        </div>}

      {}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
        <h3 className="font-bold mb-4" style={{
          fontFamily: 'var(--font-display)'
        }}>Détails</h3>
        <div className="space-y-3">
          {[{
            label: 'Montant article',
            value: `${commande.montant?.toLocaleString()} XAF`,
            bold: true,
            color: 'text-primary-600'
          }, {
            label: 'Remise',
            value: estLivraison ? `🚚 Livraison${commande.interVilles ? ' (inter-villes)' : ''}` : '🤝 Main propre'
          }, ...(estLivraison && commande.adresseLivraison?.ville ? [{
            label: 'Adresse de livraison',
            value: `${commande.adresseLivraison.quartier ? commande.adresseLivraison.quartier + ', ' : ''}${commande.adresseLivraison.ville}`
          }] : []), ...(estLivraison && fraisLivraisonTotal > 0 ? [{
            label: 'Frais de livraison',
            value: `${fraisLivraisonTotal.toLocaleString('fr-FR')} XAF`
          }] : []), {
            label: 'Paiement sécurisé',
            value: commande.escrowActif ? '🔒 Oui — Argent sécurisé' : '🔓 Non',
            color: commande.escrowActif ? 'text-green-600' : 'text-gray-500'
          }].map(item => <div key={item.label} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
              <span className="text-sm text-gray-500">{item.label}</span>
              <span className={`text-sm font-semibold ${item.color || 'text-gray-900'}`}>{item.value}</span>
            </div>)}
        </div>
      </div>

      {}
      {/* #nouveau (demande utilisateur, clarification) : "CamPay" ne
          protège que le DÉPÔT/RETRAIT (le transfert d'argent réel avec
          l'opérateur mobile money) — une fois l'argent déposé sur le solde
          MAKET, c'est l'escrow MAKET (ce statut de commande, ce blocage
          jusqu'à confirmation) qui le protège, plus CamPay. L'ancien libellé
          "Paiement sécurisé CamPay" laissait croire l'inverse. */}
      <div className="bg-primary-50 rounded-2xl p-4 border border-primary-100 mb-6 flex items-start gap-3">
        <Shield className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-primary-700">Paiement sécurisé MAKET</p>
          <p className="text-xs text-primary-600 mt-1">
            {commande.statut === 'termine' ? 'Le paiement a été libéré au vendeur avec succès.' : commande.statut === 'retractation' ? 'Vous avez 24h pour signaler un problème. Passé ce délai, le vendeur sera payé automatiquement.' : 'Votre argent est bloqué en sécurité sur MAKET jusqu\'à confirmation de la remise (CamPay n\'intervient que pour le dépôt/retrait de votre solde, pas pour cette protection).'}
          </p>
        </div>
      </div>

      {}
      <div className="space-y-3">
        {}
        {isVendeur && commande.statut === STATUTS_COMMANDE.PAIEMENT_CONFIRME && <button onClick={handleConfirmerPreparation} disabled={preparationLoading} className="btn-primary w-full justify-center py-3.5">
            <Package className="w-5 h-5" />
            {preparationLoading ? 'Envoi…' : 'Confirmer la commande'}
          </button>}

        {}
        {isVendeur && commande.statut === STATUTS_COMMANDE.EN_ATTENTE_VENDEUR && <button onClick={handleMarquerPret} disabled={pretLoading} className="btn-primary w-full justify-center py-3.5">
            <Package className="w-5 h-5" />
            {pretLoading ? 'Envoi…' : 'Marquer l\'article comme prêt'}
          </button>}

        {}
        {isVendeur && commande.statut === STATUTS_COMMANDE.PREPARATION && commande.modeRemise === 'livraison' && <button onClick={handleMarquerPret} disabled={pretLoading} className="btn-primary w-full justify-center py-3.5">
            <Package className="w-5 h-5" />
            {pretLoading ? 'Envoi…' : 'Réessayer l\'ouverture aux livreurs'}
          </button>}

        {}
        {isAcheteur && commande.statut === STATUTS_COMMANDE.RETRACTATION && <button onClick={() => setShowLitige(true)} className="w-full flex items-center justify-center gap-2 py-3 border-2 border-red-200 text-red-600 rounded-xl font-semibold hover:bg-red-50 transition-colors">
            <AlertTriangle className="w-4 h-4" />
            Signaler un problème (litige)
          </button>}

        {}
        {commande.statut === 'termine' && (isAcheteur || isVendeur) && <button onClick={() => window.print()} className="btn-outline w-full justify-center py-3 text-sm">
            Imprimer / télécharger le reçu
          </button>}

        {}
        {commande.statut === 'termine' && (isAcheteur || isVendeur) && (avisDejaLaisse ? <div className="w-full flex items-center justify-center gap-2 py-3 bg-gray-50 text-gray-400 rounded-xl font-semibold text-sm">
              <Star className="w-4 h-4" /> Avis déjà envoyé, merci !
            </div> : <button onClick={() => setShowAvis(true)} className="btn-primary w-full justify-center py-3.5">
              <Star className="w-4 h-4" />
              Laisser un avis {isAcheteur ? 'au vendeur' : 'à l\'acheteur'}
            </button>)}

        {}
        {commande.statut === 'termine' && isAcheteur && livreurIds.map(lid => livreursDejaNotes[lid] ? <div key={lid} className="w-full flex items-center justify-center gap-2 py-3 bg-gray-50 text-gray-400 rounded-xl font-semibold text-sm">
              <Star className="w-4 h-4" /> Avis livreur déjà envoyé, merci !
            </div> : <button key={lid} onClick={() => setShowAvisLivreur(lid)} className="btn-outline w-full justify-center py-3.5 text-sm">
              <Star className="w-4 h-4" />
              Laisser un avis au livreur{livreurIds.length > 1 ? (lid === commande.livreurCollecteId ? ' (collecte)' : ' (livraison)') : ''}
            </button>)}

        {}
        {[STATUTS_COMMANDE.PAIEMENT_CONFIRME, STATUTS_COMMANDE.EN_ATTENTE_VENDEUR, STATUTS_COMMANDE.PREPARATION, STATUTS_COMMANDE.EN_ATTENTE_LIVREUR, STATUTS_COMMANDE.PRIX_PROPOSE, STATUTS_COMMANDE.LIVREUR_ASSIGNE].includes(commande.statut) && <button onClick={() => setShowAnnuler(true)} className="w-full flex items-center justify-center gap-2 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-colors text-sm">
            <XCircle className="w-4 h-4" />
            Annuler la commande
          </button>}

        {}
        <button onClick={() => handleContacter(isAcheteur ? commande.vendeurId : commande.acheteurId)} className="w-full flex items-center justify-center gap-2 py-3 border-2 border-primary-200 text-primary-600 rounded-xl font-semibold hover:bg-primary-50 transition-colors text-sm">
          Contacter {isAcheteur ? 'le vendeur' : 'l\'acheteur'}
        </button>
      </div>

      {}
      {showLitige && <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <motion.div initial={{
          opacity: 0,
          scale: 0.95
        }} animate={{
          opacity: 1,
          scale: 1
        }} className="bg-white rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold" style={{
                fontFamily: 'var(--font-display)'
              }}>Ouvrir un litige</h3>
                <p className="text-xs text-gray-500">Notre équipe tranchera dans les 48h</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Raison du litige *</label>
                <select value={litigeRaison} onChange={e => setLitigeRaison(e.target.value)} className="input-field text-sm">
                  <option value="">Sélectionner une raison</option>
                  <option>Article ne correspond pas à la vidéo</option>
                  <option>Défaut non mentionné dans la vidéo</option>
                  <option>Article endommagé</option>
                  <option>Article non remis</option>
                  <option>Article différent de l'annonce</option>
                </select>
              </div>

              {commande.estLot && <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Quel article du lot pose problème ? (optionnel)</label>
                {commande.articlesLot?.length > 0 ? <select value={litigeArticleLot} onChange={e => setLitigeArticleLot(e.target.value)} className="input-field text-sm">
                    <option value="">Non précisé / plusieurs articles</option>
                    {commande.articlesLot.map((a, i) => <option key={i} value={a}>{a}</option>)}
                  </select> : <input type="text" value={litigeArticleLot} onChange={e => setLitigeArticleLot(e.target.value)} placeholder="Ex: le sac à main bleu" maxLength={100} className="input-field text-sm" />}
                <p className="text-xs text-gray-400 mt-1">Aide notre équipe à traiter votre litige — la décision reste sur l'ensemble du lot.</p>
              </div>}

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Photos/vidéos preuves * (obligatoire)</label>
                <label className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center cursor-pointer hover:border-red-400 hover:bg-red-50 transition-all">
                  <span className="text-2xl mb-1">📸</span>
                  <span className="text-sm text-gray-500">Ajouter des photos ou vidéos ({litigePhotos.length})</span>
                  <input type="file" accept="image/*,video/*" multiple onChange={e => setLitigePhotos(Array.from(e.target.files))} className="hidden" />
                </label>
              </div>

              <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                <p className="text-xs text-amber-700 font-semibold">Important</p>
                <p className="text-xs text-amber-600 mt-1">La décision de l'équipe MAKET est finale et irrévocable. Les deux parties seront contactées pour soumettre leurs preuves.</p>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowLitige(false)} className="btn-outline flex-1 justify-center py-3 text-sm">
                Annuler
              </button>
              <button onClick={handleLitige} disabled={litigeLoading} className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600 transition-colors flex items-center justify-center gap-2 text-sm">
                {litigeLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <AlertTriangle className="w-4 h-4" />}
                Ouvrir le litige
              </button>
            </div>
          </motion.div>
        </div>}

      {}
      {showAvis && <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <motion.div initial={{
          opacity: 0,
          scale: 0.95
        }} animate={{
          opacity: 1,
          scale: 1
        }} className="bg-white rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <Star className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-bold" style={{
                fontFamily: 'var(--font-display)'
              }}>
                  Laisser un avis {isAcheteur ? 'au vendeur' : 'à l\'acheteur'}
                </h3>
                <p className="text-xs text-gray-500">Visible publiquement sur son profil</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 mb-5">
              {[1, 2, 3, 4, 5].map(n => <button key={n} onClick={() => setAvisNote(n)} type="button">
                  <Star className="w-9 h-9 transition-colors" style={{
                color: n <= avisNote ? '#F59E0B' : '#E4E4E2'
              }} fill={n <= avisNote ? '#F59E0B' : 'none'} />
                </button>)}
            </div>

            <textarea value={avisCommentaire} onChange={e => setAvisCommentaire(e.target.value)} placeholder="Votre commentaire (optionnel)" rows={3} className="input-field input-field--square text-sm w-full" maxLength={500} />

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAvis(false)} className="btn-outline flex-1 justify-center py-3 text-sm">
                Annuler
              </button>
              <button onClick={handleLaisserAvis} disabled={avisLoading} className="btn-primary flex-1 justify-center py-3 text-sm">
                {avisLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : 'Publier l\'avis'}
              </button>
            </div>
          </motion.div>
        </div>}

      {}
      {showAvisLivreur && <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <motion.div initial={{
          opacity: 0,
          scale: 0.95
        }} animate={{
          opacity: 1,
          scale: 1
        }} className="bg-white rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <Star className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-bold" style={{
                fontFamily: 'var(--font-display)'
              }}>
                  Laisser un avis au livreur
                </h3>
                <p className="text-xs text-gray-500">Visible publiquement sur son profil</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 mb-5">
              {[1, 2, 3, 4, 5].map(n => <button key={n} onClick={() => setAvisLivreurNote(n)} type="button">
                  <Star className="w-9 h-9 transition-colors" style={{
                color: n <= avisLivreurNote ? '#F59E0B' : '#E4E4E2'
              }} fill={n <= avisLivreurNote ? '#F59E0B' : 'none'} />
                </button>)}
            </div>

            <textarea value={avisLivreurCommentaire} onChange={e => setAvisLivreurCommentaire(e.target.value)} placeholder="Votre commentaire (optionnel)" rows={3} className="input-field input-field--square text-sm w-full" maxLength={500} />

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAvisLivreur(null)} className="btn-outline flex-1 justify-center py-3 text-sm">
                Annuler
              </button>
              <button onClick={handleLaisserAvisLivreur} disabled={avisLivreurLoading} className="btn-primary flex-1 justify-center py-3 text-sm">
                {avisLivreurLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : 'Publier l\'avis'}
              </button>
            </div>
          </motion.div>
        </div>}

      {}
      {showAnnuler && (() => {
        const {
          remboursement
        } = calculerRemboursementAnnulation(commande.montantPreleve);
        return <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <motion.div initial={{
            opacity: 0,
            scale: 0.95
          }} animate={{
            opacity: 1,
            scale: 1
          }} className="bg-white rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-bold" style={{
                  fontFamily: 'var(--font-display)'
                }}>Annuler cette commande ?</h3>
                  <p className="text-xs text-gray-500">Cette action est irréversible</p>
                </div>
              </div>

              <div className="bg-green-50 rounded-xl p-3.5 border border-green-100 mb-5">
                <p className="text-sm text-green-700 font-semibold">Remboursement intégral : {remboursement.toLocaleString()} XAF</p>
                <p className="text-xs text-green-600 mt-1">Aucun frais retenu, quel que soit le stade de la commande.</p>
              </div>

              <div className="bg-amber-50 rounded-xl p-3.5 border border-amber-100 mb-5">
                <p className="text-xs text-amber-700">Annuler une commande — même gratuitement — pèse sur votre score de fiabilité, visible par les autres utilisateurs.</p>
              </div>

              {commande.statut === STATUTS_COMMANDE.LIVREUR_ASSIGNE && fraisLivraisonTotal > 0 && <div className="bg-green-50 rounded-xl p-3.5 border border-green-100 mb-5">
                  <p className="text-sm text-green-700 font-semibold">+ {fraisLivraisonTotal.toLocaleString('fr-FR')} XAF de frais de livraison remboursés intégralement</p>
                  <p className="text-xs text-green-600 mt-1">Le livreur n'est pas encore parti chercher l'article.</p>
                </div>}

              <div className="flex gap-3">
                <button onClick={() => setShowAnnuler(false)} className="btn-outline flex-1 justify-center py-3 text-sm">
                  Retour
                </button>
                <button onClick={handleAnnuler} disabled={annulerLoading} className="flex-1 bg-gray-800 text-white font-bold py-3 rounded-xl hover:bg-gray-900 transition-colors flex items-center justify-center gap-2 text-sm">
                  {annulerLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <XCircle className="w-4 h-4" />}
                  Confirmer l'annulation
                </button>
              </div>
            </motion.div>
          </div>;
      })()}
    </div>
    {confirmPayerLivraison && <ConfirmDialog
      title="Confirmer le paiement des frais de livraison ?"
      description={payerLivraisonAvecBonus
        ? `Vous allez dépenser ${fraisLivraisonTotal.toLocaleString('fr-FR')} XAF depuis votre solde bonus de lancement.`
        : `Vous allez dépenser ${fraisLivraisonTotal.toLocaleString('fr-FR')} XAF depuis votre solde principal.`}
      confirmLabel="Confirmer et payer"
      onConfirm={handlePayerLivraison}
      onCancel={() => setConfirmPayerLivraison(false)}
    />}
    {confirmPayerRetour && <ConfirmDialog
      title="Confirmer le paiement du retour ?"
      description={`Vous allez dépenser ${(2 * fraisLivraisonTotal).toLocaleString('fr-FR')} XAF depuis votre solde principal — le livreur ira récupérer le colis chez l'acheteur pour vous le remettre.`}
      confirmLabel="Confirmer et payer"
      onConfirm={handlePayerRetour}
      onCancel={() => setConfirmPayerRetour(false)}
    />}
    <ReceiptPrintable commande={commande} isAcheteur={isAcheteur} />
    </>;
}
function ReceiptPrintable({
  commande,
  isAcheteur
}) {
  if (!commande || commande.statut !== 'termine') return null;
  const dateTerminee = commande.historiqueStatuts?.find(h => h.statut === 'termine')?.date;
  const article = commande.total || commande.montant || 0;
  const livraisonPayee = commande.modeRemise === 'livraison';
  const fraisLivraison = livraisonPayee ? (commande.fraisLivraison || 0) + (commande.interVilles ? commande.fraisLivraisonInterVilles || 0 : 0) : 0;
  return <div className="hidden print:block p-10 text-black">
      <h1 className="text-xl font-bold mb-1">Reçu MAKET</h1>
      <p className="text-sm text-gray-600 mb-6">Commande #{commande.id?.slice(0, 8).toUpperCase()}</p>
      {commande.photoAnnonce && <img src={commande.photoAnnonce} alt="" className="w-32 h-32 object-cover rounded-lg mb-6" />}
      <table className="w-full text-sm border-collapse">
        <tbody>
          <tr className="border-b"><td className="py-2 font-semibold">Article</td><td className="py-2 text-right">{commande.titreAnnonce || '—'}{commande.estLot ? ` (lot de ${commande.nombreArticlesLot || 2} articles)` : ''}</td></tr>
          {commande.estLot && commande.articlesLot?.length > 0 && <tr className="border-b"><td className="py-2 font-semibold align-top">Contenu du lot</td><td className="py-2 text-right">{commande.articlesLot.join(', ')}</td></tr>}
          <tr className="border-b"><td className="py-2 font-semibold">Prix article</td><td className="py-2 text-right">{article.toLocaleString('fr-FR')} XAF</td></tr>
          {isAcheteur && livraisonPayee && <tr className="border-b"><td className="py-2 font-semibold">Frais de livraison</td><td className="py-2 text-right">{fraisLivraison.toLocaleString('fr-FR')} XAF</td></tr>}
          <tr className="border-b"><td className="py-2 font-semibold">Total {isAcheteur ? 'payé' : 'reçu'}</td><td className="py-2 text-right font-bold">{(isAcheteur ? article + fraisLivraison : article).toLocaleString('fr-FR')} XAF</td></tr>
          {}
          <tr className="border-b"><td className="py-2 font-semibold">Mode de paiement</td><td className="py-2 text-right">Solde MAKET (paiement sécurisé)</td></tr>
          <tr><td className="py-2 font-semibold">Date de finalisation</td><td className="py-2 text-right">{dateTerminee ? new Date(dateTerminee).toLocaleDateString('fr-FR') : '—'}</td></tr>
        </tbody>
      </table>
      <p className="text-xs text-gray-500 mt-8">Généré depuis MAKET — maket.cm</p>
    </div>;
}
