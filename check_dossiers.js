import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
const firebaseConfig = {
  apiKey: "AIzaSyBVkIA3GJg7W0jxa8Dji6yNBOEPaSb0hAs",
  authDomain: "big-guru.firebaseapp.com",
  projectId: "big-guru",
  storageBucket: "big-guru.firebasestorage.app",
  messagingSenderId: "855059208185",
  appId: "1:855059208185:web:32bb89000ac5a876c54f28"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
async function run() {
  const snapshot = await getDocs(collection(db, 'dossiers'));
  console.log("Total dossiers:", snapshot.size);
  snapshot.forEach(doc => {
    console.log(doc.id, doc.data().createdAt, doc.data().encaissementIds);
  });
  process.exit(0);
}
run().catch(console.error);
