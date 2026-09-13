import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Upload, ShieldCheck } from 'lucide-react';
import { getMaFicheIci, getMaDemandeInscription, creerDemandeInscription, resoumettreVerificationCni } from '../../services/demandesInscriptionService';
import { TEXTE_CONSENTEMENT_PARTAGE, signerConsentement } from '../../services/consentementsService';
import { uploadFile } from '../../supabase/config';
import SignaturePad from './SignaturePad';

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

// #nouveau (retour utilisateur, "remets cette page à l'état initiale pour
// que je puisse à nouveau soumettre la demande de vérification" puis
// "afficher le dossier médical... à partir de cet état de l'interface, ça
// donne la possibilité de faire cette vérification") : une fiche déjà
// créée (donc DemandeInscriptionPatient s'efface normalement,
// aDejaUneFicheIci) ne doit bloquer une soumission de vérification NI
// quand sa CNI a été rejetée, NI quand elle n'en a simplement jamais eu
// (fiche créée en personne sans photo, ou avant cette fonctionnalité) —
// même fiche mise à jour (jamais une 2e créée), cf.
// resoumettreVerificationCni + firestore.rules (accepte les deux cas).
function VerificationCniFiche({ fiche, patientUid, onDone }) {
  const [recto, setRecto] = useState(null);
  const [verso, setVerso] = useState(null);
  const [selfie, setSelfie] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const rejetee = fiche.cniStatut === 'rejete';

  const envoyer = async () => {
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
      await resoumettreVerificationCni(fiche.id, { cniRectoPath: rectoUp.path, cniVersoPath: versoUp.path, cniSelfiePath: selfieUp.path });
      toast.success('Documents envoyés — en attente de vérification.');
      onDone();
    } catch (e) {
      toast.error(e.message || 'Erreur');
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div style={{ background: rejetee ? '#FEF2F2' : 'white', border: `1.5px solid ${rejetee ? '#FECACA' : '#F1F5F9'}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: rejetee ? '#991B1B' : 'var(--ink)' }}>
        {rejetee ? "Vérification d'identité refusée" : "Vérification d'identité requise"}
      </p>
      {rejetee && fiche.cniMotifRejet && <p style={{ fontSize: 12.5, color: '#991B1B', marginTop: 4 }}>Motif : {fiche.cniMotifRejet}</p>}
      <p style={{ fontSize: 12.5, color: '#64748B', margin: '10px 0 12px', lineHeight: 1.5 }}>
        {rejetee
          ? 'Envoyez de nouveaux documents pour une nouvelle vérification.'
          : "Votre dossier médical partagé n'est pas encore accessible ici — envoyez ces documents pour que le personnel de cet établissement vérifie votre identité."}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        <ChampPhoto label="Recto de la CNI" fichier={recto} onChange={setRecto} />
        <ChampPhoto label="Verso de la CNI" fichier={verso} onChange={setVerso} />
        <ChampPhoto label="Photo de vous tenant la CNI" fichier={selfie} onChange={setSelfie} />
      </div>
      <button onClick={envoyer} disabled={envoi} className="btn-primary">
        {envoi ? 'Envoi…' : rejetee ? 'Renvoyer pour vérification' : 'Envoyer pour vérification'}
      </button>
    </div>
  );
}

// #nouveau (demande utilisateur, "le patient puisse donner l'autorisation à
// chaque établissement d'accéder à ses dossiers médicaux, et envoie une
// demande pour être dans la liste des patients de cet établissement") :
// jusqu'ici, seule une visite physique (fiche créée par l'accueil/admin)
// donnait accès à un établissement.
// #fusionné (décision utilisateur, "les photos de CNI et la signature sont
// envoyées en même temps obligatoirement pour vérification") : le
// consentement de partage (autrefois un composant ConsentementSignature
// séparé, affiché à côté sans lien avec cette demande) est désormais capturé
// DANS ce même formulaire — un seul geste d'envoi produit à la fois la
// demande d'inscription et la signature, jamais l'un sans l'autre. Le
// composant ConsentementSignature autonome reste utilisé ailleurs (page
// parente), mais uniquement pour un patient qui a DÉJÀ une fiche ici — dans
// ce cas précis, aucune vérification CNI n'est en jeu.
export default function DemandeInscriptionPatient({ etablissementId, patientUid, userProfile, onHasFicheChange }) {
  const [etat, setEtat] = useState(undefined); // undefined = chargement, 'a_une_fiche' | demande | null (aucune)
  const [form, setForm] = useState({ dateNaissance: '', sexe: '', telephone: '' });
  const [envoi, setEnvoi] = useState(false);
  const [recto, setRecto] = useState(null);
  const [verso, setVerso] = useState(null);
  const [selfie, setSelfie] = useState(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState(null);

  const charger = useCallback(async () => {
    const fiche = await getMaFicheIci(patientUid, etablissementId);
    onHasFicheChange?.(!!fiche);
    // #corrigé (retour utilisateur, "à partir de cet état de l'interface,
    // ça donne la possibilité de faire cette vérification") : couvre aussi
    // une fiche dont cniStatut n'a jamais été posé du tout (pas seulement
    // 'rejete') — jusqu'ici, cette fiche restait bloquée sans aucun moyen
    // de déclencher une vérification, montrant seulement "Identité pas
    // encore vérifiée" côté DossierMedicalView sans action possible.
    if (fiche && fiche.cniStatut !== 'verifie' && fiche.cniStatut !== 'en_attente') { setEtat({ type: 'fiche_a_verifier', fiche }); return; }
    if (fiche) { setEtat('a_une_fiche'); return; }
    const demande = await getMaDemandeInscription(patientUid, etablissementId);
    setEtat(demande && demande.statut !== 'refusee' ? demande : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientUid, etablissementId]);
  useEffect(() => { charger().catch(() => setEtat(null)); }, [charger]);

  if (etat === undefined || etat === 'a_une_fiche') return null;

  if (etat?.type === 'fiche_a_verifier') {
    return <VerificationCniFiche fiche={etat.fiche} patientUid={patientUid} onDone={charger} />;
  }

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
    if (!signatureDataUrl) {
      toast.error('Signez le consentement de partage dans le cadre ci-dessous.');
      return;
    }
    setEnvoi(true);
    try {
      // #corrigé (retour utilisateur, "quand l'admin refuse la demande et le
      // patient ressigne on dirait que ce n'est pas la nouvelle signature qui
      // arrive de nouveau chez l'admin") : sauter la signature quand un
      // consentement existait déjà gardait la signature de la 1ère tentative
      // — exactement le cas d'une demande refusée puis resoumise avec une
      // NOUVELLE signature. `consentements` est explicitement append-only
      // (cf. consentementsService.js) : chaque envoi doit signer à nouveau,
      // sans jamais vérifier d'abord si un consentement existe déjà.
      const patientNom = `${userProfile.prenom || ''} ${userProfile.nom || ''}`.trim();
      await signerConsentement({ patientUid, patientNom, etablissementId, signatureDataUrl });
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
          Complétez d'abord votre numéro d'identité national, plus bas sur cette page (section Dossier médical), pour pouvoir envoyer cette demande.
        </p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))', gap: 10, marginBottom: 12 }}>
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
                Envoyés avec votre signature de consentement ci-dessous, examinés par le personnel de cet établissement, puis <strong>supprimés dans les 24h suivant l'approbation</strong>.
              </p>
            </div>
          </div>

          <div style={{ marginBottom: 12, paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 6 }}>Consentement de partage du dossier</label>
            <p style={{ fontSize: 12, color: '#64748B', marginBottom: 8, lineHeight: 1.5 }}>{TEXTE_CONSENTEMENT_PARTAGE}</p>
            <SignaturePad onChange={setSignatureDataUrl} />
          </div>

          <button onClick={envoyer} disabled={envoi} className="btn-primary">
            {envoi ? 'Envoi…' : 'Je signe et j\'envoie la demande'}
          </button>
        </>
      )}
    </div>
  );
}
