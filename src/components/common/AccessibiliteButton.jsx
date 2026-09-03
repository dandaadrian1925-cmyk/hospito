import { useEffect, useState } from 'react';
import { Accessibility, X } from 'lucide-react';

// Accessibilité & inclusion (Phase 5) — taille de texte et contraste élevé,
// appliqués globalement via des classes sur <html>, persistés en local
// (aucun compte requis, s'applique dès la prochaine visite sur cet appareil).
const STORAGE_KEY = 'hospito-accessibilite';
const TAILLES = [
  { value: 'tres-petite', label: 'Très petite' },
  { value: 'petite', label: 'Petite' },
  { value: 'normal', label: 'Normal' },
  { value: 'grand', label: 'Grand' },
  { value: 'tres-grand', label: 'Très grand' },
];

function lireReglages() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { taille: 'normal', contraste: false };
  } catch {
    return { taille: 'normal', contraste: false };
  }
}

function appliquer(reglages) {
  const root = document.documentElement;
  root.classList.remove('a11y-tres-petite', 'a11y-petite', 'a11y-grand', 'a11y-tres-grand', 'a11y-contraste');
  if (reglages.taille === 'tres-petite') root.classList.add('a11y-tres-petite');
  if (reglages.taille === 'petite') root.classList.add('a11y-petite');
  if (reglages.taille === 'grand') root.classList.add('a11y-grand');
  if (reglages.taille === 'tres-grand') root.classList.add('a11y-tres-grand');
  if (reglages.contraste) root.classList.add('a11y-contraste');
}

export default function AccessibiliteButton() {
  const [reglages, setReglages] = useState(lireReglages);
  const [ouvert, setOuvert] = useState(false);

  useEffect(() => {
    appliquer(reglages);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(reglages)); } catch { /* stockage indisponible, sans conséquence */ }
  }, [reglages]);

  return (
    <div style={{ position: 'fixed', bottom: 88, right: 20, zIndex: 200 }}>
      {ouvert && (
        <div
          style={{
            position: 'absolute', bottom: 56, right: 0, width: 300,
            background: 'white', borderRadius: 14, boxShadow: 'var(--shadow-lg, 0 8px 30px rgba(0,0,0,0.15))',
            padding: 16, border: '1px solid var(--border, #E2E8F0)',
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Accessibilité</p>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 6 }}>Taille du texte</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 14 }}>
            {TAILLES.map((t) => (
              <button
                key={t.value}
                onClick={() => setReglages((r) => ({ ...r, taille: t.value }))}
                style={{
                  padding: '6px 2px', borderRadius: 8, fontSize: 10.5, fontWeight: 600, cursor: 'pointer',
                  border: reglages.taille === t.value ? '2px solid var(--blue)' : '1px solid var(--border, #E2E8F0)',
                  background: reglages.taille === t.value ? 'var(--accent-soft, #EEF3FF)' : 'white',
                  color: reglages.taille === t.value ? 'var(--blue)' : 'var(--ink-2)',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={reglages.contraste}
              onChange={(e) => setReglages((r) => ({ ...r, contraste: e.target.checked }))}
            />
            Contraste élevé
          </label>
        </div>
      )}
      <button
        onClick={() => setOuvert((v) => !v)}
        aria-label="Options d'accessibilité"
        style={{
          width: 48, height: 48, borderRadius: '50%', background: 'var(--blue)', color: 'white',
          border: 'none', boxShadow: 'var(--shadow-lg, 0 4px 16px rgba(0,0,0,0.2))', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {ouvert ? <X size={20} /> : <Accessibility size={22} />}
      </button>
    </div>
  );
}
