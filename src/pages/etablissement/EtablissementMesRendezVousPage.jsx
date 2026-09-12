import { useEffect, useState, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { CalendarClock } from 'lucide-react';
import { getMesDemandesRdv } from '../../services/demandesRendezVousService';
import TeleconsultationCallWidget from '../../components/teleconsultation/TeleconsultationCallWidget';
import SectionCTA from '../../components/etablissement/SectionCTA';

const LABEL_STATUT = { en_attente: 'En attente de confirmation', confirme: 'Confirmé', refuse: 'Refusé', absent: 'Non honoré', termine: 'Terminé' };

// #nouveau (demande utilisateur, "les demandes passées ne s'affichent pas
// là-bas, enlève ça et affiche-les dans mes rendez-vous de l'espace
// patient") : liste des demandes de RDV du patient pour CET établissement,
// déplacée hors du formulaire "Prendre RDV" (TabRdv) vers sa propre page,
// accessible depuis le menu Espace Patient de l'en-tête.
export default function EtablissementMesRendezVousPage() {
  const { etablissementId, user } = useOutletContext();
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
            <div key={d.id} style={{ padding: '12px 16px', background: 'var(--bg-2)', borderRadius: 10, fontSize: 13.5 }}>
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
                <div style={{ marginTop: 10 }}>
                  <TeleconsultationCallWidget demandeId={d.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
