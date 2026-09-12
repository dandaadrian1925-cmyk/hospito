import { collection, doc, getDoc, getDocs, query, where, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getSettingsEtablissement } from './settingsService';
import { listerTarifsConsultation } from './etablissementsPublicService';

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
    // #corrigé (re-audit + décision utilisateur, "un billet déjà consulté
    // mais encore dans sa fenêtre de validité exempte-t-il le patient de
    // repayer pour un nouveau RDV en ligne ? Oui") : aligné sur
    // trouverBilletValidePourDate (hospito-accueil-medecin), la fonction qui
    // décide RÉELLEMENT côté accueil si la confirmation du RDV nécessite un
    // paiement — celle-ci n'exclut PAS 'consulte' ("déjà vu ne veut pas dire
    // n'a jamais eu de billet"). Un correctif précédent avait exclu
    // 'consulte' ici pour "aligner" les deux, dans le mauvais sens : c'est
    // ce popup qui doit suivre trouverBilletValidePourDate, pas l'inverse.
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

// #corrigé (cohérence avec le reste du projet, "un doublon fusionné garde
// le même CNI — sans filtrer fusionneDans, cette résolution peut retomber
// sur la fiche fusionnée (stale) plutôt que sur la fiche conservée") : même
// garde que hospito-admin::trouverPatientParCni.
export async function trouverMaFicheId(patientUid, etablissementId) {
  const userSnap = await getDoc(doc(db, 'users', patientUid));
  const cni = userSnap.exists() ? userSnap.data().numeroIdentiteNational : null;
  if (!cni) return null;

  const fichesSnap = await getDocs(query(
    collection(db, 'patients'),
    where('etablissementId', '==', etablissementId),
    where('numeroIdentiteNational', '==', cni),
  ));
  const fiche = fichesSnap.docs.find((d) => !d.data().fusionneDans);
  return fiche ? fiche.id : null;
}

export async function trouverBilletValideDuPatient(patientUid, etablissementId, serviceId) {
  const ficheId = await trouverMaFicheId(patientUid, etablissementId);
  if (!ficheId) return null;
  return trouverBilletValidePourFicheId(ficheId, etablissementId, serviceId);
}

// #nouveau (décision utilisateur, "garder l'exigence de billet pour la
// téléconsultation, mais permettre d'en créer un à distance") : jusqu'ici,
// seul l'accueil pouvait créer un billet (obligatoirement un passage
// physique) — la téléconsultation, qui exige désormais un billet valide
// tout comme le présentiel, ne pouvait donc jamais aboutir. Un patient qui
// a déjà une fiche dans cet établissement (via une inscription validée ou
// une visite passée) peut désormais payer lui-même son billet, sans jamais
// se déplacer. Même schéma que billetsSessionService.js::creerBillet
// (hospito-accueil-medecin) : billet 'a_payer' + facture 'en_attente' liés
// dans le même writeBatch, 'arrive' direct si aucun tarif n'existe pour ce
// service (gratuit).
export async function creerBilletADistance({ ficheId, patientUid, patientNom, etablissementId, serviceId, serviceNom }) {
  const tarifs = await listerTarifsConsultation(etablissementId);
  const tarif = tarifs.find((t) => t.serviceId === serviceId) || null;

  const batch = writeBatch(db);
  const billetRef = doc(collection(db, 'billets_session'));
  batch.set(billetRef, {
    etablissementId, patientId: ficheId, patientNom, serviceId, serviceNom: serviceNom || null,
    medecinId: null, medecinNom: null,
    statut: tarif ? 'a_payer' : 'arrive',
    factureId: null, parametres: null, parametresAt: null,
    creePar: null, consultePar: null, consulteAt: null,
    createdAt: serverTimestamp(),
  });

  if (tarif) {
    const factureRef = doc(collection(db, 'factures'));
    batch.set(factureRef, {
      etablissementId, patientUid, patientNom,
      serviceId, serviceNom: serviceNom || null, tarifId: tarif.id,
      libelle: `Consultation à distance — ${serviceNom || ''}`.trim(), montant: tarif.montant,
      statut: 'en_attente', billetSessionId: billetRef.id,
      creePar: null, createdAt: serverTimestamp(),
    });
    batch.update(billetRef, { factureId: factureRef.id });
  }

  await batch.commit();
  return { billetId: billetRef.id, factureAPayer: !!tarif };
}

// Pour un proche (fiche déjà connue, pas de CNI/compte à résoudre) — le
// tuteur choisit ce proche dans le sélecteur "Pour qui ?" de TabRdv.
export async function trouverBilletValidePourFiche(ficheId, etablissementId, serviceId) {
  if (!ficheId) return null;
  return trouverBilletValidePourFicheId(ficheId, etablissementId, serviceId);
}
