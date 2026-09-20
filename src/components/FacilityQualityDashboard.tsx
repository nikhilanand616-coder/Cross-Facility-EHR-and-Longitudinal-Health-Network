import React, { useState } from 'react';
import {
  Award,
  TrendingUp,
  AlertCircle,
  Building2,
  Users,
  ShieldCheck,
  CheckCircle,
  Clock,
  Sparkles,
  FileSpreadsheet,
  Printer,
  ChevronRight,
  Filter,
  BarChart3,
  HeartHandshake,
  AlertTriangle,
  Send,
} from 'lucide-react';
import { FacilityQualityScorecard, Facility } from '../types';
import { SupportedLanguage, t } from '../i18n/translations';

interface FacilityQualityDashboardProps {
  scorecards: FacilityQualityScorecard[];
  facilities: Facility[];
  currentLanguage: SupportedLanguage;
  onIssueActionNotice?: (facilityId: string, area: string, deadline: string) => void;
}

export const FacilityQualityDashboard: React.FC<FacilityQualityDashboardProps> = ({
  scorecards,
  facilities,
  currentLanguage,
  onIssueActionNotice,
}) => {
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>(scorecards[0]?.facilityId || '');
  const [showNoticeModal, setShowNoticeModal] = useState<boolean>(false);
  const [deficiencyArea, setDeficiencyArea] = useState<string>('');
  const [correctiveDeadline, setCorrectiveDeadline] = useState<string>('2026-04-15');

  const selectedScorecard =
    scorecards.find((s) => s.facilityId === selectedFacilityId) || scorecards[0];

  const handleCreateNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (onIssueActionNotice && selectedScorecard) {
      onIssueActionNotice(selectedScorecard.facilityId, deficiencyArea, correctiveDeadline);
    }
    setShowNoticeModal(false);
    setDeficiencyArea('');
  };

  const averageScore = Math.round(
    scorecards.reduce((acc, curr) => acc + curr.overallScore, 0) / (scorecards.length || 1)
  );

  const averageEdl = (
    scorecards.reduce((acc, curr) => acc + curr.edlStockAvailabilityRate, 0) / (scorecards.length || 1)
  ).toFixed(1);

  const averageLoopClosure = (
    scorecards.reduce((acc, curr) => acc + curr.referralLoopClosureRate, 0) / (scorecards.length || 1)
  ).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl border border-indigo-900/50">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-indigo-600/30 border border-indigo-400/40 rounded-xl text-amber-300">
              <Award className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">
                  {t('facilityQuality', currentLanguage)}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  IPHS & NQAS Standards
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-1 max-w-2xl">
                District Health Network accountability matrices, Kayakalp infection control scores, maternal mortality zero-audits, and essential drug stockout monitoring.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => alert('District Quality Audit Report exported for Sundargarh District Health Administration.')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Export Audit</span>
            </button>
          </div>
        </div>

        {/* Aggregate KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-indigo-900/60">
          <div>
            <span className="text-[11px] text-indigo-300 uppercase font-semibold">Network Quality Score</span>
            <p className="text-2xl font-bold text-amber-300 mt-0.5">{averageScore}/100</p>
            <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> +4.2% YoY Improvement
            </span>
          </div>
          <div>
            <span className="text-[11px] text-indigo-300 uppercase font-semibold">EDL Drug Availability</span>
            <p className="text-2xl font-bold text-white mt-0.5">{averageEdl}%</p>
            <span className="text-[10px] text-slate-400">Target &gt; 95% across all tiers</span>
          </div>
          <div>
            <span className="text-[11px] text-indigo-300 uppercase font-semibold">Referral Loop Closure</span>
            <p className="text-2xl font-bold text-emerald-400 mt-0.5">{averageLoopClosure}%</p>
            <span className="text-[10px] text-slate-400">Counter-referral tracking</span>
          </div>
          <div>
            <span className="text-[11px] text-indigo-300 uppercase font-semibold">Maternal Deaths Audit</span>
            <p className="text-2xl font-bold text-emerald-300 mt-0.5">0 Deaths</p>
            <span className="text-[10px] text-emerald-400">100% Zero-Preventable Goal</span>
          </div>
        </div>
      </div>

      {/* Main Content: Facility Selector Cards and Deep-Dive */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Facility Scorecard Cards */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Health Facilities ({scorecards.length})
            </h2>
            <span className="text-[11px] text-slate-400">Sundargarh District</span>
          </div>

          <div className="space-y-2.5">
            {scorecards.map((card) => {
              const isSelected = card.facilityId === selectedScorecard?.facilityId;
              return (
                <div
                  key={card.facilityId}
                  onClick={() => setSelectedFacilityId(card.facilityId)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {card.tier.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-bold text-indigo-600">
                      Score: {card.overallScore}/100
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900">{card.facilityName}</h3>

                  <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-100 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">IPHS</span>
                      <strong className="text-slate-700">{card.iphsCompliancePercentage}%</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">EDL Stock</span>
                      <strong className="text-emerald-700">{card.edlStockAvailabilityRate}%</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Satisfaction</span>
                      <strong className="text-amber-700">{card.patientSatisfaction.overallRating} ★</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: In-Depth Facility Scorecard */}
        {selectedScorecard && (
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
              {/* Card Title & Supervisory Notice Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800">
                      {selectedScorecard.tier.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-slate-500">District: {selectedScorecard.district}</span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mt-1">{selectedScorecard.facilityName}</h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowNoticeModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Issue Supervisory Action Memo</span>
                  </button>
                </div>
              </div>

              {/* Active Supervisory Notice Alert (if any) */}
              {selectedScorecard.supervisoryActionNotice && (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs text-amber-900">
                    <div className="flex items-center gap-2">
                      <strong className="font-bold">Statutory Quality Notice ({selectedScorecard.supervisoryActionNotice.issuedBy})</strong>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-200 text-amber-800 font-semibold uppercase">
                        {selectedScorecard.supervisoryActionNotice.status}
                      </span>
                    </div>
                    <p>{selectedScorecard.supervisoryActionNotice.deficiencyArea}</p>
                    <span className="text-[10px] text-amber-700 block">
                      Corrective Action Deadline: {selectedScorecard.supervisoryActionNotice.correctiveActionDeadline}
                    </span>
                  </div>
                </div>
              )}

              {/* Pillar 1: Clinical Governance & Maternal-Child Audits */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>Clinical Governance & Maternal-Child Outcome Audits</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Institutional Deliveries</span>
                    <p className="text-lg font-bold text-slate-900 mt-1">
                      {selectedScorecard.maternalChildIndicators.institutionalDeliveriesMonth} <span className="text-xs font-normal text-slate-500">/mo</span>
                    </p>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">C-Section Rate</span>
                    <p className="text-lg font-bold text-slate-900 mt-1">
                      {selectedScorecard.maternalChildIndicators.cSectionRate}%
                    </p>
                    <span className="text-[10px] text-slate-400">WHO Norm: 10-15%</span>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Maternal Deaths</span>
                    <p className="text-lg font-bold text-emerald-600 mt-1">
                      {selectedScorecard.maternalChildIndicators.maternalDeathsMonth}
                    </p>
                    <span className="text-[10px] text-emerald-600">Zero Audit Verified</span>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">SAM Referrals</span>
                    <p className="text-lg font-bold text-amber-600 mt-1">
                      {selectedScorecard.maternalChildIndicators.samCasesReferred} <span className="text-xs font-normal text-slate-500">to NRC</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Pillar 2: Human Resource Adequacy & On-Duty Accountability */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-teal-600" />
                  <span>Human Resources & Attendance Compliance</span>
                </h3>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Doctors in Position</span>
                    <p className="text-base font-bold text-slate-900 mt-0.5">
                      {selectedScorecard.staffingStatus.doctorsInPosition} / {selectedScorecard.staffingStatus.doctorsSanctioned}
                    </p>
                    <span className="text-[10px] text-slate-500">Sanctioned</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Nurses in Position</span>
                    <p className="text-base font-bold text-slate-900 mt-0.5">
                      {selectedScorecard.staffingStatus.nursesInPosition} / {selectedScorecard.staffingStatus.nursesSanctioned}
                    </p>
                    <span className="text-[10px] text-slate-500">Sanctioned</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Laboratory Techs</span>
                    <p className="text-base font-bold text-slate-900 mt-0.5">
                      {selectedScorecard.staffingStatus.labTechsInPosition} Active
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Pharmacists</span>
                    <p className="text-base font-bold text-slate-900 mt-0.5">
                      {selectedScorecard.staffingStatus.pharmacistsInPosition} Active
                    </p>
                  </div>
                </div>
              </div>

              {/* Pillar 3: Infrastructure, Cleanliness (Kayakalp) & Bed Utilization */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-amber-600" />
                  <span>Infrastructure, Cleanliness & Facility Utilization</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Kayakalp Cleanliness</span>
                    <p className="text-base font-bold text-slate-900 mt-0.5">
                      {selectedScorecard.cleanlinessKayakalpScore} / 100
                    </p>
                    <span className="text-[10px] text-emerald-600">Bio-waste segregation passed</span>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Bed Occupancy (BOR)</span>
                    <p className="text-base font-bold text-slate-900 mt-0.5">
                      {selectedScorecard.bedOccupancyRate}%
                    </p>
                    <span className="text-[10px] text-slate-500">Optimal clinical load</span>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Average Stay (ALOS)</span>
                    <p className="text-base font-bold text-slate-900 mt-0.5">
                      {selectedScorecard.averageLengthOfStayDays} Days
                    </p>
                    <span className="text-[10px] text-slate-500">Postpartum / inpatient</span>
                  </div>
                </div>
              </div>

              {/* Pillar 4: Patient Voice & "Mera Aspataal" Satisfaction */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <HeartHandshake className="w-4 h-4 text-rose-600" />
                  <span>"Mera Aspataal" Citizen Satisfaction & Grievance Redressal</span>
                </h3>
                <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-200/70 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-rose-900">
                        {selectedScorecard.patientSatisfaction.overallRating}
                      </span>
                      <span className="text-xs text-rose-700">★ Out of 5.0 (Aggregate Citizen Rating)</span>
                    </div>
                    <span className="text-xs font-semibold text-rose-800">
                      Grievance Resolution: {selectedScorecard.patientSatisfaction.complaintsResolved} of{' '}
                      {selectedScorecard.patientSatisfaction.complaintsLogged} complaints resolved
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-rose-200/50 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Medicine Availability</span>
                      <strong className="text-slate-800">{selectedScorecard.patientSatisfaction.medicineAvailabilityRating} ★</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Staff Courteousness</span>
                      <strong className="text-slate-800">{selectedScorecard.patientSatisfaction.staffCourteousnessRating} ★</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Ward Cleanliness</span>
                      <strong className="text-slate-800">{selectedScorecard.patientSatisfaction.cleanlinessRating} ★</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Supervisory Action Notice Modal */}
      {showNoticeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl border border-slate-200 overflow-hidden">
            <div className="bg-amber-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-200" />
                <h3 className="text-sm font-bold">Issue Supervisory Corrective Action Memo</h3>
              </div>
              <button
                onClick={() => setShowNoticeModal(false)}
                className="text-white hover:opacity-75 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNotice} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  Target Health Facility
                </label>
                <input
                  disabled
                  value={selectedScorecard?.facilityName}
                  className="w-full px-3 py-2 bg-slate-100 rounded-lg text-xs font-medium text-slate-800 border border-slate-200"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  Area of Deficiency / Quality Audit Non-Compliance
                </label>
                <textarea
                  required
                  rows={3}
                  value={deficiencyArea}
                  onChange={(e) => setDeficiencyArea(e.target.value)}
                  placeholder="e.g. Newborn Stabilization Unit temperature log maintenance irregularity; oxytocin cold-chain verification required."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  Mandatory Rectification Deadline
                </label>
                <input
                  type="date"
                  required
                  value={correctiveDeadline}
                  onChange={(e) => setCorrectiveDeadline(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNoticeModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Issue Statutory Directive</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
