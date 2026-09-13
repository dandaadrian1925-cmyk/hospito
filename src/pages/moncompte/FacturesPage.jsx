import { useState, useEffect } from 'react';
import { CreditCard, Loader2, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { getMesFactures, initierPaiementFacture, attendreConfirmationFacture, payerFactureAvecSolde } from '../../services/facturesService';
import { getEtablissement } from '../../services/etablissementsPublicService';
import { listenWallet } from '../../services/walletService';
import { OPERATEURS, operateurCorrespond } from '../../utils/operateurs';
import OperatorLogo from '../../components/common/OperatorLogo';

const STATUT_STYLES = {
  en_attente: { bg: '#FFFBEB', color: '#D97706', label: 'En attente' },
  payee: { bg: '#F0FDF4', color: '#059669', label: 'Payée' },
  annulee: { bg: '#F1F5F9', color: '#64748B', label: 'Annulée' },
};

// #nouveau (demande utilisateur, "tout n'est pas payé qu'à partir du solde
// principal") : cette page a sa propre voie de paiement CamPay (indépendante
// du panier de ExamensPage.jsx) — doit offrir le même second moyen de
// paiement (solde) pour rester cohérente, partout où une facture patient
// peut être payée.
function FactureRow({ facture, etabNom, solde, onPayee }) {
  const [phone, setPhone] = useState('');
  const [operateur, setOperateur] = useState('MTN_MOMO_CMR');
  const [enCours, setEnCours] = useState(false);
  const [enCoursSolde, setEnCoursSolde] = useState(false);
  const style = STATUT_STYLES[facture.statut] || { bg: '#F1F5F9', color: '#64748B', label: facture.statut };

  const payer = async (e) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast.error('Numéro Mobile Money requis');
      return;
    }
    if (!operateurCorrespond(phone, operateur)) {
      toast.error(`Ce numéro ne correspond pas à ${OPERATEURS.find((o) => o.id === operateur)?.label}.`);
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

  const payerAvecSolde = async () => {
    setEnCoursSolde(true);
    try {
      const { statut, message } = await payerFactureAvecSolde(facture.id);
      if (statut === 'payee') {
        toast.success('Facture payée avec votre solde !');
        onPayee(facture.id);
      } else {
        toast.error(message || 'Le paiement a échoué — réessayez');
      }
    } catch (err) {
      toast.error(err.message || "Échec de l'opération");
    } finally {
      setEnCoursSolde(false);
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
    {facture.statut === 'en_attente' && <>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        {OPERATEURS.map((op) => (
          <button
            key={op.id}
            type="button"
            onClick={() => setOperateur(op.id)}
            disabled={enCours || enCoursSolde}
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
      <form onSubmit={payer} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Numéro Mobile Money" type="tel" maxLength={9} className="input-field" style={{ flex: 1, fontSize: 13 }} />
        <button type="submit" disabled={enCours || enCoursSolde || (!!phone && !operateurCorrespond(phone, operateur))} className="btn-primary" style={{ fontSize: 12, padding: '0 16px' }}>
          {enCours ? 'Traitement…' : 'Payer'}
        </button>
      </form>
      {!!phone && !operateurCorrespond(phone, operateur) && (
        <p style={{ fontSize: 11.5, color: '#DC2626', marginTop: 4 }}>
          Ce numéro ne correspond pas à {OPERATEURS.find((o) => o.id === operateur)?.label}.
        </p>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0' }}>
        <div style={{ flex: 1, height: 1, background: '#F1F5F9' }} />
        <span style={{ fontSize: 11, color: '#94A3B8' }}>ou</span>
        <div style={{ flex: 1, height: 1, background: '#F1F5F9' }} />
      </div>
      <button
        type="button"
        onClick={payerAvecSolde}
        disabled={enCours || enCoursSolde || Number(facture.montant) > solde}
        className="btn-outline"
        style={{ width: '100%', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
      >
        <Wallet style={{ width: 14, height: 14 }} />
        {enCoursSolde ? 'Traitement…' : `Payer avec mon solde (${solde.toLocaleString('fr-FR')} XAF)`}
      </button>
    </>}
  </div>;
}

export default function FacturesPage() {
  const { user } = useAuth();
  const [factures, setFactures] = useState(null);
  const [etablissements, setEtablissements] = useState({});
  const [solde, setSolde] = useState(0);

  useEffect(() => {
    if (!user) return;
    return listenWallet(user.uid, (w) => setSolde(w.solde || 0));
  }, [user]);

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
    {factures.map((f) => <FactureRow key={f.id} facture={f} etabNom={etablissements[f.etablissementId]?.nom} solde={solde} onPayee={recharger} />)}
  </div>;
}
