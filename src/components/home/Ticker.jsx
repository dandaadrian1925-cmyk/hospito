import { Shield, CalendarPlus, FolderHeart, Lock, CheckCircle, Video } from 'lucide-react';

const items = [
  { icon: Shield, text: 'Secret médical protégé' },
  { icon: CalendarPlus, text: 'Rendez-vous en ligne sans déplacement' },
  { icon: FolderHeart, text: 'Dossier médical partagé entre tous vos établissements' },
  { icon: Video, text: 'Téléconsultation disponible' },
  { icon: Lock, text: 'Paiement sécurisé via Mobile Money' },
  { icon: CheckCircle, text: 'Établissements partenaires vérifiés' },
];

export default function Ticker() {
  const track = [...items, ...items, ...items];
  return (
    <div style={{ background: 'var(--accent-dark)', color: 'white', height: 40, overflow: 'hidden' }}>
      <div className="ticker-outer">
        <div className="ticker-track">
          {track.map((item, i) => (
            <span key={i} className="ticker-item">
              <item.icon style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.7)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'white', whiteSpace: 'nowrap' }}>{item.text}</span>
              <span style={{ color: 'rgba(255,255,255,0.4)', marginLeft: 4 }}>•</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
