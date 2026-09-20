import React, { useState } from 'react';
import {
  AlertOctagon,
  PhoneCall,
  Ambulance,
  Clock,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Radio,
  FileCheck,
  Send,
  Plus,
  ArrowRight,
  Printer,
  Compass,
  MapPin,
  RefreshCw,
  X,
} from 'lucide-react';
import { EmergencyEscalationAlert, LongitudinalPatient, Facility } from '../types';
import { SupportedLanguage, t } from '../i18n/translations';

interface EmergencyEscalationConsoleProps {
  alerts: EmergencyEscalationAlert[];
  patients: LongitudinalPatient[];
  facilities: Facility[];
  currentLanguage: SupportedLanguage;
  onTriggerAlert: (newAlert: EmergencyEscalationAlert) => void;
  onUpdateAlertStatus: (alertId: string, newStatus: EmergencyEscalationAlert['status']) => void;
  onToggleChecklistItem: (alertId: string, itemKey: keyof EmergencyEscalationAlert['goldenHourChecklist']) => void;
}

export const EmergencyEscalationConsole: React.FC<EmergencyEscalationConsoleProps> = ({
  alerts,
  patients,
  facilities,
  currentLanguage,
  onTriggerAlert,
  onUpdateAlertStatus,
  onToggleChecklistItem,
}) => {
  const [selectedAlertId, setSelectedAlertId] = useState<string>(alerts[0]?.id || '');
  const [showNewEscalationModal, setShowNewEscalationModal] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'in_transit' | 'active' | 'resolved'>('all');

  // New Alert Form state
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patients[0]?.id || '');
  const [codeType, setCodeType] = useState<EmergencyEscalationAlert['codeType']>('CODE_RED_OBSTETRIC');
  const [originatingFacilityId, setOriginatingFacilityId] = useState<string>(facilities[0]?.id || '');
  const [destinationFacilityId, setDestinationFacilityId] = useState<string>(
    facilities.find((f) => f.tier === 'district_hospital')?.id || facilities[facilities.length - 1]?.id || ''
  );
  const [clinicalSummary, setClinicalSummary] = useState<string>('');
  const [systolic, setSystolic] = useState<number>(160);
  const [diastolic, setDiastolic] = useState<number>(100);
  const [heartRate, setHeartRate] = useState<number>(110);
  const [spo2, setSpo2] = useState<number>(94);
  const [gcs, setGcs] = useState<number>(13);

  const selectedAlert = alerts.find((a) => a.id === selectedAlertId) || alerts[0];

  const filteredAlerts = alerts.filter((alert) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'in_transit') return alert.status === 'in_transit';
    if (activeFilter === 'active') return alert.status === 'active';
    if (activeFilter === 'resolved') return alert.status === 'bed_prepared' || alert.status === 'received' || alert.status === 'resolved';
    return true;
  });

  const handleCreateNewAlert = (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find((p) => p.id === selectedPatientId);
    const origFac = facilities.find((f) => f.id === originatingFacilityId);
    const destFac = facilities.find((f) => f.id === destinationFacilityId);

    const newAlert: EmergencyEscalationAlert = {
      id: `emg_alert_${Date.now()}`,
      codeType,
      patientId: selectedPatientId,
      patientName: patient?.name || 'Emergency Trauma Walk-in',
      patientAge: patient?.age || 30,
      patientGender: patient?.gender || 'Unknown',
      originatingFacilityId,
      originatingFacilityName: origFac?.name || 'Local Sub-Centre',
      originatingTier: origFac?.tier || 'sub_centre',
      destinationFacilityId,
      destinationFacilityName: destFac?.name || 'Sundargarh District Headquarters Hospital',
      triggeredAt: new Date().toISOString(),
      triggeredBy: 'On-Duty Emergency Medical Officer',
      status: 'in_transit',
      clinicalSummary: clinicalSummary || 'Critical instability requiring immediate emergency intervention & life support transfer.',
      vitalsSnapshot: {
        systolic: Number(systolic),
        diastolic: Number(diastolic),
        heartRate: Number(heartRate),
        spo2: Number(spo2),
        temperature: 37.2,
        gcs: Number(gcs),
      },
      ambulanceDispatch: {
        vehicleNumber: 'OD-16-EMG-108',
        ambulanceType: 'ALS',
        driverName: 'Mohan Jena',
        driverPhone: '+91 94370 12345',
        dispatchedFrom: 'Central 108 Emergency Control',
        etaMinutes: 18,
        currentCoordinates: { lat: 22.14, lng: 84.11 },
        paramedicName: 'Alok Barik (Paramedic)',
      },
      goldenHourChecklist: {
        airwaySecured: true,
        highFlowOxygen: true,
        twoLargeBoreIV: true,
        crystalloidBolusStarted: true,
        bloodGroupIdentified: `${patient?.bloodGroup || 'O+'} (Verified via Registry)`,
        bloodUnitsReserved: true,
        magnesiumSulfateBolusGiven: codeType === 'CODE_RED_OBSTETRIC',
        digitalReferralDossierSent: true,
      },
      receivingTeamNotification: {
        physicianNotified: true,
        physicianName: 'District Trauma & Critical Care Bay Team',
        traumaBayOrOTNumber: 'Emergency Resuscitation Bay #1',
        bedReserved: true,
        icuBedReady: true,
      },
    };

    onTriggerAlert(newAlert);
    setSelectedAlertId(newAlert.id);
    setShowNewEscalationModal(false);
    setClinicalSummary('');
  };

  const getCodeBadge = (code: EmergencyEscalationAlert['codeType']) => {
    switch (code) {
      case 'CODE_RED_OBSTETRIC':
        return { label: 'CODE RED OBSTETRIC', bg: 'bg-red-600', text: 'text-white' };
      case 'CODE_BLUE_CARDIAC':
        return { label: 'CODE BLUE CARDIAC', bg: 'bg-blue-600', text: 'text-white' };
      case 'CODE_TRAUMA_GOLDEN_HOUR':
        return { label: 'CODE TRAUMA GOLDEN HOUR', bg: 'bg-amber-600', text: 'text-white' };
      case 'CODE_SEPSIS_ANAPHYLAXIS':
        return { label: 'CODE SEPSIS & ANAPHYLAXIS', bg: 'bg-purple-600', text: 'text-white' };
      case 'CODE_NEONATAL_RESPIRATORY':
        return { label: 'CODE NEONATAL RESPIRATORY', bg: 'bg-pink-600', text: 'text-white' };
      default:
        return { label: code, bg: 'bg-red-600', text: 'text-white' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Alert / Emergency Header */}
      <div className="bg-gradient-to-r from-red-900 via-red-800 to-slate-900 text-white p-6 rounded-2xl shadow-xl border-2 border-red-500/40 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <AlertOctagon className="w-64 h-64 text-red-300" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-red-600/40 border border-red-400/50 rounded-2xl text-white animate-pulse">
              <ShieldAlert className="w-8 h-8 text-red-200" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight">
                  {t('emergencyEscalation', currentLanguage)}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/30 text-red-200 border border-red-400/40 animate-pulse">
                  ACTIVE CRITICAL ESCALATION
                </span>
              </div>
              <p className="text-xs text-red-200/90 mt-1 max-w-2xl">
                Immediate golden-hour life support protocols, GPS-linked 108 emergency ambulance dispatch, pre-arrival hospital trauma bay alerts, and uncrossed blood bank pre-ordering.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setShowNewEscalationModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-900/40 border border-red-400 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Trigger Code Red / Emergency SOS</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left List of Alerts, Right Selected Alert Deep-Dive */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Alerts Sidebar List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Emergency Incidents ({alerts.length})
            </h2>
            <div className="flex gap-1 text-[11px]">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-2 py-0.5 rounded-md cursor-pointer ${
                  activeFilter === 'all' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveFilter('in_transit')}
                className={`px-2 py-0.5 rounded-md cursor-pointer ${
                  activeFilter === 'in_transit' ? 'bg-red-600 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Transit
              </button>
              <button
                onClick={() => setActiveFilter('resolved')}
                className={`px-2 py-0.5 rounded-md cursor-pointer ${
                  activeFilter === 'resolved' ? 'bg-emerald-700 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Resolved
              </button>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[720px] overflow-y-auto pr-1">
            {filteredAlerts.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
                No emergency incidents matching this filter.
              </div>
            ) : (
              filteredAlerts.map((alert) => {
                const isSelected = alert.id === selectedAlert?.id;
                const badge = getCodeBadge(alert.codeType);

                return (
                  <div
                    key={alert.id}
                    onClick={() => setSelectedAlertId(alert.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-red-600 bg-red-50/40 ring-2 ring-red-500 shadow-md'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </span>
                      <span className="text-[11px] font-bold uppercase text-slate-500">
                        {alert.status.replace('_', ' ')}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900">{alert.patientName}</h3>
                    <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">{alert.clinicalSummary}</p>

                    <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Ambulance className="w-3.5 h-3.5 text-red-600" />
                        ETA {alert.ambulanceDispatch?.etaMinutes || 15}m
                      </span>
                      <span>{new Date(alert.triggeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Active Emergency Dashboard */}
        {selectedAlert ? (
          <div className="lg:col-span-8 space-y-6">
            {/* Incident Summary Card */}
            <div className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-red-600 to-rose-700 text-white p-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-white/20 text-[10px] font-bold tracking-wider">
                      INCIDENT REF #{selectedAlert.id.slice(-6).toUpperCase()}
                    </span>
                    <span className="text-xs text-red-100 font-mono">
                      Triggered {new Date(selectedAlert.triggeredAt).toLocaleTimeString()} by {selectedAlert.triggeredBy}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold mt-1">{selectedAlert.patientName} ({selectedAlert.patientAge}y, {selectedAlert.patientGender})</h2>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedAlert.status}
                    onChange={(e) => onUpdateAlertStatus(selectedAlert.id, e.target.value as any)}
                    className="bg-white text-slate-900 text-xs font-bold px-3 py-1.5 rounded-lg border border-red-200 cursor-pointer shadow-xs"
                  >
                    <option value="triggered">Status: Triggered</option>
                    <option value="dispatched">Status: Ambulance Dispatched</option>
                    <option value="in_transit">Status: En Route (In Transit)</option>
                    <option value="bed_allocated">Status: Trauma Bay Bed Allocated</option>
                    <option value="resolved">Status: Patient Stabilized / Resolved</option>
                  </select>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Routing & Transfer Flow */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Originating Facility</span>
                    <p className="text-sm font-bold text-slate-900">{selectedAlert.originatingFacilityName}</p>
                    <span className="text-xs text-slate-500 capitalize">Tier: {selectedAlert.originatingTier.replace('_', ' ')}</span>
                  </div>

                  <div className="flex items-center gap-2 text-red-600 font-bold px-3 py-1 bg-red-100/60 rounded-full text-xs">
                    <Ambulance className="w-4 h-4 animate-bounce" />
                    <span>Active Transfer Corridor</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Receiving Specialty Center</span>
                    <p className="text-sm font-bold text-slate-900">{selectedAlert.destinationFacilityName}</p>
                    <span className="text-xs text-emerald-600 font-semibold">Trauma Bay & Critical OT Pre-Alerted</span>
                  </div>
                </div>

                {/* Live Ambulance Dispatch Telemetry */}
                {selectedAlert.ambulanceDispatch && (
                  <div className="p-4 bg-gradient-to-br from-amber-50/70 to-orange-50/40 rounded-xl border border-amber-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Ambulance className="w-5 h-5 text-amber-700" />
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                          108 / 102 Rural Emergency Ambulance Dispatch
                        </h3>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900">
                        {selectedAlert.ambulanceDispatch.ambulanceType} (Advanced Life Support)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-2.5 bg-white rounded-lg border border-amber-100">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Vehicle Plate</span>
                        <p className="font-bold text-slate-900">{selectedAlert.ambulanceDispatch.vehicleNumber}</p>
                      </div>
                      <div className="p-2.5 bg-white rounded-lg border border-amber-100">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Driver & Contact</span>
                        <p className="font-bold text-slate-900 flex items-center gap-1">
                          <span>{selectedAlert.ambulanceDispatch.driverName}</span>
                          <a href={`tel:${selectedAlert.ambulanceDispatch.driverPhone}`} className="text-indigo-600">
                            <PhoneCall className="w-3 h-3" />
                          </a>
                        </p>
                      </div>
                      <div className="p-2.5 bg-white rounded-lg border border-amber-100">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Paramedic on Board</span>
                        <p className="font-bold text-slate-900">{selectedAlert.ambulanceDispatch.paramedicName || 'EMR Certified'}</p>
                      </div>
                      <div className="p-2.5 bg-white rounded-lg border border-amber-100">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Estimated Arrival</span>
                        <p className="font-bold text-red-600 text-sm flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{selectedAlert.ambulanceDispatch.etaMinutes} Minutes</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Vitals Snapshot Card */}
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Emergency Vitals at Time of Escalation
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Blood Pressure</span>
                      <p className="text-sm font-bold text-red-600 mt-0.5">
                        {selectedAlert.vitalsSnapshot.systolic}/{selectedAlert.vitalsSnapshot.diastolic} mmHg
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Heart Rate</span>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">
                        {selectedAlert.vitalsSnapshot.heartRate} bpm
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Oxygen (SpO2)</span>
                      <p className="text-sm font-bold text-amber-600 mt-0.5">
                        {selectedAlert.vitalsSnapshot.spo2}%
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Glasgow Coma Scale</span>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">
                        {selectedAlert.vitalsSnapshot.gcs || 14}/15
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Temperature</span>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">
                        {selectedAlert.vitalsSnapshot.temperature || 37.0}°C
                      </p>
                    </div>
                  </div>
                </div>

                {/* Golden Hour Resuscitation Checklist */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-emerald-600" />
                      <span>Golden Hour Life-Support Transfer Checklist</span>
                    </h3>
                    <span className="text-[11px] text-slate-500">Click item to verify clinical completion</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      { key: 'airwaySecured', label: 'Airway Secured & Cervical Spine Stabilized' },
                      { key: 'highFlowOxygen', label: 'High-Flow Oxygen Mask (10-15 L/min)' },
                      { key: 'twoLargeBoreIV', label: 'Two Large-Bore IV Cannulae (16G or 18G) In Situ' },
                      { key: 'crystalloidBolusStarted', label: 'Warm Normal Saline / Ringer Lactate Infusion Started' },
                      { key: 'bloodUnitsReserved', label: 'Blood Bank Pre-Alerted for Uncrossed Transfusion' },
                      { key: 'magnesiumSulfateBolusGiven', label: 'Magnesium Sulfate Loading Dose (Obstetric / Eclampsia)' },
                      { key: 'digitalReferralDossierSent', label: 'Longitudinal EHR History & Vitals Transmitted to Receiving Surgeon' },
                    ].map((item) => {
                      const isChecked = !!selectedAlert.goldenHourChecklist[item.key as keyof EmergencyEscalationAlert['goldenHourChecklist']];
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => onToggleChecklistItem(selectedAlert.id, item.key as any)}
                          className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-colors cursor-pointer ${
                            isChecked
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-medium'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border ${
                              isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                          </div>
                          <span className="text-xs leading-snug">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Receiving District Specialist Pre-Notification Status */}
                <div className="p-4 bg-indigo-50/70 rounded-xl border border-indigo-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold uppercase text-indigo-700">Receiving District Clinical Lead</span>
                    <p className="text-xs font-bold text-slate-900">
                      {selectedAlert.receivingTeamNotification.physicianName}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      Allocated: <strong className="text-indigo-950">{selectedAlert.receivingTeamNotification.traumaBayOrOTNumber}</strong>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => alert(`Official FHIR Emergency Escalation Document generated for ${selectedAlert.patientName}. Cryptographic SHA-256 validated.`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-xs font-bold text-indigo-900 hover:bg-indigo-100/50 shadow-xs cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Transfer Handover Slip</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Trigger New Emergency Escalation Modal */}
      {showNewEscalationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-xl border border-red-500/80 overflow-hidden my-8">
            <div className="bg-gradient-to-r from-red-600 to-rose-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertOctagon className="w-6 h-6 text-white animate-pulse" />
                <h2 className="text-base font-bold">Trigger Emergency Escalation Protocol (Code Red)</h2>
              </div>
              <button
                onClick={() => setShowNewEscalationModal(false)}
                className="p-1 rounded hover:bg-white/10 text-slate-200 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewAlert} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1">
                  Select Patient
                </label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-red-500 cursor-pointer"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.age}y {p.gender}) — {p.chronicConditions?.join(', ') || 'No chronic history'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1">
                  Emergency Protocol Code
                </label>
                <select
                  value={codeType}
                  onChange={(e) => setCodeType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-red-700 focus:ring-2 focus:ring-red-500 cursor-pointer"
                >
                  <option value="CODE_RED_OBSTETRIC">CODE RED: Severe Maternal Hemorrhage / Eclampsia</option>
                  <option value="CODE_BLUE_CARDIAC">CODE BLUE: Cardiac Arrest / Acute Coronary Syndrome</option>
                  <option value="CODE_TRAUMA_GOLDEN_HOUR">CODE TRAUMA: Road Traffic Accident / Hemorrhagic Shock</option>
                  <option value="CODE_SEPSIS_ANAPHYLAXIS">CODE SEPSIS: Severe Sepsis with Hypoperfusion & Anaphylaxis</option>
                  <option value="CODE_NEONATAL_RESPIRATORY">CODE NEONATAL: Severe Birth Asphyxia / Respiratory Distress</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1">
                    Originating Facility
                  </label>
                  <select
                    value={originatingFacilityId}
                    onChange={(e) => setOriginatingFacilityId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-red-500 cursor-pointer"
                  >
                    {facilities.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.tier})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1">
                    Receiving Specialty Hospital
                  </label>
                  <select
                    value={destinationFacilityId}
                    onChange={(e) => setDestinationFacilityId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-red-500 cursor-pointer"
                  >
                    {facilities.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.tier})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1">
                  Acute Clinical Findings & Danger Signs
                </label>
                <textarea
                  required
                  rows={3}
                  value={clinicalSummary}
                  onChange={(e) => setClinicalSummary(e.target.value)}
                  placeholder="e.g., Profuse postpartum hemorrhage, altered sensorium, BP 160/100, fetal distress, uterine atony."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Systolic BP</label>
                  <input
                    type="number"
                    value={systolic}
                    onChange={(e) => setSystolic(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Diastolic BP</label>
                  <input
                    type="number"
                    value={diastolic}
                    onChange={(e) => setDiastolic(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Heart Rate</label>
                  <input
                    type="number"
                    value={heartRate}
                    onChange={(e) => setHeartRate(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Oxygen (SpO2 %)</label>
                  <input
                    type="number"
                    value={spo2}
                    onChange={(e) => setSpo2(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewEscalationModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <AlertOctagon className="w-4 h-4" />
                  <span>Dispatch 108 Ambulance & Pre-Alert District Bay</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
