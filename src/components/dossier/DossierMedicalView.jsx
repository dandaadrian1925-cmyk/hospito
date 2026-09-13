import { useState, useEffect, useMemo } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import {
  FolderHeart, Loader2, AlertTriangle, ShieldCheck, Droplet, BadgeCheck, History,
  CalendarDays, Stethoscope, Pill, Search, Waypoints, FileText, Building2,
} from 'lucide-react';
import { db } from '../../firebase/config';
import {
  getMonDossier, getMesPrescriptions, dossierLocalDisponible, ecouterIdentiteVerifieeParUnEtablissement,
} from '../../services/dossierPatientService';
import { getEtablissement } from '../../services/etablissementsPublicService';

// #reconstruit (demande utilisateur, "partout où le dossier médical est
// présent, arrange que ça reste sous forme de fiche comme dans médecin") :
// même structure que hospito-medecin/pages/dossiers/FichePatientPage.jsx
// (en-tête identité/groupe sanguin/allergies/antécédents, puis historique
// regroupé PAR JOUR de visite) — adaptée aux données réellement disponibles
// ici : ce dossier est partagé entre TOUS les établissements (pas un seul),
// donc chaque entrée affiche en plus son établissement d'origine, et il n'y
// a ni téléphone/domicile/contact d'urgence/date de naissance (jamais
// centralisés sur le compte patient, seulement sur une fiche
// établissement) ni examens (le backend démo local ne les expose pas) —
// seulement ce que get_dossier.php/get_prescriptions_patient.php renvoient
// réellement.
const STATUT_PRESCRIPTION = {
  active: { bg: '#EFF6FF', color: '#2451C4', label: 'Active' },
  terminee: { bg: '#F0FDF4', color: '#059669', label: 'Terminée' },
  annulee: { bg: '#F1F5F9', color: '#64748B', label: 'Annulée' },
};

const placeholderStyle = { textAlign: 'center', padding: '40px 20px', color: 'var(--ink-3)' };
const cardStyle = { background: 'white', borderRadius: 16, border: '1.5px solid #F1F5F9', padding: 16 };

const debutJour = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const finJour = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
const PERIODES_HISTORIQUE = {
  semaine: () => {
    const j = new Date();
    const decalageLundi = j.getDay() === 0 ? -6 : 1 - j.getDay();
    const lundi = new Date(j); lundi.setDate(j.getDate() + decalageLundi);
    const dimanche = new Date(lundi); dimanche.setDate(lundi.getDate() + 6);
    return [debutJour(lundi), finJour(dimanche)];
  },
  mois: () => {
    const j = new Date();
    return [debutJour(new Date(j.getFullYear(), j.getMonth(), 1)), finJour(new Date(j.getFullYear(), j.getMonth() + 1, 0))];
  },
  annee: () => {
    const j = new Date();
    return [debutJour(new Date(j.getFullYear(), 0, 1)), finJour(new Date(j.getFullYear(), 11, 31))];
  },
};
const LABEL_PERIODE_HISTORIQUE = { tout: 'Tout', semaine: 'Cette semaine', mois: 'Ce mois', annee: 'Cette année', personnalise: 'Personnalisé' };
const versInput = (d) => d.toISOString().slice(0, 10);

const estMemeJour = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const libelleJour = (date) => {
  const hier = new Date(); hier.setDate(hier.getDate() - 1);
  if (estMemeJour(date, new Date())) return "Aujourd'hui";
  if (estMemeJour(date, hier)) return 'Hier';
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

const formaterAuteur = (nomOuEmail) => {
  if (!nomOuEmail) return null;
  if (!nomOuEmail.includes('@')) return nomOuEmail;
  return nomOuEmail.split('@')[0].split(/[._-]/).filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
};

// Même format de compte-rendu que ConsultationPage.jsx (hospito-medecin) —
// "Label :\ncontenu" séparés par une ligne vide, écrit tel quel dans les
// deux modes (Firestore et backend local), donc reparsable ici à l'identique.
const ICONES_SECTION_CR = [
  { test: (l) => l.includes('Motif'), icon: Search },
  { test: (l) => l.includes('Examen'), icon: Stethoscope },
  { test: (l) => l.includes('Diagnostic'), icon: Waypoints },
  { test: (l) => l.includes('Recommandations'), icon: FileText },
];
const parseCompteRendu = (contenu) => contenu.split('\n\n').map((bloc) => {
  const idx = bloc.indexOf(' :\n');
  if (idx === -1) return { label: null, icon: null, texte: bloc };
  const label = bloc.slice(0, idx);
  return { label, icon: ICONES_SECTION_CR.find((s) => s.test(label))?.icon || FileText, texte: bloc.slice(idx + 3) };
});

function EtatVide({ titre, texte }) {
  return (
    <div style={placeholderStyle}>
      <FolderHeart style={{ width: 32, height: 32, margin: '0 auto 12px', color: 'var(--ink-4)' }} />
      <p style={{ fontWeight: 600, color: 'var(--ink-2)' }}>{titre}</p>
      <p style={{ fontSize: 13, marginTop: 4 }}>{texte}</p>
    </div>
  );
}

function Avatar({ nom }) {
  const initiales = (nom || '?').trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('');
  return (
    <div style={{
      width: 52, height: 52, borderRadius: 15, flexShrink: 0,
      background: 'linear-gradient(135deg, #CCFBEF, #ECFDF9)', color: '#0D9488',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18,
    }}
    >
      {initiales || '?'}
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12,
      background: value ? 'white' : '#F8FAFC', border: `1.5px solid ${value ? '#F1F5F9' : 'transparent'}`,
    }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        background: value ? '#F0FDFA' : 'transparent', color: value ? '#0D9488' : '#94A3B8',
      }}
      >
        <Icon size={15} />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 10.5, color: '#94A3B8', lineHeight: 1 }}>{label}</p>
        <p style={{ fontSize: 13, fontWeight: 600, color: value ? 'var(--ink)' : '#94A3B8', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value || 'Non renseigné'}
        </p>
      </div>
    </div>
  );
}

function EnteteSection({ icon: Icon, label }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700,
      padding: '4px 10px', borderRadius: 999, background: '#F1F5F9', color: 'var(--ink)', flexShrink: 0,
    }}
    >
      <Icon size={12} /> {label}
    </span>
  );
}

function EtablissementBadge({ nom }) {
  if (!nom) return null;
  return (
    <span style={{ fontSize: 11, color: '#64748B', display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
      <Building2 size={11} /> {nom}
    </span>
  );
}

// #nouveau (décision utilisateur, "retire la vérification dans Mon compte
// et ajoute ça sur cette page-ci en spécifiant que c'est obligatoire") : le
// numéro de CNI se saisit désormais directement ici, au moment où il
// bloque réellement l'accès — plus besoin d'aller le chercher dans un
// réglage de profil séparé pour comprendre pourquoi le dossier est fermé.
function FormulaireCni({ uid }) {
  const [valeur, setValeur] = useState('');
  const [saving, setSaving] = useState(false);

  const enregistrer = async (e) => {
    e.preventDefault();
    if (!valeur.trim()) { toast.error('Numéro de CNI requis'); return; }
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', uid), { numeroIdentiteNational: valeur.trim() });
      toast.success('Numéro enregistré');
    } catch (err) {
      toast.error(err.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={enregistrer} style={{ display: 'flex', gap: 8, marginTop: 14, maxWidth: 340, marginLeft: 'auto', marginRight: 'auto' }}>
      <input
        value={valeur}
        onChange={(e) => setValeur(e.target.value)}
        placeholder="Numéro de CNI"
        className="input-field"
        style={{ flex: 1, fontSize: 13 }}
      />
      <button type="submit" disabled={saving} className="btn-primary" style={{ fontSize: 12, padding: '0 16px', flexShrink: 0 }}>
        {saving ? '…' : 'Enregistrer'}
      </button>
    </form>
  );
}

export default function DossierMedicalView({ cni, uid, nom, prenom }) {
  const [entrees, setEntrees] = useState(null);
  const [prescriptions, setPrescriptions] = useState(null);
  const [etablissements, setEtablissements] = useState({});
  const [erreur, setErreur] = useState(null);
  // #nouveau (décision utilisateur, "vérification à faire par chaque
  // établissement avant d'accéder à son dossier médical en ligne") :
  // undefined = vérification en cours, true/false = résultat.
  const [identiteVerifiee, setIdentiteVerifiee] = useState(undefined);
  const [periode, setPeriode] = useState('tout');
  const [personnaliseDebut, setPersonnaliseDebut] = useState(versInput(new Date()));
  const [personnaliseFin, setPersonnaliseFin] = useState(versInput(new Date()));

  const [dateDebut, dateFin] = useMemo(() => {
    if (periode === 'tout') return [null, null];
    if (periode === 'personnalise') return [debutJour(new Date(personnaliseDebut)), finJour(new Date(personnaliseFin))];
    return PERIODES_HISTORIQUE[periode]();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periode, personnaliseDebut, personnaliseFin]);

  useEffect(() => {
    if (!cni) { setIdentiteVerifiee(undefined); return; }
    return ecouterIdentiteVerifieeParUnEtablissement(cni, setIdentiteVerifiee);
  }, [cni]);

  useEffect(() => {
    if (!dossierLocalDisponible || !cni || !identiteVerifiee) {
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
  }, [cni, identiteVerifiee]);

  const nomEtablissement = (id, denorm) => etablissements[id]?.nom || denorm || 'Établissement';

  const allergies = [...new Set((entrees || []).filter((e) => e.type === 'allergie').map((e) => e.contenu))];
  const antecedents = (entrees || []).filter((e) => e.type === 'antecedent');
  const groupeSanguin = (entrees || []).filter((e) => e.type === 'groupe_sanguin').sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))[0]?.contenu || null;

  const jours = useMemo(() => {
    if (entrees === null || prescriptions === null) return null;
    const parJour = new Map();
    const cle = (date) => date.toISOString().slice(0, 10);
    const bucket = (date) => {
      const k = cle(date);
      if (!parJour.has(k)) parJour.set(k, { date, comptesRendus: [], constantes: [], prescriptions: [] });
      return parJour.get(k);
    };
    entrees.filter((e) => e.type === 'compte_rendu').forEach((e) => { const d = e.createdAt?.toDate?.(); if (d) bucket(d).comptesRendus.push(e); });
    entrees.filter((e) => e.type === 'constante').forEach((e) => { const d = e.createdAt?.toDate?.(); if (d) bucket(d).constantes.push(e); });
    prescriptions.forEach((p) => { const d = p.createdAt?.toDate?.(); if (d) bucket(d).prescriptions.push(p); });
    return [...parJour.values()]
      .filter((j) => !dateDebut || (j.date >= dateDebut && j.date <= dateFin))
      .sort((a, b) => b.date - a.date);
  }, [entrees, prescriptions, dateDebut, dateFin]);

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
      <div style={placeholderStyle}>
        <FolderHeart style={{ width: 32, height: 32, margin: '0 auto 12px', color: 'var(--ink-4)' }} />
        <p style={{ fontWeight: 600, color: 'var(--ink-2)' }}>Numéro CNI obligatoire</p>
        <p style={{ fontSize: 13, marginTop: 4 }}>
          Renseignez votre numéro de CNI ci-dessous — obligatoire pour accéder à votre dossier médical, une fois vérifié par un établissement.
        </p>
        <FormulaireCni uid={uid} />
      </div>
    );
  }

  if (identiteVerifiee === undefined) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
        <Loader2 style={{ width: 24, height: 24, color: '#94A3B8' }} className="animate-spin" />
      </div>
    );
  }

  if (!identiteVerifiee) {
    return (
      <div style={{ ...placeholderStyle, color: 'var(--ink-2)' }}>
        <ShieldCheck style={{ width: 32, height: 32, margin: '0 auto 12px', color: 'var(--ink-4)' }} />
        <p style={{ fontWeight: 600, color: 'var(--ink-2)' }}>Identité pas encore vérifiée</p>
        <p style={{ fontSize: 13, marginTop: 4, maxWidth: 340, marginLeft: 'auto', marginRight: 'auto' }}>
          Présentez votre CNI en personne à l'accueil d'un établissement partenaire pour activer votre dossier médical partagé — la vérification faite là-bas s'applique ensuite partout.
        </p>
      </div>
    );
  }

  if (entrees === null || jours === null) {
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

  const nomComplet = `${prenom || ''} ${nom || ''}`.trim();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* En-tête — identité et ce qui ne dépend pas d'une visite précise */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <Avatar nom={nomComplet} />
          <div style={{ minWidth: 0 }}>
            <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>{nomComplet || 'Mon dossier'}</p>
            <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 1 }}>Dossier partagé entre tous vos établissements</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))', gap: 8 }}>
          <InfoCard icon={BadgeCheck} label="N° CNI" value={cni} />
          <InfoCard icon={Droplet} label="Groupe sanguin" value={groupeSanguin} />
        </div>

        {!!allergies.length && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 12, padding: 14, borderRadius: 12, background: '#FEF2F2', border: '1.5px solid #FECACA', color: '#991B1B' }}>
            <AlertTriangle size={17} style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <p style={{ fontWeight: 700, fontSize: 12.5 }}>Allergies déclarées</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {allergies.map((a) => (
                  <span key={a} style={{ fontSize: 11.5, fontWeight: 600, padding: '4px 10px', borderRadius: 999, background: '#FEE2E2' }}>{a}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {!!antecedents.length && (
          <div style={{ marginTop: 12 }}>
            <p style={{ fontSize: 11.5, fontWeight: 700, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <History size={13} /> Antécédents
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {antecedents.map((a) => (
                <span key={a.id} style={{ fontSize: 11.5, padding: '4px 10px', borderRadius: 999, background: '#F1F5F9', color: 'var(--ink)' }}>{a.contenu}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Historique — une section par jour de visite, tous établissements confondus */}
      <div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 7 }}>
            <FolderHeart size={16} style={{ color: '#0D9488' }} /> Historique des visites
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 8 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {Object.keys(LABEL_PERIODE_HISTORIQUE).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriode(p)}
                  style={{
                    fontSize: 11.5, fontWeight: 600, padding: '5px 11px', borderRadius: 999, cursor: 'pointer',
                    border: periode === p ? 'none' : '1.5px solid #E2E8F0',
                    background: periode === p ? '#0D9488' : 'white', color: periode === p ? 'white' : '#64748B',
                  }}
                >
                  {LABEL_PERIODE_HISTORIQUE[p]}
                </button>
              ))}
            </div>
            {periode === 'personnalise' && (
              <div style={{ display: 'flex', gap: 6 }}>
                <input type="date" value={personnaliseDebut} onChange={(e) => setPersonnaliseDebut(e.target.value)} className="input-field" style={{ fontSize: 12, padding: '5px 8px' }} />
                <input type="date" value={personnaliseFin} onChange={(e) => setPersonnaliseFin(e.target.value)} className="input-field" style={{ fontSize: 12, padding: '5px 8px' }} />
              </div>
            )}
          </div>
        </div>

        {!jours.length ? (
          <EtatVide
            titre="Aucune visite"
            texte={periode === 'tout' ? 'Les comptes-rendus, prescriptions et antécédents ajoutés par vos médecins apparaîtront ici, regroupés par jour.' : 'Aucune visite pour la période choisie.'}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {jours.map((j) => (
              <div key={j.date.toISOString()} style={{ ...cardStyle, borderLeft: '4px solid #99F6E4', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 7, textTransform: 'capitalize' }}>
                  <CalendarDays size={15} style={{ color: '#0D9488' }} /> {libelleJour(j.date)}
                </p>

                {j.comptesRendus.map((e) => (
                  <div key={e.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                      <EnteteSection icon={Stethoscope} label="Compte-rendu" />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <EtablissementBadge nom={nomEtablissement(e.etablissementId, e.etablissementNom)} />
                        <span style={{ fontSize: 11, color: '#94A3B8' }}>
                          {formaterAuteur(e.auteurNom)} · {e.createdAt?.toDate?.().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <div style={{ borderRadius: 10, border: '1px solid #F1F5F9', overflow: 'hidden' }}>
                      {parseCompteRendu(e.contenu).map((section, i) => (
                        <div key={i} style={{ padding: 10, borderTop: i ? '1px solid #F1F5F9' : 'none' }}>
                          {section.label && (
                            <p style={{ fontSize: 10.5, fontWeight: 700, color: '#0D9488', textTransform: 'uppercase', letterSpacing: 0.3, display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                              {section.icon && <section.icon size={11} />} {section.label}
                            </p>
                          )}
                          <p style={{ fontSize: 13, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>{section.texte}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {!!j.constantes.length && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {j.constantes.map((c) => (
                      <span key={c.id} style={{ fontSize: 11.5, padding: '4px 10px', borderRadius: 999, background: '#F1F5F9', color: 'var(--ink)' }}>{c.contenu}</span>
                    ))}
                  </div>
                )}

                {!!j.prescriptions.length && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <EnteteSection icon={Pill} label="Prescriptions" />
                    <div style={{ borderRadius: 10, border: '1px solid #F1F5F9', overflow: 'hidden' }}>
                      {j.prescriptions.map((p, idx) => {
                        const style = STATUT_PRESCRIPTION[p.statut] || STATUT_PRESCRIPTION.active;
                        return (
                          <div key={p.id} style={{ padding: 10, borderTop: idx ? '1px solid #F1F5F9' : 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: style.bg, color: style.color }}>{style.label}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <EtablissementBadge nom={nomEtablissement(p.etablissementId, p.etablissementNom)} />
                                <span style={{ fontSize: 11, color: '#94A3B8' }}>{formaterAuteur(p.medecinNom)}</span>
                              </div>
                            </div>
                            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--ink)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                              {(p.medicaments || []).map((m, i) => (
                                <li key={i}>
                                  <span style={{ fontWeight: 600 }}>{m.nom}</span>
                                  {(m.dose || m.frequence || m.duree) && (
                                    <span style={{ color: '#64748B' }}>
                                      {' — '}
                                      {[m.dose && `dose ${m.dose}`, m.frequence && `fréquence ${m.frequence}`, m.duree && `durée ${m.duree}`].filter(Boolean).join(' · ')}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
