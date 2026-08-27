import { useState, useEffect } from 'react';
import { listerEtablissementsActifs } from '../../services/etablissementsPublicService';
import EtablissementCard from './EtablissementCard';

export default function EtablissementCarousel() {
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

  if (!loading && etablissements.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-6 mb-14">
      <div style={{ marginBottom: 24 }}>
        <span className="section-tag">Trouvez un établissement</span>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }} className="text-2xl text-gray-900">
          Établissements partenaires
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Prenez rendez-vous, consultez votre dossier et échangez avec vos soignants.
        </p>
      </div>

      <div
        className="flex flex-nowrap gap-4 overflow-x-auto scrollbar-hide pb-2"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {loading
          ? Array(4)
              .fill(0)
              .map((_, i) => (
                <div
                  key={i}
                  style={{
                    flexShrink: 0,
                    width: 220,
                    height: 190,
                    borderRadius: 14,
                    background: 'var(--bg-2)',
                  }}
                />
              ))
          : etablissements.map((etab, i) => <EtablissementCard key={etab.id} etablissement={etab} index={i} />)}
      </div>
    </section>
  );
}
