import { useOutletContext } from 'react-router-dom';
import TabMessagerie from '../../components/etablissement/TabMessagerie';
import SectionCTA from '../../components/etablissement/SectionCTA';

export default function EtablissementMessageriePage() {
  const { etablissement, etablissementId, user } = useOutletContext();

  if (!user) return <SectionCTA action="échanger avec l'établissement" />;

  return <TabMessagerie etablissementId={etablissementId} patientUid={user.uid} etablissementNom={etablissement.nom} />;
}
