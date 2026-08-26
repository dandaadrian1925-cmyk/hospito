import { doc, getDoc, setDoc, collection, query, where, getDocs, documentId, getCountFromServer } from 'firebase/firestore';
import { db } from '../firebase/config';
const CHAMPS_PUBLICS = ['displayName', 'photoURL', 'ville', 'cniVerifie', 'totalVentes', 'boutiqueBio', 'prenom', 'nom', 'createdAt', 'referralCode', 'pseudo', 'lastActiveAt'];
export const syncProfilPublic = async (uid, data) => {
  const champs = Object.fromEntries(Object.entries(data).filter(([k, v]) => CHAMPS_PUBLICS.includes(k) && v !== undefined));
  if (Object.keys(champs).length === 0) return;
  await setDoc(doc(db, 'profils_publics', uid), champs, {
    merge: true
  });
};
export const backfillReferralCodePublicSiAbsent = async (uid, referralCode) => {
  if (!referralCode) return;
  const publicSnap = await getDoc(doc(db, 'profils_publics', uid));
  if (publicSnap.exists() && publicSnap.data().referralCode) return;
  try {
    await setDoc(doc(db, 'profils_publics', uid), {
      referralCode
    }, {
      merge: true
    });
  } catch {}
};
// #nouveau (demande utilisateur, "liste des filleuls") : le lien de parrainage
// lui-même reste privé (collection filleuls/{filleulId}, lisible uniquement
// par le parrain — cf. firestore.rules) ; ici on complète juste chaque entrée
// avec les infos déjà publiques du filleul (profils_publics), jamais plus que
// ce qu'un visiteur voit déjà sur sa page vendeur.
// #nouveau (campagne de lancement, retour utilisateur — "je viens de
// parrainer, ça affiche encore 0") : userProfile.lancementFilleulsCount
// n'est recalculé que toutes les 5 min par le cron ?job=lancement — un
// filleul qui vient de s'inscrire n'y apparaît pas tout de suite. Le
// COMPTE n'a en réalité pas besoin d'attendre ce cron (contrairement au
// RANG, qui exige de comparer TOUS les utilisateurs) : une simple requête
// d'agrégation (getCountFromServer, ne lit aucun document en entier — bien
// moins coûteux que getFilleuls ci-dessous) donne le vrai nombre en direct.
export const getNombreFilleuls = async parrainId => {
  const q = query(collection(db, 'filleuls'), where('parrainId', '==', parrainId));
  const snap = await getCountFromServer(q);
  return snap.data().count;
};
export const getFilleuls = async parrainId => {
  const q = query(collection(db, 'filleuls'), where('parrainId', '==', parrainId));
  const snap = await getDocs(q);
  const filleuls = await Promise.all(snap.docs.map(async d => {
    const pub = await getDoc(doc(db, 'profils_publics', d.id));
    if (!pub.exists()) return null;
    return {
      uid: d.id,
      parraineLe: d.data().createdAt,
      ...pub.data()
    };
  }));
  return filleuls.filter(Boolean).sort((a, b) => (b.parraineLe?.toMillis?.() || 0) - (a.parraineLe?.toMillis?.() || 0));
};
// #nouveau (demande utilisateur, "classer aussi par score de fiabilité") :
// scoreFilabilite n'existe QUE sur profils_publics (jamais sur l'annonce
// elle-même) — pour trier une liste d'annonces par score du vendeur, il
// faut un lot de lectures groupées, comme getUsersByIds côté admin. Chunké
// par 30 (limite Firestore d'une clause `in`).
export const getScoresParVendeur = async vendeurIds => {
  const uniques = [...new Set((vendeurIds || []).filter(Boolean))];
  if (uniques.length === 0) return {};
  const chunks = [];
  for (let i = 0; i < uniques.length; i += 30) chunks.push(uniques.slice(i, i + 30));
  const snaps = await Promise.all(
    chunks.map(chunk => getDocs(query(collection(db, 'profils_publics'), where(documentId(), 'in', chunk))))
  );
  const scores = {};
  snaps.forEach(snap => snap.docs.forEach(d => { scores[d.id] = d.data().scoreFilabilite ?? null; }));
  return scores;
};
// #nouveau (demande utilisateur, "flash gratuit + priorité de tri pour
// Vendeur Pro") : même motif que getScoresParVendeur — vendeurProExpiry
// n'existe QUE sur profils_publics (mirror écrit par acheterVendeurPro,
// walletService.js), jamais sur l'annonce elle-même, donc un lot de
// lectures groupées est nécessaire pour calculer ce statut EN DIRECT sur
// une liste d'annonces — jamais stocké sur l'annonce (expire tout seul à
// l'échéance, comme le bonus de plafond d'annonces).
export const getVendeurProParVendeur = async vendeurIds => {
  const uniques = [...new Set((vendeurIds || []).filter(Boolean))];
  if (uniques.length === 0) return {};
  const chunks = [];
  for (let i = 0; i < uniques.length; i += 30) chunks.push(uniques.slice(i, i + 30));
  const snaps = await Promise.all(
    chunks.map(chunk => getDocs(query(collection(db, 'profils_publics'), where(documentId(), 'in', chunk))))
  );
  const expiries = {};
  snaps.forEach(snap => snap.docs.forEach(d => { expiries[d.id] = d.data().vendeurProExpiry ?? null; }));
  return expiries;
};
export const backfillProfilPublicSiAbsent = async uid => {
  const publicSnap = await getDoc(doc(db, 'profils_publics', uid));
  if (publicSnap.exists()) return publicSnap.data();
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    await syncProfilPublic(uid, data);
    return data;
  } catch {
    return null;
  }
};
