import { useState, useEffect } from 'react';
import { useParams, Link, NavLink, Outlet } from 'react-router-dom';
import {
  Home, Building2, Users, Tag, Star, Phone, CalendarPlus, FolderHeart, MessageCircle, Wallet, Flag, LifeBuoy, ChevronLeft, MapPin,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getEtablissement, listerTarifsConsultation } from '../../services/etablissementsPublicService';

// Chemins relatifs à /etablissement/:etablissementId — chacun sa propre URL,
// affichée progressivement au fil de la navigation, comme un vrai site
// vitrine (plus d'onglets qui masquent tout, plus de page unique qui empile
// tout). Simple liste d'objets : ajouter une entrée (À propos, Actualités,
// FAQ…) plus tard n'est qu'un ajout, pas une réécriture.
const NAV_VITRINE = [
  { to: '.', end: true, label: 'Accueil', icon: Home },
  { to: 'services', label: 'Services', icon: Building2 },
  { to: 'equipe', label: 'Équipe', icon: Users },
  { to: 'tarifs', label: 'Tarifs', icon: Tag },
  { to: 'avis', label: 'Avis', icon: Star },
  { to: 'contact', label: 'Contact', icon: Phone },
];

const NAV_ACTIONS = [
  { to: 'rdv', label: 'Prendre RDV', icon: CalendarPlus, cta: true },
  { to: 'dossier', label: 'Mon dossier', icon: FolderHeart },
  { to: 'messagerie', label: 'Messagerie', icon: MessageCircle },
  { to: 'paiement', label: 'Paiement', icon: Wallet },
  { to: 'reclamations', label: 'Réclamations', icon: Flag },
  { to: 'securite', label: 'Sécurité', icon: LifeBuoy },
];

function NavItem({ to, end, label, icon: Icon, cta }) {
  return (
    <NavLink
      to={to}
      end={end}
      style={({ isActive }) => ({
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: cta ? '8px 16px' : '10px 12px',
        fontSize: 13,
        fontWeight: 600,
        borderRadius: cta ? 999 : 0,
        textDecoration: 'none',
        background: cta ? 'var(--blue)' : 'transparent',
        color: cta ? 'white' : isActive ? 'var(--blue)' : 'var(--ink-3)',
        borderBottom: !cta && isActive ? '2px solid var(--blue)' : !cta ? '2px solid transparent' : 'none',
      })}
    >
      <Icon style={{ width: 15, height: 15 }} />
      {label}
    </NavLink>
  );
}

export default function EtablissementLayout() {
  const { etablissementId } = useParams();
  const { user, userProfile } = useAuth();
  const [etablissement, setEtablissement] = useState(null);
  const [tarifs, setTarifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEtablissement(etablissementId)
      .then(setEtablissement)
      .finally(() => setLoading(false));
    listerTarifsConsultation(etablissementId).then(setTarifs).catch(() => setTarifs([]));
  }, [etablissementId]);

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
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 64px' }}>
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--ink-3)', marginBottom: 16, textDecoration: 'none' }}>
        <ChevronLeft style={{ width: 14, height: 14 }} /> Accueil
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: 'linear-gradient(135deg, var(--blue), var(--primary-dark, #174858))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span style={{ color: 'white', fontSize: 22, fontWeight: 700 }}>
            {(etablissement.nom || '?').charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)' }}>{etablissement.nom}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <MapPin style={{ width: 13, height: 13, color: 'var(--ink-4)' }} />
            <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{etablissement.ville}</span>
          </div>
        </div>
      </div>

      {/* Nav du site vitrine — de vraies pages, chacune sa propre URL */}
      <div
        className="flex flex-nowrap items-center gap-1 overflow-x-auto scrollbar-hide"
        style={{ borderBottom: '1.5px solid var(--border, #E2E8F0)', marginBottom: 28, paddingBottom: 4 }}
      >
        {NAV_VITRINE.map((item) => <NavItem key={item.to} {...item} />)}
        <div style={{ width: 1, height: 20, background: 'var(--border, #E2E8F0)', flexShrink: 0, margin: '0 6px' }} />
        {NAV_ACTIONS.map((item) => <NavItem key={item.to} {...item} />)}
      </div>

      <Outlet context={{ etablissement, tarifs, etablissementId, user, userProfile }} />
    </div>
  );
}
