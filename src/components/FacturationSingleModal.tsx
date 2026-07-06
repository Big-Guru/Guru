import React, { useState } from 'react';
import { X, Banknote } from 'lucide-react';
import { useStore } from '../store';
import { Client, EncaissementRecord } from '../types';
import DocumentPreviewModal from './DocumentPreviewModal';
import { auth } from '../lib/firebase';
import { v4 as uuidv4 } from 'uuid';
import { FileText } from 'lucide-react';

interface FacturationSingleModalProps {
  projectId: string;
  projectName: string;
  product: string;
  client: Client;
  encaissement: EncaissementRecord;
  onClose: () => void;
}

export default function FacturationSingleModal({ projectId, projectName, product, client, encaissement: enc, onClose }: FacturationSingleModalProps) {
  const { updateEncaissement, generateMaintenanceEncaissement, projects } = useStore();
  const [previewModalConfig, setPreviewModalConfig] = useState<{ isOpen: boolean; type: 'PROFORMA' | 'FACTURE'; encaissementId?: string; draftSnapshot?: any; isReadOnly?: boolean; readOnlyStatus?: string; projectId?: string; autoSave?: boolean }>({
    isOpen: false,
    type: 'PROFORMA'
  });

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 relative w-full max-w-4xl max-h-[90vh] flex flex-col justify-between overflow-hidden animate-in fade-in zoom-in duration-200">
        <button type="button" onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
        <div className="flex justify-between items-start pr-12 mb-5">
          <div className="space-y-1">
            <h3 className="font-extrabold text-slate-900 text-xl flex items-center gap-3">
              <Banknote className="w-6 h-6 text-emerald-500" />
              Gestion de l'encaissement
            </h3>
            <p className="text-slate-500 text-xs font-bold">Client : {client.name} - Projet : {projectName}</p>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-6">
           <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 relative overflow-hidden">
              <div className="flex justify-between items-start mb-6 gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h4 className="font-black text-slate-900 text-lg break-words">{projectName} - {product}</h4>
                  </div>
                  <span className="text-slate-500 text-xs font-bold mt-2 block">Phase : {enc.mode} {enc.year ? `(Année ${enc.year})` : ''} • Début : {new Date(enc.targetDate).toLocaleDateString('fr-FR')}</span>
                </div>
                <span className={cn(
                  "whitespace-nowrap shrink-0 mt-1 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest",
                  enc.status === 'PARTIAL' ? 'bg-amber-100 text-amber-700' : 
                  enc.status === 'DONE' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                )}>{enc.status === 'PARTIAL' ? 'Paiement Partiel' : enc.status === 'DONE' ? 'Terminé' : 'En Cours'}</span>
              </div>
              
              <div className="flex flex-col gap-3 mb-6">
                {/* 1. PROFORMA */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex flex-wrap sm:flex-nowrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3 w-full sm:w-48 shrink-0">
                    <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-600">1</span>
                    <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">Proforma</span>
                  </div>
                  <select 
                    value={enc.proforma.status} 
                    onChange={e => updateEncaissement(projectId, enc.id, { proforma: { ...enc.proforma, status: e.target.value as any } })}
                    className="flex-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="PENDING">À générer</option>
                    <option value="GENERATED">Générée</option>
                    <option value="TO_VERIFY">Soumise à validation</option>
                    <option value="VALIDATED">Validée</option>
                    <option value="DEPOSITED">Transmise</option>
                  </select>
                  <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
                    <button 
                      onClick={() => setPreviewModalConfig({ isOpen: true, type: 'PROFORMA', encaissementId: enc.id, projectId: projectId, autoSave: enc.proforma.status === 'PENDING' })}
                      className="px-5 py-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded-xl text-xs font-bold transition-all"
                    >
                      {enc.proforma.status === 'PENDING' ? 'Générer' : 'Ouvrir'}
                    </button>
                    {enc.proforma.status !== 'PENDING' && (
                      <button 
                        onClick={() => {
                          if (window.confirm("Voulez-vous vraiment réinitialiser cette proforma ?")) {
                            updateEncaissement(projectId, enc.id, { proforma: { status: 'PENDING', draft: undefined } });
                          }
                        }}
                        className="px-5 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-xl text-xs font-bold transition-all"
                      >
                        Réinitialiser
                      </button>
                    )}
                  </div>
                </div>
                
                {/* 2. BON DE COMMANDE */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex flex-wrap sm:flex-nowrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3 w-full sm:w-48 shrink-0">
                    <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-600">2</span>
                    <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">Bon Commande</span>
                  </div>
                  <select 
                    value={enc.bc.status} 
                    onChange={e => updateEncaissement(projectId, enc.id, { bc: { ...enc.bc, status: e.target.value as any } })}
                    className="flex-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 transition-colors disabled:bg-slate-50 disabled:text-slate-400"
                    disabled={enc.proforma.status !== 'VALIDATED'}
                  >
                    <option value="PENDING">En attente</option>
                    <option value="RECOVERED">Récupéré</option>
                  </select>
                  <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end min-w-[120px]">
                  </div>
                </div>
                
                {/* 3. FACTURE */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex flex-wrap sm:flex-nowrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3 w-full sm:w-48 shrink-0">
                    <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-600">3</span>
                    <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">Facture Déf.</span>
                  </div>
                  <select 
                    value={enc.facture.status} 
                    onChange={e => updateEncaissement(projectId, enc.id, { facture: { ...enc.facture, status: e.target.value as any } })}
                    className="flex-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-emerald-500 transition-colors disabled:bg-slate-50 disabled:text-slate-400"
                    disabled={enc.bc.status !== 'RECOVERED'}
                  >
                    <option value="PENDING">À générer</option>
                    <option value="GENERATED">Générée</option>
                    <option value="TO_VERIFY">Soumise à validation</option>
                    <option value="VALIDATED">Validée</option>
                    <option value="DEPOSITED">Transmise</option>
                  </select>
                  <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
                    <button 
                      onClick={() => setPreviewModalConfig({ isOpen: true, type: 'FACTURE', encaissementId: enc.id, projectId: projectId, autoSave: enc.facture.status === 'PENDING' })}
                      className="px-5 py-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:pointer-events-none"
                      disabled={enc.bc.status !== 'RECOVERED'}
                    >
                      {enc.facture.status === 'PENDING' ? 'Générer' : 'Ouvrir'}
                    </button>
                    {enc.facture.status !== 'PENDING' && (
                      <button 
                        onClick={() => {
                          if (window.confirm("Voulez-vous vraiment réinitialiser cette facture ?")) {
                            updateEncaissement(projectId, enc.id, { facture: { status: 'PENDING', draft: undefined } });
                          }
                        }}
                        className="px-5 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-xl text-xs font-bold transition-all"
                      >
                        Réinitialiser
                      </button>
                    )}
                  </div>
                </div>
                
                {/* 4. PAIEMENT */}
                <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-100 flex flex-wrap sm:flex-nowrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3 w-full sm:w-48 shrink-0">
                    <span className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center text-[11px] font-bold text-blue-800">4</span>
                    <span className="font-bold text-xs text-blue-800 uppercase tracking-wider">Paiement</span>
                  </div>
                  <div className="flex flex-1 gap-3">
                    <input 
                      type="number" placeholder="Total (DA)" 
                      value={enc.montantTotal || ''} 
                      onChange={e => updateEncaissement(projectId, enc.id, { montantTotal: parseFloat(e.target.value) })}
                      className="w-1/2 text-xs font-bold text-blue-900 bg-white border border-blue-200 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 transition-colors disabled:bg-slate-50 disabled:text-slate-400" 
                      disabled={enc.facture.status !== 'VALIDATED'}
                    />
                    <input 
                      type="number" placeholder="Encaissé (DA)" 
                      value={enc.montantEncaisse || ''} 
                      onChange={e => updateEncaissement(projectId, enc.id, { montantEncaisse: parseFloat(e.target.value) })}
                      className="w-1/2 text-xs font-bold text-blue-900 bg-white border border-blue-200 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 transition-colors disabled:bg-slate-50 disabled:text-slate-400" 
                      disabled={enc.facture.status !== 'VALIDATED'}
                    />
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end min-w-[120px]">
                    {enc.montantTotal && enc.montantEncaisse !== undefined && (
                      <button 
                        onClick={() => {
                          const total = enc.montantTotal || 0;
                          const encaisse = enc.montantEncaisse || 0;
                          if (encaisse >= total) {
                            updateEncaissement(projectId, enc.id, { status: 'DONE', resteDette: 0 });
                            if (enc.mode === 'Maintenance') generateMaintenanceEncaissement(projectId);
                          } else {
                            const dette = total - encaisse;
                            if (confirm(`Paiement partiel détecté. Une dette de ${dette} DA sera générée et reportée. Confirmer ?`)) {
                              updateEncaissement(projectId, enc.id, { status: 'PARTIAL', resteDette: dette });
                              if (enc.mode === 'Maintenance') generateMaintenanceEncaissement(projectId);
                            }
                          }
                        }}
                        className="w-full px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20"
                      >
                        Valider Paiement
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              {enc.resteDette ? (
                <div className="bg-red-50 text-red-700 text-xs font-bold p-3 rounded-xl border border-red-100 flex items-center justify-between">
                  <span>Dette générée reportée à l'année suivante :</span>
                  <span>{enc.resteDette.toLocaleString()} DA</span>
                </div>
              ) : null}
              

           </div>
        </div>
        
        <div className="flex justify-end pt-6 mt-4 border-t border-slate-100 gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold">Fermer</button>
        </div>
      </div>
      
      {/* Preview Modal */}
      {previewModalConfig.isOpen && previewModalConfig.encaissementId && previewModalConfig.projectId && (() => {
         const targetProject = projects.find(p => p.id === previewModalConfig.projectId);
         if (!targetProject) return null;
         const targetEnc = targetProject.encaissements?.find(e => e.id === previewModalConfig.encaissementId);
         if (!targetEnc) return null;
         
         const docStatus = previewModalConfig.type === 'PROFORMA' ? targetEnc.proforma.status : targetEnc.facture.status;
         const draft = previewModalConfig.draftSnapshot || (previewModalConfig.type === 'PROFORMA' ? targetEnc.proforma.draft : targetEnc.facture.draft) || {
            documentNumber: useStore.getState().getNextDocumentNumber(previewModalConfig.type),
            createdAt: new Date().toISOString(),
            items: [],
            totalHT: 0,
            tva: 0,
            totalTTC: 0,
            montantToutesTaxesComprises: ''
         };
         
         return (
            <DocumentPreviewModal
               isOpen={true}
               type={previewModalConfig.type}
               client={client}
               project={targetProject}
               encaissement={targetEnc}
               draft={draft}
               status={previewModalConfig.readOnlyStatus || docStatus}
               isReadOnly={previewModalConfig.isReadOnly}
               onClose={() => setPreviewModalConfig({ isOpen: false, type: 'PROFORMA' })}
               autoSave={previewModalConfig.autoSave}
               onSaveDraft={(updatedDraft, actionLabel) => {
                  const currentUser = auth.currentUser;
                  const userName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Utilisateur';
                  if (previewModalConfig.type === 'PROFORMA') {
                     const newHistory = [...(targetEnc.documentHistory || []), { id: uuidv4(), date: new Date().toISOString(), documentType: 'PROFORMA' as const, action: actionLabel || 'Brouillon mis à jour', draftSnapshot: updatedDraft, user: userName }];
                     updateEncaissement(targetProject.id, targetEnc.id, { 
                        proforma: { ...targetEnc.proforma, status: 'GENERATED', draft: updatedDraft },
                        documentHistory: newHistory
                     });
                  } else {
                     const newHistory = [...(targetEnc.documentHistory || []), { id: uuidv4(), date: new Date().toISOString(), documentType: 'FACTURE' as const, action: actionLabel || 'Brouillon mis à jour', draftSnapshot: updatedDraft, user: userName }];
                     updateEncaissement(targetProject.id, targetEnc.id, { 
                        facture: { ...targetEnc.facture, status: 'GENERATED', draft: updatedDraft },
                        documentHistory: newHistory
                     });
                  }
               }}
               onSubmitValidation={() => {
                  const currentUser = auth.currentUser;
                  const userName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Utilisateur';
                  if (previewModalConfig.type === 'PROFORMA') {
                     const newHistory = [...(targetEnc.documentHistory || []), { id: uuidv4(), date: new Date().toISOString(), documentType: 'PROFORMA' as const, action: 'Soumise à validation', user: userName }];
                     updateEncaissement(targetProject.id, targetEnc.id, { 
                        proforma: { ...targetEnc.proforma, status: 'TO_VERIFY' },
                        documentHistory: newHistory
                     });
                  } else {
                     const newHistory = [...(targetEnc.documentHistory || []), { id: uuidv4(), date: new Date().toISOString(), documentType: 'FACTURE' as const, action: 'Soumise à validation', user: userName }];
                     updateEncaissement(targetProject.id, targetEnc.id, { 
                        facture: { ...targetEnc.facture, status: 'TO_VERIFY' },
                        documentHistory: newHistory
                     });
                  }
               }}
               onValidate={() => {
                  const currentUser = auth.currentUser;
                  const userName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Utilisateur';
                  if (previewModalConfig.type === 'PROFORMA') {
                     const newHistory = [...(targetEnc.documentHistory || []), { id: uuidv4(), date: new Date().toISOString(), documentType: 'PROFORMA' as const, action: 'Validée', user: userName }];
                     updateEncaissement(targetProject.id, targetEnc.id, { 
                        proforma: { ...targetEnc.proforma, status: 'VALIDATED' },
                        documentHistory: newHistory
                     });
                  } else {
                     const newHistory = [...(targetEnc.documentHistory || []), { id: uuidv4(), date: new Date().toISOString(), documentType: 'FACTURE' as const, action: 'Validée', user: userName }];
                     updateEncaissement(targetProject.id, targetEnc.id, { 
                        facture: { ...targetEnc.facture, status: 'VALIDATED' },
                        documentHistory: newHistory
                     });
                  }
               }}
               onDeposit={() => {
                 const currentUser = auth.currentUser;
                 const userName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Utilisateur';
                 if (previewModalConfig.type === 'PROFORMA') {
                    const newHistory = [...(targetEnc.documentHistory || []), { id: uuidv4(), date: new Date().toISOString(), documentType: 'PROFORMA' as const, action: 'Transmise', user: userName }];
                    updateEncaissement(targetProject.id, targetEnc.id, { 
                       proforma: { ...targetEnc.proforma, status: 'DEPOSITED' },
                       documentHistory: newHistory
                    });
                 } else {
                    const newHistory = [...(targetEnc.documentHistory || []), { id: uuidv4(), date: new Date().toISOString(), documentType: 'FACTURE' as const, action: 'Transmise', user: userName }];
                    updateEncaissement(targetProject.id, targetEnc.id, { 
                       facture: { ...targetEnc.facture, status: 'DEPOSITED' },
                       documentHistory: newHistory
                    });
                 }
               }}
            />
         );
      })()}
    </div>
  );
}
