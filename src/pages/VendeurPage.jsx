import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, BadgeCheck, MapPin, Calendar, ShoppingBag, Users, Check } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getAnnoncesPublicByUser } from '../services/annoncesService';
import { getAvisByUser } from '../services/avisService';
import { backfillProfilPublicSiAbsent } from '../services/profilPublicService';
import { toggleSuivi, estAbonne } from '../services/followService';
import { getVendorBadges } from '../utils/vendorBadges';
import { getPresence } from '../lib/presence';
import { estVendeurProActif } from '../services/settingsService';
import { useAuth } from '../context/AuthContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import ProductCard from '../components/annonces/ProductCard';
import ProductCardSkeleton from '../components/annonces/ProductCardSkeleton';
import toast from 'react-hot-toast';
export default function VendeurPage() {
  const {
    userId
  } = useParams();
  const {
    user
  } = useAuth();
  const [vendeur, setVendeur] = useState(null);
  // #confidentialité (audit sécurité, corrigé) : ne retombait jamais que sur pseudo,
  // mais un `|| vendeur?.displayName` retombait sur le vrai nom si pseudo absent —
  // jamais le vrai nom entre clients (pseudo toujours présent, généré/backfillé à
  // l'inscription, donc ce cas ne devrait de toute façon jamais se produire).
  const nomAffiche = vendeur?.pseudo;
  useDocumentMeta(vendeur ? `${nomAffiche || 'Vendeur'} — Boutique MAKET` : null, vendeur ? `Découvrez les articles d'occasion en vente par ${nomAffiche || 'ce vendeur'} sur MAKET.` : null);
  const [annonces, setAnnonces] = useState([]);
  const [avisData, setAvisData] = useState({
    avis: [],
    moyenne: null,
    total: 0
  });
  const [loading, setLoading] = useState(true);
  const [abonne, setAbonne] = useState(false);
  const [suivant, setSuivant] = useState(false);
  useEffect(() => {
    window.scrollTo(0, 0);
    const load = async () => {
      setLoading(true);
      try {
        const publicSnap = await getDoc(doc(db, 'profils_publics', userId));
        const data = publicSnap.exists() ? publicSnap.data() : user ? await backfillProfilPublicSiAbsent(userId) : null;
        if (data) setVendeur(data);
        const all = await getAnnoncesPublicByUser(userId);
        setAnnonces(all);
        const avis = await getAvisByUser(userId);
        setAvisData(avis);
      } catch (e) {
        console.error('Erreur chargement profil vendeur :', e);
        toast.error('Impossible de charger ce profil');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);
  // #nouveau (demande utilisateur, "suivre un vendeur") : séparé du chargement
  // du profil ci-dessus — dépend de `user` (peut arriver après, ou changer si
  // l'utilisateur se connecte/déconnecte pendant qu'il consulte cette page).
  useEffect(() => {
    if (!user || user.uid === userId) {
      setAbonne(false);
      return;
    }
    estAbonne(user.uid, userId).then(setAbonne).catch(e => console.error('Vérification abonnement échouée :', e));
  }, [user, userId]);
  const handleToggleSuivre = async () => {
    if (!user) {
      toast.error('Connectez-vous pour suivre ce vendeur');
      return;
    }
    setSuivant(true);
    try {
      const maintenantAbonne = await toggleSuivi(user.uid, userId);
      setAbonne(maintenantAbonne);
      setVendeur(v => v && {
        ...v,
        abonnes: (v.abonnes || 0) + (maintenantAbonne ? 1 : -1)
      });
    } catch (e) {
      console.error('Suivre/ne plus suivre a échoué :', e);
      toast.error('Une erreur est survenue');
    } finally {
      setSuivant(false);
    }
  };
  const dateInscription = vendeur?.createdAt?.toDate ? vendeur.createdAt.toDate() : vendeur?.createdAt ? new Date(vendeur.createdAt) : null;
  if (!loading && !vendeur) return <div className="max-w-2xl mx-auto px-6 py-24 text-center">
      <p className="text-gray-500 font-semibold">Vendeur introuvable</p>
      <Link to="/catalogue" className="btn-primary mt-4 inline-flex">Explorer les articles</Link>
    </div>;
  return <div style={{
    maxWidth: 1100,
    margin: '0 auto',
    padding: '32px 24px'
  }}>
      {}
      <div className="card" style={{
      padding: 28,
      marginBottom: 32,
      display: 'flex',
      alignItems: 'center',
      gap: 20,
      flexWrap: 'wrap'
    }}>
        {loading ? <div className="animate-pulse" style={{
        width: 72,
        height: 72,
        borderRadius: '50%',
        background: 'var(--bg-3)'
      }} /> : <div style={{
        position: 'relative',
        flexShrink: 0
      }}>
            <div style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 700,
          fontSize: 26,
          fontFamily: 'var(--font-display)',
          overflow: 'hidden'
        }}>
              {vendeur?.photoURL ? <img src={vendeur.photoURL} alt={nomAffiche || 'Photo de profil'} style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }} /> : nomAffiche?.[0] || '?'}
            </div>
            {}
            {vendeur && <span title={getPresence(vendeur.lastActiveAt).label} style={{
          position: 'absolute',
          bottom: 2,
          right: 2,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: getPresence(vendeur.lastActiveAt).online ? '#22C55E' : '#94A3B8',
          border: '2.5px solid white'
        }} />}
          </div>}

        <div style={{
        flex: 1,
        minWidth: 200
      }}>
          {loading ? <div className="animate-pulse" style={{
          height: 20,
          width: 180,
          background: 'var(--bg-3)',
          borderRadius: 4
        }} /> : <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
              <h1 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: 22,
            color: 'var(--ink)'
          }}>
                {nomAffiche || 'Vendeur MAKET'}
              </h1>
              {vendeur?.cniVerifie && <span title="Vendeur vérifié"><BadgeCheck style={{
              width: 18,
              height: 18,
              color: 'var(--blue)'
            }} /></span>}
              {estVendeurProActif(vendeur) && <span style={{
              fontSize: 10,
              fontWeight: 800,
              color: 'white',
              background: 'linear-gradient(135deg, #EA580C, #7C2D12)',
              padding: '2px 7px',
              borderRadius: 6,
              letterSpacing: '0.03em'
            }}>VENDEUR PRO</span>}
              {vendeur && <span style={{
              fontSize: 12,
              fontWeight: 600,
              color: getPresence(vendeur.lastActiveAt).online ? '#16A34A' : 'var(--ink-4)'
            }}>
                  {getPresence(vendeur.lastActiveAt).label}
                </span>}
            </div>}

          <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 14,
          marginTop: 8,
          fontSize: 13,
          color: 'var(--ink-3)'
        }}>
            {vendeur?.ville && <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}>
                <MapPin style={{
              width: 13,
              height: 13
            }} /> {vendeur.ville}
              </span>}
            {dateInscription && <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}>
                <Calendar style={{
              width: 13,
              height: 13
            }} /> Membre depuis {dateInscription.toLocaleDateString('fr-FR', {
              month: 'long',
              year: 'numeric'
            })}
              </span>}
            <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}>
              <ShoppingBag style={{
              width: 13,
              height: 13
            }} /> {vendeur?.totalVentes || 0} vente{(vendeur?.totalVentes || 0) !== 1 ? 's' : ''}
            </span>
            <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}>
              <Users style={{
              width: 13,
              height: 13
            }} /> {vendeur?.abonnes || 0} abonné{(vendeur?.abonnes || 0) !== 1 ? 's' : ''}
            </span>
            {/* #nouveau (demande utilisateur, "expliquer comment remonter le
                score de fiabilité") : premier endroit où ce score devient
                visible — jusqu'ici jamais mirroré publiquement (cf.
                profilPublicService/scoreFiabiliteService, maket-admin). */}
            {typeof vendeur?.scoreFilabilite === 'number' && <span title="Basé sur les litiges, avis et vérifications de ce vendeur" style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}>
              <Star style={{
              width: 13,
              height: 13,
              fill: '#F59E0B',
              color: '#F59E0B'
            }} /> {vendeur.scoreFilabilite.toFixed(1)}/5 fiabilité
            </span>}
          </div>

          {!loading && vendeur && getVendorBadges(vendeur, avisData).length > 0 && <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          marginTop: 10
        }}>
              {getVendorBadges(vendeur, avisData).map(b => <span key={b.id} style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: 20,
            background: b.bg,
            color: b.color
          }}>
                  {b.label}
                </span>)}
            </div>}

          {!loading && vendeur?.boutiqueBio && <p style={{
          fontSize: 13,
          color: 'var(--ink-2)',
          marginTop: 10,
          fontStyle: 'italic',
          maxWidth: 480
        }}>
              "{vendeur.boutiqueBio}"
            </p>}
        </div>

        {}
        <div style={{
        textAlign: 'center',
        padding: '8px 16px'
      }}>
          {avisData.moyenne ? <>
              <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            justifyContent: 'center'
          }}>
                <Star style={{
              width: 18,
              height: 18,
              color: '#F59E0B'
            }} fill="#F59E0B" />
                <span style={{
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--ink)'
            }}>{avisData.moyenne}</span>
              </div>
              <p style={{
            fontSize: 11,
            color: 'var(--ink-4)',
            marginTop: 2
          }}>{avisData.total} avis</p>
            </> : <p style={{
          fontSize: 12,
          color: 'var(--ink-4)'
        }}>Pas encore d'avis</p>}

          {!loading && user && user.uid !== userId && <button onClick={handleToggleSuivre} disabled={suivant} style={{
          marginTop: 10,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 16px',
          borderRadius: 20,
          fontSize: 13,
          fontWeight: 700,
          border: abonne ? '1.5px solid var(--bg-3)' : 'none',
          background: abonne ? 'transparent' : 'var(--accent)',
          color: abonne ? 'var(--ink-3)' : 'white',
          cursor: suivant ? 'default' : 'pointer',
          opacity: suivant ? 0.6 : 1
        }}>
              {abonne ? <><Check style={{
            width: 14,
            height: 14
          }} /> Abonné</> : <><Users style={{
            width: 14,
            height: 14
          }} /> Suivre</>}
            </button>}
        </div>
      </div>

      {}
      {avisData.avis.length > 0 && <div style={{
      marginBottom: 32
    }}>
          <h2 style={{
        fontSize: 16,
        fontWeight: 700,
        marginBottom: 14,
        color: 'var(--ink)'
      }}>Avis reçus</h2>
          <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }}>
            {avisData.avis.slice(0, 6).map(a => <div key={a.id} className="card" style={{
          padding: 14
        }}>
                <div style={{
            display: 'flex',
            gap: 2,
            marginBottom: a.commentaire ? 6 : 0
          }}>
                  {[1, 2, 3, 4, 5].map(n => <Star key={n} style={{
              width: 14,
              height: 14,
              color: n <= a.note ? '#F59E0B' : '#E4E4E2'
            }} fill={n <= a.note ? '#F59E0B' : 'none'} />)}
                </div>
                {a.commentaire && <p style={{
            fontSize: 13,
            color: 'var(--ink-2)'
          }}>{a.commentaire}</p>}
              </div>)}
          </div>
        </div>}

      {}
      <h2 style={{
      fontSize: 16,
      fontWeight: 700,
      marginBottom: 14,
      color: 'var(--ink)'
    }}>
        Articles en vente {!loading && `(${annonces.length})`}
      </h2>
      {loading ? <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array(10).fill(0).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div> : annonces.length > 0 ? <motion.div initial={{
      opacity: 0
    }} animate={{
      opacity: 1
    }} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {annonces.map((a, i) => <ProductCard key={a.id} annonce={a} index={i} />)}
        </motion.div> : <p style={{
      color: 'var(--ink-4)',
      fontSize: 14,
      padding: '24px 0'
    }}>Aucun article en vente pour le moment.</p>}
    </div>;
}
