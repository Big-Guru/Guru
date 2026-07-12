import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../store';
import { Building2, MapPin, Users2, FileText, ArrowLeft, Plus, X, Award, Receipt, Clock, FolderKanban, Banknote, Calendar, CheckCircle2, Briefcase, Trash2, Edit } from 'lucide-react';
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
  const { clients, projects, products, addProject, deleteProject, dossiersPaiement, updateDossierPaiement, addDossierPaiement, updateEncaissement, deleteDossierPaiement, dissociateDossier } = useStore();
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
    product: products.length > 0 ? products[0].name : 'PAYE',
    version: (products.length > 0 && products[0].versions?.length) ? products[0].versions[0] : 'STANDARD',
    processType: (products.length > 0 ? products[0].processType : 'STANDARD') as ProcessType,
    wilaya: '',
    ville: '',
    entity: 'Naltis',
    mode: 'Acquisition',
    phase: 'Démarchage',
    status: 'Actif',
    technique: [] as string[],
    maintenancePeriodicity: 'Annuelle',
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
      installationDate: newProjectData.createdAt,
      maintenancePeriodicity: newProjectData.maintenancePeriodicity as any
    });
    setShowNewProject(false);
    setNewProjectData({ 
      name: '', departement: 'D1', product: products.length > 0 ? products[0].name : 'PAYE', version: products.length > 0 && products[0].versions?.length ? products[0].versions[0] : 'Standard', processType: products.length > 0 ? products[0].processType || 'STANDARD' : 'STANDARD', wilaya: '', ville: '', 
      entity: products.length > 0 ? products[0].defaultEntity : 'Naltis', mode: 'Acquisition', phase: 'Démarchage', status: 'Actif', technique: [], maintenancePeriodicity: products.length > 0 ? products[0].maintenancePeriodicity : 'Annuelle',
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link to="/clients" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Retour au portefeuille clients
        </Link>
        
        <Link 
          to={`/clients/${client.id}/edit`} 
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-all duration-200 shrink-0"
        >
          <Edit className="w-4 h-4" />
          Modifier les infos
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
               <Users2 className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>{client.effectif} {client.effectifType === 'PRIVE' ? 'Privé' : client.effectifType === 'PUBLIC' ? 'Public' : client.effectifType === 'UNIVERSITE' ? 'Université' : 'EH/DA'}</span>
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
          <div className="flex items-center gap-3">
            {manualFusionSelection.length >= 2 && (
              <button
                disabled={isCreatingDossier}
                onClick={() => handleCreateDossier(manualFusionSelection)}
                className={`inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all duration-200 ${isCreatingDossier ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:opacity-95'}`}
              >
                <FolderKanban className="w-3.5 h-3.5" />
                {isCreatingDossier ? 'Création...' : `Fusionner (${manualFusionSelection.length})`}
              </button>
            )}
            {!showNewProject && (
              <button 
                onClick={() => {
                  if (products && products.length > 0) {
                    const firstProd = products[0];
                    setNewProjectData({
                      name: '',
                      departement: firstProd.departement,
                      product: firstProd.name as any,
                      version: (firstProd.versions && firstProd.versions.length > 0) ? firstProd.versions[0] : 'Standard',
                      processType: firstProd.processType || 'STANDARD',
                      wilaya: '',
                      ville: '',
                      entity: firstProd.defaultEntity,
                      mode: 'Acquisition',
                      phase: 'Démarchage',
                      status: 'Actif',
                      technique: [],
                      maintenancePeriodicity: firstProd.maintenancePeriodicity as any,
                      createdAt: new Date().toISOString().split('T')[0]
                    });
                  } else {
                    setNewProjectData({ 
                      name: '', departement: 'D1', product: 'PAYE' as any, version: 'Standard', processType: 'STANDARD', wilaya: '', ville: '', 
                      entity: 'Naltis', mode: 'Acquisition', phase: 'Démarchage', status: 'Actif', technique: [], maintenancePeriodicity: 'Annuelle',
                      createdAt: new Date().toISOString().split('T')[0]
                    });
                  }
                  setShowNewProject(true);
                }}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-xl shadow-sm hover:opacity-95 transition-all duration-200"
              >
                <Plus className="w-3.5 h-3.5" /> Nouveau Projet
              </button>
            )}
          </div>
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
              <div className="flex flex-col gap-8">
                {clientProjects.map((project, index) => {
                  const contractsList = project.contracts || [];
                  const activeList = contractsList.filter(c => c.status === 'ACTIVE');
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
                                      setManualFusionSelection([...manualFusionSelection, { ...card, projectId: project.id }]);
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
                                  setSelectedDossierFacturationId(card.id);
                                }} className="p-2 bg-white/20 text-white hover:bg-white/30 rounded-xl backdrop-blur-sm" title="Gérer le dossier">
                                  <Banknote className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    const isDone = card.status === 'DONE' || card.status === 'ABANDONED';
                    const isPending = card.status === 'PENDING';
                    
                    const allEncaissementsForContract = (project.encaissements || []).filter(e => e.contractId === card.id);
                    const activeEncaissements = allEncaissementsForContract.filter(e => e.status !== 'DONE');
                    const hasActiveEncaissements = activeEncaissements.length > 0 && !isPending;
                    const hasAnyEncaissement = allEncaissementsForContract.length > 0 && !isPending;

                    const activePhaseIndex = card.phases ? card.phases.findIndex((p: any) => p.status !== 'DONE') : -1;
                    const actualPhaseIndex = activePhaseIndex === -1 && card.phases && card.phases.length > 0 ? card.phases.length - 1 : Math.max(0, activePhaseIndex);
                    const activePhase = card.phases?.[actualPhaseIndex];
                    const currentPhaseCount = card.phases && card.phases.length > 0 ? actualPhaseIndex + 1 : 0;
                    const totalPhasesCount = card.phases?.length || 0;

                    let colorClasses = "";
                    if (card.mode === 'Acquisition') {
                      colorClasses = "bg-blue-50 backdrop-blur-xl border-blue-200/60 shadow-blue-500/10";
                    } else if (card.mode === 'Maintenance offerte') {
                      colorClasses = "bg-red-50 backdrop-blur-xl border-red-200/60 shadow-red-500/10";
                    } else if (card.mode === 'Annexe') {
                      colorClasses = "bg-amber-50 backdrop-blur-xl border-amber-200/60 shadow-amber-500/10";
                    } else {
                      colorClasses = "bg-emerald-50 backdrop-blur-xl border-emerald-200/60 shadow-emerald-500/10";
                    }

                    return (
                      <div
                        key={card.id}
                        className={cn(
                          "shrink-0 flex flex-col justify-between p-6 rounded-[28px] w-[280px] h-[190px] text-left transition-all duration-500 border overflow-hidden relative group",
                          "bg-violet-50 backdrop-blur-xl border-violet-200/60 shadow-violet-500/10",
                          extraClasses,
                          hasAnyEncaissement ? "pr-11" : ""
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
                          <div className="absolute top-4 right-0 w-9 flex justify-center z-30">
                            {activeEncaissements.some((e: any) => e.isCombined || e.combinedWithDossierId) ? (
                              <div className="w-4 h-4 rounded-full bg-violet-500 border-2 border-white shadow-sm" title="Inclus dans un dossier d'encaissement" />
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const isChecked = manualFusionSelection.some((item: any) => item.id === card.id);
                                  if (!isChecked) {
                                    setManualFusionSelection([...manualFusionSelection, { ...card, projectId: project.id }]);
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
                        
                        <div className={cn("absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl z-0 pointer-events-none", card.mode === 'Acquisition' ? 'bg-blue-100' : card.mode === 'Maintenance offerte' ? 'bg-red-100' : 'bg-green-100')}></div>
                        <div className={cn("absolute -left-10 -bottom-10 w-32 h-32 rounded-full blur-3xl z-0 pointer-events-none", card.mode === 'Acquisition' ? 'bg-indigo-100' : card.mode === 'Maintenance offerte' ? 'bg-orange-100' : 'bg-emerald-100')}></div>

                        <div className="relative z-10 flex flex-col h-full pt-1 w-full">
                          <div className="flex items-start justify-between w-full">
                            <div className="flex items-start gap-2">
                              {isDone && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />}
                              <h4 className={cn(
                                "font-extrabold text-[22px] tracking-tight leading-none mb-1.5 transition-colors pr-8",
                                card.mode === 'Acquisition' ? "text-blue-900" : card.mode === 'Maintenance offerte' ? "text-red-900" : "text-green-900"
                              )}>
                                {card.name}
                              </h4>
                            </div>
                          </div>
                          {activePhase && (
                            <span className="text-xs font-bold block mb-4 transition-colors text-slate-600">
                              <span className="text-slate-900">{activePhase.name}</span>
                            </span>
                          )}
                          <div className="flex justify-between items-end mt-auto w-full">
                            <div className="flex flex-col gap-2.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider transition-colors text-slate-500">
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
                                  return displayDate ? `Début: ${new Date(displayDate).toLocaleDateString('fr-FR')}` : 'Non défini';
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
                            <div className="text-sm font-extrabold transition-colors flex flex-col items-end gap-1 text-slate-800">
                              <span>{currentPhaseCount}/{totalPhasesCount} <span className="text-[10px] uppercase font-bold opacity-70">Phases</span></span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  };

                  return (
                    <div key={project.id} className="flex bg-white rounded-[28px] border border-slate-200/80 shadow-md shadow-slate-200/30 overflow-hidden">
                      {/* Vertical Project Header */}
                      <Link 
                        to={`/projects/${project.id}`} 
                        state={{ fromClientId: id }}
                        className="w-14 shrink-0 bg-gradient-to-b from-blue-600 to-indigo-600 flex flex-col justify-center items-center py-6 cursor-pointer hover:brightness-110 transition-all border-r border-indigo-700/50 group"
                      >
                         <div className="text-white font-black tracking-[0.2em] text-sm uppercase whitespace-nowrap group-hover:-translate-y-1 transition-transform" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                            {project.product || project.name}
                         </div>
                      </Link>
                      
                      {/* Scrollable Cards Container */}
                      <div className="flex-1 overflow-x-auto flex flex-row items-center gap-5 p-6 bg-slate-50/50 hide-scrollbar">
                        {allActiveGroups.length === 0 && (
                          <div className="text-slate-400 text-sm font-semibold italic flex items-center h-full">
                            Aucun contrat actif pour ce projet
                          </div>
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
                   <p className="text-indigo-600/80 text-xs font-bold mt-0.5 leading-relaxed">Vous avez {group.length} encaissements prévus en {new Date(monthYear + '-01').toLocaleDateString('fr-FR', {month: 'long', year: 'numeric'})} ({Array.from(new Set(group.map((g: any) => `${g.product} - ${g.mode}`))).join(', ')}). Voulez-vous les regrouper dans un seul dossier de paiement ?</p>
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
      {/* DOSSIERS FUSIONNÉS */}
      {(() => {
        const mergedDossiers = dossiersPaiement.filter(d => 
          d.clientId === client.id && 
          d.encaissementIds.length > 1
        );
        
        if (mergedDossiers.length === 0) return null;

        return (
          <div className="mt-8 px-2 pb-8 border-t border-slate-100 pt-8 shrink-0">
            <h3 className="font-extrabold text-slate-900 text-xl mb-6 flex items-center gap-3">
              <div className="bg-violet-100 p-2 rounded-xl text-violet-600">
                <Banknote className="w-5 h-5" />
              </div>
              Dossiers d'encaissement fusionnés
            </h3>
            <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar snap-x">
              {mergedDossiers.map(dossier => {
                const encs = allEncaissements.filter(e => dossier.encaissementIds.includes(e.id));
                const encsSum = encs.reduce((sum, e) => sum + (e.montantTotal || 0), 0);
                const totalMontant = dossier.total > 0 ? dossier.total : encsSum;

                const isSelected = manualFusionSelection.some(e => e.isCombined && e.combinedWithDossierId === dossier.id);
                
                return (
                  <div key={dossier.id} className={cn(
                    "shrink-0 flex flex-col justify-between p-6 rounded-[28px] w-[350px] min-h-[190px] text-left transition-all duration-500 border overflow-hidden relative group",
                    isSelected ? "shadow-xl ring-2 ring-offset-2 ring-slate-100 scale-[1.02] bg-violet-50 backdrop-blur-xl border-violet-200/60" : "bg-violet-50 backdrop-blur-xl border-violet-200/60 shadow-violet-500/10 hover:shadow-md hover:-translate-y-1 hover:scale-[1.02]"
                  )}>
                    <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl z-0 pointer-events-none bg-blue-100"></div>
                    <div className="absolute -left-10 -bottom-10 w-32 h-32 rounded-full blur-3xl z-0 pointer-events-none bg-indigo-100"></div>
                    <div className="relative z-10 flex flex-col h-full w-full">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-start gap-3">
                          {dossier.status !== 'CLOSED' && dossier.status !== 'DONE' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isSelected) setManualFusionSelection(manualFusionSelection.filter(item => item.combinedWithDossierId !== dossier.id));
                                else setManualFusionSelection([...manualFusionSelection, encs[0]]);
                              }}
                              className={cn(
                                "mt-1 w-4 h-4 rounded-full border-2 transition-all hover:scale-110 shadow-sm flex items-center justify-center shrink-0",
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
                          <div>
                            <h4 className="font-extrabold text-[22px] tracking-tight leading-none mb-1.5 transition-colors text-violet-900">Dossier Fusionné</h4>
                            <p className="text-[10px] uppercase font-bold text-slate-500 mt-1">Créé le {new Date(dossier.createdAt).toLocaleDateString('fr-FR')}</p>
                          </div>
                        </div>
                        <span className={cn(
                          "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shrink-0 shadow-sm",
                          dossier.status === 'DONE' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                        )}>
                          {dossier.status === 'DONE' ? 'Payé' : 'En cours'}
                        </span>
                      </div>
                      
                      <div className="space-y-2 mb-5">
                        {encs.map(e => {
                          return (
                            <div key={e.id} className="flex items-center gap-2 text-[11px] font-bold text-slate-700 bg-white/60 p-2.5 rounded-xl border border-white/40 shadow-sm">
                              <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                              <span className="truncate" title={`${e.product} - ${e.mode} ${e.year ? `(Année ${e.year})` : e.title ? `(${e.title})` : ''} - ${e.encaissementType === 'AVANCE' ? 'Avance' : 'Solde'}`}>
                                {e.product} - {e.mode} {e.year ? `(Année ${e.year})` : e.title ? `(${e.title})` : ''} - {e.encaissementType === 'AVANCE' ? 'Avance' : 'Solde'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="flex justify-between items-end mt-auto pt-4 border-t border-violet-200/50 w-full">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] uppercase font-bold text-slate-500">Montant total</span>
                          <span className="text-sm font-extrabold text-violet-900">
                            {totalMontant > 0 ? `${totalMontant.toLocaleString()} DA` : '-'}
                          </span>
                        </div>
                        <button
                          onClick={() => setSelectedDossierFacturationId(dossier.id)}
                          className="px-4 py-2 bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white rounded-xl text-xs font-bold shadow-md transition-transform hover:-translate-y-0.5"
                        >
                          Gérer le dossier
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

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
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none cursor-not-allowed font-semibold text-slate-500"
                    value={newProjectData.departement}
                  >
                    <option value="D1">D1</option>
                    <option value="D2">D2</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Produit</label>
                  <select
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white transition-all font-semibold text-slate-800"
                    value={newProjectData.product}
                    onChange={e => {
                      const prodName = e.target.value;
                      const prodConfig = products.find(p => p.name === prodName);
                      if (prodConfig) {
                        setNewProjectData({
                          ...newProjectData,
                          product: prodName as any,
                          departement: prodConfig.departement,
                          entity: prodConfig.defaultEntity,
                          maintenancePeriodicity: prodConfig.maintenancePeriodicity,
                          version: (prodConfig.versions && prodConfig.versions.length > 0) ? prodConfig.versions[0] : 'Standard'
                        });
                      } else {
                        setNewProjectData({ ...newProjectData, product: prodName as any, version: 'Standard' });
                      }
                    }}
                  >
                    {products.length === 0 && <option value="PAYE">Aucun produit dynamique trouvé (par défaut PAYE)</option>}
                    {products.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
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
                    {(() => {
                      const selectedProd = products.find(p => p.name === newProjectData.product);
                      const displayVersions = (selectedProd?.versions && selectedProd.versions.length > 0) ? selectedProd.versions : ['Standard'];
                      return displayVersions.map(v => (
                        <option key={v} value={v}>{v}</option>
                      ));
                    })()}
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
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none cursor-not-allowed font-semibold text-slate-500"
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

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Processus d'intégration (Maintenance)</label>
                  <select
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none cursor-not-allowed font-semibold text-slate-500"
                    value={newProjectData.maintenancePeriodicity || 'Annuelle'}
                    onChange={e => setNewProjectData({ ...newProjectData, maintenancePeriodicity: e.target.value as any })}
                  >
                    <option value="Annuelle">Annuelle</option>
                    <option value="Semestrielle">Semestrielle</option>
                    <option value="Trimestrielle">Trimestrielle</option>
                    <option value="Mensuelle">Mensuelle</option>
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
