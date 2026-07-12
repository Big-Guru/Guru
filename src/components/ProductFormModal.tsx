import React, { useState } from 'react';
import { X, Plus, Trash2, Save, Settings2, ChevronDown, ChevronUp } from 'lucide-react';
import { ProductConfig, PricingRule, PricingCriteria, Phase } from '../types';
import { useStore } from '../store';
import { v4 as uuidv4 } from 'uuid';

interface ProductFormModalProps {
  product?: ProductConfig | null;
  onClose: () => void;
}

export default function ProductFormModal({ product, onClose }: ProductFormModalProps) {
  const { addProduct, updateProduct, pricingModels, addPricingModel, productionModels, addProductionModel, deleteProductionModel, pricingBoards, addPricingBoard } = useStore();
  
  const [name, setName] = useState(product?.name || '');
  const [departement, setDepartement] = useState<'D1' | 'D2'>(product?.departement || 'D1');
  const [defaultEntity, setDefaultEntity] = useState<'Naltis' | 'Netsprint' | 'MP'>(product?.defaultEntity || 'Naltis');
  const [maintenancePeriodicity, setMaintenancePeriodicity] = useState<'Mensuelle' | 'Trimestrielle' | 'Semestrielle' | 'Annuelle'>(product?.maintenancePeriodicity || 'Annuelle');
  const [processType, setProcessType] = useState<'STANDARD' | 'DIRECT_MAINTENANCE' | 'MAINTENANCE_ONLY'>(product?.processType || 'STANDARD');
  
  const [pricingCriteria, setPricingCriteria] = useState<PricingCriteria[]>(product?.pricingCriteria || []); // Kept for legacy
  const [pricingModelType, setPricingModelType] = useState<'RANGE' | 'STANDARD'>(product?.pricingModel?.type || 'STANDARD');
  const [pricingModelOption, setPricingModelOption] = useState<'UNIVERSITE' | 'EH_DA' | 'PUBLIC' | 'PRIVE'>(product?.pricingModel?.option || 'PRIVE');
  const [pricingModelName, setPricingModelName] = useState(product?.pricingModel?.name || '');
  
  const [selectedProductionModelId, setSelectedProductionModelId] = useState<string>('');
  const [selectedPricingBoardId, setSelectedPricingBoardId] = useState<string>('');
  
  const [versions, setVersions] = useState<string[]>(product?.versions || product?.pricingModel?.versions || ['Standard']);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>(product?.pricingRules || []);
  
  const [customPhases, setCustomPhases] = useState<Phase[]>(product?.customPhases || []);
  const [maintenanceTriggerTask, setMaintenanceTriggerTask] = useState<string>(product?.maintenanceTriggerTask || '');

  const [activeTab, setActiveTab] = useState<'GENERAL' | 'VARIABLES' | 'PRICING' | 'PRODUCTION'>('GENERAL');
  const [activeEntityTab, setActiveEntityTab] = useState<'Naltis' | 'Netsprint' | 'MP'>('Naltis');
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

  const saveProductionModel = () => {
    const modelName = window.prompt("Entrez le nom du modèle de production à sauvegarder :");
    if (!modelName || !modelName.trim()) return;

    addProductionModel({
      name: modelName.trim(),
      phases: customPhases
    });
    alert("Modèle de production enregistré avec succès !");
  };

  const loadProductionModel = (modelId: string) => {
    if (!modelId) return;
    const model = productionModels.find(m => m.id === modelId);
    if (model) {
      if (customPhases.length > 0) {
        if (!window.confirm("Attention, le chargement de ce modèle va écraser vos phases actuelles. Continuer ?")) {
          setSelectedProductionModelId('');
          return;
        }
      }
      // Clone the phases to ensure new UUIDs for everything so it doesn't conflict
      const newPhases = model.phases.map(p => ({
        ...p,
        id: uuidv4(),
        tasks: p.tasks.map(t => ({ ...t, id: uuidv4() }))
      }));
      setCustomPhases(newPhases);
      setSelectedProductionModelId('');
      alert(`Modèle "${model.name}" chargé avec succès !`);
    }
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

  const savePricingBoard = () => {
    const rulesToSave = pricingRules.filter(r => r.entity === activeEntityTab);
    if (rulesToSave.length === 0) {
      alert(`Il n'y a aucune règle pour ${activeEntityTab} à sauvegarder.`);
      return;
    }

    const boardName = window.prompt(`Entrez le nom de la planche tarifaire pour ${activeEntityTab} :`);
    if (!boardName || !boardName.trim()) return;

    addPricingBoard({
      name: boardName.trim(),
      rules: rulesToSave
    });
    alert(`Planche tarifaire enregistrée avec succès !`);
  };

  const loadPricingBoard = (boardId: string) => {
    if (!boardId) return;
    const board = pricingBoards?.find(b => b.id === boardId);
    if (board) {
      const mode = window.confirm(`Voulez-vous REMPLACER vos règles ${activeEntityTab} par ce modèle ?\\n\\n[OK] = Remplacer\\n[Annuler] = Ajouter à la suite`);
      
      const newRules = board.rules.map(r => ({
        ...r,
        id: uuidv4(),
        entity: activeEntityTab // Force the entity to the active tab
      }));

      if (mode) {
        // Remove existing rules for this entity and add the new ones
        setPricingRules([
          ...pricingRules.filter(r => r.entity !== activeEntityTab),
          ...newRules
        ]);
      } else {
        // Just append the new ones
        setPricingRules([...pricingRules, ...newRules]);
      }
      setSelectedPricingBoardId('');
      alert(`Planche "${board.name}" chargée dans l'onglet ${activeEntityTab} avec succès !`);
    }
  };

  const cloneFromEntity = (sourceEntity: 'Naltis' | 'Netsprint' | 'MP') => {
    const sourceRules = pricingRules.filter(r => r.entity === sourceEntity);
    if (sourceRules.length === 0) {
      alert(`Il n'y a aucune règle dans l'onglet ${sourceEntity} à cloner.`);
      return;
    }

    if (window.confirm(`Voulez-vous cloner les ${sourceRules.length} règles de ${sourceEntity} vers ${activeEntityTab} ?`)) {
      const clonedRules = sourceRules.map(r => ({
        ...r,
        id: uuidv4(),
        entity: activeEntityTab
      }));
      setPricingRules([...pricingRules, ...clonedRules]);
      alert(`Règles clonées avec succès !`);
    }
  };

  // Pricing Rule Management
  const handleAddRule = () => {
    const newId = uuidv4();
    setPricingRules([
      ...pricingRules,
      {
        id: newId,
        entity: activeEntityTab,
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

  // Phase & Task Management
  const addPhase = () => {
    setCustomPhases([
      ...customPhases,
      {
        id: uuidv4(),
        name: 'Démarchage',
        status: 'PENDING',
        tasks: []
      }
    ]);
  };

  const removePhase = (phaseId: string) => {
    setCustomPhases(customPhases.filter(p => p.id !== phaseId));
  };

  const updatePhaseName = (phaseId: string, newName: any) => {
    setCustomPhases(customPhases.map(p => p.id === phaseId ? { ...p, name: newName } : p));
  };

  const addTaskToPhase = (phaseId: string) => {
    setCustomPhases(customPhases.map(p => {
      if (p.id === phaseId) {
        return {
          ...p,
          tasks: [...p.tasks, { id: uuidv4(), name: 'Nouvelle tâche', date: '', status: 'PENDING' }]
        };
      }
      return p;
    }));
  };

  const removeTaskFromPhase = (phaseId: string, taskId: string) => {
    setCustomPhases(customPhases.map(p => {
      if (p.id === phaseId) {
        return {
          ...p,
          tasks: p.tasks.filter(t => t.id !== taskId)
        };
      }
      return p;
    }));
  };

  const updateTaskName = (phaseId: string, taskId: string, newName: string) => {
    setCustomPhases(customPhases.map(p => {
      if (p.id === phaseId) {
        return {
          ...p,
          tasks: p.tasks.map(t => t.id === taskId ? { ...t, name: newName } : t)
        };
      }
      return p;
    }));
  };

  const handleSave = () => {
    if (!name.trim()) return;
    
    const productData = {
      name,
      departement,
      defaultEntity,
      maintenancePeriodicity,
      processType,
      pricingCriteria, // Kept for legacy compatibility
      pricingModel: {
        id: product?.pricingModel?.id || uuidv4(),
        name: pricingModelName || `${name} Model`,
        type: pricingModelType,
        option: pricingModelOption,
        versions
      },
      versions,
      pricingRules,
      customPhases,
      maintenanceTriggerTask
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
              <button
                onClick={() => setActiveTab('PRODUCTION')}
                className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'PRODUCTION' 
                    ? 'border-fuchsia-600 text-fuchsia-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Production & Tâches
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
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Type de Processus</label>
                      <select value={processType} onChange={(e) => setProcessType(e.target.value as any)} className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl p-3.5">
                        <option value="STANDARD">Standard (Acquisition + Maint. Gratuite + Maint. Annuelle)</option>
                        <option value="DIRECT_MAINTENANCE">Sans Maintenance Gratuite (Acquisition + Maint. Annuelle)</option>
                        <option value="MAINTENANCE_ONLY">Maintenance Uniquement</option>
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
                  
                  {/* Entity Sub-tabs */}
                  <div className="flex bg-slate-100 p-1 rounded-xl mb-6 self-start w-fit">
                    {(['Naltis', 'Netsprint', 'MP'] as const).map(entity => (
                      <button
                        key={entity}
                        onClick={() => setActiveEntityTab(entity)}
                        className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${
                          activeEntityTab === entity
                            ? 'bg-white text-indigo-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                        }`}
                      >
                        {entity}
                      </button>
                    ))}
                  </div>

                  {/* Load Pricing Board */}
                  <div className="mb-6 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-indigo-900 mb-1">Modèles de Planches Tarifaires</h4>
                      <p className="text-xs font-medium text-indigo-700/70">Chargez un modèle pré-enregistré dans l'onglet actuel ({activeEntityTab}).</p>
                    </div>
                    <div className="flex-1 max-w-sm flex gap-2">
                      <select
                        value={selectedPricingBoardId}
                        onChange={(e) => setSelectedPricingBoardId(e.target.value)}
                        className="flex-1 bg-white border border-indigo-200 text-slate-900 text-sm font-bold rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50 disabled:text-slate-400"
                        disabled={!pricingBoards || pricingBoards.length === 0}
                      >
                        <option value="">
                          {(!pricingBoards || pricingBoards.length === 0) ? "Aucun modèle enregistré" : "Sélectionner un modèle..."}
                        </option>
                        {pricingBoards && pricingBoards.map(b => (
                          <option key={b.id} value={b.id}>{b.name} ({b.rules.length} règles)</option>
                        ))}
                      </select>
                      <button
                        onClick={() => loadPricingBoard(selectedPricingBoardId)}
                        disabled={!selectedPricingBoardId}
                        className="px-4 py-2 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors shrink-0"
                      >
                        Charger
                      </button>
                    </div>
                  </div>

                  {/* Clone Shortcut */}
                  <div className="mb-6 flex gap-2">
                    {['Naltis', 'Netsprint', 'MP'].filter(e => e !== activeEntityTab).map(source => (
                      <button
                        key={`clone-${source}`}
                        onClick={() => cloneFromEntity(source as any)}
                        disabled={pricingRules.filter(r => r.entity === source).length === 0}
                        className="text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Cloner depuis {source}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm">3</span>
                      Règles Tarifaires : {activeEntityTab}
                    </h3>
                  </div>

                  {pricingRules.filter(r => r.entity === activeEntityTab).length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 border border-slate-200/60 border-dashed rounded-3xl">
                      <p className="text-slate-500 font-medium">Aucune règle définie pour {activeEntityTab}. Ajoutez-en une avec le bouton en haut à droite.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pricingRules.filter(r => r.entity === activeEntityTab).map((rule, index) => {
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
                                    <option value="Netsprint">Netsprint</option>
                                    <option value="MP">MP</option>
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

                  {/* Save Pricing Board */}
                  {pricingRules.length > 0 && (
                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={savePricingBoard}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-bold rounded-xl shadow-sm transition-all"
                      >
                        <Save className="w-4 h-4 text-indigo-600" />
                        Enregistrer comme modèle de planche
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'PRODUCTION' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  
                  {/* Load Production Model */}
                  <div className="mb-6 p-4 bg-fuchsia-50 rounded-2xl border border-fuchsia-100 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-fuchsia-900 mb-1">Charger un modèle de production</h4>
                      <p className="text-xs font-medium text-fuchsia-700/70">Sélectionnez un modèle pré-enregistré pour importer ses phases et tâches.</p>
                    </div>
                    <div className="flex-1 max-w-sm flex gap-2">
                      <select
                        value={selectedProductionModelId}
                        onChange={(e) => setSelectedProductionModelId(e.target.value)}
                        className="flex-1 bg-white border border-fuchsia-200 text-slate-900 text-sm font-bold rounded-xl px-3 py-2 focus:ring-2 focus:ring-fuchsia-500/20 disabled:bg-slate-50 disabled:text-slate-400"
                        disabled={!productionModels || productionModels.length === 0}
                      >
                        <option value="">
                          {(!productionModels || productionModels.length === 0) ? "Aucun modèle enregistré" : "Sélectionner un modèle..."}
                        </option>
                        {productionModels && productionModels.map(m => (
                          <option key={m.id} value={m.id}>{m.name} ({m.phases.length} phases)</option>
                        ))}
                      </select>
                      <button
                        onClick={() => loadProductionModel(selectedProductionModelId)}
                        disabled={!selectedProductionModelId}
                        className="px-4 py-2 bg-fuchsia-600 text-white font-bold text-sm rounded-xl hover:bg-fuchsia-700 disabled:opacity-50 transition-colors shrink-0"
                      >
                        Charger
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-fuchsia-100 text-fuchsia-600 flex items-center justify-center text-sm">4</span>
                    Configuration de la Production (Contrat Acquisition)
                  </h3>
                  <button
                    onClick={addPhase}
                    className="flex items-center gap-2 px-4 py-2 bg-fuchsia-100 text-fuchsia-700 hover:bg-fuchsia-200 text-sm font-bold rounded-xl transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter une Phase
                  </button>
                </div>
                
                <p className="text-sm text-slate-500 mb-6 font-medium">
                  Définissez ici les phases et les tâches spécifiques à ce produit lors de l'acquisition. 
                  Si aucune phase n'est configurée, le flux standard (Démarchage, Adaptation, etc.) sera utilisé.
                </p>

                {customPhases.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <p className="text-slate-500 font-medium mb-4">Ce produit utilise les phases par défaut.</p>
                    <button onClick={addPhase} className="px-4 py-2 bg-white border border-slate-200 shadow-sm rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50">
                      Personnaliser les phases
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {customPhases.map((phase, pIndex) => (
                      <div key={phase.id} className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center">
                          <div className="flex items-center gap-4 flex-1">
                            <span className="w-6 h-6 rounded bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold">{pIndex + 1}</span>
                            <div className="flex-1 max-w-sm">
                              <select
                                value={phase.name}
                                onChange={(e) => updatePhaseName(phase.id, e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold rounded-xl p-2 focus:ring-2 focus:ring-fuchsia-500/20"
                              >
                                <option value="Démarchage">Démarchage</option>
                                <option value="Adaptation">Adaptation</option>
                                <option value="Encaissement">Encaissement</option>
                                <option value="Recouvrement">Recouvrement</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button onClick={() => addTaskToPhase(phase.id)} className="text-xs font-bold text-fuchsia-600 hover:text-fuchsia-700 bg-fuchsia-50 hover:bg-fuchsia-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                              <Plus className="w-3 h-3" /> Tâche
                            </button>
                            <button onClick={() => removePhase(phase.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="p-4">
                          {phase.tasks.length === 0 ? (
                            <p className="text-xs text-slate-400 font-medium italic text-center py-2">Aucune tâche dans cette phase</p>
                          ) : (
                            <div className="space-y-2">
                              {phase.tasks.map((task, tIndex) => (
                                <div key={task.id} className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                                  <div className="w-6 text-center text-xs font-bold text-slate-400">{tIndex + 1}.</div>
                                  <input
                                    type="text"
                                    value={task.name}
                                    onChange={(e) => updateTaskName(phase.id, task.id, e.target.value)}
                                    placeholder="Nom de la tâche"
                                    className="flex-1 bg-transparent border-none text-sm font-medium text-slate-700 focus:ring-0 px-2 py-1"
                                  />
                                  <button onClick={() => removeTaskFromPhase(phase.id, task.id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {/* Maintenance Trigger Task Selection */}
                    <div className="mt-8 p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                      <h4 className="text-sm font-bold text-indigo-900 mb-2 flex items-center gap-2">
                        <Settings2 className="w-4 h-4 text-indigo-600" />
                        Déclencheur de Maintenance
                      </h4>
                      <p className="text-xs font-medium text-indigo-700/70 mb-4">
                        Sélectionnez la tâche qui, une fois marquée comme terminée (DONE), déclenchera automatiquement le démarrage du contrat de maintenance.
                      </p>
                      <select
                        value={maintenanceTriggerTask}
                        onChange={(e) => setMaintenanceTriggerTask(e.target.value)}
                        className="w-full max-w-md bg-white border border-indigo-200 text-slate-900 text-sm font-bold rounded-xl p-3 shadow-sm focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="">-- Par défaut (Formation) --</option>
                        {customPhases.flatMap(p => p.tasks).map(t => (
                          <option key={t.id} value={t.name}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Save Production Model */}
                    {customPhases.length > 0 && (
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={saveProductionModel}
                          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-bold rounded-xl shadow-sm transition-all"
                        >
                          <Save className="w-4 h-4 text-fuchsia-600" />
                          Enregistrer comme modèle de production
                        </button>
                      </div>
                    )}
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
