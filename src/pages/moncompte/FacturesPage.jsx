import { useState, useEffect } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { getMesFactures, initierPaiementFacture, attendreConfirmationFacture } from '../../services/facturesService';
import { getEtablissement } from '../../services/etablissementsPublicService';

const STATUT_STYLES = {
  en_attente: { bg: '#FFFBEB', color: '#D97706', label: 'En attente' },
  payee: { bg: '#F0FDF4', color: '#059669', label: 'Payée' },
  annulee: { bg: '#F1F5F9', color: '#64748B', label: 'Annulée' },
};

function FactureRow({ facture, etabNom, onPayee }) {
  const [phone, setPhone] = useState('');
  const [enCours, setEnCours] = useState(false);
  const style = STATUT_STYLES[facture.statut] || { bg: '#F1F5F9', color: '#64748B', label: facture.statut };

  const payer = async (e) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast.error('Numéro Mobile Money requis');
      return;
    }
    setEnCours(true);
    try {
      await initierPaiementFacture(facture.id, phone.trim());
      toast('Vérifiez votre téléphone pour confirmer le paiement…', { icon: '📲', duration: 6000 });
      const { statut, message } = await attendreConfirmationFacture(facture.id);
      if (statut === 'payee') {
        toast.success('Facture payée !');
        onPayee(facture.id);
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
        <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{facture.libelle}</p>
        <p style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>{etabNom || 'Établissement'}</p>
      </div>
      <span style={{ flexShrink: 0, background: style.bg, color: style.color, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999 }}>{style.label}</span>
    </div>
    <p style={{ fontWeight: 800, fontSize: 18, color: 'var(--ink)', marginTop: 8 }}>{Number(facture.montant).toLocaleString('fr-FR')} XAF</p>
    {facture.statut === 'en_attente' && <form onSubmit={payer} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Numéro Mobile Money" className="input-field" style={{ flex: 1, fontSize: 13 }} />
      <button type="submit" disabled={enCours} className="btn-primary" style={{ fontSize: 12, padding: '0 16px' }}>
        {enCours ? 'Traitement…' : 'Payer'}
      </button>
    </form>}
  </div>;
}

export default function FacturesPage() {
  const { user } = useAuth();
  const [factures, setFactures] = useState(null);
  const [etablissements, setEtablissements] = useState({});

  const recharger = () => {
    getMesFactures(user.uid).then(async (liste) => {
      liste.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setFactures(liste);
      const ids = [...new Set(liste.map((f) => f.etablissementId))];
      const entries = await Promise.all(ids.map(async (id) => [id, await getEtablissement(id)]));
      setEtablissements(Object.fromEntries(entries));
    }).catch(() => setFactures([]));
  };

  useEffect(() => {
    if (user) recharger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (factures === null) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
      <Loader2 style={{ width: 24, height: 24, color: '#94A3B8' }} className="animate-spin" />
    </div>;
  }

  if (!factures.length) {
    return <div style={{ textAlign: 'center', padding: '48px 20px', background: 'white', borderRadius: 16, border: '1.5px solid #F1F5F9' }}>
      <CreditCard style={{ width: 32, height: 32, color: '#CBD5E1', margin: '0 auto 12px' }} />
      <p style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>Aucune facture</p>
      <p style={{ fontSize: 13, color: '#94A3B8' }}>Vos factures d'établissement apparaîtront ici.</p>
    </div>;
  }

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    {factures.map((f) => <FactureRow key={f.id} facture={f} etabNom={etablissements[f.etablissementId]?.nom} onPayee={recharger} />)}
  </div>;
}
