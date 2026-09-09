import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getSettingsEtablissement } from './settingsService';

export async function creerDemandeRdv({ etablissementId, patientUid, patientNom, serviceId, serviceNom, motif, dateSouhaitee, type, medecinPrefereId, medecinPrefereNom }) {
  await addDoc(collection(db, 'demandes_rendez_vous'), {
    etablissementId,
    patientUid,
    patientNom,
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
