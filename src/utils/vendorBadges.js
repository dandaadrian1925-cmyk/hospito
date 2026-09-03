const MOIS_MS = 30.44 * 24 * 60 * 60 * 1000;
// #nouveau (demande utilisateur, "mention vendeur actif depuis X mois/ventes
// mise en valeur sur le profil") : createdAt/totalVentes existaient déjà
// (déjà affichés en petit dans la ligne meta de VendeurPage) — remplace
// l'ancien badge "membre depuis plus d'un an" (seuil grossier, muet sur les
// ventes) par une phrase précise, dès 1 mois d'ancienneté OU 1ère vente
// (pas affiché pour un profil tout juste créé et encore sans historique —
// pas un vrai signal de confiance à ce stade).
function dureeActivite(createdAt) {
  const createdMs = createdAt?.toDate ? createdAt.toDate().getTime() : createdAt ? new Date(createdAt).getTime() : null;
  if (!createdMs) return null;
  const mois = Math.floor((Date.now() - createdMs) / MOIS_MS);
  if (mois < 1) return null;
  if (mois < 12) return `${mois} mois`;
  const ans = Math.floor(mois / 12);
  return `${ans} an${ans > 1 ? 's' : ''}`;
}
export function getVendorBadges(vendeur, avisData) {
  if (!vendeur) return [];
  const badges = [];
  if (vendeur.cniVerifie) {
    badges.push({
      id: 'verifie',
      label: 'Vendeur vérifié',
      color: '#2FB4A0',
      bg: '#EFF6FF'
    });
  }
  if ((vendeur.totalVentes || 0) >= 10) {
    badges.push({
      id: 'top',
      label: 'Top vendeur',
      color: '#D97706',
      bg: '#FFFBEB'
    });
  }
  if (avisData?.moyenne >= 4.5 && (avisData?.total || 0) >= 5) {
    badges.push({
      id: 'confiance',
      label: 'Excellente réputation',
      color: '#059669',
      bg: '#F0FDF4'
    });
  }
  const totalVentes = vendeur.totalVentes || 0;
  const duree = dureeActivite(vendeur.createdAt);
  if (duree || totalVentes > 0) {
    badges.push({
      id: 'activite',
      label: duree ? `Actif depuis ${duree} · ${totalVentes} vente${totalVentes !== 1 ? 's' : ''}` : `${totalVentes} vente${totalVentes !== 1 ? 's' : ''}`,
      color: '#7C3AED',
      bg: '#F5F3FF'
    });
  }
  return badges;
}
