import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { listerEtablissementsActifs } from '../services/etablissementsPublicService';
import { TYPES_DEMANDE_DROIT, creerDemandeDroit, getMesDemandesDroits } from '../services/droitsPatientService';

const LABEL_TYPE = Object.fromEntries(TYPES_DEMANDE_DROIT.map((t) => [t.value, t.label]));

export default function MesDroitsPage() {
  const { user, userProfile } = useAuth();
  const [etablissements, setEtablissements] = useState([]);
  const [demandes, setDemandes] = useState([]);
  const [form, setForm] = useState({ etablissementId: '', type: 'acces', description: '' });
  const [envoi, setEnvoi] = useState(false);

  const recharger = useCallback(() => {
    if (!user) return;
    getMesDemandesDroits(user.uid).then(setDemandes).catch(() => setDemandes([]));
  }, [user]);

  useEffect(() => {
    listerEtablissementsActifs().then(setEtablissements).catch(() => setEtablissements([]));
  }, []);

  useEffect(() => { recharger(); }, [recharger]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.etablissementId || !form.description.trim()) {
      toast.error("Établissement et description requis");
      return;
    }
    setEnvoi(true);
    try {
      const patientNom = userProfile?.displayName || `${userProfile?.prenom || ''} ${userProfile?.nom || ''}`.trim();
      await creerDemandeDroit({ patientUid: user.uid, patientNom, ...form });
      toast.success('Demande envoyée');
      setForm({ etablissementId: '', type: 'acces', description: '' });
      recharger();
    } catch (err) {
      console.error('creerDemandeDroit a échoué :', err);
      toast.error("Échec de l'envoi de la demande");
    } finally {
      setEnvoi(false);
    }
  };

  if (!user) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
        <ShieldCheck style={{ width: 32, height: 32, margin: '0 auto 12px', color: 'var(--ink-4)' }} />
        <p style={{ fontSize: 14, color: 'var(--ink-3)' }}>Connectez-vous pour gérer vos droits sur vos données.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 24px 64px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        <ShieldCheck style={{ width: 22, height: 22 }} /> Mes droits & consentement
      </h1>
      <p style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 24, lineHeight: 1.6 }}>
        Conformément à la loi n°2024/017 relative à la protection des données à caractère personnel,
        vous pouvez à tout moment demander l'accès, la rectification ou la suppression de vos données
        auprès d'un établissement, ou vous opposer à leur traitement.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Établissement concerné *</label>
          <select value={form.etablissementId} onChange={(e) => setForm({ ...form, etablissementId: e.target.value })} className="input-field">
            <option value="">Sélectionner un établissement</option>
            {etablissements.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Type de demande *</label>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input-field">
            {TYPES_DEMANDE_DROIT.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Description *</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" rows={4} placeholder="Précisez votre demande…" />
        </div>
        <button type="submit" disabled={envoi} className="btn-primary">
          {envoi ? 'Envoi…' : 'Envoyer la demande'}
        </button>
      </form>

      {demandes.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 10 }}>Vos demandes</p>
          <div className="space-y-2">
            {demandes.map((d) => (
              <div key={d.id} style={{ padding: '10px 14px', background: 'var(--bg-2)', borderRadius: 10, fontSize: 13 }}>
                <strong>{LABEL_TYPE[d.type] || d.type}</strong>
                <span style={{ color: 'var(--ink-3)', marginLeft: 8 }}>
                  {d.statut === 'en_attente' ? 'En attente de traitement' : 'Traitée'}
                </span>
                <p style={{ color: 'var(--ink-3)', marginTop: 4 }}>{d.description}</p>
                {d.reponse && (
                  <p style={{ color: 'var(--ink-2)', marginTop: 6, fontWeight: 600 }}>Réponse : {d.reponse}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
