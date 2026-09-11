import { useOutletContext, useSearchParams } from 'react-router-dom';
import TabRdv from '../../components/etablissement/TabRdv';
import SectionCTA from '../../components/etablissement/SectionCTA';

export default function EtablissementRdvPage() {
  const { etablissementId, user, userProfile } = useOutletContext();
  const [searchParams] = useSearchParams();
  const serviceId = searchParams.get('service');
  // #nouveau (demande utilisateur, "facilité de prendre rendez-vous avec ce
  // médecin là", depuis la page Médecins) : préférence directe, sans passer
  // par la liste des spécialistes de garde (issue des `plannings` datés) —
  // le patient a déjà choisi CE médecin précis sur la page annuaire.
  const medecinId = searchParams.get('medecin');
  const medecinNom = searchParams.get('medecinNom');
  const patientNom = userProfile?.displayName || `${userProfile?.prenom || ''} ${userProfile?.nom || ''}`.trim();

  if (!user) return <SectionCTA action="prendre rendez-vous" />;

  return (
    <TabRdv
      etablissementId={etablissementId} patientUid={user.uid} patientNom={patientNom}
      initialServiceId={serviceId} initialMedecin={medecinId ? { uid: medecinId, nom: medecinNom } : null}
    />
  );
}
