import React, { useState } from 'react';
import {
  Heart,
  GitPullRequest,
  FlaskConical,
  Pill,
  User,
  Activity,
  ShieldCheck,
  Cloud,
  Sparkles,
  Users,
  Video,
  AlertOctagon,
  ShieldAlert,
  Award,
  Mic,
  Building2,
  Globe,
  HeartPulse,
  GitBranch,
} from 'lucide-react';
import {
  INITIAL_FACILITIES,
  INITIAL_PATIENTS,
  INITIAL_ENCOUNTERS,
  INITIAL_REFERRALS,
  INITIAL_DIAGNOSTICS,
  INITIAL_MEDICINES,
  INITIAL_APPOINTMENTS,
  INITIAL_BILLING,
  INITIAL_AUDIT_LOGS,
  INITIAL_QUEUE_ITEMS,
  INITIAL_TELECONSULTATIONS,
  INITIAL_HIGH_RISK_PATIENTS,
  INITIAL_EMERGENCY_ALERTS,
  INITIAL_FACILITY_QUALITY_SCORECARDS,
} from './data/initialData';
import {
  Facility,
  LongitudinalPatient,
  ClinicalEncounter,
  Referral,
  DiagnosticOrder,
  MedicineStockItem,
  Appointment,
  BillingInvoice,
  AuditLogEntry,
  UserRole,
  NetworkMode,
  LanguageCode,
  SyncQueueItem,
  ReferralStatus,
  QueueItem,
  TeleconsultationSession,
  VitalsRecord,
  EmergencyEscalationAlert,
  HighRiskPatientRecord,
  FacilityQualityScorecard,
} from './types';
import { Header } from './components/Header';
import { LongitudinalRecordView } from './components/LongitudinalRecordView';
import { ReferralNetworkTracker } from './components/ReferralNetworkTracker';
import { DiagnosticCoordination } from './components/DiagnosticCoordination';
import { MedicineAvailability } from './components/MedicineAvailability';
import { PatientPortal } from './components/PatientPortal';
import { AnalyticsPerformanceDashboard } from './components/AnalyticsPerformanceDashboard';
import { HIPAAAuditComplianceView } from './components/HIPAAAuditComplianceView';
import { OfflineSyncManager } from './components/OfflineSyncManager';
import { AIDiagnosticSupportModal } from './components/AIDiagnosticSupportModal';
import { QueueAppointmentManager } from './components/QueueAppointmentManager';
import { AssistedTeleconsultationView } from './components/AssistedTeleconsultationView';
import { EmergencyEscalationConsole } from './components/EmergencyEscalationConsole';
import { HighRiskCohortFollowupView } from './components/HighRiskCohortFollowupView';
import { FacilityQualityDashboard } from './components/FacilityQualityDashboard';
import { FacilityDashboard } from './components/FacilityDashboard/FacilityDashboard';
import { AarogyaConnectLandingPage } from './components/AarogyaConnectLandingPage';
import { MultilingualVoiceAssistant } from './components/MultilingualVoiceAssistant';
import { AutomatedPatientRoutingModal } from './components/AutomatedPatientRoutingModal';
import { PatientIntakeKiosk } from './components/PatientIntakeKiosk';
import {
  OfflineSyncProvider,
  useOfflineSync,
  FrontlineTriagePayload,
  FrontlineStockLogPayload,
} from './context/OfflineSyncContext';
import { FrontlineSubCentreDeskModal } from './components/FrontlineSubCentreDeskModal';
import { useFacility } from './context/FacilityContext';
import { t } from './i18n/translations';
import { RbacAuthControl } from './components/RbacAuthControl';
import { RbacRole } from './lib/authService';
import { PostDischargeAdherenceTracker } from './components/PostDischargeAdherenceTracker';
import { PertCpmRoadmapViewer } from './components/PertCpmRoadmapViewer';
import { motion, AnimatePresence } from 'motion/react';

interface AppShellProps {
  patients: LongitudinalPatient[];
  setPatients: React.Dispatch<React.SetStateAction<LongitudinalPatient[]>>;
  encounters: ClinicalEncounter[];
  setEncounters: React.Dispatch<React.SetStateAction<ClinicalEncounter[]>>;
  medicines: MedicineStockItem[];
  setMedicines: React.Dispatch<React.SetStateAction<MedicineStockItem[]>>;
  referrals: Referral[];
  setReferrals: React.Dispatch<React.SetStateAction<Referral[]>>;
  auditLogs: AuditLogEntry[];
  setAuditLogs: React.Dispatch<React.SetStateAction<AuditLogEntry[]>>;
}

function AppShell({
  patients,
  setPatients,
  encounters,
  setEncounters,
  medicines,
  setMedicines,
  referrals,
  setReferrals,
  auditLogs,
  setAuditLogs,
}: AppShellProps) {
  // Global System State with Pan-India Facility Context
  const { currentFacility, selectFacility, facilities } = useFacility();
  const [currentRole, setCurrentRole] = useState<UserRole>('doctor');
  const [rbacRole, setRbacRole] = useState<RbacRole>('FrontlineWorker');
  const [currentLang, setCurrentLang] = useState<LanguageCode>('en');
  const [e2eeEnabled, setE2eeEnabled] = useState(true);

  // Frontline connectivity & optimistic sync queue from context
  const {
    networkMode,
    setNetworkMode,
    syncQueue,
    queuedCount,
    isSyncing,
    lastSyncedTime,
    triggerSyncNow,
    showSubCentreDeskModal,
    setShowSubCentreDeskModal,
    addGenericQueueItem,
  } = useOfflineSync();

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<
    | 'landing'
    | 'facility_dashboard'
    | 'kiosk'
    | 'records'
    | 'queue'
    | 'teleconsult'
    | 'highrisk'
    | 'emergency'
    | 'quality'
    | 'referrals'
    | 'diagnostics'
    | 'medicines'
    | 'portal'
    | 'analytics'
    | 'compliance'
    | 'sync'
    | 'adherence'
    | 'pert_cpm'
  >('landing');

  // Core Clinical Collections
  const [selectedPatient, setSelectedPatient] = useState<LongitudinalPatient>(patients[0] || INITIAL_PATIENTS[0]);
  const [diagnosticOrders, setDiagnosticOrders] = useState<DiagnosticOrder[]>(INITIAL_DIAGNOSTICS);
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [invoices, setInvoices] = useState<BillingInvoice[]>(INITIAL_BILLING);
  const [queueItems, setQueueItems] = useState<QueueItem[]>(INITIAL_QUEUE_ITEMS);
  const [teleconsultations, setTeleconsultations] = useState<TeleconsultationSession[]>(INITIAL_TELECONSULTATIONS);
  const [activeTeleconsultSession, setActiveTeleconsultSession] = useState<TeleconsultationSession>(INITIAL_TELECONSULTATIONS[0]);

  // High-Risk Cohorts, Emergency Escalations & Facility Quality
  const [highRiskPatients, setHighRiskPatients] = useState<HighRiskPatientRecord[]>(INITIAL_HIGH_RISK_PATIENTS);
  const [emergencyAlerts, setEmergencyAlerts] = useState<EmergencyEscalationAlert[]>(INITIAL_EMERGENCY_ALERTS);
  const [facilityScorecards, setFacilityScorecards] = useState<FacilityQualityScorecard[]>(INITIAL_FACILITY_QUALITY_SCORECARDS);

  // Modals & Overlays
  const [showAIModal, setShowAIModal] = useState(false);
  const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);
  const [showAIRoutingModal, setShowAIRoutingModal] = useState(false);

  // Audit Log Helper
  const recordAudit = (action: AuditLogEntry['action'], resourceId: string, details: string) => {
    const newEntry: AuditLogEntry = {
      id: `audit_${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: 'user_active_session',
      userName: currentRole === 'doctor' ? 'Dr. Priya Desai' : 'Clinical Provider',
      role: currentRole,
      facilityId: currentFacility.id,
      action,
      resourceId,
      details,
      hashSignature: `sha256-${Date.now().toString(36)}...`,
    };
    setAuditLogs((prev) => [newEntry, ...prev]);
  };

  // Add Encounter (handles offline queue if not online)
  const handleAddEncounter = (newEncounter: ClinicalEncounter) => {
    setEncounters((prev) => [...prev, newEncounter]);
    recordAudit('EDIT_RECORD', newEncounter.patientId, `Recorded clinical encounter at ${currentFacility.name}`);

    if (networkMode !== 'online') {
      addGenericQueueItem({
        id: `tx_${Date.now()}`,
        collection: 'clinical_encounters',
        action: 'create',
        data: newEncounter,
        createdOfflineAt: new Date().toISOString(),
        retryCount: 0,
        status: 'pending',
      });
    }
  };

  // Add Referral
  const handleAddReferral = (newReferral: Referral) => {
    setReferrals((prev) => [newReferral, ...prev]);
    recordAudit('EDIT_RECORD', newReferral.id, `Created referral for ${newReferral.patientName} (${newReferral.urgency})`);
  };

  // Update Referral Status
  const handleUpdateReferralStatus = (referralId: string, newStatus: ReferralStatus, notes?: string) => {
    setReferrals((prev) =>
      prev.map((r) => {
        if (r.id === referralId) {
          const updated = { ...r, status: newStatus };
          if (newStatus === 'counter_referred' && notes) {
            updated.counterReferralNotes = notes;
          } else if (notes) {
            updated.triageNotes = notes;
          }
          return updated;
        }
        return r;
      })
    );
    recordAudit('EDIT_RECORD', referralId, `Referral status updated to ${newStatus}`);
  };

  // Add Diagnostic Order
  const handleAddDiagnosticOrder = (newOrder: DiagnosticOrder) => {
    setDiagnosticOrders((prev) => [newOrder, ...prev]);
    recordAudit('EDIT_RECORD', newOrder.id, `Ordered lab test ${newOrder.testName} (${newOrder.priority})`);
  };

  // Update Diagnostic Order Status & Results
  const handleUpdateDiagnosticStatus = (orderId: string, status: DiagnosticOrder['status'], resultsPayload?: any) => {
    setDiagnosticOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          return {
            ...o,
            status,
            results: resultsPayload?.results || o.results,
            pathologistNotes: resultsPayload?.pathologistNotes || o.pathologistNotes,
            imagingFindings: resultsPayload?.imagingFindings || o.imagingFindings,
          };
        }
        return o;
      })
    );
    recordAudit('EDIT_RECORD', orderId, `Diagnostic order updated to ${status}`);
  };

  // Inter-facility Medicine Stock Transfer
  const handleRequestStockTransfer = (
    medicineId: string,
    fromFacilityId: string,
    toFacilityId: string,
    quantity: number
  ) => {
    setMedicines((prev) =>
      prev.map((m) => {
        if (m.id === medicineId) {
          const fromStock = m.facilityStocks[fromFacilityId]?.quantity || 0;
          const toStock = m.facilityStocks[toFacilityId]?.quantity || 0;

          const updatedFromQty = Math.max(0, fromStock - quantity);
          const updatedToQty = toStock + quantity;

          return {
            ...m,
            facilityStocks: {
              ...m.facilityStocks,
              [fromFacilityId]: {
                ...m.facilityStocks[fromFacilityId],
                quantity: updatedFromQty,
                status: updatedFromQty === 0 ? 'stockout' : updatedFromQty < 50 ? 'low' : 'optimal',
              },
              [toFacilityId]: {
                ...m.facilityStocks[toFacilityId],
                quantity: updatedToQty,
                status: updatedToQty < 50 ? 'low' : 'optimal',
              },
            },
          };
        }
        return m;
      })
    );
    recordAudit('EDIT_RECORD', medicineId, `Inter-facility stock transfer of ${quantity} units`);
  };

  // Book Appointment
  const handleBookAppointment = (newAppt: Appointment) => {
    setAppointments((prev) => [newAppt, ...prev]);
    recordAudit('EDIT_RECORD', newAppt.id, `Scheduled appointment for ${newAppt.patientName}`);
  };

  // Pay Invoice
  const handlePayInvoice = (invoiceId: string) => {
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === invoiceId ? { ...inv, paymentStatus: 'paid', paymentMethod: 'UPI / RuPay' } : inv))
    );
    recordAudit('EDIT_RECORD', invoiceId, 'Payment processed via integrated gateway');
  };

  // Trigger Manual or Periodic Cloud Sync
  const handleTriggerSync = async () => {
    await triggerSyncNow();
  };

  // Queue & Appointment Handlers
  const handleUpdateQueueItem = (updated: QueueItem) => {
    setQueueItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    recordAudit('EDIT_RECORD', updated.id, `Queue status updated to ${updated.status} for ${updated.patientName}`);
  };

  const handleAddQueueItem = (item: QueueItem) => {
    setQueueItems((prev) => [item, ...prev]);
    recordAudit('CREATE_RECORD', item.id, `Generated token ${item.tokenNumber} for ${item.patientName}`);
  };

  const handleBookQueueAppointment = (newAptData: Partial<Appointment>) => {
    const newApt: Appointment = {
      id: `apt_${Date.now()}`,
      patientId: newAptData.patientId || 'pat_temp',
      patientName: newAptData.patientName || 'Registered Patient',
      facilityId: newAptData.facilityId || currentFacility.id,
      department: newAptData.department || 'General Medicine',
      providerName: newAptData.providerName || 'Attending Physician',
      date: newAptData.date || new Date().toISOString().split('T')[0],
      timeSlot: newAptData.timeSlot || '10:00 AM - 10:30 AM',
      type: newAptData.type || 'in_person',
      status: 'scheduled',
      notes: newAptData.notes,
      remindersSent: {
        sms: true,
        smsTimestamp: new Date().toISOString(),
        email: false,
        push: true,
        pushTimestamp: new Date().toISOString(),
      },
    };
    setAppointments((prev) => [newApt, ...prev]);
    recordAudit('CREATE_RECORD', newApt.id, `Scheduled appointment for ${newApt.patientName}`);
  };

  const handleSendAppointmentReminder = (appointmentId: string, channel: 'sms' | 'email' | 'push') => {
    setAppointments((prev) =>
      prev.map((apt) => {
        if (apt.id === appointmentId) {
          return {
            ...apt,
            remindersSent: {
              ...apt.remindersSent,
              [channel]: true,
              [`${channel}Timestamp`]: new Date().toISOString(),
            },
          };
        }
        return apt;
      })
    );
    recordAudit('VIEW_RECORD', appointmentId, `Dispatched automated ${channel.toUpperCase()} reminder`);
  };

  const handleOpenTeleconsultation = (patientId: string) => {
    const existing = teleconsultations.find((s) => s.patientId === patientId);
    if (existing) {
      setActiveTeleconsultSession(existing);
    } else {
      const pat = patients.find((p) => p.id === patientId);
      const newSession: TeleconsultationSession = {
        id: `tc_${Date.now()}`,
        patientId,
        patientName: pat?.name || 'Referred Patient',
        patientAge: pat?.age || 40,
        patientGender: pat?.gender || 'Female',
        originatingFacilityId: currentFacility.id,
        originatingFacilityName: currentFacility.name,
        referringProviderName: currentRole === 'doctor' ? 'Dr. Aditi Sharma' : 'Sister Priya Nair (CHO)',
        referringProviderRole: currentRole,
        specialistFacilityId: 'fac_dh_sundargarh',
        specialistFacilityName: 'Sundargarh District Headquarters Hospital',
        specialistName: 'Dr. Aditi Sharma, MD',
        specialty: 'Cardiology & Internal Medicine',
        scheduledTime: new Date().toISOString(),
        status: 'in_progress',
        bandwidthMode: '2g_edge_resilient',
        connectionLatencyMs: 48,
        clinicalReason: 'Tele-triage review: Elevated cardiovascular risk profile and medication titration.',
        sharedVitals: {
          timestamp: new Date().toISOString(),
          facilityId: currentFacility.id,
          facilityName: currentFacility.name,
          systolic: 158,
          diastolic: 98,
          heartRate: 82,
          temperature: 36.8,
          spo2: 97,
          bloodGlucose: 148,
          respiratoryRate: 16,
          weightKg: 66,
          heightCm: 158,
          bmi: 26.4,
        },
        specialistNotes: 'Commence collaborative evaluation via teleconsultation console.',
        recommendedPrescriptions: [],
        counterSigned: false,
      };
      setTeleconsultations((prev) => [newSession, ...prev]);
      setActiveTeleconsultSession(newSession);
    }
    setActiveTab('teleconsult');
  };

  const handleFinalizeTeleconsultEncounter = (encData: Partial<ClinicalEncounter>) => {
    const pat = patients.find((p) => p.id === encData.patientId) || selectedPatient;
    const defaultVitals: VitalsRecord = {
      timestamp: new Date().toISOString(),
      facilityId: currentFacility.id,
      facilityName: currentFacility.name,
      systolic: 120,
      diastolic: 80,
      heartRate: 72,
      temperature: 36.6,
      spo2: 98,
      bloodGlucose: 110,
      respiratoryRate: 16,
      weightKg: 62,
      heightCm: 160,
      bmi: 24.2,
    };

    const newEnc: ClinicalEncounter = {
      id: `enc_tc_${Date.now().toString(36)}`,
      patientId: pat.id,
      facilityId: encData.facilityId || currentFacility.id,
      facilityName: currentFacility.name,
      facilityTier: currentFacility.tier,
      providerName: encData.providerName || 'Specialist Tele-EHR Consultant',
      providerRole: 'Specialist Physician',
      date: new Date().toISOString(),
      encounterType: 'telemedicine',
      chiefComplaint: encData.chiefComplaint || 'Assisted Specialist Teleconsultation',
      vitals: activeTeleconsultSession?.sharedVitals || defaultVitals,
      soap: encData.soap || {
        subjective: 'Patient attended teleconsultation with peripheral health worker.',
        objective: 'Vitals stable on remote telemetry.',
        assessment: 'Specialist clinical assessment completed via teleconsultation bridge.',
        plan: 'Prescriptions dispatched to local dispensary.',
      },
      icd10Diagnoses: [{ code: 'Z00.00', description: 'Specialist teleconsultation encounter', type: 'primary' }],
      prescriptions: [],
      encryptedHash: `sha256-tele-${Date.now().toString(16)}...`,
      syncStatus: networkMode === 'offline' ? 'pending' : 'synced',
      version: 1,
    };
    handleAddEncounter(newEnc);
  };

  const handleUpdateTeleconsultSession = (updated: TeleconsultationSession) => {
    setTeleconsultations((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setActiveTeleconsultSession(updated);
  };

  // Emergency Escalation Handlers
  const handleTriggerEmergencyAlert = (newAlert: EmergencyEscalationAlert) => {
    setEmergencyAlerts((prev) => [newAlert, ...prev]);
    recordAudit('CREATE_RECORD', newAlert.id, `Triggered Code Red SOS emergency: ${newAlert.codeType} - ${newAlert.clinicalSummary}`);
  };

  const handleUpdateAlertStatus = (alertId: string, newStatus: EmergencyEscalationAlert['status']) => {
    setEmergencyAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: newStatus } : a))
    );
    recordAudit('EDIT_RECORD', alertId, `Emergency alert updated to ${newStatus}`);
  };

  const handleToggleGoldenHourChecklist = (
    alertId: string,
    itemKey: keyof EmergencyEscalationAlert['goldenHourChecklist']
  ) => {
    setEmergencyAlerts((prev) =>
      prev.map((a) => {
        if (a.id === alertId) {
          return {
            ...a,
            goldenHourChecklist: {
              ...a.goldenHourChecklist,
              [itemKey]: !a.goldenHourChecklist[itemKey],
            },
          };
        }
        return a;
      })
    );
    recordAudit('EDIT_RECORD', alertId, `Updated Golden Hour intervention: ${String(itemKey)}`);
  };

  // High-Risk Patient Tracking Handlers
  const handleUpdateHighRiskStatus = (recordId: string, status: HighRiskPatientRecord['status']) => {
    setHighRiskPatients((prev) =>
      prev.map((p) => (p.id === recordId ? { ...p, status, daysOverdue: status === 'resolved' ? 0 : p.daysOverdue } : p))
    );
    recordAudit('EDIT_RECORD', recordId, `Updated high-risk patient status to ${status}`);
  };

  const handleCompleteHighRiskTask = (recordId: string, taskId: string) => {
    setHighRiskPatients((prev) =>
      prev.map((p) => {
        if (p.id === recordId) {
          return {
            ...p,
            followupTasks: p.followupTasks.map((t) =>
              t.id === taskId
                ? { ...t, status: 'completed', completedAt: new Date().toISOString() }
                : t
            ),
          };
        }
        return p;
      })
    );
    recordAudit('EDIT_RECORD', recordId, `Completed clinical task ${taskId}`);
  };

  const handleEnrollHighRiskPatient = (newRecord: HighRiskPatientRecord) => {
    setHighRiskPatients((prev) => [newRecord, ...prev]);
    recordAudit('CREATE_RECORD', newRecord.id, `Enrolled ${newRecord.patientName} in ${newRecord.cohort} high-risk registry`);
  };

  const handleSendHighRiskReminder = (patientPhone: string, patientName: string, cohort: string) => {
    recordAudit('VIEW_RECORD', patientPhone, `Dispatched automated regional SMS/Voice outreach to ${patientName} (${cohort})`);
  };

  // Facility Quality Notice Handler
  const handleIssueFacilityActionNotice = (facilityId: string, area: string, deadline: string) => {
    setFacilityScorecards((prev) =>
      prev.map((sc) => {
        if (sc.facilityId === facilityId) {
          return {
            ...sc,
            supervisoryActionNotice: {
              issuedDate: new Date().toISOString().split('T')[0],
              issuedBy: 'Dr. Aditi Sharma (Chief Medical Officer)',
              deficiencyArea: area,
              correctiveActionDeadline: deadline,
              status: 'pending_rectification',
            },
          };
        }
        return sc;
      })
    );
    recordAudit('CREATE_RECORD', facilityId, `Issued supervisory quality rectification notice: ${area}`);
  };

  // Patient Intake Kiosk Registration Handler
  const handleRegisterKioskPatient = (newQueueItem: QueueItem) => {
    setQueueItems((prev) => [newQueueItem, ...prev]);
    recordAudit(
      'CREATE_RECORD',
      newQueueItem.id,
      `Registered walk-in patient ${newQueueItem.patientName} via Multilingual Intake Kiosk (Token ${newQueueItem.tokenNumber})`
    );
    if (networkMode !== 'online') {
      addGenericQueueItem({
        id: `tx_kiosk_${Date.now()}`,
        collection: 'queue_items',
        action: 'create',
        data: newQueueItem,
        createdOfflineAt: new Date().toISOString(),
        retryCount: 0,
        status: 'pending',
      });
    }
  };

  const waitingCount = queueItems.filter(
    (q) => (q.status === 'waiting' || q.status === 'triage_pending') && (q.facilityId === currentFacility.id || currentFacility.tier === 'district_hospital')
  ).length;

  const activeEmergencyCount = emergencyAlerts.filter(
    (a) => a.status === 'active' || a.status === 'en_route'
  ).length;

  const overdueHighRiskCount = highRiskPatients.filter(
    (p) => p.status === 'overdue' || p.daysOverdue > 0
  ).length;

  const [navCategory, setNavCategory] = useState<'all' | 'public' | 'clinical' | 'operations'>('all');
  const [navSearchQuery, setNavSearchQuery] = useState<string>('');

  const navItems: Array<{
    id: string;
    label: string;
    icon: any;
    badge?: string | number;
    category: 'public' | 'clinical' | 'operations';
  }> = [
    {
      id: 'landing',
      label: 'AarogyaConnect Portal',
      icon: Globe,
      badge: 'Public',
      category: 'public',
    },
    {
      id: 'facility_dashboard',
      label: 'Facility Dashboard',
      icon: Building2,
      badge: 'DMO',
      category: 'clinical',
    },
    {
      id: 'kiosk',
      label: t('patientIntakeKiosk', currentLang) || 'Intake Kiosk',
      icon: Mic,
      category: 'public',
    },
    { id: 'records', label: t('patientRecords', currentLang) || 'Patient Charts', icon: Heart, category: 'clinical' },
    {
      id: 'queue',
      label: `Queue & Triage`,
      icon: Users,
      badge: waitingCount > 0 ? waitingCount : undefined,
      category: 'clinical',
    },
    { id: 'teleconsult', label: 'Teleconsultation', icon: Video, category: 'clinical' },
    {
      id: 'highrisk',
      label: t('highRiskTracking', currentLang) || 'High-Risk Cohorts',
      icon: ShieldAlert,
      badge: overdueHighRiskCount > 0 ? overdueHighRiskCount : undefined,
      category: 'clinical',
    },
    {
      id: 'emergency',
      label: t('emergencyEscalation', currentLang) || 'Emergency SOS',
      icon: AlertOctagon,
      badge: activeEmergencyCount > 0 ? activeEmergencyCount : undefined,
      category: 'clinical',
    },
    {
      id: 'quality',
      label: t('facilityQuality', currentLang) || 'Facility Quality',
      icon: Award,
      category: 'operations',
    },
    { id: 'referrals', label: t('referralTracker', currentLang) || 'Referrals', icon: GitPullRequest, category: 'operations' },
    { id: 'diagnostics', label: t('diagnosticHub', currentLang) || 'Diagnostics', icon: FlaskConical, category: 'operations' },
    { id: 'medicines', label: t('pharmacyInventory', currentLang) || 'Medicines', icon: Pill, category: 'operations' },
    { id: 'portal', label: t('patientPortal', currentLang) || 'Citizen Portal', icon: User, category: 'public' },
    { id: 'analytics', label: t('clinicalAnalytics', currentLang) || 'Analytics', icon: Activity, category: 'operations' },
    { id: 'compliance', label: t('hipaaSecurity', currentLang) || 'Compliance', icon: ShieldCheck, category: 'operations' },
    {
      id: 'sync',
      label: `Cloud Sync (${syncQueue.length})`,
      icon: Cloud,
      badge: syncQueue.length > 0 ? syncQueue.length : undefined,
      category: 'operations',
    },
    {
      id: 'adherence',
      label: 'Post-Discharge Adherence',
      icon: HeartPulse,
      category: 'operations',
    },
    {
      id: 'pert_cpm',
      label: 'PERT / CPM Schedule',
      icon: GitBranch,
      category: 'operations',
    },
  ];

  const visibleNavItems = navItems.filter((item) => {
    const matchesCat = navCategory === 'all' || item.category === navCategory;
    const matchesSearch = !navSearchQuery.trim() || item.label.toLowerCase().includes(navSearchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  if (activeTab === 'landing') {
    return (
      <AarogyaConnectLandingPage
        onLaunchPlatform={(tab) => setActiveTab((tab as any) || 'facility_dashboard')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Global Clinical Header */}
      <Header
        facilities={facilities}
        currentFacility={currentFacility}
        onChangeFacility={selectFacility}
        onSelectFacility={selectFacility}
        currentRole={currentRole}
        userRole={currentRole}
        onChangeRole={setCurrentRole}
        networkMode={networkMode}
        onChangeNetworkMode={setNetworkMode}
        currentLang={currentLang as any}
        language={currentLang as any}
        onChangeLanguage={(lang) => setCurrentLang(lang as any)}
        syncQueueCount={syncQueue.length}
        pendingSyncCount={syncQueue.length}
        onTriggerSync={handleTriggerSync}
        isSyncing={isSyncing}
        e2eeEnabled={e2eeEnabled}
        onToggleE2EE={() => setE2eeEnabled(!e2eeEnabled)}
        onOpenVoiceAssistant={() => setShowVoiceAssistant(true)}
        onOpenEmergencyEscalation={() => setActiveTab('emergency')}
        activeEmergencyCount={activeEmergencyCount}
        rbacControlNode={
          <RbacAuthControl
            currentRole={rbacRole}
            onRoleChange={(newRole) => {
              setRbacRole(newRole);
              if (newRole === 'Patient') {
                setCurrentRole('patient');
                if (activeTab === 'facility_dashboard' || activeTab === 'quality') {
                  setActiveTab('records');
                }
              } else if (newRole === 'FrontlineWorker') {
                setCurrentRole('nurse_asha');
              } else if (newRole === 'MedicalOfficer') {
                setCurrentRole('doctor');
              }
            }}
          />
        }
      />

      {/* Main Navigation Tab Strip & Quick AI Clinical Actions */}
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-3 overflow-x-auto py-2">
          <div className="flex items-center gap-2 overflow-x-auto">
            {/* Category Segment Filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
              <button
                onClick={() => setNavCategory('all')}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  navCategory === 'all'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All (18)
              </button>
              <button
                onClick={() => setNavCategory('public')}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  navCategory === 'public'
                    ? 'bg-white text-blue-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Public (3)
              </button>
              <button
                onClick={() => setNavCategory('clinical')}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  navCategory === 'clinical'
                    ? 'bg-white text-emerald-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Clinical (6)
              </button>
              <button
                onClick={() => setNavCategory('operations')}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  navCategory === 'operations'
                    ? 'bg-white text-indigo-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Operations (9)
              </button>
            </div>

            {/* Quick Filter Search Input */}
            <div className="relative shrink-0 hidden sm:block">
              <input
                type="text"
                placeholder="Filter tools..."
                value={navSearchQuery}
                onChange={(e) => setNavSearchQuery(e.target.value)}
                className="w-28 lg:w-36 px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-400 text-slate-700 placeholder:text-slate-400 transition-all"
              />
              {navSearchQuery && (
                <button
                  onClick={() => setNavSearchQuery('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer font-bold px-1"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="h-4 w-px bg-slate-200 shrink-0" />

            {/* Clean Segmented Tab Rail */}
            <div className="flex items-center space-x-1 shrink-0">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded-full ${
                        isActive ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick AI Clinical Action Buttons */}
          <div className="flex items-center gap-2 pl-3 shrink-0">
            <button
              onClick={() => setShowAIRoutingModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors cursor-pointer"
              title="Automated Patient Routing & Referral Recommendation (Gemini API)"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">AI Referral Advisor</span>
            </button>
            <button
              onClick={() => setShowAIModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer"
              title="AI Clinical Decision Support System"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>AI CDSS</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10, filter: 'blur(2px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(2px)' }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="w-full"
          >
            {activeTab === 'kiosk' && (
          <PatientIntakeKiosk
            currentFacility={currentFacility}
            currentLang={currentLang as any}
            onChangeLanguage={(lang) => setCurrentLang(lang as any)}
            onRegisterPatientQueue={handleRegisterKioskPatient}
          />
        )}

        {activeTab === 'records' && (
          <LongitudinalRecordView
            patients={patients}
            selectedPatient={selectedPatient}
            onSelectPatient={setSelectedPatient}
            encounters={encounters}
            currentFacility={currentFacility}
            onAddEncounter={handleAddEncounter}
            onOpenAIDiagnostics={() => setShowAIModal(true)}
            e2eeEnabled={e2eeEnabled}
            diagnosticOrders={diagnosticOrders}
            referrals={referrals}
            onNavigateToDiagnostics={() => setActiveTab('diagnostics')}
          />
        )}

        {activeTab === 'queue' && (
          <QueueAppointmentManager
            queue={queueItems}
            appointments={appointments}
            patients={patients}
            currentFacility={currentFacility}
            currentRole={currentRole}
            onUpdateQueueItem={handleUpdateQueueItem}
            onAddQueueItem={handleAddQueueItem}
            onBookAppointment={handleBookQueueAppointment}
            onSendReminder={handleSendAppointmentReminder}
            onOpenTeleconsult={handleOpenTeleconsultation}
          />
        )}

        {activeTab === 'teleconsult' && (
          <AssistedTeleconsultationView
            session={activeTeleconsultSession}
            allSessions={teleconsultations}
            patient={patients.find((p) => p.id === activeTeleconsultSession?.patientId) || selectedPatient}
            currentFacility={currentFacility}
            currentRole={currentRole}
            onSelectSession={setActiveTeleconsultSession}
            onUpdateSession={handleUpdateTeleconsultSession}
            onFinalizeEncounter={handleFinalizeTeleconsultEncounter}
          />
        )}

        {activeTab === 'highrisk' && (
          <HighRiskCohortFollowupView
            highRiskPatients={highRiskPatients}
            patients={patients}
            facilities={facilities}
            currentLanguage={currentLang as any}
            onUpdatePatientStatus={handleUpdateHighRiskStatus}
            onCompleteTask={handleCompleteHighRiskTask}
            onEnrollPatient={handleEnrollHighRiskPatient}
            onSendReminder={handleSendHighRiskReminder}
          />
        )}

        {activeTab === 'emergency' && (
          <EmergencyEscalationConsole
            alerts={emergencyAlerts}
            patients={patients}
            facilities={facilities}
            currentLanguage={currentLang as any}
            onTriggerAlert={handleTriggerEmergencyAlert}
            onUpdateAlertStatus={handleUpdateAlertStatus}
            onToggleChecklistItem={handleToggleGoldenHourChecklist}
          />
        )}

        {activeTab === 'facility_dashboard' && (
          <FacilityDashboard onNavigateTab={(tab) => setActiveTab(tab as any)} />
        )}

        {activeTab === 'quality' && (
          <FacilityQualityDashboard
            scorecards={facilityScorecards}
            facilities={facilities}
            currentLanguage={currentLang as any}
            onIssueActionNotice={handleIssueFacilityActionNotice}
          />
        )}

        {activeTab === 'referrals' && (
          <ReferralNetworkTracker
            referrals={referrals}
            facilities={facilities}
            patients={patients}
            currentFacility={currentFacility}
            onAddReferral={handleAddReferral}
            onUpdateReferralStatus={handleUpdateReferralStatus}
          />
        )}

        {activeTab === 'diagnostics' && (
          <DiagnosticCoordination
            orders={diagnosticOrders}
            facilities={facilities}
            patients={patients}
            currentFacility={currentFacility}
            onAddDiagnosticOrder={handleAddDiagnosticOrder}
            onUpdateOrderStatus={handleUpdateDiagnosticStatus}
            onSelectPatient={(id) => {
              const targetPat = patients.find((p) => p.id === id);
              if (targetPat) {
                setSelectedPatient(targetPat);
                setActiveTab('records');
              }
            }}
          />
        )}

        {activeTab === 'medicines' && (
          <MedicineAvailability
            medicines={medicines}
            facilities={facilities}
            currentFacility={currentFacility}
            onRequestTransfer={handleRequestStockTransfer}
          />
        )}

        {activeTab === 'portal' && (
          <PatientPortal
            patient={selectedPatient}
            encounters={encounters}
            appointments={appointments}
            invoices={invoices}
            facilities={facilities}
            onBookAppointment={handleBookAppointment}
            onPayInvoice={handlePayInvoice}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsPerformanceDashboard facilities={facilities} />
        )}

        {activeTab === 'compliance' && (
          <HIPAAAuditComplianceView
            auditLogs={auditLogs}
            currentRole={currentRole}
            e2eeEnabled={e2eeEnabled}
            onToggleE2EE={() => setE2eeEnabled(!e2eeEnabled)}
          />
        )}

        {activeTab === 'sync' && (
          <OfflineSyncManager
            networkMode={networkMode}
            onChangeNetworkMode={setNetworkMode}
            syncQueue={syncQueue}
            onTriggerSync={handleTriggerSync}
            isSyncing={isSyncing}
            lastSyncedTime={lastSyncedTime}
            onAddOfflineMutation={(item) => addGenericQueueItem(item)}
          />
        )}

        {activeTab === 'adherence' && (
          <PostDischargeAdherenceTracker
            currentLanguage={currentLang as any}
          />
        )}

        {activeTab === 'pert_cpm' && (
          <PertCpmRoadmapViewer />
        )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">
              Cross-Facility Longitudinal EHR Architecture
            </span>
            <span>•</span>
            <span>HIPAA Compliant (§ 164.312)</span>
            <span>•</span>
            <span>AES-256-GCM / SHA-256 Ledger</span>
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <span>Facility: {currentFacility.name}</span>
            <span>•</span>
            <span>Role: {currentRole.toUpperCase()}</span>
          </div>
        </div>
      </footer>

      {/* Multilingual Vernacular Voice Assistant Modal */}
      <MultilingualVoiceAssistant
        isOpen={showVoiceAssistant}
        onClose={() => setShowVoiceAssistant(false)}
        currentLanguage={currentLang as any}
        onChangeLanguage={(lang) => setCurrentLang(lang as any)}
      />

      {/* AI Diagnostic Support Modal */}
      {showAIModal && (
        <AIDiagnosticSupportModal
          patient={selectedPatient}
          latestEncounter={encounters.find((e) => e.patientId === selectedPatient.id)}
          currentFacility={currentFacility}
          onClose={() => setShowAIModal(false)}
        />
      )}

      {/* Automated Patient Routing & Referral Modal (Gemini API) */}
      <AutomatedPatientRoutingModal
        isOpen={showAIRoutingModal}
        onClose={() => setShowAIRoutingModal(false)}
        currentFacility={currentFacility}
        facilities={facilities}
        patients={patients}
        onApplyReferral={(newRef) => {
          setReferrals((prev) => [newRef, ...prev]);
          recordAudit('CREATE_RECORD', newRef.id, `AI-recommended referral created for ${newRef.patientName}`);
          setActiveTab('referrals');
          setShowAIRoutingModal(false);
        }}
      />

      {/* Frontline Sub-Centre Optimistic UI Desk Modal */}
      <FrontlineSubCentreDeskModal
        isOpen={showSubCentreDeskModal}
        onClose={() => setShowSubCentreDeskModal(false)}
        currentFacility={currentFacility}
        facilities={facilities}
        patients={patients}
        medicines={medicines}
      />
    </div>
  );
}

export default function App() {
  const [patients, setPatients] = useState<LongitudinalPatient[]>(INITIAL_PATIENTS);
  const [encounters, setEncounters] = useState<ClinicalEncounter[]>(INITIAL_ENCOUNTERS);
  const [medicines, setMedicines] = useState<MedicineStockItem[]>(INITIAL_MEDICINES);
  const [referrals, setReferrals] = useState<Referral[]>(INITIAL_REFERRALS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);

  // Frontline Optimistic UI handlers for Sub-Centres
  const handleFrontlineTriageCreated = (ticket: FrontlineTriagePayload) => {
    const newEnc: ClinicalEncounter = {
      id: ticket.id || `enc_triage_${Date.now()}`,
      patientId: ticket.patientId,
      facilityId: ticket.facilityId,
      facilityName: ticket.facilityName,
      facilityTier: 'sub_centre',
      providerName: 'Sister Priya Nair (ASHA/ANM)',
      providerRole: 'nurse_asha',
      date: new Date().toISOString(),
      encounterType: 'field_visit',
      chiefComplaint: ticket.chiefComplaint,
      vitals: {
        timestamp: new Date().toISOString(),
        facilityId: ticket.facilityId,
        facilityName: ticket.facilityName,
        systolic: ticket.systolic || 120,
        diastolic: ticket.diastolic || 80,
        heartRate: ticket.heartRate || 76,
        temperature: ticket.temperature || 37.0,
        spo2: ticket.spo2 || 98,
        bloodGlucose: 105,
        respiratoryRate: 18,
        weightKg: 58,
        heightCm: 162,
        bmi: 22.1,
      },
      soap: {
        subjective: `Sub-Centre Bedside Triage: ${ticket.chiefComplaint}. Urgency: ${ticket.urgencyLevel.toUpperCase()}`,
        objective: `Field Vitals: BP ${ticket.systolic || 120}/${ticket.diastolic || 80} mmHg, HR ${ticket.heartRate || 76} bpm, SpO2 ${ticket.spo2 || 98}%, Temp ${ticket.temperature || 37.0}°C`,
        assessment: `Triage Severity Category: ${ticket.urgencyLevel}`,
        plan: ticket.frontlineActions && ticket.frontlineActions.length > 0
          ? ticket.frontlineActions.join('; ')
          : 'Bedside stabilization and follow-up',
      },
      icd10Diagnoses: [
        { code: 'R50.9', description: 'Fever or Acute Presentation (Frontline Triage)', type: 'primary' },
      ],
      prescriptions: [],
      encryptedHash: `sha256-triage-${Date.now().toString(36)}`,
      syncStatus: 'pending',
      version: 1,
    };
    setEncounters((prev) => [newEnc, ...prev]);
  };

  const handleFrontlineStockUpdated = (log: FrontlineStockLogPayload) => {
    setMedicines((prev) =>
      prev.map((m) => {
        if (m.id === log.medicineId) {
          const currentFacStock = m.facilityStocks[log.facilityId] || {
            facilityName: log.facilityName,
            tier: 'sub_centre',
            quantity: 0,
            minThreshold: 50,
            batchNumber: log.batchNumber || 'BATCH-SC-2026',
            expiryDate: '2027-12-31',
            status: 'optimal',
          };
          const newQty = log.resultingStock;
          const newStatus = newQty === 0 ? 'stockout' : newQty < 50 ? 'low' : 'optimal';
          return {
            ...m,
            facilityStocks: {
              ...m.facilityStocks,
              [log.facilityId]: {
                ...currentFacStock,
                quantity: newQty,
                status: newStatus,
              },
            },
          };
        }
        return m;
      })
    );
  };

  const handleFrontlineReferralIssued = (referral: Referral) => {
    setReferrals((prev) => [referral, ...prev]);
  };

  return (
    <OfflineSyncProvider
      onTriageCreated={handleFrontlineTriageCreated}
      onStockUpdated={handleFrontlineStockUpdated}
      onReferralIssued={handleFrontlineReferralIssued}
    >
      <AppShell
        patients={patients}
        setPatients={setPatients}
        encounters={encounters}
        setEncounters={setEncounters}
        medicines={medicines}
        setMedicines={setMedicines}
        referrals={referrals}
        setReferrals={setReferrals}
        auditLogs={auditLogs}
        setAuditLogs={setAuditLogs}
      />
    </OfflineSyncProvider>
  );
}
