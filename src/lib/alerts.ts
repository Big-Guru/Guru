import { differenceInDays, addMonths, addYears, parseISO } from 'date-fns';
import { Project, Alert } from '../types';
import { v4 as uuidv4 } from 'uuid';

export function calculateAlerts(project: Project): Alert[] {
  const alerts: Alert[] = [];
  const today = new Date();
  
  if (!project.installationDate) {
    // 3. Contract-based Alerts (Only check contracts if installationDate is not defined or fallback)
    if (project.contracts) {
      project.contracts.forEach(c => {
        if (c.status === 'ACTIVE' && c.phases) {
          c.phases.forEach(p => {
            if (p.tasks) {
              p.tasks.forEach(t => {
                if (t.status === 'CANCELED') {
                  alerts.push({
                    id: uuidv4(),
                    projectId: project.id,
                    level: 'CRITICAL',
                    message: `Incident sur le contrat "${c.name}" / Phase "${p.name}" : Tâche "${t.name}" en anomalie.`,
                    documentType: 'CONTRAT_ISSUE'
                  });
                }
              });
            }
          });
        }
      });
    }
    return alerts;
  }

  // Missing Documents from Encaissements (New Logic)
  const acquisitionContract = project.contracts?.find(c => c.mode === 'Acquisition');
  const encaissementPhase = acquisitionContract?.phases?.find(ph => ph.name === 'Encaissement');
  const activeEncaissementsList = project.encaissements?.filter(e => e.status !== 'UPCOMING' && e.status !== 'ABANDONED') || [];
  
  activeEncaissementsList.forEach(enc => {
    if (enc.mode === 'Acquisition') {
      if (acquisitionContract && encaissementPhase) {
         (encaissementPhase.tasks || []).filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS').forEach(t => {
            alerts.push({
              id: uuidv4(),
              projectId: project.id,
              level: 'CRITICAL',
              message: `Document d'acquisition manquant : ${t.name}`,
              documentType: 'ENC_ACQ'
            });
         });
      }
    } else if (enc.mode === 'Maintenance') {
       const yearText = enc.year !== undefined ? `Année ${enc.year}` : '';
       if (enc.proforma?.status === 'PENDING') {
          alerts.push({ id: uuidv4(), projectId: project.id, level: 'CRITICAL', message: `Proforma de maintenance manquante (${yearText})`, documentType: 'PROFORMA_MAIN' });
       }
       if (enc.bc?.status === 'PENDING') {
          alerts.push({ id: uuidv4(), projectId: project.id, level: 'CRITICAL', message: `Bon de Commande manquant (${yearText})`, documentType: 'BC_MAIN' });
       }
       if (enc.facture?.status === 'PENDING') {
          alerts.push({ id: uuidv4(), projectId: project.id, level: 'CRITICAL', message: `Facture définitive manquante (${yearText})`, documentType: 'FACT_MAIN' });
       }
       if (enc.status !== 'DONE') {
          alerts.push({ id: uuidv4(), projectId: project.id, level: 'CRITICAL', message: `Service Fait manquant (${yearText})`, documentType: 'ENC_MAIN' });
       }
    }
  });

  // 3. Contract-based Alerts (Also run if installationDate is defined)
  if (project.contracts) {
    // Check Tasks anomalies
    project.contracts.forEach(c => {
      if (c.status === 'ACTIVE' && c.phases) {
        c.phases.forEach(p => {
          if (p.tasks) {
            p.tasks.forEach(t => {
              if (t.status === 'CANCELED') {
                alerts.push({
                  id: uuidv4(),
                  projectId: project.id,
                  level: 'CRITICAL',
                  message: `Incident sur le contrat "${c.name}" / Phase "${p.name}" : Tâche "${t.name}" en anomalie.`,
                  documentType: 'CONTRAT_ISSUE'
                });
              }
            });
          }
        });
      }
    });

    // Check Automation Alerts (J-30)
    const maintOfferte = project.contracts.find(c => c.mode === 'Maintenance offerte');
    if (maintOfferte && maintOfferte.startDate && maintOfferte.status === 'PENDING') {
      const startDate = parseISO(maintOfferte.startDate);
      const daysUntilStart = differenceInDays(startDate, today);
      if (daysUntilStart <= 30 && daysUntilStart >= 0) {
        alerts.push({
          id: uuidv4(),
          projectId: project.id,
          level: 'WARNING',
          message: `La Maintenance Gratuite (Période d'Essai) commence dans ${daysUntilStart} jours.`,
          documentType: 'CONTRAT_ISSUE'
        });
      }
    }

    const maintAnnuelle = project.contracts.find(c => c.mode === 'Maintenance');
    if (maintAnnuelle && maintAnnuelle.startDate && maintAnnuelle.status === 'PENDING') {
      const startDate = parseISO(maintAnnuelle.startDate);
      const daysUntilStart = differenceInDays(startDate, today);
      if (daysUntilStart <= 30 && daysUntilStart >= 0) {
        alerts.push({
          id: uuidv4(),
          projectId: project.id,
          level: daysUntilStart <= 10 ? 'CRITICAL' : 'WARNING',
          message: `La Maintenance Gratuite se termine dans ${daysUntilStart} jours ! Préparez la Maintenance Annuelle.`,
          documentType: 'CONTRAT_ISSUE'
        });
      }
    }
  }

  return alerts;
}
