import { useState } from 'react';
import { Building2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { soumettreDemandeEtablissement } from '../services/demandesEtablissementService';

const CHAMPS_REQUIS = ['nomEtablissement', 'ville', 'contactNom', 'contactEmail'];

export default function DemandeEtablissementPage() {
  const [form, setForm] = useState({
    nomEtablissement: '',
    ville: '',
    adresse: '',
    contactNom: '',
    contactEmail: '',
    contactTelephone: '',
    message: '',
  });
  const [envoi, setEnvoi] = useState(false);
  const [envoye, setEnvoye] = useState(false);

  const set = (champ, valeur) => setForm((f) => ({ ...f, [champ]: valeur }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (CHAMPS_REQUIS.some((champ) => !form[champ].trim())) {
      toast.error('Merci de remplir tous les champs obligatoires (*)');
      return;
    }
    setEnvoi(true);
    try {
      await soumettreDemandeEtablissement(form);
      setEnvoye(true);
    } catch (err) {
      console.error('Erreur soumission demande établissement:', err);
      toast.error("Échec de l'envoi de la demande. Réessayez dans quelques instants.");
    } finally {
      setEnvoi(false);
    }
  };

  if (envoye) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '64px 24px', textAlign: 'center' }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: '#ECFDF5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}
        >
          <CheckCircle style={{ width: 30, height: 30, color: '#2F7D5C' }} />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>
          Demande envoyée !
        </h1>
        <p style={{ fontSize: 15, color: 'var(--ink-3)', lineHeight: 1.6 }}>
          Merci pour votre intérêt. Notre équipe va étudier votre demande et vous recontactera à
          l'adresse indiquée dans les meilleurs délais.
        </p>
        <a href="/" className="btn-primary" style={{ display: 'inline-block', marginTop: 28 }}>
          Retour à l'accueil
        </a>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '48px 24px 64px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: 'linear-gradient(135deg, var(--blue), var(--accent-dark))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <Building2 style={{ width: 26, height: 26, color: 'white' }} />
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
          Devenir établissement partenaire HostoConnect
        </h1>
        <p style={{ fontSize: 15, color: 'var(--ink-3)', lineHeight: 1.6 }}>
          Vous représentez une clinique, un cabinet ou un hôpital ? Faites-nous parvenir vos
          coordonnées, notre équipe vous recontacte pour la mise en place.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Nom de l'établissement *
          </label>
          <input
            value={form.nomEtablissement}
            onChange={(e) => set('nomEtablissement', e.target.value)}
            placeholder="Ex: Clinique Sainte-Marie"
            className="input-field"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Ville *</label>
            <input
              value={form.ville}
              onChange={(e) => set('ville', e.target.value)}
              placeholder="Ex: Douala"
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Adresse</label>
            <input
              value={form.adresse}
              onChange={(e) => set('adresse', e.target.value)}
              placeholder="Quartier, rue…"
              className="input-field"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Nom du contact *
          </label>
          <input
            value={form.contactNom}
            onChange={(e) => set('contactNom', e.target.value)}
            placeholder="Personne à contacter pour ce dossier"
            className="input-field"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Email *</label>
            <input
              type="email"
              value={form.contactEmail}
              onChange={(e) => set('contactEmail', e.target.value)}
              placeholder="contact@etablissement.cm"
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Téléphone</label>
            <input
              type="tel"
              value={form.contactTelephone}
              onChange={(e) => set('contactTelephone', e.target.value)}
              placeholder="+237 6…"
              className="input-field"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Message</label>
          <textarea
            value={form.message}
            onChange={(e) => set('message', e.target.value)}
            placeholder="Précisez votre besoin, la taille de votre établissement, vos questions…"
            className="input-field"
            rows={4}
          />
        </div>

        <button type="submit" disabled={envoi} className="btn-primary w-full">
          {envoi ? 'Envoi…' : 'Envoyer la demande'}
        </button>
      </form>
    </div>
  );
}
