import { collection, doc, setDoc, getDocs, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

// Sécurité personnelle — distinct des réclamations (qualité de service) :
// un signalement peut concerner n'importe quel membre du personnel, traité
// uniquement par admin/direction (cf. firestore.rules).
export async function ouvrirSignalementSecurite({ patientUid, etablissementId, typeIncident, description, lieu }) {
  const ref = doc(collection(db, 'signalements_securite'));
  await setDoc(ref, {
    patientUid,
    etablissementId,
    typeIncident,
    description: description.trim(),
    lieu: lieu?.trim() || null,
    statut: 'ouvert',
    decision: null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getSignalementsSecuritePatient(patientUid) {
  const q = query(collection(db, 'signalements_securite'), where('patientUid', '==', patientUid), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
