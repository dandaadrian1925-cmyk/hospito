import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Send, AlertTriangle, ArrowLeft, Shield, Check, X, ShoppingCart, Repeat } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { listenMessages, envoyerMessage, getConversations, repondreOffre, getUserProfile, isOffreExpiree, marquerConversationLue } from '../services/chatService';
import { getAnnonceById, listenOffreAcceptee } from '../services/annoncesService';
import { getSettings } from '../services/settingsService';
import toast from 'react-hot-toast';
export default function ChatPage() {
  const {
    convId
  } = useParams();
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [avertissement, setAvertissement] = useState(null);
  const [profiles, setProfiles] = useState({});
  const [offreEnCours, setOffreEnCours] = useState(null);
  const [showContre, setShowContre] = useState(false);
  const [contrePrix, setContrePrix] = useState('');
  const [annonces, setAnnonces] = useState({});
  const [offresAccepteesActuelles, setOffresAccepteesActuelles] = useState({});
  const [settings, setSettings] = useState({});
  const bottomRef = useRef(null);
  useEffect(() => {
    getSettings().then(setSettings);
  }, []);
  useEffect(() => {
    if (!user) return;
    const unsub = getConversations(user.uid, setConversations);
    return unsub;
  }, [user]);
  useEffect(() => {
    if (!convId) return;
    const unsub = listenMessages(convId, setMessages);
    return unsub;
  }, [convId]);
  // #nouveau (demande utilisateur, "liste des conversations façon
  // WhatsApp") : marque la conversation ouverte comme lue pour moi.
  useEffect(() => {
    if (!convId || !user) return;
    marquerConversationLue(convId, user.uid);
  }, [convId, user?.uid]);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  }, [messages]);
  useEffect(() => {
    const ids = new Set();
    conversations.forEach(c => {
      const other = c.participants?.find(id => id !== user.uid);
      if (other) ids.add(other);
    });
    const missing = [...ids].filter(id => !profiles[id]);
    if (missing.length === 0) return;
    missing.forEach(id => {
      getUserProfile(id).then(p => {
        if (p) setProfiles(prev => ({
          ...prev,
          [id]: p
        }));
      }).catch(e => console.error('getUserProfile a échoué :', e));
    });
  }, [conversations, user?.uid]);
  useEffect(() => {
    const ids = new Set(messages.filter(m => m.type === 'offre' && !m.titreAnnonce && m.annonceId).map(m => m.annonceId));
    const missing = [...ids].filter(id => !annonces[id]);
    if (missing.length === 0) return;
    missing.forEach(id => {
      getAnnonceById(id).then(a => {
        if (a) setAnnonces(prev => ({
          ...prev,
          [id]: a
        }));
      }).catch(e => console.error('getAnnonceById a échoué :', e));
    });
  }, [messages]);
  // #nouveau (audit — badge "offre acceptée" périmé si le vendeur a ensuite
  // accepté un autre acheteur sur la même annonce) : écoute en direct
  // offreAcceptee pour chaque annonce où MOI j'ai une offre marquée
  // 'accepte' — permet de détecter que ce n'est plus moi le bénéficiaire réel
  // avant même d'ouvrir la page d'achat.
  useEffect(() => {
    if (!user) return;
    const ids = new Set(messages.filter(m => m.type === 'offre' && m.statut === 'accepte' && m.senderId === user.uid && m.annonceId).map(m => m.annonceId));
    const unsubs = [...ids].map(id => listenOffreAcceptee(id, offre => {
      setOffresAccepteesActuelles(prev => ({
        ...prev,
        [id]: offre
      }));
    }));
    return () => unsubs.forEach(u => u());
  }, [messages, user?.uid]);
  const getAutreUserId = conv => {
    return conv?.participants?.find(id => id !== user.uid) || '';
  };
  const getAutreUserLabel = conv => {
    const autreId = getAutreUserId(conv);
    const p = profiles[autreId];
    // #confidentialité (audit sécurité, corrigé) : retombait sur le vrai nom
    // (displayName) si pseudo absent — jamais le vrai nom entre clients.
    return p?.pseudo || (autreId ? `Utilisateur ${autreId.slice(0, 6)}` : 'Utilisateur');
  };
  const getAutreUserInitiale = conv => {
    return getAutreUserLabel(conv)?.[0]?.toUpperCase() || 'U';
  };
  const convActive = conversations.find(c => c.id === convId);
  const offreEnAttente = [...messages].reverse().find(m => m.type === 'offre' && m.statut === 'en_attente' && !isOffreExpiree(m, settings));
  useEffect(() => {
    setShowContre(false);
    setContrePrix('');
  }, [offreEnAttente?.id]);
  const handleOffre = async (msg, decision, contreMontant = null) => {
    if (offreEnCours) return;
    setOffreEnCours(msg.id);
    try {
      await repondreOffre(convId, msg.id, decision, user.uid, contreMontant);
      setShowContre(false);
      setContrePrix('');
    } catch (e) {
      if (e.message === 'OFFRE_EXPIREE') {
        toast.error('Cette offre a expiré — trop de temps sans réponse.');
      } else if (e.message === 'LIMITE_NEGOCIATION_ATTEINTE') {
        toast.error('Limite de contre-offres atteinte pour cette annonce.');
      } else if (e.message !== 'OFFRE_DEJA_TRAITEE') {
        console.error('repondreOffre a échoué :', e);
        toast.error(e.message || 'Erreur lors de la réponse à l\'offre');
      }
    } finally {
      setOffreEnCours(null);
    }
  };
  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const msg = text.trim();
    setText('');
    try {
      const result = await envoyerMessage(convId, user.uid, msg);
      if (result.censured) {
        setAvertissement(result.avertissements);
        setTimeout(() => setAvertissement(null), 5000);
      }
    } catch (e) {
      toast.error(e.message === 'CHAT_SUSPENDU' ? 'Chat suspendu 24h suite à une tentative de contournement répétée' : 'Erreur envoi');
      setText(msg);
    } finally {
      setSending(false);
    }
  };
  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };
  const formatTime = ts => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  if (!user) {
    navigate('/auth');
    return null;
  }
  return <div className="max-w-6xl mx-auto px-6 py-6 h-[calc(100vh-140px)]">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">

        {}
        <div className={`${convId ? 'hidden md:flex' : 'flex'} md:col-span-1 bg-white rounded-2xl border border-gray-100 overflow-hidden flex-col`}>
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-bold" style={{
            fontFamily: 'var(--font-display)'
          }}>Messages</h2>
          </div>
          <div className="overflow-y-auto flex-1">
            {conversations.length === 0 ? <div className="text-center py-12 text-gray-400 text-sm px-4">
                Aucune conversation pour le moment
              </div> : conversations.map(conv => {
              // #nouveau (demande utilisateur, "liste des conversations
              // façon WhatsApp : non-lu en gras") : non-lu pour MOI si le
              // dernier message ne vient pas de moi et que je ne l'ai pas
              // encore marqué lu (cf. marquerConversationLue).
              const nonLu = !!conv.nonLu?.[user.uid];
              return <button key={conv.id} onClick={() => navigate(`/chat/${conv.id}`)} className={`w-full flex items-center gap-3 p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors text-left ${conv.id === convId ? 'bg-primary-50' : ''}`}>
                  <div className="w-10 h-10 gradient-blue rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {getAutreUserInitiale(conv)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${nonLu ? 'font-bold text-gray-900' : 'font-semibold'}`}>{getAutreUserLabel(conv)}</p>
                    <p className={`text-xs truncate ${nonLu ? 'font-bold text-gray-700' : 'text-gray-400'}`}>{conv.lastMessage || 'Aucun message'}</p>
                  </div>
                  {nonLu && <span className="w-2.5 h-2.5 rounded-full bg-primary-600 flex-shrink-0" />}
                </button>;
            })}
          </div>
        </div>

        {}
        <div className={`${convId ? 'flex' : 'hidden md:flex'} md:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden flex-col`}>
          {convId ? <>
              {}
              <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                <button onClick={() => navigate('/chat')} className="md:hidden text-gray-400 hover:text-gray-600">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-9 h-9 gradient-blue rounded-full flex items-center justify-center text-white font-bold">
                  {getAutreUserInitiale(convActive)}
                </div>
                <div>
                  <p className="font-semibold text-sm">{getAutreUserLabel(convActive)}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <Shield className="w-3 h-3 text-green-500" /> Chat sécurisé MAKET
                  </p>
                </div>
              </div>

              {}
              {offreEnAttente && (() => {
            const isMe = offreEnAttente.senderId === user.uid;
            const annonceFallback = annonces[offreEnAttente.annonceId];
            const titreArticle = offreEnAttente.titreAnnonce || annonceFallback?.titre;
            const prixDemande = offreEnAttente.prixDemande ?? annonceFallback?.prix;
            const photoArticle = annonceFallback?.photos?.[0];
            return <motion.div initial={{
              opacity: 0,
              y: -10
            }} animate={{
              opacity: 1,
              y: 0
            }} className="mx-4 mt-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <div className="flex items-start gap-3">
                      {photoArticle && <img src={photoArticle} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Offre de prix</p>
                        {titreArticle && <p className="text-sm font-semibold text-amber-900 truncate">{titreArticle}</p>}
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <p className="text-lg font-black text-amber-900" style={{
                      fontFamily: 'var(--font-display)'
                    }}>
                            {offreEnAttente.montantOffre?.toLocaleString('fr-FR')} XAF
                          </p>
                          {prixDemande != null && <p className="text-xs text-amber-700 line-through opacity-70">{prixDemande.toLocaleString('fr-FR')} XAF</p>}
                        </div>
                        <p className="text-xs text-amber-700 mt-0.5">
                          {isMe ? 'Proposée par vous — en attente de réponse.' : 'Proposée par votre interlocuteur.'}
                        </p>
                      </div>
                      <ShoppingCart className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    </div>
                    {!isMe && !showContre && <div className="flex gap-2 mt-3">
                        <button onClick={() => handleOffre(offreEnAttente, 'accepte')} disabled={!!offreEnCours} className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 text-white text-sm font-bold py-2 rounded-lg hover:bg-green-700 disabled:opacity-60">
                          <Check className="w-4 h-4" /> Accepter
                        </button>
                        {(offreEnAttente.tourNegociation ?? 0) < (settings.negociationOffreMaxTours ?? 3) && <button onClick={() => setShowContre(true)} disabled={!!offreEnCours} className="flex-1 flex items-center justify-center gap-1.5 bg-amber-500 text-white text-sm font-bold py-2 rounded-lg hover:bg-amber-600 disabled:opacity-60">
                          <Repeat className="w-4 h-4" /> Négocier
                        </button>}
                        <button onClick={() => handleOffre(offreEnAttente, 'refuse')} disabled={!!offreEnCours} className="flex-1 flex items-center justify-center gap-1.5 bg-red-500 text-white text-sm font-bold py-2 rounded-lg hover:bg-red-600 disabled:opacity-60">
                          <X className="w-4 h-4" /> Refuser
                        </button>
                      </div>}
                    {!isMe && showContre && <div className="mt-3">
                        <div className="flex gap-2">
                          <input type="number" value={contrePrix} onChange={e => setContrePrix(e.target.value)} placeholder="Votre contre-offre (XAF)" autoFocus className="flex-1 border-2 border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
                          <button onClick={() => handleOffre(offreEnAttente, 'contre', contrePrix)} disabled={!!offreEnCours || !contrePrix} className="bg-amber-600 text-white text-sm font-bold px-4 rounded-lg hover:bg-amber-700 disabled:opacity-60">
                            Envoyer
                          </button>
                        </div>
                        <button onClick={() => setShowContre(false)} className="text-xs text-amber-700 mt-1.5 hover:underline">Annuler</button>
                      </div>}
                  </motion.div>;
          })()}

              {}
              {avertissement && <motion.div initial={{
            opacity: 0,
            y: -10
          }} animate={{
            opacity: 1,
            y: 0
          }} exit={{
            opacity: 0
          }} className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-red-700">Tentative de contournement détectée ({avertissement}/2 avant suspension)</p>
                    <p className="text-xs text-red-600 mt-0.5">Les échanges hors MAKET vous privent de toute protection. Tout arrangement hors plateforme est sous votre entière responsabilité.</p>
                  </div>
                </motion.div>}

              {}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="text-center text-xs text-gray-400 bg-gray-50 rounded-xl py-2 px-4 mx-auto max-w-xs">
                  🔒 Chat sécurisé — les coordonnées personnelles sont censurées automatiquement
                </div>
                {messages.map(msg => {
              const isSystem = msg.senderId === 'system';
              if (isSystem) {
                return <div key={msg.id} className="text-center text-xs text-gray-500 bg-gray-50 rounded-xl py-2 px-4 mx-auto max-w-xs my-2">
                        {msg.message}
                      </div>;
              }
              const isMe = msg.senderId === user.uid;
              const isOffre = msg.type === 'offre';
              return <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl ${isMe ? 'bg-primary-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}>
                        <p className="text-sm leading-relaxed">{msg.message}</p>

                        {}
                        {isOffre && <div className="mt-2">
                            {(() => {
                          const annonceIdMsg = msg.annonceId || convActive?.annonceId;
                          const offreActuelle = annonceIdMsg ? offresAccepteesActuelles[annonceIdMsg] : undefined;
                          // #bug (corrigé, audit) : cette offre 'accepte' peut avoir été
                          // remplacée depuis (le vendeur a accepté un autre acheteur sur
                          // la même annonce, offreAcceptee n'a de place que pour un seul
                          // bénéficiaire) — offreActuelle===undefined (pas encore chargée)
                          // reste optimiste, seul un mismatch confirmé bloque le lien.
                          const toujoursBeneficiaire = offreActuelle === undefined || offreActuelle?.acheteurId === user.uid;
                          if (msg.statut === 'en_attente' && isOffreExpiree(msg, settings)) return <p className={`text-xs font-semibold ${isMe ? 'text-primary-100' : 'text-gray-500'}`}>⏱️ Offre expirée</p>;
                          if (msg.statut === 'en_attente') return <p className={`text-xs font-semibold ${isMe ? 'text-primary-100' : 'text-gray-500'}`}>En attente de réponse…</p>;
                          if (msg.statut === 'accepte' && isMe && !toujoursBeneficiaire) return <p className="text-xs font-bold text-red-300">⚠️ Ce prix négocié n'est plus disponible</p>;
                          if (msg.statut === 'accepte' && isMe && annonceIdMsg) return <Link to={`/acheter/${annonceIdMsg}`} className="flex items-center justify-center gap-1.5 bg-white text-green-700 text-xs font-bold py-1.5 rounded-lg hover:bg-green-50 mt-1">
                                <ShoppingCart className="w-3 h-3" /> Finaliser l'achat à ce prix
                              </Link>;
                          if (msg.statut === 'contre') return <p className={`text-xs font-bold ${isMe ? 'text-primary-100' : 'text-gray-500'}`}>🔁 Contre-offre envoyée</p>;
                          if (msg.statut === 'confirme') return <p className={`text-xs font-bold ${isMe ? 'text-primary-100' : 'text-gray-500'}`}>✅ Acceptée — en attente de validation</p>;
                          return <p className={`text-xs font-bold ${msg.statut === 'accepte' ? 'text-green-300' : 'text-red-300'}`}>
                                {msg.statut === 'accepte' ? '✅ Offre acceptée' : '❌ Offre refusée'}
                              </p>;
                        })()}
                          </div>}

                        <p className={`text-xs mt-1 ${isMe ? 'text-primary-200' : 'text-gray-400'}`}>{formatTime(msg.createdAt)}</p>
                      </div>
                    </div>;
            })}
                <div ref={bottomRef} />
              </div>

              {}
              <div className="p-4 border-t border-gray-100">
                <div className="flex gap-2">
                  <textarea value={text} onChange={e => setText(e.target.value)} onKeyDown={handleKey} placeholder="Votre message... (les coordonnées personnelles sont interdites)" className="flex-1 resize-none border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary-500 transition-colors" rows={1} style={{
                maxHeight: '120px'
              }} />
                  <button onClick={send} disabled={!text.trim() || sending} className="w-10 h-10 bg-primary-600 text-white rounded-xl flex items-center justify-center hover:bg-primary-700 transition-colors disabled:opacity-50 flex-shrink-0">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center">Appuyez sur Entrée pour envoyer • Shift+Entrée pour aller à la ligne</p>
              </div>
            </> : <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <div className="text-5xl mb-4">💬</div>
              <p className="font-semibold">Sélectionnez une conversation</p>
              <p className="text-sm mt-1">ou contactez un vendeur depuis une annonce</p>
            </div>}
        </div>
      </div>
    </div>;
}
