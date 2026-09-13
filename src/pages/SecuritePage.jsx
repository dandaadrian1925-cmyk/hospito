import { motion } from 'framer-motion';
import { Shield, Lock, Eye, AlertTriangle, CheckCircle, XCircle, KeyRound, FileText, MessageCircle, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
const pillars = [{
  icon: Shield,
  color: '#2FB4A0',
  title: 'Secret médical protégé',
  desc: 'Votre dossier médical n\'est visible que par le personnel soignant autorisé de l\'établissement où vous êtes actuellement suivi — jamais par un autre patient, ni par un établissement où vous ne consultez pas.',
  points: ['Accès réservé au personnel soignant (médecin, infirmier)', 'Aucune lecture par le personnel administratif', 'Contenu clinique jamais modifiable a posteriori']
}, {
  icon: Lock,
  color: '#7C3AED',
  title: 'Accès cloisonné par établissement',
  desc: 'Chaque établissement ne voit que ses propres patients et son propre personnel. Si vous êtes suivi dans plusieurs établissements, aucun d\'eux ne peut savoir où vous consultez ailleurs.',
  points: ['Données administratives propres à chaque établissement', 'Établissements mutuellement invisibles entre eux', 'Rôles et permissions vérifiés à chaque accès']
}, {
  icon: FileText,
  color: '#059669',
  title: 'Traçabilité complète',
  desc: 'Toute consultation ou modification d\'une donnée sensible (dossier, prescription) est journalisée dans un registre d\'audit immuable — jamais modifiable, même par un administrateur.',
  points: ['Journal d\'audit horodaté', 'Aucune suppression ni modification a posteriori', 'Traçabilité opposable en cas de litige']
}, {
  icon: Eye,
  color: '#D97706',
  title: 'Authentification sécurisée',
  desc: 'Connexion par email/mot de passe ou compte Google. Une seule session active par compte à la fois — toute nouvelle connexion ferme automatiquement les précédentes.',
  points: ['Une session active à la fois', 'Réinitialisation de mot de passe sécurisée', 'Déconnexion à distance en cas de doute']
}, {
  icon: MessageCircle,
  color: '#DC2626',
  title: 'Messagerie et réclamations suivies',
  desc: 'Vos échanges avec un établissement et vos réclamations restent privés, adressés uniquement à cet établissement, et conservent un historique consultable.',
  points: ['Conversations privées par établissement', 'Réclamations horodatées et suivies', 'Aucun accès par un autre patient']
}, {
  icon: CreditCard,
  color: '#0891B2',
  title: 'Paiement via passerelle certifiée',
  desc: 'Vos coordonnées Mobile Money ne transitent jamais en clair par HostoConnect — elles sont gérées directement par la passerelle de paiement partenaire (CamPay).',
  points: ['Aucune donnée bancaire stockée par HostoConnect', 'Historique de transactions consultable à tout moment', 'Paiement en ligne uniquement, aucune espèce traitée']
}];
const dosDonts = {
  dos: ['Vérifiez que vous êtes bien connecté à votre propre compte avant de consulter des informations médicales', 'Renseignez un numéro de CNI exact — il permet de retrouver votre dossier dans tout établissement partenaire', 'Signalez tout accès ou comportement suspect via une réclamation', 'Déconnectez-vous après usage sur un appareil partagé', 'Gardez vos identifiants de connexion strictement confidentiels'],
  donts: ['Ne partagez jamais votre mot de passe, même avec un proche', 'Ne communiquez pas d\'informations médicales sensibles en dehors de la messagerie de l\'établissement', 'N\'utilisez pas le compte d\'un proche pour consulter son dossier à sa place', 'Ne laissez pas votre session ouverte sur un ordinateur public', 'Ne cliquez jamais sur un lien suspect reçu par message']
};
export default function SecuritePage() {
  return <div style={{
    background: 'white'
  }}>
      {}
      <div style={{
      background: 'linear-gradient(135deg, #174858, #2FB4A0)',
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
            <Lock style={{
            width: 14,
            height: 14,
            color: 'white'
          }} />
            <span style={{
            fontSize: 12,
            fontWeight: 700,
            color: 'white',
            letterSpacing: '0.05em'
          }}>VOTRE PROTECTION EST NOTRE PRIORITÉ</span>
          </div>
          <h1 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 'clamp(1.8rem, 3vw, 2.8rem)',
          color: 'white',
          marginBottom: 12
        }}>
            Sécurité sur HostoConnect
          </h1>
          <p style={{
          color: 'rgba(255,255,255,0.75)',
          fontSize: 16,
          maxWidth: 500,
          margin: '0 auto'
        }}>
            HostoConnect a été conçu dès le départ pour protéger le secret médical et les données personnelles de chaque patient.
          </p>
        </motion.div>
      </div>

      {}
      <div style={{
      maxWidth: 1100,
      margin: '0 auto',
      padding: '64px 24px'
    }}>
        <h2 style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 800,
        fontSize: 28,
        textAlign: 'center',
        marginBottom: 8,
        color: 'var(--ink)'
      }}>
          Nos 6 piliers de sécurité
        </h2>
        <p style={{
        textAlign: 'center',
        color: '#64748B',
        fontSize: 15,
        marginBottom: 48
      }}>
          Chaque fonctionnalité a été pensée pour éliminer les risques d'arnaque
        </p>
        <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))',
        gap: 20
      }}>
          {pillars.map((p, i) => <motion.div key={i} initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} transition={{
          delay: i * 0.08
        }} style={{
          background: 'white',
          borderRadius: 20,
          padding: 24,
          border: '1.5px solid #F1F5F9',
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)'
        }}>
              <div style={{
            display: 'flex',
            gap: 14,
            marginBottom: 16,
            alignItems: 'flex-start'
          }}>
                <div style={{
              width: 44,
              height: 44,
              background: p.color + '15',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
                  <p.icon style={{
                width: 20,
                height: 20,
                color: p.color
              }} />
                </div>
                <h3 style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 17,
              color: 'var(--ink)',
              marginTop: 4
            }}>{p.title}</h3>
              </div>
              <p style={{
            fontSize: 13,
            color: '#64748B',
            lineHeight: 1.65,
            marginBottom: 14
          }}>{p.desc}</p>
              <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}>
                {p.points.map((pt, j) => <div key={j} style={{
              display: 'flex',
              gap: 8,
              alignItems: 'flex-start'
            }}>
                    <CheckCircle style={{
                width: 14,
                height: 14,
                color: p.color,
                flexShrink: 0,
                marginTop: 2
              }} />
                    <span style={{
                fontSize: 12,
                color: '#374151',
                lineHeight: 1.5
              }}>{pt}</span>
                  </div>)}
              </div>
            </motion.div>)}
        </div>
      </div>

      {}
      <div style={{
      background: '#F8FAFC',
      padding: '64px 24px'
    }}>
        <div style={{
        maxWidth: 900,
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
            Bonnes pratiques
          </h2>
          <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))',
          gap: 20
        }}>
            {}
            <div style={{
            background: '#F0FDF4',
            borderRadius: 20,
            padding: 24,
            border: '1.5px solid #BBF7D0'
          }}>
              <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 18
            }}>
                <CheckCircle style={{
                width: 20,
                height: 20,
                color: '#10B981'
              }} />
                <h3 style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 16,
                color: '#065F46'
              }}>À FAIRE ✅</h3>
              </div>
              <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10
            }}>
                {dosDonts.dos.map((d, i) => <div key={i} style={{
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start'
              }}>
                    <div style={{
                  width: 6,
                  height: 6,
                  background: '#10B981',
                  borderRadius: '50%',
                  flexShrink: 0,
                  marginTop: 6
                }} />
                    <span style={{
                  fontSize: 13,
                  color: '#064E3B',
                  lineHeight: 1.5
                }}>{d}</span>
                  </div>)}
              </div>
            </div>

            {}
            <div style={{
            background: '#FEF2F2',
            borderRadius: 20,
            padding: 24,
            border: '1.5px solid #FECACA'
          }}>
              <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 18
            }}>
                <XCircle style={{
                width: 20,
                height: 20,
                color: '#EF4444'
              }} />
                <h3 style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 16,
                color: '#7F1D1D'
              }}>À ÉVITER ❌</h3>
              </div>
              <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10
            }}>
                {dosDonts.donts.map((d, i) => <div key={i} style={{
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start'
              }}>
                    <div style={{
                  width: 6,
                  height: 6,
                  background: '#EF4444',
                  borderRadius: '50%',
                  flexShrink: 0,
                  marginTop: 6
                }} />
                    <span style={{
                  fontSize: 13,
                  color: '#7F1D1D',
                  lineHeight: 1.5
                }}>{d}</span>
                  </div>)}
              </div>
            </div>
          </div>

          {}
          <div style={{
          marginTop: 24,
          background: '#FEF3C7',
          borderRadius: 16,
          padding: 20,
          border: '1.5px solid #FDE68A',
          display: 'flex',
          gap: 12
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
              marginBottom: 4
            }}>Avertissement important</p>
              <p style={{
              fontSize: 13,
              color: '#78350F',
              lineHeight: 1.65
            }}>
                HostoConnect met en relation patients et établissements de santé partenaires ; chaque établissement reste seul responsable des soins prodigués. En cas d'urgence vitale, contactez directement les services d'urgence de votre établissement ou le numéro d'urgence national — ne passez pas par l'application.
              </p>
            </div>
          </div>
        </div>
      </div>

      {}
      <div style={{
      maxWidth: 600,
      margin: '0 auto',
      padding: '64px 24px',
      textAlign: 'center'
    }}>
        <h2 style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 800,
        fontSize: 24,
        color: 'var(--ink)',
        marginBottom: 12
      }}>
          Un problème de sécurité à signaler ?
        </h2>
        <p style={{
        color: '#64748B',
        fontSize: 15,
        marginBottom: 24
      }}>
          Notre équipe de sécurité traite toutes les signalements en priorité
        </p>
        <Link to="/contact" className="btn-primary">Contacter le support sécurité</Link>
      </div>
    </div>;
}
