import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight, Shield, Star, Truck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
const SLIDES = [{
  id: 1,
  tag: '100% Sécurisé',
  tagIcon: Shield,
  title: 'Donne une\nseconde vie\nà tes objets',
  subtitle: 'Vends tes articles inutilisés avec facture en toute confiance, partout au Cameroun',
  cta: 'Commencer à vendre',
  ctaLink: '/publier',
  secondary: 'Voir les articles',
  secondaryLink: '/catalogue',
  image: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=900&q=65&fm=webp&auto=format&fit=crop',
  accent: '#2FB4A0'
}, {
  id: 2,
  tag: 'Factures vérifiées',
  tagIcon: Star,
  title: 'Achetez malin,\nachetez\nlocal',
  subtitle: "Des milliers d'articles vérifiés près de chez vous. Paiement sécurisé par MAKET.",
  cta: 'Explorer les annonces',
  ctaLink: '/catalogue',
  secondary: 'Comment ça marche',
  secondaryLink: '/comment-ca-marche',
  image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=900&q=65&fm=webp&auto=format&fit=crop',
  accent: '#72CCBE'
}, {
  id: 3,
  tag: 'Livraison disponible',
  tagIcon: Truck,
  title: 'Pas envie de\nvous déplacer ?\nOn livre.',
  subtitle: "Selon le vendeur : remise en main propre ou livraison par un partenaire — même entre deux villes. Frais fixés et acceptés avant tout déplacement.",
  cta: 'En savoir plus',
  ctaLink: '/comment-ca-marche',
  image: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=900&q=65&fm=webp&auto=format&fit=crop',
  accent: '#9FDDD3'
}];
export default function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [dir, setDir] = useState(1);
  // #nouveau (demande utilisateur) : la carte peut cacher une partie de la
  // photo sur mobile — un tap sur l'image (en dehors de la carte) la
  // masque/réaffiche, pour laisser voir la photo en plein écran à la demande.
  // Reremise à true à chaque changement de slide (jamais restée cachée sur
  // le slide suivant).
  const [showCard, setShowCard] = useState(true);
  // #perf (audit PageSpeed mobile, corrigé) : les 3 images de fond partaient
  // en téléchargement simultané dès le montage (backgroundImage posé sur les
  // 3 divs empilés, même ceux à opacity:0) — la 1ʳᵉ image (celle qui compte
  // pour le LCP) devait alors partager la bande passante avec 2 autres jamais
  // vues avant 5,5s/11s. Chaque slide ne charge désormais son image que la
  // première fois qu'il devient actif — la 1ʳᵉ vue ne télécharge qu'UNE image.
  const [loadedIds, setLoadedIds] = useState(() => new Set([SLIDES[0].id]));
  const {
    user
  } = useAuth();
  useEffect(() => {
    setShowCard(true);
    setLoadedIds(prev => prev.has(SLIDES[current].id) ? prev : new Set(prev).add(SLIDES[current].id));
  }, [current]);
  useEffect(() => {
    const t = setInterval(() => {
      setDir(1);
      setCurrent(c => (c + 1) % SLIDES.length);
    }, 5500);
    return () => clearInterval(t);
  }, []);
  const go = idx => {
    setDir(idx > current ? 1 : -1);
    setCurrent(idx);
  };
  const prev = () => {
    setDir(-1);
    setCurrent(c => (c - 1 + SLIDES.length) % SLIDES.length);
  };
  const next = () => {
    setDir(1);
    setCurrent(c => (c + 1) % SLIDES.length);
  };
  const getSecondary = slide => {
    if (slide.id === 3) {
      return user ? {
        label: 'Publier une annonce',
        link: '/publier'
      } : {
        label: "S'inscrire gratuitement",
        link: '/auth'
      };
    }
    return {
      label: slide.secondary,
      link: slide.secondaryLink
    };
  };
  const slide = SLIDES[current];
  const TagIcon = slide.tagIcon;
  const secondary = getSecondary(slide);
  return <div style={{
    maxWidth: 1280,
    margin: '0 auto',
    padding: '20px 24px 0'
  }}>
      <div className="hero-frame" style={{
      position: 'relative',
      overflow: 'hidden',
      borderRadius: 24,
      minHeight: 480
    }}>

        {}
        {SLIDES.map((s, i) => <div key={s.id} style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: loadedIds.has(s.id) ? `url(${s.image})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: i === current ? 1 : 0,
        transition: 'opacity 0.8s ease',
        zIndex: 0
      }} />)}

        {}
        <div style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        background: 'linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.12) 100%)'
      }} />

        {}
        <div className="hero-content" onClick={() => setShowCard(v => !v)} style={{
        position: 'relative',
        zIndex: 2,
        padding: '40px 24px',
        display: 'flex',
        alignItems: 'center',
        minHeight: 480,
        cursor: 'pointer'
      }}>
          <AnimatePresence mode="wait" custom={dir}>
            {showCard && <motion.div key={current} custom={dir} onClick={e => e.stopPropagation()} initial={{
            opacity: 0,
            y: 16
          }} animate={{
            opacity: 1,
            y: 0
          }} exit={{
            opacity: 0,
            y: -16
          }} transition={{
            duration: 0.4,
            ease: [0.4, 0, 0.2, 1]
          }} className="hero-card" style={{
            background: 'white',
            borderRadius: 20,
            padding: '36px 32px',
            maxWidth: 380,
            boxShadow: 'var(--shadow-lg)',
            cursor: 'default'
          }}>
              {}
              <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--accent-soft)',
              padding: '5px 12px',
              borderRadius: 20,
              marginBottom: 18
            }}>
                <TagIcon style={{
                width: 12,
                height: 12,
                color: 'var(--blue)'
              }} />
                <span style={{
                fontSize: 11.5,
                fontWeight: 700,
                color: 'var(--blue)',
                letterSpacing: '0.03em'
              }}>{slide.tag}</span>
              </div>

              {}
              <h1 className="hero-title" style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: 'clamp(1.7rem, 3vw, 2.1rem)',
              color: 'var(--ink)',
              lineHeight: 1.12,
              whiteSpace: 'pre-line',
              marginBottom: 14
            }}>
                {slide.title}
              </h1>

              {}
              <p className="hero-subtitle" style={{
              color: 'var(--ink-3)',
              fontSize: 14.5,
              lineHeight: 1.6,
              marginBottom: 26
            }}>
                {slide.subtitle}
              </p>

              {}
              <div className="hero-ctas" style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              alignItems: 'flex-start'
            }}>
                <Link to={slide.ctaLink} className="btn-primary" style={{
                padding: '12px 26px'
              }}>
                  {slide.cta}
                </Link>
                <Link to={secondary.link} style={{
                color: 'var(--blue)',
                fontWeight: 600,
                fontSize: 13.5,
                textDecoration: 'underline',
                textUnderlineOffset: 3
              }}>
                  {secondary.label}
                </Link>
              </div>
            </motion.div>}
          </AnimatePresence>
        </div>

        {}
        {[{
        fn: prev,
        side: 'right',
        offset: 60,
        icon: ChevronLeft,
        label: 'Slide précédent'
      }, {
        fn: next,
        side: 'right',
        offset: 16,
        icon: ChevronRight,
        label: 'Slide suivant'
      }].map(({
        fn,
        side,
        offset,
        icon: Icon,
        label
      }) => <button key={offset} onClick={fn} aria-label={label} style={{
        position: 'absolute',
        [side]: offset,
        top: 20,
        width: 36,
        height: 36,
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(10px)',
        border: 'none',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: 'var(--ink)',
        zIndex: 10,
        transition: 'all 0.2s'
      }} onMouseEnter={e => e.currentTarget.style.background = '#fff'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.85)'}>
            <Icon style={{
          width: 16,
          height: 16
        }} />
          </button>)}

        {}
        <div style={{
        position: 'absolute',
        bottom: 20,
        right: 24,
        display: 'flex',
        gap: 6,
        zIndex: 10
      }}>
          {SLIDES.map((_, i) => <button key={i} onClick={() => go(i)} aria-label={`Aller au slide ${i + 1}`} style={{
          height: 6,
          width: i === current ? 22 : 6,
          borderRadius: 3,
          background: i === current ? 'white' : 'rgba(255,255,255,0.5)',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.3s'
        }} />)}
        </div>
      </div>

      {}
      <style>{`
        @media (max-width: 640px) {
          .hero-frame { min-height: 460px !important; }
          .hero-content { min-height: 460px !important; padding: 28px 16px !important; }
          .hero-card { padding: 20px 18px !important; max-width: 92% !important; margin: 0 auto !important; }
          .hero-title { font-size: 1.35rem !important; margin-bottom: 10px !important; }
          .hero-subtitle { font-size: 13px !important; margin-bottom: 18px !important; }
          .hero-ctas { gap: 8px !important; }
        }
      `}</style>
    </div>;
}
