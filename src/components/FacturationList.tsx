import React, { useState } from 'react';
import { useStore } from '../store';
import { Banknote, Search, MessageSquare, Download, Eye, Clock, Filter } from 'lucide-react';
import { cn } from '../lib/utils';
import { EncaissementRecord, DossierPaiement, Client, Project } from '../types';
import DocumentPreviewModal from './DocumentPreviewModal';

interface FacturationLine {
  id: string;
  isDossier: boolean;
  encaissementId?: string;
  projectId?: string;
  dossierId?: string;
  dateStr: string;
  dateObj: Date;
  numProf: string;
  clientName: string;
  productVersion: string;
  mode: string;
  numBc: string;
  numFacture: string;
  etatProforma: string;
  etatFacture: string;
  emetteur: string;
  potentiel: 'Faible' | 'Moyen' | 'Réalisé' | '';
  encaissementCetteAnnee: 'Probable' | 'Peu probable' | 'Effectué' | '';
  observation: string;
  entity: string; // To filter Naltis, Netsprint, MP
  // Reference object for updates
  dossierRef?: DossierPaiement;
  encaissementRef?: EncaissementRecord;
  isCancelledChild?: boolean;
  children?: FacturationLine[];
  oldProfDraft?: any;
  oldFactDraft?: any;
  isPastFused?: boolean;
}

export default function FacturationList() {
  const { projects, clients, dossiersPaiement, updateEncaissement, updateDossierPaiement } = useStore();
  const [filterEntity, setFilterEntity] = useState<'ALL' | 'Naltis' | 'Netsprint' | 'MP'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Observation Modal state
  const [obsModal, setObsModal] = useState<{ isOpen: boolean, lineId: string, isDossier: boolean, currentText: string, refId: string, projectId?: string } | null>(null);

  // Preview Modal state
  const [previewModalConfig, setPreviewModalConfig] = useState<{
    isOpen: boolean;
    type: 'PROFORMA' | 'FACTURE';
    encaissementId: string;
    projectId: string;
    draftSnapshot?: any;
    isReadOnly?: boolean;
    readOnlyStatus?: string;
  }>({ isOpen: false, type: 'PROFORMA', encaissementId: '', projectId: '' });

  // 1. Compile lines
  const lines: FacturationLine[] = [];

  // A. Independent Encaissements
  projects.forEach(project => {
    const client = clients.find(c => c.id === project.clientId);
    if (!client) return;
    
    const indepEncs = (project.encaissements || []).filter(e => !e.isCombined);
    
    indepEncs.forEach(enc => {
      // 1. Current Active Proforma (if not pending)
      if (enc.proforma?.status !== 'PENDING') {
        let emetteur = enc.emetteur || '';
        if (!emetteur) {
          const profHistory = enc.documentHistory?.find(h => h.documentType === 'PROFORMA');
          if (profHistory) emetteur = profHistory.user || '-';
          else emetteur = '-';
        }

        const profDraft = enc.proforma.draft;
        const factDraft = enc.facture.draft;

        lines.push({
          id: `enc-${enc.id}`,
          isDossier: false,
          encaissementId: enc.id,
          projectId: project.id,
          dateStr: profDraft ? new Date(profDraft.createdAt).toLocaleDateString('fr-FR') : '-',
          dateObj: profDraft ? new Date(profDraft.createdAt) : new Date(0),
          numProf: profDraft?.documentNumber || '-',
          clientName: client.name,
          productVersion: `${project.product} ${project.version ? `/ ${project.version}` : ''}`,
          mode: enc.mode,
          numBc: enc.bc?.documentId || '-',
          numFacture: factDraft?.documentNumber || '-',
          etatProforma: enc.proforma.status,
          etatFacture: enc.facture.status,
          emetteur: emetteur,
          potentiel: enc.potentiel || '',
          encaissementCetteAnnee: enc.encaissementCetteAnnee || '',
          observation: enc.observation || '',
          entity: project.entity || 'Naltis',
          encaissementRef: enc
        });
      }

      // 2. Historical Cancelled Proformas
      const pastProformas = new Map<string, { draft: any, emetteur: string, date: string, isFused: boolean }>();
      
      if (enc.documentHistory) {
         let backwardIsFused = false;
         
         // We can just iterate normally now, no need to track state across events
         for (let i = 0; i < enc.documentHistory.length; i++) {
            const h = enc.documentHistory[i];
            
            if (h.documentType === 'PROFORMA' && h.draftSnapshot && h.draftSnapshot.documentNumber) {
               const num = h.draftSnapshot.documentNumber;
               
               // Skip if it's the current active one
               if (enc.proforma?.status !== 'PENDING' && enc.proforma.draft?.documentNumber === num) {
                  // do nothing
               } else {
                  // Fused proformas are generated with items via FacturationDossierModal.
                  // A true fused proforma combines multiple encaissements, so it will have > 1 items.
                  // Single encaissement dossiers will have exactly 1 item.
                  const isFused = Array.isArray(h.draftSnapshot.items) && h.draftSnapshot.items.length > 1;

                  if (!pastProformas.has(num)) {
                     pastProformas.set(num, { 
                        draft: h.draftSnapshot, 
                        emetteur: h.user || 'Système', 
                        date: h.date, 
                        isFused: isFused 
                     });
                  } else {
                     if (isFused) {
                        pastProformas.get(num)!.isFused = true;
                     }
                  }
               }
            }
         }
      }

      pastProformas.forEach((info, num) => {
         lines.push({
            id: `enc-${enc.id}-past-${num}`,
            isDossier: false,
            encaissementId: enc.id,
            projectId: project.id,
            dateStr: new Date(info.draft.createdAt).toLocaleDateString('fr-FR'),
            dateObj: new Date(info.draft.createdAt),
            numProf: num,
            clientName: client.name,
            productVersion: `${project.product} ${project.version ? `/ ${project.version}` : ''}`,
            mode: enc.mode,
            numBc: enc.bc?.documentId || '-',
            numFacture: '-', // Simplified for cancelled past proformas
            etatProforma: 'CANCELLED',
            etatFacture: 'PENDING',
            emetteur: info.emetteur,
            potentiel: enc.potentiel || '',
            encaissementCetteAnnee: enc.encaissementCetteAnnee || '',
            observation: enc.observation || '',
            entity: project.entity || 'Naltis',
            encaissementRef: enc,
            oldProfDraft: info.draft,
            isPastFused: info.isFused
         });
      });
    });
  });

  // B. Dossiers
  dossiersPaiement.forEach(dossier => {
    const client = clients.find(c => c.id === dossier.clientId);
    if (!client) return;

    // Find the primary encaissement of this dossier
    let primaryEnc: EncaissementRecord | null = null;
    let primaryProj: Project | null = null;
    
    // Also build the product string
    const products: string[] = [];
    const modes = new Set<string>();
    let dossierEntity = 'Naltis';

    for (const projectId of dossier.projectIds) {
      const proj = projects.find(p => p.id === projectId);
      if (proj) {
        if (!primaryProj) {
          primaryProj = proj;
          dossierEntity = proj.entity || 'Naltis';
        }
        products.push(`${proj.product} ${proj.version ? `/ ${proj.version}` : ''}`);
        
        const encs = proj.encaissements?.filter(e => e.combinedWithDossierId === dossier.id || (e as any).dossierId === dossier.id);
        if (encs && encs.length > 0) {
          encs.forEach(e => modes.add(e.mode));
          if (!primaryEnc) {
            // We take the first one that has a proforma draft, or just the first one if none has a draft
            primaryEnc = encs.find(e => e.proforma?.draft) || encs[0];
          }
        }
      }
    }

    if (primaryEnc && primaryEnc.proforma?.status !== 'PENDING') {
      let emetteur = dossier.emetteur || '';
      if (!emetteur) {
        const profHistory = primaryEnc.documentHistory?.find(h => h.documentType === 'PROFORMA');
        if (profHistory) emetteur = profHistory.user || '-';
        else emetteur = '-';
      }

      const profDraft = primaryEnc.proforma.draft;
      const factDraft = primaryEnc.facture.draft;

      const dossierChildren: FacturationLine[] = [];
      for (const projectId of dossier.projectIds) {
        const proj = projects.find(p => p.id === projectId);
        if (proj) {
          const encs = proj.encaissements?.filter(e => e.combinedWithDossierId === dossier.id || (e as any).dossierId === dossier.id);
          if (encs && encs.length > 0) {
            encs.forEach(enc => {
               const profCancelIdx = enc.documentHistory?.findIndex(h => h.action.includes('Facturation individuelle annulée') && h.documentType === 'PROFORMA') ?? -1;
               let oldProfDraft = null;
               let profEmetteur = 'Système';
               if (profCancelIdx > 0) {
                  for (let i = profCancelIdx - 1; i >= 0; i--) {
                     if (enc.documentHistory![i].documentType === 'PROFORMA' && enc.documentHistory![i].draftSnapshot) {
                        oldProfDraft = enc.documentHistory![i].draftSnapshot;
                        profEmetteur = enc.documentHistory![i].user || 'Système';
                        break;
                     }
                  }
               }

               const factCancelIdx = enc.documentHistory?.findIndex(h => h.action.includes('Facturation individuelle annulée') && h.documentType === 'FACTURE') ?? -1;
               let oldFactDraft = null;
               if (factCancelIdx > 0) {
                  for (let i = factCancelIdx - 1; i >= 0; i--) {
                     if (enc.documentHistory![i].documentType === 'FACTURE' && enc.documentHistory![i].draftSnapshot) {
                        oldFactDraft = enc.documentHistory![i].draftSnapshot;
                        break;
                     }
                  }
               }

               dossierChildren.push({
                  id: `child-${enc.id}`,
                  isDossier: false,
                  encaissementId: enc.id,
                  projectId: proj.id,
                  dateStr: oldProfDraft ? new Date(oldProfDraft.createdAt).toLocaleDateString('fr-FR') : '-',
                  dateObj: oldProfDraft ? new Date(oldProfDraft.createdAt) : new Date(0),
                  numProf: oldProfDraft?.documentNumber || '-',
                  clientName: client.name,
                  productVersion: `${proj.product} ${proj.version ? `/ ${proj.version}` : ''}`,
                  mode: enc.mode,
                  numBc: enc.bc?.documentId || '-',
                  numFacture: oldFactDraft?.documentNumber || '-',
                  etatProforma: 'CANCELLED',
                  etatFacture: enc.facture.status === 'CANCELLED' ? 'CANCELLED' : enc.facture.status, // Facture might not be cancelled if not generated
                  emetteur: profEmetteur,
                  potentiel: '',
                  encaissementCetteAnnee: '',
                  observation: '',
                  entity: proj.entity || 'Naltis',
                  encaissementRef: enc,
                  isCancelledChild: true,
                  oldProfDraft,
                  oldFactDraft
               });
            });
          }
        }
      }

      lines.push({
        id: `dos-${dossier.id}`,
        isDossier: true,
        dossierId: dossier.id,
        encaissementId: primaryEnc.id,
        projectId: primaryProj?.id || '',
        dateStr: profDraft ? new Date(profDraft.createdAt).toLocaleDateString('fr-FR') : '-',
        dateObj: profDraft ? new Date(profDraft.createdAt) : new Date(0),
        numProf: profDraft?.documentNumber || '-',
        clientName: client.name,
        productVersion: products.join(' & '),
        mode: Array.from(modes).join(' & '),
        numBc: primaryEnc.bc?.documentId || '-',
        numFacture: factDraft?.documentNumber || '-',
        etatProforma: primaryEnc.proforma.status === 'CANCELLED' ? 'PENDING' : primaryEnc.proforma.status,
        etatFacture: primaryEnc.facture.status === 'CANCELLED' ? 'PENDING' : primaryEnc.facture.status,
        emetteur: emetteur,
        potentiel: dossier.potentiel || '',
        encaissementCetteAnnee: dossier.encaissementCetteAnnee || '',
        observation: dossier.observation || '',
        entity: dossierEntity,
        dossierRef: dossier,
        encaissementRef: primaryEnc,
        children: dossierChildren
      });
    }
  });

  // Sort descending by date
  lines.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());

  // Filter
  const filteredLines = lines.filter(line => {
    const matchEntity = filterEntity === 'ALL' || line.entity === filterEntity;
    const matchSearch = line.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        line.numProf.toLowerCase().includes(searchTerm.toLowerCase());
    return matchEntity && matchSearch;
  }).sort((a, b) => {
    if (a.numProf === '-' && b.numProf !== '-') return 1;
    if (a.numProf !== '-' && b.numProf === '-') return -1;
    if (a.numProf === '-' && b.numProf === '-') return 0;
    return a.numProf.localeCompare(b.numProf);
  });

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return 'En attente';
      case 'GENERATED': return 'Générée';
      case 'TO_VERIFY': return 'Soumise à validation';
      case 'VALIDATED': return 'Validée';
      case 'DEPOSITED': return 'Transmise';
      case 'RECOVERED': return 'Récupéré';
      case 'CANCELLED': return 'Annulée';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'GENERATED': return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'TO_VERIFY': return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'VALIDATED': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'DEPOSITED': return 'bg-purple-50 text-purple-600 border-purple-200';
      case 'RECOVERED': return 'bg-slate-800 text-white border-slate-700';
      case 'CANCELLED': return 'bg-red-50 text-red-600 border-red-200 line-through opacity-70';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Banknote className="w-6 h-6 text-indigo-500" />
            Suivi de Facturation
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Consultez l'historique de toutes les proformas et factures générées.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
          {['ALL', 'Naltis', 'Netsprint', 'MP'].map((ent) => (
            <button
              key={ent}
              onClick={() => setFilterEntity(ent as any)}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all flex-1 sm:flex-none",
                filterEntity === ent
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              {ent === 'ALL' ? 'Toutes les entités' : ent === 'MP' ? 'Micro-Planet' : ent}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Rechercher (Client, N° Prof)..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200/60 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">N° Prof</th>
                <th className="px-4 py-3">Nom du Client</th>
                <th className="px-4 py-3 min-w-[200px]">Produit(s)</th>
                <th className="px-4 py-3 min-w-[150px]">Mode</th>
                <th className="px-4 py-3">N° BC</th>
                <th className="px-4 py-3">Facture</th>
                <th className="px-4 py-3">État</th>
                <th className="px-4 py-3">Émetteur</th>
                <th className="px-4 py-3">Potentiel</th>
                <th className="px-4 py-3">Encaissement</th>
                <th className="px-4 py-3 text-center">Obs.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {filteredLines.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-slate-400 font-medium">
                    Aucune facturation trouvée.
                  </td>
                </tr>
              ) : (
                filteredLines.map(line => (
                  <React.Fragment key={line.id}>
                  <tr className={cn(
                    "hover:bg-slate-50/50 transition-colors group", 
                    line.isDossier ? "bg-purple-50/30" : "",
                    line.etatProforma === 'CANCELLED' && !line.isPastFused ? "opacity-50 bg-slate-100/50 grayscale-[30%]" : "",
                    line.isPastFused ? "bg-purple-50/70" : ""
                  )}>
                    <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">
                      {line.isDossier && <div className="inline-block w-2 h-2 rounded-full bg-purple-500 mr-2 shadow-sm" title="Dossier Fusionné"></div>}
                      {line.isPastFused && <div className="inline-block w-2 h-2 rounded-full bg-purple-400 mr-2 shadow-sm opacity-60" title="Ancienne Proforma Fusionnée Annulée"></div>}
                      {line.dateStr}
                    </td>
                    
                    <td className="px-4 py-3">
                      <button 
                        onClick={() => setPreviewModalConfig({
                          isOpen: true,
                          type: 'PROFORMA',
                          encaissementId: line.encaissementId!,
                          projectId: line.projectId!,
                          isReadOnly: true,
                          readOnlyStatus: line.etatProforma,
                          draftSnapshot: line.oldProfDraft
                        })}
                        className="font-black text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1.5"
                      >
                        {line.numProf} <Eye className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </td>

                    <td className="px-4 py-3 font-extrabold text-slate-900">{line.clientName}</td>
                    
                    <td className="px-4 py-3 text-[11px] font-bold text-slate-600 leading-tight">
                      {line.productVersion.split(' & ').map((prod, idx) => (
                        <div key={idx} className="mb-0.5">{prod}</div>
                      ))}
                    </td>

                    <td className="px-4 py-3 text-[11px] font-bold text-slate-600 leading-tight">
                      {line.mode.split(' & ').map((md, idx) => (
                        <div key={idx} className="mb-0.5">{md}</div>
                      ))}
                    </td>

                    <td className="px-4 py-3 font-bold text-slate-700 whitespace-nowrap">{line.numBc}</td>
                    
                    <td className="px-4 py-3">
                      {line.numFacture !== '-' ? (
                         <button 
                         onClick={() => setPreviewModalConfig({
                           isOpen: true,
                           type: 'FACTURE',
                           encaissementId: line.encaissementId!,
                           projectId: line.projectId!,
                           isReadOnly: true,
                           readOnlyStatus: line.etatFacture,
                           draftSnapshot: line.oldFactDraft
                         })}
                         className="font-black text-emerald-600 hover:text-emerald-800 hover:underline flex items-center gap-1.5"
                       >
                         {line.numFacture} <Eye className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                       </button>
                      ) : '-'}
                    </td>

                    <td className="px-4 py-3 space-y-1.5">
                      <div className={cn("px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-wider inline-block", getStatusColor(line.etatProforma))}>
                        P: {getStatusLabel(line.etatProforma)}
                      </div>
                      <br/>
                      {line.etatFacture !== 'PENDING' && (
                        <div className={cn("px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-wider inline-block", getStatusColor(line.etatFacture))}>
                          F: {getStatusLabel(line.etatFacture)}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 font-semibold text-slate-600 text-[11px] uppercase">{line.emetteur}</td>

                    <td className="px-4 py-3">
                      <select 
                        value={line.potentiel}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          if (line.isDossier && line.dossierId) {
                            updateDossierPaiement(line.dossierId, { potentiel: val });
                          } else if (line.projectId && line.encaissementId) {
                            updateEncaissement(line.projectId, line.encaissementId, { potentiel: val });
                          }
                        }}
                        disabled={line.etatProforma === 'CANCELLED'}
                        className="bg-slate-50 border border-slate-200 rounded text-xs p-1 outline-none focus:border-indigo-500 font-semibold text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Sélectionner</option>
                        <option value="Faible">Faible</option>
                        <option value="Moyen">Moyen</option>
                        <option value="Réalisé">Réalisé</option>
                      </select>
                    </td>

                    <td className="px-4 py-3">
                      <select 
                        value={line.encaissementCetteAnnee}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          if (line.isDossier && line.dossierId) {
                            updateDossierPaiement(line.dossierId, { encaissementCetteAnnee: val });
                          } else if (line.projectId && line.encaissementId) {
                            updateEncaissement(line.projectId, line.encaissementId, { encaissementCetteAnnee: val });
                          }
                        }}
                        disabled={line.etatProforma === 'CANCELLED'}
                        className="bg-slate-50 border border-slate-200 rounded text-xs p-1 outline-none focus:border-indigo-500 font-semibold text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Sélectionner</option>
                        <option value="Probable">Probable</option>
                        <option value="Peu probable">Peu probable</option>
                        <option value="Effectué">Effectué</option>
                      </select>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={() => setObsModal({
                          isOpen: true,
                          lineId: line.id,
                          isDossier: line.isDossier,
                          currentText: line.observation,
                          refId: line.isDossier ? line.dossierId! : line.encaissementId!,
                          projectId: line.projectId
                        })}
                        className={cn(
                          "p-1.5 rounded-lg transition-colors inline-flex",
                          line.observation 
                            ? "bg-amber-100 text-amber-700 hover:bg-amber-200" 
                            : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        )}
                        title={line.observation ? "Voir/Modifier observation" : "Ajouter observation"}
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                  
                  {/* Children lines (Cancelled encaissements) */}
                  {line.children && line.children.length > 0 && [...line.children].sort((a, b) => {
                    if (a.numProf === '-' && b.numProf !== '-') return 1;
                    if (a.numProf !== '-' && b.numProf === '-') return -1;
                    if (a.numProf === '-' && b.numProf === '-') return 0;
                    return a.numProf.localeCompare(b.numProf);
                  }).map(child => (
                    <tr key={child.id} className="bg-slate-50/50 group">
                      <td className="px-4 py-2 font-semibold text-slate-400 whitespace-nowrap pl-8 relative">
                        <div className="absolute left-4 top-0 bottom-1/2 w-px bg-slate-300"></div>
                        <div className="absolute left-4 top-1/2 w-3 h-px bg-slate-300"></div>
                        {child.dateStr}
                      </td>
                      <td className="px-4 py-2 opacity-50">
                        {child.numProf !== '-' ? (
                          <button 
                            onClick={() => setPreviewModalConfig({
                              isOpen: true,
                              type: 'PROFORMA',
                              encaissementId: child.encaissementId!,
                              projectId: child.projectId!,
                              isReadOnly: true,
                              readOnlyStatus: child.etatProforma,
                              draftSnapshot: child.oldProfDraft
                            })}
                            className="font-bold text-slate-500 hover:text-slate-700 hover:underline flex items-center gap-1.5"
                          >
                            <span className="line-through">{child.numProf}</span> <Eye className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-2 font-bold text-slate-500 opacity-60">{child.clientName}</td>
                      <td className="px-4 py-2 text-[11px] font-bold text-slate-400">{child.productVersion}</td>
                      <td className="px-4 py-2 text-[11px] font-bold text-slate-400">{child.mode}</td>
                      <td className="px-4 py-2 font-bold text-slate-400">{child.numBc}</td>
                      <td className="px-4 py-2 opacity-50">-</td>
                      <td className="px-4 py-2">
                        <div className={cn("px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-wider inline-block", getStatusColor(child.etatProforma))}>
                          P: ANNULÉE (FUSION)
                        </div>
                      </td>
                      <td className="px-4 py-2 font-semibold text-slate-400 text-[11px] uppercase">{child.emetteur}</td>
                      <td colSpan={3} className="px-4 py-2 text-slate-400 text-[10px] italic">Reconduite dans le dossier fusionné ci-dessus</td>
                    </tr>
                  ))}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Observation Modal */}
      {obsModal?.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 relative w-full max-w-sm">
            <h3 className="font-extrabold text-slate-900 text-lg mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-500" /> Observation
            </h3>
            <textarea
              autoFocus
              rows={4}
              value={obsModal.currentText}
              onChange={e => setObsModal({ ...obsModal, currentText: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-500 transition-all font-medium text-slate-700 resize-none shadow-inner mb-5"
              placeholder="Saisissez une observation..."
            />
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setObsModal(null)} 
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200"
              >
                Annuler
              </button>
              <button 
                onClick={() => {
                  if (obsModal.isDossier) {
                    updateDossierPaiement(obsModal.refId, { observation: obsModal.currentText });
                  } else if (obsModal.projectId) {
                    updateEncaissement(obsModal.projectId, obsModal.refId, { observation: obsModal.currentText });
                  }
                  setObsModal(null);
                }}
                className="px-4 py-2 bg-amber-500 text-white hover:bg-amber-600 rounded-xl text-xs font-bold shadow-md"
              >
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewModalConfig.isOpen && previewModalConfig.encaissementId && previewModalConfig.projectId && (() => {
         const targetProject = projects.find(p => p.id === previewModalConfig.projectId);
         if (!targetProject) return null;
         const targetEnc = targetProject.encaissements?.find(e => e.id === previewModalConfig.encaissementId);
         if (!targetEnc) return null;
         const client = clients.find(c => c.id === targetProject.clientId);
         if (!client) return null;
         
         const docObj = previewModalConfig.type === 'PROFORMA' ? targetEnc.proforma : targetEnc.facture;
         const draftToUse = previewModalConfig.draftSnapshot || docObj.draft;
         if (!draftToUse) return null; // Should not happen here since we only list generated docs
         
         return (
            <DocumentPreviewModal
               isOpen={true}
               type={previewModalConfig.type}
               client={client}
               project={targetProject}
               encaissement={targetEnc}
               draft={draftToUse}
               status={previewModalConfig.readOnlyStatus || docObj.status}
               isReadOnly={true}
               onClose={() => setPreviewModalConfig({ ...previewModalConfig, isOpen: false })}
            />
         );
      })()}
    </div>
  );
}
