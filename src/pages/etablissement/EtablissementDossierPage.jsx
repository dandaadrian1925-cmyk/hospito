import { useOutletContext } from 'react-router-dom';
import DossierMedicalView from '../../components/dossier/DossierMedicalView';
import ConsentementSignature from '../../components/etablissement/ConsentementSignature';
import SectionCTA from '../../components/etablissement/SectionCTA';

export default function EtablissementDossierPage() {
  const { etablissementId, user, userProfile } = useOutletContext();
  const patientNom = userProfile?.displayName || `${userProfile?.prenom || ''} ${userProfile?.nom || ''}`.trim();

  if (!user) return <SectionCTA action="consulter votre dossier médical" />;

  return (
    <>
      <ConsentementSignature etablissementId={etablissementId} patientUid={user.uid} patientNom={patientNom} />
      <DossierMedicalView cni={userProfile?.numeroIdentiteNational} />
    </>
  );
}
