import React, { useState } from 'react';
import { useStore } from '../store';
import { calculateAlerts } from '../lib/alerts';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { AlertCircle, AlertTriangle, ChevronDown, ChevronUp, EyeOff } from 'lucide-react';
import { Alert, Project } from '../types';
import SearchInput from './SearchInput';

export default function AlertsList() {
  const { clients, projects, updateProject, updateMaintenance } = useStore();
  const [expandedProjects, setExpandedProjects] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  
  const filteredAlertsByProject = projects.map(p => ({
    project: p,
    client: clients.find(c => c.id === p.clientId),
    alerts: calculateAlerts(p)
  })).filter(item => {
    if (item.alerts.length === 0) return false;
    const searchLower = search.toLowerCase();
    return (
      item.project.name.toLowerCase().includes(searchLower) ||
      (item.client?.name || '').toLowerCase().includes(searchLower)
    );
  });

  const toggleExpand = (e: React.MouseEvent, projectId: string) => {
    e.preventDefault();
    setExpandedProjects(prev => prev.includes(projectId) ? prev.filter(id => id !== projectId) : [...prev, projectId]);
  };

  const handleIgnoreAlert = (e: React.MouseEvent, alert: Alert, project: Project) => {
    e.preventDefault();
    e.stopPropagation();
    if (!alert.documentType) return;
    
    const updatePayload: Partial<Project> = {};
    
    switch (alert.documentType) {
      case 'PROFORMA_ACQ': updatePayload.acqProforma = { ...project.acqProforma, status: 'IGNORED' }; break;
      case 'BC_ACQ': updatePayload.acqBcOds = { ...project.acqBcOds, status: 'IGNORED' }; break;
      case 'CONV_ACQ': updatePayload.acqConvention = { ...project.acqConvention, status: 'IGNORED' }; break;
      case 'FACT_ACQ': updatePayload.acqFacture = { ...project.acqFacture, status: 'IGNORED' }; break;
      case 'SF_ACQ': updatePayload.acqServiceFait = { ...project.acqServiceFait, status: 'IGNORED' }; break;
    }
    
    if (Object.keys(updatePayload).length > 0) {
      updateProject(project.id, updatePayload);
      return;
    }

    if (alert.maintenanceId) {
      const maintenance = project.maintenances.find(m => m.id === alert.maintenanceId);
      if (!maintenance) return;
      
      const maintenanceUpdates: any = {};
      switch (alert.documentType) {
        case 'PROFORMA_MAIN': maintenanceUpdates.proforma = { ...maintenance.proforma, status: 'IGNORED' }; break;
        case 'BC_MAIN': maintenanceUpdates.bcOds = { ...maintenance.bcOds, status: 'IGNORED' }; break;
        case 'FACT_MAIN': maintenanceUpdates.facture = { ...maintenance.facture, status: 'IGNORED' }; break;
      }
      
      if (Object.keys(maintenanceUpdates).length > 0) {
        updateMaintenance(project.id, alert.maintenanceId, maintenanceUpdates);
      }
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex justify-between items-center shrink-0">
        <h1 className="text-xl font-bold tracking-tight text-slate-800">Toutes les Alertes</h1>
      </div>

      <SearchInput 
        value={search} 
        onChange={setSearch} 
        placeholder="Rechercher une alerte (projet, client...)"
        className="max-w-md"
      />

      <div className="flex-1 overflow-auto flex flex-col xl:flex-row gap-5">
        <div className="flex-1 overflow-auto flex flex-col rounded-xl">
          <div className="p-4 flex-1 bg-slate-50/50 rounded-xl h-full overflow-auto">
            {filteredAlertsByProject.length === 0 ? (
              <div className="p-12 text-center text-slate-500 bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <p>{search ? "Aucune alerte ne correspond à votre recherche." : "Aucune alerte ! Tous les projets sont à jour."}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredAlertsByProject.map(({ project, client, alerts }) => {
                  const isExpanded = expandedProjects.includes(project.id);
                  const criticalCount = alerts.filter(a => a.level === 'CRITICAL').length;
                  const warningCount = alerts.filter(a => a.level === 'WARNING').length;

                  return (
                  <div 
                    key={project.id} 
                    className="bg-white border border-slate-200/60 rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-0.5 hover:border-blue-200 transition-all duration-300 flex flex-col group block overflow-hidden"
                  >
                    <div className="p-5 flex flex-col md:flex-row gap-4 md:items-center justify-between cursor-pointer" onClick={(e) => toggleExpand(e, project.id)}>
                      <div className="md:w-1/2 shrink-0">
                        <Link to={`/projects/${project.id}`} className="font-bold text-lg text-slate-800 leading-tight hover:text-blue-600 transition-colors inline-block" onClick={e => e.stopPropagation()}>
                          {client?.name || 'Inconnu'} <span className="text-slate-400 font-normal mx-1">-</span> {project.name}
                        </Link>
                        <div className="text-sm font-medium text-slate-500 mt-2 flex items-center flex-wrap gap-2">
                           <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold border border-slate-200">{project.product}</span> 
                           <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold border border-blue-100">{project.version}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex gap-2">
                          {criticalCount > 0 && (
                            <span className="flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-1 rounded-full text-xs font-bold border border-red-100">
                               <AlertTriangle className="w-3.5 h-3.5" />
                               {criticalCount} <span className="hidden sm:inline">Critique{criticalCount > 1 ? 's' : ''}</span>
                            </span>
                          )}
                          {warningCount > 0 && (
                            <span className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-bold border border-amber-100">
                               <AlertCircle className="w-3.5 h-3.5" />
                               {warningCount} <span className="hidden sm:inline">Avertissement{warningCount > 1 ? 's' : ''}</span>
                            </span>
                          )}
                        </div>
                        <button className="p-1.5 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100 hover:text-slate-600 transition-colors">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="border-t border-slate-100 p-5 bg-slate-50/50">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                           {alerts.map(a => (
                             <div key={a.id} className={cn("flex gap-3 items-center p-3 rounded-xl border bg-white shadow-sm", a.level === 'CRITICAL' ? 'border-red-200/60 shadow-red-500/5' : 'border-amber-200/60 shadow-amber-500/5')}>
                               <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", a.level === 'CRITICAL' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600')}>
                                 {a.level === 'CRITICAL' ? <AlertTriangle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                               </div>
                               <div className="flex-1">
                                 <span className={cn("text-xs leading-snug font-bold block", a.level === 'CRITICAL' ? 'text-slate-800' : 'text-slate-700')}>
                                   {a.message}
                                 </span>
                               </div>
                               <div className="flex gap-2 shrink-0">
                                 {a.documentType && !a.documentType.startsWith('ENC_') && (
                                   <button 
                                     onClick={(e) => handleIgnoreAlert(e, a, project)}
                                     title="Ignorer ce document"
                                     className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 px-2 py-1 flex items-center justify-center rounded transition-colors"
                                   >
                                     <EyeOff className="w-4 h-4" />
                                   </button>
                                 )}
                                 <Link to={`/projects/${project.id}`} className="text-[10px] uppercase font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition-colors whitespace-nowrap hidden sm:block h-6 flex items-center justify-center">
                                   Traiter
                                 </Link>
                               </div>
                             </div>
                           ))}
                        </div>
                      </div>
                    )}
                  </div>
                )})}
               </div>
             )}
           </div>
         </div>
       </div>
     </div>
   );
 }
