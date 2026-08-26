import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { AlertTriangle, Clock, FileText, CheckCircle, XCircle, Shield, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
const steps = [{
  num: '01',
  icon: AlertTriangle,
  color: '#DC2626',
  title: 'Ouvrir un litige',
  desc: 'Depuis votre suivi de commande, cliquez sur "Signaler un problème" dans les 24h suivant la confirmation de la remise.'
}, {
  num: '02',
  icon: FileText,
  color: '#D97706',
  title: 'Soumettre les preuves',
  desc: 'Fournissez des photos obligatoires de l\'article reçu. Précisez clairement en quoi l\'article ne correspond pas à la vidéo de l\'annonce.'
}, {
  num: '03',
  icon: Clock,
  color: '#2451C4',
  title: 'Examen par MAKET',
  desc: 'Notre équipe examine la vidéo de l\'annonce, les photos de réception, l\'historique du chat et toutes les preuves sous 48h.'
}, {
  num: '04',
  icon: CheckCircle,
  color: '#059669',
  title: 'Décision finale',
  desc: 'MAKET tranche de manière définitive et irrévocable. Le paiement est libéré selon la décision rendue.'
}];
const outcomes = [{
  result: 'Litige en faveur de l\'acheteur',
  color: '#059669',
  bg: '#F0FDF4',
  border: '#BBF7D0',
  consequences: ['Remboursement total via CamPay', 'Score du vendeur impacté négativement']
}, {
  result: 'Litige en faveur du vendeur',
  color: '#2451C4',
  bg: '#EFF6FF',
  border: '#BFDBFE',
  consequences: ['Paiement libéré, vendeur payé intégralement', 'Avertissement sur le compte acheteur si litige abusif']
}];
export default function LitigesPage() {
  const {
    user
  } = useAuth();
  return <div style={{
    background: 'white'
  }}>
      {}
      <div style={{
      background: 'linear-gradient(135deg, #7F1D1D, #DC2626)',
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
          <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(255,255,255,0.15)',
          padding: '6px 16px',
          borderRadius: 20,
          marginBottom: 16
        }}>
            <Shield style={{
            width: 14,
            height: 14,
            color: 'white'
          }} />
            <span style={{
            fontSize: 12,
            fontWeight: 700,
            color: 'white',
            letterSpacing: '0.05em'
          }}>ARBITRAGE IMPARTIAL</span>
          </div>
          <h1 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 'clamp(1.8rem, 3vw, 2.8rem)',
          color: 'white',
          marginBottom: 12
        }}>
            Centre de litiges
          </h1>
          <p style={{
          color: 'rgba(255,255,255,0.8)',
          fontSize: 16,
          maxWidth: 480,
          margin: '0 auto'
        }}>
            MAKET arbitre les litiges entre acheteurs et vendeurs de manière impartiale et définitive sous 48h.
          </p>
        </motion.div>
      </div>

      {}
      <div style={{
      maxWidth: 900,
      margin: '0 auto',
      padding: '48px 24px 0'
    }}>
        <div style={{
        background: '#FEF3C7',
        borderRadius: 16,
        padding: 20,
        border: '1.5px solid #FDE68A',
        display: 'flex',
        gap: 12,
        marginBottom: 48
      }}>
          <AlertTriangle style={{
          width: 20,
          height: 20,
          color: '#D97706',
          flexShrink: 0,
          marginTop: 2
        }} />
          <div>
            <p style={{
            fontWeight: 700,
            fontSize: 14,
            color: '#92400E',
            marginBottom: 6
          }}>Conditions pour ouvrir un litige</p>
            <ul style={{
            fontSize: 13,
            color: '#78350F',
            lineHeight: 1.8,
            paddingLeft: 16
          }}>
              <li>Vous avez <strong>24h maximum</strong> après confirmation de livraison pour ouvrir un litige</li>
              <li>Des <strong>photos preuves sont obligatoires</strong> — sans preuves, le litige sera rejeté</li>
              <li>Le litige doit porter sur un défaut <strong>non mentionné dans la vidéo de l'annonce</strong></li>
              <li>La décision de l'équipe MAKET est <strong>finale et irrévocable</strong></li>
            </ul>
          </div>
        </div>

        {}
        <h2 style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 800,
        fontSize: 26,
        color: 'var(--ink)',
        marginBottom: 32,
        textAlign: 'center'
      }}>
          Comment fonctionne le processus ?
        </h2>
        <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 56
      }}>
          {steps.map((step, i) => <motion.div key={i} initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} transition={{
          delay: i * 0.1
        }} style={{
          background: '#F8FAFC',
          borderRadius: 16,
          padding: 20,
          border: '1.5px solid #F1F5F9',
          textAlign: 'center'
        }}>
              <div style={{
            width: 44,
            height: 44,
            background: step.color + '15',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px'
          }}>
                <step.icon style={{
              width: 20,
              height: 20,
              color: step.color
            }} />
              </div>
              <span style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 24,
            color: step.color + '30',
            display: 'block',
            marginBottom: 6
          }}>{step.num}</span>
              <h3 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 15,
            color: 'var(--ink)',
            marginBottom: 8
          }}>{step.title}</h3>
              <p style={{
            fontSize: 12,
            color: '#64748B',
            lineHeight: 1.6
          }}>{step.desc}</p>
            </motion.div>)}
        </div>

        {}
        <h2 style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 800,
        fontSize: 26,
        color: 'var(--ink)',
        marginBottom: 24,
        textAlign: 'center'
      }}>
          Issues possibles
        </h2>
        <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 20,
        marginBottom: 56
      }}>
          {outcomes.map((o, i) => <div key={i} style={{
          background: o.bg,
          borderRadius: 16,
          padding: 24,
          border: `1.5px solid ${o.border}`
        }}>
              <h3 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 16,
            color: o.color,
            marginBottom: 16
          }}>
                {o.result}
              </h3>
              <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}>
                {o.consequences.map((c, j) => <div key={j} style={{
              display: 'flex',
              gap: 8,
              alignItems: 'flex-start'
            }}>
                    <CheckCircle style={{
                width: 14,
                height: 14,
                color: o.color,
                flexShrink: 0,
                marginTop: 2
              }} />
                    <span style={{
                fontSize: 13,
                color: '#374151',
                lineHeight: 1.5
              }}>{c}</span>
                  </div>)}
              </div>
            </div>)}
        </div>

        {}
        <div style={{
        textAlign: 'center',
        marginBottom: 48
      }}>
          {user ? <div>
              <p style={{
            color: '#64748B',
            marginBottom: 16,
            fontSize: 15
          }}>
                Vous avez un litige en cours sur une commande ?
              </p>
              <Link to="/mon-compte/achats" className="btn-primary" style={{
            display: 'inline-flex'
          }}>
                Voir mes commandes <ArrowRight style={{
              width: 16,
              height: 16
            }} />
              </Link>
            </div> : <div>
              <p style={{
            color: '#64748B',
            marginBottom: 16,
            fontSize: 15
          }}>
                Connectez-vous pour accéder à vos commandes et ouvrir un litige
              </p>
              <Link to="/auth" className="btn-primary" style={{
            display: 'inline-flex'
          }}>
                Se connecter <ArrowRight style={{
              width: 16,
              height: 16
            }} />
              </Link>
            </div>}
        </div>
      </div>
    </div>;
}
