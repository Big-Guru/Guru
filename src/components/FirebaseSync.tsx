import { useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { useStore } from '../store';
import { Client, Project, Mission } from '../types';

export default function FirebaseSync() {
  const { setClients, setProjects, setMissions, setDossiersPaiement } = useStore();

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) return;

      // Sync Clients
      const qClients = query(collection(db, 'clients'));
      const unsubClients = onSnapshot(qClients, (snapshot) => {
        const clientsList: Client[] = [];
        snapshot.forEach(doc => {
          clientsList.push({ id: doc.id, ...doc.data() } as Client);
        });
        setClients(clientsList);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'clients'));

      // Sync Projects
      const qProjects = query(collection(db, 'projects'));
      const unsubProjects = onSnapshot(qProjects, (snapshot) => {
        const projectsList: Project[] = [];
        snapshot.forEach(doc => {
          projectsList.push({ id: doc.id, ...doc.data() } as Project);
        });
        setProjects(projectsList);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'projects'));

      // Sync Missions
      const qMissions = query(collection(db, 'missions'));
      const unsubMissions = onSnapshot(qMissions, (snapshot) => {
        const missionsList: Mission[] = [];
        snapshot.forEach(doc => {
          missionsList.push({ id: doc.id, ...doc.data() } as Mission);
        });
        setMissions(missionsList);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'missions'));

      // Sync Dossiers Paiement
      const qDossiers = query(collection(db, 'dossiers'));
      const unsubDossiers = onSnapshot(qDossiers, (snapshot) => {
        const dossiersList: any[] = [];
        snapshot.forEach(doc => {
          dossiersList.push({ id: doc.id, ...doc.data() });
        });
        setDossiersPaiement(dossiersList);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'dossiers'));

      return () => {
        unsubClients();
        unsubProjects();
        unsubMissions();
        unsubDossiers();
      };
    });

    return () => unsubscribeAuth();
  }, [setClients, setProjects, setMissions]);

  return null;
}
