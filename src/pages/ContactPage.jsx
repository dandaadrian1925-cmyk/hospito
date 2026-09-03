import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Phone, Headphones, AlertTriangle, CheckCircle, X, Loader, Paperclip, FileText, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getMesDemandesRdv } from '../services/demandesRendezVousService';
import { getReclamationsPatient } from '../services/reclamationsService';
import { collection, addDoc, doc, updateDoc, arrayUnion, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { uploadFile, getChatSignedUrls } from '../supabase/config';
import ConfirmDialog from '../components/common/ConfirmDialog';
import toast from 'react-hot-toast';
const GEMINI_PROXY_URL = 'https://cekiqtkdgjgawxxerjdf.supabase.co/functions/v1/hospito-gemini-proxy';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SYS = {
  fontFamily: 'var(--font)'
};
const SUPPORT_EXPIRATION_MS = 2 * 60 * 60 * 1000;
const buildSystemPrompt = (userProfile, demandesRdv, reclamations) => `
Tu es l'assistant virtuel de HostoConnect, la plateforme qui connecte patients et établissements de santé partenaires au Cameroun.
Tu t'appelles "Assistant HostoConnect". Tu réponds uniquement en français, de manière claire, concise et professionnelle.
Tu ne réponds qu'aux questions concernant HostoConnect et ses services. Si la question n'est pas liée à HostoConnect, redirige poliment vers les sujets HostoConnect.
Tu n'es pas un professionnel de santé : tu n'établis aucun diagnostic et ne donnes aucun conseil médical — pour toute question médicale, oriente vers l'établissement ou, en cas d'urgence vitale, vers les services d'urgence.

=== RÈGLES ET FONCTIONNEMENT DE HOSPITO ===

INSCRIPTION :
- Entièrement gratuite
- Authentification : email/mot de passe ou Google Sign-In
- Le numéro de CNI (Mon Compte > Informations personnelles) sert d'identifiant pour le dossier médical partagé

ÉTABLISSEMENTS PARTENAIRES :
- Annuaire recherchable par nom ou par ville, depuis l'accueil ou la page "Établissements"
- Chaque établissement dispose de son propre espace patient avec 5 onglets : Prendre RDV, Mon dossier, Messagerie, Paiement, Réclamations
- Un établissement de santé peut demander à rejoindre HostoConnect via le formulaire "Devenir établissement partenaire" (footer du site)

RENDEZ-VOUS :
- Une demande de RDV se fait depuis la fiche de l'établissement, onglet "Prendre RDV" (motif + date souhaitée)
- Elle reste "en attente" jusqu'à confirmation par l'établissement — pas de garantie de disponibilité immédiate

DOSSIER MÉDICAL :
- Contrairement aux données administratives (propres à chaque établissement), le dossier médical (antécédents, prescriptions, comptes-rendus) est UNIQUE et partagé entre tous les établissements où le patient est suivi
- Il n'est consultable que par le personnel soignant autorisé de l'établissement où le patient est pris en charge — jamais par un autre établissement ni un autre patient
- La consultation du dossier directement depuis l'espace patient arrive prochainement

PAIEMENT EN LIGNE :
- Solde HostoConnect rechargeable via Mobile Money (MTN Mobile Money, Orange Money) — aucun paiement en espèces
- Sert à régler les prestations facturées par un établissement, une fois cette fonctionnalité activée côté établissement

MESSAGERIE & RÉCLAMATIONS :
- L'onglet Messagerie de chaque établissement permet un échange direct et privé avec lui
- L'onglet Réclamations permet de signaler un problème rencontré (avec preuve si besoin) et d'en suivre le traitement

SÉCURITÉ ET CONFIDENTIALITÉ :
- Chaque établissement est cloisonné des autres : aucun ne voit les données d'un patient qu'il ne prend pas en charge
- Toute consultation ou modification d'une donnée sensible est journalisée de façon immuable
- Chat filtré : numéros de téléphone, emails et liens externes sont censurés automatiquement pour la sécurité

OPÉRATEUR HUMAIN :
- Si l'utilisateur demande à parler à un opérateur humain, un agent, ou un humain, réponds :
  "Je vais vous mettre en relation avec un opérateur HostoConnect. Veuillez patienter, un agent va vous rejoindre sous peu. ⏳"
  Et termine ton message par exactement ce tag : [ESCALADE_OPERATEUR]

=== DONNÉES DE L'UTILISATEUR CONNECTÉ ===
${userProfile ? `
Nom : ${userProfile.displayName || userProfile.prenom + ' ' + userProfile.nom || 'Non renseigné'}
Email : ${userProfile.email || 'Non renseigné'}
Ville : ${userProfile.ville || 'Non renseignée'}
N° CNI renseigné : ${userProfile.numeroIdentiteNational ? 'Oui' : 'Non'}
` : 'Utilisateur non connecté'}

${demandesRdv?.length > 0 ? `
DEMANDES DE RENDEZ-VOUS (${demandesRdv.length}) :
${demandesRdv.slice(0, 5).map(d => `- ${d.motif} | Statut: ${d.statut}`).join('\n')}
` : 'Aucune demande de rendez-vous en cours.'}

${reclamations?.length > 0 ? `
RÉCLAMATIONS OUVERTES (${reclamations.length}) :
${reclamations.slice(0, 3).map(r => `- ${r.sujet} | Statut: ${r.statut}`).join('\n')}
` : 'Aucune réclamation ouverte.'}

=== INSTRUCTIONS ===
- Sois concis (3-4 phrases max par réponse sauf si l'utilisateur demande plus de détails)
- Utilise les données de l'utilisateur pour personnaliser tes réponses
- Si tu mentionnes une page HostoConnect, indique le chemin (ex: "onglet Réclamations de la fiche de votre établissement")
- Ne divulgue jamais les données personnelles de l'utilisateur dans une réponse publique
- Réponds toujours en français
`;
const callGemini = async (messages, systemPrompt) => {
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{
      text: m.content
    }]
  }));
  const response = await fetch(GEMINI_PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY
    },
    body: JSON.stringify({
      systemPrompt,
      contents
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erreur API Gemini');
  return data.text || 'Désolé, je n\'ai pas pu générer une réponse.';
};
const EXTENSIONS_VIDEO_ATTACHMENT = new Set(['mp4', 'mov', 'webm']);
// #nouveau (demande utilisateur, "upload de preuves dans le chat support") :
// bucket privé — résout une URL signée à l'affichage (jamais stockée en
// clair, expire après 5 min côté serveur), une fois par pièce jointe.
function AttachmentPreview({
  attachmentPath,
  attachmentName,
  convId
}) {
  const [url, setUrl] = useState(null);
  const [erreur, setErreur] = useState(false);
  useEffect(() => {
    if (!attachmentPath || !convId) return;
    getChatSignedUrls('support', convId, [attachmentPath]).then(urls => setUrl(urls[attachmentPath] || null)).catch(() => setErreur(true));
  }, [attachmentPath, convId]);
  if (!attachmentPath) return null;
  const ext = (attachmentPath.split('.').pop() || '').toLowerCase();
  const estVideo = EXTENSIONS_VIDEO_ATTACHMENT.has(ext);
  const estImage = !estVideo && ext !== 'pdf';
  if (erreur) return <p style={{
    fontSize: 12,
    color: '#DC2626',
    marginTop: 6
  }}>Pièce jointe indisponible.</p>;
  if (!url) return <p style={{
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 6
  }}>Chargement de la pièce jointe…</p>;
  if (estImage) return <a href={url} target="_blank" rel="noopener noreferrer" style={{
    display: 'block',
    marginTop: 8
  }}>
      <img src={url} alt={attachmentName || 'Pièce jointe'} style={{
      maxWidth: 220,
      maxHeight: 220,
      borderRadius: 10,
      display: 'block'
    }} />
    </a>;
  if (estVideo) return <video src={url} controls style={{
    maxWidth: 240,
    borderRadius: 10,
    marginTop: 8,
    display: 'block'
  }} />;
  return <a href={url} target="_blank" rel="noopener noreferrer" style={{
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    fontSize: 13,
    fontWeight: 600,
    color: 'inherit',
    textDecoration: 'underline'
  }}>
      <FileText style={{
      width: 14,
      height: 14
    }} /> {attachmentName || 'Document'} <Download style={{
      width: 12,
      height: 12
    }} />
    </a>;
}
function MessageBubble({
  msg,
  convId
}) {
  const isBot = msg.role === 'assistant';
  const isOperator = msg.role === 'operator';
  const isEscalade = msg.content.includes('[ESCALADE_OPERATEUR]');
  const displayContent = msg.content.replace('[ESCALADE_OPERATEUR]', '').trim();
  return <motion.div initial={{
    opacity: 0,
    y: 12
  }} animate={{
    opacity: 1,
    y: 0
  }} transition={{
    duration: 0.25
  }} style={{
    display: 'flex',
    gap: 10,
    justifyContent: isBot || isOperator ? 'flex-start' : 'flex-end',
    marginBottom: 12
  }}>
      {(isBot || isOperator) && <div style={{
      width: 32,
      height: 32,
      borderRadius: 10,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      marginTop: 2,
      background: isOperator ? '#2F7D5C' : 'linear-gradient(135deg, var(--blue), var(--primary-dark))'
    }}>
          {isOperator ? <Headphones style={{
        width: 16,
        height: 16,
        color: 'white'
      }} /> : <Bot style={{
        width: 16,
        height: 16,
        color: 'white'
      }} />}
        </div>}

      <div style={{
      maxWidth: '75%'
    }}>
        <div style={{
        padding: '10px 14px',
        borderRadius: isBot || isOperator ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
        background: isOperator ? '#ECFDF5' : isBot ? 'var(--bg-2)' : 'var(--blue)',
        color: isOperator ? '#065F46' : isBot ? 'var(--text)' : 'white',
        fontSize: 14,
        lineHeight: 1.6,
        border: isOperator ? '1.5px solid #A7F3D0' : isBot ? '1.5px solid var(--border)' : 'none',
        ...SYS
      }}>
          {isOperator && <div style={{
          fontSize: 11,
          fontWeight: 700,
          marginBottom: 3,
          opacity: 0.75
        }}>Opérateur HostoConnect</div>}
          {displayContent}
          <AttachmentPreview attachmentPath={msg.attachmentPath} attachmentName={msg.attachmentName} convId={convId} />
        </div>

        {}
        {isEscalade && <div style={{
        marginTop: 8,
        padding: '10px 14px',
        background: '#FFFBEB',
        border: '1.5px solid #FDE68A',
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }}>
            <Headphones style={{
          width: 16,
          height: 16,
          color: '#D97706',
          flexShrink: 0
        }} />
            <div>
              <p style={{
            fontSize: 13,
            fontWeight: 700,
            color: '#92400E',
            ...SYS
          }}>En attente d'un opérateur</p>
              <p style={{
            fontSize: 12,
            color: '#B45309',
            marginTop: 2,
            ...SYS
          }}>Un agent HostoConnect va vous rejoindre sous peu. Temps d'attente estimé : 5-15 minutes.</p>
            </div>
          </div>}

        <p style={{
        fontSize: 11,
        color: 'var(--text-4)',
        marginTop: 4,
        textAlign: isBot || isOperator ? 'left' : 'right',
        ...SYS
      }}>
          {new Date(msg.timestamp).toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit'
        })}
        </p>
      </div>

      {!isBot && !isOperator && <div style={{
      width: 32,
      height: 32,
      background: 'var(--bg-3)',
      border: '1.5px solid var(--border)',
      borderRadius: 10,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      marginTop: 2
    }}>
          <User style={{
        width: 16,
        height: 16,
        color: 'var(--text-3)'
      }} />
        </div>}
    </motion.div>;
}
export default function ContactPage() {
  const {
    user,
    userProfile
  } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState({
    demandesRdv: [],
    reclamations: []
  });
  const [supportConvId, setSupportConvId] = useState(null);
  const [supportStatut, setSupportStatut] = useState(null);
  const [showConfirmOperateur, setShowConfirmOperateur] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const creerDemandeOperateur = async messagesActuels => {
    try {
      const ref = await addDoc(collection(db, 'support_conversations'), {
        userId: user?.uid || null,
        userEmail: user?.email || 'anonyme',
        userName: userProfile?.displayName || 'Anonyme',
        messages: messagesActuels.map(m => ({
          role: m.role,
          content: m.content.replace('[ESCALADE_OPERATEUR]', '').trim(),
          timestamp: m.timestamp
        })),
        statut: 'en_attente_operateur',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setSupportConvId(ref.id);
      setSupportStatut('en_attente_operateur');
      toast.success('Demande transmise à un opérateur !');
    } catch (e) {
      console.error("Erreur création demande support (support_conversations) :", e);
      toast.error(`Échec de la transmission à un opérateur : ${e.code || e.message}`);
    }
  };
  const demanderOperateur = async () => {
    setShowConfirmOperateur(false);
    const msgOperateur = {
      role: 'user',
      content: 'Je souhaite parler à un opérateur.',
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, msgOperateur]);
    await creerDemandeOperateur([...messages, msgOperateur]);
  };
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;
      try {
        const [demandesRdv, reclamations] = await Promise.all([getMesDemandesRdv(user.uid), getReclamationsPatient(user.uid)]);
        setUserData({
          demandesRdv,
          reclamations
        });
      } catch (e) {
        console.error('Erreur chargement données utilisateur:', e);
      }
    };
    loadUserData();
  }, [user]);
  useEffect(() => {
    const welcome = userProfile ? `Bonjour ${userProfile.prenom || userProfile.displayName?.split(' ')[0] || ''} ! 👋 Je suis l'assistant HostoConnect. Comment puis-je vous aider aujourd'hui ?` : `Bonjour ! 👋 Je suis l'assistant HostoConnect. Comment puis-je vous aider aujourd'hui ? (Connectez-vous pour que je puisse accéder à vos données et vous aider plus précisément.)`;
    setMessages([{
      role: 'assistant',
      content: welcome,
      timestamp: Date.now()
    }]);
  }, [userProfile]);
  useEffect(() => {
    if (!supportConvId) return;
    const ref = doc(db, 'support_conversations', supportConvId);
    const unsub = onSnapshot(ref, snap => {
      if (!snap.exists()) return;
      const data = snap.data();
      let statut = data.statut;
      const createdMs = data.createdAt?.toMillis?.();
      if (statut === 'en_attente_operateur' && createdMs && Date.now() - createdMs > SUPPORT_EXPIRATION_MS) {
        statut = 'expiree';
        updateDoc(ref, {
          statut: 'expiree',
          updatedAt: serverTimestamp()
        }).catch(e => console.error('Erreur expiration support:', e));
      }
      setMessages(data.messages || []);
      setSupportStatut(statut);
    });
    return unsub;
  }, [supportConvId]);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  }, [messages, loading]);
  const systemPrompt = buildSystemPrompt(userProfile, userData.demandesRdv, userData.reclamations);
  const recommencerConversation = () => {
    setSupportConvId(null);
    setSupportStatut(null);
    setMessages([{
      role: 'assistant',
      content: "Bonjour à nouveau ! 👋 Comment puis-je vous aider ?",
      timestamp: Date.now()
    }]);
  };
  const send = async () => {
    if (!input.trim() || loading) return;
    if (supportConvId && supportStatut !== 'resolu') {
      const userMsg = {
        role: 'user',
        content: input.trim(),
        timestamp: Date.now()
      };
      setInput('');
      try {
        await updateDoc(doc(db, 'support_conversations', supportConvId), {
          messages: arrayUnion(userMsg),
          updatedAt: serverTimestamp()
        });
      } catch (e) {
        console.error('Erreur envoi message support:', e);
        toast.error("Impossible d'envoyer le message");
      }
      return;
    }
    const userMsg = {
      role: 'user',
      content: input.trim(),
      timestamp: Date.now()
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    try {
      const history = newMessages.filter((_, i) => i > 0);
      const reply = await callGemini(history, systemPrompt);
      const botMsg = {
        role: 'assistant',
        content: reply,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, botMsg]);
      if (reply.includes('[ESCALADE_OPERATEUR]')) {
        await creerDemandeOperateur([...newMessages, botMsg]);
      }
    } catch (e) {
      console.error('Erreur Gemini:', e);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Désolé, je rencontre une difficulté technique. Veuillez réessayer dans quelques instants.',
        timestamp: Date.now()
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };
  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };
  // #nouveau (demande utilisateur, "upload de preuves dans le chat support") :
  // uniquement une fois escaladé à un vrai opérateur (le bot ne traite pas
  // les pièces jointes) — même garde que l'envoi de texte ci-dessus.
  const handleAttach = async e => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !supportConvId || supportStatut === 'resolu') return;
    setUploadingAttachment(true);
    try {
      // #sécurité (audit, corrigé) : file.name vient du navigateur, entièrement
      // contrôlé par l'utilisateur (peut contenir "/", "..") — contrairement à
      // tous les autres appels uploadFile de ce projet (toujours des segments
      // connus côté serveur : uid/commandeId + timestamp, jamais un nom fourni
      // par l'utilisateur). Nettoyé au nom de base seul, caractères sûrs
      // uniquement, pour ne jamais pouvoir sortir du préfixe supportConvId/.
      const nomSur = file.name.replace(/^.*[\\/]/, '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100);
      const upload = await uploadFile('support', `${supportConvId}/${Date.now()}_${nomSur}`, file);
      const userMsg = {
        role: 'user',
        content: input.trim() || '📎 Pièce jointe',
        attachmentPath: upload.path,
        attachmentName: file.name,
        timestamp: Date.now()
      };
      setInput('');
      await updateDoc(doc(db, 'support_conversations', supportConvId), {
        messages: arrayUnion(userMsg),
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      toast.error(err.message === 'FICHIER_TROP_VOLUMINEUX' ? 'Fichier trop volumineux (max 50 Mo vidéo / 10 Mo image).' : err.message === 'TYPE_FICHIER_NON_AUTORISE' ? 'Type de fichier non autorisé.' : "Échec de l'envoi de la pièce jointe.");
    } finally {
      setUploadingAttachment(false);
    }
  };
  const suggestions = ['Comment prendre rendez-vous ?', 'Comment consulter mon dossier médical ?', 'Comment fonctionne le paiement en ligne ?', 'Parler à un opérateur'];
  const inputDisabled = loading || supportStatut === 'en_attente_operateur' || supportStatut === 'resolu' || supportStatut === 'expiree';
  const inputPlaceholder = supportStatut === 'en_attente_operateur' ? 'En attente d\'un opérateur...' : supportStatut === 'resolu' || supportStatut === 'expiree' ? 'Conversation terminée' : 'Posez votre question...';
  return <div style={{
    maxWidth: 800,
    margin: '0 auto',
    padding: '32px 24px 48px',
    ...SYS
  }}>

      {}
      <div style={{
      marginBottom: 24
    }}>
        <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 6,
        flexWrap: 'wrap'
      }}>
          <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
            <div style={{
            width: 44,
            height: 44,
            background: 'linear-gradient(135deg, var(--blue), var(--primary-dark))',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
              <Bot style={{
              width: 22,
              height: 22,
              color: 'white'
            }} />
            </div>
            <div>
              <h1 style={{
              fontSize: 22,
              fontWeight: 700
            }}>Assistant HostoConnect</h1>
              <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 2
            }}>
                <div style={{
                width: 7,
                height: 7,
                background: '#10B981',
                borderRadius: '50%'
              }} />
                <span style={{
                fontSize: 12,
                color: 'var(--text-3)'
              }}>En ligne — répond instantanément</span>
              </div>
            </div>
          </div>
          {}
          {!supportConvId && <button onClick={() => setShowConfirmOperateur(true)} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 16px',
          background: '#2F7D5C',
          color: 'white',
          border: 'none',
          borderRadius: 12,
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          flexShrink: 0,
          ...SYS
        }}>
              <Headphones style={{
            width: 16,
            height: 16
          }} />
              Parler à un opérateur
            </button>}
        </div>
        <p style={{
        fontSize: 14,
        color: 'var(--text-3)',
        marginTop: 8
      }}>
          Posez vos questions sur HostoConnect, vos rendez-vous ou vos réclamations.
          {user ? ` Je connais votre compte ${userProfile?.prenom || ''}.` : ' Connectez-vous pour une aide personnalisée.'}
        </p>
      </div>

      {showConfirmOperateur && <ConfirmDialog title="Parler à un opérateur HostoConnect ?" description="Un agent humain va prendre connaissance de votre demande et vous répondre directement ici, généralement sous quelques minutes." confirmLabel="Oui, me mettre en relation" onConfirm={demanderOperateur} onCancel={() => setShowConfirmOperateur(false)} />}

      {}
      <div style={{
      border: '1.5px solid var(--border)',
      borderRadius: 14,
      overflow: 'hidden',
      background: 'white'
    }}>

        {}
        <div style={{
        height: 480,
        overflowY: 'auto',
        padding: '20px 16px'
      }} className="scrollbar-hide">
          {messages.map((msg, i) => <MessageBubble key={i} msg={msg} convId={supportConvId} />)}

          {}
          {loading && <motion.div initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} style={{
          display: 'flex',
          gap: 10,
          marginBottom: 12
        }}>
              <div style={{
            width: 32,
            height: 32,
            background: 'linear-gradient(135deg, var(--blue), var(--primary-dark))',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
                <Bot style={{
              width: 16,
              height: 16,
              color: 'white'
            }} />
              </div>
              <div style={{
            padding: '10px 16px',
            background: 'var(--bg-2)',
            border: '1.5px solid var(--border)',
            borderRadius: '4px 14px 14px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
                {[0, 1, 2].map(i => <motion.div key={i} animate={{
              y: [0, -4, 0]
            }} transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.15
            }} style={{
              width: 6,
              height: 6,
              background: 'var(--text-4)',
              borderRadius: '50%'
            }} />)}
              </div>
            </motion.div>}

          {}
          {supportStatut === 'en_cours' && <motion.div initial={{
          opacity: 0,
          y: 10
        }} animate={{
          opacity: 1,
          y: 0
        }} style={{
          padding: '14px 16px',
          background: '#ECFDF5',
          border: '1.5px solid #A7F3D0',
          borderRadius: 12,
          marginBottom: 12,
          display: 'flex',
          gap: 10
        }}>
              <Headphones style={{
            width: 18,
            height: 18,
            color: '#2F7D5C',
            flexShrink: 0,
            marginTop: 2
          }} />
              <div>
                <p style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#065F46'
            }}>Un opérateur vous répond</p>
                <p style={{
              fontSize: 12,
              color: '#047857',
              marginTop: 3,
              lineHeight: 1.5
            }}>
                  Vous pouvez continuer à écrire, vos messages lui arrivent directement.
                </p>
              </div>
            </motion.div>}

          {supportStatut === 'resolu' && <motion.div initial={{
          opacity: 0,
          y: 10
        }} animate={{
          opacity: 1,
          y: 0
        }} style={{
          padding: '14px 16px',
          background: 'var(--bg-2)',
          border: '1.5px solid var(--border)',
          borderRadius: 12,
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          justifyContent: 'space-between'
        }}>
              <div style={{
            display: 'flex',
            gap: 10
          }}>
                <CheckCircle style={{
              width: 18,
              height: 18,
              color: 'var(--text-3)',
              flexShrink: 0,
              marginTop: 2
            }} />
                <div>
                  <p style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--text)'
              }}>Conversation terminée</p>
                  <p style={{
                fontSize: 12,
                color: 'var(--text-3)',
                marginTop: 3
              }}>L'opérateur a clôturé cette demande.</p>
                </div>
              </div>
              <button onClick={recommencerConversation} className="btn-outline" style={{
            flexShrink: 0,
            fontSize: 12,
            padding: '6px 12px'
          }}>
                Nouvelle conversation
              </button>
            </motion.div>}

          {supportStatut === 'expiree' && <motion.div initial={{
          opacity: 0,
          y: 10
        }} animate={{
          opacity: 1,
          y: 0
        }} style={{
          padding: '14px 16px',
          background: '#FEF2F2',
          border: '1.5px solid #FECACA',
          borderRadius: 12,
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          justifyContent: 'space-between'
        }}>
              <div style={{
            display: 'flex',
            gap: 10
          }}>
                <AlertTriangle style={{
              width: 18,
              height: 18,
              color: '#DC2626',
              flexShrink: 0,
              marginTop: 2
            }} />
                <div>
                  <p style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#991B1B'
              }}>Demande expirée</p>
                  <p style={{
                fontSize: 12,
                color: '#B91C1C',
                marginTop: 3
              }}>Aucun opérateur n'a pu répondre dans les 2h. Veuillez réessayer.</p>
                </div>
              </div>
              <button onClick={recommencerConversation} className="btn-outline" style={{
            flexShrink: 0,
            fontSize: 12,
            padding: '6px 12px'
          }}>
                Nouvelle conversation
              </button>
            </motion.div>}

          <div ref={bottomRef} />
        </div>

        {}
        {messages.length <= 1 && !loading && !supportConvId && <div style={{
        padding: '0 16px 12px',
        display: 'flex',
        gap: 6,
        flexWrap: 'wrap'
      }}>
            {suggestions.map((s, i) => <button key={i} onClick={() => {
          setInput(s);
          inputRef.current?.focus();
        }} style={{
          padding: '6px 12px',
          background: 'var(--bg-2)',
          border: '1.5px solid var(--border)',
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--text-2)',
          cursor: 'pointer',
          transition: 'all 0.15s',
          ...SYS
        }} onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'var(--blue)';
          e.currentTarget.style.color = 'var(--blue)';
        }} onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--border)';
          e.currentTarget.style.color = 'var(--text-2)';
        }}>
                {s}
              </button>)}
          </div>}

        {}
        <div style={{
        padding: '12px 16px',
        borderTop: '1.5px solid var(--border)',
        display: 'flex',
        gap: 10,
        alignItems: 'flex-end'
      }}>
          {}
          {supportConvId && supportStatut !== 'resolu' && supportStatut !== 'expiree' && <>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/quicktime,video/webm" onChange={handleAttach} style={{
            display: 'none'
          }} />
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingAttachment} title="Joindre une preuve (photo, vidéo, document)" className="btn-outline" style={{
            flexShrink: 0,
            padding: '10px 12px',
            opacity: uploadingAttachment ? 0.5 : 1
          }}>
                {uploadingAttachment ? <Loader style={{
              width: 16,
              height: 16,
              animation: 'spin 0.8s linear infinite'
            }} /> : <Paperclip style={{
              width: 16,
              height: 16
            }} />}
              </button>
            </>}
          <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey} disabled={inputDisabled} placeholder={inputPlaceholder} className="input-field" style={{
          flex: 1,
          resize: 'none',
          minHeight: 44,
          maxHeight: 120,
          fontSize: 14,
          lineHeight: 1.5,
          padding: '10px 14px'
        }} rows={1} />
          <button onClick={send} disabled={!input.trim() || inputDisabled} className="btn-primary" style={{
          padding: '10px 16px',
          flexShrink: 0,
          opacity: !input.trim() || inputDisabled ? 0.5 : 1
        }}>
            {loading ? <Loader style={{
            width: 16,
            height: 16,
            animation: 'spin 0.8s linear infinite'
          }} /> : <Send style={{
            width: 16,
            height: 16
          }} />}
          </button>
        </div>
      </div>

      {}
      <div style={{
      marginTop: 16,
      display: 'flex',
      alignItems: 'flex-start',
      gap: 8,
      padding: '12px 14px',
      background: 'var(--bg-2)',
      borderRadius: 10,
      border: '1.5px solid var(--border)'
    }}>
        <AlertTriangle style={{
        width: 14,
        height: 14,
        color: 'var(--text-4)',
        flexShrink: 0,
        marginTop: 1
      }} />
        <p style={{
        fontSize: 12,
        color: 'var(--text-3)',
        lineHeight: 1.5,
        ...SYS
      }}>
          L'assistant IA répond aux questions générales sur HostoConnect. Pour toute urgence médicale ou question complexe, tapez <strong>"parler à un opérateur"</strong> pour être mis en relation avec un agent humain.
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>;
}
