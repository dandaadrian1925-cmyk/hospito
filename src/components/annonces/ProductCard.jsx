import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Zap, TrendingUp, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toggleFavori, isFavori, isFlashActive, isBoostActive } from '../../services/annoncesService';
import toast from 'react-hot-toast';
export default function ProductCard({
  annonce,
  index = 0,
  initialLiked = null,
  onToggleFavori = null
}) {
  const {
    user
  } = useAuth();
  const [liked, setLiked] = useState(!!initialLiked);
  const [imgErr, setImgErr] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [favoriLoading, setFavoriLoading] = useState(false);
  useEffect(() => {
    if (initialLiked !== null || !user) return;
    let cancelled = false;
    isFavori(user.uid, annonce.id).then(v => {
      if (!cancelled) setLiked(v);
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user?.uid, annonce.id]);
  const handleFavori = async e => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error('Connectez-vous pour ajouter aux favoris');
      return;
    }
    if (favoriLoading) return;
    setFavoriLoading(true);
    try {
      const nowLiked = await toggleFavori(user.uid, annonce.id);
      setLiked(nowLiked);
      onToggleFavori?.(nowLiked);
      toast.success(liked ? 'Retiré des favoris' : 'Ajouté aux favoris !');
    } catch {} finally {
      setFavoriLoading(false);
    }
  };
  const fmt = p => new Intl.NumberFormat('fr-FR').format(p) + ' XAF';
  return <motion.div initial={{
    opacity: 0,
    y: 16
  }} animate={{
    opacity: 1,
    y: 0
  }} transition={{
    delay: index * 0.04,
    duration: 0.35
  }}>
      <Link to={`/annonce/${annonce.id}`} style={{
      textDecoration: 'none',
      display: 'block'
    }}>
        <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{
        borderRadius: 14,
        overflow: 'hidden',
        background: 'white',
        transition: 'box-shadow 220ms cubic-bezier(0.16,1,0.3,1), transform 220ms cubic-bezier(0.16,1,0.3,1)',
        boxShadow: hovered ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)'
      }}>
          {}
          <div style={{
          position: 'relative',
          paddingBottom: '100%',
          background: '#F8FAFC'
        }}>
            <div style={{
            position: 'absolute',
            inset: 0
          }}>
              {annonce.photos?.[0] && !imgErr ? <img src={annonce.photos[0]} alt={annonce.titre} loading="lazy" decoding="async" onError={() => setImgErr(true)} style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: hovered ? 'scale(1.06)' : 'scale(1)',
              transition: 'transform 0.5s ease'
            }} /> : <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              color: 'var(--ink-4)',
              fontWeight: 500,
              background: 'var(--bg-2)'
            }}>Pas de photo</div>}
            </div>

            {}
            <div style={{
            position: 'absolute',
            top: 8,
            left: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 4
          }}>
              {isFlashActive(annonce) && <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              background: 'linear-gradient(135deg, #F59E0B, #EF4444)',
              color: 'white',
              fontSize: 10,
              fontWeight: 800,
              padding: '3px 8px',
              borderRadius: 20,
              boxShadow: '0 2px 8px rgba(245,158,11,0.4)'
            }}>
                  <Zap style={{
                width: 9,
                height: 9,
                fill: 'white'
              }} /> FLASH
                </span>}
              {annonce.boost === 'max' && isBoostActive(annonce) && <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              background: 'var(--accent)',
              color: 'white',
              fontSize: 10,
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: 20
            }}>
                  <TrendingUp style={{
                width: 9,
                height: 9
              }} /> BOOST
                </span>}
              {annonce.estLot && <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              background: 'var(--ink)',
              color: 'white',
              fontSize: 10,
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: 20
            }}>
                  LOT ×{annonce.nombreArticlesLot || 2}
                </span>}
            </div>

            {}
            <button onClick={handleFavori} disabled={favoriLoading} aria-label={liked ? 'Retirer des favoris' : 'Ajouter aux favoris'} style={{
            position: 'absolute',
            top: 8,
            right: 8,
            minWidth: 32,
            height: 32,
            background: 'white',
            borderRadius: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            padding: annonce.favoris > 0 ? '0 10px 0 8px' : 0,
            border: 'none',
            cursor: favoriLoading ? 'default' : 'pointer',
            opacity: favoriLoading ? 0.6 : 1,
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            transform: hovered ? 'scale(1.1)' : 'scale(1)',
            transition: 'transform 0.2s'
          }}>
              <Heart style={{
              width: 14,
              height: 14,
              color: liked ? '#EF4444' : '#94A3B8',
              fill: liked ? '#EF4444' : 'none',
              flexShrink: 0
            }} />
              {annonce.favoris > 0 && <span style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--ink-2)'
            }}>{annonce.favoris}</span>}
            </button>

            {}
            {annonce.factureUrl && <div style={{
            position: 'absolute',
            bottom: 8,
            left: 8
          }}>
                <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              background: '#10B981',
              color: 'white',
              fontSize: 10,
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: 20
            }}>
                  <Shield style={{
                width: 9,
                height: 9
              }} /> Facturé
                </span>
              </div>}
          </div>

          {}
          <div style={{
          padding: '12px 12px 14px'
        }}>
            <h3 style={{
            fontSize: 13.5,
            fontWeight: 500,
            color: 'var(--ink)',
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            marginBottom: 5,
            fontFamily: 'var(--font)'
          }}>{annonce.titre}</h3>

            <p style={{
            fontSize: 16,
            fontWeight: 800,
            color: 'var(--ink)',
            fontFamily: 'var(--font)',
            marginBottom: 7,
            fontVariantNumeric: 'tabular-nums'
          }}>{fmt(annonce.prix)}</p>

            <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}>
              <span style={{
              fontSize: 12,
              color: 'var(--ink-4)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
                {annonce.quartier}, {annonce.ville}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>;
}
