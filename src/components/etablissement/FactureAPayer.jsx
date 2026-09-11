import { useState } from 'react';
import toast from 'react-hot-toast';
import { Wallet } from 'lucide-react';
import { initierPaiementFacture, attendreConfirmationFacture, payerFactureAvecSolde } from '../../services/facturesService';

// #nouveau (demande utilisateur, "tout n'est pas payé qu'à partir du solde
// principal") : même second moyen de paiement que partout ailleurs
// (ExamensPage.jsx, moncompte/FacturesPage.jsx) — cette page affiche déjà le
// solde juste au-dessus (TabPaiement), il serait incohérent de ne proposer
// que CamPay ici.
export default function FactureAPayer({ facture, solde, onPayee }) {
  const [phone, setPhone] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [envoiSolde, setEnvoiSolde] = useState(false);

  const handlePayer = async (e) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast.error('Numéro Mobile Money requis');
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
      <form onSubmit={handlePayer} style={{ display: 'flex', gap: 8 }}>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Numéro Mobile Money"
          className="input-field"
          style={{ flex: 1 }}
        />
        <button type="submit" disabled={envoi || envoiSolde} className="btn-primary">
          {envoi ? 'Traitement…' : 'Payer'}
        </button>
      </form>
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
