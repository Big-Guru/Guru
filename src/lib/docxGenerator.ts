import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import writtenNumber from 'written-number';
import { Client, Project, EncaissementRecord, DocumentDraft } from '../types';
import { getPrice, getDesignation } from './pricing';

// Configure written-number
writtenNumber.defaults.lang = 'fr';

/**
 * Formatage d'un nombre en monnaie (DA)
 */
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-DZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' DA';
};

/**
 * Charge le fichier binaire depuis le dossier public
 */
const loadFile = async (url: string): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Could not load template from ${url}`);
        return res.arrayBuffer();
      })
      .then(resolve)
      .catch(reject);
  });
};

/**
 * Génère une proforma ou une facture en Word
 */
export const generateWordDocument = async (
  type: 'PROFORMA' | 'FACTURE',
  documentNumber: string,
  client: Client,
  project: Project,
  encaissement: EncaissementRecord,
  draft?: DocumentDraft
) => {
  try {
    // 1. Choisir le bon modèle en fonction de l'entité du projet
    const entityName = project.entity?.toLowerCase() || 'naltis';
    const suffix = entityName === 'naltis' ? '' : `_${entityName}`;
    const templateUrl = type === 'PROFORMA' ? `/templates/proforma${suffix}.docx` : `/templates/facture${suffix}.docx`;
    
    // 2. Charger le fichier .docx binaire
    const content = await loadFile(templateUrl);
    
    // 3. Préparer PizZip et Docxtemplater
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // 4. Utiliser les prix du brouillon si disponibles, sinon calculer par défaut
    const encProduct = encaissement.product || project.product;
    const encVersion = encaissement.version || project.version;
    const prixHT = draft ? draft.totalHT : getPrice(encProduct, encVersion, encaissement.mode, client, project, encaissement.pricingParameters);
    const designation = getDesignation(encProduct, encVersion, encaissement.mode, client, project, encaissement.pricingParameters);
    const tva = draft ? draft.totalTVA : (prixHT * 0.19);
    const prixTTC = draft ? draft.totalTTC : (prixHT + tva);

    // 5. Déterminer l'année pour la maintenance
    const anneeTexte = encaissement.year ? `Année ${encaissement.year}` : '';

    // 6. Remplacer les balises par les vraies données
    doc.render({
      document_number: documentNumber,
      client_name: client.name,
      client_address: client.address,
      client_nif: client.nif || '',
      client_nis: client.nis || '',
      client_rc: client.rc || '',
      client_ai: client.ai || '',
      project_name: project.name,
      product: encProduct,
      version: encVersion || '',
      encaissement_mode: encaissement.mode,
      encaissement_annee: anneeTexte,
      designation: designation,
      description: designation,
      prix_ht: formatCurrency(prixHT),
      tva: formatCurrency(tva),
      prix_ttc: formatCurrency(prixTTC),
      prix_ht_lettres: `${writtenNumber(Math.floor(prixHT))} dinars algériens${(prixHT % 1) > 0 ? ` et ${Math.round((prixHT % 1) * 100)} centimes` : ''}`.replace(/^\w/, (c) => c.toUpperCase()),
      prix_ttc_lettres: `${writtenNumber(Math.floor(prixTTC))} dinars algériens${(prixTTC % 1) > 0 ? ` et ${Math.round((prixTTC % 1) * 100)} centimes` : ''}`.replace(/^\w/, (c) => c.toUpperCase()),
      date: new Date().toLocaleDateString('fr-FR'),
      // Add items array for dynamic multi-line looping in the Word file
      items: draft && draft.items.length > 0 ? draft.items.map((item, i) => ({
        index: String(i + 1).padStart(2, '0'),
        qty: '01',
        description: item.description,
        price: formatCurrency(item.price)
      })) : [{
        index: '01',
        qty: '01',
        description: designation,
        price: formatCurrency(prixHT)
      }]
    });

    // 7. Générer le nouveau fichier binaire
    const out = doc.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    
    // 8. Télécharger le fichier
    const fileName = `${type === 'PROFORMA' ? 'Proforma' : 'Facture'}_${documentNumber}_${client.name.replace(/[^a-z0-9]/gi, '_')}.docx`;
    saveAs(out, fileName);
    
    return true;
  } catch (error) {
    console.error('Erreur lors de la génération du document Word:', error);
    throw error;
  }
};
