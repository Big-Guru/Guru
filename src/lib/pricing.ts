import { ProductType, ProductVersion } from '../types';

interface PriceData {
  acquisition: number;
  maintenance: number;
}

// Matrice des prix HT (en DZD)
export const PRICING_MATRIX: Record<ProductType, Partial<Record<ProductVersion, PriceData>>> = {
  BUDGET: {
    ULTRALIGHT: { acquisition: 244000, maintenance: 48000 },
    LIGHT: { acquisition: 495000, maintenance: 98000 },
    INTERMEDIATE: { acquisition: 696000, maintenance: 137000 },
    ADVANCED: { acquisition: 997000, maintenance: 197000 },
    GLOBAL: { acquisition: 1698000, maintenance: 335000 },
  },
  PAYE: {
    ULTRALIGHT: { acquisition: 242000, maintenance: 47000 },
    LIGHT: { acquisition: 493000, maintenance: 97000 },
    INTERMEDIATE: { acquisition: 694000, maintenance: 137000 },
    ADVANCED: { acquisition: 995000, maintenance: 196000 },
    GLOBAL: { acquisition: 1695000, maintenance: 334000 },
  },
  BUDGET_APC: {},
  STOCKS: {},
  GRH: {},
  PHARMATIS: {},
  GBS: {}
};

/**
 * Récupère le prix HT pour un encaissement donné.
 */
export const getPrice = (
  product: ProductType, 
  version: ProductVersion | undefined, 
  mode: 'Acquisition' | 'Maintenance' | string
): number => {
  if (!version) return 0;
  
  const productPricing = PRICING_MATRIX[product];
  if (!productPricing) return 0;

  const versionPricing = productPricing[version];
  if (!versionPricing) return 0;

  if (mode === 'Acquisition') {
    return versionPricing.acquisition;
  } else if (mode.includes('Maintenance')) {
    return versionPricing.maintenance;
  }
  
  return 0;
};
