import { useState, useEffect } from 'react';
import { listerSpecialistesDuService } from '../../services/planningService';

// Détail d'un service, déplié dans le flux de la page (juste sous la
// vignette cliquée) — jamais une modale par-dessus le reste du contenu.
export default function ServiceDetailPanel({ service, etablissementId, tarifs, onClose, onPrendreRdv, peutPrendreRdv }) {
  const [equipe, setEquipe] = useState(null);

  useEffect(() => {
    if (!service) { setEquipe(null); return; }
    listerSpecialistesDuService(etablissementId, service.id).then(setEquipe).catch(() => setEquipe([]));
  }, [service, etablissementId]);

  if (!service) return null;
  const tarif = tarifs?.find((t) => t.serviceId === service.id);

  return (
    <div style={{ background: 'var(--bg-2)', borderRadius: 14, padding: 20, marginTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>{service.nom}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {tarif && (
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--blue)', background: 'white', padding: '4px 10px', borderRadius: 999 }}>
              {Number(tarif.montant).toLocaleString('fr-FR')} XAF
            </span>
          )}
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--ink-4)', lineHeight: 1, padding: 4 }} aria-label="Fermer">
            ×
          </button>
        </div>
      </div>
      <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.5, marginBottom: 16 }}>
        {service.description || "Aucune description fournie par l'établissement pour ce service."}
      </p>

      {equipe !== null && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 10 }}>Équipe médicale & horaires</p>
          {!equipe.length ? (
            <p style={{ fontSize: 12.5, color: 'var(--ink-4)' }}>Aucun planning renseigné pour ce service pour le moment.</p>
          ) : (
            <div className="space-y-2">
              {equipe.map((m) => (
                <div key={m.uid} style={{ background: 'white', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: m.horaires?.length ? 8 : 0 }}>
                    {m.photoURL ? (
                      <img src={m.photoURL} alt={m.nom} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', flexShrink: 0 }}>
                        {(m.nom || '?').trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('')}
                      </div>
                    )}
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Dr {m.nom}</span>
                  </div>
                  {!!m.horaires?.length && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {m.horaires.map((h) => (
                        <span
                          key={h.date}
                          style={{ fontSize: 11.5, color: 'var(--ink-2)', background: 'var(--bg-2)', padding: '4px 9px', borderRadius: 999 }}
                        >
                          {new Date(h.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} · {h.heureDebut}–{h.heureFin}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {peutPrendreRdv && (
        <button onClick={() => onPrendreRdv(service)} className="btn-primary">Prendre RDV pour ce service</button>
      )}
    </div>
  );
}
