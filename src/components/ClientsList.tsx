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
                  className="bg-white border border-slate-200/70 rounded-2xl shadow-[0_2px_12px_-3px_rgba(0,0,0,0.03)] hover:shadow-lg hover:-translate-y-0.5 hover:border-blue-200 transition-all duration-300 flex flex-col justify-between group overflow-hidden"
                >
                  <Link to={`/clients/${client.id}`} className="p-5 block flex-1 space-y-4">
                    <div className="flex justify-between items-start gap-4">
                      {/* Avatar initials with dynamic background */}
                      <div className={`h-11 w-11 rounded-xl border flex items-center justify-center font-bold text-sm uppercase shrink-0 ${avatarStyle}`}>
                        {client.name.charAt(0)}
                        {client.name.split(' ')[1]?.charAt(0)}
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 shrink-0 transition-all" />
                    </div>
                    
                    <div className="space-y-1">
                      <h4 className="font-bold text-base text-slate-950 group-hover:text-blue-600 transition-colors leading-tight tracking-tight line-clamp-2">
                        {client.name}
                      </h4>
                      <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-slate-300" />
                        <span>Wilaya {client.wilaya}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 pt-2 text-xs text-slate-500 font-medium">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span>{client.effectif} {client.effectifType === 'SALARIES' ? 'Salariés' : 'Étudiants'}</span>
                    </div>
                  </Link>

                  {/* Card actions footer */}
                  <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/40 flex justify-between items-center mt-auto">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-100/60 shadow-sm">
                      {clientProjects.length} projet{clientProjects.length > 1 ? 's' : ''}
                    </span>
                    <div className="flex gap-1.5">
                      <Link 
                        to={`/clients/${client.id}/edit`}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Modifier"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleDelete(client.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
