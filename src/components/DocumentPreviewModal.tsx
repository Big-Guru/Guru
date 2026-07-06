import React, { useState, useEffect } from 'react';
import { X, FileText, Check, Download, Send, Edit2, AlertCircle, Save } from 'lucide-react';
import { DocumentDraft, Client, Project, EncaissementRecord, InvoicingStepStatus, DocumentHistoryEvent } from '../types';
import { generateWordDocument } from '../lib/docxGenerator';
import { useStore } from '../store';
import { cn } from '../lib/utils';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'PROFORMA' | 'FACTURE';
  client: Client;
  project: Project;
  encaissement: EncaissementRecord;
  draft: DocumentDraft;
  status: string;
  isReadOnly?: boolean;
  autoSave?: boolean;
  onSaveDraft?: (draft: DocumentDraft, actionLabel?: string) => void;
  onSubmitValidation?: () => void;
  onValidate?: () => void;
  onDeposit?: () => void;
}

export default function DocumentPreviewModal({
  isOpen,
  onClose,
  type,
  client,
  project,
  encaissement,
  draft,
  status,
  isReadOnly = false,
  autoSave = false,
  onSaveDraft,
  onSubmitValidation,
  onValidate,
  onDeposit
}: DocumentPreviewModalProps) {
  const [editedDraft, setEditedDraft] = useState<DocumentDraft>(draft);
  const [isEditing, setIsEditing] = useState(false);
  const [hasAutoSaved, setHasAutoSaved] = useState(false);
  
  useEffect(() => {
    setEditedDraft(draft);
  }, [draft]);
  const { addDocumentHistoryEvent } = useStore();

  // Auto-save removed to prevent duplicate history entries on initial generation

  if (!isOpen) return null;

  const handleSave = () => {
    if (onSaveDraft) onSaveDraft({ ...editedDraft, updatedAt: new Date().toISOString() }, 'Brouillon enregistré');
    onClose();
  };

  const handleDownload = async () => {
    try {
      // In this version, generateWordDocument uses getPrice inside it. 
      // But we now have an edited draft. We would need to update docxGenerator to accept the draft directly.
      // For now, let's pass the draft to docxGenerator. We need to update docxGenerator.ts next.
      await generateWordDocument(type, editedDraft.documentNumber, client, project, encaissement, editedDraft);
      
      // Log history
      addDocumentHistoryEvent(project.id, encaissement.id, {
        date: new Date().toISOString(),
        documentType: type,
        action: 'Téléchargée (Word)',
        draftSnapshot: editedDraft
      });
    } catch (e) {
      alert("Erreur lors du téléchargement.");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 shadow-2xl rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              type === 'PROFORMA' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
            )}>
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Aperçu : {type === 'PROFORMA' ? 'Proforma' : 'Facture Déf.'}</h2>
              <p className="text-xs font-bold text-slate-500">
                Statut actuel : {
                  status === 'GENERATED' ? 'Brouillon (Modifiable)' :
                  status === 'TO_VERIFY' ? 'En attente de validation' :
                  status === 'VALIDATED' ? 'Validée (Prête)' :
                  status === 'DEPOSITED' ? 'Transmise' : status
                }
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          
          {status === 'VALIDATED' && !isReadOnly && (
             <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
               <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
               <div>
                 <h4 className="font-bold text-emerald-900 text-sm">Document Validé</h4>
                 <p className="text-xs text-emerald-700 mt-1">Ce document a été vérifié et validé. Il est prêt à être téléchargé et imprimé.</p>
               </div>
             </div>
          )}
          {isReadOnly && (
             <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
               <FileText className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
               <div>
                 <h4 className="font-bold text-blue-900 text-sm">Mode Archive (Historique)</h4>
                 <p className="text-xs text-blue-700 mt-1">Vous visualisez une ancienne version de ce document.</p>
               </div>
             </div>
          )}

          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-900">{type === 'PROFORMA' ? 'FACTURE PROFORMA' : 'FACTURE'}</h3>
                {isEditing ? (
                  <input 
                    value={editedDraft.documentNumber}
                    onChange={e => setEditedDraft({...editedDraft, documentNumber: e.target.value})}
                    className="mt-2 text-sm font-bold text-slate-700 border-b-2 border-blue-500 outline-none w-48 focus:bg-blue-50 px-1"
                    placeholder="N° Document"
                  />
                ) : (
                  <p className="mt-2 text-sm font-bold text-slate-500">N° {editedDraft.documentNumber}</p>
                )}
              </div>
              <div className="text-right">
                <p className="font-black text-slate-800">{client.name}</p>
                <p className="text-xs text-slate-500 mt-1 max-w-[200px]">{client.address}</p>
                <p className="text-xs text-slate-400 mt-1">NIF: {client.nif || 'N/A'}</p>
              </div>
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-900">
                  <th className="py-3 font-bold text-xs text-slate-500 uppercase tracking-wider">Désignation</th>
                  <th className="py-3 font-bold text-xs text-slate-500 uppercase tracking-wider text-right">Montant HT</th>
                </tr>
              </thead>
              <tbody>
                {editedDraft.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-100">
                    <td className="py-4 pr-4">
                      {isEditing ? (
                        <textarea 
                          value={item.description}
                          onChange={e => {
                            const newItems = [...editedDraft.items];
                            newItems[idx].description = e.target.value;
                            setEditedDraft({...editedDraft, items: newItems});
                          }}
                          rows={6}
                          className="w-full text-sm font-medium text-slate-700 border-b border-blue-300 outline-none focus:bg-blue-50 px-2 py-2 resize-y rounded-t-md"
                        />
                      ) : (
                        <div className="text-sm font-medium text-slate-700 whitespace-pre-wrap">{item.description}</div>
                      )}
                    </td>
                    <td className="py-4 text-right">
                      {isEditing ? (
                        <input 
                          type="number"
                          value={item.price}
                          onChange={e => {
                            const newPrice = parseFloat(e.target.value) || 0;
                            const newItems = [...editedDraft.items];
                            newItems[idx].price = newPrice;
                            const newTotalHT = newItems.reduce((acc, curr) => acc + curr.price, 0);
                            const newTVA = newTotalHT * 0.19;
                            setEditedDraft({
                              ...editedDraft, 
                              items: newItems,
                              totalHT: newTotalHT,
                              totalTVA: newTVA,
                              totalTTC: newTotalHT + newTVA
                            });
                          }}
                          className="w-32 text-sm font-bold text-slate-900 border-b border-blue-300 outline-none focus:bg-blue-50 px-1 py-1 text-right"
                        />
                      ) : (
                        <p className="text-sm font-bold text-slate-900">{new Intl.NumberFormat('fr-DZ').format(item.price)} DA</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-8 w-64 ml-auto">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-500">Total HT</span>
                <span className="text-sm font-black text-slate-900">{new Intl.NumberFormat('fr-DZ').format(editedDraft.totalHT)} DA</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-500">TVA (19%)</span>
                <span className="text-sm font-black text-slate-900">{new Intl.NumberFormat('fr-DZ').format(editedDraft.totalTVA)} DA</span>
              </div>
              <div className="flex justify-between py-3 border-b-2 border-slate-900">
                <span className="text-sm font-black text-slate-900">Total TTC</span>
                <span className="text-lg font-black text-blue-600">{new Intl.NumberFormat('fr-DZ').format(editedDraft.totalTTC)} DA</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-white border-t border-slate-200 p-6 flex items-center justify-between">
          <div className="flex gap-2">
            {(status === 'PENDING' || status === 'CANCELLED' || status === 'GENERATED' || status === 'TO_VERIFY') && (
              <>
                <button 
                  onClick={() => setIsEditing(!isEditing)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-colors",
                    isEditing 
                      ? "bg-blue-100 text-blue-700 hover:bg-blue-200" 
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  )}
                >
                  <Edit2 className="w-4 h-4" />
                  {isEditing ? 'Terminer modification' : 'Modifier'}
                </button>
                
                <button 
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-bold uppercase transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Sauvegarder
                </button>
              </>
            )}
          </div>

          <div className="flex gap-3">
            {isReadOnly ? (
               <button 
                 onClick={handleDownload}
                 className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-lg shadow-blue-600/20"
               >
                 <Download className="w-4 h-4" />
                 Télécharger cette version
               </button>
            ) : (
              <>
                {(status === 'PENDING' || status === 'CANCELLED' || status === 'GENERATED') && (
                  <button 
                    onClick={() => {
                      if (onSaveDraft) onSaveDraft({ ...editedDraft, updatedAt: new Date().toISOString() });
                      if (onSubmitValidation) onSubmitValidation();
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white hover:bg-amber-600 rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-lg shadow-amber-500/20"
                  >
                    <Send className="w-4 h-4" />
                    Soumettre à Validation
                  </button>
                )}

                {status === 'TO_VERIFY' && (
                  <button 
                    onClick={() => {
                      if (onSaveDraft) onSaveDraft({ ...editedDraft, updatedAt: new Date().toISOString() });
                      if (onValidate) onValidate();
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-lg shadow-emerald-500/20"
                  >
                    <Check className="w-4 h-4" />
                    Valider ce document
                  </button>
                )}

                {(status === 'VALIDATED' || status === 'DEPOSITED') && (
                  <>
                    <button 
                      onClick={handleDownload}
                      className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-lg shadow-blue-600/20"
                    >
                      <Download className="w-4 h-4" />
                      Télécharger Word
                    </button>
                    {status === 'VALIDATED' && (
                      <button 
                        onClick={() => {
                          if (onDeposit) onDeposit();
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white hover:bg-purple-700 rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-lg shadow-purple-600/20"
                      >
                        <AlertCircle className="w-4 h-4" />
                        Marquer Transmise
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
