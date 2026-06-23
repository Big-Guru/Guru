import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../store';
import { ArrowLeft, Plus, X, Trash2, Calendar, User, Phone, Mail, FileText, CheckCircle, CheckCircle2, Clock, Trash, FolderKanban, Edit3, Banknote } from 'lucide-react';
import { ProjectTask, Contract, ProjectContact, DocumentTrack } from '../types';
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
  const {
    projects,
    clients,
    updateProject,
    addContract,
    updateContractStatus,
    updateTaskInContract,
    advanceProjectPhase,
    addMaintenance,
    deleteMaintenance
  } = useStore();

  const project = projects.find(p => p.id === id);
  const client = clients.find(c => c.id === project?.clientId);

  const [showContacts, setShowContacts] = useState(false);
  const [showBilling, setShowBilling] = useState(false);
  const [showNewContract, setShowNewContract] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);
  const [showEditProject, setShowEditProject] = useState(false);
  const [showContractManager, setShowContractManager] = useState(false);
  const [showFacturation, setShowFacturation] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [activePhaseId, setActivePhaseId] = useState<string | null>(null);

  const [newContractName, setNewContractName] = useState('');
  const [newContractMode, setNewContractMode] = useState('Acquisition');
  const [newContractPhase, setNewContractPhase] = useState('Démarchage');

  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [newTaskStatus, setNewTaskStatus] = useState<'PENDING' | 'IN_PROGRESS' | 'DONE' | 'CANCELED'>('PENDING');

  const [newContactName, setNewContactName] = useState('');
  const [newContactRole, setNewContactRole] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');

  const [newMaintenanceYear, setNewMaintenanceYear] = useState(new Date().getFullYear());
  const [newMaintenanceDate, setNewMaintenanceDate] = useState(new Date().toISOString().split('T')[0]);

  const [editData, setEditData] = useState({
    departement: project?.departement || '',
    product: project?.product || '',
    entity: project?.entity || '',
    technique: project?.technique?.join(', ') || '',
    responsable: project?.ownerId || '',
    wilaya: project?.wilaya || '',
    ville: project?.ville || '',
    createdAt: project?.createdAt || ''
  });

  if (!project || !client) return <div className="p-8">Projet introuvable</div>;

  let contractsList = [...(project.contracts || [])];
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
      product: editData.product,
      entity: editData.entity as any,
      technique: editData.technique.split(',').map(s => s.trim()).filter(Boolean),
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
    <div className="flex flex-col xl:flex-row gap-6 items-start animate-fade-in pb-12 w-full max-w-7xl mx-auto">
      {/* LEFT PANEL */}
      <div className="flex-1 w-full space-y-6">
        <Link to="/projects" className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl text-xs font-extrabold text-slate-500 hover:text-blue-600 shadow-sm transition-all w-max">
          <ArrowLeft className="w-4 h-4" />
          Retour à la liste des projets
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

        <div className="flex flex-wrap items-center justify-end gap-3 shrink-0">
          <button onClick={() => setShowContacts(true)} className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-800 rounded-2xl text-xs font-extrabold shadow-sm transition-all group">
            <User className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
            Contacts
            <span className="bg-slate-100 group-hover:bg-indigo-100 text-slate-600 px-2 py-0.5 rounded-md text-[10px] ml-1">{contactsList.length}</span>
          </button>
          
          <button onClick={() => setShowBilling(true)} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white rounded-2xl text-xs font-extrabold shadow-md transition-all hover:-translate-y-0.5 shadow-slate-900/20">
            <FileText className="w-4 h-4 text-slate-300" />
            Documents
          </button>

          <button onClick={() => setShowFacturation(true)} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-2xl text-xs font-extrabold shadow-md transition-all hover:-translate-y-0.5 shadow-emerald-600/20">
            <Banknote className="w-4 h-4 text-emerald-100" />
            Facturation
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500 block shadow-sm" />
              Processus du Projet
            </h3>
          </div>

          <div className="flex flex-row items-center overflow-x-auto pb-8 pt-8 pl-4 pr-12 scrollbar-hide group/list">
            {contractsList.map((card, index) => {
              const isActive = selectedContractId ? card.id === selectedContractId : currentContract?.id === card.id;
              const isPending = card.status === 'PENDING';
              const isDone = card.status === 'DONE' || card.status === 'ABANDONED';
              
              const activePhaseIndex = card.phases ? card.phases.findIndex(p => p.status !== 'DONE') : -1;
              const actualPhaseIndex = activePhaseIndex === -1 && card.phases && card.phases.length > 0 ? card.phases.length - 1 : Math.max(0, activePhaseIndex);
              const activePhase = card.phases?.[actualPhaseIndex];
              const currentPhaseCount = card.phases && card.phases.length > 0 ? actualPhaseIndex + 1 : 0;
              const totalPhasesCount = card.phases?.length || 0;

              let colorClasses = "";
              if (card.mode === 'Acquisition') {
                colorClasses = isActive ? "bg-blue-50/90 backdrop-blur-xl border-blue-200/60" : "bg-white/90 backdrop-blur-xl border-slate-200/60 hover:bg-blue-50/90 hover:border-blue-200/60";
              } else if (card.mode === 'Maintenance offerte') {
                colorClasses = isActive ? "bg-red-50/90 backdrop-blur-xl border-red-200/60" : "bg-white/90 backdrop-blur-xl border-slate-200/60 hover:bg-red-50/90 hover:border-red-200/60";
              } else {
                colorClasses = isActive ? "bg-green-50/90 backdrop-blur-xl border-green-200/60" : "bg-white/90 backdrop-blur-xl border-slate-200/60 hover:bg-green-50/90 hover:border-green-200/60";
              }

              return (
                  <button
                    key={card.id}
                    onClick={() => {
                      setSelectedContractId(card.id);
                      setShowContractManager(true);
                    }}
                    className={cn(
                      "shrink-0 flex flex-col justify-between p-5 rounded-3xl w-[280px] h-[180px] text-left transition-all duration-300 relative group border overflow-hidden",
                      colorClasses,
                      isActive ? "shadow-xl scale-105 !z-40 -mr-4" : "shadow-sm -mr-16 scale-95",
                      isPending && "grayscale cursor-not-allowed",
                      isDone && "opacity-95 grayscale-[50%]",
                      "group-hover/list:scale-95 group-hover/list:grayscale group-hover/list:opacity-80 group-hover/list:!z-0",
                      "hover:!scale-105 hover:!grayscale-0 hover:!opacity-100 hover:!z-50 hover:-translate-y-2 hover:shadow-2xl"
                    )}
                    style={{ zIndex: contractsList.length - index }}
                  >
                    {/* Subtle glow for active card */}
                    {isActive && (
                      <>
                        <div className={cn("absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl z-0 pointer-events-none", card.mode === 'Acquisition' ? 'bg-blue-100' : card.mode === 'Maintenance offerte' ? 'bg-red-100' : 'bg-green-100')}></div>
                        <div className={cn("absolute -left-10 -bottom-10 w-32 h-32 rounded-full blur-3xl z-0 pointer-events-none", card.mode === 'Acquisition' ? 'bg-indigo-100' : card.mode === 'Maintenance offerte' ? 'bg-orange-100' : 'bg-emerald-100')}></div>
                      </>
                    )}

                    <div className="relative z-10 flex flex-col h-full pt-1">
                      <div className="flex items-start justify-between">
                        <h4 className={cn(
                          "font-extrabold text-[22px] tracking-tight leading-none mb-1.5 transition-colors",
                          isActive ? (card.mode === 'Acquisition' ? "text-blue-900" : card.mode === 'Maintenance offerte' ? "text-red-900" : "text-green-900") : cn("text-slate-800", card.mode === 'Acquisition' ? "group-hover:text-blue-900" : card.mode === 'Maintenance offerte' ? "group-hover:text-red-900" : "group-hover:text-green-900")
                        )}>
                          {card.name}
                        </h4>
                        {isDone && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 ml-2" />}
                      </div>
                      {activePhase && (
                         <span className={cn(
                           "text-xs font-bold block mb-4 transition-colors",
                           isActive ? "text-slate-600" : "text-slate-400 group-hover:text-slate-600"
                         )}>
                           <span className={isActive ? "text-slate-900" : "text-slate-500 group-hover:text-slate-900"}>{activePhase.name}</span>
                         </span>
                      )}
                      <div className="flex justify-between items-end mt-auto">
                        <div className="flex flex-col gap-2.5">
                           <span className={cn(
                             "text-[10px] font-bold uppercase tracking-wider transition-colors",
                             isActive ? "text-slate-500" : "text-slate-400 group-hover:text-slate-500"
                           )}>
                             {card.startDate ? `Début: ${card.startDate}` : (isPending ? 'En attente' : 'Non défini')}
                           </span>
                           {activePhase && activePhase.tasks && activePhase.tasks.length > 0 && (
                             <div className="flex items-center gap-1.5 flex-wrap max-w-[120px]">
                               {activePhase.tasks.map(t => (
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
                        {card.phases && (
                           <span className={cn(
                             "text-xs font-black transition-colors",
                             isActive ? "text-slate-500" : "text-slate-400 group-hover:text-slate-500"
                           )}>
                             {currentPhaseCount}/{totalPhasesCount} Phases
                           </span>
                        )}
                      </div>
                    </div>
                  </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="w-full xl:w-80 bg-slate-50/50 border border-slate-200/70 rounded-3xl p-6 shadow-xl shadow-slate-100/40 space-y-5">
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

                        <div className="flex justify-between items-start w-full relative z-10 gap-4">
                          <span className={cn(
                            "font-extrabold text-sm block leading-relaxed flex-1 mt-0.5 transition-colors", 
                            isGreen ? "text-emerald-700/60 line-through" : 
                            isBlue ? "text-blue-950" : 
                            isRed ? "text-red-950" : 
                            "text-slate-800"
                          )}>
                            {t.name}
                          </span>
                          <select 
                            value={t.status}
                            onChange={(e) => updateTaskInContract(project.id, currentContract.id, currentPhase.id, t.id, { status: e.target.value as any })}
                            className={cn(
                              "px-3 py-1.5 rounded-xl font-extrabold uppercase tracking-widest text-[10px] outline-none cursor-pointer text-center appearance-none transition-all shadow-sm",
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

                        <div className="flex flex-col md:flex-row md:items-center gap-4 relative z-10">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200/60 shadow-sm">
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                            </div>
                            <input 
                              type="date" 
                              value={t.date || ''} 
                              onChange={(e) => updateTaskInContract(project.id, currentContract.id, currentPhase.id, t.id, { date: e.target.value })}
                              className="bg-transparent border-b-2 border-transparent hover:border-slate-300 focus:border-blue-500 py-1 text-xs font-bold text-slate-700 outline-none transition-all cursor-pointer"
                            />
                          </div>
                          <div className="flex items-center gap-2.5 flex-1">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200/60 shadow-sm">
                              <FileText className="w-3.5 h-3.5 text-slate-500" />
                            </div>
                            <input 
                              type="text" 
                              placeholder="Ajouter un rapport ou un commentaire..."
                              value={t.reports || ''} 
                              onChange={(e) => updateTaskInContract(project.id, currentContract.id, currentPhase.id, t.id, { reports: e.target.value })}
                              className="flex-1 bg-white border border-slate-200/60 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all shadow-sm"
                            />
                          </div>
                        </div>
                      </div>
                );
              })}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Département</label>
                  <input type="text" value={editData.departement} onChange={e => setEditData({ ...editData, departement: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:bg-white focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Produit</label>
                  <input type="text" value={editData.product} onChange={e => setEditData({ ...editData, product: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:bg-white focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Entité</label>
                  <select value={editData.entity} onChange={e => setEditData({ ...editData, entity: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:bg-white focus:border-blue-500 outline-none">
                    <option value="">Sélectionner</option>
                    <option value="Naltis">Naltis</option>
                    <option value="Netsprint">Netsprint</option>
                    <option value="MP">Micro-Planete</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Responsable</label>
                  <input type="text" value={editData.responsable} onChange={e => setEditData({ ...editData, responsable: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:bg-white focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Date de Création</label>
                  <input type="date" value={editData.createdAt} onChange={e => setEditData({ ...editData, createdAt: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:bg-white focus:border-blue-500 outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Technique (séparés par virgule)</label>
                  <input type="text" value={editData.technique} onChange={e => setEditData({ ...editData, technique: e.target.value })} placeholder="Fay, Arslane, Hamza..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:bg-white focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Wilaya</label>
                  <input type="text" value={editData.wilaya} onChange={e => setEditData({ ...editData, wilaya: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:bg-white focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Ville</label>
                  <input type="text" value={editData.ville} onChange={e => setEditData({ ...editData, ville: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:bg-white focus:border-blue-500 outline-none" />
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

      {/* Billing */}
      {showBilling && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 relative w-full max-w-5xl max-h-[90vh] flex flex-col justify-between overflow-hidden">
            <button type="button" onClick={() => setShowBilling(false)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
            <div className="space-y-1 mb-5">
              <h3 className="font-extrabold text-slate-900 text-base">Gestion de la Facturation</h3>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 space-y-8">
              <form onSubmit={handleAddMaintenance} className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-2xl flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1 space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Année</label>
                  <input type="number" required value={newMaintenanceYear} onChange={e => setNewMaintenanceYear(parseInt(e.target.value))} className="w-full bg-white border border-emerald-200 rounded-xl px-3.5 py-2 text-xs focus:border-emerald-500 outline-none" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Date début</label>
                  <input type="date" required value={newMaintenanceDate} onChange={e => setNewMaintenanceDate(e.target.value)} className="w-full bg-white border border-emerald-200 rounded-xl px-3.5 py-2 text-xs focus:border-emerald-500 outline-none" />
                </div>
                <button type="submit" className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md">Ajouter l'exercice</button>
              </form>
              <div className="space-y-6">
                {(project.maintenances || []).slice().reverse().map((m) => (
                  <div key={m.id} className="border border-slate-200/80 rounded-2xl bg-white shadow-sm overflow-hidden">
                    <div className="bg-slate-50 border-b border-slate-200/80 p-4 flex justify-between items-center">
                      <div className="space-y-0.5">
                        <h4 className="font-extrabold text-slate-900 text-sm">Exercice {m.year}</h4>
                      </div>
                      <div className="flex items-center gap-3">
                        <select value={m.encaissement?.status || 'PENDING'} onChange={(e) => updateMaintenanceField(m.id, 'encaissement', { status: e.target.value })} className="text-xs font-bold bg-white px-3 py-1.5 rounded-lg border cursor-pointer">
                          <option value="PENDING">Encaissement: En attente</option>
                          <option value="DONE">Encaissement: Effectué</option>
                        </select>
                        <button onClick={() => deleteMaintenance(project.id, m.id)} className="text-red-500 bg-red-50 p-2 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5">
                      {[
                        { key: 'proforma', name: 'Facture Proforma' },
                        { key: 'convention', name: 'Convention' },
                        { key: 'bcOds', name: 'Bon de commande / ODS' },
                        { key: 'facture', name: 'Facture définitive' },
                      ].map(docMeta => {
                        const docTrack = (m as any)[docMeta.key] || { status: 'MISSING' };
                        return (
                          <div key={docMeta.key} className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col gap-2">
                            <span className="font-extrabold text-[11px] text-slate-800 uppercase tracking-wide">{docMeta.name}</span>
                            <select value={docTrack.status} onChange={e => updateMaintenanceDoc(m.id, docMeta.key, { status: e.target.value as any })} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none cursor-pointer">
                              <option value="MISSING">Manquant</option>
                              <option value="PREPARED">Préparé</option>
                              <option value="VALIDATED">Validé</option>
                              <option value="DEPOSITED">Déposé</option>
                              <option value="RECUPERATED">Récupéré</option>
                              <option value="IGNORED">Ignoré</option>
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW MODAL: Facturation */}
      {showFacturation && (
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
            
            <div className="flex-1 overflow-y-auto pr-2">
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-8 text-center">
                <p className="text-slate-500 text-sm font-bold">L'espace pour générer les factures d'encaissement sera affiché ici.</p>
              </div>
            </div>
            
            <div className="flex justify-end pt-6 mt-4 border-t border-slate-100 gap-3">
              <button type="button" onClick={() => setShowFacturation(false)} className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold">Fermer</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
