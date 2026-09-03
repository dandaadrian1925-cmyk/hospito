import { collection, addDoc, query, where, orderBy, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

// Examens prescrits par un médecin (hospito-medecin) et visibles ici
// uniquement si la fiche patient était liée à ce compte au moment de la
// prescription (patientUid) — voir rechercherCompteAppParCni côté
// hospito-admin. Un examen sans facture encore créée peut être payé
// directement par le patient (voir creerFactureExamen), au montant EXACT du
// catalogue de tarifs — vérifié côté serveur (firestore.rules), jamais
// manipulable ici.
export const getMesExamens = async (patientUid) => {
  const q = query(collection(db, 'examens'), where('patientUid', '==', patientUid), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const creerFactureExamen = async (examen) => {
  const ref = await addDoc(collection(db, 'factures'), {
    etablissementId: examen.etablissementId,
    patientUid: examen.patientUid,
    examenId: examen.id,
    libelle: examen.nature,
    montant: examen.montant,
    statut: 'en_attente',
    createdAt: serverTimestamp(),
  });
  return ref.id;
};
