import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { getWallet, listenWallet, getTransactions, initierDepot, attendreConfirmationDepot } from '../../services/walletService';
import { listerFacturesEnAttente } from '../../services/facturesService';
import { OPERATEURS, operateurCorrespond } from '../../utils/operateurs';
import OperatorLogo from '../common/OperatorLogo';
import FactureAPayer from './FactureAPayer';

export default function TabPaiement({ patientUid, etablissementId }) {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [factures, setFactures] = useState(null);
  const [montant, setMontant] = useState('');
  const [phone, setPhone] = useState('');
  const [operateur, setOperateur] = useState('MTN_MOMO_CMR');
  const [envoi, setEnvoi] = useState(false);

  const rechargerFactures = useCallback(() => {
    listerFacturesEnAttente(patientUid, etablissementId).then(setFactures).catch(() => setFactures([]));
  }, [patientUid, etablissementId]);

  useEffect(() => {
    getWallet(patientUid).then(setWallet);
    getTransactions(patientUid).then(setTransactions).catch(() => setTransactions([]));
    rechargerFactures();
    return listenWallet(patientUid, setWallet);
  }, [patientUid, rechargerFactures]);

  const handleDepot = async (e) => {
    e.preventDefault();
    const m = Number(montant);
    if (!m || m <= 0 || !phone.trim()) {
      toast.error('Montant et numéro requis');
      return;
    }
    if (!operateurCorrespond(phone, operateur)) {
      toast.error(`Ce numéro ne correspond pas à ${OPERATEURS.find((o) => o.id === operateur)?.label}.`);
      return;
    }
    setEnvoi(true);
    try {
      const { transactionId } = await initierDepot(patientUid, m, phone.trim());
      toast('Vérifiez votre téléphone pour confirmer le paiement…', { icon: '📲', duration: 6000 });
      const { statut } = await attendreConfirmationDepot(transactionId);
      if (statut === 'completed') {
        toast.success(`Dépôt de ${m.toLocaleString()} XAF crédité !`);
        setMontant('');
        setPhone('');
        getTransactions(patientUid).then(setTransactions);
      } else {
        toast.error('Le dépôt a échoué ou est resté en attente.');
      }
    } catch (err) {
      console.error('initierDepot a échoué :', err);
      toast.error(err.message || "Échec de l'opération");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div>
      <div
        style={{
          padding: '16px 20px',
          borderRadius: 12,
          background: 'linear-gradient(135deg, var(--blue), var(--primary-dark, #174858))',
          color: 'white',
          marginBottom: 20,
        }}
      >
        <p style={{ fontSize: 12, opacity: 0.85 }}>Solde disponible</p>
        <p style={{ fontSize: 26, fontWeight: 700 }}>{(wallet?.solde || 0).toLocaleString('fr-FR')} XAF</p>
      </div>

      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 10 }}>Factures à payer</p>
      <div style={{ marginBottom: 24 }}>
        {!factures?.length ? (
          <div style={{ padding: '16px', background: 'var(--bg-2)', borderRadius: 10, fontSize: 13, color: 'var(--ink-3)' }}>
            Aucune facture en attente pour le moment.
          </div>
        ) : (
          factures.map((f) => (
            <FactureAPayer key={f.id} facture={f} solde={wallet?.solde || 0} onPayee={() => rechargerFactures()} />
          ))
        )}
      </div>

      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 10 }}>Recharger mon solde</p>
      <form onSubmit={handleDepot} className="space-y-3">
        <input
          type="number"
          value={montant}
          onChange={(e) => setMontant(e.target.value)}
          placeholder="Montant (XAF)"
          className="input-field"
        />
        <div style={{ display: 'flex', gap: 8 }}>
          {OPERATEURS.map((op) => (
            <button
              key={op.id}
              type="button"
              onClick={() => setOperateur(op.id)}
              disabled={envoi}
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
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Numéro Mobile Money"
          type="tel"
          maxLength={9}
          className="input-field"
        />
        {!!phone && !operateurCorrespond(phone, operateur) && (
          <p style={{ fontSize: 11.5, color: '#DC2626' }}>
            Ce numéro ne correspond pas à {OPERATEURS.find((o) => o.id === operateur)?.label}.
          </p>
        )}
        <button type="submit" disabled={envoi || (!!phone && !operateurCorrespond(phone, operateur))} className="btn-primary">
          {envoi ? 'Traitement…' : 'Déposer'}
        </button>
      </form>

      {transactions.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 10 }}>Historique</p>
          <div className="space-y-2">
            {transactions.slice(0, 10).map((t) => (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'var(--bg-2)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              >
                <span>{t.description}</span>
                <span style={{ fontWeight: 700, color: t.montant < 0 ? '#C2402F' : '#2F7D5C' }}>
                  {t.montant > 0 ? '+' : ''}
                  {t.montant.toLocaleString('fr-FR')} XAF
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
