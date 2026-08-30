import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getMesFavoris } from '../services/favorisEtablissementsService';
import { getEtablissement } from '../services/etablissementsPublicService';
import EtablissementCard from '../components/home/EtablissementCard';

export default function FavorisEtablissementsPage() {
  const { user } = useAuth();
  const [etablissements, setEtablissements] = useState(null);

  useEffect(() => {
    if (!user) {
      setEtablissements([]);
      return;
    }
    getMesFavoris(user.uid)
      .then(async (favs) => {
        const results = await Promise.all(
          favs.map((f) => getEtablissement(f.etablissementId).catch(() => null))
        );
        setEtablissements(results.filter(Boolean));
      })
      .catch((e) => {
        console.error('getMesFavoris a échoué :', e);
        setEtablissements([]);
      });
  }, [user]);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 64px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Heart style={{ width: 22, height: 22 }} /> Mes établissements favoris
        </h1>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', marginTop: 4 }}>
          Retrouvez rapidement les établissements que vous consultez le plus souvent.
        </p>
      </div>

      {etablissements === null ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {Array(4)
            .fill(0)
            .map((_, i) => (
              <div key={i} style={{ height: 190, borderRadius: 14, background: 'var(--bg-2)' }} />
            ))}
        </div>
      ) : etablissements.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-3)' }}>
          <Heart style={{ width: 32, height: 32, margin: '0 auto 12px', color: 'var(--ink-4)' }} />
          <p style={{ fontWeight: 600 }}>Aucun favori pour le moment</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>
            Ajoutez un établissement en cliquant sur le cœur depuis{' '}
            <Link to="/etablissements" style={{ color: 'var(--blue)', fontWeight: 600 }}>
              l'annuaire
            </Link>
            .
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {etablissements.map((etab, i) => (
            <EtablissementCard key={etab.id} etablissement={etab} index={i} initialFavori={true} />
          ))}
        </div>
      )}
    </div>
  );
}
