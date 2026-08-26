import L from 'leaflet';

// Marqueurs "goutte" colorés — même style que maket-livreur (lib/mapIcons.js),
// gardé en phase pour une identité visuelle cohérente entre les 2 apps.
const creerIcone = (emoji, couleur) => L.divIcon({
  html: `<div style="background:${couleur};width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.35);border:2px solid white;"><span style="transform:rotate(45deg);font-size:14px;">${emoji}</span></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -28],
  className: '',
});

export const ICONE_ACHETEUR = creerIcone('🏠', '#059669');
export const ICONE_VENDEUR = creerIcone('🏪', '#D97706');
export const ICONE_LIVREUR = creerIcone('🚚', '#2451C4');
export const ICONE_DESTINATION = creerIcone('📍', '#DC2626');
