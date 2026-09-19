import { useState, useEffect } from 'react';
import { Flag, Plus, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { getReclamationsPatient, ouvrirReclamation } from '../../services/reclamationsService';
import { listerEtablissementsActifs } from '../../services/etablissementsPublicService';
import AbonnementGate from '../../components/common/AbonnementGate';

const STATUT_STYLES = {
  ouvert: { bg: '#FFFBEB', color: '#D97706', label: 'Ouverte' },
  traitee: { bg: '#F0FDF4', color: '#059669', label: 'Traitée' },
  rejetee: { bg: '#FEF2F2', color: '#DC2626', label: 'Rejetée' },
};

function NouvelleReclamation({ etablissements, onCreated, onClose }) {
  const { user } = useAuth();
  const [etablissementId, setEtablissementId] = useState(etablissements[0]?.id || '');
  const [sujet, setSujet] = useState('');
  const [description, setDescription] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!etablissementId || !sujet.trim() || !description.trim()) {
      toast.error('Merci de remplir tous les champs');
      return;
    }
    setEnvoi(true);
    try {
      await ouvrirReclamation({ patientUid: user.uid, etablissementId, sujet, description });
      toast.success('Réclamation envoyée');
      onCreated();
    } catch {
      toast.error("Échec de l'envoi de la réclamation");
    } finally {
      setEnvoi(false);
    }
  };

  return <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
    <div style={{ background: 'white', borderRadius: 20, padding: 24, maxWidth: 420, width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700 }}>Nouvelle réclamation</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X style={{ width: 18, height: 18, color: '#94A3B8' }} /></button>
      </div>
      <AbonnementGate>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <select value={etablissementId} onChange={(e) => setEtablissementId(e.target.value)} className="input-field" style={{ fontSize: 14 }}>
            {etablissements.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
          </select>
          <input value={sujet} onChange={(e) => setSujet(e.target.value)} placeholder="Sujet (ex : temps d'attente excessif)" className="input-field" style={{ fontSize: 14 }} />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Décrivez la situation" rows={4} className="input-field" style={{ fontSize: 14, resize: 'none' }} />
          <button type="submit" disabled={envoi} className="btn-primary" style={{ justifyContent: 'center' }}>
            {envoi ? 'Envoi…' : 'Envoyer la réclamation'}
          </button>
        </form>
      </AbonnementGate>
    </div>
  </div>;
}

export default function ReclamationsPage() {
  const { user } = useAuth();
  const [reclamations, setReclamations] = useState(null);
  const [etablissements, setEtablissements] = useState([]);
  const [modalOuvert, setModalOuvert] = useState(false);

  const recharger = () => {
    getReclamationsPatient(user.uid).then(setReclamations).catch(() => setReclamations([]));
  };

  useEffect(() => {
    if (!user) return;
    recharger();
    listerEtablissementsActifs().then(setEtablissements).catch(() => setEtablissements([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (reclamations === null) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
      <Loader2 style={{ width: 24, height: 24, color: '#94A3B8' }} className="animate-spin" />
    </div>;
  }

  return <div>
    <button onClick={() => setModalOuvert(true)} className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginBottom: 16, display: 'flex', gap: 6 }}>
      <Plus style={{ width: 16, height: 16 }} /> Nouvelle réclamation
    </button>

    {!reclamations.length ? <div style={{ textAlign: 'center', padding: '48px 20px', background: 'white', borderRadius: 16, border: '1.5px solid #F1F5F9' }}>
      <Flag style={{ width: 32, height: 32, color: '#CBD5E1', margin: '0 auto 12px' }} />
      <p style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>Aucune réclamation</p>
      <p style={{ fontSize: 13, color: '#94A3B8' }}>Un problème avec un établissement ? Signalez-le ici.</p>
    </div> : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {reclamations.map((r) => {
        const style = STATUT_STYLES[r.statut] || { bg: '#F1F5F9', color: '#64748B', label: r.statut };
        return <div key={r.id} style={{ background: 'white', borderRadius: 16, border: '1.5px solid #F1F5F9', padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{r.sujet}</p>
            <span style={{ flexShrink: 0, background: style.bg, color: style.color, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999 }}>{style.label}</span>
          </div>
          <p style={{ fontSize: 13, color: '#64748B' }}>{r.description}</p>
          {r.decision && <p style={{ fontSize: 12, color: 'var(--ink)', marginTop: 8, padding: 10, background: '#F8FAFC', borderRadius: 10 }}><strong>Réponse :</strong> {r.decision}</p>}
        </div>;
      })}
    </div>}

    {modalOuvert && <NouvelleReclamation etablissements={etablissements} onClose={() => setModalOuvert(false)} onCreated={() => { setModalOuvert(false); recharger(); }} />}
  </div>;
}
