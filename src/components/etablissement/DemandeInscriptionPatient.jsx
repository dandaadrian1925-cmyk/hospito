import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Upload, ShieldCheck } from 'lucide-react';
import { aDejaUneFicheIci, getMaDemandeInscription, creerDemandeInscription } from '../../services/demandesInscriptionService';
import { uploadFile } from '../../supabase/config';

// #nouveau (décision utilisateur, "c'est cette vérification-ci [recto/verso/
// selfie] qui doit être envoyée avec la signature de consentement, en
// disant clairement que les documents seront supprimés 24h après
// approbation") : petit champ d'upload compact, réutilisé 3 fois (recto,
// verso, selfie) — même bucket privé "cni" que l'ancienne page dédiée,
// jamais public.
function ChampPhoto({ label, fichier, onChange }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 8, border: fichier ? '1.5px solid #10B981' : '1.5px dashed #CBD5E1',
      borderRadius: 10, padding: '10px 12px', cursor: 'pointer', background: fichier ? '#F0FDF4' : '#F8FAFC',
    }}
    >
      <Upload size={15} style={{ color: fichier ? '#059669' : '#94A3B8', flexShrink: 0 }} />
      <span style={{ fontSize: 12.5, color: fichier ? '#059669' : '#64748B', fontWeight: 600 }}>
        {fichier ? `✅ ${label}` : label}
      </span>
      <input type="file" accept="image/*" onChange={(e) => onChange(e.target.files?.[0] || null)} style={{ display: 'none' }} />
    </label>
  );
}

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
  const [recto, setRecto] = useState(null);
  const [verso, setVerso] = useState(null);
  const [selfie, setSelfie] = useState(null);

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
      toast.error("Renseignez d'abord votre numéro d'identité national plus bas sur cette page (section Dossier médical).");
      return;
    }
    if (!form.dateNaissance || !form.sexe) {
      toast.error('Date de naissance et sexe sont requis.');
      return;
    }
    if (!recto || !verso || !selfie) {
      toast.error('Les deux faces de votre CNI et une photo avec la CNI en main sont requises.');
      return;
    }
    setEnvoi(true);
    try {
      const [rectoUp, versoUp, selfieUp] = await Promise.all([
        uploadFile('cni', `${patientUid}/recto_${Date.now()}`, recto),
        uploadFile('cni', `${patientUid}/verso_${Date.now()}`, verso),
        uploadFile('cni', `${patientUid}/selfie_${Date.now()}`, selfie),
      ]);
      await creerDemandeInscription({
        patientUid, etablissementId,
        nom: userProfile.nom, prenom: userProfile.prenom,
        dateNaissance: form.dateNaissance, sexe: form.sexe, telephone: form.telephone,
        numeroIdentiteNational: userProfile.numeroIdentiteNational,
        cniRectoPath: rectoUp.path, cniVersoPath: versoUp.path, cniSelfiePath: selfieUp.path,
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

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 6 }}>Vérification d'identité (CNI)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <ChampPhoto label="Recto de la CNI" fichier={recto} onChange={setRecto} />
              <ChampPhoto label="Verso de la CNI" fichier={verso} onChange={setVerso} />
              <ChampPhoto label="Photo de vous tenant la CNI" fichier={selfie} onChange={setSelfie} />
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, background: '#EFF6FF', border: '1.5px solid #BFDBFE', borderRadius: 10, padding: '8px 10px' }}>
              <ShieldCheck size={14} style={{ color: '#2FB4A0', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 11.5, color: '#1E40AF', lineHeight: 1.5 }}>
                Envoyés avec votre signature de consentement ci-dessus, examinés par le personnel de cet établissement, puis <strong>supprimés dans les 24h suivant l'approbation</strong>.
              </p>
            </div>
          </div>

          <button onClick={envoyer} disabled={envoi} className="btn-primary">
            {envoi ? 'Envoi…' : 'Envoyer la demande'}
          </button>
        </>
      )}
    </div>
  );
}
