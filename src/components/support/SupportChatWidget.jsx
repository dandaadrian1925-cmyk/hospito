import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Headphones, AlertTriangle, CheckCircle, X, Loader, Paperclip, FileText, Download, MessageCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getMesDemandesRdv } from '../../services/demandesRendezVousService';
import { getReclamationsPatient } from '../../services/reclamationsService';
import { collection, addDoc, doc, updateDoc, arrayUnion, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { uploadFile, getChatSignedUrls } from '../../supabase/config';
import { buildSystemPrompt, callGemini } from '../../services/supportChatService';
import { getReponseEnCache, enregistrerReponseEnCache } from '../../services/chatbotCacheService';
import ConfirmDialog from '../common/ConfirmDialog';
import toast from 'react-hot-toast';

const SUPPORT_EXPIRATION_MS = 2 * 60 * 60 * 1000;
const EXTENSIONS_VIDEO_ATTACHMENT = new Set(['mp4', 'mov', 'webm']);

function AttachmentPreview({ attachmentPath, attachmentName, convId }) {
  const [url, setUrl] = useState(null);
  const [erreur, setErreur] = useState(false);
  useEffect(() => {
    if (!attachmentPath || !convId) return;
    getChatSignedUrls('support', convId, [attachmentPath]).then((urls) => setUrl(urls[attachmentPath] || null)).catch(() => setErreur(true));
  }, [attachmentPath, convId]);
  if (!attachmentPath) return null;
  const ext = (attachmentPath.split('.').pop() || '').toLowerCase();
  const estVideo = EXTENSIONS_VIDEO_ATTACHMENT.has(ext);
  const estImage = !estVideo && ext !== 'pdf';
  if (erreur) return <p style={{ fontSize: 11, color: '#DC2626', marginTop: 6 }}>Pièce jointe indisponible.</p>;
  if (!url) return <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>Chargement…</p>;
  if (estImage) return <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: 6 }}>
    <img src={url} alt={attachmentName || 'Pièce jointe'} style={{ maxWidth: 160, maxHeight: 160, borderRadius: 8, display: 'block' }} />
  </a>;
  if (estVideo) return <video src={url} controls style={{ maxWidth: 180, borderRadius: 8, marginTop: 6, display: 'block' }} />;
  return <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12, fontWeight: 600, color: 'inherit', textDecoration: 'underline' }}>
    <FileText style={{ width: 13, height: 13 }} /> {attachmentName || 'Document'} <Download style={{ width: 11, height: 11 }} />
  </a>;
}

function MessageBubble({ msg, convId }) {
  const isBot = msg.role === 'assistant';
  const isOperator = msg.role === 'operator';
  const isEscalade = msg.content.includes('[ESCALADE_OPERATEUR]');
  const displayContent = msg.content.replace('[ESCALADE_OPERATEUR]', '').trim();
  return <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', gap: 8, justifyContent: isBot || isOperator ? 'flex-start' : 'flex-end', marginBottom: 10 }}>
    {(isBot || isOperator) && <div style={{ width: 26, height: 26, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2, background: isOperator ? '#2F7D5C' : 'linear-gradient(135deg, var(--blue), var(--accent-dark))' }}>
      {isOperator ? <Headphones style={{ width: 13, height: 13, color: 'white' }} /> : <Bot style={{ width: 13, height: 13, color: 'white' }} />}
    </div>}
    <div style={{ maxWidth: '78%' }}>
      <div style={{
        padding: '8px 12px',
        borderRadius: isBot || isOperator ? '4px 12px 12px 12px' : '12px 4px 12px 12px',
        background: isOperator ? '#ECFDF5' : isBot ? 'var(--bg-2)' : 'var(--blue)',
        color: isOperator ? '#065F46' : isBot ? 'var(--text)' : 'white',
        fontSize: 13, lineHeight: 1.55,
        border: isOperator ? '1.5px solid #A7F3D0' : isBot ? '1.5px solid var(--border)' : 'none',
      }}>
        {isOperator && <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 2, opacity: 0.75 }}>Opérateur HostoConnect</div>}
        {displayContent}
        <AttachmentPreview attachmentPath={msg.attachmentPath} attachmentName={msg.attachmentName} convId={convId} />
      </div>
      {isEscalade && <div style={{ marginTop: 6, padding: '8px 10px', background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: 8, display: 'flex', gap: 6 }}>
        <Headphones style={{ width: 13, height: 13, color: '#D97706', flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 11, color: '#92400E', lineHeight: 1.4 }}>Un agent HostoConnect va vous rejoindre sous peu (5-15 min).</p>
      </div>}
    </div>
    {!isBot && !isOperator && <div style={{ width: 26, height: 26, background: 'var(--bg-3)', border: '1.5px solid var(--border)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
      <User style={{ width: 13, height: 13, color: 'var(--text-3)' }} />
    </div>}
  </motion.div>;
}

export default function SupportChatWidget() {
  const { user, userProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState({ demandesRdv: [], reclamations: [] });
  const [supportConvId, setSupportConvId] = useState(null);
  const [supportStatut, setSupportStatut] = useState(null);
  const [showConfirmOperateur, setShowConfirmOperateur] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([getMesDemandesRdv(user.uid), getReclamationsPatient(user.uid)])
      .then(([demandesRdv, reclamations]) => setUserData({ demandesRdv, reclamations }))
      .catch((e) => console.error('Erreur chargement données utilisateur:', e));
  }, [user]);

  useEffect(() => {
    const welcome = userProfile
      ? `Bonjour ${userProfile.prenom || userProfile.displayName?.split(' ')[0] || ''} ! 👋 Je suis l'assistant HostoConnect. Comment puis-je vous aider ?`
      : `Bonjour ! 👋 Je suis l'assistant HostoConnect. Comment puis-je vous aider ?`;
    setMessages([{ role: 'assistant', content: welcome, timestamp: Date.now() }]);
  }, [userProfile]);

  useEffect(() => {
    if (!supportConvId) return;
    const ref = doc(db, 'support_conversations', supportConvId);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      let statut = data.statut;
      const createdMs = data.createdAt?.toMillis?.();
      if (statut === 'en_attente_operateur' && createdMs && Date.now() - createdMs > SUPPORT_EXPIRATION_MS) {
        statut = 'expiree';
        updateDoc(ref, { statut: 'expiree', updatedAt: serverTimestamp() }).catch(() => {});
      }
      setMessages(data.messages || []);
      setSupportStatut(statut);
    });
    return unsub;
  }, [supportConvId]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, open]);

  const systemPrompt = buildSystemPrompt(userProfile, userData.demandesRdv, userData.reclamations);

  const creerDemandeOperateur = async (messagesActuels) => {
    try {
      const ref = await addDoc(collection(db, 'support_conversations'), {
        userId: user?.uid || null,
        userEmail: user?.email || 'anonyme',
        userName: userProfile?.displayName || 'Anonyme',
        messages: messagesActuels.map((m) => ({ role: m.role, content: m.content.replace('[ESCALADE_OPERATEUR]', '').trim(), timestamp: m.timestamp })),
        statut: 'en_attente_operateur',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setSupportConvId(ref.id);
      setSupportStatut('en_attente_operateur');
      toast.success('Demande transmise à un opérateur !');
    } catch (e) {
      console.error('Erreur création demande support :', e);
      toast.error("Échec de la transmission à un opérateur");
    }
  };

  const demanderOperateur = async () => {
    setShowConfirmOperateur(false);
    const msgOperateur = { role: 'user', content: 'Je souhaite parler à un opérateur.', timestamp: Date.now() };
    setMessages((prev) => [...prev, msgOperateur]);
    await creerDemandeOperateur([...messages, msgOperateur]);
  };

  const recommencerConversation = () => {
    setSupportConvId(null);
    setSupportStatut(null);
    setMessages([{ role: 'assistant', content: 'Bonjour à nouveau ! 👋 Comment puis-je vous aider ?', timestamp: Date.now() }]);
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    if (supportConvId && supportStatut !== 'resolu') {
      const userMsg = { role: 'user', content: input.trim(), timestamp: Date.now() };
      setInput('');
      try {
        await updateDoc(doc(db, 'support_conversations', supportConvId), { messages: arrayUnion(userMsg), updatedAt: serverTimestamp() });
      } catch (e) {
        toast.error("Impossible d'envoyer le message");
      }
      return;
    }
    const userMsg = { role: 'user', content: input.trim(), timestamp: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    try {
      const history = newMessages.filter((_, i) => i > 0);
      const estPremierTour = history.length === 1;
      const reply = estPremierTour ? (await getReponseEnCache(userMsg.content)) || await callGemini(history, systemPrompt) : await callGemini(history, systemPrompt);
      const botMsg = { role: 'assistant', content: reply, timestamp: Date.now() };
      setMessages((prev) => [...prev, botMsg]);
      if (estPremierTour && !reply.includes('[ESCALADE_OPERATEUR]')) {
        enregistrerReponseEnCache(userMsg.content, reply);
      }
      if (reply.includes('[ESCALADE_OPERATEUR]')) {
        await creerDemandeOperateur([...newMessages, botMsg]);
      }
    } catch (e) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Désolé, je rencontre une difficulté technique. Réessayez dans quelques instants.', timestamp: Date.now() }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleAttach = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !supportConvId || supportStatut === 'resolu') return;
    setUploadingAttachment(true);
    try {
      const nomSur = file.name.replace(/^.*[\\/]/, '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100);
      const upload = await uploadFile('support', `${supportConvId}/${Date.now()}_${nomSur}`, file);
      const userMsg = { role: 'user', content: input.trim() || '📎 Pièce jointe', attachmentPath: upload.path, attachmentName: file.name, timestamp: Date.now() };
      setInput('');
      await updateDoc(doc(db, 'support_conversations', supportConvId), { messages: arrayUnion(userMsg), updatedAt: serverTimestamp() });
    } catch (err) {
      toast.error(err.message === 'FICHIER_TROP_VOLUMINEUX' ? 'Fichier trop volumineux.' : err.message === 'TYPE_FICHIER_NON_AUTORISE' ? 'Type de fichier non autorisé.' : "Échec de l'envoi.");
    } finally {
      setUploadingAttachment(false);
    }
  };

  const suggestions = ['Comment prendre rendez-vous ?', 'Comment fonctionne le paiement ?', 'Parler à un opérateur'];
  const inputDisabled = loading || supportStatut === 'en_attente_operateur' || supportStatut === 'resolu' || supportStatut === 'expiree';
  const inputPlaceholder = supportStatut === 'en_attente_operateur' ? "En attente d'un opérateur…" : supportStatut === 'resolu' || supportStatut === 'expiree' ? 'Conversation terminée' : 'Posez votre question…';

  return <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 900, fontFamily: 'var(--font)' }}>
    {showConfirmOperateur && <ConfirmDialog title="Parler à un opérateur HostoConnect ?" description="Un agent humain prendra connaissance de votre demande et vous répondra directement ici, généralement sous quelques minutes." confirmLabel="Oui, me mettre en relation" onConfirm={demanderOperateur} onCancel={() => setShowConfirmOperateur(false)} />}

    <AnimatePresence>
      {open && <motion.div initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.97 }} transition={{ duration: 0.18 }} style={{
        position: 'absolute', bottom: 68, right: 0,
        width: 'min(360px, calc(100vw - 32px))',
        height: 'min(520px, calc(100vh - 120px))',
        background: 'white', borderRadius: 18, boxShadow: '0 12px 40px rgba(0,0,0,0.22)',
        border: '1.5px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, background: 'linear-gradient(135deg, var(--blue), var(--accent-dark))', color: 'white' }}>
          <div style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.2)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Bot style={{ width: 17, height: 17 }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13.5, fontWeight: 700 }}>Assistant HostoConnect</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 6, height: 6, background: '#4ADE80', borderRadius: '50%' }} />
              <span style={{ fontSize: 10.5, opacity: 0.85 }}>En ligne</span>
            </div>
          </div>
          {!supportConvId && <button onClick={() => setShowConfirmOperateur(true)} title="Parler à un opérateur" style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', flexShrink: 0 }}>
            <Headphones style={{ width: 14, height: 14, color: 'white' }} />
          </button>}
          <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
            <X style={{ width: 18, height: 18, color: 'white' }} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px' }} className="scrollbar-hide">
          {messages.map((msg, i) => <MessageBubble key={i} msg={msg} convId={supportConvId} />)}

          {loading && <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 26, height: 26, background: 'linear-gradient(135deg, var(--blue), var(--accent-dark))', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Bot style={{ width: 13, height: 13, color: 'white' }} />
            </div>
            <div style={{ padding: '8px 14px', background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: '4px 12px 12px 12px', display: 'flex', alignItems: 'center', gap: 5 }}>
              {[0, 1, 2].map((i) => <motion.div key={i} animate={{ y: [0, -3, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} style={{ width: 5, height: 5, background: 'var(--text-4)', borderRadius: '50%' }} />)}
            </div>
          </div>}

          {supportStatut === 'en_cours' && <div style={{ padding: '10px 12px', background: '#ECFDF5', border: '1.5px solid #A7F3D0', borderRadius: 10, marginBottom: 10, fontSize: 11.5, color: '#065F46' }}>
            Un opérateur vous répond — continuez à écrire.
          </div>}

          {(supportStatut === 'resolu' || supportStatut === 'expiree') && <div style={{ padding: '10px 12px', background: supportStatut === 'expiree' ? '#FEF2F2' : 'var(--bg-2)', border: `1.5px solid ${supportStatut === 'expiree' ? '#FECACA' : 'var(--border)'}`, borderRadius: 10, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 11.5, color: supportStatut === 'expiree' ? '#991B1B' : 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 5 }}>
              {supportStatut === 'expiree' ? <AlertTriangle style={{ width: 13, height: 13, flexShrink: 0 }} /> : <CheckCircle style={{ width: 13, height: 13, flexShrink: 0 }} />}
              {supportStatut === 'expiree' ? 'Demande expirée' : 'Conversation terminée'}
            </span>
            <button onClick={recommencerConversation} className="btn-outline" style={{ flexShrink: 0, fontSize: 11, padding: '5px 10px' }}>Nouvelle conversation</button>
          </div>}

          <div ref={bottomRef} />
        </div>

        {messages.length <= 1 && !loading && !supportConvId && <div style={{ padding: '0 12px 10px', display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {suggestions.map((s, i) => <button key={i} onClick={() => { setInput(s); inputRef.current?.focus(); }} style={{ padding: '5px 10px', background: 'var(--bg-2)', border: '1.5px solid var(--border)', borderRadius: 16, fontSize: 11, fontWeight: 500, color: 'var(--text-2)', cursor: 'pointer' }}>
            {s}
          </button>)}
        </div>}

        <div style={{ padding: '10px 12px', borderTop: '1.5px solid var(--border)', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          {supportConvId && supportStatut !== 'resolu' && supportStatut !== 'expiree' && <>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/quicktime,video/webm" onChange={handleAttach} style={{ display: 'none' }} />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingAttachment} title="Joindre une preuve" className="btn-outline" style={{ flexShrink: 0, padding: '8px 10px', opacity: uploadingAttachment ? 0.5 : 1 }}>
              {uploadingAttachment ? <Loader style={{ width: 14, height: 14, animation: 'spin 0.8s linear infinite' }} /> : <Paperclip style={{ width: 14, height: 14 }} />}
            </button>
          </>}
          <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey} disabled={inputDisabled} placeholder={inputPlaceholder} className="input-field" style={{ flex: 1, resize: 'none', minHeight: 38, maxHeight: 90, fontSize: 13, lineHeight: 1.4, padding: '8px 12px' }} rows={1} />
          <button onClick={send} disabled={!input.trim() || inputDisabled} className="btn-primary" style={{ padding: '8px 14px', flexShrink: 0, opacity: !input.trim() || inputDisabled ? 0.5 : 1 }}>
            {loading ? <Loader style={{ width: 14, height: 14, animation: 'spin 0.8s linear infinite' }} /> : <Send style={{ width: 14, height: 14 }} />}
          </button>
        </div>
      </motion.div>}
    </AnimatePresence>

    <motion.button onClick={() => setOpen((o) => !o)} whileTap={{ scale: 0.93 }} style={{
      width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
      background: 'linear-gradient(135deg, var(--blue), var(--accent-dark))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 6px 20px rgba(26,86,219,0.35)',
    }}>
      <AnimatePresence mode="wait">
        {open ? <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
          <X style={{ width: 24, height: 24, color: 'white' }} />
        </motion.div> : <motion.div key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
          <MessageCircle style={{ width: 24, height: 24, color: 'white' }} />
        </motion.div>}
      </AnimatePresence>
    </motion.button>

    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>;
}
