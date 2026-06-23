import { useStore } from '../store';
import { calculateAlerts } from '../lib/alerts';
import { Link } from 'react-router-dom';
import { Briefcase, Users, AlertTriangle, AlertCircle, Calendar, MapPin, ArrowRight } from 'lucide-react';
import { auth } from '../lib/firebase';

export default function Dashboard() {
  const { clients, projects, missions } = useStore();
  
  const alertsByProject = projects.map(p => ({
    project: p,
    client: clients.find(c => c.id === p.clientId),
    alerts: calculateAlerts(p)
  })).filter(item => item.alerts.length > 0);

  const totalCritical = alertsByProject.reduce((acc, curr) => acc + curr.alerts.filter(a => a.level === 'CRITICAL').length, 0);
  const totalWarning = alertsByProject.reduce((acc, curr) => acc + curr.alerts.filter(a => a.level === 'WARNING').length, 0);

  const formattedDate = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).replace(/^\w/, (c) => c.toUpperCase());

  // Get active/critical alerts list (max 4)
  const recentAlerts = alertsByProject
    .flatMap(item => item.alerts.map(a => ({ ...a, project: item.project, client: item.client })))
    .filter(a => a.level === 'CRITICAL')
    .slice(0, 4);

  // Get next planned missions (max 3)
  const upcomingMissions = [...missions]
    .filter(m => m.status === 'PLANNED' || m.status === 'IN_PROGRESS')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Welcome Banner Card */}
      <div className="relative overflow-hidden bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 rounded-3xl p-6 lg:p-8 text-white shadow-xl shadow-indigo-500/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="absolute left-1/3 bottom-0 w-72 h-72 bg-pink-500/15 rounded-full blur-3xl -ml-24 -mb-24"></div>
        
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-semibold tracking-wide text-white/90 border border-white/10">
            <Calendar className="w-3.5 h-3.5" />
            {formattedDate}
          </div>
          <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight">
            Bonjour, {auth.currentUser?.displayName || 'Gestionnaire'} 👋
          </h2>
          <p className="text-white/85 text-sm max-w-xl font-medium leading-relaxed">
            Suivez l'état de votre portefeuille clients, gérez les alertes administratives et optimisez vos plannings de déplacement.
          </p>
        </div>
        
        <div className="relative z-10 shrink-0 bg-white/15 backdrop-blur-md px-5 py-4 rounded-2xl border border-white/20 text-center min-w-[120px] shadow-lg">
          <div className="text-3xl font-black text-white tracking-tight">{totalCritical}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-white/90 mt-1">Alertes critiques</div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Clients */}
        <Link to="/clients" className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-blue-200 transition-all duration-300 group relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-50 rounded-full blur-2xl group-hover:bg-blue-100/60 transition-colors"></div>
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 border border-blue-100 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Clients</p>
            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{clients.length}</p>
          </div>
          <div className="text-xs font-semibold text-blue-600 mt-4 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            Gérer les clients <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>
        
        {/* Active Projects */}
        <Link to="/projects" className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-indigo-200 transition-all duration-300 group relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-50 rounded-full blur-2xl group-hover:bg-indigo-100/60 transition-colors"></div>
          <div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 border border-indigo-100 group-hover:scale-110 transition-transform">
              <Briefcase className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Projets Actifs</p>
            <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{projects.length}</p>
          </div>
          <div className="text-xs font-semibold text-indigo-600 mt-4 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            Voir les projets <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>
        
        {/* Critical Alerts */}
        <Link to="/alerts" className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-red-200 transition-all duration-300 group relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-red-50 rounded-full blur-2xl group-hover:bg-red-100/60 transition-colors"></div>
          <div>
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-4 border border-red-100 group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">Alertes Critiques</p>
            <p className="text-3xl font-extrabold text-red-600 tracking-tight">{totalCritical}</p>
          </div>
          <div className="text-xs font-semibold text-red-500 mt-4 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            Traiter les alertes <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>
        
        {/* Warnings */}
        <Link to="/alerts" className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-amber-200 transition-all duration-300 group relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-50 rounded-full blur-2xl group-hover:bg-amber-100/60 transition-colors"></div>
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 border border-amber-100 group-hover:scale-110 transition-transform">
              <AlertCircle className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1">Avertissements</p>
            <p className="text-3xl font-extrabold text-amber-600 tracking-tight">{totalWarning}</p>
          </div>
          <div className="text-xs font-semibold text-amber-600 mt-4 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            Vérifier les dossiers <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>
      </div>

      {/* Main Grid: Alerts & Missions summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Critical Alerts Panel */}
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
              Alertes critiques récentes
            </h3>
            <Link to="/alerts" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
              Voir tout ({alertsByProject.length})
            </Link>
          </div>
          <div className="p-6 flex-1 divide-y divide-slate-100">
            {recentAlerts.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-sm">
                <div className="h-10 w-10 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <span>Aucune alerte critique. Bon travail !</span>
              </div>
            ) : (
              recentAlerts.map(alert => (
                <div key={alert.id} className="py-3.5 first:pt-0 last:pb-0 flex items-start gap-4 justify-between group">
                  <div className="space-y-1">
                    <Link to={`/projects/${alert.project.id}`} className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {alert.client?.name}
                    </Link>
                    <p className="text-xs text-slate-500 font-medium">
                      {alert.message}
                    </p>
                  </div>
                  <span className="text-[10px] bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded uppercase border border-red-100 whitespace-nowrap shrink-0">
                    {alert.documentType?.replace('_ACQ', '').replace('_MAIN', '')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Next Missions Panel */}
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              Prochaines Missions
            </h3>
            <Link to="/missions" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
              Gérer ({missions.length})
            </Link>
          </div>
          <div className="p-6 flex-1 divide-y divide-slate-100">
            {upcomingMissions.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-sm">
                <MapPin className="w-7 h-7 text-slate-300 mb-2" />
                <span>Aucun déplacement planifié.</span>
              </div>
            ) : (
              upcomingMissions.map(mission => (
                <div key={mission.id} className="py-4 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-950 leading-tight">
                      {mission.title}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(mission.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </span>
                      {mission.itineraries?.[0] && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                          {mission.itineraries[0].wilayas.slice(0, 2).join(' ➔ ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded shrink-0 ${
                    mission.status === 'IN_PROGRESS' 
                      ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                      : 'bg-amber-50 text-amber-700 border border-amber-100'
                  }`}>
                    {mission.status === 'IN_PROGRESS' ? 'En cours' : 'Prévu'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
