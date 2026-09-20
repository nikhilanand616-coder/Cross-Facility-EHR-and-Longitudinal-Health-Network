import React, { useState } from 'react';
import {
  Heart,
  Baby,
  Activity,
  AlertTriangle,
  Clock,
  CheckCircle,
  Phone,
  Send,
  UserCheck,
  Plus,
  Filter,
  Calendar,
  ShieldAlert,
  Search,
  ChevronRight,
  MapPin,
  Sparkles,
  ArrowUpRight,
  X,
  HeartPulse,
  Users,
} from 'lucide-react';
import { HighRiskPatientRecord, LongitudinalPatient, Facility } from '../types';
import { SupportedLanguage, t } from '../i18n/translations';
import { PostDischargeAdherenceTracker } from './PostDischargeAdherenceTracker';

interface HighRiskCohortFollowupViewProps {
  highRiskPatients: HighRiskPatientRecord[];
  patients: LongitudinalPatient[];
  facilities: Facility[];
  currentLanguage: SupportedLanguage;
  onUpdatePatientStatus: (recordId: string, status: HighRiskPatientRecord['status']) => void;
  onCompleteTask: (recordId: string, taskId: string) => void;
  onEnrollPatient: (newRecord: HighRiskPatientRecord) => void;
  onSendReminder: (patientPhone: string, patientName: string, cohort: string) => void;
}

export const HighRiskCohortFollowupView: React.FC<HighRiskCohortFollowupViewProps> = ({
  highRiskPatients,
  patients,
  facilities,
  currentLanguage,
  onUpdatePatientStatus,
  onCompleteTask,
  onEnrollPatient,
  onSendReminder,
}) => {
  const [selectedCohort, setSelectedCohort] = useState<'all' | 'maternal' | 'child' | 'chronic'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'overdue' | 'active' | 'escalated_to_mo'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRecordId, setSelectedRecordId] = useState<string>(highRiskPatients[0]?.id || '');
  const [showEnrollModal, setShowEnrollModal] = useState<boolean>(false);
  const [subView, setSubView] = useState<'cohorts' | 'adherence'>('cohorts');

  // New Enrollment Form state
  const [newPatientId, setNewPatientId] = useState<string>(patients[0]?.id || '');
  const [newCohort, setNewCohort] = useState<'maternal' | 'child' | 'chronic'>('maternal');
  const [newRiskLevel, setNewRiskLevel] = useState<'moderate' | 'high' | 'critical'>('high');
  const [newRiskFactors, setNewRiskFactors] = useState<string>('');
  const [newDueDate, setNewDueDate] = useState<string>('2026-03-20');
  const [newAshaName, setNewAshaName] = useState<string>('Sister Priya Nair');

  const filteredPatients = highRiskPatients.filter((record) => {
    if (selectedCohort !== 'all' && record.cohort !== selectedCohort) return false;
    if (selectedStatus !== 'all' && record.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = record.patientName.toLowerCase().includes(q);
      const matchVillage = record.villageOrCity.toLowerCase().includes(q);
      const matchRisk = record.primaryRiskFactors.some((r) => r.toLowerCase().includes(q));
      if (!matchName && !matchVillage && !matchRisk) return false;
    }
    return true;
  });

  const selectedRecord =
    highRiskPatients.find((r) => r.id === selectedRecordId) || filteredPatients[0] || highRiskPatients[0];

  const handleEnrollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const basePatient = patients.find((p) => p.id === newPatientId);

    const newRecord: HighRiskPatientRecord = {
      id: `hrp_${Date.now()}`,
      patientId: newPatientId,
      patientName: basePatient?.name || 'Newly Enrolled Patient',
      age: basePatient?.age || 28,
      gender: basePatient?.gender || (newCohort === 'maternal' ? 'Female' : 'Unknown'),
      phone: basePatient?.phone || '+91 94399 00000',
      villageOrCity: basePatient?.address || 'Sundargarh Rural Sector',
      primaryFacilityId: basePatient?.registeredFacilityId || 'fac_sub_rampur',
      primaryFacilityName: 'Rampur Health Sub-Centre (HWC)',
      assignedAshaName: newAshaName,
      assignedAshaPhone: '+91 94371 82910',
      cohort: newCohort,
      riskLevel: newRiskLevel,
      primaryRiskFactors: newRiskFactors
        ? newRiskFactors.split(',').map((s) => s.trim())
        : ['High-Risk Clinical Stratification'],
      enrollmentDate: new Date().toISOString(),
      lastEncounterDate: new Date().toISOString(),
      nextFollowupDueDate: newDueDate,
      daysOverdue: 0,
      status: 'active',
      followupTasks: [
        {
          id: `task_${Date.now()}`,
          taskType: 'home_visit_asha',
          description: `Field visit by ${newAshaName} for baseline vitals and risk assessment`,
          assignedTo: newAshaName,
          dueDate: newDueDate,
          status: 'pending',
        },
      ],
    };

    onEnrollPatient(newRecord);
    setSelectedRecordId(newRecord.id);
    setShowEnrollModal(false);
    setNewRiskFactors('');
  };

  const overdueCount = highRiskPatients.filter((r) => r.status === 'overdue').length;
  const criticalCount = highRiskPatients.filter((r) => r.riskLevel === 'critical').length;
  const maternalCount = highRiskPatients.filter((r) => r.cohort === 'maternal').length;
  const childCount = highRiskPatients.filter((r) => r.cohort === 'child').length;
  const chronicCount = highRiskPatients.filter((r) => r.cohort === 'chronic').length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-emerald-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl border border-emerald-800/40">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-emerald-600/30 border border-emerald-400/40 rounded-xl text-emerald-300">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">
                  {t('highRiskTracking', currentLanguage)}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  Automated Care Escalation Engine
                </span>
              </div>
              <p className="text-xs text-emerald-200/90 mt-1 max-w-2xl">
                Proactive surveillance for High-Risk Pregnancies (severe anemia, eclampsia), Child SAM & immunization dropouts, and Chronic NCDs/TB DOTS adherence with frontline ASHA task routing.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowEnrollModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Enroll Patient into High-Risk Cohort</span>
          </button>
        </div>

        {/* Aggregate Surveillance Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-emerald-800/60 text-xs">
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="text-[10px] text-emerald-300 uppercase font-semibold">Overdue for Visit</span>
            <p className="text-xl font-bold text-rose-400 mt-0.5">{overdueCount} Patients</p>
            <span className="text-[10px] text-rose-300">&gt; 5 days delay</span>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="text-[10px] text-emerald-300 uppercase font-semibold">Critical Risk Flag</span>
            <p className="text-xl font-bold text-amber-300 mt-0.5">{criticalCount} Cases</p>
            <span className="text-[10px] text-amber-200">Immediate MO review</span>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="text-[10px] text-emerald-300 uppercase font-semibold">Maternal (HRP)</span>
            <p className="text-xl font-bold text-white mt-0.5">{maternalCount} Mothers</p>
            <span className="text-[10px] text-slate-300">ANC 1-4 & Delivery Plan</span>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="text-[10px] text-emerald-300 uppercase font-semibold">Child (SAM / Dropouts)</span>
            <p className="text-xl font-bold text-white mt-0.5">{childCount} Infants</p>
            <span className="text-[10px] text-slate-300">MUAC & Vaccines</span>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="text-[10px] text-emerald-300 uppercase font-semibold">Chronic Care & TB</span>
            <p className="text-xl font-bold text-white mt-0.5">{chronicCount} Patients</p>
            <span className="text-[10px] text-slate-300">DOTS & NCD Refills</span>
          </div>
        </div>
      </div>

      {/* Primary Sub-View Selector (Cohort Surveillance vs Post-Discharge Adherence Tracker) */}
      <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
        <button
          onClick={() => setSubView('cohorts')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            subView === 'cohorts'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Active Cohort Surveillance</span>
        </button>
        <button
          onClick={() => setSubView('adherence')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            subView === 'adherence'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <HeartPulse className="w-4 h-4" />
          <span>Post-Discharge Adherence & ASHA Escalation</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-black">
            3-Day SMS
          </span>
        </button>
      </div>

      {subView === 'adherence' ? (
        <PostDischargeAdherenceTracker currentLanguage={currentLanguage} />
      ) : (
        <>
      {/* Cohort Tabs & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Cohort Selector Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedCohort('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              selectedCohort === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Cohorts ({highRiskPatients.length})
          </button>
          <button
            onClick={() => setSelectedCohort('maternal')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              selectedCohort === 'maternal'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Maternal (HRP)</span>
          </button>
          <button
            onClick={() => setSelectedCohort('child')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              selectedCohort === 'child'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <Baby className="w-3.5 h-3.5" />
            <span>Child Health (SAM)</span>
          </button>
          <button
            onClick={() => setSelectedCohort('chronic')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              selectedCohort === 'chronic'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-teal-50 text-teal-800 hover:bg-teal-100'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Chronic & TB</span>
          </button>
        </div>

        {/* Search & Overdue Filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, village, condition..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-700 bg-white font-medium cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="overdue">Overdue Only</option>
            <option value="active">Active & Scheduled</option>
            <option value="escalated_to_mo">Escalated to MO</option>
          </select>
        </div>
      </div>

      {/* Main Split View: Left Patient List, Right Cohort Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Patient List */}
        <div className="lg:col-span-4 space-y-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Patients in Cohort ({filteredPatients.length})
          </span>

          <div className="space-y-2 max-h-[720px] overflow-y-auto pr-1">
            {filteredPatients.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-400">
                No patients found matching the selected filter.
              </div>
            ) : (
              filteredPatients.map((record) => {
                const isSelected = record.id === selectedRecord?.id;
                const isOverdue = record.status === 'overdue';

                return (
                  <div
                    key={record.id}
                    onClick={() => setSelectedRecordId(record.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500 shadow-sm'
                        : isOverdue
                        ? 'border-red-200 bg-red-50/30 hover:border-red-300'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        {record.cohort === 'maternal' && <Heart className="w-3.5 h-3.5 text-rose-500" />}
                        {record.cohort === 'child' && <Baby className="w-3.5 h-3.5 text-amber-500" />}
                        {record.cohort === 'chronic' && <Activity className="w-3.5 h-3.5 text-teal-500" />}
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          {record.cohort}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          record.riskLevel === 'critical'
                            ? 'bg-red-100 text-red-700'
                            : record.riskLevel === 'high'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {record.riskLevel}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900">{record.patientName}</h3>
                    <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{record.villageOrCity}</p>

                    <div className="mt-2 text-xs">
                      {record.primaryRiskFactors.map((factor, idx) => (
                        <span
                          key={idx}
                          className="inline-block bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-medium mr-1 mb-1"
                        >
                          {factor}
                        </span>
                      ))}
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">ASHA: {record.assignedAshaName}</span>
                      {isOverdue ? (
                        <span className="font-bold text-red-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Overdue {record.daysOverdue}d
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-medium">Due: {record.nextFollowupDueDate}</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Detailed Patient Clinical Tracker */}
        {selectedRecord && (
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
              {/* Header Details */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      {selectedRecord.cohort} Cohort
                    </span>
                    <span className="text-xs text-slate-500">
                      ID: <strong className="text-slate-800">{selectedRecord.patientId}</strong>
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mt-1">
                    {selectedRecord.patientName} ({selectedRecord.age}y, {selectedRecord.gender})
                  </h2>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>{selectedRecord.villageOrCity}</span> • <span>Primary Center: {selectedRecord.primaryFacilityName}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onSendReminder(selectedRecord.phone, selectedRecord.patientName, selectedRecord.cohort)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send SMS Reminder</span>
                  </button>

                  {selectedRecord.status !== 'escalated_to_mo' ? (
                    <button
                      onClick={() => onUpdatePatientStatus(selectedRecord.id, 'escalated_to_mo')}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition-all cursor-pointer"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                      <span>Escalate to MO</span>
                    </button>
                  ) : (
                    <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-100 text-red-800 border border-red-300">
                      Escalated to MO
                    </span>
                  )}
                </div>
              </div>

              {/* Maternal-Specific Dashboard (if Maternal) */}
              {selectedRecord.cohort === 'maternal' && selectedRecord.maternalDetails && (
                <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-rose-950 uppercase tracking-wide flex items-center gap-1.5">
                      <Heart className="w-4 h-4 text-rose-600" />
                      <span>Maternal Ante-Natal Care (ANC) & Delivery Preparedness</span>
                    </h3>
                    <span className="text-xs font-bold text-rose-700">
                      EDD: {selectedRecord.maternalDetails.edd}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-white rounded-lg border border-rose-100">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Gestational Age</span>
                      <p className="font-bold text-slate-900 text-sm mt-0.5">
                        {selectedRecord.maternalDetails.gestationalAgeWeeks} Weeks
                      </p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-rose-100">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">ANC Checkups Done</span>
                      <p className="font-bold text-slate-900 text-sm mt-0.5">
                        {selectedRecord.maternalDetails.ancCompletedCount} of 4 Completed
                      </p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-rose-100">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Hemoglobin (Hb)</span>
                      <p
                        className={`font-bold text-sm mt-0.5 ${
                          (selectedRecord.maternalDetails.hemoglobinGdl || 10) < 7 ? 'text-red-600' : 'text-slate-900'
                        }`}
                      >
                        {selectedRecord.maternalDetails.hemoglobinGdl} g/dL
                      </p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-rose-100">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Blood Pressure</span>
                      <p className="font-bold text-slate-900 text-sm mt-0.5">
                        {selectedRecord.maternalDetails.bloodPressure}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-rose-100 text-xs flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase">Target Delivery Center</span>
                      <strong className="text-slate-800">{selectedRecord.maternalDetails.institutionalDeliveryFacility}</strong>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-slate-600">
                        IFA Tablets: <strong>{selectedRecord.maternalDetails.ifaTabletsIssued}</strong> issued
                      </span>
                      <span className="text-[11px] text-emerald-700 font-semibold">
                        ✓ Tetanus (Td) Protected
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Child-Specific Dashboard (if Child) */}
              {selectedRecord.cohort === 'child' && selectedRecord.childDetails && (
                <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
                      <Baby className="w-4 h-4 text-amber-600" />
                      <span>Child Nutrition Status (SAM/MAM) & Immunization Dropout Tracking</span>
                    </h3>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        selectedRecord.childDetails.nutritionStatus === 'SAM'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      Status: {selectedRecord.childDetails.nutritionStatus} (MUAC {selectedRecord.childDetails.muacCm} cm)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-white rounded-lg border border-amber-100">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Age in Months</span>
                      <p className="font-bold text-slate-900 text-sm mt-0.5">
                        {selectedRecord.childDetails.ageMonths} Months
                      </p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-amber-100">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Current Weight</span>
                      <p className="font-bold text-slate-900 text-sm mt-0.5">
                        {selectedRecord.childDetails.currentWeightKg} kg (Birth: {selectedRecord.childDetails.birthWeightKg} kg)
                      </p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-amber-100">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">MUAC Band</span>
                      <p className="font-bold text-red-600 text-sm mt-0.5">
                        {selectedRecord.childDetails.muacCm} cm (Red Alert &lt; 11.5)
                      </p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-amber-100">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">HBNC Visits</span>
                      <p className="font-bold text-slate-900 text-sm mt-0.5">
                        {selectedRecord.childDetails.hbncVisitsCompleted} of 7 Done
                      </p>
                    </div>
                  </div>

                  {/* Vaccines Pending Alert */}
                  {selectedRecord.childDetails.pendingVaccines.length > 0 && (
                    <div className="p-3 bg-white rounded-lg border border-red-200 text-xs">
                      <span className="text-[10px] font-bold text-red-600 uppercase block mb-1">
                        Overdue / Missing Vaccine Doses:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedRecord.childDetails.pendingVaccines.map((v, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-red-50 text-red-700 font-semibold border border-red-200">
                            ⚠ {v}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Chronic & TB Dashboard (if Chronic) */}
              {selectedRecord.cohort === 'chronic' && selectedRecord.chronicDetails && (
                <div className="p-4 bg-teal-50/60 rounded-xl border border-teal-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-teal-950 uppercase tracking-wide flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-teal-600" />
                      <span>Chronic Disease & TB DOTS Adherence Surveillance</span>
                    </h3>
                    <span className="text-xs font-bold text-teal-800">
                      Condition: {selectedRecord.chronicDetails.condition}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-white rounded-lg border border-teal-100">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Last Recorded Diagnostic</span>
                      <p className="font-bold text-slate-900 text-xs mt-1">
                        {selectedRecord.chronicDetails.lastMeasuredReading}
                      </p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-teal-100">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Medication Adherence</span>
                      <p className="font-bold text-slate-900 text-sm mt-0.5">
                        {selectedRecord.chronicDetails.medicationAdherencePercent}%
                      </p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-teal-100">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">EDL Drug Buffer Days</span>
                      <p className="font-bold text-teal-700 text-sm mt-0.5">
                        {selectedRecord.chronicDetails.edlMedicationSuppliedDays} Days Supplied
                      </p>
                    </div>
                  </div>

                  {selectedRecord.chronicDetails.dotsAdherence && (
                    <div className="p-3 bg-white rounded-lg border border-teal-200 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <strong className="text-teal-950 font-bold">TB DOTS Daily Blister Pack Count</strong>
                        <span className="font-semibold text-slate-600">
                          {selectedRecord.chronicDetails.dotsAdherence.blisterPacksConsumed} of {selectedRecord.chronicDetails.dotsAdherence.blisterPacksTotal} Packs Consumed
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-teal-600 h-full rounded-full"
                          style={{
                            width: `${(selectedRecord.chronicDetails.dotsAdherence.blisterPacksConsumed / selectedRecord.chronicDetails.dotsAdherence.blisterPacksTotal) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 block">
                        Regimen: {selectedRecord.chronicDetails.dotsAdherence.regimen}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Follow-Up Action Tasks */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Assigned Field Worker Actions & Tasks ({selectedRecord.followupTasks.length})
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Frontline Worker: <strong className="text-slate-800">{selectedRecord.assignedAshaName}</strong> ({selectedRecord.assignedAshaPhone})
                  </span>
                </div>

                <div className="space-y-2.5">
                  {selectedRecord.followupTasks.map((task) => {
                    const isDone = task.status === 'completed';
                    const isTaskOverdue = task.status === 'overdue';

                    return (
                      <div
                        key={task.id}
                        className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                          isDone
                            ? 'bg-slate-50 border-slate-200 opacity-75'
                            : isTaskOverdue
                            ? 'bg-red-50/50 border-red-200'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                isDone
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isTaskOverdue
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-indigo-100 text-indigo-800'
                              }`}
                            >
                              {task.taskType.replace('_', ' ')}
                            </span>
                            <span className="text-[11px] text-slate-400">Due: {task.dueDate}</span>
                          </div>
                          <p className="font-semibold text-slate-900 text-xs">{task.description}</p>
                          <span className="text-[10px] text-slate-500 block">Assignee: {task.assignedTo}</span>
                        </div>

                        <div className="shrink-0">
                          {isDone ? (
                            <span className="flex items-center gap-1 text-emerald-700 font-bold text-xs">
                              <CheckCircle className="w-4 h-4" /> Completed
                            </span>
                          ) : (
                            <button
                              onClick={() => onCompleteTask(selectedRecord.id, task.id)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                            >
                              Mark Completed
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      </>
      )}

      {/* Enroll Patient Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl border border-slate-200 overflow-hidden">
            <div className="bg-emerald-700 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-emerald-200" />
                <h3 className="text-sm font-bold">Enroll Patient into High-Risk Cohort</h3>
              </div>
              <button
                onClick={() => setShowEnrollModal(false)}
                className="text-white hover:opacity-75 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEnrollSubmit} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  Select Patient from Master Longitudinal Registry
                </label>
                <select
                  value={newPatientId}
                  onChange={(e) => setNewPatientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.age}y, {p.gender}) — {p.address}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Risk Cohort
                  </label>
                  <select
                    value={newCohort}
                    onChange={(e) => setNewCohort(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="maternal">Maternal (HRP & ANC)</option>
                    <option value="child">Child (SAM & Vaccines)</option>
                    <option value="chronic">Chronic Care (NCDs & TB)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Risk Stratification
                  </label>
                  <select
                    value={newRiskLevel}
                    onChange={(e) => setNewRiskLevel(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="moderate">Moderate Risk</option>
                    <option value="high">High Risk</option>
                    <option value="critical">Critical (Immediate MO Alert)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  Primary Risk Factors (comma separated)
                </label>
                <input
                  type="text"
                  required
                  value={newRiskFactors}
                  onChange={(e) => setNewRiskFactors(e.target.value)}
                  placeholder="e.g. Severe Anemia (Hb 6.4), Primigravida, Chronic Hypertension"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Next Follow-up Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Assigned ASHA Worker
                  </label>
                  <input
                    type="text"
                    required
                    value={newAshaName}
                    onChange={(e) => setNewAshaName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Enroll Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
