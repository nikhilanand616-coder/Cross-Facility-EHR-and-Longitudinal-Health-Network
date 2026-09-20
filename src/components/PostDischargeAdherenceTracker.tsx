import React, { useState, useEffect } from 'react';
import {
  Heart,
  Pill,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  Wifi,
  WifiOff,
  User,
  MapPin,
  Phone,
  ShieldCheck,
  Calendar,
  Activity,
  AlertOctagon,
  RefreshCw,
  FileCheck,
  Stethoscope,
  ChevronRight,
  TrendingDown,
  Info,
} from 'lucide-react';
import {
  PostDischargeAdherenceRecord,
  AdherenceMedicationItem,
  AdherenceSymptomLog,
  DailyAdherenceCheckin,
} from '../types';
import { SupportedLanguage } from '../i18n/translations';

interface PostDischargeAdherenceTrackerProps {
  currentLanguage?: SupportedLanguage;
  onSelectPatientRecord?: (recordId: string) => void;
}

export const PostDischargeAdherenceTracker: React.FC<PostDischargeAdherenceTrackerProps> = () => {
  const [records, setRecords] = useState<PostDischargeAdherenceRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string>('adh-001');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [offlineQueue, setOfflineQueue] = useState<DailyAdherenceCheckin[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Active check-in form state
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [activeMeds, setActiveMeds] = useState<AdherenceMedicationItem[]>([]);
  const [systolic, setSystolic] = useState<number | ''>(136);
  const [diastolic, setDiastolic] = useState<number | ''>(84);
  const [bloodGlucose, setBloodGlucose] = useState<number | ''>(128);
  const [symptoms, setSymptoms] = useState<AdherenceSymptomLog>({
    chestPain: false,
    shortnessOfBreath: false,
    dizzinessOrFainting: false,
    pedalEdema: false,
    severeHeadache: false,
    symptomSeverity: 'none',
    additionalNotes: '',
  });

  // Background audit & SMS simulation state
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [lastAuditResult, setLastAuditResult] = useState<any | null>(null);

  // Load records from backend API with localStorage offline cache fallback
  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/chronic-adherence/records');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.records)) {
          setRecords(data.records);
          localStorage.setItem('chronic_adherence_records_cache', JSON.stringify(data.records));
          return;
        }
      }
      throw new Error('API unavailable');
    } catch (err) {
      console.warn('Backend unavailable, loading cached adherence records from localStorage');
      const cached = localStorage.getItem('chronic_adherence_records_cache');
      if (cached) {
        try {
          setRecords(JSON.parse(cached));
        } catch {
          // ignore
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    const savedQueue = localStorage.getItem('chronic_offline_checkin_queue');
    if (savedQueue) {
      try {
        setOfflineQueue(JSON.parse(savedQueue));
      } catch {
        // ignore
      }
    }
  }, []);

  const currentRecord = records.find((r) => r.id === selectedRecordId) || records[0];

  // Update check-in form whenever current record changes
  useEffect(() => {
    if (currentRecord) {
      setActiveMeds(
        currentRecord.prescribedRegimen.map((m) => ({
          ...m,
          taken: true,
          timeLogged: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        }))
      );
    }
  }, [currentRecord?.id]);

  // Toggle med taken status
  const handleToggleMed = (medId: string) => {
    setActiveMeds((prev) =>
      prev.map((m) => {
        if (m.id === medId) {
          const newTaken = !m.taken;
          return {
            ...m,
            taken: newTaken,
            timeLogged: newTaken
              ? new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
              : undefined,
            missedReason: newTaken ? undefined : m.missedReason || 'Forgot dosage',
          };
        }
        return m;
      })
    );
  };

  const handleMedMissedReason = (medId: string, reason: string) => {
    setActiveMeds((prev) =>
      prev.map((m) => (m.id === medId ? { ...m, missedReason: reason } : m))
    );
  };

  // Submit daily check-in
  const handleSaveCheckin = async () => {
    if (!currentRecord) return;

    setIsSyncing(true);
    const allTaken = activeMeds.every((m) => m.taken);

    const checkinEntry: DailyAdherenceCheckin = {
      date: selectedDate,
      checkinTimestamp: new Date().toISOString(),
      medications: activeMeds,
      symptoms: {
        ...symptoms,
        systolicBp: systolic !== '' ? Number(systolic) : undefined,
        diastolicBp: diastolic !== '' ? Number(diastolic) : undefined,
        bloodGlucoseMgDl: bloodGlucose !== '' ? Number(bloodGlucose) : undefined,
      },
      allMedsTaken: allTaken,
      offlineLogged: isOfflineMode,
      syncedToFirestore: !isOfflineMode,
    };

    if (isOfflineMode) {
      // Save strictly to local queue without network
      const updatedQueue = [...offlineQueue, checkinEntry];
      setOfflineQueue(updatedQueue);
      localStorage.setItem('chronic_offline_checkin_queue', JSON.stringify(updatedQueue));

      // Update local record copy
      const updatedRecord: PostDischargeAdherenceRecord = {
        ...currentRecord,
        checkinHistory: [...currentRecord.checkinHistory, checkinEntry],
        consecutiveMissedDays: 0,
        lastCheckinDate: selectedDate,
        alertEscalationStatus: currentRecord.alertEscalationStatus === 'escalated_to_asha' ? 'resolved' : 'normal',
        updatedAt: new Date().toISOString(),
      };

      setRecords((prev) => prev.map((r) => (r.id === updatedRecord.id ? updatedRecord : r)));
      setStatusMessage('Check-in saved offline. Will synchronize automatically when network is available.');
      setIsSyncing(false);
      setTimeout(() => setStatusMessage(null), 4000);
      return;
    }

    try {
      const res = await fetch('/api/chronic-adherence/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adherenceId: currentRecord.id,
          checkin: checkinEntry,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.record) {
          setRecords((prev) => prev.map((r) => (r.id === data.record.id ? data.record : r)));
          setStatusMessage('Daily adherence logged & synchronized with district EHR.');
        }
      } else {
        throw new Error('Sync failed');
      }
    } catch {
      // Fallback to offline
      const updatedQueue = [...offlineQueue, checkinEntry];
      setOfflineQueue(updatedQueue);
      localStorage.setItem('chronic_offline_checkin_queue', JSON.stringify(updatedQueue));
      setStatusMessage('Network timeout. Check-in saved to offline cache and queued for sync.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // Simulate missed consecutive days
  const handleSimulateMissedDays = async (days: number) => {
    if (!currentRecord) return;
    try {
      const res = await fetch('/api/chronic-adherence/simulate-missed-days', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adherenceId: currentRecord.id,
          consecutiveMissedDays: days,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.record) {
          setRecords((prev) => prev.map((r) => (r.id === data.record.id ? data.record : r)));
        }
      }
    } catch (err) {
      console.error('Failed to simulate missed days:', err);
    }
  };

  // Run automated adherence background audit (triggers SMS if missed >= 3)
  const handleRunBackgroundAudit = async () => {
    setIsAuditing(true);
    setLastAuditResult(null);
    try {
      const res = await fetch('/api/chronic-adherence/trigger-missed-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          simulatedDate: selectedDate,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setLastAuditResult(data.result);
          if (Array.isArray(data.records)) {
            setRecords(data.records);
          }
        }
      }
    } catch (err) {
      console.error('Audit execution error:', err);
    } finally {
      setIsAuditing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 bg-white rounded-2xl border border-slate-200">
        <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mr-3" />
        <span className="text-sm font-medium text-slate-700">Loading post-discharge chronic adherence registry...</span>
      </div>
    );
  }

  if (!currentRecord) {
    return (
      <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center">
        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-800">No active post-discharge adherence records found.</p>
      </div>
    );
  }

  const isEscalationTriggered =
    currentRecord.consecutiveMissedDays >= 3 || currentRecord.alertEscalationStatus === 'escalated_to_asha';

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-6 rounded-2xl border border-teal-800/40 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-teal-500/20 border border-teal-400/40 rounded-xl text-teal-300 shrink-0">
              <Heart className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight">
                  Post-Discharge Chronic Care & Frontline Escalation
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-200 border border-teal-400/30">
                  Firestore Continuous Surveillance
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  Offline-First Architecture
                </span>
              </div>
              <p className="text-xs text-teal-200/90 mt-1 max-w-3xl">
                Daily interactive medication and symptom compliance engine for high-risk chronic patients. Automatically
                escalates an SMS alert to the designated local frontline worker (ASHA / ANM) if 3 consecutive daily
                check-ins are missed, guaranteeing continuity of care without requiring persistent patient internet access.
              </p>
            </div>
          </div>

          {/* Offline Toggle & Sync Controls */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            <button
              onClick={() => setIsOfflineMode(!isOfflineMode)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                isOfflineMode
                  ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                  : 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
              }`}
              title="Toggle simulated rural Sub-Centre offline connectivity"
            >
              {isOfflineMode ? <WifiOff className="w-4 h-4 text-amber-400" /> : <Wifi className="w-4 h-4 text-emerald-400" />}
              <span>{isOfflineMode ? 'Sub-Centre Offline Mode' : 'Connected to Firestore'}</span>
            </button>

            <button
              onClick={handleRunBackgroundAudit}
              disabled={isAuditing}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin' : ''}`} />
              <span>Run Automated Adherence Audit</span>
            </button>
          </div>
        </div>

        {/* Status banner */}
        {statusMessage && (
          <div className="mt-4 p-3 bg-teal-900/60 border border-teal-500/40 rounded-xl text-xs text-teal-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-300" />
              <span>{statusMessage}</span>
            </div>
            {offlineQueue.length > 0 && (
              <span className="text-[11px] font-semibold bg-white/10 px-2 py-0.5 rounded">
                {offlineQueue.length} check-in(s) in local offline queue
              </span>
            )}
          </div>
        )}
      </div>

      {/* Patient Selector Tabs */}
      <div className="flex flex-wrap items-center gap-3">
        {records.map((r) => {
          const isSelected = r.id === currentRecord.id;
          const isCritical = r.consecutiveMissedDays >= 3;
          return (
            <button
              key={r.id}
              onClick={() => setSelectedRecordId(r.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? 'bg-white border-teal-600 shadow-md ring-2 ring-teal-500/20'
                  : 'bg-white/80 hover:bg-white border-slate-200 text-slate-700'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                  isCritical
                    ? 'bg-rose-100 text-rose-700 border border-rose-300'
                    : isSelected
                    ? 'bg-teal-100 text-teal-800 border border-teal-300'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {r.patientName.split(' ')[0][0]}
                {r.patientName.split(' ')[1]?.[0] || ''}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-900">{r.patientName}</span>
                  {isCritical ? (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-700 border border-rose-300">
                      MISSED {r.consecutiveMissedDays}d
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-100 text-emerald-700">
                      {r.overallAdherenceRatePercent}% adherence
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {r.village} • {r.chronicConditions[0]}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* CRITICAL SMS ESCALATION ALERT BANNER (If 3 consecutive days missed) */}
      {isEscalationTriggered && (
        <div className="bg-gradient-to-r from-rose-50 via-amber-50 to-rose-50 border-2 border-rose-500 rounded-2xl p-5 shadow-lg relative overflow-hidden animate-pulse-subtle">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-rose-600 text-white rounded-xl shadow-md shrink-0">
                <AlertOctagon className="w-7 h-7" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase bg-rose-600 text-white tracking-wider">
                    CRITICAL SMS ESCALATION TRIGGERED
                  </span>
                  <span className="text-xs font-bold text-rose-800">
                    {currentRecord.consecutiveMissedDays} Consecutive Missed Daily Check-Ins
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mt-1">
                  Immediate Frontline Intervention Required for {currentRecord.patientName} ({currentRecord.abhaAddress})
                </h3>
                <p className="text-xs text-slate-700 mt-1 max-w-3xl">
                  Automated background adherence daemon detected zero check-in logs for 3 consecutive days post-discharge
                  from {currentRecord.dischargingFacilityName}. An urgent DLT-compliant SMS alert has been dispatched to the
                  designated frontline ASHA worker to conduct an immediate home visit.
                </p>
              </div>
            </div>

            {/* Designated Frontline Contact Card */}
            <div className="bg-white/90 backdrop-blur-xs p-3.5 rounded-xl border border-rose-200 shadow-xs shrink-0 w-full md:w-auto">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Designated Local Frontline Worker
              </span>
              <div className="flex items-center gap-2.5 mt-1.5">
                <div className="p-2 bg-teal-50 text-teal-700 rounded-lg">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    {currentRecord.assignedFrontlineWorker.workerRole} {currentRecord.assignedFrontlineWorker.workerName}
                  </div>
                  <div className="text-[11px] text-teal-800 font-mono font-semibold flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3 text-teal-600" />
                    {currentRecord.assignedFrontlineWorker.phone}
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-slate-600 mt-2 pt-2 border-t border-slate-100 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span>{currentRecord.assignedFrontlineWorker.assignedFacilityName}</span>
              </div>
            </div>
          </div>

          {/* Real Dispatched SMS Message Preview */}
          <div className="mt-4 p-3.5 bg-rose-900 text-white rounded-xl text-xs font-mono border border-rose-700">
            <div className="flex items-center justify-between text-[10px] text-rose-300 mb-1 font-sans">
              <span className="font-bold flex items-center gap-1.5">
                <Send className="w-3 h-3 text-rose-400" />
                DISPATCHED SMS TO {currentRecord.assignedFrontlineWorker.phone} (FAST2SMS / TWILIO PROXY)
              </span>
              <span>{currentRecord.lastEscalationSentAt ? new Date(currentRecord.lastEscalationSentAt).toLocaleTimeString() : 'Auto-Dispatched Today'}</span>
            </div>
            <p className="text-rose-100 leading-relaxed">
              &quot;[NHM-EHR ALERT] Urgent: Patient {currentRecord.patientName} ({currentRecord.abhaAddress}, {currentRecord.village}) has MISSED 3 CONSECUTIVE DAILY CHECK-INS for {currentRecord.chronicConditions.join(' &amp; ')} post-discharge from {currentRecord.dischargingFacilityName}. Risk: Acute rebound crisis / unmonitored relapse. {currentRecord.assignedFrontlineWorker.workerRole} {currentRecord.assignedFrontlineWorker.workerName}, please conduct an in-person field visit today with BP monitor, glucometer &amp; EDL replenishment kit. Protocol: {currentRecord.emergencyActionProtocol}&quot;
            </p>
          </div>
        </div>
      )}

      {/* Main Grid: Patient Profile & Daily Interactive Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Patient Demographics & Regimen Specs */}
        <div className="lg:col-span-4 space-y-6">
          {/* Patient Overview Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  {currentRecord.riskTier.toUpperCase()} RISK CHRONIC COHORT
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-1.5">{currentRecord.patientName}</h2>
                <span className="text-xs font-mono text-slate-500">{currentRecord.abhaAddress}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Adherence</span>
                <div className="text-xl font-black text-slate-900 mt-0.5">
                  {currentRecord.overallAdherenceRatePercent}%
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-3 border-t border-slate-100">
              <div>
                <span className="text-[10px] text-slate-400 uppercase">Age & Gender</span>
                <p className="font-semibold text-slate-800">{currentRecord.age} yrs • {currentRecord.gender}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase">Discharge Date</span>
                <p className="font-semibold text-slate-800">{currentRecord.dischargeDate}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase">Village / Ward</span>
                <p className="font-semibold text-slate-800">{currentRecord.village}, {currentRecord.district}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase">Discharging Hub</span>
                <p className="font-semibold text-slate-800 truncate" title={currentRecord.dischargingFacilityName}>
                  {currentRecord.dischargingFacilityName}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1.5">
                Diagnosed Chronic Conditions
              </span>
              <div className="flex flex-wrap gap-1.5">
                {currentRecord.chronicConditions.map((cond, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200"
                  >
                    {cond}
                  </span>
                ))}
              </div>
            </div>

            {/* Frontline Worker Assigned */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Designated ASHA / ANM</span>
                <span className="text-[10px] font-bold text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded">
                  {currentRecord.assignedFrontlineWorker.workerRole}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-900">{currentRecord.assignedFrontlineWorker.workerName}</p>
              <div className="flex items-center gap-2 text-xs text-slate-600 font-mono">
                <Phone className="w-3.5 h-3.5 text-teal-600" />
                <span>{currentRecord.assignedFrontlineWorker.phone}</span>
              </div>
              <p className="text-[10px] text-slate-500">
                Facility: {currentRecord.assignedFrontlineWorker.assignedFacilityName}
              </p>
            </div>

            {/* Emergency Action Protocol */}
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1">
              <div className="flex items-center gap-1.5 text-amber-900 font-bold text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                <span>Frontline Emergency Action Protocol</span>
              </div>
              <p className="text-[11px] text-amber-900/90 leading-relaxed">
                {currentRecord.emergencyActionProtocol}
              </p>
            </div>

            {/* Interactive Missed-Days Simulation Controller */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800">Test Background SMS Trigger</span>
                <span className="text-[10px] text-slate-500">Simulate missed check-ins</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[0, 1, 2, 3].map((d) => (
                  <button
                    key={d}
                    onClick={() => handleSimulateMissedDays(d)}
                    className={`py-2 px-1 rounded-lg text-xs font-bold border transition-all cursor-pointer text-center ${
                      currentRecord.consecutiveMissedDays === d
                        ? d >= 3
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : 'bg-teal-600 text-white border-teal-600 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {d === 0 ? '0 Days' : `${d} ${d === 1 ? 'Day' : 'Days'}`}
                    {d === 3 && ' 🚨'}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                Clicking <strong>3 Days 🚨</strong> triggers the automated background escalation logic, generating an SMS
                dispatch record for {currentRecord.assignedFrontlineWorker.workerName}.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Daily Interactive Checklist for Medications & Symptoms */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            {/* Checklist Title & Date Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Pill className="w-5 h-5 text-teal-600" />
                  Daily Interactive Adherence Checklist
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Log today&apos;s medication intake and vital symptoms. Offline-safe: works without internet.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* 1. Medication Checklist Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-teal-600" />
                  1. Prescribed Medication Regimen
                </span>
                <span className="text-xs text-slate-500">
                  {activeMeds.filter((m) => m.taken).length} of {activeMeds.length} Taken
                </span>
              </div>

              <div className="space-y-2.5">
                {activeMeds.map((med) => {
                  return (
                    <div
                      key={med.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        med.taken
                          ? 'bg-teal-50/40 border-teal-200'
                          : 'bg-rose-50/40 border-rose-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={med.taken}
                            onChange={() => handleToggleMed(med.id)}
                            className="w-5 h-5 mt-0.5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer accent-teal-600"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-900">{med.drugName}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                                {med.dosage}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white border border-slate-200 text-slate-600">
                                {med.timing.toUpperCase()}
                              </span>
                            </div>
                            {med.instructions && (
                              <p className="text-xs text-slate-600 mt-1">{med.instructions}</p>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {med.taken ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Taken {med.timeLogged || 'On time'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded-full">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Missed Dose
                            </span>
                          )}
                        </div>
                      </div>

                      {/* If missed, ask for clinical reason */}
                      {!med.taken && (
                        <div className="mt-2.5 pt-2 border-t border-rose-200/60 flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
                          <span className="text-rose-800 font-semibold text-[11px] shrink-0">Reason for miss:</span>
                          <select
                            value={med.missedReason || ''}
                            onChange={(e) => handleMedMissedReason(med.id, e.target.value)}
                            className="px-2 py-1 text-xs bg-white border border-rose-300 rounded text-slate-700 focus:outline-none focus:ring-1 focus:ring-rose-500"
                          >
                            <option value="Forgot dosage">Forgot dosage</option>
                            <option value="Out of stock / need ASHA replenishment">Out of stock / need ASHA replenishment</option>
                            <option value="Felt nauseous / adverse side-effect">Felt nauseous / adverse side-effect</option>
                            <option value="Felt better and skipped">Felt better and skipped</option>
                            <option value="Financial difficulty">Financial difficulty</option>
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Symptom & Vitals Daily Logging */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-teal-600" />
                2. Daily Vital Signs & Symptom Screening
              </span>

              {/* Numerical vitals inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Systolic BP (mmHg)</label>
                  <input
                    type="number"
                    value={systolic}
                    onChange={(e) => setSystolic(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 130"
                    className="w-full mt-1 px-3 py-1.5 text-sm font-bold bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Normal: &lt; 120, Warning: &gt; 140</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Diastolic BP (mmHg)</label>
                  <input
                    type="number"
                    value={diastolic}
                    onChange={(e) => setDiastolic(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 80"
                    className="w-full mt-1 px-3 py-1.5 text-sm font-bold bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Normal: &lt; 80, Warning: &gt; 90</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Blood Glucose (mg/dL)</label>
                  <input
                    type="number"
                    value={bloodGlucose}
                    onChange={(e) => setBloodGlucose(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 120"
                    className="w-full mt-1 px-3 py-1.5 text-sm font-bold bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Fasting: 70-100, PP: &lt; 140</span>
                </div>
              </div>

              {/* Warning Sign Checkboxes */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 block">
                  Check if any of these high-risk warning symptoms are present today:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={symptoms.chestPain}
                      onChange={(e) => setSymptoms({ ...symptoms, chestPain: e.target.checked })}
                      className="rounded text-teal-600 focus:ring-teal-500 accent-teal-600"
                    />
                    <span>Chest tightness, pressure or angina</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={symptoms.shortnessOfBreath}
                      onChange={(e) => setSymptoms({ ...symptoms, shortnessOfBreath: e.target.checked })}
                      className="rounded text-teal-600 focus:ring-teal-500 accent-teal-600"
                    />
                    <span>Shortness of breath / dyspnea</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={symptoms.dizzinessOrFainting}
                      onChange={(e) => setSymptoms({ ...symptoms, dizzinessOrFainting: e.target.checked })}
                      className="rounded text-teal-600 focus:ring-teal-500 accent-teal-600"
                    />
                    <span>Dizziness, fainting or syncope</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={symptoms.pedalEdema}
                      onChange={(e) => setSymptoms({ ...symptoms, pedalEdema: e.target.checked })}
                      className="rounded text-teal-600 focus:ring-teal-500 accent-teal-600"
                    />
                    <span>Swelling in feet or ankles (pedal edema)</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={symptoms.severeHeadache}
                      onChange={(e) => setSymptoms({ ...symptoms, severeHeadache: e.target.checked })}
                      className="rounded text-teal-600 focus:ring-teal-500 accent-teal-600"
                    />
                    <span>Severe morning headache or blurred vision</span>
                  </label>
                </div>
              </div>

              {/* Symptom Severity Toggle */}
              <div className="flex items-center gap-2 pt-2">
                <span className="text-xs font-semibold text-slate-700">Overall Severity:</span>
                {(['none', 'mild', 'moderate', 'severe'] as const).map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setSymptoms({ ...symptoms, symptomSeverity: sev })}
                    className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                      symptoms.symptomSeverity === sev
                        ? sev === 'severe'
                          ? 'bg-rose-600 text-white'
                          : sev === 'moderate'
                          ? 'bg-amber-600 text-white'
                          : 'bg-teal-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <span>Zero continuous internet required. Updates local storage & syncs automatically.</span>
              </div>

              <button
                onClick={handleSaveCheckin}
                disabled={isSyncing}
                className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Synchronizing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save Daily Adherence Check-In</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Adherence Check-in History Timeline */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              Recent Daily Adherence History & Audit Trail
            </h4>

            {currentRecord.checkinHistory.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-xl text-xs text-slate-500 text-center">
                No past check-ins logged for this post-discharge cycle.
              </div>
            ) : (
              <div className="space-y-2">
                {currentRecord.checkinHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg border border-slate-200 text-teal-700 font-bold font-mono">
                        {item.date}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">
                          {item.allMedsTaken ? 'All Medications Taken' : 'Doses Missed / Partial Intake'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          BP: {item.symptoms.systolicBp || '-'}/{item.symptoms.diastolicBp || '-'} mmHg • Glucose:{' '}
                          {item.symptoms.bloodGlucoseMgDl || '-'} mg/dL • Symptoms: {item.symptoms.symptomSeverity}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.offlineLogged ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          Offline Synced
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800">
                          Direct Firestore
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
