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
  }

  // Exact match to ProjectDetails.tsx missingDocsCount logic
  const activeEncaissements = (project.encaissements || []).filter(e => e.status !== 'UPCOMING' && e.status !== 'ABANDONED');
  activeEncaissements.forEach(enc => {
    const contextText = enc.year !== undefined ? `${enc.mode} - Année ${enc.year}` : enc.mode;
    
    if (enc.soumission?.status !== 'VALIDATED') {
      alerts.push({ id: uuidv4(), projectId: project.id, level: 'CRITICAL', message: `Soumission non validée (${contextText})`, documentType: 'DOC_MISSING' });
    }
    if (enc.convention?.status !== 'VALIDATED') {
      alerts.push({ id: uuidv4(), projectId: project.id, level: 'CRITICAL', message: `Convention non validée (${contextText})`, documentType: 'DOC_MISSING' });
    }
    if (enc.proforma?.status !== 'VALIDATED') {
      alerts.push({ id: uuidv4(), projectId: project.id, level: 'CRITICAL', message: `Proforma non validée (${contextText})`, documentType: 'DOC_MISSING' });
    }
    if (enc.bc?.status !== 'RECOVERED') {
      alerts.push({ id: uuidv4(), projectId: project.id, level: 'CRITICAL', message: `Bon de Commande non récupéré (${contextText})`, documentType: 'DOC_MISSING' });
    }
    if (enc.serviceFait?.status !== 'RECOVERED') {
      alerts.push({ id: uuidv4(), projectId: project.id, level: 'CRITICAL', message: `Service Fait non récupéré (${contextText})`, documentType: 'DOC_MISSING' });
    }
    if (enc.facture?.status !== 'VALIDATED') {
      alerts.push({ id: uuidv4(), projectId: project.id, level: 'CRITICAL', message: `Facture définitive non validée (${contextText})`, documentType: 'DOC_MISSING' });
    }
    if (enc.abe?.status !== 'RECOVERED') {
      alerts.push({ id: uuidv4(), projectId: project.id, level: 'CRITICAL', message: `ABE non récupérée (${contextText})`, documentType: 'DOC_MISSING' });
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
