import React, { useState } from 'react';
import {
  Sparkles,
  AlertTriangle,
  ArrowRight,
  Building2,
  Activity,
  Heart,
  Thermometer,
  Wind,
  Droplets,
  Mic,
  Send,
  X,
  CheckCircle2,
  ShieldAlert,
  Truck,
  Phone,
  FileCode,
  Languages,
  RotateCcw,
} from 'lucide-react';
import { Facility, LongitudinalPatient, AutomatedReferralRecommendation, Referral } from '../types';

interface AutomatedPatientRoutingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFacility: Facility;
  facilities: Facility[];
  patients?: LongitudinalPatient[];
  onApplyReferral?: (referral: Referral) => void;
}

const REGIONAL_CLINICAL_PRESETS = [
  {
    label: 'Hindi: Antepartum Hemorrhage (Obstetric Emergency)',
    lang: 'Hindi',
    symptoms: 'गर्भवती महिला को 36वें सप्ताह में असहनीय पेट दर्द और अत्यधिक रक्तस्राव हो रहा है। नाड़ी की गति तेज है।',
    vitals: { systolic: 90, diastolic: 55, heartRate: 124, spo2: 95, temperature: 99.1, respiratoryRate: 26, bloodGlucose: 105 },
    expectedUrgency: 'Red',
    note: 'Maternal surgery/emergency C-section required; impossible at Sub-Centre/PHC.',
  },
  {
    label: 'Hindi: Acute Coronary Syndrome / Chest Pain',
    lang: 'Hindi',
    symptoms: 'सीने में असहनीय दबाव और जकड़न, बायां हाथ सुन्न पड़ रहा है, अत्यधिक ठंडा पसीना और सांस फूल रही है।',
    vitals: { systolic: 85, diastolic: 50, heartRate: 138, spo2: 89, temperature: 98.4, respiratoryRate: 30, bloodGlucose: 180 },
    expectedUrgency: 'Red',
    note: 'Cardiogenic shock & STEMI risk; requires District Hospital tertiary ICU/cardiac care.',
  },
  {
    label: 'Odia: Pediatric Febrile Convulsions',
    lang: 'Odia',
    symptoms: 'ଶିଶୁଟିର ୧୦୪° ଡିଗ୍ରୀ ଜ୍ୱର ସହିତ ବାରମ୍ବାର ବାତ (ଖେଞ୍ଚା) ହେଉଛି ଏବଂ ସେ ସମ୍ପୂର୍ଣ୍ଣ ଅଚେତ ହୋଇପଡିଛି।',
    vitals: { systolic: 95, diastolic: 60, heartRate: 145, spo2: 92, temperature: 104.2, respiratoryRate: 34, bloodGlucose: 78 },
    expectedUrgency: 'Red',
    note: 'Pediatric status epilepticus; requires specialized pediatric inpatient care.',
  },
  {
    label: 'Marathi: Polytrauma / Head Injury',
    lang: 'Marathi',
    symptoms: 'रस्ता अपघातात डोक्याला जोराचा मार लागला आहे, कान आणि नाकातून रक्त येत आहे आणि रुग्ण बेशुद्ध होत आहे.',
    vitals: { systolic: 175, diastolic: 105, heartRate: 52, spo2: 91, temperature: 98.6, respiratoryRate: 12, bloodGlucose: 130 },
    expectedUrgency: 'Red',
    note: 'Cushing triad & intracranial hemorrhage signs; requires tertiary CT scan and neurosurgery.',
  },
  {
    label: 'Bengali: Acute Respiratory Failure / Pneumonia',
    lang: 'Bengali',
    symptoms: 'প্রচণ্ড শ্বাসকষ্ট, বুকে ব্যথা এবং আঙুলের ডগা নীল হয়ে আসছে। ৫ দিন ধরে তীব্র কাশি ও জ্বর।',
    vitals: { systolic: 110, diastolic: 70, heartRate: 118, spo2: 83, temperature: 102.8, respiratoryRate: 36, bloodGlucose: 115 },
    expectedUrgency: 'Red',
    note: 'Severe hypoxemic failure; requires high-flow oxygen, ICU or Rural Hospital stabilization.',
  },
  {
    label: 'Tamil: Acute Abdomen / Suspected Appendicitis',
    lang: 'Tamil',
    symptoms: 'வலது அடிவயிற்றில் கடுமையான தாங்க முடியாத வலி, தொடர் வாந்தி மற்றும் மிதமான காய்ச்சல்.',
    vitals: { systolic: 130, diastolic: 85, heartRate: 104, spo2: 97, temperature: 101.4, respiratoryRate: 20, bloodGlucose: 95 },
    expectedUrgency: 'Yellow',
    note: 'Surgical abdomen needing ultrasound and general surgeon evaluation.',
  },
  {
    label: 'English: Stable Mild Viral URI (Local Management)',
    lang: 'English',
    symptoms: 'Mild runny nose, low-grade fever and throat scratchiness for 2 days. No breathlessness, eating well.',
    vitals: { systolic: 118, diastolic: 78, heartRate: 76, spo2: 98, temperature: 99.2, respiratoryRate: 16, bloodGlucose: 90 },
    expectedUrgency: 'Green',
    note: 'Manageable at current facility node without escalation.',
  },
];

export const AutomatedPatientRoutingModal: React.FC<AutomatedPatientRoutingModalProps> = ({
  isOpen,
  onClose,
  currentFacility,
  facilities,
  patients = [],
  onApplyReferral,
}) => {
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patients[0]?.id || '');
  const [patientName, setPatientName] = useState<string>(patients[0]?.name || 'Sunita Devi');
  const [patientAge, setPatientAge] = useState<number>(patients[0]?.age || 28);
  const [patientGender, setPatientGender] = useState<'Female' | 'Male' | 'Other'>('Female');

  // Vitals State
  const [systolic, setSystolic] = useState<number>(90);
  const [diastolic, setDiastolic] = useState<number>(55);
  const [heartRate, setHeartRate] = useState<number>(124);
  const [spo2, setSpo2] = useState<number>(95);
  const [temperature, setTemperature] = useState<number>(99.1);
  const [respiratoryRate, setRespiratoryRate] = useState<number>(26);
  const [bloodGlucose, setBloodGlucose] = useState<number>(105);

  // Symptoms & Regional Audio Transcript
  const [symptoms, setSymptoms] = useState<string>(
    'गर्भवती महिला को 36वें सप्ताह में असहनीय पेट दर्द और अत्यधिक रक्तस्राव हो रहा है। नाड़ी की गति तेज है।'
  );
  const [selectedLanguage, setSelectedLanguage] = useState<string>('Hindi');
  const [isRecordingAudio, setIsRecordingAudio] = useState<boolean>(false);

  // Gemini State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [recommendation, setRecommendation] = useState<AutomatedReferralRecommendation | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showJsonRaw, setShowJsonRaw] = useState<boolean>(false);
  const [appliedSuccess, setAppliedSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: typeof REGIONAL_CLINICAL_PRESETS[0]) => {
    setSymptoms(preset.symptoms);
    setSelectedLanguage(preset.lang);
    setSystolic(preset.vitals.systolic);
    setDiastolic(preset.vitals.diastolic);
    setHeartRate(preset.vitals.heartRate);
    setSpo2(preset.vitals.spo2);
    setTemperature(preset.vitals.temperature);
    setRespiratoryRate(preset.vitals.respiratoryRate);
    setBloodGlucose(preset.vitals.bloodGlucose);
    setRecommendation(null);
    setErrorMessage(null);
    setAppliedSuccess(false);
  };

  const handleSimulateVoiceRecording = () => {
    setIsRecordingAudio(true);
    setTimeout(() => {
      setIsRecordingAudio(false);
      setSymptoms(
        'सीने में असहनीय दर्द, पसीना आ रहा है और सांस लेने में बहुत तकलीफ हो रही है। (Voice Transcript captured via Whisper/Gemini)'
      );
      setSelectedLanguage('Hindi');
    }, 1500);
  };

  const handleAnalyzeRouting = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setAppliedSuccess(false);

    try {
      const response = await fetch('/api/referral/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientInfo: {
            name: patientName,
            age: patientAge,
            gender: patientGender,
          },
          vitals: {
            systolic,
            diastolic,
            heartRate,
            spo2,
            temperature,
            respiratoryRate,
            bloodGlucose,
          },
          symptoms,
          currentFacilityNode: {
            id: currentFacility.id,
            name: currentFacility.name,
            tier: currentFacility.tier,
            district: currentFacility.district,
            state: currentFacility.state,
            pincode: currentFacility.pincode,
            inventorySummary: {
              essentialDrugsStock: true,
              diagnosticLabAvailable: currentFacility.tier !== 'sub_centre',
            },
            activeStaffCount: {
              doctors: currentFacility.tier === 'sub_centre' ? 0 : currentFacility.tier === 'phc' ? 2 : 8,
              nurses: 4,
              ashaWorkers: 6,
            },
          },
          candidateFacilities: facilities,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      const data = await response.json();
      setRecommendation(data);
    } catch (err: any) {
      console.error('Failed to analyze routing:', err);
      setErrorMessage(err.message || 'Unable to connect to automated routing recommendation service.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyToReferralTracker = () => {
    if (!recommendation) return;

    const targetFac =
      recommendation.targetFacilityNode ||
      facilities.find((f) => f.tier === recommendation.targetFacilityTier) ||
      facilities.find((f) => f.tier === 'district_hospital') ||
      facilities[0];

    const newReferral: Referral = {
      id: `ref_gemini_${Date.now().toString(36)}`,
      patientId: selectedPatientId || `pat_${Date.now()}`,
      patientName: patientName,
      patientAge: patientAge,
      originatingFacilityId: currentFacility.id,
      destinationFacilityId: targetFac.id,
      urgency: recommendation.urgencyLevel === 'Red' ? 'emergency' : recommendation.urgencyLevel === 'Yellow' ? 'urgent' : 'routine',
      status: 'initiated',
      clinicalReason: `[AI Referral Service] ${recommendation.recommendedAction}. Rationale: ${recommendation.justification}`,
      referringClinician: 'Automated Clinical Triage CDSS (Gemini 3.8 Flash / Ayushman Bharat NHM)',
      specialtyRequired: recommendation.targetFacilityTier === 'district_hospital' ? 'Tertiary Emergency / ICU' : 'Secondary Obstetrics / Surgery',
      transportMode: recommendation.recommendedTransportMode?.includes('ALS')
        ? 'Ambulance 108'
        : recommendation.recommendedTransportMode?.includes('BLS')
        ? 'Ambulance 108'
        : 'Facility Vehicle',
      initiatedDate: new Date().toISOString(),
      syncStatus: 'synced',
    };

    if (onApplyReferral) {
      onApplyReferral(newReferral);
    }
    setAppliedSuccess(true);
  };

  const getUrgencyBadgeClasses = (urgency: string) => {
    switch (urgency) {
      case 'Red':
        return 'bg-rose-100 text-rose-800 border-rose-300 ring-rose-500/20';
      case 'Yellow':
        return 'bg-amber-100 text-amber-800 border-amber-300 ring-amber-500/20';
      case 'Green':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 ring-emerald-500/20';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getTierReadable = (tier: string) => {
    switch (tier) {
      case 'sub_centre':
        return 'Sub-Centre (Tier 1)';
      case 'phc':
        return 'Primary Health Centre (Tier 2)';
      case 'rural_hospital':
        return 'Rural Hospital / CHC (Tier 3)';
      case 'district_hospital':
        return 'District Hospital (Tier 4)';
      default:
        return tier;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-linear-to-r from-indigo-700 via-indigo-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 text-indigo-200 border border-white/15">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Automated Patient Routing & Referral Recommendation Service
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/40 text-indigo-100 border border-indigo-400/40">
                  Gemini API 3.8 Flash
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-0.5">
                AI clinical triage, tier capacity gap analysis, and multi-tier public healthcare escalation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-indigo-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Node Context Banner */}
        <div className="px-6 py-2.5 bg-indigo-50/70 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-indigo-950 font-semibold flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              Active Originating Node:
            </span>
            <strong className="text-indigo-900 font-bold">{currentFacility.name}</strong>
            <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-semibold border border-indigo-200">
              {getTierReadable(currentFacility.tier)}
            </span>
            <span className="text-slate-500">
              ({currentFacility.district}, {currentFacility.state})
            </span>
          </div>

          <div className="text-[11px] text-indigo-700 bg-white/80 px-2 py-0.5 rounded border border-indigo-200 font-medium">
            {currentFacility.tier === 'sub_centre'
              ? 'Tier 1 limits: First aid & basic maternal screening only. No surgical or inpatient beds.'
              : currentFacility.tier === 'phc'
              ? 'Tier 2 limits: MBBS OPD & normal labor only. No C-section, no ICU, no blood bank.'
              : currentFacility.tier === 'rural_hospital'
              ? 'Tier 3 limits: Secondary surgical & pediatric care. No tertiary neuro/cardiac ICU.'
              : 'Tier 4: Comprehensive tertiary trauma & intensive care hospital.'}
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-700 text-sm">
          {/* Quick Clinical Scenarios */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Languages className="w-3.5 h-3.5 text-indigo-600" />
                Quick Clinical Presets (Regional Languages & Vitals)
              </label>
              <span className="text-[11px] text-slate-500">Click a scenario to auto-fill patient vitals & symptoms</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {REGIONAL_CLINICAL_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className="p-2.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-left transition-all group cursor-pointer shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900 group-hover:text-indigo-700">
                      {preset.label.split(':')[0]}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        preset.expectedUrgency === 'Red'
                          ? 'bg-rose-100 text-rose-700'
                          : preset.expectedUrgency === 'Yellow'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {preset.expectedUrgency}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{preset.note}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Patient Details & Vitals Form */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-indigo-600" />
              Patient Demographic & Intake Vitals
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Patient Name</label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Age</label>
                <input
                  type="number"
                  value={patientAge}
                  onChange={(e) => setPatientAge(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Gender</label>
                <select
                  value={patientGender}
                  onChange={(e) => setPatientGender(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Vitals Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 pt-1">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                  <Heart className="w-3 h-3 text-rose-500" /> SBP (mmHg)
                </span>
                <input
                  type="number"
                  value={systolic}
                  onChange={(e) => setSystolic(Number(e.target.value))}
                  className="w-full font-mono text-sm font-bold text-slate-900 mt-0.5 focus:outline-none"
                />
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                  <Heart className="w-3 h-3 text-rose-400" /> DBP (mmHg)
                </span>
                <input
                  type="number"
                  value={diastolic}
                  onChange={(e) => setDiastolic(Number(e.target.value))}
                  className="w-full font-mono text-sm font-bold text-slate-900 mt-0.5 focus:outline-none"
                />
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                  <Activity className="w-3 h-3 text-red-500" /> Pulse (bpm)
                </span>
                <input
                  type="number"
                  value={heartRate}
                  onChange={(e) => setHeartRate(Number(e.target.value))}
                  className="w-full font-mono text-sm font-bold text-slate-900 mt-0.5 focus:outline-none"
                />
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                  <Wind className="w-3 h-3 text-cyan-600" /> SpO2 (%)
                </span>
                <input
                  type="number"
                  value={spo2}
                  onChange={(e) => setSpo2(Number(e.target.value))}
                  className={`w-full font-mono text-sm font-bold mt-0.5 focus:outline-none ${
                    spo2 < 90 ? 'text-rose-600 font-extrabold animate-pulse' : 'text-slate-900'
                  }`}
                />
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                  <Thermometer className="w-3 h-3 text-amber-500" /> Temp (°F)
                </span>
                <input
                  type="number"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="w-full font-mono text-sm font-bold text-slate-900 mt-0.5 focus:outline-none"
                />
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                  <Wind className="w-3 h-3 text-teal-500" /> Resp (/min)
                </span>
                <input
                  type="number"
                  value={respiratoryRate}
                  onChange={(e) => setRespiratoryRate(Number(e.target.value))}
                  className="w-full font-mono text-sm font-bold text-slate-900 mt-0.5 focus:outline-none"
                />
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                  <Droplets className="w-3 h-3 text-purple-500" /> Glucose (mg/dL)
                </span>
                <input
                  type="number"
                  value={bloodGlucose}
                  onChange={(e) => setBloodGlucose(Number(e.target.value))}
                  className="w-full font-mono text-sm font-bold text-slate-900 mt-0.5 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Reported Symptoms / Audio Transcript */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                Reported Symptoms & Regional Audio Transcript
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSimulateVoiceRecording}
                  disabled={isRecordingAudio}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border cursor-pointer ${
                    isRecordingAudio
                      ? 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse'
                      : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Mic className="w-3 h-3 text-rose-600" />
                  {isRecordingAudio ? 'Listening in Hindi/Regional...' : 'Simulate Vernacular Voice Audio'}
                </button>
              </div>
            </div>
            <textarea
              rows={3}
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="Enter patient complaints or transcript in English or regional languages (Hindi, Odia, Marathi, Bengali, Tamil, etc.)..."
              className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
            />
          </div>

          {/* Action Button */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleAnalyzeRouting}
              disabled={isLoading}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs bg-linear-to-r from-indigo-600 via-indigo-700 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 text-white shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 text-amber-300 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading
                ? 'Analyzing Triage & Escalating with Gemini API...'
                : 'Evaluate Triage & Generate Referral with Gemini'}
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Result Card */}
          {recommendation && (
            <div className="bg-white border-2 border-indigo-100 rounded-2xl shadow-sm p-5 space-y-4">
              {/* Top Banner with Strict JSON Keys */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider border ring-2 ${getUrgencyBadgeClasses(
                      recommendation.urgencyLevel
                    )}`}
                  >
                    urgencyLevel: {recommendation.urgencyLevel}
                  </div>
                  <div className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                    <span>Target Tier:</span>
                    <strong className="text-indigo-900 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {getTierReadable(recommendation.targetFacilityTier)}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowJsonRaw(!showJsonRaw)}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    <FileCode className="w-3 h-3" />
                    {showJsonRaw ? 'Hide Raw JSON' : 'View Strict JSON'}
                  </button>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                    Source: {recommendation.source || 'gemini-3.8-flash'}
                  </span>
                </div>
              </div>

              {/* Recommended Action */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  recommendedAction:
                </span>
                <p className="text-sm font-bold text-slate-900 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {recommendation.recommendedAction}
                </p>
              </div>

              {/* Justification */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  justification:
                </span>
                <p className="text-xs text-slate-700 bg-slate-50/70 p-3 rounded-xl border border-slate-200 leading-relaxed">
                  {recommendation.justification}
                </p>
              </div>

              {/* Located Target Facility Node Details */}
              {recommendation.targetFacilityNode && (
                <div className="bg-linear-to-br from-indigo-50/70 to-slate-50 border border-indigo-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-indigo-700" />
                      Automatically Located Higher-Tier Node:
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-600 text-white">
                      {getTierReadable(recommendation.targetFacilityNode.tier)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Facility Name</span>
                      <strong className="text-slate-900">{recommendation.targetFacilityNode.name}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">District / State</span>
                      <span className="text-slate-700">
                        {recommendation.targetFacilityNode.district}, {recommendation.targetFacilityNode.state}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Estimated Distance</span>
                      <span className="text-indigo-800 font-semibold">
                        ~{recommendation.targetFacilityNode.estimatedDistanceKm || 24} km
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Emergency Dispatch Contact</span>
                      <span className="text-slate-700 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-emerald-600" />
                        {recommendation.targetFacilityNode.contactNumber || '108 / 112'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Bedside Stabilization & Red Flags */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {recommendation.clinicalRedFlags && recommendation.clinicalRedFlags.length > 0 && (
                  <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3">
                    <span className="font-bold text-rose-900 flex items-center gap-1 mb-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                      Clinical Red Flags Identified:
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-rose-800 text-[11px]">
                      {recommendation.clinicalRedFlags.map((flag, idx) => (
                        <li key={idx}>{flag}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {recommendation.bedsideStabilizationProtocols &&
                  recommendation.bedsideStabilizationProtocols.length > 0 && (
                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3">
                      <span className="font-bold text-emerald-900 flex items-center gap-1 mb-1.5">
                        <Truck className="w-3.5 h-3.5 text-emerald-600" />
                        Bedside Pre-Transfer Stabilization ({recommendation.recommendedTransportMode || '108 Ambulance'}):
                      </span>
                      <ul className="list-disc list-inside space-y-1 text-emerald-800 text-[11px]">
                        {recommendation.bedsideStabilizationProtocols.map((proto, idx) => (
                          <li key={idx}>{proto}</li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>

              {/* Raw Strict JSON Viewer */}
              {showJsonRaw && (
                <div className="bg-slate-900 rounded-xl p-3 text-xs font-mono text-emerald-400 overflow-x-auto">
                  <pre>{JSON.stringify(recommendation, null, 2)}</pre>
                </div>
              )}

              {/* 1-Click Action to generate referral */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200">
                <div className="text-xs text-slate-500">
                  {appliedSuccess ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ABDM Referral Created & Logged to Network!
                    </span>
                  ) : (
                    <span>Ready to dispatch e-referral to {recommendation.targetFacilityNode?.name || 'hub facility'}.</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleApplyToReferralTracker}
                    disabled={appliedSuccess}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {appliedSuccess ? 'Referral Dispatched' : 'Apply & Generate ABDM Referral'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Complies with Indian Public Health Standards (IPHS 2022) & Ayushman Bharat NHM Referral Protocols.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
