import { useState, useEffect } from 'react';
import { FolderHeart, Loader2, AlertTriangle } from 'lucide-react';
import { getMonDossier, getMesPrescriptions, dossierLocalDisponible } from '../../services/dossierPatientService';
import { getEtablissement } from '../../services/etablissementsPublicService';

// Dossier médical + prescriptions, UNIQUE et partagé entre tous les
// établissements du patient — réutilisé à l'identique dans l'onglet "Mon
// dossier" d'un espace établissement (EtablissementSpacePage) et dans
// moncompte/DossierPage. Volontairement PAS filtré par établissement : le
// but de cette vue est justement de montrer qu'une entrée créée par
// l'hôpital A reste visible même depuis l'espace de l'hôpital B.
const TYPES_ENTREE = {
  antecedent: 'Antécédent', allergie: 'Allergie', constante: 'Constante vitale', compte_rendu: 'Compte-rendu',
};
const STATUT_PRESCRIPTION = {
  active: { bg: '#EFF6FF', color: '#2451C4', label: 'Active' },
  terminee: { bg: '#F0FDF4', color: '#059669', label: 'Terminée' },
  annulee: { bg: '#F1F5F9', color: '#64748B', label: 'Annulée' },
};

const placeholderStyle = { textAlign: 'center', padding: '40px 20px', color: 'var(--ink-3)' };
const cardStyle = { background: 'white', borderRadius: 16, border: '1.5px solid #F1F5F9', padding: 16 };

function EtatVide({ titre, texte }) {
  return (
    <div style={placeholderStyle}>
      <FolderHeart style={{ width: 32, height: 32, margin: '0 auto 12px', color: 'var(--ink-4)' }} />
      <p style={{ fontWeight: 600, color: 'var(--ink-2)' }}>{titre}</p>
      <p style={{ fontSize: 13, marginTop: 4 }}>{texte}</p>
    </div>
  );
}

const formatDate = (ts) => (ts?.toDate ? ts.toDate().toLocaleDateString('fr-FR') : '');

export default function DossierMedicalView({ cni }) {
  const [entrees, setEntrees] = useState(null);
  const [prescriptions, setPrescriptions] = useState(null);
  const [etablissements, setEtablissements] = useState({});
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    if (!dossierLocalDisponible || !cni) {
      setEntrees([]);
      setPrescriptions([]);
      return;
    }
    setErreur(null);
    Promise.all([getMonDossier(cni), getMesPrescriptions(cni)])
      .then(async ([e, p]) => {
        setEntrees(e);
        setPrescriptions(p);
        const ids = [...new Set([...e, ...p].map((x) => x.etablissementId))];
        const entries = await Promise.all(ids.map(async (id) => [id, await getEtablissement(id)]));
        setEtablissements(Object.fromEntries(entries));
      })
      .catch((err) => {
        setErreur(err.message || 'Erreur');
        setEntrees([]);
        setPrescriptions([]);
      });
  }, [cni]);

  if (!dossierLocalDisponible) {
    return (
      <EtatVide
        titre="Disponible prochainement"
        texte="Votre dossier médical, unique et partagé entre tous vos établissements, sera consultable ici."
      />
    );
  }

  if (!cni) {
    return (
      <EtatVide
        titre="Numéro CNI requis"
        texte="Renseignez votre numéro CNI dans Mon Compte pour activer votre dossier médical partagé."
      />
    );
  }

  if (entrees === null) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
        <Loader2 style={{ width: 24, height: 24, color: '#94A3B8' }} className="animate-spin" />
      </div>
    );
  }

  if (erreur) {
    return (
      <div style={{ ...placeholderStyle, color: '#B91C1C' }}>
        <AlertTriangle style={{ width: 32, height: 32, margin: '0 auto 12px', color: '#DC2626' }} />
        <p style={{ fontWeight: 600 }}>Dossier indisponible</p>
        <p style={{ fontSize: 13, marginTop: 4 }}>{erreur}</p>
      </div>
    );
  }

  if (!entrees.length && !prescriptions.length) {
    return (
      <EtatVide
        titre="Dossier vide"
        texte="Les entrées ajoutées par vos médecins (antécédents, allergies, comptes-rendus) et vos prescriptions apparaîtront ici."
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {!!prescriptions.length && (
        <section>
          <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink-2)', marginBottom: 8 }}>Prescriptions</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {prescriptions.map((p) => {
              const style = STATUT_PRESCRIPTION[p.statut] || STATUT_PRESCRIPTION.active;
              return (
                <div key={p.id} style={cardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>
                        {etablissements[p.etablissementId]?.nom || 'Établissement'}
                      </p>
                      <p style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>Dr {p.medecinNom || '—'} · {formatDate(p.createdAt)}</p>
                    </div>
                    <span style={{ flexShrink: 0, background: style.bg, color: style.color, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999 }}>{style.label}</span>
                  </div>
                  <ul style={{ marginTop: 10, paddingLeft: 18, fontSize: 13, color: 'var(--ink)' }}>
                    {p.medicaments.map((m, i) => (
                      <li key={i}>{m.nom} — {m.dose}, {m.frequence}, {m.duree}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {!!entrees.length && (
        <section>
          <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink-2)', marginBottom: 8 }}>Historique</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {entrees.map((e) => (
              <div key={e.id} style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{TYPES_ENTREE[e.type] || e.type}</p>
                  <p style={{ fontSize: 12, color: '#64748B' }}>{etablissements[e.etablissementId]?.nom || 'Établissement'}</p>
                </div>
                <p style={{ fontSize: 13, color: 'var(--ink)', marginTop: 8 }}>{e.contenu}</p>
                <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>{e.auteurNom || '—'} · {formatDate(e.createdAt)}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
