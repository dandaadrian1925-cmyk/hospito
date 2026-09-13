import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, ChevronLeft } from 'lucide-react';

const LIENS_SITE = [
  { to: 'services', label: 'Services' },
  { to: 'equipe', label: 'Équipe médicale' },
  { to: 'avis', label: 'Avis patients' },
  { to: 'actualites', label: 'Actualités' },
  { to: 'apropos', label: 'À propos' },
  { to: 'contact', label: 'Contact' },
];

const LIENS_PATIENT = [
  { to: 'rdv', label: 'Prendre rendez-vous' },
  { to: 'mes-rendez-vous', label: 'Mes rendez-vous' },
  { to: 'dossier', label: 'Mon dossier' },
  { to: 'paiement', label: 'Paiement' },
];

export default function EtablissementSiteFooter({ etablissement }) {
  return (
    <footer style={{ background: 'var(--primary-dark, #174858)', color: 'rgba(255,255,255,0.85)', marginTop: 32, fontSize: 13 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px 14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))', columnGap: 24, rowGap: 18 }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'white', marginBottom: 6 }}>{etablissement.nom}</p>
          <div className="space-y-1">
            {etablissement.adresse && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12.5 }}>
                <MapPin style={{ width: 13, height: 13, flexShrink: 0, marginTop: 2 }} /> {etablissement.adresse}
              </div>
            )}
            {etablissement.contactTelephone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
                <Phone style={{ width: 13, height: 13, flexShrink: 0 }} /> {etablissement.contactTelephone}
              </div>
            )}
            {etablissement.contactEmail && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
                <Mail style={{ width: 13, height: 13, flexShrink: 0 }} /> {etablissement.contactEmail}
              </div>
            )}
          </div>
        </div>

        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'white', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.03em' }}>L'établissement</p>
          <div className="space-y-1">
            {LIENS_SITE.map((l) => (
              <Link key={l.to} to={l.to} style={{ display: 'block', fontSize: 12.5, color: 'inherit', textDecoration: 'none' }}>{l.label}</Link>
            ))}
          </div>
        </div>

        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'white', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Espace patient</p>
          <div className="space-y-1">
            {LIENS_PATIENT.map((l) => (
              <Link key={l.to} to={l.to} style={{ display: 'block', fontSize: 12.5, color: 'inherit', textDecoration: 'none' }}>{l.label}</Link>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          borderTop: '1px solid rgba(255,255,255,0.15)', padding: '10px 20px', maxWidth: 1100, margin: '0 auto',
          display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between', fontSize: 11.5,
        }}
      >
        {/* #corrigé (retour utilisateur, capture d'écran) : la bulle de chat
            support flottante (fixed, bas-droite) recouvrait ce lien quand il
            était à droite — placé à gauche, seul le texte décoratif
            "Propulsé par" reste dans la zone que la bulle peut chevaucher. */}
        <Link to="/" style={{ color: 'white', textDecoration: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <ChevronLeft style={{ width: 13, height: 13 }} /> Retour à HostoConnect
        </Link>
        <span>Propulsé par HostoConnect</span>
      </div>
    </footer>
  );
}
