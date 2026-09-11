import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, ChevronLeft } from 'lucide-react';

const LIENS_SITE = [
  { to: 'services', label: 'Services' },
  { to: 'equipe', label: 'Équipe médicale' },
  { to: 'tarifs', label: 'Tarifs' },
  { to: 'avis', label: 'Avis patients' },
  { to: 'contact', label: 'Contact' },
];

const LIENS_PATIENT = [
  { to: 'rdv', label: 'Prendre rendez-vous' },
  { to: 'dossier', label: 'Mon dossier' },
  { to: 'messagerie', label: 'Messagerie' },
  { to: 'paiement', label: 'Paiement' },
];

export default function EtablissementSiteFooter({ etablissement }) {
  return (
    <footer style={{ background: 'var(--primary-dark, #174858)', color: 'rgba(255,255,255,0.85)', marginTop: 48 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 28 }}>
        <div>
          <p style={{ fontSize: 17, fontWeight: 700, color: 'white', marginBottom: 10 }}>{etablissement.nom}</p>
          <div className="space-y-2">
            {etablissement.adresse && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13 }}>
                <MapPin style={{ width: 14, height: 14, flexShrink: 0, marginTop: 2 }} /> {etablissement.adresse}
              </div>
            )}
            {etablissement.contactTelephone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <Phone style={{ width: 14, height: 14, flexShrink: 0 }} /> {etablissement.contactTelephone}
              </div>
            )}
            {etablissement.contactEmail && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <Mail style={{ width: 14, height: 14, flexShrink: 0 }} /> {etablissement.contactEmail}
              </div>
            )}
          </div>
        </div>

        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.03em' }}>L'établissement</p>
          <div className="space-y-2">
            {LIENS_SITE.map((l) => (
              <Link key={l.to} to={l.to} style={{ display: 'block', fontSize: 13.5, color: 'inherit', textDecoration: 'none' }}>{l.label}</Link>
            ))}
          </div>
        </div>

        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Espace patient</p>
          <div className="space-y-2">
            {LIENS_PATIENT.map((l) => (
              <Link key={l.to} to={l.to} style={{ display: 'block', fontSize: 13.5, color: 'inherit', textDecoration: 'none' }}>{l.label}</Link>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          borderTop: '1px solid rgba(255,255,255,0.15)', padding: '16px 24px', maxWidth: 1100, margin: '0 auto',
          display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5,
        }}
      >
        <span>Propulsé par HostoConnect</span>
        <Link to="/" style={{ color: 'white', textDecoration: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <ChevronLeft style={{ width: 13, height: 13 }} /> Retour à HostoConnect
        </Link>
      </div>
    </footer>
  );
}
