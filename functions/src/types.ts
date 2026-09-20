/**
 * Domain types for Pan-India Cross-Facility EHR Cloud Functions
 */

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type HighRiskCategory =
  | 'maternal_care'
  | 'severe_chronic_illness'
  | 'hypertension_pregnancy'
  | 'uncontrolled_diabetes'
  | 'severe_respiratory'
  | 'pediatric_malnutrition'
  | 'other';

export interface PatientRecord {
  id: string;
  name: string;
  age?: number;
  gender?: string;
  phone?: string;
  abhaId?: string;
  village?: string;
  subCentreId?: string;
  primaryFacilityId?: string;
  assignedAshaId?: string;
  assignedAshaName?: string;
  district?: string;
  state?: string;
  riskLevel?: RiskLevel;
  highRiskCategory?: HighRiskCategory;
  riskFactors?: string[];
  clinicalNotes?: string;
  lastAssessedAt?: string;
  lastFollowUpTaskId?: string;
  updatedAt?: string;
}

export interface HealthcareFacility {
  facilityId: string;
  name: string;
  tier: 'sub_centre' | 'phc' | 'rural_hospital' | 'district_hospital';
  state: string;
  district: string;
  pincode?: string;
  operationalStatus?: string;
  phone?: string;
  cmoPhone?: string;
  cmoName?: string;
  activeStaffCount?: {
    doctors?: number;
    nurses?: number;
    ashaWorkers?: number;
  };
}

export interface FollowUpTask {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone?: string;
  patientAge?: number;
  patientGender?: string;
  patientAbha?: string;
  village?: string;
  district: string;
  riskLevel: 'HIGH';
  highRiskCategory: HighRiskCategory | string;
  riskFactors: string[];
  assignedTo: string;
  assignedType: 'asha_worker' | 'sub_centre';
  assignedNodeId: string;
  assignedNodeName: string;
  type: 'high_risk_followup';
  status: 'pending' | 'in_progress' | 'completed' | 'missed' | 'escalated';
  priority: 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  clinicalProtocolChecklist: string[];
  targetSlaHours: number;
  dueDate: string; // ISO-8601
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
  escalated: boolean;
  escalationAlertId?: string;
}

export interface FollowUpAppointment {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone?: string;
  patientAbha?: string;
  facilityId: string;
  facilityName: string;
  district: string;
  state?: string;
  scheduledDate: string; // ISO-8601
  appointmentType: string;
  status: 'scheduled' | 'attended' | 'missed' | 'escalated';
  riskLevel: RiskLevel;
  highRiskCategory?: string;
  missedAt?: string;
  escalated?: boolean;
  escalatedAt?: string;
  escalatedTo?: {
    cmoName: string;
    role: string;
    phone: string;
    facilityId: string;
    facilityName: string;
  };
  lastSmsAlertId?: string;
}

export interface SmsDispatchPayload {
  recipientPhone: string;
  recipientRole: string;
  recipientName: string;
  messageBody: string;
  provider: 'twilio' | 'fast2sms' | 'mockup';
  patientId: string;
  patientName: string;
  appointmentId: string;
  district: string;
  urgency?: 'NORMAL' | 'HIGH' | 'CRITICAL';
}

export interface EscalationAlertRecord {
  id: string;
  appointmentId: string;
  patientId: string;
  patientName: string;
  patientPhone?: string;
  patientAbha?: string;
  district: string;
  scheduledDate: string;
  hoursOverdue: number;
  recipientRole: string;
  recipientName: string;
  recipientPhone: string;
  facilityId?: string;
  facilityName: string;
  smsProvider: 'twilio' | 'fast2sms' | 'mockup';
  smsStatus: 'sent' | 'simulated' | 'failed';
  messageBody: string;
  dispatchedAt: string;
  gatewayResponse?: any;
}

// ============================================================================
// PRIMARY HEALTH CENTRE (PHC) QUEUE OPTIMIZATION TYPES
// ============================================================================

export type ESITierLevel = 1 | 2 | 3 | 4 | 5;

export type PHCQueueItemStatus =
  | 'waiting'
  | 'in_consultation'
  | 'completed'
  | 'no_show'
  | 'referred'
  | 'escalated';

export interface GeminiTriageSummary {
  evaluatedAt: string;
  esiTier: ESITierLevel;
  urgencyScore: number; // 0-100
  priorityCategory: string; // 'Immediate (Red)' | 'Emergent (Orange)' | 'Urgent (Yellow)' | 'Semi-Urgent (Green)' | 'Non-Urgent (Blue)'
  chiefComplaint: string;
  criticalRedFlags: string[];
  immediateBedsideActions: string[];
  clinicalReasoning: string;
  source: string;
}

export interface PHCQueueItem {
  id: string;
  tokenNumber: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: 'Female' | 'Male' | 'Other' | string;
  facilityId: string;
  facilityName: string;
  department: string;
  checkInTime: string; // ISO-8601
  appointmentId?: string;
  isWalkIn: boolean;
  status: PHCQueueItemStatus;
  assignedRoom?: string;
  assignedDoctor?: string;
  consultationStartTime?: string;
  consultationDurationMinutes?: number;
  expectedConsultationDuration: number; // calculated based on case complexity
  esiTier: ESITierLevel;
  urgencyScore: number;
  isEmergencyEscalated: boolean; // Flagged when emergency escalation triggered by Gemini AI triage
  emergencyReason?: string;
  emergencyTriggeredAt?: string;
  geminiTriageSummary?: GeminiTriageSummary;
  priorityScore: number; // Computed dynamically: base + wait aging + emergency override
  queuePosition: number; // 1-indexed among waiting queue
  estimatedWaitMinutes: number; // Computed via M/M/c priority queuing model
  waitingDurationMinutes?: number;
  notes?: string;
  updatedAt: string;
}

export interface ConsultationRoomState {
  roomId: string;
  roomName: string;
  doctorName: string;
  department: string;
  isOccupied: boolean;
  currentPatientId?: string;
  currentPatientName?: string;
  currentTokenNumber?: string;
  consultationStartTime?: string;
  expectedConsultationMinutes: number;
  estimatedRemainingMinutes: number;
}

export interface PHCQueueOptimizationResult {
  facilityId: string;
  facilityName: string;
  timestamp: string;
  activeRoomsCount: number; // c in M/M/c
  totalActiveQueueCount: number;
  totalWaitingCount: number;
  totalInConsultationCount: number;
  emergencyEscalatedCount: number;
  arrivalRatePerHour: number; // lambda
  serviceRatePerHour: number; // mu
  trafficIntensity: number; // rho = lambda / (c * mu)
  theoreticalWaitTimeMinutes: number; // Wq from M/M/c
  averageWaitTimeMinutes: number;
  rooms: ConsultationRoomState[];
  optimizedQueue: PHCQueueItem[];
  emergencyAuditLog?: {
    escalatedPatientId: string;
    escalatedPatientName: string;
    previousPosition?: number;
    newPosition: number;
    reason: string;
    escalatedAt: string;
  };
}

// ============================================================================
// MEDICINE DISTRIBUTION & VOGEL'S TRANSPORTATION OPTIMIZATION TYPES
// ============================================================================

export type FacilityTier = 'sub_centre' | 'phc' | 'rural_hospital' | 'district_hospital';

export type GeographicBarrierType =
  | 'standard_highway'
  | 'mountain_ghat'
  | 'unpaved_rural'
  | 'river_crossing'
  | 'forest_fringe';

export type DrugCriticalityTier =
  | 'critical_life_saving'
  | 'essential_acute'
  | 'standard_chronic'
  | 'wellness_supplement';

export interface GeographicBarrierSpec {
  barrierType: GeographicBarrierType;
  name: string;
  description: string;
  averageSpeedKmh: number;
  timeMultiplier: number;
  costMultiplier: number;
  fixedDelayMinutes: number;
  monsoonVulnerability: boolean;
}

export interface SupplyDepotNode {
  facilityId: string;
  facilityName: string;
  tier: FacilityTier;
  district: string;
  coordinates: { latitude: number; longitude: number };
  availableStockUnits: number;
  hasColdChainStorage: boolean;
  vehicleFleet?: {
    refrigeratedVans: number;
    allTerrain4x4s: number;
    standardTrucks: number;
  };
}

export interface DemandEndpointNode {
  facilityId: string;
  facilityName: string;
  tier: FacilityTier;
  district: string;
  coordinates: { latitude: number; longitude: number };
  requestedQuantityUnits: number;
  criticalityTier: DrugCriticalityTier;
  coldChainRequired: boolean;
  currentStockOnHand: number;
  minThreshold: number;
  nearestParentFacilityId?: string;
  barrierFromSupply?: GeographicBarrierType;
}

export interface TransportationCostCell {
  supplyId: string;
  demandId: string;
  straightDistanceKm: number;
  roadDistanceKm: number;
  barrierType: GeographicBarrierType;
  barrierTimeMultiplier: number;
  barrierCostMultiplier: number;
  effectiveSpeedKmh: number;
  transitMinutes: number;
  unitTransportationCostInr: number;
  isColdChainFeasible: boolean;
}

export interface VAMAllocation {
  supplyId: string;
  supplyFacilityName: string;
  demandId: string;
  demandFacilityName: string;
  demandTier: FacilityTier;
  allocatedUnits: number;
  unitCostInr: number;
  totalCostInr: number;
  roadDistanceKm: number;
  transitMinutes: number;
  barrierType: GeographicBarrierType;
}

export interface RouteStop {
  stopOrder: number;
  facilityId: string;
  facilityName: string;
  tier: FacilityTier;
  coordinates: { latitude: number; longitude: number };
  deliveredUnits: number;
  medicinesSummary: string[];
  distanceFromPreviousKm: number;
  segmentTransitMinutes: number;
  cumulativeDistanceKm: number;
  cumulativeTransitMinutes: number;
  barrierEncountered: GeographicBarrierType;
  barrierName?: string;
}

export interface OptimizedTransitRoute {
  routeId: string;
  routeNumber: string;
  originFacilityId: string;
  originFacilityName: string;
  originTier: FacilityTier;
  vehicleType: 'refrigerated_van' | 'all_terrain_4x4' | 'standard_distribution_truck';
  vehicleCapacityUnits: number;
  totalAllocatedUnits: number;
  capacityUtilizationPercent: number;
  totalDistanceKm: number;
  totalTransitMinutes: number;
  totalDrivingHours: number;
  totalCostInr: number;
  stops: RouteStop[];
  geographicBarriersTraversed: GeographicBarrierType[];
  status: 'scheduled' | 'dispatched' | 'en_route' | 'completed';
}

export interface MedicineDistributionPlanResult {
  planId: string;
  planNumber: string;
  district: string;
  state: string;
  weekNumber: number;
  year: number;
  algorithm: string;
  generatedAt: string;
  totalSupplyUnits: number;
  totalDemandUnits: number;
  totalAllocatedUnits: number;
  unmetDemandUnits: number;
  allocationSatisfactionRatePercent: number;
  totalTransportationCostInr: number;
  totalDistanceKm: number;
  totalTransitMinutes: number;
  averageTransitTimePerStopMinutes: number;
  supplyDepotsCount: number;
  demandEndpointsCount: number;
  routesCount: number;
  routes: OptimizedTransitRoute[];
  allocations: VAMAllocation[];
  ruralBarriersSummary: {
    mountainGhatStopsCount: number;
    unpavedRuralStopsCount: number;
    riverCrossingStopsCount: number;
    standardHighwayStopsCount: number;
    totalTerrainDelayMinutes: number;
    monsoonRiskAlert: boolean;
  };
  vamIterationsAuditLog: Array<{
    iteration: number;
    selectedRowOrCol: 'row' | 'column';
    indexOrId: string;
    penalty: number;
    allocatedSupply: string;
    allocatedDemand: string;
    allocatedUnits: number;
    cellCost: number;
  }>;
}

export interface DrugRequisitionItem {
  id: string;
  requisitionNumber: string;
  facilityId: string;
  facilityName: string;
  facilityTier: FacilityTier;
  district: string;
  medicineId: string;
  medicineName: string;
  category: string;
  criticalityTier: DrugCriticalityTier;
  coldChainRequired: boolean;
  currentStockOnHand: number;
  minThreshold: number;
  requestedQuantity: number;
  allocatedQuantity: number;
  unit: string;
  status: 'pending' | 'allocated' | 'dispatched' | 'delivered' | 'partially_fulfilled';
  weekNumber: number;
  year: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdherenceMedicationItem {
  id: string;
  drugName: string;
  dosage: string;
  frequency: string;
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
  date: string;
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
  chronicConditions: string[];
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


