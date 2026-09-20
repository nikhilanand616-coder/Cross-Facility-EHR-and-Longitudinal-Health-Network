/**
 * ABDM (Ayushman Bharat Digital Mission) Mock Integration Engine
 * 
 * Implements:
 * 1. 14-Digit ABHA (Ayushman Bharat Health Account) Generation & Luhn/Verhoeff Validation
 * 2. M1/M2 Milestone Handshake: Aadhaar/Mobile OTP Verification & PHR Address Allocation
 * 3. Firestore Patient Profile Linking & Persistence in Cloud Firestore
 * 4. ABDM FHIR R4 Longitudinal Digital Health Record Summarization Bundle (M3)
 * 5. Cryptographic Push Envelope (ECDH/AES-GCM Key Exchange) for National Health Registry
 *
 * Usage:
 *   - Dry Run (Simulation & Inspection):
 *       node scripts/abdm-mock-integration.js --dry-run
 *
 *   - Push Demonstration:
 *       node scripts/abdm-mock-integration.js --push
 *
 *   - Live Firestore Enrollment:
 *       export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccount.json"
 *       node scripts/abdm-mock-integration.js --live
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import admin from 'firebase-admin';

// ============================================================================
// 1. ABDM CONSTANTS & NATIONAL REGISTRY METADATA
// ============================================================================

export const ABDM_CONFIG = {
  gatewayBaseUrl: 'https://dev.abdm.gov.in/gateway',
  consentManagerId: 'sbx@nha',
  defaultFacilityId: 'FAC-OD-SUN-DH-001',
  defaultFacilityHfrId: 'IN2110000108',
  defaultFacilityName: 'Sundargarh District Headquarters Hospital',
  defaultPractitionerHprId: 'HPR-IN-DOC-4482',
  defaultPractitionerName: 'Dr. Ananya Sen, MD (Internal Medicine)',
  supportedAuthModes: ['AADHAAR_OTP', 'MOBILE_OTP', 'DEMOGRAPHICS'],
  loincCodes: {
    patientSummary: '60591-5',
    dischargeSummary: '18842-5',
    vitalSigns: '8716-3',
    chiefComplaints: '10154-3',
    diagnoses: '11450-4',
    medications: '10160-0',
    labResults: '30954-2',
    referrals: '57133-1',
    systolicBP: '8480-6',
    diastolicBP: '8462-4',
    heartRate: '8867-4',
    spo2: '59408-5',
    glucose: '2339-0'
  }
};

// ============================================================================
// 2. 14-DIGIT ABHA NUMBER GENERATOR & VALIDATOR
// ============================================================================

/**
 * Calculates a Luhn checksum digit for a numeric string.
 * @param {string} numStr 
 * @returns {number}
 */
export function calculateLuhnChecksum(numStr) {
  let sum = 0;
  let alternate = true;
  for (let i = numStr.length - 1; i >= 0; i--) {
    let n = parseInt(numStr.charAt(i), 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n = (n % 10) + 1;
    }
    sum += n;
    alternate = !alternate;
  }
  return (10 - (sum % 10)) % 10;
}

/**
 * Generates a valid 14-digit ABHA number conforming to ABDM specifications.
 * Format: 14 numeric digits, represented as XX-XXXX-XXXX-XXXX.
 * Prefix starts with 91 (India country designation in ABDM).
 * 
 * @param {string} [prefix='91'] - 2-digit prefix (default '91')
 * @returns {{ formattedAbha: string, rawAbha: string }}
 */
export function generate14DigitAbhaNumber(prefix = '91') {
  // Generate 11 random digits to make 13 digits with the 2-digit prefix
  let body = '';
  for (let i = 0; i < 11; i++) {
    body += Math.floor(Math.random() * 10).toString();
  }
  const first13 = `${prefix}${body}`;
  const checkDigit = calculateLuhnChecksum(first13);
  const rawAbha = `${first13}${checkDigit}`;

  // Format with standard hyphens: XX-XXXX-XXXX-XXXX
  const formattedAbha = `${rawAbha.slice(0, 2)}-${rawAbha.slice(2, 6)}-${rawAbha.slice(6, 10)}-${rawAbha.slice(10, 14)}`;

  return {
    formattedAbha,
    rawAbha
  };
}

/**
 * Validates a 14-digit ABHA number.
 * @param {string} abha - Formatted or unformatted ABHA string
 * @returns {boolean}
 */
export function validateAbhaNumber(abha) {
  if (!abha || typeof abha !== 'string') return false;
  const digitsOnly = abha.replace(/\D/g, '');
  if (digitsOnly.length !== 14) return false;

  const first13 = digitsOnly.slice(0, 13);
  const expectedChecksum = calculateLuhnChecksum(first13);
  const actualChecksum = parseInt(digitsOnly.charAt(13), 10);

  return expectedChecksum === actualChecksum;
}

/**
 * Generates a personalized ABDM PHR Address (e.g. name@abdm or 91234567890123@sbx)
 * @param {string} name 
 * @param {string} rawAbha 
 * @param {string} [domain='abdm'] 
 * @returns {string}
 */
export function generateAbhaAddress(name, rawAbha, domain = 'abdm') {
  const sanitized = (name || 'patient')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '.');
  const shortSuffix = rawAbha.slice(-4);
  return `${sanitized}.${shortSuffix}@${domain}`;
}

// ============================================================================
// 3. FIRESTORE CLIENT INITIALIZATION (Dual: Live & Dry-Run Mode)
// ============================================================================

let firestoreDb = null;

export function getFirestoreInstance() {
  if (firestoreDb) return firestoreDb;

  // Check if Firebase app is already initialized
  if (!admin.apps.length) {
    try {
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
        admin.initializeApp({
          credential: admin.credential.applicationDefault()
        });
      } else {
        // Try reading config from firebase-applet-config.json
        const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
        if (fs.existsSync(configPath)) {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          admin.initializeApp({
            projectId: config.projectId
          });
        } else {
          admin.initializeApp({
            projectId: 'preproute-ai'
          });
        }
      }
    } catch (e) {
      console.warn('⚠️ Firebase Admin initialization fallback:', e.message);
    }
  }

  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    let databaseId = '';
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      databaseId = config.firestoreDatabaseId || '';
    }

    if (databaseId && typeof admin.firestore === 'function') {
      firestoreDb = admin.firestore();
      // If custom databaseId is configured and supported
      if (databaseId && firestoreDb.databaseId !== databaseId) {
        try {
          firestoreDb = admin.firestore(admin.apps[0], databaseId);
        } catch (_) {
          // fallback to default
        }
      }
    } else {
      firestoreDb = admin.firestore();
    }
  } catch (err) {
    console.warn('⚠️ Firestore connection initialized in simulation mode:', err.message);
    firestoreDb = null;
  }

  return firestoreDb;
}

// ============================================================================
// 4. FUNCTION: GENERATE & LINK 14-DIGIT ABHA TO PATIENT PROFILE IN FIRESTORE
// ============================================================================

/**
 * Mocks the ABDM Milestone 1 (M1) Aadhaar KYC verification lifecycle:
 * 1. Simulates OTP challenge dispatch to registered mobile.
 * 2. Generates a verified 14-digit ABHA number with valid Luhn checksum.
 * 3. Derives an official ABHA address (@abdm).
 * 4. Links demographic profile and care contexts.
 * 5. Atomically persists/upserts the patient record into Firestore.
 *
 * @param {Object} patientProfile - Patient demographics and identification
 * @param {Object} [options={}] - Execution flags (dryRun, facilityId, etc.)
 * @returns {Promise<Object>} Linked patient profile with ABHA identifiers
 */
export async function generateAndLinkAbhaToPatientProfile(patientProfile, options = {}) {
  const {
    dryRun = false,
    facilityId = ABDM_CONFIG.defaultFacilityId,
    facilityName = ABDM_CONFIG.defaultFacilityName,
    preferredAbhaDomain = 'abdm'
  } = options;

  if (!patientProfile || !patientProfile.name) {
    throw new Error('Invalid patientProfile: name and basic demographics are required.');
  }

  // 1. Generate unique Patient ID if not provided
  const patientId = patientProfile.id || `PAT-IN-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // 2. ABDM Milestone 1: M1 OTP Handshake Simulation
  const txnId = `ABDM-TXN-${crypto.randomUUID()}`;
  const aadhaarLast4 = patientProfile.aadhaarLast4 || Math.floor(1000 + Math.random() * 9000).toString();
  const mobile = patientProfile.mobile || `+91 ${Math.floor(7000000000 + Math.random() * 2999999999)}`;

  // 3. Generate 14-digit ABHA and PHR Address
  const { formattedAbha, rawAbha } = generate14DigitAbhaNumber('91');
  const abhaAddress = patientProfile.preferredAbhaAddress || generateAbhaAddress(patientProfile.name, rawAbha, preferredAbhaDomain);

  // 4. Calculate verification security stamp (HMAC-SHA256)
  const integritySignature = crypto
    .createHmac('sha256', 'ABDM_NATIONAL_GATEWAY_SECRET_KEY')
    .update(`${rawAbha}:${patientId}:${patientProfile.name}:${facilityId}`)
    .digest('hex');

  // 5. Build full linked Firestore document payload conforming to firebase-blueprint.json
  const nowIso = new Date().toISOString();
  const linkedPatientDocument = {
    id: patientId,
    name: patientProfile.name,
    age: Number(patientProfile.age) || 35,
    gender: patientProfile.gender || 'Female',
    primaryFacilityId: facilityId,
    village: patientProfile.village || 'Rourkela Sector 4',
    district: patientProfile.district || 'Sundargarh',
    state: patientProfile.state || 'Odisha',
    pincode: patientProfile.pincode || '770001',
    // ABDM Specific Fields
    abhaId: rawAbha,
    rawAbhaNumber: rawAbha,
    abhaNumber: formattedAbha,
    abhaAddress: abhaAddress,
    kycStatus: 'VERIFIED',
    authMethods: ['AADHAAR_OTP', 'MOBILE_OTP'],
    linkedAt: nowIso,
    updatedAt: nowIso,
    abdmMetadata: {
      kycStatus: 'VERIFIED',
      kycVerificationDate: nowIso,
      aadhaarMasked: `XXXXXXXX${aadhaarLast4}`,
      registeredMobileMasked: `${mobile.slice(0, 6)}XXXX${mobile.slice(-2)}`,
      txnId: txnId,
      consentManager: ABDM_CONFIG.consentManagerId,
      gatewayAuthentication: {
        tokenType: 'Bearer',
        issuedAt: nowIso,
        status: 'ACTIVE_LINKED'
      },
      careContexts: [
        {
          patientReference: patientId,
          careContextReference: `CC-${facilityId}-OPD-${Date.now().toString(36).toUpperCase()}`,
          display: `Outpatient General Clinical Consultation - ${facilityName}`,
          serviceTier: 'phc'
        },
        {
          patientReference: patientId,
          careContextReference: `CC-${facilityId}-LAB-${Date.now().toString(36).toUpperCase()}`,
          display: 'Comprehensive Diagnostic & Pathology Panel',
          serviceTier: 'district_hospital'
        }
      ],
      digitalSignature: integritySignature
    }
  };

  // 6. Persist to Firestore or execute in Dry-Run
  if (dryRun || !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log(`\n======================================================`);
    console.log(`🇮🇳 ABDM MOCK INTEGRATION: ABHA LINKING (DRY-RUN)`);
    console.log(`======================================================`);
    console.log(` Patient ID:            ${patientId}`);
    console.log(` Patient Name:          ${patientProfile.name}`);
    console.log(` 14-Digit ABHA Number:  ${formattedAbha} (Valid Luhn Checked: ${validateAbhaNumber(formattedAbha)})`);
    console.log(` ABHA PHR Address:      ${abhaAddress}`);
    console.log(` KYC Status:            VERIFIED (Aadhaar OTP Handshake)`);
    console.log(` Linked Facility:       ${facilityName} (${facilityId})`);
    console.log(` Transaction Ref:       ${txnId}`);
    console.log(`======================================================\n`);

    return {
      success: true,
      mode: 'DRY_RUN',
      patientId,
      formattedAbha,
      rawAbha,
      abhaAddress,
      patientDocument: linkedPatientDocument
    };
  }

  // Live Firestore Write
  try {
    const db = getFirestoreInstance();
    if (!db) {
      throw new Error('Firestore database instance unavailable.');
    }
    const patientDocRef = db.collection('patients').doc(patientId);
    await patientDocRef.set(linkedPatientDocument, { merge: true });
    console.log(`✅ [FIRESTORE LIVE] Linked patient ${patientId} with ABHA ${formattedAbha} in collection 'patients'.`);

    return {
      success: true,
      mode: 'LIVE_FIRESTORE',
      patientId,
      formattedAbha,
      rawAbha,
      abhaAddress,
      patientDocument: linkedPatientDocument
    };
  } catch (error) {
    console.error(`❌ [FIRESTORE ERROR] Failed to link ABHA in Firestore:`, error);
    throw error;
  }
}

// ============================================================================
// 5. JSON PAYLOAD STRUCTURE FOR SECURE NATIONAL REGISTRY PUSH (ABDM M3)
// ============================================================================

/**
 * Builds the official FHIR R4 Bundle and cryptographic transfer envelope required
 * to securely push a longitudinal summarized digital health record to India's
 * ABDM National Health Information Network (HIU / Gateway).
 *
 * Conforms to:
 * - ABDM M3 Health Information Provider (HIP) Data Transfer Specifications
 * - HL7 FHIR R4 Standard (type: document)
 * - LOINC 60591-5 (Patient Summary Document)
 * - End-to-end ECDH (Curve25519) + AES-GCM-256 session key exchange envelope
 *
 * @param {Object} params - Longitudinal record components
 * @returns {Object} ABDM National Gateway Push JSON Payload
 */
export function createAbdmSummarizedHealthRecordPayload(params = {}) {
  const {
    patient = {},
    encounters = [],
    diagnosticOrders = [],
    prescriptions = [],
    surgeries = [],
    referrals = [],
    facility = {},
    consent = {}
  } = params;

  const nowIso = new Date().toISOString();
  const patientId = patient.id || 'PAT-DEMO-001';
  const abhaNumber = patient.abhaNumber || '91-5839-2041-8932';
  const abhaAddress = patient.abhaAddress || 'sunita.devi.8932@abdm';
  const facilityId = facility.facilityId || ABDM_CONFIG.defaultFacilityId;
  const facilityHfr = facility.hfrId || ABDM_CONFIG.defaultFacilityHfrId;
  const facilityName = facility.name || ABDM_CONFIG.defaultFacilityName;
  const practitionerHpr = ABDM_CONFIG.defaultPractitionerHprId;
  const practitionerName = ABDM_CONFIG.defaultPractitionerName;

  const transactionId = crypto.randomUUID();
  const consentId = consent.id || `CONSENT-ABDM-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

  // --------------------------------------------------------------------------
  // FHIR R4 Bundle Resource Construction (Type: document)
  // --------------------------------------------------------------------------
  const bundleId = `BUNDLE-${patientId}-${Date.now()}`;
  const compositionId = `COMP-${patientId}-${Date.now()}`;

  // 1. Composition Resource (Anchor of FHIR Document)
  const compositionResource = {
    resourceType: 'Composition',
    id: compositionId,
    status: 'final',
    type: {
      coding: [
        {
          system: 'http://loinc.org',
          code: ABDM_CONFIG.loincCodes.patientSummary,
          display: 'Patient Summary Document'
        }
      ],
      text: 'Longitudinal Cross-Tier Clinical Health Summary'
    },
    subject: {
      reference: `Patient/${patientId}`,
      display: `${patient.name || 'Patient'} (ABHA: ${abhaNumber})`
    },
    date: nowIso,
    author: [
      {
        reference: `Practitioner/${practitionerHpr}`,
        display: practitionerName
      }
    ],
    title: 'Ayushman Bharat Digital Health Record Longitudinal Summary',
    custodian: {
      reference: `Organization/${facilityHfr}`,
      display: facilityName
    },
    section: [
      {
        title: 'Physiological Vital Signs & Biometrics',
        code: {
          coding: [{ system: 'http://loinc.org', code: ABDM_CONFIG.loincCodes.vitalSigns, display: 'Vital signs' }]
        },
        entry: [
          { reference: `Observation/obs-vitals-${patientId}` }
        ]
      },
      {
        title: 'Clinical Encounters & Chief Complaints',
        code: {
          coding: [{ system: 'http://loinc.org', code: ABDM_CONFIG.loincCodes.chiefComplaints, display: 'Chief complaint' }]
        },
        entry: encounters.map((e, idx) => ({ reference: `Encounter/enc-${e.id || idx}` }))
      },
      {
        title: 'Active Clinical Diagnoses & Chronic Conditions',
        code: {
          coding: [{ system: 'http://loinc.org', code: ABDM_CONFIG.loincCodes.diagnoses, display: 'Problem list' }]
        },
        entry: [
          { reference: `Condition/cond-primary-${patientId}` }
        ]
      },
      {
        title: 'Prescribed Medications & Pharmacotherapy',
        code: {
          coding: [{ system: 'http://loinc.org', code: ABDM_CONFIG.loincCodes.medications, display: 'Medication summary' }]
        },
        entry: prescriptions.map((p, idx) => ({ reference: `MedicationRequest/med-${p.id || idx}` }))
      },
      {
        title: 'Diagnostic Investigations & Laboratory Panels',
        code: {
          coding: [{ system: 'http://loinc.org', code: ABDM_CONFIG.loincCodes.labResults, display: 'Diagnostic studies' }]
        },
        entry: diagnosticOrders.map((d, idx) => ({ reference: `DiagnosticReport/diag-${d.id || idx}` }))
      },
      {
        title: 'Cross-Tier Referral Escalations & Movement',
        code: {
          coding: [{ system: 'http://loinc.org', code: ABDM_CONFIG.loincCodes.referrals, display: 'Referral note' }]
        },
        entry: referrals.map((r, idx) => ({ reference: `ServiceRequest/ref-${r.id || idx}` }))
      }
    ]
  };

  // 2. Patient Resource
  const patientResource = {
    resourceType: 'Patient',
    id: patientId,
    identifier: [
      {
        system: 'https://healthid.abdm.gov.in',
        type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0203', code: 'MR', display: 'ABHA Number' }] },
        value: abhaNumber
      },
      {
        system: 'https://phr.abdm.gov.in',
        type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0203', code: 'PRN', display: 'ABHA Address' }] },
        value: abhaAddress
      }
    ],
    name: [{ text: patient.name || 'Sunita Devi' }],
    gender: (patient.gender || 'female').toLowerCase(),
    birthDate: patient.age ? `${new Date().getFullYear() - patient.age}-01-01` : '1989-01-01',
    address: [
      {
        line: [patient.village || 'Rourkela Sector 4'],
        city: patient.district || 'Sundargarh',
        district: patient.district || 'Sundargarh',
        state: patient.state || 'Odisha',
        postalCode: patient.pincode || '770001',
        country: 'India'
      }
    ]
  };

  // 3. Practitioner Resource
  const practitionerResource = {
    resourceType: 'Practitioner',
    id: practitionerHpr,
    identifier: [
      {
        system: 'https://hpr.abdm.gov.in',
        value: practitionerHpr
      }
    ],
    name: [{ text: practitionerName }]
  };

  // 4. Organization Resource (Healthcare Facility)
  const organizationResource = {
    resourceType: 'Organization',
    id: facilityHfr,
    identifier: [
      {
        system: 'https://facility.abdm.gov.in',
        value: facilityHfr
      }
    ],
    name: facilityName,
    type: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/organization-type',
            code: 'prov',
            display: 'Healthcare Provider'
          }
        ]
      }
    ]
  };

  // 5. Observations: Multi-parameter vital signs
  const observationResource = {
    resourceType: 'Observation',
    id: `obs-vitals-${patientId}`,
    status: 'final',
    category: [
      {
        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }]
      }
    ],
    code: {
      coding: [{ system: 'http://loinc.org', code: ABDM_CONFIG.loincCodes.vitalSigns, display: 'Vital signs panel' }]
    },
    subject: { reference: `Patient/${patientId}` },
    effectiveDateTime: nowIso,
    component: [
      {
        code: { coding: [{ system: 'http://loinc.org', code: ABDM_CONFIG.loincCodes.systolicBP, display: 'Systolic blood pressure' }] },
        valueQuantity: { value: 124, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' }
      },
      {
        code: { coding: [{ system: 'http://loinc.org', code: ABDM_CONFIG.loincCodes.diastolicBP, display: 'Diastolic blood pressure' }] },
        valueQuantity: { value: 78, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' }
      },
      {
        code: { coding: [{ system: 'http://loinc.org', code: ABDM_CONFIG.loincCodes.heartRate, display: 'Heart rate' }] },
        valueQuantity: { value: 76, unit: '/min', system: 'http://unitsofmeasure.org', code: '/min' }
      },
      {
        code: { coding: [{ system: 'http://loinc.org', code: ABDM_CONFIG.loincCodes.spo2, display: 'Oxygen saturation in Arterial blood' }] },
        valueQuantity: { value: 98, unit: '%', system: 'http://unitsofmeasure.org', code: '%' }
      },
      {
        code: { coding: [{ system: 'http://loinc.org', code: ABDM_CONFIG.loincCodes.glucose, display: 'Glucose [Mass/volume] in Blood' }] },
        valueQuantity: { value: 112, unit: 'mg/dL', system: 'http://unitsofmeasure.org', code: 'mg/dL' }
      }
    ]
  };

  // 6. Condition Resource (ICD-10 Primary Diagnosis)
  const conditionResource = {
    resourceType: 'Condition',
    id: `cond-primary-${patientId}`,
    clinicalStatus: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }]
    },
    verificationStatus: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'confirmed' }]
    },
    category: [
      {
        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'encounter-diagnosis' }]
      }
    ],
    code: {
      coding: [
        { system: 'http://hl7.org/fhir/sid/icd-10', code: 'I10', display: 'Essential (primary) hypertension' },
        { system: 'http://snomed.info/sct', code: '59621000', display: 'Essential hypertension' }
      ],
      text: 'Essential Hypertension Grade 1'
    },
    subject: { reference: `Patient/${patientId}` },
    recordedDate: nowIso
  };

  // 7. Prescriptions / Medication Requests
  const medicationEntries = (prescriptions.length > 0 ? prescriptions : [
    { id: 'rx-01', medicineName: 'Amlodipine 5mg', dosage: '1 tablet once daily (morning)', duration: '30 days' },
    { id: 'rx-02', medicineName: 'Paracetamol 650mg', dosage: 'SOS (as needed for fever/pain)', duration: '5 days' }
  ]).map((rx, idx) => ({
    resource: {
      resourceType: 'MedicationRequest',
      id: `med-${rx.id || idx}`,
      status: 'active',
      intent: 'order',
      medicationCodeableConcept: {
        coding: [{ system: 'http://snomed.info/sct', code: '318851002', display: rx.medicineName }],
        text: rx.medicineName
      },
      subject: { reference: `Patient/${patientId}` },
      dosageInstruction: [{ text: `${rx.dosage} for ${rx.duration}` }]
    }
  }));

  // 8. Diagnostic Reports
  const diagnosticEntries = (diagnosticOrders.length > 0 ? diagnosticOrders : [
    { id: 'lab-01', testName: 'Complete Blood Count (CBC)', status: 'Completed', resultSummary: 'Hb 12.8 g/dL, Platelets 240k, TLC 7,800/uL' },
    { id: 'lab-02', testName: 'Serum Creatinine & Blood Urea', status: 'Completed', resultSummary: 'Creatinine 0.9 mg/dL (Normal renal function)' }
  ]).map((dg, idx) => ({
    resource: {
      resourceType: 'DiagnosticReport',
      id: `diag-${dg.id || idx}`,
      status: 'final',
      code: {
        coding: [{ system: 'http://loinc.org', code: '58410-2', display: dg.testName }],
        text: dg.testName
      },
      subject: { reference: `Patient/${patientId}` },
      conclusion: dg.resultSummary || 'Normal limits'
    }
  }));

  // Build FHIR R4 Document Bundle
  const fhirBundle = {
    resourceType: 'Bundle',
    id: bundleId,
    identifier: {
      system: 'https://healthid.abdm.gov.in/bundle',
      value: bundleId
    },
    type: 'document',
    timestamp: nowIso,
    entry: [
      { resource: compositionResource },
      { resource: patientResource },
      { resource: practitionerResource },
      { resource: organizationResource },
      { resource: observationResource },
      { resource: conditionResource },
      ...medicationEntries,
      ...diagnosticEntries
    ]
  };

  // --------------------------------------------------------------------------
  // ABDM Cryptographic Push Envelope (Curve25519 ECDH + AES-GCM-256)
  // --------------------------------------------------------------------------
  const stringifiedFhir = JSON.stringify(fhirBundle);
  const bundleChecksum = crypto.createHash('sha256').update(stringifiedFhir).digest('hex');

  // Generate simulated ephemeral Diffie-Hellman public key & nonce
  const ephemeralKeyPair = crypto.generateKeyPairSync('x25519');
  const exportedPublicKey = ephemeralKeyPair.publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
  const nonce = crypto.randomBytes(12).toString('base64');

  // Digital Signature of payload for National Registry Non-repudiation
  const digitalSignature = crypto
    .createHmac('sha256', 'ABDM_REGISTRY_SIGNING_KEY')
    .update(`${transactionId}:${bundleChecksum}:${nowIso}`)
    .digest('hex');

  // Full ABDM Push Payload Specification
  const abdmPushPayload = {
    pageNumber: 1,
    pageCount: 1,
    transactionId: transactionId,
    hipId: facilityId,
    timestamp: nowIso,
    consent: {
      id: consentId,
      status: 'GRANTED',
      grantedOn: nowIso,
      expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      dataEraseAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      hiTypes: [
        'DischargeSummary',
        'Prescription',
        'DiagnosticReport',
        'OPConsultation'
      ]
    },
    keyMaterial: {
      cryptoAlg: 'ECDH',
      curve: 'Curve25519',
      dhPublicKey: {
        expiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        parameters: 'Curve25519/OurPublicKey',
        keyValue: exportedPublicKey
      },
      nonce: nonce
    },
    dataPushUrl: `${ABDM_CONFIG.gatewayBaseUrl}/v0.5/health-information/transfer`,
    entries: [
      {
        content: stringifiedFhir,
        media: 'application/fhir+json',
        checksum: bundleChecksum,
        careContextReference: `CC-${facilityId}-OPD-${patientId}`
      }
    ],
    signature: digitalSignature
  };

  return {
    abdmPushPayload,
    fhirBundle,
    metadata: {
      patientId,
      abhaNumber,
      abhaAddress,
      facilityName,
      totalEntries: fhirBundle.entry.length,
      checksum: bundleChecksum,
      signature: digitalSignature
    }
  };
}

// ============================================================================
// 6. FUNCTION: PUSH SUMMARIZED RECORD TO NATIONAL REGISTRY (SIMULATION)
// ============================================================================

/**
 * Simulates dispatching the secure FHIR health record payload to India's
 * ABDM National Health Authority (NHA) Gateway.
 *
 * @param {Object} abdmPayload - Prepared ABDM push envelope
 * @param {Object} [options={}] - Push configuration
 * @returns {Promise<Object>} Gateway acknowledgment response
 */
export async function pushSummarizedRecordToNationalRegistry(abdmPayload, options = {}) {
  const { transactionId = abdmPayload.transactionId } = options;

  console.log(`\n======================================================`);
  console.log(`🇮🇳 ABDM NATIONAL REGISTRY HEALTH RECORD DISPATCH`);
  console.log(`======================================================`);
  console.log(` Gateway Endpoint:     ${abdmPayload.dataPushUrl || ABDM_CONFIG.gatewayBaseUrl}`);
  console.log(` Transaction ID:       ${transactionId}`);
  console.log(` HIP Provider ID:      ${abdmPayload.hipId}`);
  console.log(` Consent Artifact ID:  ${abdmPayload.consent?.id}`);
  console.log(` Crypto Algorithm:     ${abdmPayload.keyMaterial?.cryptoAlg} (${abdmPayload.keyMaterial?.curve})`);
  console.log(` Total Payload Size:   ${Buffer.byteLength(JSON.stringify(abdmPayload))} bytes`);
  console.log(` Digital Signature:    ${abdmPayload.signature?.slice(0, 32)}...`);
  console.log(`======================================================\n`);

  // Simulate gateway acknowledgment round-trip
  await new Promise((resolve) => setTimeout(resolve, 300));

  const acknowledgment = {
    status: 'ACCEPTED',
    httpCode: 202,
    timestamp: new Date().toISOString(),
    transactionId: transactionId,
    ack: {
      status: 'SUCCESS',
      correlationId: crypto.randomUUID(),
      registryNode: 'NHA-ABDM-GW-DELHI-01',
      recordsStored: abdmPayload.entries?.length || 1,
      message: 'Longitudinal summarized health record accepted and indexed in national registry ledger.'
    }
  };

  console.log(`✅ [GATEWAY ACKNOWLEDGED] 202 Accepted. Correlation ID: ${acknowledgment.ack.correlationId}`);
  return acknowledgment;
}

// ============================================================================
// 7. CLI RUNNER & DEMONSTRATION WORKFLOW
// ============================================================================

export async function runDemonstration() {
  const isDryRun = process.argv.includes('--dry-run') || !process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const isPushOnly = process.argv.includes('--push');

  console.log('\n================================================================');
  console.log('🇮🇳 INDIA ABDM (AYUSHMAN BHARAT DIGITAL MISSION) MOCK INTEGRATION');
  console.log('================================================================');
  console.log(`Mode:           ${isDryRun ? 'DRY-RUN (Local Verification & Schema Validation)' : 'LIVE FIRESTORE'}`);
  console.log(`Timestamp:      ${new Date().toISOString()}`);
  console.log('================================================================\n');

  // Sample Multi-Tier Patient Profile (Sunita Devi, 46yo female moving across facilities)
  const samplePatient = {
    id: 'PAT-OD-SUN-4921',
    name: 'Sunita Devi',
    age: 46,
    gender: 'Female',
    village: 'Bargaon Village, Sundargarh',
    district: 'Sundargarh',
    state: 'Odisha',
    pincode: '770016',
    mobile: '+91 98452 18932',
    aadhaarLast4: '8932'
  };

  // STEP 1: Generate & Link 14-Digit ABHA
  console.log('▶ STEP 1: Generating 14-digit ABHA & Linking to Firestore Patient Profile...');
  const linkingResult = await generateAndLinkAbhaToPatientProfile(samplePatient, {
    dryRun: isDryRun,
    facilityId: ABDM_CONFIG.defaultFacilityId,
    facilityName: ABDM_CONFIG.defaultFacilityName
  });

  // STEP 2: Build Structured Summarized Health Record (FHIR R4 Bundle + ABDM Envelope)
  console.log('▶ STEP 2: Creating ABDM FHIR R4 Longitudinal Digital Health Record Payload...');
  const { abdmPushPayload, fhirBundle, metadata } = createAbdmSummarizedHealthRecordPayload({
    patient: {
      ...samplePatient,
      abhaNumber: linkingResult.formattedAbha,
      abhaAddress: linkingResult.abhaAddress
    },
    encounters: [
      { id: 'ENC-01', type: 'Initial Triage & Antenatal Checkup', tier: 'sub_centre', facility: 'Bargaon Sub-Centre' },
      { id: 'ENC-02', type: 'Primary Clinical Consultation & Vitals', tier: 'phc', facility: 'Chandanpur PHC' },
      { id: 'ENC-03', type: 'Specialist Workup & Laparoscopic Procedure', tier: 'district_hospital', facility: ABDM_CONFIG.defaultFacilityName }
    ],
    prescriptions: [
      { id: 'RX-101', medicineName: 'Amlodipine 5mg Tablets', dosage: '1 tab daily PO', duration: '30 days' },
      { id: 'RX-102', medicineName: 'Metformin 500mg Tablets', dosage: '1 tab twice daily with meals', duration: '30 days' },
      { id: 'RX-103', medicineName: 'Oral Rehydration Salts (ORS)', dosage: '1 sachet in 1L clean water', duration: '3 days' }
    ],
    diagnosticOrders: [
      { id: 'LAB-201', testName: 'Hemoglobin & CBC Panel', status: 'Completed', resultSummary: 'Hb 11.4 g/dL, WBC 6,400/uL' },
      { id: 'LAB-202', testName: 'HbA1c Glycated Hemoglobin', status: 'Completed', resultSummary: 'HbA1c 6.8% (Target controlled)' },
      { id: 'LAB-203', testName: 'Rapid Malaria Antigen (Pf/Pv)', status: 'Completed', resultSummary: 'Negative for Pf/Pv antigen' }
    ],
    referrals: [
      { id: 'REF-301', reason: 'Abdominal ultrasound and specialist surgical consult', fromTier: 'phc', toTier: 'district_hospital' }
    ],
    facility: {
      facilityId: ABDM_CONFIG.defaultFacilityId,
      hfrId: ABDM_CONFIG.defaultFacilityHfrId,
      name: ABDM_CONFIG.defaultFacilityName
    }
  });

  console.log(`\nFHIR Bundle Summary:`);
  console.log(` • Resource Type:      ${fhirBundle.resourceType} (type: ${fhirBundle.type})`);
  console.log(` • Document ID:        ${fhirBundle.id}`);
  console.log(` • Total FHIR Entries: ${metadata.totalEntries} resources (Composition, Patient, Practitioner, Org, Obs, Cond, Meds, Labs)`);
  console.log(` • Payload SHA-256:    ${metadata.checksum}`);

  // STEP 3: Push Summarized Record to National Registry
  console.log('\n▶ STEP 3: Securely Pushing Payload to ABDM National Health Registry...');
  const dispatchResponse = await pushSummarizedRecordToNationalRegistry(abdmPushPayload);

  console.log('\n================================================================');
  console.log('🎉 ABDM INTEGRATION VERIFICATION COMPLETE');
  console.log('================================================================');
  console.log(`• ABHA Generated:     ${linkingResult.formattedAbha} (Valid: ${validateAbhaNumber(linkingResult.formattedAbha)})`);
  console.log(`• PHR Handle:         ${linkingResult.abhaAddress}`);
  console.log(`• National Sync:      ${dispatchResponse.ack.status} (${dispatchResponse.ack.message})`);
  console.log('================================================================\n');

  return {
    linkingResult,
    abdmPushPayload,
    dispatchResponse
  };
}

// Auto-run when executed directly via Node.js
const isDirectExecution = process.argv[1] && (
  path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname) ||
  process.argv[1].endsWith('abdm-mock-integration.js')
);

if (isDirectExecution) {
  runDemonstration().catch((err) => {
    console.error('Fatal error in ABDM demonstration execution:', err);
    process.exit(1);
  });
}
