import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import DossierMedicalView from '../../components/dossier/DossierMedicalView';
import ConsentementSignature from '../../components/etablissement/ConsentementSignature';
import DemandeInscriptionPatient from '../../components/etablissement/DemandeInscriptionPatient';
import SectionCTA from '../../components/etablissement/SectionCTA';

export default function EtablissementDossierPage() {
  const { etablissementId, user, userProfile } = useOutletContext();
  const patientNom = userProfile?.displayName || `${userProfile?.prenom || ''} ${userProfile?.nom || ''}`.trim();
  // #corrigé (décision utilisateur, "les photos de CNI et la signature sont
  // envoyées en même temps obligatoirement") : la signature ne se capture
  // plus deux fois — DemandeInscriptionPatient l'inclut désormais elle-même
  // quand le patient n'a pas encore de fiche ici. Le composant autonome
  // ConsentementSignature ne réapparaît que pour un patient qui EN a déjà
  // une (aucune vérification CNI en jeu dans ce cas).
  const [aUneFiche, setAUneFiche] = useState(null);

  if (!user) return <SectionCTA action="consulter votre dossier médical" />;

  return (
    <>
      <DemandeInscriptionPatient etablissementId={etablissementId} patientUid={user.uid} userProfile={userProfile} onHasFicheChange={setAUneFiche} />
      {aUneFiche && <ConsentementSignature etablissementId={etablissementId} patientUid={user.uid} patientNom={patientNom} />}
      <DossierMedicalView cni={userProfile?.numeroIdentiteNational} uid={user.uid} nom={userProfile?.nom} prenom={userProfile?.prenom} />
    </>
  );
}
