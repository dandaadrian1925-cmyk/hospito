import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, ArrowDownLeft, ArrowUpRight, Clock, CheckCircle, AlertCircle, Plus, ChevronRight, Shield, Info, Smartphone, X, ShoppingBag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { listenWallet, getTransactionsBancaires, initierDepot, initierRetrait, transfererSoldeParrainage, attendreConfirmationDepot, reconcilierDepotsEnAttente, verifierEcartSoldePropre, WALLET_TYPES } from '../services/walletService';
import { getSettings } from '../services/settingsService';
import ConfirmDialog from '../components/common/ConfirmDialog';
import OperatorLogo from '../components/common/OperatorLogo';
import { OPERATEURS, operateurCorrespond } from '../utils/operateurs';
import toast from 'react-hot-toast';
const MONTANTS_RAPIDES = [1000, 2000, 5000, 10000, 25000, 50000];
const TYPE_LABELS = {
  [WALLET_TYPES.DEPOT]: 'Dépôt',
  [WALLET_TYPES.RETRAIT]: 'Retrait'
};
const STATUT_LABELS_DEPOT = {
  pending: {
    label: 'En attente de confirmation',
    color: '#D97706'
  },
  completed: {
    label: 'Crédité',
    color: '#059669'
  },
  echoue: {
    label: 'Échoué',
    color: '#DC2626'
  }
};
const STATUT_LABELS_RETRAIT = {
  en_cours: {
    label: 'En attente de traitement',
    color: '#D97706'
  },
  en_cours_versement: {
    label: 'Versement en cours',
    color: '#2563EB'
  },
  completed: {
    label: 'Validé',
    color: '#059669'
  },
  echec_versement: {
    label: 'Échec du versement',
    color: '#DC2626'
  },
  versement_incertain: {
    label: 'Vérification en cours',
    color: '#D97706'
  },
  rejete: {
    label: 'Rejeté — montant recrédité',
    color: '#DC2626'
  }
};
function getStatutInfo(tx) {
  const table = tx.type === WALLET_TYPES.RETRAIT ? STATUT_LABELS_RETRAIT : STATUT_LABELS_DEPOT;
  return table[tx.statut] || null;
}
function TransactionDetailModal({
  tx,
  onClose
}) {
  const {
    icon: Icon,
    color,
    bg
  } = ({
    [WALLET_TYPES.DEPOT]: {
      icon: ArrowDownLeft,
      color: '#059669',
      bg: '#F0FDF4'
    },
    [WALLET_TYPES.RETRAIT]: {
      icon: ArrowUpRight,
      color: '#DC2626',
      bg: '#FEF2F2'
    }
  })[tx.type] || {
    icon: Clock,
    color: '#94A3B8',
    bg: '#F8FAFC'
  };
  // #bug (corrigé) : même correctif que la liste — un dépôt/retrait échoué
  // ne doit jamais s'afficher comme un vrai crédit positif.
  const pos = tx.montant > 0 && tx.statut !== 'echoue' && tx.statut !== 'echec_versement';
  const statutInfo = getStatutInfo(tx);
  const dateComplete = tx.createdAt?.toDate?.()?.toLocaleString('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short'
  }) || '—';
  return <div style={{
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 200,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16
  }} onClick={onClose}>
      <motion.div initial={{
      opacity: 0,
      scale: 0.95
    }} animate={{
      opacity: 1,
      scale: 1
    }} onClick={e => e.stopPropagation()} style={{
      background: 'white',
      borderRadius: 20,
      padding: 24,
      width: '100%',
      maxWidth: 420,
      maxHeight: '90vh',
      overflowY: 'auto'
    }}>
        <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20
      }}>
          <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
            <div style={{
            width: 42,
            height: 42,
            background: bg,
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
              <Icon style={{
              width: 18,
              height: 18,
              color
            }} />
            </div>
            <div>
              <p style={{
              fontWeight: 800,
              fontSize: 16,
              color: 'var(--ink)',
              fontFamily: 'var(--font-display)'
            }}>{TYPE_LABELS[tx.type] || tx.type}</p>
              <p className="font-black tabular-nums" style={{
              fontSize: 18,
              color: pos ? '#059669' : '#DC2626'
            }}>
                {pos ? '+' : ''}{tx.montant?.toLocaleString('fr-FR')} XAF
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#94A3B8'
        }}><X style={{
            width: 18,
            height: 18
          }} /></button>
        </div>

        <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0
      }}>
          {tx.description && <div style={{
          padding: '10px 0',
          borderBottom: '1px solid #F8FAFC'
        }}>
              <p style={{
            fontSize: 11,
            color: '#94A3B8',
            marginBottom: 3
          }}>Description</p>
              <p style={{
            fontSize: 13.5,
            fontWeight: 600,
            color: 'var(--ink)'
          }}>{tx.description}</p>
            </div>}

          {statutInfo && <div style={{
          padding: '10px 0',
          borderBottom: '1px solid #F8FAFC'
        }}>
              <p style={{
            fontSize: 11,
            color: '#94A3B8',
            marginBottom: 3
          }}>Statut</p>
              <p style={{
            fontSize: 13.5,
            fontWeight: 700,
            color: statutInfo.color
          }}>{statutInfo.label}</p>
            </div>}

          {tx.phoneNumber && <div style={{
          padding: '10px 0',
          borderBottom: '1px solid #F8FAFC'
        }}>
              <p style={{
            fontSize: 11,
            color: '#94A3B8',
            marginBottom: 3
          }}>Numéro Mobile Money</p>
              <p style={{
            fontSize: 13.5,
            fontWeight: 600,
            color: 'var(--ink)'
          }}>{tx.phoneNumber}{tx.operateur ? ` (${OPERATEURS.find(o => o.id === tx.operateur)?.label || tx.operateur})` : ''}</p>
            </div>}

          <div style={{
          padding: '10px 0',
          borderBottom: tx.commandeId ? '1px solid #F8FAFC' : 'none'
        }}>
            <p style={{
            fontSize: 11,
            color: '#94A3B8',
            marginBottom: 3
          }}>Date et heure</p>
            <p style={{
            fontSize: 13.5,
            fontWeight: 600,
            color: 'var(--ink)'
          }}>{dateComplete}</p>
          </div>

          {tx.commandeId && <div style={{
          padding: '10px 0'
        }}>
              <Link to={`/commande/${tx.commandeId}`} onClick={onClose} style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13.5,
            fontWeight: 700,
            color: '#2FB4A0',
            textDecoration: 'none'
          }}>
                <ShoppingBag style={{
              width: 14,
              height: 14
            }} /> Voir la commande liée <ChevronRight style={{
              width: 14,
              height: 14
            }} />
              </Link>
            </div>}
        </div>
      </motion.div>
    </div>;
}
export default function WalletPage() {
  const {
    user,
    userProfile
  } = useAuth();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState({
    solde: 0,
    soldeParrainage: 0
  });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('apercu');
  const [montantDepot, setMontantDepot] = useState('');
  const [phoneDepot, setPhoneDepot] = useState('');
  const [operateurDepot, setOperateurDepot] = useState('MTN_MOMO_CMR');
  const [attenteDepot, setAttenteDepot] = useState(false);
  const [montantRetrait, setMontantRetrait] = useState('');
  const [phone, setPhone] = useState('');
  const [operateur, setOperateur] = useState('MTN_MOMO_CMR');
  const [submitting, setSubmitting] = useState(false);
  const [retraitMinimum, setRetraitMinimum] = useState(1000);
  const [showConfirmRetrait, setShowConfirmRetrait] = useState(false);
  const [transfertParrainageMinimum, setTransfertParrainageMinimum] = useState(5000);
  const [showConfirmTransfert, setShowConfirmTransfert] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    // #retour utilisateur (corrigé) : écoute le solde en direct, comme
    // WalletBalance (la pastille de la barre de navigation) — avant, cette
    // page le lisait une seule fois au chargement (getWallet), ce qui pouvait
    // rester affiché périmé si le solde change pendant que la page reste
    // ouverte (ex. un admin résout un écart de montant), désynchronisé de la
    // pastille jusqu'à un rechargement manuel de la page.
    const unsubWallet = listenWallet(user.uid, setWallet);
    loadTransactions();
    reconcilierDepotsEnAttente(user.uid).then(credites => {
      if (credites.length > 0) loadTransactions();
    }).catch(e => console.warn('Réconciliation des dépôts en attente échouée :', e.message));
    verifierEcartSoldePropre(user.uid).catch(e => console.warn('Vérification de l\'écart de solde échouée :', e.message));
    return unsubWallet;
  }, [user]);
  useEffect(() => {
    getSettings().then(s => {
      setRetraitMinimum(s.retraitMinimum);
      setTransfertParrainageMinimum(s.transfertParrainageMinimum ?? 5000);
    });
  }, []);
  const loadTransactions = async () => {
    setLoading(true);
    try {
      const tx = await getTransactionsBancaires(user.uid);
      setTransactions(tx);
    } catch (e) {
      toast.error('Erreur chargement wallet');
    } finally {
      setLoading(false);
    }
  };
  const handleDepot = async () => {
    const montant = parseInt(montantDepot);
    if (!montant || montant < 500) {
      toast.error('Montant minimum : 500 XAF');
      return;
    }
    if (!phoneDepot || phoneDepot.length < 9) {
      toast.error('Numéro de téléphone invalide');
      return;
    }
    if (!operateurCorrespond(phoneDepot, operateurDepot)) {
      toast.error(`Ce numéro ne correspond pas à ${OPERATEURS.find(o => o.id === operateurDepot)?.label}.`);
      return;
    }
    setSubmitting(true);
    setAttenteDepot(true);
    try {
      const {
        transactionId
      } = await initierDepot(user.uid, montant, phoneDepot);
      toast('Vérifiez votre téléphone pour confirmer le paiement…', {
        icon: '📲',
        duration: 6000
      });
      const {
        statut
      } = await attendreConfirmationDepot(transactionId);
      if (statut === 'completed') {
        toast.success(`✅ Dépôt de ${montant.toLocaleString()} XAF crédité !`);
        setMontantDepot('');
        setPhoneDepot('');
        await loadTransactions();
        setTab('apercu');
      } else if (statut === 'echoue') {
        toast.error('Le paiement a échoué ou a été refusé.');
      } else if (statut === 'ecart_montant') {
        toast.error('Écart détecté sur le montant confirmé — vérification manuelle en cours, contactez le support si besoin.');
      } else {
        toast('Confirmation toujours en attente — elle se fera automatiquement dès validation.', {
          icon: '⏳'
        });
      }
    } catch (e) {
      toast.error(e.message === 'COMPTE_SUSPENDU_VERIFICATION' ? 'Votre compte est en cours de vérification suite à une anomalie détectée sur votre solde. Contactez le support MAKET.' : e.message || 'Erreur dépôt');
    } finally {
      setSubmitting(false);
      setAttenteDepot(false);
    }
  };
  const handleRetrait = () => {
    const montant = parseInt(montantRetrait);
    if (!montant) {
      toast.error('Entrez un montant');
      return;
    }
    if (!phone || phone.length < 9) {
      toast.error('Numéro de téléphone invalide');
      return;
    }
    if (!operateurCorrespond(phone, operateur)) {
      toast.error(`Ce numéro ne correspond pas à ${OPERATEURS.find(o => o.id === operateur)?.label}.`);
      return;
    }
    setShowConfirmRetrait(true);
  };
  const handleConfirmerRetrait = async () => {
    const montant = parseInt(montantRetrait);
    setSubmitting(true);
    try {
      await initierRetrait(user.uid, montant, phone, operateur);
      toast.success('Demande de retrait soumise — traitement sous 24h');
      setShowConfirmRetrait(false);
      setMontantRetrait('');
      setPhone('');
      loadTransactions();
      setTab('apercu');
    } catch (e) {
      setShowConfirmRetrait(false);
      // MOYENNE (audit sécurité, corrigé) : la règle Firestore qui limite un
      // retrait aux numéros déjà utilisés pour un dépôt confirmé rejette avec
      // un code générique "permission-denied", sans message — remplacé ici
      // par un texte clair plutôt que de laisser passer l'erreur technique brute.
      const message = e.message === 'COMPTE_SUSPENDU_VERIFICATION'
        ? 'Votre compte est en cours de vérification suite à une anomalie détectée sur votre solde. Contactez le support MAKET.'
        : e.code === 'permission-denied'
        ? 'Ce numéro n\'a jamais servi à un dépôt sur ce compte — par sécurité, un retrait ne peut viser qu\'un numéro déjà utilisé pour déposer.'
        : e.message || 'Erreur retrait';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };
  // #nouveau (refonte parrainage v2) : transfert self-service de la totalité du
  // solde de parrainage vers le solde principal, ensuite retirable normalement
  // via l'onglet "Retirer" ci-dessus.
  const handleTransfert = () => {
    if (!wallet.soldeParrainage || wallet.soldeParrainage < transfertParrainageMinimum) {
      toast.error(`Montant minimum : ${transfertParrainageMinimum.toLocaleString('fr-FR')} XAF`);
      return;
    }
    setShowConfirmTransfert(true);
  };
  const handleConfirmerTransfert = async () => {
    setTransferring(true);
    try {
      await transfererSoldeParrainage(user.uid, wallet.soldeParrainage);
      toast.success('Solde de parrainage transféré vers votre solde principal !');
      setShowConfirmTransfert(false);
    } catch (e) {
      setShowConfirmTransfert(false);
      const message = e.message === 'COMPTE_SUSPENDU_VERIFICATION'
        ? 'Votre compte est en cours de vérification suite à une anomalie détectée sur votre solde. Contactez le support MAKET.'
        : e.message || 'Erreur lors du transfert';
      toast.error(message);
    } finally {
      setTransferring(false);
    }
  };
  const txIcon = type => ({
    [WALLET_TYPES.DEPOT]: {
      icon: ArrowDownLeft,
      color: '#059669',
      bg: '#F0FDF4'
    },
    [WALLET_TYPES.RETRAIT]: {
      icon: ArrowUpRight,
      color: '#DC2626',
      bg: '#FEF2F2'
    }
  })[type] || {
    icon: Clock,
    color: '#94A3B8',
    bg: '#F8FAFC'
  };
  if (!user) return null;
  return <div className="max-w-lg mx-auto px-6 py-8">
      <h1 className="text-2xl font-black text-gray-900 mb-6" style={{
      fontFamily: 'var(--font-display)'
    }}>Mon Wallet</h1>

      {}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div style={{
        background: 'linear-gradient(135deg, #174858, #2FB4A0)',
        borderRadius: 18,
        padding: 20,
        color: 'white',
        boxShadow: '0 10px 26px rgba(23,51,125,0.28)'
      }}>
          <p style={{
          fontSize: 11,
          opacity: 0.7,
          fontWeight: 600,
          marginBottom: 6,
          letterSpacing: '0.05em'
        }}>SOLDE PRINCIPAL</p>
          <p style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 22,
          fontVariantNumeric: 'tabular-nums'
        }}>{wallet.solde?.toLocaleString()} <span style={{
            fontSize: 13
          }}>XAF</span></p>
          <p style={{
          fontSize: 11,
          opacity: 0.6,
          marginTop: 4
        }}>Retrait possible</p>
        </div>
        <div style={{
        background: 'linear-gradient(135deg, #5B21B6, #7C3AED)',
        borderRadius: 18,
        padding: 20,
        color: 'white',
        boxShadow: '0 10px 26px rgba(91,33,182,0.28)'
      }}>
          <p style={{
          fontSize: 11,
          opacity: 0.7,
          fontWeight: 600,
          marginBottom: 6,
          letterSpacing: '0.05em'
        }}>SOLDE DE PARRAINAGE</p>
          <p style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 22,
          fontVariantNumeric: 'tabular-nums'
        }}>{wallet.soldeParrainage?.toLocaleString() || 0} <span style={{
            fontSize: 13
          }}>XAF</span></p>
          <button onClick={handleTransfert} disabled={!wallet.soldeParrainage || wallet.soldeParrainage < transfertParrainageMinimum} className="w-full mt-2 py-1.5 rounded-lg text-xs font-bold transition-all" style={{
          background: 'rgba(255,255,255,0.15)',
          opacity: !wallet.soldeParrainage || wallet.soldeParrainage < transfertParrainageMinimum ? 0.5 : 1
        }}>
            Transférer vers mon solde principal
          </button>
        </div>
      </div>

      {}
      {wallet.soldeBonus > 0 && <div style={{
        background: 'linear-gradient(135deg, var(--blue), var(--blue-dark))',
        borderRadius: 18,
        padding: 20,
        color: 'white',
        marginTop: -12,
        marginBottom: 24
      }}>
          <p style={{
          fontSize: 11,
          opacity: 0.7,
          fontWeight: 600,
          marginBottom: 6,
          letterSpacing: '0.05em'
        }}>🎁 SOLDE BONUS — LANCEMENT</p>
          <p style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 22,
          fontVariantNumeric: 'tabular-nums'
        }}>{wallet.soldeBonus?.toLocaleString() || 0} <span style={{
            fontSize: 13
          }}>XAF</span></p>
          <p style={{
          fontSize: 11,
          opacity: 0.75,
          marginTop: 4
        }}>Utilisable pour les frais de livraison — jamais retirable ni transférable</p>
        </div>}

      {}
      <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl">
        {[['apercu', 'Historique'], ['depot', 'Déposer'], ['retrait', 'Retirer']].map(([v, l]) => <button key={v} onClick={() => setTab(v)} className="flex-1 py-2 rounded-lg text-sm font-bold transition-all" style={{
        background: tab === v ? 'white' : 'transparent',
        color: tab === v ? '#2FB4A0' : '#64748B',
        boxShadow: tab === v ? '0 1px 4px rgba(0,0,0,0.08)' : 'none'
      }}>
            {l}
          </button>)}
      </div>

      <AnimatePresence mode="wait">

        {}
        {tab === 'apercu' && <motion.div key="apercu" initial={{
        opacity: 0,
        y: 10
      }} animate={{
        opacity: 1,
        y: 0
      }} exit={{
        opacity: 0
      }}>
            {loading ? <div className="space-y-3">{Array(5).fill(0).map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div> : transactions.length === 0 ? <div className="text-center py-12 text-gray-400">
                <Wallet className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="font-semibold text-sm">Aucune transaction</p>
                <p className="text-xs mt-1">Faites un dépôt pour commencer</p>
              </div> : <div className="space-y-2">
                {transactions.map((tx, i) => {
            const {
              icon: Icon,
              color,
              bg
            } = txIcon(tx.type);
            // #bug (corrigé, retour utilisateur) : un dépôt échoué garde un
            // montant positif en base (le montant TENTÉ, jamais réellement
            // crédité — cf. dynamic-processor, aucun crédit n'a lieu tant que
            // statut n'est pas "completed") — affiché en vert avec un "+"
            // comme s'il avait réussi. echec_versement (retrait) exclu par
            // cohérence, même si montant y est déjà négatif dans ce cas.
            const pos = tx.montant > 0 && tx.statut !== 'echoue' && tx.statut !== 'echec_versement';
            const estRetrait = tx.type === WALLET_TYPES.RETRAIT;
            const statutRetrait = estRetrait ? {
              en_cours: {
                label: 'En attente de traitement',
                color: '#D97706'
              },
              en_cours_versement: {
                label: 'Versement en cours',
                color: '#2563EB'
              },
              completed: {
                label: 'Validé',
                color: '#059669'
              },
              echec_versement: {
                label: 'Échec du versement',
                color: '#DC2626'
              },
              versement_incertain: {
                label: 'Vérification en cours',
                color: '#D97706'
              },
              rejete: {
                label: 'Rejeté — montant recrédité',
                color: '#DC2626'
              }
            }[tx.statut] : null;
            return <motion.div key={tx.id} initial={{
              opacity: 0,
              y: 8
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              delay: i * 0.03
            }} onClick={() => setSelectedTx(tx)} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-gray-100 cursor-pointer hover:border-gray-200 transition-colors" style={{
              boxShadow: 'var(--shadow-sm)'
            }}>
                      <div style={{
                width: 38,
                height: 38,
                background: bg,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                        <Icon style={{
                  width: 16,
                  height: 16,
                  color
                }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{tx.description}</p>
                        <p className="text-xs text-gray-400">
                          {tx.createdAt?.toDate?.()?.toLocaleDateString('fr-FR') || '—'}
                          {!estRetrait && tx.statut === 'pending' && ' · En attente'}
                          {!estRetrait && tx.statut === 'echoue' && ' · Échoué'}
                          {statutRetrait && <span style={{
                    color: statutRetrait.color,
                    fontWeight: 700
                  }}> · {statutRetrait.label}</span>}
                        </p>
                      </div>
                      <p className="font-black text-sm flex-shrink-0 tabular-nums" style={{
                color: pos ? '#059669' : '#DC2626'
              }}>
                        {pos ? '+' : ''}{tx.montant?.toLocaleString()} XAF
                      </p>
                    </motion.div>;
          })}
              </div>}
          </motion.div>}

        {}
        {tab === 'depot' && <motion.div key="depot" initial={{
        opacity: 0,
        y: 10
      }} animate={{
        opacity: 1,
        y: 0
      }} exit={{
        opacity: 0
      }} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">Montant à déposer (XAF)</label>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {MONTANTS_RAPIDES.map(m => <button key={m} onClick={() => setMontantDepot(String(m))} className="p-2.5 rounded-xl border-2 text-sm font-bold transition-all" style={{
              borderColor: montantDepot === String(m) ? '#2FB4A0' : '#E2E8F0',
              background: montantDepot === String(m) ? '#EFF6FF' : 'white',
              color: montantDepot === String(m) ? '#2FB4A0' : '#64748B'
            }}>
                    {m.toLocaleString()}
                  </button>)}
              </div>
              <input type="number" value={montantDepot} onChange={e => setMontantDepot(e.target.value)} placeholder="Autre montant" className="input-field" min="500" disabled={attenteDepot} />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Opérateur</label>
              <div className="grid grid-cols-2 gap-3">
                {OPERATEURS.map(op => <button key={op.id} type="button" onClick={() => setOperateurDepot(op.id)} disabled={attenteDepot} className="p-3 rounded-xl border-2 text-sm font-bold transition-all flex items-center gap-2.5" style={{
              borderColor: operateurDepot === op.id ? '#2FB4A0' : '#E2E8F0',
              background: operateurDepot === op.id ? '#EFF6FF' : 'white'
            }}>
                    <OperatorLogo id={op.id} size={26} />
                    <span className="text-xs">{op.label}</span>
                  </button>)}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Numéro Mobile Money</label>
              <input type="tel" value={phoneDepot} onChange={e => setPhoneDepot(e.target.value)} placeholder="6XXXXXXXX" className="input-field" maxLength={9} disabled={attenteDepot} />
              {!operateurCorrespond(phoneDepot, operateurDepot) && <p className="text-xs text-red-500 mt-1">Ce numéro ne correspond pas à {OPERATEURS.find(o => o.id === operateurDepot)?.label}.</p>}
            </div>

            <div className="bg-primary-50 rounded-xl p-4 border border-primary-100 flex items-start gap-2">
              <Shield className="w-4 h-4 text-primary-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-primary-700">Paiement sécurisé via CamPay</p>
                <p className="text-xs text-primary-600 mt-0.5">MTN Mobile Money et Orange Money acceptés</p>
              </div>
            </div>

            {attenteDepot && <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 flex items-start gap-2">
                <Smartphone className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-700">Vérifiez votre téléphone</p>
                  <p className="text-xs text-amber-600 mt-0.5">Confirmez le paiement sur le prompt reçu par {phoneDepot} — cette page se met à jour automatiquement.</p>
                </div>
              </div>}

            <button onClick={handleDepot} disabled={submitting || !montantDepot || parseInt(montantDepot) < 500 || phoneDepot.length < 9 || !operateurCorrespond(phoneDepot, operateurDepot)} className="btn-primary w-full justify-center py-4">
              {submitting ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />En attente de confirmation...</span> : `Déposer ${montantDepot ? parseInt(montantDepot).toLocaleString() : '—'} XAF`}
            </button>
          </motion.div>}

        {}
        {tab === 'retrait' && <motion.div key="retrait" initial={{
        opacity: 0,
        y: 10
      }} animate={{
        opacity: 1,
        y: 0
      }} exit={{
        opacity: 0
      }} className="space-y-5">
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-700">Retrait du solde principal uniquement</p>
                <p className="text-xs text-amber-600 mt-0.5">Minimum {retraitMinimum.toLocaleString()} XAF · Traitement sous 24h · Solde disponible : {wallet.solde?.toLocaleString()} XAF</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Montant à retirer (XAF)</label>
              <input type="number" value={montantRetrait} onChange={e => setMontantRetrait(e.target.value)} placeholder={`Min. ${retraitMinimum.toLocaleString()} XAF`} className="input-field" min={retraitMinimum} max={wallet.solde} />
              {montantRetrait && parseInt(montantRetrait) > wallet.solde && <p className="text-xs text-red-500 mt-1">Solde insuffisant</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Opérateur</label>
              <div className="grid grid-cols-2 gap-3">
                {OPERATEURS.map(op => <button key={op.id} type="button" onClick={() => setOperateur(op.id)} className="p-3 rounded-xl border-2 text-sm font-bold transition-all flex items-center gap-2.5" style={{
              borderColor: operateur === op.id ? '#2FB4A0' : '#E2E8F0',
              background: operateur === op.id ? '#EFF6FF' : 'white'
            }}>
                    <OperatorLogo id={op.id} size={26} />
                    <span className="text-xs">{op.label}</span>
                  </button>)}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Numéro Mobile Money</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="6XXXXXXXX" className="input-field" maxLength={9} />
              {!operateurCorrespond(phone, operateur) && <p className="text-xs text-red-500 mt-1">Ce numéro ne correspond pas à {OPERATEURS.find(o => o.id === operateur)?.label}.</p>}
            </div>

            <button onClick={handleRetrait} disabled={submitting || !montantRetrait || parseInt(montantRetrait) < retraitMinimum || parseInt(montantRetrait) > wallet.solde || phone.length < 9 || !operateurCorrespond(phone, operateur)} className="btn-primary w-full justify-center py-4">
              {submitting ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Traitement...</span> : `Retirer ${montantRetrait ? parseInt(montantRetrait).toLocaleString() : '—'} XAF`}
            </button>
          </motion.div>}

      </AnimatePresence>

      {showConfirmRetrait && <ConfirmDialog title="Confirmer ce retrait ?" description={`Vous allez retirer ${parseInt(montantRetrait || 0).toLocaleString('fr-FR')} XAF depuis votre solde principal vers ${phone} (${OPERATEURS.find(o => o.id === operateur)?.label || operateur}).`} confirmLabel="Confirmer le retrait" onConfirm={handleConfirmerRetrait} onCancel={() => setShowConfirmRetrait(false)} />}
      {showConfirmTransfert && <ConfirmDialog title="Confirmer ce transfert ?" description={`Vous allez transférer ${wallet.soldeParrainage?.toLocaleString('fr-FR')} XAF de votre solde de parrainage vers votre solde principal (ensuite retirable normalement).`} confirmLabel={transferring ? 'Transfert…' : 'Confirmer le transfert'} onConfirm={handleConfirmerTransfert} onCancel={() => setShowConfirmTransfert(false)} />}
      {selectedTx && <TransactionDetailModal tx={selectedTx} onClose={() => setSelectedTx(null)} />}
    </div>;
}
