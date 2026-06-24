import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Client, Project, MaintenanceInfo, Mission, Phase, ProjectTask, DossierPaiement, EncaissementRecord } from './types';
import { db, auth, handleFirestoreError, OperationType } from './lib/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

// Helper to create an empty document tracking object
export const createEmptyDoc = () => ({ status: 'MISSING' as const });

export const getDefaultPhases = (mode: string): Phase[] => {
  const getTasks = (phase: string): ProjectTask[] => {
    const tasks: ProjectTask[] = [];
    const add = (name: string) => tasks.push({ id: uuidv4(), name, date: '', status: 'PENDING' });
    
    if (phase === 'Démarchage') {
      add('Entrevue Commerciale');
    } else if (phase === 'Adaptation') {
      add('Récupération données');
      add('Récupération Serveur');
      add('Installation serveur');
      add('Formation');
    } else if (phase === 'Encaissement') {
      add('Proforma à rédiger, à faire valider par la DFC et à transmettre au client');
      add('Dossier Soumission(s) à préparer. Soumission(s) complétées à scanner');
      add('Coordonnées du client à compléter (Adresse exacte, Numéro agrément, AI, NIF, NIS)');
      add('Convention à compléter, scanner et à transmettre au client.');
      add('Récupérer ensuite un exemplaire de convention signé par les deux parties.');
      add('Bon de commande / ODS signé à récupérer');
      add('Facture définitive à créer et déposer au client');
      add('Récupérer Service fait de chez le client');
    } else if (phase === 'Recouvrement') {
      add('Relance Client');
    }
    return tasks;
  };

  if (mode === 'Acquisition') {
    return [
      { id: uuidv4(), name: 'Démarchage', status: 'ACTIVE', tasks: getTasks('Démarchage') },
      { id: uuidv4(), name: 'Adaptation', status: 'PENDING', tasks: getTasks('Adaptation') },
      { id: uuidv4(), name: 'Encaissement', status: 'PENDING', tasks: getTasks('Encaissement') },
      { id: uuidv4(), name: 'Recouvrement', status: 'PENDING', tasks: getTasks('Recouvrement') },
    ];
  } else if (mode === 'Maintenance offerte') {
    return []; // Aucune tâche pour la maintenance offerte
  } else if (mode === 'Maintenance') {
    return [
      { id: uuidv4(), name: 'Encaissement', status: 'ACTIVE', tasks: getTasks('Encaissement') },
      { id: uuidv4(), name: 'Recouvrement', status: 'PENDING', tasks: getTasks('Recouvrement') },
    ];
  }
  return [];
};

interface AppState {
  clients: Client[];
  projects: Project[];
  missions: Mission[];
  setClients: (clients: Client[]) => void;
  setProjects: (projects: Project[]) => void;
  setMissions: (missions: Mission[]) => void;
  addClient: (client: Omit<Client, 'id'>) => void;
  updateClient: (id: string, data: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  addProject: (project: Omit<Project, 'id' | 'contracts' | 'contacts' | 'documents' | 'history'>) => void;
  updateProject: (id: string, data: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  addContract: (projectId: string, contract: { name: string; type: string }) => void;
  updateContractStatus: (projectId: string, contractId: string, status: 'ACTIVE' | 'CLOSED') => void;
  togglePhaseStatus: (projectId: string, contractId: string, phaseId: string) => void;
  addTaskToContract: (projectId: string, contractId: string, phaseId: string, task: Omit<ProjectTask, 'id'>) => void;
  updateTaskInContract: (projectId: string, contractId: string, phaseId: string, taskId: string, data: Partial<ProjectTask>) => void;
  evaluateAutomations: (projectId: string) => void;
  addProjectContact: (projectId: string, contact: Omit<ProjectContact, 'id'>) => void;
  deleteProjectContact: (projectId: string, contactId: string) => void;
  addProjectDocument: (projectId: string, document: Omit<ProjectDocument, 'id'>) => void;
  deleteProjectDocument: (projectId: string, documentId: string) => void;
  addHistoryEvent: (projectId: string, message: string) => void;
  addMaintenance: (projectId: string, year: number, startDate: string) => void;
  updateMaintenance: (projectId: string, maintenanceId: string, data: Partial<MaintenanceInfo>) => void;
  deleteMaintenance: (projectId: string, maintenanceId: string) => void;
  syncMaintenances: (projectId: string) => void;
  addMission: (mission: Omit<Mission, 'id'>) => void;
  updateMission: (id: string, data: Partial<Mission>) => void;
  deleteMission: (id: string) => void;
  dossiersPaiement: DossierPaiement[];
  setDossiersPaiement: (dossiers: DossierPaiement[]) => void;
  addDossierPaiement: (dossier: Omit<DossierPaiement, 'id' | 'createdAt'>) => void;
  updateDossierPaiement: (id: string, data: Partial<DossierPaiement>) => void;
  deleteDossierPaiement: (id: string) => void;
  updateEncaissement: (projectId: string, encaissementId: string, data: Partial<EncaissementRecord>) => void;
  generateMaintenanceEncaissement: (projectId: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      clients: [],
      projects: [],
      missions: [],
      dossiersPaiement: [],
      setClients: (clients) => set({ clients }),
      setProjects: (projects) => set({ projects }),
      setMissions: (missions) => set({ missions }),
      setDossiersPaiement: (dossiersPaiement) => set({ dossiersPaiement }),
      addClient: async (clientData) => {
        const id = uuidv4();
        const { auth, db, handleFirestoreError, OperationType } = await import('./lib/firebase');
        const { doc, setDoc } = await import('firebase/firestore');
        const ownerId = auth.currentUser?.uid;

        const newClient = { ...clientData, id, ownerId };

        if (ownerId) {
          try {
            await setDoc(doc(db, 'clients', id), newClient);
            return; // Let Firebase onSnapshot handle state update
          } catch (e) {
            handleFirestoreError(e, OperationType.CREATE, 'clients');
          }
        }

        set((state) => ({
          clients: [...state.clients, newClient]
        }));
      },
      updateClient: async (id, data) => {
        const { db, handleFirestoreError, OperationType } = await import('./lib/firebase');
        const { doc, setDoc } = await import('firebase/firestore');
        try {
          await setDoc(doc(db, 'clients', id), data, { merge: true });
        } catch (e) {
          handleFirestoreError(e, OperationType.UPDATE, `clients/${id}`);
        }
        set((state) => ({
          clients: state.clients.map((c) => (c.id === id ? { ...c, ...data } : c)),
        }));
      },
      deleteClient: async (id) => {
        const { db, handleFirestoreError, OperationType } = await import('./lib/firebase');
        const { doc, deleteDoc } = await import('firebase/firestore');
        try {
          await deleteDoc(doc(db, 'clients', id));

          // Delete related projects from Firebase
          const state = get();
          const projectsToDelete = state.projects.filter(p => p.clientId === id);
          projectsToDelete.forEach(p => {
            deleteDoc(doc(db, 'projects', p.id)).catch(e => console.error(e));
          });
        } catch (e) {
          handleFirestoreError(e, OperationType.DELETE, `clients/${id}`);
        }
        set((state) => ({
          clients: state.clients.filter((c) => c.id !== id),
          projects: state.projects.filter((p) => p.clientId !== id),
        }));
      },
      addProject: async (projectData) => {
        const id = uuidv4();
        const ownerId = auth.currentUser?.uid;

        const initialDate = projectData.installationDate || new Date().toISOString().split('T')[0];

        const initialContracts = [
          {
            id: uuidv4(),
            name: "Acquisition",
            type: "Acquisition",
            mode: "Acquisition" as const,
            status: "ACTIVE" as const,
            startDate: initialDate,
            phase: "Démarchage" as any,
            phases: getDefaultPhases("Acquisition"),
            tasks: [],
            documents: {}
          },
          {
            id: uuidv4(),
            name: "Maintenance Gratuite",
            type: "Maintenance offerte",
            mode: "Maintenance offerte" as const,
            status: "PENDING" as const,
            startDate: "", // Sera défini 6 mois après Formation
            phase: "Adaptation" as any,
            phases: getDefaultPhases("Maintenance offerte"),
            tasks: [],
            documents: {}
          },
          {
            id: uuidv4(),
            name: "Maintenance Annuelle",
            type: "Maintenance",
            mode: "Maintenance" as const,
            status: "PENDING" as const,
            startDate: "", // Sera défini 1 an après Maintenance Gratuite
            phase: "Adaptation" as any,
            phases: getDefaultPhases("Maintenance"),
            tasks: [],
            documents: {}
          }
        ];

        // Format createdAt to fr-FR date string
        let formattedCreatedAt = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR');
        if (projectData.createdAt) {
          const parsedCreate = new Date(projectData.createdAt);
          if (!isNaN(parsedCreate.getTime())) {
            formattedCreatedAt = parsedCreate.toLocaleDateString('fr-FR');
          }
        }

        const newProject: Project = {
          ...projectData,
          id,
          ownerId: ownerId || undefined,
          status: 'Actif',
          createdAt: new Date().toISOString().split('T')[0],
          contracts: initialContracts,
          contacts: [],
          documents: [],
          history: [
            {
              id: uuidv4(),
              date: new Date().toLocaleDateString('fr-FR'),
              message: "Projet initialisé dans le CRM"
            }
          ],
          acqProforma: createEmptyDoc(),
          acqSoumission: createEmptyDoc(),
          acqConvention: createEmptyDoc(),
          acqBcOds: createEmptyDoc(),
          acqFacture: createEmptyDoc(),
          acqServiceFait: createEmptyDoc(),
          acqAbe: createEmptyDoc(),
          acqEncaissement: { status: 'PENDING' },
          maintenances: [],
        };

        const cleanProject = JSON.parse(JSON.stringify(newProject));

        if (auth.currentUser) {
          try {
            await setDoc(doc(db, 'projects', id), cleanProject);
          } catch (e) {
            console.error("Erreur Firebase setDoc:", e);
            alert("Erreur lors de l'enregistrement dans la base de données. " + String(e));
            handleFirestoreError(e, OperationType.CREATE, 'projects');
            return;
          }
        } else {
          alert("Erreur : Vous n'êtes pas connecté à la base de données.");
          return;
        }

        set((state) => {
          if (state.projects.find(p => p.id === cleanProject.id)) return state;
          return { projects: [...state.projects, cleanProject] };
        });
      },
      updateProject: async (id, data) => {
        set((state) => ({
          projects: state.projects.map((p) => (p.id === id ? { ...p, ...data } : p)),
        }));
        try {
          await setDoc(doc(db, 'projects', id), data, { merge: true });
        } catch (e) {
          handleFirestoreError(e, OperationType.UPDATE, `projects/${id}`);
        }
      },
      addContract: (projectId, contractData) => {
        const state = get();
        const project = state.projects.find(p => p.id === projectId);
        if (!project) return;

        const newContract = {
          ...contractData,
          id: uuidv4(),
          status: 'ACTIVE' as const,
          tasks: contractData.mode && contractData.phase ? getDefaultTasks(contractData.mode, contractData.phase) : []
        };
        const contracts = [...(project.contracts || []), newContract];

        const newHistory = [
          ...(project.history || []),
          {
            id: uuidv4(),
            date: new Date().toLocaleDateString('fr-FR'),
            message: `Contrat créé : ${contractData.name}`
          }
        ];

        state.updateProject(projectId, { contracts, history: newHistory });
      },
      togglePhaseStatus: (projectId, contractId, phaseId) => {
        const state = get();
        const project = state.projects.find(p => p.id === projectId);
        if (!project || !project.contracts) return;

        const currentContracts = [...project.contracts];
        const contractIndex = currentContracts.findIndex(c => c.id === contractId);
        if (contractIndex === -1) return;

        const contract = { ...currentContracts[contractIndex] };
        const phases = [...contract.phases];
        const phaseIndex = phases.findIndex(p => p.id === phaseId);
        if (phaseIndex === -1) return;

        const isCurrentlyDone = phases[phaseIndex].status === 'DONE';

        if (isCurrentlyDone) {
          // Rouvrir la phase
          phases[phaseIndex] = { ...phases[phaseIndex], status: 'ACTIVE' };
          let message = `Phase "${phases[phaseIndex].name}" rouverte.`;
          
          if (contract.status === 'DONE') {
            contract.status = 'ACTIVE';
            message += ` Contrat "${contract.name}" rouvert.`;
          }

          contract.phases = phases;
          currentContracts[contractIndex] = contract;

          const newHistory = [
            ...(project.history || []),
            { id: uuidv4(), date: new Date().toLocaleDateString('fr-FR'), message }
          ];

          state.updateProject(projectId, { contracts: currentContracts, history: newHistory });
        } else {
          // Clôturer la phase et passer à la suivante
          phases[phaseIndex] = { ...phases[phaseIndex], status: 'DONE' };
          let message = `Phase "${phases[phaseIndex].name}" terminée.`;

          if (phaseIndex === phases.length - 1) {
            contract.status = 'DONE';
            message += ` Contrat "${contract.name}" clôturé.`;
          } else {
            phases[phaseIndex + 1] = { 
              ...phases[phaseIndex + 1], 
              status: 'ACTIVE',
              startDate: phases[phaseIndex + 1].startDate || new Date().toISOString().split('T')[0] 
            };
            message += ` Phase "${phases[phaseIndex + 1].name}" démarrée.`;
          }

          contract.phases = phases;
          currentContracts[contractIndex] = contract;

          const newHistory = [
            ...(project.history || []),
            { id: uuidv4(), date: new Date().toLocaleDateString('fr-FR'), message }
          ];

          state.updateProject(projectId, { contracts: currentContracts, history: newHistory });
        }

        get().evaluateAutomations(projectId);
      },
      updateContractStatus: (projectId, contractId, status) => {
        const state = get();
        const project = state.projects.find(p => p.id === projectId);
        if (!project) return;

        let updatedContracts = (project.contracts || []).map(c =>
          c.id === contractId ? { ...c, status } : c
        );

        const contract = (project.contracts || []).find(c => c.id === contractId);

        const newHistory = [
          ...(project.history || []),
          {
            id: uuidv4(),
            date: new Date().toLocaleDateString('fr-FR'),
            message: `Carte ${contract?.name || ''} : ${status}`
          }
        ];

        state.updateProject(projectId, {
          contracts: updatedContracts,
          history: newHistory
        });
      },
      addTaskToContract: (projectId, contractId, phaseId, taskData) => {
        const state = get();
        const project = state.projects.find(p => p.id === projectId);
        if (!project) return;

        const newTask = {
          ...taskData,
          id: uuidv4()
        };

        const updatedContracts = (project.contracts || []).map(c => {
          if (c.id !== contractId) return c;
          return {
            ...c,
            phases: c.phases.map(ph => {
              if (ph.id !== phaseId) return ph;
              return { ...ph, tasks: [...ph.tasks, newTask] };
            })
          };
        });

        const contract = (project.contracts || []).find(c => c.id === contractId);
        const newHistory = [
          ...(project.history || []),
          {
            id: uuidv4(),
            date: new Date().toLocaleDateString('fr-FR'),
            message: `Tâche "${taskData.name}" ajoutée au contrat ${contract?.name || ''}`
          }
        ];

        state.updateProject(projectId, { contracts: updatedContracts, history: newHistory });
        get().evaluateAutomations(projectId);
      },
      updateTaskInContract: (projectId, contractId, phaseId, taskId, taskUpdates) => {
        const state = get();
        const project = state.projects.find(p => p.id === projectId);
        if (!project) return;

        let taskName = '';
        let oldStatus = '';
        let newStatus = '';

        const updatedContracts = (project.contracts || []).map(c => {
          if (c.id !== contractId) return c;
          return {
            ...c,
            phases: c.phases.map(ph => {
              if (ph.id !== phaseId) return ph;
              return {
                ...ph,
                tasks: ph.tasks.map(t => {
                  if (t.id === taskId) {
                    taskName = t.name;
                    oldStatus = t.status;
                    newStatus = taskUpdates.status || t.status;
                    return { ...t, ...taskUpdates };
                  }
                  return t;
                })
              };
            })
          };
        });

        const contract = (project.contracts || []).find(c => c.id === contractId);
        const historyMsg = taskUpdates.status && oldStatus !== newStatus
          ? `Tâche "${taskName}" du contrat "${contract?.name || ''}" mise à jour : ${newStatus}`
          : `Tâche "${taskName}" du contrat "${contract?.name || ''}" modifiée`;

        const newHistory = [
          ...(project.history || []),
          {
            id: uuidv4(),
            date: new Date().toLocaleDateString('fr-FR'),
            message: historyMsg
          }
        ];

        state.updateProject(projectId, { contracts: updatedContracts, history: newHistory });
        get().evaluateAutomations(projectId);
      },
      evaluateAutomations: (projectId) => {
        const state = get();
        const project = state.projects.find(p => p.id === projectId);
        if (!project || !project.contracts) return;

        let updatedContracts = [...project.contracts];
        let hasChanges = false;
        
        // Trouver la date de la tâche Formation
        const acqContract = updatedContracts.find(c => c.mode === 'Acquisition');
        let formationDoneDate: Date | null = null;
        
        if (acqContract) {
          const adaptPhase = acqContract.phases.find(ph => ph.name === 'Adaptation');
          if (adaptPhase) {
            const formationTask = adaptPhase.tasks.find(t => t.name.includes('Formation'));
            if ((formationTask && formationTask.status === 'DONE') || adaptPhase.status === 'DONE') {
              // Si la tâche a une date, l'utiliser, sinon utiliser la date d'aujourd'hui
              formationDoneDate = (formationTask && formationTask.date) ? new Date(formationTask.date) : new Date();
            }
          }
        }

        // Si Formation est DONE, programmer Maintenance Gratuite
        const maintOfferte = updatedContracts.find(c => c.mode === 'Maintenance offerte');
        if (maintOfferte && maintOfferte.status === 'PENDING' && formationDoneDate) {
          const trialDate = new Date(formationDoneDate);
          trialDate.setMonth(trialDate.getMonth() + 6);
          const trialDateStr = trialDate.toISOString().split('T')[0];
          
          if (maintOfferte.startDate !== trialDateStr) {
            maintOfferte.startDate = trialDateStr;
            hasChanges = true;
          }

          // Vérifier si elle doit être activée (la date est passée ou aujourd'hui)
          if (new Date() >= trialDate) {
            maintOfferte.status = 'ACTIVE';
            hasChanges = true;
          }
        }

        // Programmer Maintenance Annuelle
        const maintAnnuelle = updatedContracts.find(c => c.mode === 'Maintenance');
        if (maintAnnuelle && maintAnnuelle.status === 'PENDING' && maintOfferte && maintOfferte.startDate) {
          const maintDate = new Date(maintOfferte.startDate);
          maintDate.setFullYear(maintDate.getFullYear() + 1);
          const maintDateStr = maintDate.toISOString().split('T')[0];
          
          if (maintAnnuelle.startDate !== maintDateStr) {
            maintAnnuelle.startDate = maintDateStr;
            hasChanges = true;
          }

          // Activer si nécessaire
          if (new Date() >= maintDate) {
            maintAnnuelle.status = 'ACTIVE';
            hasChanges = true;
          }
        }

        // --- NOUVEAU LOGIQUE : GÉNÉRATION DES ENCAISSEMENTS ---
        let currentEncaissements = [...(project.encaissements || [])];
        if (formationDoneDate) {
          const acqTargetDate = new Date(formationDoneDate);
          acqTargetDate.setMonth(acqTargetDate.getMonth() + 6);
          
          const maintTargetDate = new Date(formationDoneDate);
          maintTargetDate.setMonth(maintTargetDate.getMonth() + 18);

          // Vérifier si Acquisition Encaissement existe
          if (!currentEncaissements.find(e => e.mode === 'Acquisition')) {
            currentEncaissements.push({
              id: uuidv4(),
              projectId,
              mode: 'Acquisition',
              targetDate: acqTargetDate.toISOString().split('T')[0],
              status: acqTargetDate <= new Date() ? 'IN_PROGRESS' : 'UPCOMING',
              proforma: { status: 'PENDING' },
              bc: { status: 'PENDING' },
              facture: { status: 'PENDING' }
            });
            hasChanges = true;
          }

          // Vérifier si Maintenance 1 Encaissement existe (Year 1)
          if (!currentEncaissements.find(e => e.mode === 'Maintenance' && e.year === 1)) {
            currentEncaissements.push({
              id: uuidv4(),
              projectId,
              mode: 'Maintenance',
              year: 1,
              targetDate: maintTargetDate.toISOString().split('T')[0],
              status: maintTargetDate <= new Date() ? 'IN_PROGRESS' : 'UPCOMING',
              proforma: { status: 'PENDING' },
              bc: { status: 'PENDING' },
              facture: { status: 'PENDING' }
            });
            hasChanges = true;
          }
          
          // Maj des statuts si les dates sont passées pour les UPCOMING existants
          currentEncaissements = currentEncaissements.map(enc => {
            if (enc.status === 'UPCOMING' && new Date(enc.targetDate) <= new Date()) {
              hasChanges = true;
              return { ...enc, status: 'IN_PROGRESS' };
            }
            return enc;
          });
        }

        if (hasChanges) {
          state.updateProject(projectId, { contracts: updatedContracts, encaissements: currentEncaissements });
        }
      },
      addProjectContact: (projectId, contactData) => {
        const state = get();
        const project = state.projects.find(p => p.id === projectId);
        if (!project) return;

        const newContact = {
          ...contactData,
          id: uuidv4()
        };
        const contacts = [...(project.contacts || []), newContact];

        const newHistory = [
          ...(project.history || []),
          {
            id: uuidv4(),
            date: new Date().toLocaleDateString('fr-FR'),
            message: `Contact ajouté : ${contactData.name} (${contactData.role})`
          }
        ];

        state.updateProject(projectId, { contacts, history: newHistory });
      },
      deleteProjectContact: (projectId, contactId) => {
        const state = get();
        const project = state.projects.find(p => p.id === projectId);
        if (!project) return;

        const contactName = project.contacts?.find(c => c.id === contactId)?.name || '';
        const contacts = (project.contacts || []).filter(c => c.id !== contactId);

        const newHistory = [
          ...(project.history || []),
          {
            id: uuidv4(),
            date: new Date().toLocaleDateString('fr-FR'),
            message: `Contact supprimé : ${contactName}`
          }
        ];

        state.updateProject(projectId, { contacts, history: newHistory });
      },
      addProjectDocument: (projectId, documentData) => {
        const state = get();
        const project = state.projects.find(p => p.id === projectId);
        if (!project) return;

        const newDocument = {
          ...documentData,
          id: uuidv4()
        };
        const documents = [...(project.documents || []), newDocument];

        const newHistory = [
          ...(project.history || []),
          {
            id: uuidv4(),
            date: new Date().toLocaleDateString('fr-FR'),
            message: `Document téléversé : ${documentData.name}`
          }
        ];

        state.updateProject(projectId, { documents, history: newHistory });
      },
      deleteProjectDocument: (projectId, documentId) => {
        const state = get();
        const project = state.projects.find(p => p.id === projectId);
        if (!project) return;

        const docName = project.documents?.find(d => d.id === documentId)?.name || '';
        const documents = (project.documents || []).filter(d => d.id !== documentId);

        const newHistory = [
          ...(project.history || []),
          {
            id: uuidv4(),
            date: new Date().toLocaleDateString('fr-FR'),
            message: `Document supprimé : ${docName}`
          }
        ];

        state.updateProject(projectId, { documents, history: newHistory });
      },
      updateEncaissement: (projectId, encaissementId, data) => {
        const state = get();
        const project = state.projects.find(p => p.id === projectId);
        if (!project || !project.encaissements) return;

        const updatedEncaissements = project.encaissements.map(e => 
          e.id === encaissementId ? { ...e, ...data } : e
        );
        state.updateProject(projectId, { encaissements: updatedEncaissements });
      },
      generateMaintenanceEncaissement: (projectId) => {
        // Crée l'encaissement de la maintenance pour l'année suivante (N+1)
        const state = get();
        const project = state.projects.find(p => p.id === projectId);
        if (!project || !project.encaissements) return;
        
        const maintenances = project.encaissements.filter(e => e.mode === 'Maintenance');
        if (maintenances.length === 0) return;
        
        // Trouver la dernière
        const lastMaint = maintenances.reduce((prev, current) => ((prev.year || 1) > (current.year || 1)) ? prev : current);
        
        const nextTargetDate = new Date(lastMaint.targetDate);
        nextTargetDate.setFullYear(nextTargetDate.getFullYear() + 1);
        
        const newEncaissement: EncaissementRecord = {
          id: uuidv4(),
          projectId,
          mode: 'Maintenance',
          year: (lastMaint.year || 1) + 1,
          targetDate: nextTargetDate.toISOString().split('T')[0],
          status: nextTargetDate <= new Date() ? 'IN_PROGRESS' : 'UPCOMING',
          proforma: { status: 'PENDING' },
          bc: { status: 'PENDING' },
          facture: { status: 'PENDING' }
        };
        
        state.updateProject(projectId, { encaissements: [...project.encaissements, newEncaissement] });
      },
      addDossierPaiement: async (dossierData) => {
        const id = uuidv4();
        const { db, handleFirestoreError, OperationType } = await import('./lib/firebase');
        const { doc, setDoc } = await import('firebase/firestore');
        const newDossier: DossierPaiement = {
          ...dossierData,
          id,
          createdAt: new Date().toISOString()
        };
        try {
          await setDoc(doc(db, 'dossiers', id), newDossier);
          set((state) => ({ dossiersPaiement: [...state.dossiersPaiement, newDossier] }));
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, 'Création du dossier de paiement');
        }
      },
      updateDossierPaiement: async (id, data) => {
        const { db, handleFirestoreError, OperationType } = await import('./lib/firebase');
        const { doc, updateDoc } = await import('firebase/firestore');
        try {
          await updateDoc(doc(db, 'dossiers', id), data);
          set((state) => ({
            dossiersPaiement: state.dossiersPaiement.map(d => d.id === id ? { ...d, ...data } : d)
          }));
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, 'Mise à jour du dossier de paiement');
        }
      },
      deleteDossierPaiement: async (id) => {
        const { db, handleFirestoreError, OperationType } = await import('./lib/firebase');
        const { doc, deleteDoc } = await import('firebase/firestore');
        try {
          await deleteDoc(doc(db, 'dossiers', id));
          set((state) => ({
            dossiersPaiement: state.dossiersPaiement.filter(d => d.id !== id)
          }));
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, 'Suppression du dossier de paiement');
        }
      },
      addHistoryEvent: (projectId, message) => {
        const state = get();
        const project = state.projects.find(p => p.id === projectId);
        if (!project) return;

        const newHistory = [
          ...(project.history || []),
          {
            id: uuidv4(),
            date: new Date().toLocaleDateString('fr-FR'),
            message
          }
        ];

        state.updateProject(projectId, { history: newHistory });
      },
      deleteProject: async (id) => {
        const { db, handleFirestoreError, OperationType } = await import('./lib/firebase');
        const { doc, deleteDoc } = await import('firebase/firestore');
        try {
          await deleteDoc(doc(db, 'projects', id));
        } catch (e) {
          handleFirestoreError(e, OperationType.DELETE, `projects/${id}`);
        }
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
        }));
      },
      addMaintenance: async (projectId, year, startDate) => {
        set((state) => {
          const mId = uuidv4();
          const newProjects = state.projects.map((p) => {
            if (p.id !== projectId) return p;
            return {
              ...p,
              contracts: [
                ...(p.contracts || []),
                {
                  id: mId,
                  name: `Maintenance ${year}`,
                  type: "Maintenance",
                  status: "ACTIVE" as const,
                  tasks: []
                }
              ],
              maintenances: [
                ...p.maintenances,
                {
                  id: mId,
                  year,
                  startDate,
                  proforma: createEmptyDoc(),
                  convention: createEmptyDoc(),
                  bcOds: createEmptyDoc(),
                  facture: createEmptyDoc(),
                  encaissement: { status: 'PENDING' as const },
                }
              ]
            };
          });

          import('./lib/firebase').then(({ db, handleFirestoreError, OperationType }) => {
            import('firebase/firestore').then(({ doc, updateDoc }) => {
              const proj = newProjects.find(p => p.id === projectId);
              if (proj) updateDoc(doc(db, 'projects', projectId), { maintenances: proj.maintenances, contracts: proj.contracts }).catch(e => handleFirestoreError(e, OperationType.UPDATE, `projects/${projectId}`));
            });
          });

          return { projects: newProjects };
        });
      },
      updateMaintenance: async (projectId, maintenanceId, data) => {
        set((state) => {
          const newProjects = state.projects.map((p) => {
            if (p.id !== projectId) return p;
            return {
              ...p,
              maintenances: p.maintenances.map((m) => m.id === maintenanceId ? { ...m, ...data } : m)
            }
          });

          import('./lib/firebase').then(({ db, handleFirestoreError, OperationType }) => {
            import('firebase/firestore').then(({ doc, updateDoc }) => {
              const proj = newProjects.find(p => p.id === projectId);
              if (proj) updateDoc(doc(db, 'projects', projectId), { maintenances: proj.maintenances }).catch(e => handleFirestoreError(e, OperationType.UPDATE, `projects/${projectId}`));
            });
          });

          return { projects: newProjects };
        });
      },
      deleteMaintenance: async (projectId, maintenanceId) => {
        set((state) => {
          const newProjects = state.projects.map((p) => {
            if (p.id !== projectId) return p;
            return {
              ...p,
              contracts: (p.contracts || []).filter((c) => c.id !== maintenanceId),
              maintenances: p.maintenances.filter((m) => m.id !== maintenanceId)
            }
          });

          import('./lib/firebase').then(({ db, handleFirestoreError, OperationType }) => {
            import('firebase/firestore').then(({ doc, updateDoc }) => {
              const proj = newProjects.find(p => p.id === projectId);
              if (proj) updateDoc(doc(db, 'projects', projectId), { maintenances: proj.maintenances, contracts: proj.contracts }).catch(e => handleFirestoreError(e, OperationType.UPDATE, `projects/${projectId}`));
            });
          });

          return { projects: newProjects };
        });
      },
      syncMaintenances: (projectId) => {
        set((state) => {
          const newProjects = state.projects.map((p) => {
            if (p.id !== projectId || (!p.acqProforma?.dateDepot && !p.installationDate)) return p;

            let depotDate = new Date();
            if (p.acqProforma?.dateDepot) {
              depotDate = new Date(p.acqProforma.dateDepot);
            } else if (p.installationDate) {
              depotDate = new Date(p.installationDate);
              depotDate.setMonth(depotDate.getMonth() + 6);
            }
            if (isNaN(depotDate.getTime())) return p;

            const today = new Date();
            let currentStart = new Date(depotDate);
            currentStart.setFullYear(currentStart.getFullYear() + 1);

            const firstPaidYear = currentStart.getFullYear();

            let maintenances = p.maintenances.filter(m => m.year >= firstPaidYear);
            let contracts = [...(p.contracts || [])];
            let changed = maintenances.length !== p.maintenances.length;

            let loopGuard = 0;

            while ((currentStart.getTime() - today.getTime()) <= 60 * 24 * 60 * 60 * 1000) {
              const yearName = currentStart.getFullYear();

              if (!maintenances.some(m => m.year === yearName)) {
                const mId = uuidv4();
                maintenances.push({
                  id: mId,
                  year: yearName,
                  startDate: currentStart.toISOString().split('T')[0],
                  proforma: createEmptyDoc(),
                  convention: createEmptyDoc(),
                  bcOds: createEmptyDoc(),
                  facture: createEmptyDoc(),
                  encaissement: { status: 'PENDING' }
                });
                contracts.push({
                  id: mId,
                  name: `Maintenance ${yearName}`,
                  type: "Maintenance",
                  status: "ACTIVE" as const,
                  tasks: []
                });
                changed = true;
              }

              currentStart.setFullYear(currentStart.getFullYear() + 1);
              loopGuard++;
              if (loopGuard > 20) break;
            }

            if (changed) {
              return {
                ...p,
                maintenances: maintenances.sort((a, b) => a.year - b.year),
                contracts
              };
            }
            return p;
          });

          import('./lib/firebase').then(({ db, handleFirestoreError, OperationType }) => {
            import('firebase/firestore').then(({ doc, updateDoc }) => {
              const proj = newProjects.find(p => p.id === projectId);
              if (proj) updateDoc(doc(db, 'projects', projectId), { maintenances: proj.maintenances, contracts: proj.contracts }).catch(e => handleFirestoreError(e, OperationType.UPDATE, `projects/${projectId}`));
            });
          });

          return { projects: newProjects };
        });
      },
      addMission: async (missionData) => {
        const id = uuidv4();
        const { auth, db, handleFirestoreError, OperationType } = await import('./lib/firebase');
        const { doc, setDoc } = await import('firebase/firestore');
        const ownerId = auth.currentUser?.uid;

        const newMission = { ...missionData, id, ownerId };

        if (ownerId) {
          try {
            await setDoc(doc(db, 'missions', id), newMission);
            return;
          } catch (e) {
            handleFirestoreError(e, OperationType.CREATE, 'missions');
          }
        }

        set((state) => ({ missions: [...state.missions, newMission] }));
      },
      updateMission: async (id, data) => {
        const { db, handleFirestoreError, OperationType } = await import('./lib/firebase');
        const { doc, setDoc } = await import('firebase/firestore');
        try {
          await setDoc(doc(db, 'missions', id), data, { merge: true });
        } catch (e) {
          handleFirestoreError(e, OperationType.UPDATE, `missions/${id}`);
        }
        set((state) => ({
          missions: state.missions.map((m) => (m.id === id ? { ...m, ...data } : m)),
        }));
      },
      deleteMission: async (id) => {
        const { db, handleFirestoreError, OperationType } = await import('./lib/firebase');
        const { doc, deleteDoc } = await import('firebase/firestore');
        try {
          await deleteDoc(doc(db, 'missions', id));
        } catch (e) {
          handleFirestoreError(e, OperationType.DELETE, `missions/${id}`);
        }
        set((state) => ({
          missions: state.missions.filter((m) => m.id !== id),
        }));
      }
    }),
    {
      name: 'komercia-storage',
      version: 2, // Bumping version to clear old inconsistent local data
    }
  )
);
