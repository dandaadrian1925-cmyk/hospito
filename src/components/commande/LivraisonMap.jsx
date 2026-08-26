import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import { MapPin, Navigation2, XCircle, Satellite, RefreshCw } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { ICONE_LIVREUR, ICONE_DESTINATION } from './mapIcons';

// #nouveau (demande utilisateur, "carte côté acheteur/vendeur pour voir le
// livreur en direct") : distincte de MainPropreMap (mode main_propre, 2
// points ponctuels, jamais de livreur) — ici, la position du livreur est
// déjà en direct (écrite en continu pendant le trajet actif, cf.
// maket-livreur updateLivreurPosition), visible sans rien demander. Seul le
// partage de SA PROPRE position par l'acheteur/vendeur est conditionné à
// une demande active du livreur (demandeActive) — c'est le vrai
// consentement, imposé côté firestore.rules (positionAcheteurVendeurAutorisee),
// pas juste une convention d'affichage ici.
function AjusterVue({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points.map(p => [p.lat, p.lng]), { padding: [30, 30] });
    else if (points.length === 1) map.setView([points[0].lat, points[0].lng], 15);
  }, [JSON.stringify(points)]);
  return null;
}

export default function LivraisonMap({ livreurPosition, destination, maPosition, demandeActive, onPartager, onArreter, partageLoading }) {
  const [erreur, setErreur] = useState(null);
  const points = [livreurPosition, destination, maPosition].filter(Boolean);

  // #bug (retour utilisateur, "délai dépassé") : repli sur le dernier point
  // déjà partagé avec succès (maPosition) si la tentative fraîche dépasse le
  // délai — même correctif que MainPropreMap/CommandeDetailPage (livreur).
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

  if (points.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm flex items-center gap-1.5" style={{ fontFamily: 'var(--font-display)' }}>
          <MapPin className="w-4 h-4 text-blue-600" /> Suivi du livreur
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
          // #nouveau (demande utilisateur, "chacun peut actualiser sa
          // position quand il le souhaite") : plus besoin d'une demande
          // active du livreur pour proposer le partage — demandeActive reste
          // affiché comme signal ci-dessous, mais n'est plus une condition.
          <button onClick={handlePartager} disabled={partageLoading} className="text-xs font-semibold text-primary-600 flex items-center gap-1 hover:text-primary-700">
            <Navigation2 className="w-3.5 h-3.5" /> Partager ma position
          </button>
        )}
      </div>

      {demandeActive && !maPosition && (
        <p className="text-xs text-amber-600 flex items-center gap-1 mb-3">
          <Satellite className="w-3.5 h-3.5 flex-shrink-0" /> Le livreur souhaite votre position actualisée.
        </p>
      )}
      {erreur && <p className="text-xs text-red-500 mb-3">{erreur}</p>}

      <div className="rounded-xl overflow-hidden border border-gray-100" style={{ height: 220 }}>
        <MapContainer center={[points[0].lat, points[0].lng]} zoom={14} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {livreurPosition && (
            <Marker position={[livreurPosition.lat, livreurPosition.lng]} icon={ICONE_LIVREUR}>
              <Popup>Le livreur</Popup>
            </Marker>
          )}
          {destination && (
            <Marker position={[destination.lat, destination.lng]} icon={ICONE_DESTINATION}>
              <Popup>Destination (approximative)</Popup>
            </Marker>
          )}
          <AjusterVue points={points} />
        </MapContainer>
      </div>
    </div>
  );
}
