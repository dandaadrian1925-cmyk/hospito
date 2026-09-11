import { useState, useEffect } from 'react';
import { useParams, Link, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getEtablissement, listerTarifsConsultation, getAPropos } from '../../services/etablissementsPublicService';
import EtablissementSiteHeader from '../../components/etablissement/EtablissementSiteHeader';
import EtablissementSiteFooter from '../../components/etablissement/EtablissementSiteFooter';

// Assombrit une couleur hex d'un pourcentage donné — utilisé pour dériver
// une teinte "hover"/foncée à partir de l'unique couleur choisie par le
// sysadmin (cf. apropos.couleurPrimaire), sans lui demander une palette
// complète.
function assombrir(hex, pct) {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, ((n >> 16) & 255) * (1 - pct));
  const g = Math.max(0, ((n >> 8) & 255) * (1 - pct));
  const b = Math.max(0, (n & 255) * (1 - pct));
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
}

// #refonte (retour utilisateur, capture d'écran d'un vrai site d'hôpital
// (chuy.cm) : "ça doit afficher le site web entier de l'établissement navbar
// et footer donc tout mais avec un bouton retour vers hospito") : cette page
// n'est plus encapsulée dans le chrome global de l'app Hospito (Navbar/
// Footer génériques, cf. App.jsx où cette route n'utilise plus <Layout>) —
// elle a désormais SON PROPRE en-tête et pied de page complets, pour donner
// l'impression d'un site indépendant de l'établissement, avec un unique
// bouton explicite "Retour à Hospito" (dans l'en-tête et le pied de page)
// pour sortir de cette expérience.
export default function EtablissementLayout() {
  const { etablissementId } = useParams();
  const { user, userProfile } = useAuth();
  const [etablissement, setEtablissement] = useState(null);
  const [tarifs, setTarifs] = useState([]);
  const [apropos, setApropos] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEtablissement(etablissementId)
      .then(setEtablissement)
      .finally(() => setLoading(false));
    listerTarifsConsultation(etablissementId).then(setTarifs).catch(() => setTarifs([]));
    getAPropos(etablissementId).then((data) => setApropos(data || {})).catch(() => setApropos({}));
  }, [etablissementId]);

  // #corrigé (retour utilisateur, "je ne vois pas l'impact de la couleur
  // secondaire") : le champ couleurSecondaire (Site web > Informations
  // générales) était bien enregistré mais jamais lu ici — --primary-dark
  // (dégradés, fonds sombres : hero, footer, bandeau CTA) restait calculé à
  // partir de la couleur PRINCIPALE assombrie, sans jamais tenir compte du
  // second choix du sysadmin. Utilise désormais couleurSecondaire dès
  // qu'elle existe ; assombrissement automatique de la principale en repli
  // sinon (comportement d'origine, établissement n'ayant choisi qu'une
  // couleur).
  const { couleurPrimaire, couleurSecondaire } = apropos || {};
  const styleTheme = couleurPrimaire ? {
    '--blue': couleurPrimaire,
    '--blue-dark': assombrir(couleurPrimaire, 0.18),
    '--primary-dark': couleurSecondaire || assombrir(couleurPrimaire, 0.35),
  } : undefined;

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink-3)' }}>Chargement…</div>;
  }

  if (!etablissement) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <p style={{ color: 'var(--ink-3)' }}>Établissement introuvable.</p>
        <Link to="/" className="btn-primary" style={{ display: 'inline-block', marginTop: 16 }}>
          Retour à l'accueil
        </Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'white', overflowX: 'hidden', ...styleTheme }}>
      <EtablissementSiteHeader etablissement={etablissement} />

      <div style={{ flex: 1, maxWidth: 1100, width: '100%', margin: '0 auto', padding: '32px 24px 64px' }}>
        <Outlet context={{ etablissement, tarifs, apropos, etablissementId, user, userProfile }} />
      </div>

      <EtablissementSiteFooter etablissement={etablissement} />
    </div>
  );
}
