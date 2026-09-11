import { useOutletContext } from 'react-router-dom';
import TabSecurite from '../../components/etablissement/TabSecurite';
import SectionCTA from '../../components/etablissement/SectionCTA';

export default function EtablissementSecuritePage() {
  const { etablissementId, user } = useOutletContext();

  if (!user) return <SectionCTA action="faire un signalement" />;

  return <TabSecurite etablissementId={etablissementId} patientUid={user.uid} />;
}
