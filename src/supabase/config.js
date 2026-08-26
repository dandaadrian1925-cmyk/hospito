import { createClient } from '@supabase/supabase-js';
import { auth } from '../firebase/config';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
const EXTENSIONS_AUTORISEES = {
  annonces: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'mov', 'webm'],
  factures: ['jpg', 'jpeg', 'png', 'pdf'],
  cni: ['jpg', 'jpeg', 'png', 'pdf'],
  // #nouveau (demande utilisateur, "la preuve d'un litige pourrait aussi
  // être une vidéo") : vidéo ajoutée — jusqu'ici seules des photos étaient
  // acceptées comme preuve, alors qu'un défaut (rayure, article qui ne
  // fonctionne pas...) se montre parfois bien mieux en vidéo qu'en photo.
  litiges: ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'mov', 'webm'],
  // #nouveau (demande utilisateur, "upload de preuves dans le chat support") :
  // bucket privé, chemin "{conversationId}/{fichier}" — cf. secure-upload-url.
  support: ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'mp4', 'mov', 'webm']
};
const EXTENSIONS_VIDEO = new Set(['mp4', 'mov', 'webm']);
// #limite (vérifié directement contre l'API Storage) : 350 Mo demandé, mais
// le plan Supabase actuel plafonne CHAQUE bucket à 50 Mo par fichier au
// niveau du projet — une tentative de configurer un bucket au-delà (testé
// en direct) est rejetée par Supabase lui-même (413 "Payload too large"),
// quoi que dise la config du bucket. Repasser à 350 Mo suppose de passer au
// plan Pro Supabase (payant) — hors de portée d'un simple changement de
// code. 50 Mo reste largement suffisant pour une vidéo courte de démo
// produit en qualité raisonnable.
const TAILLE_MAX_VIDEO = 50 * 1024 * 1024;
const TAILLE_MAX_IMAGE = 10 * 1024 * 1024;
export const uploadFile = async (bucket, path, file) => {
  const ext = (file.name?.split('.').pop() || 'bin').toLowerCase();
  const extensionsBucket = EXTENSIONS_AUTORISEES[bucket];
  if (!extensionsBucket || !extensionsBucket.includes(ext)) throw new Error('TYPE_FICHIER_NON_AUTORISE');
  const tailleMax = EXTENSIONS_VIDEO.has(ext) ? TAILLE_MAX_VIDEO : TAILLE_MAX_IMAGE;
  if (file.size > tailleMax) throw new Error('FICHIER_TROP_VOLUMINEUX');
  const fullPath = `${path}.${ext}`;
  const idToken = await auth.currentUser.getIdToken();
  const res = await fetch(`${supabaseUrl}/functions/v1/secure-upload-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'apikey': supabaseAnonKey,
      'X-Firebase-Token': idToken
    },
    body: JSON.stringify({
      bucket,
      path: fullPath
    })
  });
  const authData = await res.json();
  if (!res.ok) throw new Error(authData.error || "Upload non autorisé");
  const {
    error
  } = await supabase.storage.from(bucket).uploadToSignedUrl(fullPath, authData.token, file, {
    contentType: authData.contentType || file.type || undefined,
    // #perf (audit PageSpeed mobile, corrigé) : absent, Supabase retombait sur
    // son défaut (cache court) — le chemin (`${path}.${ext}`) n'est jamais
    // réécrit après upload, donc un cache long est toujours sûr ici.
    cacheControl: '31536000'
  });
  if (error) throw error;
  const {
    data: {
      publicUrl
    }
  } = supabase.storage.from(bucket).getPublicUrl(fullPath);
  return {
    path: fullPath,
    publicUrl
  };
};
export const deleteFile = async (bucket, path) => {
  const {
    error
  } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
};
const pathFromLitigePublicUrl = url => {
  const marker = '/storage/v1/object/public/litiges/';
  const idx = url.indexOf(marker);
  return idx === -1 ? null : decodeURIComponent(url.slice(idx + marker.length));
};
export const getLitigeSignedUrls = async (litigeId, preuveUrls) => {
  const paths = (preuveUrls || []).map(pathFromLitigePublicUrl).filter(Boolean);
  if (paths.length === 0) return {};
  const idToken = await auth.currentUser.getIdToken();
  const res = await fetch(`${supabaseUrl}/functions/v1/get-litige-signed-urls`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'apikey': supabaseAnonKey,
      'X-Firebase-Token': idToken
    },
    body: JSON.stringify({
      litigeId,
      paths
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur de génération des URLs signées');
  return data.signedUrls;
};
export const resoudreUrlsLitige = (litigeId, preuveUrls) => getLitigeSignedUrls(litigeId, preuveUrls).then(signedUrls => (preuveUrls || []).map(url => {
  const path = pathFromLitigePublicUrl(url);
  return path && signedUrls[path] || url;
})).catch(() => preuveUrls || []);
// #nouveau (demande utilisateur, "upload de preuves dans le chat support") :
// bucket "support" privé — le message ne stocke que le CHEMIN (jamais une
// URL publique, qui n'existerait pas pour un bucket privé), résolu en URL
// signée à l'affichage, juste avant d'être montré.
export const getChatSignedUrls = async (bucket, convId, paths) => {
  if (!paths || paths.length === 0) return {};
  const idToken = await auth.currentUser.getIdToken();
  const res = await fetch(`${supabaseUrl}/functions/v1/get-chat-signed-urls`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'apikey': supabaseAnonKey,
      'X-Firebase-Token': idToken
    },
    body: JSON.stringify({
      bucket,
      convId,
      paths
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur de génération des URLs signées');
  return data.signedUrls;
};
export const pousserNotification = async notificationId => {
  try {
    if (!auth.currentUser) return;
    const idToken = await auth.currentUser.getIdToken();
    await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey,
        'X-Firebase-Token': idToken
      },
      body: JSON.stringify({
        notificationId
      })
    });
  } catch (e) {
    console.warn('Envoi de la notification push échoué :', e.message);
  }
};
export default supabase;
