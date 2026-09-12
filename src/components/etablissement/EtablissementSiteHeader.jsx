import { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Phone, ChevronLeft, Menu, X, FolderHeart, CalendarPlus, CalendarClock, ChevronDown, Wallet, Flag, LifeBuoy } from 'lucide-react';
import { listerServicesActifs } from '../../services/etablissementsPublicService';

// #nouveau (demande utilisateur, "enlève Votre espace patient de l'accueil
// et met tout ça dans espace patient de l'entête dès qu'on clique") : la
// section grille de l'accueil disparaît, son contenu (liens) migre ici,
// dans un menu déroulant au clic sur le bouton "Espace Patient".
// #retiré (demande utilisateur, "messagerie ne sert plus à rien donc
// enlève") : redondant depuis la fusion assistant IA + opérateur sur la
// page Contact (EtablissementAssistantIA) — cette messagerie séparée n'a
// plus d'utilité propre.
// #nouveau (demande utilisateur, "les demandes passées ne s'affichent pas
// là-bas, enlève ça et affiche-les dans mes rendez-vous de l'espace
// patient") : liste des demandes de RDV déplacée du formulaire "Prendre
// RDV" (TabRdv) vers sa propre entrée ici.
const LIENS_ESPACE_PATIENT = [
  { to: 'mes-rendez-vous', label: 'Mes rendez-vous', icon: CalendarClock },
  { to: 'dossier', label: 'Mon dossier', icon: FolderHeart },
  { to: 'paiement', label: 'Paiement', icon: Wallet },
  { to: 'reclamations', label: 'Réclamations', icon: Flag },
  { to: 'securite', label: 'Sécurité', icon: LifeBuoy },
];

function EspacePatientMenu() {
  const [ouvert, setOuvert] = useState(false);

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setOuvert(true)}
      onMouseLeave={() => setOuvert(false)}
    >
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        className="etab-btn-ghost-color"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
      >
        <FolderHeart style={{ width: 15, height: 15 }} /> Espace Patient <ChevronDown style={{ width: 13, height: 13 }} />
      </button>
      {ouvert && (
        <div
          style={{
            position: 'absolute', top: '100%', right: 0, background: 'white', border: '1px solid var(--border, #E2E8F0)',
            borderRadius: 12, minWidth: 190, boxShadow: 'var(--shadow-lg, 0 12px 30px rgba(15,23,42,0.12))', padding: 8, zIndex: 60,
          }}
        >
          {LIENS_ESPACE_PATIENT.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOuvert(false)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', textDecoration: 'none', borderRadius: 8 }}
            >
              <l.icon style={{ width: 15, height: 15, color: 'var(--blue)' }} /> {l.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// #refonte (retour utilisateur : "je n'aime pas le design", + structure de
// navbar hospitalière détaillée : logo, Accueil, Services/Spécialités en
// menu déroulant, Médecins, "Prendre RDV" en bouton distinct bien visible,
// Contact, un élément Urgences très visible en bandeau au-dessus de la nav,
// et à droite un bouton Se connecter/Espace patient) : en-tête permanent
// (sticky, cf. EtablissementLayout) qui suit exactement cette structure.
// Seuls des liens vers des pages RÉELLEMENT construites apparaissent ici.
// #retiré (demande utilisateur, "enlève Nos tarifs de l'accueil et de
// l'entête... déjà inclus dans les informations de chaque service") :
// "Tarifs" n'a plus de lien dédié — le tarif d'un service reste visible
// dans sa propre fiche (page Services).
// #retiré (demande utilisateur, "enlève Avis de l'entête juste ça") : le
// lien reste dans le footer et la page /avis existe toujours, seul le lien
// de la navigation principale disparaît.
const LIENS_SITE = [
  { to: '.', end: true, label: 'Accueil' },
  { to: 'actualites', label: 'Actualités' },
  { to: 'contact', label: 'Contact' },
];

function ServicesMenu({ etablissementId }) {
  const [ouvert, setOuvert] = useState(false);
  const [services, setServices] = useState(null);

  useEffect(() => {
    if (ouvert && services === null) {
      listerServicesActifs(etablissementId).then(setServices).catch(() => setServices([]));
    }
  }, [ouvert, services, etablissementId]);

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setOuvert(true)}
      onMouseLeave={() => setOuvert(false)}
    >
      <NavLink
        to="services"
        style={({ isActive }) => ({
          padding: '8px 12px', borderRadius: 8, fontSize: 13.5, fontWeight: 600, textDecoration: 'none',
          display: 'inline-flex', alignItems: 'center', gap: 4,
          color: 'white', background: isActive ? 'rgba(255,255,255,0.22)' : 'transparent',
        })}
      >
        Services <ChevronDown style={{ width: 13, height: 13 }} />
      </NavLink>
      {ouvert && !!services?.length && (
        <div
          style={{
            position: 'absolute', top: '100%', left: 0, background: 'white', border: '1px solid var(--border, #E2E8F0)',
            borderRadius: 12, minWidth: 220, boxShadow: 'var(--shadow-lg, 0 12px 30px rgba(15,23,42,0.12))', padding: 8, zIndex: 60,
          }}
        >
          {services.slice(0, 8).map((s) => (
            <Link
              key={s.id}
              to={`services/${s.id}`}
              style={{ display: 'block', padding: '8px 10px', fontSize: 13, color: 'var(--ink-2)', textDecoration: 'none', borderRadius: 8 }}
            >
              {s.nom}
            </Link>
          ))}
          <Link to="services" style={{ display: 'block', padding: '8px 10px', fontSize: 12.5, fontWeight: 700, color: 'var(--blue)', textDecoration: 'none' }}>
            Voir tous les services →
          </Link>
        </div>
      )}
    </div>
  );
}

export default function EtablissementSiteHeader({ etablissement }) {
  const [menuOuvert, setMenuOuvert] = useState(false);
  const telephone = etablissement.contactTelephone;

  // #corrigé (retour utilisateur, "l'entête du site de l'établissement doit
  // rester fixe en haut de l'écran, donc apparaître même quand on scrolle") :
  // `position: sticky` restauré — un précédent retour utilisateur avait été
  // mal interprété comme une demande de suppression de ce comportement.
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 100 }}>
      {/* Bandeau Urgences — très visible, uniquement si un vrai numéro existe (jamais un service fictif) */}
      {telephone && (
        <a
          href={`tel:${telephone}`}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: '#C2402F', color: 'white', textDecoration: 'none',
            fontSize: 13, fontWeight: 700, padding: '7px 16px', textAlign: 'center',
          }}
        >
          <Phone style={{ width: 13, height: 13 }} /> Urgences : {telephone}
        </a>
      )}

      {/* Nav principale — logo à gauche, tout le reste regroupé à droite
          (retour utilisateur : "les options doivent être à droite mais
          avant le bouton Prendre RDV"), et le hamburger toujours épinglé à
          l'extrême droite sur mobile même quand le reste est masqué. */}
      {/* #nouveau (demande utilisateur, "l'entête doit être complètement
          designé en fonction des 2 couleurs majeures choisies par le super
          admin") : la barre de nav était un simple bandeau blanc générique,
          n'exploitant les couleurs de marque (--blue/--primary-dark, cf.
          EtablissementLayout) que pour l'état actif d'un lien. Dégradé de
          marque en fond, texte blanc, boutons inversés (blanc sur couleur)
          pour rester lisibles — même dégradé que le hero/la bannière CTA,
          identité visuelle cohérente sur toute la page. */}
      <div style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: 'linear-gradient(135deg, var(--blue), var(--primary-dark, #174858))' }}>
        <Link to="." style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
          {/* #corrigé (retour utilisateur, "le logo que j'ai modifié n'a pas
              du tout été bien chargé dans l'entête") : un vrai logo
              (etablissement.logoURL, généralement rectangulaire, souvent sur
              fond blanc/transparent) rendu en `background-image: cover` dans
              un carré 40×40 se retrouvait rogné/déformé — illisible. Utilise
              désormais une vraie balise <img> en `object-fit: contain` sur
              fond blanc dès qu'un logo existe ; la photo de secours
              (photoCarrousel1, une vraie photo pas un logo) garde le rendu
              `cover` d'origine, plus adapté à une photographie. */}
          {etablissement.logoURL ? (
            <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <img src={etablissement.logoURL} alt={etablissement.nom} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 3 }} />
            </div>
          ) : etablissement.photoCarrousel1 ? (
            <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: `url(${etablissement.photoCarrousel1}) center/cover` }} />
          ) : (
            // #corrigé (retour utilisateur, "entête designée sur les
            // couleurs de marque") : cette pastille repli (initiale, sans
            // logo NI photo) reprenait le MÊME dégradé que le fond
            // désormais coloré de la barre — devenue invisible dessus.
            // Fond blanc + initiale dans la couleur de marque à la place.
            <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'var(--blue)', fontWeight: 700 }}>{(etablissement.nom || '?').charAt(0).toUpperCase()}</span>
            </div>
          )}
          <span style={{ fontWeight: 700, color: 'white', fontSize: 15 }}>{etablissement.nom}</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <nav className="etab-nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <NavLink
              to="."
              end
              style={({ isActive }) => ({ padding: '8px 12px', borderRadius: 8, fontSize: 13.5, fontWeight: 600, textDecoration: 'none', color: 'white', background: isActive ? 'rgba(255,255,255,0.22)' : 'transparent' })}
            >
              Accueil
            </NavLink>
            <ServicesMenu etablissementId={etablissement.id} />
            <NavLink
              to="equipe"
              style={({ isActive }) => ({ padding: '8px 12px', borderRadius: 8, fontSize: 13.5, fontWeight: 600, textDecoration: 'none', color: 'white', background: isActive ? 'rgba(255,255,255,0.22)' : 'transparent' })}
            >
              Médecins
            </NavLink>
            {LIENS_SITE.slice(1).map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                style={({ isActive }) => ({
                  padding: '8px 12px', borderRadius: 8, fontSize: 13.5, fontWeight: 600, textDecoration: 'none',
                  color: 'white', background: isActive ? 'rgba(255,255,255,0.22)' : 'transparent',
                })}
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="etab-nav-cta" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {/* #corrigé (retour utilisateur, "entête designée sur les
                couleurs de marque") : .btn-primary (fond --blue, texte
                blanc) se fondait presque entièrement dans une barre
                désormais elle-même en dégradé --blue/--primary-dark —
                inversé (fond blanc, texte --blue) pour rester le bouton le
                plus visible de la barre, comme prévu. */}
            <Link to="rdv" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'white', color: 'var(--blue)' }}>
              <CalendarPlus style={{ width: 15, height: 15 }} /> Prendre RDV
            </Link>
            <EspacePatientMenu />
          </div>
        </div>

        <button
          type="button"
          className="etab-nav-burger"
          onClick={() => setMenuOuvert(true)}
          aria-label="Ouvrir le menu"
          style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 6, flexShrink: 0 }}
        >
          <Menu style={{ width: 22, height: 22, color: 'white' }} />
        </button>
      </div>

      {menuOuvert && (
        <div
          onClick={() => setMenuOuvert(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 200 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: 'white', width: 'min(84vw, 320px)', height: '100%', marginLeft: 'auto', padding: 20, overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ fontWeight: 700, color: 'var(--ink)' }}>Menu</span>
              <button type="button" onClick={() => setMenuOuvert(false)} aria-label="Fermer" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X style={{ width: 20, height: 20, color: 'var(--ink)' }} />
              </button>
            </div>
            <div className="space-y-1" style={{ marginBottom: 20 }}>
              {[{ to: '.', end: true, label: 'Accueil' }, { to: 'services', label: 'Services' }, { to: 'equipe', label: 'Médecins' }, ...LIENS_SITE.slice(1), { to: 'apropos', label: 'À propos' }].map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  onClick={() => setMenuOuvert(false)}
                  style={({ isActive }) => ({ display: 'block', padding: '10px 12px', borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none', color: isActive ? 'var(--blue)' : 'var(--ink-2)', background: isActive ? 'var(--bg-2)' : 'transparent' })}
                >
                  {l.label}
                </NavLink>
              ))}
            </div>
            <div className="space-y-2" style={{ marginBottom: 20 }}>
              <Link to="rdv" onClick={() => setMenuOuvert(false)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <CalendarPlus style={{ width: 15, height: 15 }} /> Prendre RDV
              </Link>
            </div>
            <p style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 8 }}>Espace patient</p>
            <div className="space-y-1">
              {LIENS_ESPACE_PATIENT.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  onClick={() => setMenuOuvert(false)}
                  style={({ isActive }) => ({ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none', color: isActive ? 'var(--blue)' : 'var(--ink-2)', background: isActive ? 'var(--bg-2)' : 'transparent' })}
                >
                  <l.icon style={{ width: 15, height: 15 }} /> {l.label}
                </NavLink>
              ))}
            </div>
            <Link to="/" onClick={() => setMenuOuvert(false)} style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 20, fontSize: 13, color: 'var(--ink-3)', textDecoration: 'none' }}>
              <ChevronLeft style={{ width: 13, height: 13 }} /> Retour à HostoConnect
            </Link>
          </div>
        </div>
      )}

      <style>{`
        /* #nouveau (demande utilisateur, "entête designée sur les couleurs
           de marque") : équivalent de .btn-outline (même gabarit/padding)
           mais en blanc — un bouton "ghost" bordé --blue serait illisible
           sur la barre désormais en dégradé --blue/--primary-dark. */
        .etab-btn-ghost-color {
          background: transparent; color: white; border: 1.5px solid rgba(255,255,255,0.6);
          border-radius: 999px; padding: 9.5px 20px; font-family: var(--font);
          font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.15s ease;
        }
        .etab-btn-ghost-color:hover { background: rgba(255,255,255,0.15); }
        @media (max-width: 900px) {
          .etab-nav-desktop { display: none !important; }
          .etab-nav-cta { display: none !important; }
          .etab-nav-burger { display: inline-flex !important; }
        }
      `}</style>
    </header>
  );
}
