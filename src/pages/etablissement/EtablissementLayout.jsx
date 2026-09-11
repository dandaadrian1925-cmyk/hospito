import { useState, useEffect } from 'react';
import { useParams, Link, Outlet } from 'react-router-dom';
import { ChevronLeft, MapPin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getEtablissement, listerTarifsConsultation } from '../../services/etablissementsPublicService';

// #refonte (retour utilisateur, "pas de navbar, nous afficherons les liens
// vers les autres pages dans l'accueil") : plus de menu de liens permanent
// en haut de chaque page — la navigation entre Services/Équipe/Tarifs/Avis/
// Contact/actions patient se fait désormais via de vraies sections cliquables
// SUR la page d'accueil (EtablissementAccueilPage), comme un site vitrine
// réel. Ce layout ne garde que l'identité (nom/ville, cliquable pour revenir
// à l'accueil de l'établissement depuis n'importe quelle sous-page) et le
// chargement partagé des données (etablissement, tarifs) via Outlet.
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
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 64px' }}>
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--ink-3)', marginBottom: 16, textDecoration: 'none' }}>
        <ChevronLeft style={{ width: 14, height: 14 }} /> Accueil
      </Link>

      <Link
        to="."
        style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28, textDecoration: 'none' }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: etablissement.photoCarrousel1 ? `url(${etablissement.photoCarrousel1}) center/cover` : 'linear-gradient(135deg, var(--blue), var(--primary-dark, #174858))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {!etablissement.photoCarrousel1 && (
            <span style={{ color: 'white', fontSize: 22, fontWeight: 700 }}>
              {(etablissement.nom || '?').charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)' }}>{etablissement.nom}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <MapPin style={{ width: 13, height: 13, color: 'var(--ink-4)' }} />
            <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{etablissement.ville}</span>
          </div>
        </div>
      </Link>

      <Outlet context={{ etablissement, tarifs, etablissementId, user, userProfile }} />
    </div>
  );
}
