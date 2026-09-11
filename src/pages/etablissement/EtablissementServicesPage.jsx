import { useOutletContext, useNavigate, useSearchParams } from 'react-router-dom';
import ServicesSection from '../../components/etablissement/ServicesSection';

export default function EtablissementServicesPage() {
  const { etablissementId, tarifs, user } = useOutletContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const serviceInitial = searchParams.get('service');

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--ink-4)', marginBottom: 16 }}>Parcourez l'établissement service par service.</p>
      <ServicesSection
        etablissementId={etablissementId}
        tarifs={tarifs}
        peutPrendreRdv={!!user}
        initialExpandedId={serviceInitial}
        onPrendreRdv={(service) => navigate(`../rdv?service=${service.id}`)}
      />
    </div>
  );
}
