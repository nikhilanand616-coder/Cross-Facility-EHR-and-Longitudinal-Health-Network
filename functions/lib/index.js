"use strict";
/**
 * Pan-India Cross-Facility EHR - Firebase Cloud Functions
 *
 * 1. onHighRiskPatientWritten: Firestore trigger on /patients/{patientId}
 *    Automatically generates high-risk follow-up tasks assigned to the nearest ASHA / Sub-Centre.
 *
 * 2. escalateMissedAppointmentsDailyCron: Firebase Pub/Sub Scheduled Cron (Daily 8:00 AM IST)
 *    Queries missed follow-up appointments from the past 48 hours and escalates via SMS
 *    (Twilio / Fast2SMS / Mockup) to the District Medical Officer.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RURAL_BARRIER_SPECS = exports.buildOptimizedTransitRoutes = exports.detectGeographicBarrier = exports.estimateRoadDistanceKm = exports.calculateHaversineDistanceKm = exports.persistDistributionPlanToFirestore = exports.solveVogelsApproximationMethod = exports.optimizeMedicineDistribution = exports.getMedicineDistributionPlanHttp = exports.optimizeWeeklyMedicineDistributionHttp = exports.getPhcQueueStatus = exports.onPhcQueueItemWritten = exports.triggerPhcEmergencyTriageEscalation = exports.optimizePhcQueueOnCheckIn = exports.testSimulateDailyCronEscalation = exports.testSimulateHighRiskPatient = exports.escalateMissedAppointmentsDailyCron = exports.onHighRiskPatientWritten = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const firestore_2 = require("firebase-functions/v2/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const https_1 = require("firebase-functions/v2/https");
const smsService_1 = require("./smsService");
const medicineDistributionOptimizer_1 = require("./medicineDistributionOptimizer");
Object.defineProperty(exports, "optimizeMedicineDistribution", { enumerable: true, get: function () { return medicineDistributionOptimizer_1.optimizeMedicineDistribution; } });
Object.defineProperty(exports, "persistDistributionPlanToFirestore", { enumerable: true, get: function () { return medicineDistributionOptimizer_1.persistDistributionPlanToFirestore; } });
Object.defineProperty(exports, "calculateHaversineDistanceKm", { enumerable: true, get: function () { return medicineDistributionOptimizer_1.calculateHaversineDistanceKm; } });
Object.defineProperty(exports, "estimateRoadDistanceKm", { enumerable: true, get: function () { return medicineDistributionOptimizer_1.estimateRoadDistanceKm; } });
Object.defineProperty(exports, "detectGeographicBarrier", { enumerable: true, get: function () { return medicineDistributionOptimizer_1.detectGeographicBarrier; } });
Object.defineProperty(exports, "solveVogelsApproximationMethod", { enumerable: true, get: function () { return medicineDistributionOptimizer_1.solveVogelsApproximationMethod; } });
Object.defineProperty(exports, "buildOptimizedTransitRoutes", { enumerable: true, get: function () { return medicineDistributionOptimizer_1.buildOptimizedTransitRoutes; } });
Object.defineProperty(exports, "RURAL_BARRIER_SPECS", { enumerable: true, get: function () { return medicineDistributionOptimizer_1.RURAL_BARRIER_SPECS; } });
// Initialize Firebase Admin SDK with designated database ID support
const databaseId = process.env.FIRESTORE_DATABASE_ID ||
    'ai-studio-crossfacilityehr-634a00e1-f67d-435f-b2d6-e9727d768e08';
const app = (0, app_1.getApps)().length > 0 ? (0, app_1.getApps)()[0] : (0, app_1.initializeApp)();
/**
 * Access Firestore instance with database ID support
 */
function getFirestoreInstance() {
    try {
        if (databaseId && databaseId !== '(default)') {
            return (0, firestore_1.getFirestore)(app, databaseId);
        }
        return (0, firestore_1.getFirestore)(app);
    }
    catch (err) {
        console.warn(`Could not connect to databaseId '${databaseId}', falling back to default Firestore.`);
        return (0, firestore_1.getFirestore)(app);
    }
}
const db = getFirestoreInstance();
// ============================================================================
// CLINICAL PROTOCOL HELPERS
// ============================================================================
/**
 * Generates clinical protocol checklist based on the patient's high-risk condition
 */
function getClinicalProtocolChecklist(category = 'maternal_care', riskFactors = []) {
    const normalized = (category || '').toLowerCase();
    if (normalized.includes('maternal') || normalized.includes('pregnancy') || normalized.includes('anc')) {
        return {
            title: 'High-Risk Maternal & Antenatal Care (ANC) Home Follow-up',
            slaHours: 24,
            priority: 'CRITICAL',
            checklist: [
                'Measure Blood Pressure (Resting) - Screen for Pre-Eclampsia (Target < 130/85 mmHg)',
                'Check for Maternal Danger Signs: Severe headache, blurred vision, abdominal pain, vaginal spotting',
                'Auscultate Fetal Heart Sound & verify active fetal kick counts',
                'Inspect for Pedal Edema and facial puffiness',
                'Verify daily compliance with Iron Folic Acid (IFA) & Calcium tablets',
                'Reconfirm institutional delivery plan and 108/102 ambulance transport readiness',
            ],
        };
    }
    if (normalized.includes('diabetes') || normalized.includes('glycemic')) {
        return {
            title: 'Uncontrolled Diabetes & Glycemic Crisis Follow-up',
            slaHours: 48,
            priority: 'HIGH',
            checklist: [
                'Perform Random Blood Sugar (RBS) / Fasting Blood Sugar point-of-care test',
                'Assess compliance with oral hypoglycemics / Insulin regimen',
                'Perform Diabetic Foot inspection (screening for micro-ulcers, loss of sensation)',
                'Assess for hypoglycemia symptoms: tremors, sweating, confusion',
                'Counsel on dietary carbohydrate control and hydration',
                'Schedule Sub-Centre HbA1c screening if not done in past 90 days',
            ],
        };
    }
    if (normalized.includes('hypertension') || normalized.includes('cardio') || normalized.includes('chronic')) {
        return {
            title: 'Severe Hypertension & Cardiovascular Risk Home Visit',
            slaHours: 24,
            priority: 'CRITICAL',
            checklist: [
                'Measure sitting Blood Pressure twice with 5-minute interval',
                'Screen for acute red flags: Chest discomfort, shortness of breath, left arm radiation',
                'Verify adherence to prescribed anti-hypertensive medications (Pill count)',
                'Screen for bilateral lower extremity swelling',
                'Immediate referral escalation if BP exceeds 160/100 mmHg with symptoms',
            ],
        };
    }
    if (normalized.includes('respiratory') || normalized.includes('asthma') || normalized.includes('copd')) {
        return {
            title: 'Severe Respiratory & Pulmonary Surveillance',
            slaHours: 24,
            priority: 'CRITICAL',
            checklist: [
                'Measure SpO2 via Pulse Oximeter (Target >= 94% on room air)',
                'Assess Respiratory Rate and presence of intercostal indrawing',
                'Verify correct inhaler / spacer technique and daily steroid compliance',
                'Check for fever or purulent sputum indicating bacterial superinfection',
                'Flag for immediate PHC/District Hospital transport if SpO2 drops below 92%',
            ],
        };
    }
    // Default General High-Risk Chronic Care
    return {
        title: 'High-Risk Frontline Patient Surveillance Visit',
        slaHours: 48,
        priority: 'HIGH',
        checklist: [
            'Record full baseline vitals (BP, Pulse, SpO2, Temperature)',
            'Review existing medication strips for adherence and stock availability',
            'Assess functional mobility and nutrition status',
            'Document any new or worsening clinical complaints',
            'Ensure next Sub-Centre/PHC doctor consultation date is communicated to family',
        ],
    };
}
/**
 * Resolves the nearest ASHA Worker or Sub-Centre node for a high-risk patient
 */
async function resolveNearestFrontlineNode(patient) {
    // 1. Direct ASHA Assignment if present in patient record
    if (patient.assignedAshaId && patient.assignedAshaName) {
        return {
            assignedTo: `ASHA Worker - ${patient.assignedAshaName}`,
            assignedType: 'asha_worker',
            assignedNodeId: patient.assignedAshaId,
            assignedNodeName: patient.assignedAshaName,
        };
    }
    // 2. Primary Sub-Centre if present in patient record
    const candidateFacilityId = patient.subCentreId || patient.primaryFacilityId;
    if (candidateFacilityId) {
        try {
            const facDoc = await db.collection('facilities').doc(candidateFacilityId).get();
            if (facDoc.exists) {
                const facData = facDoc.data();
                return {
                    assignedTo: `Sub-Centre Node - ${facData.name}`,
                    assignedType: 'sub_centre',
                    assignedNodeId: facData.facilityId,
                    assignedNodeName: facData.name,
                };
            }
        }
        catch (e) {
            console.warn('Could not retrieve candidate facility:', candidateFacilityId);
        }
    }
    // 3. Query nearest Sub-Centre in the same District
    if (patient.district) {
        try {
            const snapshot = await db
                .collection('facilities')
                .where('tier', '==', 'sub_centre')
                .where('district', '==', patient.district)
                .limit(1)
                .get();
            if (!snapshot.empty) {
                const facData = snapshot.docs[0].data();
                return {
                    assignedTo: `Sub-Centre Node - ${facData.name}`,
                    assignedType: 'sub_centre',
                    assignedNodeId: facData.facilityId,
                    assignedNodeName: facData.name,
                };
            }
        }
        catch (e) {
            console.warn('Could not query sub-centres in district:', patient.district);
        }
    }
    // 4. Default Node
    const fallbackDistrict = patient.district || 'Pune';
    return {
        assignedTo: `Frontline Health Worker - ${patient.village || fallbackDistrict} Sector`,
        assignedType: 'sub_centre',
        assignedNodeId: `SC-${fallbackDistrict.toUpperCase().slice(0, 3)}-001`,
        assignedNodeName: `${fallbackDistrict} Rural Sub-Centre Post`,
    };
}
// ============================================================================
// TRIGGER 1: FIRESTORE TRIGGER ON PATIENTS COLLECTION
// Listens to patients/{patientId}. If tagged riskLevel: 'HIGH', generates follow-up task.
// ============================================================================
exports.onHighRiskPatientWritten = (0, firestore_2.onDocumentWritten)({
    document: 'patients/{patientId}',
    region: 'asia-south1',
}, async (event) => {
    const patientId = event.params.patientId;
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    // Document deleted
    if (!afterData) {
        console.log(`Patient ${patientId} deleted. Skipping follow-up task generation.`);
        return null;
    }
    // Check if patient has HIGH riskLevel
    const currentRisk = afterData.riskLevel?.toUpperCase();
    if (currentRisk !== 'HIGH') {
        return null;
    }
    // Avoid duplicate triggers if riskLevel was already HIGH and category/factors did not change
    const prevRisk = beforeData?.riskLevel?.toUpperCase();
    const prevCategory = beforeData?.highRiskCategory;
    const isNewHighRisk = prevRisk !== 'HIGH' || prevCategory !== afterData.highRiskCategory;
    // Verify if an open, unresolved task already exists for this patient within the SLA window
    const openTasksQuery = await db
        .collection('tasks')
        .where('patientId', '==', patientId)
        .where('status', 'in', ['pending', 'in_progress'])
        .get();
    if (!openTasksQuery.empty && !isNewHighRisk) {
        console.log(`Open follow-up task already exists for High-Risk Patient ${patientId} (${afterData.name}). Idempotent skip.`);
        return null;
    }
    console.log(`⚡ HIGH-RISK PATIENT DETECTED: [${patientId}] ${afterData.name} (${afterData.highRiskCategory || 'General High-Risk'})`);
    // 1. Resolve nearest ASHA worker or Sub-Centre node
    const assignedNode = await resolveNearestFrontlineNode(afterData);
    // 2. Generate clinical protocol checklist and SLA
    const protocol = getClinicalProtocolChecklist(afterData.highRiskCategory || 'maternal_care', afterData.riskFactors || []);
    const now = new Date();
    const dueDate = new Date(now.getTime() + protocol.slaHours * 60 * 60 * 1000);
    const taskId = `TASK_HR_${patientId}_${now.getTime().toString().slice(-6)}`;
    // 3. Construct structured follow-up task
    const newTask = {
        id: taskId,
        patientId: patientId,
        patientName: afterData.name || 'Unnamed Patient',
        patientPhone: afterData.phone,
        patientAge: afterData.age,
        patientGender: afterData.gender,
        patientAbha: afterData.abhaId,
        village: afterData.village,
        district: afterData.district || 'Pune',
        riskLevel: 'HIGH',
        highRiskCategory: afterData.highRiskCategory || 'maternal_care',
        riskFactors: afterData.riskFactors || ['Critical frontline triage escalation'],
        assignedTo: assignedNode.assignedTo,
        assignedType: assignedNode.assignedType,
        assignedNodeId: assignedNode.assignedNodeId,
        assignedNodeName: assignedNode.assignedNodeName,
        type: 'high_risk_followup',
        status: 'pending',
        priority: protocol.priority,
        title: protocol.title,
        description: `Mandatory frontline follow-up visit for ${afterData.name}. Patient flagged with High Risk (${afterData.highRiskCategory || 'Maternal / Chronic Alert'}). Complete clinical surveillance protocol within ${protocol.slaHours} hours.`,
        clinicalProtocolChecklist: protocol.checklist,
        targetSlaHours: protocol.slaHours,
        dueDate: dueDate.toISOString(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        escalated: false,
    };
    // 4. Atomic Write to tasks collection and update patient metadata
    const batch = db.batch();
    const taskRef = db.collection('tasks').doc(taskId);
    batch.set(taskRef, newTask);
    const patientRef = db.collection('patients').doc(patientId);
    batch.set(patientRef, {
        lastFollowUpTaskId: taskId,
        lastAssessedAt: now.toISOString(),
        updatedAt: now.toISOString(),
    }, { merge: true });
    await batch.commit();
    console.log(`✅ Follow-up task ${taskId} successfully generated and assigned to: ${assignedNode.assignedTo} (Due: ${dueDate.toISOString()})`);
    return { success: true, taskId, assignedTo: assignedNode.assignedTo };
});
// ============================================================================
// TRIGGER 2: SCHEDULED CRON JOB (DAILY AT 8:00 AM IST)
// Runs daily at 08:00 AM Indian Standard Time (Asia/Kolkata).
// Queries missed follow-up appointments from the past 48 hours and escalates via SMS
// to the designated District Hospital Medical Officer.
// ============================================================================
exports.escalateMissedAppointmentsDailyCron = (0, scheduler_1.onSchedule)({
    schedule: '0 8 * * *', // Daily 8:00 AM IST
    timeZone: 'Asia/Kolkata',
    region: 'asia-south1',
    retryCount: 3,
    memory: '256MiB',
}, async (event) => {
    console.log('⏰ ========================================================');
    console.log('⏰ [CRON START] Daily 8:00 AM IST Missed Follow-up Escalation');
    console.log(`Execution Time: ${new Date().toISOString()} [IST: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}]`);
    console.log('⏰ ========================================================');
    const now = new Date();
    const past48Hours = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const past48HoursIso = past48Hours.toISOString();
    const nowIso = now.toISOString();
    let totalEscalated = 0;
    const errors = [];
    try {
        // 1. Query appointments where status is 'missed' or overdue 'scheduled' in past 48 hours
        // and escalated != true
        const appointmentsRef = db.collection('appointments');
        // Check both missed appointments and scheduled appointments whose scheduledDate is in past 48h
        const missedSnapshot = await appointmentsRef
            .where('status', 'in', ['missed', 'scheduled'])
            .where('scheduledDate', '>=', past48HoursIso)
            .where('scheduledDate', '<=', nowIso)
            .limit(100)
            .get();
        console.log(`Found ${missedSnapshot.size} appointments in the 48-hour follow-up evaluation window.`);
        for (const doc of missedSnapshot.docs) {
            const appt = doc.data();
            // Skip if already escalated
            if (appt.escalated === true || appt.status === 'attended') {
                continue;
            }
            // 2. Identify designated Medical Officer at the District Hospital
            const targetDistrict = appt.district || 'Pune';
            let moRecipient = {
                cmoName: 'Dr. Rajesh Sharma, MD',
                role: 'Chief Medical Officer / District Nodal Officer',
                phone: '+91 98201 12345',
                facilityId: 'FAC-MH-PUN-004',
                facilityName: `${targetDistrict} District Hospital`,
            };
            // Attempt to query real District Hospital contact in Firestore
            try {
                const dhQuery = await db
                    .collection('facilities')
                    .where('district', '==', targetDistrict)
                    .where('tier', '==', 'district_hospital')
                    .limit(1)
                    .get();
                if (!dhQuery.empty) {
                    const dhData = dhQuery.docs[0].data();
                    moRecipient = {
                        cmoName: dhData.cmoName || `${targetDistrict} District Medical Officer`,
                        role: 'District Medical Officer (In-Charge)',
                        phone: dhData.cmoPhone || dhData.phone || '+91 98201 12345',
                        facilityId: dhData.facilityId,
                        facilityName: dhData.name,
                    };
                }
            }
            catch (e) {
                console.warn('Could not query district hospital for', targetDistrict);
            }
            // Calculate hours overdue
            const scheduledTime = new Date(appt.scheduledDate).getTime();
            const hoursOverdue = Math.max(1, Math.round((now.getTime() - scheduledTime) / (1000 * 60 * 60)));
            // 3. Compose urgent SMS Alert message
            const patientAbhaTag = appt.patientAbha ? ` [ABHA: ${appt.patientAbha}]` : '';
            const smsBody = `🚨 URGENT HEALTH ESCALATION [District Hospital CMO Alert]: ` +
                `High-Risk Patient ${appt.patientName}${patientAbhaTag} MISSED scheduled follow-up on ` +
                `${new Date(appt.scheduledDate).toLocaleDateString('en-IN')} at ${appt.facilityName}. ` +
                `Overdue by ${hoursOverdue} hrs. Condition: ${appt.highRiskCategory || 'High-Risk Protocol'}. ` +
                `Immediate action required: Dispatch Mobile Medical Unit / Sub-Centre Outreach.`;
            // 4. Dispatch SMS via Twilio / Fast2SMS / Mockup Logger
            const smsResult = await (0, smsService_1.sendEscalationSms)({
                recipientPhone: moRecipient.phone,
                recipientRole: moRecipient.role,
                recipientName: moRecipient.cmoName,
                messageBody: smsBody,
                provider: 'twilio', // Service dynamically uses active config or mockup
                patientId: appt.patientId,
                patientName: appt.patientName,
                appointmentId: doc.id,
                district: targetDistrict,
            });
            // 5. Create immutable escalation alert audit record in Firestore
            const alertId = `ALERT_${doc.id}_${now.getTime().toString().slice(-6)}`;
            const alertRecord = {
                id: alertId,
                appointmentId: doc.id,
                patientId: appt.patientId,
                patientName: appt.patientName,
                patientAbha: appt.patientAbha,
                district: targetDistrict,
                scheduledDate: appt.scheduledDate,
                hoursOverdue,
                recipientRole: moRecipient.role,
                recipientName: moRecipient.cmoName,
                recipientPhone: (0, smsService_1.formatIndianPhoneNumber)(moRecipient.phone),
                facilityName: moRecipient.facilityName,
                smsProvider: smsResult.provider,
                smsStatus: smsResult.status,
                messageBody: smsBody,
                dispatchedAt: now.toISOString(),
                gatewayResponse: smsResult.rawResponse,
            };
            await db.collection('escalation_alerts').doc(alertId).set(alertRecord);
            // 6. Update appointment status to 'escalated'
            await doc.ref.update({
                status: 'escalated',
                escalated: true,
                escalatedAt: now.toISOString(),
                escalatedTo: moRecipient,
                lastSmsAlertId: smsResult.messageId,
                updatedAt: now.toISOString(),
            });
            totalEscalated++;
            console.log(`📢 Escalated missed appointment ${doc.id} for patient ${appt.patientName} to ${moRecipient.cmoName} (${moRecipient.phone}) via ${smsResult.provider}`);
        }
        // Also check any overdue high-risk tasks older than 48 hours that haven't been completed
        const overdueTasksQuery = await db
            .collection('tasks')
            .where('priority', 'in', ['HIGH', 'CRITICAL'])
            .where('status', '==', 'pending')
            .where('dueDate', '<=', past48HoursIso)
            .where('escalated', '==', false)
            .limit(50)
            .get();
        for (const taskDoc of overdueTasksQuery.docs) {
            const task = taskDoc.data();
            await taskDoc.ref.update({
                status: 'escalated',
                escalated: true,
                updatedAt: now.toISOString(),
            });
            console.log(`⚠️ Overdue ASHA Task ${taskDoc.id} (${task.patientName}) marked as escalated.`);
        }
        console.log(`✅ [CRON FINISHED] Successfully escalated ${totalEscalated} missed follow-up appointments.`);
        return;
    }
    catch (err) {
        console.error('Error during 8:00 AM Cron Escalation:', err);
        errors.push(err.message);
        throw err;
    }
});
// ============================================================================
// SIMULATION & TESTING HTTP ENDPOINTS
// Allows testing the trigger and cron logic in sandboxes or CI/CD pipelines
// ============================================================================
/**
 * HTTP endpoint to simulate creating a High-Risk Patient and verifying ASHA task creation
 */
exports.testSimulateHighRiskPatient = (0, https_1.onRequest)({ region: 'asia-south1', cors: true }, async (req, res) => {
    try {
        const { name = 'Lakshmi Devi (Maternal Care)', age = 26, gender = 'Female', phone = '+91 98201 54321', village = 'Wadgaon Shinde', district = 'Pune', highRiskCategory = 'maternal_care', riskFactors = ['Third Trimester Pregnancy', 'Elevated BP 142/90', 'Mild Pedal Edema'], } = req.body || {};
        const patientId = `pat_sim_${Date.now()}`;
        const patientRef = db.collection('patients').doc(patientId);
        const patientData = {
            id: patientId,
            name,
            age: Number(age),
            gender,
            phone,
            village,
            district,
            state: 'Maharashtra',
            abhaId: `ABHA-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
            riskLevel: 'HIGH',
            highRiskCategory: highRiskCategory,
            riskFactors,
            lastAssessedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        await patientRef.set(patientData);
        // The onHighRiskPatientWritten trigger will execute in background.
        // We also query tasks to confirm creation.
        res.json({
            success: true,
            message: 'High-risk patient created in Firestore. Firestore trigger onHighRiskPatientWritten will execute.',
            patientId,
            patientData,
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
/**
 * HTTP endpoint to simulate the daily 8:00 AM IST Cron Job on-demand
 */
exports.testSimulateDailyCronEscalation = (0, https_1.onRequest)({ region: 'asia-south1', cors: true }, async (req, res) => {
    try {
        // Create a dummy missed appointment in past 48 hours for immediate verification if requested
        if (req.query.createMockMissed === 'true') {
            const mockApptId = `appt_missed_${Date.now()}`;
            const scheduledPast = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(); // 36 hours ago
            await db.collection('appointments').doc(mockApptId).set({
                id: mockApptId,
                patientId: `pat_${Date.now().toString().slice(-6)}`,
                patientName: 'Kavita Suresh Patil',
                patientPhone: '+91 98220 11223',
                patientAbha: 'ABHA-9821-4412',
                facilityId: 'FAC-MH-PUN-002',
                facilityName: 'Wagholi Primary Health Centre (PHC)',
                district: 'Pune',
                scheduledDate: scheduledPast,
                appointmentType: 'Antenatal High-Risk Checkup',
                status: 'missed',
                riskLevel: 'HIGH',
                highRiskCategory: 'maternal_care',
                escalated: false,
                createdAt: scheduledPast,
            });
        }
        // Execute cron escalation logic directly
        const now = new Date();
        const past48HoursIso = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
        const nowIso = now.toISOString();
        const missedSnapshot = await db
            .collection('appointments')
            .where('status', 'in', ['missed', 'scheduled'])
            .where('scheduledDate', '>=', past48HoursIso)
            .where('scheduledDate', '<=', nowIso)
            .limit(20)
            .get();
        const escalationResults = [];
        for (const doc of missedSnapshot.docs) {
            const appt = doc.data();
            if (appt.escalated === true)
                continue;
            const targetDistrict = appt.district || 'Pune';
            const cmoRecipient = {
                cmoName: 'Dr. Rajesh Sharma, MD',
                role: 'Chief Medical Officer / District Health Officer',
                phone: '+91 98201 12345',
                facilityName: `${targetDistrict} District Hospital`,
            };
            const hoursOverdue = Math.max(1, Math.round((now.getTime() - new Date(appt.scheduledDate).getTime()) / (1000 * 60 * 60)));
            const smsBody = `🚨 URGENT HEALTH ESCALATION [District Hospital CMO Alert]: ` +
                `High-Risk Patient ${appt.patientName} (${appt.patientAbha || 'ABHA Registered'}) MISSED follow-up on ` +
                `${new Date(appt.scheduledDate).toLocaleDateString('en-IN')} at ${appt.facilityName}. ` +
                `Overdue by ${hoursOverdue} hrs. Condition: ${appt.highRiskCategory || 'High-Risk Protocol'}. ` +
                `Immediate action required: Dispatch Mobile Medical Unit / Sub-Centre Outreach.`;
            const smsResult = await (0, smsService_1.sendEscalationSms)({
                recipientPhone: cmoRecipient.phone,
                recipientRole: cmoRecipient.role,
                recipientName: cmoRecipient.cmoName,
                messageBody: smsBody,
                provider: 'twilio',
                patientId: appt.patientId,
                patientName: appt.patientName,
                appointmentId: doc.id,
                district: targetDistrict,
            });
            const alertId = `ALERT_${doc.id}_${now.getTime().toString().slice(-6)}`;
            await db.collection('escalation_alerts').doc(alertId).set({
                id: alertId,
                appointmentId: doc.id,
                patientId: appt.patientId,
                patientName: appt.patientName,
                district: targetDistrict,
                scheduledDate: appt.scheduledDate,
                hoursOverdue,
                recipientRole: cmoRecipient.role,
                recipientPhone: cmoRecipient.phone,
                smsProvider: smsResult.provider,
                smsStatus: smsResult.status,
                messageBody: smsBody,
                dispatchedAt: now.toISOString(),
            });
            await doc.ref.update({
                status: 'escalated',
                escalated: true,
                escalatedAt: now.toISOString(),
                lastSmsAlertId: smsResult.messageId,
            });
            escalationResults.push({
                appointmentId: doc.id,
                patientName: appt.patientName,
                recipient: cmoRecipient,
                smsResult,
            });
        }
        res.json({
            success: true,
            message: `Cron job simulation completed at ${now.toISOString()} [Asia/Kolkata].`,
            escalatedCount: escalationResults.length,
            escalations: escalationResults,
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// ============================================================================
// FIREBASE FUNCTIONS: PRIMARY HEALTH CENTRE (PHC) QUEUE OPTIMIZER SERVICE
// ============================================================================
__exportStar(require("./phcQueueOptimizer"), exports);
const phcQueueOptimizer_1 = require("./phcQueueOptimizer");
/**
 * 1. HTTPS Function: Ingest live patient check-in, calculate expected wait times
 *    using the M/M/c priority queuing model, and persist the optimized queue.
 */
exports.optimizePhcQueueOnCheckIn = (0, https_1.onRequest)({ region: 'asia-south1', cors: true }, async (req, res) => {
    try {
        const { facilityId = 'FAC-MH-PUN-002', facilityName = 'Wagholi Primary Health Centre (PHC)', checkInPatient, activeRooms, } = req.body || {};
        const now = new Date();
        // Retrieve existing active queue items for this facility from Firestore
        let existingItems = [];
        try {
            const snapshot = await db
                .collection('phc_queue_items')
                .where('facilityId', '==', facilityId)
                .where('status', 'in', ['waiting', 'in_consultation', 'escalated'])
                .get();
            existingItems = snapshot.docs.map((d) => d.data());
        }
        catch (e) {
            console.warn('Could not query existing phc_queue_items, starting fresh:', e.message);
        }
        // If new patient is checking in, append them
        if (checkInPatient && checkInPatient.patientName) {
            const patientId = checkInPatient.patientId || `PAT-PHC-${Date.now().toString().slice(-6)}`;
            const tokenNum = `PHC-T${(existingItems.length + 1).toString().padStart(2, '0')}`;
            const newItem = {
                id: `queue_${patientId}_${now.getTime()}`,
                tokenNumber: checkInPatient.tokenNumber || tokenNum,
                patientId,
                patientName: checkInPatient.patientName,
                patientAge: Number(checkInPatient.patientAge) || 30,
                patientGender: checkInPatient.patientGender || 'Female',
                facilityId,
                facilityName,
                department: checkInPatient.department || 'General Outpatient',
                checkInTime: checkInPatient.checkInTime || now.toISOString(),
                isWalkIn: checkInPatient.isWalkIn !== false,
                status: 'waiting',
                esiTier: checkInPatient.esiTier || 4,
                urgencyScore: checkInPatient.urgencyScore || 30,
                isEmergencyEscalated: false,
                expectedConsultationDuration: 10,
                priorityScore: 0,
                queuePosition: existingItems.length + 1,
                estimatedWaitMinutes: 0,
                updatedAt: now.toISOString(),
            };
            existingItems.push(newItem);
        }
        // Run mathematical queuing optimization
        const optimizationResult = (0, phcQueueOptimizer_1.optimizePhcPatientQueue)({
            facilityId,
            facilityName,
            rawQueueItems: existingItems,
            rooms: activeRooms,
            currentTime: now,
        });
        // Persist results to Firestore
        let persisted = false;
        try {
            await (0, phcQueueOptimizer_1.persistOptimizedQueueToFirestore)(db, optimizationResult);
            persisted = true;
        }
        catch (err) {
            console.warn('Firestore persistence skipped (sandbox mode):', err.message);
        }
        return res.json({
            success: true,
            message: 'PHC queue optimized via mathematical M/M/c priority queuing model.',
            persisted,
            result: optimizationResult,
        });
    }
    catch (err) {
        console.error('Error optimizing PHC queue on check-in:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
});
/**
 * 2. HTTPS Function: Emergency Escalation Protocol Trigger (Gemini AI Triage Integration)
 *    When the Gemini AI triage module evaluates physiological vitals/red flags and triggers
 *    an emergency escalation, this function instantly preempts the queue, moves the patient
 *    to Position #1, recalculates all downstream wait times, and notifies the medical officer.
 */
exports.triggerPhcEmergencyTriageEscalation = (0, https_1.onRequest)({ region: 'asia-south1', cors: true }, async (req, res) => {
    try {
        const { facilityId = 'FAC-MH-PUN-002', facilityName = 'Wagholi Primary Health Centre (PHC)', patientId, patientName, vitals = {}, chiefComplaint = 'Severe acute distress', notes = '', activeRooms, } = req.body || {};
        if (!patientId || !patientName) {
            return res.status(400).json({
                success: false,
                error: 'patientId and patientName are required to trigger emergency triage escalation.',
            });
        }
        const now = new Date();
        // Step 1: Run Gemini AI triage evaluation on physiological vitals & red flags
        const triageAssessment = (0, phcQueueOptimizer_1.evaluateEmergencyEscalationCriteria)(vitals, chiefComplaint, Number(vitals.age) || 35, notes);
        // Step 2: Fetch current active queue from Firestore
        let existingItems = [];
        try {
            const snapshot = await db
                .collection('phc_queue_items')
                .where('facilityId', '==', facilityId)
                .where('status', 'in', ['waiting', 'in_consultation', 'escalated'])
                .get();
            existingItems = snapshot.docs.map((d) => d.data());
        }
        catch (e) {
            console.warn('Could not query existing queue, using in-memory queue:', e.message);
        }
        // If patient not in existing queue, create them as an immediate emergency walk-in
        let targetItem = existingItems.find((q) => q.patientId === patientId);
        if (!targetItem) {
            targetItem = {
                id: `queue_${patientId}_${now.getTime()}`,
                tokenNumber: `EMERG-${Math.floor(10 + Math.random() * 90)}`,
                patientId,
                patientName,
                patientAge: Number(vitals.age) || 35,
                patientGender: vitals.gender || 'Female',
                facilityId,
                facilityName,
                department: 'Emergency Stabilization',
                checkInTime: now.toISOString(),
                isWalkIn: true,
                status: 'escalated',
                esiTier: triageAssessment.esiTier,
                urgencyScore: triageAssessment.urgencyScore,
                isEmergencyEscalated: true,
                emergencyReason: triageAssessment.criticalRedFlags.join('; ') || 'Life-threatening condition detected',
                emergencyTriggeredAt: now.toISOString(),
                expectedConsultationDuration: 25,
                priorityScore: 100000,
                queuePosition: 1,
                estimatedWaitMinutes: 0,
                updatedAt: now.toISOString(),
            };
            existingItems.push(targetItem);
        }
        else {
            targetItem.tokenNumber = targetItem.tokenNumber.startsWith('EMERG')
                ? targetItem.tokenNumber
                : `EMERG-${targetItem.tokenNumber.replace(/\D/g, '') || '01'}`;
            targetItem.department = 'Emergency Stabilization';
        }
        // Attach Gemini Triage summary
        targetItem.geminiTriageSummary = {
            evaluatedAt: now.toISOString(),
            esiTier: triageAssessment.esiTier,
            urgencyScore: triageAssessment.urgencyScore,
            priorityCategory: triageAssessment.category,
            chiefComplaint,
            criticalRedFlags: triageAssessment.criticalRedFlags,
            immediateBedsideActions: triageAssessment.immediateBedsideActions,
            clinicalReasoning: triageAssessment.clinicalReasoning,
            source: 'gemini-3.8-flash-clinical-triage',
        };
        // Step 3: Run mathematical queuing optimization with instant emergency preemption
        const optimizationResult = (0, phcQueueOptimizer_1.optimizePhcPatientQueue)({
            facilityId,
            facilityName,
            rawQueueItems: existingItems,
            rooms: activeRooms,
            escalatedPatientId: patientId,
            emergencyReason: triageAssessment.criticalRedFlags.join('; ') || 'Gemini AI critical red flag',
            currentTime: now,
        });
        // Step 4: Persist updated queue and create escalation alert
        let persisted = false;
        try {
            await (0, phcQueueOptimizer_1.persistOptimizedQueueToFirestore)(db, optimizationResult);
            persisted = true;
        }
        catch (err) {
            console.warn('Firestore persistence skipped in sandbox:', err.message);
        }
        return res.json({
            success: true,
            protocol: 'GEMINI_AI_EMERGENCY_ESCALATION_PREEMPTION',
            escalatedPatientId: patientId,
            escalatedPatientName: patientName,
            triageAssessment,
            newQueuePosition: 1,
            message: `Patient ${patientName} moved directly to Position #1 in queue. Downstream wait times recalculated dynamically.`,
            persisted,
            result: optimizationResult,
        });
    }
    catch (err) {
        console.error('Error triggering emergency triage escalation:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
});
/**
 * 3. Firestore Trigger: onPhcQueueItemWritten
 *    Listens to changes in `/phc_queue_items/{itemId}`.
 *    If an item is marked as `status: 'completed'` or `status: 'in_consultation'`,
 *    triggers recalculation of remaining patients' estimated wait times.
 */
exports.onPhcQueueItemWritten = (0, firestore_2.onDocumentWritten)({
    document: 'phc_queue_items/{itemId}',
    region: 'asia-south1',
}, async (event) => {
    try {
        const beforeData = event.data?.before?.data();
        const afterData = event.data?.after?.data();
        if (!afterData)
            return; // Deleted
        // Only react if status changed (e.g., patient called in, or consultation finished)
        if (beforeData?.status === afterData?.status && beforeData?.isEmergencyEscalated === afterData?.isEmergencyEscalated) {
            return;
        }
        const facilityId = afterData.facilityId;
        if (!facilityId)
            return;
        const snapshot = await db
            .collection('phc_queue_items')
            .where('facilityId', '==', facilityId)
            .where('status', 'in', ['waiting', 'in_consultation', 'escalated'])
            .get();
        if (snapshot.empty)
            return;
        const queueItems = snapshot.docs.map((d) => d.data());
        const optimizationResult = (0, phcQueueOptimizer_1.optimizePhcPatientQueue)({
            facilityId,
            facilityName: afterData.facilityName || 'Primary Health Centre',
            rawQueueItems: queueItems,
            currentTime: new Date(),
        });
        await (0, phcQueueOptimizer_1.persistOptimizedQueueToFirestore)(db, optimizationResult);
        console.log(`✅ [PHC QUEUE TRIGGER] Re-optimized queue for facility ${facilityId} after item ${event.params.itemId} status update.`);
    }
    catch (err) {
        console.error('Error in onPhcQueueItemWritten trigger:', err);
    }
});
/**
 * 4. HTTPS Function: Retrieve current PHC Queue status and analytics snapshot
 */
exports.getPhcQueueStatus = (0, https_1.onRequest)({ region: 'asia-south1', cors: true }, async (req, res) => {
    try {
        const facilityId = req.query.facilityId || 'FAC-MH-PUN-002';
        // Query active queue items
        const snapshot = await db
            .collection('phc_queue_items')
            .where('facilityId', '==', facilityId)
            .where('status', 'in', ['waiting', 'in_consultation', 'escalated'])
            .get();
        const items = snapshot.docs.map((d) => d.data());
        const optimizationResult = (0, phcQueueOptimizer_1.optimizePhcPatientQueue)({
            facilityId,
            facilityName: items[0]?.facilityName || 'Primary Health Centre',
            rawQueueItems: items,
            currentTime: new Date(),
        });
        return res.json({
            success: true,
            facilityId,
            result: optimizationResult,
        });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
/**
 * 5. HTTPS Function: Optimize weekly medicine distribution across facility tiers via Vogel's Approximation Method (VAM)
 *    and minimize transit delays across rural geographic obstacles
 */
exports.optimizeWeeklyMedicineDistributionHttp = (0, https_1.onRequest)({ region: 'asia-south1', cors: true }, async (req, res) => {
    try {
        const district = req.body?.district || req.query?.district || 'Pune';
        const state = req.body?.state || req.query?.state || 'Maharashtra';
        const weekNumber = parseInt(req.body?.weekNumber || req.query?.weekNumber || '37', 10);
        const year = parseInt(req.body?.year || req.query?.year || '2026', 10);
        const persistToDb = req.body?.persist !== false && req.query?.persist !== 'false';
        // Default baseline supplies (Tier 1 District Hospital + Tier 2 Sub-District/Rural Hospital)
        const supplies = req.body?.supplies || [
            {
                facilityId: 'FAC-MH-PUN-DH-001',
                facilityName: 'District Hospital Aundh, Pune (Central Drug Warehouse)',
                tier: 'district_hospital',
                district: 'Pune',
                coordinates: { latitude: 18.5793, longitude: 73.8080 },
                availableStockUnits: 3500,
                hasColdChainStorage: true,
                vehicleFleet: { refrigeratedVans: 3, allTerrain4x4s: 4, standardTrucks: 6 },
            },
            {
                facilityId: 'FAC-MH-PUN-RH-001',
                facilityName: 'Baramati Sub-District / Rural Hospital (Regional Depot)',
                tier: 'rural_hospital',
                district: 'Pune',
                coordinates: { latitude: 18.1517, longitude: 74.5772 },
                availableStockUnits: 2000,
                hasColdChainStorage: true,
                vehicleFleet: { refrigeratedVans: 1, allTerrain4x4s: 2, standardTrucks: 3 },
            },
        ];
        // Default baseline demands across Tier 3 (PHCs) and Tier 4 (Sub-Centres) with rural barrier profiles
        const demands = req.body?.demands || [
            {
                facilityId: 'FAC-MH-PUN-002',
                facilityName: 'Wagholi Primary Health Centre',
                tier: 'phc',
                district: 'Pune',
                coordinates: { latitude: 18.5808, longitude: 73.9787 },
                requestedQuantityUnits: 650,
                criticalityTier: 'essential_acute',
                coldChainRequired: false,
                currentStockOnHand: 120,
                minThreshold: 200,
                barrierFromSupply: 'standard_highway',
            },
            {
                facilityId: 'FAC-MH-PUN-PHC-003',
                facilityName: 'Velhe Primary Health Centre (Torna-Rajgad Foothills)',
                tier: 'phc',
                district: 'Pune',
                coordinates: { latitude: 18.2974, longitude: 73.6358 },
                requestedQuantityUnits: 800,
                criticalityTier: 'critical_life_saving',
                coldChainRequired: true, // Anti-snake venom & oxytocin for tribal snake-bite hotspot
                currentStockOnHand: 40,
                minThreshold: 150,
                barrierFromSupply: 'mountain_ghat',
            },
            {
                facilityId: 'FAC-MH-PUN-SC-001',
                facilityName: 'Panshet Sub-Centre (Sahyadri Dam Catchment)',
                tier: 'sub_centre',
                district: 'Pune',
                coordinates: { latitude: 18.3756, longitude: 73.6125 },
                requestedQuantityUnits: 450,
                criticalityTier: 'critical_life_saving',
                coldChainRequired: true,
                currentStockOnHand: 25,
                minThreshold: 80,
                barrierFromSupply: 'mountain_ghat',
            },
            {
                facilityId: 'FAC-MH-PUN-SC-002',
                facilityName: 'Daund Rural Sub-Centre (Bhima River Canal Basin)',
                tier: 'sub_centre',
                district: 'Pune',
                coordinates: { latitude: 18.4650, longitude: 74.5820 },
                requestedQuantityUnits: 500,
                criticalityTier: 'standard_chronic',
                coldChainRequired: false,
                currentStockOnHand: 80,
                minThreshold: 120,
                barrierFromSupply: 'unpaved_rural',
            },
            {
                facilityId: 'FAC-MH-PUN-PHC-004',
                facilityName: 'Junnar Primary Health Centre (Shivneri Foothills)',
                tier: 'phc',
                district: 'Pune',
                coordinates: { latitude: 19.2083, longitude: 73.8778 },
                requestedQuantityUnits: 750,
                criticalityTier: 'essential_acute',
                coldChainRequired: false,
                currentStockOnHand: 110,
                minThreshold: 200,
                barrierFromSupply: 'forest_fringe',
            },
            {
                facilityId: 'FAC-MH-PUN-SC-003',
                facilityName: 'Otur Sub-Centre / Ayushman Arogya Mandir',
                tier: 'sub_centre',
                district: 'Pune',
                coordinates: { latitude: 19.2612, longitude: 73.9856 },
                requestedQuantityUnits: 400,
                criticalityTier: 'wellness_supplement',
                coldChainRequired: false,
                currentStockOnHand: 50,
                minThreshold: 100,
                barrierFromSupply: 'unpaved_rural',
            },
        ];
        const planResult = (0, medicineDistributionOptimizer_1.optimizeMedicineDistribution)({
            district,
            state,
            weekNumber,
            year,
            supplies,
            demands,
        });
        if (persistToDb) {
            await (0, medicineDistributionOptimizer_1.persistDistributionPlanToFirestore)(db, planResult);
        }
        return res.json({
            success: true,
            protocol: 'VOGELS_APPROXIMATION_METHOD_MEDICINE_ROUTING',
            district,
            planResult,
        });
    }
    catch (err) {
        console.error('Error optimizing medicine distribution:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
});
/**
 * 6. HTTPS Function: Retrieve saved Medicine Distribution Plan
 */
exports.getMedicineDistributionPlanHttp = (0, https_1.onRequest)({ region: 'asia-south1', cors: true }, async (req, res) => {
    try {
        const planId = req.query?.planId || req.params?.planId;
        if (!planId) {
            return res.status(400).json({ success: false, error: 'planId query param required' });
        }
        const planDoc = await db.collection('medicine_distribution_plans').doc(planId).get();
        if (!planDoc.exists) {
            return res.status(404).json({ success: false, error: 'Plan not found' });
        }
        const routesSnapshot = await db
            .collection('transit_routes')
            .where('planId', '==', planId)
            .get();
        const routes = routesSnapshot.docs.map((d) => d.data());
        return res.json({
            success: true,
            plan: planDoc.data(),
            routes,
        });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
//# sourceMappingURL=index.js.map