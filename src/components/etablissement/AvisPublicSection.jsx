import { useState, useEffect } from 'react';
import { getAvisEtablissement } from '../../services/avisEtablissementsService';

// Avis publics en lecture seule, visibles sans connexion (déposer un avis
// reste réservé aux patients connectés, cf. TabAvis sur la page /avis).
// `limite` optionnelle : la page Accueil n'affiche qu'un teaser, la page
// Avis dédiée affiche la liste complète (omettre `limite`).
export default function AvisPublicSection({ etablissementId, limite }) {
  const [avis, setAvis] = useState(null);

  useEffect(() => {
    getAvisEtablissement(etablissementId).then(setAvis).catch(() => setAvis([]));
  }, [etablissementId]);

  if (!avis?.length) return null;
  const moyenne = avis.reduce((s, a) => s + a.note, 0) / avis.length;
  const affiches = limite ? avis.slice(0, limite) : avis;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
        <span style={{ color: '#F59E0B', fontSize: 13 }}>{'★'.repeat(Math.round(moyenne))}{'☆'.repeat(5 - Math.round(moyenne))}</span>
        <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>{moyenne.toFixed(1)}/5 · {avis.length} avis</span>
      </div>
      <div className="space-y-2">
        {affiches.map((a) => (
          <div key={a.id} style={{ padding: '10px 14px', background: 'var(--bg-2)', borderRadius: 10, fontSize: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <strong>{a.patientNom || 'Patient'}</strong>
              <span style={{ color: '#F59E0B' }}>{'★'.repeat(a.note)}{'☆'.repeat(5 - a.note)}</span>
            </div>
            {a.commentaire && <p style={{ color: 'var(--ink-3)', marginTop: 4 }}>{a.commentaire}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
