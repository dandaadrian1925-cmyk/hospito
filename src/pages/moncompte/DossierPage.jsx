import { FolderHeart } from 'lucide-react';

export default function DossierPage() {
  return <div style={{ textAlign: 'center', padding: '48px 20px', background: 'white', borderRadius: 16, border: '1.5px solid #F1F5F9' }}>
    <FolderHeart style={{ width: 32, height: 32, color: '#CBD5E1', margin: '0 auto 12px' }} />
    <p style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>Bientôt disponible</p>
    <p style={{ fontSize: 13, color: '#94A3B8', maxWidth: 320, margin: '0 auto' }}>
      Votre dossier médical partagé — consultable dans tous vos établissements HostoConnect — arrive prochainement.
    </p>
  </div>;
}
