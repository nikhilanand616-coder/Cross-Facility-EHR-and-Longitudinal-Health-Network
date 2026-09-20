/**
 * Automated Verification Script for Primary Health Centre (PHC) Queue Optimization Service
 * Tests:
 * 1. Mathematical M/M/c queuing formulation and Erlang-C probability
 * 2. Live patient check-ins and expected wait time calculations
 * 3. Gemini AI Triage clinical evaluation and red flag detection
 * 4. Dynamic emergency preemption: High-risk patient immediately moves to Position #1
 * 5. Downstream wait time recalculation across multiple active doctor rooms
 */

import {
  optimizePhcPatientQueue,
  evaluateEmergencyEscalationCriteria,
  calculateErlangC,
  calculateDynamicPriorityScore,
} from '../functions/lib/phcQueueOptimizer.js';

console.log('========================================================================');
console.log('🏥 PHC PATIENT QUEUE OPTIMIZATION & EMERGENCY PREEMPTION TEST SUITE');
console.log('========================================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    process.exitCode = 1;
  }
}

// ----------------------------------------------------------------------------
// TEST 1: Mathematical Queuing Theory (Erlang-C & Dynamic Priority Aging)
// ----------------------------------------------------------------------------
console.log('--- TEST 1: Mathematical Queuing Theory Calculations ---');
const c = 2; // 2 active doctor rooms at PHC
const offeredLoad = 1.4; // 14 patients/hr with service rate of 10 patients/hr -> a = 1.4, rho = 0.70
const erlangCVal = calculateErlangC(c, offeredLoad);

assert(erlangCVal > 0 && erlangCVal < 1, `Erlang-C probability computed: ${(erlangCVal * 100).toFixed(1)}%`);
assert(erlangCVal >= 0.55 && erlangCVal <= 0.65, `Erlang-C matches theoretical M/M/2 queue value (~57.6%)`);

// Test Dynamic Aging Priority
const routineInitialScore = calculateDynamicPriorityScore({
  esiTier: 5,
  urgencyScore: 10,
  waitingDurationMinutes: 0,
  isWalkIn: true,
  isEmergencyEscalated: false,
});

const routineAgedScore = calculateDynamicPriorityScore({
  esiTier: 5,
  urgencyScore: 10,
  waitingDurationMinutes: 40,
  isWalkIn: true,
  isEmergencyEscalated: false,
});

assert(routineAgedScore > routineInitialScore, `Aging factor successfully boosts waiting patient priority (${routineInitialScore} -> ${routineAgedScore})`);

const emergencyScore = calculateDynamicPriorityScore({
  esiTier: 1,
  urgencyScore: 95,
  waitingDurationMinutes: 0,
  isWalkIn: true,
  isEmergencyEscalated: true,
});

assert(emergencyScore > 100000, `Emergency escalation score (${emergencyScore}) strictly dominates all standard queues`);
console.log('');

// ----------------------------------------------------------------------------
// TEST 2: Live Patient Check-Ins & Multi-Server Wait Time Distribution
// ----------------------------------------------------------------------------
console.log('--- TEST 2: Multi-Server PHC Queue Simulation with Live Check-Ins ---');

const facilityId = 'FAC-MH-PUN-002';
const facilityName = 'Wagholi Primary Health Centre (PHC)';
const now = new Date();

// Baseline Queue: 2 Doctors in consultation, 3 Patients waiting
const sampleQueue = [
  {
    id: 'pt-01',
    tokenNumber: 'PHC-T01',
    patientId: 'P01',
    patientName: 'Sunita Patil',
    patientAge: 28,
    patientGender: 'Female',
    facilityId,
    facilityName,
    department: 'MCH / ANC',
    checkInTime: new Date(now.getTime() - 40 * 60000).toISOString(),
    isWalkIn: false,
    status: 'in_consultation',
    assignedRoom: 'ROOM-02',
    consultationStartTime: new Date(now.getTime() - 10 * 60000).toISOString(),
    expectedConsultationDuration: 15,
    esiTier: 3,
    urgencyScore: 50,
    isEmergencyEscalated: false,
    priorityScore: 0,
    queuePosition: 0,
    estimatedWaitMinutes: 0,
    updatedAt: now.toISOString(),
  },
  {
    id: 'pt-02',
    tokenNumber: 'PHC-T02',
    patientId: 'P02',
    patientName: 'Ramesh Kulkarni',
    patientAge: 52,
    patientGender: 'Male',
    facilityId,
    facilityName,
    department: 'General Outpatient',
    checkInTime: new Date(now.getTime() - 30 * 60000).toISOString(),
    isWalkIn: true,
    status: 'in_consultation',
    assignedRoom: 'ROOM-01',
    consultationStartTime: new Date(now.getTime() - 5 * 60000).toISOString(),
    expectedConsultationDuration: 10,
    esiTier: 4,
    urgencyScore: 30,
    isEmergencyEscalated: false,
    priorityScore: 0,
    queuePosition: 0,
    estimatedWaitMinutes: 0,
    updatedAt: now.toISOString(),
  },
  {
    id: 'pt-03',
    tokenNumber: 'PHC-T03',
    patientId: 'P03',
    patientName: 'Anil Jadhav',
    patientAge: 40,
    patientGender: 'Male',
    facilityId,
    facilityName,
    department: 'General Outpatient',
    checkInTime: new Date(now.getTime() - 25 * 60000).toISOString(),
    isWalkIn: true,
    status: 'waiting',
    expectedConsultationDuration: 10,
    esiTier: 4,
    urgencyScore: 35,
    isEmergencyEscalated: false,
    priorityScore: 0,
    queuePosition: 1,
    estimatedWaitMinutes: 0,
    updatedAt: now.toISOString(),
  },
  {
    id: 'pt-04',
    tokenNumber: 'PHC-T04',
    patientId: 'P04',
    patientName: 'Pooja Shinde',
    patientAge: 22,
    patientGender: 'Female',
    facilityId,
    facilityName,
    department: 'General Outpatient',
    checkInTime: new Date(now.getTime() - 15 * 60000).toISOString(),
    isWalkIn: true,
    status: 'waiting',
    expectedConsultationDuration: 10,
    esiTier: 4,
    urgencyScore: 25,
    isEmergencyEscalated: false,
    priorityScore: 0,
    queuePosition: 2,
    estimatedWaitMinutes: 0,
    updatedAt: now.toISOString(),
  },
  {
    id: 'pt-05',
    tokenNumber: 'PHC-T05',
    patientId: 'P05',
    patientName: 'Balasaheb Shinde',
    patientAge: 65,
    patientGender: 'Male',
    facilityId,
    facilityName,
    department: 'General Outpatient',
    checkInTime: new Date(now.getTime() - 5 * 60000).toISOString(),
    isWalkIn: true,
    status: 'waiting',
    expectedConsultationDuration: 8,
    esiTier: 5,
    urgencyScore: 15,
    isEmergencyEscalated: false,
    priorityScore: 0,
    queuePosition: 3,
    estimatedWaitMinutes: 0,
    updatedAt: now.toISOString(),
  },
];

const baselineResult = optimizePhcPatientQueue({
  facilityId,
  facilityName,
  rawQueueItems: JSON.parse(JSON.stringify(sampleQueue)),
  currentTime: now,
});

assert(baselineResult.totalWaitingCount === 3, 'Baseline waiting queue count is 3');
assert(baselineResult.totalInConsultationCount === 2, '2 active doctor rooms in consultation');
assert(baselineResult.activeRoomsCount === 2, 'Active server count c = 2');

const waitingSorted = baselineResult.optimizedQueue.filter((q) => q.status === 'waiting');
console.log('Baseline Queue Wait Times:');
waitingSorted.forEach((q) => {
  console.log(`  - Pos #${q.queuePosition}: [${q.tokenNumber}] ${q.patientName} -> Wait: ${q.estimatedWaitMinutes} mins (Room: ${q.assignedRoom})`);
});

assert(waitingSorted[0].patientId === 'P03', 'Patient P03 is at Position #1 in baseline');
assert(waitingSorted[0].estimatedWaitMinutes === 5, 'Earliest room frees up in 5 minutes (Room 1: 10-5=5 mins, Room 2: 15-10=5 mins)');
assert(waitingSorted[1].estimatedWaitMinutes >= 5, 'Downstream patient wait time is higher');
console.log('');

// ----------------------------------------------------------------------------
// TEST 3: Gemini AI Triage Module - Physiological Vitals & Red Flag Detection
// ----------------------------------------------------------------------------
console.log('--- TEST 3: Gemini AI Triage Clinical Assessment ---');

// Case A: Stable Routine Patient
const routineTriage = evaluateEmergencyEscalationCriteria(
  { systolic: 124, diastolic: 82, heartRate: 76, spo2: 98, temperature: 98.4 },
  'Mild headache and knee pain for 3 days',
  45
);
assert(routineTriage.isEmergency === false, 'Stable patient not flagged as emergency');
assert(routineTriage.esiTier >= 4, `Classified as ESI Tier ${routineTriage.esiTier} (Non-urgent/Semi-urgent)`);

// Case B: Critical Emergency (Severe Hypoxemia + ACS symptoms)
const emergencyTriage = evaluateEmergencyEscalationCriteria(
  { systolic: 76, diastolic: 48, heartRate: 142, spo2: 83, respiratoryRate: 34, gcs: 13 },
  'Severe crushing retrosternal chest pain, cold diaphoresis, gasping for breath',
  56,
  'Patient has acute respiratory distress and severe hypotension'
);

assert(emergencyTriage.isEmergency === true, '🚨 Emergency criteria successfully triggered!');
assert(emergencyTriage.esiTier === 1, 'Classified as ESI Tier 1 (Resuscitation / Immediate)');
assert(emergencyTriage.criticalRedFlags.length >= 3, `Identified ${emergencyTriage.criticalRedFlags.length} life-critical red flags`);
assert(emergencyTriage.immediateBedsideActions.length >= 2, 'Immediate bedside emergency actions formulated');

console.log('Emergency Triage Red Flags:');
emergencyTriage.criticalRedFlags.forEach((rf) => console.log(`  ⚠️ ${rf}`));
console.log('Immediate Bedside Actions:');
emergencyTriage.immediateBedsideActions.forEach((act) => console.log(`  💉 ${act}`));
console.log('');

// ----------------------------------------------------------------------------
// TEST 4: Dynamic Emergency Preemption - Instant Jump to Position #1
// ----------------------------------------------------------------------------
console.log('--- TEST 4: Dynamic Queue Preemption & Wait Time Recalculation ---');

// Patient P05 (previously at Position #3) suddenly develops acute respiratory distress / chest pain
console.log('Triggering Gemini Emergency Escalation for Patient P05 (Balasaheb Shinde)...');

const escalatedResult = optimizePhcPatientQueue({
  facilityId,
  facilityName,
  rawQueueItems: JSON.parse(JSON.stringify(sampleQueue)),
  escalatedPatientId: 'P05',
  emergencyReason: emergencyTriage.criticalRedFlags.join('; '),
  currentTime: now,
});

assert(escalatedResult.emergencyEscalatedCount === 1, 'Emergency escalated count is 1');
assert(escalatedResult.emergencyAuditLog != null, 'Emergency audit log generated');
assert(escalatedResult.emergencyAuditLog.previousPosition === 3, 'Recorded previous position was 3');
assert(escalatedResult.emergencyAuditLog.newPosition === 1, 'Recorded new position is 1');

const reorderedWaiting = escalatedResult.optimizedQueue.filter((q) => q.status === 'waiting' || q.status === 'escalated');

console.log('Reordered Queue After Emergency Preemption:');
reorderedWaiting.forEach((q) => {
  const emergTag = q.isEmergencyEscalated ? '🚨 [EMERGENCY PREEMPTION]' : '';
  console.log(`  - Pos #${q.queuePosition}: [${q.tokenNumber}] ${q.patientName} (ESI ${q.esiTier}) -> Wait: ${q.estimatedWaitMinutes} mins ${emergTag}`);
});

assert(reorderedWaiting[0].patientId === 'P05', 'High-Risk Emergency Patient P05 successfully moved to Position #1!');
assert(reorderedWaiting[0].isEmergencyEscalated === true, 'P05 marked as isEmergencyEscalated = true');
assert(reorderedWaiting[0].priorityScore > 100000, 'P05 priority score is dominant (> 100,000)');

// Verify that patient P03 (who was previously at Position #1) is now moved to Position #2
assert(reorderedWaiting[1].patientId === 'P03', 'Previous Position #1 (P03) moved to Position #2');

// Verify that downstream patients' wait times increased due to the emergency case insertion
const p03WaitBefore = waitingSorted.find((q) => q.patientId === 'P03').estimatedWaitMinutes;
const p03WaitAfter = reorderedWaiting.find((q) => q.patientId === 'P03').estimatedWaitMinutes;
console.log(`  P03 Wait Time Change: ${p03WaitBefore} mins -> ${p03WaitAfter} mins`);
assert(p03WaitAfter >= p03WaitBefore, 'Downstream patient wait time dynamically updated to account for emergency consultation window');

console.log('\n========================================================================');
console.log(`🎉 ALL TESTS COMPLETED: ${passedTests}/${totalTests} PASSED!`);
console.log('========================================================================\n');
