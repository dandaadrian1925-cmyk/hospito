import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Filter, X, SlidersHorizontal, Zap, BellPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import ProductCard from '../components/annonces/ProductCard';
import ProductCardSkeleton from '../components/annonces/ProductCardSkeleton';
import { getAnnonces, searchAnnonces, isFlashActive, creerAlerteRecherche, annonceSortWeight } from '../services/annoncesService';
import { getCategories } from '../services/categoriesService';
import { getSettings, getVilles } from '../services/settingsService';
import CompteARebours, { campagneOuRevelation } from '../components/common/CompteARebours';
import { getScoresParVendeur, getVendeurProParVendeur } from '../services/profilPublicService';
import { useAuth } from '../context/AuthContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import MultiSelectPills from '../components/common/MultiSelectPills';
export default function CataloguePage() {
  const {
    user,
    userProfile
  } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [creatingAlerte, setCreatingAlerte] = useState(false);
  const [annonces, setAnnonces] = useState([]);
  const [vendeurProMap, setVendeurProMap] = useState({});
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const sentinelRef = useRef(null);
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [filters, setFilters] = useState({
    categorie: searchParams.get('categorie') ? [searchParams.get('categorie')] : [],
    sousCategorie: searchParams.get('sous') ? [searchParams.get('sous')] : [],
    ville: searchParams.get('ville') ? [searchParams.get('ville')] : [],
    prixMin: '',
    prixMax: '',
    flash: searchParams.get('flash') === 'true'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState('recent');
  const [settings, setSettings] = useState({});
  useEffect(() => {
    getSettings().then(setSettings);
  }, []);
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const requestIdRef = useRef(0);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => {
    getCategories().then(setCategories).catch(e => console.error('getCategories a échoué :', e));
  }, []);
  useEffect(() => {
    load();
  }, [filters, debouncedSearch, sort]);
  useDocumentMeta(filters.categorie ? `Annonces ${filters.categorie}` : 'Catalogue', "Parcourez toutes les annonces d'occasion disponibles sur MAKET, partout au Cameroun.");
  // #nouveau (demande utilisateur, "classer aussi par score de fiabilité") :
  // asynchrone désormais (récupère les scores des vendeurs concernés avant
  // de trier) — seul le tri "recent" (par défaut) en a besoin, les autres
  // tris (prix, proximité) restent inchangés.
  // vendeurProMap récupéré à chaque passage (comme scores) — sert désormais
  // uniquement au bonus de tri (annonceSortWeight) ; le filtre "flash" ne
  // regarde plus que le vrai flash payé/offert à la publication
  // (isFlashActive), un Vendeur Pro actif n'y ajoute plus rien après les
  // 24h initiales de sa dernière annonce publiée.
  const appliquerFiltresEtTri = async data => {
    const proMap = await getVendeurProParVendeur(data.map(a => a.userId));
    setVendeurProMap(proMap);
    if (filters.flash) data = data.filter(a => isFlashActive(a));
    if (filters.prixMin) data = data.filter(a => a.prix >= parseInt(filters.prixMin));
    if (filters.prixMax) data = data.filter(a => a.prix <= parseInt(filters.prixMax));
    if (sort === 'prix_asc') data.sort((a, b) => a.prix - b.prix);
    if (sort === 'prix_desc') data.sort((a, b) => b.prix - a.prix);
    if (sort === 'proximite' && userProfile) {
      const score = a => a.quartier && a.quartier === userProfile.quartier ? 0 : a.ville === userProfile.ville ? 1 : 2;
      data.sort((a, b) => score(a) - score(b));
    }
    if (sort === 'recent') {
      const scores = await getScoresParVendeur(data.map(a => a.userId));
      data.sort((a, b) => annonceSortWeight(b, scores, proMap) - annonceSortWeight(a, scores, proMap));
    }
    return data;
  };
  const load = async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setLastDoc(null);
    setHasMore(false);
    try {
      let data;
      if (debouncedSearch) {
        // Recherche texte : limite connue, cf. searchAnnonces — pas encore
        // paginée (chantier séparé, moteur de recherche dédié à prévoir).
        data = await searchAnnonces(debouncedSearch);
      } else {
        const page = await getAnnonces(filters);
        if (requestId !== requestIdRef.current) return;
        setLastDoc(page.lastDoc);
        setHasMore(page.hasMore);
        data = page.list;
      }
      if (requestId !== requestIdRef.current) return;
      const triees = await appliquerFiltresEtTri(data);
      if (requestId !== requestIdRef.current) return;
      setAnnonces(triees);
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      console.warn('getAnnonces/searchAnnonces a échoué :', e);
      setAnnonces([]);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };
  // Défilement infini : sans pagination par curseur, le catalogue plafonnait
  // à 50 annonces quel que soit le nombre réel de résultats — invisible avec
  // peu d'annonces, mais faux dès que le catalogue grossit (cf. retour
  // utilisateur avec 500+ annonces). N'agit que sur le parcours filtré
  // (getAnnonces) — la recherche texte n'est pas encore paginée.
  const loadMore = async () => {
    if (loadingMore || !hasMore || debouncedSearch) return;
    const requestId = requestIdRef.current;
    setLoadingMore(true);
    try {
      const page = await getAnnonces(filters, lastDoc);
      if (requestId !== requestIdRef.current) return;
      setLastDoc(page.lastDoc);
      setHasMore(page.hasMore);
      const triees = await appliquerFiltresEtTri([...annonces, ...page.list]);
      if (requestId !== requestIdRef.current) return;
      setAnnonces(triees);
    } catch (e) {
      console.warn('loadMore (catalogue) a échoué :', e);
    } finally {
      setLoadingMore(false);
    }
  };
  useEffect(() => {
    if (!sentinelRef.current || loading) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadMore();
    }, {
      rootMargin: '600px'
    });
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [sentinelRef.current, loading, hasMore, lastDoc, loadingMore, debouncedSearch]);
  const setFilter = (k, v) => setFilters(f => ({
    ...f,
    [k]: v,
    ...(k === 'categorie' ? {
      sousCategorie: []
    } : {})
  }));
  const clearFilters = () => setFilters({
    categorie: [],
    sousCategorie: [],
    ville: [],
    prixMin: '',
    prixMax: '',
    flash: false
  });
  const activeFiltersCount = Object.entries(filters).filter(([k, v]) => Array.isArray(v) ? v.length > 0 : !!v).length;
  const canCreateAlerte = !!(filters.categorie.length > 0 || search.trim());
  const handleCreerAlerte = async () => {
    if (!user) {
      toast.error('Connectez-vous pour créer une alerte');
      return;
    }
    setCreatingAlerte(true);
    try {
      await creerAlerteRecherche(user.uid, {
        categorie: filters.categorie[0] || null,
        motCle: search
      });
      toast.success('Alerte créée ! Vous serez notifié des nouvelles annonces correspondantes.');
    } catch (e) {
      toast.error(e.message || 'Erreur');
    } finally {
      setCreatingAlerte(false);
    }
  };
  const enCampagne = campagneOuRevelation(settings);
  return <div className="max-w-7xl mx-auto px-6 py-8">
      {}
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 600
        }} className="text-2xl text-gray-900 mb-1">
            {filters.flash ? 'Flash Annonces' : filters.categorie.length === 1 ? categories.find(c => c.id === filters.categorie[0])?.label || 'Catalogue' : filters.categorie.length > 1 ? `${filters.categorie.length} catégories` : 'Tous les articles'}
          </h1>
          <p className="text-sm text-gray-500">
            {hasMore ? `Plus de ${annonces.length} articles` : `${annonces.length} article${annonces.length !== 1 ? 's' : ''} trouvé${annonces.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {canCreateAlerte && <button onClick={handleCreerAlerte} disabled={creatingAlerte} className="btn-outline text-sm flex items-center gap-2">
            <BellPlus className="w-4 h-4" /> {creatingAlerte ? 'Création…' : 'Créer une alerte'}
          </button>}
      </div>

      {}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-6">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher dans les articles..." className="input-field pl-10 text-sm w-full" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <X className="w-4 h-4" />
            </button>}
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 px-4 py-2.5 rounded-full border-2 text-sm font-semibold transition-all" style={showFilters || activeFiltersCount > 0 ? {
          borderColor: 'var(--blue)',
          background: 'var(--blue)',
          color: 'white',
          boxShadow: 'var(--shadow-accent)'
        } : {
          borderColor: 'var(--border)',
          color: 'var(--ink-2)'
        }}>
            <SlidersHorizontal className="w-4 h-4" />
            Filtres
            {activeFiltersCount > 0 && <span className="bg-white text-primary-600 text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{activeFiltersCount}</span>}
          </button>
          <select value={sort} onChange={e => setSort(e.target.value)} className="input-field text-sm w-auto flex-1 sm:flex-none">
            <option value="recent">Plus récent</option>
            <option value="prix_asc">Prix croissant</option>
            <option value="prix_desc">Prix décroissant</option>
            {userProfile && <option value="proximite">Près de chez moi</option>}
          </select>
        </div>
      </div>

      {}
      {showFilters && <motion.div initial={{
      opacity: 0,
      y: -10
    }} animate={{
      opacity: 1,
      y: 0
    }} className="rounded-2xl p-5 mb-6" style={{
      background: 'var(--bg-2)',
      border: '1px solid var(--border-2)',
      boxShadow: 'var(--shadow-sm)'
    }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {}
            {filters.categorie.length === 1 && categories.find(c => c.id === filters.categorie[0])?.subcategories?.length > 0 && <div>
                <label className="block text-xs font-bold text-gray-600 mb-2">Sous-catégorie</label>
                <MultiSelectPills options={categories.find(c => c.id === filters.categorie[0]).subcategories.map(s => ({
            value: s,
            label: s
          }))} selected={filters.sousCategorie} onChange={v => setFilter('sousCategorie', v)} />
              </div>}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2">Ville</label>
              <select value={filters.ville[0] || ''} onChange={e => setFilter('ville', e.target.value ? [e.target.value] : [])} className="input-field text-sm w-full">
                <option value="">Toutes les villes</option>
                {getVilles(settings).map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2">Prix min (XAF)</label>
              <input type="number" value={filters.prixMin} onChange={e => setFilter('prixMin', e.target.value)} placeholder="0" className="input-field text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2">Prix max (XAF)</label>
              <input type="number" value={filters.prixMax} onChange={e => setFilter('prixMax', e.target.value)} placeholder="Illimité" className="input-field text-sm" />
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={filters.flash} onChange={e => setFilter('flash', e.target.checked)} className="w-4 h-4 accent-amber-500" />
              <span className="text-sm font-semibold flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-amber-500" /> Flash uniquement</span>
            </label>
            {activeFiltersCount > 0 && <button onClick={clearFilters} className="text-sm text-red-500 hover:text-red-600 font-semibold flex items-center gap-1">
                <X className="w-3.5 h-3.5" /> Effacer les filtres
              </button>}
          </div>
        </motion.div>}

      {}
      <div className="relative mb-6">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
          <button onClick={() => setFilter('categorie', [])} className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold transition-all" style={filters.categorie.length === 0 ? {
          background: 'var(--blue)',
          color: 'white',
          boxShadow: 'var(--shadow-accent)'
        } : {
          background: 'var(--bg-3)',
          color: 'var(--ink-2)'
        }}>
            Tout
          </button>
          {categories.map(cat => <button key={cat.id} onClick={() => setFilter('categorie', filters.categorie.includes(cat.id) ? filters.categorie.filter(c => c !== cat.id) : [...filters.categorie, cat.id])} className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap" style={filters.categorie.includes(cat.id) ? {
          background: 'var(--blue)',
          color: 'white',
          boxShadow: 'var(--shadow-accent)'
        } : {
          background: 'var(--bg-3)',
          color: 'var(--ink-2)'
        }}>
              {cat.label}
            </button>)}
        </div>
        <div className="pointer-events-none absolute top-0 right-0 bottom-2 w-12" style={{
        background: 'linear-gradient(to right, transparent, var(--bg))'
      }} />
      </div>

      {}
      {enCampagne ? <CompteARebours settings={settings} user={user} userProfile={userProfile} /> : <>
      {loading ? <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {Array(15).fill(0).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div> : annonces.length > 0 ? <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {annonces.map((a, i) => <ProductCard key={a.id} annonce={a} index={i} />)}
        </div> : <div className="text-center py-24 rounded-3xl" style={{
      background: 'var(--bg-2)',
      border: '1px dashed var(--border)'
    }}>
          <Search className="w-8 h-8 mx-auto mb-3" style={{
        color: 'var(--ink-4)'
      }} />
          <h3 className="text-lg font-bold mb-2" style={{
        color: 'var(--ink-2)'
      }}>Aucun article trouvé</h3>
          <p className="text-sm" style={{
        color: 'var(--ink-4)'
      }}>Essayez d'autres filtres ou revenez plus tard</p>
          {activeFiltersCount > 0 && <button onClick={clearFilters} className="btn-outline mt-4 text-sm">Effacer les filtres</button>}
        </div>}

      {}
      {!loading && hasMore && <div ref={sentinelRef} className="flex justify-center py-8">
          {loadingMore && <div className="text-sm text-gray-400">Chargement…</div>}
        </div>}
      </>}
    </div>;
}
