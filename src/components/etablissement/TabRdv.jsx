import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { listerServicesActifs } from '../../services/etablissementsPublicService';
import { creerDemandeRdv, getMesDemandesRdv } from '../../services/demandesRendezVousService';
import { listerSpecialistesDuService } from '../../services/planningService';
import TeleconsultationCallWidget from '../teleconsultation/TeleconsultationCallWidget';

export default function TabRdv({ etablissementId, patientUid, patientNom, initialServiceId }) {
  const [services, setServices] = useState([]);
  const [serviceId, setServiceId] = useState(initialServiceId || '');
  const [motif, setMotif] = useState('');
  const [dateSouhaitee, setDateSouhaitee] = useState('');
  const [teleconsultation, setTeleconsultation] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [demandes, setDemandes] = useState([]);
  const [specialistes, setSpecialistes] = useState([]);
  const [medecinPrefere, setMedecinPrefere] = useState(null);

  useEffect(() => {
    listerServicesActifs(etablissementId).then(setServices).catch(() => setServices([]));
  }, [etablissementId]);

  useEffect(() => {
    if (initialServiceId) setServiceId(initialServiceId);
  }, [initialServiceId]);

  // Spécialistes de garde pour le service choisi, avec leurs prochaines
  // dates disponibles (planning déjà géré côté accueil de cette spécialité)
  // — le patient choisit une préférence, l'accueil confirme ensuite.
  useEffect(() => {
    setMedecinPrefere(null);
    if (!serviceId) { setSpecialistes([]); return; }
    listerSpecialistesDuService(etablissementId, serviceId).then(setSpecialistes).catch(() => setSpecialistes([]));
  }, [etablissementId, serviceId]);

  const choisirCreneau = (medecin, date) => {
    setMedecinPrefere({ uid: medecin.uid, nom: medecin.nom, date });
    setDateSouhaitee(date);
  };

  const recharger = useCallback(() => {
    getMesDemandesRdv(patientUid)
      .then((all) => setDemandes(all.filter((d) => d.etablissementId === etablissementId)))
      .catch((e) => console.error('getMesDemandesRdv a échoué :', e));
  }, [patientUid, etablissementId]);

  useEffect(() => {
    recharger();
  }, [recharger]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!motif.trim()) {
      toast.error('Merci de préciser le motif');
      return;
    }
    setEnvoi(true);
    try {
      const service = services.find((s) => s.id === serviceId);
      await creerDemandeRdv({
        etablissementId, patientUid, patientNom, serviceId: serviceId || null, serviceNom: service?.nom || null,
        motif, dateSouhaitee, type: teleconsultation ? 'teleconsultation' : 'presentiel',
        medecinPrefereId: medecinPrefere?.uid || null, medecinPrefereNom: medecinPrefere?.nom || null,
      });
      toast.success('Demande envoyée — vous serez notifié dès sa confirmation');
      setServiceId('');
      setMotif('');
      setDateSouhaitee('');
      setTeleconsultation(false);
      setMedecinPrefere(null);
      recharger();
    } catch (err) {
      console.error('creerDemandeRdv a échoué :', err);
      toast.error("Échec de l'envoi de la demande");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {services.length > 0 && (
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Service concerné</label>
            <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="input-field">
              <option value="">Non précisé</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
            </select>
          </div>
        )}
        {serviceId && specialistes.length > 0 && (
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Spécialistes disponibles</label>
            <div className="space-y-2">
              {specialistes.map((m) => (
                <div key={m.uid} style={{ padding: '10px 12px', background: 'var(--bg-2)', borderRadius: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    {m.photoURL ? (
                      <img src={m.photoURL} alt={m.nom} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', flexShrink: 0 }}>
                        {(m.nom || '?').trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('')}
                      </div>
                    )}
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Dr {m.nom}</p>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(m.horaires || []).map((h) => {
                      const selected = medecinPrefere?.uid === m.uid && medecinPrefere?.date === h.date;
                      return (
                        <button
                          type="button"
                          key={h.date}
                          onClick={() => choisirCreneau(m, h.date)}
                          style={{
                            padding: '5px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            border: selected ? '1.5px solid var(--blue)' : '1.5px solid var(--border)',
                            background: selected ? 'var(--blue)' : 'white',
                            color: selected ? 'white' : 'var(--ink-2)',
                          }}
                        >
                          {new Date(h.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} · {h.heureDebut}–{h.heureFin}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {medecinPrefere && (
              <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>
                Préférence : Dr {medecinPrefere.nom}, {new Date(medecinPrefere.date).toLocaleDateString('fr-FR', { dateStyle: 'medium' })} — confirmée par l'accueil.
              </p>
            )}
          </div>
        )}
        {serviceId && specialistes.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--ink-3)' }}>Aucun planning renseigné pour ce service pour le moment.</p>
        )}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Motif de la visite *</label>
          <input value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ex: consultation générale" className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Date souhaitée</label>
          <input type="date" value={dateSouhaitee} onChange={(e) => { setDateSouhaitee(e.target.value); if (medecinPrefere && e.target.value !== medecinPrefere.date) setMedecinPrefere(null); }} className="input-field" />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer' }}>
          <input type="checkbox" checked={teleconsultation} onChange={(e) => setTeleconsultation(e.target.checked)} />
          Téléconsultation (visio) plutôt qu'un rendez-vous sur place
        </label>
        <button type="submit" disabled={envoi} className="btn-primary">
          {envoi ? 'Envoi…' : 'Envoyer la demande'}
        </button>
      </form>

      {demandes.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 10 }}>Vos demandes</p>
          <div className="space-y-2">
            {demandes.map((d) => (
              <div key={d.id} style={{ padding: '10px 14px', background: 'var(--bg-2)', borderRadius: 10, fontSize: 13 }}>
                <strong>{d.motif}</strong>
                {d.serviceNom && <span style={{ color: 'var(--ink-3)', marginLeft: 8 }}>({d.serviceNom})</span>}
                {d.type === 'teleconsultation' && <span style={{ color: 'var(--blue)', marginLeft: 8, fontWeight: 700 }}>Téléconsultation</span>}
                <span style={{ color: 'var(--ink-3)', marginLeft: 8 }}>
                  {d.statut === 'en_attente' ? 'En attente de confirmation' : d.statut === 'confirme' ? 'Confirmé' : d.statut}
                </span>
                {d.type === 'teleconsultation' && d.statut === 'confirme' && (
                  <div style={{ marginTop: 10 }}>
                    <TeleconsultationCallWidget demandeId={d.id} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
