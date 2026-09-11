import { useOutletContext } from 'react-router-dom';

const SECTIONS = [
  { key: 'histoire', label: 'Histoire' },
  { key: 'mission', label: 'Notre mission' },
  { key: 'valeurs', label: 'Nos valeurs' },
];

// #nouveau (demande utilisateur, "c'est le super admin qui les ajoutes
// dynamiquement") : contenu entièrement saisi par le sysadmin
// (contenuVitrineService.js, hospito-super-admin), déjà chargé une fois par
// EtablissementLayout (pour aussi appliquer la couleur du site) et transmis
// ici via Outlet — page absente de tout texte inventé, chaque section ne
// s'affiche que si réellement renseignée.
export default function EtablissementAProposPage() {
  const { etablissement, apropos } = useOutletContext();

  if (apropos === null) return <p style={{ fontSize: 13, color: 'var(--ink-4)' }}>Chargement…</p>;

  const sections = SECTIONS.filter((s) => apropos[s.key]?.trim());
  const rien = !sections.length && !apropos.agrement && !apropos.chiffresCles?.length;

  if (rien) {
    return <p style={{ fontSize: 13, color: 'var(--ink-4)' }}>{etablissement.nom} n'a pas encore renseigné cette page.</p>;
  }

  return (
    <div>
      {!!apropos.chiffresCles?.length && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 32 }}>
          {apropos.chiffresCles.map((c, i) => (
            <div key={i} style={{ flex: '1 1 140px', padding: '18px', background: 'var(--bg-2)', borderRadius: 12, textAlign: 'center' }}>
              <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue)' }}>{c.valeur}</p>
              <p style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 4 }}>{c.label}</p>
            </div>
          ))}
        </div>
      )}

      {sections.map((s) => (
        <div key={s.key} style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>{s.label}</h2>
          <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{apropos[s.key]}</p>
        </div>
      ))}

      {apropos.agrement && (
        <div style={{ padding: '14px 16px', background: 'var(--bg-2)', borderRadius: 10, fontSize: 13, color: 'var(--ink-2)' }}>
          <strong>Agrément / autorisation d'exercer :</strong> {apropos.agrement}
        </div>
      )}
    </div>
  );
}
