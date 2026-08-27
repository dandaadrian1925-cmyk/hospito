import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

export async function creerDemandeRdv({ etablissementId, patientUid, patientNom, motif, dateSouhaitee }) {
  await addDoc(collection(db, 'demandes_rendez_vous'), {
    etablissementId,
    patientUid,
    patientNom,
    motif: motif.trim(),
    dateSouhaitee: dateSouhaitee || null,
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
