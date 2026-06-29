import React, { useState } from 'react';
import { useStore } from '../store';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { AlertCircle, AlertTriangle, EyeOff, X, FileText } from 'lucide-react';
import { Alert, Project } from '../types';
import SearchInput from './SearchInput';

export default function AlertsList() {
  const { clients, projects, updateProject, updateMaintenance, updateTaskInContract, updateEncaissement } = useStore();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  const filteredAlertsByProject = projects.map(p => {
    let missingDocs = 0;
    const acquisitionContract = p.contracts?.find(c => c.mode === 'Acquisition');
    const encaissementPhase = acquisitionContract?.phases?.find(ph => ph.name === 'Encaissement');
    const activeEncaissementsList = p.encaissements?.filter(e => e.status !== 'UPCOMING' && e.status !== 'ABANDONED') || [];
    
    activeEncaissementsList.forEach(enc => {
      if (enc.mode === 'Acquisition') {
        if (acquisitionContract && encaissementPhase) {
           missingDocs += (encaissementPhase.tasks || []).filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS').length;
        }
      } else if (enc.mode === 'Maintenance') {
         if (enc.proforma?.status === 'PENDING') missingDocs++;
         if (enc.bc?.status === 'PENDING') missingDocs++;
         if (enc.facture?.status === 'PENDING') missingDocs++;
         if (enc.status !== 'DONE') missingDocs++;
      }
    });

    return {
      project: p,
      client: clients.find(c => c.id === p.clientId),
      alertsCount: missingDocs
    };
  }).filter(item => {
    if (item.alertsCount === 0) return false;
    const searchLower = search.toLowerCase();
    return (
      item.project.name.toLowerCase().includes(searchLower) ||
      (item.client?.name || '').toLowerCase().includes(searchLower)
    );
  });

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
                {filteredAlertsByProject.map(({ project, client, alertsCount }) => {
                  return (
                  <div 
                    key={project.id} 
                    className="group relative bg-white border border-slate-200/80 rounded-[20px] shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_rgba(239,68,68,0.12)] hover:-translate-y-0.5 hover:border-red-200 transition-all duration-300 flex flex-col overflow-hidden cursor-pointer"
                    onClick={(e) => { e.preventDefault(); setSelectedProjectId(project.id); }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-red-50/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    
                    <div className="p-4 md:p-5 flex flex-col md:flex-row gap-4 md:items-center justify-between relative z-10">
                      <div className="md:w-7/12 shrink-0">
                        <div className="flex items-center gap-3 mb-1">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-100 to-red-50 text-red-600 flex items-center justify-center shrink-0 shadow-sm border border-red-200/60 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                             <AlertTriangle className="w-4 h-4" />
                          </div>
                          <Link to={`/projects/${project.id}`} className="font-extrabold text-lg text-slate-800 leading-tight hover:text-red-600 transition-colors inline-block" onClick={e => e.stopPropagation()}>
                            {client?.name || 'Inconnu'} <span className="text-slate-300 font-normal mx-1.5">/</span> {project.name}
                          </Link>
                        </div>
                        <div className="text-xs font-bold text-slate-500 flex items-center flex-wrap gap-2 pl-[44px]">
                           <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[9px] uppercase tracking-wider border border-slate-200 shadow-sm">{project.product}</span> 
                           <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[9px] uppercase tracking-wider border border-blue-100 shadow-sm">{project.version}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-4 pl-[44px] md:pl-0 mt-3 md:mt-0">
                        {alertsCount > 0 && (
                          <div className="flex items-center gap-2.5 bg-gradient-to-r from-red-50 to-white text-red-700 px-3 py-1.5 rounded-xl border border-red-100 shadow-sm group-hover:border-red-300 group-hover:shadow-md group-hover:shadow-red-500/10 transition-all duration-300">
                             <FileText className="w-4 h-4 text-red-500" />
                             <div className="flex flex-col leading-none">
                               <span className="font-extrabold text-sm">{alertsCount} document{alertsCount > 1 ? 's' : ''}</span>
                               <span className="text-[9px] font-bold opacity-70 uppercase tracking-widest mt-0.5">Manquant{alertsCount > 1 ? 's' : ''}</span>
                             </div>
                          </div>
                        )}
                        <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-red-500 group-hover:text-white group-hover:border-red-600 transition-all duration-300 shadow-sm group-hover:shadow-md group-hover:shadow-red-500/30 shrink-0">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-0.5 transition-transform"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })}
               </div>
             )}
           </div>
         </div>
       </div>

      {selectedProjectId && (() => {
        const project = projects.find(p => p.id === selectedProjectId);
        if (!project) return null;

        const acquisitionContract = project.contracts?.find(c => c.mode === 'Acquisition');
        const encaissementPhase = acquisitionContract?.phases?.find(p => p.name === 'Encaissement');
        const activeEncaissementsList = project.encaissements?.filter(e => e.status !== 'UPCOMING' && e.status !== 'ABANDONED') || [];

        return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedProjectId(null)}>
          <div className="bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 relative w-full max-w-5xl max-h-[90vh] flex flex-col justify-between overflow-hidden" onClick={e => e.stopPropagation()}>
            <button type="button" onClick={() => setSelectedProjectId(null)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
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

    </div>
  );
}
