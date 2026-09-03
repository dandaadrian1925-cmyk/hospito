import { useState, useEffect } from 'react';
import { FlaskConical, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { getMesExamens, creerFactureExamen } from '../../services/examensPatientService';
import { initierPaiementFacture, attendreConfirmationFacture } from '../../services/facturesService';
import { getEtablissement } from '../../services/etablissementsPublicService';

const TYPES_EXAMEN = {
  laboratoire: 'Laboratoire', imagerie: 'Imagerie médicale',
  exploration_fonctionnelle: 'Exploration fonctionnelle', anatomie_pathologique: 'Anatomie pathologique',
};
const STATUT_STYLES = {
  demande: { bg: '#FFFBEB', color: '#D97706', label: 'À payer' },
  en_cours: { bg: '#EFF6FF', color: '#2451C4', label: 'Payé — en cours' },
  resultat_disponible: { bg: '#F0FDF4', color: '#059669', label: 'Résultat disponible' },
  annule: { bg: '#F1F5F9', color: '#64748B', label: 'Annulé' },
};

function ExamenCard({ examen, etabNom, onPayee }) {
  const [factureId, setFactureId] = useState(null);
  const [phone, setPhone] = useState('');
  const [enCours, setEnCours] = useState(false);
  const style = STATUT_STYLES[examen.statut] || { bg: '#F1F5F9', color: '#64748B', label: examen.statut };

  const lancerPaiement = async (e) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast.error('Numéro Mobile Money requis');
      return;
    }
    setEnCours(true);
    try {
      let id = factureId;
      if (!id) {
        id = await creerFactureExamen(examen);
        setFactureId(id);
      }
      await initierPaiementFacture(id, phone.trim());
      toast('Vérifiez votre téléphone pour confirmer le paiement…', { icon: '📲', duration: 6000 });
      const { statut, message } = await attendreConfirmationFacture(id);
      if (statut === 'payee') {
        toast.success('Examen payé !');
        onPayee();
      } else if (statut === 'ecart_montant') {
        toast.error(message || 'Écart de montant détecté');
      } else {
        toast.error('Le paiement a échoué ou est resté en attente.');
      }
    } catch (err) {
      toast.error(err.message || "Échec de l'opération");
    } finally {
      setEnCours(false);
    }
  };

  return <div style={{ background: 'white', borderRadius: 16, border: '1.5px solid #F1F5F9', padding: 16 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
      <div>
        <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{examen.nature}</p>
        <p style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>{TYPES_EXAMEN[examen.type] || examen.type} — {etabNom || 'Établissement'}</p>
      </div>
      <span style={{ flexShrink: 0, background: style.bg, color: style.color, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999 }}>{style.label}</span>
    </div>
    {examen.statut === 'resultat_disponible' && examen.resultat && (
      <p style={{ fontSize: 13, color: 'var(--ink)', marginTop: 8, padding: 10, background: '#F8FAFC', borderRadius: 10 }}>{examen.resultat}</p>
    )}
    {examen.statut === 'demande' && (
      <>
        <p style={{ fontWeight: 800, fontSize: 18, color: 'var(--ink)', marginTop: 8 }}>{Number(examen.montant).toLocaleString('fr-FR')} XAF</p>
        <form onSubmit={lancerPaiement} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Numéro Mobile Money" className="input-field" style={{ flex: 1, fontSize: 13 }} />
          <button type="submit" disabled={enCours} className="btn-primary" style={{ fontSize: 12, padding: '0 16px' }}>
            {enCours ? 'Traitement…' : 'Payer'}
          </button>
        </form>
      </>
    )}
  </div>;
}

export default function ExamensPage() {
  const { user } = useAuth();
  const [examens, setExamens] = useState(null);
  const [etablissements, setEtablissements] = useState({});

  const recharger = () => {
    getMesExamens(user.uid).then(async (liste) => {
      setExamens(liste);
      const ids = [...new Set(liste.map((e) => e.etablissementId))];
      const entries = await Promise.all(ids.map(async (id) => [id, await getEtablissement(id)]));
      setEtablissements(Object.fromEntries(entries));
    }).catch(() => setExamens([]));
  };

  useEffect(() => {
    if (user) recharger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (examens === null) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
      <Loader2 style={{ width: 24, height: 24, color: '#94A3B8' }} className="animate-spin" />
    </div>;
  }

  if (!examens.length) {
    return <div style={{ textAlign: 'center', padding: '48px 20px', background: 'white', borderRadius: 16, border: '1.5px solid #F1F5F9' }}>
      <FlaskConical style={{ width: 32, height: 32, color: '#CBD5E1', margin: '0 auto 12px' }} />
      <p style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>Aucun examen</p>
      <p style={{ fontSize: 13, color: '#94A3B8' }}>Les examens prescrits par un médecin (laboratoire, imagerie…) apparaîtront ici.</p>
    </div>;
  }

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    {examens.map((e) => <ExamenCard key={e.id} examen={e} etabNom={etablissements[e.etablissementId]?.nom} onPayee={recharger} />)}
  </div>;
}
