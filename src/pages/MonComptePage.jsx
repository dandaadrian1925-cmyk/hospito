import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, Routes, Route } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, ShoppingBag, ShoppingCart, Heart, Gift, Star, Wallet, Eye, EyeOff, ChevronRight, ChevronLeft, ChevronDown, Edit2, Copy, Check, BadgeCheck, AlertTriangle, Save, X, MapPin, Mail, TrendingUp, Package, Clock, CheckCircle, AlertCircle, Zap, Rocket, History, LogOut, ArrowDownLeft, Flag, BellPlus, Trash2, Camera, MoreVertical, ArrowLeftRight, Truck, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getAnnoncesByUser, getFavoris, getAnnonceById, masquerAnnonce, demasquerAnnonce, boosterAnnonce, creerFlashAnnonce, getSignalementsByUser, getAlertesByUser, supprimerAlerteRecherche, getBoostLevels, getBoostPrix, supprimerAnnoncePropre } from '../services/annoncesService';
import { getAbonnements, toggleSuivi } from '../services/followService';
import { getAvisByUser, laisserAvis, hasAvisLeft } from '../services/avisService';
import ProductCard from '../components/annonces/ProductCard';
import ProductCardSkeleton from '../components/annonces/ProductCardSkeleton';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { getCommandesAcheteur, getCommandesVendeur, STATUT_LABELS } from '../services/commandesService';
import { getLitigesByUser } from '../services/litigesService';
import { resoudreUrlsLitige, uploadFile, deleteFile } from '../supabase/config';
import { listenWallet, COMMISSION_VENTE, WALLET_TYPES, getOperations, acheterVendeurPro } from '../services/walletService';
import { generateReferralCode, buildInvitationWhatsApp, logout, verifierEligibiliteSuppression, reauthentifierMotDePasse, reauthentifierGoogle, supprimerCompte } from '../services/authService';
import { syncProfilPublic } from '../services/profilPublicService';
import { getSettings, getTauxCommissionVendeur, estVendeurProActif, getVillesFormulaire, getQuartiersFormulaire } from '../services/settingsService';
import { getCategories } from '../services/categoriesService';
import toast from 'react-hot-toast';
const BOOST_ERROR_MESSAGES = {
  SOLDE_INSUFFISANT: 'Solde insuffisant — déposez de l\'argent sur votre wallet',
  BOOST_DEJA_ACTIF: 'Cette annonce a déjà un boost actif — retirez-le ou attendez qu\'il se termine avant d\'en choisir un autre.',
  BOOST_INDISPONIBLE_CATEGORIE: 'Ce niveau de mise en avant n\'est pas encore disponible pour la catégorie de cette annonce.'
};
function BoostModal({
  annonce,
  onClose,
  onDone
}) {
  const {
    user
  } = useAuth();
  const [wallet, setWallet] = useState({
    solde: 0,
    soldeParrainage: 0
  });
  const [settings, setSettings] = useState({});
  const [choice, setChoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  useEffect(() => {
    const unsub = listenWallet(user.uid, setWallet);
    return unsub;
  }, [user.uid]);
  useEffect(() => {
    getSettings().then(setSettings);
  }, []);
  const options = [...getBoostLevels(settings, annonce.categorie).map(b => ({
    id: b.id,
    label: b.label,
    desc: b.description,
    prix: b.prix
  })), {
    id: 'flash',
    label: 'Flash 24h',
    desc: 'Bandeau Flash sur la page d\'accueil pendant 24h',
    prix: getBoostPrix(settings, annonce.categorie, 'flash')
  }];
  const montant = choice ? options.find(o => o.id === choice)?.prix ?? 0 : 0;
  const confirmer = () => {
    if (!choice) return;
    setShowConfirm(true);
  };
  const executerBoost = async () => {
    setLoading(true);
    try {
      if (choice === 'flash') await creerFlashAnnonce(annonce.id, user.uid);else await boosterAnnonce(annonce.id, choice, user.uid);
      toast.success('Mise en avant activée !');
      setShowConfirm(false);
      onDone();
    } catch (e) {
      setShowConfirm(false);
      toast.error(BOOST_ERROR_MESSAGES[e.message] || e.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };
  return <div style={{
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 200,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16
  }} onClick={onClose}>
      <motion.div initial={{
      opacity: 0,
      scale: 0.95
    }} animate={{
      opacity: 1,
      scale: 1
    }} onClick={e => e.stopPropagation()} style={{
      background: 'white',
      borderRadius: 20,
      padding: 24,
      width: '100%',
      maxWidth: 420,
      maxHeight: '90vh',
      overflowY: 'auto'
    }}>
        <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
      }}>
          <p style={{
          fontWeight: 800,
          fontSize: 16,
          color: 'var(--ink)'
        }}>Mettre en avant "{annonce.titre}"</p>
          <button onClick={onClose} style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#94A3B8'
        }}><X style={{
            width: 18,
            height: 18
          }} /></button>
        </div>

        <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        marginBottom: 16
      }}>
          {options.map(o => {
          const indisponible = o.prix == null;
          const bloque = indisponible || (o.id !== 'flash' && !!annonce.boost);
          return <button key={o.id} onClick={() => !bloque && setChoice(o.id)} disabled={bloque} style={{
            textAlign: 'left',
            padding: '12px 14px',
            borderRadius: 12,
            border: choice === o.id ? '2px solid #2451C4' : '1.5px solid #F1F5F9',
            background: choice === o.id ? '#EFF6FF' : 'white',
            cursor: bloque ? 'not-allowed' : 'pointer',
            opacity: bloque ? 0.45 : 1
          }}>
                <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
                  <p style={{
                fontWeight: 700,
                fontSize: 13,
                color: 'var(--ink)'
              }}>{o.label}</p>
                  <p style={{
                fontWeight: 800,
                fontSize: 13,
                color: '#2451C4'
              }}>{indisponible ? 'Indisponible' : `${o.prix.toLocaleString()} XAF`}</p>
                </div>
                <p style={{
              fontSize: 11,
              color: '#94A3B8',
              marginTop: 2
            }}>{indisponible ? 'Pas encore configuré pour cette catégorie' : bloque ? 'Un boost est déjà actif sur cette annonce' : o.desc}</p>
              </button>;
        })}
        </div>

        {choice && <p style={{
        fontSize: 11,
        color: '#64748B',
        marginBottom: 16
      }}>{wallet.solde.toLocaleString()} XAF disponibles sur votre solde principal.</p>}

        <button onClick={confirmer} disabled={!choice || loading} className="btn-primary w-full justify-center" style={{
        opacity: !choice || loading ? 0.5 : 1
      }}>
          {loading ? 'Activation…' : choice ? `Payer ${montant.toLocaleString()} XAF` : 'Choisissez une option'}
        </button>
      </motion.div>

      {showConfirm && <ConfirmDialog title="Confirmer cette mise en avant ?" description={`Vous allez dépenser ${montant.toLocaleString('fr-FR')} XAF depuis votre solde principal.`} confirmLabel="Confirmer et payer" onConfirm={executerBoost} onCancel={() => setShowConfirm(false)} />}
    </div>;
}
function SectionPage({
  children
}) {
  return <div>
      <Link to="/mon-compte" style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      color: '#64748B',
      fontSize: 13,
      fontWeight: 600,
      marginBottom: 16,
      textDecoration: 'none'
    }}>
        <ChevronLeft style={{
        width: 16,
        height: 16
      }} /> Mon compte
      </Link>
      {children}
    </div>;
}
function MenuRow({
  to,
  label,
  sub,
  icon: Icon
}) {
  return <Link to={to} style={{
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'white',
    borderRadius: 14,
    padding: '14px 16px',
    border: '1.5px solid #F1F5F9',
    textDecoration: 'none',
    transition: 'all 0.15s'
  }} onMouseEnter={e => {
    e.currentTarget.style.borderColor = '#BFDBFE';
    e.currentTarget.style.boxShadow = '0 4px 12px rgba(26,86,219,0.08)';
  }} onMouseLeave={e => {
    e.currentTarget.style.borderColor = '#F1F5F9';
    e.currentTarget.style.boxShadow = 'none';
  }}>
      <div style={{
      width: 38,
      height: 38,
      background: '#EFF6FF',
      borderRadius: 10,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }}>
        <Icon style={{
        width: 17,
        height: 17,
        color: '#2451C4'
      }} />
      </div>
      <div style={{
      flex: 1,
      minWidth: 0
    }}>
        <p style={{
        fontSize: 13.5,
        fontWeight: 700,
        color: 'var(--ink)',
        fontFamily: 'var(--font)'
      }}>{label}</p>
        {sub && <p style={{
        fontSize: 11,
        color: '#94A3B8',
        marginTop: 1
      }}>{sub}</p>}
      </div>
      <ChevronRight style={{
      width: 16,
      height: 16,
      color: '#CBD5E1',
      flexShrink: 0
    }} />
    </Link>;
}
function LogoutRow() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    if (!window.confirm('Voulez-vous vraiment vous déconnecter ?')) return;
    setLoading(true);
    try {
      await logout();
      navigate('/');
    } catch {
      toast.error('Erreur lors de la déconnexion');
      setLoading(false);
    }
  };
  return <button onClick={handle} disabled={loading} style={{
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'white',
    borderRadius: 14,
    padding: '14px 16px',
    border: '1.5px solid #FCA5A5',
    cursor: loading ? 'default' : 'pointer',
    textAlign: 'left'
  }}>
      <div style={{
      width: 38,
      height: 38,
      background: '#FEF2F2',
      borderRadius: 10,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }}>
        <LogOut style={{
        width: 17,
        height: 17,
        color: '#DC2626'
      }} />
      </div>
      <span style={{
      flex: 1,
      fontSize: 13.5,
      fontWeight: 700,
      color: '#DC2626',
      fontFamily: 'var(--font)'
    }}>{loading ? 'Déconnexion…' : 'Se déconnecter'}</span>
    </button>;
}
// #nouveau (demande utilisateur, "un utilisateur doit pouvoir supprimer son
// compte") : vérifie l'éligibilité AVANT de proposer le mot de passe/Google
// (jamais interrompre l'utilisateur avec un prompt de sécurité s'il ne peut
// de toute façon pas supprimer maintenant) ; exige de taper "SUPPRIMER" en
// plus de la reconnexion, geste volontaire supplémentaire pour une action
// irréversible (compte + annonces actives + solde à zéro obligatoire).
const SUPPRESSION_ERROR_MESSAGES = {
  ROLE_NON_SUPPRIMABLE: 'Ce type de compte ne peut pas être supprimé directement — contactez le support MAKET.',
  SOLDE_NON_NUL: 'Retirez tout votre solde (principal et parrainage) avant de supprimer votre compte.',
  COMMANDES_EN_COURS: 'Vous avez un achat ou une vente en cours — attendez qu\'elle se termine (ou soit annulée) avant de supprimer votre compte.',
  COMPTE_GELE: 'Votre compte est temporairement bloqué pour vérification — contactez le support MAKET avant de le supprimer.',
};
function SupprimerCompteRow() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [modalOuvert, setModalOuvert] = useState(false);
  const [checking, setChecking] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [suppressing, setSuppressing] = useState(false);
  const hasPasswordProvider = user?.providerData?.some(p => p.providerId === 'password');

  const ouvrirModal = async () => {
    setChecking(true);
    try {
      await verifierEligibiliteSuppression(user.uid);
      setModalOuvert(true);
    } catch (e) {
      toast.error(SUPPRESSION_ERROR_MESSAGES[e.message] || 'Impossible de vérifier votre compte pour le moment.');
    } finally {
      setChecking(false);
    }
  };

  const confirmerSuppression = async () => {
    if (confirmation.trim().toUpperCase() !== 'SUPPRIMER') return;
    setErreur('');
    setSuppressing(true);
    try {
      if (hasPasswordProvider) await reauthentifierMotDePasse(motDePasse);
      else await reauthentifierGoogle();
      await supprimerCompte(user.uid);
      navigate('/');
    } catch (e) {
      setErreur(hasPasswordProvider ? 'Mot de passe incorrect' : 'La reconnexion Google a échoué — réessayez.');
    } finally {
      setSuppressing(false);
    }
  };

  return <>
    <button onClick={ouvrirModal} disabled={checking} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: 'white',
      borderRadius: 14, padding: '14px 16px', border: '1.5px solid #FCA5A5',
      cursor: checking ? 'default' : 'pointer', textAlign: 'left'
    }}>
      <div style={{ width: 38, height: 38, background: '#FEF2F2', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Trash2 style={{ width: 17, height: 17, color: '#DC2626' }} />
      </div>
      <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: '#DC2626', fontFamily: 'var(--font)' }}>
        {checking ? 'Vérification…' : 'Supprimer mon compte'}
      </span>
    </button>

    {modalOuvert && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ background: 'white', borderRadius: 20, padding: 24, maxWidth: 380, width: '100%' }}>
        <div style={{ width: 44, height: 44, background: '#FEF2F2', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <AlertTriangle style={{ width: 20, height: 20, color: '#DC2626' }} />
        </div>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Supprimer définitivement votre compte ?</h3>
        <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6, marginBottom: 16 }}>
          Cette action est irréversible. Votre profil sera anonymisé, vos annonces actives retirées, et vous ne pourrez plus vous reconnecter avec ce compte.
        </p>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>
          Tapez SUPPRIMER pour confirmer
        </label>
        <input type="text" value={confirmation} onChange={e => setConfirmation(e.target.value)} className="input-field" style={{ marginBottom: 12 }} autoFocus />
        {hasPasswordProvider && <>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>
            Confirmez avec votre mot de passe
          </label>
          <input type="password" value={motDePasse} onChange={e => setMotDePasse(e.target.value)} className="input-field" style={{ marginBottom: 8 }} />
        </>}
        {erreur && <p style={{ fontSize: 12, color: '#DC2626', marginBottom: 8 }}>{erreur}</p>}
        {!hasPasswordProvider && <p style={{ fontSize: 12, color: 'var(--text-4)', marginBottom: 8 }}>Une fenêtre Google s'ouvrira pour confirmer votre identité.</p>}
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button onClick={() => { setModalOuvert(false); setConfirmation(''); setMotDePasse(''); setErreur(''); }} className="btn-outline" style={{ flex: 1 }}>Annuler</button>
          <button
            onClick={confirmerSuppression}
            disabled={suppressing || confirmation.trim().toUpperCase() !== 'SUPPRIMER' || (hasPasswordProvider && !motDePasse)}
            style={{ flex: 1, background: '#DC2626', color: 'white', fontWeight: 700, borderRadius: 10, padding: '10px 0', border: 'none', opacity: (suppressing || confirmation.trim().toUpperCase() !== 'SUPPRIMER' || (hasPasswordProvider && !motDePasse)) ? 0.5 : 1, cursor: 'pointer' }}
          >
            {suppressing ? 'Suppression…' : 'Supprimer'}
          </button>
        </div>
      </motion.div>
    </div>}
  </>;
}
const MENU_ITEMS = [{
  to: '/mon-compte/profil',
  label: 'Modifier mon profil',
  icon: Edit2
}, {
  to: '/mon-compte/annonces',
  label: 'Mes annonces',
  icon: ShoppingBag
}, {
  to: '/mon-compte/vendeur-pro',
  label: 'Vendeur Pro',
  icon: Rocket,
  sub: 'Plus d\'annonces, commission réduite'
}, {
  to: '/mon-compte/ventes',
  label: 'Mes ventes',
  icon: TrendingUp
}, {
  to: '/mon-compte/achats',
  label: 'Mes achats',
  icon: ShoppingCart
}, {
  to: '/mon-compte/favoris',
  label: 'Mes favoris',
  icon: Heart
}, {
  to: '/mon-compte/abonnements',
  label: 'Mes abonnements',
  icon: Users,
  sub: 'Vendeurs que vous suivez'
}, {
  to: '/mon-compte/operations',
  label: 'Historique des opérations',
  icon: History,
  sub: 'Achats, ventes, remboursements, boosts…'
}, {
  to: '/wallet',
  label: 'Historique des transactions',
  icon: Wallet,
  sub: 'Dépôts et retraits'
}, {
  to: '/mon-compte/litiges',
  label: 'Mes litiges',
  icon: AlertCircle
}, {
  to: '/mon-compte/signalements',
  label: 'Mes signalements',
  icon: Flag
}, {
  to: '/mon-compte/alertes',
  label: 'Mes alertes de recherche',
  icon: BellPlus
}, {
  to: '/mon-compte/parrainage',
  label: 'Parrainage',
  icon: Gift
}, {
  to: '/mon-compte/cni',
  label: 'Vérification CNI',
  icon: BadgeCheck
}];
function AccountHome() {
  const {
    user,
    userProfile
  } = useAuth();
  const [mesAvis, setMesAvis] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef(null);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState(false);
  const photoMenuRef = useRef(null);
  useEffect(() => {
    if (!user) return;
    getAvisByUser(user.uid).then(setMesAvis).catch(e => console.error('getAvisByUser a échoué :', e));
  }, [user]);
  // #retour utilisateur : menu à trois points au lieu de deux boutons flottants
  // (caméra + croix) — se ferme au clic en dehors.
  useEffect(() => {
    if (!photoMenuOpen) return;
    const onClickOutside = e => {
      if (photoMenuRef.current && !photoMenuRef.current.contains(e.target)) setPhotoMenuOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [photoMenuOpen]);
  // Photo de profil (demande utilisateur) : facultative, visible par tout le
  // monde — réutilise le bucket "annonces" (déjà public, déjà validé par
  // secure-upload-url avec le préfixe {uid}/) plutôt que de créer un nouveau
  // bucket Storage. profils_publics/{uid}.photoURL est déjà librement
  // modifiable par le propriétaire (cf. firestore.rules), et déjà affiché sur
  // VendeurPage — aucune règle à changer, seulement l'UI d'upload.
  const handlePhotoChange = async e => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Choisissez une image (JPG, PNG ou WebP)');
      return;
    }
    setUploadingPhoto(true);
    try {
      const {
        publicUrl
      } = await uploadFile('annonces', `${user.uid}/avatar_${Date.now()}`, file);
      await updateDoc(doc(db, 'users', user.uid), {
        photoURL: publicUrl
      });
      await syncProfilPublic(user.uid, {
        photoURL: publicUrl
      });
      toast.success('Photo de profil mise à jour');
    } catch (err) {
      toast.error(err.message === 'TYPE_FICHIER_NON_AUTORISE' ? 'Format d\'image non supporté' : err.message === 'FICHIER_TROP_VOLUMINEUX' ? 'Image trop volumineuse (10 Mo max)' : 'Échec de l\'envoi de la photo');
    } finally {
      setUploadingPhoto(false);
    }
  };
  // #retour utilisateur : facultative implique aussi pouvoir la retirer, pas
  // seulement la changer. Le fichier Storage est aussi nettoyé (best-effort,
  // jamais bloquant) pour ne pas laisser d'anciennes photos orphelines.
  const handleRemovePhoto = async () => {
    setUploadingPhoto(true);
    try {
      const ancienUrl = userProfile?.photoURL;
      await updateDoc(doc(db, 'users', user.uid), {
        photoURL: ''
      });
      await syncProfilPublic(user.uid, {
        photoURL: ''
      });
      const marker = '/storage/v1/object/public/annonces/';
      const idx = ancienUrl?.indexOf(marker) ?? -1;
      if (idx !== -1) {
        deleteFile('annonces', decodeURIComponent(ancienUrl.slice(idx + marker.length))).catch(() => {});
      }
      toast.success('Photo de profil supprimée');
    } catch (err) {
      toast.error('Échec de la suppression');
    } finally {
      setUploadingPhoto(false);
    }
  };
  return <div style={{
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  }}>
      <h1 style={{
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 24,
      color: 'var(--ink)'
    }}>Mon compte</h1>

      {}
      <div style={{
      background: 'linear-gradient(135deg, #17337D, #2451C4)',
      borderRadius: 20,
      padding: 24,
      color: 'white'
    }}>
        <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        marginBottom: 20
      }}>
          <div style={{
          position: 'relative',
          width: 84,
          height: 84,
          flexShrink: 0
        }}>
            <div onClick={() => userProfile?.photoURL && setPhotoPreviewOpen(true)} style={{
            width: 84,
            height: 84,
            background: userProfile?.photoURL ? undefined : 'rgba(255,255,255,0.2)',
            borderRadius: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 30,
            color: 'white',
            border: '2px solid rgba(255,255,255,0.3)',
            overflow: 'hidden',
            cursor: userProfile?.photoURL ? 'pointer' : 'default'
          }}>
              {userProfile?.photoURL ? <img src={userProfile.photoURL} alt="Photo de profil" style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }} /> : userProfile?.prenom?.[0] || user?.email?.[0]?.toUpperCase()}
            </div>
            {}
            <div ref={photoMenuRef} style={{
            position: 'absolute',
            bottom: -4,
            right: -4
          }}>
              <button type="button" onClick={() => setPhotoMenuOpen(o => !o)} disabled={uploadingPhoto} title="Options de la photo de profil" style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'var(--primary-700, #2451C4)',
              border: '2px solid white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: uploadingPhoto ? 'default' : 'pointer',
              opacity: uploadingPhoto ? 0.6 : 1
            }}>
                <MoreVertical size={14} color="white" />
              </button>
              {photoMenuOpen && <div style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              background: 'white',
              borderRadius: 12,
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              overflow: 'hidden',
              minWidth: 200,
              zIndex: 30
            }}>
                  {userProfile?.photoURL && <button type="button" onClick={() => {
                setPhotoMenuOpen(false);
                setPhotoPreviewOpen(true);
              }} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '11px 14px',
                background: 'none',
                border: 'none',
                textAlign: 'left',
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--ink)',
                cursor: 'pointer'
              }}>
                      <Eye size={15} /> Voir la photo de profil
                    </button>}
                  <button type="button" onClick={() => {
                setPhotoMenuOpen(false);
                photoInputRef.current?.click();
              }} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '11px 14px',
                background: 'none',
                border: userProfile?.photoURL ? '1px solid var(--border, #eee)' : 'none',
                borderWidth: '1px 0 0 0',
                textAlign: 'left',
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--ink)',
                cursor: 'pointer'
              }}>
                    <Camera size={15} /> {userProfile?.photoURL ? 'Modifier la photo de profil' : 'Ajouter une photo de profil'}
                  </button>
                  {userProfile?.photoURL && <button type="button" onClick={() => {
                setPhotoMenuOpen(false);
                handleRemovePhoto();
              }} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '11px 14px',
                background: 'none',
                border: 'none',
                borderTop: '1px solid var(--border, #eee)',
                textAlign: 'left',
                fontSize: 14,
                fontWeight: 600,
                color: '#DC2626',
                cursor: 'pointer'
              }}>
                      <Trash2 size={15} /> Supprimer la photo de profil
                    </button>}
                </div>}
            </div>
            <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} style={{
            display: 'none'
          }} />
          </div>
          {photoPreviewOpen && userProfile?.photoURL && <div onClick={() => setPhotoPreviewOpen(false)} style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.82)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          cursor: 'zoom-out'
        }}>
              <button type="button" onClick={() => setPhotoPreviewOpen(false)} style={{
            position: 'absolute',
            top: 20,
            right: 20,
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}>
                <X size={20} color="white" />
              </button>
              <img src={userProfile.photoURL} alt="Photo de profil" onClick={e => e.stopPropagation()} style={{
            maxWidth: 'min(90vw, 480px)',
            maxHeight: '80vh',
            borderRadius: 16,
            objectFit: 'contain'
          }} />
            </div>}
          <div style={{
          flex: 1,
          minWidth: 0
        }}>
            <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
              <h2 style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 20,
              color: 'white'
            }}>{userProfile?.displayName || user?.email}</h2>
              {userProfile?.cniVerifie && <BadgeCheck style={{
              width: 18,
              height: 18,
              color: '#60A5FA'
            }} />}
            </div>
            <p style={{
            color: 'rgba(255,255,255,0.65)',
            fontSize: 13,
            marginTop: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>{user?.email}</p>
            <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            marginTop: 6
          }}>
              {mesAvis?.moyenne ? <>
                  {Array(5).fill(0).map((_, i) => <Star key={i} style={{
                width: 14,
                height: 14,
                fill: i < Math.round(mesAvis.moyenne) ? '#FCD34D' : 'transparent',
                color: i < Math.round(mesAvis.moyenne) ? '#FCD34D' : 'rgba(255,255,255,0.3)'
              }} />)}
                  <span style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.6)',
                marginLeft: 4
              }}>{mesAvis.moyenne}/5 ({mesAvis.total})</span>
                </> : <span style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.6)'
            }}>Pas encore d'avis</span>}
            </div>
          </div>
        </div>
        <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 1,
        background: 'rgba(255,255,255,0.1)',
        borderRadius: 14,
        overflow: 'hidden'
      }}>
          {[{
          val: userProfile?.totalVentes || 0,
          label: 'Ventes'
        }, {
          val: userProfile?.totalAchats || 0,
          label: 'Achats'
        }, {
          val: `${(userProfile?.soldeParrainage || 0).toLocaleString('fr-FR')}`,
          label: 'Parrainage'
        }].map((s, i) => <div key={i} style={{
          padding: '14px 8px',
          textAlign: 'center',
          background: 'rgba(255,255,255,0.08)'
        }}>
              <p style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 20,
            color: 'white'
          }}>{s.val}</p>
              <p style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.6)',
            marginTop: 2
          }}>{s.label}</p>
            </div>)}
        </div>
      </div>

      {/* #nouveau (demande utilisateur, "expliquer aux clients comment
          remonter leur score de fiabilité") : ce score n'était jusqu'ici
          visible nulle part — ni la valeur, ni ce qui la fait bouger. Reflète
          exactement le calcul réel (scoreFiabiliteService.js, maket-admin) :
          base 5, -1/litige perdu (max -3), -0,3/avertissement chat (max
          -1,5), +0,4 par point de moyenne d'avis au-dessus de 3, +0,3 si CNI
          vérifiée. Recalculé périodiquement par l'équipe MAKET (pas en temps
          réel), scoreFiabiliteCalculeAt l'indique. */}
      {typeof userProfile?.scoreFilabilite === 'number' && <div style={{
      background: 'white',
      borderRadius: 16,
      padding: 18,
      marginTop: 14,
      border: '1.5px solid #F1F5F9'
    }}>
          <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10
      }}>
            <p style={{
          fontWeight: 700,
          fontSize: 14,
          color: 'var(--ink)'
        }}>Mon score de fiabilité</p>
            <p style={{
          fontWeight: 800,
          fontSize: 18,
          color: '#F59E0B'
        }}>{userProfile.scoreFilabilite.toFixed(1)}/5</p>
          </div>
          <p style={{
        fontSize: 12,
        color: '#64748B',
        marginBottom: 10
      }}>
            Visible par les autres clients sur votre page vendeur. Recalculé périodiquement par l'équipe MAKET, pas en temps réel.
          </p>
          <ul style={{
        fontSize: 12,
        color: '#64748B',
        paddingLeft: 18,
        margin: 0,
        lineHeight: 1.7
      }}>
            <li>✅ Vérifiez votre CNI (+0,3)</li>
            <li>✅ Obtenez de bons avis après chaque vente (au-dessus de 3/5, chaque point compte)</li>
            <li>❌ Perdre un litige le fait baisser (jusqu'à -3 au total)</li>
            <li>❌ Un message bloqué par le filtre anti-contournement (numéro/lien partagé en chat) le fait baisser (jusqu'à -1,5 au total)</li>
          </ul>
        </div>}

      {}
      {!userProfile?.cniVerifie && <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      background: '#FFFBEB',
      border: '1.5px solid #FDE68A',
      borderRadius: 14,
      padding: 14
    }}>
          <AlertTriangle style={{
        width: 20,
        height: 20,
        color: '#D97706',
        flexShrink: 0
      }} />
          <div style={{
        flex: 1
      }}>
            <p style={{
          fontWeight: 700,
          fontSize: 13,
          color: '#92400E'
        }}>Identité non vérifiée</p>
            <p style={{
          fontSize: 12,
          color: '#B45309',
          marginTop: 2
        }}>Vérifiez votre CNI pour publier des annonces</p>
          </div>
          <Link to="/mon-compte/cni" style={{
        flexShrink: 0,
        background: '#D97706',
        color: 'white',
        fontSize: 12,
        fontWeight: 700,
        padding: '7px 14px',
        borderRadius: 10,
        textDecoration: 'none'
      }}>
            Vérifier →
          </Link>
        </div>}

      {}
      <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }}>
        {MENU_ITEMS.map(item => <MenuRow key={item.to} {...item} />)}
        <LogoutRow />
      </div>
    </div>;
}
function ModifierProfil() {
  const {
    user,
    userProfile,
    setUserProfile
  } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    pseudo: '',
    prenom: '',
    nom: '',
    ville: 'Yaoundé',
    quartier: '',
    boutiqueBio: '',
    numeroIdentiteNational: ''
  });
  const [saving, setSaving] = useState(false);
  const [autreQuartier, setAutreQuartier] = useState(false);
  const [autreVille, setAutreVille] = useState(false);
  const [settings, setSettings] = useState({});
  useEffect(() => {
    getSettings().then(setSettings);
  }, []);
  useEffect(() => {
    if (userProfile) setForm({
      pseudo: userProfile.pseudo || '',
      prenom: userProfile.prenom || '',
      nom: userProfile.nom || '',
      ville: userProfile.ville || 'Yaoundé',
      quartier: userProfile.quartier || '',
      boutiqueBio: userProfile.boutiqueBio || '',
      numeroIdentiteNational: userProfile.numeroIdentiteNational || ''
    });
  }, [userProfile]);
  const save = async () => {
    if (!form.pseudo.trim()) {
      toast.error('Le pseudo ne peut pas être vide');
      return;
    }
    setSaving(true);
    try {
      const maj = {
        ...form,
        pseudo: form.pseudo.trim(),
        displayName: `${form.prenom} ${form.nom}`
      };
      await updateDoc(doc(db, 'users', user.uid), {
        ...maj,
        updatedAt: new Date()
      });
      await syncProfilPublic(user.uid, maj);
      setUserProfile(p => ({
        ...p,
        ...maj
      }));
      setEditing(false);
      toast.success('Profil mis à jour !');
    } catch {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };
  return <div style={{
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  }}>
      <div style={{
      background: 'white',
      borderRadius: 16,
      border: '1.5px solid #F1F5F9',
      padding: 20
    }}>
        <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16
      }}>
          <h3 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 16,
          color: 'var(--ink)'
        }}>Informations personnelles</h3>
          {!editing ? <button onClick={() => setEditing(true)} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'none',
          border: '1.5px solid #E2E8F0',
          padding: '6px 12px',
          borderRadius: 10,
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 700,
          color: '#2451C4',
          fontFamily: 'var(--font)'
        }}>
              <Edit2 style={{
            width: 12,
            height: 12
          }} /> Modifier
            </button> : <div style={{
          display: 'flex',
          gap: 8
        }}>
              <button onClick={() => setEditing(false)} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'none',
            border: '1.5px solid #E2E8F0',
            padding: '6px 10px',
            borderRadius: 10,
            cursor: 'pointer',
            fontSize: 12,
            color: '#64748B',
            fontFamily: 'var(--font)'
          }}>
                <X style={{
              width: 12,
              height: 12
            }} /> Annuler
              </button>
              <button onClick={save} disabled={saving} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: '#2451C4',
            border: 'none',
            padding: '6px 12px',
            borderRadius: 10,
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 700,
            color: 'white',
            fontFamily: 'var(--font)'
          }}>
                <Save style={{
              width: 12,
              height: 12
            }} /> {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>}
        </div>

        <AnimatePresence mode="wait">
          {editing ? <motion.div key="edit" initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} exit={{
          opacity: 0
        }} style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
              <div>
                <label style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 700,
              color: '#64748B',
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
                  Pseudo (affiché aux autres membres — jamais votre vrai nom)
                </label>
                <input value={form.pseudo} onChange={e => setForm(f => ({
              ...f,
              pseudo: e.target.value.slice(0, 30)
            }))} className="input-field" style={{
              fontSize: 14
            }} placeholder="Ex : VendeurYaoundé" />
                <p style={{
              fontSize: 11,
              color: '#94A3B8',
              marginTop: 4
            }}>Visible en chat, sur vos annonces et votre profil vendeur. Votre nom réel n'est jamais partagé avec les autres clients — seul un livreur en charge d'une livraison le voit.</p>
              </div>
              <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10
          }}>
                <div>
                  <label style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 700,
                color: '#64748B',
                marginBottom: 6,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>Prénom</label>
                  <input value={form.prenom} onChange={e => setForm(f => ({
                ...f,
                prenom: e.target.value
              }))} className="input-field" style={{
                fontSize: 14
              }} />
                </div>
                <div>
                  <label style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 700,
                color: '#64748B',
                marginBottom: 6,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>Nom</label>
                  <input value={form.nom} onChange={e => setForm(f => ({
                ...f,
                nom: e.target.value
              }))} className="input-field" style={{
                fontSize: 14
              }} />
                </div>
              </div>
              <div>
                <label style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 700,
              color: '#64748B',
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>Ville</label>
                <select value={autreVille ? 'Autre ville' : form.ville} onChange={e => {
              const v = e.target.value;
              if (v === 'Autre ville') {
                setAutreVille(true);
                setForm(f => ({
                  ...f,
                  ville: '',
                  quartier: ''
                }));
              } else {
                setAutreVille(false);
                setForm(f => ({
                  ...f,
                  ville: v,
                  quartier: ''
                }));
              }
              setAutreQuartier(false);
            }} className="input-field" style={{
              fontSize: 14
            }}>
                  {getVillesFormulaire(settings).map(v => <option key={v}>{v}</option>)}
                </select>
                {autreVille && <input value={form.ville} onChange={e => setForm(f => ({
              ...f,
              ville: e.target.value
            }))} placeholder="Précisez le nom de votre ville" className="input-field mt-2" style={{
              fontSize: 14
            }} />}
              </div>
              <div>
                <label style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 700,
              color: '#64748B',
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>Quartier</label>
                {getQuartiersFormulaire(settings, form.ville) ? <>
                    <select value={autreQuartier ? 'Autre' : form.quartier} onChange={e => {
                if (e.target.value === 'Autre') {
                  setAutreQuartier(true);
                  setForm(f => ({
                    ...f,
                    quartier: ''
                  }));
                } else {
                  setAutreQuartier(false);
                  setForm(f => ({
                    ...f,
                    quartier: e.target.value
                  }));
                }
              }} className="input-field" style={{
                fontSize: 14
              }}>
                      <option value="">Sélectionner</option>
                      {getQuartiersFormulaire(settings, form.ville).map(q => <option key={q}>{q}</option>)}
                    </select>
                    {autreQuartier && <input value={form.quartier} onChange={e => setForm(f => ({
                ...f,
                quartier: e.target.value
              }))} placeholder="Précisez votre quartier" className="input-field" style={{
                fontSize: 14,
                marginTop: 8
              }} />}
                  </> : <input value={form.quartier} onChange={e => setForm(f => ({
              ...f,
              quartier: e.target.value
            }))} placeholder="Nom de votre quartier" className="input-field" style={{
              fontSize: 14
            }} />}
              </div>
              <div>
                <label style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 700,
              color: '#64748B',
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
                  Bio boutique (visible sur votre profil vendeur public)
                </label>
                <textarea value={form.boutiqueBio} onChange={e => setForm(f => ({
              ...f,
              boutiqueBio: e.target.value.slice(0, 150)
            }))} placeholder="Ex: Spécialiste électronique reconditionnée depuis 2023 — livraison rapide sur Yaoundé" className="input-field" style={{
              fontSize: 14,
              resize: 'none'
            }} rows={2} />
                <p style={{
              fontSize: 11,
              color: '#94A3B8',
              marginTop: 4
            }}>{form.boutiqueBio.length}/150</p>
              </div>
              <div>
                <label style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 700,
              color: '#64748B',
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
                  N° CNI (identifiant utilisé pour votre dossier médical, partagé entre tous vos établissements)
                </label>
                <input value={form.numeroIdentiteNational} onChange={e => setForm(f => ({
              ...f,
              numeroIdentiteNational: e.target.value
            }))} placeholder="Ex : 123456789" className="input-field" style={{
              fontSize: 14
            }} />
              </div>
            </motion.div> : <motion.div key="view" initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} exit={{
          opacity: 0
        }} style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 0
        }}>
              {[{
            label: 'Pseudo',
            value: userProfile?.pseudo,
            icon: User
          }, {
            label: 'Prénom',
            value: userProfile?.prenom,
            icon: User
          }, {
            label: 'Nom',
            value: userProfile?.nom,
            icon: User
          }, {
            label: 'Email',
            value: user?.email,
            icon: Mail
          }, {
            label: 'Ville',
            value: userProfile?.ville,
            icon: MapPin
          }, {
            label: 'Quartier',
            value: userProfile?.quartier || '—',
            icon: MapPin
          }, {
            label: 'Bio boutique',
            value: userProfile?.boutiqueBio || '—',
            icon: Edit2
          }, {
            label: 'N° CNI',
            value: userProfile?.numeroIdentiteNational || '—',
            icon: BadgeCheck
          }].map((item, i, arr) => <div key={item.label} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 0',
            borderBottom: i < arr.length - 1 ? '1px solid #F8FAFC' : 'none'
          }}>
                  <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
                    <item.icon style={{
                width: 14,
                height: 14,
                color: '#94A3B8'
              }} />
                    <span style={{
                fontSize: 13,
                color: '#94A3B8'
              }}>{item.label}</span>
                  </div>
                  <span style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--ink)'
            }}>{item.value || '—'}</span>
                </div>)}
            </motion.div>}
        </AnimatePresence>
      </div>
      <SupprimerCompteRow />
    </div>;
}
function MesAnnonces() {
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const [annonces, setAnnonces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState([]);
  const [boostAnnonce, setBoostAnnonce] = useState(null);
  const [deleteAnnonce, setDeleteAnnonce] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const reload = () => getAnnoncesByUser(user.uid).then(setAnnonces).catch(e => {
    console.error(e);
    toast.error('Impossible de charger vos annonces');
  }).finally(() => setLoading(false));
  useEffect(() => {
    reload();
  }, []);
  const handleSupprimer = async () => {
    if (!deleteAnnonce) return;
    setDeleting(true);
    try {
      await supprimerAnnoncePropre(deleteAnnonce.id);
      toast.success('Annonce supprimée');
      setDeleteAnnonce(null);
      setAnnonces(prev => prev.filter(x => x.id !== deleteAnnonce.id));
    } catch (e) {
      toast.error('Impossible de supprimer cette annonce.');
    } finally {
      setDeleting(false);
    }
  };
  const statutColors = {
    en_vente: {
      bg: '#F0FDF4',
      color: '#059669',
      label: 'En vente'
    },
    en_attente: {
      bg: '#FFFBEB',
      color: '#D97706',
      label: 'En attente'
    },
    // #nouveau (campagne de lancement) : validée par l'admin mais invisible
    // jusqu'à la révélation en masse — sans cette entrée, le statut brut
    // 'en_vente_lancement' s'affichait tel quel (repli statutColors[a.statut]
    // absent, label: a.statut).
    en_vente_lancement: {
      bg: '#EFF6FF',
      color: '#2451C4',
      label: 'Validée — lancement à venir'
    },
    vendu: {
      bg: '#EFF6FF',
      color: '#2451C4',
      label: 'Vendu'
    },
    expire: {
      bg: '#F8FAFC',
      color: '#94A3B8',
      label: 'Expiré'
    },
    refuse: {
      bg: '#FEF2F2',
      color: '#DC2626',
      label: 'Refusé'
    },
    reserve: {
      bg: '#F5F3FF',
      color: '#7C3AED',
      label: 'Réservé'
    }
  };
  const filtered = filter.length === 0 ? annonces : annonces.filter(a => filter.includes(a.statut));
  if (loading) return <div style={{
    textAlign: 'center',
    padding: 40,
    color: '#94A3B8',
    fontSize: 14
  }}>Chargement...</div>;
  return <div>
      <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16
    }}>
        <h3 style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: 18,
        color: 'var(--ink)'
      }}>Mes annonces ({annonces.length})</h3>
        <Link to="/publier" className="btn-primary" style={{
        fontSize: 12,
        padding: '8px 14px'
      }}>+ Publier</Link>
      </div>

      {}
      {annonces.length > 0 && <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 8,
      marginBottom: 16
    }}>
          <div style={{
        background: '#F8FAFC',
        border: '1.5px solid #F1F5F9',
        borderRadius: 12,
        padding: '10px 12px',
        textAlign: 'center'
      }}>
            <p style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 18,
          color: 'var(--ink)'
        }}>
              {annonces.reduce((s, a) => s + (a.vues || 0), 0)}
            </p>
            <p style={{
          fontSize: 11,
          color: '#94A3B8'
        }}>Vues totales</p>
          </div>
          <div style={{
        background: '#F8FAFC',
        border: '1.5px solid #F1F5F9',
        borderRadius: 12,
        padding: '10px 12px',
        textAlign: 'center'
      }}>
            <p style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 18,
          color: 'var(--ink)'
        }}>
              {annonces.reduce((s, a) => s + (a.favoris || 0), 0)}
            </p>
            <p style={{
          fontSize: 11,
          color: '#94A3B8'
        }}>Favoris reçus</p>
          </div>
          <div style={{
        background: '#F8FAFC',
        border: '1.5px solid #F1F5F9',
        borderRadius: 12,
        padding: '10px 12px',
        textAlign: 'center'
      }}>
            <p style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 18,
          color: 'var(--ink)'
        }}>
              {annonces.filter(a => a.statut === 'en_vente').length}
            </p>
            <p style={{
          fontSize: 11,
          color: '#94A3B8'
        }}>Actives</p>
          </div>
        </div>}

      {}
      <div style={{
      display: 'flex',
      gap: 6,
      overflow: 'auto',
      marginBottom: 16,
      paddingBottom: 4
    }} className="scrollbar-hide">
        <button onClick={() => setFilter([])} style={{
        flexShrink: 0,
        padding: '6px 12px',
        borderRadius: 20,
        border: 'none',
        cursor: 'pointer',
        background: filter.length === 0 ? '#2451C4' : '#F1F5F9',
        color: filter.length === 0 ? 'white' : '#64748B',
        fontSize: 12,
        fontWeight: 600,
        fontFamily: 'var(--font)',
        transition: 'all 0.15s'
      }}>Toutes</button>
        {[['en_vente', 'En vente'], ['en_attente', 'En attente'], ['refuse', 'Refusées'], ['vendu', 'Vendues'], ['reserve', 'Réservées']].map(([v, l]) => <button key={v} onClick={() => setFilter(filter.includes(v) ? filter.filter(f => f !== v) : [...filter, v])} style={{
        flexShrink: 0,
        padding: '6px 12px',
        borderRadius: 20,
        border: 'none',
        cursor: 'pointer',
        background: filter.includes(v) ? '#2451C4' : '#F1F5F9',
        color: filter.includes(v) ? 'white' : '#64748B',
        fontSize: 12,
        fontWeight: 600,
        fontFamily: 'var(--font)',
        transition: 'all 0.15s'
      }}>{l}</button>)}
      </div>

      {filtered.length === 0 ? <div style={{
      textAlign: 'center',
      padding: '48px 24px',
      background: '#F8FAFC',
      borderRadius: 16,
      border: '1.5px solid #F1F5F9'
    }}>
          <ShoppingBag style={{
        width: 40,
        height: 40,
        color: '#CBD5E1',
        margin: '0 auto 12px'
      }} />
          <p style={{
        color: '#64748B',
        fontWeight: 600,
        fontSize: 14
      }}>Aucune annonce</p>
          <Link to="/publier" className="btn-primary" style={{
        display: 'inline-flex',
        marginTop: 16,
        fontSize: 13
      }}>Publier mon premier article</Link>
        </div> : <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }}>
          {filtered.map((a, i) => {
        const s = statutColors[a.statut] || {
          bg: '#F8FAFC',
          color: '#64748B',
          label: a.statut
        };
        return <motion.div key={a.id} initial={{
          opacity: 0,
          y: 10
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: i * 0.04
        }} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          background: 'white',
          borderRadius: 14,
          padding: 14,
          border: '1.5px solid #F1F5F9',
          transition: 'all 0.2s'
        }} onMouseEnter={e => {
          e.currentTarget.style.borderColor = '#BFDBFE';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(26,86,219,0.08)';
        }} onMouseLeave={e => {
          e.currentTarget.style.borderColor = '#F1F5F9';
          e.currentTarget.style.boxShadow = 'none';
        }}>
                <div style={{
            width: 56,
            height: 56,
            borderRadius: 12,
            overflow: 'hidden',
            background: '#F8FAFC',
            flexShrink: 0
          }}>
                  {a.photos?.[0] ? <img src={a.photos[0]} alt={a.titre || ''} style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }} /> : <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22
            }}>📦</div>}
                </div>
                <div style={{
            flex: 1,
            minWidth: 0
          }}>
                  <p style={{
              fontWeight: 600,
              fontSize: 13,
              color: 'var(--ink)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>{a.titre}</p>
                  <p style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 15,
              color: '#2451C4',
              margin: '2px 0'
            }}>{a.prix?.toLocaleString()} XAF</p>
                  <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
                    <span style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 20,
                background: s.bg,
                color: s.color
              }}>{s.label}</span>
                    <span style={{
                fontSize: 11,
                color: '#94A3B8'
              }}>{a.vues || 0} vues · {a.favoris || 0} favoris</span>
                  </div>
                  {a.statut === 'refuse' && a.motifRejet && <p style={{
              fontSize: 11,
              color: '#DC2626',
              marginTop: 4
            }}>Motif : {a.motifRejet}</p>}
                  {(a.boost || a.flash) && <div style={{
              display: 'flex',
              gap: 4,
              marginTop: 4
            }}>
                      {a.boost && <span style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 8,
                background: '#EFF6FF',
                color: '#2451C4'
              }}>🚀 Boost</span>}
                      {a.flash && <span style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 8,
                background: '#FFFBEB',
                color: '#D97706'
              }}>⚡ Flash</span>}
                    </div>}
                </div>
                <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
                  {a.statut === 'en_vente' && <button onClick={e => {
              e.preventDefault();
              setBoostAnnonce(a);
            }} title="Booster / Flash" style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#2451C4',
              padding: 4
            }}>
                      <Rocket style={{
                width: 16,
                height: 16
              }} />
                    </button>}
                  {}
                  {(a.statut === 'en_vente' || a.statut === 'en_attente') && <button onClick={e => {
              e.preventDefault();
              navigate(`/publier/${a.id}`);
            }} title="Modifier l'annonce" style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#2451C4',
              padding: 4
            }}>
                      <Edit2 style={{
                width: 16,
                height: 16
              }} />
                    </button>}
                  {a.statut === 'en_vente' && <button onClick={e => {
              e.preventDefault();
              setDeleteAnnonce(a);
            }} title="Supprimer" style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#DC2626',
              padding: 4
            }}>
                      <Trash2 style={{
                width: 16,
                height: 16
              }} />
                    </button>}
                  <button onClick={async e => {
              e.preventDefault();
              try {
                if (a.masquee) {
                  await demasquerAnnonce(a.id);
                } else {
                  await masquerAnnonce(a.id);
                }
                setAnnonces(prev => prev.map(x => x.id === a.id ? {
                  ...x,
                  masquee: !x.masquee
                } : x));
                toast.success(a.masquee ? 'Annonce visible' : 'Annonce masquée');
              } catch (err) {
                console.error('masquerAnnonce/demasquerAnnonce a échoué :', err);
                toast.error('Impossible de modifier la visibilité de cette annonce.');
              }
            }} title={a.masquee ? 'Rendre visible' : 'Masquer'} style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: a.masquee ? '#94A3B8' : '#2451C4',
              padding: 4
            }}>
                    {a.masquee ? <EyeOff style={{
                width: 16,
                height: 16
              }} /> : <Eye style={{
                width: 16,
                height: 16
              }} />}
                  </button>
                  <Link to={`/annonce/${a.id}`} style={{
              color: '#94A3B8',
              textDecoration: 'none',
              flexShrink: 0
            }}>
                    <ChevronRight style={{
                width: 18,
                height: 18
              }} />
                  </Link>
                </div>
              </motion.div>;
      })}
        </div>}

      {boostAnnonce && <BoostModal annonce={boostAnnonce} onClose={() => setBoostAnnonce(null)} onDone={() => {
      setBoostAnnonce(null);
      reload();
    }} />}

      {deleteAnnonce && <ConfirmDialog title={`Supprimer "${deleteAnnonce.titre}" ?`} description="Cette action est définitive. L'annonce ne sera plus visible dans le catalogue." confirmLabel={deleting ? 'Suppression…' : 'Supprimer'} onConfirm={handleSupprimer} onCancel={() => setDeleteAnnonce(null)} />}
    </div>;
}
function MesVentes() {
  const {
    user,
    userProfile
  } = useAuth();
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    commissionVenteDefaut: COMMISSION_VENTE,
    commissionVenteParCategorie: {}
  });
  const [netsReels, setNetsReels] = useState({});
  useEffect(() => {
    getCommandesVendeur(user.uid).then(setCommandes).catch(e => {
      console.error('getCommandesVendeur a échoué :', e);
      toast.error('Impossible de charger vos ventes');
    }).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    getSettings().then(setSettings);
  }, []);
  useEffect(() => {
    getOperations(user.uid).then(ops => {
      const map = {};
      ops.filter(o => o.type === WALLET_TYPES.VENTE && o.commandeId).forEach(o => {
        map[o.commandeId] = o.montant || 0;
      });
      setNetsReels(map);
    }).catch(() => {});
  }, []);
  const netDe = c => c.id in netsReels ? netsReels[c.id] : (c.montant || 0) * (1 - getTauxCommissionVendeur(settings, c.categorie, userProfile));
  const statutStyle = s => ({
    termine: {
      bg: '#F0FDF4',
      color: '#059669'
    },
    litige: {
      bg: '#FEF2F2',
      color: '#DC2626'
    },
    annule: {
      bg: '#F8FAFC',
      color: '#94A3B8'
    }
  })[s] || {
    bg: '#EFF6FF',
    color: '#2451C4'
  };
  if (loading) return <div style={{
    textAlign: 'center',
    padding: 40,
    color: '#94A3B8',
    fontSize: 14
  }}>Chargement...</div>;
  return <div>
      <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20
    }}>
        <h3 style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: 18,
        color: 'var(--ink)'
      }}>Mes ventes ({commandes.length})</h3>
        {commandes.length > 0 && <div style={{
        background: '#F0FDF4',
        border: '1.5px solid #BBF7D0',
        borderRadius: 12,
        padding: '6px 14px'
      }}>
            <p style={{
          fontSize: 12,
          fontWeight: 700,
          color: '#059669'
        }}>
              Reçu net : {Math.round(commandes.filter(c => c.statut === 'termine').reduce((s, c) => s + netDe(c), 0)).toLocaleString()} XAF
            </p>
            <p style={{
          fontSize: 10,
          color: '#059669',
          opacity: 0.75
        }}>Commission MAKET déjà déduite (taux selon catégorie)</p>
          </div>}
      </div>
      {commandes.length === 0 ? <div style={{
      textAlign: 'center',
      padding: '48px 24px',
      background: '#F8FAFC',
      borderRadius: 16,
      border: '1.5px solid #F1F5F9'
    }}>
          <TrendingUp style={{
        width: 40,
        height: 40,
        color: '#CBD5E1',
        margin: '0 auto 12px'
      }} />
          <p style={{
        color: '#64748B',
        fontWeight: 600,
        fontSize: 14
      }}>Aucune vente pour le moment</p>
          <p style={{
        color: '#94A3B8',
        fontSize: 13,
        marginTop: 4
      }}>Publiez des annonces pour commencer à vendre</p>
          <Link to="/publier" className="btn-primary" style={{
        display: 'inline-flex',
        marginTop: 16,
        fontSize: 13
      }}>Publier un article</Link>
        </div> : <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }}>
          {commandes.map((c, i) => {
        const ss = statutStyle(c.statut);
        return <Link key={c.id} to={`/commande/${c.id}`} style={{
          textDecoration: 'none'
        }}>
                <motion.div initial={{
            opacity: 0,
            y: 10
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            delay: i * 0.04
          }} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            background: 'white',
            borderRadius: 14,
            padding: 14,
            border: '1.5px solid #F1F5F9',
            transition: 'all 0.2s',
            cursor: 'pointer'
          }} onMouseEnter={e => {
            e.currentTarget.style.borderColor = '#BFDBFE';
            e.currentTarget.style.transform = 'translateX(4px)';
          }} onMouseLeave={e => {
            e.currentTarget.style.borderColor = '#F1F5F9';
            e.currentTarget.style.transform = 'translateX(0)';
          }}>
                  <div style={{
              width: 40,
              height: 40,
              background: ss.bg,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
                    <TrendingUp style={{
                width: 18,
                height: 18,
                color: ss.color
              }} />
                  </div>
                  <div style={{
              flex: 1
            }}>
                    <p style={{
                fontWeight: 600,
                fontSize: 13,
                color: 'var(--ink)'
              }}>Commande #{c.id?.slice(0, 8).toUpperCase()}</p>
                    <p style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 15,
                color: '#2451C4'
              }}>
                      {Math.round(netDe(c)).toLocaleString()} XAF
                      <span style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: '#94A3B8'
                }}> net</span>
                    </p>
                    <span style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 20,
                background: ss.bg,
                color: ss.color
              }}>{STATUT_LABELS[c.statut] || c.statut}</span>
                  </div>
                  <ChevronRight style={{
              width: 16,
              height: 16,
              color: '#94A3B8'
            }} />
                </motion.div>
              </Link>;
      })}
        </div>}
    </div>;
}
function MesAchats() {
  const {
    user
  } = useAuth();
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [avisMap, setAvisMap] = useState({});
  const [avisTarget, setAvisTarget] = useState(null);
  const [avisNote, setAvisNote] = useState(0);
  const [avisCommentaire, setAvisCommentaire] = useState('');
  const [avisLoading, setAvisLoading] = useState(false);
  useEffect(() => {
    getCommandesAcheteur(user.uid).then(async list => {
      setCommandes(list);
      const termines = list.filter(c => c.statut === 'termine');
      const entries = await Promise.all(termines.map(async c => [c.id, await hasAvisLeft(c.id, user.uid).catch(() => false)]));
      setAvisMap(Object.fromEntries(entries));
    }).catch(e => {
      console.error('getCommandesAcheteur a échoué :', e);
      toast.error('Impossible de charger vos achats');
    }).finally(() => setLoading(false));
  }, []);
  const statutStyle = s => ({
    termine: {
      bg: '#F0FDF4',
      color: '#059669',
      icon: CheckCircle
    },
    litige: {
      bg: '#FEF2F2',
      color: '#DC2626',
      icon: AlertCircle
    },
    annule: {
      bg: '#F8FAFC',
      color: '#94A3B8',
      icon: X
    },
    en_route: {
      bg: '#EFF6FF',
      color: '#2451C4',
      icon: Package
    }
  })[s] || {
    bg: '#FFFBEB',
    color: '#D97706',
    icon: Clock
  };
  const submitAvis = async () => {
    if (avisNote < 1) {
      toast.error('Sélectionnez une note');
      return;
    }
    setAvisLoading(true);
    try {
      await laisserAvis(avisTarget.id, user.uid, avisTarget.vendeurId, avisNote, avisCommentaire);
      toast.success('Avis publié, merci !');
      setAvisMap(m => ({
        ...m,
        [avisTarget.id]: true
      }));
      setAvisTarget(null);
      setAvisNote(0);
      setAvisCommentaire('');
    } catch (e) {
      toast.error(e.message || 'Erreur');
    } finally {
      setAvisLoading(false);
    }
  };
  if (loading) return <div style={{
    textAlign: 'center',
    padding: 40,
    color: '#94A3B8',
    fontSize: 14
  }}>Chargement...</div>;
  return <div>
      <h3 style={{
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 18,
      color: 'var(--ink)',
      marginBottom: 20
    }}>Mes achats ({commandes.length})</h3>
      {commandes.length === 0 ? <div style={{
      textAlign: 'center',
      padding: '48px 24px',
      background: '#F8FAFC',
      borderRadius: 16,
      border: '1.5px solid #F1F5F9'
    }}>
          <ShoppingCart style={{
        width: 40,
        height: 40,
        color: '#CBD5E1',
        margin: '0 auto 12px'
      }} />
          <p style={{
        color: '#64748B',
        fontWeight: 600,
        fontSize: 14
      }}>Aucun achat pour le moment</p>
          <Link to="/catalogue" className="btn-primary" style={{
        display: 'inline-flex',
        marginTop: 16,
        fontSize: 13
      }}>Explorer les articles</Link>
        </div> : <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }}>
          {commandes.map((c, i) => {
        const ss = statutStyle(c.statut);
        const dejaAvis = avisMap[c.id];
        return <motion.div key={c.id} initial={{
          opacity: 0,
          y: 10
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: i * 0.04
        }} style={{
          background: 'white',
          borderRadius: 14,
          padding: 14,
          border: '1.5px solid #F1F5F9'
        }}>
                <Link to={`/commande/${c.id}`} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            textDecoration: 'none'
          }}>
                  <div style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              overflow: 'hidden',
              background: '#F8FAFC',
              flexShrink: 0
            }}>
                    {c.photoAnnonce ? <img src={c.photoAnnonce} alt={c.titreAnnonce || ''} style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }} /> : <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22
              }}>📦</div>}
                  </div>
                  <div style={{
              flex: 1,
              minWidth: 0
            }}>
                    <p style={{
                fontWeight: 600,
                fontSize: 13,
                color: 'var(--ink)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>{c.titreAnnonce || 'Article'}</p>
                    <p style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 15,
                color: '#2451C4',
                margin: '2px 0'
              }}>{c.montant?.toLocaleString()} XAF</p>
                    <span style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 20,
                background: ss.bg,
                color: ss.color
              }}>{STATUT_LABELS[c.statut] || c.statut}</span>
                  </div>
                  <ChevronRight style={{
              width: 16,
              height: 16,
              color: '#94A3B8',
              flexShrink: 0
            }} />
                </Link>
                {c.statut === 'termine' && (dejaAvis ? <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 10,
            paddingTop: 10,
            borderTop: '1px solid #F8FAFC',
            color: '#94A3B8',
            fontSize: 12,
            fontWeight: 600
          }}>
                      <Check style={{
              width: 13,
              height: 13
            }} /> Avis envoyé, merci !
                    </div> : <button onClick={() => {
            setAvisTarget(c);
            setAvisNote(0);
            setAvisCommentaire('');
          }} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 10,
            paddingTop: 10,
            borderTop: '1px solid #F8FAFC',
            width: '100%',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#D97706',
            fontSize: 12,
            fontWeight: 700,
            fontFamily: 'var(--font)'
          }}>
                      <Star style={{
              width: 13,
              height: 13
            }} /> Laisser un avis sur le vendeur
                    </button>)}
              </motion.div>;
      })}
        </div>}

      {avisTarget && <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.6)',
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16
    }} onClick={() => setAvisTarget(null)}>
          <motion.div initial={{
        opacity: 0,
        scale: 0.95
      }} animate={{
        opacity: 1,
        scale: 1
      }} onClick={e => e.stopPropagation()} style={{
        background: 'white',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 420,
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
            <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 16
        }}>
              <div style={{
            width: 40,
            height: 40,
            background: '#FFFBEB',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
                <Star style={{
              width: 18,
              height: 18,
              color: '#D97706'
            }} />
              </div>
              <div>
                <p style={{
              fontWeight: 800,
              fontSize: 15,
              color: 'var(--ink)',
              fontFamily: 'var(--font-display)'
            }}>Laisser un avis au vendeur</p>
                <p style={{
              fontSize: 12,
              color: '#94A3B8'
            }}>{avisTarget.titreAnnonce}</p>
              </div>
            </div>

            <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginBottom: 16
        }}>
              {[1, 2, 3, 4, 5].map(n => <button key={n} onClick={() => setAvisNote(n)} type="button" style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0
          }}>
                  <Star style={{
              width: 32,
              height: 32,
              color: n <= avisNote ? '#F59E0B' : '#E4E4E2'
            }} fill={n <= avisNote ? '#F59E0B' : 'none'} />
                </button>)}
            </div>

            <textarea value={avisCommentaire} onChange={e => setAvisCommentaire(e.target.value)} placeholder="Votre commentaire (optionnel)" rows={3} className="input-field input-field--square" style={{
          fontSize: 13,
          width: '100%'
        }} maxLength={500} />

            <div style={{
          display: 'flex',
          gap: 10,
          marginTop: 16
        }}>
              <button onClick={() => setAvisTarget(null)} className="btn-outline" style={{
            flex: 1,
            justifyContent: 'center',
            fontSize: 13,
            padding: '10px 0'
          }}>Annuler</button>
              <button onClick={submitAvis} disabled={avisLoading} className="btn-primary" style={{
            flex: 1,
            justifyContent: 'center',
            fontSize: 13,
            padding: '10px 0'
          }}>
                {avisLoading ? 'Envoi…' : 'Publier l\'avis'}
              </button>
            </div>
          </motion.div>
        </div>}
    </div>;
}
function MesFavoris() {
  const {
    user
  } = useAuth();
  const [annonces, setAnnonces] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const load = async () => {
      try {
        const favs = await getFavoris(user.uid);
        const details = await Promise.all(favs.map(f => getAnnonceById(f.annonceId).catch(() => null)));
        setAnnonces(details.filter(Boolean));
      } catch (e) {
        console.error('Erreur chargement favoris :', e);
        toast.error('Impossible de charger vos favoris');
        setAnnonces([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);
  return <div>
      <h3 style={{
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 18,
      color: 'var(--ink)',
      marginBottom: 20
    }}>Mes favoris ({annonces.length})</h3>
      {loading ? <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array(6).fill(0).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div> : annonces.length === 0 ? <div style={{
      textAlign: 'center',
      padding: '48px 24px',
      background: '#F8FAFC',
      borderRadius: 16,
      border: '1.5px solid #F1F5F9'
    }}>
          <Heart style={{
        width: 40,
        height: 40,
        color: '#CBD5E1',
        margin: '0 auto 12px'
      }} />
          <p style={{
        color: '#64748B',
        fontWeight: 600,
        fontSize: 14
      }}>Aucun article en favori</p>
          <p style={{
        color: '#94A3B8',
        fontSize: 13,
        marginTop: 4
      }}>Cliquez sur ❤️ sur une annonce pour l'ajouter</p>
          <Link to="/catalogue" className="btn-primary" style={{
        display: 'inline-flex',
        marginTop: 16,
        fontSize: 13
      }}>Explorer les articles</Link>
        </div> : <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {annonces.map((a, i) => <ProductCard key={a.id} annonce={a} index={i} initialLiked />)}
        </div>}
    </div>;
}
// #nouveau (demande utilisateur, "suivre un vendeur") : même charpente que
// MesFavoris juste au-dessus, mais les "objets" suivis sont des vendeurs
// (profils_publics), pas des annonces — chargés en Promise.all comme
// getAnnonceById l'est pour les favoris.
function MesAbonnements() {
  const {
    user
  } = useAuth();
  const [vendeurs, setVendeurs] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const load = async () => {
      try {
        const abonnements = await getAbonnements(user.uid);
        const details = await Promise.all(abonnements.map(async a => {
          const snap = await getDoc(doc(db, 'profils_publics', a.vendeurId)).catch(() => null);
          return snap?.exists() ? {
            id: a.vendeurId,
            ...snap.data()
          } : null;
        }));
        setVendeurs(details.filter(Boolean));
      } catch (e) {
        console.error('Erreur chargement abonnements :', e);
        toast.error('Impossible de charger vos abonnements');
        setVendeurs([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);
  const handleUnfollow = async vendeurId => {
    try {
      await toggleSuivi(user.uid, vendeurId);
      setVendeurs(v => v.filter(x => x.id !== vendeurId));
    } catch (e) {
      console.error('Désabonnement échoué :', e);
      toast.error('Une erreur est survenue');
    }
  };
  return <div>
      <h3 style={{
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 18,
      color: 'var(--ink)',
      marginBottom: 20
    }}>Mes abonnements ({vendeurs.length})</h3>
      {loading ? <div className="space-y-2">{Array(4).fill(0).map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div> : vendeurs.length === 0 ? <div style={{
      textAlign: 'center',
      padding: '48px 24px',
      background: '#F8FAFC',
      borderRadius: 16,
      border: '1.5px solid #F1F5F9'
    }}>
          <Users style={{
        width: 40,
        height: 40,
        color: '#CBD5E1',
        margin: '0 auto 12px'
      }} />
          <p style={{
        color: '#64748B',
        fontWeight: 600,
        fontSize: 14
      }}>Vous ne suivez encore aucun vendeur</p>
          <p style={{
        color: '#94A3B8',
        fontSize: 13,
        marginTop: 4
      }}>Cliquez sur "Suivre" sur la page d'un vendeur pour être notifié de ses nouvelles annonces</p>
          <Link to="/catalogue" className="btn-primary" style={{
        display: 'inline-flex',
        marginTop: 16,
        fontSize: 13
      }}>Explorer les articles</Link>
        </div> : <div className="space-y-2">
          {vendeurs.map(v => <div key={v.id} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-gray-100" style={{
        boxShadow: 'var(--shadow-sm)'
      }}>
              <Link to={`/vendeur/${v.id}`} style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          flexShrink: 0,
          background: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 700,
          overflow: 'hidden'
        }}>
                {v.photoURL ? <img src={v.photoURL} alt={v.pseudo || 'Vendeur'} style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }} /> : v.pseudo?.[0] || '?'}
              </Link>
              <Link to={`/vendeur/${v.id}`} className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{v.pseudo || 'Vendeur MAKET'}</p>
                <p className="text-xs text-gray-400">{v.totalVentes || 0} vente{(v.totalVentes || 0) !== 1 ? 's' : ''}{v.ville ? ` · ${v.ville}` : ''}</p>
              </Link>
              <button onClick={() => handleUnfollow(v.id)} className="text-xs font-bold flex-shrink-0" style={{
          color: 'var(--ink-3)',
          border: '1.5px solid var(--bg-3)',
          borderRadius: 20,
          padding: '6px 12px'
        }}>
                Ne plus suivre
              </button>
            </div>)}
        </div>}
    </div>;
}
const OPERATION_META = {
  [WALLET_TYPES.ACHAT]: {
    icon: ShoppingCart,
    color: '#DC2626',
    bg: '#FEF2F2',
    label: 'Achat'
  },
  [WALLET_TYPES.VENTE]: {
    icon: TrendingUp,
    color: '#059669',
    bg: '#F0FDF4',
    label: 'Vente'
  },
  [WALLET_TYPES.REMBOURSEMENT]: {
    icon: ArrowDownLeft,
    color: '#059669',
    bg: '#F0FDF4',
    label: 'Remboursement'
  },
  // FAIBLE (audit, corrigé) : type distinct de WALLET_TYPES.REMBOURSEMENT
  // ('remboursement_commande') — écrit par resoudreLitige (maket-admin), qui
  // utilise sa PROPRE constante WALLET_TYPES.REMBOURSEMENT (='remboursement_litige',
  // différente de celle-ci) quand un litige est tranché en faveur de l'acheteur.
  // Absent d'ici, ce remboursement retombait sur le libellé brut "remboursement_litige"
  // dans l'historique du client (aucun souci financier, juste un affichage peu clair).
  remboursement_litige: {
    icon: ArrowDownLeft,
    color: '#059669',
    bg: '#F0FDF4',
    label: 'Remboursement (litige)'
  },
  [WALLET_TYPES.BOOST]: {
    icon: Rocket,
    color: '#2451C4',
    bg: '#EFF6FF',
    label: 'Boost annonce'
  },
  [WALLET_TYPES.FLASH]: {
    icon: Zap,
    color: '#D97706',
    bg: '#FFFBEB',
    label: 'Flash annonce'
  },
  [WALLET_TYPES.CREDIT_PARRAINAGE]: {
    icon: Gift,
    color: '#7C3AED',
    bg: '#F5F3FF',
    label: 'Solde de parrainage'
  },
  // #nouveau (audit wallet, corrigé) : absents d'ici, ces 3 types retombaient
  // sur l'icône horloge grise générique — la description reste toujours
  // correcte (chaque écrivain la fixe), seule l'icône/couleur était incohérente
  // avec le reste de l'historique.
  [WALLET_TYPES.TRANSFERT_PARRAINAGE]: {
    icon: ArrowLeftRight,
    color: '#7C3AED',
    bg: '#F5F3FF',
    label: 'Transfert de parrainage'
  },
  [WALLET_TYPES.LIVRAISON]: {
    icon: Truck,
    color: '#059669',
    bg: '#F0FDF4',
    label: 'Livraison'
  },
  [WALLET_TYPES.ACHAT_LIVRAISON]: {
    icon: Truck,
    color: '#DC2626',
    bg: '#FEF2F2',
    label: 'Frais de livraison'
  }
};
function HistoriqueOperations() {
  const {
    user
  } = useAuth();
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);
  // #nouveau (demande utilisateur, "cliquable pour plus de détails, ne coupe
  // plus les informations") : la description était tronquée en une ligne
  // (ellipsis) — désormais entièrement visible (retour à la ligne), et un
  // clic déplie en plus l'heure exacte et les identifiants de provenance
  // (commande, commission MAKET) quand ils existent.
  const [expandedId, setExpandedId] = useState(null);
  useEffect(() => {
    getOperations(user.uid).then(setOperations).catch(e => {
      console.error('getOperations a échoué :', e);
      toast.error('Impossible de charger l\'historique');
    }).finally(() => setLoading(false));
  }, []);
  if (loading) return <div style={{
    textAlign: 'center',
    padding: 40,
    color: '#94A3B8',
    fontSize: 14
  }}>Chargement...</div>;
  return <div>
      <h3 style={{
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 18,
      color: 'var(--ink)',
      marginBottom: 8
    }}>Historique des opérations ({operations.length})</h3>
      <p style={{
      fontSize: 12,
      color: '#94A3B8',
      marginBottom: 20
    }}>Achats, ventes, remboursements, boosts, inscription, parrainage — hors dépôts/retraits (voir Mon Wallet).</p>
      {operations.length === 0 ? <div style={{
      textAlign: 'center',
      padding: '48px 24px',
      background: '#F8FAFC',
      borderRadius: 16,
      border: '1.5px solid #F1F5F9'
    }}>
          <History style={{
        width: 40,
        height: 40,
        color: '#CBD5E1',
        margin: '0 auto 12px'
      }} />
          <p style={{
        color: '#64748B',
        fontWeight: 600,
        fontSize: 14
      }}>Aucune opération pour le moment</p>
        </div> : <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }}>
          {operations.map((op, i) => {
        const meta = OPERATION_META[op.type] || {
          icon: Clock,
          color: '#94A3B8',
          bg: '#F8FAFC',
          label: op.type
        };
        const Icon = meta.icon;
        const pos = op.montant > 0;
        const expanded = expandedId === op.id;
        const dateObj = op.createdAt?.toDate?.();
        return <motion.div key={op.id} initial={{
          opacity: 0,
          y: 8
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: i * 0.03
        }} onClick={() => setExpandedId(expanded ? null : op.id)} style={{
          background: 'white',
          borderRadius: 14,
          padding: 12,
          border: '1.5px solid #F1F5F9',
          cursor: 'pointer'
        }}>
                <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
                  <div style={{
              width: 38,
              height: 38,
              background: meta.bg,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
                    <Icon style={{
                width: 16,
                height: 16,
                color: meta.color
              }} />
                  </div>
                  <div style={{
              flex: 1,
              minWidth: 0
            }}>
                    <p style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--ink)',
                overflowWrap: 'break-word'
              }}>{op.description || meta.label}</p>
                    <p style={{
                fontSize: 11,
                color: '#94A3B8',
                marginTop: 1
              }}>{dateObj?.toLocaleDateString('fr-FR') || '—'}</p>
                  </div>
                  <p style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 13,
              color: pos ? '#059669' : '#DC2626',
              flexShrink: 0
            }}>
                    {pos ? '+' : ''}{op.montant?.toLocaleString()} XAF
                  </p>
                  <ChevronDown style={{
              width: 16,
              height: 16,
              color: '#CBD5E1',
              flexShrink: 0,
              transform: expanded ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.15s'
            }} />
                </div>
                {expanded && <div style={{
            marginTop: 10,
            paddingTop: 10,
            borderTop: '1px solid #F1F5F9',
            fontSize: 12,
            color: '#64748B',
            display: 'flex',
            flexDirection: 'column',
            gap: 4
          }}>
                    <p>Type : {meta.label}</p>
                    <p>Date et heure : {dateObj ? dateObj.toLocaleString('fr-FR') : '—'}</p>
                    {op.commandeId && <p>Commande : #{op.commandeId.slice(0, 8).toUpperCase()}</p>}
                    {typeof op.commissionMaket === 'number' && <p>Commission MAKET : {op.commissionMaket.toLocaleString()} XAF</p>}
                    {/* #bug (corrigé, audit) : 'bonus' retombait sur "Solde principal" faute d'être reconnu */}
                    {op.sourceWallet && <p>Portefeuille : {op.sourceWallet === 'parrainage' ? 'Solde de parrainage' : op.sourceWallet === 'bonus' ? 'Solde bonus' : 'Solde principal'}</p>}
                  </div>}
              </motion.div>;
      })}
        </div>}
    </div>;
}
function MesLitiges() {
  const {
    user
  } = useAuth();
  const [litiges, setLitiges] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getLitigesByUser(user.uid).then(async rows => {
      setLitiges(rows);
      const avecPreuves = rows.filter(l => l.preuveUrls?.length);
      if (avecPreuves.length === 0) return;
      const resolues = await Promise.all(avecPreuves.map(l => resoudreUrlsLitige(l.id, l.preuveUrls).then(urls => [l.id, urls])));
      const parId = new Map(resolues);
      setLitiges(prev => prev.map(l => parId.has(l.id) ? {
        ...l,
        preuveUrls: parId.get(l.id)
      } : l));
    }).catch(e => {
      console.error('Erreur chargement litiges :', e);
      toast.error('Impossible de charger vos litiges');
    }).finally(() => setLoading(false));
  }, []);
  const statutStyle = (s, estAcheteurDeCeLitige) => ({
    ouvert: {
      bg: '#FFFBEB',
      color: '#D97706',
      label: 'En cours d\'examen'
    },
    resolu_acheteur: estAcheteurDeCeLitige ? {
      bg: '#F0FDF4',
      color: '#059669',
      label: 'Résolu en votre faveur'
    } : {
      bg: '#FEF2F2',
      color: '#DC2626',
      label: 'Résolu en faveur de l\'acheteur'
    },
    resolu_vendeur: estAcheteurDeCeLitige ? {
      bg: '#FEF2F2',
      color: '#DC2626',
      label: 'Résolu en faveur du vendeur'
    } : {
      bg: '#F0FDF4',
      color: '#059669',
      label: 'Résolu en votre faveur'
    },
    rejete: {
      bg: '#FEF2F2',
      color: '#DC2626',
      label: 'Rejeté'
    }
  })[s] || {
    bg: '#F8FAFC',
    color: '#94A3B8',
    label: s
  };
  if (loading) return <div style={{
    textAlign: 'center',
    padding: 40,
    color: '#94A3B8',
    fontSize: 14
  }}>Chargement...</div>;
  return <div>
      <h3 style={{
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 18,
      color: 'var(--ink)',
      marginBottom: 20
    }}>Mes litiges ({litiges.length})</h3>
      {litiges.length === 0 ? <div style={{
      textAlign: 'center',
      padding: '48px 24px',
      background: '#F8FAFC',
      borderRadius: 16,
      border: '1.5px solid #F1F5F9'
    }}>
          <AlertCircle style={{
        width: 40,
        height: 40,
        color: '#CBD5E1',
        margin: '0 auto 12px'
      }} />
          <p style={{
        color: '#64748B',
        fontWeight: 600,
        fontSize: 14
      }}>Aucun litige ouvert</p>
          <p style={{
        color: '#94A3B8',
        fontSize: 13,
        marginTop: 4
      }}>Vous pouvez ouvrir un litige depuis une commande livrée</p>
        </div> : <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }}>
          {litiges.map((l, i) => {
        const ss = statutStyle(l.statut, l.acheteurId === user.uid);
        return <Link key={l.id} to={`/commande/${l.commandeId}`} style={{
          textDecoration: 'none'
        }}>
                <motion.div initial={{
            opacity: 0,
            y: 10
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            delay: i * 0.04
          }} style={{
            background: 'white',
            borderRadius: 14,
            padding: 16,
            border: '1.5px solid #F1F5F9',
            transition: 'all 0.2s',
            cursor: 'pointer'
          }} onMouseEnter={e => {
            e.currentTarget.style.borderColor = '#BFDBFE';
          }} onMouseLeave={e => {
            e.currentTarget.style.borderColor = '#F1F5F9';
          }}>
                  <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 8
            }}>
                    <p style={{
                fontWeight: 700,
                fontSize: 13,
                color: 'var(--ink)'
              }}>Litige #{l.id?.slice(0, 8).toUpperCase()}</p>
                    <span style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: 20,
                background: ss.bg,
                color: ss.color
              }}>{ss.label}</span>
                  </div>
                  <p style={{
              fontSize: 13,
              color: '#64748B',
              marginBottom: 8
            }}>{l.raison}</p>
                  <div style={{
              display: 'flex',
              gap: 8,
              overflow: 'auto'
            }} className="scrollbar-hide">
                    {l.preuveUrls?.slice(0, 3).map((url, j) => <img key={j} src={url} alt={`Preuve litige ${j + 1}`} style={{
                width: 48,
                height: 48,
                borderRadius: 8,
                objectFit: 'cover',
                flexShrink: 0
              }} />)}
                  </div>
                </motion.div>
              </Link>;
      })}
        </div>}
    </div>;
}
function MesSignalements() {
  const {
    user
  } = useAuth();
  const [signalements, setSignalements] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getSignalementsByUser(user.uid).then(setSignalements).catch(e => {
      console.error('Erreur chargement signalements :', e);
      toast.error('Impossible de charger vos signalements');
    }).finally(() => setLoading(false));
  }, []);
  if (loading) return <div style={{
    textAlign: 'center',
    padding: 40,
    color: '#94A3B8',
    fontSize: 14
  }}>Chargement...</div>;
  return <div>
      <h3 style={{
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 18,
      color: 'var(--ink)',
      marginBottom: 20
    }}>Mes signalements ({signalements.length})</h3>
      {signalements.length === 0 ? <div style={{
      textAlign: 'center',
      padding: '48px 24px',
      background: '#F8FAFC',
      borderRadius: 16,
      border: '1.5px solid #F1F5F9'
    }}>
          <Flag style={{
        width: 40,
        height: 40,
        color: '#CBD5E1',
        margin: '0 auto 12px'
      }} />
          <p style={{
        color: '#64748B',
        fontWeight: 600,
        fontSize: 14
      }}>Aucun signalement envoyé</p>
        </div> : <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }}>
          {signalements.map((s, i) => <Link key={s.id} to={`/annonce/${s.annonceId}`} style={{
        textDecoration: 'none'
      }}>
              <motion.div initial={{
          opacity: 0,
          y: 10
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: i * 0.04
        }} style={{
          background: 'white',
          borderRadius: 14,
          padding: 16,
          border: '1.5px solid #F1F5F9'
        }}>
                <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 6
          }}>
                  <p style={{
              fontWeight: 700,
              fontSize: 13,
              color: 'var(--ink)'
            }}>Annonce #{s.annonceId?.slice(0, 8).toUpperCase()}</p>
                  <span style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: 20,
              background: s.traite ? '#F0FDF4' : '#FFFBEB',
              color: s.traite ? '#059669' : '#D97706'
            }}>
                    {s.traite ? 'Traité' : 'En cours d\'examen'}
                  </span>
                </div>
                <p style={{
            fontSize: 13,
            color: '#64748B'
          }}>{s.raison}</p>
              </motion.div>
            </Link>)}
        </div>}
    </div>;
}
function MesAlertes() {
  const {
    user
  } = useAuth();
  const [categories, setCategories] = useState([]);
  const [alertes, setAlertes] = useState([]);
  const [loading, setLoading] = useState(true);
  const reload = () => getAlertesByUser(user.uid).then(setAlertes).catch(e => {
    console.error(e);
    toast.error('Impossible de charger vos alertes');
  }).finally(() => setLoading(false));
  useEffect(() => {
    reload();
    getCategories().then(setCategories).catch(() => {});
  }, []);
  const handleSupprimer = async id => {
    try {
      await supprimerAlerteRecherche(id);
      setAlertes(a => a.filter(al => al.id !== id));
      toast.success('Alerte supprimée');
    } catch (e) {
      toast.error(e.message || 'Erreur');
    }
  };
  if (loading) return <div style={{
    textAlign: 'center',
    padding: 40,
    color: '#94A3B8',
    fontSize: 14
  }}>Chargement...</div>;
  return <div>
      <h3 style={{
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 18,
      color: 'var(--ink)',
      marginBottom: 6
    }}>Mes alertes de recherche ({alertes.length})</h3>
      <p style={{
      fontSize: 13,
      color: '#94A3B8',
      marginBottom: 20
    }}>Créées depuis le catalogue — vous êtes notifié quand une nouvelle annonce correspond.</p>
      {alertes.length === 0 ? <div style={{
      textAlign: 'center',
      padding: '48px 24px',
      background: '#F8FAFC',
      borderRadius: 16,
      border: '1.5px solid #F1F5F9'
    }}>
          <BellPlus style={{
        width: 40,
        height: 40,
        color: '#CBD5E1',
        margin: '0 auto 12px'
      }} />
          <p style={{
        color: '#64748B',
        fontWeight: 600,
        fontSize: 14
      }}>Aucune alerte créée</p>
          <Link to="/catalogue" className="btn-primary" style={{
        display: 'inline-flex',
        marginTop: 16,
        fontSize: 13
      }}>Explorer le catalogue</Link>
        </div> : <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }}>
          {alertes.map(al => <div key={al.id} style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'white',
        borderRadius: 14,
        padding: 14,
        border: '1.5px solid #F1F5F9'
      }}>
              <div>
                {al.categorie && <span style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--ink)'
          }}>{categories.find(c => c.id === al.categorie)?.label || al.categorie}</span>}
                {al.motCle && <span style={{
            fontSize: 13,
            color: '#64748B',
            marginLeft: al.categorie ? 6 : 0
          }}>{al.categorie ? `· "${al.motCle}"` : `"${al.motCle}"`}</span>}
              </div>
              <button onClick={() => handleSupprimer(al.id)} style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#94A3B8',
          padding: 4
        }}>
                <Trash2 style={{
            width: 16,
            height: 16
          }} />
              </button>
            </div>)}
        </div>}
    </div>;
}
function Parrainage() {
  const {
    user,
    userProfile,
    setUserProfile
  } = useAuth();
  const [copied, setCopied] = useState(false);
  const backfilling = useRef(false);
  const [settings, setSettings] = useState({});
  const [wallet, setWallet] = useState({
    soldeParrainage: 0
  });
  useEffect(() => {
    getSettings().then(setSettings);
  }, []);
  useEffect(() => {
    const unsub = listenWallet(user.uid, setWallet);
    return unsub;
  }, [user.uid]);
  useEffect(() => {
    if (!user || !userProfile || userProfile.referralCode || backfilling.current) return;
    backfilling.current = true;
    const code = generateReferralCode();
    updateDoc(doc(db, 'users', user.uid), {
      referralCode: code
    }).then(() => setUserProfile(p => ({
      ...p,
      referralCode: code
    }))).catch(e => console.error('Backfill referralCode a échoué :', e)).finally(() => {
      backfilling.current = false;
    });
  }, [user, userProfile]);
  const copy = async () => {
    if (!userProfile?.referralCode) {
      toast.error('Code non disponible pour le moment, réessayez dans un instant');
      return;
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(userProfile.referralCode);
      } else {
        const el = document.createElement('textarea');
        el.value = userProfile.referralCode;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopied(true);
      toast.success('Code copié !');
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Copie du code échouée :', e);
      toast.error('Impossible de copier automatiquement — sélectionnez le code manuellement');
    }
  };
  const shareWA = () => {
    if (!userProfile?.referralCode) {
      toast.error('Code non disponible pour le moment, réessayez dans un instant');
      return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(buildInvitationWhatsApp(userProfile.referralCode))}`, '_blank');
  };
  return <div style={{
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  }}>
      <div style={{
      background: 'linear-gradient(135deg, #17337D, #2451C4)',
      borderRadius: 20,
      padding: 24,
      textAlign: 'center'
    }}>
        <Gift style={{
        width: 32,
        height: 32,
        color: 'rgba(255,255,255,0.8)',
        margin: '0 auto 12px'
      }} />
        <h3 style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 800,
        fontSize: 20,
        color: 'white',
        marginBottom: 6
      }}>Mon code de parrainage</h3>
        <p style={{
        color: 'rgba(255,255,255,0.65)',
        fontSize: 13,
        marginBottom: 16
      }}>Partagez et gagnez {settings.pourcentageCommissionParrain ?? 100}% de la commission MAKET sur les {settings.nombreVentesRecompensees ?? 3} premières ventes de chaque filleul</p>
        <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: 'rgba(255,255,255,0.12)',
        borderRadius: 14,
        padding: '12px 16px',
        maxWidth: 240,
        margin: '0 auto 16px'
      }}>
          <span style={{
          flex: 1,
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 26,
          color: 'white',
          letterSpacing: '4px',
          textAlign: 'center'
        }}>
            {userProfile?.referralCode || '------'}
          </span>
          <button onClick={copy} style={{
          width: 32,
          height: 32,
          background: 'white',
          borderRadius: 8,
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
            {copied ? <Check style={{
            width: 14,
            height: 14,
            color: '#10B981'
          }} /> : <Copy style={{
            width: 14,
            height: 14,
            color: '#2451C4'
          }} />}
          </button>
        </div>
        <div style={{
        display: 'flex',
        gap: 8,
        justifyContent: 'center'
      }}>
          <button onClick={copy} style={{
          background: 'rgba(255,255,255,0.15)',
          color: 'white',
          border: '1.5px solid rgba(255,255,255,0.25)',
          padding: '8px 14px',
          borderRadius: 10,
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: 'var(--font)'
        }}>
            Copier le code
          </button>
          <button onClick={shareWA} style={{
          background: '#25D366',
          color: 'white',
          border: 'none',
          padding: '8px 14px',
          borderRadius: 10,
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: 'var(--font)'
        }}>
            📲 WhatsApp
          </button>
        </div>
      </div>

      <div style={{
      background: 'white',
      borderRadius: 16,
      border: '1.5px solid #F1F5F9',
      padding: 20
    }}>
        <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
          <p style={{
          fontWeight: 700,
          fontSize: 14,
          color: 'var(--ink)'
        }}>Mon solde de parrainage</p>
          <p style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 20,
          color: '#7C3AED'
        }}>{(wallet.soldeParrainage || 0).toLocaleString('fr-FR')} XAF</p>
        </div>
        <p style={{
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 6
      }}>
          Plafond d'annonces en vente actuel : {(userProfile?.limiteAnnoncesVente ?? settings.limiteAnnoncesVenteBase ?? 10).toLocaleString('fr-FR')}. Transférable vers votre solde principal depuis votre Wallet.
        </p>
      </div>

      <div style={{
      background: '#F8FAFC',
      borderRadius: 14,
      padding: 16,
      border: '1.5px solid #F1F5F9'
    }}>
        <p style={{
        fontWeight: 700,
        fontSize: 13,
        color: 'var(--ink)',
        marginBottom: 10
      }}>Comment ça marche</p>
        {[{
        num: '1',
        text: 'Partagez votre code à vos amis'
      }, {
        num: '2',
        text: `Votre filleul bénéficie d'une commission réduite sur ses ${settings.nombreVentesReduitesFilleul} premières ventes`
      }, {
        num: '3',
        text: `Dès sa 1ʳᵉ vente réelle, votre plafond d'annonces en vente augmente de +${settings.limiteAnnoncesParFilleulQualifie ?? 2} (une fois par filleul)`
      }, {
        num: '4',
        text: `Vous recevez ${settings.pourcentageCommissionParrain ?? 100}% de la commission MAKET sur ses ${settings.nombreVentesRecompensees ?? 3} premières ventes réelles — transférable vers votre solde principal`
      }].map((s, i) => <div key={i} style={{
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        marginBottom: i < 3 ? 8 : 0
      }}>
            <span style={{
          width: 22,
          height: 22,
          background: '#2451C4',
          color: 'white',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 800,
          flexShrink: 0
        }}>{s.num}</span>
            <span style={{
          fontSize: 13,
          color: '#64748B',
          lineHeight: 1.5
        }}>{s.text}</span>
          </div>)}
      </div>
    </div>;
}
function VendeurPro() {
  const { user, userProfile, setUserProfile } = useAuth();
  const [settings, setSettings] = useState({});
  const [buying, setBuying] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  useEffect(() => {
    getSettings().then(setSettings);
  }, []);
  const actif = estVendeurProActif(userProfile);
  const expiry = userProfile?.vendeurProExpiry?.toDate?.();
  const prix = settings.vendeurProPrix ?? 5000;
  const dureeJours = settings.vendeurProDureeJours ?? 30;
  const reductionCommission = settings.vendeurProReductionCommission ?? 2;
  const bonusAnnonces = settings.vendeurProLimiteAnnoncesBonus ?? 10;
  const reductionBoost = settings.vendeurProReductionBoost ?? 50;

  const acheter = async () => {
    setShowConfirm(false);
    setBuying(true);
    try {
      const nouvelleExpiry = await acheterVendeurPro(user.uid);
      setUserProfile(p => ({ ...p, vendeurProExpiry: { toDate: () => nouvelleExpiry } }));
      toast.success(actif ? 'Pass Vendeur Pro prolongé !' : 'Vendeur Pro activé !');
    } catch (e) {
      const messages = {
        ROLE_NON_ELIGIBLE: 'Ce type de compte ne peut pas activer Vendeur Pro.',
        CNI_NON_VERIFIEE: 'Vérifiez votre CNI avant d\'activer Vendeur Pro.',
        SOLDE_INSUFFISANT: `Solde insuffisant — il vous faut ${prix.toLocaleString('fr-FR')} XAF.`,
        COMPTE_INTROUVABLE: 'Compte introuvable.',
      };
      toast.error(messages[e.message] || 'Erreur — réessayez dans quelques instants');
    } finally {
      setBuying(false);
    }
  };

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <div style={{
      background: 'linear-gradient(135deg, #7C2D12, #EA580C)',
      borderRadius: 20, padding: 24, textAlign: 'center', color: 'white'
    }}>
      <Rocket style={{ width: 32, height: 32, margin: '0 auto 10px' }} />
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Vendeur Pro</h2>
      {actif ? <p style={{ fontSize: 13, opacity: 0.9 }}>Actif jusqu'au {expiry?.toLocaleDateString('fr-FR')}</p>
        : <p style={{ fontSize: 13, opacity: 0.9 }}>Vendez plus, payez moins de commission</p>}
    </div>

    <div style={{ background: 'white', borderRadius: 16, border: '1.5px solid #F1F5F9', padding: 20 }}>
      <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', marginBottom: 12 }}>Avantages pendant {dureeJours} jours</p>
      {[
        { icon: '📦', text: `+${bonusAnnonces} annonces en vente simultanées` },
        { icon: '💰', text: `-${reductionCommission} points de commission sur vos ventes` },
        { icon: '⚡', text: 'Chaque nouvelle annonce publiée sort automatiquement en Flash pendant 24h, gratuitement' },
        { icon: '🚀', text: `-${reductionBoost}% sur tous vos boosts payants` },
        { icon: '📈', text: 'Priorité de tri même sans boost, devant les annonces non-Pro' },
        { icon: '✨', text: 'Badge "Vendeur Pro" visible sur votre profil et vos annonces' },
      ].map((a, i, arr) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < arr.length - 1 ? '1px solid #F8FAFC' : 'none' }}>
        <span style={{ fontSize: 18 }}>{a.icon}</span>
        <span style={{ fontSize: 13, color: '#475569' }}>{a.text}</span>
      </div>)}
    </div>

    <div style={{ background: '#FFF7ED', borderRadius: 16, border: '1.5px solid #FED7AA', padding: 20, textAlign: 'center' }}>
      <p style={{ fontSize: 12, color: '#9A3412', marginBottom: 4 }}>{actif ? 'Prolonger de' : 'Prix pour'} {dureeJours} jours</p>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: '#7C2D12', marginBottom: 14 }}>{prix.toLocaleString('fr-FR')} XAF</p>
      <button onClick={() => setShowConfirm(true)} disabled={buying} style={{
        background: '#EA580C', color: 'white', border: 'none', borderRadius: 12,
        padding: '12px 24px', fontWeight: 700, fontSize: 14, cursor: buying ? 'default' : 'pointer', width: '100%'
      }}>
        {buying ? 'Traitement…' : actif ? 'Prolonger mon pass' : 'Activer Vendeur Pro'}
      </button>
      {actif && <p style={{ fontSize: 11, color: '#9A3412', marginTop: 8 }}>Prolonge automatiquement depuis votre date d'expiration actuelle — aucun jour perdu.</p>}
    </div>
    {showConfirm && <ConfirmDialog
      title={actif ? 'Confirmer la prolongation ?' : 'Confirmer l\'activation ?'}
      description={`Vous allez dépenser ${prix.toLocaleString('fr-FR')} XAF depuis votre solde principal pour ${actif ? 'prolonger' : 'activer'} Vendeur Pro (${dureeJours} jours).`}
      confirmLabel="Confirmer et payer"
      accentColor="#EA580C"
      onConfirm={acheter}
      onCancel={() => setShowConfirm(false)}
    />}
  </div>;
}
export default function MonComptePage() {
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);
  if (!user) return null;
  return <div style={{
    maxWidth: 640,
    margin: '0 auto',
    padding: '28px 20px 48px'
  }}>
      <Routes>
        <Route index element={<AccountHome />} />
        <Route path="profil" element={<SectionPage><ModifierProfil /></SectionPage>} />
        <Route path="annonces" element={<SectionPage><MesAnnonces /></SectionPage>} />
        <Route path="ventes" element={<SectionPage><MesVentes /></SectionPage>} />
        <Route path="achats" element={<SectionPage><MesAchats /></SectionPage>} />
        <Route path="favoris" element={<SectionPage><MesFavoris /></SectionPage>} />
        <Route path="abonnements" element={<SectionPage><MesAbonnements /></SectionPage>} />
        <Route path="operations" element={<SectionPage><HistoriqueOperations /></SectionPage>} />
        <Route path="litiges" element={<SectionPage><MesLitiges /></SectionPage>} />
        <Route path="signalements" element={<SectionPage><MesSignalements /></SectionPage>} />
        <Route path="alertes" element={<SectionPage><MesAlertes /></SectionPage>} />
        <Route path="parrainage" element={<SectionPage><Parrainage /></SectionPage>} />
        <Route path="vendeur-pro" element={<SectionPage><VendeurPro /></SectionPage>} />
      </Routes>
    </div>;
}
