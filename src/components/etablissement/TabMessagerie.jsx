import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Send } from 'lucide-react';
import { getOrCreateConversation, envoyerMessage, listenMessages } from '../../services/chatService';

export default function TabMessagerie({ etablissementId, patientUid, etablissementNom }) {
  const [convId, setConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    const contactId = `etab_${etablissementId}`;
    getOrCreateConversation(patientUid, contactId, null)
      .then(setConvId)
      .catch((e) => console.error('getOrCreateConversation a échoué :', e));
  }, [patientUid, etablissementId]);

  useEffect(() => {
    if (!convId) return;
    return listenMessages(convId, setMessages);
  }, [convId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !convId || envoi) return;
    setEnvoi(true);
    try {
      await envoyerMessage(convId, patientUid, input.trim());
      setInput('');
    } catch (err) {
      console.error('envoyerMessage a échoué :', err);
      toast.error("Échec de l'envoi du message");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 14 }}>
        Échangez directement avec {etablissementNom || "l'établissement"}.
      </p>
      <div
        style={{
          height: 320,
          overflowY: 'auto',
          border: '1.5px solid var(--border, #E2E8F0)',
          borderRadius: 12,
          padding: 14,
          marginBottom: 12,
        }}
      >
        {messages.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--ink-4)', textAlign: 'center', marginTop: 40 }}>
            Aucun message pour le moment.
          </p>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: m.senderId === patientUid ? 'flex-end' : 'flex-start',
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  maxWidth: '75%',
                  padding: '8px 12px',
                  borderRadius: 12,
                  fontSize: 13,
                  background: m.senderId === patientUid ? 'var(--blue)' : 'var(--bg-2)',
                  color: m.senderId === patientUid ? 'white' : 'var(--ink)',
                }}
              >
                {m.message}
              </div>
            </div>
          ))
        )}
      </div>
      <form onSubmit={handleSend} style={{ display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Votre message…"
          className="input-field"
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn-primary" disabled={!input.trim() || envoi}>
          <Send style={{ width: 16, height: 16 }} />
        </button>
      </form>
    </div>
  );
}
