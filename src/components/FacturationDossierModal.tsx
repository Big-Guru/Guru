import React, { useState } from 'react';
import { X, Banknote, FolderKanban, Trash2 } from 'lucide-react';
import { useStore } from '../store';
import { Client, EncaissementRecord } from '../types';
import { cn } from '../lib/utils';
import DocumentPreviewModal from './DocumentPreviewModal';
import { getPrice, getDesignation } from '../lib/pricing';
import { auth } from '../lib/firebase';
import { v4 as uuidv4 } from 'uuid';

interface EnrichedEncaissement extends EncaissementRecord {
  projectId: string;
  projectName: string;
  product: string;
}

interface FacturationDossierModalProps {
  dossierId: string;
  client: Client;
  encaissements: EnrichedEncaissement[];
  onClose: () => void;
}

export default function FacturationDossierModal({ dossierId, client, encaissements, onClose }: FacturationDossierModalProps) {
  const { updateEncaissement, generateMaintenanceEncaissement, dissociateDossier, removeEncaissementFromDossier, projects } = useStore();
  
  const [previewModalConfig, setPreviewModalConfig] = useState<{ isOpen: boolean; type: 'PROFORMA' | 'FACTURE'; encaissementId?: string; draftSnapshot?: any; isReadOnly?: boolean; readOnlyStatus?: string; projectId?: string; autoSave?: boolean }>({
    isOpen: false,
    type: 'PROFORMA'
  });
  const [activeTab, setActiveTab] = useState<'facturation' | 'documents'>('facturation');

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 relative w-full max-w-4xl max-h-[90vh] flex flex-col justify-between overflow-hidden animate-in fade-in zoom-in duration-200">
        <button type="button" onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
        <div className="flex justify-between items-start pr-12 mb-5">
          <div className="space-y-1">
            <h3 className="font-extrabold text-slate-900 text-xl flex items-center gap-3">
              <Banknote className="w-6 h-6 text-emerald-500" />
              Gestion du Dossier d'encaissement
            </h3>
            <p className="text-slate-500 text-xs font-bold">
              {encaissements.length > 1 ? 'Dossier fusionné' : 'Dossier'} - Client : {client.name}
            </p>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-6">
          {encaissements.length === 0 ? (
            <div className="bg-slate-50/50 border border-slate-100 rounded-3xl p-10 text-center">
              <Banknote className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-sm font-bold">Aucun encaissement dans ce dossier.</p>
            </div>
          ) : (
            <>
              {/* Encaissements inclus dans le Dossier */}
              {encaissements.length > 1 && (
              <div className="bg-slate-50 border border-slate-200 shadow-sm rounded-2xl p-6 relative overflow-hidden mb-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100">
                      <FolderKanban className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800 text-lg">Encaissements inclus</h4>
                      <p className="text-xs font-bold text-slate-500">Liste des encaissements regroupés dans ce dossier</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      if(window.confirm("Êtes-vous sûr de vouloir dissocier entièrement ce dossier ?")) {
                         dissociateDossier(dossierId);
                         onClose();
                      }
                    }}
                    className="px-5 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-full font-black text-sm uppercase tracking-wider transition-colors border border-red-100"
                  >
                    DISSOCIER LE DOSSIER
                  </button>
                </div>
                
                <div className="space-y-3">
                  {encaissements.map((enc, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 flex justify-between items-center shadow-sm">
                      <div>
                        <p className="text-sm font-extrabold text-slate-800">{enc.projectName} - {enc.product}</p>
                        <p className="text-xs font-bold text-slate-500 mt-1">
                          <span className="text-indigo-600">{enc.mode} {enc.year ? `(Année ${enc.year})` : ''}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-lg text-[10px] font-black uppercase tracking-wider">Inclus</span>
                        <button 
                          onClick={() => {
                             if(window.confirm("Êtes-vous sûr de vouloir retirer cet encaissement du dossier ? Il redeviendra indépendant.")) {
                                removeEncaissementFromDossier(enc.projectId, enc.id);
                             }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Retirer du dossier"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              )}


              {/* Tabs */}
              <div className="flex gap-4 border-b border-slate-200 mb-6 mt-4">
                <button 
                  onClick={() => setActiveTab('facturation')}
                  className={cn(
                    "pb-3 text-sm font-bold transition-all border-b-2",
                    activeTab === 'facturation' ? "border-purple-500 text-purple-700" : "border-transparent text-slate-500 hover:text-slate-700"
                  )}
                >
                  Facturation
                </button>
                <button 
                  onClick={() => setActiveTab('documents')}
                  className={cn(
                    "pb-3 text-sm font-bold transition-all border-b-2",
                    activeTab === 'documents' ? "border-purple-500 text-purple-700" : "border-transparent text-slate-500 hover:text-slate-700"
                  )}
                >
                  Documents
                </button>
              </div>

              {/* Gestion des documents pour tout le dossier */}
              {(() => {
                // On utilise le premier encaissement comme "base" pour la génération du document.
                // Lors de l'update, store.ts synchronise le statut à tous les encaissements du dossier !
                const enc = encaissements[0];
                
                return (
                    <div key={enc.id} className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 relative overflow-hidden">
                      {encaissements.length > 1 && (
                      <div className="bg-purple-50 border border-purple-200 flex flex-col items-center justify-center rounded-2xl p-6 mb-6 text-center">
                        <FolderKanban className="w-10 h-10 mb-3 text-purple-400" />
                        <h5 className="text-sm font-extrabold mb-2 text-purple-900">Gestion globale des documents</h5>
                        <p className="text-xs font-bold max-w-sm text-purple-700">
                          Générez la proforma, le bon de commande et la facture pour l'ensemble du dossier fusionné.<br/>
                          Le statut sera synchronisé pour tous les encaissements inclus.
                        </p>
                      </div>
                      )}
                      
                      <div className="flex flex-col gap-3 mb-6">
                        {/* 1. PROFORMA */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex flex-wrap sm:flex-nowrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3 w-full sm:w-48 shrink-0">
                        <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-600">1</span>
                        <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">Proforma</span>
                      </div>
                      <select 
                        value={enc.proforma.status} 
                        onChange={e => updateEncaissement(enc.projectId, enc.id, { proforma: { ...enc.proforma, status: e.target.value as any } })}
                        className="flex-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 transition-colors"
                      >
                        <option value="PENDING">À générer</option>
                        <option value="CANCELLED">À générer</option>
                        <option value="GENERATED">Générée</option>
                        <option value="TO_VERIFY">Soumise à validation</option>
                        <option value="VALIDATED">Validée</option>
                        <option value="DEPOSITED">Transmise</option>
                      </select>
                      <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
                        <button 
                          onClick={() => setPreviewModalConfig({ isOpen: true, type: 'PROFORMA', encaissementId: enc.id, projectId: enc.projectId, autoSave: enc.proforma.status === 'PENDING' || enc.proforma.status === 'CANCELLED' })}
                          className="px-5 py-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded-xl text-xs font-bold transition-all"
                        >
                          {(enc.proforma.status === 'PENDING' || enc.proforma.status === 'CANCELLED') ? 'Générer' : 'Ouvrir'}
                        </button>
                        {(enc.proforma.status !== 'PENDING' && enc.proforma.status !== 'CANCELLED') && (
                          <button 
                            onClick={() => {
                              if (window.confirm("Voulez-vous vraiment réinitialiser cette proforma ?")) {
                                updateEncaissement(enc.projectId, enc.id, { proforma: { status: 'PENDING', draft: null as any } });
                              }
                            }}
                            className="px-5 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-xl text-xs font-bold transition-all"
                          >
                            Réinitialiser
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {activeTab === 'documents' && (
                      <>
                    {/* 1.b SOUMISSION */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex flex-wrap sm:flex-nowrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3 w-full sm:w-48 shrink-0">
                        <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-600">-</span>
                        <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">Soumission</span>
                      </div>
                      <select 
                        value={enc.soumission?.status || 'PENDING'} 
                        onChange={e => updateEncaissement(enc.projectId, enc.id, { soumission: { ...(enc.soumission || {}), status: e.target.value as any } })}
                        className="flex-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 transition-colors"
                      >
                        <option value="PENDING">À préparer</option>
                        <option value="GENERATED">Préparée</option>
                        <option value="VALIDATED">Déposée</option>
                      </select>
                    </div>

                    {/* 1.c CONVENTION */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex flex-wrap sm:flex-nowrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3 w-full sm:w-48 shrink-0">
                        <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-600">-</span>
                        <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">Convention</span>
                      </div>
                      <select 
                        value={enc.convention?.status || 'PENDING'} 
                        onChange={e => updateEncaissement(enc.projectId, enc.id, { convention: { ...(enc.convention || {}), status: e.target.value as any } })}
                        className="flex-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 transition-colors"
                      >
                        <option value="PENDING">À préparer</option>
                        <option value="GENERATED">Préparée</option>
                        <option value="VALIDATED">Signée</option>
                      </select>
                    </div>
                    </>
                    )}
                    
                    {activeTab === 'facturation' && (
                      <>
                    {/* 2. BON DE COMMANDE */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex flex-wrap sm:flex-nowrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3 w-full sm:w-48 shrink-0">
                        <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-600">2</span>
                        <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">Bon Commande</span>
                      </div>
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          placeholder="Numéro du BC"
                          value={enc.bc.documentId || ''}
                          onChange={(e) => {
                            const newNum = e.target.value;
                            const isComplete = newNum.trim() !== '' && !!enc.bc.date;
                            updateEncaissement(enc.projectId, enc.id, { 
                              bc: { 
                                ...enc.bc, 
                                documentId: newNum,
                                status: isComplete ? 'RECOVERED' : 'PENDING'
                              } 
                            });
                          }}
                          className="w-1/2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 transition-colors disabled:bg-slate-50 disabled:text-slate-400"
                          disabled={enc.proforma.status !== 'VALIDATED'}
                        />
                        <input
                          type="date"
                          value={enc.bc.date || ''}
                          onChange={(e) => {
                            const newDate = e.target.value;
                            const isComplete = !!enc.bc.documentId?.trim() && newDate !== '';
                            updateEncaissement(enc.projectId, enc.id, { 
                              bc: { 
                                ...enc.bc, 
                                date: newDate,
                                status: isComplete ? 'RECOVERED' : 'PENDING'
                              } 
                            });
                          }}
                          className="w-1/2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 transition-colors disabled:bg-slate-50 disabled:text-slate-400"
                          disabled={enc.proforma.status !== 'VALIDATED'}
                        />
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end min-w-[120px]">
                         {enc.bc.status === 'RECOVERED' && (
                           <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-wider border border-emerald-200">
                             Récupéré
                           </span>
                         )}
                      </div>
                    </div>
                    </>
                    )}
                    
                    {activeTab === 'documents' && (
                      <>
                    {/* 2.b SERVICE FAIT */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex flex-wrap sm:flex-nowrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3 w-full sm:w-48 shrink-0">
                        <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-600">-</span>
                        <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">Service Fait</span>
                      </div>
                      <select 
                        value={enc.serviceFait?.status || 'PENDING'} 
                        onChange={e => updateEncaissement(enc.projectId, enc.id, { serviceFait: { ...(enc.serviceFait || {}), status: e.target.value as any } })}
                        className="flex-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 transition-colors disabled:bg-slate-50 disabled:text-slate-400"
                        disabled={enc.bc.status !== 'RECOVERED'}
                      >
                        <option value="PENDING">À récupérer</option>
                        <option value="RECOVERED">Récupéré</option>
                      </select>
                    </div>
                    </>
                    )}
                    
                    {activeTab === 'facturation' && (
                      <>
                    {/* 3. FACTURE */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex flex-wrap sm:flex-nowrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3 w-full sm:w-48 shrink-0">
                        <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-600">3</span>
                        <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">Facture Déf.</span>
                      </div>
                      <select 
                        value={enc.facture.status} 
                        onChange={e => updateEncaissement(enc.projectId, enc.id, { facture: { ...enc.facture, status: e.target.value as any } })}
                        className="flex-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-emerald-500 transition-colors disabled:bg-slate-50 disabled:text-slate-400"
                        disabled={enc.bc.status !== 'RECOVERED'}
                      >
                        <option value="PENDING">À générer</option>
                        <option value="CANCELLED">Annulée</option>
                        <option value="GENERATED">Générée</option>
                        <option value="TO_VERIFY">Soumise à validation</option>
                        <option value="VALIDATED">Validée</option>
                        <option value="DEPOSITED">Transmise</option>
                      </select>
                      <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
                        <button 
                          onClick={() => setPreviewModalConfig({ isOpen: true, type: 'FACTURE', encaissementId: enc.id, projectId: enc.projectId, autoSave: enc.facture.status === 'PENDING' || enc.facture.status === 'CANCELLED' })}
                          className="px-5 py-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:pointer-events-none"
                          disabled={enc.bc.status !== 'RECOVERED'}
                        >
                          {(enc.facture.status === 'PENDING' || enc.facture.status === 'CANCELLED') ? 'Générer' : 'Ouvrir'}
                        </button>
                        {(enc.facture.status !== 'PENDING' && enc.facture.status !== 'CANCELLED') && (
                          <button 
                            onClick={() => {
                              if (window.confirm("Voulez-vous vraiment réinitialiser cette facture ?")) {
                                updateEncaissement(enc.projectId, enc.id, { facture: { status: 'PENDING', draft: null as any } });
                              }
                            }}
                            className="px-5 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-xl text-xs font-bold transition-all"
                          >
                            Réinitialiser
                          </button>
                        )}
                      </div>
                    </div>
                    </>
                    )}
                    
                    {activeTab === 'documents' && (
                      <>
                    {/* 3.b ABE (Attestation de Bonne Exécution) */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex flex-wrap sm:flex-nowrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3 w-full sm:w-48 shrink-0">
                        <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-600">-</span>
                        <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">ABE</span>
                      </div>
                      <select 
                        value={enc.abe?.status || 'PENDING'} 
                        onChange={e => updateEncaissement(enc.projectId, enc.id, { abe: { ...(enc.abe || {}), status: e.target.value as any } })}
                        className="flex-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 transition-colors disabled:bg-slate-50 disabled:text-slate-400"
                        disabled={enc.facture.status !== 'VALIDATED'}
                      >
                        <option value="PENDING">À récupérer</option>
                        <option value="RECOVERED">Récupérée</option>
                      </select>
                    </div>
                    </>
                    )}
                    
                    {activeTab === 'facturation' && (
                      <>
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
                          onChange={e => updateEncaissement(enc.projectId, enc.id, { montantTotal: parseFloat(e.target.value) })}
                          className="w-1/2 text-xs font-bold text-blue-900 bg-white border border-blue-200 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 transition-colors disabled:bg-slate-50 disabled:text-slate-400" 
                          disabled={enc.facture.status !== 'VALIDATED'}
                        />
                        <input 
                          type="number" placeholder="Encaissé (DA)" 
                          value={enc.montantEncaisse || ''} 
                          onChange={e => updateEncaissement(enc.projectId, enc.id, { montantEncaisse: parseFloat(e.target.value) })}
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
                                updateEncaissement(enc.projectId, enc.id, { status: 'DONE', resteDette: 0 });
                                if (enc.mode === 'Maintenance') generateMaintenanceEncaissement(enc.projectId);
                              } else {
                                const dette = total - encaisse;
                                if (confirm(`Paiement partiel détecté. Une dette de ${dette} DA sera générée et reportée. Confirmer ?`)) {
                                  updateEncaissement(enc.projectId, enc.id, { status: 'PARTIAL', resteDette: dette });
                                  if (enc.mode === 'Maintenance') generateMaintenanceEncaissement(enc.projectId);
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
                    </>
                    )}
                  </div>
                    
                  {enc.resteDette ? (
                    <div className="bg-red-50 text-red-700 text-xs font-bold p-3 rounded-xl border border-red-100 flex items-center justify-between">
                      <span>Dette générée reportée à l'année suivante :</span>
                      <span>{enc.resteDette.toLocaleString()} DA</span>
                    </div>
                  ) : null}
                   </div>
                );
              })()}
            </>
          )}
        </div>
        
        <div className="flex justify-between items-center pt-6 mt-4 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Statut global du dossier :</span>
            <button
              onClick={() => {
                const isDone = encaissements.every(e => e.status === 'DONE');
                const newStatus = isDone ? 'IN_PROGRESS' : 'DONE';
                encaissements.forEach(e => {
                  updateEncaissement(e.projectId, e.id, { status: newStatus });
                  if (newStatus === 'DONE' && e.mode === 'Maintenance') {
                    generateMaintenanceEncaissement(e.projectId);
                  }
                });
              }}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                encaissements.every(e => e.status === 'DONE') ? "bg-emerald-500" : "bg-slate-200"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  encaissements.every(e => e.status === 'DONE') ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
            <span className={cn(
              "text-xs font-bold",
              encaissements.every(e => e.status === 'DONE') ? "text-emerald-600" : "text-slate-500"
            )}>
              {encaissements.every(e => e.status === 'DONE') ? "Réglé" : "Non réglé"}
            </span>
          </div>
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
         let draft = previewModalConfig.draftSnapshot || (previewModalConfig.type === 'PROFORMA' ? targetEnc.proforma.draft : targetEnc.facture.draft);

         if (!draft || !draft.items || draft.items.length === 0) {
            let totalHT = 0;
            const items: { description: string, price: number }[] = [];
            
            // Smart fusion logic: Ignore AVANCE if TOTAL is present in the same dossier for the same contract
            const validEncaissements = encaissements.filter(e => {
               if (e.encaissementType === 'AVANCE' && e.contractId) {
                  const hasTotal = encaissements.some(other => other.contractId === e.contractId && other.encaissementType === 'TOTAL');
                  if (hasTotal) return false;
               }
               return true;
            });

            validEncaissements.forEach(e => {
               const p = targetProject;
               if (!p) return;
               
               if (e.mode === 'Annexe') {
                 const price = e.annexePrice || 0;
                 totalHT += price;
                 items.push({
                   description: e.annexeName || 'Prestation Annexe',
                   price
                 });
                 return;
               }

               const prod = e.product || p.product || 'PAYE';
               const vers = e.version || p.version;
               
               // For independent encaissements, we default to Acquisition base price for percentage calculations
               const priceMode = (e.mode === 'Acquisition' || e.mode === 'Maintenance') ? e.mode : 'Acquisition';
               const basePrice = getPrice(prod, vers, priceMode, client, p, e.pricingParameters);
               let price = basePrice;
               
               if (e.encaissementType === 'AVANCE') {
                  const pct = e.percentage || 30;
                  price = basePrice * (pct / 100);
               } else if (e.encaissementType === 'TOTAL') {
                  if (e.contractId) {
                     // Deduct already paid advances for this contract
                     const paidAvances = (p.encaissements || []).filter(other => 
                        other.contractId === e.contractId && 
                        other.encaissementType === 'AVANCE' && 
                        other.status === 'DONE'
                     );
                     let totalPaid = 0;
                     paidAvances.forEach(pa => {
                        const paPct = pa.percentage || 30;
                        totalPaid += basePrice * (paPct / 100);
                     });
                     price = Math.max(0, basePrice - totalPaid);
                  }
               } else if (e.mode === 'Indépendant') {
                  // Fallback for independent without AVANCE
                  price = basePrice; 
               }

               totalHT += price;
               
               const customDesignation = getDesignation(prod, vers, priceMode, client, p);
               let description = '';
               
               if (customDesignation) {
                  // If user defined a custom designation in Pricing rules, use it!
                  description = customDesignation;
                  if (e.encaissementType === 'AVANCE') {
                     description += `\nAvance (${e.percentage || 30}%)`;
                  } else if (e.encaissementType === 'TOTAL') {
                     const paidAvances = e.contractId ? (p.encaissements || []).filter(other => other.contractId === e.contractId && other.encaissementType === 'AVANCE' && other.status === 'DONE') : [];
                     if (paidAvances.length > 0) {
                        description += `\nSolde (Déduction des avances)`;
                     }
                  }
               } else {
                  const prodConfig = useStore.getState().products.find(p => p.name.toLowerCase() === prod.toLowerCase());
                  let debugInfo = `Désignation non configurée.\nRecherche: Produit='${prod}', Version='${vers}', Entité='${p.entity}'\n`;
                  if (prodConfig && prodConfig.pricingRules) {
                     debugInfo += `${prodConfig.pricingRules.length} règles trouvées:\n`;
                     prodConfig.pricingRules.forEach((r, i) => {
                        debugInfo += `- Règle ${i+1} (Vers='${r.version}', Ent='${r.entity}'): `;
                        if (r.version !== vers) debugInfo += `Version '${r.version}' != '${vers}'. `;
                        if (r.entity !== p.entity) debugInfo += `Entité '${r.entity}' != '${p.entity}'. `;
                        if (r.conditions && Object.keys(r.conditions).length > 0) debugInfo += `Conditions dynamiques présentes. `;
                        if (r.effectifType !== undefined) debugInfo += `effectifType '${r.effectifType}'. `;
                     });
                  }
                  description = debugInfo;
               }

               if (basePrice === 0) {
                  const prodConfig = useStore.getState().products.find(p => p.name.toLowerCase() === prod.toLowerCase());
                  let warnMsg = `[ERREUR PRIX: 0 DA] Vérifiez la Règle Tarifaire.\nProduit cherché: '${prod}' (Version: '${vers}').\nEntité projet: '${p.entity}'.\nClient: Effectif=${client.effectif}, Type=${client.effectifType}.`;
                  if (prodConfig) {
                    warnMsg += `\nRègles trouvées pour ce produit : ${prodConfig.pricingRules.length}\nVeuillez vérifier qu'une des règles correspond EXACTEMENT à ces critères.`;
                  } else {
                    warnMsg += `\nLe produit '${prod}' n'a pas été trouvé dans la liste des produits dynamiques.`;
                  }
                  console.warn(warnMsg);
               }
               
               items.push({
                 description,
                 price
               });
            });

            const tvaRate = targetProject.entity?.toLowerCase() === 'netsprint' ? 0 : 0.19;
            const totalTVA = totalHT * tvaRate;
            const totalTTC = totalHT + totalTVA;

            draft = {
              documentNumber: useStore.getState().getNextDocumentNumber(previewModalConfig.type),
              items,
              totalHT,
              totalTVA,
              totalTTC,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
         }
         
         return (
            <DocumentPreviewModal
               isOpen={true}
               type={previewModalConfig.type}
               client={client}
               project={targetProject}
               encaissement={targetEnc}
               draft={draft}
               status={previewModalConfig.readOnlyStatus || (docStatus === 'PENDING' ? 'GENERATED' : docStatus)}
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
