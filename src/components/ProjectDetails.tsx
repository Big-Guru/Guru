import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store';
import { ArrowLeft, Plus, X, Trash2, Calendar, User, Phone, Mail, FileText, CheckCircle, CheckCircle2, Clock, Trash, FolderKanban, Edit3, Banknote, Power, PowerOff } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { ProjectTask, Contract, ProjectContact, DocumentTrack, DocumentDraft, ProductVersion } from '../types';
import { generateWordDocument } from '../lib/docxGenerator';
import { getPrice } from '../lib/pricing';
import DocumentPreviewModal from './DocumentPreviewModal';
import FacturationDossierModal from './FacturationDossierModal';
import { cn } from '../lib/utils';

const getOwnerAvatar = (id: string) => {
  const avatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
  ];
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
  return avatars[sum % avatars.length];
};

export default function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const fromClientId = location.state?.fromClientId;
  const {
    projects,
    clients,
    updateProject,
    deleteProject,
    addContract,
    addCustomContract,
    deleteCustomContract,
    updateContractStatus,
    updateTaskInContract,
    togglePhaseStatus,
    addMaintenance,
    deleteMaintenance,
    updateEncaissement,
    dissociateDossier,
    generateMaintenanceEncaissement,
    activateMaintenanceEncaissement,
    deactivateMaintenanceEncaissement,
    addHistoryEvent,
    addDocumentHistoryEvent,
    addDossierPaiement,
    updateDossierPaiement,
    dossiersPaiement,
    products
  } = useStore();

  const project = projects.find(p => p.id === id);
  const client = clients.find(c => c.id === project?.clientId);

  const [showContacts, setShowContacts] = useState(false);
  const [showBilling, setShowBilling] = useState(false);
  const [showNewContract, setShowNewContract] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);
  const [showEditProject, setShowEditProject] = useState(false);
  const [showContractManager, setShowContractManager] = useState(false);
  const [contractModalTab, setContractModalTab] = useState<'production' | 'encaissement'>('production');
  const [showFacturation, setShowFacturation] = useState<boolean | string>(false);
  const [dossierToDissociate, setDossierToDissociate] = useState<string | null>(null);
  const [selectedMergeCandidate, setSelectedMergeCandidate] = useState<string>('none');
  const [previewModalConfig, setPreviewModalConfig] = useState<{
    isOpen: boolean;
    type: 'PROFORMA' | 'FACTURE';
    encaissementId?: string;
    draftSnapshot?: DocumentDraft;
    isReadOnly?: boolean;
    readOnlyStatus?: string;
  }>({ isOpen: false, type: 'PROFORMA' });

  const mergeCandidates = useMemo(() => {
    if (!project?.clientId) return [];

    const candidates: Array<{ type: 'DOSSIER' | 'SINGLE', id: string, name: string, projectId?: string }> = [];

    const activeDossiers = dossiersPaiement.filter(d =>
      d.clientId === project.clientId &&
      d.status !== 'DONE' &&
      d.encaissementIds &&
      d.encaissementIds.some(eid => projects.some(p => p.encaissements?.some(e => e.id === eid)))
    );
    activeDossiers.forEach(d => {
      candidates.push({ type: 'DOSSIER', id: d.id, name: `Dossier fusionné existant (Créé le ${new Date(d.createdAt).toLocaleDateString('fr-FR')})` });
    });

    const clientProjects = projects.filter(p => p.clientId === project.clientId);
    clientProjects.forEach(p => {
      if (p.encaissements) {
        p.encaissements.forEach(e => {
          if (!e.isCombined && (e.status === 'IN_PROGRESS' || e.status === 'PARTIAL')) {
            candidates.push({ type: 'SINGLE', id: e.id, projectId: p.id, name: `Encaissement ${e.mode} - Projet: ${p.name}` });
          }
        });
      }
    });

    return candidates;
  }, [project, dossiersPaiement, projects]);

  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [activePhaseId, setActivePhaseId] = useState<string | null>(null);

  const [manualFusionSelection, setManualFusionSelection] = useState<any[]>([]);
  const [isCreatingDossier, setIsCreatingDossier] = useState(false);
  const isCreatingRef = useRef(false);

  const handleCreateDossier = async (group: any[]) => {
    if (isCreatingRef.current || group.length === 0) return;
    isCreatingRef.current = true;
    setIsCreatingDossier(true);
    try {
      const existingDossierId = group.find(e => e.isCombined && e.combinedWithDossierId)?.combinedWithDossierId;

      if (existingDossierId) {
        const existingDossier = dossiersPaiement.find(d => d.id === existingDossierId);
        if (existingDossier) {
          const currentEncIds = existingDossier.encaissementIds || [];
          const newEncIdsToAdd = group.filter(e => !e.isCombined).map(e => e.id);
          const mergedEncIds = Array.from(new Set([...currentEncIds, ...newEncIdsToAdd]));

          const currentProjectIds = existingDossier.projectIds || [];
          const newProjectIdsToAdd = group.map(e => e.projectId || project.id);
          const mergedProjectIds = Array.from(new Set([...currentProjectIds, ...newProjectIdsToAdd]));

          updateDossierPaiement(existingDossierId, {
            encaissementIds: mergedEncIds,
            projectIds: mergedProjectIds
          });

          group.forEach(e => {
            if (!e.isCombined) {
              updateEncaissement(e.projectId || project.id, e.id, { isCombined: true, combinedWithDossierId: existingDossierId });
            }
          });
        }
      } else {
        const newId = await addDossierPaiement({
          clientId: project.clientId,
          projectIds: Array.from(new Set(group.map(e => e.projectId || project.id))),
          encaissementIds: group.map(e => e.id),
          status: 'DRAFT',
          total: 0,
          encaisse: 0
        });

        if (newId) {
          group.forEach(e => {
            updateEncaissement(e.projectId || project.id, e.id, { isCombined: true, combinedWithDossierId: newId });
          });
        }
      }

      setManualFusionSelection([]);

      setTimeout(() => {
        isCreatingRef.current = false;
        setIsCreatingDossier(false);
      }, 500);
    } catch (e) {
      console.error("Erreur lors de la création/fusion du dossier", e);
      isCreatingRef.current = false;
      setIsCreatingDossier(false);
    }
  };

  // Self-healing logic for Maintenance contract
  useEffect(() => {
    if (!project || !project.encaissements || !project.contracts) return;
    let needsFix = false;
    const updatedContracts = project.contracts.map(c => {
      if (c.mode === 'Maintenance') {
        const match = c.name.match(/\d+/);
        const year = match ? parseInt(match[1], 10) : 1;

        const maintEnc = project.encaissements?.find(e => e.mode === 'Maintenance' && e.year === year);

        if (maintEnc) {
          if (maintEnc.status === 'IN_PROGRESS' || maintEnc.status === 'PARTIAL') {
            if (c.status === 'PENDING' || c.startDate !== maintEnc.targetDate) {
              needsFix = true;
              return {
                ...c,
                status: 'ACTIVE' as const,
                startDate: maintEnc.targetDate,
                phases: c.phases?.map((ph: any, idx: number) => idx === 0 ? { ...ph, status: 'ACTIVE' as const } : ph) || []
              };
            }
          } else if (maintEnc.status === 'UPCOMING') {
            if (c.status === 'ACTIVE' || c.startDate !== maintEnc.targetDate) {
              needsFix = true;
              return {
                ...c,
                status: 'PENDING' as const,
                startDate: maintEnc.targetDate,
                phases: c.phases?.map((ph: any) => ({ ...ph, status: 'PENDING' as const })) || []
              };
            }
          }
        }
      }
      return c;
    });

    if (needsFix) {
      updateProject(project.id, { contracts: updatedContracts });
    }
  }, [project, updateProject]);

  const handleFuseDossiers = async () => {
    const encaissementsToFuse: any[] = [];
    manualFusionSelection.forEach(card => {
      if (card.isEncaissementCard) {
        if (card.status !== 'DONE') {
          encaissementsToFuse.push(card);
        }
      } else {
        const activeEnc = (project.encaissements || []).filter(e => e.contractId === card.id && e.status !== 'DONE');
        encaissementsToFuse.push(...activeEnc);
      }
    });

    if (encaissementsToFuse.length < 2) {
      alert("La fusion nécessite au moins 2 encaissements non réglés parmi les cartes sélectionnées.");
      return;
    }

    const newId = await addDossierPaiement({
      clientId: client.id,
      projectIds: [project.id],
      encaissementIds: encaissementsToFuse.map(e => e.id),
      status: 'DRAFT',
      total: 0,
      encaisse: 0
    });

    if (newId) {
      const updatedEncaissements = (project.encaissements || []).map(enc => {
        if (encaissementsToFuse.some(e => e.id === enc.id)) {
          return { 
            ...enc, 
            isCombined: true, 
            combinedWithDossierId: newId,
            proforma: { status: 'CANCELLED' as const },
            soumission: { status: 'CANCELLED' as const },
            convention: { status: 'CANCELLED' as const },
            bc: { status: 'CANCELLED' as const },
            serviceFait: { status: 'CANCELLED' as const },
            abe: { status: 'CANCELLED' as const },
            facture: { status: 'CANCELLED' as const },
            documentHistory: [
              ...(enc.documentHistory || []),
              {
                id: crypto.randomUUID(),
                date: new Date().toISOString(),
                documentType: 'PROFORMA',
                action: 'Facturation individuelle annulée (Fusion de dossiers)',
                user: 'Système'
              }
            ]
          };
        }
        return enc;
      });
      updateProject(project.id, { encaissements: updatedEncaissements });
    }
    setManualFusionSelection([]);
  };

  const [showNewContractModal, setShowNewContractModal] = useState(false);
  const [newContractName, setNewContractName] = useState('');
  const [newContractPrice, setNewContractPrice] = useState('');

  const [showNewEncaissementModal, setShowNewEncaissementModal] = useState(false);
  const [newEncaissementType, setNewEncaissementType] = useState<'AVANCE' | 'TOTAL'>('AVANCE');
  const [newEncaissementBillingMode, setNewEncaissementBillingMode] = useState<'FACTURE' | 'PARTIEL'>('FACTURE');
  const [newEncaissementTargetDate, setNewEncaissementTargetDate] = useState('');
  const [newEncaissementIsLinked, setNewEncaissementIsLinked] = useState<boolean>(true);
  const [newEncaissementTitle, setNewEncaissementTitle] = useState('');
  const [newEncaissementContractId, setNewEncaissementContractId] = useState<string>('');
  const [newEncaissementPercentage, setNewEncaissementPercentage] = useState<number>(30);
  const [newEncaissementProduct, setNewEncaissementProduct] = useState(project?.product || '');
  const [newEncaissementVersion, setNewEncaissementVersion] = useState<ProductVersion | ''>(project?.version || '');


  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [newTaskStatus, setNewTaskStatus] = useState<'PENDING' | 'IN_PROGRESS' | 'DONE' | 'CANCELED'>('PENDING');

  const [newContactName, setNewContactName] = useState('');
  const [newContactRole, setNewContactRole] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');

  const [newMaintenanceYear, setNewMaintenanceYear] = useState(new Date().getFullYear());
  const [newMaintenanceDate, setNewMaintenanceDate] = useState(new Date().toISOString().split('T')[0]);

  const [reportModalTask, setReportModalTask] = useState<{ phaseId: string, taskId: string, report: string } | null>(null);
  const [reportEmail, setReportEmail] = useState('');

  const [editData, setEditData] = useState({
    departement: project?.departement || 'D1',
    product: project?.product || 'PAYE',
    version: project?.version || 'LIGHT',
    entity: project?.entity || 'Naltis',
    technique: project?.technique || [],
    responsable: project?.ownerId || '',
    wilaya: project?.wilaya || '',
    ville: project?.ville || '',
    createdAt: project?.createdAt || ''
  });

  if (!project || !client) return <div className="p-8">Projet introuvable</div>;

  let contractsList = [...(project.contracts || [])];

  const sortedContracts: any[] = [];
  const parentContracts = contractsList.filter(c => !c.attachedToContractId);
  const annexes = contractsList.filter(c => c.attachedToContractId);

  parentContracts.forEach(parent => {
    sortedContracts.push(parent);
    const attachedAnnexes = annexes.filter(a => a.attachedToContractId === parent.id);
    sortedContracts.push(...attachedAnnexes);
  });

  const orphanedAnnexes = annexes.filter(a => !parentContracts.some(p => p.id === a.attachedToContractId));
  sortedContracts.push(...orphanedAnnexes);

  contractsList = sortedContracts;
  const contactsList = project.contacts || [];
  const historyList = project.history || [];
  const currentContract = contractsList.find(c => c.id === selectedContractId) || contractsList.find(c => c.status !== 'DONE') || contractsList[0];

  const handleAddContract = (e: React.FormEvent) => {
    e.preventDefault();
    addContract(project.id, {
      name: newContractName,
      type: 'Nouveau Contrat',
      mode: newContractMode as any,
      phase: newContractPhase as any,
      status: 'ACTIVE',
    });
    setShowNewContract(false);
  };

  const updateContractField = (field: keyof Contract, value: any) => {
    if (!currentContract || !project.contracts) return;
    const updatedContracts = project.contracts.map(c =>
      c.id === currentContract.id ? { ...c, [field]: value } : c
    );
    updateProject(project.id, { contracts: updatedContracts });
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentContract || !project.contracts) return;

    const targetPhaseId = activePhaseId || currentContract.phases?.[0]?.id;
    if (!targetPhaseId) return;

    const newTask: ProjectTask = {
      id: Date.now().toString(),
      name: newTaskName,
      date: newTaskDate,
      status: newTaskStatus
    };

    const updatedContracts = project.contracts.map(c => {
      if (c.id !== currentContract.id) return c;
      return {
        ...c,
        phases: c.phases?.map(p => p.id === targetPhaseId ? { ...p, tasks: [...(p.tasks || []), newTask] } : p)
      };
    });

    updateProject(project.id, { contracts: updatedContracts });
    setShowNewTask(false);
    setNewTaskName('');
  };

  const handleSaveReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportModalTask || !currentContract) return;

    updateTaskInContract(project.id, currentContract.id, reportModalTask.phaseId, reportModalTask.taskId, { reports: reportModalTask.report });

    if (reportEmail) {
      const subject = encodeURIComponent(`Rapport de tâche - ${project.name}`);
      const body = encodeURIComponent(reportModalTask.report);
      window.location.href = `mailto:${reportEmail}?subject=${subject}&body=${body}`;
    }

    setReportModalTask(null);
    setReportEmail('');
  };

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    const newContact: ProjectContact = {
      id: Date.now().toString(),
      name: newContactName,
      role: newContactRole,
      phone: newContactPhone,
      email: newContactEmail
    };
    updateProject(project.id, { contacts: [...contactsList, newContact] });
    setNewContactName(''); setNewContactRole(''); setNewContactPhone(''); setNewContactEmail('');
  };

  const deleteProjectContact = (projectId: string, contactId: string) => {
    updateProject(projectId, { contacts: contactsList.filter(c => c.id !== contactId) });
  };

  const handleAddMaintenance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaintenanceYear || !newMaintenanceDate) return;
    addMaintenance(project.id, newMaintenanceYear, newMaintenanceDate);
  };

  const updateMaintenanceDoc = (maintenanceId: string, key: string, updates: Partial<DocumentTrack>) => {
    if (!project.maintenances) return;
    const updatedMaintenances = project.maintenances.map(x => {
      if (x.id !== maintenanceId) return x;
      return { ...x, [key]: { ...(x as any)[key], ...updates } };
    });
    updateProject(project.id, { maintenances: updatedMaintenances });
  };

  const updateMaintenanceField = (maintenanceId: string, field: string, value: any) => {
    if (!project.maintenances) return;
    const updatedMaintenances = project.maintenances.map(x => {
      if (x.id !== maintenanceId) return x;
      return { ...x, [field]: value };
    });
    updateProject(project.id, { maintenances: updatedMaintenances });
  };

  const handleSaveEditProject = (e: React.FormEvent) => {
    e.preventDefault();
    updateProject(project.id, {
      departement: editData.departement,
      product: editData.product as any,
      version: editData.version as any,
      entity: editData.entity as any,
      technique: editData.technique,
      ownerId: editData.responsable,
      wilaya: editData.wilaya,
      ville: editData.ville,
      createdAt: editData.createdAt
    });
    setShowEditProject(false);
  };

  return (
    <div className="animate-fade-in pb-12 w-full max-w-7xl mx-auto flex flex-col gap-8">
      <div className="flex flex-col xl:flex-row gap-6 items-stretch w-full">
        {/* LEFT PANEL */}
        <div className="flex-1 w-full space-y-6 min-w-0">
          <Link to={fromClientId ? `/clients/${fromClientId}` : "/projects"} className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl text-xs font-extrabold text-slate-500 hover:text-blue-600 shadow-sm transition-all w-max">
            <ArrowLeft className="w-4 h-4" />
            {fromClientId ? "Retour au profil client" : "Retour à la liste des projets"}
          </Link>
          {/* 1. Header Banner */}
          <div className="relative overflow-hidden bg-white rounded-[2rem] p-6 lg:p-8 border border-slate-200/60 shadow-sm flex flex-col gap-4 group">
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-50 rounded-full blur-3xl group-hover:bg-blue-100/60 transition-colors z-0"></div>
            <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-indigo-50 rounded-full blur-3xl group-hover:bg-indigo-100/60 transition-colors z-0"></div>

            <div className="relative z-10 flex flex-col gap-4">
              <div className="flex justify-between items-start relative z-10">
                <div className="flex items-center gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
                        {client?.name || 'Client Inconnu'}
                      </h1>
                    </div>
                    <p className="text-slate-400 font-bold tracking-wide text-xs uppercase flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                      Projet : {project.name}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-4 lg:mt-0">
                  {project.product && (
                    <span className="bg-indigo-50/50 text-indigo-700 border border-indigo-100 px-4 py-2 rounded-xl font-black text-sm tracking-widest uppercase shadow-sm flex items-center justify-center">
                      {project.product}
                    </span>
                  )}
                  <button onClick={() => setShowEditProject(true)} className="bg-blue-50/50 hover:bg-blue-100/50 text-blue-600 border border-blue-100 hover:border-blue-200 px-4 py-2 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2">
                    <Edit3 className="w-4 h-4" /> Modifier
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Voulez-vous vraiment supprimer ce projet ? Cette action est irréversible.')) {
                        deleteProject(project.id);
                        navigate(`/clients/${project.clientId}`);
                      }
                    }}
                    className="bg-red-50/50 hover:bg-red-100/50 text-red-600 border border-red-100 hover:border-red-200 px-4 py-2 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Supprimer
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 mt-6 relative z-10 pt-4 border-t border-slate-100 w-full">
                <div className="flex items-center gap-12">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Entité</span>
                    <span className="text-sm font-extrabold text-slate-700">{project.entity || '-'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Version</span>
                    <span className="text-sm font-extrabold text-slate-700">{project.version || '-'}</span>
                  </div>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Date Création</span>
                  <span className="text-sm font-extrabold text-slate-700">{project.createdAt || '-'}</span>
                </div>
              </div>
            </div>
          </div>

          {(() => {
            const acquisitionContract = project.contracts?.find(c => c.mode === 'Acquisition');
            const encaissementPhase = acquisitionContract?.phases?.find(p => p.name === 'Encaissement');
            const missingAcquisitionDocs = encaissementPhase?.tasks?.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS') || [];

            let missingDocsCount = 0;
            const activeEncaissements = project.encaissements?.filter(e => e.status !== 'UPCOMING' && e.status !== 'ABANDONED') || [];

            activeEncaissements.forEach(enc => {
              if (enc.soumission?.status !== 'VALIDATED') missingDocsCount++;
              if (enc.convention?.status !== 'VALIDATED') missingDocsCount++;
              if (enc.proforma?.status !== 'VALIDATED') missingDocsCount++;
              if (enc.bc?.status !== 'RECOVERED') missingDocsCount++;
              if (enc.serviceFait?.status !== 'RECOVERED') missingDocsCount++;
              if (enc.facture?.status !== 'VALIDATED') missingDocsCount++;
              if (enc.abe?.status !== 'RECOVERED') missingDocsCount++;
            });

            return (
              <div className="flex flex-wrap items-center justify-end gap-3 shrink-0 mb-9 mt-4">
                <button onClick={() => setShowContacts(true)} className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-800 rounded-2xl text-xs font-extrabold shadow-sm transition-all group">
                  <User className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
                  Contacts
                  <span className="bg-slate-100 group-hover:bg-indigo-100 text-slate-600 px-2 py-0.5 rounded-md text-[10px] ml-1">{contactsList.length}</span>
                </button>

                <button onClick={() => setShowBilling(true)} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white rounded-2xl text-xs font-extrabold shadow-md transition-all hover:-translate-y-0.5 shadow-slate-900/20">
                  <FileText className="w-4 h-4 text-slate-300" />
                  Documents
                  {missingDocsCount > 0 && (
                    <span className="bg-red-500 text-white px-2 py-0.5 rounded-md text-[10px] ml-1 shadow-sm font-black animate-pulse">{missingDocsCount} manquants</span>
                  )}
                </button>

                <button onClick={() => setShowFacturation(true)} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-2xl text-xs font-extrabold shadow-md transition-all hover:-translate-y-0.5 shadow-emerald-600/20">
                  <Banknote className="w-4 h-4 text-emerald-100" />
                  Facturation
                </button>
              </div>
            );
          })()}

          <div className="space-y-2">
            <div className="flex justify-between items-center px-4">
              <h3 className="font-extrabold text-xl text-slate-900">
                Modes
              </h3>
              <div className="flex items-center gap-2">
                {manualFusionSelection.length > 1 && (
                  <button onClick={handleFuseDossiers} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:-translate-y-0.5 shadow-violet-600/20 mr-2">
                    <FolderKanban className="w-4 h-4" />
                    Fusionner ({manualFusionSelection.length})
                  </button>
                )}
                <button onClick={() => setShowNewContractModal(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors shadow-sm">
                  <Plus className="w-4 h-4" />
                  Contrat
                </button>
                <button onClick={() => {
                  setNewEncaissementContractId(selectedContractId || contractsList[0]?.id || '');
                  setNewEncaissementProduct(project?.product || '');
                  setNewEncaissementVersion(project?.version || '');
                  setShowNewEncaissementModal(true);
                }} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-colors shadow-sm">
                  <Plus className="w-4 h-4" />
                  Encaissement
                </button>
              </div>
            </div>
            <div className="flex flex-row items-stretch gap-5 overflow-x-auto pb-8 pt-6 px-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] relative">
              {(() => {
                let splitIndex = -1;
                for (let i = contractsList.length - 1; i >= 0; i--) {
                  if (contractsList[i].status === 'ACTIVE') {
                    splitIndex = i;
                    break;
                  }
                }
                const activeList = contractsList.filter(c => c.status === 'ACTIVE');
                const inactiveList = contractsList.filter(c => c.status !== 'ACTIVE');

                const activeIndependentEncaissements = (project.encaissements || []).filter(e => e.mode === 'Indépendant');

                const activeGroups: { parent: any, annexes: any[] }[] = [];
                const standaloneActive: any[] = [];
                const mainActive = activeList.filter(c => c.mode !== 'Annexe');
                const activeAnnexes = activeList.filter(c => c.mode === 'Annexe');

                mainActive.forEach(parent => {
                   activeGroups.push({ parent, annexes: [] });
                });

                activeAnnexes.forEach(annexe => {
                   const targetParentGroup = activeGroups.find(g => g.parent.mode === 'Acquisition') || 
                                             activeGroups.find(g => g.parent.mode === 'Maintenance') || 
                                             activeGroups[0];
                   if (targetParentGroup) {
                     targetParentGroup.annexes.push(annexe);
                   } else {
                     standaloneActive.push(annexe);
                   }
                });
                
                activeIndependentEncaissements.forEach(enc => {
                  standaloneActive.push({ ...enc, isEncaissementCard: true, name: enc.title || 'Encaissement' });
                });

                const allActiveGroups = [...activeGroups];
                standaloneActive.forEach(a => allActiveGroups.push({ parent: a, annexes: [] }));

                const renderCard = (card: any, extraClasses: string = "") => {
                  if (card.isEncaissementCard) {
                    const isDone = card.status === 'DONE';
                    const isPending = card.status === 'PENDING';
                    
                    return (
                      <div
                        key={card.id}
                        className={cn(
                          "shrink-0 flex flex-col justify-between p-6 rounded-[28px] w-[280px] h-[190px] text-left transition-all duration-500 border overflow-hidden relative group",
                          "bg-cyan-400 backdrop-blur-xl border-cyan-300 shadow-cyan-500/20",
                          extraClasses
                        )}
                      >
                        {card.status !== 'DONE' && (
                          <div className="absolute top-4 right-4 z-20">
                            {(card.isCombined || card.combinedWithDossierId) ? (
                              <div className="w-4 h-4 rounded-full bg-cyan-100/50 shadow-sm border border-white" title="Inclus dans un dossier d'encaissement" />
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const isChecked = manualFusionSelection.some((item: any) => item.id === card.id);
                                  if (!isChecked) {
                                    setManualFusionSelection([...manualFusionSelection, card]);
                                  } else {
                                    setManualFusionSelection(manualFusionSelection.filter((item: any) => item.id !== card.id));
                                  }
                                }}
                                className={cn(
                                  "w-5 h-5 rounded-full border-2 transition-all hover:scale-110 shadow-sm flex items-center justify-center",
                                  manualFusionSelection.some((e: any) => e.id === card.id)
                                    ? "bg-white border-white text-cyan-500" 
                                    : "bg-white/20 border-white text-transparent hover:bg-white/30"
                                )}
                                title="Sélectionner pour fusion"
                              >
                                {manualFusionSelection.some((e: any) => e.id === card.id) && (
                                  <svg viewBox="0 0 14 14" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 7.5L5.5 10L11 4" />
                                  </svg>
                                )}
                              </button>
                            )}
                          </div>
                        )}
                        <div className="relative z-10 flex flex-col h-full pt-1 w-full">
                          <div className="flex items-start justify-between w-full">
                            <div className="flex items-start gap-2">
                              {isDone && <CheckCircle2 className="w-5 h-5 text-cyan-100 shrink-0 mt-0.5" />}
                              <h4 className="font-extrabold text-[22px] tracking-tight leading-none mb-1.5 text-white pr-8">
                                {card.name}
                              </h4>
                            </div>
                          </div>
                          
                          <span className="text-xs font-bold block mb-4 text-cyan-50 uppercase">
                            Encaissement
                          </span>
                          
                          <div className="flex justify-between items-end mt-auto w-full">
                            <div className="flex flex-col gap-2.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-100">
                                {card.targetDate ? `Cible: ${new Date(card.targetDate).toLocaleDateString('fr-FR')}` : 'Non défini'}
                              </span>
                              <div className="font-bold text-sm text-white">
                                {card.encaissementType === 'AVANCE' ? `Avance (${card.percentage || 30}%)` : 'Total (Solde)'}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {card.status !== 'DONE' && (
                                <button onClick={(e) => {
                                  e.stopPropagation();
                                  updateProject(project.id, {
                                    encaissements: (project.encaissements || []).map(enc => enc.id === card.id ? { ...enc, status: 'DONE' } : enc)
                                  });
                                }} className="p-2 bg-white/20 text-white hover:bg-white/30 rounded-xl backdrop-blur-sm" title="Marquer comme Réglé">
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                              )}
                              <button onClick={(e) => {
                                e.stopPropagation();
                                setShowFacturation(card.id);
                              }} className="p-2 bg-white/20 text-white hover:bg-white/30 rounded-xl backdrop-blur-sm" title="Gérer le dossier">
                                <Banknote className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  const isActive = selectedContractId ? card.id === selectedContractId : currentContract?.id === card.id;
                  const isPending = card.status === 'PENDING';
                  const isDone = card.status === 'DONE' || card.status === 'ABANDONED';
                  
                  const allEncaissementsForContract = (project.encaissements || []).filter(e => e.contractId === card.id);
                  const activeEncaissements = allEncaissementsForContract.filter(e => e.status !== 'DONE');
                  const hasActiveEncaissements = activeEncaissements.length > 0 && !isPending;
                  const hasAnyEncaissement = allEncaissementsForContract.length > 0 && !isPending;

                  const activePhaseIndex = card.phases ? card.phases.findIndex((p: any) => p.status !== 'DONE') : -1;
                  const actualPhaseIndex = activePhaseIndex === -1 && card.phases && card.phases.length > 0 ? card.phases.length - 1 : Math.max(0, activePhaseIndex);
                  const activePhase = card.phases?.[actualPhaseIndex];
                  const currentPhaseCount = card.phases && card.phases.length > 0 ? actualPhaseIndex + 1 : 0;
                  const totalPhasesCount = card.phases?.length || 0;

                  const hasColor = card.status === 'ACTIVE';

                  let colorClasses = "";
                  if (card.mode === 'Acquisition') {
                    colorClasses = hasColor ? "bg-blue-50 backdrop-blur-xl border-blue-200/60 shadow-blue-500/10" : "bg-white backdrop-blur-xl border-slate-200/60 hover:bg-blue-50 hover:border-blue-200/60";
                  } else if (card.mode === 'Maintenance offerte') {
                    colorClasses = hasColor ? "bg-red-50 backdrop-blur-xl border-red-200/60 shadow-red-500/10" : "bg-white backdrop-blur-xl border-slate-200/60 hover:bg-red-50 hover:border-red-200/60";
                  } else if (card.mode === 'Annexe') {
                    colorClasses = hasColor ? "bg-amber-50 backdrop-blur-xl border-amber-200/60 shadow-amber-500/10" : "bg-white backdrop-blur-xl border-slate-200/60 hover:bg-amber-50 hover:border-amber-200/60";
                  } else {
                    colorClasses = hasColor ? "bg-emerald-50 backdrop-blur-xl border-emerald-200/60 shadow-emerald-500/10" : "bg-white backdrop-blur-xl border-slate-200/60 hover:bg-emerald-50 hover:border-emerald-200/60";
                  }

                  return (
                    <button
                      key={card.id}
                      onClick={() => {
                        setSelectedContractId(card.id);
                        setShowContractManager(true);
                      }}
                      className={cn(
                        "shrink-0 flex flex-col justify-between p-6 rounded-[28px] w-[280px] h-[190px] text-left transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] border overflow-hidden relative group",
                        colorClasses,
                        hasAnyEncaissement ? "pr-11" : "",
                        extraClasses,
                        isActive ? "shadow-xl ring-2 ring-offset-2 ring-slate-100 scale-[1.02] grayscale-0 opacity-100" : "shadow-sm hover:shadow-md hover:-translate-y-1 hover:scale-[1.02] grayscale-[15%] hover:grayscale-0",
                        (isPending && !isActive) ? "grayscale-[50%] opacity-100 bg-slate-50 hover:grayscale-0" : "",
                        (isDone && !isActive) ? "grayscale-[30%] opacity-100 bg-slate-50 hover:grayscale-0" : ""
                      )}
                    >
                      {hasAnyEncaissement && (
                        <div className="absolute right-0 top-0 bottom-0 w-9 bg-cyan-400 flex items-center justify-center z-20 shadow-[-2px_0_10px_rgba(34,211,238,0.2)]">
                          <span className="text-white font-black text-[11px] tracking-[0.15em] uppercase" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                            Encaissement
                          </span>
                        </div>
                      )}
                      {hasActiveEncaissements && (
                        <div className="absolute top-4 right-0 w-9 flex justify-center z-30" onClick={e => e.stopPropagation()}>
                          {activeEncaissements.some((e: any) => e.isCombined || e.combinedWithDossierId) ? (
                            <div className="w-4 h-4 rounded-full bg-violet-500 border-2 border-white shadow-sm" title="Inclus dans un dossier d'encaissement" />
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const isChecked = manualFusionSelection.some((item: any) => item.id === card.id);
                                if (!isChecked) {
                                  setManualFusionSelection([...manualFusionSelection, card]);
                                } else {
                                  setManualFusionSelection(manualFusionSelection.filter((item: any) => item.id !== card.id));
                                }
                              }}
                              className={cn(
                                "w-4 h-4 rounded-full border-2 transition-all hover:scale-110 shadow-sm flex items-center justify-center",
                                manualFusionSelection.some((e: any) => e.id === card.id)
                                  ? "bg-blue-500 border-blue-500 text-white" 
                                  : "bg-white border-white text-transparent hover:border-blue-300"
                              )}
                              title="Sélectionner pour fusion"
                            >
                              {manualFusionSelection.some((e: any) => e.id === card.id) && (
                                <svg viewBox="0 0 14 14" fill="none" className="w-2.5 h-2.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 7.5L5.5 10L11 4" />
                                </svg>
                              )}
                            </button>
                          )}
                        </div>
                      )}
                      
                      {isActive && (
                        <>
                          <div className={cn("absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl z-0 pointer-events-none", card.mode === 'Acquisition' ? 'bg-blue-100' : card.mode === 'Maintenance offerte' ? 'bg-red-100' : 'bg-green-100')}></div>
                          <div className={cn("absolute -left-10 -bottom-10 w-32 h-32 rounded-full blur-3xl z-0 pointer-events-none", card.mode === 'Acquisition' ? 'bg-indigo-100' : card.mode === 'Maintenance offerte' ? 'bg-orange-100' : 'bg-emerald-100')}></div>
                        </>
                      )}

                      <div className="relative z-10 flex flex-col h-full pt-1 w-full">
                        <div className="flex items-start justify-between w-full">
                          <div className="flex items-start gap-2">
                            {isDone && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />}
                            <h4 className={cn(
                              "font-extrabold text-[22px] tracking-tight leading-none mb-1.5 transition-colors pr-8",
                              hasColor ? (card.mode === 'Acquisition' ? "text-blue-900" : card.mode === 'Maintenance offerte' ? "text-red-900" : "text-green-900") : "text-slate-800"
                            )}>
                              {card.name}
                            </h4>
                          </div>
                        </div>
                        {activePhase && (
                          <span className={cn(
                            "text-xs font-bold block mb-4 transition-colors",
                            hasColor ? "text-slate-600" : "text-slate-400"
                          )}>
                            <span className={hasColor ? "text-slate-900" : "text-slate-500"}>{activePhase.name}</span>
                          </span>
                        )}
                        <div className="flex justify-between items-end mt-auto w-full">
                          <div className="flex flex-col gap-2.5">
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-wider transition-colors",
                              hasColor ? "text-slate-500" : "text-slate-400"
                            )}>
                              {(() => {
                                let displayDate = card.startDate;
                                if (!displayDate && card.mode === 'Maintenance') {
                                  const match = card.name.match(/\d+/);
                                  if (match) {
                                    const year = parseInt(match[1], 10);
                                    const enc = project.encaissements?.find(e => e.mode === 'Maintenance' && e.year === year);
                                    if (enc?.targetDate) displayDate = enc.targetDate;
                                  }
                                }
                                return displayDate ? `Début: ${new Date(displayDate).toLocaleDateString('fr-FR')}` : (isPending ? 'En attente' : 'Non défini');
                              })()}
                            </span>
                            {activePhase && activePhase.tasks && activePhase.tasks.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap max-w-[120px]">
                                {activePhase.tasks.map((t: any) => (
                                  <div
                                    key={t.id}
                                    className={cn(
                                      "w-2 h-2 rounded-full shadow-sm border border-black/5",
                                      t.status === 'DONE' ? 'bg-emerald-400' :
                                        t.status === 'IN_PROGRESS' ? 'bg-blue-400' :
                                          'bg-slate-300'
                                    )}
                                    title={t.name}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                          <div className={cn(
                            "text-sm font-extrabold transition-colors flex flex-col items-end gap-1",
                            isActive ? "text-slate-800" : "text-slate-500"
                          )}>
                            <span>{currentPhaseCount}/{totalPhasesCount} <span className="text-[10px] uppercase font-bold opacity-70">Phases</span></span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                };

                return (
                  <div className="flex flex-row items-stretch gap-5 w-full">
                    
                    {/* ZONE DROITE : Inactifs */}
                    {inactiveList.length > 0 && (
                      <div className="peer/inactive order-last flex flex-row items-center -space-x-[224px] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] shrink-0 relative pt-10 pb-2 pl-4 pr-4">
                        <div className="absolute top-0 left-8 text-[10px] font-black uppercase text-slate-400 tracking-widest z-50">Historique & À venir</div>
                        {inactiveList.map((card, idx) => (
                           <div key={card.id} className="relative shrink-0 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-2 hover:!z-50" style={{ zIndex: idx }}>
                             {renderCard(card, "shadow-xl border-slate-200")}
                           </div>
                        ))}
                      </div>
                    )}

                    {/* SÉPARATEUR */}
                    {inactiveList.length > 0 && allActiveGroups.length > 0 && (
                      <div className="w-[1px] bg-slate-200/60 shrink-0 mt-10 mx-5 h-[190px] self-start" style={{ order: 0 }}></div>
                    )}

                    {/* ZONE GAUCHE : Actifs */}
                    <div className={cn(
                      "order-first flex flex-row items-center transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] relative pt-10 pb-2 gap-5"
                    )}>
                      {allActiveGroups.length > 0 && (
                        <div className="absolute top-0 left-4 text-[10px] font-black uppercase text-slate-400 tracking-widest z-50">Actifs</div>
                      )}
                      {allActiveGroups.map((grp, idx) => (
                       <div key={idx} className={cn(
                         "relative flex flex-row items-center transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] hover:!z-50",
                         grp.annexes.length > 0 ? "group/ministack -space-x-[224px]" : ""
                       )} style={{ zIndex: 40 - idx }}>
                         
                         {/* Parent Contract */}
                         <div className="relative shrink-0 z-20 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-2 hover:!z-50">
                           {renderCard(grp.parent)}
                         </div>

                         {/* Annexes */}
                         {grp.annexes.map((annexe, aIdx) => (
                            <div key={annexe.id} 
                                 className="relative shrink-0 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-2 hover:!z-50" 
                                 style={{ zIndex: 19 - aIdx }}>
                               {renderCard(annexe)}
                            </div>
                         ))}

                       </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
            
            {/* DOSSIERS FUSIONNÉS */}
            {(() => {
              const mergedDossiers = dossiersPaiement.filter(d => 
                d.projectIds.includes(project.id) && 
                d.encaissementIds.length > 1
              );
              
              if (mergedDossiers.length === 0) return null;

              return (
                <div className="mt-8 px-8 pb-8 border-t border-slate-100 pt-8 shrink-0">
                  <h3 className="font-extrabold text-slate-900 text-xl mb-6 flex items-center gap-3">
                    <div className="bg-violet-100 p-2 rounded-xl text-violet-600">
                      <Banknote className="w-5 h-5" />
                    </div>
                    Dossiers d'encaissement fusionnés
                  </h3>
                  <div className="flex flex-col gap-4 pb-4">
                    {mergedDossiers.map(dossier => {
                      const encs = (project.encaissements || []).filter(e => dossier.encaissementIds.includes(e.id));
                      const encsSum = encs.reduce((sum, e) => {
                         if (e.montantTotal) return sum + e.montantTotal;
                         if (e.mode === 'Annexe') return sum + ((e.annexePrice || 0) * 1.19);
                         
                         const prod = project.product || 'PAYE';
                         const vers = project.version;
                         const priceMode = (e.mode === 'Acquisition' || e.mode === 'Maintenance') ? e.mode : 'Acquisition';
                         const basePrice = getPrice(prod, vers, priceMode, client, project);
                         let price = basePrice;
                         
                         if (e.encaissementType === 'AVANCE') {
                            const pct = e.percentage || 30;
                            price = basePrice * (pct / 100);
                         } else if (e.encaissementType === 'TOTAL') {
                            if (e.contractId) {
                               const paidAvances = (project.encaissements || []).filter(other => 
                                  other.contractId === e.contractId && 
                                  other.encaissementType === 'AVANCE' && 
                                  other.status === 'DONE'
                               );
                               let totalPaid = 0;
                               paidAvances.forEach(pa => {
                                  const paPct = pa.percentage || 30;
                                  totalPaid += basePrice * (paPct / 100);
                               });
                               price = Math.max(0, basePrice - totalPaid);
                            }
                         }
                         return sum + (price * 1.19);
                      }, 0);
                      const totalMontant = dossier.total > 0 ? dossier.total : encsSum;

                      const isSelected = manualFusionSelection.some((e: any) => e.isCombined && e.combinedWithDossierId === dossier.id);

                      return (
                        <div key={dossier.id} className={cn(
                          "flex flex-col xl:flex-row xl:items-center justify-between p-5 rounded-[28px] text-left transition-all duration-300 border relative group gap-4 overflow-hidden",
                          isSelected ? "shadow-md ring-2 ring-violet-300 bg-violet-50 border-violet-300" : "bg-violet-50/80 border-violet-200 hover:shadow-md hover:-translate-y-0.5 hover:bg-violet-50"
                        )}>
                          {/* Background Glows (Optional, subtle) */}
                          <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl z-0 pointer-events-none bg-blue-100 opacity-50"></div>
                          <div className="absolute -left-10 -bottom-10 w-32 h-32 rounded-full blur-3xl z-0 pointer-events-none bg-indigo-100 opacity-50"></div>
                          
                          {/* LEFT: Checkbox + Title + Date */}
                          <div className="relative z-10 flex items-start xl:items-center gap-4 xl:w-[25%] shrink-0">
                            {dossier.status !== 'CLOSED' && dossier.status !== 'DONE' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isSelected) setManualFusionSelection(manualFusionSelection.filter((item: any) => item.combinedWithDossierId !== dossier.id));
                                  else setManualFusionSelection([...manualFusionSelection, encs[0]]);
                                }}
                                className={cn(
                                  "mt-1.5 xl:mt-0 w-4 h-4 rounded-full border-2 transition-all hover:scale-110 shadow-sm flex items-center justify-center shrink-0",
                                  isSelected
                                    ? "bg-blue-500 border-blue-500 text-white" 
                                    : "bg-white/80 border-slate-300 text-transparent hover:border-blue-400"
                                )}
                                title="Sélectionner pour fusion"
                              >
                                {isSelected && (
                                  <svg viewBox="0 0 14 14" fill="none" className="w-2.5 h-2.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 7.5L5.5 10L11 4" />
                                  </svg>
                                )}
                              </button>
                            )}
                            <div className="flex flex-col">
                              <h4 className="font-extrabold text-[20px] tracking-tight leading-none text-violet-900 mb-1">Dossier Fusionné</h4>
                              <p className="text-[10px] uppercase font-bold text-slate-500">Créé le {new Date(dossier.createdAt).toLocaleDateString('fr-FR')}</p>
                            </div>
                          </div>

                          {/* MIDDLE: Included items */}
                          <div className="relative z-10 flex flex-col gap-2 flex-1 w-full xl:w-auto">
                              {encs.map(e => (
                                <div key={e.id} className="flex items-center gap-2 text-[11px] font-bold text-slate-700 bg-white/60 px-3 py-1.5 rounded-xl border border-white/40 shadow-sm w-fit max-w-full">
                                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                                  <span className="truncate">
                                    {e.mode} {e.year ? `(Année ${e.year})` : e.title ? `(${e.title})` : ''} - {e.encaissementType === 'AVANCE' ? 'Avance' : 'Solde'}
                                  </span>
                                </div>
                              ))}
                          </div>

                          {/* RIGHT: Status + Total + Button */}
                          <div className="relative z-10 flex items-center justify-between xl:justify-end gap-6 xl:w-[35%] shrink-0 mt-2 xl:mt-0 pt-4 xl:pt-0 border-t xl:border-t-0 border-violet-200/50 w-full xl:w-auto">
                              <div className="flex flex-col xl:items-end gap-1 flex-1">
                                <span className={cn(
                                  "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm w-fit",
                                  dossier.status === 'DONE' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                                )}>
                                  {dossier.status === 'DONE' ? 'Payé' : 'En cours'}
                                </span>
                                <div className="flex flex-col xl:items-end mt-1">
                                  <span className="text-[10px] uppercase font-bold text-slate-500">Montant total</span>
                                  <span className="text-sm font-extrabold text-violet-900">
                                    {totalMontant > 0 ? `${totalMontant.toLocaleString()} DA` : '-'}
                                  </span>
                                </div>
                              </div>
                              
                              <button
                                onClick={() => setDossierToDissociate(dossier.id)}
                                className="px-5 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold transition-colors"
                              >
                                Dissocier
                              </button>
                              
                              <button
                                onClick={() => setShowFacturation(dossier.id)}
                                className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white rounded-xl text-xs font-bold shadow-md transition-transform hover:-translate-y-0.5 whitespace-nowrap shrink-0"
                              >
                                Gérer le dossier
                              </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Panneau droit : Wrapper */}
        <div className="w-full xl:w-80 shrink-0 relative">
          {/* Panneau droit : Sticky Content */}
          <div className="flex flex-col gap-6 sticky top-6 max-h-[calc(100vh-4rem)] overflow-y-auto pr-1 pb-4 z-50">
          <div className="bg-slate-50/50 border border-slate-200/70 rounded-3xl p-6 shadow-xl shadow-slate-100/40 space-y-5">
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-600 block shadow-sm" />
              Historique
            </h3>
            <div className="relative pl-5 border-l-2 border-indigo-100 py-2 space-y-4">
              {historyList.slice().reverse().map(h => (
                <div key={h.id} className="relative bg-white border border-slate-200/70 p-3.5 rounded-2xl shadow-sm space-y-1">
                  <span className="absolute -left-[28px] top-4.5 h-3 w-3 rounded-full bg-indigo-500 border-2 border-white shadow-md block" />
                  <p className="text-[9px] font-bold text-slate-450 uppercase tracking-wide">{h.date}</p>
                  <p className="text-xs font-bold text-slate-800 leading-snug">{h.message}</p>
                </div>
              ))}
              {historyList.length === 0 && <p className="text-xs text-slate-450 italic py-4">Aucun historique.</p>}
            </div>
          </div>
          
          {/* Panneau droit : Historique des Documents */}
          <div className="bg-slate-50/50 border border-slate-200/70 rounded-3xl p-6 shadow-xl shadow-slate-100/40 space-y-5">
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-600 block shadow-sm" />
              Historique des Documents
            </h3>
            <div className="relative pl-5 border-l-2 border-blue-100 py-2 space-y-4">
              {(project.encaissements || []).flatMap(e => e.documentHistory || []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice().reverse().map(dh => (
                <div key={dh.id} className="relative bg-white border border-slate-200/70 p-3.5 rounded-2xl shadow-sm space-y-1">
                  <span className="absolute -left-[28px] top-4.5 h-3 w-3 rounded-full bg-blue-500 border-2 border-white shadow-md block" />
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1 w-full">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 uppercase">
                          {dh.documentType === 'PROFORMA' ? 'Proforma' : 'Facture'} N° {dh.draftSnapshot?.documentNumber || '...'}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 leading-snug">
                        {dh.action}{dh.user ? ` par : ${dh.user}` : ''}
                      </p>
                      <p className="text-[10px] font-semibold text-slate-500 mt-0.5">
                        Le {new Date(dh.date).toLocaleDateString('fr-FR')} à {new Date(dh.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {dh.draftSnapshot && (
                      <button
                        onClick={() => {
                          const enc = project.encaissements?.find(e => e.documentHistory?.some(h => h.id === dh.id));
                          if (!enc) return;
                          setPreviewModalConfig({
                            isOpen: true,
                            type: dh.documentType as 'PROFORMA' | 'FACTURE',
                            encaissementId: enc.id,
                            draftSnapshot: dh.draftSnapshot,
                            isReadOnly: true,
                            readOnlyStatus: dh.action
                          });
                        }}
                        className="ml-3 shrink-0 p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors self-center bg-slate-50 border border-slate-100"
                        title="Visualiser ce document"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {(!project.encaissements || project.encaissements.flatMap(e => e.documentHistory || []).length === 0) && <p className="text-xs text-slate-450 italic py-4">Aucun document tracé.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>

      {showContractManager && currentContract && (() => {
        const currentPhase = currentContract.phases?.find(p => p.id === activePhaseId) || currentContract.phases?.[0];

        return (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 relative w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
              <button type="button" onClick={() => setShowContractManager(false)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50"><X className="w-5 h-5" /></button>

              <div className="flex justify-between items-start md:items-center flex-col md:flex-row mb-6 pr-8 gap-4">
                <div className="flex flex-col gap-3">
                  <h3 className="font-extrabold text-slate-900 text-xl flex items-center gap-3">
                    <FolderKanban className="w-6 h-6 text-blue-500" />
                    Contrat : {currentContract.name}
                  </h3>
                  <div className="flex items-center gap-3 ml-9 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500">Début :</span>
                      <input
                        type="date"
                        value={currentContract.startDate || ''}
                        onChange={(e) => updateContractField('startDate', e.target.value)}
                        className="border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500">Statut :</span>
                      <select
                        value={currentContract.status}
                        onChange={(e) => updateContractField('status', e.target.value)}
                        className="border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition cursor-pointer"
                      >
                        <option value="ACTIVE">Actif</option>
                        <option value="DONE">Effectué</option>
                        <option value="SUSPENDED">Suspendu</option>
                        <option value="ABANDONED">Abandonné</option>
                        <option value="PENDING">En attente</option>
                      </select>
                    </div>
                    {currentContract.mode === 'Annexe' && (
                      <button
                        onClick={() => {
                          if (window.confirm('Voulez-vous vraiment supprimer cette prestation annexe et son encaissement ?')) {
                            // deleteAnnexeContract(project.id, currentContract.id); // Placeholder
                            setShowContractManager(false);
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ml-2"
                        title="Supprimer la prestation annexe"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>

                {/* Tabs Production / Encaissements (Moved to header right) */}
                <div className="flex gap-3">
                  <button 
                    onClick={() => setContractModalTab('production')}
                    className={cn(
                      "flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all border-2",
                      contractModalTab === 'production' 
                        ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm" 
                        : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:border-slate-300"
                    )}
                  >
                    Production
                  </button>
                  <button 
                    onClick={() => setContractModalTab('encaissement')}
                    className={cn(
                      "flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all border-2",
                      contractModalTab === 'encaissement' 
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm" 
                        : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:border-slate-300"
                    )}
                  >
                    Encaissements
                  </button>
                </div>
              </div>



              {contractModalTab === 'production' && (
              <>
              {/* Onglets des phases */}
              <div className="flex flex-wrap gap-2 pb-2 border-b border-slate-100 mb-4">
                {(currentContract.phases || []).map((phase) => {
                  const isActive = currentPhase?.id === phase.id;
                  return (
                    <button
                      key={phase.id}
                      onClick={() => setActivePhaseId(phase.id)}
                      className={cn(
                        "px-4 h-9 flex items-center justify-center gap-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all",
                        isActive ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100"
                      )}
                    >
                      {phase.name}
                      {phase.status === 'DONE' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                    </button>
                  )
                })}
              </div>
              </>
              )}

              <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                {contractModalTab === 'production' && currentPhase && (
                  <>
                    <div className="flex flex-col gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-800">Paramètres de la Phase : {currentPhase.name}</span>
                        <button onClick={() => setShowNewTask(true)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-2">
                          <Plus className="w-3 h-3" /> Ajouter tâche
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date début:</span>
                          <input
                            type="date"
                            value={currentPhase.startDate || ''}
                            onChange={(e) => {
                              const newContracts = project.contracts?.map(c =>
                                c.id === currentContract.id
                                  ? { ...c, phases: c.phases?.map(p => p.id === currentPhase.id ? { ...p, startDate: e.target.value } : p) }
                                  : c
                              );
                              if (newContracts) updateProject(project.id, { contracts: newContracts });
                            }}
                            className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 font-bold text-slate-700"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">État:</span>
                          <select
                            value={currentPhase.status || 'PENDING'}
                            onChange={(e) => {
                              const newContracts = project.contracts?.map(c =>
                                c.id === currentContract.id
                                  ? { ...c, phases: c.phases?.map(p => p.id === currentPhase.id ? { ...p, status: e.target.value as any } : p) }
                                  : c
                              );
                              if (newContracts) updateProject(project.id, { contracts: newContracts });
                            }}
                            className={cn(
                              "px-2 py-1.5 border rounded-lg text-xs outline-none font-bold cursor-pointer",
                              currentPhase.status === 'DONE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                currentPhase.status === 'ACTIVE' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                  currentPhase.status === 'SUSPENDED' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                    currentPhase.status === 'ABANDONED' ? 'bg-red-50 text-red-700 border-red-200' :
                                      'bg-slate-50 text-slate-700 border-slate-200'
                            )}
                          >
                            <option value="PENDING">En attente</option>
                            <option value="ACTIVE">Actif</option>
                            <option value="DONE">Effectué</option>
                            <option value="SUSPENDED">Suspendu</option>
                            <option value="ABANDONED">Abandonné</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {(currentPhase.tasks || []).length === 0 && (
                      <div className="text-center py-8 text-slate-400 font-bold italic text-sm">Aucune tâche enregistrée.</div>
                    )}
                    {(currentPhase.tasks || []).map(t => {
                      const isGreen = t.status === 'DONE';
                      const isRed = t.status === 'CANCELED';
                      const isBlue = t.status === 'IN_PROGRESS';
                      return (
                        <div key={t.id} className={cn(
                          "p-5 rounded-[24px] border flex flex-col gap-4 text-xs shadow-sm transition-all duration-300 hover:shadow-md relative overflow-hidden group bg-white/60 backdrop-blur-md",
                          isGreen ? 'border-emerald-200/60 hover:border-emerald-300' :
                            isRed ? 'border-red-200/60 hover:border-red-300' :
                              isBlue ? 'border-blue-200/60 hover:border-blue-300' :
                                'border-slate-200/60 hover:border-slate-300'
                        )}>
                          {/* Halo coloré en arrière-plan */}
                          <div className={cn(
                            "absolute -right-8 -top-8 w-32 h-32 rounded-full blur-3xl z-0 pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity duration-500",
                            isGreen ? 'bg-emerald-500' : isRed ? 'bg-red-500' : isBlue ? 'bg-blue-500' : 'bg-slate-500'
                          )} />

                          <div className="flex flex-wrap md:flex-nowrap items-center justify-between w-full relative z-10 gap-4">
                            <span className={cn(
                              "font-extrabold text-sm block leading-relaxed flex-1 transition-colors",
                              isGreen ? "text-emerald-700/60 line-through" :
                                isBlue ? "text-blue-950" :
                                  isRed ? "text-red-950" :
                                    "text-slate-800"
                            )}>
                              {t.name}
                            </span>

                            <div className="flex items-center gap-3 shrink-0">
                              {/* Date Field */}
                              <div className="flex items-center gap-2 bg-white border border-slate-200/60 shadow-sm rounded-xl px-2 py-1.5 transition-all hover:border-slate-300 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/10">
                                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <input
                                  type="date"
                                  value={t.date || ''}
                                  onChange={(e) => updateTaskInContract(project.id, currentContract.id, currentPhase.id, t.id, { date: e.target.value })}
                                  className="bg-transparent border-none text-[11px] font-bold text-slate-700 outline-none cursor-pointer w-[100px]"
                                />
                              </div>

                              {/* Report Button */}
                              <button
                                title="Ajouter ou envoyer le rapport"
                                onClick={() => setReportModalTask({ phaseId: currentPhase.id, taskId: t.id, report: t.reports || '' })}
                                className={cn(
                                  "w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-all hover:scale-105",
                                  t.reports
                                    ? "bg-blue-100 text-blue-700 border border-blue-200"
                                    : "bg-white text-slate-400 border border-slate-200 hover:text-blue-500 hover:border-blue-200"
                                )}
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>

                              {/* Status Select */}
                              <select
                                value={t.status}
                                onChange={(e) => updateTaskInContract(project.id, currentContract.id, currentPhase.id, t.id, { status: e.target.value as any })}
                                className={cn(
                                  "px-3 py-1.5 rounded-xl font-extrabold uppercase tracking-widest text-[10px] outline-none cursor-pointer text-center appearance-none transition-all shadow-sm min-w-[100px]",
                                  isGreen ? 'bg-emerald-100/80 text-emerald-700 border border-emerald-200 hover:bg-emerald-200' :
                                    isRed ? 'bg-red-100/80 text-red-700 border border-red-200 hover:bg-red-200' :
                                      isBlue ? 'bg-blue-100/80 text-blue-700 border border-blue-200 hover:bg-blue-200' :
                                        'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                                )}
                                style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                              >
                                <option value="PENDING">En attente</option>
                                <option value="IN_PROGRESS">En cours</option>
                                <option value="DONE">Effectué</option>
                                <option value="CANCELED">Annulé</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}

                {/* Bouton pour clôturer ou rouvrir la phase */}
                {contractModalTab === 'production' && currentPhase && (currentPhase.tasks || []).length > 0 && (
                  <div className="mt-8 flex justify-center border-t border-slate-100/50 pt-6 relative z-10">
                    <button
                      onClick={() => togglePhaseStatus(project.id, currentContract.id, currentPhase.id)}
                      className={cn(
                        "px-6 py-2.5 rounded-2xl font-bold text-sm shadow-sm hover:-translate-y-0.5 transition-all duration-300",
                        currentPhase.status === 'DONE'
                          ? "bg-white/60 text-amber-700 hover:bg-amber-50 border border-amber-200"
                          : "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 hover:shadow-emerald-500/25"
                      )}
                    >
                      {currentPhase.status === 'DONE' ? 'Rouvrir la phase' : 'Clôturer la phase et passer à la suivante'}
                    </button>
                  </div>
                )}
                {contractModalTab === 'encaissement' && (
                <>
                {/* BANDEAU ENCAISSEMENTS */}
                {(() => {
                   const contractEncs = (project.encaissements || []).filter(e => 
                      e.contractId === currentContract.id || 
                      (!e.contractId && e.mode === currentContract.mode && (
                        (e.year === 1 && (currentContract.name.includes('Annuelle') || currentContract.name === 'Maintenance')) ||
                        (e.year && currentContract.name.includes(e.year.toString())) ||
                        !e.year
                      )) // Fallback for old data
                   ).sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());

                   if (contractEncs.length === 0) return null;

                   return (
                     <div className="mt-8 border-t border-slate-100 pt-6 relative z-10">
                       <h4 className="font-extrabold text-slate-800 text-sm mb-4 flex items-center gap-2">
                         <Banknote className="w-4 h-4 text-emerald-500" />
                         Encaissements liés à ce contrat
                       </h4>
                       <div className="space-y-3">
                         {contractEncs.map(enc => (
                           <div key={enc.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 border border-slate-100 p-4 rounded-xl gap-4 hover:border-slate-300 transition-colors">
                             <div>
                               <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                 {enc.encaissementType === 'TOTAL' ? 'Solde' : enc.encaissementType === 'AVANCE' ? 'Avance' : enc.mode}
                                 {enc.year ? ` (Année ${enc.year})` : ''}
                                 <span className={cn(
                                   "px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider",
                                   enc.status === 'DONE' ? 'bg-emerald-100 text-emerald-700' :
                                   (enc.status === 'IN_PROGRESS' || enc.status === 'PARTIAL') ? 'bg-blue-100 text-blue-700' :
                                   enc.status === 'CANCELED' ? 'bg-slate-100 text-slate-400 line-through' :
                                   'bg-slate-200 text-slate-600'
                                 )}>
                                   {enc.status === 'DONE' ? 'Payé' : enc.status === 'IN_PROGRESS' ? 'En cours' : enc.status === 'PARTIAL' ? 'Partiel' : enc.status === 'CANCELED' ? 'Ignoré' : 'Attente'}
                                 </span>
                               </div>
                               <div className={cn("text-[11px] font-semibold text-slate-500 mt-1", enc.status === 'CANCELED' && "opacity-50")}>
                                 Cible : {enc.targetDate ? new Date(enc.targetDate).toLocaleDateString('fr-FR') : 'Non définie'}
                                 {enc.montantTotal ? ` • ${enc.montantTotal.toLocaleString('fr-DZ')} DA` : ''}
                                 {enc.isCombined && ` • (Dans un dossier fusionné)`}
                               </div>
                             </div>
                             <div className="flex items-center gap-2 shrink-0">
                               {(enc.status === 'IN_PROGRESS' || enc.status === 'PARTIAL') && (
                                 <div className="flex items-center gap-1.5">
                                   {enc.mode === 'Maintenance' && (
                                     <button
                                       onClick={() => deactivateMaintenanceEncaissement(project.id, enc.id)}
                                       className="px-3 py-2 bg-white border border-red-200 hover:border-red-300 text-red-600 rounded-lg text-xs font-bold shadow-sm transition-colors"
                                       title="Annuler l'activation de cette maintenance"
                                     >
                                       Désactiver
                                     </button>
                                   )}
                                   <button
                                     onClick={() => setShowFacturation(enc.combinedWithDossierId || enc.id)}
                                     className="px-4 py-2 bg-white border border-slate-200 hover:border-blue-300 text-blue-600 rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
                                   >
                                     Gérer
                                   </button>
                                 </div>
                               )}
                               {enc.status === 'UPCOMING' && (
                                 <button
                                   onClick={() => activateMaintenanceEncaissement(project.id, enc.id)}
                                   className="px-4 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-xs font-bold transition-colors"
                                 >
                                   Activer
                                 </button>
                               )}
                             </div>
                           </div>
                         ))}
                       </div>
                     </div>
                   );
                 })()}
                 </>
                )}
              </div>
            </div>
          </div>
        );
      })()}


      {/* Edit Project (z-50) */}
      {showEditProject && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 relative w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <button type="button" onClick={() => setShowEditProject(false)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded-lg"><X className="w-5 h-5" /></button>
            <h3 className="font-extrabold text-slate-900 text-xl mb-6">Modifier les informations</h3>
            <form onSubmit={handleSaveEditProject} className="flex-1 overflow-y-auto pr-2 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Département</label>
                  <select value={editData.departement} onChange={e => setEditData({ ...editData, departement: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 focus:bg-white focus:border-blue-500 outline-none">
                    <option value="D1">D1</option>
                    <option value="D2">D2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Produit</label>
                  <select value={editData.product} onChange={e => setEditData({ ...editData, product: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 focus:bg-white focus:border-blue-500 outline-none">
                    <option value="PAYE">Paye</option>
                    <option value="BUDGET">Budget</option>
                    <option value="BUDGET_APC">Budget APC</option>
                    <option value="STOCKS">Stocks</option>
                    <option value="GRH">GRH</option>
                    <option value="PHARMATIS">Pharmatis</option>
                    <option value="GBS">GBS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Version</label>
                  <select value={editData.version} onChange={e => setEditData({ ...editData, version: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 focus:bg-white focus:border-blue-500 outline-none">
                    <option value="ULTRALIGHT">UltraLight</option>
                    <option value="LIGHT">Light</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                    <option value="GLOBAL">Global</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Entité responsable</label>
                  <select value={editData.entity} onChange={e => setEditData({ ...editData, entity: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 focus:bg-white focus:border-blue-500 outline-none">
                    <option value="Naltis">Naltis</option>
                    <option value="Netsprint">Netsprint</option>
                    <option value="MP">Micro-Planete</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Wilaya</label>
                  <select value={editData.wilaya} onChange={e => setEditData({ ...editData, wilaya: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 focus:bg-white focus:border-blue-500 outline-none">
                    <option value="">Sélectionner une wilaya</option>
                    {[
                      "01 - Adrar", "02 - Chlef", "03 - Laghouat", "04 - Oum El Bouaghi", "05 - Batna",
                      "06 - Béjaïa", "07 - Biskra", "08 - Béchar", "09 - Blida", "10 - Bouira",
                      "11 - Tamanrasset", "12 - Tébessa", "13 - Tlemcen", "14 - Tiaret", "15 - Tizi Ouzou",
                      "16 - Alger", "17 - Djelfa", "18 - Jijel", "19 - Sétif", "20 - Saïda",
                      "21 - Skikda", "22 - Sidi Bel Abbès", "23 - Annaba", "24 - Guelma", "25 - Constantine",
                      "26 - Médéa", "27 - Mostaganem", "28 - M'Sila", "29 - Mascara", "30 - Ouargla",
                      "31 - Oran", "32 - El Bayadh", "33 - Illizi", "34 - Bordj Bou Arreridj", "35 - Boumerdès",
                      "36 - El Tarf", "37 - Tindouf", "38 - Tissemsilt", "39 - El Oued", "40 - Khenchela",
                      "41 - Souk Ahras", "42 - Tipaza", "43 - Mila", "44 - Aïn Defla", "45 - Naâma",
                      "46 - Aïn Témouchent", "47 - Ghardaïa", "48 - Relizane", "49 - Timimoun", "50 - Bordj Badji Mokhtar",
                      "51 - Ouled Djellal", "52 - Béni Abbès", "53 - In Salah", "54 - In Guezzam", "55 - Touggourt",
                      "56 - Djanet", "57 - El M'Ghair", "58 - El Meniaa"
                    ].map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Ville / Commune</label>
                  <input type="text" value={editData.ville} onChange={e => setEditData({ ...editData, ville: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 focus:bg-white focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Propriétaire du projet</label>
                  <input type="text" placeholder="ID du propriétaire (optionnel)" value={editData.responsable} onChange={e => setEditData({ ...editData, responsable: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 focus:bg-white focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Date de Création</label>
                  <input type="date" value={editData.createdAt} onChange={e => setEditData({ ...editData, createdAt: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 focus:bg-white focus:border-blue-500 outline-none" />
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Collaborateurs techniques</label>
                  <div className="flex flex-wrap gap-3">
                    {["Arslane", "Hamza", "Fay", "Karim", "Khamis", "Mouad"].map(collab => (
                      <label key={collab} className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl shadow-sm hover:border-blue-400 transition-colors">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 w-4 h-4 cursor-pointer"
                          checked={editData.technique.includes(collab)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditData({ ...editData, technique: [...editData.technique, collab] });
                            } else {
                              setEditData({ ...editData, technique: editData.technique.filter((c: string) => c !== collab) });
                            }
                          }}
                        />
                        <span className="text-xs font-bold text-slate-700">{collab}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-6 mt-4 border-t border-slate-100 gap-3">
                <button type="button" onClick={() => setShowEditProject(false)} className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold">Annuler</button>
                <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Task (z-[60] to be above Modal 5 if needed) */}
      {showNewTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <form onSubmit={handleAddTask} className="bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 relative w-full max-w-md scale-100 animate-in fade-in zoom-in-95">
            <button type="button" onClick={() => setShowNewTask(false)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
            <h3 className="font-extrabold text-slate-900 text-base mb-5">Ajouter une nouvelle tâche</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Nom de la tâche</label>
                <input type="text" required value={newTaskName} onChange={e => setNewTaskName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Date limite</label>
                <input type="date" value={newTaskDate} onChange={e => setNewTaskDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Statut initial</label>
                <select value={newTaskStatus} onChange={e => setNewTaskStatus(e.target.value as any)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:border-blue-500 outline-none">
                  <option value="PENDING">En attente (Gris)</option>
                  <option value="IN_PROGRESS">En cours (Bleu)</option>
                  <option value="DONE">Fait (Vert)</option>
                  <option value="CANCELED">Annulée (Rouge)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-slate-100">
              <button type="button" onClick={() => setShowNewTask(false)} className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold">Annuler</button>
              <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md">Ajouter</button>
            </div>
          </form>
        </div>
      )}

      {/* Add New Annexe */}
      {/* Add New Contract (Indépendant) */}
      {showNewContractModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={(e) => {
            e.preventDefault();
            if (newContractName.trim()) {
              addCustomContract(project.id, newContractName.trim(), newContractPrice ? parseFloat(newContractPrice) : undefined);
              setNewContractName('');
              setNewContractPrice('');
              setShowNewContractModal(false);
            }
          }} className="bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 relative w-full max-w-md">
            <button type="button" onClick={() => setShowNewContractModal(false)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
            <h3 className="font-extrabold text-slate-900 text-base mb-5">Ajouter un contrat indépendant</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Nom du contrat</label>
                <input
                  type="text"
                  value={newContractName}
                  onChange={e => setNewContractName(e.target.value)}
                  placeholder="Ex: Matériel Serveur, Formation..."
                  required
                  className="w-full text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Prix HT (DA) - Optionnel</label>
                <input
                  type="number"
                  value={newContractPrice}
                  onChange={e => setNewContractPrice(e.target.value)}
                  placeholder="Ex: 50000"
                  min="0"
                  className="w-full text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-slate-100">
              <button type="button" onClick={() => setShowNewContractModal(false)} className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold">Annuler</button>
              <button type="submit" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md">Ajouter</button>
            </div>
          </form>
        </div>
      )}

      {/* Add New Encaissement */}
      {showNewEncaissementModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={(e) => {
            e.preventDefault();
            const targetContract = newEncaissementIsLinked ? contractsList.find(c => c.id === newEncaissementContractId) : null;
            if (newEncaissementTargetDate) {
              const encMode = targetContract ? targetContract.mode : 'Indépendant';
              
              const finalProduct = newEncaissementIsLinked ? project.product : newEncaissementProduct;
              const finalVersion = newEncaissementIsLinked ? project.version : newEncaissementVersion;

              let calculatedPrice = 0;
              if (finalProduct && finalVersion) {
                calculatedPrice = getPrice(finalProduct, finalVersion as ProductVersion, encMode || 'Acquisition', client, project);
              }
              const finalMontantTotal = newEncaissementType === 'AVANCE' ? (calculatedPrice * newEncaissementPercentage) / 100 : calculatedPrice;

              const newEnc = {
                 id: uuidv4(),
                 projectId: project.id,
                 contractId: targetContract ? targetContract.id : undefined,
                 mode: encMode,
                 title: !targetContract ? newEncaissementTitle : undefined,
                 product: finalProduct,
                 version: finalVersion as ProductVersion,
                 montantTotal: finalMontantTotal,
                 encaissementType: newEncaissementType,
                 billingMode: newEncaissementBillingMode,
                 targetDate: newEncaissementTargetDate,
                 percentage: newEncaissementType === 'AVANCE' ? newEncaissementPercentage : undefined,
                 status: 'IN_PROGRESS' as const,
                 proforma: { status: 'PENDING' as const },
                 soumission: { status: 'PENDING' as const },
                 convention: { status: 'PENDING' as const },
                 bc: { status: 'PENDING' as const },
                 serviceFait: { status: 'PENDING' as const },
                 abe: { status: 'PENDING' as const },
                 facture: { status: 'PENDING' as const }
              };
              let updatedEncaissements = [...(project.encaissements || [])];
              
              if (targetContract && newEncaissementType === 'TOTAL') {
                 updatedEncaissements = updatedEncaissements.map(enc => {
                    if (enc.contractId === targetContract.id && enc.encaissementType === 'AVANCE' && enc.status !== 'DONE') {
                       return { ...enc, status: 'CANCELED' as any };
                    }
                    return enc;
                 });
              }
              
              updatedEncaissements.push(newEnc as any);

              updateProject(project.id, {
                 encaissements: updatedEncaissements
              });
              setNewEncaissementTargetDate('');
              setNewEncaissementType('AVANCE');
              setNewEncaissementBillingMode('FACTURE');
              setNewEncaissementTitle('');
              setNewEncaissementPercentage(30);
              setShowNewEncaissementModal(false);
            }
          }} className="bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 relative w-full max-w-md">
            <button type="button" onClick={() => setShowNewEncaissementModal(false)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
            <h3 className="font-extrabold text-slate-900 text-base mb-5">Ajouter un Encaissement</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Liaison</label>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                   <button type="button" onClick={() => setNewEncaissementIsLinked(true)} className={cn("flex-1 text-xs font-bold py-2 rounded-lg transition-colors", newEncaissementIsLinked ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700")}>
                     Lié au contrat
                   </button>
                   <button type="button" onClick={() => setNewEncaissementIsLinked(false)} className={cn("flex-1 text-xs font-bold py-2 rounded-lg transition-colors", !newEncaissementIsLinked ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700")}>
                     Indépendant
                   </button>
                </div>
              </div>

              {newEncaissementIsLinked && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Contrat à lier</label>
                  <select
                    value={newEncaissementContractId}
                    onChange={e => setNewEncaissementContractId(e.target.value)}
                    required
                    className="w-full text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="" disabled>Sélectionnez un contrat</option>
                    {contractsList.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {!newEncaissementIsLinked && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Produit</label>
                    <select
                      value={newEncaissementProduct}
                      onChange={e => setNewEncaissementProduct(e.target.value)}
                      required
                      className="w-full text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="" disabled>Sélectionner le produit</option>
                      {products.map(p => (
                        <option key={p.id} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Version</label>
                    <select
                      value={newEncaissementVersion}
                      onChange={e => setNewEncaissementVersion(e.target.value as ProductVersion)}
                      required
                      className="w-full text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="" disabled>Version</option>
                      <option value="ULTRALIGHT">UltraLight</option>
                      <option value="LIGHT">Light</option>
                      <option value="INTERMEDIATE">Intermediate</option>
                      <option value="ADVANCED">Advanced</option>
                      <option value="GLOBAL">Global</option>
                    </select>
                  </div>
                </div>
              )}

              {(!newEncaissementIsLinked) && (
                <div className="mb-4 p-3 bg-amber-50 text-amber-700 text-xs font-bold rounded-xl border border-amber-200">
                  Cet encaissement sera indépendant et possèdera sa propre carte.
                </div>
              )}

              {!newEncaissementIsLinked && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Titre de l'encaissement</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Avance exceptionnelle, Prestation additionnelle..."
                    value={newEncaissementTitle}
                    onChange={e => setNewEncaissementTitle(e.target.value)}
                    className="w-full text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}
              
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Type</label>
                  <select
                    value={newEncaissementType}
                    onChange={e => setNewEncaissementType(e.target.value as 'AVANCE' | 'TOTAL')}
                    className="w-full text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="AVANCE">Avance</option>
                    <option value="TOTAL">Total (Solde)</option>
                  </select>
                </div>
                {newEncaissementType === 'AVANCE' && (
                  <div className="w-24">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">% Avance</label>
                    <input
                      type="number"
                      min="1" max="100"
                      value={newEncaissementPercentage}
                      onChange={e => setNewEncaissementPercentage(Number(e.target.value))}
                      required
                      className="w-full text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Mode de facturation</label>
                <select
                  value={newEncaissementBillingMode}
                  onChange={e => setNewEncaissementBillingMode(e.target.value as 'FACTURE' | 'PARTIEL')}
                  className="w-full text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="FACTURE">Facturé (Parcours complet Docs)</option>
                  <option value="PARTIEL">Partiel (Paiement informel, pas de docs)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Date cible</label>
                <input
                  type="date"
                  value={newEncaissementTargetDate}
                  onChange={e => setNewEncaissementTargetDate(e.target.value)}
                  required
                  className="w-full text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-slate-100">
              <button type="button" onClick={() => setShowNewEncaissementModal(false)} className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold">Annuler</button>
              <button type="submit" className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md">Ajouter</button>
            </div>
          </form>
        </div>
      )}

      {/* Add New Contract */}
      {showNewContract && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddContract} className="bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 relative w-full max-w-md">
            <button type="button" onClick={() => setShowNewContract(false)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
            <h3 className="font-extrabold text-slate-900 text-base mb-5">Ajouter une nouvelle phase</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Nom / Mode</label>
                <select required value={newContractMode} onChange={e => setNewContractMode(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:border-blue-500 outline-none">
                  <option value="Acquisition">Acquisition</option>
                  <option value="Maintenance offerte">Maintenance offerte</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Phase initiale</label>
                <select required value={newContractPhase} onChange={e => setNewContractPhase(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:border-blue-500 outline-none">
                  <option value="Démarchage">Démarchage</option>
                  <option value="Adaptation">Adaptation</option>
                  <option value="Encaissement">Encaissement</option>
                  <option value="Recouvrement">Recouvrement</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-slate-100">
              <button type="button" onClick={() => setShowNewContract(false)} className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold">Annuler</button>
              <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md">Ajouter</button>
            </div>
          </form>
        </div>
      )}

      {/* Contacts */}
      {showContacts && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 relative w-full max-w-xl max-h-[85vh] flex flex-col justify-between overflow-hidden">
            <button type="button" onClick={() => setShowContacts(false)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
            <div className="space-y-1 mb-5">
              <h3 className="font-extrabold text-slate-900 text-base">Gestion des Contacts</h3>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-1">
              <div className="space-y-2">
                {contactsList.map(c => (
                  <div key={c.id} className="bg-slate-50 p-3 rounded-2xl border border-slate-150 flex items-center justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <span className="font-bold text-slate-900 text-xs block truncate">{c.name} - <span className="text-blue-600 font-bold">{c.role}</span></span>
                      <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 font-bold">
                        {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone}</span>}
                        {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {c.email}</span>}
                      </div>
                    </div>
                    <button onClick={() => deleteProjectContact(project.id, c.id)} className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg"><Trash className="w-4 h-4" /></button>
                  </div>
                ))}
                {contactsList.length === 0 && <p className="text-xs text-slate-400 italic text-center py-8">Aucun contact.</p>}
              </div>
              <form onSubmit={handleAddContact} className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl space-y-3.5">
                <div className="grid grid-cols-2 gap-3.5">
                  <input type="text" required placeholder="Nom complet" value={newContactName} onChange={e => setNewContactName(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-blue-500 outline-none" />
                  <input type="text" required placeholder="Rôle" value={newContactRole} onChange={e => setNewContactRole(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-blue-500 outline-none" />
                  <input type="tel" placeholder="Téléphone" value={newContactPhone} onChange={e => setNewContactPhone(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-blue-500 outline-none" />
                  <input type="email" placeholder="Email" value={newContactEmail} onChange={e => setNewContactEmail(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-blue-500 outline-none" />
                </div>
                <div className="flex justify-end pt-2">
                  <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-sm">Ajouter</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Documents */}
      {showBilling && (() => {
        const acquisitionContract = project.contracts?.find(c => c.mode === 'Acquisition');
        const encaissementPhase = acquisitionContract?.phases?.find(p => p.name === 'Encaissement');
        const missingAcquisitionDocs = encaissementPhase?.tasks?.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS') || [];
        const activeEncaissementsList = project.encaissements?.filter(e => e.status !== 'UPCOMING' && e.status !== 'ABANDONED') || [];

        return (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 relative w-full max-w-5xl max-h-[90vh] flex flex-col justify-between overflow-hidden">
              <button type="button" onClick={() => setShowBilling(false)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
              <div className="space-y-1 mb-5">
                <h3 className="font-extrabold text-slate-900 text-base">Gestion des Documents Administratifs</h3>
              </div>
              <div className="flex-1 overflow-y-auto pr-2 space-y-8">
                <div className="space-y-4">
                  {activeEncaissementsList.map(enc => {
                    let contractTitle: string = enc.mode;
                    if (enc.mode === 'Maintenance') contractTitle = enc.year !== undefined ? `Maintenance (Année ${enc.year})` : 'Maintenance';
                    if (enc.title) contractTitle += ` - ${enc.title}`;

                    let contractDocs = [
                      {
                        id: 'soumission',
                        name: 'Soumission',
                        isMissing: enc.soumission?.status !== 'VALIDATED',
                        onToggle: () => updateEncaissement(project.id, enc.id, { soumission: { ...(enc.soumission || {}), status: enc.soumission?.status !== 'VALIDATED' ? 'VALIDATED' : 'PENDING' } as any })
                      },
                      {
                        id: 'convention',
                        name: 'Convention',
                        isMissing: enc.convention?.status !== 'VALIDATED',
                        onToggle: () => updateEncaissement(project.id, enc.id, { convention: { ...(enc.convention || {}), status: enc.convention?.status !== 'VALIDATED' ? 'VALIDATED' : 'PENDING' } as any })
                      },
                      {
                        id: 'proforma',
                        name: 'Proforma',
                        isMissing: enc.proforma?.status !== 'VALIDATED',
                        onToggle: () => updateEncaissement(project.id, enc.id, { proforma: { ...enc.proforma, status: enc.proforma?.status !== 'VALIDATED' ? 'VALIDATED' : 'PENDING' } as any })
                      },
                      {
                        id: 'bc',
                        name: 'Bon de Commande',
                        isMissing: enc.bc?.status !== 'RECOVERED',
                        onToggle: () => updateEncaissement(project.id, enc.id, { bc: { ...enc.bc, status: enc.bc?.status !== 'RECOVERED' ? 'RECOVERED' : 'PENDING' } as any })
                      },
                      {
                        id: 'service_fait',
                        name: 'Service fait',
                        isMissing: enc.serviceFait?.status !== 'RECOVERED',
                        onToggle: () => updateEncaissement(project.id, enc.id, { serviceFait: { ...(enc.serviceFait || {}), status: enc.serviceFait?.status !== 'RECOVERED' ? 'RECOVERED' : 'PENDING' } as any })
                      },
                      {
                        id: 'facture',
                        name: 'Facture définitive',
                        isMissing: enc.facture?.status !== 'VALIDATED',
                        onToggle: () => updateEncaissement(project.id, enc.id, { facture: { ...enc.facture, status: enc.facture?.status !== 'VALIDATED' ? 'VALIDATED' : 'PENDING' } as any })
                      },
                      {
                        id: 'abe',
                        name: 'ABE',
                        isMissing: enc.abe?.status !== 'RECOVERED',
                        onToggle: () => updateEncaissement(project.id, enc.id, { abe: { ...(enc.abe || {}), status: enc.abe?.status !== 'RECOVERED' ? 'RECOVERED' : 'PENDING' } as any })
                      }
                    ];

                    const missingCount = contractDocs.filter(d => d.isMissing).length;

                    return (
                      <details key={enc.id} className="group bg-blue-50/30 border border-blue-100 rounded-[24px] overflow-hidden" open>
                        <summary className="font-extrabold text-blue-900 text-sm p-5 cursor-pointer select-none flex items-center justify-between hover:bg-blue-50/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-blue-500" />
                            {contractTitle} : Documents requis
                            {missingCount > 0 && (
                              <span className="bg-red-100 text-red-600 px-2.5 py-0.5 rounded-full text-[10px] ml-2">{missingCount} manquant(s)</span>
                            )}
                          </div>
                          <div className="w-8 h-8 rounded-full bg-blue-100/50 flex items-center justify-center text-blue-500 group-open:rotate-180 transition-transform">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                          </div>
                        </summary>
                        <div className="p-5 pt-0 border-t border-blue-100/50 bg-white/50">
                          <div className="space-y-2 mt-4">
                            {contractDocs.map((doc) => (
                              <div key={doc.id} className={`border p-4 rounded-2xl flex items-center justify-between gap-3 shadow-sm transition-colors ${doc.isMissing ? 'bg-white border-blue-100' : 'bg-emerald-50 border-emerald-200'}`}>
                                <div className="flex items-center gap-3">
                                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 transition-colors duration-300 ${doc.isMissing ? 'bg-red-400' : 'bg-emerald-500'}`} />
                                  <span className={`text-xs font-bold transition-all duration-300 ${doc.isMissing ? 'text-slate-700' : 'text-emerald-800 line-through opacity-70'}`}>{doc.name}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => { e.preventDefault(); doc.onToggle(); }}
                                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 ease-in-out ${doc.isMissing ? 'bg-slate-200' : 'bg-emerald-500'}`}
                                >
                                  <span className="sr-only">Toggle status</span>
                                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${doc.isMissing ? 'translate-x-0' : 'translate-x-4'}`} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </details>
                    );
                  })}
                </div>

              </div>
            </div>
          </div>
        );
      })()}

      {/* NEW MODAL: Facturation */}
      {showFacturation && typeof showFacturation === 'string' ? (
        <FacturationDossierModal
          dossierId={showFacturation}
          client={client}
          encaissements={(() => {
            let allEncs: any[] = [];
            projects.forEach(p => {
              p.encaissements?.forEach(e => allEncs.push({ ...e, projectId: p.id, projectName: p.name, product: p.product }));
            });
            
            const combined = allEncs.filter(e => e.isCombined && (e.combinedWithDossierId === showFacturation || (e as any).dossierId === showFacturation));
            if (combined.length > 0) {
              return combined.sort((a, b) => {
                const modeA = a.mode;
                const modeB = b.mode;
                if (modeA === 'Acquisition' && modeB !== 'Acquisition') return -1;
                if (modeB === 'Acquisition' && modeA !== 'Acquisition') return 1;
                return 0;
              });
            }
            
            return allEncs.filter(e => e.id === showFacturation);
          })()}
          onClose={() => setShowFacturation(false)}
        />
      ) : showFacturation === true && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 relative w-full max-w-4xl max-h-[90vh] flex flex-col justify-between overflow-hidden">
            <button type="button" onClick={() => setShowFacturation(false)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
            <div className="space-y-1 mb-5">
              <h3 className="font-extrabold text-slate-900 text-xl flex items-center gap-3">
                <Banknote className="w-6 h-6 text-emerald-500" />
                Génération des Factures d'encaissement
              </h3>
              <p className="text-slate-500 text-xs font-bold">Acquisition et Maintenances</p>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-6">
              {(!project.encaissements || project.encaissements.filter(e => e.status === 'IN_PROGRESS' || e.status === 'PARTIAL').length === 0) ? (
                <div className="bg-slate-50/50 border border-slate-100 rounded-3xl p-10 text-center">
                  <Banknote className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 text-sm font-bold">Aucun encaissement en cours ou en attente d'action.</p>
                </div>
              ) : (() => {
                const activeEncs = project.encaissements!.filter(e => e.status === 'IN_PROGRESS' || e.status === 'PARTIAL');
                const uncombinedEncs = activeEncs.filter(e => !e.isCombined && (showFacturation === true || showFacturation === e.id));
                const combinedEncs = activeEncs.filter(e => e.isCombined);
                const activeDossierIds = Array.from(new Set(combinedEncs.map(e => e.combinedWithDossierId || (e as any).dossierId)))
                  .filter(id => showFacturation === true || showFacturation === id);

                const renderDocManagement = (enc: any) => (
                  <div className="flex flex-col gap-3 mb-6">
                    {enc.mode === 'Annexe' && (
                      <div className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100 flex items-center gap-3">
                        <label className="text-xs font-bold text-indigo-700 whitespace-nowrap">Désignation (Facture) :</label>
                        <input
                          type="text"
                          value={enc.annexeName || ''}
                          onChange={e => updateEncaissement(project.id, enc.id, { annexeName: e.target.value })}
                          placeholder="Désignation sur la proforma/facture"
                          className="flex-1 text-xs font-bold text-slate-700 bg-white border border-indigo-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 transition-colors"
                        />
                      </div>
                    )}
                    {/* 1. PROFORMA */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex flex-wrap sm:flex-nowrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3 w-full sm:w-48 shrink-0">
                        <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-600">1</span>
                        <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">Proforma</span>
                      </div>
                      <select
                        value={enc.proforma.status}
                        onChange={e => updateEncaissement(project.id, enc.id, { proforma: { ...enc.proforma, status: e.target.value as any } })}
                        className="flex-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 transition-colors"
                      >
                        <option value="PENDING">À générer</option>
                        <option value="GENERATED">Générée</option>
                        <option value="TO_VERIFY">À vérifier (DFC)</option>
                        <option value="VALIDATED">Validée</option>
                      </select>
                      <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
                        <button
                          onClick={() => setPreviewModalConfig({ isOpen: true, type: 'PROFORMA', encaissementId: enc.id })}
                          className="px-5 py-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded-xl text-xs font-bold transition-all"
                        >
                          {enc.proforma.status === 'PENDING' ? 'Générer' : 'Ouvrir'}
                        </button>
                        {enc.proforma.status !== 'PENDING' && (
                          <button
                            onClick={() => {
                              if (window.confirm("Voulez-vous vraiment réinitialiser cette proforma ? (Cela effacera le brouillon actuel)")) {
                                updateEncaissement(project.id, enc.id, { proforma: { status: 'PENDING', draft: undefined } });
                              }
                            }}
                            className="px-5 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-xl text-xs font-bold transition-all"
                            title="Réinitialiser pour forcer une nouvelle génération"
                          >
                            Réinitialiser
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 2. BON DE COMMANDE */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex flex-wrap sm:flex-nowrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3 w-full sm:w-48 shrink-0">
                        <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-600">2</span>
                        <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">Bon Commande</span>
                      </div>
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          placeholder="Numéro du BC"
                          value={enc.bc.documentId || ''}
                          onChange={(e) => {
                            const newNum = e.target.value;
                            const isComplete = newNum.trim() !== '' && !!enc.bc.date;
                            updateEncaissement(project.id, enc.id, { 
                              bc: { 
                                ...enc.bc, 
                                documentId: newNum,
                                status: isComplete ? 'RECOVERED' : 'PENDING'
                              } 
                            });
                          }}
                          className="w-1/2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 transition-colors disabled:bg-slate-50 disabled:text-slate-400"
                          disabled={enc.proforma.status !== 'VALIDATED'}
                        />
                        <input
                          type="date"
                          value={enc.bc.date || ''}
                          onChange={(e) => {
                            const newDate = e.target.value;
                            const isComplete = !!enc.bc.documentId?.trim() && newDate !== '';
                            updateEncaissement(project.id, enc.id, { 
                              bc: { 
                                ...enc.bc, 
                                date: newDate,
                                status: isComplete ? 'RECOVERED' : 'PENDING'
                              } 
                            });
                          }}
                          className="w-1/2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 transition-colors disabled:bg-slate-50 disabled:text-slate-400"
                          disabled={enc.proforma.status !== 'VALIDATED'}
                        />
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end min-w-[120px]">
                         {enc.bc.status === 'RECOVERED' && (
                           <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-wider border border-emerald-200">
                             Récupéré
                           </span>
                         )}
                      </div>
                    </div>

                    {/* 3. FACTURE */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex flex-wrap sm:flex-nowrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3 w-full sm:w-48 shrink-0">
                        <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-600">3</span>
                        <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">Facture Déf.</span>
                      </div>
                      <select
                        value={enc.facture.status}
                        onChange={e => updateEncaissement(project.id, enc.id, { facture: { ...enc.facture, status: e.target.value as any } })}
                        className="flex-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-emerald-500 transition-colors disabled:bg-slate-50 disabled:text-slate-400"
                        disabled={enc.bc.status !== 'RECOVERED'}
                      >
                        <option value="PENDING">À générer</option>
                        <option value="GENERATED">Générée</option>
                        <option value="VALIDATED">Établie et envoyée</option>
                      </select>
                      <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
                        <button
                          onClick={() => setPreviewModalConfig({ isOpen: true, type: 'FACTURE', encaissementId: enc.id })}
                          className="px-5 py-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:pointer-events-none"
                          disabled={enc.bc.status !== 'RECOVERED'}
                        >
                          {enc.facture.status === 'PENDING' ? 'Générer' : 'Ouvrir'}
                        </button>
                        {enc.facture.status !== 'PENDING' && (
                          <button
                            onClick={() => {
                              if (window.confirm("Voulez-vous vraiment réinitialiser cette facture ? (Cela effacera le brouillon actuel)")) {
                                updateEncaissement(project.id, enc.id, { facture: { status: 'PENDING', draft: undefined } });
                              }
                            }}
                            className="px-5 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-xl text-xs font-bold transition-all"
                            title="Réinitialiser pour forcer une nouvelle génération"
                          >
                            Réinitialiser
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 4. PAIEMENT */}
                    <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-100 flex flex-wrap sm:flex-nowrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3 w-full sm:w-48 shrink-0">
                        <span className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center text-[11px] font-bold text-blue-800">4</span>
                        <span className="font-bold text-xs text-blue-800 uppercase tracking-wider">Paiement</span>
                      </div>
                      <div className="flex flex-1 gap-3">
                        <input
                          type="number" placeholder="Total (DA)"
                          value={enc.montantTotal || ''}
                          onChange={e => updateEncaissement(project.id, enc.id, { montantTotal: parseFloat(e.target.value) })}
                          className="w-1/2 text-xs font-bold text-blue-900 bg-white border border-blue-200 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 transition-colors disabled:bg-slate-50 disabled:text-slate-400"
                          disabled={enc.facture.status !== 'VALIDATED'}
                        />
                        <input
                          type="number" placeholder="Encaissé (DA)"
                          value={enc.montantEncaisse || ''}
                          onChange={e => updateEncaissement(project.id, enc.id, { montantEncaisse: parseFloat(e.target.value) })}
                          className="w-1/2 text-xs font-bold text-blue-900 bg-white border border-blue-200 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 transition-colors disabled:bg-slate-50 disabled:text-slate-400"
                          disabled={enc.facture.status !== 'VALIDATED'}
                        />
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end min-w-[120px]">
                        {enc.montantTotal && enc.montantEncaisse !== undefined && (
                          <button
                            onClick={() => {
                              const total = enc.montantTotal || 0;
                              const encaisse = enc.montantEncaisse || 0;
                              if (encaisse >= total) {
                                updateEncaissement(project.id, enc.id, { status: 'DONE', resteDette: 0 });
                                if (enc.mode === 'Maintenance') generateMaintenanceEncaissement(project.id);
                              } else {
                                const dette = total - encaisse;
                                if (confirm(`Paiement partiel détecté. Une dette de ${dette} DA sera générée et reportée. Confirmer ?`)) {
                                  updateEncaissement(project.id, enc.id, { status: 'PARTIAL', resteDette: dette });
                                  if (enc.mode === 'Maintenance') generateMaintenanceEncaissement(project.id);
                                }
                              }
                            }}
                            className="w-full px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20"
                          >
                            Valider Paiement
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );

                return (
                  <div className="space-y-6">
                    {/* 1. DOSSIERS */}
                    {activeDossierIds.map(dossierId => {
                      const dossier = dossiersPaiement.find(d => d.id === dossierId);
                      if (!dossier) return null;

                      const dossierEncs = project.encaissements!.filter(e => (e.combinedWithDossierId || (e as any).dossierId) === dossierId);
                      if (dossierEncs.length === 0) return null;

                      dossierEncs.sort((a, b) => {
                        if (a.mode === 'Acquisition' && b.mode !== 'Acquisition') return -1;
                        if (b.mode === 'Acquisition' && a.mode !== 'Acquisition') return 1;
                        return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
                      });
                      const enc = dossierEncs[0];

                      const historyNotes: string[] = [];
                      dossierEncs.forEach(e => {
                        if (e.id === enc.id) return;
                        const name = `${e.mode} ${e.year ? `(Année ${e.year})` : e.annexeName ? `(${e.annexeName})` : ''}`;
                        if (e.facture.status !== 'PENDING') historyNotes.push(`Facture (${e.facture.status}) générée pour ${name}`);
                        else if (e.bc.status !== 'PENDING') historyNotes.push(`BC (${e.bc.status}) récupéré pour ${name}`);
                        else if (e.proforma.status !== 'PENDING') historyNotes.push(`Proforma (${e.proforma.status}) générée pour ${name}`);
                      });

                      const allNames = dossierEncs.map(e => `${e.mode} ${e.year ? `(Année ${e.year})` : e.annexeName ? `(${e.annexeName})` : ''}`);

                      return (
                        <div key={`dossier-${dossier.id}`} className="bg-white border border-purple-200 shadow-sm rounded-2xl p-6 relative overflow-hidden ring-1 ring-purple-100">
                          <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-500"></div>
                          <div className="flex justify-between items-start mb-6">
                            <div>
                              <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-purple-100 text-purple-600 rounded-xl">
                                  <FolderKanban className="w-5 h-5" />
                                </div>
                                <h4 className="font-black text-purple-900 text-lg">Dossier Fusionné</h4>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDossierToDissociate(dossier.id);
                                  }}
                                  className="px-2 py-1 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ml-2"
                                >
                                  Dissocier
                                </button>
                              </div>
                              <div className="pl-11">
                                <p className="text-sm font-bold text-slate-700 flex flex-wrap gap-2 items-center">
                                  Inclus :
                                  {allNames.map((n, i) => (
                                    <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs">{n}</span>
                                  ))}
                                </p>
                                <p className="text-xs text-slate-400 font-medium mt-2">
                                  Créé le {new Date(dossier.createdAt).toLocaleDateString('fr-FR')}
                                </p>
                              </div>
                            </div>
                            <span className={cn(
                              "px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest shrink-0 mt-2",
                              enc.status === 'PARTIAL' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                            )}>{enc.status === 'PARTIAL' ? 'Paiement Partiel' : 'En Cours'}</span>
                          </div>

                          {historyNotes.length > 0 && (
                            <div className="mb-6 pl-11">
                              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                <h5 className="text-xs font-black text-amber-800 mb-2 uppercase tracking-wider flex items-center gap-2">
                                  <Clock className="w-3.5 h-3.5" />
                                  Historique avant fusion
                                </h5>
                                <ul className="space-y-1.5">
                                  {historyNotes.map((note, i) => (
                                    <li key={i} className="text-xs font-bold text-amber-700 flex items-center gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                                      {note}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}

                          <div className="pl-11">
                            {renderDocManagement(enc)}
                          </div>
                        </div>
                      );
                    })}

                    {/* 2. ENCAISSEMENTS NON COMBINÉS */}
                    {uncombinedEncs.map(enc => (
                      <div key={enc.id} className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 relative overflow-hidden">
                        <div className="flex justify-between items-center mb-6">
                          <div>
                            <div className="flex items-center gap-3">
                              <h4 className="font-black text-slate-900 text-lg">Encaissement : {enc.mode} {enc.year ? `(Année ${enc.year})` : enc.annexeName ? `(${enc.annexeName})` : ''}</h4>
                            </div>
                            <span className="text-slate-500 text-xs font-bold mt-1 block">Début : {new Date(enc.targetDate).toLocaleDateString('fr-FR')} {enc.annexePrice !== undefined ? ` | Prix HT : ${enc.annexePrice.toLocaleString()} DA` : ''}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {enc.mode === 'Annexe' && project.encaissements?.some(e => e.mode === 'Acquisition') && (
                              <button
                                onClick={async () => {
                                  const acqEnc = project.encaissements!.find(e => e.mode === 'Acquisition');
                                  if (!acqEnc) return;

                                  if (window.confirm("Voulez-vous lier cette prestation annexe à l'encaissement d'Acquisition ? (Ils seront fusionnés)")) {
                                    const dossierId = acqEnc.combinedWithDossierId || (acqEnc as any).dossierId;
                                    if (acqEnc.isCombined && dossierId) {
                                      const dossier = dossiersPaiement.find(d => d.id === dossierId);
                                      if (dossier) {
                                        updateDossierPaiement(dossier.id, { encaissementIds: [...dossier.encaissementIds, enc.id] });
                                        updateEncaissement(project.id, enc.id, { isCombined: true, combinedWithDossierId: dossier.id });
                                      }
                                    } else {
                                      const newDossierId = await addDossierPaiement({
                                        clientId: client.id,
                                        projectIds: [project.id],
                                        encaissementIds: [acqEnc.id, enc.id],
                                        status: 'DRAFT',
                                        total: 0,
                                        encaisse: 0
                                      });
                                      updateEncaissement(project.id, acqEnc.id, { isCombined: true, combinedWithDossierId: newDossierId });
                                      updateEncaissement(project.id, enc.id, { isCombined: true, combinedWithDossierId: newDossierId });
                                    }
                                  }
                                }}
                                className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm border border-indigo-100"
                              >
                                Lier à l'Acquisition
                              </button>
                            )}
                            <span className={cn(
                              "px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest",
                              enc.status === 'PARTIAL' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                            )}>{enc.status === 'PARTIAL' ? 'Paiement Partiel' : 'En Cours'}</span>
                          </div>
                        </div>

                        {renderDocManagement(enc)}

                        {enc.resteDette ? (
                          <div className="bg-red-50 text-red-700 text-xs font-bold p-3 rounded-xl border border-red-100 flex items-center justify-between mt-6">
                            <span>Dette générée reportée à l'année suivante :</span>
                            <span>{enc.resteDette.toLocaleString()} DA</span>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="flex justify-end pt-6 mt-4 border-t border-slate-100 gap-3">
              <button type="button" onClick={() => setShowFacturation(false)} className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* NEW MODAL: Report & Email */}
      {reportModalTask && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 relative w-full max-w-lg flex flex-col">
            <button type="button" onClick={() => setReportModalTask(null)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50"><X className="w-5 h-5" /></button>
            <h3 className="font-extrabold text-slate-900 text-xl flex items-center gap-3 mb-5">
              <FileText className="w-6 h-6 text-blue-500" />
              Rapport de tâche
            </h3>

            <form onSubmit={handleSaveReport} className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Destinataire (Email)</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    placeholder="ex: direction@client.dz"
                    value={reportEmail}
                    onChange={e => setReportEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white transition-all font-semibold text-slate-800"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5 font-medium ml-1">Si rempli, l'enregistrement ouvrira votre client mail par défaut avec le rapport.</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Contenu du rapport</label>
                <textarea
                  rows={6}
                  placeholder="Écrivez votre rapport détaillé ici..."
                  value={reportModalTask.report}
                  onChange={e => setReportModalTask({ ...reportModalTask, report: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white transition-all font-medium text-slate-700 resize-none shadow-inner"
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100 gap-3">
                <button type="button" onClick={() => setReportModalTask(null)} className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors">Annuler</button>
                <button type="submit" className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-blue-700 transition-colors flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Sauvegarder {reportEmail && "et envoyer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewModalConfig.isOpen && project && client && (() => {
        const enc = project.encaissements?.find(e => e.id === previewModalConfig.encaissementId);
        if (!enc) return null;

        const docObj = previewModalConfig.type === 'PROFORMA' ? enc.proforma : enc.facture;

        let draft = previewModalConfig.draftSnapshot || docObj.draft;
        const status = previewModalConfig.isReadOnly ? previewModalConfig.readOnlyStatus : docObj.status;

        if (!draft) {
          let encaissementsToCombine = [enc];
          const dossierId = enc.combinedWithDossierId || (enc as any).dossierId;
          if (enc.isCombined && dossierId) {
            encaissementsToCombine = projects.flatMap(p => p.encaissements || []).filter(e => e.combinedWithDossierId === dossierId || (e as any).dossierId === dossierId) || [enc];
            encaissementsToCombine.sort((a, b) => a.id === enc.id ? -1 : b.id === enc.id ? 1 : 0);
          }

          let totalHT = 0;
          const items = encaissementsToCombine.map(e => {
            if (e.mode === 'Annexe') {
              const price = e.annexePrice || 0;
              totalHT += price;
              return {
                description: e.annexeName || 'Prestation Annexe',
                price
              };
            }

            const p = projects.find(pr => pr.id === e.projectId);
            const prod = p?.product || project.product;
            const vers = p?.version || project.version;
            const price = getPrice(prod, vers, e.mode, client, project);
            totalHT += price;

            const versionStr = vers ? `, Version ${vers}` : '';
            const title = `Logiciel ${prod}${versionStr}`;
            const subtitle = e.mode === 'Acquisition' ? 'Acquisition' : `Maintenance ${e.year ? `Année ${e.year}` : ''}`;
            let description = `${title}\n${subtitle}\n• Monitoring régulier\n• Mises à jour\n• Téléassistance annuelle (Heures de bureau, Du Dimanche au Jeudi)\n• Télé-intervention annuelle (Heures de bureau, Du Dimanche au Jeudi)`.trim();

            if (price === 0) {
               const prodConfig = useStore.getState().products.find(p => p.name.toLowerCase() === prod.toLowerCase());
               description += `\n\n[ERREUR PRIX: 0 DA] Vérifiez la Règle Tarifaire.\nProduit cherché: '${prod}' (Version: '${vers}').\nEntité projet: '${project.entity}'.\nClient: Effectif=${client?.effectif}, Type=${client?.effectifType}.`;
               if (prodConfig) {
                 description += `\nRègles trouvées pour ce produit : ${prodConfig.pricingRules.length}\nVeuillez vérifier qu'une des règles correspond EXACTEMENT à ces critères.`;
               } else {
                 description += `\nLe produit '${prod}' n'a pas été trouvé.`;
               }
            }

            return {
              description,
              price
            };
          });

          const totalTVA = totalHT * 0.19;
          const totalTTC = totalHT + totalTVA;

          draft = {
            documentNumber: `DOC-${new Date().getFullYear()}-000`,
            items,
            totalHT,
            totalTVA,
            totalTTC,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
        }

        return (
          <DocumentPreviewModal
            isOpen={previewModalConfig.isOpen}
            onClose={() => setPreviewModalConfig({ isOpen: false, type: 'PROFORMA' })}
            type={previewModalConfig.type}
            client={client}
            project={project}
            encaissement={enc}
            draft={draft}
            status={status === 'PENDING' ? 'GENERATED' : (status || 'GENERATED')}
            isReadOnly={previewModalConfig.isReadOnly}
            onSaveDraft={(newDraft) => {
              const currentUser = auth.currentUser;
              const userName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Utilisateur';
              
              if (previewModalConfig.type === 'PROFORMA') {
                const newHistory = [...(enc.documentHistory || []), { id: uuidv4(), date: new Date().toISOString(), documentType: 'PROFORMA' as const, action: 'Brouillon généré/enregistré', draftSnapshot: newDraft, user: userName }];
                updateEncaissement(project.id, enc.id, { 
                  proforma: { ...enc.proforma, status: enc.proforma.status === 'PENDING' ? 'GENERATED' : enc.proforma.status, draft: newDraft },
                  documentHistory: newHistory
                });
              } else {
                const newHistory = [...(enc.documentHistory || []), { id: uuidv4(), date: new Date().toISOString(), documentType: 'FACTURE' as const, action: 'Brouillon généré/enregistré', draftSnapshot: newDraft, user: userName }];
                updateEncaissement(project.id, enc.id, { 
                  facture: { ...enc.facture, status: enc.facture.status === 'PENDING' ? 'GENERATED' : enc.facture.status, draft: newDraft },
                  documentHistory: newHistory
                });
              }
            }}
            onSubmitValidation={() => {
              if (previewModalConfig.type === 'PROFORMA') {
                updateEncaissement(project.id, enc.id, { proforma: { ...enc.proforma, status: 'TO_VERIFY', draft } });
                addHistoryEvent(project.id, `Proforma de l'encaissement ${enc.mode} soumise à validation.`);
                addDocumentHistoryEvent(project.id, enc.id, { date: new Date().toISOString(), documentType: 'PROFORMA', action: 'Soumise à validation', draftSnapshot: draft });
              } else {
                updateEncaissement(project.id, enc.id, { facture: { ...enc.facture, status: 'TO_VERIFY', draft } });
                addHistoryEvent(project.id, `Facture de l'encaissement ${enc.mode} soumise à validation.`);
                addDocumentHistoryEvent(project.id, enc.id, { date: new Date().toISOString(), documentType: 'FACTURE', action: 'Soumise à validation', draftSnapshot: draft });
              }
              setPreviewModalConfig({ isOpen: false, type: 'PROFORMA' });
            }}
            onValidate={() => {
              if (previewModalConfig.type === 'PROFORMA') {
                updateEncaissement(project.id, enc.id, { proforma: { ...enc.proforma, status: 'VALIDATED', draft } });
                addHistoryEvent(project.id, `Proforma de l'encaissement ${enc.mode} validée.`);
                addDocumentHistoryEvent(project.id, enc.id, { date: new Date().toISOString(), documentType: 'PROFORMA', action: 'Validée', draftSnapshot: draft });
              } else {
                updateEncaissement(project.id, enc.id, { facture: { ...enc.facture, status: 'VALIDATED', draft } });
                addHistoryEvent(project.id, `Facture de l'encaissement ${enc.mode} validée.`);
                addDocumentHistoryEvent(project.id, enc.id, { date: new Date().toISOString(), documentType: 'FACTURE', action: 'Validée', draftSnapshot: draft });
              }
            }}
            onDeposit={() => {
              if (previewModalConfig.type === 'PROFORMA') {
                updateEncaissement(project.id, enc.id, { proforma: { ...enc.proforma, status: 'DEPOSITED', draft } });
                addHistoryEvent(project.id, `Proforma de l'encaissement ${enc.mode} déposée.`);
                addDocumentHistoryEvent(project.id, enc.id, { date: new Date().toISOString(), documentType: 'PROFORMA', action: 'Déposée', draftSnapshot: draft });
              } else {
                updateEncaissement(project.id, enc.id, { facture: { ...enc.facture, status: 'DEPOSITED', draft } });
                addHistoryEvent(project.id, `Facture de l'encaissement ${enc.mode} déposée.`);
                addDocumentHistoryEvent(project.id, enc.id, { date: new Date().toISOString(), documentType: 'FACTURE', action: 'Déposée', draftSnapshot: draft });
              }
              setPreviewModalConfig({ isOpen: false, type: 'PROFORMA' });
            }}
          />
        );
      })()}

      {/* Dissociation Modal */}
      {dossierToDissociate && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-3xl p-8 relative w-full max-w-lg flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <FolderKanban className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-xl">Dissocier le dossier</h3>
                <p className="text-xs font-bold text-slate-500 mt-1">Que souhaitez-vous faire des proformas ?</p>
              </div>
            </div>
            
            <p className="text-sm font-semibold text-slate-700 mb-8 leading-relaxed">
              La dissociation annulera la proforma fusionnée. Souhaitez-vous restaurer les anciennes proformas individuelles générées avant la fusion avec leurs numéros d'origine, ou les laisser annulées pour en générer de nouvelles ?
            </p>
            
            <div className="flex flex-col gap-3 mt-auto">
              <button
                onClick={() => {
                  dissociateDossier(dossierToDissociate, true);
                  setDossierToDissociate(null);
                }}
                className="w-full px-5 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Accepter : Restaurer les anciennes proformas
              </button>
              <button
                onClick={() => {
                  dissociateDossier(dossierToDissociate, false);
                  setDossierToDissociate(null);
                }}
                className="w-full px-5 py-3.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Refuser : Laisser annulé (à regénérer)
              </button>
              <button
                onClick={() => setDossierToDissociate(null)}
                className="w-full px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-sm transition-all"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
