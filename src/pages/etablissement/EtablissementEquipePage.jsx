import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { listerServicesActifs } from '../../services/etablissementsPublicService';
import { listerSpecialistesDuService } from '../../services/planningService';

// Annuaire de l'équipe médicale, groupée par service (le service affiché
// fait office de spécialité — aucune donnée de qualification/diplôme
// n'existe aujourd'hui, rien n'est inventé). Même source que le choix de
// spécialiste à la prise de RDV (listerSpecialistesDuService, déjà enrichi
// des horaires).
export default function EtablissementEquipePage() {
  const { etablissementId } = useOutletContext();
  const [groupes, setGroupes] = useState(null);

  useEffect(() => {
    let annule = false;
    listerServicesActifs(etablissementId)
      .then(async (services) => {
        const parService = await Promise.all(
          services.map(async (s) => ({ service: s, medecins: await listerSpecialistesDuService(etablissementId, s.id).catch(() => []) })),
        );
        if (!annule) setGroupes(parService.filter((g) => g.medecins.length > 0));
      })
      .catch(() => { if (!annule) setGroupes([]); });
    return () => { annule = true; };
  }, [etablissementId]);

  if (groupes === null) return <p style={{ fontSize: 13, color: 'var(--ink-4)' }}>Chargement…</p>;
  if (groupes.length === 0) return <p style={{ fontSize: 13, color: 'var(--ink-4)' }}>Aucun planning renseigné pour le moment.</p>;

  return (
    <div className="space-y-8">
      {groupes.map(({ service, medecins }) => (
        <div key={service.id}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>{service.nom}</p>
          <div className="space-y-2">
            {medecins.map((m) => (
              <div key={m.uid} style={{ background: 'var(--bg-2)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: m.horaires?.length ? 8 : 0 }}>
                  {m.photoURL ? (
                    <img src={m.photoURL} alt={m.nom} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', flexShrink: 0 }}>
                      {(m.nom || '?').trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('')}
                    </div>
                  )}
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>Dr {m.nom}</span>
                </div>
                {!!m.horaires?.length && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {m.horaires.map((h) => (
                      <span key={h.date} style={{ fontSize: 11.5, color: 'var(--ink-2)', background: 'white', padding: '4px 9px', borderRadius: 999 }}>
                        {new Date(h.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} · {h.heureDebut}–{h.heureFin}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
