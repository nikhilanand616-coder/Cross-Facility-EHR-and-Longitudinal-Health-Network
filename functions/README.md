# Pan-India Cross-Facility EHR: Firebase Cloud Functions & Triggers

This package contains the automated backend services and scheduled cron jobs for the Pan-India Cross-Facility Electronic Health Record (EHR) network.

## Table of Contents
1. [Overview & Architecture](#overview--architecture)
2. [Trigger 1: High-Risk Patient Follow-up Task Automation](#trigger-1-high-risk-patient-follow-up-task-automation)
3. [Trigger 2: Scheduled 8:00 AM IST Daily Escalation Cron](#trigger-2-scheduled-800-am-ist-daily-escalation-cron)
4. [SMS Gateway Integration (Twilio / Fast2SMS / Mockup)](#sms-gateway-integration)
5. [Local Testing with Firebase Emulator](#local-testing-with-firebase-emulator)
6. [Deployment Script & Production Setup](#deployment-script--production-setup)
7. [Audit Logging & Data Schemas](#audit-logging--data-schemas)

---

## Overview & Architecture

- **Project ID**: `preproute-ai` (configured via `firebase-applet-config.json`)
- **Runtime**: Node.js 20
- **Cloud Functions SDK**: Firebase Functions v2 (`firebase-functions/v2`)
- **Region**: `asia-south1` (Mumbai / India)
- **Timezone**: `Asia/Kolkata` (IST - Indian Standard Time)

---

## Trigger 1: High-Risk Patient Follow-up Task Automation

- **Function Name**: `onHighRiskPatientWritten`
- **Trigger Type**: Firestore Document Written Trigger
- **Watched Path**: `/patients/{patientId}`
- **Condition**: Evaluates `afterData.riskLevel === 'HIGH'` (e.g., high-risk maternal care / ANC, severe uncontrolled diabetes, severe hypertension, respiratory distress).

### Business Logic:
1. **Idempotency Guard**: Queries the `/tasks` collection to prevent generating duplicate open follow-up tasks for the same patient within the current clinical SLA window.
2. **Nearest Node Resolution**:
   - Priority 1: Directly assigned ASHA worker in patient record (`assignedAshaId`, `assignedAshaName`).
   - Priority 2: Primary Sub-Centre linked to the patient (`subCentreId`, `primaryFacilityId`).
   - Priority 3: Geospatial / district matching against the `/facilities` registry (`tier == 'sub_centre'` & `district == patient.district`).
3. **Clinical Protocol Assignment**:
   - **Maternal Care (ANC)**: 24-hour SLA. Protocol includes resting BP measurement, pre-eclampsia screening (headache/blurred vision), fetal heart auscultation, IFA/calcium adherence, and 108/102 ambulance transport readiness.
   - **Severe Chronic Illness**: 48-hour SLA. Protocol includes random/fasting blood sugar testing, resting BP, pill-count compliance, and diabetic foot ulcer screening.
   - **Severe Respiratory**: 24-hour SLA. SpO2 pulse oximetry, respiratory rate, inhaler adherence, and rapid referral flag if SpO2 < 94%.
4. **Action**: Atomically writes a new task to `/tasks/{taskId}` and updates the patient's record with `lastFollowUpTaskId`.

---

## Trigger 2: Scheduled 8:00 AM IST Daily Escalation Cron

- **Function Name**: `escalateMissedAppointmentsDailyCron`
- **Trigger Type**: Firebase Pub/Sub Cloud Scheduler (`onSchedule`)
- **Schedule**: `0 8 * * *` (Runs every day at exactly 08:00 AM IST)
- **Timezone**: `Asia/Kolkata`

### Business Logic:
1. **Lookback Window**: Queries the past 48 hours (`now - 48h` to `now`).
2. **Target Query**:
   - Collection `/appointments` where `status in ['missed', 'scheduled']` and `scheduledDate <= 48 hours ago`, and `escalated != true`.
   - Also flags overdue critical/high-priority ASHA tasks exceeding 48 hours.
3. **Medical Officer Resolution**:
   - Locates the District Hospital for the patient's district (`tier == 'district_hospital'`).
   - Extracts the contact for the designated Chief Medical Officer (CMO) / District Health Officer.
4. **SMS Dispatch**:
   - Composes an urgent alert:
     ```text
     🚨 URGENT HEALTH ESCALATION [District Hospital CMO Alert]:
     High-Risk Patient {Name} [ABHA: {abhaId}] MISSED scheduled follow-up on {date} at {facilityName}.
     Overdue by {hours} hrs. Condition: {category}.
     Immediate action required: Dispatch Mobile Medical Unit / Sub-Centre Outreach.
     ```
5. **Audit Logging & Status Update**:
   - Dispatches the SMS via Twilio, Fast2SMS (DLT route), or fallback telecommunication mockup.
   - Creates an immutable audit record in `/escalation_alerts/{alertId}`.
   - Updates appointment document to `status: 'escalated'`, `escalated: true`, `escalatedAt: ISO timestamp`.

---

## SMS Gateway Integration

The `smsService.ts` module supports three operational modes automatically based on environment configuration:

1. **Twilio REST API**:
   Set the following environment secrets:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`
2. **Fast2SMS (India DLT Gateway)**:
   Set:
   - `FAST2SMS_API_KEY`
3. **Mockup / Sandbox Fallback**:
   If credentials are not supplied, the system outputs structured telecommunications delivery receipts to the Cloud Functions logger and returns a unique simulated Message ID (`MOCK_SMS_...`).

---

## Local Testing with Firebase Emulator

To test the functions locally on your development machine:

```bash
# In the functions directory:
npm run build
firebase emulators:start --only functions,firestore
```

You can also trigger on-demand testing via the HTTP test endpoints:
- `POST /testSimulateHighRiskPatient`: Creates a sample high-risk patient in Firestore.
- `GET /testSimulateDailyCronEscalation?createMockMissed=true`: Triggers the 8:00 AM escalation loop immediately and returns delivery receipts.

---

## Deployment Script & Production Setup

Run the deployment script:

```bash
cd functions
bash deploy.sh
```

Or deploy directly via Firebase CLI:

```bash
# Build TypeScript
npm run build

# Deploy Functions
firebase deploy --project preproute-ai --only functions:onHighRiskPatientWritten,functions:escalateMissedAppointmentsDailyCron
```
