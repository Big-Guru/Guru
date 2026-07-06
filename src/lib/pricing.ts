import { ProductType, ProductVersion, Client, Project } from '../types';
import { useStore } from '../store';

/**
 * Récupère le prix HT dynamiquement basé sur les règles de produit
 */
export const getMatchingRule = (
  productName: string, 
  version: string | undefined, 
  client?: Client,
  project?: Project
) => {
  if (!version || !client || !project) return null;
  
  const products = useStore.getState().products;
  const prodConfig = products.find(p => p.name.toLowerCase() === productName.toLowerCase());
  if (!prodConfig) return null;

  return prodConfig.pricingRules.find(r => {
    let normalizedClientType = client.effectifType;
    if (normalizedClientType === 'SALARIES' || normalizedClientType === 'POSTES') normalizedClientType = 'UNIVERSITE' as any;
    if (normalizedClientType === 'ETUDIANTS') normalizedClientType = 'EH_DA' as any;

    const clientEffectif = Number(client.effectif) || 0;

    return r.version === version &&
      r.entity === project.entity &&
      r.effectifType === normalizedClientType &&
      clientEffectif >= r.effectifMin &&
      clientEffectif <= r.effectifMax;
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
  project?: Project
): number => {
  const rule = getMatchingRule(productName, version, client, project);

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
  project?: Project
): string | null => {
  const rule = getMatchingRule(productName, version, client, project);
  return rule?.designation || null;
};
