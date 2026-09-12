export default function CookiesPage() {
  return <div style={{
    maxWidth: 800,
    margin: '0 auto',
    padding: '48px 24px'
  }}>
      <h1 style={{
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 32,
      color: 'var(--ink)',
      marginBottom: 8
    }}>Politique de Cookies</h1>
      <p style={{
      color: '#94A3B8',
      fontSize: 14,
      marginBottom: 40
    }}>Dernière mise à jour : Juin 2025</p>
      {[{
      title: '1. Qu\'est-ce qu\'un cookie ?',
      content: 'Un cookie est un petit fichier texte déposé sur votre navigateur lorsque vous visitez HostoConnect. Il nous permet de mémoriser vos préférences et d\'améliorer votre expérience.'
    }, {
      title: '2. Cookies essentiels',
      content: 'Ces cookies (ou technologies équivalentes de stockage local du navigateur) sont indispensables au fonctionnement d\'HostoConnect. Ils gèrent votre session de connexion et assurent la sécurité de votre compte. Ils ne peuvent pas être désactivés.'
    }, {
      // #corrigé (demande utilisateur, "nettoyer le texte pour qu'il reflète
      // fidèlement ce qui est réellement fait") : l'ancienne section "Cookies
      // de performance" (analyse anonymisée de navigation) décrivait un
      // dispositif de suivi jamais implémenté dans HostoConnect — texte
      // hérité du fork MAKET, jamais mis à jour. HostoConnect ne dépose
      // aucun cookie de mesure d'audience ni publicitaire.
      title: '3. Cookies Firebase',
      content: 'HostoConnect utilise Firebase (Google) pour l\'authentification et la base de données. Firebase gère vos sessions utilisateurs de manière sécurisée, via des mécanismes de stockage local du navigateur — jamais à des fins publicitaires ou de suivi.'
    }, {
      title: '4. Gérer vos cookies',
      content: 'Vous pouvez configurer votre navigateur pour refuser les cookies. Attention : certaines fonctionnalités d\'HostoConnect pourraient ne plus fonctionner correctement. Pour les instructions, consultez l\'aide de votre navigateur (Chrome, Firefox, Safari...).'
    }, {
      title: '5. Contact',
      content: 'Pour toute question sur notre politique de cookies, contactez-nous via la page Contact d\'HostoConnect.'
    }].map((s, i) => <div key={i} style={{
      marginBottom: 28,
      paddingBottom: 28,
      borderBottom: i < 4 ? '1px solid #F1F5F9' : 'none'
    }}>
          <h2 style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: 18,
        color: 'var(--ink)',
        marginBottom: 10
      }}>{s.title}</h2>
          <p style={{
        fontSize: 14,
        color: '#374151',
        lineHeight: 1.75
      }}>{s.content}</p>
        </div>)}
    </div>;
}
