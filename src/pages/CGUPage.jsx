const SECTIONS = [{
  title: '1. Objet',
  content: 'Hospito est une plateforme numérique, éditée par Groupe 10 PFE, mettant en relation des patients et des établissements de santé partenaires au Cameroun. Elle permet notamment de rechercher un établissement, de demander un rendez-vous, de consulter un dossier médical partagé, d\'échanger avec un établissement et de régler des prestations en ligne. Hospito n\'est pas un établissement de santé, ne dispense aucun soin et n\'intervient pas dans la relation médicale entre un patient et un établissement — chaque établissement partenaire reste seul responsable des soins qu\'il prodigue.'
}, {
  title: '2. Inscription',
  content: 'L\'inscription est entièrement gratuite. Elle nécessite une adresse email valide et l\'acceptation des présentes CGU. L\'utilisateur s\'engage à fournir des informations exactes (notamment son numéro de CNI, utilisé comme identifiant de son dossier médical) et à les maintenir à jour. Un utilisateur peut supprimer son compte à tout moment depuis son espace personnel, sous réserve de l\'absence de solde restant. La suppression anonymise le profil ; elle est définitive et ne peut être annulée.'
}, {
  title: '3. Établissements partenaires',
  content: 'Un établissement de santé rejoint Hospito après une demande d\'adhésion examinée et approuvée par l\'équipe Hospito. Hospito vérifie les informations administratives déclarées par l\'établissement mais ne certifie ni la qualité, ni la conformité réglementaire des soins qui y sont prodigués — cette responsabilité relève exclusivement de l\'établissement concerné et des autorités sanitaires compétentes.'
}, {
  title: '4. Prise de rendez-vous',
  content: 'Une demande de rendez-vous soumise depuis la fiche d\'un établissement est transmise à cet établissement, qui la confirme, la reporte ou la refuse selon ses disponibilités. Hospito ne garantit ni la disponibilité d\'un établissement, ni un délai de réponse, et n\'intervient pas dans la décision médicale de prise en charge.'
}, {
  title: '5. Dossier médical partagé',
  content: 'Contrairement aux données administratives (propres à chaque établissement), le contenu clinique du dossier d\'un patient (antécédents, prescriptions, comptes-rendus) est unique et partagé entre les établissements partenaires où ce patient est suivi, dans le but d\'assurer la continuité des soins. Il n\'est accessible qu\'au personnel soignant autorisé de l\'établissement où le patient est effectivement pris en charge — voir la Politique de Confidentialité pour le détail des mesures de protection appliquées.'
}, {
  title: '6. Paiement en ligne',
  content: 'Les dépôts sur le solde Hospito se font en ligne uniquement via une passerelle de paiement partenaire (Mobile Money, carte bancaire — aucun paiement en espèces traité par Hospito). Ce solde peut être utilisé pour régler des prestations facturées par un établissement partenaire, une fois cette fonctionnalité activée par l\'établissement concerné. Hospito ne fixe pas le prix des actes médicaux, qui relève de chaque établissement.'
}, {
  title: '7. Messagerie et réclamations',
  content: 'La messagerie permet d\'échanger directement avec un établissement partenaire. Une réclamation ouverte depuis la fiche d\'un établissement lui est transmise ; celui-ci s\'engage à y répondre dans un délai raisonnable. Hospito n\'arbitre pas les réclamations portant sur la qualité ou la pertinence d\'un soin, qui relèvent de l\'établissement et, le cas échéant, des autorités compétentes — mais peut intervenir en cas de dysfonctionnement imputable à la plateforme elle-même.'
}, {
  title: '8. Comportement',
  content: 'Toute tentative de partage de coordonnées personnelles hors du canal de messagerie prévu peut être filtrée et sanctionnée progressivement (avertissement, suspension temporaire), jusqu\'à revue par un administrateur en cas de récidive. Les utilisateurs s\'engagent à utiliser la plateforme de bonne foi et à ne fournir que des informations exactes.'
}, {
  title: '9. Responsabilité',
  content: 'Hospito agit en qualité d\'intermédiaire technique de mise en relation entre patients et établissements de santé. Hospito n\'est à aucun moment prestataire de soins, et n\'est pas partie à la relation médicale entre un patient et un établissement. Hospito ne peut être tenu responsable des actes médicaux, diagnostics, prescriptions ou décisions de prise en charge, qui relèvent exclusivement de l\'établissement et du personnel soignant concernés. En cas d\'urgence vitale, l\'utilisateur doit contacter directement les services d\'urgence compétents et non l\'application.'
}, {
  title: '10. Limitation de responsabilité',
  content: 'Dans la mesure permise par la loi camerounaise, Hospito ne pourra être tenu responsable des dommages indirects, immatériels ou consécutifs résultant de l\'utilisation ou de l\'impossibilité d\'utiliser la plateforme. La plateforme est fournie « en l\'état » et selon sa disponibilité ; Hospito ne garantit pas un fonctionnement ininterrompu ou exempt d\'erreurs, notamment en cas de maintenance, de panne d\'un prestataire tiers (passerelle de paiement, hébergeur, opérateur de télécommunications) ou de cas de force majeure.'
}, {
  title: '11. Indemnisation',
  content: 'Tout utilisateur s\'engage à garantir et indemniser Hospito et Groupe 10 PFE contre toute réclamation, perte ou dommage résultant de sa violation des présentes CGU, de son utilisation frauduleuse de la plateforme, ou du contenu qu\'il publie (messages, réclamations, preuves).'
}, {
  title: '12. Règlement préalable des litiges',
  content: 'Avant toute action judiciaire, tout utilisateur s\'engage à soumettre son différend avec Hospito à une tentative de règlement amiable via la messagerie de support, et à en épuiser les voies avant de saisir toute juridiction.'
}, {
  title: '13. Droit applicable et juridiction compétente',
  content: 'Les présentes CGU sont soumises au droit camerounais. Tout litige qui n\'aurait pu être résolu à l\'amiable relève de la compétence exclusive des juridictions de Yaoundé, Cameroun, sous réserve des règles d\'ordre public applicables aux consommateurs.'
}, {
  title: '14. Suspension et résiliation',
  content: 'Hospito se réserve le droit de suspendre ou de résilier, à tout moment et sans préavis, l\'accès d\'un utilisateur en cas de violation des présentes CGU, de comportement frauduleux, ou de risque avéré pour la sécurité d\'autres utilisateurs ou de la plateforme.'
}, {
  title: '15. Dispositions générales',
  content: 'Si une clause des présentes CGU est jugée nulle ou inapplicable, les autres clauses demeurent pleinement applicables. Hospito peut modifier les présentes CGU à tout moment ; toute modification substantielle est portée à la connaissance des utilisateurs par notification sur la plateforme, la poursuite de l\'utilisation d\'Hospito après notification valant acceptation des CGU modifiées.'
}];
export default function CGUPage() {
  const sections = SECTIONS;
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
