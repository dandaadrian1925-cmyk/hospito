import { useOutletContext, useSearchParams } from 'react-router-dom';
import TabRdv from '../../components/etablissement/TabRdv';
import SectionCTA from '../../components/etablissement/SectionCTA';

export default function EtablissementRdvPage() {
  const { etablissementId, user, userProfile } = useOutletContext();
  const [searchParams] = useSearchParams();
  const serviceId = searchParams.get('service');
  const patientNom = userProfile?.displayName || `${userProfile?.prenom || ''} ${userProfile?.nom || ''}`.trim();

  if (!user) return <SectionCTA action="prendre rendez-vous" />;

  return (
    <TabRdv etablissementId={etablissementId} patientUid={user.uid} patientNom={patientNom} initialServiceId={serviceId} />
  );
}
