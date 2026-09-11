import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { getTransparenceAttente } from '../../services/transparenceService';

export default function TempsAttenteBadge({ etablissementId }) {
  const [temps, setTemps] = useState(null);

  useEffect(() => {
    getTransparenceAttente(etablissementId).then(setTemps).catch(() => setTemps(null));
  }, [etablissementId]);

  if (!temps?.tempsAttenteMoyenMinutes) return null;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--bg-2)', padding: '6px 12px', borderRadius: 20, fontSize: 12.5, color: 'var(--ink-2)', marginBottom: 20 }}>
      <Clock style={{ width: 13, height: 13, color: 'var(--ink-4)' }} />
      Temps d'attente moyen en consultation : ~{temps.tempsAttenteMoyenMinutes} min
    </div>
  );
}
