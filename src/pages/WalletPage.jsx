import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, ArrowDownLeft, Clock, ChevronRight, Shield, Smartphone, X, ShoppingBag, Receipt } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { listenWallet, getTransactionsBancaires, initierDepot, attendreConfirmationDepot, reconcilierDepotsEnAttente, verifierEcartSoldePropre, WALLET_TYPES } from '../services/walletService';
import OperatorLogo from '../components/common/OperatorLogo';
import { OPERATEURS, operateurCorrespond } from '../utils/operateurs';
import toast from 'react-hot-toast';
const MONTANTS_RAPIDES = [1000, 2000, 5000, 10000, 25000, 50000];
const TYPE_LABELS = {
  [WALLET_TYPES.DEPOT]: 'Dépôt'
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
function getStatutInfo(tx) {
  return STATUT_LABELS_DEPOT[tx.statut] || null;
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
    [WALLET_TYPES.PAIEMENT_FACTURE]: {
      icon: Receipt,
      color: '#2451C4',
      bg: '#EFF6FF'
    }
  })[tx.type] || {
    icon: Clock,
    color: '#94A3B8',
    bg: '#F8FAFC'
  };
  // #bug (corrigé) : un dépôt échoué ne doit jamais s'afficher comme un vrai
  // crédit positif.
  const pos = tx.montant > 0 && tx.statut !== 'echoue';
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
    solde: 0
  });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('apercu');
  const [montantDepot, setMontantDepot] = useState('');
  const [phoneDepot, setPhoneDepot] = useState('');
  const [operateurDepot, setOperateurDepot] = useState('MTN_MOMO_CMR');
  const [attenteDepot, setAttenteDepot] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
  const txIcon = type => ({
    [WALLET_TYPES.DEPOT]: {
      icon: ArrowDownLeft,
      color: '#059669',
      bg: '#F0FDF4'
    },
    [WALLET_TYPES.PAIEMENT_FACTURE]: {
      icon: Receipt,
      color: '#2451C4',
      bg: '#EFF6FF'
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
      <div className="mb-6" style={{
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
          fontSize: 26,
          fontVariantNumeric: 'tabular-nums'
        }}>{wallet.solde?.toLocaleString()} <span style={{
            fontSize: 14
          }}>XAF</span></p>
        <p style={{
          fontSize: 11,
          opacity: 0.6,
          marginTop: 4
        }}>Utilisable pour payer vos factures HostoConnect</p>
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
        {[['apercu', 'Historique'], ['depot', 'Déposer']].map(([v, l]) => <button key={v} onClick={() => setTab(v)} className="flex-1 py-2 rounded-lg text-sm font-bold transition-all" style={{
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
            // crédité), affiché en vert avec un "+" comme s'il avait réussi.
            const pos = tx.montant > 0 && tx.statut !== 'echoue';
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
                          {tx.statut === 'pending' && ' · En attente'}
                          {tx.statut === 'echoue' && ' · Échoué'}
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

      </AnimatePresence>

      {selectedTx && <TransactionDetailModal tx={selectedTx} onClose={() => setSelectedTx(null)} />}
    </div>;
}
