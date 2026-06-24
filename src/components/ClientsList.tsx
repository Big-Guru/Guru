import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useStore } from '../store';
import { Users, Plus, ChevronRight, MapPin, Edit, Trash2 } from 'lucide-react';
import SearchInput from './SearchInput';

export default function ClientsList() {
  const { clients, projects, deleteClient } = useStore();
  const [search, setSearch] = useState('');

  const handleDelete = (id: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce client et tous ses projets ?")) {
      deleteClient(id);
    }
  };

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(search.toLowerCase()) ||
    client.wilaya.toLowerCase().includes(search.toLowerCase())
  );

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

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Portefeuille Clients</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Consultez la liste des clients et gérez leurs informations de contact.</p>
        </div>
        <Link 
          to="/clients/new" 
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-500/10 hover:opacity-95 transition-all duration-200 shrink-0 self-start sm:self-center"
        >
          <Plus className="w-4.5 h-4.5" />
          Nouveau Client
        </Link>
      </div>

      {/* Filter and search bar */}
      <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-slate-200/50 shadow-sm max-w-md">
        <SearchInput 
          value={search} 
          onChange={setSearch} 
          placeholder="Rechercher un client (nom, wilaya...)"
          className="border-0 shadow-none p-0 focus:ring-0 w-full"
        />
      </div>

      {/* Clients grid */}
      <div className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm">
        {filteredClients.length === 0 ? (
          <div className="p-12 text-center text-slate-500 max-w-sm mx-auto">
            <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Aucun client trouvé</h3>
            <p className="text-xs text-slate-500 mt-1">
              {search ? "Modifiez votre recherche ou effacez les filtres pour réessayer." : "Commencez par ajouter un nouveau client."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredClients.map(client => {
              const clientProjects = projects.filter(p => p.clientId === client.id);
              const avatarStyle = getAvatarStyle(client.name);
              
              return (
                <div 
                  key={client.id} 
                  className="relative bg-white/60 backdrop-blur-md border border-white/60 rounded-[24px] shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 hover:border-blue-200/80 transition-all duration-300 flex flex-col justify-between group overflow-hidden"
                >
                  {/* Halo coloré en arrière-plan */}
                  <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full blur-3xl z-0 pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity duration-500 bg-blue-500" />
                  
                  <Link to={`/clients/${client.id}`} className="p-6 block flex-1 space-y-5 relative z-10">
                    <div className="flex justify-between items-start gap-4">
                      {/* Avatar initials with dynamic background */}
                      <div className={`h-14 w-14 rounded-2xl flex items-center justify-center font-black text-lg uppercase shrink-0 shadow-sm border-2 border-white/50 ${avatarStyle}`}>
                        {client.name.charAt(0)}
                        {client.name.split(' ')[1]?.charAt(0)}
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 shrink-0 transition-all" />
                    </div>
                    
                    <div className="space-y-1.5 mt-2">
                      <h4 className="font-extrabold text-lg text-slate-900 group-hover:text-blue-600 transition-colors leading-tight tracking-tight line-clamp-2">
                        {client.name}
                      </h4>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>Wilaya {client.wilaya}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 pt-2 text-xs text-slate-600 font-bold">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span>{client.effectif} {client.effectifType === 'SALARIES' ? 'Salariés' : 'Étudiants'}</span>
                    </div>
                  </Link>

                  {/* Card actions footer */}
                  <div className="px-6 py-4 border-t border-slate-200/40 bg-white/40 flex justify-between items-center mt-auto relative z-10 backdrop-blur-sm">
                    <span className="inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest bg-blue-50/80 text-blue-700 border border-blue-100 shadow-sm">
                      {clientProjects.length} projet{clientProjects.length > 1 ? 's' : ''}
                    </span>
                    <div className="flex gap-2">
                      <Link 
                        to={`/clients/${client.id}/edit`}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-xl shadow-sm transition-all border border-transparent hover:border-slate-200/50"
                        title="Modifier"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleDelete(client.id);
                        }}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-xl shadow-sm transition-all border border-transparent hover:border-red-100"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
