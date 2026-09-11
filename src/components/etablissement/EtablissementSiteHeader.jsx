import { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Phone, ChevronLeft, Menu, X, FolderHeart, CalendarPlus, ChevronDown } from 'lucide-react';
import { listerServicesActifs } from '../../services/etablissementsPublicService';

// #refonte (retour utilisateur : "je n'aime pas le design", + structure de
// navbar hospitalière détaillée : logo, Accueil, Services/Spécialités en
// menu déroulant, Médecins, "Prendre RDV" en bouton distinct bien visible,
// Contact, un élément Urgences très visible en bandeau au-dessus de la nav,
// et à droite un bouton Se connecter/Espace patient) : en-tête permanent
// (sticky, cf. EtablissementLayout) qui suit exactement cette structure.
// Seuls des liens vers des pages RÉELLEMENT construites apparaissent ici.
const LIENS_SITE = [
  { to: '.', end: true, label: 'Accueil' },
  { to: 'tarifs', label: 'Tarifs' },
  { to: 'avis', label: 'Avis' },
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
          color: isActive ? 'var(--blue)' : 'var(--ink-2)', background: isActive ? 'var(--bg-2)' : 'transparent',
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
              to={`services?service=${s.id}`}
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

      {/* Nav principale */}
      <div style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8, background: 'white', borderBottom: '1px solid var(--border, #E2E8F0)' }}>
        <Link to="." style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0, marginRight: 8 }}>
          <div
            style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: etablissement.photoCarrousel1 ? `url(${etablissement.photoCarrousel1}) center/cover` : 'linear-gradient(135deg, var(--blue), var(--primary-dark, #174858))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {!etablissement.photoCarrousel1 && <span style={{ color: 'white', fontWeight: 700 }}>{(etablissement.nom || '?').charAt(0).toUpperCase()}</span>}
          </div>
          <span style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 15 }}>{etablissement.nom}</span>
        </Link>

        <nav className="etab-nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
          <NavLink
            to="."
            end
            style={({ isActive }) => ({ padding: '8px 12px', borderRadius: 8, fontSize: 13.5, fontWeight: 600, textDecoration: 'none', color: isActive ? 'var(--blue)' : 'var(--ink-2)', background: isActive ? 'var(--bg-2)' : 'transparent' })}
          >
            Accueil
          </NavLink>
          <ServicesMenu etablissementId={etablissement.id} />
          <NavLink
            to="equipe"
            style={({ isActive }) => ({ padding: '8px 12px', borderRadius: 8, fontSize: 13.5, fontWeight: 600, textDecoration: 'none', color: isActive ? 'var(--blue)' : 'var(--ink-2)', background: isActive ? 'var(--bg-2)' : 'transparent' })}
          >
            Médecins
          </NavLink>
          {LIENS_SITE.slice(1).map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              style={({ isActive }) => ({
                padding: '8px 12px', borderRadius: 8, fontSize: 13.5, fontWeight: 600, textDecoration: 'none',
                color: isActive ? 'var(--blue)' : 'var(--ink-2)', background: isActive ? 'var(--bg-2)' : 'transparent',
              })}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="etab-nav-cta" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <Link to="rdv" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <CalendarPlus style={{ width: 15, height: 15 }} /> Prendre RDV
          </Link>
          <Link to="dossier" className="btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <FolderHeart style={{ width: 15, height: 15 }} /> Espace Patient
          </Link>
        </div>

        <button
          type="button"
          className="etab-nav-burger"
          onClick={() => setMenuOuvert(true)}
          aria-label="Ouvrir le menu"
          style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 6, flexShrink: 0 }}
        >
          <Menu style={{ width: 22, height: 22, color: 'var(--ink)' }} />
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
            <div className="space-y-2">
              <Link to="rdv" onClick={() => setMenuOuvert(false)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <CalendarPlus style={{ width: 15, height: 15 }} /> Prendre RDV
              </Link>
              <Link to="dossier" onClick={() => setMenuOuvert(false)} className="btn-outline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <FolderHeart style={{ width: 15, height: 15 }} /> Espace Patient
              </Link>
            </div>
            <Link to="/" onClick={() => setMenuOuvert(false)} style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 20, fontSize: 13, color: 'var(--ink-3)', textDecoration: 'none' }}>
              <ChevronLeft style={{ width: 13, height: 13 }} /> Retour à HostoConnect
            </Link>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .etab-nav-desktop { display: none !important; }
          .etab-nav-cta { display: none !important; }
          .etab-nav-burger { display: inline-flex !important; }
        }
      `}</style>
    </header>
  );
}
