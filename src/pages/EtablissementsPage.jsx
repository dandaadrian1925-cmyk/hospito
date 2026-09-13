import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Building2 } from 'lucide-react';
import { listerEtablissementsActifs, listerTousLesServicesActifs } from '../services/etablissementsPublicService';
import EtablissementCard from '../components/home/EtablissementCard';

export default function EtablissementsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [etablissements, setEtablissements] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(searchParams.get('q') || '');

  useEffect(() => {
    Promise.all([listerEtablissementsActifs(), listerTousLesServicesActifs()])
      .then(([etabs, servicesActifs]) => {
        setEtablissements(etabs);
        setServices(servicesActifs);
      })
      .catch((e) => {
        console.error('Chargement des établissements/services a échoué :', e);
        setEtablissements([]);
      })
      .finally(() => setLoading(false));
  }, []);

  // #corrigé (bug remonté, "découvrir un établissement") : le champ promet
  // "un établissement, une ville, un service" mais ne filtrait jamais
  // réellement sur les services — un établissement dont le NOM ne matche
  // pas mais qui a un service "Cardiologie" doit ressortir pour "cardio".
  const filtres = useMemo(() => {
    const terme = q.trim().toLowerCase();
    if (!terme) return etablissements;
    const etabsAvecServiceMatch = new Set(
      services.filter((s) => s.nom?.toLowerCase().includes(terme)).map((s) => s.etablissementId)
    );
    return etablissements.filter(
      (e) => e.nom?.toLowerCase().includes(terme) || e.ville?.toLowerCase().includes(terme) || etabsAvecServiceMatch.has(e.id)
    );
  }, [etablissements, services, q]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSearchParams(q ? { q } : {});
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 64px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Building2 style={{ width: 22, height: 22 }} /> Établissements partenaires
        </h1>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', marginTop: 4 }}>
          Recherchez un établissement ou une ville pour trouver un service près de chez vous.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ position: 'relative', marginBottom: 28, maxWidth: 480 }}>
        <Search style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--ink-4)' }} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un établissement, une ville, un service…"
          className="input-field"
          style={{ paddingLeft: 40 }}
        />
      </form>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(220px, 100%), 1fr))', gap: 16 }}>
          {Array(6)
            .fill(0)
            .map((_, i) => (
              <div key={i} style={{ height: 190, borderRadius: 14, background: 'var(--bg-2)' }} />
            ))}
        </div>
      ) : filtres.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-3)' }}>
          <p style={{ fontWeight: 600 }}>Aucun établissement trouvé</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Essayez un autre nom ou une autre ville.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(220px, 100%), 1fr))', gap: 16 }}>
          {filtres.map((etab, i) => (
            <EtablissementCard key={etab.id} etablissement={etab} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
