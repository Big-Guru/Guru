import { db } from './src/lib/firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

async function clearProjects() {
  console.log('Connexion à Firebase en cours pour supprimer tous les projets...');
  try {
    const snapshot = await getDocs(collection(db, 'projects'));
    let count = 0;
    
    for (const document of snapshot.docs) {
      await deleteDoc(doc(db, 'projects', document.id));
      console.log(`- Projet supprimé : ${document.id}`);
      count++;
    }
    
    console.log(`\nOpération terminée avec succès ! ${count} projets ont été supprimés.`);
    process.exit(0);
  } catch (err) {
    console.error("Erreur lors de la suppression :", err);
    process.exit(1);
  }
}

clearProjects();
