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

  const installDate = parseISO(project.installationDate);
  const trialEndDate = addMonths(installDate, 6);
  const daysUntilTrialEnd = differenceInDays(trialEndDate, today);

  // 1. Acquisition Alert: Proforma Warning (1 month before trial end)
  if (daysUntilTrialEnd <= 30 && project.acqProforma?.status === 'MISSING') {
    alerts.push({
      id: uuidv4(),
      projectId: project.id,
      level: daysUntilTrialEnd < 0 ? 'CRITICAL' : 'WARNING',
      message: daysUntilTrialEnd < 0 
        ? `La période d'essai est terminée depuis ${Math.abs(daysUntilTrialEnd)} jours. Proforma d'acquisition manquante !`
        : `Fin de la période d'essai dans ${daysUntilTrialEnd} jours. Préparez la proforma d'acquisition.`,
      documentType: 'PROFORMA_ACQ'
    });
  }

  // General acquisition missing docs alerts (Critiques if Installation is done)
  const docsReq = [
    { name: 'Bon de commande / ODS', doc: project.acqBcOds, key: 'BC_ACQ' },
    { name: 'Convention', doc: project.acqConvention, key: 'CONV_ACQ' },
    { name: 'Facture définitive', doc: project.acqFacture, key: 'FACT_ACQ' },
    { name: 'Service Fait', doc: project.acqServiceFait, key: 'SF_ACQ' }
  ];

  // If Proforma is sent/validated, we expect the rest soon.
  if (project.acqProforma?.status === 'VALIDATED' || project.acqProforma?.status === 'DEPOSITED') {
    docsReq.forEach(req => {
      if (req.doc?.status === 'MISSING') {
        alerts.push({
          id: uuidv4(),
          projectId: project.id,
          level: 'CRITICAL',
          message: `Document obligatoire d'acquisition manquant : ${req.name}`,
          documentType: req.key
        });
      }
    });

    if (project.acqEncaissement?.status === 'PENDING') {
      alerts.push({
        id: uuidv4(),
        projectId: project.id,
        level: 'CRITICAL',
        message: `Encaissement de l'acquisition en attente.`,
        documentType: 'ENC_ACQ'
      });
    }
  }

  // 2. Maintenance Alerts
  if (project.maintenances) {
    // Sort maintenances by year
    const sortedMaintenances = [...project.maintenances].sort((a,b) => a.year - b.year);

    // For each existing maintenance phase, check its docs
    sortedMaintenances.forEach((m) => {
      if (m.proforma?.status === 'VALIDATED' || m.proforma?.status === 'DEPOSITED') {
        const mDocsReq = [
          { name: 'Bon de commande / Convention (Maintenance)', doc: m.bcOds, key: 'BC_MAIN' },
          { name: 'Facture définitive (Maintenance)', doc: m.facture, key: 'FACT_MAIN' }
        ];

        mDocsReq.forEach(req => {
          if (req.doc?.status === 'MISSING') {
            alerts.push({
              id: uuidv4(),
              projectId: project.id,
              level: 'CRITICAL',
              message: `Document de maintenance manquant pour ${m.year} : ${req.name}`,
              documentType: req.key,
              maintenanceId: m.id
            });
          }
        });

        if (m.encaissement?.status === 'PENDING') {
          alerts.push({
            id: uuidv4(),
            projectId: project.id,
            level: 'CRITICAL',
            message: `Encaissement de la maintenance ${m.year} en attente.`,
            documentType: 'ENC_MAIN',
            maintenanceId: m.id
          });
        }
      } else if (m.proforma?.status === 'MISSING') {
        // General reminder if the year has started
        alerts.push({
            id: uuidv4(),
            projectId: project.id,
            level: 'CRITICAL',
            message: `Proforma de maintenance manquante pour l'année ${m.year}`,
            documentType: 'PROFORMA_MAIN',
            maintenanceId: m.id
         });
      }
    });
  }

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
