import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Building2, CalendarPlus, Video, CreditCard, CheckCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const etapes = [
  {
    num: '01',
    icon: Building2,
    title: 'Trouvez votre établissement',
    desc: "Parcourez l'annuaire des établissements de santé partenaires et découvrez leurs services, disponibles où que vous soyez au Cameroun.",
    color: '#2FB4A0',
  },
  {
    num: '02',
    icon: CalendarPlus,
    title: 'Prenez rendez-vous',
    desc: "Choisissez un service, précisez votre motif, et optez pour une consultation sur place ou à distance en téléconsultation.",
    color: '#7C3AED',
  },
  {
    num: '03',
    icon: Video,
    title: 'Consultez',
    desc: "Rendez-vous sur place à l'heure confirmée par l'accueil, ou rejoignez l'appel vidéo sécurisé avec votre médecin depuis l'app.",
    color: '#059669',
  },
  {
    num: '04',
    icon: CreditCard,
    title: 'Réglez votre facture',
    desc: "Payez directement en ligne par Mobile Money dès que l'établissement vous facture un acte, sans passer par un guichet.",
    color: '#D97706',
  },
];

const faqs = [
  {
    q: 'Comment prendre rendez-vous avec un établissement ?',
    r: "Depuis la fiche d'un établissement, onglet \"Prendre RDV\" : choisissez un service, indiquez votre motif et une date souhaitée. L'accueil de l'établissement confirme ensuite votre demande.",
  },
  {
    q: 'Qu\'est-ce que la téléconsultation ?',
    r: "Une consultation à distance par appel vidéo, sans vous déplacer. Cochez \"Téléconsultation\" en demandant votre RDV — une fois confirmée par l'accueil et un médecin assigné, un bouton \"Rejoindre l'appel\" apparaît à l'heure du rendez-vous.",
  },
  {
    q: 'Comment payer une facture ?',
    r: "Dans l'onglet \"Paiement\" de l'établissement, vos factures en attente s'affichent avec leur montant. Saisissez votre numéro Mobile Money pour régler directement, sans solde ni compte à recharger à l'avance.",
  },
  {
    q: 'Mon dossier médical est-il le même dans tous les établissements ?',
    r: "HostoConnect vise un dossier médical unique et partagé entre tous vos établissements de santé partenaires — cette fonctionnalité arrive prochainement.",
  },
  {
    q: "Comment signaler un problème avec un établissement ?",
    r: "Onglet \"Réclamations\" sur la fiche de l'établissement concerné : décrivez le problème, joignez une photo si besoin, et suivez son traitement.",
  },
  {
    q: 'Mes données personnelles sont-elles protégées ?',
    r: "Oui. Vous pouvez à tout moment consulter et exercer vos droits sur vos données (accès, rectification, suppression, opposition) depuis \"Mes droits\", en bas de page.",
  },
];

export default function CommentCaMarchePage() {
  const { user } = useAuth();

  return (
    <div style={{ background: 'white' }}>
      <div style={{ background: 'linear-gradient(135deg, #174858, #2FB4A0)', padding: '60px 24px', textAlign: 'center' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <span style={{ display: 'inline-block', background: 'rgba(255,255,255,0.15)', color: 'white', fontSize: 12, fontWeight: 700, padding: '4px 14px', borderRadius: 20, marginBottom: 16, letterSpacing: '0.05em' }}>
            SIMPLE & SÉCURISÉ
          </span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(2rem, 4vw, 3rem)', color: 'white', marginBottom: 16 }}>
            Comment ça marche ?
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 16, maxWidth: 480, margin: '0 auto' }}>
            HostoConnect connecte patients et établissements de santé, de la prise de rendez-vous au paiement de vos factures.
          </p>
        </motion.div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 24px' }}>
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', gap: 24 }}>
          {etapes.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              style={{ position: 'relative', background: 'white', borderRadius: 20, padding: 28, border: '1.5px solid #F1F5F9', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}
              whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(26,86,219,0.1)', borderColor: '#BFDBFE' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 48, height: 48, background: step.color + '15', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <step.icon style={{ width: 22, height: 22, color: step.color }} />
                </div>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 32, color: step.color + '30' }}>{step.num}</span>
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--ink)', marginBottom: 8 }}>{step.title}</h3>
              <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.65 }}>{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <div style={{ background: '#F8FAFC', padding: '64px 24px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, textAlign: 'center', marginBottom: 40, color: 'var(--ink)' }}>
            Questions fréquentes
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                style={{ background: 'white', borderRadius: 16, padding: 20, border: '1.5px solid #E2E8F0' }}
              >
                <div style={{ display: 'flex', gap: 12 }}>
                  <CheckCircle style={{ width: 18, height: 18, color: '#2FB4A0', flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', marginBottom: 6 }}>{faq.q}</p>
                    <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.65 }}>{faq.r}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: '64px 24px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, color: 'var(--ink)', marginBottom: 12 }}>
          {user ? 'Prêt à continuer ?' : 'Prêt à commencer ?'}
        </h2>
        <p style={{ color: '#64748B', marginBottom: 28 }}>
          {user ? 'Trouvez un établissement et prenez rendez-vous dès maintenant.' : 'Créez votre compte pour prendre rendez-vous avec un établissement partenaire.'}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {user ? (
            <Link to="/etablissements" className="btn-primary">Trouver un établissement <ArrowRight style={{ width: 16, height: 16 }} /></Link>
          ) : (
            <Link to="/auth" className="btn-primary">Créer mon compte <ArrowRight style={{ width: 16, height: 16 }} /></Link>
          )}
        </div>
      </div>
    </div>
  );
}
