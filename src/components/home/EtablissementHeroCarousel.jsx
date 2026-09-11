import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Building2, CalendarPlus, FolderHeart } from 'lucide-react';

// Exporté (demande utilisateur, "remplace par un carrousel des mêmes images
// que le carrousel d'entrée dans HostoConnect") : réutilisé tel quel comme
// repli par le hero de l'accueil établissement (EtablissementAccueilPage)
// quand aucune vraie photo n'a été fournie par le sysadmin — même identité
// visuelle partout dans l'app plutôt que d'improviser une autre image.
export const IMAGES_GENERIQUES = [
  'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=900&q=65&fm=webp&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=900&q=65&fm=webp&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=900&q=65&fm=webp&auto=format&fit=crop',
];

function buildSlides(etablissement) {
  const base = `/etablissement/${etablissement.id}`;
  return [
    {
      id: 1,
      tag: 'Établissement partenaire',
      tagIcon: Building2,
      title: etablissement.nom,
      subtitle: `${etablissement.ville ? `${etablissement.ville} — ` : ''}Prenez rendez-vous, consultez votre dossier et échangez avec l'équipe soignante.`,
      cta: "Découvrir l'établissement",
      ctaLink: base,
      secondary: 'Prendre rendez-vous',
      secondaryLink: `${base}/rdv`,
    },
    {
      id: 2,
      tag: 'Rendez-vous en ligne',
      tagIcon: CalendarPlus,
      title: 'Prenez rendez-vous\nen quelques clics',
      subtitle: `Réservez une consultation à ${etablissement.nom} sans vous déplacer.`,
      cta: 'Prendre rendez-vous',
      ctaLink: `${base}/rdv`,
      secondary: "Voir l'établissement",
      secondaryLink: base,
    },
    {
      id: 3,
      tag: 'Dossier partagé',
      tagIcon: FolderHeart,
      title: 'Votre dossier,\npartout avec vous',
      subtitle: 'Un seul dossier médical, partagé entre tous vos établissements de santé.',
      cta: 'Consulter mon dossier',
      ctaLink: `${base}/dossier`,
      secondary: 'Nous contacter',
      secondaryLink: `${base}/messagerie`,
    },
  ];
}

export default function EtablissementHeroCarousel({ etablissement }) {
  const slides = buildSlides(etablissement);
  const [current, setCurrent] = useState(0);
  const [dir, setDir] = useState(1);
  const [showCard, setShowCard] = useState(true);

  // #corrigé (retour utilisateur, "la grande image doit être remplacée par
  // un carrousel des mêmes 3 images entrées par le super admin") : avant,
  // chaque légende marketing (slide 1/2/3) était figée sur SA PROPRE photo
  // (photoCarrousel1/2/3 respectivement) — si seule photoCarrousel1 était
  // renseignée, les légendes 2 et 3 retombaient sur des photos génériques,
  // donnant l'impression que "l'image ne change jamais" en pratique. Le fond
  // est désormais un vrai carrousel des 3 photos réelles (ou des mêmes
  // génériques en repli, cf. IMAGES_GENERIQUES), qui tourne indépendamment
  // du texte affiché.
  const imagesReelles = [etablissement.photoCarrousel1, etablissement.photoCarrousel2, etablissement.photoCarrousel3].filter(Boolean);
  const imagesRotation = imagesReelles.length ? imagesReelles : IMAGES_GENERIQUES;
  const imageActuelle = current % imagesRotation.length;

  useEffect(() => {
    setShowCard(true);
  }, [current]);

  useEffect(() => {
    const t = setInterval(() => {
      setDir(1);
      setCurrent((c) => (c + 1) % slides.length);
    }, 6500);
    return () => clearInterval(t);
  }, []);

  const go = (idx) => {
    setDir(idx > current ? 1 : -1);
    setCurrent(idx);
  };
  const prev = () => {
    setDir(-1);
    setCurrent((c) => (c - 1 + slides.length) % slides.length);
  };
  const next = () => {
    setDir(1);
    setCurrent((c) => (c + 1) % slides.length);
  };

  const slide = slides[current];
  const TagIcon = slide.tagIcon;

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 24px 0' }}>
      <div className="hero-frame" style={{ position: 'relative', overflow: 'hidden', borderRadius: 24, minHeight: 480 }}>
        {imagesRotation.map((src, i) => (
          <div
            key={src}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${src})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: i === imageActuelle ? 1 : 0,
              transition: 'opacity 0.8s ease',
              zIndex: 0,
            }}
          />
        ))}

        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.12) 100%)',
          }}
        />

        <div
          className="hero-content"
          onClick={() => setShowCard((v) => !v)}
          style={{ position: 'relative', zIndex: 2, padding: '40px 24px', display: 'flex', alignItems: 'center', minHeight: 480, cursor: 'pointer' }}
        >
          <AnimatePresence mode="wait" custom={dir}>
            {showCard && (
              <motion.div
                key={current}
                custom={dir}
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                className="hero-card"
                style={{ background: 'white', borderRadius: 20, padding: '36px 32px', maxWidth: 380, boxShadow: 'var(--shadow-lg)', cursor: 'default' }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'var(--accent-soft)',
                    padding: '5px 12px',
                    borderRadius: 20,
                    marginBottom: 18,
                  }}
                >
                  <TagIcon style={{ width: 12, height: 12, color: 'var(--blue)' }} />
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--blue)', letterSpacing: '0.03em' }}>{slide.tag}</span>
                </div>

                <h2
                  className="hero-title"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 600,
                    fontSize: 'clamp(1.7rem, 3vw, 2.1rem)',
                    color: 'var(--ink)',
                    lineHeight: 1.12,
                    whiteSpace: 'pre-line',
                    marginBottom: 14,
                  }}
                >
                  {slide.title}
                </h2>

                <p className="hero-subtitle" style={{ color: 'var(--ink-3)', fontSize: 14.5, lineHeight: 1.6, marginBottom: 26 }}>
                  {slide.subtitle}
                </p>

                <div className="hero-ctas" style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
                  <Link to={slide.ctaLink} className="btn-primary" style={{ padding: '12px 26px' }}>
                    {slide.cta}
                  </Link>
                  <Link to={slide.secondaryLink} style={{ color: 'var(--blue)', fontWeight: 600, fontSize: 13.5, textDecoration: 'underline', textUnderlineOffset: 3 }}>
                    {slide.secondary}
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {[
          { fn: prev, offset: 60, icon: ChevronLeft, label: 'Slide précédent' },
          { fn: next, offset: 16, icon: ChevronRight, label: 'Slide suivant' },
        ].map(({ fn, offset, icon: Icon, label }) => (
          <button
            key={offset}
            onClick={fn}
            aria-label={label}
            style={{
              position: 'absolute',
              right: offset,
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
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#fff')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.85)')}
          >
            <Icon style={{ width: 16, height: 16 }} />
          </button>
        ))}

        <div style={{ position: 'absolute', bottom: 20, right: 24, display: 'flex', gap: 6, zIndex: 10 }}>
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              aria-label={`Aller au slide ${i + 1}`}
              style={{
                height: 6,
                width: i === current ? 22 : 6,
                borderRadius: 3,
                background: i === current ? 'white' : 'rgba(255,255,255,0.5)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s',
              }}
            />
          ))}
        </div>
      </div>

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
    </div>
  );
}
