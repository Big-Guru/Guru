import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../store';
import { Building2, MapPin, Users2, FileText, ArrowLeft, Plus, X, Award, Receipt, Clock, FolderKanban, Banknote, Calendar, CheckCircle2, Briefcase, Trash2 } from 'lucide-react';
import { calculateAlerts } from '../lib/alerts';
import { ProductType, ProductVersion } from '../types';
import { cn } from '../lib/utils';
import FacturationDossierModal from './FacturationDossierModal';

const ALGERIAN_WILAYAS = [
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
];

const TECH_COLLABS = ["Arslane", "Hamza", "Fay", "Karim", "Khamis", "Mouad"];

export default function ClientDetails() {
  const { id } = useParams<{ id: string }>();
  const { clients, projects, addProject, deleteProject, dossiersPaiement, addDossierPaiement, updateEncaissement, deleteDossierPaiement, dissociateDossier } = useStore();
  const [showFusionModal, setShowFusionModal] = useState(false);
  const [selectedFusionGroup, setSelectedFusionGroup] = useState<any[] | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [selectedDossierFacturationId, setSelectedDossierFacturationId] = useState<string | null>(null);
  const [isCreatingDossier, setIsCreatingDossier] = useState(false);
  const [manualFusionSelection, setManualFusionSelection] = useState<any[]>([]);
  const isCreatingRef = React.useRef(false);
  const [newProjectData, setNewProjectData] = useState({
    name: '',
    departement: 'D1',
    product: 'PAYE' as ProductType,
    version: 'LIGHT' as ProductVersion,
    processType: 'STANDARD' as ProcessType,
    wilaya: '',
    ville: '',
    entity: 'Naltis',
    mode: 'Acquisition',
    phase: 'Démarchage',
    status: 'Actif',
    technique: [] as string[],
    createdAt: new Date().toISOString().split('T')[0]
  });
  
  const client = clients.find(c => c.id === id);
  const clientProjects = projects.filter(p => p.clientId === id);

  React.useEffect(() => {
    if (showNewProject && client && !newProjectData.name) {
      setNewProjectData(prev => ({
        ...prev,
        name: `${client.name} / ${prev.product}`,
        wilaya: client.wilaya || ''
      }));
    }
  }, [showNewProject, client, newProjectData.product]);

  if (!client) {
    return <div className="p-8 text-center text-slate-500 font-semibold">Client introuvable</div>;
  }

  // LOGIQUE DE FUSION DES ENCAISSEMENTS
  let allEncaissements: any[] = [];
  clientProjects.forEach(p => {
    if (p.encaissements) {
      p.encaissements.forEach(e => {
         allEncaissements.push({ ...e, projectName: p.name, product: p.product });
      });
    }
  });

  const eligibleEncaissements = allEncaissements.filter(e => 
    e.status === 'IN_PROGRESS' && 
    !e.isCombined
  );

  const grouped = eligibleEncaissements.reduce((acc, curr) => {
     const monthYear = curr.targetDate.substring(0, 7);
     if (!acc[monthYear]) acc[monthYear] = [];
     acc[monthYear].push(curr);
     return acc;
  }, {} as Record<string, any[]>);

  const combinableGroups = Object.entries(grouped).filter(([_, group]) => group.length >= 2);

  const handleCreateDossier = async (group: any[]) => {
     if (isCreatingRef.current || group.length === 0) return;
     isCreatingRef.current = true;
     setIsCreatingDossier(true);
     try {
       const existingDossierId = group.find(e => e.isCombined && e.combinedWithDossierId)?.combinedWithDossierId;
       
       if (existingDossierId) {
         const dossier = dossiersPaiement.find(d => d.id === existingDossierId);
         if (dossier) {
           const newProjectIds = Array.from(new Set([...dossier.projectIds, ...group.map(e => e.projectId)]));
           const newEncaissementIds = Array.from(new Set([...dossier.encaissementIds, ...group.map(e => e.id)]));
           
           updateDossierPaiement(existingDossierId, {
             projectIds: newProjectIds,
             encaissementIds: newEncaissementIds
           });
           
           group.forEach(e => {
              if (!e.isCombined || e.combinedWithDossierId !== existingDossierId) {
                updateEncaissement(e.projectId, e.id, { isCombined: true, combinedWithDossierId: existingDossierId });
              }
           });
         }
       } else {
         const newId = await addDossierPaiement({
            clientId: client.id,
            projectIds: Array.from(new Set(group.map(e => e.projectId))),
            encaissementIds: group.map(e => e.id),
            status: 'DRAFT',
            total: 0,
            encaisse: 0
         });
         
         if (newId) {
           group.forEach(e => {
              updateEncaissement(e.projectId, e.id, { isCombined: true, combinedWithDossierId: newId });
           });
         }
       }
       
       setSelectedFusionGroup(null);
       setManualFusionSelection([]);
       
       // Delay releasing the lock to absorb any queued double-clicks
       setTimeout(() => {
         isCreatingRef.current = false;
         setIsCreatingDossier(false);
       }, 500);
     } catch (e) {
       console.error("Erreur lors de la création du dossier", e);
       isCreatingRef.current = false;
       setIsCreatingDossier(false);
     }
  };

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !client) return;

    addProject({
      clientId: id,
      name: newProjectData.name,
      departement: newProjectData.departement,
      product: newProjectData.product,
      version: newProjectData.version,
      wilaya: newProjectData.wilaya,
      ville: newProjectData.ville,
      entity: newProjectData.entity as any,
      status: newProjectData.status as any,
      processType: newProjectData.processType as any,
      technique: newProjectData.technique,
      createdAt: newProjectData.createdAt,
      installationDate: newProjectData.createdAt
    });
    setShowNewProject(false);
    setNewProjectData({ 
      name: '', departement: 'D1', product: 'PAYE', version: 'LIGHT', processType: 'STANDARD', wilaya: '', ville: '', 
      entity: 'Naltis', mode: 'Acquisition', phase: 'Démarchage', status: 'Actif', technique: [],
      createdAt: new Date().toISOString().split('T')[0]
    });
  };

  const getProductBadgeStyle = (product: ProductType) => {
    switch (product) {
      case 'PAYE': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'BUDGET': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'BUDGET_APC': return 'bg-teal-50 text-teal-700 border-teal-100';
      case 'STOCKS': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'GRH': return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'PHARMATIS': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'GBS': return 'bg-cyan-50 text-cyan-700 border-cyan-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const getVersionBadgeStyle = (version: ProductVersion) => {
    switch (version) {
      case 'GLOBAL': return 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-transparent';
      case 'ADVANCED': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      case 'INTERMEDIATE': return 'bg-sky-50 text-sky-700 border-sky-100';
      case 'LIGHT': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'ULTRALIGHT': return 'bg-slate-50 text-slate-550 border-slate-150';
      default: return 'bg-slate-50 text-slate-650 border-slate-100';
    }
  };

  const getAvatarStyle = (name: string) => {
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const styles = [
      'bg-blue-50 text-blue-600 border-blue-100/60',
      'bg-indigo-50 text-indigo-600 border-indigo-100/60',
      'bg-purple-50 text-purple-600 border-purple-100/60',
      'bg-pink-50 text-pink-600 border-pink-100/60',
      'bg-rose-50 text-rose-600 border-rose-100/60',
      'bg-emerald-50 text-emerald-600 border-emerald-100/60',
      'bg-teal-50 text-teal-600 border-teal-100/60',
      'bg-amber-50 text-amber-600 border-amber-100/60',
    ];
    return styles[hash % styles.length];
  };

  const avatarStyle = getAvatarStyle(client.name);

  return (
    <div className="space-y-6">


      {/* Header section with back navigation */}
      <div className="flex flex-col gap-4">
        <Link to="/clients" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Retour au portefeuille clients
        </Link>

      </div>

      {/* Main client info details box */}
      <div className="relative overflow-hidden bg-white/80 backdrop-blur-xl rounded-[2rem] p-6 lg:p-8 border border-white/60 shadow-xl shadow-slate-200/40 flex flex-col md:flex-row items-center md:items-start gap-6 group">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-100 rounded-full blur-3xl group-hover:bg-blue-200/60 transition-colors z-0 duration-500"></div>
        <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-indigo-100 rounded-full blur-3xl group-hover:bg-indigo-200/60 transition-colors z-0 duration-500"></div>
        
        {/* Avatar with deterministic colors */}
        <div className={`relative z-10 h-20 w-20 rounded-3xl border-2 border-white/60 flex items-center justify-center font-black text-3xl uppercase shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300 ${avatarStyle}`}>
          {client.name.charAt(0)}
          {client.name.split(' ')[1]?.charAt(0)}
        </div>
        
        <div className="flex-1 space-y-4 text-center md:text-left min-w-0 relative z-10 mt-2 md:mt-0">
          <div className="space-y-1.5">
            <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none truncate group-hover:text-blue-600 transition-colors">{client.name}</h3>
            <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-slate-500 font-bold">
              <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
              <span>{client.address}, Wilaya {client.wilaya}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-4">
            <div className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-2xl border border-white text-xs font-extrabold text-slate-700 shadow-sm">
               <Users2 className="w-4.5 h-4.5 text-blue-500" />
               <span>{client.effectif} {client.effectifType === 'SALARIES' ? 'Salariés' : 'Étudiants'}</span>
            </div>
            
            {/* Fiscal metadata tags */}
            <div className="flex gap-2.5 flex-wrap justify-center">
              {client.nif && <div title="NIF" className="bg-white/50 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white text-[10px] font-bold shadow-sm hover:bg-white/80 transition-colors cursor-help"><span className="text-slate-400 mr-1.5 uppercase tracking-widest">NIF:</span><span className="text-slate-700 font-extrabold">{client.nif}</span></div>}
              {client.nis && <div title="NIS" className="bg-white/50 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white text-[10px] font-bold shadow-sm hover:bg-white/80 transition-colors cursor-help"><span className="text-slate-400 mr-1.5 uppercase tracking-widest">NIS:</span><span className="text-slate-700 font-extrabold">{client.nis}</span></div>}
              {client.rc && <div title="RC" className="bg-white/50 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white text-[10px] font-bold shadow-sm hover:bg-white/80 transition-colors cursor-help"><span className="text-slate-400 mr-1.5 uppercase tracking-widest">RC:</span><span className="text-slate-700 font-extrabold">{client.rc}</span></div>}
              {client.ai && <div title="AI" className="bg-white/50 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white text-[10px] font-bold shadow-sm hover:bg-white/80 transition-colors cursor-help"><span className="text-slate-400 mr-1.5 uppercase tracking-widest">AI:</span><span className="text-slate-700 font-extrabold">{client.ai}</span></div>}
            </div>
          </div>
        </div>
      </div>

      {/* Projects listing grid */}
      <div className="mt-8 space-y-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="font-extrabold text-xl text-slate-900 flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 w-8 h-8 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20">
                <FileText className="w-4 h-4 text-white" />
              </div>
              Projets associés ({clientProjects.length})
            </h3>
            <p className="text-slate-500 text-sm mt-1 ml-11 font-semibold">Gérez et consultez tous les projets de ce client</p>
          </div>
          {!showNewProject && (
            <button 
              onClick={() => setShowNewProject(true)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-xl shadow-sm hover:opacity-95 transition-all duration-200"
            >
              <Plus className="w-3.5 h-3.5" /> Nouveau Projet
            </button>
          )}
        </div>

        <div>
          {/* Grid display */}
            {clientProjects.length === 0 ? (
              <div className="text-center py-12 max-w-sm mx-auto text-slate-500">
                <FileText className="w-10 h-10 text-slate-350 mx-auto mb-3" />
                <h4 className="font-bold text-slate-950 text-sm">Aucun projet</h4>
                <p className="text-xs text-slate-450 mt-1">Créez le premier projet client pour commencer le suivi.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {clientProjects.map((project, index) => {
                  const alerts = calculateAlerts(project);
                  const critCount = alerts.filter(a => a.level === 'CRITICAL').length;
                  const warnCount = alerts.filter(a => a.level === 'WARNING').length;
                  
                  return (
                    <Link 
                      key={`${project.id}-${index}`} 
                      to={`/projects/${project.id}`}
                      state={{ fromClientId: id }}
                      className="group relative flex flex-col bg-white rounded-[28px] border border-slate-200/80 shadow-md shadow-slate-200/30 hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-1.5 hover:border-blue-300 transition-all duration-500 overflow-hidden"
                    >
                      {/* Decorative Background Elements */}
                      <div className="absolute -right-8 -top-8 w-40 h-40 bg-gradient-to-br from-blue-100/50 to-purple-100/50 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700 ease-out pointer-events-none" />
                      <div className="absolute -left-8 -bottom-8 w-40 h-40 bg-gradient-to-br from-emerald-100/30 to-teal-100/30 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700 ease-out pointer-events-none" />
                      
                      <div className="p-6 flex flex-col flex-1 relative z-10 h-full">
                         {/* Top row: Badges */}
                         <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-2">
                               <span className={cn("px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase border shadow-sm tracking-widest", getProductBadgeStyle(project.product))}>
                                 {project.product}
                               </span>
                               <span className={cn("px-2.5 py-0.5 rounded-lg text-[8px] font-bold uppercase border tracking-widest", getVersionBadgeStyle(project.version))}>
                                 {project.version}
                               </span>
                            </div>
                            
                            {/* Alert badges & Delete Action */}
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex gap-1.5">
                                {critCount > 0 && (
                                  <span className="bg-red-500 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-xl shadow-md shadow-red-500/20 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
                                    {critCount}
                                  </span>
                                )}
                                {warnCount > 0 && critCount === 0 && (
                                  <span className="bg-amber-100 text-amber-700 text-[10px] font-black uppercase px-2.5 py-1 rounded-xl border border-amber-200 shadow-sm">
                                    {warnCount}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (window.confirm('Voulez-vous vraiment supprimer ce projet ? Cette action est irréversible.')) {
                                    deleteProject(project.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                title="Supprimer le projet"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                         </div>

                         {/* Title */}
                         <h3 className="font-extrabold text-xl leading-tight text-slate-900 tracking-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-indigo-600 transition-all duration-300 mb-2">
                           {project.name}
                         </h3>

                         {/* Installation Date */}
                         <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 mb-6 group-hover:text-slate-500 transition-colors">
                            <Clock className="w-3.5 h-3.5" />
                            Installé le {new Date(project.installationDate).toLocaleDateString('fr-FR')}
                         </div>

                         {/* Bottom Section: Minimalist */}
                         <div className="mt-auto pt-4 border-t border-slate-100/50 space-y-3">
                           {project.contracts?.filter(c => c.status === 'ACTIVE').map(contract => {
                              const activePhase = contract.phases?.find(p => p.status === 'ACTIVE') || contract.phases?.find(p => p.status === 'PENDING') || contract.phases?.[0];
                              return (
                                <div key={contract.id} className="flex flex-col">
                                   <div className="text-sm font-extrabold text-slate-800">
                                     {contract.name}
                                   </div>
                                   <div className="flex items-center gap-2 mt-0.5">
                                     <span className="text-xs font-bold text-slate-500">
                                       {activePhase?.name || 'Non définie'}
                                     </span>
                                     <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                     <span className={cn(
                                       "px-1.5 py-0.5 rounded-md uppercase tracking-wider text-[9px] font-black",
                                       project.status === 'Actif' ? "bg-emerald-50 text-emerald-600" :
                                       project.status === 'Effectué' ? "bg-blue-50 text-blue-600" :
                                       project.status === 'Suspendu' ? "bg-amber-50 text-amber-600" :
                                       "bg-slate-50 text-slate-500"
                                     )}>
                                       {project.status}
                                     </span>
                                   </div>
                                   {/* Petits points des tâches pour la phase active */}
                                   {activePhase?.tasks && activePhase.tasks.length > 0 && (
                                     <div className="flex gap-1 mt-2 w-full max-w-[120px]">
                                       {activePhase.tasks.map((task, i) => (
                                         <div 
                                           key={i} 
                                           title={`${task.name} : ${task.status}`}
                                           className={cn(
                                             "flex-1 h-1 rounded-full transition-all duration-300",
                                             task.status === 'DONE' ? 'bg-emerald-400' : 
                                             task.status === 'IN_PROGRESS' ? 'bg-blue-400 animate-pulse' : 
                                             task.status === 'CANCELED' ? 'bg-red-400' :
                                             'bg-slate-200'
                                           )}
                                         />
                                       ))}
                                     </div>
                                   )}
                                </div>
                              );
                           })}
                           {(!project.contracts || project.contracts.filter(c => c.status === 'ACTIVE').length === 0) && (
                              <div className="text-sm font-bold text-slate-500 italic">
                                Aucun mode actif
                              </div>
                           )}
                         </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
        </div>
      </div>
      {/* Alertes de fusion repensées (Pastel & Discrètes) */}
      {combinableGroups.length > 0 && (
        <div className="space-y-3 mt-8">
          {combinableGroups.map(([monthYear, group]) => (
            <div key={monthYear} className="bg-gradient-to-r from-indigo-50/80 to-purple-50/80 border border-indigo-100/50 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 relative z-10 w-full">
                 <div className="bg-white border border-indigo-100 p-2.5 rounded-xl shadow-sm shrink-0">
                   <FolderKanban className="w-5 h-5 text-indigo-500" />
                 </div>
                 <div className="flex-1">
                   <h3 className="text-base font-extrabold text-indigo-900 tracking-tight">Opportunité de Fusion !</h3>
                   <p className="text-indigo-600/80 text-xs font-bold mt-0.5 leading-relaxed">Vous avez {group.length} encaissements prévus en {new Date(monthYear + '-01').toLocaleDateString('fr-FR', {month: 'long', year: 'numeric'})} ({group.map((g: any) => g.product).join(', ')}). Voulez-vous les regrouper dans un seul dossier de paiement ?</p>
                 </div>
              </div>
              <button 
                onClick={() => setSelectedFusionGroup(group)}
                className="px-6 py-2.5 bg-white text-indigo-700 hover:bg-indigo-600 hover:text-white border border-indigo-200 hover:border-transparent rounded-xl text-xs font-black shadow-sm whitespace-nowrap transition-all hover:scale-105 relative z-10"
              >
                Voir
              </button>
            </div>
          ))}
        </div>
      )}
      {/* Liste des Encaissements Globaux du Client */}
      <div className="mt-8 space-y-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="font-extrabold text-xl text-slate-900 flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 w-8 h-8 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20">
                <Banknote className="w-4 h-4 text-white" />
              </div>
              Tous les Encaissements du Client
            </h3>
            <p className="text-slate-500 text-sm mt-1 ml-11 font-semibold">Vision globale de toutes les acquisitions et maintenances</p>
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

        {allEncaissements.length === 0 ? (
          <div className="text-center py-10 bg-slate-50/50 rounded-3xl border border-slate-100">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-bold">Aucun encaissement programmé.</p>
          </div>
        ) : (
          <div className="space-y-4">
            { (() => {
               const pastEncaissements = allEncaissements.filter(e => {
                  if (e.status !== 'DONE' && e.status !== 'ABANDONED') return false;
                  if (e.isCombined) {
                      const dossierId = e.combinedWithDossierId || (e as any).dossierId;
                      const dossier = dossiersPaiement?.find(d => d.id === dossierId);
                      if (dossier && dossier.status !== 'CLOSED') return false;
                  }
                  return true;
               });
               const activeIndependent = allEncaissements.filter(e => !pastEncaissements.includes(e) && !e.isCombined);
               const activeCombinedEncaissements = allEncaissements.filter(e => !pastEncaissements.includes(e) && e.isCombined);
               
               const clientDossiersMap = new Map();
               activeCombinedEncaissements.forEach(e => {
                  const dossierId = e.combinedWithDossierId || e.dossierId;
                  if (!dossierId) return;
                  if (!clientDossiersMap.has(dossierId)) clientDossiersMap.set(dossierId, []);
                  clientDossiersMap.get(dossierId).push(e);
               });

               const activeItems = [];
               activeIndependent.forEach(e => activeItems.push({ type: 'ENCAISSEMENT', data: e, date: e.targetDate }));
               clientDossiersMap.forEach((encs, dossierId) => {
                  const dossier = dossiersPaiement?.find(d => d.id === dossierId);
                  if (dossier) activeItems.push({ type: 'DOSSIER', data: dossier, encaissements: encs, date: encs[0]?.targetDate });
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

               return activeItems.map((item, idx) => {
                 if (item.type === 'DOSSIER') {
                   const dossier = item.data;
                   const encs = item.encaissements;
                   
                   encs.sort((a, b) => {
                       const modeA = a.mode;
                       const modeB = b.mode;
                       if (modeA === 'Acquisition' && modeB !== 'Acquisition') return -1;
                       if (modeB === 'Acquisition' && modeA !== 'Acquisition') return 1;
                       return 0;
                   });
                   
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
                                if (e.target.checked) setManualFusionSelection([...manualFusionSelection, encs[0]]);
                                else setManualFusionSelection(manualFusionSelection.filter(item => item.combinedWithDossierId !== dossier.id));
                              }}
                            />
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-purple-100 text-purple-700 rounded-xl border border-purple-200 flex items-center gap-1.5 shadow-sm">
                                <FolderKanban className="w-3.5 h-3.5" /> Dossier Fusionné
                              </span>
                              {Array.from(new Set(encs.map(e => e.projectName))).map((pName, idx) => (
                                <span key={idx} className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg border border-slate-200 shadow-sm">
                                  {pName}
                                </span>
                              ))}
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
                          {encs.map((eenc, i) => (
                            <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-100 p-3 rounded-xl">
                              <div>
                                <div className="text-sm font-bold text-slate-800">{eenc.mode} {eenc.year ? `(Année ${eenc.year})` : ''} <span className="text-slate-400 font-medium ml-1">— {eenc.projectName}</span></div>
                                <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-500 mt-0.5">
                                  <span className="uppercase">{eenc.product}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-[10px] text-slate-400 font-medium">Début</div>
                                <div className="text-sm font-bold text-slate-900">{new Date(eenc.targetDate).toLocaleDateString('fr-FR')}</div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-end items-center mt-4 pt-4 border-t border-slate-100">
                          <button 
                            onClick={() => setSelectedDossierFacturationId(dossier.id)}
                            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-90 rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all hover:-translate-y-0.5 flex items-center gap-2 whitespace-nowrap"
                          >
                            <Banknote className="w-4 h-4" /> Gérer l'encaissement
                          </button>
                        </div>
                     </div>
                   );
                 } else {
                   const enc = item.data;
                   const isUpcoming = enc.status === 'UPCOMING';
                   const isDone = enc.status === 'DONE';
                   const isProgress = enc.status === 'IN_PROGRESS' || enc.status === 'PARTIAL';
                   const isPartial = enc.status === 'PARTIAL';

                   return (
                     <div key={enc.id} className={cn(
                       "p-5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all duration-300 shadow-sm",
                       isUpcoming ? "bg-slate-50 border-slate-200/60 opacity-80" :
                       isDone ? "bg-emerald-50 border-emerald-200/60" :
                       "bg-white border-blue-200/60 shadow-md shadow-blue-500/5",
                       manualFusionSelection.some(e => e.id === enc.id) ? "ring-2 ring-indigo-500 border-indigo-500/50 bg-indigo-50/30" : ""
                     )}>
                       <div className="flex items-center gap-4">
                         {!enc.isCombined && enc.status !== 'DONE' && (
                           <div className="pt-1">
                             <input 
                               type="checkbox"
                               checked={manualFusionSelection.some(e => e.id === enc.id)}
                               onChange={(e) => {
                                 if (e.target.checked) {
                                   setManualFusionSelection([...manualFusionSelection, enc]);
                                 } else {
                                   setManualFusionSelection(manualFusionSelection.filter(item => item.id !== enc.id));
                                 }
                               }}
                               className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer"
                             />
                           </div>
                         )}
                         <div className={cn(
                           "w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner",
                           isUpcoming ? "bg-slate-200 text-slate-500" :
                           isDone ? "bg-emerald-100 text-emerald-600" :
                           "bg-blue-100 text-blue-600"
                         )}>
                           <Calendar className="w-5 h-5" />
                         </div>
                         <div>
                           <h4 className={cn(
                             "font-extrabold text-base mb-1",
                             isUpcoming ? "text-slate-600" : isDone ? "text-emerald-900" : "text-blue-950"
                           )}>
                             {enc.mode} {enc.year ? `(Année ${enc.year})` : ''} <span className="text-slate-400 font-medium ml-1">— {enc.projectName}</span>
                           </h4>
                           <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                             <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md uppercase tracking-wider">{enc.product}</span>
                             <span>•</span>
                             <span className={cn(
                               isDone ? "text-emerald-600" : isProgress ? "text-blue-600" : ""
                             )}>
                               Début : {new Date(enc.targetDate).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                             </span>
                           </div>
                         </div>
                       </div>

                       <div className="flex items-center gap-4 w-full md:w-auto">
                         {enc.isCombined && (
                           <span className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-xl text-[10px] font-black uppercase tracking-widest border border-purple-200 flex items-center gap-1.5 shadow-sm">
                             <FolderKanban className="w-3.5 h-3.5" /> Dossier fusionné
                           </span>
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

                         {isProgress && (
                           <Link 
                             to={`/projects/${enc.projectId}`}
                             className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-90 rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all hover:-translate-y-0.5 flex items-center gap-2"
                           >
                             <Banknote className="w-4 h-4" /> Gérer dans le projet
                           </Link>
                         )}
                         {isDone && (
                           <span className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-2">
                             <CheckCircle2 className="w-4 h-4" /> Clôturé
                           </span>
                         )}
                         {isUpcoming && (
                           <span className="px-4 py-2 bg-slate-200 text-slate-500 rounded-xl text-xs font-bold flex items-center gap-2">
                             <Clock className="w-4 h-4" /> En attente
                           </span>
                         )}
                       </div>
                     </div>
                   );
                 }
               });
            })()}
          </div>
        )}
      </div>

      {showNewProject && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={handleAddProject} className="bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 relative w-full max-w-2xl my-auto animate-in fade-in zoom-in-95">
            <button
              type="button"
              onClick={() => setShowNewProject(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="space-y-1 mb-6">
              <h3 className="font-extrabold text-slate-900 text-xl flex items-center gap-3">
                <div className="bg-blue-100 text-blue-600 p-2 rounded-xl">
                  <Briefcase className="w-5 h-5" />
                </div>
                Initialiser un nouveau projet
              </h3>
              <p className="text-slate-500 text-sm font-semibold ml-12">
                Pour le client : <span className="text-slate-700">{client.name}</span>
              </p>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Nom du projet</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Projet Paye DGSN"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white transition-all font-semibold text-slate-800"
                    value={newProjectData.name}
                    onChange={e => setNewProjectData({ ...newProjectData, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Département</label>
                  <select
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white transition-all font-semibold text-slate-800"
                    value={newProjectData.departement}
                    onChange={e => setNewProjectData({ ...newProjectData, departement: e.target.value })}
                  >
                    <option value="D1">D1</option>
                    <option value="D2">D2</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Processus d'intégration</label>
                  <select
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white transition-all font-semibold text-slate-800"
                    value={newProjectData.processType}
                    onChange={e => setNewProjectData({ ...newProjectData, processType: e.target.value as any })}
                  >
                    <option value="STANDARD">Standard (Acquisition ➔ M. Gratuite ➔ Maintenance)</option>
                    <option value="DIRECT_MAINTENANCE">Sans gratuité (Acquisition ➔ Maintenance)</option>
                    <option value="MAINTENANCE_ONLY">Full Maintenance (Maintenance uniquement)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Produit</label>
                  <select
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white transition-all font-semibold text-slate-800"
                    value={newProjectData.product}
                    onChange={e => setNewProjectData({ ...newProjectData, product: e.target.value as ProductType })}
                  >
                    <option value="PAYE">Paye (PAYE)</option>
                    <option value="BUDGET">Budget (BUDGET)</option>
                    <option value="BUDGET_APC">Budget APC (BUDGET_APC)</option>
                    <option value="STOCKS">Stocks (STOCKS)</option>
                    <option value="GRH">GRH</option>
                    <option value="PHARMATIS">Pharmatis</option>
                    <option value="GBS">GBS</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Version</label>
                  <select
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white transition-all font-semibold text-slate-800"
                    value={newProjectData.version}
                    onChange={e => setNewProjectData({ ...newProjectData, version: e.target.value as ProductVersion })}
                  >
                    <option value="ULTRALIGHT">UltraLight</option>
                    <option value="LIGHT">Light</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                    <option value="GLOBAL">Global</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Wilaya</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white transition-all font-semibold text-slate-800"
                    value={newProjectData.wilaya}
                    onChange={e => setNewProjectData({ ...newProjectData, wilaya: e.target.value })}
                  >
                    <option value="">Sélectionner une wilaya</option>
                    {ALGERIAN_WILAYAS.map(w => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Ville / Commune</label>
                  <input
                    type="text"
                    placeholder="ex: Alger Centre"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white transition-all font-semibold text-slate-800"
                    value={newProjectData.ville}
                    onChange={e => setNewProjectData({ ...newProjectData, ville: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Entité responsable</label>
                  <select
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white transition-all font-semibold text-slate-800"
                    value={newProjectData.entity}
                    onChange={e => setNewProjectData({ ...newProjectData, entity: e.target.value as any })}
                  >
                    <option value="Naltis">Naltis</option>
                    <option value="Netsprint">Netsprint</option>
                    <option value="MP">MP</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Etat</label>
                  <select
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white transition-all font-semibold text-slate-800"
                    value={newProjectData.status}
                    onChange={e => setNewProjectData({ ...newProjectData, status: e.target.value as any })}
                  >
                    <option value="Actif">Actif</option>
                    <option value="Effectué">Effectué</option>
                    <option value="Suspendu">Suspendu</option>
                    <option value="Abandonné">Abandonné</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Collaborateurs techniques</label>
                  <div className="flex flex-wrap gap-3">
                    {TECH_COLLABS.map(collab => (
                      <label key={collab} className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl shadow-sm hover:border-blue-400 transition-colors">
                        <input 
                          type="checkbox"
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 w-4 h-4 cursor-pointer"
                          checked={newProjectData.technique.includes(collab)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewProjectData({...newProjectData, technique: [...newProjectData.technique, collab]});
                            } else {
                              setNewProjectData({...newProjectData, technique: newProjectData.technique.filter(c => c !== collab)});
                            }
                          }}
                        />
                        <span className="text-sm font-semibold text-slate-700">{collab}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Date de création</label>
                  <input
                    type="date"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white transition-all font-semibold text-slate-800"
                    value={newProjectData.createdAt}
                    onChange={e => setNewProjectData({ ...newProjectData, createdAt: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowNewProject(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-bold transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition-colors shadow-lg"
              >
                Créer le projet
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de prévisualisation de fusion */}
      {selectedFusionGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-3">
                <FolderKanban className="w-6 h-6 text-indigo-600" />
                Détails des Encaissements
              </h3>
              <button onClick={() => setSelectedFusionGroup(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <p className="text-sm font-medium text-slate-500 mb-2">Ces encaissements sont prévus pour la même période. Vérifiez les informations avant de créer un dossier d'encaissement global.</p>
              {selectedFusionGroup.map((enc, idx) => (
                <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-indigo-300 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-slate-900 text-lg">
                        {enc.projectName}
                      </h4>
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mt-1">
                        <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-700 uppercase tracking-wider">{enc.product}</span>
                        <span>•</span>
                        <span>{enc.mode} {enc.year ? `(Année ${enc.year})` : ''}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap">
                        Début : {new Date(enc.targetDate).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const newGroup = selectedFusionGroup.filter((_, i) => i !== idx);
                          if (newGroup.length === 0) setSelectedFusionGroup(null);
                          else setSelectedFusionGroup(newGroup);
                        }}
                        className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                        title="Retirer cet encaissement de la fusion"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm mt-4 border-t border-slate-100 pt-4">
                    <div className="text-slate-500 font-medium">Statut de la proforma:</div>
                    <div className="font-bold text-slate-700">
                       {enc.proforma?.status === 'DONE' ? 'Générée' : 'En attente'}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setSelectedFusionGroup(null)}
                className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button 
                disabled={isCreatingDossier}
                onClick={() => {
                  handleCreateDossier(selectedFusionGroup);
                }}
                className={`px-6 py-3 rounded-xl font-bold transition-colors shadow-md flex items-center gap-2 ${isCreatingDossier ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700'}`}
              >
                <FolderKanban className="w-5 h-5" />
                {isCreatingDossier ? 'Création en cours...' : "Créer le dossier d'encaissement"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedDossierFacturationId && (
        <FacturationDossierModal 
          dossierId={selectedDossierFacturationId}
          client={client}
          encaissements={(() => {
             return allEncaissements.filter(e => e.isCombined && (e.combinedWithDossierId === selectedDossierFacturationId || (e as any).dossierId === selectedDossierFacturationId)).sort((a, b) => {
                 const modeA = a.mode;
                 const modeB = b.mode;
                 if (modeA === 'Acquisition' && modeB !== 'Acquisition') return -1;
                 if (modeB === 'Acquisition' && modeA !== 'Acquisition') return 1;
                 return 0;
             });
          })()}
          onClose={() => setSelectedDossierFacturationId(null)}
        />
      )}
    </div>
  );
}
