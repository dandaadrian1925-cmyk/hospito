import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Rocket, Copy, Check, Share2 } from 'lucide-react';
import { buildInvitationWhatsApp } from '../../services/authService';
import { getNombreFilleuls } from '../../services/profilPublicService';
import toast from 'react-hot-toast';

// #nouveau (campagne de lancement) : affiché à la place de la grille
// d'annonces sur toutes les pages qui en montreraient normalement (accueil,
// catalogue) tant que settings.lancementDateFin est dans le futur — pendant
// ce temps, les annonces validées restent invisibles (statut
// 'en_vente_lancement', jamais retourné par les requêtes publiques), donc
// une grille vide n'aurait de toute façon rien à montrer. Purement
// informatif : le vrai verrou est côté firestore.rules/annoncesService.js.
export const campagneActive = settings =>
  !!settings?.lancementDateFin && new Date(settings.lancementDateFin).getTime() > Date.now();

// #nouveau (demande utilisateur, "indiquer qu'il faut 5 min pour afficher les
// résultats") : entre l'échéance et le prochain passage du cron
// ?job=lancement (révélation réelle), le site n'a plus rien à montrer côté
// campagneActive mais les annonces sont encore invisibles — sans ça, ce
// trou ressemblait à un site vide plutôt qu'à une publication en cours.
export const revelationEnCours = settings => {
  if (!settings?.lancementDateFin) return false;
  const finMs = new Date(settings.lancementDateFin).getTime();
  const delaiMs = (settings.lancementDelaiRevelationMinutes ?? 5) * 60000;
  return Date.now() >= finMs && Date.now() < finMs + delaiMs;
};
export const campagneOuRevelation = settings => campagneActive(settings) || revelationEnCours(settings);

const calculerRestant = dateFin => {
  const ms = Math.max(0, new Date(dateFin).getTime() - Date.now());
  return {
    jours: Math.floor(ms / 86400000),
    heures: Math.floor((ms % 86400000) / 3600000),
    minutes: Math.floor((ms % 3600000) / 60000),
    secondes: Math.floor((ms % 60000) / 1000)
  };
};

function Bloc({ valeur, label }) {
  return <div className="flex flex-col items-center bg-white/10 rounded-2xl px-4 py-3 min-w-[68px]">
    <span className="text-3xl font-black tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>{String(valeur).padStart(2, '0')}</span>
    <span className="text-[11px] uppercase tracking-wide text-white/70">{label}</span>
  </div>;
}

// #nouveau (demande utilisateur, "les infos de parrainage + partage du code
// dans cette même carte") : la carte de lancement est la page la plus vue
// du site pendant la campagne (elle remplace la grille d'articles partout) —
// y mettre l'appel au parrainage capte l'audience au moment où elle compte
// le plus, plutôt que de compter sur une visite séparée de /parrainage.
// Rang lu depuis userProfile.lancementRang (calculé périodiquement par le
// cron ?job=lancement — exige de comparer TOUS les utilisateurs, ne peut pas
// être instantané). Le NOMBRE de filleuls, lui, n'a pas cette contrainte —
// #bug (corrigé, retour utilisateur — "je viens de parrainer, ça affiche
// encore 0") : recalculé en direct (getNombreFilleuls, une simple requête
// d'agrégation) plutôt que d'attendre le même cron, qui pouvait laisser le
// compteur visiblement faux pendant jusqu'à 5 minutes après un parrainage.
function BlocParrainage({ user, userProfile, settings }) {
  const [copied, setCopied] = useState(false);
  const [filleuls, setFilleuls] = useState(userProfile?.lancementFilleulsCount ?? 0);
  useEffect(() => {
    if (!user) return;
    getNombreFilleuls(user.uid).then(setFilleuls).catch(e => console.error('getNombreFilleuls a échoué :', e));
  }, [user?.uid]);
  const topN = settings.lancementNombreParrains ?? 50;
  const bonus = settings.lancementBonusMontant ?? 0;
  const moisPro = settings.lancementVendeurProMois ?? 0;
  const avantages = `${bonus.toLocaleString('fr-FR')} XAF${moisPro > 0 ? ` + ${moisPro} mois de Vendeur Pro` : ''} offerts`;
  if (!user) {
    return <div className="mt-6 pt-6 border-t border-white/20">
      <p className="text-sm text-white/90 font-semibold mb-3">🎯 Les {topN} premiers parrains (classés par nombre de filleuls) gagnent {avantages} à la fin du compte à rebours — connectez-vous pour participer</p>
      <Link to="/auth" className="inline-flex items-center justify-center bg-white text-primary-700 font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-white/90 transition-colors">
        Créer mon compte
      </Link>
    </div>;
  }
  const code = userProfile?.referralCode;
  // #nouveau (demande utilisateur, "quand l'utilisateur est dans le top, ça
  // le lui dit juste sans plus afficher son rang") : lancementRang n'est
  // JAMAIS posé au-delà du top N côté serveur (scheduled-tasks/index.ts,
  // recalculerClassementParrainage — rangIndex < topN ? rangIndex + 1 :
  // null) — non-null signifie donc toujours "dans le top" RÉELLEMENT (sert
  // au serveur pour distribuer les vrais gains, cf. revelerLancementSiEcheance,
  // jamais influencé par ce qui suit).
  const rangReel = userProfile?.lancementRang ?? null;
  const dansLeTopReel = rangReel != null;
  // seuil = nombre de filleuls du dernier admis dans le top N (calculé par le
  // cron), + lancementAffichageAjustementSeuil, un décalage purement
  // cosmétique réglé par le super-admin.
  const seuil = Math.max(0, (settings.lancementSeuilTopN ?? 0) + (settings.lancementAffichageAjustementSeuil ?? 0));
  // #nouveau (demande utilisateur, "plutôt ajouter un nombre de parrains
  // cosmétique qui décale les rangs de tout le monde") : lancementAffichage-
  // DecalageRang s'ajoute au VRAI rang pour l'affichage — plus prévisible que
  // le seuil ci-dessus (lancementRang est unique 1..N, jamais de doublon,
  // donc "Ajouter 5" démote toujours exactement les 5 derniers du vrai top).
  const rangAffiche = rangReel != null ? rangReel + (settings.lancementAffichageDecalageRang ?? 0) : null;
  // #nouveau (demande utilisateur, "on doit aussi pouvoir les faire entrer
  // cosmétiquement dans le top tant que ça ne modifie en rien le
  // fonctionnement normal mais juste l'affichage") : les deux leviers
  // cosmétiques peuvent afficher N'IMPORTE QUEL statut dans les deux sens —
  // y compris "dans le top" pour quelqu'un qui ne l'est pas réellement, ou
  // l'inverse pour un vrai membre du top. AUCUN impact sur lancementRang
  // (donnée réelle, jamais modifiée) ni sur qui reçoit vraiment le bonus à
  // la révélation (revelerLancementSiEcheance, côté serveur, lit
  // exclusivement lancementRang — jamais ce composant). seuilDitTop tranche
  // pour tout le monde, y compris ceux sans rang réel (un seuil abaissé peut
  // les faire apparaître "dans le top") ; rangDitTop affine ensuite POUR
  // CEUX QUI ONT un vrai rang (le décalage peut les en faire sortir), et se
  // range sur seuilDitTop pour les autres (rien à décaler sans rang réel).
  const seuilDitTop = seuil > 0 ? filleuls > seuil : dansLeTopReel;
  const rangDitTop = rangAffiche != null ? rangAffiche <= topN : seuilDitTop;
  const dansLeTop = seuilDitTop && rangDitTop;
  const ecart = !dansLeTop && seuil > 0 ? seuil - filleuls + 1 : 0;
  const ecartProche = ecart > 0 && ecart <= 5;
  const marge = dansLeTop && seuil > 0 ? filleuls - seuil : null;
  const margeFragile = marge != null && marge <= 5;
  const copy = async () => {
    if (!code) return;
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Code copié !');
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Copie du code échouée :', e);
    }
  };
  const partager = () => {
    if (!code) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(buildInvitationWhatsApp(code))}`, '_blank');
  };
  return <div className="mt-6 pt-6 border-t border-white/20">
    <p className="text-xs font-bold uppercase tracking-wide text-white/70 mb-1">🚀 Course au lancement</p>
    {dansLeTop && margeFragile ? <p className="text-lg font-black mb-3" style={{ fontFamily: 'var(--font-display)' }}>
        Vous êtes dans le top {topN}, mais {marge <= 0 ? 'à la limite' : `avec seulement ${marge} filleul${marge !== 1 ? 's' : ''} d'avance`} !<br />
        <span className="text-sm font-semibold">Quelqu'un peut vous dépasser à tout moment — continuez à parrainer pour sécuriser {avantages}.</span>
      </p> : dansLeTop ? <p className="text-lg font-black mb-3" style={{ fontFamily: 'var(--font-display)' }}>
        Vous êtes dans le top {topN} ! avec {filleuls} filleul{filleuls !== 1 ? 's' : ''} !<br />
        <span className="text-sm font-semibold">Restez-y jusqu'à la fin du compte à rebours pour recevoir {avantages}.</span>
      </p> : ecartProche ? <p className="text-lg font-black mb-3" style={{ fontFamily: 'var(--font-display)' }}>
        Plus que {ecart} filleul{ecart !== 1 ? 's' : ''} pour entrer dans le top {topN} !<br />
        <span className="text-sm font-semibold">Gagnez {avantages} à la fin du compte à rebours.</span>
      </p> : <p className="text-sm font-semibold mb-3">
        {filleuls} filleul{filleuls !== 1 ? 's' : ''} — entrez dans le top {topN} des parrains pour gagner {avantages} à la fin du compte à rebours.
      </p>}
    {code ? <div className="flex flex-wrap items-center justify-center gap-2">
        <button onClick={copy} className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 transition-colors text-sm font-bold px-4 py-2 rounded-xl">
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {code}
        </button>
        <button onClick={partager} className="flex items-center gap-1.5 bg-white text-primary-700 hover:bg-white/90 transition-colors text-sm font-bold px-4 py-2 rounded-xl">
          <Share2 className="w-4 h-4" /> Partager sur WhatsApp
        </button>
      </div> : <Link to="/parrainage" className="text-sm underline text-white/90">Voir mon code de parrainage</Link>}
  </div>;
}

export default function CompteARebours({ settings, user, userProfile }) {
  const [restant, setRestant] = useState(() => calculerRestant(settings.lancementDateFin));
  const [enRevelation, setEnRevelation] = useState(() => revelationEnCours(settings));
  useEffect(() => {
    const id = setInterval(() => {
      setRestant(calculerRestant(settings.lancementDateFin));
      setEnRevelation(revelationEnCours(settings));
    }, 1000);
    return () => clearInterval(id);
  }, [settings.lancementDateFin, settings.lancementDelaiRevelationMinutes]);

  const total = settings.lancementNombreAnnonces ?? 0;
  const utilisees = settings.lancementAnnoncesCommissionZeroUtilisees ?? 0;
  // #nouveau (demande utilisateur, "modifier les données affichées, pas les
  // données réelles") : lancementAffichageAjustement est un décalage purement
  // cosmétique réglé par le super-admin — s'ajoute au calcul réel pour
  // l'affichage uniquement, ne touche jamais utilisees (le vrai quota de 0%
  // de commission reste calculé à part, côté annoncesService.js).
  const ajustementAffichage = settings.lancementAffichageAjustement ?? 0;
  const placesRestantes = Math.max(0, total - utilisees + ajustementAffichage);

  return <div className="rounded-3xl p-8 sm:p-12 text-center text-white mb-8" style={{ background: 'linear-gradient(135deg, var(--blue), var(--blue-dark))' }}>
    <div className="flex items-center justify-center gap-2 mb-3">
      <Rocket className="w-5 h-5" />
      <p className="text-sm font-bold uppercase tracking-wide">Lancement MAKET</p>
    </div>
    {enRevelation ? <>
      <h1 className="text-2xl sm:text-3xl font-black mb-3" style={{ fontFamily: 'var(--font-display)' }}>
        Publication en cours…
      </h1>
      <p className="text-sm text-white/90 font-semibold mb-6">
        Les annonces et les bonus de parrainage sont en train d'être mis en ligne — rechargez cette page dans quelques minutes.
      </p>
    </> : <>
      <h1 className="text-2xl sm:text-3xl font-black mb-6" style={{ fontFamily: 'var(--font-display)' }}>
        Les annonces arrivent bientôt !
      </h1>
      <div className="flex items-center justify-center gap-3 mb-6">
        <Bloc valeur={restant.jours} label="jours" />
        <Bloc valeur={restant.heures} label="heures" />
        <Bloc valeur={restant.minutes} label="min" />
        <Bloc valeur={restant.secondes} label="sec" />
      </div>
      {total > 0 && <p className="text-sm text-white/90 font-semibold">
        🎁 Encore <span className="font-black">{placesRestantes.toLocaleString('fr-FR')}</span> / {total.toLocaleString('fr-FR')} places à <span className="underline">0% de commission</span> pour les premiers vendeurs
      </p>}
    </>}
    <BlocParrainage user={user} userProfile={userProfile} settings={settings} />
  </div>;
}
