import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, signOut, updateProfile, sendPasswordResetEmail, EmailAuthProvider, reauthenticateWithCredential, reauthenticateWithPopup, deleteUser } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase/config';
import { creerNotification } from './notificationsService';
import { syncProfilPublic, backfillReferralCodePublicSiAbsent } from './profilPublicService';
import { removePush } from './pushNotificationsService';
import { supprimerAnnoncePropre } from './annoncesService';
import { STATUTS_COMMANDE } from './commandesService';
export const generateReferralCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();
const SESSION_ID_KEY = 'maket_session_id';

// #correctif (course avec le contrôle de session unique) : entre le moment où
// signInWith... résout et celui où demarrerSessionUnique termine ses deux
// écritures (localStorage puis Firestore), onAuthStateChanged/onSnapshot dans
// AuthContext peuvent se déclencher avec un état encore périmé (l'ancien
// activeSessionId d'un autre appareil, ou même le PROPRE ancien identifiant
// de CET appareil s'il avait déjà perdu la "course" une fois) et déclencher
// une auto-déconnexion juste après la connexion. Ce drapeau fait ignorer le
// contrôle de session le temps de cette fenêtre précise.
let connexionEnCours = false;
export const setConnexionEnCours = v => { connexionEnCours = v; };
export const isConnexionEnCours = () => connexionEnCours;

// #bug (retour utilisateur, "Google se déconnecte automatiquement", corrigé) :
// relever le drapeau dès la fin de demarrerSessionUnique ne suffisait pas —
// l'await de setDoc garantit seulement que l'ÉCRITURE a été acquittée par le
// serveur, pas que le LISTENER onSnapshot déjà abonné dans AuthContext (dès
// onAuthStateChanged, donc avant cette écriture) a effectivement REÇU et
// traité cette mise à jour. Après un flux popup Google en particulier, le
// navigateur peut retarder l'exécution JS de l'onglet d'origine pendant que la
// popup a le focus, décalant la réception de ce onSnapshot bien après la
// résolution de la promesse ci-dessus. Sans marge, une notification arrivant
// dans cette fenêtre pouvait encore lire l'ancien activeSessionId et
// déclencher une fausse déconnexion "connecté ailleurs" juste après une
// connexion réussie — jamais reproduit avec email/mot de passe (pas de popup,
// pas de perte de focus), d'où le bug apparemment spécifique à Google.
const terminerConnexion = () => {
  setTimeout(() => setConnexionEnCours(false), 4000);
};

const demarrerSessionUnique = async uid => {
  const sessionId = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  try {
    localStorage.setItem(SESSION_ID_KEY, sessionId);
  } catch (e) {}
  await setDoc(doc(db, 'users', uid), {
    activeSessionId: sessionId,
    activeSessionAt: serverTimestamp()
  }, {
    merge: true
  });
};
export const getSessionIdLocal = () => {
  try {
    return localStorage.getItem(SESSION_ID_KEY);
  } catch (e) {
    return null;
  }
};
export const generatePseudo = () => `Membre${Math.floor(1000 + Math.random() * 9000)}`;
const backfillPseudoSiAbsent = async (uid, pseudoExistant, userDocPourSync) => {
  try {
    if (pseudoExistant) {
      await syncProfilPublic(uid, {
        pseudo: pseudoExistant
      });
      return;
    }
    const pseudo = generatePseudo();
    await setDoc(doc(db, 'users', uid), {
      pseudo
    }, {
      merge: true
    });
    await syncProfilPublic(uid, {
      ...(userDocPourSync || {}),
      pseudo
    });
  } catch (e) {
    console.error('backfillPseudoSiAbsent a échoué :', e);
  }
};
// #retour utilisateur : le message ne faisait allusion à aucune garantie
// (satisfait ou remboursé), pourtant l'argument le plus rassurant pour
// convaincre quelqu'un qui ne connaît pas encore MAKET. Le lien pointe
// maintenant directement vers l'inscription avec le code déjà rempli
// (?ref=CODE, lu par AuthPage.jsx) — avant, il fallait retaper le code à la
// main après être arrivé sur la page d'accueil, une friction inutile.
// #bug (corrigé, retour utilisateur — "beaucoup disent qu'ils n'ont rien à
// vendre jusqu'à ce que je leur pose certaines questions") : "des choses que
// tu n'utilises plus" restait trop abstrait, personne ne visualise rien de
// concret spontanément. Des exemples concrets (téléphone, vêtements,
// chaussures...) répondent à l'objection avant qu'elle soit posée, au lieu
// d'attendre une relance manuelle du parrain à chaque invitation.
export const buildInvitationWhatsApp = code => `Un vieux téléphone, des vêtements, des chaussures, un appareil électroménager, un meuble... tu as sûrement quelque chose à vendre ! Fais-le sur *MAKET* — le marketplace d'occasion 100% sécurisé au Cameroun ! Je viens de m'y inscrire et je te partage mon code.\n\n` + `- Paiement bloqué en sécurité jusqu'à la remise de l'article : satisfait ou remboursé, sans discussion\n` + `- Vendeurs vérifiés (CNI + facture) — fini les arnaques entre particuliers\n` + `- Livraison possible, même entre villes\n` + `- Inscription gratuite en 2 minutes\n\n` + `Utilise mon code *${code}* à l'inscription : commission réduite sur tes premières ventes.\n\n` + `https://maket.cm/auth?ref=${code}`;
// #nouveau (demande utilisateur, "il n'y a pas de parrainage du tout") :
// HostoConnect n'a aucun programme de parrainage — referralCode/parainId
// restent sur le doc `users` (hérités du fork MAKET, lus ailleurs dans le
// wallet historique) mais ne sont plus jamais RENSEIGNÉS ni exploités ici.
export const registerWithEmail = async (email, password, nom, prenom, ville) => {
  setConnexionEnCours(true);
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, {
      displayName: `${prenom} ${nom}`
    });
    const userDoc = {
      uid: cred.user.uid,
      email,
      nom,
      prenom,
      displayName: `${prenom} ${nom}`,
      role: 'patient',
      ville,
      quartier: '',
      photoURL: '',
      referralCode: generateReferralCode(),
      pseudo: generatePseudo(),
      soldeParrainage: 0,
      scoreFilabilite: 5,
      cniVerifie: false,
      badgeVerifie: false,
      totalVentes: 0,
      totalAchats: 0,
      avertissements: 0,
      parainId: null,
      createdAt: serverTimestamp()
    };
    await setDoc(doc(db, 'users', cred.user.uid), userDoc);
    await syncProfilPublic(cred.user.uid, userDoc);
    await demarrerSessionUnique(cred.user.uid);
    return { user: cred.user };
  } finally {
    terminerConnexion();
  }
};
export const loginWithEmail = async (email, password) => {
  setConnexionEnCours(true);
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const userRef = doc(db, 'users', cred.user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const userDoc = {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: cred.user.displayName || '',
        role: 'patient',
        nom: cred.user.displayName?.split(' ')[1] || '',
        prenom: cred.user.displayName?.split(' ')[0] || '',
        ville: '',
        quartier: '',
        photoURL: cred.user.photoURL || '',
        referralCode: generateReferralCode(),
        pseudo: generatePseudo(),
        soldeParrainage: 0,
        scoreFilabilite: 5,
        cniVerifie: false,
        badgeVerifie: false,
        totalVentes: 0,
        totalAchats: 0,
        avertissements: 0,
        parainId: null,
        createdAt: serverTimestamp()
      };
      await setDoc(userRef, userDoc);
      await syncProfilPublic(cred.user.uid, userDoc);
    } else {
      await backfillReferralCodePublicSiAbsent(cred.user.uid, snap.data()?.referralCode);
      await backfillPseudoSiAbsent(cred.user.uid, snap.data()?.pseudo, snap.data());
    }
    await demarrerSessionUnique(cred.user.uid);
    return cred.user;
  } finally {
    terminerConnexion();
  }
};
// #bug (corrigé, retour utilisateur — "Google échoue à un moment") :
// signInWithRedirect avait été essayé à la place de signInWithPopup pour
// contourner un supposé bug COOP — en réalité, la vraie cause était que le
// projet Firebase "scuizz" n'avait JAMAIS eu Firebase Hosting déployé
// (scuizz.firebaseapp.com/__/firebase/init.json renvoyait 404), cassant le
// fonctionnement interne de la page /__/auth/handler quel que soit le
// mécanisme (popup OU redirect). Une fois Hosting déployé, signInWithRedirect
// atteint bien Google mais getRedirectResult() ne retrouve jamais le résultat
// au retour (stockage tiers bloqué par le navigateur, y compris en navigation
// privée) — signInWithPopup n'a pas ce problème (communication directe entre
// fenêtres via postMessage, pas de récupération d'un état stocké après un
// aller-retour de page complète) : c'est d'ailleurs exactement l'implémentation
// qui fonctionne sur MAKET (maket-client, même architecture, authDomain
// tout aussi cross-origin), confirmant que ce n'était pas un problème de COOP.
export const loginWithGoogle = async () => {
  setConnexionEnCours(true);
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    const userRef = doc(db, 'users', cred.user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const userDoc = {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: cred.user.displayName,
        role: 'patient',
        nom: cred.user.displayName?.split(' ')[1] || '',
        prenom: cred.user.displayName?.split(' ')[0] || '',
        photoURL: cred.user.photoURL || '',
        ville: '',
        quartier: '',
        referralCode: generateReferralCode(),
        pseudo: generatePseudo(),
        soldeParrainage: 0,
        scoreFilabilite: 5,
        cniVerifie: false,
        badgeVerifie: false,
        totalVentes: 0,
        totalAchats: 0,
        avertissements: 0,
        parainId: null,
        createdAt: serverTimestamp()
      };
      await setDoc(userRef, userDoc);
      await syncProfilPublic(cred.user.uid, userDoc);
    } else {
      await backfillReferralCodePublicSiAbsent(cred.user.uid, snap.data()?.referralCode);
      await backfillPseudoSiAbsent(cred.user.uid, snap.data()?.pseudo, snap.data());
    }
    await demarrerSessionUnique(cred.user.uid);
    return { user: cred.user };
  } finally {
    terminerConnexion();
  }
};
export const resetPassword = email => sendPasswordResetEmail(auth, email);
export const logout = async () => {
  if (auth.currentUser) await removePush(auth.currentUser.uid);
  try {
    localStorage.removeItem(SESSION_ID_KEY);
  } catch (e) {}
  await signOut(auth);
};

// #nouveau (demande utilisateur, "un utilisateur doit pouvoir supprimer son
// compte") : statuts de commande non terminaux — un compte avec un achat ou
// une vente encore en cours (jusqu'au litige inclus) ne peut pas se
// supprimer, pour ne jamais laisser une commande orpheline sans acheteur/
// vendeur joignable.
const STATUTS_COMMANDE_NON_TERMINAUX = Object.values(STATUTS_COMMANDE).filter(
  s => s !== STATUTS_COMMANDE.TERMINE && s !== STATUTS_COMMANDE.ANNULE
);

// Vérifie l'éligibilité SANS rien modifier — appelé avant même de proposer le
// mot de passe/la reconnexion Google, pour ne jamais interrompre l'utilisateur
// avec un prompt de sécurité s'il ne peut de toute façon pas supprimer son
// compte maintenant.
export const verifierEligibiliteSuppression = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) throw new Error('COMPTE_INTROUVABLE');
  const data = snap.data();
  if (data.role && data.role !== 'patient') throw new Error('ROLE_NON_SUPPRIMABLE');
  if ((data.solde || 0) > 0 || (data.soldeParrainage || 0) > 0) throw new Error('SOLDE_NON_NUL');
  // #sécurité (corrigé, audit) : un compte gelé (soldeSuspect, écart détecté
  // par reconcilierSoldesServeur) pouvait supprimer son compte puis en
  // recréer un autre gratuitement, effaçant la sanction — repris ici en
  // filet côté client (la vraie garantie est dans firestore.rules).
  if (data.soldeSuspect) throw new Error('COMPTE_GELE');
  const [achats, ventes] = await Promise.all([
    getDocs(query(collection(db, 'commandes'), where('acheteurId', '==', uid), where('statut', 'in', STATUTS_COMMANDE_NON_TERMINAUX))),
    getDocs(query(collection(db, 'commandes'), where('vendeurId', '==', uid), where('statut', 'in', STATUTS_COMMANDE_NON_TERMINAUX))),
  ]);
  if (!achats.empty || !ventes.empty) throw new Error('COMMANDES_EN_COURS');
};

// Reconnexion requise par Firebase Auth avant deleteUser() si la session
// n'est pas "récente" — deux variantes selon le fournisseur d'origine du
// compte (cf. WalletBalance.jsx pour le même motif de vérification par mot
// de passe, réutilisé ici à l'identique).
export const reauthentifierMotDePasse = async (motDePasse) => {
  const cred = EmailAuthProvider.credential(auth.currentUser.email, motDePasse);
  await reauthenticateWithCredential(auth.currentUser, cred);
};
export const reauthentifierGoogle = async () => {
  await reauthenticateWithPopup(auth.currentUser, googleProvider);
};

// Suppression effective — À N'APPELER QU'APRÈS verifierEligibiliteSuppression
// (repris ici en filet de sécurité, jamais une confiance aveugle envers
// l'appelant) ET la reconnexion. Soft-delete uniquement côté Firestore
// (users/{uid} et profils_publics/{uid} ne sont jamais physiquement
// supprimés — allow delete: if false reste inchangé côté règles — pour ne
// pas casser l'intégrité des avis/commandes/transactions historiques qui
// référencent encore cet uid) ; le compte Firebase Auth, lui, est réellement
// détruit (deleteUser), rendant toute reconnexion future impossible.
export const supprimerCompte = async (uid) => {
  await verifierEligibiliteSuppression(uid);

  const mesAnnonces = await getDocs(query(collection(db, 'annonces'), where('userId', '==', uid), where('statut', '==', 'en_vente')));
  for (const a of mesAnnonces.docs) await supprimerAnnoncePropre(a.id);

  await setDoc(doc(db, 'profils_publics', uid), {
    displayName: 'Utilisateur supprimé',
    photoURL: null,
    prenom: null,
    nom: null,
    pseudo: null,
    boutiqueBio: null,
  }, { merge: true });

  await updateDoc(doc(db, 'users', uid), {
    compteSupprime: true,
    compteSupprimeAt: serverTimestamp(),
    displayName: 'Utilisateur supprimé',
    photoURL: null,
    prenom: null,
    nom: null,
    pseudo: null,
    telephone: null,
  });

  if (auth.currentUser) await removePush(auth.currentUser.uid).catch(() => {});
  await deleteUser(auth.currentUser);
};
