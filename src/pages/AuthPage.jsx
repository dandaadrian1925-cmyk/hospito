import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, MapPin, Globe, ArrowRight } from 'lucide-react';
import { registerWithEmail, loginWithEmail, loginWithGoogle } from '../services/authService';
import { getSettings, getVillesFormulaire } from '../services/settingsService';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
export default function AuthPage() {
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  useEffect(() => {
    if (user) navigate('/', {
      replace: true
    });
  }, [user]);
  const [settings, setSettings] = useState({});
  useEffect(() => {
    getSettings().then(setSettings);
  }, []);
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nom: '',
    prenom: '',
    ville: 'Yaoundé'
  });
  // #anti-bot (demande utilisateur, "honeypot sur les formulaires publics") :
  // champ invisible pour un humain (hors du flux visuel, jamais display:none
  // — les bots un peu soignés sautent déjà ce cas précis) mais que les
  // scripts qui remplissent tous les champs d'un formulaire aveuglément
  // renseignent quand même. Rempli => on abandonne silencieusement, sans
  // jamais révéler le mécanisme (pas de message d'erreur spécifique).
  const [honeypot, setHoneypot] = useState('');
  const [autreVille, setAutreVille] = useState(false);
  // #nouveau (demande utilisateur, "les 3 checkbox qui attestent ce que
  // ça atteste d'habitude sur les plateformes adaptées à la nôtre") : CGU,
  // confidentialité, majorité — les 3 attestations standards d'un
  // marketplace qui manipule de l'argent réel et des pièces d'identité
  // (CNI). Remplace l'ancienne mention passive (texte seul, jamais une
  // vraie action de consentement) par un vrai consentement explicite,
  // requis avant de pouvoir créer le compte.
  const [acceptCGU, setAcceptCGU] = useState(false);
  const [acceptConfidentialite, setAcceptConfidentialite] = useState(false);
  const [acceptMajorite, setAcceptMajorite] = useState(false);
  const set = (k, v) => setForm(f => ({
    ...f,
    [k]: v
  }));
  const handleSubmit = async e => {
    e.preventDefault();
    if (honeypot) return;
    if (mode === 'register' && !(acceptCGU && acceptConfidentialite && acceptMajorite)) {
      toast.error('Merci de cocher les 3 cases pour continuer.');
      return;
    }
    if (mode === 'register' && form.password !== form.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'register') {
        await registerWithEmail(form.email, form.password, form.nom, form.prenom, form.ville);
        toast.success('Compte créé ! Bienvenue sur HostoConnect 🎉');
      } else {
        await loginWithEmail(form.email, form.password);
        toast.success('Bon retour sur HostoConnect !');
      }
      navigate('/');
    } catch (err) {
      const msgs = {
        'auth/email-already-in-use': 'Cet email est déjà utilisé',
        'auth/wrong-password': 'Email ou mot de passe incorrect',
        'auth/user-not-found': 'Email ou mot de passe incorrect',
        'auth/invalid-credential': 'Email ou mot de passe incorrect',
        'auth/weak-password': 'Mot de passe trop faible (6 caractères minimum)',
        'auth/invalid-email': 'Email invalide'
      };
      toast.error(msgs[err.code] || 'Une erreur est survenue');
      // #nouveau (demande utilisateur, "partout où on demande un email et un
      // mot de passe, vider les champs après une tentative") — jamais laisser
      // un mot de passe erroné (ou celui d'un poste partagé) visible dans le
      // formulaire.
      setForm((f) => ({ ...f, email: '', password: '', confirmPassword: '' }));
    } finally {
      setLoading(false);
    }
  };
  const handleGoogle = async () => {
    if (mode === 'register' && !(acceptCGU && acceptConfidentialite && acceptMajorite)) {
      toast.error('Merci de cocher les 3 cases pour continuer.');
      return;
    }
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      toast.success('Connecté avec Google !');
    } catch (err) {
      const googleMsgs = {
        'auth/account-exists-with-different-credential': 'Un compte existe déjà avec cet email via une autre méthode de connexion.',
        'auth/popup-closed-by-user': 'Fenêtre Google fermée avant la fin de la connexion.',
        'auth/unauthorized-domain': "Ce domaine n'est pas autorisé pour la connexion Google.",
        'auth/operation-not-allowed': 'La connexion Google est désactivée côté Firebase.'
      };
      toast.error(googleMsgs[err.code] || `Erreur de connexion Google (${err.code || err.message})`);
    } finally {
      setGoogleLoading(false);
    }
  };
  return <div className="min-h-screen bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 flex items-center justify-center p-4">
      {}
      <div className="absolute inset-0 opacity-10 overflow-hidden">
        <div className="absolute top-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-64 h-64 bg-primary-300 rounded-full blur-2xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {}
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <img src="/icon-192.png" alt="HostoConnect" width="40" height="40" style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0 }} />
          <span className="text-2xl font-black text-white" style={{
          fontFamily: 'Syne, sans-serif'
        }}>HostoConnect</span>
        </Link>

        {}
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} className="bg-white rounded-3xl p-8 shadow-2xl">
          {}
          <div className="flex bg-gray-100 rounded-2xl p-1 mb-8">
            {[['login', 'Se connecter'], ['register', "S'inscrire"]].map(([m, label]) => <button key={m} onClick={() => setMode(m)} className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${mode === m ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500'}`}>
                {label}
              </button>)}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" name="site_web" value={honeypot} onChange={e => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{
            position: 'absolute',
            left: '-9999px',
            width: '1px',
            height: '1px',
            opacity: 0
          }} />
            <AnimatePresence mode="wait">
              {mode === 'register' && <motion.div key="register-fields" initial={{
              opacity: 0,
              height: 0
            }} animate={{
              opacity: 1,
              height: 'auto'
            }} exit={{
              opacity: 0,
              height: 0
            }} className="space-y-4 overflow-hidden">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Prénom</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input value={form.prenom} onChange={e => set('prenom', e.target.value)} placeholder="Jean" required className="input-field pl-9 text-sm" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nom</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Dupont" required className="input-field pl-9 text-sm" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Ville</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <select value={autreVille ? 'Autre ville' : form.ville} onChange={e => {
                    const v = e.target.value;
                    if (v === 'Autre ville') {
                      setAutreVille(true);
                      set('ville', '');
                    } else {
                      setAutreVille(false);
                      set('ville', v);
                    }
                  }} className="input-field pl-9 text-sm">
                        {getVillesFormulaire(settings).map(v => <option key={v}>{v}</option>)}
                      </select>
                    </div>
                    {autreVille && <input value={form.ville} onChange={e => set('ville', e.target.value)} placeholder="Précisez le nom de votre ville" className="input-field text-sm mt-2" />}
                  </div>

                </motion.div>}
            </AnimatePresence>

            {}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="vous@example.com" required className="input-field pl-9 text-sm" />
              </div>
            </div>

            {}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" required minLength={6} className="input-field pl-9 pr-10 text-sm" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {mode === 'login' && <Link to="/mot-de-passe-oublie" className="inline-block text-xs font-semibold text-primary-600 hover:text-primary-700 mt-1.5">
                  Mot de passe oublié ?
                </Link>}
            </div>

            {}
            {mode === 'register' && <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Confirmer le mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type={showPass ? 'text' : 'password'} value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} placeholder="••••••••" required minLength={6} className={`input-field pl-9 pr-10 text-sm ${form.confirmPassword && form.confirmPassword !== form.password ? 'border-red-300' : ''}`} />
              </div>
              {form.confirmPassword && form.confirmPassword !== form.password && <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas.</p>}
            </div>}

            {}
            {mode === 'register' && <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 space-y-2">
                <label className="flex items-start gap-2 text-xs text-gray-700 leading-relaxed cursor-pointer">
                  <input type="checkbox" checked={acceptCGU} onChange={e => setAcceptCGU(e.target.checked)} className="mt-0.5 flex-shrink-0" />
                  J'ai lu et j'accepte les <Link to="/cgu" target="_blank" className="text-primary-600 font-semibold">Conditions Générales d'Utilisation d'HostoConnect</Link>.
                </label>
                <label className="flex items-start gap-2 text-xs text-gray-700 leading-relaxed cursor-pointer">
                  <input type="checkbox" checked={acceptConfidentialite} onChange={e => setAcceptConfidentialite(e.target.checked)} className="mt-0.5 flex-shrink-0" />
                  J'ai lu et j'accepte la <Link to="/confidentialite" target="_blank" className="text-primary-600 font-semibold">Politique de Confidentialité</Link>.
                </label>
                <label className="flex items-start gap-2 text-xs text-gray-700 leading-relaxed cursor-pointer">
                  <input type="checkbox" checked={acceptMajorite} onChange={e => setAcceptMajorite(e.target.checked)} className="mt-0.5 flex-shrink-0" />
                  Je certifie avoir 18 ans ou plus.
                </label>
              </div>}

            <button type="submit" disabled={loading || googleLoading || (mode === 'register' && !(acceptCGU && acceptConfidentialite && acceptMajorite))} className="btn-primary w-full justify-center py-3 text-sm">
              {loading ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>Chargement…</span> : <span className="flex items-center gap-2">
                  {mode === 'register' ? 'Créer mon compte' : 'Se connecter'}
                  <ArrowRight className="w-4 h-4" />
                </span>}
            </button>
          </form>

          {}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-200"></div>
            <span className="text-xs text-gray-400 font-medium">ou</span>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>

          {}
          <button onClick={handleGoogle} disabled={loading || googleLoading || (mode === 'register' && !(acceptCGU && acceptConfidentialite && acceptMajorite))} className="w-full flex items-center justify-center gap-3 py-3 border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-semibold text-sm text-gray-700 disabled:opacity-60">
            {googleLoading ? <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></span> : <Globe className="w-4 h-4 text-primary-500" />}
            {googleLoading ? 'Chargement…' : 'Continuer avec Google'}
          </button>
        </motion.div>

        <p className="text-center text-primary-200 text-xs mt-6">
          <Link to="/" className="hover:text-white transition-colors">← Retour à l'accueil</Link>
        </p>
      </div>
    </div>;
}
