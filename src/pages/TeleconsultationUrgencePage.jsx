import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Video, Stethoscope } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import AbonnementGate from '../components/common/AbonnementGate';
import {
  listenMedecinsDeGarde, initierTeleconsultationUrgence, attendreConfirmationTeleconsultationUrgence,
  listenMaTeleconsultationUrgence, getAgoraTokenTeleconsultationUrgence,
} from '../services/teleconsultationUrgenceService';
import { OPERATEURS, operateurCorrespond } from '../utils/operateurs';
import OperatorLogo from '../components/common/OperatorLogo';
import TeleconsultationCallWidget from '../components/teleconsultation/TeleconsultationCallWidget';

function Liste({ medecins, onChoisir }) {
  if (medecins === null) return <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-3)', padding: 24 }}>Chargement…</p>;
  if (!medecins.length) {
    return (
      <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-3)', padding: 24 }}>
        Aucun médecin de garde disponible pour le moment — réessayez dans quelques minutes.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {medecins.map((m) => (
        <button
          key={m.id}
          onClick={() => onChoisir(m)}
          style={{
            display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
            background: 'white', border: '1.5px solid #F1F5F9', borderRadius: 14, padding: 14, cursor: 'pointer',
          }}
        >
          {m.photoURL ? (
            <img src={m.photoURL} alt={m.nom} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Stethoscope style={{ width: 20, height: 20, color: '#059669' }} />
            </div>
          )}
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>{m.nom || 'Médecin'}</p>
            <p style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{m.serviceNom || 'Généraliste'} — {m.etablissementNom}</p>
          </div>
          <p style={{ fontSize: 13, fontWeight: 800, color: '#059669', flexShrink: 0 }}>
            {(m.tarifTeleconsultationFCFA || 0).toLocaleString('fr-FR')} FCFA
          </p>
        </button>
      ))}
    </div>
  );
}

function FormulairePaiement({ medecin, patientUid, patientNom, onCree }) {
  const [motif, setMotif] = useState('');
  const [phone, setPhone] = useState('');
  const [operateur, setOperateur] = useState('MTN_MOMO_CMR');
  const [payant, setPayant] = useState(false);

  const payer = async (e) => {
    e.preventDefault();
    if (!motif.trim()) { toast.error('Décrivez brièvement votre problème'); return; }
    if (!phone.trim()) { toast.error('Numéro Mobile Money requis'); return; }
    if (!operateurCorrespond(phone, operateur)) {
      toast.error(`Ce numéro ne correspond pas à ${OPERATEURS.find((o) => o.id === operateur)?.label}.`);
      return;
    }
    setPayant(true);
    try {
      const { teleconsultationId, transactionId } = await initierTeleconsultationUrgence(patientUid, patientNom, medecin, motif.trim(), phone.trim());
      toast('Vérifiez votre téléphone pour confirmer le paiement…', { icon: '📲', duration: 6000 });
      const { statut, message } = await attendreConfirmationTeleconsultationUrgence(teleconsultationId, transactionId);
      if (statut === 'completed') {
        toast.success('Paiement confirmé — vous pouvez rejoindre la consultation.');
        onCree(teleconsultationId);
      } else if (statut === 'ecart_montant') {
        toast.error(message || 'Écart de montant détecté');
      } else {
        toast.error('Le paiement a échoué ou est resté en attente.');
      }
    } catch (err) {
      toast.error(err.message || "Échec de l'opération");
    } finally {
      setPayant(false);
    }
  };

  return (
    <form onSubmit={payer} style={{ background: 'white', borderRadius: 16, padding: 20, border: '1.5px solid #F1F5F9' }}>
      <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>{medecin.nom}</p>
      <p style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 14 }}>
        {(medecin.tarifTeleconsultationFCFA || 0).toLocaleString('fr-FR')} FCFA — payé maintenant, avant la consultation.
      </p>
      <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)', display: 'block', marginBottom: 4 }}>
        Décrivez brièvement votre problème
      </label>
      <textarea
        className="input-field" rows={3} value={motif} onChange={(e) => setMotif(e.target.value)}
        placeholder="Ex : douleur au ventre depuis ce soir, fièvre…" style={{ marginBottom: 12 }}
      />
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {OPERATEURS.map((op) => (
          <button
            key={op.id} type="button" onClick={() => setOperateur(op.id)} disabled={payant}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '6px 8px', borderRadius: 8, cursor: 'pointer',
              border: `1.5px solid ${operateur === op.id ? 'var(--blue)' : '#F1F5F9'}`,
              background: operateur === op.id ? '#EFF6FF' : 'white',
            }}
          >
            <OperatorLogo id={op.id} size={18} />
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink)' }}>{op.label}</span>
          </button>
        ))}
      </div>
      <input
        value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Numéro Mobile Money"
        type="tel" maxLength={9} className="input-field" style={{ marginBottom: 8 }}
      />
      <button
        type="submit" disabled={payant} className="btn-primary"
        style={{ width: '100%', justifyContent: 'center' }}
      >
        {payant ? 'Traitement…' : `Payer ${(medecin.tarifTeleconsultationFCFA || 0).toLocaleString('fr-FR')} FCFA`}
      </button>
    </form>
  );
}

function Session({ teleconsultationId }) {
  const [seance, setSeance] = useState(undefined);
  useEffect(() => listenMaTeleconsultationUrgence(teleconsultationId, setSeance), [teleconsultationId]);

  if (!seance) return <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-3)', padding: 24 }}>Chargement…</p>;

  return (
    <div style={{ background: 'white', borderRadius: 16, padding: 20, border: '1.5px solid #F1F5F9' }}>
      <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>{seance.medecinNom}</p>
      <TeleconsultationCallWidget grand fetchToken={() => getAgoraTokenTeleconsultationUrgence(teleconsultationId)} />
      {seance.ordonnance && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #F1F5F9' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 4 }}>Ordonnance</p>
          <p style={{ fontSize: 13, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>{seance.ordonnance}</p>
        </div>
      )}
      {!!seance.examensDemandes?.length && (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 4 }}>Examens demandés</p>
          <ul style={{ fontSize: 13, color: 'var(--ink)', paddingLeft: 18 }}>
            {seance.examensDemandes.map((ex, i) => <li key={i}>{ex}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function TeleconsultationUrgencePage() {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [medecins, setMedecins] = useState(null);
  const [medecinChoisi, setMedecinChoisi] = useState(null);
  const [teleconsultationId, setTeleconsultationId] = useState(null);

  useEffect(() => listenMedecinsDeGarde(setMedecins), []);

  const patientNom = userProfile?.displayName || `${userProfile?.prenom || ''} ${userProfile?.nom || ''}`.trim();

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 20px 60px' }}>
      <button
        onClick={() => (medecinChoisi ? setMedecinChoisi(null) : navigate('/urgence'))}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--ink-3)', marginBottom: 16, padding: 0 }}
      >
        <ArrowLeft style={{ width: 15, height: 15 }} /> Retour
      </button>

      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ width: 56, height: 56, background: '#EFF6FF', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
          <Video style={{ width: 26, height: 26, color: 'var(--blue)' }} />
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)' }}>Téléconsultation d'urgence</h1>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>Médecins de garde disponibles maintenant, tous établissements confondus.</p>
      </div>

      <AbonnementGate>
        {teleconsultationId ? (
          <Session teleconsultationId={teleconsultationId} />
        ) : medecinChoisi ? (
          <FormulairePaiement
            medecin={medecinChoisi} patientUid={user.uid} patientNom={patientNom}
            onCree={setTeleconsultationId}
          />
        ) : (
          <Liste medecins={medecins} onChoisir={setMedecinChoisi} />
        )}
      </AbonnementGate>
    </div>
  );
}
