import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import { MapPin, Navigation2, XCircle, RefreshCw } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { ICONE_ACHETEUR, ICONE_VENDEUR } from './mapIcons';

// #nouveau (demande utilisateur) : pour une remise en main propre, chacun
// peut partager un point ponctuel (jamais un suivi continu) pour se
// retrouver plus facilement — révocable à tout moment (cf. firestore.rules,
// positionValide). Contrairement à DestinationMap (maket-livreur), il n'y a
// jamais de "destination" géocodée ici, seulement les 2 points partagés.
function AjusterVue({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points.map(p => [p.lat, p.lng]), { padding: [30, 30] });
    else if (points.length === 1) map.setView([points[0].lat, points[0].lng], 15);
  }, [JSON.stringify(points)]);
  return null;
}

export default function MainPropreMap({ positionAcheteur, positionVendeur, maPosition, autrePosition, onPartager, onArreter, partageLoading }) {
  const [erreur, setErreur] = useState(null);
  const points = [positionAcheteur, positionVendeur].filter(Boolean);

  // #bug (retour utilisateur, "délai dépassé") : une position FRAÎCHE en une
  // seule tentative peut légitimement dépasser le délai (GPS lent à se
  // fixer). Contrairement au livreur (suivi continu en parallèle), rien
  // d'autre ne tourne ici — le seul repli possible est le dernier point déjà
  // partagé avec succès (maPosition, déjà affiché), plutôt que de laisser
  // l'utilisateur sans rien.
  const handlePartager = () => {
    setErreur(null);
    if (!navigator.geolocation) {
      setErreur("La géolocalisation n'est pas disponible sur cet appareil.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => onPartager(pos.coords.latitude, pos.coords.longitude),
      err => {
        if (maPosition) {
          onPartager(maPosition.lat, maPosition.lng);
          return;
        }
        const messages = {
          1: 'Autorisation de localisation refusée — vérifiez les paramètres du site dans votre navigateur.',
          2: 'Position indisponible pour le moment (signal GPS/réseau faible) — réessayez dans quelques secondes.',
          3: 'Délai dépassé en essayant d\'obtenir votre position — réessayez.'
        };
        setErreur(messages[err.code] || 'Impossible d\'obtenir votre position.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm flex items-center gap-1.5" style={{ fontFamily: 'var(--font-display)' }}>
          <MapPin className="w-4 h-4 text-blue-600" /> Se retrouver
        </h3>
        {maPosition ? (
          <div className="flex items-center gap-3">
            {}
            <button onClick={handlePartager} disabled={partageLoading} className="text-xs font-semibold text-primary-600 flex items-center gap-1 hover:text-primary-700">
              <RefreshCw className="w-3.5 h-3.5" /> Actualiser
            </button>
            <button onClick={onArreter} disabled={partageLoading} className="text-xs font-semibold text-gray-500 flex items-center gap-1 hover:text-red-600">
              <XCircle className="w-3.5 h-3.5" /> Ne plus partager
            </button>
          </div>
        ) : (
          <button onClick={handlePartager} disabled={partageLoading} className="text-xs font-semibold text-primary-600 flex items-center gap-1 hover:text-primary-700">
            <Navigation2 className="w-3.5 h-3.5" /> Partager ma position
          </button>
        )}
      </div>

      {erreur && <p className="text-xs text-red-500 mb-3">{erreur}</p>}

      {points.length === 0 ? (
        <p className="text-xs text-gray-400">Personne n'a encore partagé sa position — c'est ponctuel et à la demande de chacun.</p>
      ) : (
        <div className="rounded-xl overflow-hidden border border-gray-100" style={{ height: 220 }}>
          <MapContainer center={[points[0].lat, points[0].lng]} zoom={14} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {positionAcheteur && (
              <Marker position={[positionAcheteur.lat, positionAcheteur.lng]} icon={ICONE_ACHETEUR}>
                <Popup>L'acheteur</Popup>
              </Marker>
            )}
            {positionVendeur && (
              <Marker position={[positionVendeur.lat, positionVendeur.lng]} icon={ICONE_VENDEUR}>
                <Popup>Le vendeur</Popup>
              </Marker>
            )}
            <AjusterVue points={points} />
          </MapContainer>
        </div>
      )}
      {!maPosition && !autrePosition && points.length === 0 && (
        <p className="text-xs text-gray-400 mt-2">Aucun suivi en continu — juste un point partagé au moment où vous l'activez, retirable à tout moment.</p>
      )}
    </div>
  );
}
