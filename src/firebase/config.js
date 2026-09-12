import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider, getToken as getAppCheckToken } from "firebase/app-check";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { isSupported, getMessaging } from "firebase/messaging";
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};
const app = initializeApp(firebaseConfig);

// #anti-bot (demande utilisateur, protection App Check contre les scripts qui
// appelleraient Firestore directement sans passer par cette app) : mode
// Monitor côté console Firebase pour l'instant, donc n'impacte aucune requête
// existante tant qu'on ne bascule pas en "Enforce".
const appCheckSiteKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY;
let appCheckInstance = null;
if (appCheckSiteKey) {
  if (import.meta.env.DEV) {
    // Jeton de debug App Check en local (localhost n'est pas couvert par
    // reCAPTCHA v3) — voir console navigateur pour la valeur générée à
    // enregistrer une fois dans Firebase Console > App Check > Gérer les jetons de débogage.
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  appCheckInstance = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
}

// Jeton App Check à joindre en header (X-Firebase-AppCheck) sur les appels
// aux Edge Functions qui l'exigent — null si App Check n'est pas configuré
// (dev sans clé, ou échec silencieux) : l'appelant doit tolérer ce cas.
export const getAppCheckTokenSafe = async () => {
  if (!appCheckInstance) return null;
  try {
    const { token } = await getAppCheckToken(appCheckInstance);
    return token;
  } catch {
    return null;
  }
};

export const auth = getAuth(app);
// #nouveau (audit, "accès d'urgence hors connexion", §5.6) : cache persistant
// (IndexedDB) plutôt que le cache mémoire par défaut — un get() déjà effectué
// une fois en ligne (ex. la fiche d'urgence, /urgence) reste lisible hors
// connexion. `persistentMultipleTabManager` : plusieurs onglets ouverts ne
// désactivent pas silencieusement la persistance sur le second onglet
// (contrairement à `persistentSingleTabManager`, le défaut historique).
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
export const googleProvider = new GoogleAuthProvider();
// #corrigé (demande utilisateur, "après déconnexion, se reconnecter avec
// Google ne redemande même pas de choisir le compte") : sans ce paramètre,
// Google saute le sélecteur de compte tant qu'une session Google active
// existe dans ce navigateur (son propre état sur accounts.google.com, pas
// un cookie posé par HostoConnect/Firebase) — 'select_account' force
// l'affichage du sélecteur à CHAQUE connexion, même avec un seul compte
// Google connecté.
googleProvider.setCustomParameters({ prompt: 'select_account' });
export const getMessagingSafe = async () => {
  try {
    if (!(await isSupported())) return null;
    return getMessaging(app);
  } catch {
    return null;
  }
};
export default app;
