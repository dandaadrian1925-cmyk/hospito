import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, Routes, Route } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Heart, Shield, Bell, Eye, ChevronRight, ChevronLeft, Edit2, Save, X, MapPin, Mail, AlertTriangle, LogOut, Flag, Trash2, Camera, MoreVertical, BadgeCheck, CalendarPlus, FolderHeart, CreditCard, KeyRound, FlaskConical, Pill, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { uploadFile, deleteFile } from '../supabase/config';
import { logout, verifierEligibiliteSuppression, reauthentifierMotDePasse, reauthentifierGoogle, supprimerCompte, resetPassword } from '../services/authService';
import { syncProfilPublic } from '../services/profilPublicService';
import { getSettings, getVillesFormulaire, getQuartiersFormulaire } from '../services/settingsService';
import { getTraitementsEnCours } from '../services/examensPatientService';
import { getMesRendezVousAVenir } from '../services/demandesRendezVousService';
import { listerMesFichesParCni } from '../services/prochesService';
import { notifierPersonnel } from '../services/notificationsService';
import RendezVousPage from './moncompte/RendezVousPage';
import RendezVousDetailPage from './moncompte/RendezVousDetailPage';
import ProchesPage from './moncompte/ProchesPage';
import DossierPage from './moncompte/DossierPage';
import DossierAccessGate from '../components/common/DossierAccessGate';
import FacturesPage from './moncompte/FacturesPage';
import ReclamationsPage from './moncompte/ReclamationsPage';
import ExamensPage from './moncompte/ExamensPage';
import toast from 'react-hot-toast';

function SectionPage({ children }) {
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
function MenuRow({ to, label, icon: Icon, sub }) {
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
        color: '#2FB4A0'
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
// irréversible.
const SUPPRESSION_ERROR_MESSAGES = {
  ROLE_NON_SUPPRIMABLE: 'Ce type de compte ne peut pas être supprimé directement — contactez le support HostoConnect.',
  SOLDE_NON_NUL: 'Retirez tout solde restant avant de supprimer votre compte.',
  COMMANDES_EN_COURS: 'Une opération est encore en cours — attendez qu\'elle se termine avant de supprimer votre compte.',
  COMPTE_GELE: 'Votre compte est temporairement bloqué pour vérification — contactez le support HostoConnect avant de le supprimer.',
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
      // #nouveau (demande utilisateur, "partout où on demande un email et un
      // mot de passe, vider les champs après une tentative").
      setMotDePasse('');
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
          Cette action est irréversible. Votre profil sera anonymisé et vous ne pourrez plus vous reconnecter avec ce compte.
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
  to: '/mon-compte/rendez-vous',
  label: 'Mes rendez-vous',
  icon: CalendarPlus
}, {
  to: '/mon-compte/proches',
  label: 'Mes proches',
  icon: Users,
  sub: 'Bébé, personne âgée — gérés depuis votre compte'
}, {
  to: '/mon-compte/dossier',
  label: 'Mon dossier médical',
  icon: FolderHeart
}, {
  to: '/mon-compte/examens',
  label: 'Pharmacie & examens',
  icon: FlaskConical
}, {
  to: '/mon-compte/factures',
  label: 'Mes factures',
  icon: CreditCard
}, {
  to: '/mon-compte/reclamations',
  label: 'Mes réclamations',
  icon: Flag
}, {
  to: '/mes-favoris',
  label: 'Mes établissements favoris',
  icon: Heart
}, {
  to: '/mes-droits',
  label: 'Mes droits',
  icon: Shield,
  sub: 'Accès, rectification et suppression de vos données'
}, {
  to: '/urgence',
  label: "Fiche d'urgence",
  icon: AlertTriangle,
  sub: 'Groupe sanguin, allergies — disponible hors connexion'
}, {
  to: '/notifications',
  label: 'Notifications',
  icon: Bell
}];
function AccountHome() {
  const {
    user,
    userProfile
  } = useAuth();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef(null);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState(false);
  const photoMenuRef = useRef(null);
  const [traitements, setTraitements] = useState([]);
  const [rdvAVenir, setRdvAVenir] = useState([]);
  useEffect(() => {
    if (!user) return;
    getTraitementsEnCours(user.uid).then(setTraitements).catch(() => setTraitements([]));
    getMesRendezVousAVenir(user.uid).then(setRdvAVenir).catch(() => setRdvAVenir([]));
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
  // Photo de profil (demande utilisateur) : facultative, visible par le
  // personnel des établissements suivis — réutilise le bucket "annonces"
  // (déjà public, déjà validé par secure-upload-url avec le préfixe {uid}/).
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
      background: 'linear-gradient(135deg, #174858, #2FB4A0)',
      borderRadius: 20,
      padding: 24,
      color: 'white'
    }}>
        <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16
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
              background: 'var(--primary-700, #2FB4A0)',
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
          </div>
        </div>
      </div>

      {/* #retiré (décision utilisateur, "retirer cette validation à la
          plateforme et l'accorder à chaque établissement") : la
          vérification CNI à distance (recto/verso/selfie, jamais examinée
          côté Hospito) est abandonnée au profit de celle déjà faite EN
          PERSONNE par le personnel d'un établissement (cf.
          DossierMedicalView.jsx, qui vérifie désormais directement patients/
          {id}.cniStatut) — ce bandeau n'a donc plus de destination utile. */}

      {rdvAVenir.length > 0 && <div style={{
      background: '#F0FDF4',
      border: '1.5px solid #A7F3D0',
      borderRadius: 14,
      padding: '14px 16px'
    }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <CalendarPlus style={{ width: 16, height: 16, color: '#059669', flexShrink: 0 }} />
            <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>Rendez-vous à venir — rappel</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {rdvAVenir.map(d => <p key={d.id} style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
              <strong>{d.dateHeure.toDate().toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}</strong>
              {d.serviceNom ? ` — ${d.serviceNom}` : ''}{d.medecinNom ? ` (Dr ${d.medecinNom})` : ''}
            </p>)}
          </div>
        </div>}

      {traitements.length > 0 && <div style={{
      background: '#EFF6FF',
      border: '1.5px solid #BFDBFE',
      borderRadius: 14,
      padding: '14px 16px'
    }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Pill style={{ width: 16, height: 16, color: 'var(--blue)', flexShrink: 0 }} />
            <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>Traitement(s) en cours — rappel</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {traitements.map(t => <p key={t.id} style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
              <strong>{t.nom}</strong> — {t.dose} {t.frequence ? `· ${t.frequence}` : ''}
            </p>)}
          </div>
          <p style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 8 }}>Poursuivez votre traitement selon la prescription de votre médecin.</p>
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
    prenom: '',
    nom: '',
    ville: 'Yaoundé',
    quartier: '',
    numeroIdentiteNational: ''
  });
  const [saving, setSaving] = useState(false);
  const [autreQuartier, setAutreQuartier] = useState(false);
  const [autreVille, setAutreVille] = useState(false);
  const [settings, setSettings] = useState({});
  const [envoiReset, setEnvoiReset] = useState(false);
  const hasPasswordProvider = user?.providerData?.some(p => p.providerId === 'password');
  useEffect(() => {
    getSettings().then(setSettings);
  }, []);
  useEffect(() => {
    if (userProfile) setForm({
      prenom: userProfile.prenom || '',
      nom: userProfile.nom || '',
      ville: userProfile.ville || 'Yaoundé',
      quartier: userProfile.quartier || '',
      numeroIdentiteNational: userProfile.numeroIdentiteNational || ''
    });
  }, [userProfile]);
  const save = async () => {
    if (!form.prenom.trim() || !form.nom.trim()) {
      toast.error('Prénom et nom sont obligatoires');
      return;
    }
    setSaving(true);
    try {
      const maj = {
        ...form,
        displayName: `${form.prenom} ${form.nom}`
      };
      // #bug CRITIQUE (corrigé, audit croisé règles/code) : `updatedAt` n'est
      // pas dans la liste hasOnly de la règle users.update — hasOnly rejette
      // TOUT l'écrit dès qu'un seul champ dépasse, donc CETTE sauvegarde de
      // profil échouait silencieusement à chaque tentative (catch générique
      // masquait l'erreur réelle). Champ retiré : aucun autre code ne lit
      // users/{uid}.updatedAt, `lastActiveAt` sert déjà cet usage.
      await updateDoc(doc(db, 'users', user.uid), maj);
      await syncProfilPublic(user.uid, maj);
      // #nouveau (retour utilisateur, "modifier mon compte ne fait rien ? le
      // nom ne change pas chez les autres comptes médecin, accueil...") :
      // ce compte (users/{uid}) et la fiche administrative de chaque
      // établissement (patients/{id}) sont deux documents indépendants —
      // changer son nom ici ne peut jamais réécrire une fiche déjà vérifiée
      // par du personnel. On prévient chaque établissement concerné pour
      // qu'IL décide de mettre à jour ou non, plutôt que de le faire
      // unilatéralement à la place du patient.
      const nomAChange = userProfile?.prenom !== form.prenom || userProfile?.nom !== form.nom;
      if (nomAChange && form.numeroIdentiteNational) {
        listerMesFichesParCni(form.numeroIdentiteNational).then((fiches) => {
          fiches
            .filter((f) => f.nom !== form.nom || f.prenom !== form.prenom)
            .forEach((f) => notifierPersonnel(f.etablissementId, ['accueil', 'admin'], {
              type: 'patient', titre: 'Nom du patient mis à jour dans son compte',
              message: `${f.prenom || ''} ${f.nom || ''} a changé son nom en "${form.prenom} ${form.nom}" dans son compte HostoConnect — vérifiez et mettez à jour sa fiche si nécessaire.`,
              // #nouveau (retour utilisateur, "la notification arrive quand
              // même [mais rien n'est modifié]") : sans lien, un admin
              // recevait l'alerte sans aucun moyen direct d'agir dessus —
              // devait retrouver la fiche lui-même. hospito-accueil-medecin
              // n'a pas de page /patients équivalente (cf. Sidebar.jsx) : ce
              // lien reste sans effet pour un compte accueil, jamais pire
              // qu'avant (aucun lien du tout).
              link: `/patients/${f.id}`,
            }));
        }).catch((e) => console.warn('Notification du personnel (changement de nom) échouée :', e.message));
      }
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
  const envoyerResetMotDePasse = async () => {
    setEnvoiReset(true);
    try {
      await resetPassword(user.email);
      toast.success('Email de réinitialisation envoyé');
    } catch {
      toast.error("Échec de l'envoi de l'email");
    } finally {
      setEnvoiReset(false);
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
          color: '#2FB4A0',
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
            background: '#2FB4A0',
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
              <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))',
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

      {hasPasswordProvider && <button onClick={envoyerResetMotDePasse} disabled={envoiReset} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: 'white',
      borderRadius: 14, padding: '14px 16px', border: '1.5px solid #F1F5F9',
      cursor: envoiReset ? 'default' : 'pointer', textAlign: 'left'
    }}>
        <div style={{ width: 38, height: 38, background: '#EFF6FF', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <KeyRound style={{ width: 17, height: 17, color: '#2FB4A0' }} />
        </div>
        <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font)' }}>
          {envoiReset ? 'Envoi…' : 'Réinitialiser mon mot de passe'}
        </span>
      </button>}

      <SupprimerCompteRow />
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
        <Route path="rendez-vous" element={<SectionPage><RendezVousPage /></SectionPage>} />
        <Route path="rendez-vous/:demandeId" element={<RendezVousDetailPage />} />
        <Route path="proches" element={<SectionPage><ProchesPage /></SectionPage>} />
        <Route path="dossier" element={<SectionPage><DossierAccessGate><DossierPage /></DossierAccessGate></SectionPage>} />
        <Route path="examens" element={<SectionPage><ExamensPage /></SectionPage>} />
        <Route path="factures" element={<SectionPage><FacturesPage /></SectionPage>} />
        <Route path="reclamations" element={<SectionPage><ReclamationsPage /></SectionPage>} />
      </Routes>
    </div>;
}
