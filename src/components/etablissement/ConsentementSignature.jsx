import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { TEXTE_CONSENTEMENT_PARTAGE, getMonConsentement, signerConsentement } from '../../services/consentementsService';
import SignaturePad from './SignaturePad';
import AbonnementGate from '../common/AbonnementGate';

// Signature électronique du consentement de partage du dossier (§4.13) — un
// par établissement, jamais réutilisable pour un autre (le patient peut
// consulter plusieurs hôpitaux, chacun demande sa propre autorisation).
export default function ConsentementSignature({ etablissementId, patientUid, patientNom }) {
  const [consentement, setConsentement] = useState(undefined);
  const [signatureDataUrl, setSignatureDataUrl] = useState(null);
  const [signing, setSigning] = useState(false);

  const charger = useCallback(() => {
    getMonConsentement(patientUid, etablissementId).then(setConsentement).catch(() => setConsentement(null));
  }, [patientUid, etablissementId]);
  useEffect(() => { charger(); }, [charger]);

  const signer = async () => {
    if (!signatureDataUrl) { toast.error('Signez dans le cadre ci-dessus avant de valider'); return; }
    setSigning(true);
    try {
      await signerConsentement({ patientUid, patientNom, etablissementId, signatureDataUrl });
      toast.success('Consentement signé');
      charger();
    } catch (e) {
      toast.error(e.message || 'Erreur');
    } finally {
      setSigning(false);
    }
  };

  if (consentement === undefined) return null;

  if (consentement) {
    return (
      <div style={{ background: '#F0FDF4', border: '1.5px solid #A7F3D0', borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#065F46' }}>✓ Consentement de partage signé</p>
        <p style={{ fontSize: 12, color: '#059669', marginTop: 2 }}>
          Le {consentement.signeAt?.toDate ? consentement.signeAt.toDate().toLocaleDateString('fr-FR') : '—'}
        </p>
      </div>
    );
  }

  return (
    <AbonnementGate>
      <div style={{ background: 'white', border: '1.5px solid #F1F5F9', borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>Consentement de partage du dossier</p>
        <p style={{ fontSize: 12.5, color: '#64748B', marginBottom: 12, lineHeight: 1.5 }}>{TEXTE_CONSENTEMENT_PARTAGE}</p>
        <SignaturePad onChange={setSignatureDataUrl} />
        <button onClick={signer} disabled={signing} className="btn-primary" style={{ marginTop: 12 }}>
          {signing ? 'Signature…' : "Je signe et j'accepte"}
        </button>
      </div>
    </AbonnementGate>
  );
}
