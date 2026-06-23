import React, { useState } from 'react';
import { useStore } from '../store';
import { calculateAlerts } from '../lib/alerts';
import { Link } from 'react-router-dom';
import { Map, Navigation, Loader2, Calendar, CheckSquare, Plus, X, Trash2, Edit, Check, ArrowRight } from 'lucide-react';
import { generateItineraries } from '../services/aiService';
import { ClientToVisit, ItineraryDay } from '../types';
import { cn } from '../lib/utils';
import { Mission } from '../types';

export default function MissionsList() {
  const { clients, projects, missions, addMission, updateMission, deleteMission } = useStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showNewMission, setShowNewMission] = useState(false);
  const [editingMissionId, setEditingMissionId] = useState<string | null>(null);
  const [newMissionDate, setNewMissionDate] = useState(new Date().toISOString().split('T')[0]);
  const [newMissionTitle, setNewMissionTitle] = useState('');
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{type: 'success'|'error', msg: string} | null>(null);

  const alertsByProject = projects.map(p => ({
    project: p,
    client: clients.find(c => c.id === p.clientId),
    alerts: calculateAlerts(p)
  })).filter(item => item.alerts.length > 0);

  const allProjectsList = projects.map(p => ({
    project: p,
    client: clients.find(c => c.id === p.clientId)
  }));

  const handleEditMission = (mission: Mission) => {
    setNewMissionTitle(mission.title);
    setNewMissionDate(mission.date);
    setSelectedProjects(mission.projectIds);
    setEditingMissionId(mission.id);
    setShowNewMission(true);
    setFeedback(null);
  };

  const handleDeleteMission = async (id: string) => {
    if (window.confirm("Voulez-vous vraiment supprimer cette mission ?")) {
      await deleteMission(id);
      setFeedback({ type: 'success', msg: "Mission supprimée avec succès." });
    }
  };

  const handleGenerateItineraries = async () => {
    if (isGenerating) return;
    
    if (alertsByProject.length === 0) {
      setFeedback({ type: 'error', msg: "Il n'y a pas de documents manquants à récupérer. Toutes les alertes sont à jour !" });
      return;
    }

    try {
      setIsGenerating(true);
      setFeedback(null);
      const clientsToVisit: ClientToVisit[] = alertsByProject.map(({ project, client, alerts }) => ({
        clientId: client?.id || '',
        projectId: project.id,
        name: client?.name || 'Inconnu',
        wilaya: client?.wilaya || 'Inconnue',
        missingDocuments: alerts.map(a => a.message),
      })).filter(c => c.clientId);

      const itineraries = await generateItineraries(clientsToVisit);
      
      // Auto-create missions
      itineraries.forEach((it, idx) => {
         const date = new Date();
         date.setDate(date.getDate() + 1 + idx); // Start tomorrow
         
         const projectIds = it.clients.map(c => c.projectId);
         
         addMission({
           title: `Mission IA - Jour ${it.jour} (${it.wilayas.join(', ')})`,
           date: date.toISOString().split('T')[0],
           status: 'PLANNED',
           projectIds,
           itineraries: [it]
         });
      });
      
      setFeedback({ type: 'success', msg: "Missions suggérées créées avec succès !" });
    } catch (error) {
       console.error(error);
       setFeedback({ type: 'error', msg: "Une erreur est survenue lors de la génération des itinéraires." });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleManualCreate = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!newMissionTitle || selectedProjects.length === 0) return;
     
     try {
       if (editingMissionId) {
         await updateMission(editingMissionId, {
           title: newMissionTitle,
           date: newMissionDate,
           projectIds: selectedProjects,
         });
         setFeedback({ type: 'success', msg: "Mission modifiée avec succès." });
       } else {
         await addMission({
           title: newMissionTitle,
           date: newMissionDate,
           status: 'PLANNED',
           projectIds: selectedProjects,
           itineraries: []
         });
         setFeedback({ type: 'success', msg: "Mission créée avec succès." });
       }
       closeForm();
     } catch (error: any) {
       setFeedback({ type: 'error', msg: "Erreur lors de l'enregistrement." });
       console.error("Create/Update mission failed:", error);
     }
  };

  const closeForm = () => {
    setShowNewMission(false);
    setNewMissionTitle('');
    setSelectedProjects([]);
    setEditingMissionId(null);
  };

  const toggleProjectSelection = (projectId: string) => {
    if (selectedProjects.includes(projectId)) {
      setSelectedProjects(selectedProjects.filter(id => id !== projectId));
    } else {
      setSelectedProjects([...selectedProjects, projectId]);
    }
  };

  const getStatusBadgeStyle = (status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED') => {
    switch (status) {
      case 'COMPLETED': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'IN_PROGRESS': return 'bg-blue-50 text-blue-700 border-blue-100 animate-pulse';
      case 'PLANNED': return 'bg-amber-50 text-amber-700 border-amber-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and top options */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Missions de Déplacement</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Organisez vos déplacements pour collecter les documents manquants auprès des clients.</p>
        </div>
        
        <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
          <button
            onClick={() => { setShowNewMission(true); setFeedback(null); }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-slate-350 text-slate-700 text-sm font-semibold rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Créer Manuellement
          </button>
          
          <button
            onClick={handleGenerateItineraries}
            disabled={isGenerating}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white text-sm font-bold rounded-xl shadow-md shadow-indigo-500/10 hover:opacity-95 hover:shadow-indigo-500/20 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed border-none shrink-0"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Map className="w-4 h-4 shrink-0" />}
            Optimiser Mission (IA)
          </button>
        </div>
      </div>

      {/* Action alerts */}
      {feedback && (
        <div className={cn("p-4 rounded-2xl border text-xs font-semibold flex justify-between items-center", 
          feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'
        )}>
          <span>{feedback.msg}</span>
          <button onClick={() => setFeedback(null)} className="opacity-60 hover:opacity-100 p-1"><X className="w-4 h-4"/></button>
        </div>
      )}

      {/* Dialog creation overlay modal */}
      {showNewMission && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity duration-300">
          <form onSubmit={handleManualCreate} className="bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 relative w-full max-w-xl max-h-[90vh] overflow-y-auto">
             <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-5">
               <h3 className="font-bold text-slate-950 text-base">{editingMissionId ? 'Modifier la Mission' : 'Nouvelle Mission'}</h3>
               <button type="button" onClick={closeForm} className="text-slate-400 hover:text-slate-650 p-1 hover:bg-slate-50 rounded-lg"><X className="w-5 h-5"/></button>
             </div>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
               <div>
                 <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1.5">Titre de la mission</label>
                 <input 
                   type="text" 
                   required
                   value={newMissionTitle}
                   onChange={e => setNewMissionTitle(e.target.value)}
                   className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white text-sm font-semibold text-slate-800"
                   placeholder="ex: Tournée Est - Sétif et Constantine"
                 />
               </div>
               <div>
                 <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1.5">Date Prévue</label>
                 <input 
                   type="date" 
                   required
                   value={newMissionDate}
                   onChange={e => setNewMissionDate(e.target.value)}
                   className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white text-sm font-semibold text-slate-800"
                 />
               </div>
             </div>

             <div className="space-y-2 mb-6">
               <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400">Sélectionner les Projets Visés</label>
               <div className="max-h-48 overflow-y-auto border border-slate-200/80 rounded-2xl divide-y divide-slate-100 bg-slate-50/50">
                  {allProjectsList.map(({project, client}) => (
                    <label key={project.id} className="flex items-center gap-3.5 p-3 hover:bg-white cursor-pointer transition-colors group">
                      <input 
                        type="checkbox" 
                        className="w-4.5 h-4.5 text-blue-600 rounded-lg border-slate-350 focus:ring-blue-500 cursor-pointer"
                        checked={selectedProjects.includes(project.id)}
                        onChange={() => toggleProjectSelection(project.id)}
                      />
                      <div className="flex-1 min-w-0">
                         <span className="font-bold text-slate-900 text-sm block truncate group-hover:text-blue-600 transition-colors">{client?.name}</span>
                         <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5 block">{project.name} - Wilaya {client?.wilaya}</span>
                      </div>
                    </label>
                  ))}
                  {allProjectsList.length === 0 && (
                    <div className="p-6 text-center text-slate-400 text-sm">Aucun projet enregistré.</div>
                  )}
               </div>
             </div>

             <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
               <button 
                 type="button" 
                 onClick={closeForm} 
                 className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-semibold transition-colors"
               >
                 Annuler
               </button>
               <button 
                 type="submit" 
                 disabled={selectedProjects.length === 0 || !newMissionTitle} 
                 className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 Enregistrer la mission
               </button>
             </div>
          </form>
        </div>
      )}

      {/* Grid listing missions */}
      <div className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
           {missions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(mission => (
              <div key={mission.id} className="bg-white border border-slate-200/70 rounded-2xl shadow-[0_2px_12px_-3px_rgba(0,0,0,0.03)] hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col justify-between group">
                 <div className="p-6 space-y-4 flex-1">
                   {/* Top action block */}
                   <div className="flex justify-between items-start gap-4">
                     <h3 className="font-bold text-base text-slate-950 leading-tight tracking-tight group-hover:text-blue-600 transition-colors">{mission.title}</h3>
                     <div className="flex items-center gap-1.5 shrink-0">
                       <select 
                         className={cn("text-[9px] font-extrabold uppercase tracking-wider rounded-lg px-2.5 py-1 border outline-none cursor-pointer select-none appearance-none text-center", getStatusBadgeStyle(mission.status))}
                         value={mission.status}
                         onChange={(e) => updateMission(mission.id, { status: e.target.value as any })}
                       >
                         <option value="PLANNED">Planifiée</option>
                         <option value="IN_PROGRESS">En Cours</option>
                         <option value="COMPLETED">Terminée</option>
                       </select>

                       <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                           onClick={() => handleEditMission(mission)}
                           className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                           title="Modifier"
                         >
                           <Edit className="w-4 h-4" />
                         </button>
                         <button 
                           onClick={() => handleDeleteMission(mission.id)}
                           className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                           title="Supprimer"
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                       </div>
                     </div>
                   </div>
                   
                   {/* Mission Date */}
                   <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
                     <Calendar className="w-4 h-4 text-slate-400" />
                     <span>{new Date(mission.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                   </div>

                   {/* AI Routing block (if generated) */}
                   {mission.itineraries.length > 0 && (
                     <div className="bg-indigo-50/50 border border-indigo-100/60 p-4 rounded-xl space-y-2">
                       <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-indigo-700 tracking-wider">
                         <Navigation className="w-3.5 h-3.5"/> 
                         <span>Itinéraire Optimisé</span>
                       </div>
                       <div className="text-xs text-slate-650 space-y-1 font-semibold">
                         <p>Temps estimé: <span className="text-indigo-700 font-bold">{mission.itineraries[0].tempsEstime}</span></p>
                         <div className="flex items-center gap-1 flex-wrap pt-1 text-[11px] text-slate-600 font-bold">
                           {mission.itineraries[0].wilayas.map((w, i) => (
                             <React.Fragment key={i}>
                               {i > 0 && <ArrowRight className="w-3 h-3 text-slate-400" />}
                               <span className="bg-white px-2 py-0.5 border border-slate-200/50 rounded shadow-sm">{w}</span>
                             </React.Fragment>
                           ))}
                         </div>
                       </div>
                     </div>
                   )}

                   {/* Projects checklist summary */}
                   <div className="space-y-2.5 pt-3 border-t border-slate-100">
                     <h4 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider">Clients cibles ({mission.projectIds.length})</h4>
                     <div className="space-y-2">
                       {mission.projectIds.slice(0, 3).map(pid => {
                         const p = projects.find(x => x.id === pid);
                         const c = clients.find(x => x.id === p?.clientId);
                         return (
                           <div key={pid} className="flex gap-2 text-xs text-slate-600 items-start">
                             <div className="w-1.5 h-1.5 rounded-full bg-slate-350 mt-1.5 shrink-0"/>
                             <div className="truncate">
                               <span className="font-bold text-slate-900">{c?.name}</span>
                               <span className="text-slate-400 font-medium ml-1">({c?.wilaya})</span>
                             </div>
                           </div>
                         )
                       })}
                       {mission.projectIds.length > 3 && (
                         <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide italic pl-3.5">+ {mission.projectIds.length - 3} autres projets</p>
                       )}
                     </div>
                   </div>
                 </div>
              </div>
           ))}
           {missions.length === 0 && (
             <div className="col-span-full py-16 text-center text-slate-500 max-w-sm mx-auto">
               <div className="w-12 h-12 bg-slate-50 border border-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                 <Map className="w-6 h-6" />
               </div>
               <h3 className="text-sm font-bold text-slate-900">Aucun déplacement planifié</h3>
               <p className="text-xs text-slate-500 mt-1">
                 Générez vos tournées de recouvrement automatiquement en exploitant notre outil d'optimisation par IA.
               </p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
