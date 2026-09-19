import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { ouvrirSignalementSecurite, getSignalementsSecuritePatient } from '../../services/signalementsSecuriteService';
import AbonnementGate from '../common/AbonnementGate';

const LABEL_TYPE_INCIDENT = { harcelement: 'Harcèlement', vol: 'Vol', agression: 'Agression', autre: 'Autre' };

export default function TabSecurite({ etablissementId, patientUid }) {
  const [typeIncident, setTypeIncident] = useState('harcelement');
  const [lieu, setLieu] = useState('');
  const [description, setDescription] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [signalements, setSignalements] = useState([]);

  const recharger = useCallback(() => {
    getSignalementsSecuritePatient(patientUid)
      .then((all) => setSignalements(all.filter((s) => s.etablissementId === etablissementId)))
      .catch((e) => console.error('getSignalementsSecuritePatient a échoué :', e));
  }, [patientUid, etablissementId]);

  useEffect(() => {
    recharger();
  }, [recharger]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error('Merci de décrire la situation');
      return;
    }
    setEnvoi(true);
    try {
      await ouvrirSignalementSecurite({ patientUid, etablissementId, typeIncident, description, lieu });
      toast.success('Signalement envoyé — un membre de la direction va en prendre connaissance');
      setDescription('');
      setLieu('');
      recharger();
    } catch (err) {
      console.error('ouvrirSignalementSecurite a échoué :', err);
      toast.error("Échec de l'envoi du signalement");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 16, lineHeight: 1.5 }}>
        Pour signaler un problème de sécurité personnelle (harcèlement, vol, agression…), distinct d'une réclamation sur la qualité de service. Traité uniquement par la direction de l'établissement.
      </p>
      <AbonnementGate>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Type d'incident *</label>
            <select value={typeIncident} onChange={(e) => setTypeIncident(e.target.value)} className="input-field">
              {Object.entries(LABEL_TYPE_INCIDENT).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Lieu (optionnel)</label>
            <input value={lieu} onChange={(e) => setLieu(e.target.value)} placeholder="Ex: parking, salle d'attente…" className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Description *</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-field" rows={4} />
          </div>
          <button type="submit" disabled={envoi} className="btn-primary">
            {envoi ? 'Envoi…' : 'Envoyer le signalement'}
          </button>
        </form>
      </AbonnementGate>

      {signalements.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 10 }}>Vos signalements</p>
          <div className="space-y-2">
            {signalements.map((s) => (
              <div key={s.id} style={{ padding: '10px 14px', background: 'var(--bg-2)', borderRadius: 10, fontSize: 13 }}>
                <strong>{LABEL_TYPE_INCIDENT[s.typeIncident] || s.typeIncident}</strong>
                <span style={{ color: 'var(--ink-3)', marginLeft: 8 }}>
                  {s.statut === 'ouvert' ? 'En cours de traitement' : s.statut}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
