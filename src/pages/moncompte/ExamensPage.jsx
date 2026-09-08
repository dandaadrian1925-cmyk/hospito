import { useState, useEffect } from 'react';
import { FlaskConical, Loader2, Pill, ShoppingCart, Wallet, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { getMesExamens, getMesLignesPrescription } from '../../services/examensPatientService';
import { creerFacturePanier, initierPaiementFacture, attendreConfirmationFacture, payerFactureAvecSolde } from '../../services/facturesService';
import { getEtablissement } from '../../services/etablissementsPublicService';
import { listenWallet } from '../../services/walletService';
import { getResultatExamenUrl } from '../../supabase/config';

// #nouveau (demande utilisateur, "upload des résultats d'examens") : résout
// l'URL signée SEULEMENT au clic (jamais au chargement de la liste — le
// bucket est privé, chaque URL signée expire après 5 min, pas la peine d'en
// générer une pour un résultat que le patient ne consultera peut-être jamais).
function BoutonVoirResultat({ path }) {
  const [ouverture, setOuverture] = useState(false);
  const ouvrir = async () => {
    setOuverture(true);
    try {
      const urls = await getResultatExamenUrl([path]);
      const url = urls[path];
      if (url) window.open(url, '_blank', 'noopener');
      else toast.error('Fichier introuvable');
    } catch (err) {
      toast.error(err.message || "Erreur lors de l'ouverture du fichier");
    } finally {
      setOuverture(false);
    }
  };
  return (
    <button
      type="button"
      onClick={ouvrir}
      disabled={ouverture}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12.5, fontWeight: 700, color: '#2451C4', background: '#EFF6FF', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}
    >
      <FileText style={{ width: 14, height: 14 }} /> {ouverture ? 'Ouverture…' : 'Voir le résultat (fichier)'}
    </button>
  );
}

const TYPES_EXAMEN = {
  laboratoire: 'Laboratoire', imagerie: 'Imagerie médicale',
  exploration_fonctionnelle: 'Exploration fonctionnelle', anatomie_pathologique: 'Anatomie pathologique',
};
const STATUT_EXAMEN_STYLES = {
  en_cours: { bg: '#EFF6FF', color: '#2451C4', label: 'Payé — en cours' },
  resultat_disponible: { bg: '#F0FDF4', color: '#059669', label: 'Résultat disponible' },
  annule: { bg: '#F1F5F9', color: '#64748B', label: 'Annulé' },
};
const STATUT_LIGNE_STYLES = {
  paye: { bg: '#EFF6FF', color: '#2451C4', label: 'Payé — à retirer' },
  delivre: { bg: '#F0FDF4', color: '#059669', label: 'Remis' },
  annule: { bg: '#F1F5F9', color: '#64748B', label: 'Annulé' },
};

// #nouveau (demande utilisateur, "panier self-service pharmacie") : le
// patient choisit lui-même, parmi ses médicaments et examens prescrits,
// lesquels acheter/faire MAINTENANT, et paie une seule fois pour tout le
// panier — voir facturesService.js::creerFacturePanier (entièrement calculé
// et créé côté serveur, jamais un montant fourni par ce composant) et
// hospito-facture-paiement::creer_facture_panier.
function GroupeEtablissement({ etablissementId, etabNom, examens, lignes, solde, onChange }) {
  const [selection, setSelection] = useState(new Set());
  const [phone, setPhone] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [enCoursSolde, setEnCoursSolde] = useState(false);

  const achetables = [
    ...examens
      .filter((e) => e.statut === 'demande' && Number.isFinite(Number(e.montant)) && Number(e.montant) > 0)
      .map((e) => ({ key: `exam:${e.id}`, id: e.id, type: 'exam', label: e.nature, montant: Number(e.montant) })),
    ...lignes
      .filter((l) => l.statut === 'prescrit' && Number.isFinite(Number(l.montant)) && Number(l.montant) > 0)
      .map((l) => ({ key: `ligne:${l.id}`, id: l.id, type: 'ligne', label: `${l.nom}${l.dose ? ` — ${l.dose}` : ''}`, montant: Number(l.montant) })),
  ];
  const autresExamens = examens.filter((e) => e.statut !== 'demande');
  const autresLignes = lignes.filter((l) => l.statut !== 'prescrit');
  const total = achetables.filter((a) => selection.has(a.key)).reduce((s, a) => s + a.montant, 0);

  const toggle = (key) => setSelection((s) => {
    const n = new Set(s);
    if (n.has(key)) n.delete(key); else n.add(key);
    return n;
  });

  const creerFactureSelection = () => {
    const prescriptionItemIds = achetables.filter((a) => a.type === 'ligne' && selection.has(a.key)).map((a) => a.id);
    const examenIds = achetables.filter((a) => a.type === 'exam' && selection.has(a.key)).map((a) => a.id);
    return creerFacturePanier(etablissementId, { prescriptionItemIds, examenIds });
  };

  const payer = async (e) => {
    e.preventDefault();
    if (!selection.size) { toast.error('Sélectionnez au moins un article'); return; }
    if (!phone.trim()) { toast.error('Numéro Mobile Money requis'); return; }
    setEnCours(true);
    try {
      const { factureId } = await creerFactureSelection();
      await initierPaiementFacture(factureId, phone.trim());
      toast('Vérifiez votre téléphone pour confirmer le paiement…', { icon: '📲', duration: 6000 });
      const { statut, message } = await attendreConfirmationFacture(factureId);
      if (statut === 'payee') {
        toast.success('Panier payé !');
        setSelection(new Set());
        onChange();
      } else if (statut === 'ecart_montant') {
        toast.error(message || 'Écart de montant détecté');
      } else {
        toast.error('Le paiement a échoué ou est resté en attente.');
      }
    } catch (err) {
      toast.error(err.message || "Échec de l'opération");
    } finally {
      setEnCours(false);
    }
  };

  // #nouveau (demande utilisateur, "c'est avec le solde du compte qu'on peut
  // payer les factures et autres") : même panier, second moyen de paiement —
  // pas de numéro de téléphone, débit + bascule des articles atomiques côté
  // serveur (payer_facture_solde).
  const payerAvecSolde = async () => {
    if (!selection.size) { toast.error('Sélectionnez au moins un article'); return; }
    if (total > solde) { toast.error('Solde insuffisant'); return; }
    setEnCoursSolde(true);
    try {
      const { factureId } = await creerFactureSelection();
      const { statut, message } = await payerFactureAvecSolde(factureId);
      if (statut === 'payee') {
        toast.success('Panier payé avec votre solde !');
        setSelection(new Set());
        onChange();
      } else {
        toast.error(message || 'Le paiement a échoué — réessayez');
      }
    } catch (err) {
      toast.error(err.message || "Échec de l'opération");
    } finally {
      setEnCoursSolde(false);
    }
  };

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    <p style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.4 }}>{etabNom || 'Établissement'}</p>

    {!!achetables.length && (
      <div style={{ background: 'white', borderRadius: 16, border: '1.5px solid #F1F5F9', padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <ShoppingCart style={{ width: 16, height: 16, color: 'var(--ink)' }} />
          <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>Mon panier</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {achetables.map((a) => (
            <label key={a.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: selection.has(a.key) ? '#F8FAFC' : 'transparent', cursor: 'pointer' }}>
              <input type="checkbox" checked={selection.has(a.key)} onChange={() => toggle(a.key)} style={{ width: 16, height: 16, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, color: 'var(--ink)' }}>{a.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{a.montant.toLocaleString('fr-FR')} XAF</span>
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
          <span style={{ fontSize: 13, color: '#64748B' }}>Total</span>
          <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--ink)' }}>{total.toLocaleString('fr-FR')} XAF</span>
        </div>
        <form onSubmit={payer} style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <input value={phone} onChange={(ev) => setPhone(ev.target.value)} placeholder="Numéro Mobile Money" className="input-field" style={{ flex: 1, fontSize: 13 }} />
          <button type="submit" disabled={enCours || enCoursSolde || !selection.size} className="btn-primary" style={{ fontSize: 12, padding: '0 16px' }}>
            {enCours ? 'Traitement…' : 'Payer'}
          </button>
        </form>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0' }}>
          <div style={{ flex: 1, height: 1, background: '#F1F5F9' }} />
          <span style={{ fontSize: 11, color: '#94A3B8' }}>ou</span>
          <div style={{ flex: 1, height: 1, background: '#F1F5F9' }} />
        </div>
        <button
          type="button"
          onClick={payerAvecSolde}
          disabled={enCours || enCoursSolde || !selection.size || total > solde}
          className="btn-outline"
          style={{ width: '100%', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <Wallet style={{ width: 14, height: 14 }} />
          {enCoursSolde ? 'Traitement…' : `Payer avec mon solde (${solde.toLocaleString('fr-FR')} XAF)`}
        </button>
      </div>
    )}

    {autresExamens.map((examen) => {
      const style = STATUT_EXAMEN_STYLES[examen.statut] || { bg: '#F1F5F9', color: '#64748B', label: examen.statut };
      return <div key={examen.id} style={{ background: 'white', borderRadius: 16, border: '1.5px solid #F1F5F9', padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{examen.nature}</p>
            <p style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>{TYPES_EXAMEN[examen.type] || examen.type}</p>
          </div>
          <span style={{ flexShrink: 0, background: style.bg, color: style.color, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999 }}>{style.label}</span>
        </div>
        {examen.statut === 'resultat_disponible' && examen.resultat && (
          <p style={{ fontSize: 13, color: 'var(--ink)', marginTop: 8, padding: 10, background: '#F8FAFC', borderRadius: 10 }}>{examen.resultat}</p>
        )}
        {examen.statut === 'resultat_disponible' && examen.resultatFichierPath && (
          <BoutonVoirResultat path={examen.resultatFichierPath} />
        )}
      </div>;
    })}

    {autresLignes.map((ligne) => {
      const style = STATUT_LIGNE_STYLES[ligne.statut] || { bg: '#F1F5F9', color: '#64748B', label: ligne.statut };
      return <div key={ligne.id} style={{ background: 'white', borderRadius: 16, border: '1.5px solid #F1F5F9', padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{ligne.nom}</p>
            <p style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>
              {[ligne.dose, ligne.frequence, ligne.duree].filter(Boolean).join(' · ') || 'Médicament'}
            </p>
          </div>
          <span style={{ flexShrink: 0, background: style.bg, color: style.color, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999 }}>{style.label}</span>
        </div>
      </div>;
    })}
  </div>;
}

export default function ExamensPage() {
  const { user } = useAuth();
  const [examens, setExamens] = useState(null);
  const [lignes, setLignes] = useState(null);
  const [etablissements, setEtablissements] = useState({});
  const [solde, setSolde] = useState(0);

  useEffect(() => {
    if (!user) return;
    return listenWallet(user.uid, (w) => setSolde(w.solde || 0));
  }, [user]);

  const recharger = () => {
    Promise.all([getMesExamens(user.uid), getMesLignesPrescription(user.uid)])
      .then(async ([ex, lp]) => {
        setExamens(ex);
        setLignes(lp);
        const ids = [...new Set([...ex.map((e) => e.etablissementId), ...lp.map((l) => l.etablissementId)])];
        const entries = await Promise.all(ids.map(async (id) => [id, await getEtablissement(id)]));
        setEtablissements(Object.fromEntries(entries));
      })
      .catch(() => { setExamens([]); setLignes([]); });
  };

  useEffect(() => {
    if (user) recharger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (examens === null || lignes === null) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
      <Loader2 style={{ width: 24, height: 24, color: '#94A3B8' }} className="animate-spin" />
    </div>;
  }

  if (!examens.length && !lignes.length) {
    return <div style={{ textAlign: 'center', padding: '48px 20px', background: 'white', borderRadius: 16, border: '1.5px solid #F1F5F9' }}>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
        <FlaskConical style={{ width: 28, height: 28, color: '#CBD5E1' }} />
        <Pill style={{ width: 28, height: 28, color: '#CBD5E1' }} />
      </div>
      <p style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>Aucun examen ni médicament</p>
      <p style={{ fontSize: 13, color: '#94A3B8' }}>Les examens et médicaments prescrits par un médecin apparaîtront ici.</p>
    </div>;
  }

  const etablissementIds = [...new Set([...examens.map((e) => e.etablissementId), ...lignes.map((l) => l.etablissementId)])];

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
    {etablissementIds.map((etabId) => (
      <GroupeEtablissement
        key={etabId}
        etablissementId={etabId}
        etabNom={etablissements[etabId]?.nom}
        examens={examens.filter((e) => e.etablissementId === etabId)}
        lignes={lignes.filter((l) => l.etablissementId === etabId)}
        solde={solde}
        onChange={recharger}
      />
    ))}
  </div>;
}
