import { useState, useEffect } from 'react';
import { useParams, Link, Outlet } from 'react-router-dom';
import { Home } from 'lucide-react';
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
  // #nouveau (retour utilisateur, "2 couleurs c'est toujours petit mais 3
  // c'est recommandé") : troisième couleur, dédiée à la mise en avant
  // (chiffres clés, pastille du carrousel) — distincte de --blue (boutons/
  // liens) pour ne pas se substituer à lui. --accent-etab n'est posé QUE si
  // couleurAccent est réellement renseignée : les établissements n'ayant
  // choisi que 2 couleurs gardent leur rendu actuel (repli déjà géré au cas
  // par cas par chaque composant, ex. `var(--accent-etab, white)`).
  // #nouveau (demande utilisateur, "le super admin décide lui-même des 2
  // couleurs utilisées pour le design du nom de l'établissement, à part") :
  // paire DÉDIÉE au nom dans l'en-tête (EtablissementSiteHeader), distincte
  // des couleurs de marque générales — un établissement peut vouloir un nom
  // dans des tons différents des boutons/liens. Repli sur
  // couleurPrimaire/Secondaire si non renseignée (comportement précédent),
  // jamais un dégradé inventé si rien n'est choisi (le composant retombe
  // alors sur var(--blue)/var(--primary-dark) directement).
  const { couleurPrimaire, couleurSecondaire, couleurAccent, couleurNom1, couleurNom2, nomPolice, nomTaille, logoTaille } = apropos || {};
  const styleThemeCouleurs = couleurPrimaire ? {
    '--blue': couleurPrimaire,
    '--blue-dark': assombrir(couleurPrimaire, 0.18),
    '--primary-dark': couleurSecondaire || assombrir(couleurPrimaire, 0.35),
    ...(couleurAccent ? { '--accent-etab': couleurAccent } : {}),
  } : {};
  // #nouveau (demande utilisateur, "une multitude de design police taille
  // etc, avec une taille de logo ajustable") : police/tailles choisies
  // dans le même éditeur que les couleurs du nom (hospito-super-admin,
  // InformationsGeneralesPage) — même registre POLICES_NOM des deux côtés
  // (Inter/Fraunces/Syne, les 3 polices déjà chargées par ce projet,
  // jamais une police tierce à charger en plus). Indépendante de
  // couleurPrimaire : un établissement peut choisir une paire dédiée au
  // nom sans forcément personnaliser le reste (boutons/liens gardent alors
  // le bleu HostoConnect par défaut).
  const POLICES_NOM = { inter: "'Inter', -apple-system, sans-serif", fraunces: "'Fraunces', Georgia, serif", syne: "'Syne', sans-serif" };
  const styleThemeNom = {
    ...(couleurNom1 ? { '--nom-c1': couleurNom1 } : {}),
    ...(couleurNom2 ? { '--nom-c2': couleurNom2 } : {}),
    ...(nomPolice && POLICES_NOM[nomPolice] ? { '--nom-font': POLICES_NOM[nomPolice] } : {}),
    ...(nomTaille ? { '--nom-taille': `${nomTaille}px` } : {}),
    ...(logoTaille ? { '--logo-taille': `${logoTaille}px` } : {}),
  };
  const styleTheme = { ...styleThemeCouleurs, ...styleThemeNom };

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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'white', ...styleTheme }}>
      {/* #corrigé (retour utilisateur, "l'entête doit rester fixe même
          quand on scrolle" — encore signalé après le correctif bb45550) :
          `overflow-x: hidden` vivait sur CE conteneur racine, dont
          l'en-tête sticky est un DESCENDANT direct — poser overflow-x sur
          un ancêtre force son overflow-y à `auto`, en fait un conteneur de
          défilement à part entière, et casse `position: sticky` dans ce
          cas précis (Safari en particulier).
          #corrigé une seconde fois (retour utilisateur, capture d'écran :
          carrousel pleine largeur coupé net, carte à moitié hors écran) :
          déplacer overflow-x:hidden sur LE WRAPPER CI-DESSOUS (1100px,
          centré) au lieu du conteneur racine a d'abord semblé résoudre le
          souci d'en-tête, mais a alors CLIPPÉ tout carrousel pleine largeur
          (100vw, cf. EtablissementHeroCarousel) à la largeur de CE
          wrapper au lieu du vrai viewport — seule sa tranche centrale
          restait visible. La bonne portée pour ce garde-fou n'est ni la
          racine (casse sticky) ni ce wrapper (clippe le pleine largeur) :
          posé désormais sur `body` (src/index.css) — html/body sont un cas
          spécial du spec Overflow, jamais traités comme un conteneur de
          défilement ordinaire, donc ne cassent jamais position:sticky. */}
      <EtablissementSiteHeader etablissement={etablissement} />

      <div style={{ flex: 1, maxWidth: 1100, width: '100%', margin: '0 auto', padding: '32px 24px 64px' }}>
        <Outlet context={{ etablissement, tarifs, apropos, etablissementId, user, userProfile }} />
      </div>

      <EtablissementSiteFooter etablissement={etablissement} />

      {/* #nouveau (demande utilisateur, "un bouton flottant un peu comme
          celui du support pour revenir à l'accueil de HostoConnect") : le
          lien "Retour à HostoConnect" existait déjà dans l'en-tête (menu
          mobile) et le pied de page, mais aucun n'est visible en permanence
          pendant la navigation — ce bouton flottant, à l'opposé du widget de
          support (bottom/right, cf. SupportChatWidget.jsx, rendu globalement
          y compris sur ces pages), reste accessible à tout moment. */}
      <Link
        to="/"
        title="Retour à HostoConnect"
        style={{
          position: 'fixed', bottom: 20, left: 20, zIndex: 900,
          width: 52, height: 52, borderRadius: '50%',
          background: 'white', border: '1.5px solid var(--border, #E2E8F0)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 6px 20px rgba(15,23,42,0.18)', textDecoration: 'none',
        }}
      >
        <Home style={{ width: 22, height: 22, color: 'var(--blue)' }} />
      </Link>
    </div>
  );
}
