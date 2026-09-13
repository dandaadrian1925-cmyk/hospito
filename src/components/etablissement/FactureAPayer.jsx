import { useState } from 'react';
import toast from 'react-hot-toast';
import { Wallet } from 'lucide-react';
import { initierPaiementFacture, attendreConfirmationFacture, payerFactureAvecSolde } from '../../services/facturesService';
import { OPERATEURS, operateurCorrespond } from '../../utils/operateurs';
import OperatorLogo from '../common/OperatorLogo';

// #nouveau (demande utilisateur, "tout n'est pas payé qu'à partir du solde
// principal") : même second moyen de paiement que partout ailleurs
// (ExamensPage.jsx, moncompte/FacturesPage.jsx) — cette page affiche déjà le
// solde juste au-dessus (TabPaiement), il serait incohérent de ne proposer
// que CamPay ici.
// #nouveau (demande utilisateur, "sur toutes les pages de dépôt met les
// logo de MTN et ORANGE avec le champ du numéro de téléphone qui respecte
// les numéros de l'opérateur choisi") : même sélecteur opérateur (logos +
// validation de préfixe) que WalletPage.jsx — jusqu'ici, cette page (et ses
// deux autres copies, ExamensPage.jsx/moncompte/FacturesPage.jsx) ne
// demandait qu'un numéro brut, sans jamais vérifier qu'il correspond
// vraiment à l'opérateur réellement utilisé.
export default function FactureAPayer({ facture, solde, onPayee }) {
  const [phone, setPhone] = useState('');
  const [operateur, setOperateur] = useState('MTN_MOMO_CMR');
  const [envoi, setEnvoi] = useState(false);
  const [envoiSolde, setEnvoiSolde] = useState(false);

  const handlePayer = async (e) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast.error('Numéro Mobile Money requis');
      return;
    }
    if (!operateurCorrespond(phone, operateur)) {
      toast.error(`Ce numéro ne correspond pas à ${OPERATEURS.find((o) => o.id === operateur)?.label}.`);
      return;
    }
    setEnvoi(true);
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
      console.error('initierPaiementFacture a échoué :', err);
      toast.error(err.message || "Échec de l'opération");
    } finally {
      setEnvoi(false);
    }
  };

  const handlePayerSolde = async () => {
    setEnvoiSolde(true);
    try {
      const { statut, message } = await payerFactureAvecSolde(facture.id);
      if (statut === 'payee') {
        toast.success('Facture payée avec votre solde !');
        onPayee(facture.id);
      } else {
        toast.error(message || 'Le paiement a échoué — réessayez');
      }
    } catch (err) {
      console.error('payerFactureAvecSolde a échoué :', err);
      toast.error(err.message || "Échec de l'opération");
    } finally {
      setEnvoiSolde(false);
    }
  };

  return (
    <div style={{ padding: '14px 16px', background: 'var(--bg-2)', borderRadius: 10, marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{facture.libelle}</span>
        <span style={{ fontWeight: 700, fontSize: 13 }}>{Number(facture.montant).toLocaleString('fr-FR')} XAF</span>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        {OPERATEURS.map((op) => (
          <button
            key={op.id}
            type="button"
            onClick={() => setOperateur(op.id)}
            disabled={envoi || envoiSolde}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '6px 8px', borderRadius: 8, cursor: 'pointer',
              border: `1.5px solid ${operateur === op.id ? 'var(--blue)' : 'var(--border-2)'}`,
              background: operateur === op.id ? '#EFF6FF' : 'white',
            }}
          >
            <OperatorLogo id={op.id} size={18} />
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink)' }}>{op.label}</span>
          </button>
        ))}
      </div>
      <form onSubmit={handlePayer} style={{ display: 'flex', gap: 8 }}>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Numéro Mobile Money"
          type="tel"
          maxLength={9}
          className="input-field"
          style={{ flex: 1 }}
        />
        <button type="submit" disabled={envoi || envoiSolde || (!!phone && !operateurCorrespond(phone, operateur))} className="btn-primary">
          {envoi ? 'Traitement…' : 'Payer'}
        </button>
      </form>
      {!!phone && !operateurCorrespond(phone, operateur) && (
        <p style={{ fontSize: 11.5, color: '#DC2626', marginTop: 4 }}>
          Ce numéro ne correspond pas à {OPERATEURS.find((o) => o.id === operateur)?.label}.
        </p>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border-2)' }} />
        <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>ou</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border-2)' }} />
      </div>
      <button
        type="button"
        onClick={handlePayerSolde}
        disabled={envoi || envoiSolde || Number(facture.montant) > solde}
        className="btn-outline"
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
      >
        <Wallet style={{ width: 14, height: 14 }} />
        {envoiSolde ? 'Traitement…' : `Payer avec mon solde (${solde.toLocaleString('fr-FR')} XAF)`}
      </button>
    </div>
  );
}
