import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  User,
  Heart,
  Calendar,
  AlertTriangle,
  FileText,
  PlusCircle,
  Sparkles,
  ShieldCheck,
  Building2,
  TrendingUp,
  Stethoscope,
  Pill,
  Lock,
  FlaskConical,
  Camera,
  Barcode,
  CheckCircle,
  Search,
  ArrowUpDown,
  Filter,
  ArrowUpRight,
  Activity,
  Scissors,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  Truck,
  RotateCcw,
  SlidersHorizontal,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import {
  LongitudinalPatient,
  ClinicalEncounter,
  Facility,
  VitalsRecord,
  DiagnosticOrder,
  Referral,
  FacilityTier,
} from '../types';

interface LongitudinalRecordViewProps {
  patients: LongitudinalPatient[];
  selectedPatient: LongitudinalPatient;
  onSelectPatient: (patient: LongitudinalPatient) => void;
  encounters: ClinicalEncounter[];
  currentFacility: Facility;
  onAddEncounter: (newEncounter: ClinicalEncounter) => void;
  onOpenAIDiagnostics: (patient: LongitudinalPatient) => void;
  e2eeEnabled: boolean;
  diagnosticOrders?: DiagnosticOrder[];
  referrals?: Referral[];
  onNavigateToDiagnostics?: () => void;
}

export type TimelineCategory =
  | 'all'
  | 'encounter'
  | 'surgery'
  | 'prescription'
  | 'diagnostic'
  | 'referral';

export type SortOrder = 'newest_first' | 'oldest_first';

export interface UnifiedTimelineItem {
  id: string;
  category: 'encounter' | 'surgery' | 'prescription' | 'diagnostic' | 'referral';
  date: string;
  facilityName: string;
  facilityTier: FacilityTier;
  title: string;
  subtitle?: string;
  providerName?: string;
  providerRole?: string;
  badgeLabel: string;
  badgeColorClass: string;
  iconType: 'encounter' | 'surgery' | 'prescription' | 'diagnostic' | 'referral';
  urgency?: string;
  vitals?: VitalsRecord;
  diagnoses?: Array<{ code: string; description: string }>;
  prescriptionsList?: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: number;
    instructions: string;
    dispensed: string;
  }>;
  diagnosticData?: {
    testCode: string;
    sampleBarCode: string;
    specimenType: string;
    priority: string;
    status: string;
    results?: Array<{ parameter: string; value: any; unit: string; referenceRange: string; flag: string }>;
    notes?: string;
    imagingFindings?: any;
    modalityType?: string;
  };
  referralData?: {
    origin: string;
    destination: string;
    transportMode: string;
    urgency: string;
    status: string;
    specialty: string;
    reason: string;
    triageNotes?: string;
    counterNotes?: string;
  };
  soap?: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
  encryptedHash: string;
  syncStatus: string;
}

const TIER_META: Record<FacilityTier, { label: string; short: string; color: string; badge: string }> = {
  sub_centre: {
    label: 'Sub-Centre / Ayushman Arogya Mandir',
    short: 'Sub-Centre (HWC)',
    color: 'border-emerald-500 bg-emerald-50 text-emerald-800',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  phc: {
    label: 'Primary Health Centre',
    short: 'PHC Clinic & Labs',
    color: 'border-sky-500 bg-sky-50 text-sky-800',
    badge: 'bg-sky-100 text-sky-800 border-sky-200',
  },
  rural_hospital: {
    label: 'Community / Rural Hospital (CHC)',
    short: 'CHC / Secondary',
    color: 'border-indigo-500 bg-indigo-50 text-indigo-800',
    badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  },
  district_hospital: {
    label: 'District Headquarters Hospital',
    short: 'District Hospital & Surgeries',
    color: 'border-purple-500 bg-purple-50 text-purple-800',
    badge: 'bg-purple-100 text-purple-800 border-purple-200',
  },
};

export const LongitudinalRecordView: React.FC<LongitudinalRecordViewProps> = ({
  patients,
  selectedPatient,
  onSelectPatient,
  encounters,
  currentFacility,
  onAddEncounter,
  onOpenAIDiagnostics,
  e2eeEnabled,
  diagnosticOrders = [],
  referrals = [],
  onNavigateToDiagnostics,
}) => {
  // Chart metric
  const [activeChartMetric, setActiveChartMetric] = useState<'bp' | 'glucose' | 'spo2_bmi'>('bp');
  const [showVitalsChart, setShowVitalsChart] = useState(false);
  const [showAddEncounterModal, setShowAddEncounterModal] = useState(false);

  // Filtering & Sorting State
  const [selectedCategory, setSelectedCategory] = useState<TimelineCategory>('all');
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest_first');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItemIds, setExpandedItemIds] = useState<Record<string, boolean>>({});

  // Form state for new encounter
  const [newChiefComplaint, setNewChiefComplaint] = useState('');
  const [newSystolic, setNewSystolic] = useState('130');
  const [newDiastolic, setNewDiastolic] = useState('84');
  const [newHeartRate, setNewHeartRate] = useState('76');
  const [newGlucose, setNewGlucose] = useState('140');
  const [newSpo2, setNewSpo2] = useState('98');
  const [newTemp, setNewTemp] = useState('36.8');
  const [newWeight, setNewWeight] = useState('65');
  const [newHeight, setNewHeight] = useState('156');
  const [soapSubjective, setSoapSubjective] = useState('');
  const [soapObjective, setSoapObjective] = useState('');
  const [soapAssessment, setSoapAssessment] = useState('');
  const [soapPlan, setSoapPlan] = useState('');
  const [icdCode, setIcdCode] = useState('I10');
  const [icdDesc, setIcdDesc] = useState('Essential hypertension');
  const [prescriptionDrug, setPrescriptionDrug] = useState('Amlodipine Besylate 5mg');

  // Filter raw data for current patient
  const patientEncounters = encounters
    .filter((e) => e.patientId === selectedPatient.id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const patientDiagnostics = diagnosticOrders.filter((o) => o.patientId === selectedPatient.id);
  const patientReferrals = referrals.filter((r) => r.patientId === selectedPatient.id);

  // Prepare chart data
  const chartData = patientEncounters.map((enc) => ({
    date: new Date(enc.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    facility: enc.facilityName.split(' ')[0],
    systolic: enc.vitals?.systolic ?? 120,
    diastolic: enc.vitals?.diastolic ?? 80,
    glucose: enc.vitals?.bloodGlucose ?? 110,
    spo2: enc.vitals?.spo2 ?? 98,
    bmi: enc.vitals?.bmi ?? 24,
    heartRate: enc.vitals?.heartRate ?? 72,
  }));

  // Build Unified Timeline Event Stream
  const unifiedTimeline: UnifiedTimelineItem[] = useMemo(() => {
    const items: UnifiedTimelineItem[] = [];

    // 1. Process Clinical Encounters (Separate regular encounters from Surgeries/Inpatient)
    patientEncounters.forEach((enc) => {
      const isSurgery =
        enc.encounterType === 'inpatient' ||
        enc.chiefComplaint.toLowerCase().includes('surgery') ||
        enc.chiefComplaint.toLowerCase().includes('cholecystectomy') ||
        enc.chiefComplaint.toLowerCase().includes('section') ||
        enc.chiefComplaint.toLowerCase().includes('operation') ||
        enc.chiefComplaint.toLowerCase().includes('lscs') ||
        enc.chiefComplaint.toLowerCase().includes('debridement');

      items.push({
        id: enc.id,
        category: isSurgery ? 'surgery' : 'encounter',
        date: enc.date,
        facilityName: enc.facilityName,
        facilityTier: enc.facilityTier,
        title: isSurgery ? `Surgical Intervention: ${enc.chiefComplaint}` : enc.chiefComplaint,
        subtitle: isSurgery ? 'Inpatient Surgical Ward / Operation Theatre' : `Consultation (${enc.encounterType})`,
        providerName: enc.providerName,
        providerRole: enc.providerRole,
        badgeLabel: isSurgery ? 'SURGERY / PROCEDURAL' : enc.encounterType.toUpperCase(),
        badgeColorClass: isSurgery ? 'bg-purple-100 text-purple-900 border-purple-200' : 'bg-blue-100 text-blue-800 border-blue-200',
        iconType: isSurgery ? 'surgery' : 'encounter',
        vitals: enc.vitals,
        diagnoses: enc.icd10Diagnoses,
        prescriptionsList: enc.prescriptions.map((p) => ({
          name: p.drugName,
          dosage: p.dosage,
          frequency: p.frequency,
          duration: p.durationDays,
          instructions: p.instructions,
          dispensed: p.dispensedStatus,
        })),
        soap: enc.soap,
        encryptedHash: enc.encryptedHash,
        syncStatus: enc.syncStatus,
      });

      // Also create distinct Prescription events if prescriptions were dispensed
      if (enc.prescriptions && enc.prescriptions.length > 0) {
        enc.prescriptions.forEach((rx, idx) => {
          items.push({
            id: `${enc.id}_rx_${idx}`,
            category: 'prescription',
            date: enc.date,
            facilityName: enc.facilityName,
            facilityTier: enc.facilityTier,
            title: `Prescription: ${rx.drugName} (${rx.dosage})`,
            subtitle: `${rx.frequency} • Course: ${rx.durationDays} Days`,
            providerName: enc.providerName,
            providerRole: enc.providerRole,
            badgeLabel: rx.dispensedStatus.toUpperCase(),
            badgeColorClass:
              rx.dispensedStatus === 'dispensed'
                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                : 'bg-amber-100 text-amber-800 border-amber-200',
            iconType: 'prescription',
            prescriptionsList: [
              {
                name: rx.drugName,
                dosage: rx.dosage,
                frequency: rx.frequency,
                duration: rx.durationDays,
                instructions: rx.instructions,
                dispensed: rx.dispensedStatus,
              },
            ],
            encryptedHash: enc.encryptedHash,
            syncStatus: enc.syncStatus,
          });
        });
      }
    });

    // 2. Process Diagnostic Orders & Lab Tests
    patientDiagnostics.forEach((diag) => {
      const isRadiology = diag.category === 'radiology';
      const facilityTier = diag.orderingFacilityId.includes('sub')
        ? 'sub_centre'
        : diag.orderingFacilityId.includes('phc')
        ? 'phc'
        : diag.orderingFacilityId.includes('rh')
        ? 'rural_hospital'
        : 'district_hospital';

      items.push({
        id: diag.id,
        category: 'diagnostic',
        date: diag.completedDate || diag.orderedDate,
        facilityName: diag.processingFacilityName || diag.orderingFacilityName || 'Network Laboratory Facility',
        facilityTier: facilityTier,
        title: `${isRadiology ? 'Imaging Scan' : 'Lab Test'}: ${diag.testName}`,
        subtitle: `${diag.category.toUpperCase()} • Priority: ${diag.priority.toUpperCase()}`,
        providerName: diag.orderedBy,
        providerRole: 'Ordering Practitioner',
        badgeLabel: diag.status.replace('_', ' ').toUpperCase(),
        badgeColorClass:
          diag.status === 'completed'
            ? 'bg-cyan-100 text-cyan-800 border-cyan-200'
            : diag.status === 'critical'
            ? 'bg-rose-100 text-rose-800 border-rose-300 font-bold animate-pulse'
            : 'bg-amber-100 text-amber-800 border-amber-200',
        iconType: 'diagnostic',
        urgency: diag.priority,
        diagnosticData: {
          testCode: diag.testCode,
          sampleBarCode: diag.sampleBarCode,
          specimenType: diag.specimenType,
          priority: diag.priority,
          status: diag.status,
          results: diag.results,
          notes: diag.pathologistNotes,
          imagingFindings: diag.imagingFindings,
          modalityType: diag.modalityType,
        },
        encryptedHash: `sha256-diag-${diag.id}`,
        syncStatus: diag.syncStatus,
      });
    });

    // 3. Process Inter-Tier Referrals & Transfers
    patientReferrals.forEach((ref) => {
      const originTier = ref.originatingFacilityId.includes('sub')
        ? 'sub_centre'
        : ref.originatingFacilityId.includes('phc')
        ? 'phc'
        : 'rural_hospital';

      items.push({
        id: ref.id,
        category: 'referral',
        date: ref.initiatedDate,
        facilityName: `${ref.originatingFacilityId.split('_').slice(1).join(' ').toUpperCase()} → ${ref.destinationFacilityId.split('_').slice(1).join(' ').toUpperCase()}`,
        facilityTier: originTier,
        title: `Inter-Tier Transfer: ${ref.specialtyRequired}`,
        subtitle: `Transport: ${ref.transportMode} • Priority: ${ref.urgency.toUpperCase()}`,
        providerName: ref.referringClinician,
        providerRole: 'Referring Clinician',
        badgeLabel: ref.status.replace('_', ' ').toUpperCase(),
        badgeColorClass:
          ref.urgency === 'emergency'
            ? 'bg-rose-100 text-rose-800 border-rose-200 font-bold'
            : 'bg-amber-100 text-amber-800 border-amber-200',
        iconType: 'referral',
        urgency: ref.urgency,
        referralData: {
          origin: ref.originatingFacilityId,
          destination: ref.destinationFacilityId,
          transportMode: ref.transportMode,
          urgency: ref.urgency,
          status: ref.status,
          specialty: ref.specialtyRequired,
          reason: ref.clinicalReason,
          triageNotes: ref.triageNotes,
          counterNotes: ref.counterReferralNotes,
        },
        encryptedHash: `sha256-ref-${ref.id}`,
        syncStatus: ref.syncStatus,
      });
    });

    return items;
  }, [patientEncounters, patientDiagnostics, patientReferrals]);

  // Filtering & Sorting
  const filteredTimeline = useMemo(() => {
    let result = [...unifiedTimeline];

    // Filter by category
    if (selectedCategory !== 'all') {
      result = result.filter((item) => item.category === selectedCategory);
    }

    // Filter by facility tier
    if (selectedTierFilter !== 'all') {
      result = result.filter((item) => item.facilityTier === selectedTierFilter);
    }

    // Filter by search query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter((item) => {
        return (
          item.title.toLowerCase().includes(q) ||
          (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
          item.facilityName.toLowerCase().includes(q) ||
          (item.providerName && item.providerName.toLowerCase().includes(q)) ||
          (item.diagnoses && item.diagnoses.some((d) => d.code.toLowerCase().includes(q) || d.description.toLowerCase().includes(q))) ||
          (item.prescriptionsList && item.prescriptionsList.some((p) => p.name.toLowerCase().includes(q))) ||
          (item.soap && (
            item.soap.subjective.toLowerCase().includes(q) ||
            item.soap.objective.toLowerCase().includes(q) ||
            item.soap.assessment.toLowerCase().includes(q) ||
            item.soap.plan.toLowerCase().includes(q)
          ))
        );
      });
    }

    // Sort by date
    result.sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      return sortOrder === 'newest_first' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [unifiedTimeline, selectedCategory, selectedTierFilter, searchQuery, sortOrder]);

  // Toggle item expanded state
  const toggleExpand = (id: string) => {
    setExpandedItemIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    filteredTimeline.forEach((item) => {
      next[item.id] = true;
    });
    setExpandedItemIds(next);
  };

  const collapseAll = () => {
    setExpandedItemIds({});
  };

  // Check unique facility tiers visited by patient
  const patientTiersVisited = useMemo(() => {
    const set = new Set<FacilityTier>();
    unifiedTimeline.forEach((item) => set.add(item.facilityTier));
    return set;
  }, [unifiedTimeline]);

  // Counts for category badges
  const categoryCounts = useMemo(() => {
    const counts = {
      all: unifiedTimeline.length,
      encounter: 0,
      surgery: 0,
      prescription: 0,
      diagnostic: 0,
      referral: 0,
    };
    unifiedTimeline.forEach((item) => {
      if (item.category in counts) {
        counts[item.category as keyof typeof counts]++;
      }
    });
    return counts;
  }, [unifiedTimeline]);

  // Save new encounter
  const handleSaveEncounter = (e: React.FormEvent) => {
    e.preventDefault();
    const wt = parseFloat(newWeight) || 65;
    const htM = (parseFloat(newHeight) || 156) / 100;
    const calculatedBmi = parseFloat((wt / (htM * htM)).toFixed(1));

    const encounterDate = new Date().toISOString();
    const newEncounter: ClinicalEncounter = {
      id: `enc_${Date.now().toString(36)}`,
      patientId: selectedPatient.id,
      facilityId: currentFacility.id,
      facilityName: currentFacility.name,
      facilityTier: currentFacility.tier,
      providerName: 'Current Attending Practitioner',
      providerRole: 'Clinical Staff',
      date: encounterDate,
      encounterType: currentFacility.tier === 'sub_centre' ? 'field_visit' : 'outpatient',
      chiefComplaint: newChiefComplaint || 'Routine health evaluation & vitals surveillance',
      vitals: {
        timestamp: encounterDate,
        facilityId: currentFacility.id,
        facilityName: currentFacility.name,
        systolic: parseInt(newSystolic, 10) || 120,
        diastolic: parseInt(newDiastolic, 10) || 80,
        heartRate: parseInt(newHeartRate, 10) || 72,
        temperature: parseFloat(newTemp) || 36.6,
        spo2: parseInt(newSpo2, 10) || 98,
        bloodGlucose: parseInt(newGlucose, 10) || 110,
        respiratoryRate: 16,
        weightKg: wt,
        heightCm: parseFloat(newHeight) || 156,
        bmi: calculatedBmi,
      },
      soap: {
        subjective: soapSubjective || 'Patient evaluated for longitudinal continuity.',
        objective: soapObjective || `BP ${newSystolic}/${newDiastolic} mmHg. SpO2 ${newSpo2}%.`,
        assessment: soapAssessment || 'Condition monitored under continuous multi-facility protocol.',
        plan: soapPlan || 'Continue prescribed regimen. Follow-up as scheduled.',
      },
      icd10Diagnoses: [{ code: icdCode, description: icdDesc, type: 'primary' }],
      prescriptions: prescriptionDrug
        ? [
            {
              id: `rx_${Date.now()}`,
              drugName: prescriptionDrug,
              dosage: 'Standard Therapeutic Dose',
              frequency: 'Once Daily',
              durationDays: 30,
              instructions: 'Take as directed with water.',
              dispensedStatus: 'pending',
            },
          ]
        : [],
      encryptedHash: `sha256-aes256-${Date.now().toString(16)}...`,
      syncStatus: 'pending',
      version: 1,
    };

    onAddEncounter(newEncounter);
    setShowAddEncounterModal(false);
    setNewChiefComplaint('');
    setSoapSubjective('');
    setSoapObjective('');
    setSoapAssessment('');
    setSoapPlan('');
  };

  const isFiltered =
    selectedCategory !== 'all' ||
    selectedTierFilter !== 'all' ||
    searchQuery.trim() !== '' ||
    sortOrder !== 'newest_first';

  const resetFilters = () => {
    setSelectedCategory('all');
    setSelectedTierFilter('all');
    setSearchQuery('');
    setSortOrder('newest_first');
  };

  return (
    <div className="space-y-6">
      {/* Patient Selector Strip */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
              Select Longitudinal Patient Record
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {patients.length} Active Records Across Healthcare Continuum
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {patients.map((pat) => {
            const isSelected = pat.id === selectedPatient.id;
            return (
              <button
                key={pat.id}
                onClick={() => onSelectPatient(pat)}
                className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="font-bold text-slate-900 text-sm">{pat.name}</span>
                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                    {pat.gender[0]}, {pat.age}y
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-500 mt-1">
                  {pat.nationalHealthId}
                </div>
                <div className="text-[11px] text-slate-600 truncate mt-1">
                  {pat.chronicConditions[0] || 'No chronic conditions logged'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Patient Master Card & Continuum of Care Tracker */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {selectedPatient.name}
              </h2>
              <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-800 font-bold">
                {selectedPatient.nationalHealthId}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                ABHA Consent Granted
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
              <span>
                <strong className="text-slate-900">Demographics:</strong> {selectedPatient.gender}, {selectedPatient.age} years (DOB: {selectedPatient.dob})
              </span>
              <span>
                <strong className="text-slate-900">Blood Group:</strong> {selectedPatient.bloodGroup}
              </span>
              <span>
                <strong className="text-slate-900">Domicile:</strong> {selectedPatient.villageOrCity}, {selectedPatient.district}
              </span>
              <span>
                <strong className="text-slate-900">Registered Facility:</strong> {selectedPatient.primaryFacilityId.replace('fac_', '').replace('_', ' ').toUpperCase()}
              </span>
            </div>

            {selectedPatient.insuranceScheme && (
              <div className="text-xs text-indigo-700 font-medium">
                Health Scheme: <strong>{selectedPatient.insuranceScheme}</strong>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setShowVitalsChart(!showVitalsChart)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs cursor-pointer transition-colors"
            >
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span>{showVitalsChart ? 'Hide Biometrics Chart' : 'View Vitals Trendline'}</span>
            </button>
            <button
              onClick={() => onOpenAIDiagnostics(selectedPatient)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>AI Diagnostic CDSS</span>
            </button>
            <button
              onClick={() => setShowAddEncounterModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Record Encounter</span>
            </button>
          </div>
        </div>

        {/* Facility Continuum of Care Tracker (Inter-tier Pathway) */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              Public Healthcare Tier Continuum & Care Mobility
            </span>
            <span className="text-[11px] text-slate-500">
              Cross-facility longitudinal sync active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {(['sub_centre', 'phc', 'rural_hospital', 'district_hospital'] as FacilityTier[]).map((tier, idx) => {
              const visited = patientTiersVisited.has(tier);
              const meta = TIER_META[tier];
              return (
                <div
                  key={tier}
                  className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all ${
                    visited
                      ? `${meta.badge} shadow-xs`
                      : 'border-slate-200 bg-slate-50/50 text-slate-400 opacity-60'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      visited ? 'bg-white shadow-xs' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-xs font-bold truncate leading-tight">
                      {meta.short}
                    </span>
                    <span className="block text-[10px] opacity-80 truncate">
                      {visited ? 'Records on File' : 'No Visits Logged'}
                    </span>
                  </div>
                  {visited && <CheckCircle className="w-3.5 h-3.5 shrink-0 text-current" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Safety & Allergy Alerts Banner */}
        <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Documented Drug Allergies:</strong>
              {selectedPatient.allergies.length > 0 ? (
                <span className="font-semibold text-rose-800">
                  {selectedPatient.allergies.join(', ')}
                </span>
              ) : (
                <span className="text-rose-600">No known drug allergies reported (NKDA)</span>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
            <Heart className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Chronic Disease Registry:</strong>
              <span className="font-semibold text-amber-800">
                {selectedPatient.chronicConditions.join(' • ')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Biometrics Trendline Chart */}
      {showVitalsChart && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                Longitudinal Health Trends Across Facilities Over Time
              </h3>
              <p className="text-xs text-slate-500">
                Aggregated biometrics across Sub-centres, PHCs, and District Hospitals
              </p>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveChartMetric('bp')}
                className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                  activeChartMetric === 'bp'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Blood Pressure
              </button>
              <button
                onClick={() => setActiveChartMetric('glucose')}
                className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                  activeChartMetric === 'glucose'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Blood Glucose
              </button>
              <button
                onClick={() => setActiveChartMetric('spo2_bmi')}
                className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                  activeChartMetric === 'spo2_bmi'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                SpO2 & BMI
              </button>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />

                {activeChartMetric === 'bp' && (
                  <>
                    <Line
                      type="monotone"
                      dataKey="systolic"
                      name="Systolic BP (mmHg)"
                      stroke="#e11d48"
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="diastolic"
                      name="Diastolic BP (mmHg)"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="heartRate"
                      name="Heart Rate (bpm)"
                      stroke="#10b981"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                    />
                  </>
                )}

                {activeChartMetric === 'glucose' && (
                  <Line
                    type="monotone"
                    dataKey="glucose"
                    name="Random / Fasting Glucose (mg/dL)"
                    stroke="#d97706"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                  />
                )}

                {activeChartMetric === 'spo2_bmi' && (
                  <>
                    <Line
                      type="monotone"
                      dataKey="spo2"
                      name="Oxygen Saturation SpO2 (%)"
                      stroke="#0284c7"
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="bmi"
                      name="Body Mass Index (BMI)"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Main Longitudinal Timeline Header & Filter Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              <span>Vertical Chronological Medical History</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {filteredTimeline.length} Events
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive medical history tracking patient movements across Sub-Centres, PHCs, and District Hospitals
            </p>
          </div>

          {/* Sort Order Toggle & Expand/Collapse All */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSortOrder(sortOrder === 'newest_first' ? 'oldest_first' : 'newest_first')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <span>{sortOrder === 'newest_first' ? 'Newest First (↓)' : 'Oldest First (↑)'}</span>
            </button>

            <button
              onClick={expandAll}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium cursor-pointer"
              title="Expand all timeline cards"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium cursor-pointer"
              title="Collapse all timeline cards"
            >
              Collapse
            </button>
          </div>
        </div>

        {/* Filter Toolbar: Search Bar + Event Category Pills + Facility Tier Filter */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Quick Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search diagnoses, medications, lab tests, surgical notes, facilities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50"
            />
          </div>

          {/* Facility Tier Dropdown Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 whitespace-nowrap flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              Facility Tier:
            </label>
            <select
              value={selectedTierFilter}
              onChange={(e) => setSelectedTierFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            >
              <option value="all">All Facility Tiers</option>
              <option value="sub_centre">Sub-Centre / Ayushman Arogya Mandir</option>
              <option value="phc">Primary Health Centre (PHC)</option>
              <option value="rural_hospital">Community / Rural Hospital (CHC)</option>
              <option value="district_hospital">District Headquarters Hospital</option>
            </select>
          </div>
        </div>

        {/* Event Category Tabs / Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold cursor-pointer whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>All Events</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-white/20">
              {categoryCounts.all}
            </span>
          </button>

          <button
            onClick={() => setSelectedCategory('encounter')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold cursor-pointer whitespace-nowrap transition-colors ${
              selectedCategory === 'encounter'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Encounters</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-black/10">
              {categoryCounts.encounter}
            </span>
          </button>

          <button
            onClick={() => setSelectedCategory('surgery')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold cursor-pointer whitespace-nowrap transition-colors ${
              selectedCategory === 'surgery'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Surgeries & Inpatient</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-black/10">
              {categoryCounts.surgery}
            </span>
          </button>

          <button
            onClick={() => setSelectedCategory('prescription')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold cursor-pointer whitespace-nowrap transition-colors ${
              selectedCategory === 'prescription'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            <Pill className="w-3.5 h-3.5" />
            <span>Prescriptions</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-black/10">
              {categoryCounts.prescription}
            </span>
          </button>

          <button
            onClick={() => setSelectedCategory('diagnostic')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold cursor-pointer whitespace-nowrap transition-colors ${
              selectedCategory === 'diagnostic'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'bg-cyan-50 text-cyan-800 hover:bg-cyan-100'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Lab Tests & Scans</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-black/10">
              {categoryCounts.diagnostic}
            </span>
          </button>

          <button
            onClick={() => setSelectedCategory('referral')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold cursor-pointer whitespace-nowrap transition-colors ${
              selectedCategory === 'referral'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Referrals & Transfers</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-black/10">
              {categoryCounts.referral}
            </span>
          </button>

          {isFiltered && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold cursor-pointer text-xs ml-auto transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Vertical Chronological Timeline Feed */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs">
        {filteredTimeline.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
              <Filter className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 mb-1">
              No matching timeline events found
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              Try modifying your search criteria, switching event categories, or selecting another facility tier.
            </p>
            {isFiltered && (
              <button
                onClick={resetFilters}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 cursor-pointer shadow-xs"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="relative pl-3 sm:pl-6 border-l-2 border-slate-200 ml-2 sm:ml-4 space-y-6">
            {filteredTimeline.map((item, index) => {
              const isExpanded = expandedItemIds[item.id] ?? true;
              const dateObj = new Date(item.date);
              const formattedDate = dateObj.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });
              const formattedTime = dateObj.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              });

              const tierMeta = TIER_META[item.facilityTier] || TIER_META.sub_centre;

              // Check if there was a tier transition from previous event
              const prevItem = index > 0 ? filteredTimeline[index - 1] : null;
              const hasTierTransition = prevItem && prevItem.facilityTier !== item.facilityTier;

              return (
                <div key={item.id} className="relative">
                  {/* Optional Inter-Tier Escalation / Transition Banner */}
                  {hasTierTransition && (
                    <div className="mb-4 -ml-4 sm:-ml-7 flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-gradient-to-r from-slate-100 to-indigo-50 border border-indigo-200 text-indigo-900 flex items-center gap-1.5 shadow-xs">
                        <Truck className="w-3 h-3 text-indigo-600" />
                        <span>
                          Continuum Step: {TIER_META[prevItem.facilityTier]?.short} ➔ {tierMeta.short}
                        </span>
                      </span>
                    </div>
                  )}

                  {/* Vertical Node Icon Anchor on Timeline */}
                  <div
                    className={`absolute -left-[23px] sm:-left-[35px] top-4 w-7 h-7 rounded-full border-2 border-white ring-2 flex items-center justify-center shadow-xs ${
                      item.category === 'encounter'
                        ? 'bg-blue-600 text-white ring-blue-200'
                        : item.category === 'surgery'
                        ? 'bg-purple-600 text-white ring-purple-200'
                        : item.category === 'prescription'
                        ? 'bg-emerald-600 text-white ring-emerald-200'
                        : item.category === 'diagnostic'
                        ? 'bg-cyan-600 text-white ring-cyan-200'
                        : 'bg-amber-600 text-white ring-amber-200'
                    }`}
                  >
                    {item.category === 'encounter' && <Stethoscope className="w-3.5 h-3.5" />}
                    {item.category === 'surgery' && <Scissors className="w-3.5 h-3.5" />}
                    {item.category === 'prescription' && <Pill className="w-3.5 h-3.5" />}
                    {item.category === 'diagnostic' && <FlaskConical className="w-3.5 h-3.5" />}
                    {item.category === 'referral' && <ArrowUpRight className="w-3.5 h-3.5" />}
                  </div>

                  {/* Timeline Event Card */}
                  <div className="border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all p-4 shadow-xs">
                    {/* Header Strip: Facility, Tier Badge, Event Type Badge, Date */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Facility Tier Badge */}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${tierMeta.badge}`}>
                          {tierMeta.short}
                        </span>

                        {/* Event Category Badge */}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${item.badgeColorClass}`}>
                          {item.badgeLabel}
                        </span>

                        <span className="text-slate-300 hidden sm:inline">•</span>

                        {/* Facility Name */}
                        <span className="font-bold text-slate-900 text-xs flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{item.facilityName}</span>
                        </span>
                      </div>

                      {/* Timestamp & Provider */}
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{formattedDate}</span>
                          <span className="text-slate-300">{formattedTime}</span>
                        </span>

                        <button
                          onClick={() => toggleExpand(item.id)}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
                          title={isExpanded ? 'Collapse card' : 'Expand card'}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Primary Title and Subtitle */}
                    <div className="mb-2">
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">
                        {item.title}
                      </h4>
                      {item.subtitle && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {item.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Attending Provider Pill */}
                    {item.providerName && (
                      <div className="text-[11px] text-slate-500 mb-3 flex items-center gap-1.5">
                        <span className="font-medium text-slate-700">Attending:</span>
                        <span>{item.providerName}</span>
                        {item.providerRole && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px]">
                            {item.providerRole}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Expandable Clinical Content */}
                    {isExpanded && (
                      <div className="space-y-3 pt-1">
                        {/* Point-of-Care Vitals Strip */}
                        {item.vitals && (
                          <div className="flex flex-wrap gap-1.5 text-xs bg-white p-2.5 rounded-lg border border-slate-200">
                            <span className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-800 font-medium">
                              BP:{' '}
                              <strong className={item.vitals.systolic >= 140 ? 'text-rose-600 font-bold' : 'text-slate-900'}>
                                {item.vitals.systolic}/{item.vitals.diastolic}
                              </strong>{' '}
                              mmHg
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-800 font-medium">
                              Pulse: <strong>{item.vitals.heartRate}</strong> bpm
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-800 font-medium">
                              SpO2: <strong className={item.vitals.spo2 < 95 ? 'text-amber-600' : 'text-slate-900'}>{item.vitals.spo2}%</strong>
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-800 font-medium">
                              Blood Glucose: <strong>{item.vitals.bloodGlucose}</strong> mg/dL
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-800 font-medium">
                              BMI: <strong>{item.vitals.bmi}</strong>
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-800 font-medium">
                              Temp: <strong>{item.vitals.temperature}°C</strong>
                            </span>
                          </div>
                        )}

                        {/* Diagnoses Chips */}
                        {item.diagnoses && item.diagnoses.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap text-xs">
                            <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wide">
                              ICD-10 Diagnoses:
                            </span>
                            {item.diagnoses.map((diag, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-900 font-medium text-xs"
                              >
                                <strong>{diag.code}</strong> — {diag.description}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* SOAP Notes Collapsible details for Encounters and Surgeries */}
                        {item.soap && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs bg-white p-3 rounded-lg border border-slate-200">
                            <div>
                              <strong className="text-slate-800 block text-[10px] uppercase tracking-wider font-bold">
                                Subjective / Clinical History:
                              </strong>
                              <p className="text-slate-600 mt-0.5">{item.soap.subjective}</p>
                            </div>
                            <div>
                              <strong className="text-slate-800 block text-[10px] uppercase tracking-wider font-bold">
                                Objective / Physical Findings:
                              </strong>
                              <p className="text-slate-600 mt-0.5">{item.soap.objective}</p>
                            </div>
                            <div>
                              <strong className="text-slate-800 block text-[10px] uppercase tracking-wider font-bold">
                                Assessment / Diagnostic Impression:
                              </strong>
                              <p className="text-slate-600 mt-0.5">{item.soap.assessment}</p>
                            </div>
                            <div>
                              <strong className="text-slate-800 block text-[10px] uppercase tracking-wider font-bold">
                                Plan / Orders & Follow-up:
                              </strong>
                              <p className="text-slate-600 mt-0.5">{item.soap.plan}</p>
                            </div>
                          </div>
                        )}

                        {/* Diagnostic / Lab Test Results Grid */}
                        {item.diagnosticData && (
                          <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2 text-xs">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                              <span className="font-mono text-[11px] text-slate-600">
                                Barcode: <strong>{item.diagnosticData.sampleBarCode}</strong> • Specimen: {item.diagnosticData.specimenType}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">
                                LOINC: {item.diagnosticData.testCode}
                              </span>
                            </div>

                            {/* Lab Parameters Table */}
                            {item.diagnosticData.results && item.diagnosticData.results.length > 0 && (
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                                {item.diagnosticData.results.map((res, i) => (
                                  <div
                                    key={i}
                                    className={`p-2 rounded border ${
                                      res.flag === 'critical'
                                        ? 'bg-rose-50 border-rose-200 text-rose-900'
                                        : res.flag === 'high' || res.flag === 'low'
                                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                                        : 'bg-slate-50 border-slate-100 text-slate-900'
                                    }`}
                                  >
                                    <span className="block text-[10px] opacity-75 truncate">{res.parameter}</span>
                                    <strong className="block text-xs font-bold">
                                      {res.value} {res.unit}
                                    </strong>
                                    <span className="block text-[9px] opacity-75 font-mono">
                                      Ref: {res.referenceRange}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Radiology / Imaging Impressions */}
                            {item.diagnosticData.imagingFindings && (
                              <div className="bg-purple-50/60 border border-purple-200 rounded-lg p-3 text-xs space-y-1 mt-1">
                                <div className="text-purple-950 font-bold text-xs">
                                  Radiological Impression: {item.diagnosticData.imagingFindings.impression}
                                </div>
                                <div className="text-slate-700 text-[11px]">
                                  <strong>Technique & Findings:</strong> {item.diagnosticData.imagingFindings.findings}
                                </div>
                                {item.diagnosticData.imagingFindings.recommendations && (
                                  <div className="text-slate-600 text-[11px]">
                                    <strong>Recommendation:</strong> {item.diagnosticData.imagingFindings.recommendations}
                                  </div>
                                )}
                                <div className="text-[10px] text-slate-400 pt-1">
                                  Verified by: {item.diagnosticData.imagingFindings.radiologistName}
                                </div>
                              </div>
                            )}

                            {item.diagnosticData.notes && (
                              <div className="text-[11px] text-slate-600 italic pt-1 border-t border-slate-100">
                                Pathologist Assessment: {item.diagnosticData.notes}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Prescriptions Items List */}
                        {item.prescriptionsList && item.prescriptionsList.length > 0 && (
                          <div className="space-y-1.5 text-xs">
                            <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wide flex items-center gap-1">
                              <Pill className="w-3.5 h-3.5 text-emerald-600" /> Prescribed Medications:
                            </span>
                            <div className="space-y-1">
                              {item.prescriptionsList.map((rx, i) => (
                                <div
                                  key={i}
                                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 bg-emerald-50/70 border border-emerald-200 rounded-lg px-3 py-2 text-emerald-950"
                                >
                                  <div>
                                    <strong className="text-slate-900">{rx.name}</strong> ({rx.dosage}) —{' '}
                                    <span className="text-emerald-900 font-medium">{rx.frequency}</span> for{' '}
                                    <strong>{rx.duration} days</strong>.
                                    {rx.instructions && (
                                      <span className="block text-[11px] text-slate-600 mt-0.5">
                                        Note: {rx.instructions}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 self-start sm:self-auto shrink-0">
                                    {rx.dispensed}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Referral Details */}
                        {item.referralData && (
                          <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-3 text-xs space-y-1.5">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/60 pb-1.5">
                              <span className="font-bold text-amber-950">
                                Speciality Required: {item.referralData.specialty}
                              </span>
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                                Urgency: {item.referralData.urgency}
                              </span>
                            </div>
                            <div className="text-slate-700">
                              <strong className="text-slate-900">Clinical Transfer Rationale:</strong>{' '}
                              {item.referralData.reason}
                            </div>
                            <div className="text-[11px] text-slate-600">
                              <strong>Transport Logistics:</strong> {item.referralData.transportMode}
                            </div>
                            {item.referralData.triageNotes && (
                              <div className="text-[11px] text-slate-600">
                                <strong>Triage Note at Receiving Facility:</strong> {item.referralData.triageNotes}
                              </div>
                            )}
                            {item.referralData.counterNotes && (
                              <div className="text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded border border-emerald-200 mt-1">
                                <strong>Counter-Referral Loop Closure:</strong> {item.referralData.counterNotes}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Cryptographic Verification Footer */}
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                          <span className="flex items-center gap-1 font-mono">
                            <Lock className="w-3 h-3 text-slate-400" />
                            ABHA Tamper-Proof Seal: {item.encryptedHash.slice(0, 24)}...
                          </span>
                          <span className="capitalize font-semibold text-emerald-700 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            Sync: {item.syncStatus}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Record New Encounter Modal */}
      {showAddEncounterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Record Clinical Encounter
                </h3>
                <p className="text-xs text-slate-500">
                  Patient: {selectedPatient.name} ({selectedPatient.nationalHealthId}) at {currentFacility.name}
                </p>
              </div>
              <button
                onClick={() => setShowAddEncounterModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEncounter} className="space-y-4 text-xs">
              {/* Chief complaint */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Chief Complaint / Reason for Visit
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Occipital headache, high blood pressure, scheduled post-op check"
                  value={newChiefComplaint}
                  onChange={(e) => setNewChiefComplaint(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Vitals grid */}
              <div>
                <span className="font-semibold text-slate-700 block mb-1.5">
                  Point-of-Care Vitals & Biometrics
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-slate-500 block text-[10px]">Systolic BP (mmHg)</label>
                    <input
                      type="number"
                      value={newSystolic}
                      onChange={(e) => setNewSystolic(e.target.value)}
                      className="w-full border border-slate-200 rounded p-1.5 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block text-[10px]">Diastolic BP (mmHg)</label>
                    <input
                      type="number"
                      value={newDiastolic}
                      onChange={(e) => setNewDiastolic(e.target.value)}
                      className="w-full border border-slate-200 rounded p-1.5 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block text-[10px]">Pulse (bpm)</label>
                    <input
                      type="number"
                      value={newHeartRate}
                      onChange={(e) => setNewHeartRate(e.target.value)}
                      className="w-full border border-slate-200 rounded p-1.5 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block text-[10px]">Blood Glucose (mg/dL)</label>
                    <input
                      type="number"
                      value={newGlucose}
                      onChange={(e) => setNewGlucose(e.target.value)}
                      className="w-full border border-slate-200 rounded p-1.5 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block text-[10px]">SpO2 (%)</label>
                    <input
                      type="number"
                      value={newSpo2}
                      onChange={(e) => setNewSpo2(e.target.value)}
                      className="w-full border border-slate-200 rounded p-1.5 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block text-[10px]">Temp (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newTemp}
                      onChange={(e) => setNewTemp(e.target.value)}
                      className="w-full border border-slate-200 rounded p-1.5 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block text-[10px]">Weight (kg)</label>
                    <input
                      type="number"
                      value={newWeight}
                      onChange={(e) => setNewWeight(e.target.value)}
                      className="w-full border border-slate-200 rounded p-1.5 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block text-[10px]">Height (cm)</label>
                    <input
                      type="number"
                      value={newHeight}
                      onChange={(e) => setNewHeight(e.target.value)}
                      className="w-full border border-slate-200 rounded p-1.5 text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* SOAP notes */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="font-semibold text-slate-700 block">
                  SOAP Clinical Documentation
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-500 block text-[10px]">Subjective (History)</label>
                    <textarea
                      rows={2}
                      value={soapSubjective}
                      onChange={(e) => setSoapSubjective(e.target.value)}
                      placeholder="Patient symptoms, pain scale, reported adherence..."
                      className="w-full border border-slate-200 rounded p-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block text-[10px]">Objective (Exam & Vitals)</label>
                    <textarea
                      rows={2}
                      value={soapObjective}
                      onChange={(e) => setSoapObjective(e.target.value)}
                      placeholder="Physical findings, palpation, heart sounds, chest clear..."
                      className="w-full border border-slate-200 rounded p-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block text-[10px]">Assessment (Diagnosis)</label>
                    <textarea
                      rows={2}
                      value={soapAssessment}
                      onChange={(e) => setSoapAssessment(e.target.value)}
                      placeholder="Clinical diagnosis, disease stage, trajectory..."
                      className="w-full border border-slate-200 rounded p-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block text-[10px]">Plan (Care & Prescriptions)</label>
                    <textarea
                      rows={2}
                      value={soapPlan}
                      onChange={(e) => setSoapPlan(e.target.value)}
                      placeholder="Medications, diagnostic follow-up, referral orders..."
                      className="w-full border border-slate-200 rounded p-1.5 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Prescriptions and ICD-10 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    ICD-10 Primary Diagnosis
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={icdCode}
                      onChange={(e) => setIcdCode(e.target.value)}
                      className="w-24 border border-slate-200 rounded p-1.5 text-xs font-mono font-bold"
                    />
                    <input
                      type="text"
                      value={icdDesc}
                      onChange={(e) => setIcdDesc(e.target.value)}
                      className="flex-1 border border-slate-200 rounded p-1.5 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Prescription Medication
                  </label>
                  <input
                    type="text"
                    value={prescriptionDrug}
                    onChange={(e) => setPrescriptionDrug(e.target.value)}
                    placeholder="Drug name, dosage, frequency"
                    className="w-full border border-slate-200 rounded p-1.5 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddEncounterModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-xs cursor-pointer"
                >
                  Save Encounter & Sign (AES-256)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
