import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
export default function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Confirmer',
  danger = false,
  accentColor,
  onConfirm,
  onCancel
}) {
  const [busy, setBusy] = useState(false);
  const couleur = danger ? '#DC2626' : (accentColor || 'var(--accent, #2FB4A0)');
  const couleurFond = danger ? '#FEF2F2' : accentColor ? `color-mix(in srgb, ${accentColor} 12%, white)` : '#EFF6FF';
  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };
  return <div style={{
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 300,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16
  }} onClick={() => !busy && onCancel()}>
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
      maxWidth: 380
    }}>
        <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12
      }}>
          <div style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: couleurFond,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
            <AlertTriangle style={{
            width: 18,
            height: 18,
            color: couleur
          }} />
          </div>
          <h3 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 16,
          color: 'var(--ink)'
        }}>{title}</h3>
        </div>
        {description && <p style={{
        fontSize: 13.5,
        color: '#64748B',
        lineHeight: 1.55,
        marginBottom: 20
      }}>{description}</p>}
        <div style={{
        display: 'flex',
        gap: 10
      }}>
          <button onClick={onCancel} disabled={busy} className="btn-outline" style={{
          flex: 1,
          justifyContent: 'center',
          padding: '10px 16px',
          opacity: busy ? 0.6 : 1
        }}>
            Annuler
          </button>
          <button onClick={handleConfirm} disabled={busy} style={{
          flex: 1,
          justifyContent: 'center',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '10px 16px',
          borderRadius: 12,
          border: 'none',
          fontWeight: 700,
          fontSize: 14,
          cursor: busy ? 'default' : 'pointer',
          color: 'white',
          background: couleur,
          opacity: busy ? 0.7 : 1
        }}>
            {busy ? 'Patientez…' : confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>;
}
