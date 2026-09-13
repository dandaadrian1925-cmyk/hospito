import { useState, useRef, useEffect } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { Video, PhoneOff, Mic, MicOff, VideoOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAgoraTokenTeleconsultation } from '../../services/teleconsultationService';

// Téléconsultation (§4.14) — appel VIDÉO, à la différence du CallWidget
// marketplace (audio seul, jamais modifié). Rendez-vous
// planifié : les deux parties rejoignent le même canal indépendamment,
// aucune logique de sonnerie/appelant nécessaire (contrairement à un appel
// ad-hoc acheteur/vendeur↔livreur).
export default function TeleconsultationCallWidget({ demandeId }) {
  const [statut, setStatut] = useState('idle'); // idle | connecting | active
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  // Salle d'attente virtuelle (§4.14) : le patient rejoint le canal seul
  // (statut 'active') mais reste sur un écran d'attente tant que le médecin
  // n'est pas détecté dans le canal (événement Agora natif 'user-published')
  // — pas de nouveau mécanisme de présence à inventer, juste exploiter celui
  // qui existe déjà.
  const [autrePartiePresente, setAutrePartiePresente] = useState(false);
  const clientRef = useRef(null);
  const localAudioRef = useRef(null);
  const localVideoRef = useRef(null);
  const localVideoElRef = useRef(null);
  const remoteVideoElRef = useRef(null);

  // #corrigé (retour utilisateur, "je peux déjà parler et on entend chez le
  // médecin sans même que le médecin ne rejoigne l'appel") : CE nettoyage
  // n'arrêtait que `client.leave()`, jamais les pistes micro/caméra locales
  // (getUserMedia) — contrairement à quitter() (bouton "Raccrocher"), qui le
  // fait correctement. Une page quittée par navigation, rafraîchissement ou
  // fermeture d'onglet SANS cliquer "Raccrocher" pouvait donc laisser le
  // micro/la caméra publiés en arrière-plan, audibles/visibles depuis
  // n'importe quel autre appareil déjà connecté à ce même canal — un vrai
  // risque de confidentialité, pas seulement le conflit d'identifiant déjà
  // corrigé. `nettoyerConnexion` est désormais la SEULE voie de sortie
  // (bouton, beforeunload, démontage du composant) : toujours les mêmes
  // trois étapes, jamais un chemin qui saute l'arrêt des pistes locales.
  const nettoyerConnexion = () => {
    try {
      localAudioRef.current?.stop();
      localAudioRef.current?.close();
      localVideoRef.current?.stop();
      localVideoRef.current?.close();
      clientRef.current?.leave();
    } catch { /* déjà déconnecté */ }
    clientRef.current = null;
    localAudioRef.current = null;
    localVideoRef.current = null;
    // #nouveau (demande utilisateur, "à chaque déconnexion, le cache soit
    // vidé") : sessionStorage (propre à cet onglet, jamais l'authentification
    // ni les préférences) et le Cache Storage API (service worker, s'il y en
    // a un) — jamais localStorage, qui porte des données persistantes sans
    // rapport avec l'appel (ex. préférences d'accessibilité) que vider
    // effacerait pour rien à chaque raccroché.
    try { sessionStorage.clear(); } catch { /* stockage indisponible */ }
    if (typeof caches !== 'undefined') {
      caches.keys().then((noms) => Promise.all(noms.map((n) => caches.delete(n)))).catch(() => {});
    }
  };

  // #nouveau (retour utilisateur, "moyen de vider le cache du site après
  // chaque déconnexion ?") : pas un problème de cache à proprement parler —
  // `pagehide` est l'événement standard (MDN/web.dev) pour ce cas précis, là
  // où `beforeunload` ne se déclenche pas de façon fiable : le bouton
  // "Précédent" du navigateur peut restaurer une page depuis le cache
  // mémoire (bfcache) sans jamais redémarrer React ni redéclencher
  // `beforeunload`, laissant une connexion active invisible en arrière-plan.
  // `pagehide` couvre TOUS les cas où `beforeunload` se déclenche, plus
  // celui-ci — gardé en plus (jamais à la place) par prudence, sans risque
  // puisque nettoyerConnexion() est sans danger à appeler deux fois.
  useEffect(() => {
    window.addEventListener('beforeunload', nettoyerConnexion);
    window.addEventListener('pagehide', nettoyerConnexion);
    return () => {
      window.removeEventListener('beforeunload', nettoyerConnexion);
      window.removeEventListener('pagehide', nettoyerConnexion);
      nettoyerConnexion();
    };
  }, []);

  const quitter = async () => {
    nettoyerConnexion();
    setStatut('idle');
    setMuted(false);
    setCameraOff(false);
    setAutrePartiePresente(false);
  };

  const rejoindre = async () => {
    setStatut('connecting');
    try {
      const { appId, channelName, token, uid } = await getAgoraTokenTeleconsultation(demandeId);
      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      clientRef.current = client;
      client.on('user-published', async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        setAutrePartiePresente(true);
        if (mediaType === 'video' && remoteVideoElRef.current) user.videoTrack?.play(remoteVideoElRef.current);
        if (mediaType === 'audio') user.audioTrack?.play();
      });
      client.on('user-left', () => setAutrePartiePresente(false));
      await client.join(appId, channelName, token, uid);
      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
      localAudioRef.current = audioTrack;
      localVideoRef.current = videoTrack;
      if (localVideoElRef.current) videoTrack.play(localVideoElRef.current);
      await client.publish([audioTrack, videoTrack]);
      setStatut('active');
    } catch (e) {
      // #corrigé (retour utilisateur, "pourquoi le navigateur ne demande pas
      // l'autorisation caméra/micro ?") : ce message générique s'affichait
      // pour N'IMPORTE QUELLE erreur (jeton refusé par le serveur, réseau,
      // Firestore introuvable...), pas seulement un refus de permission —
      // l'erreur réelle finissait seulement dans la console, jamais montrée.
      console.error('Échec de connexion à la téléconsultation :', e);
      // #corrigé (retour utilisateur, "hier ça marchait, pourquoi plus
      // maintenant ?") : UID_CONFLICT (identifiant Agora déjà occupé par une
      // session précédente pas proprement fermée — onglet fermé sans
      // "Raccrocher", rafraîchissement pendant l'appel...) affichait le
      // message technique brut d'Agora, incompréhensible et sans action
      // claire. Toujours transitoire : la session fantôme expire d'elle-même
      // côté Agora après quelques dizaines de secondes.
      const conflitUid = e?.code === 'UID_CONFLICT' || /UID_CONFLICT/i.test(e?.message || '');
      toast.error(conflitUid
        ? "Une connexion précédente à cet appel est encore active côté serveur — patientez une minute puis réessayez."
        : (e.message || "Impossible de rejoindre l'appel — vérifiez l'autorisation caméra/micro de votre navigateur."));
      setStatut('idle');
    }
  };

  const toggleMute = () => {
    localAudioRef.current?.setEnabled(muted);
    setMuted(!muted);
  };

  const toggleCamera = () => {
    localVideoRef.current?.setEnabled(cameraOff);
    setCameraOff(!cameraOff);
  };

  if (statut === 'idle') {
    return (
      <button onClick={rejoindre} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <Video style={{ width: 16, height: 16 }} /> Rejoindre la téléconsultation
      </button>
    );
  }

  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', background: '#111', maxWidth: 480 }}>
      <div style={{ position: 'relative', aspectRatio: '4/3', background: '#000' }}>
        <div ref={remoteVideoElRef} style={{ width: '100%', height: '100%' }} />
        <div ref={localVideoElRef} style={{ position: 'absolute', bottom: 8, right: 8, width: 96, height: 72, borderRadius: 8, overflow: 'hidden', border: '2px solid white' }} />
        {statut === 'connecting' && (
          <p style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 13 }}>
            Connexion…
          </p>
        )}
        {statut === 'active' && !autrePartiePresente && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(17,17,17,0.85)', color: 'white', textAlign: 'center', padding: 16 }}>
            <div style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,0.25)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: 13, fontWeight: 700 }}>Salle d'attente virtuelle</p>
            <p style={{ fontSize: 12, opacity: 0.75 }}>Vous êtes connecté(e) — en attente que le médecin rejoigne l'appel.</p>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, padding: 12, background: '#1a1a1a' }}>
        <button onClick={toggleMute} style={{ padding: 10, borderRadius: '50%', background: '#333', border: 'none', color: 'white', cursor: 'pointer' }}>
          {muted ? <MicOff style={{ width: 16, height: 16 }} /> : <Mic style={{ width: 16, height: 16 }} />}
        </button>
        <button onClick={toggleCamera} style={{ padding: 10, borderRadius: '50%', background: '#333', border: 'none', color: 'white', cursor: 'pointer' }}>
          {cameraOff ? <VideoOff style={{ width: 16, height: 16 }} /> : <Video style={{ width: 16, height: 16 }} />}
        </button>
        <button onClick={quitter} style={{ padding: 10, borderRadius: '50%', background: '#C2402F', border: 'none', color: 'white', cursor: 'pointer' }}>
          <PhoneOff style={{ width: 16, height: 16 }} />
        </button>
      </div>
    </div>
  );
}
