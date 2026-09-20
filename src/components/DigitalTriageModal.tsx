import React, { useState } from 'react';
import {
  X,
  Sparkles,
  AlertTriangle,
  Activity,
  HeartPulse,
  Clock,
  ShieldAlert,
  CheckCircle2,
  Zap,
  Stethoscope,
  Thermometer,
  Loader2,
  ChevronRight,
  ArrowRight,
  Info,
} from 'lucide-react';
import { LongitudinalPatient, Facility, DigitalTriageAssessment, ESITier, VitalsRecord } from '../types';

interface DigitalTriageModalProps {
  patient?: LongitudinalPatient;
  facility: Facility;
  onClose: () => void;
  onTriageCompleted: (assessment: DigitalTriageAssessment, generatedToken: string) => void;
  initialComplaint?: string;
  initialVitals?: {
    systolic?: number;
    diastolic?: number;
    heartRate?: number;
    spo2?: number;
    temperature?: number;
    respiratoryRate?: number;
    bloodGlucose?: number;
  };
}

const COMMON_CHIEF_COMPLAINTS = [
  'Severe crushing retrosternal chest pain radiating to left arm',
  'Acute breathlessness, wheezing, and unable to speak in full sentences',
  'High fever with rigors, stiff neck, and altered sensorium',
  'Severe generalized abdominal pain with guarding and vomiting',
  'Diabetic hyperglycemia with weakness, polyuria, and fruity breath',
  'Third-trimester maternal headache, visual blurring, and elevated BP',
  'Deep laceration with active venous bleeding on forearm',
  'Persistent dry cough for 3 weeks with evening low-grade fever',
  'Routine chronic medication refill and wellness screening',
];

export const DigitalTriageModal: React.FC<DigitalTriageModalProps> = ({
  patient,
  facility,
  onClose,
  onTriageCompleted,
  initialComplaint = '',
  initialVitals = {} as Partial<VitalsRecord>,
}) => {
  const [patientName, setPatientName] = useState(patient?.name || 'Walk-in Patient');
  const [patientAge, setPatientAge] = useState<number>(patient?.age || 42);
  const [patientGender, setPatientGender] = useState<string>(patient?.gender || 'Female');
  const [chiefComplaint, setChiefComplaint] = useState(initialComplaint || (patient?.chronicConditions?.[0] ? `Exacerbation of ${patient.chronicConditions[0]}` : ''));
  const [symptomsDuration, setSymptomsDuration] = useState('2 hours');
  const [painScore, setPainScore] = useState<number>(5);

  // Vitals
  const [systolic, setSystolic] = useState<number>(initialVitals.systolic || 135);
  const [diastolic, setDiastolic] = useState<number>(initialVitals.diastolic || 88);
  const [heartRate, setHeartRate] = useState<number>(initialVitals.heartRate || 86);
  const [spo2, setSpo2] = useState<number>(initialVitals.spo2 || 96);
  const [temperature, setTemperature] = useState<number>(initialVitals.temperature || 37.0);
  const [respiratoryRate, setRespiratoryRate] = useState<number>(initialVitals.respiratoryRate || 18);
  const [bloodGlucose, setBloodGlucose] = useState<number>(initialVitals.bloodGlucose || 140);

  // Evaluation State
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [assessment, setAssessment] = useState<DigitalTriageAssessment | null>(null);
  const [generatedToken, setGeneratedToken] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRunTriage = async () => {
    setIsEvaluating(true);
    setErrorMessage(null);

    const payload = {
      patientName,
      patientAge,
      patientGender,
      chiefComplaint: chiefComplaint || 'Unspecified acute illness',
      symptomsDuration,
      painScore,
      vitals: {
        systolic: Number(systolic),
        diastolic: Number(diastolic),
        heartRate: Number(heartRate),
        spo2: Number(spo2),
        temperature: Number(temperature),
        respiratoryRate: Number(respiratoryRate),
        bloodGlucose: Number(bloodGlucose),
      },
      chronicConditions: patient?.chronicConditions?.join(', ') || 'None',
      facilityTier: facility.tier,
    };

    try {
      const res = await fetch('/api/triage/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      const prefix = data.tokenPrefix || (data.esiTier <= 2 ? 'EMERG' : data.esiTier === 3 ? 'URG' : 'STD');
      const randomNum = Math.floor(10 + Math.random() * 89);
      const token = `${prefix}-${randomNum}`;
      setGeneratedToken(token);

      const evaluatedAssessment: DigitalTriageAssessment = {
        id: `tri_${Date.now()}`,
        patientId: patient?.id || `pat_temp_${Date.now()}`,
        patientName,
        evaluatedAt: new Date().toISOString(),
        esiTier: (data.esiTier || 3) as ESITier,
        urgencyScore: data.urgencyScore || 50,
        priorityCategory: data.priorityCategory || 'Urgent (Yellow)',
        targetWaitMinutes: data.targetWaitMinutes ?? 30,
        chiefComplaint,
        symptomsDuration,
        painScore,
        vitalsSnapshot: {
          systolic: Number(systolic),
          diastolic: Number(diastolic),
          heartRate: Number(heartRate),
          spo2: Number(spo2),
          temperature: Number(temperature),
          respiratoryRate: Number(respiratoryRate),
          bloodGlucose: Number(bloodGlucose),
        },
        criticalRedFlags: data.criticalRedFlags || [],
        immediateBedsideActions: data.immediateBedsideActions || [],
        departmentAllocation: data.departmentAllocation || 'General OPD',
        clinicalReasoning: data.clinicalReasoning || 'Assigned per standard clinical triage algorithms.',
        source: data.source || 'gemini-3.8-flash',
      };

      setAssessment(evaluatedAssessment);
    } catch (err: any) {
      console.error('Triage call failed, using client safety fallback:', err);
      // Fallback
      const isCritical = (spo2 && spo2 < 90) || (systolic && systolic > 180) || painScore >= 8;
      const fallbackEsi: ESITier = isCritical ? 2 : painScore >= 5 ? 3 : 4;
      const fallbackToken = isCritical ? `EMERG-${Math.floor(10 + Math.random() * 89)}` : `URG-${Math.floor(10 + Math.random() * 89)}`;
      setGeneratedToken(fallbackToken);

      const fallbackAssessment: DigitalTriageAssessment = {
        id: `tri_${Date.now()}`,
        patientId: patient?.id || `pat_temp_${Date.now()}`,
        patientName,
        evaluatedAt: new Date().toISOString(),
        esiTier: fallbackEsi,
        urgencyScore: isCritical ? 85 : 55,
        priorityCategory: isCritical ? 'Emergent (Orange)' : 'Urgent (Yellow)',
        targetWaitMinutes: isCritical ? 10 : 30,
        chiefComplaint,
        symptomsDuration,
        painScore,
        vitalsSnapshot: {
          systolic: Number(systolic),
          diastolic: Number(diastolic),
          heartRate: Number(heartRate),
          spo2: Number(spo2),
          temperature: Number(temperature),
          respiratoryRate: Number(respiratoryRate),
          bloodGlucose: Number(bloodGlucose),
        },
        criticalRedFlags: isCritical ? ['Hemodynamic or oxygenation warning'] : [],
        immediateBedsideActions: ['Repeat vital signs in 10 minutes', 'Point-of-care fingerstick blood glucose'],
        departmentAllocation: isCritical ? 'Acute Assessment Bay' : 'General Outpatient Clinic',
        clinicalReasoning: 'Emergency Severity Index protocol calculated from vital biometrics and pain score.',
        source: 'clinical_triage_rules',
      };

      setAssessment(fallbackAssessment);
    } finally {
      setIsEvaluating(false);
    }
  };

  const getEsiBadge = (tier: ESITier) => {
    switch (tier) {
      case 1:
        return {
          label: 'ESI 1 • Resuscitation (Immediate)',
          bg: 'bg-rose-600 text-white border-rose-700',
          dot: 'bg-white animate-ping',
        };
      case 2:
        return {
          label: 'ESI 2 • Emergent (< 10 mins)',
          bg: 'bg-amber-500 text-white border-amber-600',
          dot: 'bg-white',
        };
      case 3:
        return {
          label: 'ESI 3 • Urgent (< 30 mins)',
          bg: 'bg-yellow-400 text-yellow-950 border-yellow-500',
          dot: 'bg-yellow-900',
        };
      case 4:
        return {
          label: 'ESI 4 • Semi-Urgent (< 60 mins)',
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          dot: 'bg-emerald-600',
        };
      case 5:
        return {
          label: 'ESI 5 • Non-Urgent (< 120 mins)',
          bg: 'bg-blue-100 text-blue-800 border-blue-300',
          dot: 'bg-blue-600',
        };
    }
  };

  const handleApply = () => {
    if (assessment) {
      onTriageCompleted(assessment, generatedToken);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-700/60 rounded-xl border border-indigo-400/30">
              <Sparkles className="w-5 h-5 text-indigo-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Digital Triage System</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Gemini API • ESI v4
                </span>
              </div>
              <p className="text-xs text-indigo-200">
                Care prioritization & waiting time optimization for {facility.name} ({facility.tier})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-indigo-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Patient Quick Context */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 font-medium">Patient Name:</span>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="w-full mt-0.5 font-bold text-slate-800 bg-white px-2 py-1 border border-slate-200 rounded text-xs"
              />
            </div>
            <div>
              <span className="text-slate-400 font-medium">Age & Gender:</span>
              <div className="flex items-center gap-2 mt-0.5">
                <input
                  type="number"
                  value={patientAge}
                  onChange={(e) => setPatientAge(Number(e.target.value))}
                  className="w-16 font-semibold text-slate-800 bg-white px-2 py-1 border border-slate-200 rounded text-xs"
                />
                <select
                  value={patientGender}
                  onChange={(e) => setPatientGender(e.target.value)}
                  className="font-semibold text-slate-800 bg-white px-2 py-1 border border-slate-200 rounded text-xs flex-1"
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Facility / Tier:</span>
              <div className="font-semibold text-slate-700 mt-1 truncate">
                {facility.name} ({facility.district})
              </div>
            </div>
          </div>

          {/* Chief Complaint Input & Clinical Shortcuts */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Chief Complaint & Acute Symptoms *
            </label>
            <textarea
              rows={2}
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder="Describe primary symptom, onset, quality, severity, radiation..."
              className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[11px] font-semibold text-slate-500">Quick Clinical Presets:</span>
              {COMMON_CHIEF_COMPLAINTS.slice(0, 4).map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setChiefComplaint(preset)}
                  className="text-[10px] px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 rounded-lg border border-slate-200 transition-colors cursor-pointer text-left truncate max-w-[230px]"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Pain Score & Onset Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-indigo-50/40 p-4 rounded-xl border border-indigo-100">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Pain Score (Wong-Baker Scale):</span>
                </label>
                <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                  painScore >= 8
                    ? 'bg-rose-600 text-white'
                    : painScore >= 5
                    ? 'bg-amber-500 text-white'
                    : 'bg-emerald-600 text-white'
                }`}>
                  {painScore}/10 • {painScore === 0 ? 'No Pain' : painScore <= 3 ? 'Mild' : painScore <= 7 ? 'Moderate' : 'Severe'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={painScore}
                onChange={(e) => setPainScore(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>0 (Comfortable)</span>
                <span>5 (Distressing)</span>
                <span>10 (Unbearable)</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <span>Symptoms Duration / Onset:</span>
              </label>
              <input
                type="text"
                value={symptomsDuration}
                onChange={(e) => setSymptomsDuration(e.target.value)}
                placeholder="e.g. 45 minutes, 3 days, acute sudden onset"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
              />
              <div className="text-[10px] text-slate-500 mt-1">
                Acute onset (&lt; 2 hours) triggers enhanced vigilance in cardiovascular/neurologic algorithms.
              </div>
            </div>
          </div>

          {/* Vitals Biometric Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <HeartPulse className="w-4 h-4 text-rose-500" />
                <span>Bedside Biometric Vitals</span>
              </label>
              <span className="text-[11px] text-slate-500">Live inputs feed the ESI critical safety threshold algorithm</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {/* BP */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400">Systolic (mmHg)</span>
                <input
                  type="number"
                  value={systolic}
                  onChange={(e) => setSystolic(Number(e.target.value))}
                  className={`w-full text-sm font-bold mt-1 px-1.5 py-0.5 rounded border ${
                    systolic > 160 || systolic < 90 ? 'text-rose-700 border-rose-300 bg-rose-50/50' : 'text-slate-800 border-slate-200 bg-white'
                  }`}
                />
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400">Diastolic (mmHg)</span>
                <input
                  type="number"
                  value={diastolic}
                  onChange={(e) => setDiastolic(Number(e.target.value))}
                  className={`w-full text-sm font-bold mt-1 px-1.5 py-0.5 rounded border ${
                    diastolic > 100 || diastolic < 60 ? 'text-rose-700 border-rose-300 bg-rose-50/50' : 'text-slate-800 border-slate-200 bg-white'
                  }`}
                />
              </div>

              {/* HR */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400">Pulse (bpm)</span>
                <input
                  type="number"
                  value={heartRate}
                  onChange={(e) => setHeartRate(Number(e.target.value))}
                  className={`w-full text-sm font-bold mt-1 px-1.5 py-0.5 rounded border ${
                    heartRate > 110 || heartRate < 50 ? 'text-rose-700 border-rose-300 bg-rose-50/50' : 'text-slate-800 border-slate-200 bg-white'
                  }`}
                />
              </div>

              {/* SpO2 */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400">SpO2 (%)</span>
                <input
                  type="number"
                  value={spo2}
                  onChange={(e) => setSpo2(Number(e.target.value))}
                  className={`w-full text-sm font-bold mt-1 px-1.5 py-0.5 rounded border ${
                    spo2 < 93 ? 'text-rose-700 border-rose-300 bg-rose-50/50' : 'text-slate-800 border-slate-200 bg-white'
                  }`}
                />
              </div>

              {/* Temp */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400">Temp (°C)</span>
                <input
                  type="number"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className={`w-full text-sm font-bold mt-1 px-1.5 py-0.5 rounded border ${
                    temperature > 38.0 ? 'text-rose-700 border-rose-300 bg-rose-50/50' : 'text-slate-800 border-slate-200 bg-white'
                  }`}
                />
              </div>

              {/* Resp Rate */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400">RR (/min)</span>
                <input
                  type="number"
                  value={respiratoryRate}
                  onChange={(e) => setRespiratoryRate(Number(e.target.value))}
                  className={`w-full text-sm font-bold mt-1 px-1.5 py-0.5 rounded border ${
                    respiratoryRate > 22 || respiratoryRate < 10 ? 'text-rose-700 border-rose-300 bg-rose-50/50' : 'text-slate-800 border-slate-200 bg-white'
                  }`}
                />
              </div>

              {/* Blood Glucose */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400">Glucose (mg/dL)</span>
                <input
                  type="number"
                  value={bloodGlucose}
                  onChange={(e) => setBloodGlucose(Number(e.target.value))}
                  className={`w-full text-sm font-bold mt-1 px-1.5 py-0.5 rounded border ${
                    bloodGlucose > 200 || bloodGlucose < 70 ? 'text-rose-700 border-rose-300 bg-rose-50/50' : 'text-slate-800 border-slate-200 bg-white'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Action to Run Triage */}
          {!assessment && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleRunTriage}
                disabled={isEvaluating}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isEvaluating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Evaluating Digital Triage via Gemini API...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Run Digital Triage Evaluation</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Triage Assessment Results */}
          {assessment && (
            <div className="space-y-4 pt-2 border-t border-slate-200 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Digital Triage Assessment Result</span>
                </h3>
                <span className="text-[11px] font-mono text-slate-400">
                  Engine: {assessment.source}
                </span>
              </div>

              {/* Primary Triage Score Banner */}
              <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/10 rounded-xl">
                    <Zap className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${getEsiBadge(assessment.esiTier).bg}`}>
                        {getEsiBadge(assessment.esiTier).label}
                      </span>
                      <span className="text-xs text-slate-300 font-semibold">
                        Urgency Score: <strong className="text-white text-sm">{assessment.urgencyScore}/100</strong>
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      Department: <strong className="text-white">{assessment.departmentAllocation}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 border-l border-slate-700 pl-4">
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-slate-400 font-bold block">Assigned Token</span>
                    <span className="text-lg font-black text-amber-400 font-mono">{generatedToken}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-slate-400 font-bold block">Target Wait Time</span>
                    <span className="text-lg font-black text-emerald-400">{assessment.targetWaitMinutes} mins</span>
                  </div>
                </div>
              </div>

              {/* Red Flags & Bedside Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Red Flags */}
                <div className="p-3.5 bg-rose-50/60 rounded-xl border border-rose-200">
                  <h4 className="text-xs font-bold text-rose-900 flex items-center gap-1.5 mb-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>Clinical Red Flags & Risk Alerts</span>
                  </h4>
                  {assessment.criticalRedFlags.length > 0 ? (
                    <ul className="space-y-1">
                      {assessment.criticalRedFlags.map((flag, idx) => (
                        <li key={idx} className="text-xs text-rose-800 flex items-start gap-1.5">
                          <span className="text-rose-500 font-bold">•</span>
                          <span>{flag}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-600">No acute hemodynamic or neurological red flags identified.</p>
                  )}
                </div>

                {/* Immediate Bedside Orders */}
                <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-200">
                  <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5 mb-2">
                    <Stethoscope className="w-4 h-4 text-indigo-600" />
                    <span>Immediate Bedside Triage Directives</span>
                  </h4>
                  {assessment.immediateBedsideActions.length > 0 ? (
                    <ul className="space-y-1">
                      {assessment.immediateBedsideActions.map((action, idx) => (
                        <li key={idx} className="text-xs text-indigo-800 flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-600">Standard vital signs monitoring while awaiting provider.</p>
                  )}
                </div>
              </div>

              {/* Clinical Reasoning */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
                <span className="font-bold text-slate-900">Clinical Triage Rationale: </span>
                {assessment.clinicalReasoning}
              </div>

              {/* Bottom CTAs */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setAssessment(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                >
                  ← Re-evaluate Inputs
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleApply}
                    className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Confirm & Prioritize in Live Queue</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
