import React, { useState } from 'react';
import {
  X,
  Activity,
  Pill,
  ArrowRightLeft,
  CloudOff,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Zap,
  ShieldCheck,
  Building2,
  Clock,
  User,
  HeartPulse,
  Truck,
  Plus,
  ArrowUpRight,
  Database,
} from 'lucide-react';
import { Facility, LongitudinalPatient, MedicineStockItem } from '../types';
import { useOfflineSync } from '../context/OfflineSyncContext';

interface FrontlineSubCentreDeskModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFacility: Facility;
  facilities: Facility[];
  patients: LongitudinalPatient[];
  medicines: MedicineStockItem[];
}

export const FrontlineSubCentreDeskModal: React.FC<FrontlineSubCentreDeskModalProps> = ({
  isOpen,
  onClose,
  currentFacility,
  facilities,
  patients,
  medicines,
}) => {
  const {
    networkMode,
    setNetworkMode,
    isOnline,
    syncQueue,
    queuedCount,
    isSyncing,
    lastSyncedTime,
    createTriageTicketOptimistic,
    updateMedicineStockLogOptimistic,
    issueReferralSlipOptimistic,
    triggerSyncNow,
    subCentreDeskTab,
    setSubCentreDeskTab,
  } = useOfflineSync();

  // Triage form state
  const [triagePatientId, setTriagePatientId] = useState<string>(patients[0]?.id || '');
  const [triageUrgency, setTriageUrgency] = useState<'Green' | 'Yellow' | 'Red'>('Yellow');
  const [triageComplaint, setTriageComplaint] = useState<string>('High continuous fever with chills and dehydration');
  const [triageSys, setTriageSys] = useState<number>(118);
  const [triageDia, setTriageDia] = useState<number>(76);
  const [triageHr, setTriageHr] = useState<number>(94);
  const [triageSpo2, setTriageSpo2] = useState<number>(97);
  const [triageTemp, setTriageTemp] = useState<number>(38.9);
  const [triageAction, setTriageAction] = useState<string>('ORS hydration initiated, oral Paracetamol administered');
  const [triageSuccessMsg, setTriageSuccessMsg] = useState<string | null>(null);

  // Stock Log form state
  const [stockMedId, setStockMedId] = useState<string>(medicines[0]?.id || 'med-1');
  const [stockChangeType, setStockChangeType] = useState<'dispense' | 'received' | 'wastage'>('dispense');
  const [stockQty, setStockQty] = useState<number>(20);
  const [stockReason, setStockReason] = useState<string>('Field ANC antenatal visit distribution');
  const [stockSuccessMsg, setStockSuccessMsg] = useState<string | null>(null);

  // Referral form state
  const [refPatientId, setRefPatientId] = useState<string>(patients[0]?.id || '');
  const [refDestFacilityId, setRefDestFacilityId] = useState<string>(
    facilities.find((f) => f.tier === 'phc' || f.tier === 'rural_hospital')?.id || facilities[1]?.id || ''
  );
  const [refUrgency, setRefUrgency] = useState<'routine' | 'urgent' | 'emergency'>('urgent');
  const [refClinicalReason, setRefClinicalReason] = useState<string>(
    'Persistent postpartum hemorrhage unresponsive to sub-centre oxytocic intervention'
  );
  const [refSpecialty, setRefSpecialty] = useState<string>('Obstetrics & Gynecology');
  const [refTransport, setRefTransport] = useState<'Ambulance 108' | 'Facility Vehicle' | 'Private/Public Transport'>(
    'Ambulance 108'
  );
  const [refSuccessMsg, setRefSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentPatientObj = patients.find((p) => p.id === triagePatientId) || patients[0];
  const refPatientObj = patients.find((p) => p.id === refPatientId) || patients[0];
  const selectedMed = medicines.find((m) => m.id === stockMedId) || medicines[0];
  const currentFacilityStock =
    selectedMed?.facilityStocks[currentFacility.id]?.quantity ??
    (Object.values(selectedMed?.facilityStocks || {}) as Array<{ quantity: number }>)[0]?.quantity ??
    100;

  // Handle Triage Ticket Submit
  const handleSubmitTriage = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createTriageTicketOptimistic({
      patientId: currentPatientObj.id,
      patientName: currentPatientObj.name,
      age: currentPatientObj.age,
      gender: currentPatientObj.gender,
      facilityId: currentFacility.id,
      facilityName: currentFacility.name,
      urgencyLevel: triageUrgency,
      chiefComplaint: triageComplaint,
      systolic: triageSys,
      diastolic: triageDia,
      heartRate: triageHr,
      spo2: triageSpo2,
      temperature: triageTemp,
      frontlineActions: triageAction ? [triageAction] : [],
    });

    if (res.success) {
      setTriageSuccessMsg(
        `Triage ticket ${res.id} queued optimistically! ${
          isOnline ? 'Synced to Firestore.' : 'Cached in Firestore offline store (persistentMultipleTabManager).'
        }`
      );
      setTimeout(() => setTriageSuccessMsg(null), 4500);
    }
  };

  // Handle Medicine Stock Log Submit
  const handleSubmitStock = async (e: React.FormEvent) => {
    e.preventDefault();
    const qtyChange = stockChangeType === 'received' ? stockQty : -stockQty;
    const resultingStock = Math.max(0, currentFacilityStock + qtyChange);

    const res = await updateMedicineStockLogOptimistic({
      facilityId: currentFacility.id,
      facilityName: currentFacility.name,
      medicineId: selectedMed.id,
      medicineName: selectedMed.drugName,
      changeType: stockChangeType,
      quantityChange: qtyChange,
      resultingStock,
      reason: stockReason,
      batchNumber: selectedMed.facilityStocks[currentFacility.id]?.batchNumber || 'BATCH-SUB-2026',
      loggedBy: 'Sister Priya Nair (ASHA/ANM)',
    });

    if (res.success) {
      setStockSuccessMsg(
        `Medicine stock log recorded optimistically! New local stock: ${resultingStock} units. ${
          isOnline ? 'Synced to Firestore.' : 'Cached locally.'
        }`
      );
      setTimeout(() => setStockSuccessMsg(null), 4500);
    }
  };

  // Handle Referral Slip Submit
  const handleSubmitReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    const destFacility = facilities.find((f) => f.id === refDestFacilityId) || facilities[1];

    const res = await issueReferralSlipOptimistic({
      patientId: refPatientObj.id,
      patientName: refPatientObj.name,
      patientAge: refPatientObj.age,
      originatingFacilityId: currentFacility.id,
      originatingFacilityName: currentFacility.name,
      destinationFacilityId: destFacility.id,
      destinationFacilityName: destFacility.name,
      urgency: refUrgency,
      clinicalReason: refClinicalReason,
      specialtyRequired: refSpecialty,
      transportMode: refTransport,
      referringClinician: 'ANM Staff Nurse (Sub-Centre Node)',
    });

    if (res.success) {
      setRefSuccessMsg(
        `Referral slip ${res.id} issued optimistically to ${destFacility.name}! ${
          isOnline ? 'Synced to Firestore.' : 'Stored in offline queue.'
        }`
      );
      setTimeout(() => setRefSuccessMsg(null), 4500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">
                  Frontline Sub-Centre Optimistic Offline Desk
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Firebase Offline Cache
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Operates without active internet • Instant zero-latency UI queues • Reconciles with server timestamps
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Connectivity Status Banner */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">Current Node:</span>
            <span className="font-bold text-slate-900 flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              {currentFacility.name} ({currentFacility.tier.replace('_', ' ').toUpperCase()})
            </span>
            <span className="text-slate-300">•</span>
            {/* Visual indicator badge */}
            {isOnline && queuedCount === 0 ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Synced (Online)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-300 font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span className="w-2 h-2 rounded-full bg-amber-500 -ml-3" />
                Working Offline ({queuedCount} change{queuedCount === 1 ? '' : 's'} queued)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">Mode Simulator:</span>
            <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-white">
              <button
                type="button"
                onClick={() => setNetworkMode('online')}
                className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                  networkMode === 'online' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Cloud className="w-3 h-3" />
                <span>Online</span>
              </button>
              <button
                type="button"
                onClick={() => setNetworkMode('offline')}
                className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                  networkMode === 'offline' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <CloudOff className="w-3 h-3" />
                <span>Offline (Field)</span>
              </button>
            </div>

            <button
              onClick={triggerSyncNow}
              disabled={isSyncing || !isOnline}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                queuedCount > 0 && isOnline
                  ? 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              } ${!isOnline || isSyncing ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
              title="Force sync pending queue to Firestore"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-200 bg-white px-5 pt-3 flex gap-2">
          <button
            onClick={() => setSubCentreDeskTab('triage')}
            className={`pb-2.5 px-3 font-bold text-xs flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              subCentreDeskTab === 'triage'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>1. Create Triage Ticket</span>
          </button>

          <button
            onClick={() => setSubCentreDeskTab('pharmacy')}
            className={`pb-2.5 px-3 font-bold text-xs flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              subCentreDeskTab === 'pharmacy'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Pill className="w-4 h-4" />
            <span>2. Update Medicine Stock Log</span>
          </button>

          <button
            onClick={() => setSubCentreDeskTab('referral')}
            className={`pb-2.5 px-3 font-bold text-xs flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              subCentreDeskTab === 'referral'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>3. Issue Referral Slip</span>
          </button>

          <button
            onClick={() => setSubCentreDeskTab('queue')}
            className={`ml-auto pb-2.5 px-3 font-bold text-xs flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              subCentreDeskTab === 'queue'
                ? 'border-amber-600 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Optimistic Queue ({queuedCount})</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* TAB 1: TRIAGE TICKET */}
          {subCentreDeskTab === 'triage' && (
            <form onSubmit={handleSubmitTriage} className="space-y-4 max-w-2xl mx-auto">
              {triageSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{triageSuccessMsg}</span>
                </div>
              )}

              <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
                <p className="font-semibold flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  Optimistic Sub-Centre Bedside Triage
                </p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Frontline health workers can record triage vitals instantly. Even in remote areas without 3G/4G,
                  records are immediately saved into the browser cache and synchronized when back in range.
                </p>
              </div>

              {/* Patient Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select Patient (or Walk-In)
                </label>
                <select
                  aria-label="Select Patient"
                  value={triagePatientId}
                  onChange={(e) => setTriagePatientId(e.target.value)}
                  className="w-full text-xs font-medium bg-white border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.gender}, {p.age}y) — ABHA: {p.nationalHealthId}
                    </option>
                  ))}
                </select>
              </div>

              {/* Urgency Level */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Clinical Urgency Level (IPHS Standard)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTriageUrgency('Green')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      triageUrgency === 'Green'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    Green (Routine / Mild)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTriageUrgency('Yellow')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      triageUrgency === 'Yellow'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                        : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    Yellow (Urgent / High Risk)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTriageUrgency('Red')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      triageUrgency === 'Red'
                        ? 'bg-rose-600 text-white border-rose-700 shadow-xs animate-pulse'
                        : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    Red (Emergency / Critical)
                  </button>
                </div>
              </div>

              {/* Chief Complaint */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chief Complaint & Bedside Assessment
                </label>
                <textarea
                  rows={2}
                  value={triageComplaint}
                  onChange={(e) => setTriageComplaint(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Describe reported symptoms and clinical presentation..."
                />
              </div>

              {/* Vitals Snapshot */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-xs font-bold text-slate-700 block mb-2">
                  Frontline Vitals Captured at Sub-Centre
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">BP Systolic</label>
                    <input
                      type="number"
                      value={triageSys}
                      onChange={(e) => setTriageSys(Number(e.target.value))}
                      className="w-full mt-0.5 p-1.5 bg-white border border-slate-300 rounded-lg font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">BP Diastolic</label>
                    <input
                      type="number"
                      value={triageDia}
                      onChange={(e) => setTriageDia(Number(e.target.value))}
                      className="w-full mt-0.5 p-1.5 bg-white border border-slate-300 rounded-lg font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">Pulse (bpm)</label>
                    <input
                      type="number"
                      value={triageHr}
                      onChange={(e) => setTriageHr(Number(e.target.value))}
                      className="w-full mt-0.5 p-1.5 bg-white border border-slate-300 rounded-lg font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">SpO2 (%)</label>
                    <input
                      type="number"
                      value={triageSpo2}
                      onChange={(e) => setTriageSpo2(Number(e.target.value))}
                      className="w-full mt-0.5 p-1.5 bg-white border border-slate-300 rounded-lg font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">Temp (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={triageTemp}
                      onChange={(e) => setTriageTemp(Number(e.target.value))}
                      className="w-full mt-0.5 p-1.5 bg-white border border-slate-300 rounded-lg font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Immediate Frontline Action */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Bedside Stabilization Given
                </label>
                <input
                  type="text"
                  value={triageAction}
                  onChange={(e) => setTriageAction(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. ORS sachet administered, lateral tilt position..."
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md cursor-pointer transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Queue Triage Ticket Optimistically</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: MEDICINE STOCK LOG */}
          {subCentreDeskTab === 'pharmacy' && (
            <form onSubmit={handleSubmitStock} className="space-y-4 max-w-2xl mx-auto">
              {stockSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{stockSuccessMsg}</span>
                </div>
              )}

              <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
                <p className="font-semibold flex items-center gap-1.5">
                  <Pill className="w-3.5 h-3.5 text-amber-600" />
                  Sub-Centre Drug Kit & Dispensary Offline Ledger
                </p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Record daily dispensations or stock arrivals from the block PHC. Inventory counts update
                  immediately, maintaining an immutable ledger synced via Firestore append-only delta logs.
                </p>
              </div>

              {/* Medicine Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select Essential Medicine / Drug Kit Item
                </label>
                <select
                  aria-label="Select Medicine"
                  value={stockMedId}
                  onChange={(e) => setStockMedId(e.target.value)}
                  className="w-full text-xs font-medium bg-white border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {medicines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.drugName} ({m.genericName} {m.strength}) • Form: {m.form}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Current Sub-Centre on-hand stock: <span className="font-bold text-indigo-700">{currentFacilityStock} units</span>
                </p>
              </div>

              {/* Action Type */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setStockChangeType('dispense')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    stockChangeType === 'dispense'
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Dispensed to Patient (-)
                </button>
                <button
                  type="button"
                  onClick={() => setStockChangeType('received')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    stockChangeType === 'received'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Received from PHC (+)
                </button>
                <button
                  type="button"
                  onClick={() => setStockChangeType('wastage')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    stockChangeType === 'wastage'
                      ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Expired / Wastage (-)
                </button>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Quantity ({stockChangeType === 'received' ? '+' : '-'} units)
                </label>
                <input
                  type="number"
                  min={1}
                  max={5000}
                  value={stockQty}
                  onChange={(e) => setStockQty(Math.max(1, Number(e.target.value)))}
                  className="w-full text-xs font-bold bg-white border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Clinical / Operational Reason
                </label>
                <input
                  type="text"
                  value={stockReason}
                  onChange={(e) => setStockReason(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. Village outreach fever clinic, ANC clinic distribution..."
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md cursor-pointer transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Record Stock Log Optimistically</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: ISSUE REFERRAL SLIP */}
          {subCentreDeskTab === 'referral' && (
            <form onSubmit={handleSubmitReferral} className="space-y-4 max-w-2xl mx-auto">
              {refSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{refSuccessMsg}</span>
                </div>
              )}

              <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
                <p className="font-semibold flex items-center gap-1.5">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600" />
                  Frontline Referral Escalation Slip
                </p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Generate digital ABDM referral slips at the Sub-Centre without waiting for network connectivity.
                  The receiving PHC or District Hospital will automatically receive the slip as soon as the terminal connects.
                </p>
              </div>

              {/* Patient */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Patient</label>
                <select
                  aria-label="Select Patient for Referral"
                  value={refPatientId}
                  onChange={(e) => setRefPatientId(e.target.value)}
                  className="w-full text-xs font-medium bg-white border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.gender}, {p.age}y) — {p.villageOrCity}
                    </option>
                  ))}
                </select>
              </div>

              {/* Destination Facility */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Escalation Destination Facility
                </label>
                <select
                  aria-label="Select Destination Facility"
                  value={refDestFacilityId}
                  onChange={(e) => setRefDestFacilityId(e.target.value)}
                  className="w-full text-xs font-medium bg-white border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {facilities
                    .filter((f) => f.id !== currentFacility.id)
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.tier.toUpperCase()}) — {f.district}, {f.state}
                      </option>
                    ))}
                </select>
              </div>

              {/* Urgency & Transport */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Urgency</label>
                  <select
                    aria-label="Select Urgency"
                    value={refUrgency}
                    onChange={(e) => setRefUrgency(e.target.value as any)}
                    className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="routine">Routine (Elective Consultation)</option>
                    <option value="urgent">Urgent (Within 6-12 Hours)</option>
                    <option value="emergency">Emergency (Immediate 108 Transfer)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Transport Mode</label>
                  <select
                    aria-label="Select Transport Mode"
                    value={refTransport}
                    onChange={(e) => setRefTransport(e.target.value as any)}
                    className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="Ambulance 108">Ambulance 108 (ALS / BLS)</option>
                    <option value="Facility Vehicle">Facility Vehicle</option>
                    <option value="Private/Public Transport">Private / Public Transport</option>
                  </select>
                </div>
              </div>

              {/* Specialty */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Specialty Required</label>
                <input
                  type="text"
                  value={refSpecialty}
                  onChange={(e) => setRefSpecialty(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. Obstetrics & Gynecology, General Surgery, Pediatrics..."
                />
              </div>

              {/* Clinical Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Clinical Indication & Notes</label>
                <textarea
                  rows={2}
                  value={refClinicalReason}
                  onChange={(e) => setRefClinicalReason(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md cursor-pointer transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Issue Referral Slip Optimistically</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: QUEUE INSPECTOR */}
          {subCentreDeskTab === 'queue' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Active Optimistic Mutations Queue ({queuedCount} pending)
                  </h4>
                  <p className="text-xs text-slate-500">
                    Transactions recorded offline with local UUIDs. Synchronized with server timestamps upon reconnect.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={triggerSyncNow}
                    disabled={isSyncing || !isOnline || queuedCount === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Synchronizing...' : 'Sync Pending to Firestore'}</span>
                  </button>
                </div>
              </div>

              {syncQueue.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">All Frontline Changes are Fully Synchronized</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    No pending offline records in the persistent cache. Last synced: {lastSyncedTime}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {syncQueue.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-indigo-700 uppercase text-[10px] bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                            {item.collection}
                          </span>
                          <span className="font-mono text-slate-500 text-[10px]">{item.id}</span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              item.status === 'syncing'
                                ? 'bg-indigo-100 text-indigo-800'
                                : item.status === 'failed'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {item.status.toUpperCase()}
                          </span>
                        </div>

                        <p className="text-slate-800 font-medium truncate">
                          {item.collection === 'triage_tickets' &&
                            `Triage: ${item.data?.patientName} (${item.data?.urgencyLevel}) - ${item.data?.chiefComplaint?.slice(0, 45)}...`}
                          {item.collection === 'medicine_stock_logs' &&
                            `Stock: ${item.data?.medicineName} (${item.data?.changeType} ${item.data?.quantityChange} units) -> ${item.data?.resultingStock} on-hand`}
                          {item.collection === 'referrals' &&
                            `Referral: ${item.data?.patientName} -> ${item.data?.destinationFacilityName || item.data?.destinationFacilityId} (${item.data?.urgency})`}
                          {item.collection !== 'triage_tickets' &&
                            item.collection !== 'medicine_stock_logs' &&
                            item.collection !== 'referrals' &&
                            JSON.stringify(item.data).slice(0, 60)}
                        </p>

                        <div className="flex items-center gap-3 text-[10px] text-slate-400">
                          <span>Created Offline: {new Date(item.createdOfflineAt).toLocaleTimeString()}</span>
                          <span>•</span>
                          <span>Reconciliation: serverTimestamp() on merge</span>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-1 rounded border border-amber-200">
                          IndexedDB Cached
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Multi-tab persistent cache active (`persistentMultipleTabManager`)</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold cursor-pointer"
          >
            Close Desk
          </button>
        </div>
      </div>
    </div>
  );
};
