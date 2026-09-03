import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download } from 'lucide-react';
import TelechargerApkBouton from './TelechargerApkBouton';
const STORAGE_KEY = 'maket_app_banner_dismissed';
const COOKIE_KEY = 'maket_cookie_consent';
export default function AppDownloadBanner() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    const verifier = () => {
      if (localStorage.getItem(COOKIE_KEY)) setVisible(true);
    };
    verifier();
    const minuteur = setTimeout(verifier, 600);
    window.addEventListener('storage', verifier);
    return () => {
      clearTimeout(minuteur);
      window.removeEventListener('storage', verifier);
    };
  }, []);
  const fermer = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };
  return <AnimatePresence>
      {visible && <motion.div initial={{
      opacity: 0,
      y: 50
    }} animate={{
      opacity: 1,
      y: 0
    }} exit={{
      opacity: 0,
      y: 50
    }} transition={{
      type: 'spring',
      stiffness: 300,
      damping: 28
    }} style={{
      position: 'fixed',
      left: 16,
      right: 16,
      bottom: 16,
      zIndex: 390,
      maxWidth: 460,
      margin: '0 auto',
      background: 'white',
      borderRadius: 20,
      padding: 14,
      boxShadow: '0 16px 40px rgba(23,51,125,0.22)',
      border: '1px solid #EEF2FF',
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }}>
          <div style={{
        width: 46,
        height: 46,
        borderRadius: 13,
        flexShrink: 0,
        background: 'linear-gradient(135deg, var(--blue, #2FB4A0), var(--blue-dark, #174858))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 6px 14px rgba(36,81,196,0.35)'
      }}>
            <span style={{
          color: 'white',
          fontWeight: 800,
          fontSize: 20,
          fontFamily: 'Syne, sans-serif'
        }}>M</span>
          </div>

          <div style={{
        flex: 1,
        minWidth: 0
      }}>
            <p style={{
          fontSize: 13.5,
          fontWeight: 800,
          color: 'var(--ink, #0F172A)',
          margin: 0,
          fontFamily: 'Syne, sans-serif'
        }}>
              L'app MAKET pour Android
            </p>
            <p style={{
          fontSize: 12,
          color: '#64748B',
          margin: '2px 0 0',
          lineHeight: 1.35
        }}>
              Plus rapide, notifications en temps réel
            </p>
          </div>

          <TelechargerApkBouton onDownloaded={fermer} className="btn-primary" style={{
        flexShrink: 0,
        padding: '9px 14px',
        fontSize: 12.5,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6
      }}>
            <Download size={14} />
            Installer
          </TelechargerApkBouton>

          <button onClick={fermer} aria-label="Fermer" style={{
        flexShrink: 0,
        width: 26,
        height: 26,
        borderRadius: '50%',
        border: 'none',
        background: '#F1F5F9',
        color: '#64748B',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer'
      }}>
            <X size={14} />
          </button>
        </motion.div>}
    </AnimatePresence>;
}
