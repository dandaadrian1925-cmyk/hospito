import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { ouvrirReclamation, getReclamationsPatient } from '../../services/reclamationsService';

export default function TabReclamations({ etablissementId, patientUid }) {
  const [sujet, setSujet] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState([]);
  const [envoi, setEnvoi] = useState(false);
  const [reclamations, setReclamations] = useState([]);

  const recharger = useCallback(() => {
    getReclamationsPatient(patientUid)
      .then((all) => setReclamations(all.filter((r) => r.etablissementId === etablissementId)))
      .catch((e) => console.error('getReclamationsPatient a échoué :', e));
  }, [patientUid, etablissementId]);

  useEffect(() => {
    recharger();
  }, [recharger]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!sujet.trim() || !description.trim()) {
      toast.error('Merci de remplir le sujet et la description');
      return;
    }
    setEnvoi(true);
    try {
      await ouvrirReclamation({ patientUid, etablissementId, sujet, description, preuvePhotos: photos });
      toast.success('Réclamation envoyée');
      setSujet('');
      setDescription('');
      setPhotos([]);
      recharger();
    } catch (err) {
      console.error('ouvrirReclamation a échoué :', err);
      toast.error("Échec de l'envoi de la réclamation");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Sujet *</label>
          <input value={sujet} onChange={(e) => setSujet(e.target.value)} placeholder="Ex: temps d'attente excessif" className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Description *</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-field" rows={4} />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Photos (optionnel)</label>
          <input type="file" accept="image/*,video/mp4,video/quicktime,video/webm" multiple onChange={(e) => setPhotos(Array.from(e.target.files || []))} />
        </div>
        <button type="submit" disabled={envoi} className="btn-primary">
          {envoi ? 'Envoi…' : 'Envoyer la réclamation'}
        </button>
      </form>

      {reclamations.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 10 }}>Vos réclamations</p>
          <div className="space-y-2">
            {reclamations.map((r) => (
              <div key={r.id} style={{ padding: '10px 14px', background: 'var(--bg-2)', borderRadius: 10, fontSize: 13 }}>
                <strong>{r.sujet}</strong>
                <span style={{ color: 'var(--ink-3)', marginLeft: 8 }}>
                  {r.statut === 'ouvert' ? 'En cours de traitement' : r.statut}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
