import { collection, doc, setDoc, getDocs, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { uploadFile } from '../supabase/config';
import { notifierPersonnel } from './notificationsService';

export async function ouvrirReclamation({ patientUid, etablissementId, sujet, description, preuvePhotos = [] }) {
  const reclamationRef = doc(collection(db, 'reclamations'));
  const preuveUrls = [];
  for (let i = 0; i < preuvePhotos.length; i++) {
    // Bucket "reclamations" dédié (fonction hospito-secure-upload-url) — le
    // chemin doit commencer par "{uid}/" (vérifié côté serveur), d'où l'ordre
    // patientUid d'abord, reclamationId ensuite pour ne garder qu'un identifiant lisible.
    const upload = await uploadFile('reclamations', `${patientUid}/${reclamationRef.id}_${Date.now()}_${i}`, preuvePhotos[i]);
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
  // #nouveau (demande utilisateur, "toutes les notifications soient
  // fonctionnelles pour toutes les opérations") : jusqu'ici, une nouvelle
  // réclamation n'était visible qu'en rouvrant hospito-admin.
  notifierPersonnel(etablissementId, ['admin'], {
    type: 'reclamation', titre: 'Nouvelle réclamation',
    message: `Nouvelle réclamation : ${sujet.trim()}`,
    link: '/reclamations',
  });
  return reclamationRef.id;
}

export async function getReclamationsPatient(patientUid) {
  const q = query(collection(db, 'reclamations'), where('patientUid', '==', patientUid), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
