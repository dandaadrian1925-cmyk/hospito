import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Shield, KeyRound, Heart, Share2, Flag, ChevronLeft, ChevronRight, Star, Clock, Eye, Play, FileText, MessageCircle, ShoppingCart, Zap, BadgeCheck, X, Check, Tag, Package, HelpCircle, Send } from 'lucide-react';
import { getAnnonceById, toggleFavori, isFavori, signalerAnnonce, getAnnonces, isFlashActive, annonceSortWeight, listenQuestions, poserQuestion, repondreQuestion } from '../services/annoncesService';
import { getCategories, getCategoryEmoji } from '../services/categoriesService';
import { getAvisByUser } from '../services/avisService';
import { getScoresParVendeur, getVendeurProParVendeur } from '../services/profilPublicService';
import ProductCard from '../components/annonces/ProductCard';
import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { getOrCreateConversation } from '../services/chatService';
import { creerNotification } from '../services/notificationsService';
import { ilYA } from '../utils/timeAgo';
import { getPresence } from '../lib/presence';
import { estVendeurProActif } from '../services/settingsService';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import toast from 'react-hot-toast';
const SYS = {
  fontFamily: 'var(--font)'
};
function OffreModal({
  annonce,
  onClose
}) {
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const [prix, setPrix] = useState('');
  const [sending, setSending] = useState(false);
  const envoyer = async () => {
    if (!prix || parseInt(prix) <= 0) {
      toast.error('Entrez un montant valide');
      return;
    }
    if (parseInt(prix) >= annonce.prix) {
      toast.error('Votre offre doit être inférieure au prix demandé');
      return;
    }
    setSending(true);
    try {
      const convId = await getOrCreateConversation(user.uid, annonce.userId, annonce.id);
      const messageOffre = `💰 Offre de prix : ${parseInt(prix).toLocaleString()} XAF (prix demandé : ${annonce.prix.toLocaleString()} XAF)`;
      await addDoc(collection(db, 'conversations', convId, 'messages'), {
        senderId: user.uid,
        message: messageOffre,
        type: 'offre',
        montantOffre: parseInt(prix),
        statut: 'en_attente',
        lu: false,
        createdAt: serverTimestamp(),
        annonceId: annonce.id,
        titreAnnonce: annonce.titre || null,
        prixDemande: annonce.prix
      });
      // #nouveau (demande utilisateur, "le vendeur n'est pas notifié pour
      // les offres reçues" + "liste des conversations façon WhatsApp") : cet
      // envoi passe par un addDoc direct (message spécial 'offre'), pas par
      // envoyerMessage (chatService.js) — donc ni notification, ni mise à
      // jour de l'aperçu/tri de la conversation.
      updateDoc(doc(db, 'conversations', convId), {
        lastMessage: messageOffre,
        lastMessageAt: serverTimestamp(),
        lastMessageSenderId: user.uid,
        [`nonLu.${annonce.userId}`]: true
      }).catch(e => console.error('Mise à jour aperçu conversation (offre) échouée :', e));
      creerNotification({
        userId: annonce.userId,
        type: 'offre',
        titre: 'Nouvelle offre reçue',
        message: `Offre de ${parseInt(prix).toLocaleString('fr-FR')} XAF sur "${annonce.titre || 'votre annonce'}" (prix demandé : ${annonce.prix.toLocaleString('fr-FR')} XAF).`,
        link: `/chat/${convId}`
      }).catch(e => console.error('Notification nouvelle offre échouée :', e));
      toast.success('Offre envoyée ! Le vendeur vous répondra par message.');
      onClose();
      navigate(`/chat/${convId}`);
    } catch (e) {
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };
  const pct = prix ? Math.round((1 - parseInt(prix) / annonce.prix) * 100) : 0;
  return <div className="modal-overlay" onClick={onClose}>
      <motion.div className="modal" initial={{
      opacity: 0,
      scale: 0.95,
      y: 20
    }} animate={{
      opacity: 1,
      scale: 1,
      y: 0
    }} exit={{
      opacity: 0,
      scale: 0.95,
      y: 20
    }} onClick={e => e.stopPropagation()}>
        <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20
      }}>
          <h3 style={{
          fontSize: 16,
          fontWeight: 700,
          ...SYS
        }}>Faire une offre</h3>
          <button onClick={onClose} style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-3)',
          padding: 4
        }}>
            <X style={{
            width: 18,
            height: 18
          }} />
          </button>
        </div>

        {}
        <div style={{
        display: 'flex',
        gap: 10,
        padding: '10px 12px',
        background: 'var(--bg-2)',
        borderRadius: 8,
        marginBottom: 20
      }}>
          <div style={{
          width: 48,
          height: 48,
          borderRadius: 6,
          overflow: 'hidden',
          background: 'var(--bg-3)',
          flexShrink: 0
        }}>
            {annonce.photos?.[0] ? <img src={annonce.photos[0]} alt={annonce.titre || ''} style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }} /> : <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20
          }}>📦</div>}
          </div>
          <div>
            <p style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text)',
            ...SYS
          }}>{annonce.titre}</p>
            <p style={{
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--blue)',
            ...SYS
          }}>{annonce.prix?.toLocaleString()} XAF</p>
          </div>
        </div>

        {}
        <div style={{
        marginBottom: 8
      }}>
          <label style={{
          display: 'block',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-3)',
          marginBottom: 6,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          ...SYS
        }}>
            Votre offre (XAF)
          </label>
          <div style={{
          position: 'relative'
        }}>
            <Tag style={{
            position: 'absolute',
            left: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 15,
            height: 15,
            color: 'var(--text-4)'
          }} />
            <input type="number" value={prix} onChange={e => setPrix(e.target.value)} placeholder={Math.round(annonce.prix * 0.85).toLocaleString()} className="input-field" style={{
            paddingLeft: 32,
            fontSize: 15,
            fontWeight: 600
          }} autoFocus />
          </div>
        </div>

        {}
        {prix && parseInt(prix) > 0 && parseInt(prix) < annonce.prix && <div style={{
        padding: '8px 12px',
        borderRadius: 8,
        background: pct > 20 ? '#FEF2F2' : pct > 10 ? '#FFFBEB' : '#ECFDF5',
        marginBottom: 12
      }}>
            <p style={{
          fontSize: 12,
          fontWeight: 600,
          color: pct > 20 ? 'var(--red)' : pct > 10 ? '#D97706' : 'var(--green)',
          ...SYS
        }}>
              {pct > 20 ? `⚠️ Offre très basse (−${pct}%)` : pct > 10 ? `💬 Offre raisonnable (−${pct}%)` : `✅ Bonne offre (−${pct}%)`}
            </p>
          </div>}
        {prix && parseInt(prix) >= annonce.prix && <div style={{
        padding: '8px 12px',
        borderRadius: 8,
        background: '#FEF2F2',
        marginBottom: 12
      }}>
            <p style={{
          fontSize: 12,
          color: 'var(--red)',
          fontWeight: 600,
          ...SYS
        }}>❌ L'offre doit être inférieure au prix demandé</p>
          </div>}

        <p style={{
        fontSize: 12,
        color: 'var(--text-3)',
        marginBottom: 16,
        lineHeight: 1.5,
        ...SYS
      }}>
          Le vendeur recevra votre offre par message et pourra l'accepter, la refuser ou faire une contre-offre.
        </p>

        <div style={{
        display: 'flex',
        gap: 8
      }}>
          <button onClick={onClose} className="btn-ghost" style={{
          flex: 1,
          justifyContent: 'center'
        }}>Annuler</button>
          <button onClick={envoyer} disabled={sending || !prix || parseInt(prix) >= annonce.prix} className="btn-primary" style={{
          flex: 1,
          justifyContent: 'center',
          opacity: !prix || parseInt(prix) >= annonce.prix ? 0.5 : 1
        }}>
            {sending ? <span className="spin" style={{
            width: 14,
            height: 14,
            border: '2px solid rgba(255,255,255,0.3)',
            borderTopColor: 'white',
            borderRadius: '50%',
            display: 'inline-block'
          }} /> : 'Envoyer l\'offre'}
          </button>
        </div>
      </motion.div>
    </div>;
}
function QuestionsSection({
  annonce,
  user
}) {
  const [questions, setQuestions] = useState([]);
  const [nouvelleQuestion, setNouvelleQuestion] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [reponses, setReponses] = useState({});
  const [repondEnCours, setRepondEnCours] = useState(null);
  const navigate = useNavigate();
  const estProprietaire = user?.uid === annonce.userId;
  useEffect(() => {
    const unsub = listenQuestions(annonce.id, setQuestions);
    return unsub;
  }, [annonce.id]);
  const handlePoser = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!nouvelleQuestion.trim()) return;
    setEnvoi(true);
    try {
      await poserQuestion(annonce.id, user.uid, nouvelleQuestion);
      setNouvelleQuestion('');
      toast.success('Question envoyée au vendeur');
    } catch (e) {
      toast.error(e.message || 'Erreur');
    } finally {
      setEnvoi(false);
    }
  };
  const handleRepondre = async questionId => {
    const texte = reponses[questionId];
    if (!texte?.trim()) return;
    setRepondEnCours(questionId);
    try {
      await repondreQuestion(annonce.id, questionId, texte, user.uid);
      setReponses(r => ({
        ...r,
        [questionId]: ''
      }));
    } catch (e) {
      toast.error(e.message || 'Erreur');
    } finally {
      setRepondEnCours(null);
    }
  };
  return <div style={{
    marginTop: 16
  }}>
      <h2 style={{
      fontSize: 15,
      fontWeight: 700,
      marginBottom: 10,
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }}>
        <HelpCircle style={{
        width: 16,
        height: 16
      }} /> Questions ({questions.length})
      </h2>

      {questions.length === 0 && <p style={{
      fontSize: 13,
      color: 'var(--text-3)',
      marginBottom: 12
    }}>Aucune question pour le moment.</p>}

      <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      marginBottom: 14
    }}>
        {questions.map(q => <div key={q.id} style={{
        padding: '10px 12px',
        background: 'var(--bg-2)',
        borderRadius: 8,
        border: '1.5px solid var(--border)'
      }}>
            <p style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--text)'
        }}>{q.question}</p>
            {q.reponse ? <p style={{
          fontSize: 13,
          color: 'var(--text-2)',
          marginTop: 6,
          paddingLeft: 10,
          borderLeft: '2px solid var(--blue)'
        }}>
                <strong>Vendeur :</strong> {q.reponse}
              </p> : estProprietaire ? <div style={{
          display: 'flex',
          gap: 6,
          marginTop: 8
        }}>
                <input value={reponses[q.id] || ''} onChange={e => setReponses(r => ({
            ...r,
            [q.id]: e.target.value
          }))} placeholder="Votre réponse…" className="input-field" style={{
            flex: 1,
            fontSize: 13,
            padding: '7px 10px'
          }} onKeyDown={e => e.key === 'Enter' && handleRepondre(q.id)} />
                <button onClick={() => handleRepondre(q.id)} disabled={repondEnCours === q.id} className="btn-primary" style={{
            padding: '7px 12px'
          }}>
                  <Send style={{
              width: 14,
              height: 14
            }} />
                </button>
              </div> : <p style={{
          fontSize: 12,
          color: 'var(--text-4)',
          marginTop: 6,
          fontStyle: 'italic'
        }}>En attente de réponse du vendeur…</p>}
          </div>)}
      </div>

      {!estProprietaire && <div style={{
      display: 'flex',
      gap: 8
    }}>
          <input value={nouvelleQuestion} onChange={e => setNouvelleQuestion(e.target.value)} placeholder="Posez une question au vendeur…" className="input-field" style={{
        flex: 1,
        fontSize: 13
      }} onKeyDown={e => e.key === 'Enter' && handlePoser()} maxLength={300} />
          <button onClick={handlePoser} disabled={envoi || !nouvelleQuestion.trim()} className="btn-outline" style={{
        padding: '10px 14px'
      }}>
            <Send style={{
          width: 15,
          height: 15
        }} />
          </button>
        </div>}
    </div>;
}
function GalerieMosaique({
  photos,
  titre,
  onVideoPlay,
  hasVideo
}) {
  const [lightbox, setLightbox] = useState(null);
  const displayPhotos = photos?.length ? photos : [];
  return <>
      {}
      <div style={{
      display: 'grid',
      gap: 4,
      borderRadius: 10,
      overflow: 'hidden'
    }}>
        {displayPhotos.length === 0 ? <div style={{
        aspectRatio: '1',
        background: 'var(--bg-3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 64,
        color: 'var(--text-4)'
      }}>📦</div> : displayPhotos.length === 1 ? <div style={{
        position: 'relative',
        cursor: 'zoom-in'
      }} onClick={() => setLightbox(0)}>
            <img src={displayPhotos[0]} alt={titre} style={{
          width: '100%',
          aspectRatio: '1',
          objectFit: 'cover',
          display: 'block'
        }} />
          </div> : displayPhotos.length === 2 ? <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 4
      }}>
            {displayPhotos.map((p, i) => <div key={i} style={{
          cursor: 'zoom-in'
        }} onClick={() => setLightbox(i)}>
                <img src={p} alt={`${titre} - photo ${i + 1}`} style={{
            width: '100%',
            aspectRatio: '1',
            objectFit: 'cover',
            display: 'block'
          }} />
              </div>)}
          </div> : <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 4
      }}>
            {}
            <div style={{
          cursor: 'zoom-in',
          gridRow: 'span 2'
        }} onClick={() => setLightbox(0)}>
              <img src={displayPhotos[0]} alt={titre} style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            aspectRatio: displayPhotos.length >= 5 ? 'auto' : '1'
          }} />
            </div>
            {}
            <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 4
        }}>
              {displayPhotos.slice(1, 5).map((p, i) => <div key={i} style={{
            position: 'relative',
            cursor: 'zoom-in'
          }} onClick={() => setLightbox(i + 1)}>
                  <img src={p} alt={`${titre} - photo ${i + 2}`} style={{
              width: '100%',
              aspectRatio: '1',
              objectFit: 'cover',
              display: 'block'
            }} />
                  {}
                  {i === 3 && displayPhotos.length > 5 && <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
                      <span style={{
                color: 'white',
                fontWeight: 700,
                fontSize: 18,
                ...SYS
              }}>+{displayPhotos.length - 4}</span>
                    </div>}
                </div>)}
            </div>
          </div>}
      </div>

      {}
      {hasVideo && <button onClick={onVideoPlay} style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      width: '100%',
      padding: '10px 14px',
      background: 'var(--bg-2)',
      border: '1.5px solid var(--border)',
      borderRadius: 8,
      cursor: 'pointer',
      marginTop: 8,
      transition: 'all 0.15s'
    }} onMouseEnter={e => {
      e.currentTarget.style.borderColor = 'var(--blue)';
      e.currentTarget.style.background = 'var(--blue-light)';
    }} onMouseLeave={e => {
      e.currentTarget.style.borderColor = 'var(--border)';
      e.currentTarget.style.background = 'var(--bg-2)';
    }}>
          <div style={{
        width: 32,
        height: 32,
        background: 'var(--blue)',
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
            <Play style={{
          width: 14,
          height: 14,
          color: 'white',
          fill: 'white'
        }} />
          </div>
          <div style={{
        textAlign: 'left'
      }}>
            <p style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--text)',
          ...SYS
        }}>Voir la vidéo de l'article</p>
            <p style={{
          fontSize: 11,
          color: 'var(--text-3)',
          ...SYS
        }}>Défauts et qualités présentés honnêtement</p>
          </div>
        </button>}

      {}
      <AnimatePresence>
        {lightbox !== null && <motion.div initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} exit={{
        opacity: 0
      }} style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.92)',
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }} onClick={() => setLightbox(null)}>
            <button onClick={() => setLightbox(null)} style={{
          position: 'absolute',
          top: 16,
          right: 16,
          background: 'rgba(255,255,255,0.15)',
          border: 'none',
          borderRadius: 8,
          padding: 8,
          cursor: 'pointer',
          color: 'white'
        }}>
              <X style={{
            width: 20,
            height: 20
          }} />
            </button>
            {lightbox > 0 && <button onClick={e => {
          e.stopPropagation();
          setLightbox(l => Math.max(0, l - 1));
        }} style={{
          position: 'absolute',
          left: 16,
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'rgba(255,255,255,0.15)',
          border: 'none',
          borderRadius: 8,
          padding: 10,
          cursor: 'pointer',
          color: 'white'
        }}>
                <ChevronLeft style={{
            width: 20,
            height: 20
          }} />
              </button>}
            <motion.img key={lightbox} initial={{
          opacity: 0,
          scale: 0.95
        }} animate={{
          opacity: 1,
          scale: 1
        }} src={displayPhotos[lightbox]} alt={`${titre} - photo ${lightbox + 1}`} style={{
          maxWidth: '90vw',
          maxHeight: '90vh',
          objectFit: 'contain',
          borderRadius: 8
        }} onClick={e => e.stopPropagation()} />
            {lightbox < displayPhotos.length - 1 && <button onClick={e => {
          e.stopPropagation();
          setLightbox(l => Math.min(displayPhotos.length - 1, l + 1));
        }} style={{
          position: 'absolute',
          right: 16,
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'rgba(255,255,255,0.15)',
          border: 'none',
          borderRadius: 8,
          padding: 10,
          cursor: 'pointer',
          color: 'white'
        }}>
                <ChevronRight style={{
            width: 20,
            height: 20
          }} />
              </button>}
            <div style={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 6
        }}>
              {displayPhotos.map((_, i) => <button key={i} onClick={e => {
            e.stopPropagation();
            setLightbox(i);
          }} style={{
            width: i === lightbox ? 20 : 6,
            height: 6,
            borderRadius: 3,
            background: i === lightbox ? 'white' : 'rgba(255,255,255,0.35)',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }} />)}
            </div>
          </motion.div>}
      </AnimatePresence>
    </>;
}
export default function AnnoncePage() {
  const {
    id
  } = useParams();
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const [annonce, setAnnonce] = useState(null);
  const [vendeur, setVendeur] = useState(null);
  const [vendeurAvis, setVendeurAvis] = useState(null);
  const [similaires, setSimilaires] = useState([]);
  const [autresVendeur, setAutresVendeur] = useState([]);
  const [vendeurProSimilaires, setVendeurProSimilaires] = useState({});
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [favoriLoading, setFavoriLoading] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [showOffre, setShowOffre] = useState(false);
  const [showSignalement, setShowSignalement] = useState(false);
  const [signalRaison, setSignalRaison] = useState('');
  const [signalSending, setSignalSending] = useState(false);
  const [categories, setCategories] = useState([]);
  useEffect(() => {
    getCategories().then(setCategories).catch(e => console.error('getCategories a échoué :', e));
  }, []);
  useDocumentMeta(annonce?.titre, annonce ? `${annonce.titre} — ${(annonce.prix || 0).toLocaleString('fr-FR')} XAF à ${annonce.ville || 'vendre'} sur MAKET.` : null);
  useEffect(() => {
    window.scrollTo(0, 0);
    const load = async () => {
      setLoading(true);
      try {
        const data = await getAnnonceById(id);
        if (!data) {
          navigate('/catalogue');
          return;
        }
        setAnnonce(data);
        if (user) {
          const fav = await isFavori(user.uid, data.id);
          setLiked(fav);
        }
        let vendeurData = null;
        if (data.userId) {
          const snap = await getDoc(doc(db, 'profils_publics', data.userId));
          if (snap.exists()) {
            vendeurData = snap.data();
            setVendeur(vendeurData);
          }
          getAvisByUser(data.userId).then(setVendeurAvis).catch(e => console.error('getAvisByUser a échoué :', e));
        }
        const all = await getAnnonces({
          categorie: data.categorie
        });
        // #nouveau (retour utilisateur, "le boost ne sert à rien") : trié par
        // poids de boost AVANT de couper aux 6 premiers — sinon un article
        // boosté pouvait rester invisible dans "Articles similaires" (place
        // pourtant très visible, un visiteur regarde déjà un article
        // concurrent), tri stable donc l'ordre par date est préservé à poids égal.
        // #nouveau (demande utilisateur, "classer aussi par score de
        // fiabilité") : departage par score du vendeur à poids de boost égal
        // — inutile pour "Autres annonces du vendeur" (même vendeur partout,
        // même score), seulement pour "Articles similaires" (vendeurs
        // différents).
        const similairesBrutes = all.list.filter(a => a.id !== id);
        const [scoresSimilaires, proSimilaires] = await Promise.all([
          getScoresParVendeur(similairesBrutes.map(a => a.userId)),
          getVendeurProParVendeur(similairesBrutes.map(a => a.userId))
        ]);
        setVendeurProSimilaires(proSimilaires);
        setSimilaires([...similairesBrutes].sort((a, b) => annonceSortWeight(b, scoresSimilaires, proSimilaires) - annonceSortWeight(a, scoresSimilaires, proSimilaires)).slice(0, 6));
        const allVendeur = await getAnnonces({});
        // #nouveau (demande utilisateur, "priorité de tri pour Vendeur Pro") :
        // même vendeur partout ici — inutile de rebatch, vendeurData porte
        // déjà vendeurProExpiry (profils_publics).
        const proVendeurMap = { [data.userId]: vendeurData?.vendeurProExpiry };
        setAutresVendeur([...allVendeur.list].filter(a => a.userId === data.userId && a.id !== id).sort((a, b) => annonceSortWeight(b, undefined, proVendeurMap) - annonceSortWeight(a, undefined, proVendeurMap)).slice(0, 6));
      } catch (e) {
        toast.error('Annonce introuvable');
        navigate('/catalogue');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);
  const handleFavori = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (favoriLoading) return;
    setFavoriLoading(true);
    try {
      const nowLiked = await toggleFavori(user.uid, id);
      setLiked(nowLiked);
      toast.success(nowLiked ? 'Ajouté aux favoris !' : 'Retiré des favoris');
    } catch (e) {
      console.error('toggleFavori a échoué :', e);
      toast.error('Impossible de mettre à jour vos favoris');
    } finally {
      setFavoriLoading(false);
    }
  };
  const handleContact = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (user.uid === annonce.userId) {
      toast.error('Vous ne pouvez pas contacter votre propre annonce');
      return;
    }
    try {
      const convId = await getOrCreateConversation(user.uid, annonce.userId, id);
      navigate(`/chat/${convId}`);
    } catch (e) {
      console.error('getOrCreateConversation a échoué :', e);
      toast.error('Impossible d\'ouvrir la conversation');
    }
  };
  const handleSignaler = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (user.uid === annonce.userId) {
      toast.error('Vous ne pouvez pas signaler votre propre annonce');
      return;
    }
    if (!signalRaison) {
      toast.error('Choisissez une raison');
      return;
    }
    setSignalSending(true);
    try {
      await signalerAnnonce(user.uid, id, signalRaison);
      toast.success('Signalement envoyé, merci — notre équipe va vérifier.');
      setShowSignalement(false);
      setSignalRaison('');
    } catch (e) {
      toast.error('Erreur lors de l\'envoi du signalement');
    } finally {
      setSignalSending(false);
    }
  };
  const handleShare = () => {
    const url = window.location.href;
    const text = `${annonce.titre} — ${annonce.prix?.toLocaleString()} XAF sur MAKET\n${url}`;
    if (navigator.share) {
      navigator.share({
        title: annonce.titre,
        text,
        url
      });
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };
  const fmt = p => new Intl.NumberFormat('fr-FR').format(p) + ' XAF';
  const cat = categories.find(c => c.id === annonce?.categorie);
  if (loading) return <div style={{
    maxWidth: 1100,
    margin: '0 auto',
    padding: '32px 24px'
  }}>
      <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 380px',
      gap: 32
    }}>
        <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4
      }}>
          <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 4
        }}>
            <div style={{
            aspectRatio: '1',
            background: 'var(--bg-3)',
            borderRadius: 8,
            animation: 'pulse 1.5s ease infinite'
          }} />
            <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 4
          }}>
              {Array(4).fill(0).map((_, i) => <div key={i} style={{
              aspectRatio: '1',
              background: 'var(--bg-3)',
              borderRadius: 4,
              animation: 'pulse 1.5s ease infinite'
            }} />)}
            </div>
          </div>
        </div>
        <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }}>
          {Array(6).fill(0).map((_, i) => <div key={i} style={{
          height: 20,
          background: 'var(--bg-3)',
          borderRadius: 6,
          animation: 'pulse 1.5s ease infinite',
          width: i % 2 === 0 ? '100%' : '60%'
        }} />)}
        </div>
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>
    </div>;
  if (!annonce) return null;
  // #nouveau (campagne de lancement) : une annonce validée pendant le compte
  // à rebours reste juridiquement lisible via un lien direct (id Firestore,
  // très difficile à deviner mais pas impossible à partager par erreur) —
  // les listes publiques la filtrent déjà (statut!=='en_vente'), ceci ferme
  // le dernier accès direct pour préserver l'effet de surprise à la révélation.
  if (annonce.statut === 'en_vente_lancement') {
    return <div className="max-w-xl mx-auto px-6 py-24 text-center" style={SYS}>
      <p className="text-4xl mb-4">⏳</p>
      <h1 className="text-xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)' }}>Bientôt disponible</h1>
      <p className="text-gray-500">Cette annonce sera visible dès la fin du compte à rebours de lancement.</p>
    </div>;
  }
  return <div style={{
    maxWidth: 1100,
    margin: '0 auto',
    padding: '24px 24px 48px',
    ...SYS
  }}>

      {}
      <nav style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      marginBottom: 20,
      fontSize: 13,
      color: 'var(--text-3)',
      flexWrap: 'wrap'
    }}>
        {[{
        to: '/',
        label: 'Accueil'
      }, {
        to: '/catalogue',
        label: 'Catalogue'
      }, {
        to: `/catalogue?categorie=${annonce.categorie}`,
        label: cat?.label
      }, {
        label: annonce.titre,
        current: true
      }].map((b, i, arr) => <span key={i} style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6
      }}>
            {i > 0 && <span style={{
          color: 'var(--border)'
        }}>/</span>}
            {b.current ? <span style={{
          color: 'var(--text-2)',
          maxWidth: 200,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>{b.label}</span> : <Link to={b.to} style={{
          color: 'var(--blue)',
          textDecoration: 'none'
        }} onMouseEnter={e => e.target.style.textDecoration = 'underline'} onMouseLeave={e => e.target.style.textDecoration = 'none'}>{b.label}</Link>}
          </span>)}
      </nav>

      {}
      <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 360px',
      gap: 40,
      alignItems: 'start'
    }} className="annonce-grid">

        {}
        <div>
          <GalerieMosaique photos={annonce.photos} titre={annonce.titre} onVideoPlay={() => setShowVideo(true)} hasVideo={!!annonce.videoUrl} />

          {}
          <div style={{
          marginTop: 24
        }}>
            <h2 style={{
            fontSize: 15,
            fontWeight: 700,
            marginBottom: 10
          }}>Description</h2>
            <p style={{
            fontSize: 14,
            color: 'var(--text-2)',
            lineHeight: 1.7,
            whiteSpace: 'pre-line'
          }}>
              {annonce.description || 'Aucune description fournie.'}
            </p>
          </div>

          {}
          {annonce.estLot && annonce.articlesLot?.length > 0 && <div style={{
          marginTop: 24
        }}>
            <h2 style={{
            fontSize: 15,
            fontWeight: 700,
            marginBottom: 10
          }}>Contenu du lot ({annonce.articlesLot.length}/{annonce.nombreArticlesLot || 2} articles détaillés)</h2>
            <ul style={{
            fontSize: 14,
            color: 'var(--text-2)',
            lineHeight: 1.8,
            paddingLeft: 20
          }}>
              {annonce.articlesLot.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          </div>}

          {}
          <div style={{
          marginTop: 24,
          padding: '16px 20px',
          background: 'var(--bg-2)',
          borderRadius: 12,
          border: '1.5px solid var(--border)',
          boxShadow: 'var(--shadow-sm)'
        }}>
            <h2 style={{
            fontSize: 14,
            fontWeight: 700,
            marginBottom: 12
          }}>Caractéristiques</h2>
            <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0
          }}>
              {[{
              label: 'Catégorie',
              value: `${getCategoryEmoji(cat?.id)} ${cat?.label}`
            }, {
              label: 'État',
              value: annonce.etat || 'Bon état'
            }, {
              label: 'Localisation',
              value: `${annonce.quartier}, ${annonce.ville}`
            }, {
              label: 'Remise',
              value: annonce.modeLivraison === 'livreurs' ? '🚚 Livraison uniquement (frais fixés par le livreur)' : annonce.modeLivraison === 'les_deux' ? '🤝🚚 Main propre ou livraison, au choix à l\'achat' : '🤝 Main propre, à convenir avec le vendeur'
            }, ...(annonce.factureUrl ? [{
              label: 'Facture',
              value: '✅ Facture vérifiée par MAKET'
            }] : [])].map((item, i, arr) => <div key={i} style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '9px 0',
              borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none'
            }}>
                  <span style={{
                fontSize: 13,
                color: 'var(--text-3)'
              }}>{item.label}</span>
                  <span style={{
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--text)'
              }}>{item.value}</span>
                </div>)}
            </div>
          </div>

          {}
          <div style={{
          marginTop: 12,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8
        }}>
            {[{
            icon: Shield,
            label: 'Paiement sécurisé',
            desc: 'Protégé jusqu\'à la remise',
            color: '#059669'
          }, {
            icon: KeyRound,
            label: 'Remise sécurisée',
            desc: 'Code à 4 chiffres',
            color: '#2FB4A0'
          }, {
            icon: Package,
            label: 'Remboursement 24h',
            desc: 'Si non conforme',
            color: '#D97706'
          }, ...(annonce.factureUrl ? [{
            icon: FileText,
            label: 'Facture vérifiée',
            desc: 'Authenticité contrôlée',
            color: '#7C3AED'
          }] : [])].map((g, i) => <div key={i} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 12px',
            background: 'var(--bg-2)',
            borderRadius: 10,
            border: '1.5px solid var(--border)',
            boxShadow: 'var(--shadow-sm)'
          }}>
                <div style={{
              width: 28,
              height: 28,
              background: g.color + '15',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
                  <g.icon style={{
                width: 14,
                height: 14,
                color: g.color
              }} />
                </div>
                <div>
                  <p style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text)'
              }}>{g.label}</p>
                  <p style={{
                fontSize: 11,
                color: 'var(--text-3)'
              }}>{g.desc}</p>
                </div>
              </div>)}
          </div>

          {}
          <QuestionsSection annonce={annonce} user={user} />

          {}
          {user?.uid !== annonce.userId && <div style={{
          marginTop: 16
        }}>
            <button onClick={() => setShowSignalement(!showSignalement)} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 12,
            color: 'var(--text-4)',
            ...SYS,
            padding: 0
          }}>
              <Flag style={{
              width: 12,
              height: 12
            }} /> Signaler cette annonce
            </button>
            <AnimatePresence>
              {showSignalement && <motion.div initial={{
              opacity: 0,
              height: 0
            }} animate={{
              opacity: 1,
              height: 'auto'
            }} exit={{
              opacity: 0,
              height: 0
            }} style={{
              marginTop: 8,
              padding: 12,
              background: '#FEF2F2',
              borderRadius: 8,
              border: '1.5px solid #FECACA',
              overflow: 'hidden'
            }}>
                  <select className="input-field" style={{
                fontSize: 13,
                marginBottom: 8
              }} value={signalRaison} onChange={e => setSignalRaison(e.target.value)}>
                    <option value="" disabled>Raison du signalement</option>
                    {['Article volé / suspect', 'Facture non authentique', 'Prix abusif', 'Escroquerie', 'Autre'].map(r => <option key={r}>{r}</option>)}
                  </select>
                  <button onClick={handleSignaler} disabled={!signalRaison || signalSending} style={{
                fontSize: 12,
                fontWeight: 600,
                background: '#DC2626',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: 6,
                cursor: !signalRaison || signalSending ? 'not-allowed' : 'pointer',
                opacity: !signalRaison || signalSending ? 0.5 : 1,
                ...SYS
              }}>
                    {signalSending ? 'Envoi…' : 'Confirmer'}
                  </button>
                </motion.div>}
            </AnimatePresence>
          </div>}
        </div>

        {}
        <div style={{
        position: 'sticky',
        top: 120,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        background: 'white',
        border: '1px solid var(--border-2)',
        borderRadius: 20,
        padding: 20,
        boxShadow: 'var(--shadow-md)'
      }}>

          {}
          <div>
            <div style={{
            display: 'flex',
            gap: 6,
            marginBottom: 8,
            flexWrap: 'wrap'
          }}>
              {isFlashActive(annonce) && <span className="badge badge-amber" style={{
              display: 'inline-flex'
            }}>
                  <Zap style={{
                width: 10,
                height: 10,
                fill: '#D97706'
              }} /> Flash 24h
                </span>}
              {annonce.estLot && <span className="badge badge-gray" style={{
              display: 'inline-flex'
            }}>
                  <Package style={{
                width: 10,
                height: 10
              }} /> Lot de {annonce.nombreArticlesLot || 2} articles
                </span>}
            </div>
            <h1 style={{
            fontSize: 18,
            fontWeight: 700,
            lineHeight: 1.3,
            marginBottom: 8
          }}>{annonce.titre}</h1>
            <div style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 8
          }}>
              <span style={{
              fontSize: 30,
              fontWeight: 800,
              color: 'var(--blue)',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em'
            }}>{fmt(annonce.prix)}</span>
            </div>
            <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginTop: 6
          }}>
              <span style={{
              fontSize: 12,
              color: 'var(--text-3)',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}>
                <MapPin style={{
                width: 11,
                height: 11
              }} /> {annonce.quartier}, {annonce.ville}
              </span>
              <span style={{
              fontSize: 12,
              color: 'var(--text-3)',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}>
                <Eye style={{
                width: 11,
                height: 11
              }} /> {annonce.vues || 0} vues
              </span>
              {annonce.favoris > 0 && <span style={{
              fontSize: 12,
              color: 'var(--text-3)',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}>
                  <Heart style={{
                width: 11,
                height: 11,
                color: '#EF4444',
                fill: '#EF4444'
              }} /> {annonce.favoris} favori{annonce.favoris > 1 ? 's' : ''}
                </span>}
            </div>
            {annonce.createdAt && <p style={{
            fontSize: 11.5,
            color: 'var(--text-4)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            marginTop: 6
          }}>
                <Clock style={{
              width: 11,
              height: 11
            }} /> Publiée {ilYA(annonce.createdAt)}
              </p>}
          </div>

          <div style={{
          height: 1,
          background: 'var(--border)'
        }} />

          {}
          {vendeur && <Link to={`/vendeur/${annonce.userId}`} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          textDecoration: 'none',
          color: 'inherit'
        }}>
              <div style={{
            position: 'relative',
            flexShrink: 0
          }}>
                <div style={{
              width: 64,
              height: 64,
              background: 'linear-gradient(135deg, var(--blue), var(--blue-dark))',
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 700,
              fontSize: 24,
              overflow: 'hidden'
            }}>
                  {vendeur.photoURL ? <img src={vendeur.photoURL} alt={vendeur.pseudo || 'Photo de profil'} style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }} /> : (vendeur.pseudo || 'V')?.[0]}
                </div>
                <span title={getPresence(vendeur.lastActiveAt).label} style={{
              position: 'absolute',
              bottom: -1,
              right: -1,
              width: 15,
              height: 15,
              borderRadius: '50%',
              background: getPresence(vendeur.lastActiveAt).online ? '#22C55E' : '#94A3B8',
              border: '2.5px solid white'
            }} />
              </div>
              <div style={{
            flex: 1
          }}>
                <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
                  {}
                  <span style={{
                fontSize: 14,
                fontWeight: 600
              }}>{vendeur.pseudo || 'Vendeur'}</span>
                  {vendeur.cniVerifie && <BadgeCheck style={{
                width: 14,
                height: 14,
                color: 'var(--blue)'
              }} />}
                  {estVendeurProActif(vendeur) && <span style={{
                fontSize: 9,
                fontWeight: 800,
                color: 'white',
                background: 'linear-gradient(135deg, #EA580C, #7C2D12)',
                padding: '2px 6px',
                borderRadius: 6,
                letterSpacing: '0.03em'
              }}>PRO</span>}
                </div>
                <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 2
            }}>
                  {vendeurAvis?.moyenne ? <div style={{
                display: 'flex',
                gap: 2
              }}>
                      {Array(5).fill(0).map((_, i) => <Star key={i} style={{
                  width: 11,
                  height: 11,
                  fill: i < Math.round(vendeurAvis.moyenne) ? '#FCD34D' : 'transparent',
                  color: i < Math.round(vendeurAvis.moyenne) ? '#FCD34D' : 'var(--border)'
                }} />)}
                    </div> : <span style={{
                fontSize: 11,
                color: 'var(--text-4)'
              }}>Pas encore d'avis</span>}
                  <span style={{
                fontSize: 11,
                color: 'var(--text-3)'
              }}>{vendeur.totalVentes || 0} vente(s) · {vendeur.ville}</span>
                </div>
                <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: getPresence(vendeur.lastActiveAt).online ? '#16A34A' : 'var(--text-4)'
            }}>{getPresence(vendeur.lastActiveAt).label}</span>
              </div>
            </Link>}

          <div style={{
          height: 1,
          background: 'var(--border)'
        }} />

          {}
          {user?.uid !== annonce.userId ? <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8
        }}>
              <button onClick={() => navigate(`/acheter/${id}`)} className="btn-primary" style={{
            justifyContent: 'center',
            padding: '13px',
            fontSize: 15
          }}>
                <ShoppingCart style={{
              width: 16,
              height: 16
            }} /> Acheter
              </button>
              <button onClick={() => setShowOffre(true)} className="btn-outline" style={{
            justifyContent: 'center',
            padding: '12px',
            fontSize: 14
          }}>
                <Tag style={{
              width: 15,
              height: 15
            }} /> Faire une offre
              </button>
              <button onClick={handleContact} className="btn-ghost" style={{
            justifyContent: 'center',
            padding: '10px',
            fontSize: 13
          }}>
                <MessageCircle style={{
              width: 14,
              height: 14
            }} /> Message
              </button>
              <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8
          }}>
                <button onClick={handleFavori} disabled={favoriLoading} className="btn-ghost" style={{
              justifyContent: 'center',
              fontSize: 13,
              opacity: favoriLoading ? 0.6 : 1
            }}>
                  <Heart style={{
                width: 14,
                height: 14,
                fill: liked ? '#EF4444' : 'none',
                color: liked ? '#EF4444' : 'currentColor'
              }} />
                  {liked ? 'Sauvegardé' : 'Sauvegarder'}
                </button>
                <button onClick={handleShare} className="btn-ghost" style={{
              justifyContent: 'center',
              fontSize: 13
            }}>
                  <Share2 style={{
                width: 14,
                height: 14
              }} /> Partager
                </button>
              </div>
            </div> : <div style={{
          padding: 14,
          background: 'var(--bg-2)',
          borderRadius: 8,
          border: '1.5px solid var(--border)',
          textAlign: 'center'
        }}>
              <p style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-2)',
            marginBottom: 6
          }}>C'est votre annonce</p>
              <Link to="/mon-compte/annonces" style={{
            fontSize: 12,
            color: 'var(--blue)',
            textDecoration: 'none',
            fontWeight: 500
          }}>Gérer mes annonces →</Link>
            </div>}

          {}
          <div style={{
          padding: '12px 14px',
          background: 'var(--bg-2)',
          borderRadius: 8,
          border: '1.5px solid var(--border)'
        }}>
            <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8
          }}>
              <Shield style={{
              width: 16,
              height: 16,
              color: 'var(--green)',
              flexShrink: 0,
              marginTop: 1
            }} />
              <div>
                <p style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text)',
                marginBottom: 2
              }}>Protection acheteurs MAKET</p>
                <p style={{
                fontSize: 12,
                color: 'var(--text-3)',
                lineHeight: 1.5
              }}>
                  Paiement sécurisé, bloqué jusqu'à la remise. Remboursement garanti si l'article ne correspond pas à la description.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {}
      {autresVendeur.length > 0 && <section style={{
      marginTop: 48
    }}>
          <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16
      }}>
            <h2 style={{
          fontSize: 16,
          fontWeight: 700
        }}>
              {/* #confidentialité (audit sécurité, corrigé) : affichait le vrai prénom du vendeur —
                  jamais le vrai nom entre clients, uniquement le pseudo (même règle que le reste de l'app). */}
              Autres articles de {vendeur?.pseudo || 'ce vendeur'}
            </h2>
            {vendeur && <Link to={`/vendeur/${annonce.userId}`} style={{
          fontSize: 13,
          color: 'var(--blue)',
          textDecoration: 'none',
          fontWeight: 500
        }}>
                Voir tout →
              </Link>}
          </div>
          <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: 12
      }}>
            {autresVendeur.map((a, i) => <ProductCard key={a.id} annonce={a} index={i} />)}
          </div>
        </section>}

      {}
      {similaires.length > 0 && <section style={{
      marginTop: 40
    }}>
          <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16
      }}>
            <h2 style={{
          fontSize: 16,
          fontWeight: 700
        }}>Articles similaires</h2>
            <Link to={`/catalogue?categorie=${annonce.categorie}`} style={{
          fontSize: 13,
          color: 'var(--blue)',
          textDecoration: 'none',
          fontWeight: 500
        }}>
              Voir tout →
            </Link>
          </div>
          <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: 12
      }}>
            {similaires.map((a, i) => <ProductCard key={a.id} annonce={a} index={i} />)}
          </div>
        </section>}

      {}
      <AnimatePresence>
        {showVideo && <motion.div initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} exit={{
        opacity: 0
      }} style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.9)',
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }} onClick={() => setShowVideo(false)}>
            <div style={{
          maxWidth: 700,
          width: '100%'
        }} onClick={e => e.stopPropagation()}>
              <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12
          }}>
                <p style={{
              color: 'white',
              fontWeight: 600,
              fontSize: 14,
              ...SYS
            }}>Vidéo de l'article</p>
                <button onClick={() => setShowVideo(false)} style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: 6,
              padding: 6,
              cursor: 'pointer',
              color: 'white'
            }}>
                  <X style={{
                width: 16,
                height: 16
              }} />
                </button>
              </div>
              <video src={annonce.videoUrl} controls autoPlay style={{
            width: '100%',
            borderRadius: 8
          }} />
              <p style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: 11,
            marginTop: 8,
            textAlign: 'center',
            ...SYS
          }}>
                Cette vidéo présente honnêtement tous les défauts et qualités de l'article
              </p>
            </div>
          </motion.div>}
      </AnimatePresence>

      {}
      <AnimatePresence>
        {showOffre && <OffreModal annonce={annonce} onClose={() => setShowOffre(false)} />}
      </AnimatePresence>

      {}
      <style>{`
        @media (max-width: 768px) {
          .annonce-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>;
}
