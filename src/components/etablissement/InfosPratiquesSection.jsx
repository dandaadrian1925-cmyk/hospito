import { useState, useEffect } from 'react';
import { getInfosPratiques } from '../../services/transparenceService';

export const LABEL_INFO_PRATIQUE = {
  wifi: 'Wifi', horairesVisites: 'Horaires de visite', restauration: 'Restauration', parking: 'Parking', autres: 'À savoir',
  accesHandicape: 'Accès handicapé', ascenseur: 'Ascenseurs', interpreteLSF: 'Interprète LSF', autresAccessibilite: 'Accessibilité',
};

export default function InfosPratiquesSection({ etablissementId }) {
  const [infos, setInfos] = useState(null);

  useEffect(() => {
    getInfosPratiques(etablissementId).then(setInfos).catch(() => setInfos(null));
  }, [etablissementId]);

  const entrees = infos ? Object.entries(LABEL_INFO_PRATIQUE).filter(([key]) => infos[key]?.trim()) : [];
  if (!entrees.length) return null;

  return (
    <div style={{ marginBottom: 28 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 10 }}>Confort, vie pratique & accessibilité</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {entrees.map(([key, label]) => (
          <div key={key} style={{ padding: '10px 14px', background: 'var(--bg-2)', borderRadius: 10, fontSize: 13 }}>
            <strong>{label}</strong>
            <p style={{ color: 'var(--ink-3)', marginTop: 2 }}>{infos[key]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
