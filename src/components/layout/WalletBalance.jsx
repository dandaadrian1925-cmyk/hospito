import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Eye, EyeOff, Plus, Lock } from 'lucide-react';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { listenWallet } from '../../services/walletService';
const HIDE_GRACE_MS = 60 * 1000;
export default function WalletBalance({
  user
}) {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(null);
  const [visible, setVisible] = useState(true);
  const [hiddenAt, setHiddenAt] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwValue, setPwValue] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!user) return;
    const unsub = listenWallet(user.uid, setWallet);
    return unsub;
  }, [user]);
  useEffect(() => {
    const onClickOutside = e => {
      if (ref.current && !ref.current.contains(e.target)) setPanelOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);
  if (!user || !wallet) return null;
  const fmt = n => `${(n || 0).toLocaleString()} XAF`;
  const hasPasswordProvider = user.providerData?.some(p => p.providerId === 'password');
  const toggleEye = e => {
    e.stopPropagation();
    if (visible) {
      setVisible(false);
      setHiddenAt(Date.now());
      return;
    }
    if (hiddenAt && Date.now() - hiddenAt > HIDE_GRACE_MS && hasPasswordProvider) {
      setPwOpen(true);
    } else {
      setVisible(true);
      setHiddenAt(null);
    }
  };
  const confirmPassword = async () => {
    if (!pwValue) return;
    setPwLoading(true);
    setPwError('');
    try {
      const cred = EmailAuthProvider.credential(user.email, pwValue);
      await reauthenticateWithCredential(auth.currentUser, cred);
      setVisible(true);
      setHiddenAt(null);
      setPwOpen(false);
      setPwValue('');
    } catch {
      setPwError('Mot de passe incorrect');
    } finally {
      setPwLoading(false);
    }
  };
  return <div ref={ref} style={{
    position: 'relative'
  }}>
      <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }}>
        <button onClick={toggleEye} title={visible ? 'Masquer le solde' : 'Afficher le solde'} style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: 'var(--ink-3)',
        display: 'flex',
        padding: 4
      }}>
          {visible ? <Eye style={{
          width: 16,
          height: 16
        }} /> : <EyeOff style={{
          width: 16,
          height: 16
        }} />}
        </button>
        <button onClick={() => setPanelOpen(o => !o)} className="wallet-balance-pill" style={{
        background: 'var(--bg-2)',
        border: '1px solid var(--border-2)',
        borderRadius: 999,
        padding: '6px 12px',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 700,
        color: 'var(--ink)',
        fontFamily: 'var(--font)',
        minWidth: 90,
        textAlign: 'center',
        whiteSpace: 'nowrap'
      }}>
          {visible ? fmt(wallet.solde) : '•••• XAF'}
        </button>
        <button onClick={() => navigate('/wallet')} title="Déposer de l'argent" className="wallet-deposit-btn" style={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        border: 'none',
        cursor: 'pointer',
        background: 'var(--blue)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
          <Plus style={{
          width: 14,
          height: 14
        }} />
        </button>
      </div>

      {}
      <AnimatePresence>
        {panelOpen && <motion.div initial={{
        opacity: 0,
        y: 6
      }} animate={{
        opacity: 1,
        y: 0
      }} exit={{
        opacity: 0,
        y: 6
      }} transition={{
        duration: 0.14
      }} style={{
        position: 'absolute',
        top: 44,
        right: 0,
        width: 220,
        maxWidth: 'calc(100vw - 32px)',
        background: 'white',
        borderRadius: 14,
        boxShadow: '0 8px 30px rgba(0,0,0,0.10)',
        border: '1px solid var(--border-2)',
        overflow: 'hidden',
        zIndex: 100,
        padding: 16
      }}>
            <p style={{
          fontSize: 11,
          color: 'var(--ink-4)',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.04em'
        }}>Solde principal</p>
            <p style={{
          fontSize: 20,
          fontWeight: 800,
          color: 'var(--ink)',
          fontFamily: 'var(--font-display)',
          marginTop: 2,
          marginBottom: 12
        }}>
              {visible ? fmt(wallet.solde) : '•••• XAF'}
            </p>
            {}
            {wallet.soldeBonus > 0 && <>
              <div style={{
            height: 1,
            background: 'var(--border-2)',
            margin: '10px 0'
          }} />
              <p style={{
            fontSize: 11,
            color: 'var(--ink-4)',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em'
          }}>Solde bonus</p>
              <p style={{
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--ink-2)',
            marginTop: 2
          }}>
                {visible ? fmt(wallet.soldeBonus) : '•••• XAF'}
              </p>
            </>}
            <Link to="/wallet" onClick={() => setPanelOpen(false)} style={{
          display: 'block',
          marginTop: 14,
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--blue)',
          textDecoration: 'none'
        }}>
              Voir mon wallet →
            </Link>
          </motion.div>}
      </AnimatePresence>

      {}
      {pwOpen && <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16
    }} onClick={() => {
      setPwOpen(false);
      setPwValue('');
      setPwError('');
    }}>
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
        maxWidth: 340
      }}>
            <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 14
        }}>
              <div style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: 'var(--accent-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
                <Lock style={{
              width: 16,
              height: 16,
              color: 'var(--blue)'
            }} />
              </div>
              <div>
                <p style={{
              fontWeight: 700,
              fontSize: 14,
              color: 'var(--ink)'
            }}>Confirmez votre mot de passe</p>
                <p style={{
              fontSize: 11,
              color: 'var(--ink-3)'
            }}>Solde masqué depuis plus d'1 minute</p>
              </div>
            </div>
            <input type="password" autoFocus value={pwValue} onChange={e => {
          setPwValue(e.target.value);
          setPwError('');
        }} onKeyDown={e => e.key === 'Enter' && confirmPassword()} placeholder="Mot de passe" className="input-field" />
            {pwError && <p style={{
          fontSize: 12,
          color: 'var(--danger)',
          marginTop: 6
        }}>{pwError}</p>}
            <div style={{
          display: 'flex',
          gap: 8,
          marginTop: 14
        }}>
              <button onClick={() => {
            setPwOpen(false);
            setPwValue('');
            setPwError('');
          }} className="btn-outline" style={{
            flex: 1,
            justifyContent: 'center',
            fontSize: 13
          }}>Annuler</button>
              <button onClick={confirmPassword} disabled={pwLoading || !pwValue} className="btn-primary" style={{
            flex: 1,
            justifyContent: 'center',
            fontSize: 13
          }}>
                {pwLoading ? '...' : 'Confirmer'}
              </button>
            </div>
          </motion.div>
        </div>}
    </div>;
}
