import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { aDejaUneFicheIci, getMaDemandeInscription, creerDemandeInscription } from '../../services/demandesInscriptionService';

const LABEL_STATUT = {
  en_attente: { texte: 'Demande en attente de validation par l\'établissement.', bg: '#FFFBEB', border: '#FDE68A', couleur: '#92400E' },
  refusee: { texte: 'Demande refusée — vous pouvez en soumettre une nouvelle.', bg: '#FEF2F2', border: '#FECACA', couleur: '#991B1B' },
};

// #nouveau (demande utilisateur, "le patient puisse donner l'autorisation à
// chaque établissement d'accéder à ses dossiers médicaux, et envoie une
// demande pour être dans la liste des patients de cet établissement") :
// jusqu'ici, seule une visite physique (fiche créée par l'accueil/admin)
// donnait accès à un établissement. Complète (ne remplace pas) le
// consentement de partage déjà signé juste au-dessus (ConsentementSignature)
// — être dans la liste des patients ET avoir signé le consentement sont
// les deux faces du même besoin : que cet établissement puisse constituer
// un dossier pour ce patient.
export default function DemandeInscriptionPatient({ etablissementId, patientUid, userProfile }) {
  const [etat, setEtat] = useState(undefined); // undefined = chargement, 'a_une_fiche' | demande | null (aucune)
  const [form, setForm] = useState({ dateNaissance: '', sexe: '', telephone: '' });
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(async () => {
    const dejaFiche = await aDejaUneFicheIci(patientUid, etablissementId);
    if (dejaFiche) { setEtat('a_une_fiche'); return; }
    const demande = await getMaDemandeInscription(patientUid, etablissementId);
    setEtat(demande && demande.statut !== 'refusee' ? demande : null);
  }, [patientUid, etablissementId]);
  useEffect(() => { charger().catch(() => setEtat(null)); }, [charger]);

  if (etat === undefined || etat === 'a_une_fiche') return null;

  if (etat && etat.statut === 'en_attente') {
    const s = LABEL_STATUT.en_attente;
    return (
      <div style={{ background: s.bg, border: `1.5px solid ${s.border}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: s.couleur }}>Inscription comme patient</p>
        <p style={{ fontSize: 12.5, color: s.couleur, marginTop: 4 }}>{s.texte}</p>
      </div>
    );
  }

  const envoyer = async () => {
    if (!userProfile?.numeroIdentiteNational) {
      toast.error("Renseignez d'abord votre numéro d'identité national dans Mon compte.");
      return;
    }
    if (!form.dateNaissance || !form.sexe) {
      toast.error('Date de naissance et sexe sont requis.');
      return;
    }
    setEnvoi(true);
    try {
      await creerDemandeInscription({
        patientUid, etablissementId,
        nom: userProfile.nom, prenom: userProfile.prenom,
        dateNaissance: form.dateNaissance, sexe: form.sexe, telephone: form.telephone,
        numeroIdentiteNational: userProfile.numeroIdentiteNational,
      });
      toast.success('Demande envoyée — vous serez inscrit dès validation par le personnel.');
      charger();
    } catch (e) {
      toast.error(e.message || 'Erreur');
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div style={{ background: 'white', border: '1.5px solid #F1F5F9', borderRadius: 14, padding: 16, marginBottom: 16 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>Devenir patient de cet établissement</p>
      <p style={{ fontSize: 12.5, color: '#64748B', marginBottom: 12, lineHeight: 1.5 }}>
        Vous n'avez jamais de fiche ici. Envoyez une demande — un membre du personnel la validera avant de créer votre fiche.
      </p>
      {!userProfile?.numeroIdentiteNational ? (
        <p style={{ fontSize: 12.5, color: '#B45309' }}>
          Complétez d'abord votre <Link to="/mon-compte" style={{ fontWeight: 700, textDecoration: 'underline' }}>numéro d'identité national</Link> pour pouvoir envoyer cette demande.
        </p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 4 }}>Date de naissance</label>
              <input type="date" value={form.dateNaissance} onChange={(e) => setForm({ ...form, dateNaissance: e.target.value })} className="input-field" style={{ fontSize: 13 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 4 }}>Sexe</label>
              <select value={form.sexe} onChange={(e) => setForm({ ...form, sexe: e.target.value })} className="input-field" style={{ fontSize: 13 }}>
                <option value="">—</option>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 4 }}>Téléphone (optionnel)</label>
            <input type="tel" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} className="input-field" style={{ fontSize: 13 }} />
          </div>
          <button onClick={envoyer} disabled={envoi} className="btn-primary">
            {envoi ? 'Envoi…' : 'Envoyer la demande'}
          </button>
        </>
      )}
    </div>
  );
}
