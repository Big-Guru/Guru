import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store';
import { ArrowLeft, Plus, X, Trash2, Calendar, User, Phone, Mail, FileText, CheckCircle, CheckCircle2, Clock, Trash, FolderKanban, Edit3, Banknote, Power, PowerOff } from 'lucide-react';
import { ProjectTask, Contract, ProjectContact, DocumentTrack, DocumentDraft } from '../types';
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
    addAnnexeContract,
    deleteAnnexeContract,
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
    dossiersPaiement
  } = useStore();

  const project = projects.find(p => p.id === id);
  const client = clients.find(c => c.id === project?.clientId);

  const [showContacts, setShowContacts] = useState(false);
  const [showBilling, setShowBilling] = useState(false);
  const [showNewContract, setShowNewContract] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);
  const [showEditProject, setShowEditProject] = useState(false);
  const [showContractManager, setShowContractManager] = useState(false);
  const [showFacturation, setShowFacturation] = useState<boolean | string>(false);
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
        const match = c.name.match(/Année (\d+)/);
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

  const [newContractName, setNewContractName] = useState('');
  const [newContractMode, setNewContractMode] = useState('Acquisition');
  const [newContractPhase, setNewContractPhase] = useState('Démarchage');

  const [showNewAnnexeModal, setShowNewAnnexeModal] = useState(false);
  const [newAnnexeName, setNewAnnexeName] = useState('');
  const [newAnnexePrice, setNewAnnexePrice] = useState('');
  const [newAnnexeAttachedContractId, setNewAnnexeAttachedContractId] = useState('');

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

  const advancePhase = () => {
    if (!currentContract) return;
    const targetPhaseId = activePhaseId || currentContract.phases?.[0]?.id;
    if (!targetPhaseId) return;
    advanceProjectPhase(project.id, currentContract.id, targetPhaseId);
  };

  return (
    <div className="animate-fade-in pb-12 w-full max-w-7xl mx-auto flex flex-col gap-8">
      <div className="flex flex-col xl:flex-row gap-6 items-start w-full">
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
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm border border-indigo-100 font-black text-2xl shrink-0 group-hover:scale-110 transition-transform duration-300">
                    {client?.name?.charAt(0) || 'C'}
                  </div>
                  <div className="space-y-0.5">
                    <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">{project.name}</h1>
                    <p className="text-slate-400 font-bold tracking-wide text-xs uppercase">
                      Client : {client?.name}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-4 lg:mt-0">

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

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4 relative z-10 pt-4 border-t border-slate-100">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Produit</span>
                  <span className="text-sm font-extrabold text-indigo-600">{project.product || '-'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Entité</span>
                  <span className="text-sm font-extrabold text-slate-700">{project.entity || '-'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Mode Actif</span>
                  <span className="text-sm font-extrabold text-slate-700">{currentContract?.mode || project.mode || 'Aucun'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Phase Active</span>
                  <span className="text-sm font-extrabold text-slate-700">{currentContract?.phase || project.phase || '-'}</span>
                </div>
                <div className="flex flex-col">
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
              if (enc.mode === 'Acquisition') {
                missingDocsCount += missingAcquisitionDocs.length;
              } else if (enc.mode === 'Maintenance') {
                if (enc.proforma?.status === 'PENDING') missingDocsCount++;
                if (enc.bc?.status === 'PENDING') missingDocsCount++;
                if (enc.facture?.status === 'PENDING') missingDocsCount++;
                if (enc.status !== 'DONE') missingDocsCount++;
              }
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
              <button onClick={() => setShowNewAnnexeModal(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors shadow-sm">
                <Plus className="w-4 h-4" />
                Prestation Annexe
              </button>
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

                const allActiveGroups = [...activeGroups];
                standaloneActive.forEach(a => allActiveGroups.push({ parent: a, annexes: [] }));

                const renderCard = (card: any, extraClasses: string = "") => {
                  const isActive = selectedContractId ? card.id === selectedContractId : currentContract?.id === card.id;
                  const isPending = card.status === 'PENDING';
                  const isDone = card.status === 'DONE' || card.status === 'ABANDONED';

                  const activePhaseIndex = card.phases ? card.phases.findIndex((p: any) => p.status !== 'DONE') : -1;
                  const actualPhaseIndex = activePhaseIndex === -1 && card.phases && card.phases.length > 0 ? card.phases.length - 1 : Math.max(0, activePhaseIndex);
                  const activePhase = card.phases?.[actualPhaseIndex];
                  const currentPhaseCount = card.phases && card.phases.length > 0 ? actualPhaseIndex + 1 : 0;
                  const totalPhasesCount = card.phases?.length || 0;

                  let colorClasses = "";
                  if (card.mode === 'Acquisition') {
                    colorClasses = isActive ? "bg-blue-50 backdrop-blur-xl border-blue-200/60 shadow-blue-500/10" : "bg-white backdrop-blur-xl border-slate-200/60 hover:bg-blue-50 hover:border-blue-200/60";
                  } else if (card.mode === 'Maintenance offerte') {
                    colorClasses = isActive ? "bg-red-50 backdrop-blur-xl border-red-200/60 shadow-red-500/10" : "bg-white backdrop-blur-xl border-slate-200/60 hover:bg-red-50 hover:border-red-200/60";
                  } else if (card.mode === 'Annexe') {
                    colorClasses = isActive ? "bg-amber-50 backdrop-blur-xl border-amber-200/60 shadow-amber-500/10" : "bg-white backdrop-blur-xl border-slate-200/60 hover:bg-amber-50 hover:border-amber-200/60";
                  } else {
                    colorClasses = isActive ? "bg-emerald-50 backdrop-blur-xl border-emerald-200/60 shadow-emerald-500/10" : "bg-white backdrop-blur-xl border-slate-200/60 hover:bg-emerald-50 hover:border-emerald-200/60";
                  }

                  return (
                    <button
                      key={card.id}
                      onClick={() => {
                        setSelectedContractId(card.id);
                        setShowContractManager(true);
                      }}
                      className={cn(
                        "shrink-0 flex flex-col justify-between p-6 rounded-[28px] w-[280px] h-[190px] text-left transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] border overflow-hidden",
                        colorClasses,
                        extraClasses,
                        isActive ? "shadow-xl ring-2 ring-offset-2 ring-slate-100 scale-[1.02] grayscale-0 opacity-100" : "shadow-sm hover:shadow-md hover:-translate-y-1 hover:scale-[1.02] grayscale-[15%] hover:grayscale-0",
                        (isPending && !isActive) ? "grayscale-[50%] opacity-100 bg-slate-50 hover:grayscale-0" : "",
                        (isDone && !isActive) ? "grayscale-[30%] opacity-100 bg-slate-50 hover:grayscale-0" : ""
                      )}
                    >
                      {isActive && (
                        <>
                          <div className={cn("absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl z-0 pointer-events-none", card.mode === 'Acquisition' ? 'bg-blue-100' : card.mode === 'Maintenance offerte' ? 'bg-red-100' : 'bg-green-100')}></div>
                          <div className={cn("absolute -left-10 -bottom-10 w-32 h-32 rounded-full blur-3xl z-0 pointer-events-none", card.mode === 'Acquisition' ? 'bg-indigo-100' : card.mode === 'Maintenance offerte' ? 'bg-orange-100' : 'bg-emerald-100')}></div>
                        </>
                      )}

                      <div className="relative z-10 flex flex-col h-full pt-1 w-full">
                        <div className="flex items-start justify-between w-full">
                          <h4 className={cn(
                            "font-extrabold text-[22px] tracking-tight leading-none mb-1.5 transition-colors",
                            isActive ? (card.mode === 'Acquisition' ? "text-blue-900" : card.mode === 'Maintenance offerte' ? "text-red-900" : "text-green-900") : "text-slate-800"
                          )}>
                            {card.name}
                          </h4>
                          {isDone && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 ml-2" />}
                        </div>
                        {activePhase && (
                          <span className={cn(
                            "text-xs font-bold block mb-4 transition-colors",
                            isActive ? "text-slate-600" : "text-slate-400"
                          )}>
                            <span className={isActive ? "text-slate-900" : "text-slate-500"}>{activePhase.name}</span>
                          </span>
                        )}
                        <div className="flex justify-between items-end mt-auto w-full">
                          <div className="flex flex-col gap-2.5">
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-wider transition-colors",
                              isActive ? "text-slate-500" : "text-slate-400"
                            )}>
                              {(() => {
                                let displayDate = card.startDate;
                                if (!displayDate && card.mode === 'Maintenance') {
                                  const match = card.name.match(/Année (\d+)/);
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
                            "text-sm font-extrabold transition-colors",
                            isActive ? "text-slate-800" : "text-slate-500"
                          )}>
                            {currentPhaseCount}/{totalPhasesCount} <span className="text-[10px] uppercase font-bold opacity-70">Phases</span>
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
                      <div className="peer/inactive order-last flex flex-row items-center -space-x-[224px] hover:space-x-5 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] shrink-0 relative pt-10 pb-2 pl-4 pr-4">
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
                      "order-first flex flex-row items-center transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] relative pt-10 pb-2",
                      inactiveList.length > 0 ? "space-x-5 peer-hover/inactive:-space-x-[240px]" : "gap-5"
                    )}>
                      {allActiveGroups.length > 0 && (
                        <div className="absolute top-0 left-4 text-[10px] font-black uppercase text-slate-400 tracking-widest z-50">Actifs</div>
                      )}
                      {allActiveGroups.map((grp, idx) => (
                       <div key={idx} className={cn(
                         "relative flex flex-row items-center transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] hover:!z-50",
                         grp.annexes.length > 0 ? "group/ministack -space-x-[224px] hover:space-x-5" : ""
                       )} style={{ zIndex: 40 - idx }}>
                         
                         {/* Parent Contract */}
                         <div className="relative shrink-0 z-20 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]">
                           {renderCard(grp.parent)}
                         </div>

                         {/* Annexes */}
                         {grp.annexes.map((annexe, aIdx) => (
                            <div key={annexe.id} 
                                 className="relative shrink-0 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]" 
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
          </div>
        </div>

        {/* Panneau droit : Historique */}
        <div className="w-full xl:w-80 shrink-0 flex flex-col gap-6 sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-1 z-50">
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
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 items-start w-full mt-2">
        <div className="flex-1 w-full space-y-4 min-w-0">
          {/* Liste des Encaissements */}
          <div className="mt-2 space-y-4">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-extrabold text-xl text-slate-900">
                  Échéancier des Encaissements
                </h3>
                <p className="text-slate-500 text-sm mt-1 font-semibold">Suivi automatisé des acquisitions et maintenances</p>
              </div>
              {manualFusionSelection.length >= 2 && (
                <button
                  disabled={isCreatingDossier}
                  onClick={() => handleCreateDossier(manualFusionSelection)}
                  className={`px-4 py-2 rounded-xl font-bold transition-colors shadow-sm flex items-center gap-2 text-sm ${isCreatingDossier ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700'}`}
                >
                  <FolderKanban className="w-4 h-4" />
                  {isCreatingDossier ? 'Création...' : "Créer Dossier d'encaissement"}
                </button>
              )}
            </div>

            {(!project.encaissements || project.encaissements.length === 0) ? (
              <div className="text-center py-10 bg-slate-50/50 rounded-3xl border border-slate-100">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-bold">Aucun encaissement programmé.</p>
                <p className="text-slate-400 text-sm mt-1">Validez la tâche "Formation" dans l'Acquisition pour générer l'échéancier initial.</p>
              </div>
            ) : (() => {

              const sortedEncaissements = [...project.encaissements].sort((a, b) => {
                const timeA = a.targetDate ? new Date(a.targetDate).getTime() : 0;
                const timeB = b.targetDate ? new Date(b.targetDate).getTime() : 0;
                const diff = timeA - timeB;
                if (diff !== 0) return diff;

                if (a.mode === 'Acquisition' && b.mode === 'Maintenance') return -1;
                if (a.mode === 'Maintenance' && b.mode === 'Acquisition') return 1;
                return 0;
              });

              const pastEncaissements = sortedEncaissements.filter(e => {
                if (e.status !== 'DONE' && e.status !== 'ABANDONED') return false;
                if (e.isCombined) {
                  const dossierId = e.combinedWithDossierId || e.dossierId;
                  const dossier = dossiersPaiement.find(d => d.id === dossierId);
                  if (dossier && dossier.status !== 'CLOSED') {
                    return false;
                  }
                }
                return true;
              });
              const activeIndependent = sortedEncaissements.filter(e =>
                !pastEncaissements.includes(e) && !e.isCombined
              );

              const activeCombinedEncaissements = sortedEncaissements.filter(e =>
                !pastEncaissements.includes(e) && e.isCombined
              );

              const projectDossiersMap = new Map<string, typeof project.encaissements>();
              activeCombinedEncaissements.forEach(e => {
                const dossierId = e.combinedWithDossierId || e.dossierId;
                if (!dossierId) return;
                if (!projectDossiersMap.has(dossierId)) {
                  projectDossiersMap.set(dossierId, []);
                }
                projectDossiersMap.get(dossierId)!.push(e);
              });

              const activeItems: any[] = [];
              activeIndependent.forEach(e => activeItems.push({ type: 'ENCAISSEMENT', data: e, date: e.targetDate }));

              projectDossiersMap.forEach((encs, dossierId) => {
                const dossier = dossiersPaiement.find(d => d.id === dossierId);
                if (dossier) {
                  activeItems.push({ type: 'DOSSIER', data: dossier, encaissements: encs, date: encs[0]?.targetDate });
                }
              });

              activeItems.sort((a, b) => {
                const timeA = a.date ? new Date(a.date).getTime() : 0;
                const timeB = b.date ? new Date(b.date).getTime() : 0;
                if (timeA !== timeB) return timeA - timeB;

                const modeA = a.type === 'DOSSIER' ? a.encaissements[0]?.mode : a.data.mode;
                const modeB = b.type === 'DOSSIER' ? b.encaissements[0]?.mode : b.data.mode;

                if (modeA === 'Acquisition' && modeB !== 'Acquisition') return -1;
                if (modeB === 'Acquisition' && modeA !== 'Acquisition') return 1;
                return 0;
              });

              const renderEncaissementCard = (enc: any, isStacked: boolean = false, stackIdx: number = 0, totalStacked: number = 0) => {
                const isUpcoming = enc.status === 'UPCOMING';
                const isDone = enc.status === 'DONE';
                const isProgress = enc.status === 'IN_PROGRESS' || enc.status === 'PARTIAL';
                const isPartial = enc.status === 'PARTIAL';

                const getActiveStep = () => {
                  if (enc.status === 'DONE') return null;
                  if (enc.facture.status === 'VALIDATED') return { doc: 'Paiement', state: 'En attente' };
                  if (enc.bc.status === 'RECOVERED') {
                    const s = enc.facture.status;
                    if (s === 'PENDING') return { doc: 'Facture', state: 'À générer' };
                    if (s === 'GENERATED') return { doc: 'Facture', state: 'Générée' };
                    if (s === 'TO_VERIFY') return { doc: 'Facture', state: 'À vérifier' };
                    return { doc: 'Facture', state: 'Validée' };
                  }
                  if (enc.proforma.status === 'VALIDATED') {
                    const s = enc.bc.status;
                    if (s === 'PENDING') return { doc: 'Bon de commande', state: 'En attente' };
                    return { doc: 'Bon de commande', state: 'Récupéré' };
                  }
                  const s = enc.proforma.status;
                  if (s === 'PENDING') return { doc: 'Proforma', state: 'À générer' };
                  if (s === 'GENERATED') return { doc: 'Proforma', state: 'Générée' };
                  if (s === 'TO_VERIFY') return { doc: 'Proforma', state: 'À vérifier' };
                  return { doc: 'Proforma', state: 'Validée' };
                };

                const activeStep = getActiveStep();

                const stackedStyles = isStacked ? {
                  position: 'absolute' as const,
                  top: `${40 + stackIdx * 8}px`,
                  left: `${stackIdx * 15}px`,
                  right: 0,
                  zIndex: stackIdx,
                  opacity: 0.6 + (stackIdx * (0.4 / Math.max(totalStacked, 1))),
                  transform: 'scale(0.98)',
                  transformOrigin: 'top left'
                } : {};

                return (
                  <div key={enc.id}
                    style={stackedStyles}
                    className={cn(
                      "p-5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all duration-300",
                      isStacked ? "hover:-translate-y-2 hover:opacity-100 hover:z-50 cursor-pointer shadow-lg bg-slate-100 border-slate-300" :
                        isUpcoming ? "bg-slate-50 border-slate-200/60 opacity-80 shadow-sm" :
                          isDone ? "bg-emerald-50 border-emerald-200/60 shadow-sm" :
                            "bg-white border-blue-200/60 shadow-md shadow-blue-500/5",
                      manualFusionSelection.some(e => e.id === enc.id) ? "ring-2 ring-indigo-500 border-indigo-500/50 bg-indigo-50/30" : ""
                    )}>
                    <div className="flex items-center gap-4">
                      {!isStacked && isProgress && (
                        <div className="pt-1">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                            checked={manualFusionSelection.some(e => e.id === enc.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setManualFusionSelection([...manualFusionSelection, enc]);
                              } else {
                                setManualFusionSelection(manualFusionSelection.filter(item => item.id !== enc.id));
                              }
                            }}
                          />
                        </div>
                      )}
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner",
                        isStacked ? "bg-slate-200 text-slate-500" :
                          isUpcoming ? "bg-slate-200 text-slate-500" :
                            isDone ? "bg-emerald-100 text-emerald-600" :
                              "bg-blue-100 text-blue-600"
                      )}>
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className={cn(
                          "font-extrabold text-base mb-1",
                          isStacked ? "text-slate-600" :
                            isUpcoming ? "text-slate-600" : isDone ? "text-emerald-900" : "text-blue-950"
                        )}>
                          {enc.mode} {enc.year ? `(Année ${enc.year})` : ''}
                        </h4>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                          <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md uppercase tracking-wider whitespace-nowrap">{project.product} {project.version}</span>
                          <span>•</span>
                          <span className={cn(
                            "whitespace-nowrap",
                            (!isStacked && isDone) ? "text-emerald-600" : (!isStacked && isProgress) ? "text-blue-600" : ""
                          )}>
                            Début : {new Date(enc.targetDate).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-3 w-full md:w-auto">
                      {activeStep && (
                        <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-[10px] font-black tracking-widest border border-blue-200 flex items-center gap-1.5 shadow-sm whitespace-nowrap">
                          <span className="uppercase">{activeStep.doc}</span>
                          <span className="opacity-40">-</span>
                          <span className="uppercase text-blue-500">{activeStep.state}</span>
                        </span>
                      )}
                      {enc.isCombined && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-xl text-[10px] font-black uppercase tracking-widest border border-purple-200 flex items-center gap-1.5 shadow-sm whitespace-nowrap">
                            <FolderKanban className="w-3.5 h-3.5" /> Dossier fusionné
                          </span>
                          {(() => {
                            const dossierId = enc.combinedWithDossierId || (enc as any).dossierId;
                            const dossier = dossiersPaiement.find(d => d.id === dossierId);
                            if (!dossier || !dossier.projectIds) return null;
                            return dossier.projectIds.map((pid: string, idx: number) => {
                              const pName = projects.find(proj => proj.id === pid)?.name;
                              if (!pName || pName === project.name) return null;
                              return (
                                <span key={idx} className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg border border-slate-200 shadow-sm whitespace-nowrap">
                                  + {pName}
                                </span>
                              );
                            });
                          })()}
                        </div>
                      )}

                      {(isDone || isPartial) && enc.montantTotal && (
                        <div className="text-right">
                          <div className="text-xs font-extrabold text-slate-800">
                            {enc.montantEncaisse?.toLocaleString('fr-DZ')} DA / {enc.montantTotal.toLocaleString('fr-DZ')} DA
                          </div>
                          {isPartial && enc.resteDette && (
                            <div className="text-[10px] font-bold text-red-500 mt-0.5">Dette reportée: {enc.resteDette.toLocaleString('fr-DZ')} DA</div>
                          )}
                        </div>
                      )}

                      {isProgress && !isStacked && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowFacturation(enc.combinedWithDossierId || enc.id)}
                            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-90 rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all hover:-translate-y-0.5 flex items-center gap-2 whitespace-nowrap"
                          >
                            <Banknote className="w-4 h-4" /> Gérer l'encaissement
                          </button>
                          {enc.mode === 'Maintenance' && enc.proforma?.status === 'PENDING' && (
                            <button
                              onClick={() => {
                                if (window.confirm("Voulez-vous vraiment annuler l'activation de cette maintenance ?\nCela supprimera la prévision de l'année suivante.")) {
                                  deactivateMaintenanceEncaissement(project.id, enc.id);
                                }
                              }}
                              className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 whitespace-nowrap"
                            >
                              <PowerOff className="w-4 h-4" /> Désactiver
                            </button>
                          )}
                        </div>
                      )}
                      {isDone && (
                        <span className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" /> Clôturé
                        </span>
                      )}
                      {isUpcoming && !isStacked && (
                        <div className="flex items-center gap-2">
                          <span className="px-4 py-2 bg-slate-200 text-slate-500 rounded-xl text-xs font-bold flex items-center gap-2">
                            <Clock className="w-4 h-4" /> En attente
                          </span>
                          <button
                            onClick={() => {
                              let confirmMsg = "Voulez-vous vraiment activer la facturation de cette maintenance ?";
                              if (project.processType === 'STANDARD' && enc.year === 1) {
                                confirmMsg += "\n\nLa phase 'Maintenance Gratuite' sera terminée et l'encaissement passera en cours.";
                              }
                              if (window.confirm(confirmMsg)) {
                                activateMaintenanceEncaissement(project.id, enc.id);
                              }
                            }}
                            className="px-4 py-2 bg-purple-100 text-purple-700 hover:bg-purple-200 hover:text-purple-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-2"
                          >
                            <Power className="w-4 h-4" /> Activer
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              };

              const renderDossierCard = (dossier: any, encs: any[]) => {
                const isSelected = manualFusionSelection.some(e => e.isCombined && e.combinedWithDossierId === dossier.id);
                return (
                  <div key={dossier.id} className={cn(
                    "p-5 border rounded-2xl shadow-sm hover:shadow-md transition-shadow",
                    isSelected ? "ring-2 ring-indigo-500 border-indigo-500/50 bg-indigo-50/30" : "bg-white border-slate-200"
                  )}>
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setManualFusionSelection([...manualFusionSelection, encs[0]]);
                            } else {
                              setManualFusionSelection(manualFusionSelection.filter(item => item.combinedWithDossierId !== dossier.id));
                            }
                          }}
                        />
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-purple-100 text-purple-700 rounded-xl border border-purple-200 flex items-center gap-1.5 shadow-sm">
                            <FolderKanban className="w-3.5 h-3.5" /> Dossier Fusionné
                          </span>
                          {dossier.projectIds && dossier.projectIds.map((pid: string, idx: number) => {
                            const pName = projects.find(proj => proj.id === pid)?.name;
                            if (!pName) return null;
                            return (
                              <span key={idx} className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg border border-slate-200 shadow-sm">
                                {pName}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-bold">Créé le {new Date(dossier.createdAt).toLocaleDateString('fr-FR')}</span>
                        <button
                          onClick={() => {
                            if (confirm("Voulez-vous vraiment supprimer ce dossier de paiement ? Les encaissements redeviendront indépendants.")) {
                              dissociateDossier(dossier.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Défusionner"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3 mb-5">
                      {(() => {
                        const dossierAllEncs = projects.flatMap(p =>
                          (p.encaissements || []).filter(e => e.combinedWithDossierId === dossier.id || (e as any).dossierId === dossier.id)
                            .map(e => ({ ...e, projectName: p.name, product: p.product, version: p.version }))
                        );

                        return dossierAllEncs.sort((a: any, b: any) => {
                          const modeA = a.mode;
                          const modeB = b.mode;
                          if (modeA === 'Acquisition' && modeB !== 'Acquisition') return -1;
                          if (modeB === 'Acquisition' && modeA !== 'Acquisition') return 1;
                          return 0;
                        }).map((enc: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between bg-slate-50 border border-slate-100 p-3 rounded-xl">
                            <div>
                              <div className="text-sm font-bold text-slate-800">{enc.mode} {enc.year ? `(Année ${enc.year})` : enc.annexeName ? `(${enc.annexeName})` : ''} <span className="text-slate-400 font-medium ml-1">— {enc.projectName}</span></div>
                              <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-500 mt-0.5">
                                <span className="uppercase">{enc.product} {enc.version}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] text-slate-400 font-medium">Début</div>
                              <div className="text-sm font-bold text-slate-900">{new Date(enc.targetDate).toLocaleDateString('fr-FR')}</div>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>

                    <div className="flex justify-end items-center mt-4 pt-4 border-t border-slate-100">
                      <button
                        onClick={() => setShowFacturation(dossier.id)}
                        className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-90 rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all hover:-translate-y-0.5 flex items-center gap-2 whitespace-nowrap"
                      >
                        <Banknote className="w-4 h-4" /> Gérer l'encaissement
                      </button>
                    </div>
                  </div>
                );
              };

              return (
                <div className="space-y-4 w-full">
                  {pastEncaissements.length > 0 && (
                    <div className="relative mb-2 shrink-0" style={{ height: `${100 + pastEncaissements.length * 8}px` }}>
                      {pastEncaissements.map((enc, idx) => renderEncaissementCard(enc, true, idx, pastEncaissements.length))}
                    </div>
                  )}

                  {activeItems.length > 0 && (
                    <div className="space-y-4">
                      {activeItems.map((item, index) =>
                        item.type === 'ENCAISSEMENT'
                          ? renderEncaissementCard(item.data)
                          : renderDossierCard(item.data, item.encaissements)
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Panneau droit : Historique des Documents */}
        <div className="w-full xl:w-80 shrink-0 flex flex-col gap-6 sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-1">
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
                  <div className="flex items-center gap-3 ml-9">
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
                            deleteAnnexeContract(project.id, currentContract.id);
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
              </div>

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

              <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                {currentPhase && (
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
                {currentPhase && (currentPhase.tasks || []).length > 0 && (
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
      {showNewAnnexeModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={(e) => {
            e.preventDefault();
            if (newAnnexeName.trim() && newAnnexePrice !== '') {
              addAnnexeContract(project.id, newAnnexeName.trim(), newAnnexeAttachedContractId || undefined, parseFloat(newAnnexePrice));
              setNewAnnexeName('');
              setNewAnnexePrice('');
              setNewAnnexeAttachedContractId('');
              setShowNewAnnexeModal(false);
            }
          }} className="bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 relative w-full max-w-md">
            <button type="button" onClick={() => setShowNewAnnexeModal(false)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
            <h3 className="font-extrabold text-slate-900 text-base mb-5">Ajouter une prestation annexe</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Nom de la prestation</label>
                <input
                  type="text"
                  value={newAnnexeName}
                  onChange={e => setNewAnnexeName(e.target.value)}
                  placeholder="Ex: Matériel Serveur, Formation..."
                  required
                  className="w-full text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Attacher au contrat (Optionnel)</label>
                <select
                  value={newAnnexeAttachedContractId}
                  onChange={e => setNewAnnexeAttachedContractId(e.target.value)}
                  className="w-full text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                >
                  <option value="">-- Aucun contrat (Indépendant) --</option>
                  {project.contracts?.filter(c => c.status !== 'DONE' && c.status !== 'ABANDONED' && c.mode !== 'Annexe').map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Prix HT (DA)</label>
                <input
                  type="number"
                  value={newAnnexePrice}
                  onChange={e => setNewAnnexePrice(e.target.value)}
                  placeholder="Ex: 50000"
                  required
                  min="0"
                  className="w-full text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-slate-100">
              <button type="button" onClick={() => setShowNewAnnexeModal(false)} className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold">Annuler</button>
              <button type="submit" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md">Ajouter</button>
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
                    let contractDocs: { id: string, name: string, isMissing: boolean, onToggle: () => void }[] = [];
                    let contractTitle: string = enc.mode;

                    if (enc.mode === 'Acquisition') {
                      if (acquisitionContract && encaissementPhase) {
                        contractDocs = (encaissementPhase.tasks || []).map(t => ({
                          id: t.id,
                          name: t.name,
                          isMissing: t.status === 'PENDING' || t.status === 'IN_PROGRESS',
                          onToggle: () => {
                            const newStatus = (t.status === 'PENDING' || t.status === 'IN_PROGRESS') ? 'DONE' : 'PENDING';
                            updateTaskInContract(project.id, acquisitionContract.id, encaissementPhase.id, t.id, { status: newStatus as any });
                          }
                        }));
                      }
                    } else if (enc.mode === 'Maintenance') {
                      contractTitle = enc.year !== undefined ? `Maintenance (Année ${enc.year})` : 'Maintenance';
                      contractDocs = [
                        {
                          id: 'proforma',
                          name: 'Proforma',
                          isMissing: enc.proforma?.status === 'PENDING',
                          onToggle: () => updateEncaissement(project.id, enc.id, { proforma: { ...enc.proforma, status: enc.proforma?.status === 'PENDING' ? 'DONE' : 'PENDING' } })
                        },
                        {
                          id: 'bc',
                          name: 'Bon de Commande',
                          isMissing: enc.bc?.status === 'PENDING',
                          onToggle: () => updateEncaissement(project.id, enc.id, { bc: { ...enc.bc, status: enc.bc?.status === 'PENDING' ? 'DONE' : 'PENDING' } })
                        },
                        {
                          id: 'facture',
                          name: 'Facture définitive',
                          isMissing: enc.facture?.status === 'PENDING',
                          onToggle: () => updateEncaissement(project.id, enc.id, { facture: { ...enc.facture, status: enc.facture?.status === 'PENDING' ? 'DONE' : 'PENDING' } })
                        },
                        {
                          id: 'service_fait',
                          name: 'Service fait',
                          isMissing: enc.status !== 'DONE',
                          onToggle: () => updateEncaissement(project.id, enc.id, { status: enc.status !== 'DONE' ? 'DONE' : 'IN_PROGRESS' })
                        }
                      ];
                    }

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
      {showFacturation && typeof showFacturation === 'string' && dossiersPaiement.some(d => d.id === showFacturation) ? (
        <FacturationDossierModal
          dossierId={showFacturation}
          client={client}
          encaissements={(() => {
            let allEncs: any[] = [];
            projects.forEach(p => {
              p.encaissements?.forEach(e => allEncs.push({ ...e, projectId: p.id, projectName: p.name, product: p.product }));
            });
            return allEncs.filter(e => e.isCombined && (e.combinedWithDossierId === showFacturation || (e as any).dossierId === showFacturation)).sort((a, b) => {
              const modeA = a.mode;
              const modeB = b.mode;
              if (modeA === 'Acquisition' && modeB !== 'Acquisition') return -1;
              if (modeB === 'Acquisition' && modeA !== 'Acquisition') return 1;
              return 0;
            });
          })()}
          onClose={() => setShowFacturation(false)}
        />
      ) : showFacturation && (
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
                      <select
                        value={enc.bc.status}
                        onChange={e => updateEncaissement(project.id, enc.id, { bc: { ...enc.bc, status: e.target.value as any } })}
                        className="flex-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 transition-colors disabled:bg-slate-50 disabled:text-slate-400"
                        disabled={enc.proforma.status !== 'VALIDATED'}
                      >
                        <option value="PENDING">En attente</option>
                        <option value="RECOVERED">Récupéré</option>
                      </select>
                      <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end min-w-[120px]">
                        {/* Espace pour alignement si nécessaire */}
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
                                  onClick={() => {
                                    if (window.confirm("Êtes-vous sûr de vouloir dissocier ce dossier ? Les encaissements redeviendront indépendants.")) {
                                      dissociateDossier(dossier.id);
                                    }
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
            const price = getPrice(prod, vers, e.mode);
            totalHT += price;

            const versionStr = vers ? `, Version ${vers}` : '';
            const title = `Logiciel ${prod}${versionStr}`;
            const subtitle = e.mode === 'Acquisition' ? 'Acquisition' : `Maintenance ${e.year ? `Année ${e.year}` : ''}`;
            const description = `${title}\n${subtitle}\n• Monitoring régulier\n• Mises à jour\n• Téléassistance annuelle (Heures de bureau, Du Dimanche au Jeudi)\n• Télé-intervention annuelle (Heures de bureau, Du Dimanche au Jeudi)`.trim();

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
              if (previewModalConfig.type === 'PROFORMA') {
                updateEncaissement(project.id, enc.id, { proforma: { ...enc.proforma, status: enc.proforma.status === 'PENDING' ? 'GENERATED' : enc.proforma.status, draft: newDraft } });
              } else {
                updateEncaissement(project.id, enc.id, { facture: { ...enc.facture, status: enc.facture.status === 'PENDING' ? 'GENERATED' : enc.facture.status, draft: newDraft } });
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

    </div>
  );
}
