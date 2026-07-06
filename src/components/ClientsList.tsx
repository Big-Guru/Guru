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
                <Link
                  key={client.id}
                  to={`/clients/${client.id}`}
                  className="cursor-pointer shrink-0 flex flex-col justify-between p-6 rounded-[28px] min-h-[190px] text-left transition-all duration-500 border overflow-hidden relative group hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02] bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-white shadow-blue-500/10 hover:shadow-blue-500/30 border-white/10"
                >
                  <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl z-0 pointer-events-none bg-white/20"></div>
                  <div className="absolute -left-10 -bottom-10 w-32 h-32 rounded-full blur-3xl z-0 pointer-events-none bg-black/10"></div>
                  <div className="relative z-10 flex flex-col h-full pt-1 w-full">
                    <h4 className="font-extrabold text-[22px] tracking-tight leading-none mb-1.5 drop-shadow-md text-white line-clamp-2 pr-16">
                      {client.name}
                    </h4>
                    
                    <div className="flex flex-col gap-2.5 w-full mt-auto pt-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/80">
                        {client.wilaya ? `Wilaya: ${client.wilaya}` : 'Wilaya non définie'}
                      </span>
                      
                      <div className="flex justify-between items-end">
                        <div className="flex gap-1.5 relative w-[60%] text-xs font-bold text-white/90">
                          {client.effectif} {client.effectifType === 'UNIVERSITE' ? 'Université' : 'EH/DA'}
                        </div>
                        <div className="font-black text-xs text-white/90 bg-black/10 px-2 py-1 rounded-lg backdrop-blur-md">
                          {clientProjects.length} PROJETS
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions that only appear on hover */}
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          window.location.href = `/clients/${client.id}/edit`;
                        }}
                        className="p-1.5 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-xl backdrop-blur-sm transition-all"
                        title="Modifier"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleDelete(client.id);
                        }}
                        className="p-1.5 text-red-300 hover:text-white bg-black/20 hover:bg-red-500/80 rounded-xl backdrop-blur-sm transition-all"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
