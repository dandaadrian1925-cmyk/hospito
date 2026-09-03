import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

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
