import { useOutletContext, Link } from 'react-router-dom';
import { MapPin, Phone, MessageCircle, AlertTriangle, Clock } from 'lucide-react';
import InfosPratiquesSection from '../../components/etablissement/InfosPratiquesSection';
import EtablissementAssistantIA from '../../components/etablissement/EtablissementAssistantIA';

export default function EtablissementContactPage() {
  const { etablissement, etablissementId, tarifs, apropos, user, userProfile } = useOutletContext();
  const telephone = etablissement.contactTelephone;
  const telephoneWhatsapp = telephone ? telephone.replace(/[^\d+]/g, '') : null;
  const aDesCoordonneesGPS = Number.isFinite(etablissement.gpsLat) && Number.isFinite(etablissement.gpsLng);

  return (
    <div>
      <div className="space-y-3" style={{ marginBottom: 28 }}>
        {etablissement.adresse && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: 'var(--bg-2)', borderRadius: 10 }}>
            <MapPin style={{ width: 17, height: 17, color: 'var(--ink-4)', flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 13.5, color: 'var(--ink-2)' }}>{etablissement.adresse}</span>
          </div>
        )}

        {etablissement.horaireOuvertureGlobale && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: 'var(--bg-2)', borderRadius: 10 }}>
            <Clock style={{ width: 17, height: 17, color: 'var(--ink-4)', flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 13.5, color: 'var(--ink-2)' }}>{etablissement.horaireOuvertureGlobale}</span>
          </div>
        )}

        {telephone && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <a
              href={`tel:${telephone}`}
              className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Phone style={{ width: 15, height: 15 }} /> Appeler {telephone}
            </a>
            <a
              href={`https://wa.me/${telephoneWhatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="btn-outline"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <MessageCircle style={{ width: 15, height: 15 }} /> WhatsApp
            </a>
          </div>
        )}

        {!etablissement.adresse && !telephone && (
          <p style={{ fontSize: 13, color: 'var(--ink-4)' }}>Aucune coordonnée renseignée par l'établissement pour le moment.</p>
        )}
      </div>

      <InfosPratiquesSection etablissementId={etablissementId} />

      <div style={{ marginBottom: 28 }}>
        <EtablissementAssistantIA etablissement={etablissement} tarifs={tarifs} apropos={apropos} user={user} userProfile={userProfile} />
      </div>

      <Link
        to="/urgence"
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: 10, textDecoration: 'none', marginBottom: 28 }}
      >
        <AlertTriangle style={{ width: 17, height: 17, color: '#C2402F', flexShrink: 0 }} />
        <span style={{ fontSize: 13.5, fontWeight: 600, color: '#C2402F' }}>Besoin d'une urgence ? Voir le numéro d'urgence</span>
      </Link>

      {/* #nouveau (demande utilisateur, "un map bien designé en bas avec les
          coordonnées GPS entrées par le super admin") : embed Google Maps
          sans clé API (output=embed) — affiché uniquement si le sysadmin a
          renseigné de vraies coordonnées (Site web > Informations générales). */}
      {aDesCoordonneesGPS && (
        <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border, #E2E8F0)' }}>
          <iframe
            title={`Localisation de ${etablissement.nom}`}
            src={`https://www.google.com/maps?q=${etablissement.gpsLat},${etablissement.gpsLng}&output=embed`}
            style={{ width: '100%', height: 280, border: 0, display: 'block' }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      )}
    </div>
  );
}
