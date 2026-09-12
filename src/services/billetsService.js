import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getSettingsEtablissement } from './settingsService';

// #nouveau (demande utilisateur, "un popup doit dire si on a déjà un billet
// de consultation encore valide avant d'envoyer une demande de RDV") :
// `billets_session` (hospito-accueil-medecin) est indexé par `patientId`, un
// id de fiche `patients/{id}` INTERNE à CET établissement — jamais le
// `patientUid` du compte hospito-patient. Reprend exactement la même
// jointure par numéro d'identité national que
// hospito-accueil-medecin/patientsService.js::trouverFicheParPatientUid,
// seule façon de relier les deux sans dupliquer l'identité. Retourne null
// dès que l'un des maillons manque (patient jamais venu physiquement dans
// CET établissement, ou CNI non renseignée) — jamais une erreur bloquante.
// Factorisé (demande utilisateur, "un bébé ou une personne âgée sans compte
// doit aussi pouvoir être pris en compte") : la recherche du billet valide
// ne dépend que de l'id de fiche, jamais de comment il a été obtenu (CNI du
// titulaire lui-même, ou geePar pour un proche) — voir
// trouverBilletValidePourFiche ci-dessous, utilisée directement quand la
// fiche du proche est déjà connue.
async function trouverBilletValidePourFicheId(ficheId, etablissementId, serviceId) {
  const { dureeValiditeBilletJours } = await getSettingsEtablissement(etablissementId);
  const billetsSnap = await getDocs(query(
    collection(db, 'billets_session'),
    where('etablissementId', '==', etablissementId),
    where('patientId', '==', ficheId),
  ));

  const maintenant = Date.now();
  const candidats = billetsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((b) => !serviceId || b.serviceId === serviceId)
    // #corrigé (audit, "incohérence de sémantique billet valide entre
    // hospito-patient et hospito-accueil-medecin") : un billet déjà
    // 'consulte' restait compté comme "valide" ici — le patient se voyait
    // dire "vous pouvez vous présenter sans payer" alors que
    // trouverBilletActifDuJour (hospito-accueil-medecin), qui décide
    // réellement s'il faut RECRÉER un billet payant, exclut déjà ce statut.
    // Même exclusion ici, pour ne jamais promettre au patient une gratuité
    // que l'accueil ne lui accordera pas.
    .filter((b) => b.statut !== 'consulte')
    .filter((b) => {
      const creeMs = b.createdAt?.toDate?.()?.getTime();
      if (!creeMs) return false;
      return maintenant <= creeMs + dureeValiditeBilletJours * 24 * 3600 * 1000;
    })
    .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));

  if (!candidats.length) return null;
  const b = candidats[0];
  const creeMs = b.createdAt.toDate().getTime();
  return { ...b, expireLe: new Date(creeMs + dureeValiditeBilletJours * 24 * 3600 * 1000) };
}

export async function trouverBilletValideDuPatient(patientUid, etablissementId, serviceId) {
  const userSnap = await getDoc(doc(db, 'users', patientUid));
  const cni = userSnap.exists() ? userSnap.data().numeroIdentiteNational : null;
  if (!cni) return null;

  const fichesSnap = await getDocs(query(
    collection(db, 'patients'),
    where('etablissementId', '==', etablissementId),
    where('numeroIdentiteNational', '==', cni),
  ));
  if (fichesSnap.empty) return null;
  return trouverBilletValidePourFicheId(fichesSnap.docs[0].id, etablissementId, serviceId);
}

// Pour un proche (fiche déjà connue, pas de CNI/compte à résoudre) — le
// tuteur choisit ce proche dans le sélecteur "Pour qui ?" de TabRdv.
export async function trouverBilletValidePourFiche(ficheId, etablissementId, serviceId) {
  if (!ficheId) return null;
  return trouverBilletValidePourFicheId(ficheId, etablissementId, serviceId);
}
