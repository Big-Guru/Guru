import React, { useState } from 'react';
import { useStore } from '../store';
import { Banknote, FolderKanban, FileText, Search } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import FacturationDossierModal from './FacturationDossierModal';
import FacturationSingleModal from './FacturationSingleModal';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';

export default function EncaissementsList() {
  const { clients, projects, dossiersPaiement } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedDossierId, setSelectedDossierId] = useState<string | null>(null);
  const [selectedSingleEnc, setSelectedSingleEnc] = useState<any>(null);

  // Tous les encaissements qui ne sont pas DONE
  const allActiveEncaissements = projects.flatMap(p => 
    (p.encaissements || []).map(e => ({
      ...e,
      projectId: p.id,
      projectName: p.name,
      product: p.product,
      client: clients.find(c => c.id === p.clientId)
    }))
  ).filter(e => {
    if (e.status === 'DONE' || !e.client) return false;
    // N'afficher que les encaissements qui sont à 30 jours (ou moins) de leur date de début, ou en retard
    const daysUntilDue = differenceInDays(new Date(e.targetDate), new Date());
    return daysUntilDue <= 30;
  });

  const activeDossiers = dossiersPaiement.map(dossier => {
    const encsInDossier = allActiveEncaissements.filter(e => e.combinedWithDossierId === dossier.id || (e as any).dossierId === dossier.id);
    return {
      dossier,
      encaissements: encsInDossier,
      client: encsInDossier[0]?.client
    };
  }).filter(d => d.encaissements.length > 0);

  const singleEncaissements = allActiveEncaissements.filter(e => !e.isCombined);

  const getStatusLabel = (enc: any) => {
    if (enc.status === 'PARTIAL') return 'Paiement partiel';
    if (enc.facture.status === 'VALIDATED') return 'Facture validée';
    if (enc.facture.status === 'GENERATED') return 'Facture générée';
    if (enc.bc.status === 'RECOVERED') return 'BC Récupéré';
    if (enc.proforma.status === 'VALIDATED') return 'Proforma validée';
    if (enc.proforma.status === 'TO_VERIFY') return 'Proforma à vérifier';
    if (enc.proforma.status === 'GENERATED') return 'Proforma générée';
    return 'À générer (Proforma)';
  };

  const filteredDossiers = activeDossiers.filter(d => 
    d.client?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.encaissements.some(e => e.projectName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredSingles = singleEncaissements.filter(e => 
    e.client?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.projectName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedForFusion = singleEncaissements.reduce((acc, curr) => {
    if (!curr.client) return acc;
    const monthYear = curr.targetDate.substring(0, 7);
    const key = `${curr.client.id}_${monthYear}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(curr);
    return acc;
  }, {} as Record<string, any[]>);

  const combinableGroups = Object.entries(groupedForFusion).filter(([_, group]) => group.length >= 2);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-2">Encaissements en cours</h1>
          <p className="text-slate-500 font-medium">Gérez vos dossiers d'encaissement et encaissements uniques</p>
        </div>
        
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
          />
        </div>
      </div>

      {combinableGroups.length > 0 && (
        <div className="space-y-3 mb-8">
          {combinableGroups.map(([key, group]) => {
            const client = group[0].client;
            const monthYear = group[0].targetDate.substring(0, 7);
            return (
              <div key={key} className="bg-gradient-to-r from-indigo-50/80 to-purple-50/80 border border-indigo-100/50 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4 relative z-10 w-full">
                   <div className="bg-white border border-indigo-100 p-2.5 rounded-xl shadow-sm shrink-0">
                     <FolderKanban className="w-5 h-5 text-indigo-500" />
                   </div>
                   <div className="flex-1">
                     <h3 className="text-base font-extrabold text-indigo-900 tracking-tight">Opportunité de Fusion : {client.name} !</h3>
                     <p className="text-indigo-600/80 text-xs font-bold mt-0.5 leading-relaxed">Le client a {group.length} encaissements prévus en {new Date(monthYear + '-01').toLocaleDateString('fr-FR', {month: 'long', year: 'numeric'})} ({Array.from(new Set(group.map((g: any) => `${g.product} - ${g.mode}`))).join(', ')}). Voulez-vous les regrouper dans un seul dossier de paiement ?</p>
                   </div>
                </div>
                <Link 
                  to={`/clients/${client.id}`}
                  className="px-6 py-2.5 bg-white text-indigo-700 hover:bg-indigo-600 hover:text-white border border-indigo-200 hover:border-transparent rounded-xl text-xs font-black shadow-sm whitespace-nowrap transition-all hover:scale-105 relative z-10"
                >
                  Voir le client
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {(filteredDossiers.length === 0 && filteredSingles.length === 0) ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center shadow-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Banknote className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Aucun encaissement en cours</h3>
          <p className="text-slate-500 font-medium">Tous les encaissements sont finalisés ou aucun ne correspond à votre recherche.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          
          {/* Dossiers d'encaissement */}
          {filteredDossiers.map(d => {
            const masterEnc = d.encaissements[0];
            const combinedProjects = Array.from(new Set(d.encaissements.map(e => e.projectName))).join(" & ");
            const combinedProducts = Array.from(new Set(d.encaissements.map(e => e.product))).join(" & ");
            const combinedModes = Array.from(new Set(d.encaissements.map(e => e.mode))).join(" & ");
            const combinedYears = Array.from(new Set(d.encaissements.filter(e => e.year).map(e => e.year))).join(" & ");
            
            return (
              <div 
                key={d.dossier.id}
                onClick={() => setSelectedDossierId(d.dossier.id)}
                className="bg-white rounded-3xl border border-indigo-100 p-6 shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all duration-300 cursor-pointer group flex flex-col h-full relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/50 rounded-bl-full -z-10 group-hover:bg-indigo-100/50 transition-colors" />
                
                <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
                  <span className="whitespace-nowrap shrink-0 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border border-indigo-100">
                    <FolderKanban className="w-3 h-3 shrink-0" />
                    Dossier Fusionné
                  </span>
                  <span className="whitespace-nowrap shrink-0 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-black uppercase tracking-wider">
                    {getStatusLabel(masterEnc)}
                  </span>
                </div>
                
                <h3 className="text-xl font-black text-slate-900 mb-1 leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2">
                  {d.client?.name}
                </h3>
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">{combinedProjects}</p>
                <p className="text-sm font-bold text-slate-500 mb-6">{combinedProducts}</p>
                
                <div className="mt-auto space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-slate-600">
                    <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phase</p>
                      <p className="text-xs font-bold">{combinedModes} {combinedYears ? `(${combinedYears})` : ''}</p>
                    </div>
                  </div>
                  
                  {masterEnc.montantTotal ? (
                    <div className="flex items-center gap-2 text-slate-600">
                      <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                        <Banknote className="w-4 h-4 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Montant</p>
                        <p className="text-xs font-black text-slate-700">{masterEnc.montantTotal.toLocaleString()} DA</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}

          {/* Encaissements Uniques */}
          {filteredSingles.map(enc => (
            <div 
              key={enc.id}
              onClick={() => setSelectedSingleEnc(enc)}
              className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all duration-300 cursor-pointer group flex flex-col h-full relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 rounded-bl-full -z-10 group-hover:bg-blue-100/50 transition-colors" />
              
              <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
                <span className="whitespace-nowrap shrink-0 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-wider border border-slate-200">
                  Unique
                </span>
                <span className="whitespace-nowrap shrink-0 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-wider">
                  {getStatusLabel(enc)}
                </span>
              </div>
              
              <h3 className="text-xl font-black text-slate-900 mb-1 leading-tight group-hover:text-blue-600 transition-colors line-clamp-2">
                {enc.client?.name}
              </h3>
              <p className="text-sm font-bold text-slate-500 mb-6">{enc.projectName} - {enc.product}</p>
              
              <div className="mt-auto space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-slate-600">
                  <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phase</p>
                    <p className="text-xs font-bold">{enc.mode} {enc.year ? `(${enc.year})` : ''}</p>
                  </div>
                </div>
                
                {enc.montantTotal ? (
                  <div className="flex items-center gap-2 text-slate-600">
                    <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                      <Banknote className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Montant</p>
                      <p className="text-xs font-black text-slate-700">{enc.montantTotal.toLocaleString()} DA</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ))}

        </div>
      )}

      {selectedDossierId && (
        <FacturationDossierModal 
          dossierId={selectedDossierId}
          client={activeDossiers.find(d => d.dossier.id === selectedDossierId)?.client!}
          encaissements={activeDossiers.find(d => d.dossier.id === selectedDossierId)?.encaissements || []}
          onClose={() => setSelectedDossierId(null)}
        />
      )}

      {selectedSingleEnc && (
        <FacturationSingleModal
          projectId={selectedSingleEnc.projectId}
          projectName={selectedSingleEnc.projectName}
          product={selectedSingleEnc.product}
          client={selectedSingleEnc.client!}
          encaissement={selectedSingleEnc}
          onClose={() => setSelectedSingleEnc(null)}
        />
      )}
    </div>
  );
}
