import { collection, addDoc, query, where, orderBy, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

// #nouveau (demande utilisateur, "panier self-service pharmacie") :
// médicaments prescrits, visibles ici selon le même principe que les
// examens ci-dessous (patientUid copié depuis la fiche interne au moment de
// la prescription — voir hospito-medecin/prescriptionsService.js).
export const getMesLignesPrescription = async (patientUid) => {
  const q = query(collection(db, 'lignes_prescription'), where('patientUid', '==', patientUid), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// Rappels de prise de médicaments après la sortie (§5.2) — `frequence`/`duree`
// sont du texte libre saisi par le médecin (ex. "3x/jour", "7 jours"), jamais
// structuré en horaires précis : sans infrastructure de tâches planifiées
// dans ce projet (aucune Cloud Function, cf. mémoire), un rappel à l'heure
// exacte n'est pas réalisable honnêtement. Ce qui EST réalisable et fiable :
// une fenêtre "traitement en cours" (delivreAt -> delivreAt + durée estimée),
// affichée comme rappel passif à chaque ouverture de l'app plutôt qu'une
// notification poussée à un instant précis.
const DUREE_PAR_DEFAUT_JOURS = 7;
const extraireDureeJours = (duree) => {
  const m = String(duree || '').match(/(\d+)\s*j/i);
  return m ? parseInt(m[1], 10) : DUREE_PAR_DEFAUT_JOURS;
};

export const getTraitementsEnCours = async (patientUid) => {
  const lignes = await getMesLignesPrescription(patientUid);
  const maintenant = Date.now();
  return lignes.filter((l) => {
    if (l.statut !== 'delivre' || !l.delivreAt?.toDate) return false;
    const finFenetre = l.delivreAt.toDate().getTime() + extraireDureeJours(l.duree) * 86400000;
    return maintenant <= finFenetre;
  });
};

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
    // #nouveau (demande utilisateur, "Facturation filtrée par service géré") :
    // copié depuis l'examen (lui-même dérivé du médecin prescripteur,
    // hospito-medecin::demanderExamen) — jamais choisi par le patient.
    serviceId: examen.serviceId || null,
    serviceNom: examen.serviceNom || null,
    libelle: examen.nature,
    montant: examen.montant,
    statut: 'en_attente',
    createdAt: serverTimestamp(),
  });
  return ref.id;
};
