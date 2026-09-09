import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Bascule la police Syne (logo) de media="print" à "all" une fois chargée —
// géré en JS plutôt qu'un onload= inline dans index.html, car le CSP
// (script-src sans 'unsafe-inline') bloque les gestionnaires d'événements
// inline aussi bien que les <script> externes non listés.
const syneFontLink = document.getElementById('syne-font');
if (syneFontLink) {
  syneFontLink.addEventListener('load', () => { syneFontLink.media = 'all'; });
}

ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode>
    <App />
  </React.StrictMode>);

// Fiche d'urgence hors connexion (§5.6) — scope '/urgence' strictement
// distinct de firebase-messaging-sw.js (scope '/', notifications push) :
// aucune permission requise, contrairement au push, donc enregistré sans
// condition, best-effort (jamais bloquant si non supporté/échoue).
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw-urgence.js', { scope: '/urgence' }).catch(() => {});
}
