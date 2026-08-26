import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, MapPin, ChevronRight, ArrowLeft, ShoppingCart, KeyRound, Truck } from 'lucide-react';
import { getAnnonceById } from '../services/annoncesService';
import { creerCommande } from '../services/commandesService';
import { listenWallet } from '../services/walletService';
import { getSettings, getVillesFormulaire, getQuartiersFormulaire } from '../services/settingsService';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from '../components/common/ConfirmDialog';
import toast from 'react-hot-toast';
export default function AchatPage() {
  const {
    annonceId
  } = useParams();
  const {
    user,
    userProfile
  } = useAuth();
  const navigate = useNavigate();
  const [annonce, setAnnonce] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [wallet, setWallet] = useState({
    solde: 0,
    soldeParrainage: 0
  });
  const [sourceWallet, setSourceWallet] = useState('principal');
  const [modeRemise, setModeRemise] = useState('main_propre');
  const [villeLivraison, setVilleLivraison] = useState('');
  const [quartierLivraison, setQuartierLivraison] = useState('');
  const [autreVille, setAutreVille] = useState(false);
  const [autreQuartier, setAutreQuartier] = useState(false);
  const [settings, setSettings] = useState({});
  useEffect(() => {
    getSettings().then(setSettings);
  }, []);
  useEffect(() => {
    getAnnonceById(annonceId).then(a => {
      setAnnonce(a);
      const mode = a?.modeLivraison || 'main_propre';
      setModeRemise(mode === 'livreurs' ? 'livraison' : 'main_propre');
    }).catch(e => {
      console.error('Erreur chargement annonce :', e);
      toast.error('Impossible de charger cette annonce');
    }).finally(() => setLoading(false));
  }, [annonceId]);
  useEffect(() => {
    if (!user) return;
    const unsub = listenWallet(user.uid, setWallet);
    return unsub;
  }, [user]);
  useEffect(() => {
    if (userProfile?.ville) {
      setVilleLivraison(userProfile.ville);
      setAutreVille(!getVillesFormulaire(settings).includes(userProfile.ville));
    }
    if (userProfile?.quartier) {
      setQuartierLivraison(userProfile.quartier);
      setAutreQuartier(!getQuartiersFormulaire(settings, userProfile.ville)?.includes(userProfile.quartier));
    }
  }, [userProfile, settings]);
  if (!user) {
    navigate('/auth');
    return null;
  }
  const offreNegociee = annonce?.offreAcceptee?.acheteurId === user?.uid ? annonce.offreAcceptee : null;
  const prixArticle = offreNegociee?.montant ?? annonce?.prix ?? 0;
  const total = prixArticle;
  const proposeLivraison = annonce?.modeLivraison === 'livreurs' || annonce?.modeLivraison === 'les_deux';
  const choixImpose = annonce?.modeLivraison && annonce.modeLivraison !== 'les_deux';
  const livraisonValide = modeRemise !== 'livraison' || villeLivraison && quartierLivraison;
  const parrainagePeutCouvrir = wallet.soldeParrainage >= total && total > 0;
  useEffect(() => {
    if (sourceWallet === 'parrainage' && !parrainagePeutCouvrir) setSourceWallet('principal');
  }, [sourceWallet, parrainagePeutCouvrir]);
  const handleSubmit = () => {
    // #nouveau (demande utilisateur, "CNI obligatoire pour acheter ET pour
    // vendre") : jusqu'ici seule la vente l'exigeait (PublierPage.jsx) —
    // aucune vérification n'existait côté achat, ni ici ni dans les règles
    // Firestore (cf. commandes/{id} allow create).
    if (!userProfile?.cniVerifie) {
      toast.error('Vérifiez votre CNI dans Mon Compte avant d\'acheter');
      navigate('/mon-compte/cni');
      return;
    }
    if (!livraisonValide) {
      toast.error('Indiquez votre ville et quartier de livraison');
      return;
    }
    setShowConfirm(true);
  };
  const handleConfirmerAchat = async () => {
    setSubmitting(true);
    try {
      const commandeId = await creerCommande(user.uid, annonce.userId, annonceId, {
        titreAnnonce: annonce.titre,
        photoAnnonce: annonce.photos?.[0] || null,
        estLot: annonce.estLot || false,
        nombreArticlesLot: annonce.estLot ? annonce.nombreArticlesLot || 2 : null,
        modeRemise,
        adresseLivraison: modeRemise === 'livraison' ? {
          ville: villeLivraison,
          quartier: quartierLivraison
        } : null
      }, sourceWallet);
      toast.success('Commande confirmée !');
      setShowConfirm(false);
      navigate(`/commande/${commandeId}`);
    } catch (e) {
      setShowConfirm(false);
      if (e.message === 'ANNONCE_INDISPONIBLE') {
        toast.error('Cet article vient d\'être vendu à quelqu\'un d\'autre.');
        navigate('/catalogue');
      } else if (e.message === 'SOLDE_INSUFFISANT') {
        toast.error('Solde insuffisant. Déposez de l\'argent sur votre wallet pour continuer.');
        navigate('/wallet');
      } else if (e.message === 'ANNONCE_INTROUVABLE') {
        toast.error('Cette annonce n\'existe plus.');
        navigate('/catalogue');
      } else if (e.message === 'COMPTE_RESTREINT_ANNULATIONS') {
        toast.error('Trop d\'annulations récentes — nouvel achat temporairement bloqué.');
      } else if (e.message === 'COMPTE_SUSPENDU_VERIFICATION') {
        toast.error('Votre compte est en cours de vérification suite à une anomalie détectée sur votre solde. Contactez le support MAKET.');
      } else if (e.message === 'VENDEUR_INVALIDE') {
        toast.error('Ce vendeur n\'est plus disponible pour cette annonce.');
        navigate('/catalogue');
      } else if (e.message === 'ADRESSE_LIVRAISON_MANQUANTE') {
        toast.error('Indiquez une adresse de livraison.');
      } else {
        toast.error('Erreur lors de la commande — réessayez dans quelques instants.');
      }
    } finally {
      setSubmitting(false);
    }
  };
  if (loading) return <div className="max-w-lg mx-auto px-6 py-8 space-y-4">{Array(4).fill(0).map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse"></div>)}</div>;
  if (!annonce) return <div className="max-w-lg mx-auto px-6 py-16 text-center">
      <p className="text-gray-500 font-semibold">Cette annonce est introuvable ou n'est plus disponible.</p>
      <button onClick={() => navigate('/catalogue')} className="btn-primary mt-4 inline-flex">Retour au catalogue</button>
    </div>;
  return <div className="max-w-lg mx-auto px-6 py-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-gray-600 mb-6">
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>

      <h1 className="text-2xl font-black text-gray-900 mb-6" style={{
      fontFamily: 'var(--font-display)'
    }}>Finaliser l'achat</h1>

      {}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-5 flex gap-4">
        <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
          {annonce.photos?.[0] ? <img src={annonce.photos[0]} alt={annonce.titre || ''} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{annonce.titre}</p>
          {annonce.estLot && <p className="text-xs font-bold text-primary-600 mt-0.5">
              📦 Lot de {annonce.nombreArticlesLot || 2} articles — vendus ensemble pour ce prix unique
            </p>}
          {annonce.estLot && annonce.articlesLot?.length > 0 && <ul className="text-xs text-gray-500 mt-1 list-disc pl-4">
              {annonce.articlesLot.map((a, i) => <li key={i}>{a}</li>)}
            </ul>}
          {offreNegociee ? <p className="mt-1 flex items-center gap-2">
              <span className="text-gray-400 text-xs line-through">{annonce.prix?.toLocaleString()} XAF</span>
              <span className="text-primary-600 font-black">{offreNegociee.montant.toLocaleString()} XAF</span>
            </p> : <p className="text-primary-600 font-black mt-1">{annonce.prix?.toLocaleString()} XAF</p>}
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3" /> {annonce.quartier}, {annonce.ville}</p>
        </div>
      </div>

      {offreNegociee && <div className="flex items-start gap-2 bg-green-50 border border-green-100 rounded-xl p-3 mb-5">
          <ShoppingCart className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-green-700"><strong>Prix négocié appliqué</strong> — le vendeur a accepté votre offre par chat, ce prix n'est valable que pour vous.</p>
        </div>}

      {}
      {proposeLivraison && !choixImpose && <div className="mb-5 grid grid-cols-2 gap-2.5">
          <button type="button" onClick={() => setModeRemise('main_propre')} className={`p-3 rounded-xl border-2 text-left transition-all ${modeRemise === 'main_propre' ? 'border-primary-600 bg-primary-50' : 'border-gray-200'}`}>
            <MapPin className={`w-4 h-4 mb-1 ${modeRemise === 'main_propre' ? 'text-primary-600' : 'text-gray-400'}`} />
            <p className={`text-sm font-bold ${modeRemise === 'main_propre' ? 'text-primary-700' : 'text-gray-700'}`}>Main propre</p>
            <p className="text-xs text-gray-400 mt-0.5">Gratuit</p>
          </button>
          <button type="button" onClick={() => setModeRemise('livraison')} className={`p-3 rounded-xl border-2 text-left transition-all ${modeRemise === 'livraison' ? 'border-primary-600 bg-primary-50' : 'border-gray-200'}`}>
            <Truck className={`w-4 h-4 mb-1 ${modeRemise === 'livraison' ? 'text-primary-600' : 'text-gray-400'}`} />
            <p className={`text-sm font-bold ${modeRemise === 'livraison' ? 'text-primary-700' : 'text-gray-700'}`}>Livraison</p>
            <p className="text-xs text-gray-400 mt-0.5">Frais fixés par le livreur</p>
          </button>
        </div>}

      {modeRemise === 'main_propre' ? <div className="mb-5 flex items-start gap-3 bg-gray-50 border border-gray-100 rounded-xl p-4">
          <MapPin className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-gray-800">Remise en main propre</p>
            <p className="text-xs text-gray-500 mt-1">Après l'achat, contactez le vendeur par chat pour convenir d'un lieu et d'une heure. Au moment de la remise, donnez-lui votre code de remise à 4 chiffres pour libérer le paiement.</p>
          </div>
        </div> : <div className="mb-5 bg-gray-50 border border-gray-100 rounded-xl p-4">
          <div className="flex items-start gap-3 mb-3">
            <Truck className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-gray-800">Livraison</p>
              <p className="text-xs text-gray-500 mt-1">Un livreur récupère l'article chez le vendeur et vous le livre. Les frais de livraison sont fixés par le livreur une fois votre commande prête, et vous devrez les accepter et les payer séparément avant que le livreur ne parte — jamais engagés à l'avance.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <select value={autreVille ? 'Autre ville' : villeLivraison} onChange={e => {
          const v = e.target.value;
          if (v === 'Autre ville') {
            setAutreVille(true);
            setVilleLivraison('');
          } else {
            setAutreVille(false);
            setVilleLivraison(v);
          }
          setQuartierLivraison('');
          setAutreQuartier(false);
        }} className="input-field text-sm">
              <option value="">Ville</option>
              {getVillesFormulaire(settings).map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            {getQuartiersFormulaire(settings, villeLivraison) ? <select value={autreQuartier ? 'Autre' : quartierLivraison} onChange={e => {
          const q = e.target.value;
          if (q === 'Autre') {
            setAutreQuartier(true);
            setQuartierLivraison('');
          } else {
            setAutreQuartier(false);
            setQuartierLivraison(q);
          }
        }} className="input-field text-sm">
                <option value="">Quartier</option>
                {getQuartiersFormulaire(settings, villeLivraison).map(q => <option key={q} value={q}>{q}</option>)}
              </select> : <input value={quartierLivraison} onChange={e => setQuartierLivraison(e.target.value)} placeholder="Quartier" className="input-field text-sm" />}
            {autreVille && <input value={villeLivraison} onChange={e => setVilleLivraison(e.target.value)} placeholder="Précisez le nom de la ville" className="input-field text-sm col-span-2" />}
            {autreQuartier && <input value={quartierLivraison} onChange={e => setQuartierLivraison(e.target.value)} placeholder="Précisez le quartier" className="input-field text-sm col-span-2" />}
          </div>
        </div>}

      {}
      <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 mb-5">
        <h3 className="font-bold text-sm mb-3">Récapitulatif</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm"><span className="text-gray-500">Prix article{offreNegociee ? ' (négocié)' : ''}</span><span className="font-semibold">{prixArticle.toLocaleString()} XAF</span></div>
          <div className="border-t border-gray-200 pt-2 flex justify-between"><span className="font-bold">Total</span><span className="font-black text-primary-600 text-lg">{total.toLocaleString()} XAF</span></div>
        </div>
        {parrainagePeutCouvrir && <div className="grid grid-cols-2 gap-2 mt-4">
            <button type="button" onClick={() => setSourceWallet('principal')} className={`p-2.5 rounded-xl border-2 text-left transition-all ${sourceWallet === 'principal' ? 'border-primary-600 bg-primary-50' : 'border-gray-200'}`}>
              <p className={`text-xs font-bold ${sourceWallet === 'principal' ? 'text-primary-700' : 'text-gray-700'}`}>Solde principal</p>
              <p className="text-xs text-gray-400 mt-0.5">{wallet.solde.toLocaleString()} XAF disponibles</p>
            </button>
            <button type="button" onClick={() => setSourceWallet('parrainage')} className={`p-2.5 rounded-xl border-2 text-left transition-all ${sourceWallet === 'parrainage' ? 'border-primary-600 bg-primary-50' : 'border-gray-200'}`}>
              <p className={`text-xs font-bold ${sourceWallet === 'parrainage' ? 'text-primary-700' : 'text-gray-700'}`}>Solde de parrainage</p>
              <p className="text-xs text-gray-400 mt-0.5">{wallet.soldeParrainage.toLocaleString()} XAF disponibles</p>
            </button>
          </div>}
      </div>

      {}
      <div className="flex items-start gap-3 bg-green-50 border border-green-100 rounded-xl p-4 mb-4">
        <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-green-700">Paiement sécurisé MAKET</p>
          <p className="text-xs text-green-600 mt-1">Votre paiement est bloqué et sécurisé — il n'est versé au vendeur qu'après confirmation de la remise (code à 4 chiffres), avec 24h pour signaler un problème.</p>
        </div>
      </div>

      {}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl p-4 mb-6">
        <KeyRound className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-amber-700">Annulation</p>
          <p className="text-xs text-amber-700 mt-1">Toujours remboursée intégralement tant que le livreur n'est pas parti chercher l'article (ou la remise en main propre pas encore faite). Au-delà, impossible — passez par un litige. Annuler trop souvent pèse sur votre score de fiabilité.</p>
        </div>
      </div>

      <button onClick={handleSubmit} disabled={submitting || !livraisonValide} className="btn-primary w-full justify-center py-4 text-base disabled:opacity-50">
        {submitting ? <span className="flex items-center gap-2"><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>Traitement...</span> : <span className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Payer {total.toLocaleString()} XAF
            <ChevronRight className="w-4 h-4" />
          </span>}
      </button>
      <p className="text-xs text-gray-400 text-center mt-3">
        {modeRemise === 'livraison' ? 'Le prix de l\'article est prélevé maintenant — les frais de livraison seront à payer séparément une fois fixés par le livreur.' : `Le montant est prélevé directement sur votre solde ${sourceWallet === 'parrainage' ? 'de parrainage' : 'MAKET'}`}
      </p>

      {showConfirm && <ConfirmDialog title="Confirmer cet achat ?" description={`Vous allez dépenser ${total.toLocaleString('fr-FR')} XAF depuis votre solde ${sourceWallet === 'parrainage' ? 'de parrainage' : 'principal'}.${annonce.estLot ? ` Vous achetez un lot de ${annonce.nombreArticlesLot || 2} articles pour ce prix unique.` : ''}${modeRemise === 'livraison' ? ' Les frais de livraison seront à payer séparément une fois proposés par un livreur.' : ''}`} confirmLabel="Confirmer et payer" onConfirm={handleConfirmerAchat} onCancel={() => setShowConfirm(false)} />}
    </div>;
}
