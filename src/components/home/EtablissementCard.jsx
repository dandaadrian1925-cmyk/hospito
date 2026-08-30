import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, MapPin, Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { isFavori, toggleFavori } from '../../services/favorisEtablissementsService';

export default function EtablissementCard({ etablissement, index = 0, initialFavori = null }) {
  const { user } = useAuth();
  const initiale = (etablissement.nom || '?').trim().charAt(0).toUpperCase();
  const [favori, setFavori] = useState(!!initialFavori);
  const [favoriLoading, setFavoriLoading] = useState(false);

  useEffect(() => {
    if (initialFavori !== null || !user) return;
    let cancelled = false;
    isFavori(user.uid, etablissement.id).then((v) => {
      if (!cancelled) setFavori(v);
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user?.uid, etablissement.id]);

  const handleFavori = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error('Connectez-vous pour ajouter aux favoris');
      return;
    }
    if (favoriLoading) return;
    setFavoriLoading(true);
    try {
      const nowFavori = await toggleFavori(user.uid, etablissement.id, etablissement.nom);
      setFavori(nowFavori);
      toast.success(nowFavori ? 'Ajouté aux favoris' : 'Retiré des favoris');
    } catch {
      toast.error('Échec de la mise à jour des favoris');
    } finally {
      setFavoriLoading(false);
    }
  };

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
              position: 'relative',
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
            <button
              onClick={handleFavori}
              aria-label={favori ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                width: 28,
                height: 28,
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(255,255,255,0.9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Heart
                style={{ width: 14, height: 14 }}
                fill={favori ? '#C2402F' : 'none'}
                stroke={favori ? '#C2402F' : '#334155'}
              />
            </button>
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
