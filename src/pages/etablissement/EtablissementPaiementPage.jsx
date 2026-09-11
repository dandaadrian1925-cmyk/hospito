import { useOutletContext } from 'react-router-dom';
import TabPaiement from '../../components/etablissement/TabPaiement';
import SectionCTA from '../../components/etablissement/SectionCTA';

export default function EtablissementPaiementPage() {
  const { etablissementId, user } = useOutletContext();

  if (!user) return <SectionCTA action="gérer vos paiements" />;

  return <TabPaiement patientUid={user.uid} etablissementId={etablissementId} />;
}
