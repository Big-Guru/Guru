import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../store';
import { Building2, MapPin, Users2, FileText, ArrowLeft, Plus, X, Award, Receipt, Clock } from 'lucide-react';
import { calculateAlerts } from '../lib/alerts';
import { ProductType, ProductVersion } from '../types';
import { cn } from '../lib/utils';

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
  const { clients, projects, addProject } = useStore();
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectData, setNewProjectData] = useState({
    name: '',
    departement: 'D1',
    product: 'PAYE' as ProductType,
    version: 'LIGHT' as ProductVersion,
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
      technique: newProjectData.technique,
      createdAt: newProjectData.createdAt,
      installationDate: newProjectData.createdAt
    });
    setShowNewProject(false);
    setNewProjectData({ 
      name: '', departement: 'D1', product: 'PAYE', version: 'LIGHT', wilaya: '', ville: '', 
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
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Fiche Client</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Consultez les informations fiscales et l'historique des projets du client.</p>
        </div>
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
      <div className="space-y-4">
        <div className="bg-white/60 backdrop-blur-md rounded-[2rem] border border-white/60 shadow-xl shadow-slate-200/40 overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-slate-200/40 bg-white/40 flex items-center justify-between relative z-10">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-widest flex items-center gap-2.5">
              <FileText className="w-5 h-5 text-blue-600" />
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
            {/* Grid display */}
            {clientProjects.length === 0 ? (
              <div className="text-center py-12 max-w-sm mx-auto text-slate-500">
                <FileText className="w-10 h-10 text-slate-350 mx-auto mb-3" />
                <h4 className="font-bold text-slate-950 text-sm">Aucun projet</h4>
                <p className="text-xs text-slate-450 mt-1">Créez le premier projet client pour commencer le suivi.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {clientProjects.map((project, index) => {
                  const alerts = calculateAlerts(project);
                  const critCount = alerts.filter(a => a.level === 'CRITICAL').length;
                  const warnCount = alerts.filter(a => a.level === 'WARNING').length;
                  
                  return (
                    <Link 
                      key={`${project.id}-${index}`} 
                      to={`/projects/${project.id}`}
                      className="group relative flex flex-col bg-white/60 backdrop-blur-md border border-white/60 rounded-[24px] shadow-lg shadow-slate-200/40 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 hover:border-blue-200/80 transition-all duration-300 overflow-hidden"
                    >
                      <div className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full blur-3xl z-0 pointer-events-none opacity-0 group-hover:opacity-30 transition-opacity duration-500 bg-indigo-500" />
                      
                      <div className="p-6 flex flex-col flex-1 gap-5 relative z-10">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className={cn("px-3 py-1 rounded-xl text-[10px] font-black uppercase border shadow-sm tracking-widest", getProductBadgeStyle(project.product))}>
                              {project.product}
                            </span>
                            <span className={cn("px-3 py-1 rounded-xl text-[10px] font-black uppercase border shadow-sm tracking-widest", getVersionBadgeStyle(project.version))}>
                              {project.version}
                            </span>
                          </div>
                          
                          {/* Alert badges */}
                          <div className="flex gap-1.5 shrink-0">
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
                        </div>
                        
                        <div className="space-y-1.5">
                          <span className="font-extrabold text-lg text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors leading-tight block">
                            {project.name}
                          </span>
                          <span className="text-xs text-slate-500 font-bold block flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" /> Installé le {new Date(project.installationDate).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </div>
                      
                      <div className="px-6 py-4 border-t border-slate-200/40 bg-white/40 flex justify-between items-center text-[11px] font-black text-slate-500 uppercase tracking-widest relative z-10 backdrop-blur-sm">
                         <span>Suivi des documents</span>
                         <span className="text-blue-600 group-hover:translate-x-1.5 transition-transform bg-blue-50 p-1.5 rounded-lg">&rarr;</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
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
    </div>
  );
}
