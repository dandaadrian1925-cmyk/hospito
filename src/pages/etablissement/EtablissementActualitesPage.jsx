import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { listerActualitesPubliees } from '../../services/etablissementsPublicService';

const LABEL_CATEGORIE = { nouveaute: 'Nouveauté', evenement: 'Événement', publication: 'Publication', autre: 'Actualité' };
const TON_CATEGORIE = { nouveaute: 'var(--blue)', evenement: '#2F7D5C', publication: '#B7791F' };

export default function EtablissementActualitesPage() {
  const { etablissementId } = useOutletContext();
  const [actualites, setActualites] = useState(null);

  useEffect(() => {
    listerActualitesPubliees(etablissementId).then(setActualites).catch(() => setActualites([]));
  }, [etablissementId]);

  if (actualites === null) return <p style={{ fontSize: 13, color: 'var(--ink-4)' }}>Chargement…</p>;
  if (!actualites.length) return <p style={{ fontSize: 13, color: 'var(--ink-4)' }}>Aucune actualité publiée pour le moment.</p>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
      {actualites.map((a) => (
        <Link
          key={a.id}
          to={a.id}
          style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border, #E2E8F0)', textDecoration: 'none', background: 'white' }}
        >
          <div
            style={{
              height: 130,
              background: a.photoURL ? `url(${a.photoURL}) center/cover` : 'linear-gradient(135deg, var(--blue), var(--primary-dark, #174858))',
            }}
          />
          <div style={{ padding: '14px 16px' }}>
            <span
              style={{
                display: 'inline-block', fontSize: 11, fontWeight: 700, color: 'white', padding: '3px 9px', borderRadius: 999,
                background: TON_CATEGORIE[a.categorie] || '#64748B', marginBottom: 8,
              }}
            >
              {LABEL_CATEGORIE[a.categorie] || 'Actualité'}
            </span>
            <p style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 6, lineHeight: 1.3 }}>{a.titre}</p>
            {a.resume && <p style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>{a.resume}</p>}
          </div>
        </Link>
      ))}
    </div>
  );
}
