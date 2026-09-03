import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Building2 } from 'lucide-react';
import EtablissementHeroCarousel from '../components/home/EtablissementHeroCarousel';
import { listerEtablissementsActifs } from '../services/etablissementsPublicService';

export default function HomePage() {
  const [etablissements, setEtablissements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listerEtablissementsActifs()
      .then(setEtablissements)
      .catch((e) => {
        console.error('listerEtablissementsActifs a échoué :', e);
        setEtablissements([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="gradient-mesh">
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px 8px', textAlign: 'center' }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
            color: 'var(--ink)',
            marginBottom: 10,
          }}
        >
          Trouvez votre établissement de santé
        </h1>
        <p style={{ fontSize: 15, color: 'var(--ink-3)', maxWidth: 560, margin: '0 auto' }}>
          Prenez rendez-vous, consultez votre dossier médical et échangez avec vos soignants — partout où vous êtes suivi.
        </p>
        <Link
          to="/etablissements"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 20,
            padding: '11px 22px',
            borderRadius: 999,
            background: 'var(--bg-2)',
            border: '1.5px solid var(--border, #E2E8F0)',
            color: 'var(--ink-2)',
            fontSize: 14,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          <Search style={{ width: 15, height: 15 }} />
          Rechercher un établissement, une ville…
        </Link>
      </div>

      {loading ? (
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 24px' }}>
          <div style={{ minHeight: 480, borderRadius: 24, background: 'var(--bg-2)' }} />
        </div>
      ) : etablissements.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--ink-3)' }}>
          <Building2 style={{ width: 32, height: 32, margin: '0 auto 12px', color: 'var(--ink-4)' }} />
          <p style={{ fontWeight: 600 }}>Aucun établissement partenaire pour le moment</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Revenez bientôt — de nouveaux établissements rejoignent régulièrement HostoConnect.</p>
        </div>
      ) : (
        etablissements.map((etab) => <EtablissementHeroCarousel key={etab.id} etablissement={etab} />)
      )}

      <div style={{ maxWidth: 1280, margin: '32px auto 60px', padding: '0 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>
          Vous représentez un établissement de santé ?{' '}
          <Link to="/etablissements/demande" style={{ color: 'var(--blue)', fontWeight: 600 }}>
            Rejoignez HostoConnect
          </Link>
        </p>
      </div>
    </div>
  );
}
