import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { getCategories } from '../../services/categoriesService';
import { CATEGORY_ICONS } from '../categoryIcons';
export default function Stories() {
  const ref = useRef(null);
  const [categories, setCategories] = useState([]);
  useEffect(() => {
    getCategories().then(setCategories).catch(e => console.error('getCategories a échoué :', e));
  }, []);
  const scroll = d => ref.current?.scrollBy({
    left: d * 180,
    behavior: 'smooth'
  });
  return <div style={{
    position: 'relative',
    padding: '0 8px',
    maxWidth: '100%'
  }}>
      <button onClick={() => scroll(-1)} style={{
      position: 'absolute',
      left: -8,
      top: '40%',
      transform: 'translateY(-50%)',
      width: 32,
      height: 32,
      background: 'white',
      border: '1.5px solid #E2E8F0',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      zIndex: 10,
      transition: 'all 0.2s'
    }} onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)'} onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'}>
        <ChevronLeft style={{
        width: 14,
        height: 14,
        color: '#374151'
      }} />
      </button>

      <div ref={ref} className="scrollbar-hide" style={{
      display: 'flex',
      flexWrap: 'nowrap',
      gap: 12,
      overflowX: 'auto',
      WebkitOverflowScrolling: 'touch',
      paddingBottom: 4
    }}>
        {}
        <Link to="/catalogue?flash=true" style={{
        textDecoration: 'none',
        flexShrink: 0
      }}>
          <motion.div whileHover={{
          scale: 1.05
        }} whileTap={{
          scale: 0.97
        }} style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6
        }}>
            <div style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            background: 'linear-gradient(135deg, #F59E0B, #EF4444)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(245,158,11,0.4)'
          }}>
              <Zap style={{
              width: 28,
              height: 28,
              color: 'white',
              fill: 'white'
            }} />
            </div>
            <span style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#374151',
            whiteSpace: 'nowrap'
          }}>Flash</span>
          </motion.div>
        </Link>

        {categories.map((cat, i) => {
        const Icon = CATEGORY_ICONS[cat.id];
        return <Link key={cat.id} to={`/catalogue?categorie=${cat.id}`} style={{
          textDecoration: 'none',
          flexShrink: 0
        }}>
              <motion.div whileHover={{
            scale: 1.05
          }} whileTap={{
            scale: 0.97
          }} initial={{
            opacity: 0,
            x: 20
          }} animate={{
            opacity: 1,
            x: 0
          }} transition={{
            delay: i * 0.04
          }} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6
          }}>
                <div style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: 'var(--bg-2)',
              border: '1px solid var(--border-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'box-shadow 220ms cubic-bezier(0.16,1,0.3,1), border-color 220ms',
              boxShadow: 'var(--shadow-sm)'
            }}>
                  {Icon && <Icon style={{
                width: 24,
                height: 24,
                color: 'var(--accent)'
              }} strokeWidth={1.6} />}
                </div>
                <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#374151',
              whiteSpace: 'nowrap'
            }}>
                  {cat.label.split(' ')[0]}
                </span>
              </motion.div>
            </Link>;
      })}
      </div>

      <button onClick={() => scroll(1)} style={{
      position: 'absolute',
      right: -8,
      top: '40%',
      transform: 'translateY(-50%)',
      width: 32,
      height: 32,
      background: 'white',
      border: '1.5px solid #E2E8F0',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      zIndex: 10,
      transition: 'all 0.2s'
    }} onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)'} onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'}>
        <ChevronRight style={{
        width: 14,
        height: 14,
        color: '#374151'
      }} />
      </button>
    </div>;
}
