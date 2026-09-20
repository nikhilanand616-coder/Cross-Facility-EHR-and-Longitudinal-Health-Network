import React, { useState, useEffect } from 'react';
import {
  Cloud,
  RefreshCw,
  Server,
  Download,
  Database,
  ArrowDownUp,
  Cpu,
  UserPlus,
  Send,
  FlaskConical,
  CheckCircle,
  GitMerge,
  Sparkles,
  Radio,
} from 'lucide-react';
import { NetworkMode, SyncQueueItem, Facility, LongitudinalPatient, ConflictResolutionStrategy } from '../types';
import { useOfflineSync } from '../context/OfflineSyncContext';

interface OfflineSyncManagerProps {
  networkMode: NetworkMode;
  onChangeNetworkMode: (mode: NetworkMode) => void;
  syncQueue: SyncQueueItem[];
  onTriggerSync: () => void;
  isSyncing: boolean;
  lastSyncedTime: string;
  onAddOfflineMutation?: (item: SyncQueueItem) => void;
  patients?: LongitudinalPatient[];
  facilities?: Facility[];
}

export const OfflineSyncManager: React.FC<OfflineSyncManagerProps> = ({
  networkMode,
  onChangeNetworkMode,
  syncQueue,
  onTriggerSync,
  isSyncing,
  lastSyncedTime,
  patients = [],
  facilities = [],
}) => {
  const {
    registerPatientOptimistic,
    issueReferralSlipOptimistic,
    createDiagnosticOrderOptimistic,
    conflicts,
    defaultConflictStrategy,
    setDefaultConflictStrategy,
    resolveConflict,
    simulateConflict,
  } = useOfflineSync();

  const [activeTab, setActiveTab] = useState<'entry' | 'conflicts' | 'queue'>('entry');
  const [entrySubTab, setEntrySubTab] = useState<'patient' | 'referral' | 'diagnostic'>('patient');
  const [autoSyncCountdown, setAutoSyncCountdown] = useState(25);
  const [backupDownloadMsg, setBackupDownloadMsg] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'info'; text: string } | null>(null);

  // Offline Patient Entry State
  const [patientForm, setPatientForm] = useState({
    name: '',
    age: 28,
    gender: 'Female' as 'Female' | 'Male' | 'Other',
    phone: '',
    bloodGroup: 'O+',
    village: '',
    allergies: '',
    chronicConditions: '',
    riskLevel: 'LOW' as 'LOW' | 'MEDIUM' | 'HIGH',
    systolicBP: 120,
    diastolicBP: 80,
  });

  // Offline Referral Entry State
  const [referralForm, setReferralForm] = useState({
    patientId: patients[0]?.id || '',
    destinationFacilityId: facilities[1]?.id || facilities[0]?.id || 'facility-chc-01',
    urgency: 'urgent' as 'routine' | 'urgent' | 'emergency',
    specialty: 'Obstetrics & High-Risk Maternal Care',
    transportMode: 'Ambulance 108' as 'Ambulance 108' | 'Facility Vehicle' | 'Private/Public Transport',
    clinicalReason: 'Severe gestational hypertension, needs urgent ultrasound & specialist evaluation',
  });

  // Offline Diagnostic Request State
  const [diagnosticForm, setDiagnosticForm] = useState({
    patientId: patients[0]?.id || '',
    investigationType: 'lab' as 'lab' | 'imaging',
    category: 'biochemistry' as any,
    testName: 'Complete Blood Count (CBC) with Platelets',
    modalityType: 'X-Ray' as any,
    anatomicalSite: 'Chest PA View',
    priority: 'urgent' as 'routine' | 'urgent' | 'stat',
    clinicalIndication: 'Recurrent productive cough, rule out pulmonary infiltration/consolidation',
    specimenType: 'Venous Blood (EDTA)',
  });

  // Selected conflict for side-by-side diff review
  const [selectedConflictId, setSelectedConflictId] = useState<string | null>(null);

  // Auto-sync countdown timer
  useEffect(() => {
    if (networkMode === 'offline') return;

    const timer = setInterval(() => {
      setAutoSyncCountdown((prev) => {
        if (prev <= 1) {
          if (syncQueue.length > 0 && !isSyncing) {
            onTriggerSync();
          }
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [networkMode, syncQueue.length, isSyncing, onTriggerSync]);

  const showNotification = (text: string, type: 'success' | 'info' = 'success') => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4500);
  };

  const handleDownloadCloudBackup = async () => {
    try {
      const res = await fetch('/api/backup/export');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hipaa_cloud_backup_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupDownloadMsg('Encrypted cloud backup manifest downloaded successfully.');
      setTimeout(() => setBackupDownloadMsg(null), 4000);
    } catch {
      setBackupDownloadMsg('Error initiating cloud backup.');
    }
  };

  // Submit Offline Patient Record
  const handleSubmitPatientOffline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientForm.name.trim()) return;

    const res = await registerPatientOptimistic({
      name: patientForm.name,
      age: Number(patientForm.age),
      gender: patientForm.gender,
      phone: patientForm.phone || '+91 98765 43210',
      bloodGroup: patientForm.bloodGroup,
      villageOrCity: patientForm.village || 'Rampur Hamlet',
      allergies: patientForm.allergies
        ? patientForm.allergies.split(',').map((s) => s.trim())
        : ['None recorded'],
      chronicConditions: patientForm.chronicConditions
        ? patientForm.chronicConditions.split(',').map((s) => s.trim())
        : [],
      riskLevel: patientForm.riskLevel,
    });

    showNotification(
      `Patient ${res.patient.name} (${res.patient.nationalHealthId}) registered offline and queued in local buffer.`,
      'success'
    );

    setPatientForm({
      name: '',
      age: 28,
      gender: 'Female',
      phone: '',
      bloodGroup: 'O+',
      village: '',
      allergies: '',
      chronicConditions: '',
      riskLevel: 'LOW',
      systolicBP: 120,
      diastolicBP: 80,
    });
  };

  // Submit Offline Referral Slip
  const handleSubmitReferralOffline = async (e: React.FormEvent) => {
    e.preventDefault();
    const pat = patients.find((p) => p.id === referralForm.patientId) || patients[0];
    const destFac = facilities.find((f) => f.id === referralForm.destinationFacilityId) || facilities[1];

    if (!pat || !destFac) return;

    await issueReferralSlipOptimistic({
      patientId: pat.id,
      patientName: pat.name,
      patientAge: pat.age,
      originatingFacilityId: 'facility-sc-01',
      originatingFacilityName: 'Rampur Sub-Centre (Frontline Node)',
      destinationFacilityId: destFac.id,
      destinationFacilityName: destFac.name,
      urgency: referralForm.urgency,
      specialtyRequired: referralForm.specialty,
      transportMode: referralForm.transportMode,
      clinicalReason: referralForm.clinicalReason,
      referringClinician: 'ANM Rekha Devi (Field Healthcare Worker)',
    });

    showNotification(
      `Referral for ${pat.name} to ${destFac.name} (${referralForm.urgency.toUpperCase()}) queued offline for automatic cloud sync.`,
      'success'
    );
  };

  // Submit Offline Diagnostic Request
  const handleSubmitDiagnosticOffline = async (e: React.FormEvent) => {
    e.preventDefault();
    const pat = patients.find((p) => p.id === diagnosticForm.patientId) || patients[0];
    if (!pat) return;

    const isImaging = diagnosticForm.investigationType === 'imaging';

    await createDiagnosticOrderOptimistic({
      patientId: pat.id,
      patientName: pat.name,
      category: isImaging ? 'radiology' : diagnosticForm.category,
      testName: isImaging
        ? `${diagnosticForm.modalityType}: ${diagnosticForm.anatomicalSite}`
        : diagnosticForm.testName,
      testCode: isImaging ? `RAD-${diagnosticForm.modalityType.toUpperCase()}` : 'LAB-PANEL',
      priority: diagnosticForm.priority,
      orderingFacilityId: 'facility-sc-01',
      orderingFacilityName: 'Rampur Sub-Centre',
      processingFacilityId: 'facility-dh-01',
      processingFacilityName: 'District Hospital Diagnostic Imaging & Hub Lab',
      specimenType: isImaging ? 'Digital Radiography Image' : diagnosticForm.specimenType,
      modalityType: isImaging ? diagnosticForm.modalityType : undefined,
      anatomicalSite: isImaging ? diagnosticForm.anatomicalSite : undefined,
      clinicalIndication: diagnosticForm.clinicalIndication,
    });

    showNotification(
      `Diagnostic request for ${pat.name} (${isImaging ? diagnosticForm.modalityType : diagnosticForm.testName}) queued offline in local storage.`,
      'success'
    );
  };

  const pendingConflicts = conflicts.filter((c) => c.status === 'pending_review');
  const activeSelectedConflict = conflicts.find((c) => c.id === selectedConflictId) || pendingConflicts[0];

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                <Cloud className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Offline Data Entry & Conflict Resolution Center
                </h2>
                <p className="text-xs text-slate-500">
                  Frontline offline data collection, automatic cloud delta synchronization, and intelligent conflict management
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleDownloadCloudBackup}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Export Offline Dump</span>
            </button>
            <button
              onClick={onTriggerSync}
              disabled={isSyncing || networkMode === 'offline'}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing to Cloud...' : 'Synchronize Now'}</span>
            </button>
          </div>
        </div>

        {backupDownloadMsg && (
          <div className="mt-3 p-2.5 rounded bg-emerald-50 text-emerald-800 text-xs border border-emerald-200">
            {backupDownloadMsg}
          </div>
        )}

        {feedbackMsg && (
          <div className="mt-3 p-2.5 rounded bg-indigo-50 text-indigo-900 text-xs border border-indigo-200 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>{feedbackMsg.text}</span>
          </div>
        )}
      </div>

      {/* Network Mode & Engine Heartbeat Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Network Mode Switcher */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Connectivity State
          </span>
          <div className="space-y-2">
            <button
              onClick={() => onChangeNetworkMode('online')}
              className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                networkMode === 'online'
                  ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 font-bold ring-1 ring-emerald-500'
                  : 'border-slate-200 bg-slate-50 hover:bg-white text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Online (Direct Cloud DB)</span>
              </div>
              <span className="text-[10px] text-emerald-700 font-semibold">Active Sync</span>
            </button>

            <button
              onClick={() => onChangeNetworkMode('intermittent')}
              className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                networkMode === 'intermittent'
                  ? 'border-amber-500 bg-amber-50/70 text-amber-900 font-bold ring-1 ring-amber-500'
                  : 'border-slate-200 bg-slate-50 hover:bg-white text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <span>Intermittent (2G/Edge Jitter)</span>
              </div>
              <span className="text-[10px] text-amber-700 font-semibold">Buffered</span>
            </button>

            <button
              onClick={() => onChangeNetworkMode('offline')}
              className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                networkMode === 'offline'
                  ? 'border-rose-500 bg-rose-50/70 text-rose-900 font-bold ring-1 ring-rose-500'
                  : 'border-slate-200 bg-slate-50 hover:bg-white text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>Disconnected / Offline Mode</span>
              </div>
              <span className="text-[10px] text-rose-700 font-semibold">Local IndexedDB</span>
            </button>
          </div>
        </div>

        {/* Sync Status & Queue Heartbeat */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Sync Engine Status
            </span>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span className="text-slate-500">Last Successful Sync:</span>
                <strong className="text-slate-800">{lastSyncedTime}</strong>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span className="text-slate-500">Unsynchronized Changes:</span>
                <strong className={syncQueue.length > 0 ? 'text-amber-600 font-bold' : 'text-emerald-600 font-bold'}>
                  {syncQueue.length} item{syncQueue.length === 1 ? '' : 's'} queued
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Auto-Sync Heartbeat:</span>
                <span className="text-indigo-700 font-medium">
                  {networkMode === 'offline' ? 'Paused (Offline)' : `Triggering in ${autoSyncCountdown}s`}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-2 bg-slate-50 rounded border border-slate-200 text-[11px] text-slate-600">
            Records created while offline persist safely on the device. Once network is re-established, automatic conflict resolution executes without data loss.
          </div>
        </div>

        {/* Active Conflict Strategy Policy */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Conflict Resolution Policy
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold">
                Configurable
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <label className="text-[11px] font-semibold text-slate-700 block">
                Default Sync Reconciliation Strategy:
              </label>
              <select
                value={defaultConflictStrategy}
                onChange={(e) => setDefaultConflictStrategy(e.target.value as ConflictResolutionStrategy)}
                className="w-full p-2 rounded-lg border border-slate-300 bg-slate-50 text-xs font-medium text-slate-800 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="three_way_merge">Intelligent Three-Way Merge (Recommended)</option>
                <option value="last_write_wins">Last-Write-Wins (LWW Timestamp)</option>
                <option value="server_clinical_authority">Clinical Authority (Hospital Server-Wins)</option>
                <option value="frontline_client_priority">Frontline Emergency Priority (Bedside-Wins)</option>
                <option value="manual_review">Manual Clinician Review (Hold for Approval)</option>
              </select>

              <div className="p-2 bg-indigo-50/70 border border-indigo-200 rounded text-[11px] text-indigo-950">
                {defaultConflictStrategy === 'three_way_merge' &&
                  'Combines non-conflicting fields, merges allergy/condition lists, and takes newest vitals.'}
                {defaultConflictStrategy === 'last_write_wins' &&
                  'Record with the newest authoritative timestamp automatically overwrites older edits.'}
                {defaultConflictStrategy === 'server_clinical_authority' &&
                  'Hospital specialist confirmed diagnoses and prescriptions prevail over field estimates.'}
                {defaultConflictStrategy === 'frontline_client_priority' &&
                  'Acute vitals and emergency triage status taken at patient bedside override stale records.'}
                {defaultConflictStrategy === 'manual_review' &&
                  'Flags concurrent modifications for physician comparison and side-by-side resolution.'}
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Pending Review: <strong>{pendingConflicts.length}</strong>
            </span>
            <button
              onClick={simulateConflict}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
            >
              + Simulate Concurrent Conflict
            </button>
          </div>
        </div>
      </div>

      {/* Main Feature Tabs */}
      <div className="flex border-b border-slate-200 gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('entry')}
          className={`pb-2.5 flex items-center gap-1.5 cursor-pointer transition-colors ${
            activeTab === 'entry'
              ? 'border-b-2 border-indigo-600 text-indigo-600 font-bold'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Offline Data Entry Suite</span>
        </button>

        <button
          onClick={() => setActiveTab('conflicts')}
          className={`pb-2.5 flex items-center gap-1.5 cursor-pointer transition-colors relative ${
            activeTab === 'conflicts'
              ? 'border-b-2 border-indigo-600 text-indigo-600 font-bold'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <GitMerge className="w-4 h-4" />
          <span>Conflict Resolution Center</span>
          {pendingConflicts.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
              {pendingConflicts.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('queue')}
          className={`pb-2.5 flex items-center gap-1.5 cursor-pointer transition-colors ${
            activeTab === 'queue'
              ? 'border-b-2 border-indigo-600 text-indigo-600 font-bold'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Local Sync Queue Ledger ({syncQueue.length})</span>
        </button>
      </div>

      {/* TAB 1: OFFLINE DATA ENTRY SUITE */}
      {activeTab === 'entry' && (
        <div className="space-y-4">
          {/* Subtabs for Patient, Referral, Diagnostic */}
          <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-fit text-xs font-medium">
            <button
              onClick={() => setEntrySubTab('patient')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                entrySubTab === 'patient'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
              <span>1. Offline Patient Registration</span>
            </button>

            <button
              onClick={() => setEntrySubTab('referral')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                entrySubTab === 'referral'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Send className="w-3.5 h-3.5 text-emerald-600" />
              <span>2. Offline Referral Slip</span>
            </button>

            <button
              onClick={() => setEntrySubTab('diagnostic')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                entrySubTab === 'diagnostic'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5 text-purple-600" />
              <span>3. Offline Diagnostic Request (Lab & Imaging)</span>
            </button>
          </div>

          {/* SUBTAB 1: PATIENT REGISTRATION FORM */}
          {entrySubTab === 'patient' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-indigo-600" />
                  <span>Register Patient Offline</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                    Automatic ABHA Generation
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Record new patient demographics, clinical allergies, and risk tier when clinic is completely disconnected.
                </p>
              </div>

              <form onSubmit={handleSubmitPatientOffline} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Chandra"
                      value={patientForm.name}
                      onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Age & Gender *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        required
                        min="0"
                        max="120"
                        value={patientForm.age}
                        onChange={(e) => setPatientForm({ ...patientForm, age: Number(e.target.value) })}
                        className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
                      />
                      <select
                        value={patientForm.gender}
                        onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value as any })}
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
                      >
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      placeholder="+91 98765 00000"
                      value={patientForm.phone}
                      onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Blood Group
                    </label>
                    <select
                      value={patientForm.bloodGroup}
                      onChange={(e) => setPatientForm({ ...patientForm, bloodGroup: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
                    >
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Village / Community
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Rampur Tola"
                      value={patientForm.village}
                      onChange={(e) => setPatientForm({ ...patientForm, village: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Clinical Risk Tier
                    </label>
                    <select
                      value={patientForm.riskLevel}
                      onChange={(e) => setPatientForm({ ...patientForm, riskLevel: e.target.value as any })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
                    >
                      <option value="LOW">Low Risk (Routine)</option>
                      <option value="MEDIUM">Moderate Risk (NCD / ANC Monitor)</option>
                      <option value="HIGH">High Risk (Urgent Care / Specialist)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Field Blood Pressure
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        placeholder="Sys"
                        value={patientForm.systolicBP}
                        onChange={(e) => setPatientForm({ ...patientForm, systolicBP: Number(e.target.value) })}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs text-center"
                      />
                      <span className="text-slate-400">/</span>
                      <input
                        type="number"
                        placeholder="Dia"
                        value={patientForm.diastolicBP}
                        onChange={(e) => setPatientForm({ ...patientForm, diastolicBP: Number(e.target.value) })}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs text-center"
                      />
                      <span className="text-[10px] text-slate-500 shrink-0">mmHg</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Known Drug Allergies (comma separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Penicillin, NSAIDs, Sulfa"
                      value={patientForm.allergies}
                      onChange={(e) => setPatientForm({ ...patientForm, allergies: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Chronic Conditions / Comorbidities
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Hypertension, Type 2 Diabetes, Asthma"
                      value={patientForm.chronicConditions}
                      onChange={(e) => setPatientForm({ ...patientForm, chronicConditions: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <span className="text-xs text-slate-500">
                    Will be stored in local buffer and auto-pushed to cloud database.
                  </span>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Queue Patient Registration Offline</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SUBTAB 2: REFERRAL FORM */}
          {entrySubTab === 'referral' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Send className="w-4 h-4 text-emerald-600" />
                  <span>Issue Inter-Facility Referral Slip Offline</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Generate digital referral requisition with clinical reason, urgency, and 108 emergency transport routing while offline.
                </p>
              </div>

              <form onSubmit={handleSubmitReferralOffline} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Select Patient *
                    </label>
                    <select
                      value={referralForm.patientId}
                      onChange={(e) => setReferralForm({ ...referralForm, patientId: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
                    >
                      {patients.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.age}y {p.gender}) - {p.nationalHealthId}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Destination Facility *
                    </label>
                    <select
                      value={referralForm.destinationFacilityId}
                      onChange={(e) => setReferralForm({ ...referralForm, destinationFacilityId: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
                    >
                      {facilities.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} ({f.tier.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Urgency Level *
                    </label>
                    <select
                      value={referralForm.urgency}
                      onChange={(e) => setReferralForm({ ...referralForm, urgency: e.target.value as any })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
                    >
                      <option value="routine">Routine (Scheduled Consult within 72h)</option>
                      <option value="urgent">Urgent (Specialist review within 24h)</option>
                      <option value="emergency">Emergency (Immediate 108 Transfer / under 2 hours)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Specialty Department Required
                    </label>
                    <input
                      type="text"
                      value={referralForm.specialty}
                      onChange={(e) => setReferralForm({ ...referralForm, specialty: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Patient Transport Mode
                    </label>
                    <select
                      value={referralForm.transportMode}
                      onChange={(e) => setReferralForm({ ...referralForm, transportMode: e.target.value as any })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
                    >
                      <option value="Ambulance 108">Ambulance 108 (Dedicated Emergency Vehicle)</option>
                      <option value="Facility Vehicle">Facility Vehicle / Govt. Shuttle</option>
                      <option value="Private/Public Transport">Private / Public Transport</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Clinical Summary & Justification for Transfer *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={referralForm.clinicalReason}
                    onChange={(e) => setReferralForm({ ...referralForm, clinicalReason: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Issue Referral Slip Offline</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SUBTAB 3: DIAGNOSTIC REQUEST (LAB & IMAGING) */}
          {entrySubTab === 'diagnostic' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-purple-600" />
                  <span>Request Laboratory Test or Medical Imaging Offline</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Requisition blood, biochemistry, microbiology tests, or imaging orders (X-Ray, Obstetric Ultrasound, CT) with offline barcode generation.
                </p>
              </div>

              <form onSubmit={handleSubmitDiagnosticOffline} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Select Patient *
                    </label>
                    <select
                      value={diagnosticForm.patientId}
                      onChange={(e) => setDiagnosticForm({ ...diagnosticForm, patientId: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
                    >
                      {patients.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.age}y {p.gender})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Investigation Modality Type *
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setDiagnosticForm({ ...diagnosticForm, investigationType: 'lab' })}
                        className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-semibold cursor-pointer ${
                          diagnosticForm.investigationType === 'lab'
                            ? 'bg-purple-50 border-purple-500 text-purple-900'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        Laboratory Test
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiagnosticForm({ ...diagnosticForm, investigationType: 'imaging' })}
                        className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-semibold cursor-pointer ${
                          diagnosticForm.investigationType === 'imaging'
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-900'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        Medical Imaging
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Order Urgency / Priority *
                    </label>
                    <select
                      value={diagnosticForm.priority}
                      onChange={(e) => setDiagnosticForm({ ...diagnosticForm, priority: e.target.value as any })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
                    >
                      <option value="routine">Routine (Standard Turnaround)</option>
                      <option value="urgent">Urgent (Turnaround within 6 hours)</option>
                      <option value="stat">STAT (Emergency 1-Hour TAT)</option>
                    </select>
                  </div>
                </div>

                {diagnosticForm.investigationType === 'lab' ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-purple-50/50 p-3 rounded-lg border border-purple-100">
                    <div>
                      <label className="text-[11px] font-bold text-purple-900 block mb-1">
                        Laboratory Panel / Test Name *
                      </label>
                      <select
                        value={diagnosticForm.testName}
                        onChange={(e) => setDiagnosticForm({ ...diagnosticForm, testName: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-purple-200 bg-white text-xs"
                      >
                        <option value="Complete Blood Count (CBC) with Platelets">Complete Blood Count (CBC) with Platelets</option>
                        <option value="Glycated Hemoglobin (HbA1c)">Glycated Hemoglobin (HbA1c)</option>
                        <option value="Liver Function Test (LFT Panel)">Liver Function Test (LFT Panel)</option>
                        <option value="Kidney Function & Electrolytes (KFT)">Kidney Function & Electrolytes (KFT)</option>
                        <option value="Dengue NS1 Antigen & IgM/IgG Serology">Dengue NS1 Antigen & IgM/IgG Serology</option>
                        <option value="Sputum AFB for Tuberculosis">Sputum AFB for Tuberculosis</option>
                        <option value="Troponin-I Rapid Quantitative">Troponin-I Rapid Quantitative</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-purple-900 block mb-1">
                        Category
                      </label>
                      <select
                        value={diagnosticForm.category}
                        onChange={(e) => setDiagnosticForm({ ...diagnosticForm, category: e.target.value as any })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-purple-200 bg-white text-xs"
                      >
                        <option value="biochemistry">Biochemistry</option>
                        <option value="hematology">Hematology</option>
                        <option value="microbiology">Microbiology</option>
                        <option value="point_of_care">Point-of-Care (POCT)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-purple-900 block mb-1">
                        Specimen Type & Container
                      </label>
                      <input
                        type="text"
                        value={diagnosticForm.specimenType}
                        onChange={(e) => setDiagnosticForm({ ...diagnosticForm, specimenType: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-purple-200 bg-white text-xs"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-indigo-50/50 p-3 rounded-lg border border-indigo-100">
                    <div>
                      <label className="text-[11px] font-bold text-indigo-900 block mb-1">
                        Imaging Modality *
                      </label>
                      <select
                        value={diagnosticForm.modalityType}
                        onChange={(e) => setDiagnosticForm({ ...diagnosticForm, modalityType: e.target.value as any })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-white text-xs"
                      >
                        <option value="X-Ray">Digital Radiography (X-Ray)</option>
                        <option value="Ultrasound">Ultrasonography (USG / Obstetric ANC)</option>
                        <option value="CT Scan">Computed Tomography (CT Scan)</option>
                        <option value="ECG">12-Lead Electrocardiogram (ECG)</option>
                        <option value="MRI">Magnetic Resonance Imaging (MRI)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-indigo-900 block mb-1">
                        Anatomical Site & View *
                      </label>
                      <input
                        type="text"
                        value={diagnosticForm.anatomicalSite}
                        onChange={(e) => setDiagnosticForm({ ...diagnosticForm, anatomicalSite: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-indigo-200 bg-white text-xs"
                        placeholder="e.g. Chest PA Erect, Obstetric Pelvis ANC, Brain Non-contrast"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Clinical Suspicion / Provisional Indication *
                  </label>
                  <input
                    type="text"
                    required
                    value={diagnosticForm.clinicalIndication}
                    onChange={(e) => setDiagnosticForm({ ...diagnosticForm, clinicalIndication: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <FlaskConical className="w-3.5 h-3.5" />
                    <span>Queue Diagnostic Request Offline</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CONFLICT RESOLUTION CENTER */}
      {activeTab === 'conflicts' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <GitMerge className="w-5 h-5 text-indigo-600" />
                  <span>Clinical Data Synchronization Conflicts ({conflicts.length})</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Occurs when records are modified concurrently at both the offline rural clinic and the central district hospital.
                </p>
              </div>

              <button
                onClick={simulateConflict}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-300 text-xs font-bold hover:bg-amber-100 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Simulate Concurrent Modification</span>
              </button>
            </div>

            {conflicts.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs">
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <strong className="text-sm text-slate-800 block">No Active Conflicts</strong>
                <p className="mt-1">All offline mutations have reconciled cleanly with zero data collisions.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Conflict Selection Strip */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {conflicts.map((conflict) => (
                    <div
                      key={conflict.id}
                      onClick={() => setSelectedConflictId(conflict.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        (activeSelectedConflict?.id === conflict.id)
                          ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-500'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-xs text-slate-900">
                          {conflict.patientName || `Record: ${conflict.recordId}`}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            conflict.status === 'resolved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {conflict.status === 'resolved' ? 'Resolved' : 'Pending Review'}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-600 space-y-1">
                        <div>
                          Collection: <strong className="text-slate-800">{conflict.collection}</strong> | Detected:{' '}
                          {new Date(conflict.detectedAt).toLocaleTimeString()}
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-slate-500">Conflicting fields:</span>
                          {conflict.conflictingFields.map((f) => (
                            <span key={f} className="px-1.5 py-0.2 bg-amber-100 text-amber-900 rounded font-semibold text-[10px]">
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Side-by-Side Diff Viewer */}
                {activeSelectedConflict && (
                  <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/50 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          Side-by-Side Comparison: {activeSelectedConflict.patientName || activeSelectedConflict.recordId}
                        </h4>
                        <span className="text-xs text-slate-500">
                          Review differing attributes and choose the appropriate clinical resolution policy.
                        </span>
                      </div>

                      {activeSelectedConflict.status === 'resolved' && (
                        <span className="px-3 py-1 rounded bg-emerald-100 text-emerald-800 text-xs font-bold">
                          Resolved via {activeSelectedConflict.resolvedStrategy}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Local Offline Bedside Version */}
                      <div className="bg-white border border-amber-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                            <Radio className="w-3.5 h-3.5 text-amber-600" />
                            <span>Frontline Bedside Offline Version</span>
                          </span>
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-mono">
                            Client Timestamp
                          </span>
                        </div>
                        <div className="space-y-2 text-xs">
                          {activeSelectedConflict.conflictingFields.map((field) => (
                            <div key={field} className="p-2 bg-amber-50/60 rounded border border-amber-100">
                              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                                {field}
                              </span>
                              <pre className="font-mono text-xs text-slate-800 mt-0.5 whitespace-pre-wrap">
                                {JSON.stringify(activeSelectedConflict.localVersion[field], null, 2)}
                              </pre>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Central Cloud Server Version */}
                      <div className="bg-white border border-indigo-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                            <Server className="w-3.5 h-3.5 text-indigo-600" />
                            <span>District Hospital Central Cloud Version</span>
                          </span>
                          <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-mono">
                            Server Timestamp
                          </span>
                        </div>
                        <div className="space-y-2 text-xs">
                          {activeSelectedConflict.conflictingFields.map((field) => (
                            <div key={field} className="p-2 bg-indigo-50/60 rounded border border-indigo-100">
                              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                                {field}
                              </span>
                              <pre className="font-mono text-xs text-slate-800 mt-0.5 whitespace-pre-wrap">
                                {JSON.stringify(activeSelectedConflict.serverVersion[field], null, 2)}
                              </pre>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Conflict Resolution Execution Buttons */}
                    {activeSelectedConflict.status === 'pending_review' && (
                      <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
                        <span className="text-xs font-bold text-slate-700 block">
                          Execute Clinical Conflict Resolution:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => resolveConflict(activeSelectedConflict.id, 'three_way_merge')}
                            className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-xs"
                          >
                            <GitMerge className="w-3.5 h-3.5" />
                            <span>Apply Three-Way Union Merge (Safest)</span>
                          </button>

                          <button
                            onClick={() => resolveConflict(activeSelectedConflict.id, 'frontline_client_priority')}
                            className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-xs"
                          >
                            <Radio className="w-3.5 h-3.5" />
                            <span>Prioritize Frontline Bedside Vitals</span>
                          </button>

                          <button
                            onClick={() => resolveConflict(activeSelectedConflict.id, 'server_clinical_authority')}
                            className="px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-xs"
                          >
                            <Server className="w-3.5 h-3.5" />
                            <span>Retain Central Specialist Orders</span>
                          </button>

                          <button
                            onClick={() => resolveConflict(activeSelectedConflict.id, 'last_write_wins')}
                            className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-xs"
                          >
                            <ArrowDownUp className="w-3.5 h-3.5" />
                            <span>Last-Write-Wins (Timestamp Winner)</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: LOCAL SYNC QUEUE LEDGER */}
      {activeTab === 'queue' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">
                Client-Side Mutation Buffer ({syncQueue.length} Active Records)
              </h3>
            </div>
            <span className="text-xs text-slate-500">
              Transactions queued in local persistent storage awaiting cloud network handshake
            </span>
          </div>

          {syncQueue.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
              <Cloud className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              <strong className="text-slate-800 text-sm block">Local Buffer Clean & Synchronized</strong>
              <p className="mt-1 text-slate-500">
                All patient entries, referrals, and diagnostic requisitions are fully committed to the central cloud.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Transaction ID</th>
                    <th className="py-2.5 px-3">Collection</th>
                    <th className="py-2.5 px-3">Record Details</th>
                    <th className="py-2.5 px-3">Created Offline At</th>
                    <th className="py-2.5 px-3">Retries</th>
                    <th className="py-2.5 px-3 text-right">Queue State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {syncQueue.map((item) => {
                    const label = item.data?.name || item.data?.patientName || item.data?.testName || item.id;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{item.id.slice(0, 16)}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold text-[10px]">
                            {item.collection}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-800 font-medium">
                          {label}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{new Date(item.createdOfflineAt).toLocaleTimeString()}</td>
                        <td className="py-2.5 px-3 text-slate-500">{item.retryCount || 0}</td>
                        <td className="py-2.5 px-3 text-right">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              item.status === 'conflict'
                                ? 'bg-rose-100 text-rose-800'
                                : item.status === 'syncing'
                                ? 'bg-indigo-100 text-indigo-800 animate-pulse'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
