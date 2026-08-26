import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, Shield, KeyRound, CreditCard, ShoppingBag, User, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getSettings } from '../services/settingsService';
const buildCategories = settings => [{
  id: 'compte',
  label: 'Compte & Inscription',
  icon: User,
  color: '#2451C4',
  faqs: [{
    q: 'Combien coûte l\'inscription sur MAKET ?',
    r: 'L\'inscription est entièrement gratuite.'
  }, {
    q: 'Comment fonctionne le code de parrainage ?',
    r: `Chaque utilisateur inscrit possède un code unique. Partagez-le à vos amis : votre filleul bénéficie d'une commission réduite sur ses ${settings.nombreVentesReduitesFilleul} premières ventes, et vous recevez ${settings.pourcentageCommissionParrain ?? 100}% de la commission MAKET sur chacune de ses ${settings.nombreVentesRecompensees ?? 3} premières VRAIES ventes, crédité sur votre solde de parrainage. Dès sa toute première vente, votre plafond d'annonces en vente augmente aussi de +${settings.limiteAnnoncesParFilleulQualifie ?? 2}. Le solde de parrainage est transférable vers votre solde principal (à partir de ${settings.transfertParrainageMinimum?.toLocaleString('fr-FR') ?? '5 000'} XAF) — ensuite retirable comme un solde normal.`
  }, {
    q: 'Puis-je m\'inscrire avec Google ?',
    r: 'Oui ! Vous pouvez vous inscrire et vous connecter directement avec votre compte Google via le bouton "Continuer avec Google" sur la page d\'inscription.'
  }, {
    q: 'Comment vérifier mon identité (CNI) ?',
    r: 'La vérification CNI est obligatoire pour publier des annonces. Rendez-vous dans Mon Compte > Vérification d\'identité et uploadez une photo recto/verso de votre CNI ou passeport. Notre équipe valide sous 24h.'
  }]
}, {
  id: 'annonces',
  label: 'Annonces & Vente',
  icon: ShoppingBag,
  color: '#7C3AED',
  faqs: [{
    q: 'La publication d\'annonce est-elle gratuite ?',
    r: 'Oui, la publication est entièrement gratuite en Version 1 de MAKET. Vous pouvez publier autant d\'annonces que vous souhaitez.'
  }, {
    q: 'La facture est-elle obligatoire ?',
    r: 'Elle est obligatoire pour les articles high-value : téléphones, électronique, électroménager, ordinateurs, motos. Pour les vêtements, chaussures et accessoires, elle est facultative mais recommandée pour inspirer confiance.'
  }, {
    q: 'Pourquoi dois-je filmer une vidéo de l\'article ?',
    r: 'La vidéo est obligatoire pour les articles high-value. Elle doit montrer honnêtement tous les défauts et qualités. C\'est votre protection : si un défaut non mentionné dans la vidéo est constaté à la remise, l\'acheteur peut ouvrir un litige et vous risquez de ne pas être payé.'
  }, {
    q: 'Comment fonctionne le boost d\'annonce ?',
    r: 'Le boost augmente la visibilité de votre annonce. Il existe 3 niveaux : Standard (3% du prix), Premium (6% du prix), Max (10% du prix). Le montant en XAF vous est affiché avant confirmation.'
  }, {
    q: 'Qu\'est-ce qu\'une Flash Annonce ?',
    r: 'Une Flash Annonce est visible 24h en tête de liste avec un badge ⚡. Elle crée un sentiment d\'urgence et attire plus d\'acheteurs. Après 24h, l\'article est automatiquement remis en vente normale.'
  }, {
    q: 'Comment l\'équipe MAKET vérifie-t-elle les factures ?',
    r: 'Notre équipe vérifie que l\'entreprise émettrice de la facture existe réellement. Pour les entreprises sans portail de vérification en ligne, MAKET peut leur proposer un service de portail facturier (offre B2B).'
  }]
}, {
  id: 'paiement',
  label: 'Paiement sécurisé',
  icon: CreditCard,
  color: '#059669',
  faqs: [{
    q: 'Quels modes de paiement sont acceptés ?',
    r: 'MAKET accepte MTN Mobile Money, Orange Money et les cartes bancaires Visa/Mastercard, en ligne uniquement — aucun paiement en espèces n\'est traité par MAKET.'
  }, {
    q: 'Comment fonctionne le paiement sécurisé ?',
    r: 'Dès que l\'acheteur paie (depuis son solde MAKET), l\'argent est bloqué en sécurité par MAKET — le vendeur ne peut pas y toucher tant que la remise n\'est pas confirmée. L\'argent est libéré au vendeur 24h après confirmation de la remise (ou immédiatement s\'il confirme lui-même). CamPay intervient uniquement pour déposer ou retirer de l\'argent sur votre solde MAKET, jamais pour cette protection.'
  }, {
    q: 'Quand le vendeur est-il payé ?',
    r: '24h après confirmation de la remise (via le code à 4 chiffres), si aucun litige n\'a été ouvert, le paiement est automatiquement libéré et le vendeur est payé (moins la commission MAKET).'
  }]
}, {
  id: 'remise',
  label: 'Remise de l\'article',
  icon: KeyRound,
  color: '#D97706',
  faqs: [{
    q: 'Comment récupérer un article acheté ?',
    r: 'Selon le choix du vendeur : soit en main propre (acheteur et vendeur conviennent ensemble d\'un lieu et d\'une heure via le chat sécurisé de la commande), soit par un livreur partenaire (y compris entre deux villes différentes) qui propose son prix, que vous devez accepter et payer avant qu\'il ne se déplace.'
  }, {
    q: 'Comment le paiement est-il libéré au vendeur ?',
    r: 'Au moment de la remise, l\'acheteur communique au vendeur son code de remise à 4 chiffres (visible dans le suivi de sa commande). Le vendeur le saisit dans l\'app pour confirmer — ça déclenche le décompte de 24h avant libération du paiement.'
  }, {
    q: 'Que se passe-t-il si le vendeur ne confirme jamais la commande ?',
    r: 'Si le vendeur ne répond pas dans le délai imparti, la commande est automatiquement annulée et l\'acheteur intégralement remboursé, sans aucun frais.'
  }, {
    q: 'Puis-je annuler après avoir payé ?',
    r: 'Oui, tant que la remise n\'est pas confirmée. L\'annulation est gratuite avant que le vendeur confirme la commande, puis des frais croissants s\'appliquent selon l\'avancement (affichés avant le paiement).'
  }]
}, {
  id: 'litiges',
  label: 'Litiges & Sécurité',
  icon: AlertTriangle,
  color: '#DC2626',
  faqs: [{
    q: 'Comment ouvrir un litige ?',
    r: 'Vous avez 24h après confirmation de la remise pour ouvrir un litige. Allez dans le suivi de votre commande et cliquez "Signaler un problème". Des photos preuves sont obligatoires.'
  }, {
    q: 'Comment MAKET tranche-t-il les litiges ?',
    r: 'Notre équipe examine la vidéo de l\'annonce, les photos de réception, l\'historique du chat et les preuves des deux parties. La décision est rendue sous 48h et est finale et irrévocable.'
  }, {
    q: 'Que faire si le vendeur veut traiter hors MAKET ?',
    r: 'Refusez systématiquement. Tout arrangement hors MAKET vous prive de toute protection. MAKET ne peut être tenu responsable des escroqueries résultant d\'échanges hors plateforme. Signalez le vendeur via le bouton "Signaler".'
  }, {
    q: 'Pourquoi le chat censure-t-il certains messages ?',
    r: 'Pour votre protection, le chat bloque automatiquement les numéros de téléphone, emails et liens externes. Les tentatives répétées sont sanctionnées (avertissement → suspension → bannissement).'
  }, {
    q: 'Comment signaler une annonce suspecte ?',
    r: 'Sur chaque annonce, un bouton "Signaler cette annonce" est disponible. Précisez la raison (article volé, facture fausse, prix abusif...). Notre équipe examine le signalement sous 24h.'
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
  const [settings, setSettings] = useState({
    nombreVentesReduitesFilleul: 10,
    pourcentageCommissionParrain: 100,
    nombreVentesRecompensees: 3,
    transfertParrainageMinimum: 5000,
    limiteAnnoncesParFilleulQualifie: 2
  });
  useEffect(() => {
    getSettings().then(setSettings);
  }, []);
  const categories = buildCategories(settings);
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
            Des réponses à toutes vos questions sur MAKET
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
