import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

export async function soumettreDemandeEtablissement({
  nomEtablissement,
  ville,
  adresse,
  contactNom,
  contactEmail,
  contactTelephone,
  message,
}) {
  await addDoc(collection(db, 'demandes_etablissement'), {
    nomEtablissement: nomEtablissement.trim(),
    ville: ville.trim(),
    adresse: adresse?.trim() || '',
    contactNom: contactNom.trim(),
    contactEmail: contactEmail.trim(),
    contactTelephone: contactTelephone?.trim() || '',
    message: message?.trim() || '',
    statut: 'en_attente',
    createdAt: serverTimestamp(),
  });
}
