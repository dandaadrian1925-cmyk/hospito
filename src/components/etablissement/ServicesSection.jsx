import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listerServicesActifs } from '../../services/etablissementsPublicService';

// #refonte (retour utilisateur, "il ne doit plus avoir les autres services
// affichés... une page d'information de ce service") : chaque carte mène
// désormais à sa propre page (services/:serviceId,
// EtablissementServiceDetailPage) au lieu de déplier un panneau ici — plus
// aucun autre service visible en même temps que celui consulté.
export default function ServicesSection({ etablissementId, tarifs }) {
  const [services, setServices] = useState(null);

  useEffect(() => {
    listerServicesActifs(etablissementId)
      .then(setServices)
      .catch((e) => {
        console.error('listerServicesActifs a échoué :', e);
        setServices([]);
      });
  }, [etablissementId]);

  if (services === null) return <p style={{ fontSize: 13, color: 'var(--ink-4)' }}>Chargement…</p>;
  if (services.length === 0) return <p style={{ fontSize: 13, color: 'var(--ink-4)' }}>Aucun service renseigné pour le moment.</p>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
      {services.map((s) => {
        const tarif = tarifs?.find((t) => t.serviceId === s.id);
        return (
          <Link
            key={s.id}
            to={s.id}
            style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border, #E2E8F0)', background: 'white', textDecoration: 'none' }}
          >
            <div
              style={{
                height: 90,
                background: s.photoURL ? `url(${s.photoURL}) center/cover` : 'linear-gradient(135deg, var(--blue), var(--primary-dark, #174858))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {!s.photoURL && <span style={{ color: 'white', fontSize: 20, fontWeight: 700 }}>{(s.nom || '?').charAt(0).toUpperCase()}</span>}
            </div>
            <div style={{ padding: '8px 10px' }}>
              <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>{s.nom}</p>
              {tarif && (
                <p style={{ fontSize: 11, color: 'var(--blue)', fontWeight: 700, marginTop: 2 }}>
                  {Number(tarif.montant).toLocaleString('fr-FR')} XAF
                </p>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
