import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
export const getCategories = async () => {
  const snap = await getDocs(query(collection(db, 'categories'), orderBy('order', 'asc')));
  return snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));
};
const CATEGORY_EMOJIS = {
  electronique: '📱',
  electromenager: '🏠',
  motos: '🏍️',
  ordinateurs: '💻',
  vetements: '👗',
  chaussures: '👟',
  accessoires: '👜',
  livres: '📚',
  sport: '⚽',
  maison: '🛋️',
  autres: '📦'
};
export const getCategoryEmoji = id => CATEGORY_EMOJIS[id] || '📦';
