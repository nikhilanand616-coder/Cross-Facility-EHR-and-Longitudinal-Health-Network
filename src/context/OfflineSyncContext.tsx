import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  NetworkMode,
  SyncQueueItem,
  Facility,
  Referral,
  LongitudinalPatient,
  DiagnosticOrder,
  ConflictResolutionStrategy,
  ConflictItem,
} from '../types';
import {
  db,
  syncQueueItemToFirestore,
  syncBatchQueueToFirestore,
  setFirestoreNetworkOnline,
} from '../lib/firebase';
import { detectFieldConflicts, applyConflictStrategy } from '../lib/conflictResolution';

export interface FrontlineTriagePayload {
  id?: string;
  patientId: string;
  patientName: string;
  age?: number;
  gender?: string;
  facilityId: string;
  facilityName: string;
  urgencyLevel: 'Green' | 'Yellow' | 'Red';
  chiefComplaint: string;
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
  spo2?: number;
  temperature?: number;
  frontlineActions?: string[];
  createdOffline?: boolean;
}

export interface FrontlineStockLogPayload {
  id?: string;
  facilityId: string;
  facilityName: string;
  medicineId: string;
  medicineName: string;
  changeType: 'dispense' | 'received' | 'wastage';
  quantityChange: number;
  resultingStock: number;
  reason: string;
  batchNumber?: string;
  loggedBy?: string;
}

export interface FrontlineReferralPayload {
  id?: string;
  patientId: string;
  patientName: string;
  patientAge?: number;
  originatingFacilityId: string;
  originatingFacilityName: string;
  destinationFacilityId: string;
  destinationFacilityName: string;
  urgency: 'routine' | 'urgent' | 'emergency';
  clinicalReason: string;
  specialtyRequired: string;
  transportMode: 'Ambulance 108' | 'Facility Vehicle' | 'Private/Public Transport';
  referringClinician?: string;
}

interface OfflineSyncContextType {
  networkMode: NetworkMode;
  setNetworkMode: (mode: NetworkMode) => void;
  isOnline: boolean;
  syncQueue: SyncQueueItem[];
  queuedCount: number;
  isSyncing: boolean;
  lastSyncedTime: string;
  syncStatusText: string;

  // Robust Offline Data Entry Capabilities
  registerPatientOptimistic: (patient: Partial<LongitudinalPatient>) => Promise<{ success: boolean; id: string; patient: LongitudinalPatient }>;
  updatePatientOptimistic: (patient: LongitudinalPatient) => Promise<{ success: boolean; id: string; patient: LongitudinalPatient }>;
  issueReferralSlipOptimistic: (payload: FrontlineReferralPayload) => Promise<{ success: boolean; id: string }>;
  createDiagnosticOrderOptimistic: (order: Partial<DiagnosticOrder>) => Promise<{ success: boolean; id: string; order: DiagnosticOrder }>;
  createTriageTicketOptimistic: (payload: FrontlineTriagePayload) => Promise<{ success: boolean; id: string }>;
  updateMedicineStockLogOptimistic: (payload: FrontlineStockLogPayload) => Promise<{ success: boolean; id: string }>;
  addGenericQueueItem: (item: SyncQueueItem) => void;

  // Conflict Resolution Management
  conflicts: ConflictItem[];
  defaultConflictStrategy: ConflictResolutionStrategy;
  setDefaultConflictStrategy: (strategy: ConflictResolutionStrategy) => void;
  resolveConflict: (conflictId: string, strategy: ConflictResolutionStrategy, customMergedRecord?: any) => Promise<void>;
  simulateConflict: () => void;

  // Manual & Automated Sync
  triggerSyncNow: () => Promise<void>;
  clearSyncedItems: () => void;

  // Sub-Centre Desk Modal state
  showSubCentreDeskModal: boolean;
  setShowSubCentreDeskModal: (show: boolean) => void;
  subCentreDeskTab: 'triage' | 'pharmacy' | 'referral' | 'queue';
  setSubCentreDeskTab: (tab: 'triage' | 'pharmacy' | 'referral' | 'queue') => void;
}

const OfflineSyncContext = createContext<OfflineSyncContextType | undefined>(undefined);

const LOCAL_STORAGE_QUEUE_KEY = 'cross_facility_ehr_optimistic_queue_v2';
const LOCAL_STORAGE_LAST_SYNC_KEY = 'cross_facility_ehr_last_synced_time';
const LOCAL_STORAGE_CONFLICTS_KEY = 'cross_facility_ehr_conflicts_v2';
const LOCAL_STORAGE_STRATEGY_KEY = 'cross_facility_ehr_conflict_strategy_v2';

export const OfflineSyncProvider: React.FC<{
  children: React.ReactNode;
  onTriageCreated?: (ticket: FrontlineTriagePayload) => void;
  onStockUpdated?: (log: FrontlineStockLogPayload) => void;
  onReferralIssued?: (referral: Referral) => void;
  onPatientRegistered?: (patient: LongitudinalPatient) => void;
  onPatientUpdated?: (patient: LongitudinalPatient) => void;
  onDiagnosticCreated?: (order: DiagnosticOrder) => void;
  onRecordAudit?: (action: string, resourceId: string, details: string) => void;
}> = ({
  children,
  onTriageCreated,
  onStockUpdated,
  onReferralIssued,
  onPatientRegistered,
  onPatientUpdated,
  onDiagnosticCreated,
  onRecordAudit,
}) => {
  // Simulated & Hardware Connectivity State
  const [networkMode, setNetworkModeState] = useState<NetworkMode>('online');
  const [browserOnline, setBrowserOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Optimistic Queue & Sync State
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_QUEUE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Fallback
    }
    return [];
  });

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>(() => {
    return localStorage.getItem(LOCAL_STORAGE_LAST_SYNC_KEY) || new Date().toLocaleTimeString();
  });

  // Conflict Resolution State
  const [conflicts, setConflicts] = useState<ConflictItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_CONFLICTS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return [];
  });

  const [defaultConflictStrategy, setDefaultConflictStrategyState] = useState<ConflictResolutionStrategy>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_STRATEGY_KEY);
      if (saved) return saved as ConflictResolutionStrategy;
    } catch {
      // Fallback
    }
    return 'three_way_merge';
  });

  const setDefaultConflictStrategy = useCallback((strategy: ConflictResolutionStrategy) => {
    setDefaultConflictStrategyState(strategy);
    try {
      localStorage.setItem(LOCAL_STORAGE_STRATEGY_KEY, strategy);
    } catch {}
  }, []);

  // Persist conflicts to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_CONFLICTS_KEY, JSON.stringify(conflicts));
    } catch {}
  }, [conflicts]);

  // Modal trigger
  const [showSubCentreDeskModal, setShowSubCentreDeskModal] = useState<boolean>(false);
  const [subCentreDeskTab, setSubCentreDeskTab] = useState<'triage' | 'pharmacy' | 'referral' | 'queue'>('triage');

  // Effective online status: true only if browser is online AND simulator is not set to offline
  const isOnline = browserOnline && networkMode !== 'offline';
  const queuedCount = syncQueue.filter((q) => q.status !== 'synced').length;

  // Persist queue to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_QUEUE_KEY, JSON.stringify(syncQueue));
    } catch (e) {
      console.warn('Failed to persist optimistic queue to localStorage:', e);
    }
  }, [syncQueue]);

  // Synchronize Firestore network with mode
  const setNetworkMode = useCallback((mode: NetworkMode) => {
    setNetworkModeState(mode);
    const shouldBeOnline = mode !== 'offline' && browserOnline;
    setFirestoreNetworkOnline(shouldBeOnline);
    if (mode === 'offline') {
      onRecordAudit?.('SYSTEM', 'network_toggle', 'Frontline health worker switched to Offline Field Mode (Sub-Centre offline caching active)');
    } else if (mode === 'online') {
      onRecordAudit?.('SYSTEM', 'network_toggle', 'Frontline terminal connected to online cloud synchronization');
    }
  }, [browserOnline, onRecordAudit]);

  // Listen to browser network changes
  useEffect(() => {
    const handleOnline = () => {
      setBrowserOnline(true);
      if (networkMode !== 'offline') {
        setFirestoreNetworkOnline(true);
      }
    };
    const handleOffline = () => {
      setBrowserOnline(false);
      setFirestoreNetworkOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [networkMode]);

  // Auto-sync function
  const triggerSyncNow = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    const pendingItems = syncQueue.filter((item) => item.status !== 'synced' && item.status !== 'conflict');
    if (pendingItems.length === 0) return;

    setIsSyncing(true);

    try {
      // Mark as syncing
      setSyncQueue((prev) =>
        prev.map((i) => (i.status !== 'synced' && i.status !== 'conflict' ? { ...i, status: 'syncing' } : i))
      );

      // Batch sync to Firestore with serverTimestamp()
      const { successCount, failedIds } = await syncBatchQueueToFirestore(pendingItems);

      // Also trigger the backend endpoint /api/sync/batch for backward-compatibility & backup logs
      try {
        await fetch('/api/sync/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            queue: pendingItems,
            clientRevision: Date.now(),
          }),
        });
      } catch {
        // Backend API optional if Firestore handled direct persistence
      }

      const nowStr = new Date().toLocaleTimeString();
      setLastSyncedTime(nowStr);
      localStorage.setItem(LOCAL_STORAGE_LAST_SYNC_KEY, nowStr);

      // Update item statuses: remove synced or mark as synced
      setSyncQueue((prev) =>
        prev
          .map((item) => {
            if (failedIds.includes(item.id)) {
              return { ...item, status: 'failed', retryCount: (item.retryCount || 0) + 1 };
            }
            return { ...item, status: 'synced' };
          })
          .filter((item) => item.status !== 'synced') // Clean up synced items from pending queue
      );

      onRecordAudit?.(
        'SYNC_BATCH',
        'firestore_sync',
        `Successfully auto-synchronized ${successCount} frontline offline changes to central database with conflict-safe reconciliation`
      );
    } catch (err) {
      console.error('Error during auto-sync to Firestore:', err);
      setSyncQueue((prev) =>
        prev.map((i) => (i.status === 'syncing' ? { ...i, status: 'pending' } : i))
      );
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, syncQueue, onRecordAudit]);

  // Conflict Resolution Actions
  const resolveConflict = useCallback(
    async (conflictId: string, strategy: ConflictResolutionStrategy, customMergedRecord?: any) => {
      const conflict = conflicts.find((c) => c.id === conflictId);
      if (!conflict) return;

      let finalRecord: any;
      let explanation = '';

      if (customMergedRecord) {
        finalRecord = {
          ...customMergedRecord,
          syncStatus: 'synced',
          version: (conflict.serverVersion?.version || 1) + 1,
        };
        explanation = 'Manual clinician review approved custom unified record';
      } else {
        const outcome = applyConflictStrategy(strategy, conflict.localVersion, conflict.serverVersion);
        finalRecord = outcome.resolvedRecord;
        explanation = outcome.explanation;
      }

      // Write resolved record to Firestore if online
      if (isOnline) {
        try {
          await syncQueueItemToFirestore({
            id: conflict.recordId,
            collection: conflict.collection,
            action: 'UPDATE',
            data: finalRecord,
            createdOfflineAt: new Date().toISOString(),
            retryCount: 0,
            status: 'synced',
          });
        } catch (err) {
          console.warn('Failed to sync resolved record to Firestore:', err);
        }
      }

      // Update local state if patient
      if (conflict.collection === 'patients' && onPatientUpdated) {
        onPatientUpdated(finalRecord as LongitudinalPatient);
      }

      // Mark conflict as resolved
      setConflicts((prev) =>
        prev.map((c) =>
          c.id === conflictId
            ? {
                ...c,
                status: 'resolved',
                resolvedStrategy: strategy,
                resolvedAt: new Date().toISOString(),
                resolvedBy: 'Clinical Lead / Medical Superintendent',
              }
            : c
        )
      );

      // Remove from syncQueue
      setSyncQueue((prev) => prev.filter((q) => q.id !== conflict.queueItemId && q.id !== conflict.recordId));

      onRecordAudit?.(
        'SYNC_BATCH',
        conflict.recordId,
        `Resolved data conflict using strategy "${strategy}": ${explanation}`
      );
    },
    [conflicts, isOnline, onPatientUpdated, onRecordAudit]
  );

  const simulateConflict = useCallback(() => {
    const simId = `conf_${Date.now()}`;
    const now = new Date().toISOString();

    const serverDoc = {
      id: 'pat-101',
      name: 'Sunita Sharma',
      nationalHealthId: 'ABHA-91-2041-8832-1102',
      riskLevel: 'MEDIUM',
      allergies: ['Penicillin', 'Sulfa drugs'],
      chronicConditions: ['Type 2 Diabetes Mellitus', 'Stage 2 Hypertension'],
      vitals: {
        bloodPressure: '142/90 mmHg',
        heartRate: 78,
        spo2: 97,
        timestamp: new Date(Date.now() - 3600000).toISOString(),
      },
      updatedAt: new Date(Date.now() - 1800000).toISOString(),
      version: 2,
    };

    const localDoc = {
      id: 'pat-101',
      name: 'Sunita Sharma',
      nationalHealthId: 'ABHA-91-2041-8832-1102',
      riskLevel: 'HIGH',
      allergies: ['Penicillin', 'NSAIDs (Ibuprofen)'],
      chronicConditions: ['Type 2 Diabetes Mellitus', 'Stage 2 Hypertension', 'Peripheral Neuropathy'],
      vitals: {
        bloodPressure: '162/98 mmHg',
        heartRate: 94,
        spo2: 95,
        timestamp: now,
      },
      clinicalNotes: 'Acute presyncope in field sub-centre visit, ASHA referral initiated.',
      updatedAt: now,
      version: 1,
    };

    const diffs = detectFieldConflicts(localDoc, serverDoc);

    const newConflict: ConflictItem = {
      id: simId,
      queueItemId: `queue_${simId}`,
      collection: 'patients',
      recordId: 'pat-101',
      patientName: 'Sunita Sharma',
      localVersion: localDoc,
      serverVersion: serverDoc,
      detectedAt: now,
      conflictingFields: diffs,
      recommendedStrategy: defaultConflictStrategy,
      status: 'pending_review',
    };

    setConflicts((prev) => [newConflict, ...prev]);

    // Add conflict item in queue so it shows visually
    const queueItem: SyncQueueItem = {
      id: `queue_${simId}`,
      collection: 'patients',
      action: 'UPDATE',
      data: localDoc,
      createdOfflineAt: now,
      retryCount: 1,
      status: 'conflict',
      errorMessage: `Concurrent modification conflict: ${diffs.join(', ')} differ between offline and central cloud`,
    };

    setSyncQueue((prev) => [queueItem, ...prev]);

    onRecordAudit?.(
      'CDSS_INFERENCE',
      'pat-101',
      `Data conflict detected on patient Sunita Sharma (${diffs.length} conflicting fields: ${diffs.join(', ')})`
    );
  }, [defaultConflictStrategy, onRecordAudit]);

  // Robust Offline Data Entry Handlers

  // 1. Register Patient Offline
  const registerPatientOptimistic = useCallback(
    async (
      patientData: Partial<LongitudinalPatient>
    ): Promise<{ success: boolean; id: string; patient: LongitudinalPatient }> => {
      const id = patientData.id || `pat_off_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();
      const abha =
        patientData.nationalHealthId ||
        `ABHA-91-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;

      const fullPatient: LongitudinalPatient = {
        id,
        nationalHealthId: abha,
        mrn: patientData.mrn || `MRN-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
        name: patientData.name || 'Anonymous Patient',
        age: patientData.age || 30,
        gender: patientData.gender || 'Female',
        dob: patientData.dob || '1995-01-01',
        phone: patientData.phone || '+91 98765 00000',
        email: patientData.email,
        bloodGroup: patientData.bloodGroup || 'O+',
        allergies: patientData.allergies || [],
        chronicConditions: patientData.chronicConditions || [],
        villageOrCity: patientData.villageOrCity || 'Local Community',
        district: patientData.district || 'Rural District',
        primaryFacilityId: patientData.primaryFacilityId || 'facility-sc-01',
        emergencyContact: patientData.emergencyContact || {
          name: 'Family Member',
          relationship: 'Kin',
          phone: '+91 98765 11111',
        },
        consentGranted: patientData.consentGranted ?? true,
        consentTimestamp: now,
        insuranceScheme: patientData.insuranceScheme || 'PM-JAY Comprehensive Health Assurance',
        riskLevel: patientData.riskLevel || 'LOW',
        e2eeFingerprint: `SHA256:${Math.random().toString(16).substring(2, 14)}`,
        createdOffline: !isOnline,
        offlineSyncedAt: isOnline ? now : undefined,
        createdAt: now,
        updatedAt: now,
      };

      const queueItem: SyncQueueItem = {
        id,
        collection: 'patients',
        action: 'create',
        data: fullPatient,
        createdOfflineAt: now,
        retryCount: 0,
        status: isOnline ? 'syncing' : 'queued',
      };

      setSyncQueue((prev) => [queueItem, ...prev]);
      onPatientRegistered?.(fullPatient);
      onRecordAudit?.(
        'WRITE',
        id,
        `Patient record ${fullPatient.name} (${fullPatient.nationalHealthId}) created ${isOnline ? 'online' : 'offline locally'}`
      );

      if (isOnline) {
        syncQueueItemToFirestore(queueItem).then((ok) => {
          if (ok) {
            setSyncQueue((prev) => prev.filter((i) => i.id !== id));
          }
        });
      }

      return { success: true, id, patient: fullPatient };
    },
    [isOnline, onPatientRegistered, onRecordAudit]
  );

  // 2. Update Patient Offline
  const updatePatientOptimistic = useCallback(
    async (patient: LongitudinalPatient): Promise<{ success: boolean; id: string; patient: LongitudinalPatient }> => {
      const now = new Date().toISOString();
      const updated: LongitudinalPatient = {
        ...patient,
        updatedAt: now,
        offlineSyncedAt: isOnline ? now : patient.offlineSyncedAt,
      };

      const queueItem: SyncQueueItem = {
        id: patient.id,
        collection: 'patients',
        action: 'UPDATE',
        data: updated,
        createdOfflineAt: now,
        retryCount: 0,
        status: isOnline ? 'syncing' : 'queued',
      };

      setSyncQueue((prev) => [queueItem, ...prev.filter((i) => i.id !== patient.id)]);
      onPatientUpdated?.(updated);
      onRecordAudit?.(
        'EDIT_RECORD',
        patient.id,
        `Patient ${patient.name} updated offline locally. Queued for synchronization.`
      );

      if (isOnline) {
        syncQueueItemToFirestore(queueItem).then((ok) => {
          if (ok) {
            setSyncQueue((prev) => prev.filter((i) => i.id !== patient.id));
          }
        });
      }

      return { success: true, id: patient.id, patient: updated };
    },
    [isOnline, onPatientUpdated, onRecordAudit]
  );

  // 3. Create Diagnostic Request Offline (Lab or Imaging)
  const createDiagnosticOrderOptimistic = useCallback(
    async (orderData: Partial<DiagnosticOrder>): Promise<{ success: boolean; id: string; order: DiagnosticOrder }> => {
      const id = orderData.id || `diag_off_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();
      const barcode =
        orderData.sampleBarCode || `BC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

      const fullOrder: DiagnosticOrder = {
        id,
        patientId: orderData.patientId || 'pat-unknown',
        patientName: orderData.patientName || 'Patient',
        orderingFacilityId: orderData.orderingFacilityId || 'facility-sc-01',
        orderingFacilityName: orderData.orderingFacilityName || 'Sub-Centre Field Clinic',
        processingFacilityId: orderData.processingFacilityId || 'facility-dh-01',
        processingFacilityName: orderData.processingFacilityName || 'District Hospital Diagnostic Wing',
        testCode: orderData.testCode || (orderData.category === 'radiology' ? 'RAD-IMG' : 'LAB-GEN'),
        testName: orderData.testName || 'Diagnostic Investigation',
        category: orderData.category || 'biochemistry',
        priority: orderData.priority || 'routine',
        status: orderData.status || 'ordered',
        orderedBy: orderData.orderedBy || 'Frontline Clinical Officer',
        orderedDate: now,
        specimenType:
          orderData.specimenType || (orderData.category === 'radiology' ? 'Digital Imaging' : 'Whole Blood'),
        sampleBarCode: barcode,
        modalityType: orderData.modalityType,
        anatomicalSite: orderData.anatomicalSite,
        clinicalIndication: orderData.clinicalIndication,
        imagingFindings: orderData.imagingFindings,
        createdOffline: !isOnline,
        syncStatus: isOnline ? 'synced' : 'pending',
      };

      const queueItem: SyncQueueItem = {
        id,
        collection: 'diagnostics',
        action: 'create',
        data: fullOrder,
        createdOfflineAt: now,
        retryCount: 0,
        status: isOnline ? 'syncing' : 'queued',
      };

      setSyncQueue((prev) => [queueItem, ...prev]);
      onDiagnosticCreated?.(fullOrder);
      onRecordAudit?.(
        'WRITE',
        id,
        `Diagnostic order created ${isOnline ? 'online' : 'offline'}: ${fullOrder.testName} for ${fullOrder.patientName} (${fullOrder.priority.toUpperCase()})`
      );

      if (isOnline) {
        syncQueueItemToFirestore(queueItem).then((ok) => {
          if (ok) {
            setSyncQueue((prev) => prev.filter((i) => i.id !== id));
          }
        });
      }

      return { success: true, id, order: fullOrder };
    },
    [isOnline, onDiagnosticCreated, onRecordAudit]
  );

  // 4. Auto-sync queue to Firestore when the network reconnects
  useEffect(() => {
    if (isOnline && queuedCount > 0 && !isSyncing) {
      const timer = setTimeout(() => {
        triggerSyncNow();
      }, 800); // Debounce to allow connection to settle
      return () => clearTimeout(timer);
    }
  }, [isOnline, queuedCount, isSyncing, triggerSyncNow]);

  // 2. Build an optimistic UI queue: frontline health workers at Sub-Centres

  // A. Create Triage Ticket
  const createTriageTicketOptimistic = useCallback(
    async (payload: FrontlineTriagePayload): Promise<{ success: boolean; id: string }> => {
      const id = payload.id || `triage_sc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();

      const ticketData: FrontlineTriagePayload = {
        ...payload,
        id,
        createdOffline: !isOnline,
      };

      const queueItem: SyncQueueItem = {
        id,
        collection: 'triage_tickets',
        action: 'create',
        data: {
          ...ticketData,
          createdAt: now,
          clientTimestamp: now,
          createdOffline: !isOnline,
          offlineQueueStatus: isOnline ? 'syncing' : 'queued',
        },
        createdOfflineAt: now,
        retryCount: 0,
        status: isOnline ? 'syncing' : 'queued',
      };

      // 1. Optimistic Local State Update (Instant UI reactivity)
      setSyncQueue((prev) => [queueItem, ...prev]);
      onTriageCreated?.(ticketData);
      onRecordAudit?.(
        'CREATE_RECORD',
        id,
        `Frontline triage ticket created ${isOnline ? '(online)' : '(queued offline)'} for ${payload.patientName} (${payload.urgencyLevel})`
      );

      // 2. Firestore write (Uses persistentMultipleTabManager cache under the hood)
      if (isOnline) {
        syncQueueItemToFirestore(queueItem).then((ok) => {
          if (ok) {
            setSyncQueue((prev) => prev.filter((i) => i.id !== id));
          }
        });
      }

      return { success: true, id };
    },
    [isOnline, onTriageCreated, onRecordAudit]
  );

  // B. Update Medicine Stock Log
  const updateMedicineStockLogOptimistic = useCallback(
    async (payload: FrontlineStockLogPayload): Promise<{ success: boolean; id: string }> => {
      const id = payload.id || `stock_log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();

      const logData = {
        ...payload,
        id,
        createdAt: now,
        createdOffline: !isOnline,
      };

      const queueItem: SyncQueueItem = {
        id,
        collection: 'medicine_stock_logs',
        action: 'create',
        data: {
          ...logData,
          clientTimestamp: now,
          offlineQueueStatus: isOnline ? 'syncing' : 'queued',
        },
        createdOfflineAt: now,
        retryCount: 0,
        status: isOnline ? 'syncing' : 'queued',
      };

      // 1. Optimistic Local State Update
      setSyncQueue((prev) => [queueItem, ...prev]);
      onStockUpdated?.(payload);
      onRecordAudit?.(
        'DISPENSE',
        id,
        `Frontline stock log recorded: ${payload.changeType} ${payload.quantityChange} units of ${payload.medicineName} (resulting: ${payload.resultingStock})`
      );

      // 2. Firestore write
      if (isOnline) {
        syncQueueItemToFirestore(queueItem).then((ok) => {
          if (ok) {
            setSyncQueue((prev) => prev.filter((i) => i.id !== id));
          }
        });
      }

      return { success: true, id };
    },
    [isOnline, onStockUpdated, onRecordAudit]
  );

  // C. Issue Referral Slip
  const issueReferralSlipOptimistic = useCallback(
    async (payload: FrontlineReferralPayload): Promise<{ success: boolean; id: string }> => {
      const id = payload.id || `ref_sc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();

      const referralObj: Referral = {
        id,
        patientId: payload.patientId,
        patientName: payload.patientName,
        patientAge: payload.patientAge || 35,
        originatingFacilityId: payload.originatingFacilityId,
        destinationFacilityId: payload.destinationFacilityId,
        urgency: payload.urgency,
        status: 'initiated',
        clinicalReason: payload.clinicalReason,
        referringClinician: payload.referringClinician || 'ASHA / ANM Frontline Worker',
        specialtyRequired: payload.specialtyRequired,
        transportMode: payload.transportMode,
        initiatedDate: now,
        syncStatus: isOnline ? 'synced' : 'pending',
      };

      const queueItem: SyncQueueItem = {
        id,
        collection: 'referrals',
        action: 'create',
        data: {
          ...referralObj,
          createdAt: now,
          clientTimestamp: now,
          createdOffline: !isOnline,
          offlineQueueStatus: isOnline ? 'syncing' : 'queued',
        },
        createdOfflineAt: now,
        retryCount: 0,
        status: isOnline ? 'syncing' : 'queued',
      };

      // 1. Optimistic Local State Update
      setSyncQueue((prev) => [queueItem, ...prev]);
      onReferralIssued?.(referralObj);
      onRecordAudit?.(
        'REFERRAL_INIT',
        id,
        `Frontline referral slip issued for ${payload.patientName} -> ${payload.destinationFacilityName} (${payload.urgency})`
      );

      // 2. Firestore write
      if (isOnline) {
        syncQueueItemToFirestore(queueItem).then((ok) => {
          if (ok) {
            setSyncQueue((prev) => prev.filter((i) => i.id !== id));
          }
        });
      }

      return { success: true, id };
    },
    [isOnline, onReferralIssued, onRecordAudit]
  );

  const addGenericQueueItem = useCallback(
    (item: SyncQueueItem) => {
      setSyncQueue((prev) => [item, ...prev]);
      if (isOnline) {
        syncQueueItemToFirestore(item).then((ok) => {
          if (ok) {
            setSyncQueue((prev) => prev.filter((i) => i.id !== item.id));
          }
        });
      }
    },
    [isOnline]
  );

  const clearSyncedItems = useCallback(() => {
    setSyncQueue((prev) => prev.filter((i) => i.status !== 'synced'));
  }, []);

  // Sync status label
  const syncStatusText = useMemo(() => {
    if (!isOnline) {
      return `Working Offline (${queuedCount} change${queuedCount === 1 ? '' : 's'} queued)`;
    }
    if (queuedCount > 0) {
      return `Syncing... (${queuedCount} queued)`;
    }
    return 'Synced (Online)';
  }, [isOnline, queuedCount]);

  const value = useMemo(
    () => ({
      networkMode,
      setNetworkMode,
      isOnline,
      syncQueue,
      queuedCount,
      isSyncing,
      lastSyncedTime,
      syncStatusText,
      registerPatientOptimistic,
      updatePatientOptimistic,
      issueReferralSlipOptimistic,
      createDiagnosticOrderOptimistic,
      createTriageTicketOptimistic,
      updateMedicineStockLogOptimistic,
      addGenericQueueItem,
      conflicts,
      defaultConflictStrategy,
      setDefaultConflictStrategy,
      resolveConflict,
      simulateConflict,
      triggerSyncNow,
      clearSyncedItems,
      showSubCentreDeskModal,
      setShowSubCentreDeskModal,
      subCentreDeskTab,
      setSubCentreDeskTab,
    }),
    [
      networkMode,
      setNetworkMode,
      isOnline,
      syncQueue,
      queuedCount,
      isSyncing,
      lastSyncedTime,
      syncStatusText,
      registerPatientOptimistic,
      updatePatientOptimistic,
      issueReferralSlipOptimistic,
      createDiagnosticOrderOptimistic,
      createTriageTicketOptimistic,
      updateMedicineStockLogOptimistic,
      addGenericQueueItem,
      conflicts,
      defaultConflictStrategy,
      setDefaultConflictStrategy,
      resolveConflict,
      simulateConflict,
      triggerSyncNow,
      clearSyncedItems,
      showSubCentreDeskModal,
      subCentreDeskTab,
    ]
  );

  return <OfflineSyncContext.Provider value={value}>{children}</OfflineSyncContext.Provider>;
};

export const useOfflineSync = (): OfflineSyncContextType => {
  const context = useContext(OfflineSyncContext);
  if (!context) {
    throw new Error('useOfflineSync must be used within an OfflineSyncProvider');
  }
  return context;
};
