import React, { useState } from 'react';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Stethoscope,
  ShieldAlert,
  HelpCircle,
  RefreshCw,
  X,
  FileCheck,
} from 'lucide-react';
import { LongitudinalPatient, ClinicalEncounter, AIDiagnosticResponse, Facility } from '../types';

interface AIDiagnosticSupportModalProps {
  patient: LongitudinalPatient;
  latestEncounter?: ClinicalEncounter;
  currentFacility: Facility;
  onClose: () => void;
}

export const AIDiagnosticSupportModal: React.FC<AIDiagnosticSupportModalProps> = ({
  patient,
  latestEncounter,
  currentFacility,
  onClose,
}) => {
  const [complaints, setComplaints] = useState(latestEncounter?.chiefComplaint || '');
  const [additionalSymptoms, setAdditionalSymptoms] = useState('');
  const [loading, setLoading] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<AIDiagnosticResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunEvaluation = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/gemini/diagnostic-support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientAge: patient.age,
          patientGender: patient.gender,
          chiefComplaints: complaints,
          symptoms: additionalSymptoms,
          vitals: latestEncounter?.vitals,
          chronicConditions: patient.chronicConditions.join(', '),
          currentMedications: latestEncounter?.prescriptions.map((p) => p.drugName).join(', ') || 'None',
          allergies: patient.allergies.join(', '),
          facilityTier: currentFacility.tier,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setDiagnosticResult(data);
      } else {
        setError('Clinical decision engine returned an unformatted response.');
      }
    } catch (err: any) {
      console.error('CDSS error:', err);
      setError('Unable to contact clinical decision support server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-3xl w-full p-6 space-y-5 my-8 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                AI Clinical Decision Support System (CDSS)
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                  Gemini Flash 3.8
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Assisting physicians during busy consultations across tiered health systems
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Patient Baseline Context Preview */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <span className="text-slate-400 block text-[10px]">Patient</span>
            <strong className="text-slate-800">{patient.name} ({patient.gender[0]}, {patient.age}y)</strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Known Conditions</span>
            <span className="text-slate-800">{patient.chronicConditions[0] || 'None'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Known Allergies</span>
            <span className="text-rose-700 font-semibold">{patient.allergies.join(', ') || 'NKDA'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Current Facility Tier</span>
            <span className="text-indigo-800 font-semibold uppercase">{currentFacility.tier.replace('_', ' ')}</span>
          </div>
        </div>

        {/* Clinical Inputs */}
        <div className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Active Chief Complaints & Symptoms
            </label>
            <input
              type="text"
              value={complaints}
              onChange={(e) => setComplaints(e.target.value)}
              placeholder="e.g. Severe occipital throbbing headache, blurred vision, dizziness"
              className="w-full border border-slate-200 rounded-lg p-2 text-xs"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Additional Bedside Observations or Relevant History
            </label>
            <textarea
              rows={2}
              value={additionalSymptoms}
              onChange={(e) => setAdditionalSymptoms(e.target.value)}
              placeholder="e.g. Recent missed medication doses, pedal edema noted, pregnancy trimester if applicable..."
              className="w-full border border-slate-200 rounded-lg p-2 text-xs"
            />
          </div>

          <button
            onClick={handleRunEvaluation}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-xs hover:opacity-95 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Synthesizing Differential & Guidelines via Gemini...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Clinical Differential Assessment</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs">
            {error}
          </div>
        )}

        {/* Evaluation Output */}
        {diagnosticResult && (
          <div className="space-y-4 pt-2 border-t border-slate-200 text-xs">
            {/* Urgency & Routing Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg">
              <div>
                <span className="text-[10px] text-indigo-700 font-bold uppercase block">Triage Priority</span>
                <span
                  className={`text-sm font-bold uppercase ${
                    diagnosticResult.urgencyTier === 'Emergency'
                      ? 'text-rose-600'
                      : diagnosticResult.urgencyTier === 'Urgent'
                      ? 'text-amber-700'
                      : 'text-emerald-700'
                  }`}
                >
                  {diagnosticResult.urgencyTier}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-indigo-700 font-bold uppercase block">Routing Recommendation</span>
                <span className="text-xs text-indigo-950 font-medium">{diagnosticResult.facilityRoutingAdvice}</span>
              </div>
            </div>

            {/* Differential Diagnoses */}
            <div>
              <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5 text-sm">
                <Stethoscope className="w-4 h-4 text-indigo-600" />
                Differential Diagnoses ({diagnosticResult.differentialDiagnoses.length})
              </h4>
              <div className="space-y-2">
                {diagnosticResult.differentialDiagnoses.map((diff, i) => (
                  <div key={i} className="p-3 rounded-lg border border-slate-200 bg-slate-50/70">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 text-xs">{diff.condition}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded">
                          {diff.icd10}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            diff.probability === 'High'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {diff.probability} Probability
                        </span>
                      </div>
                    </div>
                    <p className="text-slate-600 text-xs">{diff.rationale}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Red Flags & Contraindications */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg space-y-1">
                <strong className="text-rose-900 font-bold flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> Red-Flag Triage Warnings:
                </strong>
                <ul className="list-disc pl-4 space-y-0.5 text-rose-800">
                  {diagnosticResult.redFlags.map((flag, idx) => (
                    <li key={idx}>{flag}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1">
                <strong className="text-amber-900 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Allergy & Drug Interactions:
                </strong>
                <ul className="list-disc pl-4 space-y-0.5 text-amber-800">
                  {diagnosticResult.contraindicationsAndInteractions.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Recommended Workup */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <strong className="text-slate-900 font-bold block mb-1.5">
                Recommended Laboratory & Diagnostic Workup:
              </strong>
              <div className="flex flex-wrap gap-1.5">
                {diagnosticResult.recommendedWorkup.map((test, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-800 font-medium"
                  >
                    ✓ {test}
                  </span>
                ))}
              </div>
            </div>

            {/* Disclaimer */}
            <div className="p-2.5 bg-slate-100 rounded text-[11px] text-slate-500 italic">
              <strong>Medical Disclaimer:</strong> {diagnosticResult.disclaimer}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
