import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { lienInterneSur } from '../lib/safeLink';
import { motion } from 'framer-motion';
import { Bell, ShoppingCart, Star, Shield, Check, Trash2, Gift, ArrowDownCircle, ArrowUpCircle, Tag, Flag, Headphones, BadgeCheck, UserCog, Calendar, Pill, FileText, Receipt, FolderHeart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/config';
const NOTIF_ICONS = {
  commande: ShoppingCart,
  avis: Star,
  parrainage: Gift,
  depot: ArrowDownCircle,
  retrait: ArrowUpCircle,
  annonce: Tag,
  signalement: Flag,
  litige: Shield,
  support: Headphones,
  cni: BadgeCheck,
  compte: UserCog,
  rdv: Calendar,
  ordonnance: Pill,
  resultat: FileText,
  facture: Receipt,
  dossier: FolderHeart,
  default: Bell
};
const NOTIF_COLORS = {
  commande: 'bg-primary-100 text-primary-600',
  avis: 'bg-yellow-100 text-yellow-600',
  parrainage: 'bg-purple-100 text-purple-600',
  depot: 'bg-green-100 text-green-600',
  retrait: 'bg-orange-100 text-orange-600',
  annonce: 'bg-blue-100 text-blue-600',
  signalement: 'bg-red-100 text-red-600',
  litige: 'bg-red-100 text-red-600',
  support: 'bg-teal-100 text-teal-600',
  cni: 'bg-indigo-100 text-indigo-600',
  compte: 'bg-gray-200 text-gray-700',
  rdv: 'bg-cyan-100 text-cyan-600',
  ordonnance: 'bg-emerald-100 text-emerald-600',
  resultat: 'bg-sky-100 text-sky-600',
  facture: 'bg-amber-100 text-amber-600',
  dossier: 'bg-rose-100 text-rose-600',
  default: 'bg-gray-100 text-gray-600'
};
function timeAgo(value) {
  const d = value?.toDate ? value.toDate() : new Date(value);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  if (hours < 24) return `Il y a ${hours}h`;
  return `Il y a ${days}j`;
}
export default function NotificationsPage() {
  const {
    user
  } = useAuth();
  const [notifs, setNotifs] = useState(null);
  const [filter, setFilter] = useState('all');
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'notifications'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setNotifs(snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })));
    }, err => {
      console.error('Erreur chargement notifications:', err);
      setNotifs([]);
    });
    return unsub;
  }, [user]);
  const list = notifs || [];
  const unreadCount = list.filter(n => !n.lu).length;
  const markAllRead = async () => {
    const unread = list.filter(n => !n.lu);
    if (unread.length === 0) return;
    const batch = writeBatch(db);
    unread.forEach(n => batch.update(doc(db, 'notifications', n.id), {
      lu: true
    }));
    await batch.commit();
  };
  const markRead = async id => {
    try {
      await updateDoc(doc(db, 'notifications', id), {
        lu: true
      });
    } catch (e) {
      console.error(e);
    }
  };
  const deleteNotif = async id => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (e) {
      console.error(e);
    }
  };
  const filtered = filter === 'unread' ? list.filter(n => !n.lu) : list;
  return <div className="max-w-2xl mx-auto px-6 py-8">
      {}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900" style={{
          fontFamily: 'var(--font-display)'
        }}>
            Notifications
          </h1>
          {unreadCount > 0 && <p className="text-sm text-primary-600 font-semibold mt-1">{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</p>}
        </div>
        {unreadCount > 0 && <button onClick={markAllRead} className="text-sm text-primary-600 font-semibold hover:text-primary-700 flex items-center gap-1">
            <Check className="w-4 h-4" /> Tout marquer lu
          </button>}
      </div>

      {}
      <div className="flex gap-2 mb-6">
        {[['all', 'Toutes'], ['unread', 'Non lues']].map(([v, label]) => <button key={v} onClick={() => setFilter(v)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${filter === v ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {label}
            {v === 'unread' && unreadCount > 0 && <span className="ml-1.5 bg-white text-primary-600 text-xs rounded-full w-5 h-5 inline-flex items-center justify-center font-bold">{unreadCount}</span>}
          </button>)}
      </div>

      {}
      <div className="space-y-2">
        {notifs === null ? <div className="text-center py-16 text-gray-400 font-semibold">Chargement…</div> : filtered.length === 0 ? <div className="text-center py-16">
            <Bell className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-semibold">Aucune notification</p>
          </div> : filtered.map((notif, i) => {
        const Icon = NOTIF_ICONS[notif.type] || NOTIF_ICONS.default;
        const color = NOTIF_COLORS[notif.type] || NOTIF_COLORS.default;
        return <motion.div key={notif.id} initial={{
          opacity: 0,
          y: 10
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: i * 0.05
        }} className={`flex items-start gap-4 p-4 rounded-2xl border transition-all group ${!notif.lu ? 'bg-primary-50 border-primary-100' : 'bg-white border-gray-100'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <Link to={lienInterneSur(notif.link)} onClick={() => markRead(notif.id)} className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-bold ${!notif.lu ? 'text-gray-900' : 'text-gray-700'}`}>{notif.titre}</p>
                    {!notif.lu && <span className="w-2 h-2 bg-primary-600 rounded-full flex-shrink-0 mt-1.5"></span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{notif.message}</p>
                  <p className="text-xs text-gray-400 mt-1.5">{timeAgo(notif.createdAt)}</p>
                </Link>
                <button onClick={() => deleteNotif(notif.id)} className="opacity-60 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400 flex-shrink-0">
                  {}
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>;
      })}
      </div>
    </div>;
}
