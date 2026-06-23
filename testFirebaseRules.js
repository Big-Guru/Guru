const project = {
  clientId: '123',
  name: 'Test',
  departement: 'Technique',
  product: 'PAYE',
  wilaya: '',
  ville: '',
  entity: 'Naltis',
  technique: [],
  mode: 'Acquisition',
  phase: 'Démarchage',
  status: 'Actif',
  createdAt: '2026-06-23',
  installationDate: '2026-06-23',
  id: 'uuid',
  ownerId: 'K65QxRVq0wTHzM7iBO15gTBpXCr2',
  contracts: [],
  contacts: [],
  documents: [],
  history: [],
  acqProforma: { status: 'MISSING' },
  acqSoumission: { status: 'MISSING' },
  acqConvention: { status: 'MISSING' },
  acqBcOds: { status: 'MISSING' },
  acqFacture: { status: 'MISSING' },
  acqServiceFait: { status: 'MISSING' },
  acqAbe: { status: 'MISSING' },
  acqEncaissement: { status: 'PENDING' },
  maintenances: []
};

function isValidProject(data) {
  const hasAll = ['ownerId', 'clientId', 'product', 'name', 'acqProforma', 'acqSoumission', 'acqConvention', 'acqBcOds', 'acqFacture', 'acqServiceFait', 'acqAbe', 'acqEncaissement', 'maintenances'].every(k => data.hasOwnProperty(k));
  if (!hasAll) return "Missing required keys";

  if (typeof data.ownerId !== 'string') return "ownerId not string";
  if (typeof data.clientId !== 'string' || data.clientId.length === 0 || data.clientId.length > 128) return "clientId invalid";
  if (typeof data.product !== 'string' || data.product.length === 0 || data.product.length > 100) return "product invalid";
  if (typeof data.name !== 'string' || data.name.length === 0 || data.name.length > 200) return "name invalid";

  const isDocTrack = docData => typeof docData === 'object' && docData !== null && docData.hasOwnProperty('status') && ['MISSING', 'PREPARED', 'VALIDATED', 'DEPOSITED', 'RECUPERATED', 'IGNORED'].includes(docData.status);

  if (!isDocTrack(data.acqProforma)) return "acqProforma invalid";
  if (!isDocTrack(data.acqSoumission)) return "acqSoumission invalid";
  if (!isDocTrack(data.acqConvention)) return "acqConvention invalid";
  if (!isDocTrack(data.acqBcOds)) return "acqBcOds invalid";
  if (!isDocTrack(data.acqFacture)) return "acqFacture invalid";
  if (!isDocTrack(data.acqServiceFait)) return "acqServiceFait invalid";
  if (!isDocTrack(data.acqAbe)) return "acqAbe invalid";

  if (typeof data.acqEncaissement !== 'object' || !['PENDING', 'DONE'].includes(data.acqEncaissement.status)) return "acqEncaissement invalid";
  if (!Array.isArray(data.maintenances) || data.maintenances.length > 100) return "maintenances invalid";

  if (data.hasOwnProperty('version') && !['ULTRALIGHT', 'LIGHT', 'INTERMEDIATE', 'ADVANCED', 'GLOBAL'].includes(data.version)) return "version invalid";
  if (data.hasOwnProperty('installationDate') && (typeof data.installationDate !== 'string' || data.installationDate.length > 50)) return "installationDate invalid";
  if (data.hasOwnProperty('departement') && (typeof data.departement !== 'string' || data.departement.length > 200)) return "departement invalid";
  if (data.hasOwnProperty('wilaya') && (typeof data.wilaya !== 'string' || data.wilaya.length > 100)) return "wilaya invalid";
  if (data.hasOwnProperty('ville') && (typeof data.ville !== 'string' || data.ville.length > 100)) return "ville invalid";
  if (data.hasOwnProperty('entity') && !['Naltis', 'Netsprint', 'MP'].includes(data.entity)) return "entity invalid";
  if (data.hasOwnProperty('technique') && (!Array.isArray(data.technique) || data.technique.length > 100)) return "technique invalid";
  if (data.hasOwnProperty('mode') && !['Acquisition', 'Maintenance offerte', 'Maintenance'].includes(data.mode)) return "mode invalid";
  if (data.hasOwnProperty('phase') && !['Démarchage', 'Adaptation', 'Encaissement', 'Recouvrement'].includes(data.phase)) return "phase invalid";
  if (data.hasOwnProperty('status') && !['Actif', 'Effectué', 'Suspendu', 'Abandonné'].includes(data.status)) return "status invalid";
  if (data.hasOwnProperty('createdAt') && (typeof data.createdAt !== 'string' || data.createdAt.length > 50)) return "createdAt invalid";
  if (data.hasOwnProperty('contracts') && (!Array.isArray(data.contracts) || data.contracts.length > 100)) return "contracts invalid";
  if (data.hasOwnProperty('contacts') && (!Array.isArray(data.contacts) || data.contacts.length > 100)) return "contacts invalid";
  if (data.hasOwnProperty('documents') && (!Array.isArray(data.documents) || data.documents.length > 100)) return "documents invalid";
  if (data.hasOwnProperty('history') && (!Array.isArray(data.history) || data.history.length > 1000)) return "history invalid";

  return "VALID!";
}

console.log(isValidProject(project));
