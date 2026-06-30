import React, { useState } from 'react';
import { X, Banknote, FolderKanban, Trash2 } from 'lucide-react';
import { useStore } from '../store';
import { Client, EncaissementRecord } from '../types';
import { cn } from '../lib/utils';
import DocumentPreviewModal from './DocumentPreviewModal';
import { getPrice } from '../lib/pricing';

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
  
  const [previewModalConfig, setPreviewModalConfig] = useState<{ isOpen: boolean; type: 'PROFORMA' | 'FACTURE'; encaissementId?: string; draftSnapshot?: any; isReadOnly?: boolean; readOnlyStatus?: string; projectId?: string }>({
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
              Gestion du Dossier d'encaissement
            </h3>
            <p className="text-slate-500 text-xs font-bold">Dossier fusionné - Client : {client.name}</p>
          </div>
          {encaissements.length > 0 && (
            <button
              onClick={() => {
                if(window.confirm("Êtes-vous sûr de vouloir dissocier ce dossier ? Les encaissements redeviendront indépendants.")) {
                  dissociateDossier(dossierId);
                  onClose();
                }
              }}
              className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm border border-red-100 hover:border-red-600 flex items-center gap-2"
            >
              Dissocier le dossier
            </button>
          )}
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
              <div className="bg-slate-50 border border-slate-200 shadow-sm rounded-2xl p-6 relative overflow-hidden mb-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100">
                    <FolderKanban className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 text-lg">Encaissements inclus</h4>
                    <p className="text-xs font-bold text-slate-500">Liste des encaissements regroupés dans ce dossier</p>
                  </div>
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

              {/* Historique des documents (avant fusion) */}
              {(() => {
                const allHistory = encaissements.flatMap(e => (e.documentHistory || []).map(h => ({ ...h, encaissementName: `${e.mode} ${e.year ? `(Année ${e.year})` : ''} - ${e.projectName}` })));
                if (allHistory.length === 0) return null;
                
                allHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                return (
                  <div className="bg-slate-50 border border-slate-200 shadow-sm rounded-2xl p-6 relative overflow-hidden mb-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100">
                        <Banknote className="w-5 h-5 text-slate-400" />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-800 text-lg">Historique des documents</h4>
                        <p className="text-xs font-bold text-slate-500">Documents générés avant ou pendant la fusion</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {allHistory.map((history, idx) => (
                        <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 flex justify-between items-center shadow-sm">
                          <div>
                            <p className="text-sm font-bold text-slate-800">{history.documentType} - {history.action}</p>
                            <p className="text-[10px] font-semibold text-slate-500 mt-1">{history.encaissementName}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-400 mb-1">{new Date(history.date).toLocaleString('fr-FR')}</p>
                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-[9px] font-bold uppercase">{history.user}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Gestion des documents pour tout le dossier */}
              {(() => {
                // On utilise le premier encaissement comme "base" pour la génération du document.
                // Lors de l'update, store.ts synchronise le statut à tous les encaissements du dossier !
                const enc = encaissements[0];
                
                return (
                   <div key={enc.id} className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 relative overflow-hidden">
                      <div className="bg-purple-50 border border-purple-200 flex flex-col items-center justify-center rounded-2xl p-6 mb-6 text-center">
                        <FolderKanban className="w-10 h-10 mb-3 text-purple-400" />
                        <h5 className="text-sm font-extrabold mb-2 text-purple-900">Gestion globale des documents</h5>
                        <p className="text-xs font-bold max-w-sm text-purple-700">
                          Générez la proforma, le bon de commande et la facture pour l'ensemble du dossier fusionné.<br/>
                          Le statut sera synchronisé pour tous les encaissements inclus.
                        </p>
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
                        onChange={e => updateEncaissement(enc.projectId, enc.id, { proforma: { ...enc.proforma, status: e.target.value as any } })}
                        className="flex-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 transition-colors"
                      >
                        <option value="PENDING">À générer</option>
                        <option value="GENERATED">Générée</option>
                        <option value="TO_VERIFY">À vérifier (DFC)</option>
                        <option value="VALIDATED">Validée</option>
                      </select>
                      <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
                        <button 
                          onClick={() => setPreviewModalConfig({ isOpen: true, type: 'PROFORMA', encaissementId: enc.id, projectId: enc.projectId })}
                          className="px-5 py-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded-xl text-xs font-bold transition-all"
                        >
                          {enc.proforma.status === 'PENDING' ? 'Générer' : 'Ouvrir'}
                        </button>
                        {enc.proforma.status !== 'PENDING' && (
                          <button 
                            onClick={() => {
                              if (window.confirm("Voulez-vous vraiment réinitialiser cette proforma ?")) {
                                updateEncaissement(enc.projectId, enc.id, { proforma: { status: 'PENDING', draft: undefined } });
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
                        onChange={e => updateEncaissement(enc.projectId, enc.id, { bc: { ...enc.bc, status: e.target.value as any } })}
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
                        onChange={e => updateEncaissement(enc.projectId, enc.id, { facture: { ...enc.facture, status: e.target.value as any } })}
                        className="flex-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-emerald-500 transition-colors disabled:bg-slate-50 disabled:text-slate-400"
                        disabled={enc.bc.status !== 'RECOVERED'}
                      >
                        <option value="PENDING">À générer</option>
                        <option value="GENERATED">Générée</option>
                        <option value="VALIDATED">Établie et envoyée</option>
                      </select>
                      <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
                        <button 
                          onClick={() => setPreviewModalConfig({ isOpen: true, type: 'FACTURE', encaissementId: enc.id, projectId: enc.projectId })}
                          className="px-5 py-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:pointer-events-none"
                          disabled={enc.bc.status !== 'RECOVERED'}
                        >
                          {enc.facture.status === 'PENDING' ? 'Générer' : 'Ouvrir'}
                        </button>
                        {enc.facture.status !== 'PENDING' && (
                          <button 
                            onClick={() => {
                              if (window.confirm("Voulez-vous vraiment réinitialiser cette facture ?")) {
                                updateEncaissement(enc.projectId, enc.id, { facture: { status: 'PENDING', draft: undefined } });
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
         let draft = previewModalConfig.draftSnapshot || (previewModalConfig.type === 'PROFORMA' ? targetEnc.proforma.draft : targetEnc.facture.draft);

         if (!draft || !draft.items || draft.items.length === 0) {
            let totalHT = 0;
            const items = encaissements.map(e => {
               if (e.mode === 'Annexe') {
                 const price = e.annexePrice || 0;
                 totalHT += price;
                 return {
                   description: e.annexeName || 'Prestation Annexe',
                   price
                 };
               }

               const p = projects.find(pr => pr.id === e.projectId);
               const prod = p?.product || e.product; // Fallback to e.product if not found
               const vers = p?.version;
               const price = getPrice(prod, vers, e.mode);
               totalHT += price;
               
               const versionStr = vers ? `, Version ${vers}` : '';
               const title = `Logiciel ${prod}${versionStr}`;
               const subtitle = e.mode === 'Acquisition' ? 'Acquisition' : `Maintenance ${e.year ? `Année ${e.year}` : ''}`;
               const description = `${title}\n${subtitle}\n• Monitoring régulier\n• Mises à jour\n• Téléassistance annuelle (Heures de bureau, Du Dimanche au Jeudi)\n• Télé-intervention annuelle (Heures de bureau, Du Dimanche au Jeudi)`.trim();
               
               return {
                 description,
                 price
               };
            });

            const totalTVA = totalHT * 0.19;
            const totalTTC = totalHT + totalTVA;

            draft = {
              documentNumber: `${previewModalConfig.type === 'PROFORMA' ? 'PF' : 'FA'}-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`,
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
               onSaveDraft={(updatedDraft) => {
                  if (previewModalConfig.type === 'PROFORMA') {
                     updateEncaissement(targetProject.id, targetEnc.id, { proforma: { ...targetEnc.proforma, status: 'GENERATED', draft: updatedDraft } });
                  } else {
                     updateEncaissement(targetProject.id, targetEnc.id, { facture: { ...targetEnc.facture, status: 'GENERATED', draft: updatedDraft } });
                  }
               }}
               onSubmitValidation={() => {
                  if (previewModalConfig.type === 'PROFORMA') {
                     updateEncaissement(targetProject.id, targetEnc.id, { proforma: { ...targetEnc.proforma, status: 'TO_VERIFY' } });
                  } else {
                     updateEncaissement(targetProject.id, targetEnc.id, { facture: { ...targetEnc.facture, status: 'TO_VERIFY' } });
                  }
               }}
               onValidate={() => {
                  if (previewModalConfig.type === 'PROFORMA') {
                     updateEncaissement(targetProject.id, targetEnc.id, { proforma: { ...targetEnc.proforma, status: 'VALIDATED' } });
                  } else {
                     updateEncaissement(targetProject.id, targetEnc.id, { facture: { ...targetEnc.facture, status: 'VALIDATED' } });
                  }
               }}
               onDeposit={() => {
                 if (previewModalConfig.type === 'FACTURE') {
                    updateEncaissement(targetProject.id, targetEnc.id, { facture: { ...targetEnc.facture, status: 'VALIDATED' } });
                 }
               }}
            />
         );
      })()}
    </div>
  );
}
