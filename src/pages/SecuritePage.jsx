import { motion } from 'framer-motion';
import { Shield, Lock, Eye, AlertTriangle, CheckCircle, XCircle, KeyRound, FileText, MessageCircle, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
const pillars = [{
  icon: CreditCard,
  color: '#2451C4',
  title: 'Paiement sécurisé MAKET',
  desc: 'Votre argent est bloqué en sécurité par MAKET dès le paiement (CamPay ne gère que vos dépôts/retraits, pas cette protection). Il n\'est libéré au vendeur qu\'après confirmation de la remise. Zéro risque de perdre votre argent.',
  points: ['Argent bloqué jusqu\'à remise confirmée', 'Remboursement automatique si litige validé', 'Aucun accès de tiers avant confirmation']
}, {
  icon: FileText,
  color: '#7C3AED',
  title: 'Vérification des factures',
  desc: 'Notre équipe vérifie l\'authenticité de chaque facture pour les articles high-value avant publication. Impossible de vendre un article volé ou non authentifié.',
  points: ['Facture obligatoire pour électronique, motos, électroménager', 'Vérification de l\'entreprise émettrice', 'Publication refusée si facture douteuse']
}, {
  icon: Eye,
  color: '#059669',
  title: 'Vidéo obligatoire',
  desc: 'La vidéo de l\'article montre honnêtement tous les défauts et qualités. Elle fait foi en cas de litige. Si un défaut non mentionné est constaté, le vendeur n\'est pas payé.',
  points: ['Vidéo détaillée obligatoire pour high-value', 'Watermark MAKET sur toutes les photos', 'Preuve irréfutable en cas de désaccord']
}, {
  icon: Shield,
  color: '#D97706',
  title: 'Identité vérifiée',
  desc: 'Tous les vendeurs doivent vérifier leur identité avec leur CNI avant de publier. Chaque utilisateur est identifiable et responsable de ses actions.',
  points: ['CNI obligatoire pour vendre', 'Badge Vendeur Vérifié visible', 'Traçabilité complète des transactions']
}, {
  icon: MessageCircle,
  color: '#DC2626',
  title: 'Chat sécurisé',
  desc: 'Le chat MAKET bloque automatiquement les numéros de téléphone, emails et liens externes. Les tentatives de contournement sont sanctionnées progressivement.',
  points: ['Coordonnées censurées automatiquement', 'Sanctions progressives jusqu\'au bannissement', 'Historique conservé pour les litiges']
}, {
  icon: KeyRound,
  color: '#0891B2',
  title: 'Remise sécurisée par code',
  desc: 'Aucune remise sans le code à 4 chiffres de l\'acheteur — c\'est ce qui déclenche la libération du paiement. En cas de problème constaté, ouvrez un litige : notre équipe examine les preuves et statue sous 48h.',
  points: ['Code de remise à 4 chiffres, jamais visible du vendeur avant l\'échange', 'Libération du paiement seulement après confirmation', 'Litige examiné sous 48h en cas de problème']
}];
const dosDonts = {
  dos: ['Utilisez toujours le chat MAKET pour communiquer', 'Vérifiez la vidéo avant d\'acheter', 'Donnez votre code de remise seulement après avoir vérifié l\'article', 'Signalez immédiatement tout problème dans les 24h', 'Conservez toutes vos preuves (photos, screenshots)'],
  donts: ['Ne payez jamais en dehors de CamPay', 'Ne partagez jamais vos coordonnées dans le chat', 'Ne donnez pas votre code de remise avant d\'avoir vérifié l\'article', 'Ne faites pas confiance aux vendeurs qui proposent de traiter hors MAKET', 'Ne cliquez jamais sur des liens envoyés dans le chat']
};
export default function SecuritePage() {
  return <div style={{
    background: 'white'
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
            Sécurité sur MAKET
          </h1>
          <p style={{
          color: 'rgba(255,255,255,0.75)',
          fontSize: 16,
          maxWidth: 500,
          margin: '0 auto'
        }}>
            MAKET a été conçu dès le départ pour protéger acheteurs et vendeurs à chaque étape de la transaction.
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
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
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
                Tout arrangement conclu en dehors de MAKET est sous votre entière responsabilité. MAKET ne pourra être tenu responsable d'aucune escroquerie ou litige résultant d'un échange hors plateforme. En cas de doute, contactez immédiatement notre support.
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
