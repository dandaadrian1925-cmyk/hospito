import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getFavoris, getAnnonceById } from '../services/annoncesService';
import ProductCard from '../components/annonces/ProductCard';
import ProductCardSkeleton from '../components/annonces/ProductCardSkeleton';
export default function FavorisPage() {
  const {
    user
  } = useAuth();
  const [favoris, setFavoris] = useState([]);
  const [annonces, setAnnonces] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const favs = await getFavoris(user.uid);
        setFavoris(favs);
        const details = await Promise.all(favs.map(f => getAnnonceById(f.annonceId).catch(() => null)));
        setAnnonces(details.filter(a => a && a.statut === 'en_vente' && a.masquee === false));
      } catch (e) {
        console.error('Erreur chargement favoris :', e);
        setAnnonces([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);
  if (!user) return <div className="text-center py-24">
      <Heart className="w-12 h-12 text-gray-200 mx-auto mb-4" />
      <p className="text-gray-500 font-semibold">Connectez-vous pour voir vos favoris</p>
      <Link to="/auth" className="btn-primary mt-4 inline-flex">Se connecter</Link>
    </div>;
  return <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Heart className="w-6 h-6 text-red-500 fill-red-500" />
        <h1 className="text-2xl font-black text-gray-900" style={{
        fontFamily: 'var(--font-display)'
      }}>
          Mes favoris ({annonces.length})
        </h1>
      </div>

      {loading ? <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array(8).fill(0).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div> : annonces.length === 0 ? <div className="text-center py-24">
          <Heart className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 font-semibold text-lg">Aucun article en favori</p>
          <p className="text-gray-400 text-sm mt-1">Cliquez sur le cœur d'une annonce pour l'ajouter</p>
          <Link to="/catalogue" className="btn-primary mt-6 inline-flex">Explorer les articles</Link>
        </div> : <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {annonces.map((a, i) => <ProductCard key={a.id} annonce={a} index={i} initialLiked onToggleFavori={nowLiked => {
        if (!nowLiked) setAnnonces(prev => prev.filter(x => x.id !== a.id));
      }} />)}
        </div>}
    </div>;
}
