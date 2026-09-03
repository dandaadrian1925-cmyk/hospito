import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { auth, db } from '../firebase/config';
import { initPush } from '../services/pushNotificationsService';
import { getSessionIdLocal, isConnexionEnCours } from '../services/authService';
const HEARTBEAT_MS = 60000;
const AuthContext = createContext(null);
export const AuthProvider = ({
  children
}) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let unsubProfile = null;
    const unsubscribeAuth = onAuthStateChanged(auth, firebaseUser => {
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }
      if (!firebaseUser) {
        setUser(null);
        setUserProfile(null);
        setLoading(false);
        return;
      }
      unsubProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), docSnap => {
        const profile = docSnap.exists() ? docSnap.data() : null;
        if (profile?.banni) {
          toast.error('Votre compte a été suspendu. Contactez le support si vous pensez qu\'il s\'agit d\'une erreur.');
          signOut(auth);
          return;
        }
        if (profile?.soldeSuspect) {
          toast.error('Ce compte est actuellement soumis à une vérification suite à une anomalie détectée sur votre solde. Contactez le support Hospito pour la lever.', {
            duration: 8000
          });
          signOut(auth);
          return;
        }
        if (profile?.role && profile.role !== 'patient') {
          toast.error("Accès non autorisé — cet espace est réservé aux comptes patients Hospito.");
          signOut(auth);
          return;
        }
        const sessionLocal = getSessionIdLocal();
        if (!isConnexionEnCours() && profile?.activeSessionId && sessionLocal && profile.activeSessionId !== sessionLocal) {
          toast.error('Votre session a été fermée car ce compte a été connecté sur un autre appareil.', {
            duration: 7000
          });
          signOut(auth);
          return;
        }
        setUser(firebaseUser);
        setUserProfile(profile);
        setLoading(false);
      }, e => {
        console.error('Erreur de chargement du profil utilisateur :', e);
        toast.error('Impossible de charger votre profil. Rechargez la page.');
        setUser(firebaseUser);
        setUserProfile(null);
        setLoading(false);
      });
    });
    return () => {
      unsubscribeAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);
  useEffect(() => {
    if (!user?.uid) return;
    // #nouveau (demande utilisateur, "statut en ligne visible par tous les
    // clients") : écrit aussi sur profils_publics/{uid} (lisible par tous),
    // pas seulement users/{uid} (privé) — syncProfilPublic n'est appelé qu'à
    // l'inscription/connexion, jamais à chaque battement, donc sans cette
    // deuxième écriture ici le mirror public ne serait jamais tenu à jour.
    const beat = () => {
      updateDoc(doc(db, 'users', user.uid), {
        lastActiveAt: serverTimestamp()
      }).catch(() => {});
      updateDoc(doc(db, 'profils_publics', user.uid), {
        lastActiveAt: serverTimestamp()
      }).catch(() => {});
    };
    beat();
    const interval = setInterval(beat, HEARTBEAT_MS);
    return () => clearInterval(interval);
  }, [user?.uid]);
  useEffect(() => {
    if (user?.uid) initPush(user.uid);
  }, [user?.uid]);
  return <AuthContext.Provider value={{
    user,
    userProfile,
    loading,
    setUserProfile
  }}>
      {!loading && children}
    </AuthContext.Provider>;
};
export const useAuth = () => useContext(AuthContext);
