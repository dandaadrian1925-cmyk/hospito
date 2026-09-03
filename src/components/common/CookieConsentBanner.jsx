import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
const STORAGE_KEY = 'maket_cookie_consent';
export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);
  const accepter = () => {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    setVisible(false);
  };
  return <AnimatePresence>
      {visible && <motion.div initial={{
      opacity: 0,
      y: 40
    }} animate={{
      opacity: 1,
      y: 0
    }} exit={{
      opacity: 0,
      y: 40
    }} style={{
      position: 'fixed',
      left: 16,
      right: 16,
      bottom: 16,
      zIndex: 400,
      maxWidth: 640,
      margin: '0 auto',
      background: 'white',
      borderRadius: 16,
      padding: '16px 20px',
      boxShadow: '0 12px 32px rgba(0,0,0,0.16)',
      border: '1px solid var(--border-2, #E2E8F0)',
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 14
    }}>
          <p style={{
        flex: '1 1 260px',
        fontSize: 13,
        color: 'var(--ink-2, #475569)',
        lineHeight: 1.5,
        margin: 0
      }}>
            HostoConnect utilise uniquement des cookies essentiels (connexion, sécurité du compte) — aucun cookie publicitaire ou de suivi.{' '}
            <Link to="/cookies" style={{
          color: 'var(--blue, #2FB4A0)',
          fontWeight: 600,
          textDecoration: 'underline'
        }}>En savoir plus</Link>
          </p>
          <button onClick={accepter} className="btn-primary" style={{
        flexShrink: 0,
        padding: '9px 20px',
        fontSize: 13
      }}>
            J'ai compris
          </button>
        </motion.div>}
    </AnimatePresence>;
}
