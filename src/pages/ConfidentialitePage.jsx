export default function ConfidentialitePage() {
  const sections = [{
    title: '1. Données collectées',
    content: ['Informations d\'identité : nom, prénom, adresse email, photo de profil, numéro de CNI (utilisé comme identifiant de votre dossier médical partagé).', 'Données administratives : établissements consultés, demandes et historique de rendez-vous.', 'Contenu clinique de votre dossier médical : antécédents, allergies, prescriptions, comptes-rendus — renseigné par le personnel soignant des établissements où vous êtes suivi.', 'Données de communication : messages échangés avec un établissement, réclamations déposées.', 'Données de paiement : solde et historique de transactions (jamais vos coordonnées bancaires complètes, gérées par la passerelle de paiement partenaire).', 'Données techniques de navigation : pages visitées, appareil utilisé.']
  }, {
    title: '2. Utilisation des données',
    content: ['Fournir et améliorer le service (recherche d\'établissement, rendez-vous, dossier partagé, messagerie, paiement).', 'Permettre au personnel soignant autorisé de consulter et compléter votre dossier médical dans l\'établissement où vous êtes pris en charge.', 'Sécuriser les comptes et prévenir la fraude.', 'Transmettre vos messages et réclamations à l\'établissement concerné.', 'Vous notifier de l\'activité liée à votre compte (confirmation de rendez-vous, réponse à une réclamation...).', 'Respecter nos obligations légales, notamment celles relatives aux données de santé.']
  }, {
    title: '3. Partage des données',
    content: ['Hospito ne vend jamais vos données personnelles à des tiers.', 'Le contenu clinique de votre dossier n\'est partagé qu\'avec le personnel soignant autorisé de l\'établissement où vous êtes actuellement suivi — jamais avec un établissement où vous ne consultez pas, ni avec un autre patient.', 'Vos coordonnées de paiement transitent directement par la passerelle de paiement partenaire, jamais stockées en clair par Hospito.', 'En cas d\'obligation légale, certaines données peuvent être communiquées aux autorités compétentes.']
  }, {
    title: '4. Conservation des données',
    content: ['Données de compte : conservées tant que votre compte est actif.', 'Contenu du dossier médical : conservé selon les durées légales applicables à la conservation des dossiers de santé.', 'Messages et réclamations : conservés le temps nécessaire au traitement puis archivés à des fins de preuve.', 'Documents d\'identité : supprimés après vérification réussie ou refus.']
  }, {
    title: '5. Vos droits',
    content: ['Droit d\'accès : consultez vos informations personnelles depuis Mon Compte.', 'Droit de rectification : modifiez vos informations à tout moment.', 'Droit à l\'effacement : demandez la suppression de votre compte, dans la limite des obligations légales de conservation des données de santé.', 'Droit à la portabilité : demandez le transfert de votre dossier vers un autre établissement ou médecin traitant.', 'Droit d\'opposition : refusez certains traitements non essentiels.', 'Pour exercer ces droits : contactez-nous via la page Contact.']
  }, {
    title: '6. Sécurité des données',
    content: ['Toutes les communications sont chiffrées en transit (HTTPS/TLS).', 'Le contenu clinique n\'est accessible qu\'au personnel soignant autorisé de l\'établissement de prise en charge — jamais au personnel administratif ni à un autre établissement.', 'Toute consultation ou modification d\'une donnée sensible est journalisée dans un registre d\'audit immuable.', 'Chaque établissement partenaire est cloisonné des autres : aucun ne peut voir les données d\'un patient qu\'il ne prend pas en charge.']
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
            🔒 Hospito protège le secret médical. Nous ne vendons jamais vos données personnelles.
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
