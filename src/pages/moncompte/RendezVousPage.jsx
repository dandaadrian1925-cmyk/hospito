import { useState, useEffect } from 'react';
import { CalendarPlus, Clock, Video, MapPin, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getMesDemandesRdv } from '../../services/demandesRendezVousService';
import { getEtablissement } from '../../services/etablissementsPublicService';
import TeleconsultationCallWidget from '../../components/teleconsultation/TeleconsultationCallWidget';

const STATUT_STYLES = {
  en_attente: { bg: '#FFFBEB', color: '#D97706', label: 'En attente de confirmation' },
  confirme: { bg: '#F0FDF4', color: '#059669', label: 'Confirmé' },
  refuse: { bg: '#FEF2F2', color: '#DC2626', label: 'Refusé' },
  // #nouveau (automatisation, tâche planifiée côté serveur) : un RDV confirmé
  // dont l'heure est passée sans qu'aucune admission n'ait suivi bascule
  // automatiquement ici — jusque-là un RDV manqué restait "Confirmé" pour
  // toujours, sans distinction avec un RDV réellement honoré.
  absent: { bg: '#FEF2F2', color: '#DC2626', label: 'Non honoré' },
};

const formatDate = (value) => {
  if (!value) return null;
  const date = value.toDate ? value.toDate() : new Date(value);
  return date.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
};

export default function RendezVousPage() {
  const { user } = useAuth();
  const [demandes, setDemandes] = useState(null);
  const [etablissements, setEtablissements] = useState({});

  useEffect(() => {
    if (!user) return;
    getMesDemandesRdv(user.uid).then(async (liste) => {
      setDemandes(liste);
      const ids = [...new Set(liste.map((d) => d.etablissementId))];
      const entries = await Promise.all(ids.map(async (id) => [id, await getEtablissement(id)]));
      setEtablissements(Object.fromEntries(entries));
    }).catch(() => setDemandes([]));
  }, [user]);

  if (demandes === null) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
      <Loader2 style={{ width: 24, height: 24, color: '#94A3B8' }} className="animate-spin" />
    </div>;
  }

  if (!demandes.length) {
    return <div style={{ textAlign: 'center', padding: '48px 20px', background: 'white', borderRadius: 16, border: '1.5px solid #F1F5F9' }}>
      <CalendarPlus style={{ width: 32, height: 32, color: '#CBD5E1', margin: '0 auto 12px' }} />
      <p style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>Aucun rendez-vous pour le moment</p>
      <p style={{ fontSize: 13, color: '#94A3B8' }}>Vos demandes de rendez-vous auprès des établissements apparaîtront ici.</p>
    </div>;
  }

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    {demandes.map((d) => {
      const style = STATUT_STYLES[d.statut] || { bg: '#F1F5F9', color: '#64748B', label: d.statut };
      const etab = etablissements[d.etablissementId];
      return <div key={d.id} style={{ background: 'white', borderRadius: 16, border: '1.5px solid #F1F5F9', padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{etab?.nom || 'Établissement'}</p>
            {/* #nouveau (demande utilisateur, "un bébé ou une personne âgée
                sans compte doit aussi pouvoir être pris en compte") : cette
                liste reste UNE liste (celle du tuteur) — ce label distingue
                simplement une demande faite pour un proche. */}
            {d.patientFicheId && <p style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>Pour {d.patientNom}</p>}
            {d.serviceNom && <p style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>{d.serviceNom}</p>}
          </div>
          <span style={{ flexShrink: 0, background: style.bg, color: style.color, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999 }}>{style.label}</span>
        </div>
        <p style={{ fontSize: 13, color: '#374151', marginBottom: 10 }}>{d.motif}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 12, color: '#64748B' }}>
          {d.type === 'teleconsultation' && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Video style={{ width: 13, height: 13 }} /> Téléconsultation</span>}
          {d.dateHeure && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock style={{ width: 13, height: 13 }} /> {formatDate(d.dateHeure)}</span>}
          {d.medecinNom && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin style={{ width: 13, height: 13 }} /> Dr {d.medecinNom}</span>}
        </div>
        {d.statut === 'confirme' && d.type === 'teleconsultation' && <div style={{ marginTop: 12 }}>
          <TeleconsultationCallWidget demandeId={d.id} />
        </div>}
      </div>;
    })}
  </div>;
}
