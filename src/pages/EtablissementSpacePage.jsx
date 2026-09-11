import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Building2,
  MapPin,
  CalendarPlus,
  FolderHeart,
  MessageCircle,
  Wallet,
  Flag,
  Send,
  ChevronLeft,
  Clock,
  LifeBuoy,
  Star,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import DossierMedicalView from '../components/dossier/DossierMedicalView';
import { TEXTE_CONSENTEMENT_PARTAGE, getMonConsentement, signerConsentement } from '../services/consentementsService';
import { getEtablissement, listerServicesActifs, listerTarifsConsultation } from '../services/etablissementsPublicService';
import { creerDemandeRdv, getMesDemandesRdv } from '../services/demandesRendezVousService';
import { listerSpecialistesDuService } from '../services/planningService';
import { ouvrirReclamation, getReclamationsPatient } from '../services/reclamationsService';
import { ouvrirSignalementSecurite, getSignalementsSecuritePatient } from '../services/signalementsSecuriteService';
import { deposerAvis, getAvisEtablissement, getMonAvis } from '../services/avisEtablissementsService';
import { getOrCreateConversation, envoyerMessage, listenMessages } from '../services/chatService';
import { getWallet, listenWallet, getTransactions, initierDepot, attendreConfirmationDepot } from '../services/walletService';
import { listerFacturesEnAttente, initierPaiementFacture, attendreConfirmationFacture, payerFactureAvecSolde } from '../services/facturesService';
import TeleconsultationCallWidget from '../components/teleconsultation/TeleconsultationCallWidget';
import { getTransparenceAttente, getInfosPratiques } from '../services/transparenceService';

// #refonte (demande utilisateur, "ça doit apparaître comme un site web
// classique mais tout doit se trouver sur une seule page principale") : plus
// d'onglets qui masquent le reste au clic — chaque section a désormais son
// ancre, affichée en permanence, et cette nav ne fait QUE défiler la même
// page vers elle (comme le menu d'un vrai site vitrine).
const SECTIONS_NAV = [
  { id: 'services', label: 'Services', icon: Building2 },
  { id: 'avis-public', label: 'Avis', icon: Star },
  { id: 'rdv', label: 'Rendez-vous', icon: CalendarPlus },
  { id: 'dossier', label: 'Mon dossier', icon: FolderHeart },
  { id: 'messagerie', label: 'Messagerie', icon: MessageCircle },
  { id: 'paiement', label: 'Paiement', icon: Wallet },
  { id: 'reclamations', label: 'Réclamations', icon: Flag },
  { id: 'securite', label: 'Sécurité', icon: LifeBuoy },
];

function SectionHeading({ icon: Icon, title, id }) {
  return (
    <div id={id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, scrollMarginTop: 76 }}>
      <Icon style={{ width: 18, height: 18, color: 'var(--blue)' }} />
      <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>{title}</h2>
    </div>
  );
}

// Remplace l'ancien blocage total de page pour un visiteur non connecté :
// désormais chaque section réservée reste visible (titre + emplacement),
// avec juste cette invite à la place du contenu interactif — cohérent avec
// "tout sur une seule page", y compris les parties qui nécessitent un compte.
function SectionCTA({ action }) {
  return (
    <div style={{ padding: '18px 20px', borderRadius: 12, background: 'var(--bg-2)', textAlign: 'center' }}>
      <p style={{ fontSize: 13.5, color: 'var(--ink-3)', marginBottom: 12 }}>Connectez-vous pour {action}.</p>
      <Link to="/auth" className="btn-primary" style={{ display: 'inline-block' }}>
        Se connecter / Créer un compte
      </Link>
    </div>
  );
}

function TabRdv({ etablissementId, patientUid, patientNom, initialServiceId }) {
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

function TabMessagerie({ etablissementId, patientUid, etablissementNom }) {
  const [convId, setConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    const contactId = `etab_${etablissementId}`;
    getOrCreateConversation(patientUid, contactId, null)
      .then(setConvId)
      .catch((e) => console.error('getOrCreateConversation a échoué :', e));
  }, [patientUid, etablissementId]);

  useEffect(() => {
    if (!convId) return;
    return listenMessages(convId, setMessages);
  }, [convId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !convId || envoi) return;
    setEnvoi(true);
    try {
      await envoyerMessage(convId, patientUid, input.trim());
      setInput('');
    } catch (err) {
      console.error('envoyerMessage a échoué :', err);
      toast.error("Échec de l'envoi du message");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 14 }}>
        Échangez directement avec {etablissementNom || "l'établissement"}.
      </p>
      <div
        style={{
          height: 320,
          overflowY: 'auto',
          border: '1.5px solid var(--border, #E2E8F0)',
          borderRadius: 12,
          padding: 14,
          marginBottom: 12,
        }}
      >
        {messages.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--ink-4)', textAlign: 'center', marginTop: 40 }}>
            Aucun message pour le moment.
          </p>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: m.senderId === patientUid ? 'flex-end' : 'flex-start',
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  maxWidth: '75%',
                  padding: '8px 12px',
                  borderRadius: 12,
                  fontSize: 13,
                  background: m.senderId === patientUid ? 'var(--blue)' : 'var(--bg-2)',
                  color: m.senderId === patientUid ? 'white' : 'var(--ink)',
                }}
              >
                {m.message}
              </div>
            </div>
          ))
        )}
      </div>
      <form onSubmit={handleSend} style={{ display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Votre message…"
          className="input-field"
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn-primary" disabled={!input.trim() || envoi}>
          <Send style={{ width: 16, height: 16 }} />
        </button>
      </form>
    </div>
  );
}

// #nouveau (demande utilisateur, "tout n'est pas payé qu'à partir du solde
// principal") : même second moyen de paiement que partout ailleurs
// (ExamensPage.jsx, moncompte/FacturesPage.jsx) — cette page affiche déjà le
// solde juste au-dessus (TabPaiement), il serait incohérent de ne proposer
// que CamPay ici.
function FactureAPayer({ facture, solde, onPayee }) {
  const [phone, setPhone] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [envoiSolde, setEnvoiSolde] = useState(false);

  const handlePayer = async (e) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast.error('Numéro Mobile Money requis');
      return;
    }
    setEnvoi(true);
    try {
      await initierPaiementFacture(facture.id, phone.trim());
      toast('Vérifiez votre téléphone pour confirmer le paiement…', { icon: '📲', duration: 6000 });
      const { statut, message } = await attendreConfirmationFacture(facture.id);
      if (statut === 'payee') {
        toast.success('Facture payée !');
        onPayee(facture.id);
      } else if (statut === 'ecart_montant') {
        toast.error(message || 'Écart de montant détecté');
      } else {
        toast.error('Le paiement a échoué ou est resté en attente.');
      }
    } catch (err) {
      console.error('initierPaiementFacture a échoué :', err);
      toast.error(err.message || "Échec de l'opération");
    } finally {
      setEnvoi(false);
    }
  };

  const handlePayerSolde = async () => {
    setEnvoiSolde(true);
    try {
      const { statut, message } = await payerFactureAvecSolde(facture.id);
      if (statut === 'payee') {
        toast.success('Facture payée avec votre solde !');
        onPayee(facture.id);
      } else {
        toast.error(message || 'Le paiement a échoué — réessayez');
      }
    } catch (err) {
      console.error('payerFactureAvecSolde a échoué :', err);
      toast.error(err.message || "Échec de l'opération");
    } finally {
      setEnvoiSolde(false);
    }
  };

  return (
    <div style={{ padding: '14px 16px', background: 'var(--bg-2)', borderRadius: 10, marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{facture.libelle}</span>
        <span style={{ fontWeight: 700, fontSize: 13 }}>{Number(facture.montant).toLocaleString('fr-FR')} XAF</span>
      </div>
      <form onSubmit={handlePayer} style={{ display: 'flex', gap: 8 }}>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Numéro Mobile Money"
          className="input-field"
          style={{ flex: 1 }}
        />
        <button type="submit" disabled={envoi || envoiSolde} className="btn-primary">
          {envoi ? 'Traitement…' : 'Payer'}
        </button>
      </form>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border-2)' }} />
        <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>ou</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border-2)' }} />
      </div>
      <button
        type="button"
        onClick={handlePayerSolde}
        disabled={envoi || envoiSolde || Number(facture.montant) > solde}
        className="btn-outline"
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
      >
        <Wallet style={{ width: 14, height: 14 }} />
        {envoiSolde ? 'Traitement…' : `Payer avec mon solde (${solde.toLocaleString('fr-FR')} XAF)`}
      </button>
    </div>
  );
}

function TabPaiement({ patientUid, etablissementId }) {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [factures, setFactures] = useState(null);
  const [montant, setMontant] = useState('');
  const [phone, setPhone] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const rechargerFactures = useCallback(() => {
    listerFacturesEnAttente(patientUid, etablissementId).then(setFactures).catch(() => setFactures([]));
  }, [patientUid, etablissementId]);

  useEffect(() => {
    getWallet(patientUid).then(setWallet);
    getTransactions(patientUid).then(setTransactions).catch(() => setTransactions([]));
    rechargerFactures();
    return listenWallet(patientUid, setWallet);
  }, [patientUid, rechargerFactures]);

  const handleDepot = async (e) => {
    e.preventDefault();
    const m = Number(montant);
    if (!m || m <= 0 || !phone.trim()) {
      toast.error('Montant et numéro requis');
      return;
    }
    setEnvoi(true);
    try {
      const { transactionId } = await initierDepot(patientUid, m, phone.trim());
      toast('Vérifiez votre téléphone pour confirmer le paiement…', { icon: '📲', duration: 6000 });
      const { statut } = await attendreConfirmationDepot(transactionId);
      if (statut === 'completed') {
        toast.success(`Dépôt de ${m.toLocaleString()} XAF crédité !`);
        setMontant('');
        setPhone('');
        getTransactions(patientUid).then(setTransactions);
      } else {
        toast.error('Le dépôt a échoué ou est resté en attente.');
      }
    } catch (err) {
      console.error('initierDepot a échoué :', err);
      toast.error(err.message || "Échec de l'opération");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div>
      <div
        style={{
          padding: '16px 20px',
          borderRadius: 12,
          background: 'linear-gradient(135deg, var(--blue), var(--primary-dark, #174858))',
          color: 'white',
          marginBottom: 20,
        }}
      >
        <p style={{ fontSize: 12, opacity: 0.85 }}>Solde disponible</p>
        <p style={{ fontSize: 26, fontWeight: 700 }}>{(wallet?.solde || 0).toLocaleString('fr-FR')} XAF</p>
      </div>

      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 10 }}>Factures à payer</p>
      <div style={{ marginBottom: 24 }}>
        {!factures?.length ? (
          <div style={{ padding: '16px', background: 'var(--bg-2)', borderRadius: 10, fontSize: 13, color: 'var(--ink-3)' }}>
            Aucune facture en attente pour le moment.
          </div>
        ) : (
          factures.map((f) => (
            <FactureAPayer key={f.id} facture={f} solde={wallet?.solde || 0} onPayee={() => rechargerFactures()} />
          ))
        )}
      </div>

      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 10 }}>Recharger mon solde</p>
      <form onSubmit={handleDepot} className="space-y-3">
        <input
          type="number"
          value={montant}
          onChange={(e) => setMontant(e.target.value)}
          placeholder="Montant (XAF)"
          className="input-field"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Numéro Mobile Money"
          className="input-field"
        />
        <button type="submit" disabled={envoi} className="btn-primary">
          {envoi ? 'Traitement…' : 'Déposer'}
        </button>
      </form>

      {transactions.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 10 }}>Historique</p>
          <div className="space-y-2">
            {transactions.slice(0, 10).map((t) => (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'var(--bg-2)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              >
                <span>{t.description}</span>
                <span style={{ fontWeight: 700, color: t.montant < 0 ? '#C2402F' : '#2F7D5C' }}>
                  {t.montant > 0 ? '+' : ''}
                  {t.montant.toLocaleString('fr-FR')} XAF
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TabReclamations({ etablissementId, patientUid }) {
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

function TabAvis({ etablissementId, patientUid, patientNom }) {
  const [note, setNote] = useState(0);
  const [commentaire, setCommentaire] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [avis, setAvis] = useState([]);
  const [monAvisId, setMonAvisId] = useState(null);

  const recharger = useCallback(() => {
    Promise.all([getAvisEtablissement(etablissementId), getMonAvis(patientUid, etablissementId)])
      .then(([tous, mien]) => {
        setAvis(tous);
        if (mien) {
          setMonAvisId(mien.id);
          setNote(mien.note);
          setCommentaire(mien.commentaire || '');
        }
      })
      .catch((e) => console.error('Chargement des avis a échoué :', e));
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
    } catch (err) {
      console.error('deposerAvis a échoué :', err);
      toast.error("Échec de l'envoi de l'avis");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div>
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

      {avis.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 10 }}>Avis des patients</p>
          <div className="space-y-2">
            {avis.map((a) => (
              <div key={a.id} style={{ padding: '10px 14px', background: 'var(--bg-2)', borderRadius: 10, fontSize: 13 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <strong>{a.patientNom || 'Patient'}</strong>
                  <span style={{ color: '#F59E0B' }}>{'★'.repeat(a.note)}{'☆'.repeat(5 - a.note)}</span>
                </div>
                {a.commentaire && <p style={{ color: 'var(--ink-3)', marginTop: 4 }}>{a.commentaire}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Pavé de signature manuscrite (canvas) — capturé en PNG (quelques Ko pour
// un simple tracé noir sur blanc), stocké directement dans le document
// Firestore (pas de bucket Supabase dédié : proportionné à ce cas d'usage,
// jamais pensé pour une pièce jointe volumineuse).
function SignaturePad({ onChange }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    return { x: point.clientX - rect.left, y: point.clientY - rect.top };
  };
  const start = (e) => {
    drawingRef.current = true;
    const { x, y } = getPos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const move = (e) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const { x, y } = getPos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const end = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    onChange(canvasRef.current.toDataURL('image/png'));
  };
  const effacer = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    onChange(null);
  };
  useEffect(() => { effacer(); }, []);

  return (
    <div>
      <canvas
        ref={canvasRef} width={400} height={140}
        style={{ width: '100%', maxWidth: 400, height: 140, border: '1.5px dashed #CBD5E1', borderRadius: 10, touchAction: 'none', cursor: 'crosshair', background: 'white' }}
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}
      />
      <button type="button" onClick={effacer} style={{ marginTop: 6, fontSize: 12, color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
        Effacer
      </button>
    </div>
  );
}

// Signature électronique du consentement de partage du dossier (§4.13) — un
// par établissement, jamais réutilisable pour un autre (le patient peut
// consulter plusieurs hôpitaux, chacun demande sa propre autorisation).
function ConsentementSignature({ etablissementId, patientUid, patientNom }) {
  const [consentement, setConsentement] = useState(undefined);
  const [signatureDataUrl, setSignatureDataUrl] = useState(null);
  const [signing, setSigning] = useState(false);

  const charger = useCallback(() => {
    getMonConsentement(patientUid, etablissementId).then(setConsentement).catch(() => setConsentement(null));
  }, [patientUid, etablissementId]);
  useEffect(() => { charger(); }, [charger]);

  const signer = async () => {
    if (!signatureDataUrl) { toast.error('Signez dans le cadre ci-dessus avant de valider'); return; }
    setSigning(true);
    try {
      await signerConsentement({ patientUid, patientNom, etablissementId, signatureDataUrl });
      toast.success('Consentement signé');
      charger();
    } catch (e) {
      toast.error(e.message || 'Erreur');
    } finally {
      setSigning(false);
    }
  };

  if (consentement === undefined) return null;

  if (consentement) {
    return (
      <div style={{ background: '#F0FDF4', border: '1.5px solid #A7F3D0', borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#065F46' }}>✓ Consentement de partage signé</p>
        <p style={{ fontSize: 12, color: '#059669', marginTop: 2 }}>
          Le {consentement.signeAt?.toDate ? consentement.signeAt.toDate().toLocaleDateString('fr-FR') : '—'}
        </p>
      </div>
    );
  }

  return (
    <div style={{ background: 'white', border: '1.5px solid #F1F5F9', borderRadius: 14, padding: 16, marginBottom: 16 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>Consentement de partage du dossier</p>
      <p style={{ fontSize: 12.5, color: '#64748B', marginBottom: 12, lineHeight: 1.5 }}>{TEXTE_CONSENTEMENT_PARTAGE}</p>
      <SignaturePad onChange={setSignatureDataUrl} />
      <button onClick={signer} disabled={signing} className="btn-primary" style={{ marginTop: 12 }}>
        {signing ? 'Signature…' : "Je signe et j'accepte"}
      </button>
    </div>
  );
}

const LABEL_TYPE_INCIDENT = { harcelement: 'Harcèlement', vol: 'Vol', agression: 'Agression', autre: 'Autre' };

function TabSecurite({ etablissementId, patientUid }) {
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

function ServicesSection({ etablissementId, tarifs, peutPrendreRdv, onPrendreRdv }) {
  const [services, setServices] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    listerServicesActifs(etablissementId)
      .then(setServices)
      .catch((e) => {
        console.error('listerServicesActifs a échoué :', e);
        setServices([]);
      });
  }, [etablissementId]);

  if (services === null || services.length === 0) return null;
  const serviceOuvert = services.find((s) => s.id === expandedId) || null;

  return (
    <div style={{ marginBottom: 28 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 4 }}>Services disponibles</p>
      <p style={{ fontSize: 12, color: 'var(--ink-4)', marginBottom: 10 }}>Parcourez l'établissement service par service.</p>
      <div
        className="flex flex-nowrap gap-3 overflow-x-auto scrollbar-hide"
        style={{ paddingBottom: 4 }}
      >
        {services.map((s) => (
          <button
            key={s.id}
            onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
            style={{
              flexShrink: 0,
              width: 160,
              borderRadius: 12,
              overflow: 'hidden',
              border: expandedId === s.id ? '1.5px solid var(--blue)' : '1px solid var(--border, #E2E8F0)',
              background: 'white',
              cursor: 'pointer',
              textAlign: 'left',
              padding: 0,
            }}
          >
            <div
              style={{
                height: 90,
                background: s.photoURL ? `url(${s.photoURL}) center/cover` : 'linear-gradient(135deg, var(--blue), var(--primary-dark, #174858))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {!s.photoURL && (
                <span style={{ color: 'white', fontSize: 20, fontWeight: 700 }}>{(s.nom || '?').charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div style={{ padding: '8px 10px' }}>
              <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>{s.nom}</p>
              {(() => {
                const tarif = tarifs?.find((t) => t.serviceId === s.id);
                return tarif ? (
                  <p style={{ fontSize: 11, color: 'var(--blue)', fontWeight: 700, marginTop: 2 }}>
                    {Number(tarif.montant).toLocaleString('fr-FR')} XAF
                  </p>
                ) : null;
              })()}
            </div>
          </button>
        ))}
      </div>

      <ServiceDetailPanel
        service={serviceOuvert}
        etablissementId={etablissementId}
        tarifs={tarifs}
        peutPrendreRdv={peutPrendreRdv}
        onClose={() => setExpandedId(null)}
        onPrendreRdv={onPrendreRdv}
      />
    </div>
  );
}

function TempsAttenteBadge({ etablissementId }) {
  const [temps, setTemps] = useState(null);

  useEffect(() => {
    getTransparenceAttente(etablissementId).then(setTemps).catch(() => setTemps(null));
  }, [etablissementId]);

  if (!temps?.tempsAttenteMoyenMinutes) return null;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--bg-2)', padding: '6px 12px', borderRadius: 20, fontSize: 12.5, color: 'var(--ink-2)', marginBottom: 20 }}>
      <Clock style={{ width: 13, height: 13, color: 'var(--ink-4)' }} />
      Temps d'attente moyen en consultation : ~{temps.tempsAttenteMoyenMinutes} min
    </div>
  );
}

const LABEL_INFO_PRATIQUE = {
  wifi: 'Wifi', horairesVisites: 'Horaires de visite', restauration: 'Restauration', parking: 'Parking', autres: 'À savoir',
  accesHandicape: 'Accès handicapé', ascenseur: 'Ascenseurs', interpreteLSF: 'Interprète LSF', autresAccessibilite: 'Accessibilité',
};

function InfosPratiquesSection({ etablissementId }) {
  const [infos, setInfos] = useState(null);

  useEffect(() => {
    getInfosPratiques(etablissementId).then(setInfos).catch(() => setInfos(null));
  }, [etablissementId]);

  const entrees = infos ? Object.entries(LABEL_INFO_PRATIQUE).filter(([key]) => infos[key]?.trim()) : [];
  if (!entrees.length) return null;

  return (
    <div style={{ marginBottom: 28 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 10 }}>Confort, vie pratique & accessibilité</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {entrees.map(([key, label]) => (
          <div key={key} style={{ padding: '10px 14px', background: 'var(--bg-2)', borderRadius: 10, fontSize: 13 }}>
            <strong>{label}</strong>
            <p style={{ color: 'var(--ink-3)', marginTop: 2 }}>{infos[key]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// #enrichi (demande utilisateur, "toutes les informations de tous les
// services de tous les admins... comme un site web complet") : tarif de
// consultation (public, cf. firestore.rules) + équipe médicale du service
// (médecins avec photo — même source que le choix de spécialiste à la prise
// de RDV, cf. listerSpecialistesDuService) affichés directement dans la
// fiche du service, avant même de créer un compte.
// #nouveau (demande utilisateur, "comme un site web complet") : avis
// publics en lecture seule, visibles sans connexion (déposer un avis reste
// réservé aux patients connectés, cf. onglet "Avis"). Même donnée que
// TabAvis (avis_etablissements, statut "visible" déjà public — cf.
// firestore.rules) mais avec une note moyenne mise en avant.
function AvisPublicSection({ etablissementId }) {
  const [avis, setAvis] = useState(null);

  useEffect(() => {
    getAvisEtablissement(etablissementId).then(setAvis).catch(() => setAvis([]));
  }, [etablissementId]);

  if (!avis?.length) return null;
  const moyenne = avis.reduce((s, a) => s + a.note, 0) / avis.length;

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)' }}>Avis des patients</p>
        <span style={{ color: '#F59E0B', fontSize: 13 }}>{'★'.repeat(Math.round(moyenne))}{'☆'.repeat(5 - Math.round(moyenne))}</span>
        <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>{moyenne.toFixed(1)}/5 · {avis.length} avis</span>
      </div>
      <div className="space-y-2">
        {avis.slice(0, 5).map((a) => (
          <div key={a.id} style={{ padding: '10px 14px', background: 'var(--bg-2)', borderRadius: 10, fontSize: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <strong>{a.patientNom || 'Patient'}</strong>
              <span style={{ color: '#F59E0B' }}>{'★'.repeat(a.note)}{'☆'.repeat(5 - a.note)}</span>
            </div>
            {a.commentaire && <p style={{ color: 'var(--ink-3)', marginTop: 4 }}>{a.commentaire}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

// #refonte (demande utilisateur, "tout doit se trouver sur une seule page
// principale") : n'est plus une modale par-dessus la page (position fixed +
// fond assombri) — le détail d'un service s'ouvre désormais À L'INTÉRIEUR du
// flux normal de la page, juste sous la vignette cliquée, comme une section
// qui se déplie sur un vrai site vitrine.
function ServiceDetailPanel({ service, etablissementId, tarifs, onClose, onPrendreRdv, peutPrendreRdv }) {
  const [equipe, setEquipe] = useState(null);

  useEffect(() => {
    if (!service) { setEquipe(null); return; }
    listerSpecialistesDuService(etablissementId, service.id).then(setEquipe).catch(() => setEquipe([]));
  }, [service, etablissementId]);

  if (!service) return null;
  const tarif = tarifs?.find((t) => t.serviceId === service.id);

  return (
    <div style={{ background: 'var(--bg-2)', borderRadius: 14, padding: 20, marginTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>{service.nom}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {tarif && (
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--blue)', background: 'white', padding: '4px 10px', borderRadius: 999 }}>
              {Number(tarif.montant).toLocaleString('fr-FR')} XAF
            </span>
          )}
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--ink-4)', lineHeight: 1, padding: 4 }} aria-label="Fermer">
            ×
          </button>
        </div>
      </div>
      <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.5, marginBottom: 16 }}>
        {service.description || "Aucune description fournie par l'établissement pour ce service."}
      </p>

      {equipe !== null && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 10 }}>Équipe médicale & horaires</p>
          {!equipe.length ? (
            <p style={{ fontSize: 12.5, color: 'var(--ink-4)' }}>Aucun planning renseigné pour ce service pour le moment.</p>
          ) : (
            <div className="space-y-2">
              {equipe.map((m) => (
                <div key={m.uid} style={{ background: 'white', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: m.horaires?.length ? 8 : 0 }}>
                    {m.photoURL ? (
                      <img src={m.photoURL} alt={m.nom} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', flexShrink: 0 }}>
                        {(m.nom || '?').trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('')}
                      </div>
                    )}
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Dr {m.nom}</span>
                  </div>
                  {!!m.horaires?.length && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {m.horaires.map((h) => (
                        <span
                          key={h.date}
                          style={{ fontSize: 11.5, color: 'var(--ink-2)', background: 'var(--bg-2)', padding: '4px 9px', borderRadius: 999 }}
                        >
                          {new Date(h.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} · {h.heureDebut}–{h.heureFin}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {peutPrendreRdv && (
        <button onClick={() => onPrendreRdv(service)} className="btn-primary">Prendre RDV pour ce service</button>
      )}
    </div>
  );
}

// #refonte (demande utilisateur, "ça doit apparaître comme un site web
// classique mais tout doit se trouver sur une seule page principale") : la
// fiche établissement (services, équipe, tarifs, avis, infos pratiques,
// prise de RDV, dossier, messagerie, paiement, réclamations, sécurité) est
// désormais UNE SEULE page qui s'affiche en continu, du haut en bas, comme un
// vrai site vitrine d'hôpital — plus aucune section n'est masquée derrière un
// clic d'onglet ou une modale. Un visiteur non connecté voit exactement les
// mêmes sections dans le même ordre ; seules celles qui exigent un compte
// (RDV, dossier, messagerie…) affichent une invite à se connecter à la place
// de leur contenu interactif (SectionCTA), au lieu de disparaître.
export default function EtablissementSpacePage() {
  const { etablissementId } = useParams();
  const [searchParams] = useSearchParams();
  const { user, userProfile } = useAuth();
  const [etablissement, setEtablissement] = useState(null);
  const [tarifs, setTarifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const ancreDemandee = searchParams.get('tab');
  const [serviceRdvPreselectionne, setServiceRdvPreselectionne] = useState(null);

  useEffect(() => {
    getEtablissement(etablissementId)
      .then(setEtablissement)
      .finally(() => setLoading(false));
    listerTarifsConsultation(etablissementId).then(setTarifs).catch(() => setTarifs([]));
  }, [etablissementId]);

  // Compatibilité avec les liens existants du type ?tab=rdv (ex. depuis un
  // rappel de RDV) : au lieu de sélectionner un onglet, on défile simplement
  // jusqu'à la section correspondante de cette même page.
  useEffect(() => {
    if (!ancreDemandee || loading) return;
    const el = document.getElementById(ancreDemandee);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [ancreDemandee, loading]);

  const allerPrendreRdv = (service) => {
    setServiceRdvPreselectionne(service.id);
    document.getElementById('rdv')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink-3)' }}>Chargement…</div>;
  }

  if (!etablissement) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <p style={{ color: 'var(--ink-3)' }}>Établissement introuvable.</p>
        <Link to="/" className="btn-primary" style={{ display: 'inline-block', marginTop: 16 }}>
          Retour à l'accueil
        </Link>
      </div>
    );
  }

  const patientNom = userProfile?.displayName || `${userProfile?.prenom || ''} ${userProfile?.nom || ''}`.trim();

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 64px' }}>
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--ink-3)', marginBottom: 16, textDecoration: 'none' }}>
        <ChevronLeft style={{ width: 14, height: 14 }} /> Accueil
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: 'linear-gradient(135deg, var(--blue), var(--primary-dark, #174858))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span style={{ color: 'white', fontSize: 22, fontWeight: 700 }}>
            {(etablissement.nom || '?').charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)' }}>{etablissement.nom}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <MapPin style={{ width: 13, height: 13, color: 'var(--ink-4)' }} />
            <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{etablissement.ville}</span>
          </div>
        </div>
      </div>

      {/* Nav d'ancres — ne fait que défiler CETTE MÊME page, comme le menu d'un site vitrine classique */}
      <div
        className="flex flex-nowrap gap-1 overflow-x-auto scrollbar-hide"
        style={{ borderBottom: '1.5px solid var(--border, #E2E8F0)', marginBottom: 28 }}
      >
        {SECTIONS_NAV.map((s) => {
          const Icon = s.icon;
          return (
            <a
              key={s.id}
              href={`#${s.id}`}
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 14px',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--ink-3)',
                textDecoration: 'none',
              }}
            >
              <Icon style={{ width: 15, height: 15 }} />
              {s.label}
            </a>
          );
        })}
      </div>

      <TempsAttenteBadge etablissementId={etablissementId} />

      <InfosPratiquesSection etablissementId={etablissementId} />

      <div style={{ marginBottom: 32 }}>
        <SectionHeading icon={Building2} title="Services & tarifs" id="services" />
        <ServicesSection etablissementId={etablissementId} tarifs={tarifs} peutPrendreRdv={!!user} onPrendreRdv={allerPrendreRdv} />
      </div>

      <div style={{ marginBottom: 32 }}>
        <SectionHeading icon={Star} title="Avis des patients" id="avis-public" />
        <AvisPublicSection etablissementId={etablissementId} />
      </div>

      <div style={{ marginBottom: 32 }}>
        <SectionHeading icon={CalendarPlus} title="Prendre rendez-vous" id="rdv" />
        {user ? (
          <TabRdv
            etablissementId={etablissementId}
            patientUid={user.uid}
            patientNom={patientNom}
            initialServiceId={serviceRdvPreselectionne}
          />
        ) : (
          <SectionCTA action="prendre rendez-vous" />
        )}
      </div>

      <div style={{ marginBottom: 32 }}>
        <SectionHeading icon={FolderHeart} title="Mon dossier médical" id="dossier" />
        {user ? (
          <>
            <ConsentementSignature etablissementId={etablissementId} patientUid={user.uid} patientNom={patientNom} />
            <DossierMedicalView cni={userProfile?.numeroIdentiteNational} />
          </>
        ) : (
          <SectionCTA action="consulter votre dossier médical" />
        )}
      </div>

      <div style={{ marginBottom: 32 }}>
        <SectionHeading icon={MessageCircle} title="Messagerie" id="messagerie" />
        {user ? (
          <TabMessagerie etablissementId={etablissementId} patientUid={user.uid} etablissementNom={etablissement.nom} />
        ) : (
          <SectionCTA action="échanger avec l'établissement" />
        )}
      </div>

      <div style={{ marginBottom: 32 }}>
        <SectionHeading icon={Wallet} title="Paiement & factures" id="paiement" />
        {user ? <TabPaiement patientUid={user.uid} etablissementId={etablissementId} /> : <SectionCTA action="gérer vos paiements" />}
      </div>

      <div style={{ marginBottom: 32 }}>
        <SectionHeading icon={Flag} title="Réclamations" id="reclamations" />
        {user ? <TabReclamations etablissementId={etablissementId} patientUid={user.uid} /> : <SectionCTA action="ouvrir une réclamation" />}
      </div>

      <div style={{ marginBottom: 32 }}>
        <SectionHeading icon={LifeBuoy} title="Sécurité personnelle" id="securite" />
        {user ? <TabSecurite etablissementId={etablissementId} patientUid={user.uid} /> : <SectionCTA action="faire un signalement" />}
      </div>

      <div>
        <SectionHeading icon={Star} title="Donner mon avis" id="mon-avis" />
        {user ? (
          <TabAvis etablissementId={etablissementId} patientUid={user.uid} patientNom={patientNom} />
        ) : (
          <SectionCTA action="déposer votre avis" />
        )}
      </div>
    </div>
  );
}
