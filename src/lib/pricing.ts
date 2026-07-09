import { ProductType, ProductVersion, Client, Project } from '../types';
import { useStore } from '../store';

/**
 * Récupère le prix HT dynamiquement basé sur les règles de produit
 */
export const getMatchingRule = (
  productName: string, 
  version: string | undefined, 
  client?: Client,
  project?: Project,
  pricingParameters?: Record<string, any>
) => {
  if (!version || !project) return null;
  
  const products = useStore.getState().products;
  const prodConfig = products.find(p => p.name.toLowerCase() === productName.toLowerCase());
  if (!prodConfig) return null;

  // Build the evaluation parameters
  // 1. Start with explicit parameters (from the encaissement)
  let evalParams = { ...pricingParameters };
  
  // 2. Fallback to client data if criteria demands it and it wasn't provided
  if (client) {
    if (evalParams.effectif === undefined) evalParams.effectif = Number(client.effectif) || 0;
    
    let normalizedClientType = client.effectifType;
    if (normalizedClientType === 'SALARIES' || normalizedClientType === 'POSTES') normalizedClientType = 'UNIVERSITE' as any;
    if (normalizedClientType === 'ETUDIANTS') normalizedClientType = 'EH_DA' as any;
    
    if (evalParams.effectifType === undefined) evalParams.effectifType = normalizedClientType;
  }

  return prodConfig.pricingRules.find(r => {
    // 1. Basic checks
    if (r.version !== version || r.entity !== project.entity) return false;
    
    // 2. Dynamic conditions check (if present)
    if (r.conditions && Object.keys(r.conditions).length > 0) {
      for (const [key, expectedCondition] of Object.entries(r.conditions)) {
        const actualValue = evalParams[key];
        
        // If the condition is an object, it's likely a range { min, max }
        if (typeof expectedCondition === 'object' && expectedCondition !== null) {
          const val = Number(actualValue) || 0;
          if (expectedCondition.min !== undefined && val < expectedCondition.min) return false;
          if (expectedCondition.max !== undefined && val > expectedCondition.max) return false;
        } else {
          // Exact match
          if (actualValue !== expectedCondition) return false;
        }
      }
      return true; // All dynamic conditions passed
    }
    
    // 3. Fallback to legacy fields if no dynamic conditions are defined on this rule
    if (r.effectifType !== undefined && r.effectifType !== evalParams.effectifType) return false;
    if (r.effectifMin !== undefined && Number(evalParams.effectif) < r.effectifMin) return false;
    if (r.effectifMax !== undefined && Number(evalParams.effectif) > r.effectifMax) return false;
    
    return true;
  }) || null;
};

/**
 * Récupère le prix HT dynamiquement basé sur les règles de produit
 */
export const getPrice = (
  productName: string, 
  version: string | undefined, 
  mode: string,
  client?: Client,
  project?: Project,
  pricingParameters?: Record<string, any>
): number => {
  const rule = getMatchingRule(productName, version, client, project, pricingParameters);

  if (!rule) {
    console.log('[getPrice] No matching rule found for:', {
      productName, version, entity: project?.entity, effectifType: client?.effectifType, effectif: client?.effectif
    });
    return 0;
  }

  console.log('[getPrice] Matched rule:', rule, 'Mode:', mode);

  const normalizedMode = mode.toLowerCase();
  if (normalizedMode === 'acquisition') {
    return rule.acquisitionPrice;
  } else if (normalizedMode.includes('maintenance')) {
    return rule.maintenancePrice;
  }
  
  return 0;
};

/**
 * Récupère la désignation dynamique basée sur les règles de produit
 */
export const getDesignation = (
  productName: string, 
  version: string | undefined, 
  mode: string,
  client?: Client,
  project?: Project,
  pricingParameters?: Record<string, any>
): string | null => {
  const rule = getMatchingRule(productName, version, client, project, pricingParameters);
  if (!rule) return null;

  const normalizedMode = mode.toLowerCase();
  if (normalizedMode.includes('maintenance')) {
    return rule.maintenanceDesignation || rule.designation || null;
  }
  
  return rule.designation || null;
};
