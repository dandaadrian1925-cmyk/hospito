import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

export async function creerDemandeRdv({ etablissementId, patientUid, patientNom, serviceId, serviceNom, motif, dateSouhaitee, type }) {
  await addDoc(collection(db, 'demandes_rendez_vous'), {
    etablissementId,
    patientUid,
    patientNom,
    serviceId: serviceId || null,
    serviceNom: serviceNom || null,
    motif: motif.trim(),
    dateSouhaitee: dateSouhaitee || null,
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
