import { useState, useEffect, useRef } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { Phone, PhoneOff, Mic, MicOff, PhoneIncoming } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAgoraToken, demarrerAppel, terminerAppel } from '../../services/callService';

// #nouveau (demande utilisateur, "appels livreur-livreur pour l'inter-ville
// et client-livreur uniquement pour le moment") : le flux audio passe
// entièrement par Agora (WebRTC géré par leur SDK, aucun serveur TURN à
// notre charge) — ce composant ne fait que piloter le SDK et refléter le
// signal de présence d'appel (commande.appelEnCours, déjà inclus dans
// listenCommande côté page appelante, jamais un listener séparé ici).
// "principal" (acheteur/vendeur <-> livreur(s)) partage UN SEUL canal par
// commande (c{commandeId}) — peu importe lequel des deux livreurs assignés
// (collecte/livraison finale) répond, la fonction agora-token accepte les
// deux comme légitimes sur ce canal.
export default function CallWidget({ commandeId, contexte, appelEnCours, currentUid, label = 'Appeler' }) {
  const [statut, setStatut] = useState('idle'); // idle | connecting | active
  const [muted, setMuted] = useState(false);
  const clientRef = useRef(null);
  const localTrackRef = useRef(null);

  const estAppelPourMoi = appelEnCours?.contexte === contexte;
  const jeSuisAppelant = estAppelPourMoi && appelEnCours.callerId === currentUid;
  const audioCtxRef = useRef(null);
  const sonnerieIntervalRef = useRef(null);

  // #nouveau (demande utilisateur, "aucune sonnerie ce n'est pas normal") :
  // deux bips générés via Web Audio API (aucun fichier audio à héberger),
  // répétés toutes les 2s tant que l'appel entrant n'est ni répondu ni
  // refusé. Best-effort : certains navigateurs bloquent l'audio avant toute
  // interaction utilisateur sur la page — sans conséquence ici, la personne
  // aura déjà navigué avant qu'un appel n'arrive dans l'usage réel.
  const jouerBip = () => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = audioCtxRef.current || (audioCtxRef.current = new Ctx());
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      [0, 500].forEach(delai => setTimeout(() => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }, delai));
    } catch { /* audio non disponible, sans conséquence — le bandeau visuel suffit */ }
  };

  useEffect(() => {
    const sonnerieActive = estAppelPourMoi && !jeSuisAppelant && statut === 'idle';
    if (sonnerieActive) {
      jouerBip();
      sonnerieIntervalRef.current = setInterval(jouerBip, 2000);
    } else if (sonnerieIntervalRef.current) {
      clearInterval(sonnerieIntervalRef.current);
      sonnerieIntervalRef.current = null;
    }
    return () => {
      if (sonnerieIntervalRef.current) { clearInterval(sonnerieIntervalRef.current); sonnerieIntervalRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estAppelPourMoi, jeSuisAppelant, statut]);

  const quitter = async (raccrocherPourTous) => {
    try {
      localTrackRef.current?.stop();
      localTrackRef.current?.close();
      await clientRef.current?.leave();
    } catch { /* déjà déconnecté, sans importance */ }
    clientRef.current = null;
    localTrackRef.current = null;
    setStatut('idle');
    setMuted(false);
    if (raccrocherPourTous) {
      terminerAppel(commandeId).catch(() => {});
    }
  };

  const rejoindre = async () => {
    setStatut('connecting');
    try {
      const { appId, channelName, token, uid } = await getAgoraToken(commandeId, contexte);
      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      clientRef.current = client;
      client.on('user-published', async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        if (mediaType === 'audio') user.audioTrack?.play();
      });
      await client.join(appId, channelName, token, uid);
      const localTrack = await AgoraRTC.createMicrophoneAudioTrack();
      localTrackRef.current = localTrack;
      await client.publish([localTrack]);
      setStatut('active');
    } catch (e) {
      toast.error("Impossible de rejoindre l'appel — vérifiez l'autorisation du micro dans votre navigateur.");
      setStatut('idle');
    }
  };

  const appeler = async () => {
    setStatut('connecting');
    try {
      await demarrerAppel(commandeId, contexte);
      await rejoindre();
    } catch (e) {
      toast.error(e.message || "Impossible de démarrer l'appel");
      setStatut('idle');
    }
  };

  // L'autre partie a raccroché (appelEnCours redevenu null, ou basculé sur
  // un autre contexte) — on quitte localement aussi, sans réécrire null.
  useEffect(() => {
    if (!estAppelPourMoi && statut !== 'idle') quitter(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estAppelPourMoi]);

  useEffect(() => () => { quitter(false); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleMute = () => {
    localTrackRef.current?.setEnabled(muted);
    setMuted(!muted);
  };

  if (!estAppelPourMoi) {
    return (
      <button onClick={appeler} disabled={statut === 'connecting'} className="w-full flex items-center justify-center gap-2 py-3 border-2 border-primary-200 text-primary-600 rounded-xl font-semibold hover:bg-primary-50 transition-colors text-sm disabled:opacity-60">
        <Phone className="w-4 h-4" /> {statut === 'connecting' ? 'Appel…' : label}
      </button>
    );
  }

  if (statut === 'idle' && !jeSuisAppelant) {
    return (
      <div className="bg-primary-50 border-2 border-primary-200 rounded-xl p-4 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-primary-700 flex items-center gap-2">
          <PhoneIncoming className="w-4 h-4 flex-shrink-0" /> Appel entrant…
        </p>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={() => quitter(true)} className="px-3 py-2 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-100">Refuser</button>
          <button onClick={rejoindre} className="px-3 py-2 rounded-lg text-xs font-semibold bg-primary-600 text-white hover:bg-primary-700">Répondre</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-primary-50 border-2 border-primary-200 rounded-xl p-4 flex items-center justify-between gap-3">
      <p className="text-sm font-semibold text-primary-700">{statut === 'connecting' ? 'Connexion…' : 'Appel en cours'}</p>
      <div className="flex gap-2 flex-shrink-0">
        <button onClick={toggleMute} className="p-2.5 rounded-lg text-gray-600 hover:bg-white" title={muted ? 'Réactiver le micro' : 'Couper le micro'}>
          {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>
        <button onClick={() => quitter(true)} className="p-2.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200" title="Raccrocher">
          <PhoneOff className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
