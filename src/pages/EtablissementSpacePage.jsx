import { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getEtablissement, listerServicesActifs } from '../services/etablissementsPublicService';
import { creerDemandeRdv, getMesDemandesRdv } from '../services/demandesRendezVousService';
import { ouvrirReclamation, getReclamationsPatient } from '../services/reclamationsService';
import { getOrCreateConversation, envoyerMessage, listenMessages } from '../services/chatService';
import { getWallet, listenWallet, getTransactions, initierDepot, attendreConfirmationDepot } from '../services/walletService';

const TABS = [
  { id: 'rdv', label: 'Prendre RDV', icon: CalendarPlus },
  { id: 'dossier', label: 'Mon dossier', icon: FolderHeart },
  { id: 'messagerie', label: 'Messagerie', icon: MessageCircle },
  { id: 'paiement', label: 'Paiement', icon: Wallet },
  { id: 'reclamations', label: 'Réclamations', icon: Flag },
];

function TabRdv({ etablissementId, patientUid, patientNom }) {
  const [motif, setMotif] = useState('');
  const [dateSouhaitee, setDateSouhaitee] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [demandes, setDemandes] = useState([]);

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
      await creerDemandeRdv({ etablissementId, patientUid, patientNom, motif, dateSouhaitee });
      toast.success('Demande envoyée — vous serez notifié dès sa confirmation');
      setMotif('');
      setDateSouhaitee('');
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
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Motif de la visite *</label>
          <input value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ex: consultation générale" className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Date souhaitée</label>
          <input type="date" value={dateSouhaitee} onChange={(e) => setDateSouhaitee(e.target.value)} className="input-field" />
        </div>
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
                <span style={{ color: 'var(--ink-3)', marginLeft: 8 }}>
                  {d.statut === 'en_attente' ? 'En attente de confirmation' : d.statut}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TabDossier() {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-3)' }}>
      <FolderHeart style={{ width: 32, height: 32, margin: '0 auto 12px', color: 'var(--ink-4)' }} />
      <p style={{ fontWeight: 600, color: 'var(--ink-2)' }}>Disponible prochainement</p>
      <p style={{ fontSize: 13, marginTop: 4 }}>
        Votre dossier médical, unique et partagé entre tous vos établissements, sera consultable ici.
      </p>
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

function TabPaiement({ patientUid }) {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [montant, setMontant] = useState('');
  const [phone, setPhone] = useState('');
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    getWallet(patientUid).then(setWallet);
    getTransactions(patientUid).then(setTransactions).catch(() => setTransactions([]));
    return listenWallet(patientUid, setWallet);
  }, [patientUid]);

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
          background: 'linear-gradient(135deg, var(--blue), var(--primary-dark, #1a3a8f))',
          color: 'white',
          marginBottom: 20,
        }}
      >
        <p style={{ fontSize: 12, opacity: 0.85 }}>Solde disponible</p>
        <p style={{ fontSize: 26, fontWeight: 700 }}>{(wallet?.solde || 0).toLocaleString('fr-FR')} XAF</p>
      </div>

      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 10 }}>Factures à payer</p>
      <div
        style={{
          padding: '16px',
          background: 'var(--bg-2)',
          borderRadius: 10,
          fontSize: 13,
          color: 'var(--ink-3)',
          marginBottom: 24,
        }}
      >
        Aucune facture en attente pour le moment.
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

function ServicesSection({ etablissementId }) {
  const [services, setServices] = useState(null);

  useEffect(() => {
    listerServicesActifs(etablissementId)
      .then(setServices)
      .catch((e) => {
        console.error('listerServicesActifs a échoué :', e);
        setServices([]);
      });
  }, [etablissementId]);

  if (services === null || services.length === 0) return null;

  return (
    <div style={{ marginBottom: 28 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 10 }}>Services disponibles</p>
      <div
        className="flex flex-nowrap gap-3 overflow-x-auto scrollbar-hide"
        style={{ paddingBottom: 4 }}
      >
        {services.map((s) => (
          <div
            key={s.id}
            style={{
              flexShrink: 0,
              width: 160,
              borderRadius: 12,
              overflow: 'hidden',
              border: '1px solid var(--border, #E2E8F0)',
              background: 'white',
            }}
          >
            <div
              style={{
                height: 90,
                background: s.photoURL ? `url(${s.photoURL}) center/cover` : 'linear-gradient(135deg, var(--blue), var(--primary-dark, #1a3a8f))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {!s.photoURL && (
                <span style={{ color: 'white', fontSize: 20, fontWeight: 700 }}>{(s.nom || '?').charAt(0).toUpperCase()}</span>
              )}
            </div>
            <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', padding: '8px 10px' }}>{s.nom}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function EtablissementSpacePage() {
  const { etablissementId } = useParams();
  const [searchParams] = useSearchParams();
  const { user, userProfile } = useAuth();
  const [etablissement, setEtablissement] = useState(null);
  const [loading, setLoading] = useState(true);
  const tabDemandee = searchParams.get('tab');
  const [tab, setTab] = useState(TABS.some((t) => t.id === tabDemandee) ? tabDemandee : 'rdv');

  useEffect(() => {
    getEtablissement(etablissementId)
      .then(setEtablissement)
      .finally(() => setLoading(false));
  }, [etablissementId]);

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

  if (!user) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
        <Building2 style={{ width: 32, height: 32, margin: '0 auto 12px', color: 'var(--ink-4)' }} />
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{etablissement.nom}</h1>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 20 }}>
          Connectez-vous pour prendre rendez-vous, consulter votre dossier et échanger avec cet établissement.
        </p>
        <Link to="/auth" className="btn-primary">
          Se connecter
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
            background: 'linear-gradient(135deg, var(--blue), var(--primary-dark, #1a3a8f))',
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

      <ServicesSection etablissementId={etablissementId} />

      <div
        className="flex flex-nowrap gap-2 overflow-x-auto scrollbar-hide"
        style={{ borderBottom: '1.5px solid var(--border, #E2E8F0)', marginBottom: 24 }}
      >
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 14px',
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: active ? 'var(--blue)' : 'var(--ink-3)',
                borderBottom: active ? '2px solid var(--blue)' : '2px solid transparent',
              }}
            >
              <Icon style={{ width: 15, height: 15 }} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'rdv' && <TabRdv etablissementId={etablissementId} patientUid={user.uid} patientNom={patientNom} />}
      {tab === 'dossier' && <TabDossier />}
      {tab === 'messagerie' && (
        <TabMessagerie etablissementId={etablissementId} patientUid={user.uid} etablissementNom={etablissement.nom} />
      )}
      {tab === 'paiement' && <TabPaiement patientUid={user.uid} />}
      {tab === 'reclamations' && <TabReclamations etablissementId={etablissementId} patientUid={user.uid} />}
    </div>
  );
}
