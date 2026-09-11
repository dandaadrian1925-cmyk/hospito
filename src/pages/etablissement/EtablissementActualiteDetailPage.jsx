import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { getActualite } from '../../services/etablissementsPublicService';

const LABEL_CATEGORIE = { nouveaute: 'Nouveauté', evenement: 'Événement', publication: 'Publication', autre: 'Actualité' };

export default function EtablissementActualiteDetailPage() {
  const { actualiteId } = useParams();
  const [actualite, setActualite] = useState(undefined);

  useEffect(() => {
    getActualite(actualiteId).then(setActualite).catch(() => setActualite(null));
  }, [actualiteId]);

  if (actualite === undefined) return <p style={{ fontSize: 13, color: 'var(--ink-4)' }}>Chargement…</p>;
  // Un brouillon n'est jamais lisible par un patient (cf. firestore.rules) —
  // getDoc renverra alors "introuvable" côté client, traité comme absent.
  if (!actualite || actualite.statut !== 'publie') {
    return (
      <div>
        <p style={{ fontSize: 13, color: 'var(--ink-4)', marginBottom: 12 }}>Actualité introuvable.</p>
        <Link to=".." style={{ fontSize: 13, color: 'var(--blue)', fontWeight: 600, textDecoration: 'none' }}>← Retour aux actualités</Link>
      </div>
    );
  }

  return (
    <div>
      <Link to=".." style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--ink-3)', marginBottom: 16, textDecoration: 'none' }}>
        <ChevronLeft style={{ width: 14, height: 14 }} /> Actualités
      </Link>
      {actualite.photoURL && (
        <div style={{ height: 220, borderRadius: 14, marginBottom: 20, background: `url(${actualite.photoURL}) center/cover` }} />
      )}
      <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
        {LABEL_CATEGORIE[actualite.categorie] || 'Actualité'}
      </span>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', margin: '6px 0 18px', lineHeight: 1.3 }}>{actualite.titre}</h1>
      <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
        {actualite.contenu || actualite.resume}
      </p>
    </div>
  );
}
