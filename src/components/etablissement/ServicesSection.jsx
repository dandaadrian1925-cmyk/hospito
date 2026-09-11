import { useState, useEffect } from 'react';
import { listerServicesActifs } from '../../services/etablissementsPublicService';
import ServiceDetailPanel from './ServiceDetailPanel';

export default function ServicesSection({ etablissementId, tarifs, peutPrendreRdv, onPrendreRdv, initialExpandedId }) {
  const [services, setServices] = useState(null);
  const [expandedId, setExpandedId] = useState(initialExpandedId || null);

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
  const serviceOuvert = services.find((s) => s.id === expandedId) || null;

  return (
    <div>
      <div
        className="flex flex-nowrap gap-3 overflow-x-auto scrollbar-hide"
        style={{ paddingBottom: 4 }}
      >
        {services.map((s) => (
          <button
            key={s.id}
            onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
            style={{
              flexShrink: 0,
              width: 160,
              borderRadius: 12,
              overflow: 'hidden',
              border: expandedId === s.id ? '1.5px solid var(--blue)' : '1px solid var(--border, #E2E8F0)',
              background: 'white',
              cursor: 'pointer',
              textAlign: 'left',
              padding: 0,
            }}
          >
            <div
              style={{
                height: 90,
                background: s.photoURL ? `url(${s.photoURL}) center/cover` : 'linear-gradient(135deg, var(--blue), var(--primary-dark, #174858))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {!s.photoURL && (
                <span style={{ color: 'white', fontSize: 20, fontWeight: 700 }}>{(s.nom || '?').charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div style={{ padding: '8px 10px' }}>
              <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>{s.nom}</p>
              {(() => {
                const tarif = tarifs?.find((t) => t.serviceId === s.id);
                return tarif ? (
                  <p style={{ fontSize: 11, color: 'var(--blue)', fontWeight: 700, marginTop: 2 }}>
                    {Number(tarif.montant).toLocaleString('fr-FR')} XAF
                  </p>
                ) : null;
              })()}
            </div>
          </button>
        ))}
      </div>

      <ServiceDetailPanel
        service={serviceOuvert}
        etablissementId={etablissementId}
        tarifs={tarifs}
        peutPrendreRdv={peutPrendreRdv}
        onClose={() => setExpandedId(null)}
        onPrendreRdv={onPrendreRdv}
      />
    </div>
  );
}
