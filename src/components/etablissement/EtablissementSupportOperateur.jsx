import { useState, useEffect, useRef } from 'react';
import { Headphones, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { collection, doc, addDoc, updateDoc, onSnapshot, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';

const CLE_STOCKAGE = (etablissementId, uid) => `hostoconnect_support_etab_${etablissementId}_${uid || 'anonyme'}`;

// #nouveau (demande utilisateur, "je voudrais aussi qu'il y ait l'option
// parler à un opérateur dans la page de contact de cet établissement") :
// jusqu'ici, escalader vers un opérateur n'était possible qu'en passant par
// la bulle de chat IA généraliste (SupportChatWidget) puis en demandant à
// lui parler. Ici, un point d'entrée direct sur la page Contact, qui écrit
// dans la MÊME collection `support_conversations` (etablissementId
// renseigné) déjà lue par hospito-admin/pages/support/SupportPage.jsx —
// répondue par un admin ayant la permission "Support patient", accordée par
// le sysadmin (cf. hospito-admin/lib/hospitalModules.js, module: 'support').
// Aucune nouvelle infrastructure côté admin nécessaire, juste ce point
// d'entrée patient.
export default function EtablissementSupportOperateur({ etablissementId, etablissementNom, user, userProfile }) {
  const [convId, setConvId] = useState(() => {
    try { return localStorage.getItem(CLE_STOCKAGE(etablissementId, user?.uid)) || null; } catch { return null; }
  });
  const [conversation, setConversation] = useState(null);
  const [texte, setTexte] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const finRef = useRef(null);

  useEffect(() => {
    if (!convId) return;
    return onSnapshot(doc(db, 'support_conversations', convId), (snap) => setConversation(snap.exists() ? snap.data() : null));
  }, [convId]);

  useEffect(() => { finRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [conversation?.messages?.length]);

  const demarrer = async (e) => {
    e.preventDefault();
    if (!texte.trim() || envoi) return;
    setEnvoi(true);
    try {
      const message = { role: 'user', content: texte.trim(), timestamp: Date.now() };
      const ref = await addDoc(collection(db, 'support_conversations'), {
        userId: user?.uid || null,
        userEmail: user?.email || 'anonyme',
        userName: userProfile?.displayName || 'Anonyme',
        etablissementId, etablissementNom,
        messages: [message],
        statut: 'en_attente_operateur',
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      setConvId(ref.id);
      try { localStorage.setItem(CLE_STOCKAGE(etablissementId, user?.uid), ref.id); } catch { /* pas bloquant */ }
      setTexte('');
      toast.success('Votre message a été transmis à un opérateur de cet établissement');
    } catch (err) {
      toast.error(err.message || "Échec de l'envoi");
    } finally {
      setEnvoi(false);
    }
  };

  const continuer = async (e) => {
    e.preventDefault();
    if (!texte.trim() || envoi || !convId) return;
    setEnvoi(true);
    try {
      const message = { role: 'user', content: texte.trim(), timestamp: Date.now() };
      await updateDoc(doc(db, 'support_conversations', convId), { messages: arrayUnion(message), updatedAt: serverTimestamp() });
      setTexte('');
    } catch (err) {
      toast.error(err.message || "Échec de l'envoi");
    } finally {
      setEnvoi(false);
    }
  };

  const conversationTerminee = conversation && (conversation.statut === 'resolu' || conversation.statut === 'expiree');

  return (
    <div style={{ border: '1px solid var(--border, #E2E8F0)', borderRadius: 14, overflow: 'hidden', background: 'white' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'var(--bg-2)', borderBottom: '1px solid var(--border, #E2E8F0)' }}>
        <Headphones style={{ width: 16, height: 16, color: 'var(--blue)' }} />
        <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>Parler à un opérateur de {etablissementNom}</span>
      </div>

      {!convId ? (
        <form onSubmit={demarrer} style={{ padding: 14 }}>
          <p style={{ fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 10 }}>
            Décrivez votre besoin — un membre de l'établissement vous répondra directement ici.
          </p>
          <textarea
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            placeholder="Votre message…"
            className="input-field"
            rows={3}
            style={{ marginBottom: 10 }}
          />
          <button type="submit" className="btn-primary" disabled={!texte.trim() || envoi}>
            {envoi ? 'Envoi…' : "Envoyer à l'opérateur"}
          </button>
        </form>
      ) : (
        <>
          <div style={{ height: 220, overflowY: 'auto', padding: 14 }}>
            {(conversation?.messages || []).map((m, i) => {
              const isOperator = m.role === 'operator';
              return (
                <div key={i} style={{ display: 'flex', justifyContent: isOperator ? 'flex-start' : 'flex-end', marginBottom: 10 }}>
                  <div
                    style={{
                      maxWidth: '80%', padding: '8px 12px', borderRadius: 12, fontSize: 13, lineHeight: 1.5,
                      background: isOperator ? '#ECFDF5' : 'var(--blue)', color: isOperator ? '#065F46' : 'white',
                      border: isOperator ? '1.5px solid #A7F3D0' : 'none',
                    }}
                  >
                    {isOperator && <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 2, opacity: 0.75 }}>Opérateur {etablissementNom}</div>}
                    {m.content}
                  </div>
                </div>
              );
            })}
            {conversationTerminee && (
              <p style={{ fontSize: 12, color: 'var(--ink-4)', textAlign: 'center' }}>Conversation terminée.</p>
            )}
            <div ref={finRef} />
          </div>
          {!conversationTerminee && (
            <form onSubmit={continuer} style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid var(--border, #E2E8F0)' }}>
              <input
                value={texte}
                onChange={(e) => setTexte(e.target.value)}
                placeholder="Votre message…"
                className="input-field"
                style={{ flex: 1 }}
                disabled={envoi}
              />
              <button type="submit" className="btn-primary" disabled={!texte.trim() || envoi}>
                <Send style={{ width: 16, height: 16 }} />
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
