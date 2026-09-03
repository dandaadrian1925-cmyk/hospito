import { useAuth } from '../../context/AuthContext';
import DossierMedicalView from '../../components/dossier/DossierMedicalView';

export default function DossierPage() {
  const { userProfile } = useAuth();
  return <DossierMedicalView cni={userProfile?.numeroIdentiteNational} />;
}
