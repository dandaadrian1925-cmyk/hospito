import { collection, doc, setDoc, getDocs, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { uploadFile } from '../supabase/config';

export async function ouvrirReclamation({ patientUid, etablissementId, sujet, description, preuvePhotos = [] }) {
  const reclamationRef = doc(collection(db, 'reclamations'));
  const preuveUrls = [];
  for (let i = 0; i < preuvePhotos.length; i++) {
    // Réutilise le bucket Supabase "litiges" (déjà autorisé pour
    // photo/vidéo) plutôt que de créer un nouveau bucket dédié — pas
    // d'infra Supabase supplémentaire nécessaire pour cette fonctionnalité.
    const upload = await uploadFile('litiges', `reclamations/${reclamationRef.id}/${Date.now()}_${i}`, preuvePhotos[i]);
    preuveUrls.push(upload.publicUrl);
  }
  await setDoc(reclamationRef, {
    patientUid,
    etablissementId,
    sujet: sujet.trim(),
    description: description.trim(),
    preuveUrls,
    statut: 'ouvert',
    decision: null,
    createdAt: serverTimestamp(),
  });
  return reclamationRef.id;
}

export async function getReclamationsPatient(patientUid) {
  const q = query(collection(db, 'reclamations'), where('patientUid', '==', patientUid), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
