import { Link } from 'react-router-dom';

// Invite affichée à la place du contenu réservé aux patients connectés, sur
// chaque page d'action (RDV, dossier, messagerie, paiement, réclamations,
// sécurité) quand le visiteur n'a pas de compte — jamais de redirection
// forcée ni de page blanche.
export default function SectionCTA({ action }) {
  return (
    <div style={{ padding: '18px 20px', borderRadius: 12, background: 'var(--bg-2)', textAlign: 'center' }}>
      <p style={{ fontSize: 13.5, color: 'var(--ink-3)', marginBottom: 12 }}>Connectez-vous pour {action}.</p>
      <Link to="/auth" className="btn-primary" style={{ display: 'inline-block' }}>
        Se connecter / Créer un compte
      </Link>
    </div>
  );
}
