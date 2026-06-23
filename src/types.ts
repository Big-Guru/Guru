export type DocStatus = 'MISSING' | 'PREPARED' | 'VALIDATED' | 'DEPOSITED' | 'RECUPERATED' | 'IGNORED';

export interface DocumentTrack {
  status: DocStatus;
  dateDoc?: string;
  dateValidated?: string;
  dateDepot?: string;
  dateRecup?: string;
}

export interface Client {
  id: string;
  ownerId?: string;
  name: string;
  address: string;
  wilaya: string;
  effectif: number;
  effectifType: 'SALARIES' | 'ETUDIANTS';
  nif: string;
  nis: string;
  rc: string; // Registre commerce or Agrément
  ai: string; // Article d'imposition
}

export type ProductType = 'PAYE' | 'BUDGET' | 'BUDGET_APC' | 'STOCKS' | 'GRH' | 'PHARMATIS' | 'GBS';
export type ProductVersion = 'ULTRALIGHT' | 'LIGHT' | 'INTERMEDIATE' | 'ADVANCED' | 'GLOBAL';

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

export type CardMode = 'Acquisition' | 'Maintenance offerte' | 'Maintenance';
export type CardPhase = 'Démarchage' | 'Adaptation' | 'Encaissement' | 'Recouvrement';
export type CardStatus = 'ACTIVE' | 'DONE' | 'SUSPENDED' | 'ABANDONED' | 'PENDING';

export interface Phase {
  id: string;
  name: CardPhase;
  status: CardStatus;
  startDate?: string;
  tasks: ProjectTask[];
}

export interface Contract {
  id: string;
  name: string;
  type: string;
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
  name: string;
  installationDate?: string; // YYYY-MM-DD

  // New Fields
  departement?: string;
  wilaya?: string;
  ville?: string;
  entity?: 'Naltis' | 'Netsprint' | 'MP';
  technique?: string[]; // Collaborators list
  mode?: 'Acquisition' | 'Maintenance offerte' | 'Maintenance';
  phase?: 'Démarchage' | 'Adaptation' | 'Encaissement' | 'Recouvrement';
  status?: 'Actif' | 'Effectué' | 'Suspendu' | 'Abandonné';
  createdAt?: string;

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
