import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, TrendingUp, Shield } from 'lucide-react';
import HeroCarousel from '../components/home/HeroCarousel';
import Ticker from '../components/home/Ticker';
import Stories from '../components/home/Stories';
import HowItWorks from '../components/home/HowItWorks';
import ProductCard from '../components/annonces/ProductCard';
import ProductCardSkeleton from '../components/annonces/ProductCardSkeleton';
import { getAnnonces, isFlashActive, annonceSortWeight } from '../services/annoncesService';
import { getCategories } from '../services/categoriesService';
import { getSettings } from '../services/settingsService';
import { getScoresParVendeur, getVendeurProParVendeur } from '../services/profilPublicService';
import CompteARebours, { campagneOuRevelation } from '../components/common/CompteARebours';
import { useAuth } from '../context/AuthContext';
export default function HomePage() {
  const { user, userProfile } = useAuth();
  const [annonces, setAnnonces] = useState([]);
  const [flashAnnonces, setFlashAnnonces] = useState([]);
  const [vendeurProMap, setVendeurProMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState({
    pourcentageCommissionParrain: 100,
    nombreVentesRecompensees: 3,
    limiteAnnoncesParFilleulQualifie: 2
  });
  useEffect(() => {
    getSettings().then(setSettings);
  }, []);
  useEffect(() => {
    getCategories().then(setCategories).catch(e => console.error('getCategories a échoué :', e));
  }, []);
  useEffect(() => {
    const load = async () => {
      try {
        const all = await getAnnonces();
        // #nouveau (retour utilisateur, "le boost ne sert à rien") : les
        // annonces boostées ne remontaient qu'au catalogue (CataloguePage,
        // sort==='recent') — jamais ici, alors que "Articles récents" est la
        // toute première chose vue sur le site. Tri stable (Array.sort) : à
        // poids de boost égal, l'ordre par date déjà renvoyé par getAnnonces
        // est préservé.
        // #nouveau (demande utilisateur, "classer aussi par score de
        // fiabilité") : departage désormais aussi par score du vendeur, à
        // poids de boost égal (cf. annonceSortWeight).
        const [scores, proMap] = await Promise.all([
          getScoresParVendeur(all.list.map(a => a.userId)),
          getVendeurProParVendeur(all.list.map(a => a.userId))
        ]);
        setVendeurProMap(proMap);
        const triees = [...all.list].sort((a, b) => annonceSortWeight(b, scores, proMap) - annonceSortWeight(a, scores, proMap));
        setAnnonces(triees);
        setFlashAnnonces(triees.filter(a => isFlashActive(a)));
      } catch (e) {
        console.error('getAnnonces a échoué :', e);
        setAnnonces([]);
        setFlashAnnonces([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);
  const filtered = activeCategory ? annonces.filter(a => a.categorie === activeCategory) : annonces;
  const enCampagne = campagneOuRevelation(settings);
  return <div className="gradient-mesh">
      {}
      <Ticker />

      {}
      <HeroCarousel />

      {}
      <section className="max-w-7xl mx-auto px-6 py-10">
        <Stories />
      </section>

      {}
      {enCampagne ? <section className="max-w-7xl mx-auto px-6 mb-14">
          <CompteARebours settings={settings} user={user} userProfile={userProfile} />
        </section> : <>
      {}
      {flashAnnonces.length > 0 && <section className="max-w-7xl mx-auto px-6 mb-14">
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="section-tag">Offres limitées</span>
              <h2 style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600
            }} className="text-2xl text-gray-900">
                Flash
              </h2>
              <p className="text-sm text-gray-500 mt-1">Ventes à durée limitée, à saisir vite</p>
            </div>
            <Link to="/catalogue?flash=true" className="text-sm text-primary-600 font-semibold hover:text-primary-700 flex items-center gap-1 transition-colors">
              Voir tout <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {flashAnnonces.slice(0, 5).map((a, i) => <ProductCard key={a.id} annonce={a} index={i} />)}
          </div>
        </section>}

      {}
      <section className="max-w-7xl mx-auto px-6 mb-14">
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="section-tag">Fraîchement publié</span>
            <h2 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600
          }} className="text-2xl text-gray-900">
              Articles récents
            </h2>
            <p className="text-sm text-gray-500 mt-1">Les dernières bonnes affaires partout au Cameroun</p>
          </div>
          <Link to="/catalogue" className="text-sm text-primary-600 font-semibold hover:text-primary-700 flex items-center gap-1 transition-colors">
            Voir tout <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {}
        <div className="relative mb-7">
          <div className="flex flex-nowrap gap-2 overflow-x-auto scrollbar-hide pb-2" style={{
          WebkitOverflowScrolling: 'touch'
        }}>
            <button onClick={() => setActiveCategory(null)} className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all" style={!activeCategory ? {
            background: 'var(--blue)',
            color: 'white',
            boxShadow: 'var(--shadow-accent)'
          } : {
            background: 'var(--bg-3)',
            color: 'var(--ink-2)'
          }}>
              Tout
            </button>
            {categories.map(cat => <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all" style={activeCategory === cat.id ? {
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

        {loading ? <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {Array(10).fill(0).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div> : filtered.length > 0 ? <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {filtered.slice(0, 20).map((a, i) => <ProductCard key={a.id} annonce={a} index={i} />)}
          </div> : <div className="text-center py-16 rounded-3xl" style={{
        background: 'var(--bg-2)',
        border: '1px dashed var(--border)'
      }}>
            <p className="font-semibold" style={{
          color: 'var(--ink-2)'
        }}>Aucun article pour le moment</p>
            <p className="text-sm mt-1" style={{
          color: 'var(--ink-4)'
        }}>Soyez le premier à publier !</p>
            <Link to="/publier" className="btn-primary mt-4 inline-flex">Publier une annonce</Link>
          </div>}
      </section>
      </>}

      {}
      <HowItWorks />

      {}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} whileInView={{
        opacity: 1,
        y: 0
      }} viewport={{
        once: true
      }} className="gradient-blue rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-white text-center md:text-left">
            <h2 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600
          }} className="text-2xl md:text-3xl mb-2">
              Parrainez vos amis
            </h2>
            <p className="text-primary-200 text-sm md:text-base">
              Gagnez <strong className="text-white">{settings.pourcentageCommissionParrain ?? 100}% de la commission MAKET</strong> sur les {settings.nombreVentesRecompensees ?? 3} premières ventes de votre filleul, et augmentez votre limite d'annonces en vente de <strong className="text-white">+{settings.limiteAnnoncesParFilleulQualifie ?? 2}</strong> à chaque parrainage. Lui aussi profite d'une commission réduite sur ses premières ventes.
            </p>
          </div>
          <Link to="/mon-compte/parrainage" className="flex-shrink-0 bg-white text-primary-700 font-bold px-6 py-3 rounded-full hover:bg-primary-50 transition-all flex items-center gap-2">
            Mon code de parrainage <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </section>
    </div>;
}
