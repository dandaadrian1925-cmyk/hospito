import { useOutletContext } from 'react-router-dom';
import ServicesSection from '../../components/etablissement/ServicesSection';

export default function EtablissementServicesPage() {
  const { etablissementId, tarifs } = useOutletContext();

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--ink-4)', marginBottom: 16 }}>Parcourez l'établissement service par service.</p>
      <ServicesSection etablissementId={etablissementId} tarifs={tarifs} />
    </div>
  );
}
