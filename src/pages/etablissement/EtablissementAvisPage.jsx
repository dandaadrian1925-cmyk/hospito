import { useState, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import AvisPublicSection from '../../components/etablissement/AvisPublicSection';
import TabAvis from '../../components/etablissement/TabAvis';
import SectionCTA from '../../components/etablissement/SectionCTA';

export default function EtablissementAvisPage() {
  const { etablissementId, user, userProfile } = useOutletContext();
  const [refreshKey, setRefreshKey] = useState(0);
  const rafraichir = useCallback(() => setRefreshKey((k) => k + 1), []);
  const patientNom = userProfile?.displayName || `${userProfile?.prenom || ''} ${userProfile?.nom || ''}`.trim();

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>Avis des patients</p>
        <AvisPublicSection key={refreshKey} etablissementId={etablissementId} />
      </div>
      <div>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>Donner mon avis</p>
        {user ? (
          <TabAvis etablissementId={etablissementId} patientUid={user.uid} patientNom={patientNom} onAvisChange={rafraichir} />
        ) : (
          <SectionCTA action="déposer votre avis" />
        )}
      </div>
    </div>
  );
}
