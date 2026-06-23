import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../store';
import { Building2, MapPin, Users2, FileText, ArrowLeft, Plus, X, Award, Receipt } from 'lucide-react';
import { calculateAlerts } from '../lib/alerts';
import { ProductType, ProductVersion } from '../types';
import { cn } from '../lib/utils';

export default function ClientDetails() {
  const { id } = useParams<{ id: string }>();
  const { clients, projects, addProject } = useStore();
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectData, setNewProjectData] = useState({
    product: 'PAYE' as ProductType,
    version: 'LIGHT' as ProductVersion,
    installationDate: new Date().toISOString().split('T')[0]
  });
  
  const client = clients.find(c => c.id === id);
  const clientProjects = projects.filter(p => p.clientId === id);

  if (!client) {
    return <div className="p-8 text-center text-slate-500 font-semibold">Client introuvable</div>;
  }

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !client) return;
    addProject({
      clientId: id,
      product: newProjectData.product,
      version: newProjectData.version,
      name: `${client.name} / ${newProjectData.product}`,
      installationDate: newProjectData.installationDate
    });
    setShowNewProject(false);
    setNewProjectData({ product: 'PAYE', version: 'LIGHT', installationDate: new Date().toISOString().split('T')[0] });
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
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Fiche Client</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Consultez les informations fiscales et l'historique des projets du client.</p>
        </div>
      </div>

      {/* Main client info details box */}
      <div className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm flex flex-col md:flex-row items-center md:items-start gap-6 relative overflow-hidden">
        {/* Avatar with deterministic colors */}
        <div className={`h-16 w-16 rounded-2xl border flex items-center justify-center font-bold text-xl uppercase shrink-0 shadow-sm ${avatarStyle}`}>
          {client.name.charAt(0)}
          {client.name.split(' ')[1]?.charAt(0)}
        </div>
        
        <div className="flex-1 space-y-4 text-center md:text-left min-w-0">
          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-950 tracking-tight leading-none truncate">{client.name}</h3>
            <div className="flex items-center justify-center md:justify-start gap-1.5 text-xs text-slate-500 font-medium">
              <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>{client.address}, Wilaya {client.wilaya}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3.5">
            <div className="inline-flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/50 text-xs font-semibold text-slate-700">
               <Users2 className="w-4 h-4 text-slate-400" />
               <span>{client.effectif} {client.effectifType === 'SALARIES' ? 'Salariés' : 'Étudiants'}</span>
            </div>
            
            {/* Fiscal metadata tags */}
            <div className="flex gap-2 flex-wrap justify-center">
              {client.nif && <div title="NIF" className="bg-slate-50/50 px-2.5 py-1 rounded-lg border border-slate-100 text-[10px] font-bold"><span className="text-slate-400 mr-1 uppercase">NIF:</span><span className="text-slate-650 font-semibold">{client.nif}</span></div>}
              {client.nis && <div title="NIS" className="bg-slate-50/50 px-2.5 py-1 rounded-lg border border-slate-100 text-[10px] font-bold"><span className="text-slate-400 mr-1 uppercase">NIS:</span><span className="text-slate-650 font-semibold">{client.nis}</span></div>}
              {client.rc && <div title="RC" className="bg-slate-50/50 px-2.5 py-1 rounded-lg border border-slate-100 text-[10px] font-bold"><span className="text-slate-400 mr-1 uppercase">RC:</span><span className="text-slate-650 font-semibold">{client.rc}</span></div>}
              {client.ai && <div title="AI" className="bg-slate-50/50 px-2.5 py-1 rounded-lg border border-slate-100 text-[10px] font-bold"><span className="text-slate-400 mr-1 uppercase">AI:</span><span className="text-slate-650 font-semibold">{client.ai}</span></div>}
            </div>
          </div>
        </div>
      </div>

      {/* Projects listing grid */}
      <div className="space-y-4">
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4.5 h-4.5 text-blue-600" />
              Projets associés ({clientProjects.length})
            </h3>
            {!showNewProject && (
              <button 
                onClick={() => setShowNewProject(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-xl shadow-sm hover:opacity-95 transition-all duration-200"
              >
                <Plus className="w-3.5 h-3.5" /> Nouveau Projet
              </button>
            )}
          </div>

          <div className="p-6">
            {/* Inline creation form */}
            {showNewProject && (
              <form onSubmit={handleAddProject} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 mb-6 relative">
                 <button type="button" onClick={() => setShowNewProject(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4" /></button>
                 <h4 className="font-bold text-slate-900 text-sm mb-4">Initialiser un projet</h4>
                 
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">Produit</label>
                      <select 
                        required
                        className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                        value={newProjectData.product}
                        onChange={e => setNewProjectData({...newProjectData, product: e.target.value as ProductType})}
                      >
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
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">Version</label>
                      <select 
                        required
                        className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                        value={newProjectData.version}
                        onChange={e => setNewProjectData({...newProjectData, version: e.target.value as ProductVersion})}
                      >
                        <option value="ULTRALIGHT">UltraLight</option>
                        <option value="LIGHT">Light</option>
                        <option value="INTERMEDIATE">Intermediate</option>
                        <option value="ADVANCED">Advanced</option>
                        <option value="GLOBAL">Global</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-450 mb-1.5">Installation</label>
                      <input 
                        required
                        type="date"
                        className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                        value={newProjectData.installationDate}
                        onChange={e => setNewProjectData({...newProjectData, installationDate: e.target.value})}
                      />
                    </div>
                 </div>
                 
                 <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                   <button type="submit" className="bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-slate-800 transition">Créer le projet</button>
                 </div>
              </form>
            )}
            
            {/* Grid display */}
            {clientProjects.length === 0 ? (
              <div className="text-center py-12 max-w-sm mx-auto text-slate-500">
                <FileText className="w-10 h-10 text-slate-350 mx-auto mb-3" />
                <h4 className="font-bold text-slate-950 text-sm">Aucun projet</h4>
                <p className="text-xs text-slate-450 mt-1">Créez le premier projet client pour commencer le suivi.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {clientProjects.map(project => {
                  const alerts = calculateAlerts(project);
                  const critCount = alerts.filter(a => a.level === 'CRITICAL').length;
                  const warnCount = alerts.filter(a => a.level === 'WARNING').length;
                  
                  return (
                    <Link 
                      key={project.id} 
                      to={`/projects/${project.id}`}
                      className="group flex flex-col bg-white border border-slate-200/70 rounded-2xl shadow-[0_2px_12px_-3px_rgba(0,0,0,0.03)] hover:shadow-lg hover:-translate-y-0.5 hover:border-blue-200 transition-all duration-300 overflow-hidden"
                    >
                      <div className="p-5 flex flex-col flex-1 gap-4">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn("px-2.5 py-0.5 rounded-lg text-[9px] font-extrabold uppercase border shadow-sm tracking-wide", getProductBadgeStyle(project.product))}>
                              {project.product}
                            </span>
                            <span className={cn("px-2.5 py-0.5 rounded-lg text-[9px] font-extrabold uppercase border shadow-sm tracking-wide", getVersionBadgeStyle(project.version))}>
                              {project.version}
                            </span>
                          </div>
                          
                          {/* Alert badges */}
                          <div className="flex gap-1.5 shrink-0">
                            {critCount > 0 && (
                              <span className="bg-red-55/90 text-red-700 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-lg border border-red-100/60 flex items-center gap-1">
                                <span className="w-1 h-1 bg-red-650 rounded-full animate-ping"></span>
                                {critCount}
                              </span>
                            )}
                            {warnCount > 0 && critCount === 0 && (
                              <span className="bg-amber-50 text-amber-700 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-lg border border-amber-100">
                                {warnCount}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <span className="font-bold text-base text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors leading-tight block">
                            {project.name}
                          </span>
                          <span className="text-[11px] text-slate-400 font-semibold block">Installé le {new Date(project.installationDate).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </div>
                      
                      <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/40 flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                         <span>Suivi des documents</span>
                         <span className="text-blue-600 group-hover:translate-x-1 transition-transform">&rarr;</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
