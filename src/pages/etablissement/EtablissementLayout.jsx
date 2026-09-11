import { useState, useEffect } from 'react';
import { useParams, Link, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getEtablissement, listerTarifsConsultation } from '../../services/etablissementsPublicService';
import EtablissementSiteHeader from '../../components/etablissement/EtablissementSiteHeader';
import EtablissementSiteFooter from '../../components/etablissement/EtablissementSiteFooter';

// #refonte (retour utilisateur, capture d'écran d'un vrai site d'hôpital
// (chuy.cm) : "ça doit afficher le site web entier de l'établissement navbar
// et footer donc tout mais avec un bouton retour vers hospito") : cette page
// n'est plus encapsulée dans le chrome global de l'app Hospito (Navbar/
// Footer génériques, cf. App.jsx où cette route n'utilise plus <Layout>) —
// elle a désormais SON PROPRE en-tête et pied de page complets, pour donner
// l'impression d'un site indépendant de l'établissement, avec un unique
// bouton explicite "Retour à Hospito" (dans l'en-tête et le pied de page)
// pour sortir de cette expérience.
export default function EtablissementLayout() {
  const { etablissementId } = useParams();
  const { user, userProfile } = useAuth();
  const [etablissement, setEtablissement] = useState(null);
  const [tarifs, setTarifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEtablissement(etablissementId)
      .then(setEtablissement)
      .finally(() => setLoading(false));
    listerTarifsConsultation(etablissementId).then(setTarifs).catch(() => setTarifs([]));
  }, [etablissementId]);

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink-3)' }}>Chargement…</div>;
  }

  if (!etablissement) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <p style={{ color: 'var(--ink-3)' }}>Établissement introuvable.</p>
        <Link to="/" className="btn-primary" style={{ display: 'inline-block', marginTop: 16 }}>
          Retour à l'accueil
        </Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'white' }}>
      <EtablissementSiteHeader etablissement={etablissement} />

      <div style={{ flex: 1, maxWidth: 1100, width: '100%', margin: '0 auto', padding: '32px 24px 64px' }}>
        <Outlet context={{ etablissement, tarifs, etablissementId, user, userProfile }} />
      </div>

      <EtablissementSiteFooter etablissement={etablissement} />
    </div>
  );
}
