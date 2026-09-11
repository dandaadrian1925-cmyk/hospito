import { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { CalendarPlus } from 'lucide-react';
import { listerServicesActifs } from '../../services/etablissementsPublicService';
import { listerMedecinsDeLEtablissement, LABEL_JOUR_SEMAINE } from '../../services/planningService';

// #refonte (retour utilisateur, "la page de médecins doit aussi avoir, de
// façon bien désignée, tous les médecins de l'établissement filtrables par
// service, et donc avec les horaires de travail habituelles avec une
// facilité de prendre rendez-vous avec ce médecin là") : remplace l'ancien
// regroupement issu des `plannings` datés (n'affichait que les médecins
// ayant un créneau à venir) par le vrai annuaire (`medecins_publics`,
// hospito-admin) — tous les médecins actifs, filtrables par service, avec
// leur planning hebdomadaire récurrent (horairesHabituels) quand renseigné.
export default function EtablissementEquipePage() {
  const { etablissementId, user } = useOutletContext();
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [serviceFiltre, setServiceFiltre] = useState('');
  const [medecins, setMedecins] = useState(null);

  useEffect(() => {
    listerServicesActifs(etablissementId).then(setServices).catch(() => setServices([]));
  }, [etablissementId]);

  useEffect(() => {
    let annule = false;
    setMedecins(null);
    listerMedecinsDeLEtablissement(etablissementId, serviceFiltre || null)
      .then((m) => { if (!annule) setMedecins(m); })
      .catch(() => { if (!annule) setMedecins([]); });
    return () => { annule = true; };
  }, [etablissementId, serviceFiltre]);

  const prendreRdv = (m) => {
    const params = new URLSearchParams();
    if (m.serviceId) params.set('service', m.serviceId);
    params.set('medecin', m.uid);
    params.set('medecinNom', m.nom || '');
    navigate(`../rdv?${params.toString()}`);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <p style={{ fontSize: 13, color: 'var(--ink-4)' }}>L'équipe médicale de l'établissement.</p>
        {!!services.length && (
          <select
            value={serviceFiltre}
            onChange={(e) => setServiceFiltre(e.target.value)}
            className="input-field"
            style={{ maxWidth: 240 }}
          >
            <option value="">Tous les services</option>
            {services.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
          </select>
        )}
      </div>

      {medecins === null ? (
        <p style={{ fontSize: 13, color: 'var(--ink-4)' }}>Chargement…</p>
      ) : medecins.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--ink-4)' }}>Aucun médecin renseigné pour le moment.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {medecins.map((m) => (
            <div key={m.id} style={{ border: '1px solid var(--border, #E2E8F0)', borderRadius: 14, padding: 16, background: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                {m.photoURL ? (
                  <img src={m.photoURL} alt={m.nom} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: 'var(--ink-3)', flexShrink: 0 }}>
                    {(m.nom || '?').trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('')}
                  </div>
                )}
                <div>
                  <p style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--ink)' }}>Dr {m.nom || '—'}</p>
                  {m.serviceNom && <p style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 600 }}>{m.serviceNom}</p>}
                </div>
              </div>

              {!!m.horairesHabituels?.length && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 6 }}>Horaires habituels</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {m.horairesHabituels.map((h) => (
                      <span key={h.jour} style={{ fontSize: 11.5, color: 'var(--ink-2)', background: 'var(--bg-2)', padding: '4px 9px', borderRadius: 999 }}>
                        {LABEL_JOUR_SEMAINE[h.jour] || h.jour} · {h.heureDebut}–{h.heureFin}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {user && (
                <button type="button" onClick={() => prendreRdv(m)} className="btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  <CalendarPlus style={{ width: 14, height: 14 }} /> Prendre RDV avec ce médecin
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
