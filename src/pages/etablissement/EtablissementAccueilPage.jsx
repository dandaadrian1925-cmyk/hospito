import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { CalendarPlus, ArrowRight } from 'lucide-react';
import { listerServicesActifs } from '../../services/etablissementsPublicService';
import TempsAttenteBadge from '../../components/etablissement/TempsAttenteBadge';
import AvisPublicSection from '../../components/etablissement/AvisPublicSection';

// Page d'accueil du site vitrine de l'établissement : SEULEMENT l'essentiel
// (message clé + appel à l'action), le reste (liste complète des services,
// équipe, tarifs, tous les avis…) est sur ses propres pages, atteintes en
// naviguant — jamais tout empilé ici.
export default function EtablissementAccueilPage() {
  const { etablissement, etablissementId } = useOutletContext();
  const [services, setServices] = useState(null);

  useEffect(() => {
    listerServicesActifs(etablissementId).then(setServices).catch(() => setServices([]));
  }, [etablissementId]);

  return (
    <div>
      <TempsAttenteBadge etablissementId={etablissementId} />

      <div
        style={{
          padding: '28px 26px',
          borderRadius: 16,
          background: 'linear-gradient(135deg, var(--blue), var(--primary-dark, #174858))',
          marginBottom: 32,
        }}
      >
        <p style={{ fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 6, lineHeight: 1.35 }}>
          Prenez rendez-vous, consultez votre dossier et échangez avec l'équipe soignante de {etablissement.nom}.
        </p>
        <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.85)', marginBottom: 18 }}>
          Un seul dossier médical partagé entre tous vos établissements de santé.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <Link to="rdv" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <CalendarPlus style={{ width: 15, height: 15 }} /> Prendre rendez-vous
          </Link>
          <Link
            to="services"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'white', fontWeight: 600, fontSize: 13.5, textDecoration: 'underline', textUnderlineOffset: 3, padding: '9px 4px' }}
          >
            Découvrir nos services <ArrowRight style={{ width: 14, height: 14 }} />
          </Link>
        </div>
      </div>

      {!!services?.length && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Nos services</p>
            <Link to="services" style={{ fontSize: 12.5, color: 'var(--blue)', fontWeight: 600, textDecoration: 'none' }}>Tout voir</Link>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {services.slice(0, 3).map((s) => (
              <Link
                key={s.id}
                to="services"
                style={{ padding: '8px 14px', background: 'var(--bg-2)', borderRadius: 999, fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', textDecoration: 'none' }}
              >
                {s.nom}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Avis récents</p>
          <Link to="avis" style={{ fontSize: 12.5, color: 'var(--blue)', fontWeight: 600, textDecoration: 'none' }}>Tout voir</Link>
        </div>
        <AvisPublicSection etablissementId={etablissementId} limite={2} />
      </div>
    </div>
  );
}
