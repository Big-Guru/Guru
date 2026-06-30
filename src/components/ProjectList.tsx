import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store';
import { Briefcase, ArrowRight, AlertTriangle, AlertCircle, Plus, X, FolderKanban, Users, MapPin, Building } from 'lucide-react';
import { calculateAlerts } from '../lib/alerts';
import { cn } from '../lib/utils';
import SearchInput from './SearchInput';

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

export default function ProjectList() {
  const { projects, clients, addProject } = useStore();

  const [search, setSearch] = useState('');
  const [showNewProject, setShowNewProject] = useState(false);

  const [newProjectData, setNewProjectData] = useState({
    clientId: '',
    name: '',
    departement: 'D1',
    product: 'PAYE',
    wilaya: '',
    ville: '',
    entity: 'Naltis' as 'Naltis' | 'Netsprint' | 'MP',
    technique: [] as string[],
    mode: 'Acquisition' as 'Acquisition' | 'Maintenance offerte' | 'Maintenance',
    phase: 'Démarchage' as 'Démarchage' | 'Adaptation' | 'Encaissement' | 'Recouvrement',
    status: 'Actif' as 'Actif' | 'Effectué' | 'Suspendu' | 'Abandonné',
    createdAt: new Date().toISOString().split('T')[0]
  });

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    const client = clients.find(c => c.id === newProjectData.clientId);
    if (!newProjectData.clientId || !client || !newProjectData.name) return;

    addProject({
      clientId: newProjectData.clientId,
      name: newProjectData.name,
      departement: newProjectData.departement,
      product: newProjectData.product,
      wilaya: newProjectData.wilaya || client.wilaya,
      ville: newProjectData.ville,
      entity: newProjectData.entity,
      technique: newProjectData.technique,
      mode: newProjectData.mode,
      phase: newProjectData.phase,
      status: newProjectData.status,
      createdAt: newProjectData.createdAt,
      installationDate: newProjectData.createdAt,
    });

    setShowNewProject(false);
    setNewProjectData({
      clientId: '',
      name: '',
      departement: 'D1',
      product: 'PAYE',
      wilaya: '',
      ville: '',
      entity: 'Naltis',
      technique: [],
      mode: 'Acquisition',
      phase: 'Démarchage',
      status: 'Actif',
      createdAt: new Date().toISOString().split('T')[0]
    });
  };

  const filteredProjects = projects.filter(project => {
    const client = clients.find(c => c.id === project.clientId);
    const searchLower = search.toLowerCase();
    return (
      project.name.toLowerCase().includes(searchLower) ||
      (client?.name || '').toLowerCase().includes(searchLower) ||
      project.product.toLowerCase().includes(searchLower) ||
      (project.departement || '').toLowerCase().includes(searchLower) ||
      (project.wilaya || '').toLowerCase().includes(searchLower) ||
      (project.ville || '').toLowerCase().includes(searchLower)
    );
  });

  const getProductBadgeStyle = (product: string) => {
    switch (product.toUpperCase()) {
      case 'PAYE': return 'bg-blue-50 text-blue-750 border-blue-100';
      case 'BUDGET': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'BUDGET_APC': return 'bg-teal-50 text-teal-700 border-teal-100';
      case 'STOCKS': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'GRH': return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'PHARMATIS': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'GBS': return 'bg-cyan-50 text-cyan-700 border-cyan-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'Actif': return 'bg-emerald-50 text-emerald-700 border-emerald-250';
      case 'Effectué': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Suspendu': return 'bg-amber-50 text-amber-750 border-amber-200';
      case 'Abandonné': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const getEntityStyle = (entity?: string) => {
    switch (entity) {
      case 'Naltis': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      case 'Netsprint': return 'bg-violet-50 text-violet-750 border-violet-100';
      case 'MP': return 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const getGradientStyle = (product: string) => {
    switch (product.toUpperCase()) {
      case 'PAYE': return 'bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white shadow-blue-500/10 hover:shadow-blue-500/30';
      case 'BUDGET': return 'bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white shadow-emerald-500/10 hover:shadow-emerald-500/30';
      case 'BUDGET_APC': return 'bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-700 text-white shadow-teal-500/10 hover:shadow-teal-500/30';
      case 'STOCKS': return 'bg-gradient-to-br from-amber-500 via-orange-600 to-red-650 text-white shadow-orange-500/10 hover:shadow-orange-500/30';
      case 'GRH': return 'bg-gradient-to-br from-purple-600 via-fuchsia-600 to-pink-700 text-white shadow-purple-500/10 hover:shadow-purple-500/30';
      case 'PHARMATIS': return 'bg-gradient-to-br from-rose-600 via-pink-600 to-indigo-700 text-white shadow-rose-500/10 hover:shadow-rose-500/30';
      case 'GBS': return 'bg-gradient-to-br from-cyan-600 via-sky-600 to-blue-750 text-white shadow-cyan-500/10 hover:shadow-cyan-500/30';
      default: return 'bg-gradient-to-br from-slate-600 to-slate-800 text-white shadow-slate-500/10 hover:shadow-slate-500/30';
    }
  };

  const getOwnerAvatar = (id: string) => {
    const avatars = [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80',
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150&q=80',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80',
    ];
    let sum = 0;
    for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
    return avatars[sum % avatars.length];
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Suivi des Projets</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Pilotez vos portefeuilles projets, contrats, modes de facturation et contacts associés.</p>
        </div>
        <button
          onClick={() => setShowNewProject(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-500/10 hover:opacity-95 transition-all duration-200 shrink-0 self-start sm:self-center"
        >
          <Plus className="w-4.5 h-4.5" />
          Nouveau Projet
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-slate-200/50 shadow-sm max-w-md">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Rechercher un projet (nom, client, wilaya, produit...)"
          className="border-0 shadow-none p-0 focus:ring-0 w-full"
        />
      </div>

      {/* Project Creation Overlay Form */}
      {showNewProject && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity duration-300">
          <form onSubmit={handleAddProject} className="bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 relative w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <button type="button" onClick={() => setShowNewProject(false)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50"><X className="w-5 h-5" /></button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <FolderKanban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Nouveau Projet</h3>
                <p className="text-xs text-slate-500 font-medium">Initialisez une nouvelle fiche projet avec son département et ses contrats.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4.5 mb-6">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Client rattaché</label>
                <select
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white transition-all font-semibold text-slate-800"
                  value={newProjectData.clientId}
                  onChange={e => setNewProjectData({ ...newProjectData, clientId: e.target.value })}
                >
                  <option value="" disabled>Sélectionner un client</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

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
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Produit</label>
                <select
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white transition-all font-semibold text-slate-800"
                  value={newProjectData.product}
                  onChange={e => setNewProjectData({ ...newProjectData, product: e.target.value })}
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
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Mode de facturation</label>
                <select
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white transition-all font-semibold text-slate-800"
                  value={newProjectData.mode}
                  onChange={e => setNewProjectData({ ...newProjectData, mode: e.target.value as any })}
                >
                  <option value="Acquisition">Acquisition</option>
                  <option value="Maintenance offerte">Maintenance offerte</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Phase</label>
                <select
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white transition-all font-semibold text-slate-800"
                  value={newProjectData.phase}
                  onChange={e => setNewProjectData({ ...newProjectData, phase: e.target.value as any })}
                >
                  <option value="Démarchage">Démarchage</option>
                  <option value="Adaptation">Adaptation</option>
                  <option value="Encaissement">Encaissement</option>
                  <option value="Recouvrement">Recouvrement</option>
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

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowNewProject(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-semibold transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg"
              >
                Créer le projet
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Projects Grid Container */}
      <div className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm">
        {filteredProjects.length === 0 ? (
          <div className="p-12 text-center text-slate-500 max-w-sm mx-auto">
            <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <Briefcase className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Aucun projet en cours</h3>
            <p className="text-xs text-slate-500 mt-1">
              {search ? "Ajustez vos filtres pour trouver le projet correspondant." : "Lancez un nouveau projet pour commencer."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredProjects.map((project, index) => {
              const client = clients.find(c => c.id === project.clientId);

              const activeContract = project.contracts?.find(c => c.status === 'ACTIVE') || project.contracts?.[0];
              const activePhase = activeContract?.phases?.find(p => p.status === 'ACTIVE' || p.status === 'PENDING') || activeContract?.phases?.[0];
              const displayMode = activeContract?.mode || project.mode || 'Acquisition';
              const displayPhase = activePhase?.name || project.phase || 'Démarchage';

              // Count open contracts
              const openContractsCount = (project.contracts || []).filter(c => c.status === 'ACTIVE').length;

              return (
                <Link
                  key={`${project.id}-${index}`}
                  to={`/projects/${project.id}`}
                  className={cn(
                    "relative rounded-3xl p-6 shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between min-h-[220px] overflow-hidden group border border-white/10",
                    getGradientStyle(project.product)
                  )}
                >
                  {/* Top row: Nom */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-0.5">
                      <h4 className="font-extrabold text-lg tracking-tight leading-tight drop-shadow-sm group-hover:underline decoration-white/30 decoration-2 underline-offset-4 uppercase">
                        {client?.name || project.name}
                      </h4>
                      <div className="pt-1.5">
                        <span className="inline-block bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded border border-white/20 text-[9px] font-black tracking-widest uppercase shadow-sm">
                          {project.product}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Section: Active Modes & Tasks */}
                  <div className="mt-auto pt-4 space-y-3">
                    {project.contracts?.filter(c => c.status === 'ACTIVE').map(contract => {
                       const activePhase = contract.phases?.find(p => p.status === 'ACTIVE') || contract.phases?.find(p => p.status === 'PENDING') || contract.phases?.[0];
                       return (
                         <div key={contract.id} className="flex flex-col">
                            <div className="text-sm font-extrabold text-white">
                              {contract.name}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] font-bold text-white/80">
                                {activePhase?.name || 'Non définie'}
                              </span>
                              <span className="w-1 h-1 rounded-full bg-white/40"></span>
                              <span className="px-1.5 py-0.5 rounded-md uppercase tracking-wider text-[9px] font-black bg-white/20 text-white shadow-sm">
                                {project.status || 'Actif'}
                              </span>
                            </div>
                            {/* Petits points des tâches pour la phase active */}
                            {activePhase?.tasks && activePhase.tasks.length > 0 && (
                              <div className="flex gap-1 mt-2 w-full max-w-[120px]">
                                {activePhase.tasks.map((task: any, i: number) => (
                                  <div 
                                    key={i} 
                                    title={`${task.name} : ${task.status}`}
                                    className={cn(
                                      "flex-1 h-1 rounded-full transition-all duration-300",
                                      task.status === 'DONE' ? 'bg-emerald-400' : 
                                      task.status === 'IN_PROGRESS' ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-pulse' : 
                                      task.status === 'CANCELED' ? 'bg-red-400' :
                                      'bg-white/30'
                                    )}
                                  />
                                ))}
                              </div>
                            )}
                         </div>
                       );
                    })}
                    {(!project.contracts || project.contracts.filter(c => c.status === 'ACTIVE').length === 0) && (
                       <div className="text-sm font-bold text-white/60 italic">
                         Aucun mode actif
                       </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
