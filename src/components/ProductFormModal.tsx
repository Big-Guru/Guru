import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';
import { ProductConfig, PricingRule, ProductVersion } from '../types';
import { useStore } from '../store';
import { v4 as uuidv4 } from 'uuid';

interface ProductFormModalProps {
  product?: ProductConfig | null;
  onClose: () => void;
}

export default function ProductFormModal({ product, onClose }: ProductFormModalProps) {
  const { addProduct, updateProduct } = useStore();
  
  const [name, setName] = useState(product?.name || '');
  const [departement, setDepartement] = useState<'D1' | 'D2'>(product?.departement || 'D1');
  const [defaultEntity, setDefaultEntity] = useState<'Naltis' | 'Netsprint' | 'MP'>(product?.defaultEntity || 'Naltis');
  const [maintenancePeriodicity, setMaintenancePeriodicity] = useState<'Mensuelle' | 'Trimestrielle' | 'Semestrielle' | 'Annuelle'>(product?.maintenancePeriodicity || 'Annuelle');
  
  const [pricingRules, setPricingRules] = useState<PricingRule[]>(product?.pricingRules || []);
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'PRICING'>('GENERAL');

  const handleAddRule = () => {
    setPricingRules([
      ...pricingRules,
      {
        id: uuidv4(),
        entity: defaultEntity,
        effectifMin: 0,
        effectifMax: 100,
        effectifType: 'UNIVERSITE',
        version: 'LIGHT',
        acquisitionPrice: 0,
        maintenancePrice: 0
      }
    ]);
  };

  const updateRule = (id: string, updates: Partial<PricingRule>) => {
    setPricingRules(pricingRules.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const deleteRule = (id: string) => {
    setPricingRules(pricingRules.filter(r => r.id !== id));
  };

  const handleSave = () => {
    if (!name.trim()) return;
    
    const productData = {
      name,
      departement,
      defaultEntity,
      maintenancePeriodicity,
      pricingRules
    };

    if (product?.id) {
      updateProduct(product.id, productData);
    } else {
      addProduct(productData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-8 py-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900">
              {product ? 'Modifier le produit' : 'Nouveau Produit'}
            </h2>
            <p className="text-slate-500 font-medium mt-1">Paramétrez le produit et sa grille tarifaire</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 overflow-hidden bg-slate-50/50">
          
          {/* Tabs */}
          <div className="flex justify-between items-center border-b border-slate-200 px-8 pt-4">
            <div className="flex">
              <button
                onClick={() => setActiveTab('GENERAL')}
                className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors ${
                  activeTab === 'GENERAL' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Informations Générales
              </button>
              <button
                onClick={() => setActiveTab('PRICING')}
                className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors ${
                  activeTab === 'PRICING' 
                    ? 'border-indigo-600 text-indigo-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Planche Tarifaire
              </button>
            </div>
            {activeTab === 'PRICING' && (
              <button
                onClick={handleAddRule}
                className="flex items-center gap-2 px-4 py-2 mb-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Ajouter une règle
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-8">
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm min-h-[400px]">
              
              {activeTab === 'GENERAL' ? (
                /* General Info */
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-sm">1</span>
                    Configuration de base
                  </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Nom du produit</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 block p-3.5 transition-all font-medium"
                    placeholder="Ex: PAYE, BUDGET..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Département</label>
                  <select
                    value={departement}
                    onChange={(e) => setDepartement(e.target.value as 'D1' | 'D2')}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 block p-3.5 transition-all font-medium"
                  >
                    <option value="D1">D1</option>
                    <option value="D2">D2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Entité par défaut</label>
                  <select
                    value={defaultEntity}
                    onChange={(e) => setDefaultEntity(e.target.value as 'Naltis' | 'Netsprint' | 'MP')}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 block p-3.5 transition-all font-medium"
                  >
                    <option value="Naltis">Naltis</option>
                    <option value="Netsprint">NetSprint</option>
                    <option value="MP">Micro Planete</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Processus d'intégration (Maintenance)</label>
                  <select
                    value={maintenancePeriodicity}
                    onChange={(e) => setMaintenancePeriodicity(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 block p-3.5 transition-all font-medium"
                  >
                    <option value="Annuelle">Annuelle</option>
                    <option value="Semestrielle">Semestrielle</option>
                    <option value="Trimestrielle">Trimestrielle</option>
                    <option value="Mensuelle">Mensuelle</option>
                  </select>
                </div>
              </div>
                </div>
              ) : (
              /* Pricing Rules */
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm">2</span>
                  Règles Tarifaires
                </h3>
              </div>

              {pricingRules.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 border border-slate-200/60 border-dashed rounded-3xl">
                  <p className="text-slate-500 font-medium">Aucune règle tarifaire définie pour ce produit.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pricingRules.map((rule, index) => (
                    <div key={rule.id} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col gap-4 relative group">
                      <button 
                        onClick={() => deleteRule(rule.id)}
                        className="absolute -top-3 -right-3 p-2 bg-white text-red-500 hover:bg-red-50 rounded-full border border-slate-200 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Supprimer la règle"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex-1 min-w-[150px]">
                          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Entité</label>
                          <select
                            value={rule.entity}
                            onChange={(e) => updateRule(rule.id, { entity: e.target.value as any })}
                            className="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500/20 p-2.5 font-medium"
                          >
                            <option value="Naltis">Naltis</option>
                            <option value="Netsprint">NetSprint</option>
                            <option value="MP">Micro Planete</option>
                          </select>
                        </div>
                        
                        <div className="flex-1 min-w-[150px]">
                          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Type Effectif</label>
                          <select
                            value={rule.effectifType}
                            onChange={(e) => updateRule(rule.id, { effectifType: e.target.value as any })}
                            className="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500/20 p-2.5 font-medium"
                          >
                            <option value="UNIVERSITE">Université</option>
                            <option value="EH_DA">EH/DA</option>
                          </select>
                        </div>

                        <div className="flex-1 min-w-[120px]">
                          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">De (Min)</label>
                          <input
                            type="number"
                            value={rule.effectifMin}
                            onChange={(e) => updateRule(rule.id, { effectifMin: parseInt(e.target.value) || 0 })}
                            className="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500/20 p-2.5 font-medium"
                          />
                        </div>

                        <div className="flex-1 min-w-[120px]">
                          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">À (Max)</label>
                          <input
                            type="number"
                            value={rule.effectifMax}
                            onChange={(e) => updateRule(rule.id, { effectifMax: parseInt(e.target.value) || 0 })}
                            className="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500/20 p-2.5 font-medium"
                          />
                        </div>

                        <div className="flex-1 min-w-[150px]">
                          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Version</label>
                          <select
                            value={rule.version}
                            onChange={(e) => updateRule(rule.id, { version: e.target.value as ProductVersion })}
                            className="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500/20 p-2.5 font-medium"
                          >
                            <option value="ULTRALIGHT">UltraLight</option>
                            <option value="LIGHT">Light</option>
                            <option value="INTERMEDIATE">Intermediate</option>
                            <option value="ADVANCED">Advanced</option>
                            <option value="GLOBAL">Global</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 flex-wrap mt-2">
                        <div className="flex-1 min-w-[200px]">
                          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Prix Acquisition (DZD)</label>
                          <input
                            type="number"
                            value={rule.acquisitionPrice}
                            onChange={(e) => updateRule(rule.id, { acquisitionPrice: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-white border border-slate-200 text-blue-600 text-sm rounded-xl focus:ring-2 focus:ring-blue-500/20 p-2.5 font-bold"
                          />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Prix Maintenance (DZD)</label>
                          <input
                            type="number"
                            value={rule.maintenancePrice}
                            onChange={(e) => updateRule(rule.id, { maintenancePrice: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-white border border-slate-200 text-indigo-600 text-sm rounded-xl focus:ring-2 focus:ring-blue-500/20 p-2.5 font-bold"
                          />
                        </div>
                      </div>

                      <div className="mt-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Désignation facturation (Optionnel - Supporte plusieurs lignes)</label>
                        <textarea
                          value={rule.designation || ''}
                          onChange={(e) => updateRule(rule.id, { designation: e.target.value })}
                          placeholder={"Ex:\nLogiciel Paye, Version ULTRALIGHT\nAcquisition\n• Monitoring régulier\n• Mises à jour"}
                          rows={6}
                          className="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500/20 p-3 font-medium whitespace-pre-wrap"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-slate-100 bg-white shrink-0 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            Enregistrer le produit
          </button>
        </div>
      </div>
    </div>
  );
}
