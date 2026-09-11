import { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, Loader2 } from 'lucide-react';
import { listerServicesActifs } from '../../services/etablissementsPublicService';
import { getInfosPratiques } from '../../services/transparenceService';
import { buildEtablissementSystemPrompt, callGemini } from '../../services/supportChatService';

// #nouveau (demande utilisateur, "la page de contact contient l'assistance
// IA pour cet établissement en particulier") : encart intégré (pas une
// bulle flottante comme SupportChatWidget, généraliste) — répond QUE sur les
// vraies infos publiques de CET établissement (cf.
// buildEtablissementSystemPrompt). Volontairement plus léger que le widget
// généraliste : pas de sauvegarde Firestore, pas d'escalade humaine (déjà
// couverte par la Messagerie), un simple assistant informatif par session.
export default function EtablissementAssistantIA({ etablissement, tarifs, apropos }) {
  const [services, setServices] = useState(null);
  const [infosPratiques, setInfosPratiques] = useState(null);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Bonjour ! Je peux répondre à vos questions sur ${etablissement.nom} (services, tarifs, horaires…). Que souhaitez-vous savoir ?` },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const finRef = useRef(null);

  useEffect(() => {
    listerServicesActifs(etablissement.id).then(setServices).catch(() => setServices([]));
    getInfosPratiques(etablissement.id).then(setInfosPratiques).catch(() => setInfosPratiques(null));
  }, [etablissement.id]);

  useEffect(() => { finRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const envoyer = async (e) => {
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
      setMessages((m) => [...m, { role: 'assistant', content: "Désolé, je n'ai pas pu répondre pour le moment. Utilisez la Messagerie pour joindre l'établissement directement." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ border: '1px solid var(--border, #E2E8F0)', borderRadius: 14, overflow: 'hidden', background: 'white' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'var(--bg-2)', borderBottom: '1px solid var(--border, #E2E8F0)' }}>
        <Sparkles style={{ width: 16, height: 16, color: 'var(--blue)' }} />
        <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>Assistant de {etablissement.nom}</span>
      </div>
      <div style={{ height: 260, overflowY: 'auto', padding: 14 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
            <div
              style={{
                maxWidth: '80%', padding: '8px 12px', borderRadius: 12, fontSize: 13, lineHeight: 1.5,
                background: m.role === 'user' ? 'var(--blue)' : 'var(--bg-2)', color: m.role === 'user' ? 'white' : 'var(--ink)',
              }}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && <p style={{ fontSize: 12, color: 'var(--ink-4)' }}>Réflexion…</p>}
        <div ref={finRef} />
      </div>
      <form onSubmit={envoyer} style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid var(--border, #E2E8F0)' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Posez une question sur cet établissement…"
          className="input-field"
          style={{ flex: 1 }}
          disabled={loading}
        />
        <button type="submit" className="btn-primary" disabled={!input.trim() || loading}>
          {loading ? <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> : <Send style={{ width: 16, height: 16 }} />}
        </button>
      </form>
    </div>
  );
}
