import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Video, FileText, MapPin, Tag, ChevronRight, CheckCircle, Shield } from 'lucide-react';
import { publierAnnonce, modifierAnnonceComplete, getAnnoncePourEdition, verifierLivreursDisponibles, BOOST_LEVELS } from '../services/annoncesService';
import { getSettings, getTauxCommissionVendeur, getVillesFormulaire, getQuartiersFormulaire } from '../services/settingsService';
import { getCategories, getCategoryEmoji } from '../services/categoriesService';
import { CATEGORY_ICONS } from '../components/categoryIcons';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
const STEPS = ['Informations', 'Médias', 'Localisation', 'Publication'];
const DRAFT_KEY_PREFIX = 'maket_brouillon_annonce_';
const DEFAULT_FORM = {
  titre: '',
  description: '',
  prix: '',
  categorie: '',
  sousCategorie: '',
  ville: 'Yaoundé',
  quartier: '',
  estLot: false,
  nombreArticlesLot: 2,
  articlesLot: [],
  modeLivraison: 'main_propre'
};
const MODES_LIVRAISON = [{
  id: 'main_propre',
  label: 'Remise en main propre',
  description: 'Gratuit — vous convenez d\'un lieu et d\'une heure avec l\'acheteur'
}, {
  id: 'livreurs',
  label: 'Livreurs MAKET uniquement',
  description: 'Un livreur récupère l\'article et le livre à l\'acheteur, où qu\'il soit'
}, {
  id: 'les_deux',
  label: 'Les deux — l\'acheteur choisira',
  description: 'Offrez le choix à l\'acheteur au moment de l\'achat'
}];
export default function PublierPage() {
  const {
    user,
    userProfile
  } = useAuth();
  const navigate = useNavigate();
  const {
    id: annonceId
  } = useParams();
  const editMode = !!annonceId;
  const [chargementEdition, setChargementEdition] = useState(editMode);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  // #anti-bot (demande utilisateur, "honeypot sur les formulaires publics") :
  // même mécanisme que AuthPage.jsx — champ invisible qu'un humain ne peut
  // pas renseigner, mais qu'un script remplissant tous les champs aveuglément
  // renseignera. Valeur moindre ici (déjà protégé par inscription + CNI
  // vérifiée en amont), gardé pour la défense en profondeur.
  const [honeypot, setHoneypot] = useState('');
  const [draftRestored, setDraftRestored] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [photosExistantes, setPhotosExistantes] = useState([]);
  const [video, setVideo] = useState(null);
  const [videoUrlExistante, setVideoUrlExistante] = useState(null);
  const [facture, setFacture] = useState(null);
  const [factureUrlExistante, setFactureUrlExistante] = useState(null);
  const [boost, setBoost] = useState(null);
  const [flash, setFlash] = useState(false);
  const [categories, setCategories] = useState([]);
  const [autreQuartier, setAutreQuartier] = useState(false);
  const [autreVille, setAutreVille] = useState(false);
  // #nouveau (demande utilisateur, "recommander en main propre s'il n'y a
  // pas encore de livreurs disponibles dans cette ville et le notifier") :
  // livreursDisponibles reste true tant que la vérification n'a pas répondu
  // (jamais bloquant/alarmiste par défaut) — modeLivraisonTouche évite
  // d'écraser un choix déjà fait explicitement par le vendeur.
  const [livreursDisponibles, setLivreursDisponibles] = useState(true);
  const [modeLivraisonTouche, setModeLivraisonTouche] = useState(false);
  const [settings, setSettings] = useState({
    commissionVenteDefaut: 0.05,
    commissionVenteParCategorie: {},
    lotArticlesMin: 2,
    lotArticlesMax: 50
  });
  useEffect(() => {
    getSettings().then(setSettings);
  }, []);
  useEffect(() => {
    if (!editMode || !user?.uid) return;
    getAnnoncePourEdition(annonceId).then(a => {
      if (!a) {
        toast.error('Annonce introuvable');
        navigate('/mon-compte/annonces');
        return;
      }
      if (a.userId !== user.uid) {
        toast.error('Cette annonce ne vous appartient pas');
        navigate('/mon-compte/annonces');
        return;
      }
      if (a.statut !== 'en_vente' && a.statut !== 'en_attente') {
        toast.error('Cette annonce ne peut plus être modifiée.');
        navigate('/mon-compte/annonces');
        return;
      }
      setForm({
        titre: a.titre || '',
        description: a.description || '',
        prix: String(a.prix || ''),
        categorie: a.categorie || '',
        sousCategorie: a.sousCategorie || '',
        ville: a.ville || 'Yaoundé',
        quartier: a.quartier || '',
        estLot: a.estLot || false,
        nombreArticlesLot: a.nombreArticlesLot || 2,
        articlesLot: a.articlesLot || [],
        modeLivraison: a.modeLivraison || 'main_propre'
      });
      setAutreVille(!getVillesFormulaire(settings).includes(a.ville));
      setPhotosExistantes(a.photos || []);
      setVideoUrlExistante(a.videoUrl || null);
      setFactureUrlExistante(a.factureUrl || null);
      setChargementEdition(false);
    }).catch(e => {
      console.error('getAnnoncePourEdition a échoué :', e);
      toast.error('Impossible de charger cette annonce');
      navigate('/mon-compte/annonces');
    });
  }, [editMode, annonceId, user?.uid]);
  const tauxCommission = getTauxCommissionVendeur(settings, form.categorie, userProfile);
  useEffect(() => {
    getCategories().then(setCategories).catch(e => console.error('getCategories a échoué :', e));
  }, []);
  useEffect(() => {
    if (!user?.uid || draftRestored || editMode) return;
    setDraftRestored(true);
    try {
      const raw = localStorage.getItem(DRAFT_KEY_PREFIX + user.uid);
      if (!raw) return;
      const draft = JSON.parse(raw);
      setForm(f => ({
        ...f,
        ...draft
      }));
      toast('Brouillon restauré', {
        icon: '📝'
      });
    } catch (e) {
      console.warn('Lecture du brouillon échouée :', e);
    }
  }, [user?.uid, draftRestored]);
  useEffect(() => {
    if (!user?.uid || !draftRestored) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY_PREFIX + user.uid, JSON.stringify(form));
      } catch (e) {
        console.warn('Sauvegarde du brouillon échouée :', e);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [form, user?.uid, draftRestored]);
  const clearDraft = () => {
    if (user?.uid) localStorage.removeItem(DRAFT_KEY_PREFIX + user.uid);
  };
  const set = (k, v) => setForm(f => ({
    ...f,
    [k]: v
  }));
  // #nouveau (demande utilisateur, "recommander en main propre s'il n'y a
  // pas encore de livreurs disponibles dans cette ville et le notifier") :
  // re-vérifié à chaque changement de ville — passe automatiquement en main
  // propre SEULEMENT si le vendeur n'a pas déjà choisi lui-même un mode
  // (jamais écraser un choix explicite).
  useEffect(() => {
    if (!form.ville) return;
    let annule = false;
    verifierLivreursDisponibles(form.ville).then(dispo => {
      if (annule) return;
      setLivreursDisponibles(dispo);
      if (!dispo && !modeLivraisonTouche) set('modeLivraison', 'main_propre');
    });
    return () => {
      annule = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.ville]);
  // #nouveau (demande utilisateur, "améliorons la vente en lots") : liste
  // optionnelle de courtes descriptions par article — jamais obligatoire de
  // tout remplir (un vendeur pressé garde juste le titre/description
  // partagés comme avant), mais permet à l'acheteur de savoir ce qu'il y a
  // vraiment dans le lot, et sert de base pour cibler un litige plus tard.
  const ajouterArticleLot = () => setForm(f => ({
    ...f,
    articlesLot: [...f.articlesLot, '']
  }));
  const modifierArticleLot = (i, valeur) => setForm(f => ({
    ...f,
    articlesLot: f.articlesLot.map((a, idx) => idx === i ? valeur : a)
  }));
  const retirerArticleLot = (i) => setForm(f => ({
    ...f,
    articlesLot: f.articlesLot.filter((_, idx) => idx !== i)
  }));
  const cat = categories.find(c => c.id === form.categorie);
  const needsFacture = cat?.highValue;
  const maxPhotos = settings.maxPhotosAnnonce ?? 10;
  const handlePhotos = e => {
    const restant = maxPhotos - photos.length - photosExistantes.length;
    const files = Array.from(e.target.files).slice(0, Math.max(0, restant));
    setPhotos(prev => [...prev, ...files].slice(0, Math.max(0, restant + prev.length)));
  };
  const removePhoto = i => setPhotos(p => p.filter((_, idx) => idx !== i));
  const removePhotoExistante = i => setPhotosExistantes(p => p.filter((_, idx) => idx !== i));
  // #bug (retour utilisateur, "aperçu ne s'affiche pas", corrigé) : les URLs
  // étaient créées dans un useEffect (donc APRÈS le rendu) et lues depuis une
  // ref pendant le rendu — au tout premier rendu suivant l'ajout d'une photo,
  // photoUrlsRef.current.get(p) valait encore undefined (l'effet n'avait pas
  // encore tourné), donc <img src={undefined}> = icône d'image cassée. Ça se
  // "corrigeait" seul au prochain re-rendu déclenché par autre chose (muter
  // une ref ne redéclenche jamais de rendu), d'où un bug qui ne touchait que
  // CERTAINES photos, de façon apparemment aléatoire. useMemo calcule les URLs
  // SYNCHRONEMENT pendant le rendu lui-même — plus jamais de fenêtre où l'URL
  // n'existe pas encore.
  const photoUrls = useMemo(() => photos.map(file => URL.createObjectURL(file)), [photos]);
  useEffect(() => () => {
    for (const url of photoUrls) URL.revokeObjectURL(url);
  }, [photoUrls]);
  const canGoNext = () => {
    if (step === 0) return form.titre && form.description && parseInt(form.prix, 10) > 0 && form.categorie;
    if (step === 1) return photos.length + photosExistantes.length >= 1 && (!needsFacture || (facture || factureUrlExistante) && (video || videoUrlExistante));
    if (step === 2) return form.ville && form.quartier;
    return true;
  };
  const handleNext = () => setStep(s => s + 1);
  const handleSubmit = async () => {
    if (honeypot) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!editMode && !userProfile?.cniVerifie) {
      toast.error('Vérifiez votre CNI dans Mon Compte avant de publier');
      navigate('/mon-compte/cni');
      return;
    }
    setLoading(true);
    try {
      const lotMin = settings.lotArticlesMin ?? 2;
      const lotMax = settings.lotArticlesMax ?? 50;
      // #bug CRITIQUE (corrigé, "presque tout est cassé, même publier une
      // annonce") : ": form.nombreArticlesLot" au lieu de ": null" — le
      // formulaire garde 2 comme valeur par défaut (DEFAULT_FORM) même
      // quand estLot est décoché, donc CHAQUE annonce normale (non-lot)
      // envoyait nombreArticlesLot:2 au lieu de null. estLotValide()
      // (firestore.rules) exige EXACTEMENT null quand estLot est false —
      // bloquait donc la publication de TOUTE annonce normale depuis le
      // déploiement de cette règle, et par ricochet l'achat de toute
      // annonce publiée entre-temps (incohérence annonce/commande).
      const nombreArticlesLot = form.estLot ? Math.min(lotMax, Math.max(lotMin, parseInt(form.nombreArticlesLot) || lotMin)) : null;
      const data = {
        ...form,
        prix: parseInt(form.prix),
        boost: boost?.id || null,
        flash,
        nombreArticlesLot,
        // Entrées vides retirées (un vendeur qui laisse un champ blanc ne
        // veut pas d'un article "" dans la liste) et plafonné au nombre
        // d'articles réel — jamais plus d'entrées que nombreArticlesLot.
        articlesLot: form.estLot ? form.articlesLot.map(a => a.trim()).filter(Boolean).slice(0, nombreArticlesLot) : []
      };
      if (editMode) {
        // #bug (corrigé, "modification d'une annonce crée des problèmes de
        // permissions") : boost/flash restent à leur valeur par défaut
        // (null/false) dans ce formulaire, jamais réhydratés depuis l'annonce
        // chargée — les envoyer écrasait le boost/flash RÉEL d'une annonce
        // active, un champ que firestore.rules interdit explicitement au
        // propriétaire de toucher via l'édition générale (branches dédiées :
        // boosterAnnonce/creerFlashAnnonce). Toute modification d'une annonce
        // boostée ou en flash échouait donc systématiquement.
        const { boost: _boost, flash: _flash, ...donneesEdition } = data;
        const { remisEnAttente } = await modifierAnnonceComplete(annonceId, {
          ...donneesEdition,
          userId: user.uid
        }, photosExistantes, photos, video, facture, videoUrlExistante, factureUrlExistante);
        toast.success(remisEnAttente
          ? 'Annonce mise à jour ! Elle repasse en vérification avant de réapparaître dans le catalogue (sous 24h).'
          : 'Annonce mise à jour !');
      } else {
        await publierAnnonce(user.uid, data, photos, video, facture);
        clearDraft();
        toast.success('Annonce envoyée pour vérification ! Elle sera en ligne dès validation par notre équipe (sous 24h) 🎉');
      }
      navigate('/mon-compte/annonces');
    } catch (e) {
      const MESSAGES = {
        PRIX_INVALIDE: 'Le prix doit être supérieur à 0.',
        PHOTO_REQUISE: 'Ajoutez au moins une photo.',
        TYPE_FICHIER_NON_AUTORISE: 'Type de fichier non autorisé (photos : JPG/PNG/WEBP/GIF, vidéo : MP4/MOV/WEBM).',
        FICHIER_TROP_VOLUMINEUX: 'Fichier trop volumineux.'
      };
      toast.error(MESSAGES[e.message] || e.message || (editMode ? 'Erreur lors de la mise à jour' : 'Erreur lors de la publication'));
    } finally {
      setLoading(false);
    }
  };
  if (chargementEdition) {
    return <div className="max-w-2xl mx-auto px-6 py-8 text-center text-gray-400">Chargement de l'annonce…</div>;
  }
  return <div className="max-w-2xl mx-auto px-6 py-8">
      <input type="text" name="site_web" value={honeypot} onChange={e => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{
      position: 'absolute',
      left: '-9999px',
      width: '1px',
      height: '1px',
      opacity: 0
    }} />
      <div className="mb-8 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900" style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 600
        }}>{editMode ? "Modifier l'annonce" : 'Publier une annonce'}</h1>
          <p className="text-sm text-gray-500 mt-1">{editMode ? 'Vos modifications sont visibles immédiatement — pas de nouvelle vérification nécessaire.' : "Publication gratuite — MAKET prélève 5% uniquement quand l'article est vendu"}</p>
        </div>
        {!editMode && step === 0 && (form.titre || form.description) && <button type="button" onClick={() => {
        setForm(DEFAULT_FORM);
        clearDraft();
      }} className="text-xs text-gray-400 hover:text-red-500 underline whitespace-nowrap mt-1">
            Effacer le brouillon
          </button>}
      </div>

      {}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((s, i) => <div key={i} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i < step ? 'bg-green-500 text-white' : i === step ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`} style={i === step ? {
            boxShadow: 'var(--shadow-accent)'
          } : undefined}>
                {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-xs mt-1 font-medium whitespace-nowrap ${i === step ? 'text-primary-600' : 'text-gray-400'}`}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-2 -mt-4 ${i < step ? 'bg-green-500' : 'bg-gray-200'}`}></div>}
          </div>)}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{
        opacity: 0,
        x: 20
      }} animate={{
        opacity: 1,
        x: 0
      }} exit={{
        opacity: 0,
        x: -20
      }} transition={{
        duration: 0.3
      }} className="space-y-5">

          {}
          {step === 0 && <>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Titre *</label>
                <input value={form.titre} onChange={e => set('titre', e.target.value)} placeholder="Ex: iPhone 13 Pro Max 256Go" className="input-field" maxLength={80} />
                <p className="text-xs text-gray-400 mt-1">{form.titre.length}/80</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Catégorie *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {categories.map(cat => {
                const Icon = CATEGORY_ICONS[cat.id];
                return <button key={cat.id} type="button" onClick={() => setForm(f => ({
                  ...f,
                  categorie: cat.id,
                  sousCategorie: ''
                }))} className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-semibold transition-all text-left ${form.categorie === cat.id ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                        {Icon && <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.8} />}
                        <span className="text-xs">{cat.label}</span>
                      </button>;
              })}
                </div>
              </div>
              {cat?.subcategories?.length > 0 && <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Sous-catégorie</label>
                  <select value={form.sousCategorie} onChange={e => set('sousCategorie', e.target.value)} className="input-field text-sm">
                    <option value="">Aucune sous-catégorie précise</option>
                    {cat.subcategories.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                  </select>
                </div>}
              <div className="flex items-center justify-between p-3 rounded-xl border-2 border-gray-200">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-700">
                  <input type="checkbox" checked={form.estLot} onChange={e => set('estLot', e.target.checked)} className="w-4 h-4 accent-primary-600" />
                  Vendu en lot (plusieurs articles pour un seul prix)
                </label>
                {form.estLot && <input type="number" min={settings.lotArticlesMin ?? 2} max={settings.lotArticlesMax ?? 50} value={form.nombreArticlesLot} onChange={e => set('nombreArticlesLot', e.target.value === '' ? '' : parseInt(e.target.value) || '')} onBlur={e => {
              const v = parseInt(e.target.value);
              set('nombreArticlesLot', Number.isFinite(v) ? Math.min(settings.lotArticlesMax ?? 50, Math.max(settings.lotArticlesMin ?? 2, v)) : (settings.lotArticlesMin ?? 2));
            }} className="input-field input-field--square w-20 text-sm text-center" />}
              </div>
              {form.estLot && <div className="p-3 rounded-xl border-2 border-gray-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-gray-700">Détail des articles (optionnel)</label>
                    <span className="text-xs text-gray-400">{form.articlesLot.length}/{form.nombreArticlesLot || 2}</span>
                  </div>
                  <p className="text-xs text-gray-400">Décrivez ce que contient le lot, article par article — pas besoin de tous les remplir.</p>
                  {form.articlesLot.map((a, i) => <div key={i} className="flex items-center gap-2">
                      <input type="text" value={a} onChange={e => modifierArticleLot(i, e.target.value)} placeholder={`Article ${i + 1}`} maxLength={100} className="input-field text-sm flex-1" />
                      <button type="button" onClick={() => retirerArticleLot(i)} className="text-gray-400 hover:text-red-500 p-1">
                        <X className="w-4 h-4" />
                      </button>
                    </div>)}
                  {form.articlesLot.length < (form.nombreArticlesLot || 2) && <button type="button" onClick={ajouterArticleLot} className="text-xs font-semibold text-primary-600 hover:text-primary-700">
                      + Ajouter un article
                    </button>}
                </div>}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Prix de vente (XAF) *</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="number" value={form.prix} onChange={e => set('prix', e.target.value)} placeholder="0" className="input-field pl-9" min="0" />
                </div>
                {form.prix && <p className="text-xs text-gray-400 mt-1 font-medium">
                    Vous recevrez {Math.round(parseInt(form.prix) * (1 - tauxCommission)).toLocaleString()} XAF si l'article se vend (commission MAKET {Math.round(tauxCommission * 1000) / 10}% déduite à la vente)
                  </p>}
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Description *</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="État, caractéristiques, défauts éventuels..." className="input-field resize-none" rows={5} maxLength={1000} />
                <p className="text-xs text-gray-400 mt-1">{form.description.length}/1000</p>
              </div>
            </>}

          {}
          {step === 1 && <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-bold text-gray-700">Photos * (min. 1, max. {maxPhotos})</label>
                  <span className="text-xs text-gray-400">{photos.length + photosExistantes.length}/{maxPhotos}</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {photosExistantes.map((url, i) => <div key={`existante-${url}`} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                      <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                      <button onClick={() => removePhotoExistante(i)} className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"><X className="w-3 h-3" /></button>
                      {i === 0 && <span className="absolute bottom-1 left-1 bg-primary-600 text-white text-xs px-1.5 py-0.5 rounded font-bold">Principale</span>}
                    </div>)}
                  {photos.map((_, i) => <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                      <img src={photoUrls[i]} alt={`Aperçu photo ${i + 1}`} className="w-full h-full object-cover" />
                      <button onClick={() => removePhoto(i)} className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"><X className="w-3 h-3" /></button>
                      {photosExistantes.length === 0 && i === 0 && <span className="absolute bottom-1 left-1 bg-primary-600 text-white text-xs px-1.5 py-0.5 rounded font-bold">Principale</span>}
                    </div>)}
                  {photos.length + photosExistantes.length < maxPhotos && <label className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-all">
                      <Upload className="w-6 h-6 text-gray-400 mb-1" />
                      <span className="text-xs text-gray-400">Ajouter</span>
                      <input type="file" accept="image/*" multiple onChange={handlePhotos} className="hidden" />
                    </label>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Vidéo {needsFacture ? '* (Obligatoire)' : '(recommandée)'}</label>
                <div className={`border-2 border-dashed rounded-2xl p-6 text-center ${video || videoUrlExistante ? 'border-green-400 bg-green-50' : needsFacture ? 'border-orange-300 bg-orange-50' : 'border-gray-300'}`}>
                  {video ? <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><Video className="w-5 h-5 text-green-600" /><span className="text-sm font-medium text-green-700">{video.name}</span></div>
                      <button onClick={() => setVideo(null)} className="text-red-500"><X className="w-4 h-4" /></button>
                    </div> : videoUrlExistante ? <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><Video className="w-5 h-5 text-green-600" /><span className="text-sm font-medium text-green-700">Vidéo déjà en ligne</span></div>
                      <label className="text-primary-600 text-xs font-bold cursor-pointer underline">
                        Remplacer
                        <input type="file" accept="video/*" onChange={e => setVideo(e.target.files[0])} className="hidden" />
                      </label>
                    </div> : <label className="cursor-pointer">
                      <Video className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-gray-600">Ajouter une vidéo</p>
                      <p className="text-xs text-gray-400 mt-1">MP4, MOV — Max 50MB</p>
                      <input type="file" accept="video/*" onChange={e => setVideo(e.target.files[0])} className="hidden" />
                    </label>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Facture {needsFacture ? '* (Obligatoire)' : '(optionnelle)'}</label>
                <div className={`border-2 border-dashed rounded-2xl p-6 text-center ${facture || factureUrlExistante ? 'border-green-400 bg-green-50' : needsFacture ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}>
                  {facture ? <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><FileText className="w-5 h-5 text-green-600" /><span className="text-sm font-medium text-green-700">{facture.name}</span></div>
                      <button onClick={() => setFacture(null)} className="text-red-500"><X className="w-4 h-4" /></button>
                    </div> : factureUrlExistante ? <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><FileText className="w-5 h-5 text-green-600" /><span className="text-sm font-medium text-green-700">Facture déjà en ligne</span></div>
                      <label className="text-primary-600 text-xs font-bold cursor-pointer underline">
                        Remplacer
                        <input type="file" accept="image/*,.pdf" onChange={e => setFacture(e.target.files[0])} className="hidden" />
                      </label>
                    </div> : <label className="cursor-pointer">
                      <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-gray-600">Ajouter la facture</p>
                      <p className="text-xs text-gray-400 mt-1">PDF ou image</p>
                      <input type="file" accept="image/*,.pdf" onChange={e => setFacture(e.target.files[0])} className="hidden" />
                    </label>}
                </div>
              </div>
            </>}

          {}
          {step === 2 && <>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Ville *</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <select value={autreVille ? 'Autre ville' : form.ville} onChange={e => {
                const v = e.target.value;
                if (v === 'Autre ville') {
                  setAutreVille(true);
                  set('ville', '');
                } else {
                  setAutreVille(false);
                  set('ville', v);
                }
                set('quartier', '');
                setAutreQuartier(false);
              }} className="input-field pl-9">
                    <option value="">Choisir une ville</option>
                    {getVillesFormulaire(settings).map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                {autreVille && <input value={form.ville} onChange={e => set('ville', e.target.value)} placeholder="Précisez le nom de votre ville" className="input-field mt-2" />}
              </div>
              {form.ville && <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Quartier *</label>
                  {getQuartiersFormulaire(settings, form.ville) ? <>
                      <div className="grid grid-cols-2 gap-2">
                        {getQuartiersFormulaire(settings, form.ville).map(q => <button key={q} type="button" onClick={() => {
                  if (q === 'Autre') {
                    setAutreQuartier(true);
                    set('quartier', '');
                  } else {
                    setAutreQuartier(false);
                    set('quartier', q);
                  }
                }} className={`p-3 rounded-xl border-2 text-sm font-semibold transition-all text-left ${(q === 'Autre' ? autreQuartier : form.quartier === q) ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600'}`}>{q}</button>)}
                      </div>
                      {autreQuartier && <input value={form.quartier} onChange={e => set('quartier', e.target.value)} placeholder="Précisez votre quartier" className="input-field mt-2" />}
                    </> : <input value={form.quartier} onChange={e => set('quartier', e.target.value)} placeholder="Nom de votre quartier" className="input-field" />}
                </div>}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Mode de remise *</label>
                {!livreursDisponibles && <div className="mb-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                    Aucun livreur MAKET n'est encore disponible à {form.ville} — la remise en main propre est recommandée pour l'instant.
                  </div>}
                <div className="space-y-2">
                  {MODES_LIVRAISON.map(m => <button key={m.id} type="button" onClick={() => {
                set('modeLivraison', m.id);
                setModeLivraisonTouche(true);
              }} className={`w-full p-3 rounded-xl border-2 text-left transition-all ${form.modeLivraison === m.id ? 'border-primary-600 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <p className={`text-sm font-semibold ${form.modeLivraison === m.id ? 'text-primary-700' : 'text-gray-700'}`}>
                        {m.label}
                        {!livreursDisponibles && m.id === 'main_propre' && <span className="ml-1.5 text-[11px] font-bold text-amber-600">(Recommandé)</span>}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{m.description}</p>
                    </button>)}
                </div>
              </div>
            </>}

          {}
          {step === 3 && <>
              <div className="rounded-2xl p-5" style={{
            background: 'var(--bg-2)',
            border: '1px solid var(--border-2)',
            boxShadow: 'var(--shadow-sm)'
          }}>
                <h3 className="font-bold text-gray-900 mb-3" style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600
            }}>Récapitulatif</h3>
                <div className="space-y-2 text-sm">
                  {[['Article', form.titre], ['Catégorie', `${getCategoryEmoji(cat?.id)} ${cat?.label}`], ['Prix', `${parseInt(form.prix || 0).toLocaleString()} XAF`], ['Localisation', `${form.quartier}, ${form.ville}`], ['Mode de remise', MODES_LIVRAISON.find(m => m.id === form.modeLivraison)?.label], ['Photos', `${photos.length + photosExistantes.length} photo(s)`], ['Vidéo', video || videoUrlExistante ? '✅' : '—'], ['Facture', facture || factureUrlExistante ? '✅' : '—']].map(([l, v]) => <div key={l} className="flex justify-between">
                      <span className="text-gray-500">{l}</span>
                      <span className="font-semibold truncate max-w-xs">{v}</span>
                    </div>)}
                </div>
              </div>

              <div className="bg-green-50 rounded-xl p-4 border border-green-100 flex items-start gap-2">
                <Shield className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-green-700">
                  {editMode ? "Vos modifications seront visibles immédiatement, sans nouvelle vérification par notre équipe." : "Publication gratuite. Votre annonce sera vérifiée par notre équipe (sous 24h) avant d'être visible. MAKET prélève une commission de 5% uniquement le jour où l'article se vend."}
                </p>
              </div>
            </>}
        </motion.div>
      </AnimatePresence>

      {}
      <div className="flex gap-3 mt-8">
        {step > 0 && <button onClick={() => setStep(s => s - 1)} className="btn-outline flex-1 justify-center">Retour</button>}
        {step < STEPS.length - 1 ? <button onClick={handleNext} disabled={!canGoNext()} className="btn-primary flex-1 justify-center disabled:opacity-50">
            Suivant <ChevronRight className="w-4 h-4" />
          </button> : <button onClick={handleSubmit} disabled={loading} className="btn-primary flex-1 justify-center">
            {loading ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{editMode ? 'Enregistrement...' : 'Publication...'}</span> : editMode ? '💾 Enregistrer les modifications' : '🚀 Publier l\'annonce'}
          </button>}
      </div>
    </div>;
}
