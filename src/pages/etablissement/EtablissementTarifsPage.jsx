import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { listerServicesActifs } from '../../services/etablissementsPublicService';

export default function EtablissementTarifsPage() {
  const { etablissementId, tarifs } = useOutletContext();
  const [services, setServices] = useState(null);

  useEffect(() => {
    listerServicesActifs(etablissementId).then(setServices).catch(() => setServices([]));
  }, [etablissementId]);

  if (services === null) return <p style={{ fontSize: 13, color: 'var(--ink-4)' }}>Chargement…</p>;

  const lignes = tarifs
    .map((t) => ({ ...t, serviceNom: services.find((s) => s.id === t.serviceId)?.nom || t.serviceId }))
    .sort((a, b) => a.serviceNom.localeCompare(b.serviceNom));

  if (!lignes.length) {
    return <p style={{ fontSize: 13, color: 'var(--ink-4)' }}>Aucun tarif renseigné pour le moment.</p>;
  }

  return (
    <div className="space-y-2">
      {lignes.map((t) => (
        <div
          key={t.id}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-2)', borderRadius: 10 }}
        >
          <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{t.serviceNom}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--blue)' }}>{Number(t.montant).toLocaleString('fr-FR')} XAF</span>
        </div>
      ))}
    </div>
  );
}
