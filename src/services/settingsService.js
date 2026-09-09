import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
const DEFAULTS = {
  // #nouveau (demande utilisateur, "rendre villes/quartiers dynamiques
  // depuis les paramètres métiers, dans tout le site client") : reprend
  // exactement l'ancienne liste codée en dur comme valeur de repli — aucune
  // régression tant que le super-admin n'a rien reconfiguré. 'Autre ville'/
  // 'Autre' ne sont JAMAIS stockés ici : ce sont des sentinelles ajoutées
  // par l'UI elle-même (cf. getVillesFormulaire/getQuartiersFormulaire
  // ci-dessous), pour que l'admin ne puisse pas les supprimer ou les mal
  // placer par erreur.
  villes: ['Yaoundé', 'Douala', 'Bafoussam', 'Dschang', 'Mbouda', 'Bafang', 'Bamenda', 'Kumbo', 'Wum', 'Buea', 'Limbe', 'Kumba', 'Mamfe', 'Tiko', 'Garoua', 'Guider', 'Maroua', 'Kousséri', 'Mokolo', 'Ngaoundéré', 'Meiganga', 'Bertoua', 'Batouri', 'Ebolowa', 'Kribi', 'Sangmélima', 'Mbalmayo', 'Obala', 'Nkongsamba', 'Edéa'],
  quartiersParVille: {
    'Yaoundé': ['Bastos', 'Nlongkak', 'Biyem-Assi', 'Mvan', 'Omnisport', 'Melen', 'Essos', 'Nkomo', 'Mvog-Mbi'],
    'Douala': ['Akwa', 'Bonanjo', 'Bonapriso', 'Deido', 'Bepanda', 'Logbessou', 'Makepe']
  },
  // Anti-partage de coordonnées dans la messagerie sécurisée patient <->
  // établissement (chatService.js::envoyerMessage) — générique, pas lié au
  // marketplace retiré.
  chatAvertissementsAvantSuspension: 2,
  chatSuspensionHeures: 24
};
// #nouveau (demande utilisateur, "rendre villes/quartiers dynamiques") :
// liste "brute" (sans sentinelle), pour les usages qui ne sont PAS un
// formulaire de saisie.
export const getVilles = settings => settings?.villes?.length ? settings.villes : DEFAULTS.villes;
export const getQuartiers = (settings, ville) => (settings?.quartiersParVille ?? DEFAULTS.quartiersParVille)[ville] ?? null;
// Pour les formulaires de saisie (inscription, profil, adresse) : ajoute la
// sentinelle 'Autre ville'/'Autre' en dernière position, pour laisser
// l'utilisateur saisir une ville/un quartier absent de la liste.
export const getVillesFormulaire = settings => [...getVilles(settings), 'Autre ville'];
export const getQuartiersFormulaire = (settings, ville) => {
  const base = getQuartiers(settings, ville);
  return base ? [...base, 'Autre'] : null;
};
let cache = null;
export const getSettings = async () => {
  if (cache) return cache;
  try {
    const snap = await getDoc(doc(db, 'settings', 'global'));
    cache = snap.exists() ? {
      ...DEFAULTS,
      ...snap.data()
    } : DEFAULTS;
  } catch {
    cache = DEFAULTS;
  }
  return cache;
};

// #nouveau (demande utilisateur, "enrichir les paramètres métiers") :
// document DISTINCT de `settings/global` ci-dessus (reliquat marketplace) —
// `settings/{etablissementId}` est le vrai document de paramètres métiers
// par établissement, celui que le sysadmin configure depuis
// hospito-super-admin (durée de validité du billet, délai de rappel RDV...).
// Un patient peut avoir des rendez-vous dans plusieurs établissements, d'où
// un cache par établissement plutôt qu'un cache global unique.
const DEFAULTS_ETABLISSEMENT = { delaiRappelRendezVousHeures: 24 };
const cacheEtablissements = {};
export const getSettingsEtablissement = async (etablissementId) => {
  if (cacheEtablissements[etablissementId]) return cacheEtablissements[etablissementId];
  try {
    const snap = await getDoc(doc(db, 'settings', etablissementId));
    cacheEtablissements[etablissementId] = snap.exists() ? { ...DEFAULTS_ETABLISSEMENT, ...snap.data() } : DEFAULTS_ETABLISSEMENT;
  } catch {
    cacheEtablissements[etablissementId] = DEFAULTS_ETABLISSEMENT;
  }
  return cacheEtablissements[etablissementId];
};
