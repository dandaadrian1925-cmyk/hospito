import { useEffect, useState, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { CalendarClock, Video } from 'lucide-react';
import { getMesDemandesRdv } from '../../services/demandesRendezVousService';
import SectionCTA from '../../components/etablissement/SectionCTA';

const LABEL_STATUT = { en_attente: 'En attente de confirmation', confirme: 'Confirmé', refuse: 'Refusé', absent: 'Non honoré', termine: 'Terminé', annule: 'Annulé' };

// #nouveau (demande utilisateur, "le bouton de Rejoindre la téléconsultation
// soit grisé avant le jour du rendez vous") : même règle que
// RendezVousDetailPage (mon-compte) — cohérence entre les deux listes.
const estLeJourDuRdv = (dateHeure) => {
  if (!dateHeure?.toDate) return false;
  const d = dateHeure.toDate();
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
};

// #nouveau (demande utilisateur, "les demandes passées ne s'affichent pas
// là-bas, enlève ça et affiche-les dans mes rendez-vous de l'espace
// patient") : liste des demandes de RDV du patient pour CET établissement,
// déplacée hors du formulaire "Prendre RDV" (TabRdv) vers sa propre page,
// accessible depuis le menu Espace Patient de l'en-tête.
export default function EtablissementMesRendezVousPage() {
  const { etablissementId, user } = useOutletContext();
  const navigate = useNavigate();
  const [demandes, setDemandes] = useState(null);

  const recharger = useCallback(() => {
    if (!user) return;
    getMesDemandesRdv(user.uid)
      .then((all) => setDemandes(all.filter((d) => d.etablissementId === etablissementId)))
      .catch(() => setDemandes([]));
  }, [user, etablissementId]);

  useEffect(() => { recharger(); }, [recharger]);

  if (!user) return <SectionCTA action="consulter vos rendez-vous" />;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <CalendarClock style={{ width: 18, height: 18, color: 'var(--blue)' }} />
        <p style={{ fontSize: 13, color: 'var(--ink-4)' }}>Vos demandes de rendez-vous auprès de cet établissement.</p>
      </div>

      {demandes === null ? (
        <p style={{ fontSize: 13, color: 'var(--ink-4)' }}>Chargement…</p>
      ) : demandes.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--ink-4)' }}>Aucune demande de rendez-vous pour le moment.</p>
      ) : (
        <div className="space-y-2">
          {demandes.map((d) => (
            // #nouveau (demande utilisateur, "card rectangulaire avec mini
            // ombre... lorsqu'on clique ça ouvre une nouvelle page avec les
            // détails") : renvoie vers la MÊME page de détails que "Mon
            // compte > Mes rendez-vous" (annulation, téléconsultation plein
            // écran) — jamais une seconde implémentation à maintenir.
            <div
              key={d.id}
              onClick={() => navigate(`/mon-compte/rendez-vous/${d.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/mon-compte/rendez-vous/${d.id}`); }}
              style={{ padding: '12px 16px', background: 'white', borderRadius: 10, fontSize: 13.5, boxShadow: '0 2px 10px rgba(15,23,42,0.06)', cursor: 'pointer' }}
            >
              {d.patientFicheId && <p style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--blue)', marginBottom: 2 }}>Pour {d.patientNom}</p>}
              <strong>{d.motif}</strong>
              {d.serviceNom && <span style={{ color: 'var(--ink-3)', marginLeft: 8 }}>({d.serviceNom})</span>}
              {d.type === 'teleconsultation' && <span style={{ color: 'var(--blue)', marginLeft: 8, fontWeight: 700 }}>Téléconsultation</span>}
              <span style={{ color: 'var(--ink-3)', marginLeft: 8 }}>{LABEL_STATUT[d.statut] || d.statut}</span>
              {d.dateHeure?.toDate && (
                <p style={{ color: 'var(--ink-3)', marginTop: 4 }}>{d.dateHeure.toDate().toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}</p>
              )}
              {/* #corrigé (audit, "cette liste n'affiche jamais le médecin
                  confirmé contrairement à l'autre") : d.medecinNom existe
                  déjà (posé par confirmerDemande, hospito-accueil-medecin). */}
              {d.medecinNom && <p style={{ color: 'var(--ink-3)', marginTop: 2 }}>Dr {d.medecinNom}</p>}
              {d.type === 'teleconsultation' && d.statut === 'confirme' && (
                <p style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: estLeJourDuRdv(d.dateHeure) ? 'var(--blue)' : '#94A3B8' }}>
                  <Video style={{ width: 13, height: 13 }} />
                  {estLeJourDuRdv(d.dateHeure) ? 'Rejoindre la téléconsultation' : "Rejoindre la téléconsultation (le jour du rendez-vous)"}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
