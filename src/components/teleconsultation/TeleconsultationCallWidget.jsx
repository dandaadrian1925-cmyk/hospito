import { useState, useRef } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { Video, PhoneOff, Mic, MicOff, VideoOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAgoraTokenTeleconsultation } from '../../services/teleconsultationService';

// Téléconsultation (§4.14) — appel VIDÉO, à la différence du CallWidget
// marketplace (audio seul, hérité de MAKET, jamais modifié). Rendez-vous
// planifié : les deux parties rejoignent le même canal indépendamment,
// aucune logique de sonnerie/appelant nécessaire (contrairement à un appel
// ad-hoc acheteur/vendeur↔livreur).
export default function TeleconsultationCallWidget({ demandeId }) {
  const [statut, setStatut] = useState('idle'); // idle | connecting | active
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const clientRef = useRef(null);
  const localAudioRef = useRef(null);
  const localVideoRef = useRef(null);
  const localVideoElRef = useRef(null);
  const remoteVideoElRef = useRef(null);

  const quitter = async () => {
    try {
      localAudioRef.current?.stop();
      localAudioRef.current?.close();
      localVideoRef.current?.stop();
      localVideoRef.current?.close();
      await clientRef.current?.leave();
    } catch { /* déjà déconnecté */ }
    clientRef.current = null;
    localAudioRef.current = null;
    localVideoRef.current = null;
    setStatut('idle');
    setMuted(false);
    setCameraOff(false);
  };

  const rejoindre = async () => {
    setStatut('connecting');
    try {
      const { appId, channelName, token, uid } = await getAgoraTokenTeleconsultation(demandeId);
      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      clientRef.current = client;
      client.on('user-published', async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        if (mediaType === 'video' && remoteVideoElRef.current) user.videoTrack?.play(remoteVideoElRef.current);
        if (mediaType === 'audio') user.audioTrack?.play();
      });
      await client.join(appId, channelName, token, uid);
      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
      localAudioRef.current = audioTrack;
      localVideoRef.current = videoTrack;
      if (localVideoElRef.current) videoTrack.play(localVideoElRef.current);
      await client.publish([audioTrack, videoTrack]);
      setStatut('active');
    } catch (e) {
      console.error('Échec de connexion à la téléconsultation :', e);
      toast.error("Impossible de rejoindre l'appel — vérifiez l'autorisation caméra/micro de votre navigateur.");
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
