import { useState, useEffect } from 'react';
import { getRedirectResult } from 'firebase/auth';
import { Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../firebase/config';
import { reauthentifierMotDePasse, reauthentifierGoogle } from '../../services/authService';

// #nouveau (demande utilisateur, "dans tous les cas pour accéder au dossier
// médicale il faudra le mot de passe de l'utilisateur connecté") : gate posé
// au niveau de la ROUTE (pas à chaque lien qui y mène) — quel que soit le
// chemin emprunté (menu du haut, menu "Mon compte", lien direct), l'accès
// repasse toujours par ici. Réutilise exactement le même mécanisme de
// réauthentification que la suppression de compte (authService.js,
// reauthentifierMotDePasse/reauthentifierGoogle) — jamais un mot de passe
// vérifié "à la main" ici, un seul endroit qui sait le faire correctement
// pour les deux méthodes de connexion (email ou Google).
export default function DossierAccessGate({ children }) {
  const { user } = useAuth();
  const [deverrouille, setDeverrouille] = useState(false);
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [loading, setLoading] = useState(false);
  const hasPasswordProvider = user?.providerData?.some((p) => p.providerId === 'password');

  // #bug (retour utilisateur, "accessible sur ordinateur, pas sur
  // téléphone") : sur mobile, le SDK Firebase peut basculer en SILENCE
  // reauthenticateWithPopup vers un plein redirect (comportement interne
  // selon le navigateur détecté, jamais documenté comme un choix explicite
  // de ce code) — la page revient alors d'un aller-retour Google SANS que
  // le composant n'ait jamais reçu de résultat de popup, donc jamais
  // déverrouillé. getRedirectResult() récupère ce résultat au retour, quel
  // que soit l'écran d'où le redirect est parti (recréé à l'identique par
  // React Router après le retour sur la même URL /mon-compte/dossier).
  useEffect(() => {
    getRedirectResult(auth).then((result) => {
      if (result) setDeverrouille(true);
    }).catch(() => {});
  }, []);

  if (deverrouille) return children;

  const confirmer = async () => {
    setErreur('');
    setLoading(true);
    try {
      if (hasPasswordProvider) await reauthentifierMotDePasse(motDePasse);
      else await reauthentifierGoogle();
      setDeverrouille(true);
    } catch (e) {
      const messages = {
        'auth/popup-blocked': 'Fenêtre Google bloquée par votre navigateur — autorisez les popups pour ce site puis réessayez.',
        'auth/popup-closed-by-user': 'Fenêtre Google fermée avant la fin — réessayez.',
        'auth/cancelled-popup-request': 'Réessayez — une autre demande de connexion était déjà en cours.',
      };
      setErreur(
        (hasPasswordProvider ? null : messages[e.code])
        || (hasPasswordProvider ? 'Mot de passe incorrect' : 'La reconnexion Google a échoué — réessayez.'),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 380, margin: '48px auto', textAlign: 'center', background: 'white', borderRadius: 20, padding: 32, border: '1.5px solid #F1F5F9' }}>
      <div style={{ width: 48, height: 48, background: '#EFF6FF', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <Lock style={{ width: 22, height: 22, color: 'var(--blue)' }} />
      </div>
      <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink)', marginBottom: 6, fontFamily: 'var(--font-display)' }}>Accès protégé</h2>
      <p style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>
        Votre dossier médical contient des informations sensibles — confirmez votre identité pour y accéder.
      </p>
      {hasPasswordProvider ? (
        <form onSubmit={(e) => { e.preventDefault(); confirmer(); }}>
          <input
            type="password"
            autoFocus
            value={motDePasse}
            onChange={(e) => { setMotDePasse(e.target.value); setErreur(''); }}
            placeholder="Votre mot de passe"
            className="input-field"
            style={{ marginBottom: 10 }}
          />
          {erreur && <p style={{ fontSize: 12, color: '#DC2626', marginBottom: 10 }}>{erreur}</p>}
          <button type="submit" disabled={loading || !motDePasse} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? 'Vérification…' : 'Confirmer'}
          </button>
        </form>
      ) : (
        <>
          {erreur && <p style={{ fontSize: 12, color: '#DC2626', marginBottom: 10 }}>{erreur}</p>}
          <button type="button" onClick={confirmer} disabled={loading} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? 'Vérification…' : 'Confirmer avec Google'}
          </button>
        </>
      )}
    </div>
  );
}
