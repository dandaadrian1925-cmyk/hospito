import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, CalendarPlus, CreditCard, FolderHeart, User, Flag } from 'lucide-react';
import { Link } from 'react-router-dom';
const CATEGORIES = [{
  id: 'compte',
  label: 'Compte & Inscription',
  icon: User,
  color: '#2451C4',
  faqs: [{
    q: 'Combien coûte l\'inscription sur Hospito ?',
    r: 'L\'inscription est entièrement gratuite.'
  }, {
    q: 'Puis-je m\'inscrire avec Google ?',
    r: 'Oui ! Vous pouvez vous inscrire et vous connecter directement avec votre compte Google via le bouton "Continuer avec Google" sur la page d\'inscription.'
  }, {
    q: 'À quoi sert mon numéro de CNI dans Mon Compte ?',
    r: 'C\'est l\'identifiant qui permet de retrouver votre dossier médical, quel que soit l\'établissement où vous êtes suivi. Renseignez-le une fois dans Mon Compte > Informations personnelles.'
  }]
}, {
  id: 'etablissements',
  label: 'Établissements & Rendez-vous',
  icon: CalendarPlus,
  color: '#7C3AED',
  faqs: [{
    q: 'Comment trouver un établissement de santé ?',
    r: 'Depuis l\'accueil ou la barre de recherche, parcourez la liste des établissements partenaires par nom ou par ville.'
  }, {
    q: 'Comment prendre rendez-vous ?',
    r: 'Ouvrez la fiche de l\'établissement souhaité, onglet "Prendre RDV", puis indiquez le motif de votre visite et la date souhaitée.'
  }, {
    q: 'Ma demande de rendez-vous est-elle confirmée immédiatement ?',
    r: 'Non — votre demande est transmise à l\'établissement, qui la confirme ou vous recontacte pour ajuster la date. Vous êtes notifié dès qu\'elle est traitée.'
  }]
}, {
  id: 'dossier',
  label: 'Dossier médical',
  icon: FolderHeart,
  color: '#059669',
  faqs: [{
    q: 'Mon dossier médical est-il le même dans tous les établissements ?',
    r: 'Oui — contrairement aux données administratives (qui restent propres à chaque établissement), votre dossier médical (antécédents, prescriptions, comptes-rendus) est unique et partagé entre tous les établissements Hospito où vous êtes suivi.'
  }, {
    q: 'Qui peut consulter mon dossier ?',
    r: 'Uniquement le personnel soignant autorisé (médecin, infirmier) de l\'établissement où vous êtes actuellement pris en charge — jamais un autre patient, ni un établissement où vous ne consultez pas.'
  }, {
    q: 'Puis-je le consulter moi-même ?',
    r: 'La consultation de votre dossier depuis votre espace patient est en cours de déploiement.'
  }]
}, {
  id: 'paiement',
  label: 'Paiement en ligne',
  icon: CreditCard,
  color: '#D97706',
  faqs: [{
    q: 'Comment fonctionne le paiement en ligne ?',
    r: 'Vous disposez d\'un solde Hospito rechargeable via Mobile Money (MTN Mobile Money, Orange Money), consultable dans l\'onglet Paiement de chaque établissement.'
  }, {
    q: 'Puis-je payer mes factures médicales en ligne ?',
    r: 'Cette fonctionnalité arrive bientôt, une fois la facturation activée côté établissements.'
  }]
}, {
  id: 'reclamations',
  label: 'Messagerie & Réclamations',
  icon: Flag,
  color: '#DC2626',
  faqs: [{
    q: 'Comment contacter un établissement ?',
    r: 'Depuis sa fiche, onglet Messagerie — vos messages sont transmis directement à l\'équipe de l\'établissement.'
  }, {
    q: 'Comment signaler un problème rencontré lors d\'une visite ?',
    r: 'Depuis la fiche de l\'établissement concerné, onglet Réclamations : décrivez le problème, ajoutez une preuve si besoin, et suivez son traitement.'
  }]
}];
function FAQItem({
  faq,
  index
}) {
  const [open, setOpen] = useState(false);
  return <motion.div initial={{
    opacity: 0,
    y: 10
  }} animate={{
    opacity: 1,
    y: 0
  }} transition={{
    delay: index * 0.04
  }} style={{
    background: 'white',
    borderRadius: 14,
    border: open ? '1.5px solid #BFDBFE' : '1.5px solid #F1F5F9',
    overflow: 'hidden',
    transition: 'border-color 0.2s'
  }}>
      <button onClick={() => setOpen(!open)} style={{
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 20px',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      textAlign: 'left',
      gap: 12
    }}>
        <span style={{
        fontWeight: 600,
        fontSize: 14,
        color: 'var(--ink)',
        lineHeight: 1.4,
        fontFamily: 'var(--font)'
      }}>{faq.q}</span>
        <motion.div animate={{
        rotate: open ? 180 : 0
      }} transition={{
        duration: 0.2
      }} style={{
        flexShrink: 0
      }}>
          <ChevronDown style={{
          width: 18,
          height: 18,
          color: '#94A3B8'
        }} />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && <motion.div initial={{
        height: 0,
        opacity: 0
      }} animate={{
        height: 'auto',
        opacity: 1
      }} exit={{
        height: 0,
        opacity: 0
      }} transition={{
        duration: 0.25
      }} style={{
        overflow: 'hidden'
      }}>
            <div style={{
          padding: '0 20px 16px',
          borderTop: '1px solid #F1F5F9'
        }}>
              <p style={{
            fontSize: 14,
            color: '#64748B',
            lineHeight: 1.7,
            marginTop: 12,
            fontFamily: 'var(--font)'
          }}>{faq.r}</p>
            </div>
          </motion.div>}
      </AnimatePresence>
    </motion.div>;
}
export default function FAQPage() {
  const [activeCategory, setActiveCategory] = useState('compte');
  const [search, setSearch] = useState('');
  const categories = CATEGORIES;
  const current = categories.find(c => c.id === activeCategory);
  const filtered = search ? categories.flatMap(c => c.faqs.filter(f => f.q.toLowerCase().includes(search.toLowerCase()) || f.r.toLowerCase().includes(search.toLowerCase()))) : current?.faqs || [];
  return <div style={{
    background: 'white',
    minHeight: '100vh'
  }}>
      {}
      <div style={{
      background: 'linear-gradient(135deg, #17337D, #2451C4)',
      padding: '56px 24px',
      textAlign: 'center'
    }}>
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }}>
          <h1 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 'clamp(1.8rem, 3vw, 2.8rem)',
          color: 'white',
          marginBottom: 12
        }}>
            Centre d'aide
          </h1>
          <p style={{
          color: 'rgba(255,255,255,0.75)',
          fontSize: 16,
          marginBottom: 28
        }}>
            Des réponses à toutes vos questions sur Hospito
          </p>
          {}
          <div style={{
          maxWidth: 480,
          margin: '0 auto',
          position: 'relative'
        }}>
            <Search style={{
            position: 'absolute',
            left: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 18,
            height: 18,
            color: '#94A3B8'
          }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher une question..." style={{
            width: '100%',
            padding: '14px 16px 14px 48px',
            background: 'white',
            border: 'none',
            borderRadius: 14,
            fontSize: 15,
            fontFamily: 'var(--font)',
            outline: 'none',
            color: 'var(--ink)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
          }} />
          </div>
        </motion.div>
      </div>

      <div style={{
      maxWidth: 1000,
      margin: '0 auto',
      padding: '48px 24px'
    }}>
        {search ? <div>
            <p style={{
          color: '#64748B',
          fontSize: 14,
          marginBottom: 20
        }}>{filtered.length} résultat(s) pour "{search}"</p>
            <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8
        }}>
              {filtered.map((faq, i) => <FAQItem key={i} faq={faq} index={i} />)}
              {filtered.length === 0 && <div style={{
            textAlign: 'center',
            padding: '48px 24px',
            color: '#94A3B8'
          }}>
                  <div style={{
              fontSize: 48,
              marginBottom: 12
            }}>🔍</div>
                  <p style={{
              fontWeight: 600
            }}>Aucune question trouvée</p>
                  <p style={{
              fontSize: 14,
              marginTop: 4
            }}>Contactez-nous directement</p>
                  <Link to="/contact" className="btn-primary" style={{
              marginTop: 16,
              display: 'inline-flex'
            }}>Nous contacter</Link>
                </div>}
            </div>
          </div> : <div style={{
        display: 'grid',
        gridTemplateColumns: '220px 1fr',
        gap: 32
      }} className="faq-grid">
            {}
            <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4
        }}>
              {categories.map(cat => <button key={cat.id} onClick={() => setActiveCategory(cat.id)} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            borderRadius: 12,
            border: 'none',
            cursor: 'pointer',
            background: activeCategory === cat.id ? cat.color + '12' : 'transparent',
            color: activeCategory === cat.id ? cat.color : '#64748B',
            fontWeight: activeCategory === cat.id ? 700 : 500,
            fontSize: 13,
            textAlign: 'left',
            transition: 'all 0.2s',
            fontFamily: 'var(--font)'
          }} onMouseEnter={e => {
            if (activeCategory !== cat.id) e.currentTarget.style.background = '#F8FAFC';
          }} onMouseLeave={e => {
            if (activeCategory !== cat.id) e.currentTarget.style.background = 'transparent';
          }}>
                  <div style={{
              width: 28,
              height: 28,
              background: activeCategory === cat.id ? cat.color + '15' : '#F1F5F9',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
                    <cat.icon style={{
                width: 14,
                height: 14,
                color: activeCategory === cat.id ? cat.color : '#94A3B8'
              }} />
                  </div>
                  {cat.label}
                </button>)}
            </div>

            {}
            <div>
              <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 20
          }}>
                <div style={{
              width: 36,
              height: 36,
              background: current?.color + '15',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
                  {current && <current.icon style={{
                width: 18,
                height: 18,
                color: current.color
              }} />}
                </div>
                <h2 style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 20,
              color: 'var(--ink)'
            }}>{current?.label}</h2>
              </div>
              <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}>
                {filtered.map((faq, i) => <FAQItem key={i} faq={faq} index={i} />)}
              </div>
            </div>
          </div>}

        {}
        <div style={{
        marginTop: 56,
        background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)',
        borderRadius: 20,
        padding: '32px 24px',
        textAlign: 'center',
        border: '1.5px solid #BFDBFE'
      }}>
          <p style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 18,
          color: 'var(--ink)',
          marginBottom: 8
        }}>
            Vous n'avez pas trouvé votre réponse ?
          </p>
          <p style={{
          color: '#64748B',
          fontSize: 14,
          marginBottom: 20
        }}>
            Notre équipe est disponible pour vous aider
          </p>
          <Link to="/contact" className="btn-primary">Contacter le support</Link>
        </div>
      </div>
      <style>{`
        @media (max-width: 640px) {
          .faq-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>;
}
