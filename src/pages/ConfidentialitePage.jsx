export default function ConfidentialitePage() {
  const sections = [{
    title: '1. Données collectées',
    content: ['Informations d\'identité : nom, prénom, adresse email, photo de profil.', 'Documents de vérification : CNI ou passeport (stockés de manière sécurisée et chiffrée).', 'Données de transaction : historique des achats, ventes, montants, dates.', 'Données de navigation : pages visitées, temps passé, interactions avec la plateforme.', 'Données de communication : messages du chat (conservés pour la sécurité et les litiges).']
  }, {
    title: '2. Utilisation des données',
    content: ['Fournir, améliorer et personnaliser nos services.', 'Sécuriser les transactions et prévenir la fraude.', 'Vérifier l\'identité des utilisateurs (CNI).', 'Arbitrer les litiges entre acheteurs et vendeurs.', 'Envoyer des notifications liées à votre activité sur MAKET.', 'Respecter nos obligations légales et réglementaires.']
  }, {
    title: '3. Partage des données',
    content: ['MAKET ne vend jamais vos données personnelles à des tiers.', 'Vos coordonnées (numéro de téléphone, adresse exacte) ne sont jamais affichées publiquement.', 'Certaines données peuvent être partagées avec CamPay pour le traitement des paiements.', 'La remise de l\'article se fait en main propre entre acheteur et vendeur, qui échangent eux-mêmes les informations nécessaires via le chat de la commande.', 'En cas d\'obligation légale, certaines données peuvent être communiquées aux autorités compétentes.']
  }, {
    title: '4. Conservation des données',
    content: ['Données de compte : conservées tant que votre compte est actif.', 'Historique des transactions : conservé 5 ans pour les obligations légales.', 'Messages du chat : conservés 12 mois après la fin de la conversation.', 'Documents CNI : supprimés après vérification réussie ou refus.', 'Données de navigation : conservées 13 mois maximum.']
  }, {
    title: '5. Vos droits',
    content: ['Droit d\'accès : consultez toutes vos données depuis Mon Compte.', 'Droit de rectification : modifiez vos informations à tout moment.', 'Droit à l\'effacement : demandez la suppression de votre compte et données.', 'Droit à la portabilité : exportez vos données dans un format standard.', 'Droit d\'opposition : refusez certains traitements non essentiels.', 'Pour exercer ces droits : contactez-nous via la page Contact.']
  }, {
    title: '6. Sécurité des données',
    content: ['Toutes les communications sont chiffrées via SSL/TLS.', 'Les données sensibles (CNI) sont chiffrées au repos.', 'Accès aux données restreint au personnel autorisé de MAKET.', 'Sauvegardes automatiques quotidiennes sur des serveurs sécurisés.', 'Audits de sécurité réguliers.']
  }];
  return <div style={{
    maxWidth: 800,
    margin: '0 auto',
    padding: '48px 24px'
  }}>
      <div style={{
      marginBottom: 40
    }}>
        <h1 style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 800,
        fontSize: 32,
        color: 'var(--ink)',
        marginBottom: 8
      }}>
          Politique de Confidentialité
        </h1>
        <p style={{
        color: '#94A3B8',
        fontSize: 14
      }}>Dernière mise à jour : Juin 2025</p>
        <div style={{
        marginTop: 16,
        background: '#EFF6FF',
        borderRadius: 12,
        padding: '12px 16px',
        border: '1.5px solid #BFDBFE'
      }}>
          <p style={{
          fontSize: 14,
          color: '#2451C4',
          fontWeight: 600
        }}>
            🔒 MAKET respecte votre vie privée. Nous ne vendons jamais vos données personnelles.
          </p>
        </div>
      </div>

      {sections.map((section, i) => <div key={i} style={{
      marginBottom: 32,
      paddingBottom: 32,
      borderBottom: i < sections.length - 1 ? '1px solid #F1F5F9' : 'none'
    }}>
          <h2 style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: 18,
        color: 'var(--ink)',
        marginBottom: 14
      }}>
            {section.title}
          </h2>
          <ul style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        listStyle: 'none',
        padding: 0
      }}>
            {section.content.map((item, j) => <li key={j} style={{
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start'
        }}>
                <div style={{
            width: 6,
            height: 6,
            background: '#2451C4',
            borderRadius: '50%',
            flexShrink: 0,
            marginTop: 7
          }} />
                <span style={{
            fontSize: 14,
            color: '#374151',
            lineHeight: 1.7
          }}>{item}</span>
              </li>)}
          </ul>
        </div>)}

      <div style={{
      background: '#F8FAFC',
      borderRadius: 16,
      padding: 20,
      textAlign: 'center'
    }}>
        <p style={{
        fontSize: 14,
        color: '#64748B'
      }}>
          Des questions sur vos données ?{' '}
          <a href="/contact" style={{
          color: '#2451C4',
          fontWeight: 700,
          textDecoration: 'none'
        }}>
            Contactez notre équipe
          </a>
        </p>
      </div>
    </div>;
}
