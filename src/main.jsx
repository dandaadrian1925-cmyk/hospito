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
