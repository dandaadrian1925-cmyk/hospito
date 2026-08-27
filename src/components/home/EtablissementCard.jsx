import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, MapPin } from 'lucide-react';

export default function EtablissementCard({ etablissement, index = 0 }) {
  const initiale = (etablissement.nom || '?').trim().charAt(0).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35 }}
      style={{ flexShrink: 0, width: 220 }}
    >
      <Link to={`/etablissement/${etablissement.id}`} style={{ textDecoration: 'none', display: 'block' }}>
        <div
          style={{
            borderRadius: 14,
            overflow: 'hidden',
            background: 'white',
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--border, #E2E8F0)',
          }}
        >
          <div
            style={{
              height: 110,
              background: 'linear-gradient(135deg, var(--blue), var(--primary-dark, #1a3a8f))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {etablissement.photoURL ? (
              <img
                src={etablissement.photoURL}
                alt={etablissement.nom}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ color: 'white', fontSize: 36, fontWeight: 700 }}>{initiale}</span>
            )}
          </div>
          <div style={{ padding: '12px 14px' }}>
            <p
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--ink)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {etablissement.nom}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <MapPin style={{ width: 12, height: 12, color: 'var(--ink-4)', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{etablissement.ville || '—'}</span>
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                marginTop: 8,
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--blue)',
              }}
            >
              <Building2 style={{ width: 12, height: 12 }} />
              Voir l'établissement
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
