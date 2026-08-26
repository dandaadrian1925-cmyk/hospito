import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Gift, Copy, Check, ArrowRight, Users, Star, Zap } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { generateReferralCode, buildInvitationWhatsApp } from '../services/authService';
import { listenWallet } from '../services/walletService';
import { getSettings } from '../services/settingsService';
import { getFilleuls } from '../services/profilPublicService';
import { campagneActive } from '../components/common/CompteARebours';
import toast from 'react-hot-toast';
export default function ParrainagePage() {
  const {
    user,
    userProfile,
    setUserProfile
  } = useAuth();
  const [copied, setCopied] = useState(false);
  const backfilling = useRef(false);
  const [settings, setSettings] = useState({});
  const [wallet, setWallet] = useState({
    soldeParrainage: 0
  });
  const [filleuls, setFilleuls] = useState(null);
  useEffect(() => {
    getSettings().then(setSettings);
  }, []);
  useEffect(() => {
    if (!user) return;
    const unsub = listenWallet(user.uid, setWallet);
    return unsub;
  }, [user]);
  useEffect(() => {
    if (!user) return;
    getFilleuls(user.uid).then(setFilleuls);
  }, [user]);
  useEffect(() => {
    if (!user || !userProfile || userProfile.referralCode || backfilling.current) return;
    backfilling.current = true;
    const code = generateReferralCode();
    updateDoc(doc(db, 'users', user.uid), {
      referralCode: code
    }).then(() => setUserProfile(p => ({
      ...p,
      referralCode: code
    }))).catch(e => console.error('Backfill referralCode a échoué :', e)).finally(() => {
      backfilling.current = false;
    });
  }, [user, userProfile]);
  const copy = async () => {
    if (!userProfile?.referralCode) {
      toast.error('Code non disponible pour le moment, réessayez dans un instant');
      return;
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(userProfile.referralCode);
      } else {
        const el = document.createElement('textarea');
        el.value = userProfile.referralCode;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopied(true);
      toast.success('Code copié !');
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Copie du code échouée :', e);
      toast.error('Impossible de copier automatiquement — sélectionnez le code manuellement');
    }
  };
  const shareWhatsApp = () => {
    if (!userProfile?.referralCode) {
      toast.error('Code non disponible pour le moment, réessayez dans un instant');
      return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(buildInvitationWhatsApp(userProfile.referralCode))}`, '_blank');
  };
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
          fontSize: 48,
          marginBottom: 12
        }}>🎁</div>
          <h1 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 'clamp(1.8rem, 3vw, 2.8rem)',
          color: 'white',
          marginBottom: 12
        }}>
            Programme de parrainage
          </h1>
          <p style={{
          color: 'rgba(255,255,255,0.75)',
          fontSize: 16,
          maxWidth: 460,
          margin: '0 auto'
        }}>
            Parrainez vos amis : commission réduite pour eux, part de la commission MAKET sur leurs premières ventes pour vous
          </p>
        </motion.div>
      </div>

      <div style={{
      maxWidth: 900,
      margin: '0 auto',
      padding: '48px 24px'
    }}>
        {}
        <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 16,
        marginBottom: 48
      }}>
          {[{
          icon: Users,
          value: `${settings.nombreVentesReduitesFilleul || 0} ventes`,
          label: 'à commission réduite pour votre filleul',
          color: '#2451C4'
        }, {
          icon: Gift,
          value: `${settings.pourcentageCommissionParrain ?? 100}%`,
          label: `de la commission MAKET sur ses ${settings.nombreVentesRecompensees ?? 3} premières ventes réelles`,
          color: '#7C3AED'
        }, {
          icon: Star,
          value: `+${settings.limiteAnnoncesParFilleulQualifie ?? 2} annonces`,
          label: 'sur votre plafond de vente, par filleul qualifié',
          color: '#D97706'
        }].map((s, i) => <motion.div key={i} initial={{
          opacity: 0,
          y: 16
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: i * 0.1
        }} style={{
          background: '#F8FAFC',
          borderRadius: 16,
          padding: '20px 16px',
          textAlign: 'center',
          border: '1.5px solid #F1F5F9'
        }}>
              <div style={{
            width: 40,
            height: 40,
            background: s.color + '15',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 10px'
          }}>
                <s.icon style={{
              width: 18,
              height: 18,
              color: s.color
            }} />
              </div>
              <p style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 22,
            color: s.color
          }}>{s.value}</p>
              <p style={{
            fontSize: 12,
            color: '#64748B',
            marginTop: 4,
            lineHeight: 1.4
          }}>{s.label}</p>
            </motion.div>)}
        </div>

        {}
        {user ? <div style={{
        marginBottom: 48
      }}>
            <h2 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 22,
          color: 'var(--ink)',
          marginBottom: 20
        }}>
              Mon code de parrainage
            </h2>
            <div style={{
          background: 'linear-gradient(135deg, #17337D, #2451C4)',
          borderRadius: 20,
          padding: '28px 24px'
        }}>
              <p style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: 13,
            marginBottom: 12,
            textAlign: 'center'
          }}>Partagez ce code à vos amis</p>
              <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 14,
            padding: '14px 20px',
            maxWidth: 320,
            margin: '0 auto 20px'
          }}>
                <span style={{
              flex: 1,
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 28,
              color: 'white',
              textAlign: 'center',
              letterSpacing: '4px'
            }}>
                  {userProfile?.referralCode || '------'}
                </span>
                <button onClick={copy} style={{
              width: 36,
              height: 36,
              background: 'white',
              borderRadius: 10,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 0.2s'
            }}>
                  {copied ? <Check style={{
                width: 16,
                height: 16,
                color: '#10B981'
              }} /> : <Copy style={{
                width: 16,
                height: 16,
                color: '#2451C4'
              }} />}
                </button>
              </div>

              <div style={{
            display: 'flex',
            gap: 10,
            justifyContent: 'center'
          }}>
                <button onClick={copy} style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1.5px solid rgba(255,255,255,0.3)',
              padding: '10px 20px',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'var(--font)'
            }}>
                  <Copy style={{
                width: 14,
                height: 14
              }} /> Copier le code
                </button>
                <button onClick={shareWhatsApp} style={{
              background: '#25D366',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'var(--font)'
            }}>
                  📲 Partager sur WhatsApp
                </button>
              </div>
            </div>

            {}
            <div style={{
          background: '#F8FAFC',
          borderRadius: 16,
          padding: 20,
          marginTop: 16,
          border: '1.5px solid #F1F5F9'
        }}>
              <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
                <p style={{
              fontWeight: 700,
              fontSize: 14,
              color: 'var(--ink)'
            }}>Mon solde de parrainage</p>
                <p style={{
              fontWeight: 800,
              fontSize: 20,
              color: '#7C3AED'
            }}>{(wallet.soldeParrainage || 0).toLocaleString('fr-FR')} XAF</p>
              </div>
              <p style={{
            fontSize: 12,
            color: '#94A3B8',
            marginTop: 8
          }}>
                Plafond d'annonces en vente actuel : {(userProfile?.limiteAnnoncesVente ?? settings.limiteAnnoncesVenteBase ?? 10).toLocaleString('fr-FR')}. Transférable vers votre solde principal depuis votre Wallet.
              </p>
            </div>

            {}
            {campagneActive(settings) && <div style={{
          background: 'linear-gradient(135deg, var(--blue), var(--blue-dark))',
          borderRadius: 16,
          padding: 20,
          marginTop: 16,
          color: '#fff'
        }}>
              <p style={{ fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.85, marginBottom: 4 }}>🚀 Course au lancement</p>
              {userProfile?.lancementRang ? <p style={{ fontSize: 20, fontWeight: 900, fontFamily: 'var(--font-display)' }}>
                  Vous êtes {userProfile.lancementRang}{userProfile.lancementRang === 1 ? 'er' : 'e'} du classement !
                </p> : <p style={{ fontSize: 14, fontWeight: 600 }}>
                  Entrez dans le top {settings.lancementNombreParrains ?? 50} pour voir votre rang et gagner {(settings.lancementBonusMontant ?? 0).toLocaleString('fr-FR')} XAF + {settings.lancementVendeurProMois ?? 0} mois de Vendeur Pro offerts.
                </p>}
            </div>}

            {}
            <div style={{
          background: '#F8FAFC',
          borderRadius: 16,
          padding: 20,
          marginTop: 16,
          border: '1.5px solid #F1F5F9'
        }}>
              <p style={{
            fontWeight: 700,
            fontSize: 14,
            color: 'var(--ink)',
            marginBottom: 14
          }}>
                Mes filleuls {filleuls ? `(${filleuls.length})` : ''}
              </p>
              {filleuls === null ? <p style={{
            fontSize: 13,
            color: '#94A3B8'
          }}>Chargement…</p> : filleuls.length === 0 ? <p style={{
            fontSize: 13,
            color: '#94A3B8'
          }}>
                  Personne n'a encore utilisé votre code. Partagez-le pour commencer à gagner !
                </p> : <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}>
                  {filleuls.map(f => {
              const nbVentesRecompensees = settings.nombreVentesRecompensees ?? 3;
              const progres = Math.min(f.totalVentes || 0, nbVentesRecompensees);
              return <div key={f.uid} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                background: 'white',
                borderRadius: 12,
                border: '1px solid #F1F5F9'
              }}>
                        {f.photoURL ? <img src={f.photoURL} alt="" style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  flexShrink: 0
                }} /> : <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: '#E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontWeight: 700,
                  fontSize: 13,
                  color: '#64748B'
                }}>{(f.pseudo || '?')[0].toUpperCase()}</div>}
                        <div style={{
                  flex: 1,
                  minWidth: 0
                }}>
                          <p style={{
                    fontWeight: 700,
                    fontSize: 13.5,
                    color: 'var(--ink)'
                  }}>{f.pseudo}{f.ville ? ` · ${f.ville}` : ''}</p>
                          <p style={{
                    fontSize: 12,
                    color: '#94A3B8',
                    marginTop: 2
                  }}>
                            {progres >= nbVentesRecompensees ? 'Bonus complet — plafond acquis' : `${progres}/${nbVentesRecompensees} vente(s) qualifiante(s)`}
                          </p>
                        </div>
                      </div>;
            })}
                </div>}
            </div>
          </div> : <div style={{
        textAlign: 'center',
        background: '#EFF6FF',
        borderRadius: 20,
        padding: '32px 24px',
        marginBottom: 48,
        border: '1.5px solid #BFDBFE'
      }}>
            <Gift style={{
          width: 40,
          height: 40,
          color: '#2451C4',
          margin: '0 auto 12px'
        }} />
            <h3 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 20,
          color: 'var(--ink)',
          marginBottom: 8
        }}>
              Connectez-vous pour voir votre code
            </h3>
            <p style={{
          color: '#64748B',
          fontSize: 14,
          marginBottom: 20
        }}>Chaque compte MAKET dispose d'un code de parrainage unique</p>
            <Link to="/auth" className="btn-primary" style={{
          display: 'inline-flex'
        }}>
              Se connecter <ArrowRight style={{
            width: 16,
            height: 16
          }} />
            </Link>
          </div>}

        {}
        <h2 style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: 22,
        color: 'var(--ink)',
        marginBottom: 20
      }}>
          Comment ça marche ?
        </h2>
        <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }}>
          {[{
          num: '1',
          title: 'Partagez votre code unique',
          desc: 'Copiez votre code ou partagez directement sur WhatsApp avec vos amis, famille, collègues.'
        }, {
          num: '2',
          title: 'Votre filleul s\'inscrit',
          desc: 'Il utilise votre code lors de son inscription (gratuite) — il profite ensuite d\'une commission réduite sur ses premières ventes.'
        }, {
          num: '3',
          title: 'Il réalise une vraie vente',
          desc: `Dès sa 1ʳᵉ vente réelle, votre plafond d'annonces en vente augmente de +${settings.limiteAnnoncesParFilleulQualifie ?? 2} — un bonus unique par filleul.`
        }, {
          num: '4',
          title: `Vous recevez ${settings.pourcentageCommissionParrain ?? 100}% de la commission MAKET`,
          desc: `Sur chacune de ses ${settings.nombreVentesRecompensees ?? 3} premières ventes réelles — créditée sur votre solde de parrainage, transférable vers votre solde principal (donc retirable).`
        }].map((step, i) => <motion.div key={i} initial={{
          opacity: 0,
          x: -16
        }} whileInView={{
          opacity: 1,
          x: 0
        }} viewport={{
          once: true
        }} transition={{
          delay: i * 0.07
        }} style={{
          display: 'flex',
          gap: 16,
          padding: '16px 20px',
          background: '#F8FAFC',
          borderRadius: 14,
          border: '1.5px solid #F1F5F9',
          alignItems: 'flex-start'
        }}>
              <div style={{
            width: 32,
            height: 32,
            background: 'linear-gradient(135deg, #2451C4, #17337D)',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
                <span style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 14,
              color: 'white'
            }}>{step.num}</span>
              </div>
              <div>
                <p style={{
              fontWeight: 700,
              fontSize: 14,
              color: 'var(--ink)',
              marginBottom: 4
            }}>{step.title}</p>
                <p style={{
              fontSize: 13,
              color: '#64748B',
              lineHeight: 1.55
            }}>{step.desc}</p>
              </div>
            </motion.div>)}
        </div>

        {}
        <div style={{
        marginTop: 24,
        background: '#FEF3C7',
        borderRadius: 14,
        padding: 16,
        border: '1.5px solid #FDE68A'
      }}>
          <p style={{
          fontSize: 13,
          color: '#92400E',
          lineHeight: 1.6
        }}>
            <strong>📌 Important :</strong> Votre solde de parrainage n'augmente que lorsqu'un filleul publie réellement au moins 3 annonces en vente — jamais à la simple inscription. Il n'est jamais retirable ni convertible en espèces : c'est un avantage utilisable uniquement pour acheter sur MAKET.
          </p>
        </div>
      </div>
    </div>;
}
