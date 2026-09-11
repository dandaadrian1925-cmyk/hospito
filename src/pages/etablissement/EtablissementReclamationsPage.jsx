import { useOutletContext } from 'react-router-dom';
import TabReclamations from '../../components/etablissement/TabReclamations';
import SectionCTA from '../../components/etablissement/SectionCTA';

export default function EtablissementReclamationsPage() {
  const { etablissementId, user } = useOutletContext();

  if (!user) return <SectionCTA action="ouvrir une réclamation" />;

  return <TabReclamations etablissementId={etablissementId} patientUid={user.uid} />;
}
