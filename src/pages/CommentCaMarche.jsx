import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Camera, Shield, KeyRound, Star, FileText, ArrowRight, CheckCircle, ShoppingBag, Tag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
const etapesVendeur = [{
  num: '01',
  icon: Camera,
  title: 'Publie ton annonce',
  desc: 'Photos, vidéo honnête de l\'article, prix et description. Publication gratuite en V1.',
  color: '#2FB4A0'
}, {
  num: '02',
  icon: FileText,
  title: 'Facture vérifiée',
  desc: 'Pour les articles high-value, notre équipe vérifie l\'authenticité de ta facture avant publication.',
  color: '#7C3AED'
}, {
  num: '03',
  icon: KeyRound,
  title: 'Remets l\'article',
  desc: 'Dès qu\'un acheteur paie, organisez la remise via le chat. Il te donne son code à 4 chiffres au moment de l\'échange.',
  color: '#D97706'
}, {
  num: '04',
  icon: Star,
  title: 'Tu es payé !',
  desc: 'Après 24h sans litige suivant la remise, le paiement est libéré et l\'argent crédité sur ton compte.',
  color: '#2FB4A0'
}];
const etapesAcheteur = [{
  num: '01',
  icon: ShoppingBag,
  title: 'Choisis ton article',
  desc: 'Photos, vidéo honnête et facture vérifiée (pour le high-value) avant même de payer.',
  color: '#2FB4A0'
}, {
  num: '02',
  icon: Shield,
  title: 'Paie en sécurité',
  desc: 'L\'argent est bloqué en sécurité via CamPay. Ni le vendeur ni MAKET n\'y ont accès avant la remise.',
  color: '#059669'
}, {
  num: '03',
  icon: KeyRound,
  title: 'Récupère et confirme',
  desc: 'Retrouve le vendeur en main propre (ou reçois ta livraison) et donne ton code à 4 chiffres pour valider la remise.',
  color: '#DC2626'
}, {
  num: '04',
  icon: CheckCircle,
  title: 'Vérifie et note',
  desc: 'Tu as 24h pour signaler un problème. Sans litige, le paiement est libéré au vendeur. Tu peux aussi le noter.',
  color: '#7C3AED'
}];
const faqs = [{
  q: 'Combien coûte la publication d\'une annonce ?',
  r: 'La publication est entièrement gratuite en Version 1 de MAKET.'
}, {
  q: 'Comment fonctionne le paiement sécurisé ?',
  r: 'L\'argent de l\'acheteur est bloqué en sécurité par MAKET dès le paiement (CamPay ne gère que le dépôt/retrait de votre solde, pas cette protection). Il est libéré au vendeur seulement après confirmation de la remise (24h après, sauf litige).'
}, {
  q: 'Que se passe-t-il si l\'article ne correspond pas à la vidéo ?',
  r: 'L\'acheteur ouvre un litige dans les 24h suivant la remise. Notre équipe examine les preuves et tranche sous 48h.'
}, {
  q: 'La facture est-elle obligatoire ?',
  r: 'Elle est obligatoire pour les articles high-value (téléphones, électronique, électroménager, motos, ordinateurs). Pour les vêtements et petits articles, elle est facultative mais recommandée.'
}, {
  q: 'Comment se passe la remise de l\'article ?',
  r: 'Selon le choix du vendeur : en main propre (acheteur et vendeur conviennent d\'un lieu et d\'une heure via le chat) ou par un livreur partenaire, qui propose son prix avant tout déplacement. Au moment de l\'échange final, l\'acheteur donne son code de remise à 4 chiffres, saisi pour confirmer et déclencher la libération du paiement.'
}, {
  q: 'Que se passe-t-il si le vendeur ne confirme jamais la commande ?',
  r: 'Si le vendeur ne répond pas dans le délai imparti, la commande est automatiquement annulée et l\'acheteur intégralement remboursé.'
}];
export default function CommentCaMarche() {
  const {
    user
  } = useAuth();
  const [profil, setProfil] = useState('acheteur');
  const steps = profil === 'acheteur' ? etapesAcheteur : etapesVendeur;
  return <div style={{
    background: 'white'
  }}>
      {}
      <div style={{
      background: 'linear-gradient(135deg, #174858, #2FB4A0)',
      padding: '60px 24px',
      textAlign: 'center'
    }}>
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }}>
          <span style={{
          display: 'inline-block',
          background: 'rgba(255,255,255,0.15)',
          color: 'white',
          fontSize: 12,
          fontWeight: 700,
          padding: '4px 14px',
          borderRadius: 20,
          marginBottom: 16,
          letterSpacing: '0.05em'
        }}>
            SIMPLE & SÉCURISÉ
          </span>
          <h1 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 'clamp(2rem, 4vw, 3rem)',
          color: 'white',
          marginBottom: 16
        }}>
            Comment ça marche ?
          </h1>
          <p style={{
          color: 'rgba(255,255,255,0.75)',
          fontSize: 16,
          maxWidth: 480,
          margin: '0 auto'
        }}>
            MAKET sécurise chaque transaction entre acheteur et vendeur, du paiement à la livraison.
          </p>
        </motion.div>
      </div>

      {}
      <div style={{
      maxWidth: 1100,
      margin: '0 auto',
      padding: '64px 24px'
    }}>
        {}
        <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: 40
      }}>
          <div style={{
          display: 'inline-flex',
          background: '#F1F5F9',
          borderRadius: 14,
          padding: 4,
          gap: 4
        }}>
            {[{
            id: 'acheteur',
            label: 'Je veux acheter',
            icon: ShoppingBag
          }, {
            id: 'vendeur',
            label: 'Je veux vendre',
            icon: Tag
          }].map(({
            id,
            label,
            icon: Icon
          }) => <button key={id} onClick={() => setProfil(id)} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            borderRadius: 10,
            border: 'none',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            background: profil === id ? 'white' : 'transparent',
            color: profil === id ? 'var(--ink)' : '#64748B',
            boxShadow: profil === id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.2s'
          }}>
                <Icon style={{
              width: 16,
              height: 16
            }} /> {label}
              </button>)}
          </div>
        </div>

        <div style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 24
      }}>
          {steps.map((step, i) => <motion.div key={`${profil}-${i}`} initial={{
          opacity: 0,
          y: 24
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} transition={{
          delay: i * 0.1
        }} style={{
          position: 'relative',
          background: 'white',
          borderRadius: 20,
          padding: 28,
          border: '1.5px solid #F1F5F9',
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
          transition: 'all 0.3s'
        }} whileHover={{
          y: -4,
          boxShadow: '0 12px 32px rgba(26,86,219,0.1)',
          borderColor: '#BFDBFE'
        }}>
              {i < steps.length - 1 && <div style={{
            display: 'none',
            position: 'absolute',
            top: 44,
            left: '100%',
            width: 24,
            height: 2,
            background: 'linear-gradient(90deg, #CBD5E1, transparent)',
            zIndex: 1
          }} className="step-connector" />}
              <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 16
          }}>
                <div style={{
              width: 48,
              height: 48,
              background: step.color + '15',
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
                  <step.icon style={{
                width: 22,
                height: 22,
                color: step.color
              }} />
                </div>
                <span style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 32,
              color: step.color + '30'
            }}>{step.num}</span>
              </div>
              <h3 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 18,
            color: 'var(--ink)',
            marginBottom: 8
          }}>{step.title}</h3>
              <p style={{
            fontSize: 14,
            color: '#64748B',
            lineHeight: 1.65
          }}>{step.desc}</p>
            </motion.div>)}
        </div>
        <style>{`@media (min-width: 900px) { .step-connector { display: block !important; } }`}</style>
      </div>

      {}
      <div style={{
      background: '#F8FAFC',
      padding: '64px 24px'
    }}>
        <div style={{
        maxWidth: 720,
        margin: '0 auto'
      }}>
          <h2 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 28,
          textAlign: 'center',
          marginBottom: 40,
          color: 'var(--ink)'
        }}>
            Questions fréquentes
          </h2>
          <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
            {faqs.map((faq, i) => <motion.div key={i} initial={{
            opacity: 0,
            y: 12
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }} transition={{
            delay: i * 0.06
          }} style={{
            background: 'white',
            borderRadius: 16,
            padding: 20,
            border: '1.5px solid #E2E8F0'
          }}>
                <div style={{
              display: 'flex',
              gap: 12
            }}>
                  <CheckCircle style={{
                width: 18,
                height: 18,
                color: '#2FB4A0',
                flexShrink: 0,
                marginTop: 2
              }} />
                  <div>
                    <p style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: 'var(--ink)',
                  marginBottom: 6
                }}>{faq.q}</p>
                    <p style={{
                  fontSize: 14,
                  color: '#64748B',
                  lineHeight: 1.65
                }}>{faq.r}</p>
                  </div>
                </div>
              </motion.div>)}
          </div>
        </div>
      </div>

      {}
      <div style={{
      padding: '64px 24px',
      textAlign: 'center'
    }}>
        <h2 style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 800,
        fontSize: 28,
        color: 'var(--ink)',
        marginBottom: 12
      }}>
          {user ? 'Prêt à continuer ?' : 'Prêt à commencer ?'}
        </h2>
        <p style={{
        color: '#64748B',
        marginBottom: 28
      }}>
          {user ? 'Publiez une annonce ou explorez le catalogue' : 'Rejoignez des milliers d\'utilisateurs partout au Cameroun'}
        </p>
        <div style={{
        display: 'flex',
        gap: 12,
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
          {user ? <Link to="/publier" className="btn-primary">Publier une annonce <ArrowRight style={{
            width: 16,
            height: 16
          }} /></Link> : <Link to="/auth" className="btn-primary">Créer mon compte <ArrowRight style={{
            width: 16,
            height: 16
          }} /></Link>}
          <Link to="/catalogue" className="btn-outline">Explorer les articles</Link>
        </div>
      </div>
    </div>;
}
