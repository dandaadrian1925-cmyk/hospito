import { useState, useEffect } from 'react';
import { AlertTriangle, Droplet, Pill, HeartPulse, Edit2, Save, WifiOff, Video, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getFicheUrgence, mettreAJourFicheUrgence } from '../services/urgenceService';

const CHAMP_VIDE = { groupeSanguin: '', allergiesConnues: '', maladiesChroniques: '' };

export default function UrgencePage() {
  const { user, userProfile } = useAuth();
  const [fiche, setFiche] = useState(undefined);
  const [edition, setEdition] = useState(false);
  const [form, setForm] = useState(CHAMP_VIDE);
  const [saving, setSaving] = useState(false);
  const [horsLigne, setHorsLigne] = useState(!navigator.onLine);

  useEffect(() => {
    const onOnline = () => setHorsLigne(false);
    const onOffline = () => setHorsLigne(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    getFicheUrgence(user.uid).then((f) => {
      setFiche(f);
      setForm(f || CHAMP_VIDE);
    }).catch(() => setFiche(null));
  }, [user]);

  const enregistrer = async () => {
    setSaving(true);
    try {
      await mettreAJourFicheUrgence(user.uid, form);
      setFiche(form);
      setEdition(false);
      toast.success('Fiche d\'urgence mise à jour');
    } catch (e) {
      toast.error(horsLigne ? 'Hors connexion — la mise à jour sera tentée à la reconnexion.' : (e.message || 'Erreur'));
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
        <AlertTriangle style={{ width: 32, height: 32, margin: '0 auto 12px', color: 'var(--ink-4)' }} />
        <p style={{ fontSize: 14, color: 'var(--ink-3)' }}>Connectez-vous pour accéder à votre fiche d'urgence.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 20px 60px' }}>
      {horsLigne && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FEF3C7', border: '1.5px solid #FDE68A', borderRadius: 10, padding: '8px 12px', marginBottom: 16, fontSize: 12, color: '#92400E' }}>
          <WifiOff style={{ width: 14, height: 14, flexShrink: 0 }} /> Hors connexion — dernière fiche enregistrée sur cet appareil.
        </div>
      )}

      <Link
        to="/urgence/teleconsultation"
        style={{
          display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none',
          background: '#0F172A', borderRadius: 16, padding: '14px 16px', marginBottom: 20,
        }}
      >
        <div style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.12)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Video style={{ width: 19, height: 19, color: 'white' }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13.5, fontWeight: 800, color: 'white' }}>Consulter un médecin de garde maintenant</p>
          <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.7)' }}>Téléconsultation d'urgence, paiement à la séance</p>
        </div>
        <ChevronRight style={{ width: 18, height: 18, color: 'rgba(255,255,255,0.6)', flexShrink: 0 }} />
      </Link>

      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ width: 56, height: 56, background: '#FEF2F2', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
          <AlertTriangle style={{ width: 26, height: 26, color: '#DC2626' }} />
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)' }}>Fiche d'urgence</h1>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>{userProfile?.displayName || `${userProfile?.prenom || ''} ${userProfile?.nom || ''}`.trim()}</p>
      </div>

      {fiche === undefined ? (
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-3)' }}>Chargement…</p>
      ) : edition ? (
        <div className="space-y-3">
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)', display: 'block', marginBottom: 4 }}>Groupe sanguin</label>
            <input className="input-field" value={form.groupeSanguin} onChange={(e) => setForm({ ...form, groupeSanguin: e.target.value })} placeholder="Ex : O+" />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)', display: 'block', marginBottom: 4 }}>Allergies connues</label>
            <textarea className="input-field" rows={3} value={form.allergiesConnues} onChange={(e) => setForm({ ...form, allergiesConnues: e.target.value })} placeholder="Ex : pénicilline, arachides…" />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)', display: 'block', marginBottom: 4 }}>Maladies chroniques / traitements</label>
            <textarea className="input-field" rows={3} value={form.maladiesChroniques} onChange={(e) => setForm({ ...form, maladiesChroniques: e.target.value })} placeholder="Ex : diabète, asthme, anticoagulants…" />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setForm(fiche || CHAMP_VIDE); setEdition(false); }} className="btn-outline" style={{ flex: 1, justifyContent: 'center' }}>Annuler</button>
            <button onClick={enregistrer} disabled={saving} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
              <Save style={{ width: 14, height: 14 }} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div style={{ background: 'white', border: '1.5px solid #F1F5F9', borderRadius: 14, padding: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <Droplet style={{ width: 18, height: 18, color: '#DC2626', flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Groupe sanguin</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginTop: 2 }}>{fiche?.groupeSanguin || 'Non renseigné'}</p>
            </div>
          </div>
          <div style={{ background: 'white', border: '1.5px solid #F1F5F9', borderRadius: 14, padding: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <AlertTriangle style={{ width: 18, height: 18, color: '#D97706', flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Allergies connues</p>
              <p style={{ fontSize: 14, color: 'var(--ink)', marginTop: 2, whiteSpace: 'pre-wrap' }}>{fiche?.allergiesConnues || 'Aucune renseignée'}</p>
            </div>
          </div>
          <div style={{ background: 'white', border: '1.5px solid #F1F5F9', borderRadius: 14, padding: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <Pill style={{ width: 18, height: 18, color: 'var(--blue)', flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Maladies chroniques / traitements</p>
              <p style={{ fontSize: 14, color: 'var(--ink)', marginTop: 2, whiteSpace: 'pre-wrap' }}>{fiche?.maladiesChroniques || 'Aucune renseignée'}</p>
            </div>
          </div>

          <button onClick={() => setEdition(true)} className="btn-outline" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
            <Edit2 style={{ width: 14, height: 14 }} /> Modifier ma fiche
          </button>

          <p style={{ fontSize: 11, color: 'var(--ink-4)', textAlign: 'center', marginTop: 12, lineHeight: 1.5 }}>
            <HeartPulse style={{ width: 12, height: 12, display: 'inline', marginRight: 4, verticalAlign: -2 }} />
            Informations auto-déclarées par le patient — à confirmer avec le personnel soignant. Cette page reste consultable hors connexion une fois ouverte au moins une fois avec internet.
          </p>
        </div>
      )}
    </div>
  );
}
