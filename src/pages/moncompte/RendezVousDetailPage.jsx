import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ChevronLeft, Clock, Video, MapPin, Loader2, XCircle } from 'lucide-react';
import { getDemandeRdv, annulerDemandeRdv } from '../../services/demandesRendezVousService';
import { getEtablissement } from '../../services/etablissementsPublicService';
import TeleconsultationCallWidget from '../../components/teleconsultation/TeleconsultationCallWidget';

const STATUT_STYLES = {
  en_attente: { bg: '#FFFBEB', color: '#D97706', label: 'En attente de confirmation' },
  confirme: { bg: '#F0FDF4', color: '#059669', label: 'Confirmé' },
  refuse: { bg: '#FEF2F2', color: '#DC2626', label: 'Refusé' },
  absent: { bg: '#FEF2F2', color: '#DC2626', label: 'Non honoré' },
  termine: { bg: '#F0FDF4', color: '#059669', label: 'Terminé' },
  annule: { bg: '#F1F5F9', color: '#64748B', label: 'Annulé' },
};

const formatDate = (value) => {
  if (!value) return null;
  const date = value.toDate ? value.toDate() : new Date(value);
  return date.toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' });
};

// #nouveau (demande utilisateur, "le bouton de Rejoindre la téléconsultation
// soit grisé avant le jour du rendez vous") : autorisé dès que la date du
// jour correspond à celle du rendez-vous, jamais avant — la salle d'attente
// virtuelle du widget gère déjà l'attente jusqu'à l'heure précise.
const estLeJourDuRdv = (dateHeure) => {
  if (!dateHeure?.toDate) return false;
  const d = dateHeure.toDate();
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
};

// #nouveau (demande utilisateur, "lorsqu'on clique [sur la card] ça ouvre une
// nouvelle page avec les détails et donc il sera possible d'annuler, pas de
// modifier") : page dédiée, séparée de la liste — annulation uniquement,
// jamais d'édition (motif/date/service restent ceux transmis à l'accueil).
export default function RendezVousDetailPage() {
  const { demandeId } = useParams();
  const navigate = useNavigate();
  const [demande, setDemande] = useState(null);
  const [etab, setEtab] = useState(null);
  const [annulation, setAnnulation] = useState(false);
  // #nouveau (demande utilisateur, "un écran de téléconsultation assez grand
  // qu'il pourrait prendre tout l'écran si c'est sur mobile") : calque plein
  // écran superposé à cette page, jamais un widget compact intégré au flux.
  const [enAppel, setEnAppel] = useState(false);

  const charger = useCallback(() => {
    getDemandeRdv(demandeId).then(async (d) => {
      setDemande(d);
      if (d?.etablissementId) setEtab(await getEtablissement(d.etablissementId));
    }).catch(() => setDemande(false));
  }, [demandeId]);

  useEffect(() => { charger(); }, [charger]);

  if (demande === null) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
      <Loader2 style={{ width: 24, height: 24, color: '#94A3B8' }} className="animate-spin" />
    </div>;
  }

  if (!demande) {
    return <p style={{ fontSize: 13, color: 'var(--ink-4)' }}>Ce rendez-vous est introuvable.</p>;
  }

  const style = STATUT_STYLES[demande.statut] || { bg: '#F1F5F9', color: '#64748B', label: demande.statut };
  const peutAnnuler = demande.statut === 'en_attente' || demande.statut === 'confirme';
  const estTeleconsultation = demande.type === 'teleconsultation';
  const jourVenu = estLeJourDuRdv(demande.dateHeure);

  const handleAnnuler = async () => {
    if (!window.confirm('Voulez-vous vraiment annuler ce rendez-vous ?')) return;
    setAnnulation(true);
    try {
      await annulerDemandeRdv(demande);
      toast.success('Rendez-vous annulé.');
      charger();
    } catch (e) {
      console.error('annulerDemandeRdv a échoué :', e);
      toast.error("Échec de l'annulation — réessayez.");
    } finally {
      setAnnulation(false);
    }
  };

  return (
    <div>
      <Link to="/mon-compte/rendez-vous" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#64748B', fontSize: 13, fontWeight: 600, marginBottom: 16, textDecoration: 'none' }}>
        <ChevronLeft style={{ width: 16, height: 16 }} /> Mes rendez-vous
      </Link>

      <div style={{ background: 'white', borderRadius: 16, border: '1.5px solid #F1F5F9', boxShadow: '0 2px 10px rgba(15,23,42,0.06)', padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>{etab?.nom || 'Établissement'}</p>
            {demande.patientFicheId && <p style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Pour {demande.patientNom}</p>}
          </div>
          <span style={{ flexShrink: 0, background: style.bg, color: style.color, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999 }}>{style.label}</span>
        </div>

        {demande.serviceNom && <p style={{ fontSize: 13, color: '#64748B', marginBottom: 4 }}>{demande.serviceNom}</p>}
        <p style={{ fontSize: 14, color: '#374151', marginBottom: 14 }}>{demande.motif}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: '#374151', marginBottom: 16 }}>
          {estTeleconsultation && <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Video style={{ width: 14, height: 14, color: '#64748B' }} /> Téléconsultation</span>}
          {demande.dateHeure && <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Clock style={{ width: 14, height: 14, color: '#64748B' }} /> {formatDate(demande.dateHeure)}</span>}
          {demande.medecinNom && <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MapPin style={{ width: 14, height: 14, color: '#64748B' }} /> Dr {demande.medecinNom}</span>}
        </div>

        {estTeleconsultation && demande.statut === 'confirme' && (
          <button
            onClick={() => jourVenu && setEnAppel(true)}
            disabled={!jourVenu}
            className="btn-primary"
            title={!jourVenu ? 'Disponible le jour du rendez-vous' : undefined}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12,
              ...(jourVenu ? {} : { background: '#E2E8F0', color: '#94A3B8', cursor: 'not-allowed' }),
            }}
          >
            <Video style={{ width: 16, height: 16 }} /> Rejoindre la téléconsultation
          </button>
        )}

        {peutAnnuler && (
          <button
            onClick={handleAnnuler}
            disabled={annulation}
            className="btn-outline"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#DC2626', borderColor: '#FECACA' }}
          >
            <XCircle style={{ width: 16, height: 16 }} /> {annulation ? 'Annulation…' : 'Annuler le rendez-vous'}
          </button>
        )}
      </div>

      {enAppel && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#111' }}>
          <TeleconsultationCallWidget demandeId={demande.id} grand onFermer={() => setEnAppel(false)} />
        </div>
      )}
    </div>
  );
}
