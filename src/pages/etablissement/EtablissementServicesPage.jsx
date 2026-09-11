import { useOutletContext, useNavigate } from 'react-router-dom';
import ServicesSection from '../../components/etablissement/ServicesSection';

export default function EtablissementServicesPage() {
  const { etablissementId, tarifs, user } = useOutletContext();
  const navigate = useNavigate();

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--ink-4)', marginBottom: 16 }}>Parcourez l'établissement service par service.</p>
      <ServicesSection
        etablissementId={etablissementId}
        tarifs={tarifs}
        peutPrendreRdv={!!user}
        onPrendreRdv={(service) => navigate(`../rdv?service=${service.id}`)}
      />
    </div>
  );
}
