import { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, Loader2, Headphones } from 'lucide-react';
import toast from 'react-hot-toast';
import { collection, doc, addDoc, updateDoc, onSnapshot, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { listerServicesActifs } from '../../services/etablissementsPublicService';
import { getInfosPratiques } from '../../services/transparenceService';
import { buildEtablissementSystemPrompt, callGemini } from '../../services/supportChatService';

const CLE_STOCKAGE = (etablissementId, uid) => `hostoconnect_support_etab_${etablissementId}_${uid || 'anonyme'}`;

// #corrigé (retour utilisateur, "redondance" — deux encarts de chat quasi
// identiques côte à côte sur la page Contact, l'assistant IA et "Parler à un
// opérateur") : fusionnés en UNE seule conversation, comme le fait déjà
// SupportChatWidget (généraliste) — on discute d'abord avec l'IA propre à
// CET établissement, et un bouton "Parler à un opérateur" bascule la MÊME
// conversation vers un humain (support_conversations, etablissementId
// renseigné, répondu par un admin ayant la permission "Support patient").
export default function EtablissementAssistantIA({ etablissement, tarifs, apropos, user, userProfile }) {
  const [services, setServices] = useState(null);
  const [infosPratiques, setInfosPratiques] = useState(null);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Bonjour ! Je peux répondre à vos questions sur ${etablissement.nom} (services, tarifs, horaires…). Vous pouvez aussi demander à parler à un opérateur.` },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [convId, setConvId] = useState(() => {
    try { return localStorage.getItem(CLE_STOCKAGE(etablissement.id, user?.uid)) || null; } catch { return null; }
  });
  const [statutConv, setStatutConv] = useState(null);
  const finRef = useRef(null);

  useEffect(() => {
    listerServicesActifs(etablissement.id).then(setServices).catch(() => setServices([]));
    getInfosPratiques(etablissement.id).then(setInfosPratiques).catch(() => setInfosPratiques(null));
  }, [etablissement.id]);

  // Une fois escaladé, cette même conversation vit dans support_conversations
  // — on n'appelle plus Gemini, on écoute/écrit directement ce document.
  useEffect(() => {
    if (!convId) return;
    return onSnapshot(doc(db, 'support_conversations', convId), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setMessages(data.messages || []);
      setStatutConv(data.statut);
    });
  }, [convId]);

  useEffect(() => { finRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const envoyerAGemini = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const historique = [...messages, { role: 'user', content: input.trim() }];
    setMessages(historique);
    setInput('');
    setLoading(true);
    try {
      const systemPrompt = buildEtablissementSystemPrompt(etablissement, services, tarifs, infosPratiques, apropos);
      const reponse = await callGemini(historique, systemPrompt);
      setMessages((m) => [...m, { role: 'assistant', content: reponse }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: "Désolé, je n'ai pas pu répondre pour le moment. Vous pouvez demander à parler à un opérateur." }]);
    } finally {
      setLoading(false);
    }
  };

  const demanderOperateur = async () => {
    setLoading(true);
    try {
      const ref = await addDoc(collection(db, 'support_conversations'), {
        userId: user?.uid || null,
        userEmail: user?.email || 'anonyme',
        userName: userProfile?.displayName || 'Anonyme',
        etablissementId: etablissement.id, etablissementNom: etablissement.nom,
        messages: messages.map((m) => ({ role: m.role, content: m.content, timestamp: Date.now() })),
        statut: 'en_attente_operateur',
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      setConvId(ref.id);
      try { localStorage.setItem(CLE_STOCKAGE(etablissement.id, user?.uid), ref.id); } catch { /* pas bloquant */ }
      toast.success('Un opérateur de cet établissement va vous répondre ici');
    } catch (err) {
      toast.error(err.message || "Échec de la transmission à un opérateur");
    } finally {
      setLoading(false);
    }
  };

  const envoyerAOperateur = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading || !convId) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'support_conversations', convId), {
        messages: arrayUnion({ role: 'user', content: input.trim(), timestamp: Date.now() }), updatedAt: serverTimestamp(),
      });
      setInput('');
    } catch (err) {
      toast.error(err.message || "Échec de l'envoi");
    } finally {
      setLoading(false);
    }
  };

  const enModeOperateur = !!convId;
  const conversationTerminee = statutConv === 'resolu' || statutConv === 'expiree';

  return (
    <div style={{ border: '1px solid var(--border, #E2E8F0)', borderRadius: 14, overflow: 'hidden', background: 'white' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'var(--bg-2)', borderBottom: '1px solid var(--border, #E2E8F0)' }}>
        {enModeOperateur ? <Headphones style={{ width: 16, height: 16, color: 'var(--blue)' }} /> : <Sparkles style={{ width: 16, height: 16, color: 'var(--blue)' }} />}
        <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>
          {enModeOperateur ? `Opérateur de ${etablissement.nom}` : `Assistant de ${etablissement.nom}`}
        </span>
      </div>
      <div style={{ height: 260, overflowY: 'auto', padding: 14 }}>
        {messages.map((m, i) => {
          const estMoi = m.role === 'user';
          const estOperateur = m.role === 'operator';
          return (
            <div key={i} style={{ display: 'flex', justifyContent: estMoi ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
              <div
                style={{
                  maxWidth: '80%', padding: '8px 12px', borderRadius: 12, fontSize: 13, lineHeight: 1.5,
                  background: estMoi ? 'var(--blue)' : estOperateur ? '#ECFDF5' : 'var(--bg-2)',
                  color: estMoi ? 'white' : estOperateur ? '#065F46' : 'var(--ink)',
                  border: estOperateur ? '1.5px solid #A7F3D0' : 'none',
                }}
              >
                {estOperateur && <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 2, opacity: 0.75 }}>Opérateur {etablissement.nom}</div>}
                {m.content}
              </div>
            </div>
          );
        })}
        {loading && !enModeOperateur && <p style={{ fontSize: 12, color: 'var(--ink-4)' }}>Réflexion…</p>}
        {conversationTerminee && <p style={{ fontSize: 12, color: 'var(--ink-4)', textAlign: 'center' }}>Conversation terminée.</p>}
        <div ref={finRef} />
      </div>
      <form onSubmit={enModeOperateur ? envoyerAOperateur : envoyerAGemini} style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid var(--border, #E2E8F0)' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={enModeOperateur ? 'Votre message à l\'opérateur…' : 'Posez une question sur cet établissement…'}
          className="input-field"
          style={{ flex: 1 }}
          disabled={loading || conversationTerminee}
        />
        <button type="submit" className="btn-primary" disabled={!input.trim() || loading || conversationTerminee}>
          {loading ? <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> : <Send style={{ width: 16, height: 16 }} />}
        </button>
      </form>
      {!enModeOperateur && (
        <div style={{ padding: '0 12px 12px' }}>
          <button type="button" onClick={demanderOperateur} disabled={loading} style={{ fontSize: 12.5, color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
            Parler à un opérateur à la place
          </button>
        </div>
      )}
    </div>
  );
}
