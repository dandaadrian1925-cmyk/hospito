import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getSettingsEtablissement } from './settingsService';
import { notifierPersonnel } from './notificationsService';

export async function creerDemandeRdv({ etablissementId, patientUid, patientNom, patientFicheId, serviceId, serviceNom, motif, dateSouhaitee, type, medecinPrefereId, medecinPrefereNom }) {
  await addDoc(collection(db, 'demandes_rendez_vous'), {
    etablissementId,
    patientUid,
    patientNom,
    // #nouveau (demande utilisateur, "un bébé ou une personne âgée sans
    // compte doit aussi pouvoir être pris en compte") : présent quand la
    // demande est faite par un TUTEUR pour un proche (patientNom porte
    // alors le nom du proche, pas celui du tuteur) — patientUid reste
    // toujours celui du tuteur (propriété/visibilité de la demande).
    // Vérifié côté serveur (firestore.rules) : ne peut référencer qu'un
    // proche réellement lié à ce tuteur (geePar).
    patientFicheId: patientFicheId || null,
    serviceId: serviceId || null,
    serviceNom: serviceNom || null,
    motif: motif.trim(),
    dateSouhaitee: dateSouhaitee || null,
    // Choisi par le patient parmi les spécialistes de garde (planning) —
    // une préférence, pas une affectation : l'accueil confirme toujours la
    // demande lui-même (medecinId sur le document ne devient définitif qu'à
    // ce moment-là, cf. confirmerDemande côté hospito-accueil-medecin).
    medecinPrefereId: medecinPrefereId || null,
    medecinPrefereNom: medecinPrefereNom || null,
    // §4.14 — 'teleconsultation' déclenche l'appel vidéo une fois la demande
    // confirmée par l'accueil (medecinId assigné) ; 'presentiel' par défaut.
    type: type === 'teleconsultation' ? 'teleconsultation' : 'presentiel',
    statut: 'en_attente',
    createdAt: serverTimestamp(),
  });
  // #nouveau (demande utilisateur, "toutes les notifications soient
  // fonctionnelles pour toutes les opérations") : jusqu'ici, une nouvelle
  // demande n'était visible qu'en rouvrant hospito-accueil-medecin.
  notifierPersonnel(etablissementId, ['accueil', 'admin'], {
    type: 'rendezvous', titre: 'Nouvelle demande de rendez-vous',
    message: `${patientNom} demande un rendez-vous${serviceNom ? ` (${serviceNom})` : ''}.`,
    link: '/rendez-vous',
  });
}

// #corrigé (retour utilisateur, "ce n'est pas ce que tu as fait — un
// patient ne doit pas pouvoir prendre deux rendez-vous pour le MÊME SERVICE
// le même jour") : vérifiait `medecinPrefereId` (une simple préférence,
// souvent absente ou différente d'un essai à l'autre) au lieu de
// `serviceId` — deux demandes visant le même service le même jour passaient
// donc si le médecin préféré différait, exactement le scénario de test qui
// a produit les doublons chez l'accueil. Ne s'applique que si un service
// précis est choisi ("Non précisé" ne bloque rien, ambigu par nature). Une
// demande 'refuse' ne bloque jamais une nouvelle tentative ; 'en_attente'
// et 'confirme' si. `patientFicheId` distingue les demandes faites pour un
// PROCHE (cf. TabRdv "Pour qui ?") de celles pour le titulaire du compte.
export async function existeDejaDemandeMemeJourService(patientUid, serviceId, dateSouhaitee, patientFicheId = null) {
  if (!serviceId || !dateSouhaitee) return false;
  const demandes = await getMesDemandesRdv(patientUid);
  return demandes.some((d) => d.serviceId === serviceId
    && d.dateSouhaitee === dateSouhaitee
    && (d.patientFicheId || null) === (patientFicheId || null)
    && (d.statut === 'en_attente' || d.statut === 'confirme'));
}

export async function getMesDemandesRdv(patientUid) {
  const q = query(
    collection(db, 'demandes_rendez_vous'),
    where('patientUid', '==', patientUid),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Rappels automatiques de rendez-vous (§4.4) — même limite d'infrastructure
// que les rappels de médicaments (aucune tâche planifiée dans ce projet) :
// pas de notification poussée exactement à l'échéance configurée, mais un
// rappel fiable et honnête à chaque ouverture de l'app pour tout RDV confirmé
// dans cette fenêtre. Configurable par établissement (paramètres métiers,
// hospito-super-admin) — un patient pouvant avoir des rendez-vous dans
// PLUSIEURS établissements, chaque RDV est comparé à la fenêtre de SON
// PROPRE établissement plutôt qu'une seule valeur globale. Défaut 24h si
// jamais configuré (cf. DEFAULTS_ETABLISSEMENT, settingsService.js).
export async function getMesRendezVousAVenir(patientUid) {
  const demandes = await getMesDemandesRdv(patientUid);
  const maintenant = Date.now();
  const confirmes = demandes
    .filter((d) => d.statut === 'confirme' && d.dateHeure?.toDate)
    .map((d) => ({ ...d, dateHeureMs: d.dateHeure.toDate().getTime() }));

  const etablissementIds = [...new Set(confirmes.map((d) => d.etablissementId).filter(Boolean))];
  const fenetres = {};
  await Promise.all(etablissementIds.map(async (id) => {
    fenetres[id] = (await getSettingsEtablissement(id)).delaiRappelRendezVousHeures * 3600 * 1000;
  }));

  return confirmes
    .filter((d) => {
      const fenetreMs = fenetres[d.etablissementId] ?? 24 * 3600 * 1000;
      return d.dateHeureMs >= maintenant && d.dateHeureMs <= maintenant + fenetreMs;
    })
    .sort((a, b) => a.dateHeureMs - b.dateHeureMs);
}
