import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Menu, X, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { logout } from '../../services/authService';
import { listenUnreadNotificationsCount } from '../../services/notificationsService';
function HostoConnectLogo({
  size = 'md'
}) {
  const sizes = {
    sm: {
      box: 26,
      text: 15
    },
    md: {
      box: 32,
      text: 18
    },
    lg: {
      box: 40,
      text: 22
    }
  };
  const s = sizes[size];
  return <span style={{
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8
  }}>
      <img src="/icon-192.png" alt="HostoConnect" style={{
      width: s.box,
      height: s.box,
      flexShrink: 0
    }} />
      <span style={{
      fontFamily: 'Syne, sans-serif',
      fontWeight: 800,
      fontSize: s.text,
      color: 'var(--ink)',
      letterSpacing: '-0.01em'
    }}>
        HostoConnect
      </span>
    </span>;
}
export { HostoConnectLogo };
export default function Navbar() {
  const {
    user,
    userProfile
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const headerRef = useRef(null);
  const profileRef = useRef(null);
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    const unsub = listenUnreadNotificationsCount(user.uid, setUnreadCount);
    return unsub;
  }, [user]);
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);
  // Ferme le menu profil au clic en dehors
  useEffect(() => {
    if (!profileOpen) return;
    const onClickOutside = e => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [profileOpen]);
  // Ferme le menu mobile au clic en dehors du header
  useEffect(() => {
    if (!mobileOpen) return;
    const onClickOutside = e => {
      if (headerRef.current && !headerRef.current.contains(e.target)) setMobileOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [mobileOpen]);
  const handleSearch = e => {
    e.preventDefault();
    navigate(search.trim() ? `/etablissements?q=${encodeURIComponent(search)}` : '/etablissements');
  };
  const handleLogout = async () => {
    if (!window.confirm('Voulez-vous vraiment vous déconnecter ?')) return;
    await logout();
    navigate('/');
    setProfileOpen(false);
  };
  const linkBase = {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--ink-2)',
    textDecoration: 'none',
    padding: '8px 4px',
    transition: 'color 0.15s'
  };
  return <>
      <header ref={headerRef} style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      background: 'white',
      borderBottom: '1px solid var(--border-2)',
      boxShadow: scrolled ? 'var(--shadow-md)' : 'none',
      transition: 'box-shadow var(--duration-base) var(--ease-out)'
    }}>
        {}
        <div className="nav-main-bar" style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: '0 24px',
        height: 72,
        display: 'flex',
        alignItems: 'center',
        gap: 28
      }}>

          {}
          <Link to="/" style={{
          textDecoration: 'none',
          flexShrink: 0
        }}>
            <HostoConnectLogo size="md" />
          </Link>

          {}
          <div className="nav-actions" style={{
          display: 'flex',
          alignItems: 'center',
          gap: 22,
          marginLeft: 'auto'
        }}>
            {user ? <>
                <Link to="/mes-favoris" style={{
              ...linkBase,
              display: 'none'
            }} className="desktop-icon" onMouseEnter={e => e.currentTarget.style.color = 'var(--ink)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--ink-2)'}>Favoris</Link>
                <Link to="/contact" style={{
              ...linkBase,
              display: 'none'
            }} className="desktop-icon" onMouseEnter={e => e.currentTarget.style.color = 'var(--ink)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--ink-2)'}>
                  Messages
                </Link>
                <Link to="/notifications" style={{
              ...linkBase,
              display: 'none',
              position: 'relative'
            }} className="desktop-icon" onMouseEnter={e => e.currentTarget.style.color = 'var(--ink)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--ink-2)'}>
                  Notifications
                  {unreadCount > 0 && <span style={{
                position: 'absolute',
                top: 2,
                right: -16,
                minWidth: 15,
                height: 15,
                padding: '0 3px',
                background: 'var(--accent)',
                color: 'white',
                borderRadius: 999,
                fontSize: 9.5,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
                </Link>

                <Link to="/etablissements" className="btn-primary" style={{
              fontSize: 13,
              padding: '9px 18px',
              display: 'none'
            }} id="desktop-rdv">
                  Prendre RDV
                </Link>

                {}
                <div ref={profileRef} style={{
              position: 'relative'
            }}>
                  <button onClick={() => setProfileOpen(!profileOpen)} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 4px 4px 4px',
                borderRadius: 20
              }}>
                    <div style={{
                  width: 30,
                  height: 30,
                  background: 'var(--accent)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: 12.5,
                  fontFamily: 'var(--font)'
                }}>
                      {userProfile?.prenom?.[0] || user.email?.[0]?.toUpperCase()}
                    </div>
                    <ChevronDown style={{
                  width: 13,
                  height: 13,
                  color: 'var(--ink-4)'
                }} />
                  </button>

                  <AnimatePresence>
                    {profileOpen && <motion.div initial={{
                  opacity: 0,
                  y: 6
                }} animate={{
                  opacity: 1,
                  y: 0
                }} exit={{
                  opacity: 0,
                  y: 6
                }} transition={{
                  duration: 0.14
                }} className="profile-dropdown" style={{
                  position: 'absolute',
                  right: 0,
                  top: 44,
                  width: 210,
                  background: 'white',
                  borderRadius: 14,
                  boxShadow: 'var(--shadow-lg)',
                  border: '1px solid var(--border-2)',
                  overflow: 'hidden',
                  zIndex: 100
                }}>
                        <div style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--border-2)'
                  }}>
                          <p style={{
                      fontWeight: 700,
                      fontSize: 13,
                      color: 'var(--ink)'
                    }}>{userProfile?.displayName || user.email}</p>
                          <p style={{
                      fontSize: 11,
                      color: 'var(--ink-3)',
                      marginTop: 2
                    }}>{user.email}</p>
                        </div>
                        <form onSubmit={handleSearch} className="dropdown-mobile-search" style={{ padding: '12px 16px 0', display: 'none' }}>
                          <div style={{ position: 'relative' }}>
                            <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'var(--ink-4)' }} />
                            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un établissement…" className="input-field" style={{ paddingLeft: 38, fontSize: 14 }} />
                          </div>
                        </form>
                        {[{
                    to: '/mon-compte',
                    label: 'Mon compte'
                  }, {
                    to: '/mes-favoris',
                    label: 'Mes favoris'
                  }, {
                    to: '/contact',
                    label: 'Messages'
                  }, {
                    to: '/notifications',
                    label: 'Notifications',
                    badge: unreadCount
                  }, {
                    to: '/etablissements',
                    label: 'Trouver un établissement'
                  }].map(({
                    to,
                    label,
                    badge
                  }) => <Link key={to} to={to} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 16px',
                    fontSize: 13,
                    color: 'var(--ink-2)',
                    textDecoration: 'none',
                    transition: 'background 0.15s'
                  }} onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--bg-2)';
                    e.currentTarget.style.color = 'var(--ink)';
                  }} onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--ink-2)';
                  }}>
                            {label}
                            {!!badge && <span style={{
                      minWidth: 18,
                      height: 18,
                      padding: '0 4px',
                      background: 'var(--accent)',
                      color: 'white',
                      borderRadius: 999,
                      fontSize: 10.5,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>{badge > 9 ? '9+' : badge}</span>}
                          </Link>)}
                        <div style={{
                    borderTop: '1px solid var(--border-2)'
                  }}>
                          <button onClick={handleLogout} style={{
                      display: 'block',
                      textAlign: 'left',
                      padding: '10px 16px',
                      fontSize: 13,
                      color: 'var(--danger)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      width: '100%',
                      transition: 'background 0.15s'
                    }} onMouseEnter={e => e.currentTarget.style.background = '#FBF1EF'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            Déconnexion
                          </button>
                        </div>
                      </motion.div>}
                  </AnimatePresence>
                </div>
              </> : <>
                <Link to="/auth" style={{
              display: 'none',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--ink)',
              textDecoration: 'none'
            }} className="desktop-auth">
                  Se connecter
                </Link>
                <Link to="/auth" className="btn-primary" style={{
              fontSize: 13,
              padding: '9px 18px',
              display: 'none'
            }} id="desktop-cta">
                  Créer un compte
                </Link>
                {}
                <button onClick={() => setMobileOpen(!mobileOpen)} style={{
              width: 34,
              height: 34,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ink)'
            }} className="mobile-guest-menu">
                  {mobileOpen ? <X style={{
                width: 19,
                height: 19
              }} /> : <Menu style={{
                width: 19,
                height: 19
              }} />}
                </button>
              </>}
          </div>
        </div>

        {}
        <AnimatePresence>
          {mobileOpen && <motion.div initial={{
          opacity: 0,
          height: 0
        }} animate={{
          opacity: 1,
          height: 'auto'
        }} exit={{
          opacity: 0,
          height: 0
        }} className="mobile-nav-panel" style={{
          background: 'white',
          borderTop: '1px solid var(--border-2)',
          overflow: 'hidden'
        }}>
              <div style={{
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}>
                <form onSubmit={handleSearch}>
                  <div style={{
                position: 'relative'
              }}>
                    <Search style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 15,
                  height: 15,
                  color: 'var(--ink-4)'
                }} />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un établissement…" className="input-field" style={{
                  paddingLeft: 38,
                  fontSize: 14
                }} />
                  </div>
                </form>

                <div style={{
              height: 1,
              background: 'var(--border-2)',
              margin: '6px 0'
            }} />

                {}
                <Link to="/auth" className="btn-outline" style={{
                justifyContent: 'center'
              }}>Se connecter</Link>
                <Link to="/auth" className="btn-primary" style={{
                justifyContent: 'center'
              }}>
                      Créer un compte
                    </Link>
              </div>
            </motion.div>}
        </AnimatePresence>
      </header>

      {}
      <div className="nav-spacer" style={{
      height: 72
    }} />

      {}
      <style>{`
        @media (min-width: 768px) {
          .desktop-icon { display: flex !important; }
          .desktop-auth { display: flex !important; }
          #desktop-cta, #desktop-rdv { display: inline-flex !important; }
          .mobile-guest-menu { display: none !important; }
          .mobile-nav-panel { display: none !important; }
        }
        @media (max-width: 767px) {
          .nav-main-bar { gap: 10px !important; padding: 0 14px !important; }
          .nav-actions { gap: 10px !important; }
          /* #nouveau (vraie fusion avatar+hamburger, corrigé — la fusion
             précédente masquait ce menu en CSS sur mobile et rouvrait
             l'ancien panneau hamburger séparé à la place) : un seul menu,
             ancré en petite carte sur desktop, plein écran sous l'entête sur
             mobile — jamais deux implémentations distinctes à maintenir. */
          .profile-dropdown { position: fixed !important; top: 62px !important; left: 12px !important; right: 12px !important; width: auto !important; max-height: calc(100vh - 80px) !important; overflow-y: auto !important; }
          .dropdown-mobile-search { display: block !important; }
        }
      `}</style>
    </>;
}
