export function ilYA(value) {
  const d = value?.toDate ? value.toDate() : new Date(value);
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSec < 5) return "à l'instant";
  if (diffSec < 60) return `il y a ${diffSec} seconde${diffSec > 1 ? 's' : ''}`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `il y a ${diffMin} minute${diffMin > 1 ? 's' : ''}`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} heure${diffH > 1 ? 's' : ''}`;
  const diffJ = Math.floor(diffH / 24);
  if (diffJ < 7) return `il y a ${diffJ} jour${diffJ > 1 ? 's' : ''}`;
  if (diffJ < 30) {
    const diffSem = Math.floor(diffJ / 7);
    return `il y a ${diffSem} semaine${diffSem > 1 ? 's' : ''}`;
  }
  if (diffJ < 365) {
    const diffMois = Math.floor(diffJ / 30);
    return `il y a ${diffMois} mois`;
  }
  const diffAn = Math.floor(diffJ / 365);
  return `il y a ${diffAn} an${diffAn > 1 ? 's' : ''}`;
}
