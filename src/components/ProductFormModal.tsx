import React, { useState } from 'react';
import { X, Plus, Trash2, Save, Settings2, ChevronDown, ChevronUp } from 'lucide-react';
import { ProductConfig, PricingRule, PricingCriteria } from '../types';
import { useStore } from '../store';
import { v4 as uuidv4 } from 'uuid';

interface ProductFormModalProps {
  product?: ProductConfig | null;
  onClose: () => void;
}

export default function ProductFormModal({ product, onClose }: ProductFormModalProps) {
  const { addProduct, updateProduct, pricingModels, addPricingModel } = useStore();
  
  const [name, setName] = useState(product?.name || '');
  const [departement, setDepartement] = useState<'D1' | 'D2'>(product?.departement || 'D1');
  const [defaultEntity, setDefaultEntity] = useState<'Naltis' | 'Netsprint' | 'MP'>(product?.defaultEntity || 'Naltis');
  const [maintenancePeriodicity, setMaintenancePeriodicity] = useState<'Mensuelle' | 'Trimestrielle' | 'Semestrielle' | 'Annuelle'>(product?.maintenancePeriodicity || 'Annuelle');
  
  const [pricingCriteria, setPricingCriteria] = useState<PricingCriteria[]>(product?.pricingCriteria || []); // Kept for legacy
  const [pricingModelType, setPricingModelType] = useState<'RANGE' | 'STANDARD'>(product?.pricingModel?.type || 'STANDARD');
  const [pricingModelOption, setPricingModelOption] = useState<'UNIVERSITE' | 'EH_DA' | 'PUBLIC' | 'PRIVE'>(product?.pricingModel?.option || 'PRIVE');
  const [pricingModelName, setPricingModelName] = useState(product?.pricingModel?.name || '');
  
  const [versions, setVersions] = useState<string[]>(product?.versions || product?.pricingModel?.versions || ['Standard']);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>(product?.pricingRules || []);
  
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'VARIABLES' | 'PRICING'>('GENERAL');
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);

  const addVersion = () => setVersions([...versions, 'Nouvelle Version']);
  const updateVersion = (index: number, val: string) => {
    const newVers = [...versions];
    newVers[index] = val;
    setVersions(newVers);
  };
  const removeVersion = (index: number) => setVersions(versions.filter((_, i) => i !== index));

  const savePricingModel = () => {
    if (!pricingModelName.trim()) {
      alert("Veuillez donner un nom au modèle pour l'enregistrer.");
      return;
    }
    const isUpdate = pricingModels.some(m => m.name.toLowerCase() === pricingModelName.toLowerCase());
    addPricingModel({
      id: uuidv4(),
      name: pricingModelName,
      type: pricingModelType,
      option: pricingModelOption,
      versions
    });
    alert(isUpdate ? "Modèle mis à jour avec succès !" : "Modèle enregistré avec succès !");
  };

  const loadPricingModel = (modelId: string) => {
    const model = pricingModels.find(m => m.id === modelId);
    if (model) {
      setPricingModelType(model.type);
      setPricingModelOption(model.option);
      setPricingModelName(model.name);
      setVersions(model.versions);
    }
  };

  // Pricing Rule Management
  const handleAddRule = () => {
    const newId = uuidv4();
    setPricingRules([
      ...pricingRules,
      {
        id: newId,
        entity: defaultEntity,
        version: versions[0] || 'Standard',
        conditions: {},
        acquisitionPrice: 0,
        maintenancePrice: 0
      }
    ]);
    setExpandedRuleId(newId);
  };

  const updateRule = (id: string, updates: Partial<PricingRule>) => {
    setPricingRules(pricingRules.map(r => r.id === id ? { ...r, ...updates } : r));
  };
  const updateRuleCondition = (id: string, key: string, value: any) => {
    setPricingRules(pricingRules.map(r => {
      if (r.id === id) {
        return { ...r, conditions: { ...r.conditions, [key]: value } };
      }
      return r;
    }));
  };
  const updateRuleConditionRange = (id: string, key: string, minOrMax: 'min' | 'max', value: number) => {
    setPricingRules(pricingRules.map(r => {
      if (r.id === id) {
        const currentCond = (r.conditions || {})[key] || {};
        return { ...r, conditions: { ...r.conditions, [key]: { ...currentCond, [minOrMax]: value } } };
      }
      return r;
    }));
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
      pricingCriteria, // Kept for legacy compatibility
      pricingModel: {
        id: product?.pricingModel?.id || uuidv4(),
        name: pricingModelName || `${name} Model`,
        type: pricingModelType,
        option: pricingModelOption,
        versions
      },
      versions,
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
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-8 py-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900">
              {product ? 'Modifier le produit' : 'Nouveau Produit'}
            </h2>
            <p className="text-slate-500 font-medium mt-1">Paramétrez le produit et sa grille tarifaire dynamique</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 overflow-hidden bg-slate-50/50">
          
          {/* Tabs */}
          <div className="flex justify-between items-center border-b border-slate-200 px-8 pt-4">
            <div className="flex overflow-x-auto">
              <button
                onClick={() => setActiveTab('GENERAL')}
                className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'GENERAL' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Informations Générales
              </button>
              <button
                onClick={() => setActiveTab('VARIABLES')}
                className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'VARIABLES' 
                    ? 'border-emerald-600 text-emerald-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Critères & Versions
              </button>
              <button
                onClick={() => setActiveTab('PRICING')}
                className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
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
                className="flex items-center gap-2 px-4 py-2 mb-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl transition-all shadow-sm shrink-0 ml-4"
              >
                <Plus className="w-4 h-4" />
                Ajouter une règle
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-8">
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm min-h-[400px]">
              
              {activeTab === 'GENERAL' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-sm">1</span>
                    Configuration de base
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Nom du produit</label>
                      <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl p-3.5" placeholder="Ex: PAYE, Site Web..." />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Département</label>
                      <select value={departement} onChange={(e) => setDepartement(e.target.value as any)} className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl p-3.5">
                        <option value="D1">D1</option>
                        <option value="D2">D2</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Entité par défaut</label>
                      <select value={defaultEntity} onChange={(e) => setDefaultEntity(e.target.value as any)} className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl p-3.5">
                        <option value="Naltis">Naltis</option>
                        <option value="Netsprint">NetSprint</option>
                        <option value="MP">Micro Planete</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Périodicité Maintenance</label>
                      <select value={maintenancePeriodicity} onChange={(e) => setMaintenancePeriodicity(e.target.value as any)} className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl p-3.5">
                        <option value="Annuelle">Annuelle</option>
                        <option value="Semestrielle">Semestrielle</option>
                        <option value="Trimestrielle">Trimestrielle</option>
                        <option value="Mensuelle">Mensuelle</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'VARIABLES' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm">2</span>
                    Critères de tarification & Versions
                  </h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Pricing Model */}
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-slate-700">Modèle de Tarification</h4>
                        <div className="flex gap-2">
                          <select 
                            className="text-xs border border-slate-200 rounded-lg p-1.5 bg-slate-50 text-slate-700 font-medium max-w-[150px]"
                            onChange={(e) => loadPricingModel(e.target.value)}
                            value=""
                          >
                            <option value="" disabled>Charger un modèle...</option>
                            {pricingModels.map(m => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      
                      <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-4">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Type de Modèle</label>
                          <select 
                            value={pricingModelType} 
                            onChange={e => {
                              setPricingModelType(e.target.value as any);
                              setPricingModelOption(e.target.value === 'RANGE' ? 'UNIVERSITE' : 'PRIVE');
                            }} 
                            className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white mt-1"
                          >
                            <option value="STANDARD">Standard (Sans plage)</option>
                            <option value="RANGE">Plage Numérique (Min-Max)</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Option / Cible</label>
                          <select 
                            value={pricingModelOption} 
                            onChange={e => setPricingModelOption(e.target.value as any)} 
                            className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white mt-1"
                          >
                            {pricingModelType === 'RANGE' ? (
                              <>
                                <option value="UNIVERSITE">Universités</option>
                                <option value="EH_DA">EH / DA</option>
                              </>
                            ) : (
                              <>
                                <option value="PRIVE">Privé</option>
                                <option value="PUBLIC">Public</option>
                              </>
                            )}
                          </select>
                        </div>
                        
                        <div className="pt-4 border-t border-slate-200">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Sauvegarder ce modèle</label>
                          <div className="flex gap-2 mt-1">
                            <input 
                              type="text" 
                              value={pricingModelName} 
                              onChange={e => setPricingModelName(e.target.value)} 
                              placeholder="Nom du modèle..." 
                              className="flex-1 text-xs p-2 border border-slate-200 rounded-lg bg-white"
                            />
                            <button 
                              onClick={savePricingModel}
                              className="px-3 py-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                            >
                              <Save className="w-3 h-3" />
                              Enregistrer
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Versions */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-slate-700">Versions disponibles</h4>
                        <button onClick={addVersion} className="text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"><Plus className="w-3 h-3"/> Ajouter</button>
                      </div>
                      
                      {versions.length === 0 ? (
                        <p className="text-sm text-slate-400 italic">Aucune version définie.</p>
                      ) : (
                        <div className="space-y-2">
                          {versions.map((ver, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                              <input type="text" value={ver} onChange={e => updateVersion(idx, e.target.value)} className="flex-1 text-sm p-2 border border-slate-200 rounded-lg" />
                              <button onClick={() => removeVersion(idx)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'PRICING' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm">3</span>
                      Règles Tarifaires Dynamiques
                    </h3>
                  </div>

                  {pricingRules.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 border border-slate-200/60 border-dashed rounded-3xl">
                      <p className="text-slate-500 font-medium">Aucune règle définie. Ajoutez-en une avec le bouton en haut à droite.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pricingRules.map((rule, index) => {
                        const ruleConditions = rule.conditions || {};
                        const isExpanded = expandedRuleId === rule.id;
                        
                        return (
                        <div key={rule.id} className="bg-white border border-slate-200 rounded-2xl flex flex-col relative group shadow-sm overflow-hidden transition-all duration-200">
                          
                          {/* Accordion Header */}
                          <div 
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={() => setExpandedRuleId(isExpanded ? null : rule.id)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                #{index + 1}
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-800 text-sm">
                                  {rule.entity} - {rule.version || 'Toutes versions'}
                                </h4>
                                <div className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-2">
                                  <span>Acq: {rule.acquisitionPrice} DZD</span>
                                  <span>•</span>
                                  <span>Maint: {rule.maintenancePrice} DZD</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={(e) => { e.stopPropagation(); deleteRule(rule.id); }} 
                                className="p-2 bg-white text-red-500 hover:bg-red-50 rounded-full shadow-sm transition-colors border border-slate-200"
                                title="Supprimer la règle"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <div className="p-2 text-slate-400">
                                {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                              </div>
                            </div>
                          </div>

                          {/* Accordion Content */}
                          {isExpanded && (
                            <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                              <div className="flex flex-wrap gap-4 items-end border-b border-slate-200 pb-4">
                                {/* Base Rule config */}
                                <div className="flex-1 min-w-[150px]">
                                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Entité</label>
                                  <select value={rule.entity} onChange={e => updateRule(rule.id, { entity: e.target.value as any })} className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20">
                                    <option value="Naltis">Naltis</option>
                                    <option value="Netsprint">NetSprint</option>
                                    <option value="MP">Micro Planete</option>
                                  </select>
                                </div>
                                <div className="flex-1 min-w-[150px]">
                                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Version</label>
                                  <select value={rule.version || ''} onChange={e => updateRule(rule.id, { version: e.target.value })} className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20">
                                    {versions.map(v => <option key={v} value={v}>{v}</option>)}
                                  </select>
                                </div>
                                <div className="flex-1 min-w-[150px]">
                                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Prix Acq. (DZD)</label>
                                  <input type="number" value={rule.acquisitionPrice} onChange={e => updateRule(rule.id, { acquisitionPrice: parseFloat(e.target.value)||0 })} className="w-full bg-white border border-slate-200 text-blue-600 p-2.5 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20" />
                                </div>
                                <div className="flex-1 min-w-[150px]">
                                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Prix Maint. (DZD)</label>
                                  <input type="number" value={rule.maintenancePrice} onChange={e => updateRule(rule.id, { maintenancePrice: parseFloat(e.target.value)||0 })} className="w-full bg-white border border-slate-200 text-indigo-600 p-2.5 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20" />
                                </div>
                              </div>

                              {/* Specific fields depending on Pricing Model Type */}
                              {pricingModelType === 'RANGE' && (
                                <div className="flex flex-wrap gap-4 items-end bg-slate-50 p-4 rounded-xl border border-slate-200 mt-2">
                                  <div className="w-full text-xs font-bold text-slate-500 flex items-center gap-1 mb-1"><Settings2 className="w-3 h-3"/> Paramètres de la plage d'effectif ({pricingModelOption === 'UNIVERSITE' ? 'Universités' : pricingModelOption === 'EH_DA' ? 'EH / DA' : pricingModelOption})</div>
                                  
                                  <div className="flex gap-2 flex-1 min-w-[200px]">
                                    <div className="flex-1">
                                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Effectif (Min)</label>
                                      <input 
                                        type="number" 
                                        value={rule.effectifMin ?? ''} 
                                        onChange={e => updateRule(rule.id, { effectifMin: e.target.value ? parseInt(e.target.value) : undefined })} 
                                        className="w-full bg-white border border-slate-200 p-2 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500/20" 
                                        placeholder="Ex: 0"
                                      />
                                    </div>
                                    <div className="flex-1">
                                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Effectif (Max)</label>
                                      <input 
                                        type="number" 
                                        value={rule.effectifMax ?? ''} 
                                        onChange={e => updateRule(rule.id, { effectifMax: e.target.value ? parseInt(e.target.value) : undefined })} 
                                        className="w-full bg-white border border-slate-200 p-2 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500/20" 
                                        placeholder="Ex: 50"
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              <div className="flex flex-col md:flex-row gap-4 mt-2">
                                <div className="flex-1">
                                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Désignation Acquisition (Optionnel)</label>
                                  <textarea
                                    value={rule.designation || ''}
                                    onChange={(e) => updateRule(rule.id, { designation: e.target.value })}
                                    placeholder={"Ex:\nLogiciel, Version Standard\nAcquisition"}
                                    rows={3}
                                    className="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500/20 p-3 font-medium whitespace-pre-wrap"
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Désignation Maintenance (Optionnel)</label>
                                  <textarea
                                    value={rule.maintenanceDesignation || ''}
                                    onChange={(e) => updateRule(rule.id, { maintenanceDesignation: e.target.value })}
                                    placeholder={"Ex:\nContrat de maintenance\nMonitoring & Mises à jour"}
                                    rows={3}
                                    className="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500/20 p-3 font-medium whitespace-pre-wrap"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-slate-100 bg-white shrink-0 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Annuler</button>
          <button onClick={handleSave} disabled={!name.trim()} className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            <Save className="w-4 h-4" />
            Enregistrer le produit
          </button>
        </div>
      </div>
    </div>
  );
}
