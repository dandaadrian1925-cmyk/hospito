import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Star } from 'lucide-react';
import { deposerAvis, getMonAvis } from '../../services/avisEtablissementsService';
import AbonnementGate from '../common/AbonnementGate';

// Formulaire "poster / modifier mon avis" uniquement — la liste des avis de
// TOUS les patients est affichée séparément par AvisPublicSection (visible
// même sans connexion), sur la même page /avis : pas de duplication.
export default function TabAvis({ etablissementId, patientUid, patientNom, onAvisChange }) {
  const [note, setNote] = useState(0);
  const [commentaire, setCommentaire] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [monAvisId, setMonAvisId] = useState(null);

  const recharger = useCallback(() => {
    getMonAvis(patientUid, etablissementId)
      .then((mien) => {
        if (mien) {
          setMonAvisId(mien.id);
          setNote(mien.note);
          setCommentaire(mien.commentaire || '');
        }
      })
      .catch((e) => console.error('getMonAvis a échoué :', e));
  }, [etablissementId, patientUid]);

  useEffect(() => { recharger(); }, [recharger]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!note) { toast.error('Merci de choisir une note'); return; }
    setEnvoi(true);
    try {
      await deposerAvis({ patientUid, patientNom, etablissementId, note, commentaire });
      toast.success(monAvisId ? 'Avis mis à jour' : 'Avis envoyé');
      recharger();
      onAvisChange?.();
    } catch (err) {
      console.error('deposerAvis a échoué :', err);
      toast.error("Échec de l'envoi de l'avis");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <AbonnementGate>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Votre note</label>
          <div style={{ display: 'flex', gap: 4 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setNote(n)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                <Star size={26} fill={n <= note ? '#F59E0B' : 'none'} color={n <= note ? '#F59E0B' : '#CBD5E1'} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Commentaire (optionnel)</label>
          <textarea value={commentaire} onChange={(e) => setCommentaire(e.target.value)} className="input-field" rows={3} />
        </div>
        <button type="submit" disabled={envoi} className="btn-primary">
          {envoi ? 'Envoi…' : monAvisId ? 'Mettre à jour mon avis' : 'Envoyer mon avis'}
        </button>
      </form>
    </AbonnementGate>
  );
}
