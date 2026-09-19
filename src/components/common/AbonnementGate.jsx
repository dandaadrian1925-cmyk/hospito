import { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { getPrixAbonnement, initierAbonnement, attendreConfirmationAbonnement } from '../../services/abonnementService';
import { OPERATEURS, operateurCorrespond } from '../../utils/operateurs';
import OperatorLogo from './OperatorLogo';

// #nouveau (souscription annuelle patient obligatoire) : gate posé au niveau
// du FORMULAIRE/BOUTON d'action (pas de la page entière — la lecture reste
// toujours libre, cf. décision utilisateur), contrairement à
// DossierAccessGate qui remplace toute la page. `children` n'est rendu que si
// l'abonnement est actif ; sinon, un écran de paiement compact le remplace,
// réutilisant le même sélecteur opérateur que les autres pages de paiement
// (WalletPage.jsx, FactureAPayer.jsx).
export default function AbonnementGate({ children }) {
  const { user, userProfile } = useAuth();
  const [prix, setPrix] = useState(5000);
  const [phone, setPhone] = useState('');
  const [operateur, setOperateur] = useState('MTN_MOMO_CMR');
  const [payant, setPayant] = useState(false);

  useEffect(() => {
    getPrixAbonnement().then(setPrix).catch(() => {});
  }, []);

  const expireAt = userProfile?.abonnementExpireAt?.toDate ? userProfile.abonnementExpireAt.toDate() : null;
  const actif = userProfile?.abonnementActif === true && expireAt && expireAt.getTime() > Date.now();

  if (actif) return children;

  const payer = async (e) => {
    e.preventDefault();
    if (!phone.trim()) { toast.error('Numéro Mobile Money requis'); return; }
    if (!operateurCorrespond(phone, operateur)) {
      toast.error(`Ce numéro ne correspond pas à ${OPERATEURS.find((o) => o.id === operateur)?.label}.`);
      return;
    }
    setPayant(true);
    try {
      const { transactionId } = await initierAbonnement(user.uid, prix, phone.trim());
      toast('Vérifiez votre téléphone pour confirmer le paiement…', { icon: '📲', duration: 6000 });
      const { statut, message } = await attendreConfirmationAbonnement(transactionId);
      if (statut === 'completed') {
        toast.success('Abonnement activé — bienvenue !');
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
    <div style={{ maxWidth: 380, margin: '24px auto', textAlign: 'center', background: 'white', borderRadius: 20, padding: 28, border: '1.5px solid #F1F5F9' }}>
      <div style={{ width: 48, height: 48, background: '#F0FDF4', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <ShieldCheck style={{ width: 22, height: 22, color: '#059669' }} />
      </div>
      <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink)', marginBottom: 6, fontFamily: 'var(--font-display)' }}>
        Abonnement HostoConnect requis
      </h2>
      <p style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>
        Cette action nécessite un abonnement annuel actif — {prix.toLocaleString('fr-FR')} FCFA/an,
        valable dans tous les établissements HostoConnect.
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {OPERATEURS.map((op) => (
          <button
            key={op.id}
            type="button"
            onClick={() => setOperateur(op.id)}
            disabled={payant}
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
      <form onSubmit={payer}>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Numéro Mobile Money"
          type="tel"
          maxLength={9}
          className="input-field"
          style={{ marginBottom: 8 }}
        />
        {!!phone && !operateurCorrespond(phone, operateur) && (
          <p style={{ fontSize: 11.5, color: '#DC2626', marginBottom: 8 }}>
            Ce numéro ne correspond pas à {OPERATEURS.find((o) => o.id === operateur)?.label}.
          </p>
        )}
        <button
          type="submit"
          disabled={payant || (!!phone && !operateurCorrespond(phone, operateur))}
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center' }}
        >
          {payant ? 'Traitement…' : `Payer ${prix.toLocaleString('fr-FR')} FCFA et débloquer`}
        </button>
      </form>
    </div>
  );
}
