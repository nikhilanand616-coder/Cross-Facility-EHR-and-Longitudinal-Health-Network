/**
 * Automated Post-Discharge Adherence Monitor & Frontline Worker SMS Escalation
 *
 * Core Functional Mandate:
 * Tracks high-risk chronic patients post-discharge.
 * Evaluates daily interactive check-ins (medications + symptoms).
 * Triggers an automated SMS alert to the designated local frontline worker (ASHA / ANM)
 * if the patient misses 3 consecutive daily check-ins, ensuring continuity of care
 * without requiring continuous internet access from the patient.
 */

import { Firestore } from 'firebase-admin/firestore';
import {
  PostDischargeAdherenceRecord,
  DailyAdherenceCheckin,
  EscalationAlertRecord,
} from './types';
import { sendEscalationSms, formatIndianPhoneNumber } from './smsService';

export interface AdherenceAlertResult {
  evaluatedCount: number;
  escalatedCount: number;
  escalations: Array<{
    patientId: string;
    patientName: string;
    abhaAddress: string;
    village: string;
    consecutiveMissedDays: number;
    assignedAshaName: string;
    assignedAshaPhone: string;
    smsMessage: string;
    smsStatus: string;
    smsMessageId: string;
    dispatchedAt: string;
  }>;
  skippedCount: number;
}

/**
 * Calculates days difference between two ISO date strings (YYYY-MM-DD)
 */
export function calculateDateDifferenceDays(date1Str: string, date2Str: string): number {
  const d1 = new Date(date1Str.split('T')[0]);
  const d2 = new Date(date2Str.split('T')[0]);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Formats standard DLT-compliant SMS message for Frontline ASHA worker
 */
export function buildFrontlineWorkerSmsAlert(
  record: PostDischargeAdherenceRecord,
  simulatedAuditDate?: string
): string {
  const effectiveDate = simulatedAuditDate || new Date().toISOString().split('T')[0];
  const conditions = record.chronicConditions.join(' & ');
  const workerTitle = `${record.assignedFrontlineWorker.workerRole} ${record.assignedFrontlineWorker.workerName}`;

  return (
    `[NHM-EHR ALERT] Urgent: Patient ${record.patientName} (${record.abhaAddress}, ${record.village}) ` +
    `has MISSED 3 CONSECUTIVE DAILY CHECK-INS for ${conditions} post-discharge from ${record.dischargingFacilityName}. ` +
    `Risk: Acute rebound crisis / unmonitored relapse. ${workerTitle}, please conduct an in-person field visit today ` +
    `with BP monitor, glucometer & EDL replenishment kit. Emergency Protocol: ${record.emergencyActionProtocol}. Date: ${effectiveDate}`
  );
}

/**
 * Evaluates active post-discharge records and escalates to ASHA if 3+ consecutive days missed
 */
export async function evaluateAndTriggerChronicAdherenceAlerts(
  db: Firestore | null,
  options: {
    simulatedAuditDate?: string;
    recordsOverride?: PostDischargeAdherenceRecord[];
    forceEscalatePatientId?: string;
  } = {}
): Promise<AdherenceAlertResult> {
  const currentDate = options.simulatedAuditDate || new Date().toISOString().split('T')[0];

  let records: PostDischargeAdherenceRecord[] = [];

  if (options.recordsOverride && options.recordsOverride.length > 0) {
    records = options.recordsOverride;
  } else if (db) {
    try {
      const snap = await db.collection('chronic_adherence').get();
      records = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PostDischargeAdherenceRecord));
    } catch (err) {
      console.warn('Could not query Firestore chronic_adherence, falling back to empty list:', err);
    }
  }

  const result: AdherenceAlertResult = {
    evaluatedCount: records.length,
    escalatedCount: 0,
    escalations: [],
    skippedCount: 0,
  };

  for (const record of records) {
    // Determine consecutive missed days
    let missedDays = record.consecutiveMissedDays;

    if (record.lastCheckinDate) {
      const daysSinceLast = calculateDateDifferenceDays(record.lastCheckinDate, currentDate);
      if (daysSinceLast > missedDays) {
        missedDays = daysSinceLast;
      }
    } else if (record.dischargeDate) {
      const daysSinceDischarge = calculateDateDifferenceDays(record.dischargeDate, currentDate);
      if (daysSinceDischarge > missedDays) {
        missedDays = daysSinceDischarge;
      }
    }

    const isForceTarget = options.forceEscalatePatientId && options.forceEscalatePatientId === record.patientId;
    const qualifiesForEscalation = missedDays >= 3 || isForceTarget;

    // Throttle: don't re-escalate if alert sent within the same calendar day unless forced
    const lastSentDate = record.lastEscalationSentAt ? record.lastEscalationSentAt.split('T')[0] : null;
    const alreadySentToday = lastSentDate === currentDate;

    if (qualifiesForEscalation && (!alreadySentToday || isForceTarget)) {
      const smsBody = buildFrontlineWorkerSmsAlert(record, currentDate);
      const recipientPhone = record.assignedFrontlineWorker.phone;

      // Dispatch real or simulated SMS
      const smsDispatch = await sendEscalationSms({
        recipientPhone: formatIndianPhoneNumber(recipientPhone),
        recipientName: record.assignedFrontlineWorker.workerName,
        recipientRole: record.assignedFrontlineWorker.workerRole,
        urgency: 'CRITICAL',
        messageBody: smsBody,
        patientId: record.patientId,
        patientName: record.patientName,
        appointmentId: record.id,
        district: record.district,
        provider: 'mockup',
      });

      const escalationTimestamp = new Date().toISOString();

      // Log to Firestore escalation_alerts if DB available
      if (db) {
        try {
          const alertDoc: EscalationAlertRecord = {
            id: `adherence_alert_${record.id}_${Date.now()}`,
            appointmentId: record.id,
            patientId: record.patientId,
            patientName: record.patientName,
            patientPhone: record.phone,
            patientAbha: record.abhaAddress,
            recipientPhone: recipientPhone,
            recipientRole: record.assignedFrontlineWorker.workerRole,
            recipientName: record.assignedFrontlineWorker.workerName,
            district: record.district,
            facilityId: record.dischargingFacilityId,
            facilityName: record.dischargingFacilityName,
            scheduledDate: currentDate,
            hoursOverdue: record.consecutiveMissedDays * 24,
            messageBody: smsBody,
            smsProvider: smsDispatch.provider,
            smsStatus: smsDispatch.status,
            dispatchedAt: escalationTimestamp,
          };

          await db.collection('escalation_alerts').doc(alertDoc.id).set(alertDoc);

          // Update chronic_adherence record
          await db
            .collection('chronic_adherence')
            .doc(record.id)
            .update({
              consecutiveMissedDays: missedDays,
              alertEscalationStatus: 'escalated_to_asha',
              lastEscalationSentAt: escalationTimestamp,
              escalationCount: (record.escalationCount || 0) + 1,
              updatedAt: escalationTimestamp,
            });
        } catch (dbErr) {
          console.warn('Failed to update Firestore during adherence alert:', dbErr);
        }
      }

      // Update in-memory copy
      record.consecutiveMissedDays = missedDays;
      record.alertEscalationStatus = 'escalated_to_asha';
      record.lastEscalationSentAt = escalationTimestamp;
      record.escalationCount = (record.escalationCount || 0) + 1;

      result.escalatedCount++;
      result.escalations.push({
        patientId: record.patientId,
        patientName: record.patientName,
        abhaAddress: record.abhaAddress,
        village: record.village,
        consecutiveMissedDays: missedDays,
        assignedAshaName: record.assignedFrontlineWorker.workerName,
        assignedAshaPhone: recipientPhone,
        smsMessage: smsBody,
        smsStatus: smsDispatch.status,
        smsMessageId: smsDispatch.messageId,
        dispatchedAt: escalationTimestamp,
      });
    } else {
      result.skippedCount++;
    }
  }

  return result;
}

/**
 * Records a daily interactive check-in (from online or offline queue)
 */
export function applyDailyCheckinToRecord(
  record: PostDischargeAdherenceRecord,
  checkin: DailyAdherenceCheckin
): PostDischargeAdherenceRecord {
  // Check if date already logged
  const existingIdx = record.checkinHistory.findIndex((c) => c.date === checkin.date);
  const updatedHistory = [...record.checkinHistory];

  if (existingIdx >= 0) {
    updatedHistory[existingIdx] = checkin;
  } else {
    updatedHistory.push(checkin);
  }

  // Sort by date ascending
  updatedHistory.sort((a, b) => a.date.localeCompare(b.date));

  // Calculate adherence rate
  const totalDays = updatedHistory.length;
  const takenDays = updatedHistory.filter((c) => c.allMedsTaken).length;
  const adherenceRate = totalDays > 0 ? Math.round((takenDays / totalDays) * 100) : 100;

  // Reset consecutive missed days to 0 because today check-in is logged
  const updatedRecord: PostDischargeAdherenceRecord = {
    ...record,
    checkinHistory: updatedHistory,
    consecutiveMissedDays: 0,
    lastCheckinDate: checkin.date,
    overallAdherenceRatePercent: adherenceRate,
    alertEscalationStatus: record.alertEscalationStatus === 'escalated_to_asha' ? 'resolved' : 'normal',
    updatedAt: new Date().toISOString(),
  };

  return updatedRecord;
}
