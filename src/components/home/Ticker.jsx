import { Shield, KeyRound, Star, Zap, CheckCircle } from 'lucide-react';
const items = [{
  icon: Shield,
  text: 'Paiement 100% sécurisé'
}, {
  icon: Star,
  text: 'Factures vérifiées par notre équipe'
}, {
  icon: KeyRound,
  text: 'Remise en main propre sécurisée par code'
}, {
  icon: Zap,
  text: 'Flash Annonces jusqu\'à -50%'
}, {
  icon: CheckCircle,
  text: 'Remboursement garanti sous 48h en cas de litige'
}, {
  icon: Star,
  text: 'Des milliers d\'articles partout au Cameroun'
}, {
  icon: KeyRound,
  text: 'Aucune remise sans le code de l\'acheteur'
}, {
  icon: Zap,
  text: 'Vendez vos articles inutilisés facilement'
}];
export default function Ticker() {
  const track = [...items, ...items, ...items];
  return <div className="bg-primary-600 text-white" style={{
    height: '40px',
    overflow: 'hidden'
  }}>
      <div className="ticker-outer">
        <div className="ticker-track">
          {track.map((item, i) => <span key={i} className="ticker-item">
              <item.icon style={{
            width: 14,
            height: 14,
            color: 'rgba(255,255,255,0.7)',
            flexShrink: 0
          }} />
              <span style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'white',
            whiteSpace: 'nowrap'
          }}>{item.text}</span>
              <span style={{
            color: 'rgba(255,255,255,0.4)',
            marginLeft: 4
          }}>•</span>
            </span>)}
        </div>
      </div>
    </div>;
}
