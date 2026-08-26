import { useState, useEffect } from 'react';
import { getSettings } from '../services/settingsService';
const buildSections = settings => [{
  title: '1. Objet',
  content: 'MAKET est une plateforme de mise en relation entre particuliers pour la vente et l\'achat d\'articles d\'occasion au Cameroun. MAKET n\'est ni vendeur ni acheteur et n\'intervient pas dans les transactions autrement qu\'en qualité de tiers de confiance pour la sécurisation des paiements.'
}, {
  title: '2. Inscription',
  content: 'L\'inscription est entièrement gratuite. Elle nécessite une adresse email valide et l\'acceptation des présentes CGU. L\'utilisateur s\'engage à fournir des informations exactes et à les maintenir à jour. Un utilisateur peut supprimer son compte à tout moment depuis son espace personnel, à condition de ne conserver aucun solde (principal ou de parrainage) et aucun achat ou vente en cours. La suppression anonymise le profil et retire les annonces actives ; elle est définitive et ne peut être annulée.'
}, {
  title: '3. Publication d\'annonces',
  content: 'La publication d\'annonces est gratuite (V1), y compris pour les annonces regroupant plusieurs articles vendus ensemble pour un prix unique ("lot"). Les vendeurs s\'engagent à présenter leurs articles honnêtement, notamment via une vidéo montrant tous les défauts et qualités. Les factures doivent être authentiques. Toute fraude entraîne la suspension définitive du compte.'
}, {
  title: '4. Paiements',
  content: `Les dépôts et retraits sur le solde MAKET se font en ligne uniquement via CamPay (MTN Mobile Money, Orange Money, carte bancaire — aucun paiement en espèces). Un achat est toujours payé depuis ce solde MAKET, jamais directement par CamPay au moment de l'achat : l'argent est bloqué en sécurité par MAKET jusqu'à confirmation de la remise (code de remise, cf. article 7). En cas de livraison, les frais de livraison sont payés séparément, uniquement une fois acceptés par l'acheteur (cf. article 7). MAKET prélève une commission sur chaque vente réalisée via la plateforme (par défaut ${Math.round(settings.commissionVenteDefaut * 1000) / 10}% du prix, pouvant varier selon la catégorie de l'article) ainsi que sur les frais de livraison le cas échéant, déduite au moment où le paiement est libéré au vendeur/livreur.`
}, {
  title: '5. Annulation d\'une commande',
  content: 'Tant que le livreur n\'est pas parti chercher l\'article (ou, en main propre, tant que la remise n\'est pas confirmée), l\'acheteur ou le vendeur peut annuler la commande à tout moment, gratuitement — remboursement intégral systématique sur le solde principal, jamais de frais retenus. Une fois cette étape passée, l\'annulation n\'est plus possible : seul un litige peut trancher. Annuler une commande, même gratuitement, est comptabilisé sur le profil de la partie qui annule et pèse sur son score de fiabilité, visible des autres utilisateurs — un compte qui annule fréquemment peut en outre voir ses futurs achats temporairement restreints. Si le vendeur ne confirme jamais la commande dans le délai imparti, l\'acheteur est remboursé intégralement et automatiquement.'
}, {
  title: '6. Parrainage',
  content: `Chaque utilisateur dispose d'un code de parrainage unique. Un filleul utilisant ce code bénéficie d'une commission de vente réduite sur ses ${settings.nombreVentesReduitesFilleul} premières ventes. Le parrain reçoit ${settings.pourcentageCommissionParrain ?? 100}% de la commission MAKET sur chacune des ${settings.nombreVentesRecompensees ?? 3} premières VRAIES ventes (payées et créditées) de son filleul, crédité sur son solde de parrainage ; à la toute première vente réelle d'un filleul, le plafond d'annonces en vente du parrain augmente en plus, une seule fois, de ${settings.limiteAnnoncesParFilleulQualifie ?? 2}. Le solde de parrainage est transférable vers le solde principal (à partir de ${settings.transfertParrainageMinimum?.toLocaleString('fr-FR') ?? '5 000'} XAF) et devient alors retirable comme un solde normal.`
}, {
  title: '7. Remise de l\'article',
  content: 'Selon le choix du vendeur à la publication, la remise de l\'article se fait soit en main propre (directement entre l\'acheteur et le vendeur, qui conviennent ensemble d\'un lieu et d\'une heure via le chat de la commande), soit par un livreur partenaire (y compris entre deux villes différentes, via un partenariat avec une agence de transport). En cas de livraison, le livreur fixe librement ses frais, que l\'acheteur doit explicitement accepter et payer avant tout déplacement du livreur — aucune somme n\'est jamais engagée sans cet accord préalable. Le livreur est rémunéré exclusivement sur son solde MAKET, jamais en espèces. Au moment de la remise finale, l\'acheteur communique un code de remise à 4 chiffres à la personne qui lui remet l\'article (le vendeur en main propre, ou le livreur en cas de livraison), qui le saisit dans l\'application pour confirmer la remise et déclencher la libération du paiement (après un délai de 24h sans litige). En cas de problème constaté lors de la remise, l\'acheteur peut ouvrir un litige dans les 24h suivant la confirmation ; l\'équipe MAKET examine les preuves fournies par les parties et statue sous 48h, la décision pouvant donner lieu à un remboursement total ou partiel selon les éléments du dossier.'
}, {
  title: '8. Litiges',
  content: 'En cas de litige entre acheteur et vendeur, l\'équipe MAKET arbitre dans les 48h sur la base des preuves fournies (photos, vidéo, historique de la commande). La décision est finale et irrévocable. Tout arrangement conclu en dehors de MAKET est sous l\'entière responsabilité des parties. MAKET ne peut être tenu responsable des escroqueries résultant d\'échanges hors plateforme. Lorsqu\'un litige est tranché en faveur de l\'acheteur pour une commande remise par un livreur, l\'acheteur est intégralement remboursé (article et frais de livraison) sans délai ni condition. L\'article doit alors être retourné au vendeur : celui-ci peut, à tout moment depuis sa page de commande, payer le double des frais de livraison déjà appliqués sur la commande pour organiser ce retour — cette somme sert intégralement à rémunérer le livreur pour ses deux trajets réels (collecte de l\'article chez l\'acheteur, puis remise au vendeur), chacun soumis à la même commission de livraison qu\'une livraison normale. Une fois ce paiement effectué, le même livreur ayant effectué la livraison initiale est automatiquement chargé de récupérer l\'article chez l\'acheteur et de le remettre au vendeur (MAKET peut, si besoin, désigner un autre livreur). Tant que le vendeur ne déclenche pas ce paiement, aucun retour n\'est organisé ; MAKET n\'avance jamais ces frais et ne peut être tenu responsable de l\'absence de retour d\'un article dont le retour n\'a pas été payé.'
}, {
  title: '9. Comportement',
  content: 'Toute tentative de partage de coordonnées personnelles dans le chat est filtrée et sanctionnée progressivement (avertissements, suspension temporaire de la conversation concernée), jusqu\'à revue par un administrateur en cas de récidive répétée. Les utilisateurs s\'engagent à utiliser la plateforme de bonne foi.'
}, {
  title: '10. Responsabilité',
  content: 'MAKET n\'est pas responsable du contenu des annonces, de la qualité des articles ou du comportement des utilisateurs hors plateforme. MAKET fait ses meilleurs efforts pour vérifier les factures mais ne peut garantir l\'authenticité de tous les documents. MAKET agit uniquement en qualité d\'intermédiaire technique de mise en relation et de séquestre des paiements (escrow) ; MAKET n\'est à aucun moment propriétaire, vendeur, acheteur ou transporteur des articles échangés, et n\'est pas partie au contrat de vente conclu directement entre l\'acheteur et le vendeur. Les livreurs partenaires sont des prestataires indépendants ; aucune relation de subordination, de mandat ou de préposition n\'existe entre MAKET et un livreur, un vendeur ou un acheteur.'
}, {
  title: '11. Limitation de responsabilité',
  content: 'Dans la mesure permise par la loi camerounaise, la responsabilité de MAKET envers un utilisateur, tous préjudices confondus et quelle qu\'en soit la cause, ne pourra excéder le montant des commissions effectivement perçues par MAKET sur la ou les commandes concernées au cours des douze (12) mois précédant le fait générateur. MAKET ne pourra en aucun cas être tenu responsable des dommages indirects, immatériels ou consécutifs (perte de profit, perte de chance, atteinte à la réputation, préjudice moral) résultant de l\'utilisation ou de l\'impossibilité d\'utiliser la plateforme. La plateforme est fournie "en l\'état" et selon sa disponibilité ; MAKET ne garantit pas un fonctionnement ininterrompu, exempt d\'erreurs, ou une disponibilité continue, notamment en cas de maintenance, de panne d\'un prestataire tiers (CamPay, hébergeur, opérateur de télécommunications) ou de cas de force majeure.'
}, {
  title: '12. Indemnisation',
  content: 'Tout utilisateur s\'engage à garantir et indemniser MAKET, ses dirigeants et son personnel contre toute réclamation, perte, dommage ou frais (y compris les honoraires raisonnables d\'avocat) résultant : de sa violation des présentes CGU, de son utilisation frauduleuse ou abusive de la plateforme, du contenu qu\'il publie (annonces, messages, preuves), ou de tout litige avec un autre utilisateur ou un tiers portant sur une transaction conclue via MAKET.'
}, {
  title: '13. Règlement préalable des litiges',
  content: 'Avant toute action judiciaire, tout utilisateur s\'engage à soumettre son différend avec MAKET, un autre utilisateur ou un livreur partenaire à la procédure interne de résolution des litiges prévue à l\'article 8, et à en épuiser les voies avant de saisir toute juridiction — ceci ne prive l\'utilisateur d\'aucun droit d\'action, mais constitue un préalable obligatoire destiné à permettre un règlement amiable rapide.'
}, {
  title: '14. Droit applicable et juridiction compétente',
  content: 'Les présentes CGU sont soumises au droit camerounais (y compris, le cas échéant, les Actes uniformes OHADA applicables). Tout litige qui n\'aurait pu être résolu à l\'amiable conformément à l\'article 13 relève de la compétence exclusive des juridictions de Yaoundé, Cameroun, sous réserve des règles d\'ordre public applicables aux consommateurs.'
}, {
  title: '15. Suspension et résiliation',
  content: 'MAKET se réserve le droit de suspendre ou de résilier, à tout moment et sans préavis, l\'accès d\'un utilisateur en cas de violation des présentes CGU, de comportement frauduleux, de fourniture d\'informations fausses, ou de risque avéré pour la sécurité d\'autres utilisateurs ou de la plateforme, sans que cela ouvre droit à une quelconque indemnisation, sous réserve du versement des sommes légitimement dues à l\'utilisateur au titre de son solde.'
}, {
  title: '16. Dispositions générales',
  content: 'Si une clause des présentes CGU est jugée nulle ou inapplicable par une juridiction compétente, les autres clauses demeurent pleinement applicables. Le fait pour MAKET de ne pas se prévaloir d\'un manquement à une clause des CGU ne saurait être interprété comme une renonciation à s\'en prévaloir ultérieurement. MAKET peut modifier les présentes CGU à tout moment ; toute modification substantielle est portée à la connaissance des utilisateurs par notification sur la plateforme, la poursuite de l\'utilisation de MAKET après notification valant acceptation des CGU modifiées.'
}];
export default function CGUPage() {
  const [settings, setSettings] = useState({
    commissionVenteDefaut: 0.05,
    nombreVentesReduitesFilleul: 10,
    pourcentageCommissionParrain: 100,
    nombreVentesRecompensees: 3,
    transfertParrainageMinimum: 5000,
    limiteAnnoncesParFilleulQualifie: 2
  });
  useEffect(() => {
    getSettings().then(setSettings);
  }, []);
  const sections = buildSections(settings);
  return <div style={{
    maxWidth: 800,
    margin: '0 auto',
    padding: '48px 24px'
  }}>
      <h1 style={{
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 32,
      marginBottom: 8,
      color: 'var(--ink)'
    }}>Conditions Générales d'Utilisation</h1>
      <p style={{
      color: '#94A3B8',
      fontSize: 14,
      marginBottom: 40
    }}>Dernière mise à jour : Août 2026</p>
      {sections.map((section, i) => <div key={i} style={{
      marginBottom: 28
    }}>
          <h2 style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: 18,
        color: 'var(--ink)',
        marginBottom: 10
      }}>{section.title}</h2>
          <p style={{
        fontSize: 14,
        color: '#374151',
        lineHeight: 1.75
      }}>{section.content}</p>
        </div>)}
    </div>;
}
