import React, { useState } from 'react';
import {
  GitPullRequest,
  Send,
  Truck,
  Building2,
  Clock,
  ArrowRight,
  PlusCircle,
  MessageSquare,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Referral, Facility, LongitudinalPatient, ReferralUrgency, ReferralStatus } from '../types';
import { AutomatedPatientRoutingModal } from './AutomatedPatientRoutingModal';

interface ReferralNetworkTrackerProps {
  referrals: Referral[];
  facilities: Facility[];
  patients: LongitudinalPatient[];
  currentFacility: Facility;
  onAddReferral: (newReferral: Referral) => void;
  onUpdateReferralStatus: (referralId: string, newStatus: ReferralStatus, notes?: string) => void;
}

export const ReferralNetworkTracker: React.FC<ReferralNetworkTrackerProps> = ({
  referrals,
  facilities,
  patients,
  currentFacility,
  onAddReferral,
  onUpdateReferralStatus,
}) => {
  const [filterUrgency, setFilterUrgency] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showNewReferralModal, setShowNewReferralModal] = useState(false);
  const [showAIRoutingModal, setShowAIRoutingModal] = useState(false);

  // New referral form state
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patients[0]?.id || '');
  const [destinationFacilityId, setDestinationFacilityId] = useState<string>(
    facilities.find((f) => f.tier === 'district_hospital')?.id || facilities[facilities.length - 1]?.id || ''
  );
  const [urgency, setUrgency] = useState<ReferralUrgency>('urgent');
  const [specialty, setSpecialty] = useState<string>('Internal Medicine / Emergency');
  const [clinicalReason, setClinicalReason] = useState<string>('');
  const [transportMode, setTransportMode] = useState<'Ambulance 108' | 'Facility Vehicle' | 'Private/Public Transport'>('Ambulance 108');

  // Counter-referral modal state
  const [counterReferralTarget, setCounterReferralTarget] = useState<Referral | null>(null);
  const [counterNotes, setCounterNotes] = useState('');

  const filteredReferrals = referrals.filter((r) => {
    if (filterUrgency !== 'all' && r.urgency !== filterUrgency) return false;
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    return true;
  });

  const getFacilityName = (facId: string) => {
    return facilities.find((f) => f.id === facId)?.name || facId;
  };

  const getFacilityTier = (facId: string) => {
    return facilities.find((f) => f.id === facId)?.tier || 'phc';
  };

  const getUrgencyBadge = (urg: ReferralUrgency) => {
    switch (urg) {
      case 'emergency':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 animate-pulse">EMERGENCY (STAT)</span>;
      case 'urgent':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">URGENT</span>;
      case 'routine':
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">ROUTINE</span>;
    }
  };

  const getStatusBadge = (st: ReferralStatus) => {
    switch (st) {
      case 'initiated':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">1. Initiated</span>;
      case 'in_transit':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1"><Truck className="w-3 h-3" /> 2. In Transit</span>;
      case 'triaged':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">3. Triaged at Hub</span>;
      case 'admitted':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">4. Admitted to Ward/ICU</span>;
      case 'completed':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-600" /> 5. Completed</span>;
      case 'counter_referred':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 flex items-center gap-1"><MessageSquare className="w-3 h-3 text-indigo-600" /> Counter-Referred</span>;
    }
  };

  const handleCreateReferral = (e: React.FormEvent) => {
    e.preventDefault();
    const pat = patients.find((p) => p.id === selectedPatientId);
    if (!pat) return;

    const newRef: Referral = {
      id: `ref_${Date.now().toString(36)}`,
      patientId: pat.id,
      patientName: pat.name,
      patientAge: pat.age,
      originatingFacilityId: currentFacility.id,
      destinationFacilityId,
      urgency,
      status: 'initiated',
      clinicalReason: clinicalReason || 'Referral for specialized tertiary management.',
      referringClinician: 'Attending Medical Officer / CHO',
      specialtyRequired: specialty,
      transportMode,
      initiatedDate: new Date().toISOString(),
      syncStatus: 'synced',
    };

    onAddReferral(newRef);
    setShowNewReferralModal(false);
    setClinicalReason('');
  };

  const handleCompleteCounterReferral = () => {
    if (!counterReferralTarget) return;
    onUpdateReferralStatus(counterReferralTarget.id, 'counter_referred', counterNotes);
    setCounterReferralTarget(null);
    setCounterNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Multi-Tier Referral Overview */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                <GitPullRequest className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Cross-Facility Referral & Escalation Engine
                </h2>
                <p className="text-xs text-slate-500">
                  Sub-centres ⇄ Primary Health Centres (PHC) ⇄ Rural Hospitals (CHC) ⇄ District Headquarters
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowAIRoutingModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-linear-to-r from-indigo-700 via-indigo-800 to-slate-900 text-white text-xs font-bold hover:from-indigo-800 hover:to-black shadow-md cursor-pointer border border-indigo-500/30"
              title="Automated Patient Routing & Referral Recommendation Service using Gemini API"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>AI Patient Routing & Referral (Gemini)</span>
            </button>

            <button
              onClick={() => setShowNewReferralModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Initiate New Referral</span>
            </button>
          </div>
        </div>

        {/* Tier Escalation Pipeline Diagram */}
        <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
            <div className="bg-white p-3 rounded-lg border border-amber-200 text-xs text-center shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-amber-700 block">Tier 1: Sub-Centre</span>
              <strong className="text-slate-900 block mt-0.5">Community Screening</strong>
              <p className="text-[11px] text-slate-500 mt-1">ASHA/CHO initial triage & stabilizing care</p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-blue-200 text-xs text-center shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-blue-700 block">Tier 2: Primary Health (PHC)</span>
              <strong className="text-slate-900 block mt-0.5">Medical Officer OPD</strong>
              <p className="text-[11px] text-slate-500 mt-1">Basic labs, essential Rx & transfer triage</p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-teal-200 text-xs text-center shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-teal-700 block">Tier 3: Rural Hospital (CHC)</span>
              <strong className="text-slate-900 block mt-0.5">Inpatient Secondary Hub</strong>
              <p className="text-[11px] text-slate-500 mt-1">Surgical, maternal beds & ultrasound</p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-indigo-200 text-xs text-center shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-indigo-700 block">Tier 4: District Hospital</span>
              <strong className="text-slate-900 block mt-0.5">Tertiary Specialties & ICU</strong>
              <p className="text-[11px] text-slate-500 mt-1">Advanced care + Counter-referral loop</p>
            </div>
          </div>
        </div>
      </div>

      {/* Referral Filters & List */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">
              Active Referrals ({filteredReferrals.length})
            </h3>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs text-slate-500">Real-time status updates across facilities</span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <select
              aria-label="Filter by urgency"
              value={filterUrgency}
              onChange={(e) => setFilterUrgency(e.target.value)}
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 bg-slate-50 focus:outline-none"
            >
              <option value="all">All Urgency Levels</option>
              <option value="emergency">Emergency (STAT)</option>
              <option value="urgent">Urgent</option>
              <option value="routine">Routine</option>
            </select>

            <select
              aria-label="Filter by status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 bg-slate-50 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="initiated">Initiated</option>
              <option value="in_transit">In Transit</option>
              <option value="triaged">Triaged</option>
              <option value="admitted">Admitted</option>
              <option value="completed">Completed</option>
              <option value="counter_referred">Counter-Referred</option>
            </select>
          </div>
        </div>

        {/* Referrals Cards Grid */}
        <div className="space-y-4">
          {filteredReferrals.map((ref) => {
            const originatingName = getFacilityName(ref.originatingFacilityId);
            const destinationName = getFacilityName(ref.destinationFacilityId);

            return (
              <div
                key={ref.id}
                className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-all text-xs"
              >
                {/* Header line */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900 text-sm">
                      {ref.patientName} ({ref.patientAge}y)
                    </span>
                    <span className="font-mono text-slate-500 text-[11px]">{ref.id}</span>
                    {getUrgencyBadge(ref.urgency)}
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(ref.status)}
                    <span className="text-slate-400 text-[11px]">
                      {new Date(ref.initiatedDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Path representation */}
                <div className="py-3 flex flex-wrap items-center gap-2 text-slate-700">
                  <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                    <Building2 className="w-3.5 h-3.5 text-amber-600" />
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">From (Origin)</span>
                      <strong className="text-slate-800">{originatingName}</strong>
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-indigo-600 shrink-0" />

                  <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">To (Destination)</span>
                      <strong className="text-slate-800">{destinationName}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 ml-auto">
                    <Truck className="w-3.5 h-3.5 text-slate-500" />
                    <span>Transport: <strong>{ref.transportMode}</strong></span>
                  </div>
                </div>

                {/* Clinical details */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5 mb-3">
                  <p className="text-slate-800">
                    <strong className="text-slate-900">Clinical Reason:</strong> {ref.clinicalReason}
                  </p>
                  <p className="text-slate-600">
                    <strong className="text-slate-800">Specialty Required:</strong> {ref.specialtyRequired} • <strong className="text-slate-800">Clinician:</strong> {ref.referringClinician}
                  </p>
                  {ref.triageNotes && (
                    <p className="text-slate-700 bg-slate-50 p-2 rounded border border-slate-100">
                      <strong className="text-purple-900">Hub Triage Notes:</strong> {ref.triageNotes}
                    </p>
                  )}
                  {ref.counterReferralNotes && (
                    <div className="p-2.5 rounded bg-indigo-50/80 border border-indigo-200 text-indigo-950">
                      <strong className="font-bold flex items-center gap-1 text-indigo-900 mb-0.5">
                        <MessageSquare className="w-3.5 h-3.5" /> Closed-Loop Counter-Referral Discharge Summary:
                      </strong>
                      <p>{ref.counterReferralNotes}</p>
                    </div>
                  )}
                </div>

                {/* Status action buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
                  <span className="text-[11px] text-slate-400">
                    Sync Status: <strong className="text-emerald-700 uppercase">{ref.syncStatus}</strong>
                  </span>

                  <div className="flex items-center gap-1.5">
                    {ref.status === 'initiated' && (
                      <button
                        onClick={() => onUpdateReferralStatus(ref.id, 'in_transit', 'Dispatched ambulance')}
                        className="px-2.5 py-1 rounded bg-amber-600 text-white hover:bg-amber-700 text-xs font-semibold cursor-pointer"
                      >
                        Dispatch Transport
                      </button>
                    )}
                    {ref.status === 'in_transit' && (
                      <button
                        onClick={() => onUpdateReferralStatus(ref.id, 'triaged', 'Patient arrived at Emergency triage desk')}
                        className="px-2.5 py-1 rounded bg-purple-600 text-white hover:bg-purple-700 text-xs font-semibold cursor-pointer"
                      >
                        Confirm Arrival & Triage
                      </button>
                    )}
                    {ref.status === 'triaged' && (
                      <button
                        onClick={() => onUpdateReferralStatus(ref.id, 'admitted', 'Admitted to specialty ward')}
                        className="px-2.5 py-1 rounded bg-teal-600 text-white hover:bg-teal-700 text-xs font-semibold cursor-pointer"
                      >
                        Admit Patient
                      </button>
                    )}
                    {ref.status === 'admitted' && (
                      <button
                        onClick={() => onUpdateReferralStatus(ref.id, 'completed', 'Treatment completed at Hub')}
                        className="px-2.5 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold cursor-pointer"
                      >
                        Complete Acute Care
                      </button>
                    )}
                    {ref.status !== 'counter_referred' && (
                      <button
                        onClick={() => setCounterReferralTarget(ref)}
                        className="px-2.5 py-1 rounded border border-indigo-600 text-indigo-700 hover:bg-indigo-50 text-xs font-semibold cursor-pointer"
                      >
                        Create Counter-Referral
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Initiate Referral Modal */}
      {showNewReferralModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full p-6 space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Initiate Inter-Facility Referral</h3>
                <p className="text-xs text-slate-500">Originating: {currentFacility.name}</p>
              </div>
              <button
                onClick={() => setShowNewReferralModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateReferral} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Select Patient</label>
                <select
                  aria-label="Select Patient for referral"
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2 text-xs font-semibold"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.gender}, {p.age}y) — {p.nationalHealthId}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Destination Facility</label>
                <select
                  aria-label="Select destination facility"
                  value={destinationFacilityId}
                  onChange={(e) => setDestinationFacilityId(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2 text-xs font-semibold"
                >
                  {facilities
                    .filter((f) => f.id !== currentFacility.id)
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.tier.toUpperCase()}) — {f.district}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Urgency Priority</label>
                  <select
                    aria-label="Select urgency"
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as ReferralUrgency)}
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs font-semibold"
                  >
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                    <option value="emergency">Emergency (STAT)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Transport Vehicle</label>
                  <select
                    aria-label="Select transport vehicle"
                    value={transportMode}
                    onChange={(e) => setTransportMode(e.target.value as any)}
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs font-semibold"
                  >
                    <option value="Ambulance 108">Ambulance 108 (ALS Unit)</option>
                    <option value="Facility Vehicle">Facility Official Vehicle</option>
                    <option value="Private/Public Transport">Private / Public Transport</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Required Clinical Specialty</label>
                <input
                  type="text"
                  required
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="e.g. Obstetrics, Cardiology, Pulmonology"
                  className="w-full border border-slate-200 rounded-lg p-2 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Clinical Transfer Summary & Rationale</label>
                <textarea
                  rows={3}
                  required
                  value={clinicalReason}
                  onChange={(e) => setClinicalReason(e.target.value)}
                  placeholder="Summarize vitals, diagnosis, treatment administered, and reason for transfer..."
                  className="w-full border border-slate-200 rounded-lg p-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowNewReferralModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Transmit Referral</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Counter-Referral Feedback Loop Modal */}
      {counterReferralTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Closed-Loop Counter-Referral Feedback
                </h3>
                <p className="text-xs text-slate-500">
                  Sending discharge instructions back to primary care clinic for {counterReferralTarget.patientName}
                </p>
              </div>
              <button
                onClick={() => setCounterReferralTarget(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                Provide clinical feedback, maintenance drug dosages, and surveillance instructions for the primary health worker or Sub-centre ASHA team.
              </p>
              <textarea
                rows={4}
                value={counterNotes}
                onChange={(e) => setCounterNotes(e.target.value)}
                placeholder="Patient successfully stabilized. Discharged on oral medications. Please monitor BP weekly and issue 30-day refills..."
                className="w-full border border-slate-200 rounded-lg p-2.5 text-xs"
              />

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCounterReferralTarget(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCompleteCounterReferral}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-xs cursor-pointer"
                >
                  Transmit Counter-Referral
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Automated Patient Routing & Referral Modal (Gemini API) */}
      <AutomatedPatientRoutingModal
        isOpen={showAIRoutingModal}
        onClose={() => setShowAIRoutingModal(false)}
        currentFacility={currentFacility}
        facilities={facilities}
        patients={patients}
        onApplyReferral={(newRef) => {
          onAddReferral(newRef);
          setShowAIRoutingModal(false);
        }}
      />
    </div>
  );
};
