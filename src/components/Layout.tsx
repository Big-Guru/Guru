import { Link, Outlet, useLocation } from 'react-router-dom';
import { Home, Users, Briefcase, Bell, LogOut, Menu, X, Map, ChevronLeft, ChevronRight, Banknote, FileText, Package } from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../store';
import { calculateAlerts } from '../lib/alerts';
import { useEffect, useState } from 'react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();
  const { projects, syncMaintenances } = useStore();

  useEffect(() => {
    projects.forEach(p => {
       if (p.installationDate || p.acqProforma?.dateDepot) {
         syncMaintenances(p.id);
       }
    });
  }, [projects.length]); // trigger when a new project is created
  
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const allAlerts = projects.flatMap(p => calculateAlerts(p));
  const criticalCount = allAlerts.filter(a => a.level === 'CRITICAL').length;

  const links = [
    { to: '/', icon: Home, label: 'Tableau de Bord' },
    { to: '/clients', icon: Users, label: 'Clients' },
    { to: '/projects', icon: Briefcase, label: 'Projets' },
    { to: '/alerts', icon: Bell, label: 'Alertes' },
    { to: '/encaissements', icon: Banknote, label: 'Encaissements' },
    { to: '/facturation', icon: FileText, label: 'Facturation' },
    { to: '/missions', icon: Map, label: 'Missions' },
    { to: '/products', icon: Package, label: 'Produits' },
  ];

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-slate-50 font-sans antialiased text-slate-800">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside 
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 bg-white border-r border-slate-200/80 flex flex-col shrink-0 transition-all duration-300 ease-in-out h-full",
        sidebarOpen ? "translate-x-0 shadow-2xl w-64" : "-translate-x-full lg:translate-x-0",
        !sidebarOpen && isExpanded ? "lg:w-64" : "",
        !sidebarOpen && !isExpanded ? "lg:w-20" : ""
      )}>
        {/* Brand Header */}
        <div className="h-16 px-6 border-b border-slate-100 flex items-center justify-between overflow-hidden shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-extrabold shadow-lg shadow-blue-500/10 tracking-tight text-lg shrink-0">
              G
            </div>
            <span className={cn("text-slate-900 font-bold text-lg tracking-tight whitespace-nowrap transition-all duration-300", !isExpanded && "lg:opacity-0 lg:w-0 lg:hidden")}>Guru Workspace</span>
          </div>
          <button className="lg:hidden text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 shrink-0" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 py-6 px-4 space-y-6 overflow-y-auto overflow-x-hidden">
          <div>
            <p className={cn("px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400/90 mb-3 whitespace-nowrap transition-all duration-300", !isExpanded && "lg:text-center lg:px-0 lg:text-[8px]")}>
              {isExpanded ? "Navigation" : "Nav"}
            </p>
            <nav className="space-y-1">
              {links.map((link) => {
                const isActive = location.pathname === link.to || (link.to !== '/' && location.pathname.startsWith(link.to));
                const Icon = link.icon;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    title={link.label}
                    className={cn(
                      "flex items-center px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                      isActive 
                        ? "bg-gradient-to-r from-blue-50 to-indigo-50/50 text-blue-600 font-semibold" 
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                      !isExpanded && "lg:justify-center"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={cn("w-5 h-5 shrink-0 transition-colors duration-200", 
                        isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                      )} />
                      <span className={cn("whitespace-nowrap transition-all duration-300", !isExpanded && "lg:hidden")}>{link.label}</span>
                    </div>
                    {link.to === '/alerts' && criticalCount > 0 && (
                      <span className={cn("bg-red-100 text-red-600 font-bold rounded-full flex items-center justify-center animate-pulse",
                        isExpanded ? "ml-auto h-5 min-w-5 px-1.5 text-[10px]" : "absolute top-1.5 right-1.5 h-2.5 w-2.5 lg:top-2 lg:right-2"
                      )}>
                        {isExpanded ? criticalCount : ''}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Toggle Button & Profile */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/30 flex flex-col gap-3">
          <div className={cn("flex items-center p-3 rounded-2xl border border-slate-100 bg-white hover:shadow-md hover:border-blue-100/50 transition-all duration-300 group cursor-pointer relative", !isExpanded && "lg:justify-center")} onClick={handleLogout} title="Se déconnecter">
            {/* If expanded */}
            <div className={cn("flex items-center gap-3 truncate min-w-0 transition-all duration-300", !isExpanded && "lg:hidden")}>
              {auth.currentUser?.photoURL ? (
                <img src={auth.currentUser.photoURL} alt="" className="h-9 w-9 rounded-xl object-cover border border-slate-100 shrink-0" />
              ) : (
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-slate-100 to-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm uppercase shrink-0 border border-slate-200/50">
                  {auth.currentUser?.email?.[0] || 'A'}
                </div>
              )}
              <div className="text-xs truncate min-w-0">
                <p className="text-slate-900 font-semibold truncate leading-normal">{auth.currentUser?.displayName || 'Gestionnaire'}</p>
                <p className="text-slate-400 truncate mt-0.5 leading-normal">{auth.currentUser?.email}</p>
              </div>
            </div>
            {/* Logout Icon */}
            <div className={cn("p-1.5 rounded-lg transition-colors shrink-0", 
              isExpanded ? "ml-auto bg-slate-50 group-hover:bg-red-50 text-slate-400 group-hover:text-red-500" : "bg-red-50 text-red-500"
            )}>
              <LogOut className="w-4 h-4" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200/80 flex items-center px-6 lg:px-8 shrink-0 justify-between gap-4 overflow-hidden">
          <div className="flex items-center gap-3 min-w-0">
            <button className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg shrink-0" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight capitalize truncate">
              {links.find(l => location.pathname === l.to || (l.to !== '/' && location.pathname.startsWith(l.to)))?.label || 'Détails'}
            </h1>
          </div>
          <div className="flex items-center gap-2 lg:gap-4 shrink-0">
            {criticalCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 bg-red-50 border border-red-100 rounded-full shrink-0">
                <span className="h-1.5 w-1.5 bg-red-500 rounded-full animate-ping shrink-0"></span>
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider whitespace-nowrap">
                  {criticalCount} Alerte{criticalCount > 1 ? 's' : ''} Critique{criticalCount > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
