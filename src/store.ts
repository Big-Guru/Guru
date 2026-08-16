import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Client, Project, MaintenanceInfo, Mission, Phase, ProjectTask, DossierPaiement, EncaissementRecord, ProductConfig } from './types';
import { db, auth, handleFirestoreError, OperationType } from './lib/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

// Helper to create an empty document tracking object
export const createEmptyDoc = () => ({ status: 'MISSING' as const });

export const getDefaultPhases = (mode: string, annexeName?: string): Phase[] => {
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
    }
    return tasks;
  };

  if (mode === 'Acquisition') {
    return [
      { id: uuidv4(), name: 'Démarchage', status: 'ACTIVE', tasks: getTasks('Démarchage') },
      { id: uuidv4(), name: 'Adaptation', status: 'PENDING', tasks: getTasks('Adaptation') },
    ];
  } else if (mode === 'Maintenance offerte') {
    return [{ id: uuidv4(), name: 'Maintenance', status: 'ACTIVE', tasks: [] }];
  } else if (mode === 'Maintenance') {
    return [{ id: uuidv4(), name: 'Maintenance', status: 'ACTIVE', tasks: [] }];
  } else if (mode === 'Annexe') {
    return [
      { 
        id: uuidv4(), 
        name: 'Adaptation', 
        status: 'ACTIVE', 
        tasks: [{ id: uuidv4(), name: annexeName || 'Prestation', date: '', status: 'PENDING' }] 
      }
    ];
  }
  return [];
};

interface AppState {
  clients: Client[];
  projects: Project[];
  missions: Mission[];
  products: ProductConfig[];
  pricingModels: PricingModel[];
  productionModels: ProductionModel[];
  pricingBoards: PricingBoard[];
  setClients: (clients: Client[]) => void;
  setProjects: (projects: Project[]) => void;
  setMissions: (missions: Mission[]) => void;
  setProducts: (products: ProductConfig[]) => void;
  setProductionModels: (models: ProductionModel[]) => void;
  setPricingBoards: (boards: PricingBoard[]) => void;
  setPricingModels: (models: PricingModel[]) => void;
  addPricingModel: (model: PricingModel) => void;
  deletePricingModel: (id: string) => void;
  addProductionModel: (model: Omit<ProductionModel, 'id'>) => void;
  deleteProductionModel: (id: string) => void;
  addPricingBoard: (board: Omit<PricingBoard, 'id'>) => void;
  deletePricingBoard: (id: string) => void;
  addProduct: (product: Omit<ProductConfig, 'id'>) => void;
  updateProduct: (id: string, data: Partial<ProductConfig>) => void;
  deleteProduct: (id: string) => void;
  addClient: (client: Omit<Client, 'id'>) => void;
  updateClient: (id: string, data: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  addProject: (project: Omit<Project, 'id' | 'contracts' | 'contacts' | 'documents' | 'history'>) => void;
  updateProject: (id: string, data: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  addContract: (projectId: string, contract: { name: string; type: string }) => void;
  addCustomContract: (projectId: string, name: string, price?: number) => void;
  deleteCustomContract: (projectId: string, contractId: string) => void;
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
  addDossierPaiement: (dossier: Omit<DossierPaiement, 'id' | 'createdAt'>) => Promise<string>;
  updateDossierPaiement: (id: string, data: Partial<DossierPaiement>) => void;
  deleteDossierPaiement: (id: string) => void;
  dissociateDossier: (dossierId: string, restoreProformas?: boolean) => void;
  removeEncaissementFromDossier: (projectId: string, encaissementId: string) => void;
  updateEncaissement: (projectId: string, encaissementId: string, data: Partial<EncaissementRecord>) => void;
  addDocumentHistoryEvent: (projectId: string, encaissementId: string, event: Omit<DocumentHistoryEvent, 'id'>) => void;
  activateMaintenanceEncaissement: (projectId: string, encaissementId: string, mergeConfig?: { dossierId?: string; otherEncaissementId?: string; otherProjectId?: string; clientId?: string }) => Promise<void>;
  deactivateMaintenanceEncaissement: (projectId: string, encaissementId: string) => Promise<void>;
  getNextDocumentNumber: (type: 'PROFORMA' | 'FACTURE') => string;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      clients: [],
      projects: [],
      missions: [],
      dossiersPaiement: [],
      products: [],
      pricingModels: [],
      productionModels: [],
      pricingBoards: [],
      setClients: (clients) => set({ clients }),
      setProductionModels: (models) => set({ productionModels: models }),
      setPricingBoards: (boards) => set({ pricingBoards: boards }),
      setPricingModels: (models) => set({ pricingModels: models }),
      setProjects: (projects) => set({ projects }),
      setMissions: (missions) => set({ missions }),
      setDossiersPaiement: (dossiersPaiement) => set({ dossiersPaiement }),
      addPricingModel: async (model) => {
        const id = model.id || uuidv4();
        const { auth, db, handleFirestoreError, OperationType } = await import('./lib/firebase');
        const { doc, setDoc } = await import('firebase/firestore');
        const ownerId = auth.currentUser?.uid;
        const newModel = { ...model, id, ownerId: ownerId || null };

        set((state) => {
          const models = state.pricingModels || [];
          const index = models.findIndex(m => m.id === id);
          if (index >= 0) {
            const newModels = [...models];
            newModels[index] = newModel;
            return { pricingModels: newModels };
          }
          return { pricingModels: [...models, newModel] };
        });

        if (ownerId) {
          try {
            await setDoc(doc(db, 'pricingModels', id), newModel);
          } catch (e) {
            // Revert on failure
            set((state) => ({ pricingModels: (state.pricingModels || []).filter(m => m.id !== id) }));
            handleFirestoreError(e, OperationType.CREATE, 'pricingModels');
            throw e;
          }
        }
      },
      deletePricingModel: async (id) => {
        const { db, handleFirestoreError, OperationType } = await import('./lib/firebase');
        const { doc, deleteDoc } = await import('firebase/firestore');
        try {
          await deleteDoc(doc(db, 'pricingModels', id));
        } catch (e) {
          handleFirestoreError(e, OperationType.DELETE, `pricingModels/${id}`);
        }
        set((state) => ({ pricingModels: (state.pricingModels || []).filter(m => m.id !== id) }));
      },
      addProductionModel: async (modelData) => {
        const id = uuidv4();
        const { auth, db, handleFirestoreError, OperationType } = await import('./lib/firebase');
        const { doc, setDoc } = await import('firebase/firestore');
        const ownerId = auth.currentUser?.uid;
        const newModel = { ...modelData, id, ownerId };

        set((state) => {
          const models = state.productionModels || [];
          const index = models.findIndex(m => m.id === id);
          if (index >= 0) {
            const newModels = [...models];
            newModels[index] = newModel;
            return { productionModels: newModels };
          }
          return { productionModels: [...models, newModel] };
        });

        if (ownerId) {
          try {
            await setDoc(doc(db, 'productionModels', id), newModel);
          } catch (e) {
            set((state) => ({ productionModels: (state.productionModels || []).filter(m => m.id !== id) }));
            handleFirestoreError(e, OperationType.CREATE, 'productionModels');
            throw e;
          }
        }
      },
      deleteProductionModel: async (id) => {
        const { db, handleFirestoreError, OperationType } = await import('./lib/firebase');
        const { doc, deleteDoc } = await import('firebase/firestore');
        try {
          await deleteDoc(doc(db, 'productionModels', id));
        } catch (e) {
          handleFirestoreError(e, OperationType.DELETE, `productionModels/${id}`);
        }
        set((state) => ({ productionModels: (state.productionModels || []).filter((m) => m.id !== id) }));
      },
      addPricingBoard: async (boardData) => {
        const id = uuidv4();
        const { auth, db, handleFirestoreError, OperationType } = await import('./lib/firebase');
        const { doc, setDoc } = await import('firebase/firestore');
        const ownerId = auth.currentUser?.uid;
        const newBoard = { ...boardData, id, ownerId };

        set((state) => {
          const boards = state.pricingBoards || [];
          const index = boards.findIndex(b => b.id === id);
          if (index >= 0) {
            const newBoards = [...boards];
            newBoards[index] = newBoard;
            return { pricingBoards: newBoards };
          }
          return { pricingBoards: [...boards, newBoard] };
        });

        if (ownerId) {
          try {
            await setDoc(doc(db, 'pricingBoards', id), newBoard);
          } catch (e) {
            set((state) => ({ pricingBoards: (state.pricingBoards || []).filter(b => b.id !== id) }));
            handleFirestoreError(e, OperationType.CREATE, 'pricingBoards');
            throw e;
          }
        }
      },
      deletePricingBoard: async (id) => {
        const { db, handleFirestoreError, OperationType } = await import('./lib/firebase');
        const { doc, deleteDoc } = await import('firebase/firestore');
        try {
          await deleteDoc(doc(db, 'pricingBoards', id));
        } catch (e) {
          handleFirestoreError(e, OperationType.DELETE, `pricingBoards/${id}`);
        }
        set((state) => ({ pricingBoards: (state.pricingBoards || []).filter((b) => b.id !== id) }));
      },
      setProducts: (products) => {
        // Migration logic for old products to dynamic criteria
        const migratedProducts = products.map(prod => {
          let updatedProd = { ...prod };
          
          // If no pricingCriteria, it's an old product. Let's add the default ones (Effectif)
          if (!updatedProd.pricingCriteria || updatedProd.pricingCriteria.length === 0) {
            updatedProd.pricingCriteria = [
              {
                id: 'effectifType',
                label: 'Type d\'effectif',
                type: 'SELECT',
                options: ['UNIVERSITE', 'EH_DA']
              },
              {
                id: 'effectif',
                label: 'Taille de l\'effectif',
                type: 'NUMBER_RANGE'
              }
            ];
          }

          // Ensure versions array exists
          if (!updatedProd.versions || updatedProd.versions.length === 0) {
            const uniqueVersions = new Set<string>();
            updatedProd.pricingRules.forEach(r => { if (r.version) uniqueVersions.add(r.version); });
            updatedProd.versions = Array.from(uniqueVersions);
          }

          // Migrate rules to use `conditions` instead of hardcoded effectif fields
          updatedProd.pricingRules = updatedProd.pricingRules.map(rule => {
            if (!rule.conditions) {
              const conditions: Record<string, any> = {};
              if (rule.effectifType) conditions.effectifType = rule.effectifType;
              if (rule.effectifMin !== undefined || rule.effectifMax !== undefined) {
                conditions.effectif = {};
                if (rule.effectifMin !== undefined) conditions.effectif.min = rule.effectifMin;
                if (rule.effectifMax !== undefined) conditions.effectif.max = rule.effectifMax;
              }
              return { ...rule, conditions };
            }
            return rule;
          });

          return updatedProd;
        });
        
        set({ products: migratedProducts });
      },
      addProduct: async (productData) => {
        const id = uuidv4();
        const { auth, db, handleFirestoreError, OperationType } = await import('./lib/firebase');
        const { doc, setDoc } = await import('firebase/firestore');
        const ownerId = auth.currentUser?.uid;

        const newProduct = { ...productData, id, ownerId };

        if (ownerId) {
          try {
            await setDoc(doc(db, 'products', id), newProduct);
            return;
          } catch (e) {
            handleFirestoreError(e, OperationType.CREATE, 'products');
          }
        }

        set((state) => ({
          products: [...state.products, newProduct]
        }));
      },
      updateProduct: async (id, data) => {
        const { db, handleFirestoreError, OperationType } = await import('./lib/firebase');
        const { doc, setDoc } = await import('firebase/firestore');
        try {
          await setDoc(doc(db, 'products', id), data, { merge: true });
        } catch (e) {
          handleFirestoreError(e, OperationType.UPDATE, `products/${id}`);
        }
        set((state) => ({
          products: state.products.map((p) => (p.id === id ? { ...p, ...data } : p)),
        }));
      },
      deleteProduct: async (id) => {
        const { db, handleFirestoreError, OperationType } = await import('./lib/firebase');
        const { doc, deleteDoc } = await import('firebase/firestore');
        try {
          await deleteDoc(doc(db, 'products', id));
        } catch (e) {
          handleFirestoreError(e, OperationType.DELETE, `products/${id}`);
        }
        set((state) => ({
          products: state.products.filter((p) => p.id !== id),
        }));
      },
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

        const productConfig = get().products.find(p => p.name === projectData.product);
        const processType = productConfig?.processType || projectData.processType || 'STANDARD';
        let initialContracts: any[] = [];

        let acquisitionPhases = getDefaultPhases("Acquisition");
        if (productConfig && productConfig.customPhases && productConfig.customPhases.length > 0) {
          acquisitionPhases = productConfig.customPhases.map(ph => ({
            ...ph,
            id: uuidv4(),
            tasks: ph.tasks.map(t => ({
              ...t,
              id: uuidv4(),
              status: 'PENDING',
              date: ''
            }))
          }));
        }

        const contractAcquisition = {
          id: uuidv4(),
          name: "Acquisition",
          type: "Acquisition",
          mode: "Acquisition" as const,
          status: "ACTIVE" as const,
          startDate: initialDate,
          phase: "Démarchage" as any,
          phases: acquisitionPhases,
          tasks: [],
          documents: {}
        };

        const contractMaintenanceGratuite = {
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
        };

        const contractMaintenance = {
          id: uuidv4(),
          name: "Maintenance 1",
          type: "Maintenance",
          mode: "Maintenance" as const,
          status: "PENDING" as const,
          startDate: "", // Sera défini 1 an après Maintenance Gratuite
          phase: "Adaptation" as any,
          phases: getDefaultPhases("Maintenance"),
          tasks: [],
          documents: {}
        };

        if (processType === 'MAINTENANCE_ONLY') {
          contractMaintenance.status = 'ACTIVE';
          contractMaintenance.startDate = initialDate;
          initialContracts = [contractMaintenance];
        } else if (processType === 'DIRECT_MAINTENANCE') {
          initialContracts = [contractAcquisition, contractMaintenance];
        } else {
          initialContracts = [contractAcquisition, contractMaintenanceGratuite, contractMaintenance];
        }

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
          ownerId: ownerId || null,
          processType,
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

        if (data.encaissements) {
          get().evaluateAutomations(id);
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
      addCustomContract: (projectId, name, price) => {
        const state = get();
        const project = state.projects.find(p => p.id === projectId);
        if (!project) return;

        const newContract = {
          id: uuidv4(),
          name,
          type: 'Standard',
          mode: 'Annexe' as any,
          status: 'ACTIVE' as const,
          startDate: new Date().toISOString().split('T')[0],
          phases: getDefaultPhases('Annexe', name),
          tasks: [],
          documents: {}
        };
        const contracts = [...(project.contracts || []), newContract];

        const newHistory = [
          ...(project.history || []),
          {
            id: uuidv4(),
            date: new Date().toLocaleDateString('fr-FR'),
            message: `Contrat (indépendant) créé : ${name} ${price ? `(Prix: ${price})` : ''}`
          }
        ];

        state.updateProject(projectId, { contracts, history: newHistory });
      },
      deleteCustomContract: (projectId, contractId) => {
        const state = get();
        const project = state.projects.find(p => p.id === projectId);
        if (!project || !project.contracts) return;

        const contractToDelete = project.contracts.find(c => c.id === contractId);
        if (!contractToDelete || contractToDelete.mode !== 'Annexe') return;

        const contracts = project.contracts.filter(c => c.id !== contractId);
        // Delete the associated encaissement (which has the same annexeName or is tied logically, but since they are created at the same time and we don't store contractId in encaissement... wait, they might have the same `annexeName`)
        // It's safer to filter encaissements by mode === 'Annexe' AND annexeName === contractToDelete.name
        const encaissements = (project.encaissements || []).filter(e => !(e.mode === 'Annexe' && e.annexeName === contractToDelete.name));

        const newHistory = [
          ...(project.history || []),
          {
            id: uuidv4(),
            date: new Date().toLocaleDateString('fr-FR'),
            message: `Prestation annexe supprimée : ${contractToDelete.name}`
          }
        ];

        state.updateProject(projectId, { contracts, encaissements, history: newHistory });
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
            let canClose = true;
            if (contract.mode === 'Acquisition' || contract.mode === 'Maintenance') {
               const unpaid = (project.encaissements || []).some(e => e.contractId === contract.id && e.status !== 'DONE' && e.status !== 'CANCELED');
               const hasEncaissement = (project.encaissements || []).some(e => e.contractId === contract.id && e.encaissementType === 'TOTAL');
               
               if (unpaid || !hasEncaissement) {
                 canClose = false;
                 message += ` La phase est terminée, mais le contrat "${contract.name}" reste actif en attente du règlement total.`;
               }
            }

            if (canClose) {
              contract.status = 'DONE';
              message += ` Contrat "${contract.name}" clôturé.`;
            }
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
        const processType = project.processType || 'STANDARD';
        
        const productConfig = state.products.find(p => p.name === project.product);
        const triggerTaskName = productConfig?.maintenanceTriggerTask || 'Formation';
        
        // Trouver la date de la tâche déclencheur (Formation par défaut)
        const acqContract = updatedContracts.find(c => c.mode === 'Acquisition');
        let formationDoneDate: Date | null = null;
        
        if (acqContract) {
          for (const ph of acqContract.phases) {
            const triggerTask = ph.tasks.find(t => t.name.includes(triggerTaskName));
            if ((triggerTask && triggerTask.status === 'DONE') || ph.status === 'DONE' && ph.tasks.some(t => t.name.includes(triggerTaskName))) {
              formationDoneDate = (triggerTask?.date) ? new Date(triggerTask.date) : new Date();
              break;
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

        // Programmer Maintenance Annuelle (Maintenance 1)
        const maintAnnuelle = updatedContracts.find(c => c.mode === 'Maintenance' && (c.name === 'Maintenance 1' || c.name === 'Maintenance Annuelle' || c.name === 'Maintenance'));
        if (maintAnnuelle && maintAnnuelle.status === 'PENDING') {
          let maintDate: Date | null = null;
          
          if (maintOfferte && maintOfferte.startDate) {
            maintDate = new Date(maintOfferte.startDate);
            maintDate.setFullYear(maintDate.getFullYear() + 1);
          } else if (processType === 'DIRECT_MAINTENANCE' && formationDoneDate) {
            maintDate = new Date(formationDoneDate);
            maintDate.setMonth(maintDate.getMonth() + 12);
          }

          if (maintDate) {
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
        }

        // --- NOUVELLE LOGIQUE : GÉNÉRATION DES ENCAISSEMENTS ---
        let currentEncaissements = [...(project.encaissements || [])];
        
        // 1. Gérer l'encaissement d'Acquisition (S'active à la clôture de l'acquisition / trigger task)
        const acqContractForEnc = updatedContracts.find(c => c.mode === 'Acquisition');
        if (acqContractForEnc && formationDoneDate) {
             const existingTotal = currentEncaissements.find(e => e.contractId === acqContractForEnc.id && e.encaissementType === 'TOTAL');
             if (!existingTotal) {
               currentEncaissements.push({
                 id: uuidv4(),
                 projectId,
                 contractId: acqContractForEnc.id,
                 mode: 'Acquisition',
                 encaissementType: 'TOTAL',
                 billingMode: 'FACTURE',
                 targetDate: new Date().toISOString().split('T')[0],
                 status: 'IN_PROGRESS',
                 proforma: { status: 'PENDING' },
                 soumission: { status: 'PENDING' },
                 convention: { status: 'PENDING' },
                 bc: { status: 'PENDING' },
                 serviceFait: { status: 'PENDING' },
                 abe: { status: 'PENDING' },
                 facture: { status: 'PENDING' }
               });
               hasChanges = true;
             }
             }

        // 2. Gérer les maintenances si la formation est terminée
        if (formationDoneDate) {
          const maintTargetDate = new Date(formationDoneDate);
          if (processType === 'DIRECT_MAINTENANCE') {
            maintTargetDate.setMonth(maintTargetDate.getMonth() + 12);
          } else {
            maintTargetDate.setMonth(maintTargetDate.getMonth() + 18);
          }

          // Vérifier si Maintenance 1 Encaissement existe (Year 1)
          const maintAnnuelleContract = updatedContracts.find(c => c.mode === 'Maintenance' && (c.name === 'Maintenance Annuelle' || c.name === 'Maintenance 1' || c.name === 'Maintenance'));
          const maintAnnuelleContractId = maintAnnuelleContract ? maintAnnuelleContract.id : undefined;

          if (!currentEncaissements.find(e => e.mode === 'Maintenance' && e.year === 1)) {
            currentEncaissements.push({
              id: uuidv4(),
              projectId,
              contractId: maintAnnuelleContractId,
              mode: 'Maintenance',
              encaissementType: 'TOTAL',
              billingMode: 'FACTURE',
              year: 1,
              targetDate: maintTargetDate.toISOString().split('T')[0],
              status: maintTargetDate <= new Date() ? 'IN_PROGRESS' : 'UPCOMING',
              proforma: { status: 'PENDING' },
              soumission: { status: 'PENDING' },
              convention: { status: 'PENDING' },
              bc: { status: 'PENDING' },
              serviceFait: { status: 'PENDING' },
              abe: { status: 'PENDING' },
              facture: { status: 'PENDING' }
            });
            hasChanges = true;
          }
        }
        
        // Maj des statuts si les dates sont passées pour les UPCOMING existants
        currentEncaissements = currentEncaissements.map(enc => {
          if (enc.status === 'UPCOMING' && new Date(enc.targetDate) <= new Date()) {
            hasChanges = true;
            return { ...enc, status: 'IN_PROGRESS' };
          }
          return enc;
        });

        // --- Vérification de la clôture des contrats en attente de règlement ---
        updatedContracts = updatedContracts.map(contract => {
          // Patch missing phases for maintenance contracts
          if ((contract.mode === 'Maintenance' || contract.mode === 'Maintenance offerte') && (!contract.phases || contract.phases.length === 0)) {
            hasChanges = true;
            contract.phases = [{ id: uuidv4(), name: 'Maintenance', status: 'ACTIVE', tasks: [] }];
          }

          if (contract.status === 'ACTIVE' && (contract.mode === 'Acquisition' || contract.mode === 'Maintenance')) {
            const allPhasesDone = contract.phases && contract.phases.length > 0 && contract.phases.every((p: any) => p.status === 'DONE');
            if (allPhasesDone) {
              const unpaid = currentEncaissements.some(e => e.contractId === contract.id && e.status !== 'DONE' && e.status !== 'CANCELED');
              if (!unpaid) {
                hasChanges = true;
                return { ...contract, status: 'DONE' };
              }
            }
          }
          return contract;
        });

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
      addDocumentHistoryEvent: (projectId, encaissementId, event) => {
        const state = get();
        const project = state.projects.find(p => p.id === projectId);
        if (!project || !project.encaissements) return;

        const currentUser = auth.currentUser;
        const userName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Utilisateur';
        const newEventBase = { ...event, user: userName };

        const targetEnc = project.encaissements.find(e => e.id === encaissementId);
        const dossierId = targetEnc?.isCombined ? (targetEnc.combinedWithDossierId || (targetEnc as any).dossierId) : null;

        if (dossierId) {
          state.projects.forEach(p => {
             if (!p.encaissements) return;
             let changed = false;
             const newEncs = p.encaissements.map(e => {
                const eDossierId = e.combinedWithDossierId || (e as any).dossierId;
                if (e.isCombined && eDossierId === dossierId) {
                  changed = true;
                  const newHistory = [...(e.documentHistory || []), { ...newEventBase, id: uuidv4() }];
                  return { ...e, documentHistory: newHistory };
                }
                return e;
             });
             if (changed) {
               state.updateProject(p.id, { encaissements: newEncs });
             }
          });
          return;
        }

        const updatedEncaissements = project.encaissements.map(e => {
          if (e.id === encaissementId) {
            const newHistory = [...(e.documentHistory || []), { ...newEventBase, id: uuidv4() }];
            return { ...e, documentHistory: newHistory };
          }
          return e;
        });
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
        
        const nextYear = (lastMaint.year || 1) + 1;
        
        // Prevent duplicate generation for the same year
        if (maintenances.some(m => m.year === nextYear)) return;

        const existingContract = (project.contracts || []).find(c => c.mode === 'Maintenance' && (c.name === `Maintenance ${lastMaint.year}` || c.name === `Maintenance Année ${lastMaint.year}` || (lastMaint.year === 1 && (c.name === 'Maintenance Annuelle' || c.name === 'Maintenance' || c.name === 'Maintenance 1'))));
        const baseDateStr = existingContract?.startDate || lastMaint.targetDate;

        const nextTargetDate = new Date(baseDateStr);
        if (project.maintenancePeriodicity === 'Mensuelle') {
          nextTargetDate.setMonth(nextTargetDate.getMonth() + 1);
        } else if (project.maintenancePeriodicity === 'Trimestrielle') {
          nextTargetDate.setMonth(nextTargetDate.getMonth() + 3);
        } else if (project.maintenancePeriodicity === 'Semestrielle') {
          nextTargetDate.setMonth(nextTargetDate.getMonth() + 6);
        } else {
          nextTargetDate.setFullYear(nextTargetDate.getFullYear() + 1);
        }
        
        const newContractId = uuidv4();
        const newContract = {
          id: newContractId,
          name: `Maintenance ${nextYear}`,
          type: 'Standard',
          mode: 'Maintenance',
          status: 'PENDING' as const,
          startDate: nextTargetDate.toISOString().split('T')[0],
          phases: [
            { id: uuidv4(), name: 'Maintenance', status: 'ACTIVE' as const, tasks: [] }
          ]
        };

        const newEncaissement: EncaissementRecord = {
          id: uuidv4(),
          projectId,
          contractId: newContractId,
          mode: 'Maintenance',
          year: nextYear,
          targetDate: nextTargetDate.toISOString().split('T')[0],
          status: nextTargetDate <= new Date() ? 'IN_PROGRESS' : 'UPCOMING',
          proforma: { status: 'PENDING' },
          soumission: { status: 'PENDING' },
          convention: { status: 'PENDING' },
          bc: { status: 'PENDING' },
          serviceFait: { status: 'PENDING' },
          abe: { status: 'PENDING' },
          facture: { status: 'PENDING' }
        };
        
        state.updateProject(projectId, { 
          contracts: [...(project.contracts || []), newContract],
          encaissements: [...project.encaissements, newEncaissement] 
        });
      },
      activateMaintenanceEncaissement: async (projectId, encaissementId, mergeConfig) => {
        const state = get();
        const project = state.projects.find(p => p.id === projectId);
        if (!project || !project.encaissements) return;

        // 1. Update the Maintenance Encaissement
        const targetEnc = project.encaissements.find(e => e.id === encaissementId);
        const currentYear = targetEnc?.year || 1;

        const activationDateStr = new Date().toISOString().split('T')[0];

        const updatedEncaissements = project.encaissements.map(e => {
          if (e.id === encaissementId) {
            return {
              ...e,
              targetDate: activationDateStr,
              status: 'IN_PROGRESS' as const
            };
          }
          return e;
        });

        const nextTargetDate = new Date(activationDateStr);
        if (project.maintenancePeriodicity === 'Mensuelle') {
          nextTargetDate.setMonth(nextTargetDate.getMonth() + 1);
        } else if (project.maintenancePeriodicity === 'Trimestrielle') {
          nextTargetDate.setMonth(nextTargetDate.getMonth() + 3);
        } else if (project.maintenancePeriodicity === 'Semestrielle') {
          nextTargetDate.setMonth(nextTargetDate.getMonth() + 6);
        } else {
          nextTargetDate.setFullYear(nextTargetDate.getFullYear() + 1);
        }
        
        const newContractId = uuidv4();
        
        updatedEncaissements.push({
          id: uuidv4(),
          projectId,
          contractId: newContractId,
          mode: 'Maintenance',
          year: currentYear + 1,
          targetDate: nextTargetDate.toISOString().split('T')[0],
          status: 'UPCOMING',
          proforma: { status: 'PENDING' },
          soumission: { status: 'PENDING' },
          convention: { status: 'PENDING' },
          bc: { status: 'PENDING' },
          serviceFait: { status: 'PENDING' },
          abe: { status: 'PENDING' },
          facture: { status: 'PENDING' }
        });

        // 2. Mark "Maintenance offerte" as ABANDONED/DONE and manage Maintenance contracts
        let updatedContracts = project.contracts || [];
        
        updatedContracts = updatedContracts.map(c => {
          if (c.mode === 'Maintenance offerte' && c.status !== 'CLOSED' && c.status !== 'DONE') {
            return { ...c, status: 'DONE' as const };
          }
          return c;
        });

        updatedContracts.push({
          id: newContractId,
          name: `Maintenance ${currentYear + 1}`,
          type: 'Standard',
          mode: 'Maintenance',
          status: 'PENDING' as const,
          startDate: nextTargetDate.toISOString().split('T')[0],
          phases: [
            { id: uuidv4(), name: 'Maintenance', status: 'ACTIVE' as const, tasks: [] }
          ]
        });

        // Activate the current year contract
        const currentYearContract = updatedContracts.find(c => c.mode === 'Maintenance' && (c.name === `Maintenance ${currentYear}` || c.name === `Maintenance Année ${currentYear}` || (currentYear === 1 && (c.name === 'Maintenance Annuelle' || c.name === 'Maintenance' || c.name === 'Maintenance 1'))));
        if (!currentYearContract) {
           // If it didn't exist yet, we create it active
           updatedContracts.push({
             id: uuidv4(),
             name: `Maintenance ${currentYear}`,
             type: 'Standard',
             mode: 'Maintenance',
             status: 'ACTIVE' as const,
             startDate: activationDateStr,
             phases: [
               { id: uuidv4(), name: 'Encaissement', status: 'ACTIVE' as const, tasks: [] },
               { id: uuidv4(), name: 'Recouvrement', status: 'PENDING' as const, tasks: [] }
             ]
           });
        } else {
           currentYearContract.name = `Maintenance ${currentYear}`;
           currentYearContract.status = 'ACTIVE';
           currentYearContract.startDate = activationDateStr;
           if (currentYearContract.phases && currentYearContract.phases.length > 0) {
             currentYearContract.phases[0].status = 'ACTIVE';
           }
        }

        const newHistory = [
          ...(project.history || []),
          {
            id: uuidv4(),
            date: new Date().toLocaleDateString('fr-FR'),
            message: `Maintenance ${currentYear} activée par anticipation. Maintenance Gratuite sautée.`
          }
        ];

        state.updateProject(projectId, { 
          encaissements: updatedEncaissements, 
          contracts: updatedContracts,
          history: newHistory 
        });

        // 3. Handle Merge if requested
        if (mergeConfig) {
          // If we merge into an existing dossier
          if (mergeConfig.dossierId) {
            const dossier = state.dossiersPaiement.find(d => d.id === mergeConfig.dossierId);
            if (dossier) {
              const newEncaissementIds = [...dossier.encaissementIds, encaissementId];
              await state.updateDossierPaiement(dossier.id, { encaissementIds: newEncaissementIds });
              
              // update this encaissement to know it's in a dossier and reset billing
              const resetBilling = {
                proforma: { status: 'CANCELLED' as const },
                soumission: { status: 'CANCELLED' as const },
                convention: { status: 'CANCELLED' as const },
                bc: { status: 'CANCELLED' as const },
                serviceFait: { status: 'CANCELLED' as const },
                abe: { status: 'CANCELLED' as const },
                facture: { status: 'CANCELLED' as const }
              };
              state.updateEncaissement(projectId, encaissementId, { isCombined: true, combinedWithDossierId: dossier.id, ...resetBilling });
            }
          } 
          // If we create a new dossier from an existing independent encaissement
          else if (mergeConfig.otherEncaissementId && mergeConfig.otherProjectId && mergeConfig.clientId) {
            const newDossierId = await state.addDossierPaiement({
              clientId: mergeConfig.clientId,
              encaissementIds: [mergeConfig.otherEncaissementId, encaissementId],
              status: 'IN_PROGRESS',
              documents: {}
            });
            
            // update both encaissements and reset billing
            const resetBilling = {
              proforma: { status: 'CANCELLED' as const },
              soumission: { status: 'CANCELLED' as const },
              convention: { status: 'CANCELLED' as const },
              bc: { status: 'CANCELLED' as const },
              serviceFait: { status: 'CANCELLED' as const },
              abe: { status: 'CANCELLED' as const },
              facture: { status: 'CANCELLED' as const }
            };
            state.updateEncaissement(projectId, encaissementId, { isCombined: true, combinedWithDossierId: newDossierId, ...resetBilling });
            state.updateEncaissement(mergeConfig.otherProjectId, mergeConfig.otherEncaissementId, { isCombined: true, combinedWithDossierId: newDossierId, ...resetBilling });
          }
        }
      },
      deactivateMaintenanceEncaissement: async (projectId, encaissementId) => {
        const state = get();
        const project = state.projects.find(p => p.id === projectId);
        if (!project || !project.encaissements) return;

        const targetEnc = project.encaissements.find(e => e.id === encaissementId);
        if (!targetEnc || targetEnc.mode !== 'Maintenance') return;

        const currentYear = Number(targetEnc.year) || 1;

        let updatedEncaissements = project.encaissements.map(e => {
          if (e.id === encaissementId) {
            return {
              ...e,
              status: 'UPCOMING' as const
            };
          }
          return e;
        });

        updatedEncaissements = updatedEncaissements.map(e => {
          if (currentYear > 1 && e.mode === 'Maintenance' && e.year === currentYear - 1 && e.status === 'DONE') {
            return {
              ...e,
              status: 'IN_PROGRESS' as const
            };
          }
          return e;
        });

        updatedEncaissements = updatedEncaissements.filter(e => !(e.mode === 'Maintenance' && e.year === currentYear + 1));

        let updatedContracts = project.contracts || [];
        
        updatedContracts = updatedContracts.filter(c => !(c.mode === 'Maintenance' && (c.name === `Maintenance ${currentYear + 1}` || c.name === `Maintenance Année ${currentYear + 1}`)));

        updatedContracts = updatedContracts.map(c => {
          if (c.mode === 'Maintenance' && (c.name === `Maintenance ${currentYear}` || c.name === `Maintenance Année ${currentYear}`)) {
            return {
              ...c,
              status: 'PENDING' as const,
              phases: c.phases.map(ph => ({ ...ph, status: 'PENDING' as const }))
            };
          }
          if (currentYear > 1 && c.mode === 'Maintenance' && (c.name === `Maintenance ${currentYear - 1}` || c.name === `Maintenance Année ${currentYear - 1}`)) {
            return {
              ...c,
              status: 'ACTIVE' as const
            };
          }
          return c;
        });

        const newHistory = [
          ...(project.history || []),
          {
            id: uuidv4(),
            date: new Date().toLocaleDateString('fr-FR'),
            message: `Activation de la Maintenance ${currentYear} annulée.`
          }
        ];

        state.updateProject(projectId, { 
          encaissements: updatedEncaissements, 
          contracts: updatedContracts,
          history: newHistory 
        });
      },
      getNextDocumentNumber: (type) => {
        const state = get();
        const currentYearStr = new Date().getFullYear().toString().slice(-2);
        let maxSequence = 0;

        state.projects.forEach(p => {
          (p.encaissements || []).forEach(e => {
            const steps = [e.proforma, e.facture];
            steps.forEach(step => {
              if (step?.draft?.documentNumber) {
                const docNum = step.draft.documentNumber;
                if (type === 'PROFORMA' && docNum.length === 5 && docNum.endsWith(currentYearStr)) {
                  const seq = parseInt(docNum.substring(0, 3), 10);
                  if (!isNaN(seq) && seq > maxSequence) maxSequence = seq;
                } else if (type === 'FACTURE' && docNum.length === 5 && docNum.startsWith(currentYearStr)) {
                  const seq = parseInt(docNum.substring(2), 10);
                  if (!isNaN(seq) && seq > maxSequence) maxSequence = seq;
                }
              }
            });
            (e.documentHistory || []).forEach(dh => {
              if (dh.documentType === type && dh.draftSnapshot?.documentNumber) {
                const docNum = dh.draftSnapshot.documentNumber;
                if (type === 'PROFORMA' && docNum.length === 5 && docNum.endsWith(currentYearStr)) {
                  const seq = parseInt(docNum.substring(0, 3), 10);
                  if (!isNaN(seq) && seq > maxSequence) maxSequence = seq;
                } else if (type === 'FACTURE' && docNum.length === 5 && docNum.startsWith(currentYearStr)) {
                  const seq = parseInt(docNum.substring(2), 10);
                  if (!isNaN(seq) && seq > maxSequence) maxSequence = seq;
                }
              }
            });
          });
        });

        const nextSequence = maxSequence + 1;
        const seqFormatted = nextSequence.toString().padStart(3, '0');

        if (type === 'PROFORMA') {
          return `${seqFormatted}${currentYearStr}`; // Ex: 00126
        } else {
          return `${currentYearStr}${seqFormatted}`; // Ex: 26001
        }
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
        set((state) => ({ dossiersPaiement: [...state.dossiersPaiement, newDossier] }));
        try {
          await setDoc(doc(db, 'dossiers', id), newDossier);
          return id;
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, 'Création du dossier de paiement');
          throw error;
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
      removeEncaissementFromDossier: (projectId, encaissementId) => {
        const state = get();
        const project = state.projects.find(p => p.id === projectId);
        if (!project || !project.encaissements) return;
        
        const updatedEncaissements = project.encaissements.map(e => 
          e.id === encaissementId ? { ...e, isCombined: false, combinedWithDossierId: null as any } : e
        );
        state.updateProject(projectId, { encaissements: updatedEncaissements });
      },
      dissociateDossier: async (dossierId, restoreProformas = false) => {
        const state = get();
        const currentUser = auth.currentUser;
        const userName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Utilisateur';
        
        let primaryFound = false;

        state.projects.forEach(p => {
          if (p.encaissements?.some(e => e.combinedWithDossierId === dossierId || (e as any).dossierId === dossierId)) {
             const updated = p.encaissements.map(e => {
                if (e.combinedWithDossierId === dossierId || (e as any).dossierId === dossierId) {
                   const newE = { ...e };
                   newE.isCombined = false;
                   delete newE.combinedWithDossierId;
                   delete (newE as any).dossierId;
                   
                   const newHistory = [...(newE.documentHistory || [])];

                   if (!primaryFound) {
                      primaryFound = true;
                      if (newE.proforma && newE.proforma.status !== 'PENDING') {
                         newE.proforma = { ...newE.proforma, status: 'CANCELLED' };
                     newHistory.push({
                        id: uuidv4(),
                        date: new Date().toISOString(),
                        documentType: 'PROFORMA',
                        action: 'Proforma fusionnée annulée suite à la dissociation',
                        user: userName,
                        draftSnapshot: newE.proforma.draft
                     });
                      }
                   }
                   
                   if (restoreProformas) {
                      const profCancelIdx = newHistory.findIndex(h => h.action.includes('Facturation individuelle annulée') && h.documentType === 'PROFORMA');
                      let oldProfDraft = null;
                      if (profCancelIdx > 0) {
                         for (let i = profCancelIdx - 1; i >= 0; i--) {
                            if (newHistory[i].documentType === 'PROFORMA' && newHistory[i].draftSnapshot) {
                               oldProfDraft = newHistory[i].draftSnapshot;
                               break;
                            }
                         }
                      }
                      
                      if (oldProfDraft) {
                         newE.proforma = { ...newE.proforma, status: 'GENERATED', draft: oldProfDraft };
                         newHistory.push({
                            id: uuidv4(),
                            date: new Date().toISOString(),
                            documentType: 'PROFORMA',
                            action: 'Proforma individuelle restaurée suite à la dissociation',
                            user: userName
                         });
                      } else {
                         newE.proforma = { ...newE.proforma, status: 'PENDING' };
                         delete newE.proforma.draft;
                      }
                   } else {
                      const currentDraft = newE.proforma.draft;
                      newE.proforma = { ...newE.proforma, status: 'PENDING' };
                      delete newE.proforma.draft;
                      newHistory.push({
                         id: uuidv4(),
                         date: new Date().toISOString(),
                         documentType: 'PROFORMA',
                         action: 'Annulée suite à la dissociation - À regénérer',
                         user: userName,
                         draftSnapshot: currentDraft
                      });
                   }
                   
                   newE.documentHistory = newHistory;
                   return newE;
                }
                return e;
             });
             state.updateProject(p.id, { encaissements: updated });
          }
        });
        
        state.deleteDossierPaiement(dossierId);
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
