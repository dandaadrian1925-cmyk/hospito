import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Phone, Mail, ChevronLeft, Menu, X, FolderHeart } from 'lucide-react';

// #nouveau (retour utilisateur, capture d'écran d'un vrai site d'hôpital,
// "ça doit afficher le site web entier de l'établissement navbar et footer
// donc tout mais avec un bouton retour vers hospito") : en-tête complet et
// permanent qui donne à cette page l'impression d'un site indépendant —
// barre utilitaire (urgences, email, retour Hospito) + navigation principale
// + menu mobile — plutôt qu'une simple ligne de liens. Seuls des liens vers
// des pages RÉELLEMENT construites apparaissent ici (pas d'Actualités, de
// FAQ ou de Présentation qui n'existent pas encore).
const LIENS_SITE = [
  { to: '.', end: true, label: 'Accueil' },
  { to: 'services', label: 'Services' },
  { to: 'equipe', label: 'Équipe' },
  { to: 'tarifs', label: 'Tarifs' },
  { to: 'avis', label: 'Avis' },
  { to: 'contact', label: 'Contact' },
];

export default function EtablissementSiteHeader({ etablissement }) {
  const [menuOuvert, setMenuOuvert] = useState(false);
  const telephone = etablissement.contactTelephone;
  const email = etablissement.contactEmail;

  return (
    <header style={{ borderBottom: '1px solid var(--border, #E2E8F0)' }}>
      {/* Barre utilitaire */}
      <div
        style={{
          background: 'var(--primary-dark, #174858)',
          color: 'rgba(255,255,255,0.9)',
          fontSize: 12.5,
          padding: '7px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
          {telephone && (
            <a href={`tel:${telephone}`} style={{ color: 'inherit', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Phone style={{ width: 12, height: 12 }} /> {telephone}
            </a>
          )}
          {email && (
            <a href={`mailto:${email}`} style={{ color: 'inherit', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Mail style={{ width: 12, height: 12 }} /> {email}
            </a>
          )}
        </div>
        <Link to="/" style={{ color: 'white', textDecoration: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <ChevronLeft style={{ width: 13, height: 13 }} /> Retour à Hospito
        </Link>
      </div>

      {/* Nav principale */}
      <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 16, background: 'white' }}>
        <Link to="." style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
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
          {LIENS_SITE.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              style={({ isActive }) => ({
                padding: '8px 12px', borderRadius: 8, fontSize: 13.5, fontWeight: 600, textDecoration: 'none',
                color: isActive ? 'var(--blue)' : 'var(--ink-2)', background: isActive ? 'var(--bg-2)' : 'transparent',
              })}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <Link to="dossier" className="btn-primary etab-nav-cta" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <FolderHeart style={{ width: 15, height: 15 }} /> Espace Patient
        </Link>

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
              {LIENS_SITE.map((l) => (
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
            <Link to="dossier" onClick={() => setMenuOuvert(false)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <FolderHeart style={{ width: 15, height: 15 }} /> Espace Patient
            </Link>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 860px) {
          .etab-nav-desktop { display: none !important; }
          .etab-nav-cta { display: none !important; }
          .etab-nav-burger { display: inline-flex !important; }
        }
      `}</style>
    </header>
  );
}
