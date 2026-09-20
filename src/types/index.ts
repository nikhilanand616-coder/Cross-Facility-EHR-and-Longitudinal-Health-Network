export type FacilityTier = 'sub_centre' | 'phc' | 'rural_hospital' | 'district_hospital';

export type LanguageCode = 'en' | 'hi' | 'bn' | 'es' | 'fr' | 'te';

export type UserRole =
  | 'doctor'
  | 'nurse_asha'
  | 'nurse_cho'
  | 'pharmacist'
  | 'lab_tech'
  | 'billing_specialist'
  | 'admin'
  | 'patient';

export type NetworkMode = 'online' | 'intermittent' | 'offline';

export interface Facility {
  id: string;
  name: string;
  tier: FacilityTier;
  district: string;
  state: string;
  stateCode?: string;
  pincode?: string;
  latitude: number;
  longitude: number;
  beds: number;
  hasLab: boolean;
  hasPharmacy: boolean;
  hasEmergency: boolean;
  contactNumber: string;
  headOfFacility: string;
  connectivityStatus: 'connected' | 'degraded' | 'offline';
}

export interface VitalsRecord {
  timestamp: string;
  facilityId: string;
  facilityName: string;
  systolic: number; // mmHg
  diastolic: number; // mmHg
  heartRate: number; // bpm
  temperature: number; // Celsius
  spo2: number; // %
  bloodGlucose: number; // mg/dL
  respiratoryRate: number; // breaths/min
  weightKg: number;
  heightCm: number;
  bmi: number;
}

export interface SOAPNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface PrescriptionItem {
  id: string;
  drugName: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  instructions: string;
  dispensedStatus: 'pending' | 'dispensed' | 'out_of_stock';
  dispensingFacilityId?: string;
}

export interface ClinicalEncounter {
  id: string;
  patientId: string;
  facilityId: string;
  facilityName: string;
  facilityTier: FacilityTier;
  providerName: string;
  providerRole: string;
  date: string;
  encounterType: 'outpatient' | 'inpatient' | 'emergency' | 'telemedicine' | 'field_visit';
  chiefComplaint: string;
  vitals: VitalsRecord;
  soap: SOAPNote;
  icd10Diagnoses: Array<{ code: string; description: string; type: 'primary' | 'secondary' }>;
  prescriptions: PrescriptionItem[];
  encryptedHash: string;
  syncStatus: 'synced' | 'pending' | 'conflict';
  version: number;
}

export interface LongitudinalPatient {
  id: string;
  nationalHealthId: string; // e.g. ABHA-91-2041-8832-1102
  mrn: string;
  name: string;
  age: number;
  gender: 'Female' | 'Male' | 'Other';
  dob: string;
  phone: string;
  email?: string;
  bloodGroup: string;
  allergies: string[];
  chronicConditions: string[];
  villageOrCity: string;
  district: string;
  primaryFacilityId: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  consentGranted: boolean;
  consentTimestamp: string;
  insuranceScheme?: string; // e.g., 'PM-JAY Comprehensive Rural Cover'
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  e2eeFingerprint: string;
  createdOffline?: boolean;
  offlineSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type ReferralUrgency = 'routine' | 'urgent' | 'emergency';
export type ReferralStatus =
  | 'initiated'
  | 'in_transit'
  | 'triaged'
  | 'admitted'
  | 'completed'
  | 'counter_referred';

export interface Referral {
  id: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  originatingFacilityId: string;
  originatingFacilityName?: string;
  destinationFacilityId: string;
  destinationFacilityName?: string;
  urgency: ReferralUrgency;
  status: ReferralStatus;
  clinicalReason: string;
  referringClinician: string;
  specialtyRequired: string;
  transportMode: 'Ambulance 108' | 'Facility Vehicle' | 'Private/Public Transport';
  initiatedDate: string;
  admittedDate?: string;
  completedDate?: string;
  triageNotes?: string;
  counterReferralNotes?: string;
  counterReferralFacilityId?: string;
  createdOffline?: boolean;
  offlineSyncedAt?: string;
  syncStatus: 'synced' | 'pending';
}

export type RoutingUrgencyLevel = 'Green' | 'Yellow' | 'Red';

export interface AutomatedReferralRecommendation {
  urgencyLevel: RoutingUrgencyLevel;
  recommendedAction: string;
  targetFacilityTier: FacilityTier | 'same_facility';
  justification: string;
  targetFacilityNode?: {
    id: string;
    name: string;
    tier: FacilityTier;
    district: string;
    state: string;
    pincode?: string;
    estimatedDistanceKm?: number;
    headOfFacility?: string;
    contactNumber?: string;
  };
  triageSeverityScore?: number;
  clinicalRedFlags?: string[];
  bedsideStabilizationProtocols?: string[];
  recommendedTransportMode?: 'Ambulance 108 (ALS)' | 'Ambulance 108 (BLS)' | 'Facility Transport' | 'Normal Transport';
  detectedLanguage?: string;
  translatedSymptoms?: string;
  source?: string;
}

export interface DiagnosticResultItem {
  parameter: string;
  value: number | string;
  unit: string;
  referenceRange: string;
  flag: 'normal' | 'low' | 'high' | 'critical';
}

export interface DiagnosticOrder {
  id: string;
  patientId: string;
  patientName: string;
  orderingFacilityId: string;
  orderingFacilityName?: string;
  processingFacilityId: string;
  processingFacilityName?: string;
  testCode: string;
  testName: string;
  category: 'hematology' | 'biochemistry' | 'microbiology' | 'radiology' | 'point_of_care';
  priority: 'routine' | 'urgent' | 'stat';
  status: 'ordered' | 'sample_collected' | 'in_transit' | 'processing' | 'completed' | 'critical';
  orderedBy: string;
  orderedDate: string;
  sampleCollectedDate?: string;
  completedDate?: string;
  results?: DiagnosticResultItem[];
  pathologistNotes?: string;
  specimenType: string;
  sampleBarCode: string;
  // Imaging & Radiology specific metadata
  modalityType?: 'X-Ray' | 'Ultrasound' | 'CT Scan' | 'MRI' | 'ECG' | 'Echocardiogram' | 'Other';
  anatomicalSite?: string;
  clinicalIndication?: string;
  imagingFindings?: {
    technique?: string;
    findings?: string;
    impression?: string;
    recommendations?: string;
    radiologistName?: string;
    pacsViewerUrl?: string;
  };
  createdOffline?: boolean;
  offlineSyncedAt?: string;
  syncStatus: 'synced' | 'pending';
}

export interface MedicineRequisition {
  id: string;
  requisitionNumber: string;
  medicineId: string;
  medicineName: string;
  strength?: string;
  fromFacilityId: string;
  fromFacilityName: string;
  toFacilityId: string;
  toFacilityName: string;
  quantityRequested: number;
  urgency: 'routine' | 'urgent' | 'emergency';
  reason: 'stockout_prevention' | 'epidemic_surge' | 'seasonal_requirement' | 'routine_replenishment';
  status: 'requested' | 'approved' | 'in_transit' | 'received' | 'rejected';
  requestedBy: string;
  requestedDate: string;
  approvedBy?: string;
  approvedDate?: string;
  dispatchedDate?: string;
  receivedDate?: string;
  batchNumberAssigned?: string;
  notes?: string;
}

export interface MedicineStockItem {
  id: string;
  drugName: string;
  genericName: string;
  strength: string;
  category: string;
  form: 'tablet' | 'syrup' | 'injection' | 'inhaler' | 'capsule';
  isEssentialDrugList: boolean;
  facilityStocks: Record<
    string,
    {
      facilityName: string;
      tier: FacilityTier;
      quantity: number;
      minThreshold: number;
      batchNumber: string;
      expiryDate: string;
      status: 'optimal' | 'low' | 'stockout';
    }
  >;
}

export interface FacilityInventoryRecord {
  id: string;
  facilityId: string;
  facilityName: string;
  district: string;
  tier: FacilityTier;
  medicineId: string;
  medicineName: string;
  category: 'antibiotic' | 'vaccine' | 'hydration' | 'maternal' | 'analgesic' | 'cardiovascular' | 'essential';
  currentStock: number;
  minThreshold: number;
  unit: string;
  status: 'optimal' | 'low' | 'stockout';
  batchNumber?: string;
  expiryDate?: string;
  daysOfSupplyRemaining?: number;
  lastUpdated: string;
}

export interface DiagnosticEquipmentRecord {
  id: string;
  facilityId: string;
  facilityName: string;
  district: string;
  tier: FacilityTier;
  name: string;
  category: 'laboratory' | 'cold_chain' | 'maternal_care' | 'point_of_care' | 'imaging';
  status: 'operational' | 'maintenance_needed' | 'breakdown' | 'calibration_due';
  uptimePercent: number;
  serialNumber: string;
  lastServicedDate: string;
  nextScheduledService?: string;
  reportedIssue?: string;
  technicianContact?: string;
}

export interface InventoryTransferRecord {
  id: string;
  transferNumber: string;
  sourceFacilityId: string;
  sourceFacilityName: string;
  targetFacilityId: string;
  targetFacilityName: string;
  district: string;
  medicineId: string;
  medicineName: string;
  quantity: number;
  unit: string;
  reason: string;
  status: 'approved' | 'in_transit' | 'delivered';
  authorizedBy: string;
  digitalSignature: string;
  sourceStockBefore: number;
  sourceStockAfter: number;
  targetStockBefore: number;
  targetStockAfter: number;
  createdAt: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone?: string;
  patientEmail?: string;
  facilityId: string;
  facilityName?: string;
  doctorName?: string;
  providerName?: string;
  department: string;
  date?: string;
  timeSlot?: string;
  scheduledTime?: string;
  type?: 'in_person' | 'teleconsult';
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  reminderPreferences?: {
    sms?: boolean;
    email?: boolean;
    push?: boolean;
    reminderSent?: boolean;
  };
  remindersSent?: {
    sms: boolean;
    smsTimestamp?: string;
    email: boolean;
    emailTimestamp?: string;
    push: boolean;
    pushTimestamp?: string;
  };
  reason?: string;
  notes?: string;
  syncStatus?: string;
}

export interface BillingInvoice {
  id: string;
  invoiceNumber?: string;
  patientId: string;
  patientName?: string;
  facilityId: string;
  facilityName: string;
  date: string;
  items: Array<{ description: string; code?: string; cost?: number; amount?: number; quantity?: number }>;
  totalAmount: number;
  subsidizedAmount?: number;
  insuranceCovered?: number;
  patientPayable?: number;
  paymentStatus: 'paid' | 'pending' | 'waived_schemes';
  paymentMethod?: 'UPI / QR' | 'UPI / RuPay' | 'Cash at Counter' | 'PM-JAY Direct Benefit' | 'Debit/Card' | string;
  insuranceClaim?: {
    schemeName: string;
    status: string;
  };
  schemeName?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  role: UserRole | string;
  action: 'READ' | 'WRITE' | 'EXPORT' | 'EVALUATE_AI' | 'REFERRAL_INIT' | 'DISPENSE' | 'SYNC_BATCH' | 'VIEW_RECORD' | 'EDIT_RECORD' | 'CDSS_INFERENCE' | 'EMERGENCY_OVERRIDE' | string;
  resourceType?: 'Patient' | 'Encounter' | 'Vitals' | 'Referral' | 'Diagnostic' | 'Pharmacy' | 'Billing' | string;
  resourceId: string;
  patientId?: string;
  facilityId: string;
  facilityName?: string;
  ipAddress?: string;
  details?: string;
  encryptionVerified?: boolean;
  hashSignature?: string;
  e2eeCipherHash?: string;
}

export interface SyncQueueItem {
  id: string;
  collection: 'encounters' | 'clinical_encounters' | 'referrals' | 'diagnostics' | 'vitals' | 'appointments' | 'patients' | string;
  action: 'INSERT' | 'UPDATE' | 'create' | string;
  data: any;
  createdOfflineAt: string;
  retryCount: number;
  status: 'queued' | 'syncing' | 'synced' | 'failed' | 'pending' | 'conflict' | string;
  errorMessage?: string;
}

export type ConflictResolutionStrategy =
  | 'last_write_wins'
  | 'server_clinical_authority'
  | 'frontline_client_priority'
  | 'three_way_merge'
  | 'manual_review';

export interface ConflictItem {
  id: string;
  queueItemId: string;
  collection: string;
  recordId: string;
  patientName?: string;
  localVersion: any;
  serverVersion: any;
  detectedAt: string;
  conflictingFields: string[];
  recommendedStrategy: ConflictResolutionStrategy;
  resolvedStrategy?: ConflictResolutionStrategy;
  resolvedAt?: string;
  resolvedBy?: string;
  status: 'pending_review' | 'resolved';
}

export interface AIDiagnosticRecommendation {
  condition: string;
  probability: string;
  icd10: string;
  rationale: string;
}

export interface AIDiagnosticResponse {
  success: boolean;
  source: string;
  differentialDiagnoses: AIDiagnosticRecommendation[];
  urgencyTier: 'Emergency' | 'Urgent' | 'Routine';
  recommendedWorkup: string[];
  contraindicationsAndInteractions: string[];
  facilityRoutingAdvice: string;
  redFlags: string[];
  clinicalNotes?: string;
  disclaimer: string;
}

export type ESITier = 1 | 2 | 3 | 4 | 5;

export interface DigitalTriageAssessment {
  id: string;
  patientId: string;
  patientName: string;
  evaluatedAt: string;
  esiTier: ESITier; // 1 = Resuscitation, 2 = Emergent, 3 = Urgent, 4 = Less Urgent, 5 = Non-urgent
  urgencyScore: number; // 1-100 (100 is most critical)
  priorityCategory: 'Immediate (Red)' | 'Emergent (Orange)' | 'Urgent (Yellow)' | 'Semi-Urgent (Green)' | 'Non-Urgent (Blue)';
  targetWaitMinutes: number;
  chiefComplaint: string;
  symptomsDuration: string;
  painScore: number; // 0 to 10
  vitalsSnapshot: {
    systolic?: number;
    diastolic?: number;
    heartRate?: number;
    spo2?: number;
    temperature?: number;
    respiratoryRate?: number;
    bloodGlucose?: number;
  };
  criticalRedFlags: string[];
  immediateBedsideActions: string[];
  departmentAllocation: string;
  clinicalReasoning: string;
  source: 'gemini-3.8-flash' | 'clinical_triage_rules' | string;
}

export type QueueStatus =
  | 'triage_pending'
  | 'waiting'
  | 'called'
  | 'in_consultation'
  | 'diagnostic_pending'
  | 'pharmacy_pending'
  | 'completed'
  | 'no_show';

export interface QueueItem {
  id: string;
  tokenNumber: string; // e.g., 'EMERG-01', 'URG-04', 'STD-12', 'TELE-03'
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  facilityId: string;
  department: string;
  checkInTime: string;
  appointmentId?: string;
  isWalkIn: boolean;
  status: QueueStatus;
  triageAssessment?: DigitalTriageAssessment;
  assignedRoom?: string;
  assignedProvider?: string;
  calledAt?: string;
  estimatedWaitMinutes: number;
  priorityWeight: number; // computed from ESI score + waiting duration
  notes?: string;
}

export interface TeleconsultationSession {
  id: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  originatingFacilityId: string;
  originatingFacilityName: string;
  referringProviderName: string;
  referringProviderRole: string;
  specialistFacilityId: string;
  specialistFacilityName: string;
  specialistName: string;
  specialty: string;
  scheduledTime: string;
  status: 'waiting' | 'in_progress' | 'completed' | 'cancelled';
  bandwidthMode: '2g_edge_resilient' | '3g_standard' | '4g_broadband';
  connectionLatencyMs: number;
  clinicalReason: string;
  sharedVitals: VitalsRecord;
  specialistNotes: string;
  recommendedPrescriptions: Array<{
    drugName: string;
    dosage: string;
    frequency: string;
    durationDays: number;
    instructions: string;
  }>;
  counterSigned: boolean;
  counterSignedAt?: string;
  digitalSignatureHash?: string;
}

// Emergency Escalation Protocol Types
export type EmergencyCodeType =
  | 'CODE_RED_OBSTETRIC'
  | 'CODE_BLUE_CARDIAC'
  | 'CODE_TRAUMA_GOLDEN_HOUR'
  | 'CODE_SEPSIS_ANAPHYLAXIS'
  | 'CODE_NEONATAL_RESPIRATORY';

export interface EmergencyEscalationAlert {
  id: string;
  codeType: EmergencyCodeType;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  originatingFacilityId: string;
  originatingFacilityName: string;
  originatingTier: FacilityTier;
  destinationFacilityId: string;
  destinationFacilityName: string;
  triggeredAt: string;
  triggeredBy: string;
  status: 'active' | 'in_transit' | 'bed_prepared' | 'received' | 'resolved';
  clinicalSummary: string;
  vitalsSnapshot: {
    systolic?: number;
    diastolic?: number;
    heartRate?: number;
    spo2?: number;
    temperature?: number;
    gcs?: number;
  };
  ambulanceDispatch?: {
    vehicleNumber: string;
    ambulanceType: 'ALS' | 'BLS';
    driverName: string;
    driverPhone: string;
    dispatchedFrom: string;
    etaMinutes: number;
    currentCoordinates: { lat: number; lng: number };
    paramedicName: string;
  };
  goldenHourChecklist: {
    airwaySecured: boolean;
    highFlowOxygen: boolean;
    twoLargeBoreIV: boolean;
    crystalloidBolusStarted: boolean;
    bloodGroupIdentified: string;
    bloodUnitsReserved: boolean;
    cervicalCollarApplied?: boolean;
    magnesiumSulfateBolusGiven?: boolean;
    digitalReferralDossierSent: boolean;
  };
  receivingTeamNotification: {
    physicianNotified: boolean;
    physicianName: string;
    traumaBayOrOTNumber: string;
    bedReserved: boolean;
    icuBedReady: boolean;
  };
}

// High-Risk Patient Tracking & Follow-up Types
export type HighRiskCohortType = 'maternal' | 'child' | 'chronic';

export interface HighRiskPatientRecord {
  id: string;
  patientId: string;
  patientName: string;
  age: number;
  gender: string;
  phone: string;
  villageOrCity: string;
  primaryFacilityId: string;
  primaryFacilityName: string;
  assignedAshaName: string;
  assignedAshaPhone: string;
  cohort: HighRiskCohortType;
  riskLevel: 'critical' | 'high' | 'moderate';
  primaryRiskFactors: string[];
  enrollmentDate: string;
  lastEncounterDate: string;
  nextFollowupDueDate: string;
  daysOverdue: number;
  status: 'active' | 'overdue' | 'resolved' | 'escalated_to_mo';

  // Cohort-specific clinical tracking payloads
  maternalDetails?: {
    gestationalAgeWeeks: number;
    edd: string; // Expected date of delivery
    ancCompletedCount: number; // target 4
    hemoglobinGdl: number; // < 7 is severe anemia
    bloodPressure: string;
    highRiskFlags: ('severe_anemia' | 'preeclampsia' | 'gdm' | 'previous_csection' | 'rh_negative' | 'malpresentation')[];
    ifaTabletsIssued: number;
    tdVaccineDone: boolean;
    institutionalDeliveryFacility: string;
    postpartumPncDue?: string;
  };

  childDetails?: {
    ageMonths: number;
    birthWeightKg: number;
    currentWeightKg: number;
    muacCm: number; // Mid-upper arm circumference (<11.5 cm is SAM)
    nutritionStatus: 'SAM' | 'MAM' | 'Normal';
    immunizationStatus: 'up_to_date' | 'delayed' | 'dropout_alert';
    pendingVaccines: string[];
    completedVaccines: string[];
    hbncVisitsCompleted: number; // target 7 visits
  };

  chronicDetails?: {
    condition: 'Hypertension' | 'Type 2 Diabetes' | 'Pulmonary TB' | 'Chronic Kidney Disease';
    lastMeasuredReading: string; // e.g. "BP 168/104" or "HbA1c 9.4%" or "Sputum AFB Pos 2+"
    medicationAdherencePercent: number;
    edlMedicationSuppliedDays: number;
    complicationScreening: {
      retinopathyCheck: boolean;
      footUlcerCheck: boolean;
      renalProteinuria: boolean;
    };
    dotsAdherence?: {
      regimen: string;
      blisterPacksConsumed: number;
      blisterPacksTotal: number;
      sputumConversionMonth2: 'positive' | 'negative' | 'pending';
    };
  };

  followupTasks: Array<{
    id: string;
    taskType: 'home_visit_asha' | 'phc_opd_review' | 'teleconsult_specialist' | 'lab_workup' | 'sms_reminder';
    description: string;
    assignedTo: string;
    dueDate: string;
    status: 'pending' | 'completed' | 'overdue';
    completedAt?: string;
    notes?: string;
  }>;
}

// Facility Quality Monitoring & Accountability Types
export interface FacilityQualityScorecard {
  facilityId: string;
  facilityName: string;
  tier: FacilityTier;
  district: string;
  overallScore: number; // 0 - 100
  iphsCompliancePercentage: number;
  bedOccupancyRate: number;
  averageLengthOfStayDays: number;
  edlStockAvailabilityRate: number; // %
  referralLoopClosureRate: number; // %
  cleanlinessKayakalpScore: number; // 0 - 100
  staffingStatus: {
    doctorsSanctioned: number;
    doctorsInPosition: number;
    nursesSanctioned: number;
    nursesInPosition: number;
    labTechsInPosition: number;
    pharmacistsInPosition: number;
  };
  maternalChildIndicators: {
    institutionalDeliveriesMonth: number;
    cSectionRate: number; // %
    maternalDeathsMonth: number;
    maternalDeathAuditConducted: boolean;
    stillbirthRatePerThousand: number;
    samCasesReferred: number;
  };
  patientSatisfaction: {
    overallRating: number; // out of 5
    medicineAvailabilityRating: number;
    staffCourteousnessRating: number;
    cleanlinessRating: number;
    complaintsLogged: number;
    complaintsResolved: number;
  };
  supervisoryActionNotice?: {
    issuedDate: string;
    issuedBy: string;
    deficiencyArea: string;
    correctiveActionDeadline: string;
    status: 'pending_rectification' | 'compliant' | 'hearing_scheduled';
  };
}

// Post-Discharge Adherence Tracking Types for High-Risk Chronic Patients
export interface AdherenceMedicationItem {
  id: string;
  drugName: string;
  dosage: string;
  frequency: string; // e.g. "Morning & Night", "Once daily after breakfast"
  timing: 'morning' | 'afternoon' | 'evening' | 'bedtime';
  instructions?: string;
  taken: boolean;
  timeLogged?: string;
  missedReason?: string;
}

export interface AdherenceSymptomLog {
  systolicBp?: number;
  diastolicBp?: number;
  bloodGlucoseMgDl?: number;
  chestPain: boolean;
  shortnessOfBreath: boolean;
  dizzinessOrFainting: boolean;
  pedalEdema: boolean;
  severeHeadache: boolean;
  symptomSeverity: 'none' | 'mild' | 'moderate' | 'severe';
  additionalNotes?: string;
}

export interface DailyAdherenceCheckin {
  date: string; // YYYY-MM-DD
  checkinTimestamp: string;
  medications: AdherenceMedicationItem[];
  symptoms: AdherenceSymptomLog;
  allMedsTaken: boolean;
  offlineLogged: boolean;
  syncedToFirestore: boolean;
}

export interface DesignatedFrontlineWorker {
  workerId: string;
  workerName: string;
  workerRole: 'ASHA' | 'ANM' | 'CHO';
  phone: string;
  assignedSubCentreOrPhcId: string;
  assignedFacilityName: string;
  villageOrWard: string;
}

export interface PostDischargeAdherenceRecord {
  id: string;
  patientId: string;
  patientName: string;
  abhaAddress: string;
  age: number;
  gender: string;
  phone: string;
  village: string;
  district: string;
  dischargeDate: string;
  dischargingFacilityId: string;
  dischargingFacilityName: string;
  chronicConditions: string[]; // e.g. ["Severe Hypertension", "Type 2 Diabetes Mellitus", "Post-PCI / Stenting"]
  riskTier: 'critical' | 'high' | 'moderate';
  assignedFrontlineWorker: DesignatedFrontlineWorker;
  prescribedRegimen: AdherenceMedicationItem[];
  checkinHistory: DailyAdherenceCheckin[];
  consecutiveMissedDays: number;
  lastCheckinDate: string | null;
  overallAdherenceRatePercent: number;
  alertEscalationStatus: 'normal' | 'warning' | 'escalated_to_asha' | 'resolved';
  lastEscalationSentAt?: string;
  escalationCount: number;
  emergencyActionProtocol: string;
  createdAt: string;
  updatedAt: string;
}

export * from './firestore-registry';

