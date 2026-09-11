import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useOutletContext } from 'react-router-dom';
import { ChevronLeft, Clock, MapPinned, Phone, UserCog, CalendarClock } from 'lucide-react';
import { getService } from '../../services/etablissementsPublicService';
import { listerSpecialistesDuService } from '../../services/planningService';
import { getProfilPublic } from '../../services/profilPublicService';
import { getSettingsEtablissement } from '../../services/settingsService';

// Reprend exactement les libellés de hospito-admin (servicesService.js, TYPES_SERVICE).
const LABEL_TYPE_SERVICE = {
  hospitalisation: 'Hospitalisation', plateau_technique: 'Plateau technique', consultation: 'Consultation',
};

// #refonte (retour utilisateur, "il ne doit plus avoir les autres services
// affichés... toutes les informations que l'admin a entrées susceptibles
// d'intéresser le public... un peu comme une page d'information de ce
// service") : remplace l'ancien panneau déplié sous la liste des services
// (ServiceDetailPanel, supprimé) par une vraie page dédiée, à sa propre URL
// (services/:serviceId) — plus aucun autre service visible en même temps.
export default function EtablissementServiceDetailPage() {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const { etablissementId, tarifs, user } = useOutletContext();
  const [service, setService] = useState(undefined);
  const [equipe, setEquipe] = useState(null);
  const [chefService, setChefService] = useState(null);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    getService(serviceId).then(setService).catch(() => setService(null));
    listerSpecialistesDuService(etablissementId, serviceId).then(setEquipe).catch(() => setEquipe([]));
    getSettingsEtablissement(etablissementId).then(setSettings).catch(() => setSettings(null));
  }, [serviceId, etablissementId]);

  useEffect(() => {
    if (!service?.chefServiceId) { setChefService(null); return; }
    getProfilPublic(service.chefServiceId).then(setChefService).catch(() => setChefService(null));
  }, [service?.chefServiceId]);

  if (service === undefined) return <p style={{ fontSize: 13, color: 'var(--ink-4)' }}>Chargement…</p>;
  if (!service) {
    return (
      <div>
        <p style={{ fontSize: 13, color: 'var(--ink-4)', marginBottom: 12 }}>Service introuvable.</p>
        <Link to=".." style={{ fontSize: 13, color: 'var(--blue)', fontWeight: 600, textDecoration: 'none' }}>← Retour aux services</Link>
      </div>
    );
  }

  const tarif = tarifs?.find((t) => t.serviceId === service.id);

  return (
    <div>
      <Link to=".." style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--ink-3)', marginBottom: 16, textDecoration: 'none' }}>
        <ChevronLeft style={{ width: 14, height: 14 }} /> Services
      </Link>

      <div
        style={{
          height: 160, borderRadius: 14, marginBottom: 18,
          background: service.photoURL ? `url(${service.photoURL}) center/cover` : 'linear-gradient(135deg, var(--blue), var(--primary-dark, #174858))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {!service.photoURL && <span style={{ color: 'white', fontSize: 32, fontWeight: 700 }}>{(service.nom || '?').charAt(0).toUpperCase()}</span>}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
        <h1 style={{ fontSize: 21, fontWeight: 700, color: 'var(--ink)' }}>{service.nom}</h1>
        {tarif && (
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--blue)', background: 'var(--bg-2)', padding: '5px 12px', borderRadius: 999, flexShrink: 0 }}>
            {Number(tarif.montant).toLocaleString('fr-FR')} XAF
          </span>
        )}
      </div>

      {service.type && LABEL_TYPE_SERVICE[service.type] && (
        <span style={{ display: 'inline-block', fontSize: 11.5, fontWeight: 700, color: 'var(--blue)', background: 'var(--bg-2)', padding: '4px 10px', borderRadius: 999, marginBottom: 14 }}>
          {LABEL_TYPE_SERVICE[service.type]}
        </span>
      )}

      <p style={{ fontSize: 14.5, color: 'var(--ink-3)', lineHeight: 1.6, marginBottom: 20 }}>
        {service.description || "Aucune description fournie par l'établissement pour ce service."}
      </p>

      {(service.horaires || service.localisation || service.telephone || chefService?.displayName) && (
        <div className="space-y-2" style={{ marginBottom: 20, padding: '14px 16px', background: 'var(--bg-2)', borderRadius: 12 }}>
          {service.horaires && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--ink-2)' }}>
              <Clock style={{ width: 15, height: 15, color: 'var(--ink-4)', flexShrink: 0 }} /> {service.horaires}
            </div>
          )}
          {service.localisation && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--ink-2)' }}>
              <MapPinned style={{ width: 15, height: 15, color: 'var(--ink-4)', flexShrink: 0 }} /> {service.localisation}
            </div>
          )}
          {service.telephone && (
            <a href={`tel:${service.telephone}`} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--ink-2)', textDecoration: 'none' }}>
              <Phone style={{ width: 15, height: 15, color: 'var(--ink-4)', flexShrink: 0 }} /> {service.telephone}
            </a>
          )}
          {chefService?.displayName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--ink-2)' }}>
              <UserCog style={{ width: 15, height: 15, color: 'var(--ink-4)', flexShrink: 0 }} /> Chef de service : Dr {chefService.displayName}
            </div>
          )}
        </div>
      )}

      {/* #nouveau (demande utilisateur, "la validité de ce billet de
          consultation") : durée réellement configurée par le sysadmin
          (Paramètres métiers), jamais une valeur inventée — 14 jours par
          défaut si jamais reconfigurée. */}
      {tarif && settings?.dureeValiditeBilletJours && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-3)', marginBottom: 20 }}>
          <CalendarClock style={{ width: 15, height: 15, color: 'var(--ink-4)', flexShrink: 0 }} />
          Un billet de consultation pour ce service reste valable {settings.dureeValiditeBilletJours} jours après sa délivrance à l'accueil.
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 10 }}>Équipe médicale & horaires</p>
        {equipe === null ? (
          <p style={{ fontSize: 12.5, color: 'var(--ink-4)' }}>Chargement…</p>
        ) : !equipe.length ? (
          <p style={{ fontSize: 12.5, color: 'var(--ink-4)' }}>Aucun planning renseigné pour ce service pour le moment.</p>
        ) : (
          <div className="space-y-2">
            {equipe.map((m) => (
              <div key={m.uid} style={{ background: 'var(--bg-2)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: m.horaires?.length ? 8 : 0 }}>
                  {m.photoURL ? (
                    <img src={m.photoURL} alt={m.nom} style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', flexShrink: 0 }}>
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
        )}
      </div>

      {user && (
        <button onClick={() => navigate(`../../rdv?service=${service.id}`)} className="btn-primary">
          Prendre RDV pour ce service
        </button>
      )}
    </div>
  );
}
