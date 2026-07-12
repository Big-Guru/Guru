export type DocStatus = 'MISSING' | 'PREPARED' | 'VALIDATED' | 'DEPOSITED' | 'RECUPERATED' | 'IGNORED';

export interface DocumentTrack {
  status: DocStatus;
  dateDoc?: string;
  dateValidated?: string;
  dateDepot?: string;
  dateRecup?: string;
}

export type InvoicingStepStatus = 'PENDING' | 'GENERATED' | 'TO_VERIFY' | 'VALIDATED' | 'DEPOSITED' | 'RECOVERED' | 'CANCELLED';

export interface DocumentDraft {
  documentNumber: string;
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  items: Array<{
    description: string;
    price: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface InvoicingStep {
  status: InvoicingStepStatus;
  date?: string;
  documentId?: string;
  draft?: DocumentDraft;
}

export interface DocumentHistoryEvent {
  id: string;
  date: string;
  documentType: 'PROFORMA' | 'FACTURE' | 'BC' | 'SOUMISSION' | 'CONVENTION' | 'SERVICE_FAIT' | 'ABE';
  action: string;
  draftSnapshot?: DocumentDraft;
  user?: string;
}

export interface EncaissementRecord {
  id: string;
  projectId: string;
  mode: 'Acquisition' | 'Maintenance' | 'Annexe' | 'Indépendant' | 'Standard';
  title?: string;
  annexeName?: string;
  annexePrice?: number;
  percentage?: number; // Pour les avances
  year?: number; // Seulement pour la Maintenance
  targetDate: string; // YYYY-MM-DD
  status: 'UPCOMING' | 'IN_PROGRESS' | 'DONE' | 'PARTIAL';
  
  proforma: InvoicingStep;
  soumission?: InvoicingStep;
  convention?: InvoicingStep;
  bc: InvoicingStep;
  serviceFait?: InvoicingStep;
  abe?: InvoicingStep;
  facture: InvoicingStep;
  
  montantTotal?: number;
  montantEncaisse?: number;
  resteDette?: number;
  
  isCombined?: boolean;
  combinedWithDossierId?: string;
  documentHistory?: DocumentHistoryEvent[];
  
  // New Architecture Fields
  contractId?: string;
  encaissementType?: 'AVANCE' | 'TOTAL';
  billingMode?: 'FACTURE' | 'PARTIEL';
  product?: string;
  version?: ProductVersion;
  
  // Facturation Fields
  potentiel?: 'Faible' | 'Moyen' | 'Réalisé';
  encaissementCetteAnnee?: 'Probable' | 'Peu probable' | 'Effectué';
  observation?: string;
  emetteur?: string;

  // New Dynamic Pricing Parameters
  pricingParameters?: Record<string, any>; // e.g. { effectif: 45, type: 'UNIVERSITE', secteur: 'Public' }
}

export interface DossierPaiement {
  id: string;
  clientId: string;
  projectIds: string[];
  encaissementIds: string[];
  status: 'DRAFT' | 'PROFORMA_GENERATED' | 'VALIDATED' | 'FACTURE_GENERATED' | 'DONE';
  createdAt: string;
  total: number;
  encaisse: number;
  
  // Facturation Fields
  potentiel?: 'Faible' | 'Moyen' | 'Réalisé';
  encaissementCetteAnnee?: 'Probable' | 'Peu probable' | 'Effectué';
  observation?: string;
  emetteur?: string;
}

export interface Client {
  id: string;
  ownerId?: string;
  name: string;
  address: string;
  wilaya: string;
  effectif: number;
  effectifType?: 'UNIVERSITE' | 'EH_DA' | 'PUBLIC' | 'PRIVE';
  nif: string;
  nis: string;
  rc: string; // Registre commerce or Agrément
  ai: string; // Article d'imposition
}

export type ProductType = 'PAYE' | 'BUDGET' | 'BUDGET_APC' | 'STOCKS' | 'GRH' | 'PHARMATIS' | 'GBS' | string;
export type ProductVersion = 'ULTRALIGHT' | 'LIGHT' | 'INTERMEDIATE' | 'ADVANCED' | 'GLOBAL' | string;
export type ProcessType = 'STANDARD' | 'DIRECT_MAINTENANCE' | 'MAINTENANCE_ONLY';

export type CriteriaType = 'SELECT' | 'NUMBER_RANGE' | 'BOOLEAN';

export interface PricingCriteria {
  id: string; // e.g. 'effectifType', 'secteur', 'hosting'
  label: string; // e.g. 'Type d\'effectif', 'Secteur d\'activité'
  type: CriteriaType;
  options?: string[]; // Used for SELECT type
}

export interface PricingRule {
  id: string;
  entity: 'Naltis' | 'Netsprint' | 'MP';
  
  version: ProductVersion; // Kept for backward compatibility, though versions can be dynamic now
  designation?: string; // Acquisition designation
  maintenanceDesignation?: string; // Maintenance designation
  acquisitionPrice: number;
  maintenancePrice: number;
  
  // New dynamic condition system
  conditions?: Record<string, any>; 
  // Example for Paye: { effectif: { min: 0, max: 50 }, effectifType: 'UNIVERSITE' }
  // Example for SiteWeb: { secteur: 'Public', hosting: true }
  
  // Legacy fields (kept for backward compatibility during migration)
  effectifMin?: number;
  effectifMax?: number;
  effectifType?: 'UNIVERSITE' | 'EH_DA' | string;
}

export interface PricingModel {
  id: string;
  name: string;
  type: 'RANGE' | 'STANDARD';
  option: 'UNIVERSITE' | 'EH_DA' | 'PUBLIC' | 'PRIVE';
  versions: string[];
}

export interface PricingBoard {
  id: string;
  ownerId?: string;
  name: string;
  rules: PricingRule[];
}

export interface ProductConfig {
  id: string;
  ownerId?: string;
  name: string;
  departement: 'D1' | 'D2';
  defaultEntity: 'Naltis' | 'Netsprint' | 'MP';
  maintenancePeriodicity: 'Mensuelle' | 'Trimestrielle' | 'Semestrielle' | 'Annuelle';
  processType?: 'STANDARD' | 'DIRECT_MAINTENANCE' | 'MAINTENANCE_ONLY';
  
  // New dynamic attributes
  pricingModel?: PricingModel;
  pricingCriteria?: PricingCriteria[]; // Keeping for legacy products
  versions?: string[]; // Dynamic list of versions (e.g. ['UltraLight', 'Classic', 'One Page'])
  
  // Custom project structure
  customPhases?: Phase[];
  maintenanceTriggerTask?: string;
  
  pricingRules: PricingRule[];
}

export interface MaintenanceInfo {
  id: string;
  year: number;
  startDate: string;
  proforma: DocumentTrack;
  convention: DocumentTrack;
  bcOds: DocumentTrack;
  facture: DocumentTrack;
  encaissement: { status: 'PENDING' | 'DONE'; date?: string };
}

export interface ProjectTask {
  id: string;
  name: string;
  date: string;
  status: 'DONE' | 'IN_PROGRESS' | 'CANCELED' | 'PENDING'; // DONE = Green, CANCELED = Red, IN_PROGRESS = Blue, PENDING = Grey
  reports?: string; // Report description / comment / files
}

export type CardMode = 'Acquisition' | 'Maintenance offerte' | 'Maintenance' | 'Annexe';
export type CardPhase = 'Démarchage' | 'Adaptation' | 'Encaissement' | 'Recouvrement';
export type CardStatus = 'ACTIVE' | 'DONE' | 'SUSPENDED' | 'ABANDONED' | 'PENDING';

export interface Phase {
  id: string;
  name: string;
  tasks: ProjectTask[];
  status?: 'PENDING' | 'ACTIVE' | 'DONE';
  startDate?: string;
  endDate?: string;
}

export interface ProductionModel {
  id: string;
  name: string;
  phases: Phase[];
  ownerId?: string;
}

export interface Contract {
  id: string;
  name: string;
  type: string;
  attachedToContractId?: string;
  mode?: CardMode;
  status: CardStatus | 'CLOSED'; // Keep CLOSED for backward compatibility
  startDate?: string;
  phases: Phase[];
  documents?: Record<string, DocumentTrack>;
}

export interface ProjectContact {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
}

export interface ProjectDocument {
  id: string;
  name: string;
  date: string;
  size: string;
  url?: string;
}

export interface HistoryEvent {
  id: string;
  date: string;
  message: string;
}

export interface Project {
  id: string;
  ownerId?: string;
  clientId: string;
  product: string; // Made generic string for drop list flexibility
  version?: ProductVersion;
  processType?: ProcessType;
  name: string;
  installationDate?: string; // YYYY-MM-DD

  // New Fields
  departement?: string;
  wilaya?: string;
  ville?: string;
  entity?: 'Naltis' | 'Netsprint' | 'MP';
  technique?: string[]; // Collaborators list
  mode?: 'Acquisition' | 'Maintenance offerte' | 'Maintenance' | 'Annexe';
  phase?: 'Démarchage' | 'Adaptation' | 'Encaissement' | 'Recouvrement';
  status?: 'Actif' | 'Effectué' | 'Suspendu' | 'Abandonné';
  createdAt?: string;
  maintenancePeriodicity?: 'Mensuelle' | 'Trimestrielle' | 'Semestrielle' | 'Annuelle';

  // Embedded Entities
  contracts?: Contract[];
  contacts?: ProjectContact[];
  documents?: ProjectDocument[];
  history?: HistoryEvent[];

  // Acquisition Phase (Keep for backward compatibility)
  acqProforma?: DocumentTrack;
  acqSoumission?: DocumentTrack;
  acqConvention?: DocumentTrack;
  acqBcOds?: DocumentTrack;
  acqFacture?: DocumentTrack;
  acqServiceFait?: DocumentTrack;
  acqAbe?: DocumentTrack;
  acqEncaissement?: { status: 'PENDING' | 'DONE'; date?: string };

  maintenances?: MaintenanceInfo[];
  
  encaissements?: EncaissementRecord[];
}

export interface ClientToVisit {
  clientId: string;
  projectId: string;
  name: string;
  wilaya: string;
  missingDocuments: string[];
}

export interface ItineraryDay {
  jour: number;
  wilayas: string[];
  tempsEstime: string;
  clients: {
    name: string;
    wilaya: string;
    documents: string[];
    clientId: string;
    projectId: string;
  }[];
}

export interface Mission {
  id: string;
  ownerId?: string;
  title: string;
  date: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED';
  projectIds: string[]; // List of projects involved
  itineraries: ItineraryDay[]; // The generated plan or manually created plan
}

export type AlertLevel = 'CRITICAL' | 'WARNING';

export interface Alert {
  id: string;
  projectId: string;
  level: AlertLevel;
  message: string;
  documentType?: string; // Optional, to specifically link what's missing
  maintenanceId?: string; // Optional, to link to a specific maintenance record
}
