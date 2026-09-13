import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { CalendarClock } from 'lucide-react';
import { listerServicesActifs } from '../../services/etablissementsPublicService';
import { creerDemandeRdv, existeDejaDemandeMemeJourMedecin } from '../../services/demandesRendezVousService';
import { listerSpecialistesAvecCreneaux } from '../../services/planningService';
import { trouverBilletValideDuPatient, trouverBilletValidePourFiche } from '../../services/billetsService';
import { listerMesProchesDansEtablissement } from '../../services/prochesService';

export default function TabRdv({ etablissementId, patientUid, patientNom, initialServiceId, initialMedecin }) {
  const [services, setServices] = useState([]);
  const [serviceId, setServiceId] = useState(initialServiceId || '');
  const [motif, setMotif] = useState('');
  const [dateSouhaitee, setDateSouhaitee] = useState('');
  const [teleconsultation, setTeleconsultation] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [specialistes, setSpecialistes] = useState([]);
  const [medecinPrefere, setMedecinPrefere] = useState(null);
  // #nouveau (demande utilisateur, "un bébé ou une personne âgée sans
  // compte doit aussi pouvoir être pris en compte") : proches (bébé, parent
  // âgé...) que ce compte gère POUR CET établissement — le sélecteur "Pour
  // qui ?" n'apparaît que s'il y en a au moins un.
  const [proches, setProches] = useState([]);
  const [procheChoisiId, setProcheChoisiId] = useState('');

  useEffect(() => {
    listerMesProchesDansEtablissement(patientUid, etablissementId).then(setProches).catch(() => setProches([]));
  }, [patientUid, etablissementId]);

  const procheChoisi = proches.find((p) => p.id === procheChoisiId) || null;
  // #nouveau (demande utilisateur, "un popup doit dire si on a déjà un
  // billet de consultation encore valide avant d'envoyer une demande de
  // RDV, mais ça envoie quand même la demande") : informatif seulement — ne
  // bloque jamais l'envoi, le patient reste libre de reprendre RDV même
  // avec un billet en cours (ex. suivi différent).
  // #corrigé (retour utilisateur, "lorsque ce n'est pas le cas ça affiche
  // quoi ?") : `undefined` = vérification en cours (rien affiché, pour
  // éviter un flash) ; `null` = vérifiée, AUCUN billet valide trouvé
  // (avertissement qu'il faudra en payer un à l'accueil) ; objet = billet
  // valide trouvé.
  const [billetValide, setBilletValide] = useState(undefined);
  const [confirmationOuverte, setConfirmationOuverte] = useState(false);

  useEffect(() => {
    let annule = false;
    setBilletValide(undefined);
    const recherche = procheChoisiId
      ? trouverBilletValidePourFiche(procheChoisiId, etablissementId, serviceId || null)
      : trouverBilletValideDuPatient(patientUid, etablissementId, serviceId || null);
    recherche
      .then((b) => { if (!annule) setBilletValide(b); })
      .catch(() => { if (!annule) setBilletValide(null); });
    return () => { annule = true; };
  }, [patientUid, etablissementId, serviceId, procheChoisiId]);

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
    listerSpecialistesAvecCreneaux(etablissementId, serviceId).then(setSpecialistes).catch(() => setSpecialistes([]));
  }, [etablissementId, serviceId]);

  // #nouveau (demande utilisateur, "facilité de prendre rendez-vous avec ce
  // médecin là", depuis la page Médecins) : préférence choisie hors de la
  // liste des spécialistes de garde ci-dessus — appliquée APRÈS l'effet qui
  // la réinitialise au changement de service (déclaré juste au-dessus),
  // donc jamais écrasée par lui.
  useEffect(() => {
    if (initialMedecin?.uid) setMedecinPrefere({ uid: initialMedecin.uid, nom: initialMedecin.nom, date: null });
  }, [initialMedecin]);

  const choisirCreneau = (medecin, date) => {
    setMedecinPrefere({ uid: medecin.uid, nom: medecin.nom, date });
    setDateSouhaitee(date);
  };

  const envoyerLaDemande = async () => {
    setEnvoi(true);
    try {
      const service = services.find((s) => s.id === serviceId);
      await creerDemandeRdv({
        etablissementId, patientUid,
        // Pour un proche : le nom qui apparaît à l'accueil est celui de la
        // personne réellement vue, pas celui du tuteur qui envoie la demande.
        patientNom: procheChoisi ? `${procheChoisi.prenom || ''} ${procheChoisi.nom || ''}`.trim() : patientNom,
        patientFicheId: procheChoisiId || null,
        serviceId: serviceId || null, serviceNom: service?.nom || null,
        motif, dateSouhaitee, type: teleconsultation ? 'teleconsultation' : 'presentiel',
        medecinPrefereId: medecinPrefere?.uid || null, medecinPrefereNom: medecinPrefere?.nom || null,
      });
      toast.success('Demande envoyée — vous serez notifié dès sa confirmation');
      setServiceId('');
      setMotif('');
      setDateSouhaitee('');
      setTeleconsultation(false);
      setMedecinPrefere(null);
      setProcheChoisiId('');
      setConfirmationOuverte(false);
    } catch (err) {
      console.error('creerDemandeRdv a échoué :', err);
      toast.error("Échec de l'envoi de la demande");
    } finally {
      setEnvoi(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!motif.trim()) {
      toast.error('Merci de préciser le motif');
      return;
    }
    // #nouveau (demande utilisateur, "qu'on ne puisse pas prendre un
    // rendez-vous deux fois la même journée avec le même médecin") : bloquant
    // (contrairement à l'avertissement billet ci-dessous, purement
    // informatif) — évite les doublons de test qui se sont multipliés côté
    // accueil, chacun affichant sa propre ligne dans la File d'attente.
    if (medecinPrefere?.uid && dateSouhaitee) {
      const dejaDemande = await existeDejaDemandeMemeJourMedecin(patientUid, medecinPrefere.uid, dateSouhaitee, procheChoisiId || null);
      if (dejaDemande) {
        toast.error(`Vous avez déjà une demande avec Dr ${medecinPrefere.nom} ce jour-là.`);
        return;
      }
    }
    // Informe le patient qu'un billet est déjà valide, sans jamais bloquer
    // l'envoi — c'est lui qui décide s'il en a quand même besoin d'un autre.
    if (billetValide) {
      setConfirmationOuverte(true);
      return;
    }
    envoyerLaDemande();
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {proches.length > 0 && (
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Pour qui ?</label>
            <select value={procheChoisiId} onChange={(e) => setProcheChoisiId(e.target.value)} className="input-field">
              <option value="">Moi-même</option>
              {proches.map((p) => <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>)}
            </select>
          </div>
        )}
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
          </div>
        )}
        {serviceId && specialistes.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--ink-3)' }}>Aucun horaire renseigné pour ce service pour le moment.</p>
        )}
        {medecinPrefere && (
          <p style={{ fontSize: 12, color: 'var(--ink-3)' }}>
            Préférence : Dr {medecinPrefere.nom}
            {medecinPrefere.date ? `, ${new Date(medecinPrefere.date).toLocaleDateString('fr-FR', { dateStyle: 'medium' })}` : ''} — confirmée par l'accueil.
          </p>
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
        {/* #corrigé (décision utilisateur, "c'est uniquement l'accueil qui
            crée le billet de consultation, et le patient voit ça dans ses
            factures et paie à distance") : la téléconsultation exige
            désormais elle aussi un billet valide (confirmerDemande,
            hospito-accueil-medecin) — ce bloc s'affiche donc aussi pour
            elle, mais reste purement informatif : jamais de création de
            billet côté patient, seul l'accueil en crée un (voir
            billetsSessionService.js::creerBillet, qui doit encore résoudre
            patientUid sur la facture pour que ce paiement à distance
            apparaisse dans Mon compte > Factures). */}
        {billetValide !== undefined && (
          billetValide ? (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, color: 'var(--ink-2)', background: 'var(--bg-2)', borderRadius: 10, padding: '10px 12px' }}>
              <CalendarClock style={{ width: 15, height: 15, color: 'var(--blue)', flexShrink: 0, marginTop: 1 }} />
              Vous avez déjà un billet de consultation valide jusqu'au {billetValide.expireLe.toLocaleDateString('fr-FR', { dateStyle: 'medium' })}
              {billetValide.serviceNom ? ` (${billetValide.serviceNom})` : ''} — vous pouvez vous présenter directement à l'accueil. Vous pouvez tout de même envoyer une nouvelle demande si besoin.
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, color: '#9A6B00', background: '#FFF7E6', borderRadius: 10, padding: '10px 12px' }}>
              <CalendarClock style={{ width: 15, height: 15, color: '#C2802F', flexShrink: 0, marginTop: 1 }} />
              Vous n'avez pas de billet de consultation valide dans cet établissement
              {teleconsultation
                ? " — l'accueil vous en créera un après réception de cette demande ; vous le retrouverez dans Mon compte > Factures pour le payer à distance."
                : " — un billet vous sera facturé à l'accueil avant la consultation."}
            </div>
          )
        )}
        <button type="submit" disabled={envoi} className="btn-primary">
          {envoi ? 'Envoi…' : 'Envoyer la demande'}
        </button>
      </form>

      {confirmationOuverte && (
        <div
          onClick={() => setConfirmationOuverte(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: 14, padding: 22, maxWidth: 380, width: '100%' }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>Billet de consultation encore valide</p>
            <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.5, marginBottom: 18 }}>
              Vous avez déjà un billet de consultation valide jusqu'au {billetValide?.expireLe?.toLocaleDateString('fr-FR', { dateStyle: 'medium' })}
              {billetValide?.serviceNom ? ` pour ${billetValide.serviceNom}` : ''}. Vous pouvez vous présenter directement à l'accueil sans nouvelle demande, ou envoyer quand même cette demande.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setConfirmationOuverte(false)} className="btn-outline">Annuler</button>
              <button type="button" onClick={envoyerLaDemande} disabled={envoi} className="btn-primary">
                {envoi ? 'Envoi…' : 'Envoyer quand même'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
