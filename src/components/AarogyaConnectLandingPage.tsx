import React, { useState, useMemo } from 'react';
import {
  Activity,
  AlertCircle,
  AlertOctagon,
  ArrowRight,
  Award,
  BarChart3,
  Building,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Cpu,
  Database,
  Download,
  FileCheck,
  FileText,
  Flame,
  Globe,
  Heart,
  HeartPulse,
  HelpCircle,
  Layers,
  Lock,
  MapPin,
  MessageSquare,
  Mic,
  Phone,
  Pill,
  Radio,
  RefreshCw,
  Search,
  Server,
  Share2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
  Video,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react';

interface AarogyaConnectLandingPageProps {
  onLaunchPlatform: (tab?: string) => void;
}

export const AarogyaConnectLandingPage: React.FC<AarogyaConnectLandingPageProps> = ({
  onLaunchPlatform,
}) => {
  // State for interactive Pilot Calculator
  const [phcCount, setPhcCount] = useState<number>(25);
  const [subCentreCount, setSubCentreCount] = useState<number>(120);
  const [populationCovered, setPopulationCovered] = useState<number>(650000);

  // State for Pilot Request / RFP Modal
  const [isRfpModalOpen, setIsRfpModalOpen] = useState<boolean>(false);
  const [rfpState, setRfpState] = useState<string>('Odisha');
  const [rfpDepartment, setRfpDepartment] = useState<string>('National Health Mission (NHM)');
  const [rfpOfficerName, setRfpOfficerName] = useState<string>('');
  const [rfpEmail, setRfpEmail] = useState<string>('');
  const [rfpPhone, setRfpPhone] = useState<string>('');
  const [rfpDistrictCount, setRfpDistrictCount] = useState<number>(2);
  const [rfpSubmitted, setRfpSubmitted] = useState<boolean>(false);

  // Interactive Tab in Showcase section
  const [activeShowcaseTab, setActiveShowcaseTab] = useState<'teleconsult' | 'triage' | 'abdm' | 'inventory'>('teleconsult');

  // ROI Calculator Calculations
  const calculatedSavings = useMemo(() => {
    // Estimated average patient travel cost saved per teleconsult: ₹380
    // Estimated wait time reduced per consult: 3.2 hours
    // Estimated teleconsultations per PHC/month: 240
    const annualConsults = (phcCount * 240 + subCentreCount * 90) * 12;
    const travelSavingsCr = Math.round((annualConsults * 410) / 10000000);
    const totalWaitHoursSaved = Math.round(annualConsults * 3.1);
    const emergencyDivertRate = 84; // % resolved locally

    return {
      annualConsults,
      travelSavingsCr,
      totalWaitHoursSaved,
      emergencyDivertRate,
    };
  }, [phcCount, subCentreCount]);

  const handleRfpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRfpSubmitted(true);
    setTimeout(() => {
      // Keep state clear after some time
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* 1. TOP ANNOUNCEMENT & GOVERNMENT ACCREDITATION BAR */}
      <div className="bg-slate-950 text-slate-300 text-xs py-2 px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-bold text-[10px]">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              ABDM LEVEL-3 CERTIFIED
            </span>
            <span className="text-slate-300 font-medium">
              National Health Mission (NHM) & Ayushman Bharat Aligned B2G Platform
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3 text-blue-400" /> State Data Centre (SDC) Compliant
            </span>
            <span className="hidden md:inline text-slate-600">•</span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> GeM Portal Registered
            </span>
          </div>
        </div>
      </div>

      {/* 2. STICKY TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-700 text-white">
              <HeartPulse className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black text-slate-900 tracking-tight">
                  Aarogya<span className="text-blue-700">Connect</span>
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-black uppercase tracking-wider">
                  B2G
                </span>
              </div>
              <p className="text-[10px] font-bold text-slate-500 tracking-wide uppercase">
                Rural Digital Health Infrastructure
              </p>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-slate-700">
            <a href="#features" className="hover:text-blue-700 transition-colors">
              Core Modules
            </a>
            <a href="#impact" className="hover:text-blue-700 transition-colors">
              Traction & Impact
            </a>
            <a href="#architecture" className="hover:text-blue-700 transition-colors">
              Public Health Architecture
            </a>
            <a href="#calculator" className="hover:text-blue-700 transition-colors">
              District ROI Estimator
            </a>
            <a href="#governance" className="hover:text-blue-700 transition-colors">
              Government Procurement
            </a>
          </nav>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsRfpModalOpen(true)}
              className="hidden sm:inline-flex items-center justify-center rounded-lg bg-white border border-slate-200 text-blue-800 hover:bg-slate-50 text-xs font-bold px-4 py-2 gap-1.5 transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Request State Pilot (RFP)</span>
            </button>

            <button
              type="button"
              onClick={() => onLaunchPlatform('facility_dashboard')}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <span>Explore Live Platform</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 3. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/70 via-white to-slate-50 pt-12 pb-20 border-b border-slate-200">
        {/* Soft Background Accents */}
        <div className="absolute -top-24 right-0 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-0 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Hero Pitch */}
            <div className="lg:col-span-7 space-y-6">
              {/* Trust Tag */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-900 border border-blue-200 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Empowering Ayushman Arogya Mandirs & District Hospitals</span>
              </div>

              {/* Bold Value Proposition */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-950 tracking-tight leading-[1.18]">
                Bridging the Gap Between Rural India and Quality Healthcare.
              </h1>

              {/* B2G Subtitle */}
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl font-medium">
                AarogyaConnect provides state health departments and district administrations with an
                offline-first digital health ecosystem. Integrating frontline assisted teleconsultation,
                vernacular AI triage, ABDM-interoperable health records, and real-time medical resource tracking.
              </p>

              {/* Primary Dual CTA Strip */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRfpModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors cursor-pointer shadow-xs"
                >
                  <FileText className="w-4 h-4" />
                  <span>Request State Department Pilot (RFP)</span>
                </button>

                <button
                  type="button"
                  onClick={() => onLaunchPlatform('facility_dashboard')}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold transition-colors cursor-pointer"
                >
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <span>Interactive Live Platform Demo</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              {/* Trust Indicators / Government Compliance Checklist */}
              <div className="pt-6 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold">100% Offline-First Edge PWA</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold">ABDM M1, M2, M3 Compliant</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold">e-Sanjeevani Interoperable</span>
                </div>
              </div>
            </div>

            {/* Right Hero Live Interactive Showcase Card */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                {/* Showcase Header */}
                <div className="bg-slate-900 px-4 py-3 text-white flex items-center justify-between border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold tracking-wide uppercase">
                      Frontline Sub-Centre Live Telemetry
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    ID: SC-NUAGAON-772
                  </span>
                </div>

                {/* Interactive Showcase Preview */}
                <div className="p-5 space-y-4">
                  {/* Doctor & Patient Live Connection simulation */}
                  <div className="bg-blue-50/80 rounded-xl p-3 border border-blue-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-xs">
                        Dr. P
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">Dr. Priya Mohanty (MD)</div>
                        <div className="text-[11px] text-blue-700 font-medium">District Hospital Sundargarh</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        <Video className="w-3 h-3 text-emerald-600" />
                        Active WebRTC
                      </span>
                      <div className="text-[10px] text-slate-500 mt-0.5">Latency: 42ms (2G edge)</div>
                    </div>
                  </div>

                  {/* AI Triage Alert Pill */}
                  <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 text-xs">
                    <div className="flex items-center gap-2 text-amber-900 font-bold mb-1">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>AI Triage Decision Support (Clinical NLP)</span>
                    </div>
                    <p className="text-slate-700 text-[11px] leading-snug">
                      High-Risk Maternal Flag: BP 154/98 mmHg detected. Automated alert sent to PHC Medical Officer for immediate Oxytocin & MgSO4 dispatch.
                    </p>
                  </div>

                  {/* Live Telemetry Meters */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="text-[10px] text-slate-500">Pulse Oximetry</div>
                      <div className="text-sm font-bold text-emerald-700 mt-0.5">98% SpO2</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="text-[10px] text-slate-500">Blood Glucose</div>
                      <div className="text-sm font-bold text-slate-800 mt-0.5">138 mg/dL</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="text-[10px] text-slate-500">Cold Chain Temp</div>
                      <div className="text-sm font-bold text-blue-700 mt-0.5">+4.2°C (Optimal)</div>
                    </div>
                  </div>

                  {/* Action row */}
                  <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                      ABHA ID: 91-4829-1094-8201
                    </span>
                    <button
                      type="button"
                      onClick={() => onLaunchPlatform('teleconsult')}
                      className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1"
                    >
                      <span>Simulate Session</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. GOVERNMENT PARTNERSHIP & TRUST BAR */}
      <section className="bg-white py-10 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-6">
            Aligned with National Healthcare Frameworks & Digital Health Standards
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 items-center opacity-85">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center">
              <span className="font-black text-slate-800 text-sm tracking-tight">ABDM</span>
              <span className="text-[10px] text-slate-500">Ayushman Bharat Digital</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center">
              <span className="font-black text-blue-800 text-sm tracking-tight">NHM</span>
              <span className="text-[10px] text-slate-500">National Health Mission</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center">
              <span className="font-black text-emerald-800 text-sm tracking-tight">e-Sanjeevani</span>
              <span className="text-[10px] text-slate-500">National Teleconsultation</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center">
              <span className="font-black text-slate-800 text-sm tracking-tight">GeM Portal</span>
              <span className="text-[10px] text-slate-500">Govt e-Marketplace</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center">
              <span className="font-black text-blue-800 text-sm tracking-tight">DISHA</span>
              <span className="text-[10px] text-slate-500">Health Data Privacy Act</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center">
              <span className="font-black text-emerald-800 text-sm tracking-tight">FHIR / HL7</span>
              <span className="text-[10px] text-slate-500">Clinical Data Exchange</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. 4-COLUMN FEATURE GRID (Strict Requirement) */}
      <section id="features" className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Integrated Healthcare Architecture
            </span>
            <h2 className="text-3xl font-extrabold text-slate-950 tracking-tight sm:text-4xl">
              End-to-End Digital Healthcare for Rural Bharat
            </h2>
            <p className="text-base text-slate-600 mt-3 leading-relaxed">
              Designed specifically for frontline health workers, secondary primary centres, and district
              administrations to eliminate delays and ensure equitable healthcare access.
            </p>
          </div>

          {/* 4-COLUMN FEATURE GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1: Assisted Teleconsultation */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between group hover:border-slate-300 transition-colors">
              <div>
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 text-blue-700 mb-5 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Video className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2 tracking-tight">
                  Assisted Teleconsultation
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-4 font-medium">
                  Empowers Community Health Officers (CHOs) and ASHA workers to connect rural patients directly
                  to specialist doctors at District Hospitals and Medical Colleges via low-bandwidth WebRTC.
                </p>

                <ul className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-4">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Real-time vernacular voice translation across 12 languages</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Adaptive audio/video stream optimized for 2G/3G connectivity</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Integrated point-of-care digital stethoscope & vitals telemetry</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onLaunchPlatform('teleconsult')}
                  className="w-full py-2.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-blue-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Launch Teleconsult Module</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Feature 2: Digital Triage via AI */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between group hover:border-slate-300 transition-colors">
              <div>
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 mb-5 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <Cpu className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2 tracking-tight">
                  Digital Triage via AI
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-4 font-medium">
                  Voice-first clinical intake kiosk and AI diagnostic assistance capable of triaging patients by
                  acuity in local dialects, catching high-risk maternal, cardiac, and pediatric emergencies early.
                </p>

                <ul className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-4">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Voice symptom intake for illiterate and rural patients</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Validated Clinical Decision Support (CDSS) for high-risk cohorts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Reduces emergency referral delays during the critical golden hour</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onLaunchPlatform('kiosk')}
                  className="w-full py-2.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-emerald-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Experience Intake Kiosk</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Feature 3: Interoperable Health Records */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between group hover:border-slate-300 transition-colors">
              <div>
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 text-blue-700 mb-5 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Database className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2 tracking-tight">
                  Interoperable Health Records
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-4 font-medium">
                  Fully aligned with the Ayushman Bharat Digital Mission (ABDM). Generates ABHA IDs,
                  enables instant consent-based clinical document exchange (FHIR), and maintains longitudinal records.
                </p>

                <ul className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-4">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>14-digit ABHA ID creation via Aadhaar OTP & biometric check</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Multi-facility longitudinal history spanning Sub-centre to Medical College</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>DISHA-compliant client-side encryption and consent logging</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onLaunchPlatform('records')}
                  className="w-full py-2.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-blue-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Explore Patient Records</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Feature 4: Real-Time Resource Tracking */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between group hover:border-slate-300 transition-colors">
              <div>
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 mb-5 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <Truck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2 tracking-tight">
                  Real-Time Resource Tracking
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-4 font-medium">
                  District Medical Officer (DMO) command console tracking essential drug buffers, cold-chain ILR
                  refrigerator temperatures, diagnostic equipment uptime, and automated inter-facility stock re-routing.
                </p>

                <ul className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-4">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Live heatmap flagging red stockout alerts across rural PHCs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>One-click atomic drug re-routing from surplus to deficit centers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Cold-chain vaccine telemetry (+2°C to +8°C) preventing spoilage</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onLaunchPlatform('facility_dashboard')}
                  className="w-full py-2.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-emerald-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>View DMO Command Console</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. TRACTION & IMPACT SECTION (Strict Requirement with Mock Data) */}
      <section id="impact" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-bold text-xs uppercase tracking-wider mb-3">
              <Award className="w-3.5 h-3.5 text-blue-600" />
              Verified Public Health Outcomes
            </span>
            <h2 className="text-3xl font-extrabold text-slate-950 tracking-tight sm:text-4xl">
              Traction & Measurable Rural Impact
            </h2>
            <p className="text-base text-slate-600 mt-3 leading-relaxed">
              Real-world metrics demonstrated across pilot deployments in aspirational districts, validating our
              B2G operational model for nationwide state adoption.
            </p>
          </div>

          {/* Key Metric Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {/* Metric 1 */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 text-center hover:border-blue-400 transition-all">
              <div className="w-10 h-10 mx-auto rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mb-3">
                <Clock className="w-5 h-5" />
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                10,000+
              </div>
              <div className="text-sm font-bold text-blue-700 mt-1">Wait Hours Saved</div>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Frontline triage reduced average outpatient wait times from 3.8 hours down to 24 minutes per patient.
              </p>
            </div>

            {/* Metric 2 */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 text-center hover:border-emerald-400 transition-all">
              <div className="w-10 h-10 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                500+
              </div>
              <div className="text-sm font-bold text-emerald-700 mt-1">Available in 500+ PHCs</div>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Deployed across Primary Health Centres and Ayushman Arogya Mandirs in 14 aspirational districts.
              </p>
            </div>

            {/* Metric 3 */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 text-center hover:border-blue-400 transition-all">
              <div className="w-10 h-10 mx-auto rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mb-3">
                <Users className="w-5 h-5" />
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                1.4M+
              </div>
              <div className="text-sm font-bold text-blue-700 mt-1">Citizens Screened</div>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Longitudinal ABHA health records generated and synced seamlessly across rural healthcare facilities.
              </p>
            </div>

            {/* Metric 4 */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 text-center hover:border-emerald-400 transition-all">
              <div className="w-10 h-10 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                <Pill className="w-5 h-5" />
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                99.4%
              </div>
              <div className="text-sm font-bold text-emerald-700 mt-1">Critical Drug Uptime</div>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Near-zero stockouts achieved for maternal emergency drugs (Oxytocin) and cold-chain routine vaccines.
              </p>
            </div>
          </div>

          {/* Secondary Outcome Stats Banner */}
          <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-slate-950 rounded-2xl p-8 text-white shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-slate-800">
              <div className="pt-4 md:pt-0">
                <div className="text-3xl font-extrabold text-emerald-400">₹42+ Crore</div>
                <div className="text-xs font-semibold text-slate-300 mt-1">Citizen Out-of-Pocket Savings</div>
                <p className="text-[11px] text-slate-400 mt-2 max-w-xs mx-auto">
                  Eliminated needless travel costs and loss of daily agricultural wages for tribal and rural families.
                </p>
              </div>

              <div className="pt-4 md:pt-0">
                <div className="text-3xl font-extrabold text-blue-400">88.2%</div>
                <div className="text-xs font-semibold text-slate-300 mt-1">First-Visit Resolution Rate</div>
                <p className="text-[11px] text-slate-400 mt-2 max-w-xs mx-auto">
                  Treated at the sub-centre or PHC level via assisted teleconsultation without tertiary hospital escalation.
                </p>
              </div>

              <div className="pt-4 md:pt-0">
                <div className="text-3xl font-extrabold text-amber-400">350+</div>
                <div className="text-xs font-semibold text-slate-300 mt-1">Government Specialist Doctors Active</div>
                <p className="text-[11px] text-slate-400 mt-2 max-w-xs mx-auto">
                  Cardiologists, gynecologists, pediatricians, and general physicians providing tele-care daily.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. INTERACTIVE DISTRICT ROI & IMPACT ESTIMATOR (High-Converting Tool) */}
      <section id="calculator" className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12">
              {/* Controls Column */}
              <div className="lg:col-span-6 p-8 lg:p-12 space-y-6 border-b lg:border-b-0 lg:border-r border-slate-200">
                <div className="space-y-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-900 border border-blue-200 font-bold text-xs uppercase tracking-wider">
                    <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                    District Health Economics Model
                  </span>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                    Estimate Your District's Transformation
                  </h3>
                  <p className="text-sm text-slate-600 font-medium">
                    Input your administrative metrics to calculate projected citizen savings, teleconsultation
                    volume, and hospital load reduction.
                  </p>
                </div>

                {/* Slider 1: PHCs */}
                <div className="space-y-2 pt-4">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-700">Primary Health Centres (PHCs):</span>
                    <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-900 border border-blue-200 text-sm font-bold">
                      {phcCount} Units
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={phcCount}
                    onChange={(e) => setPhcCount(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg appearance-none"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                    <span>5 PHCs</span>
                    <span>50 PHCs</span>
                    <span>100 PHCs</span>
                  </div>
                </div>

                {/* Slider 2: Sub-Centres */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-700">Health Sub-Centres (Ayushman Arogya Mandirs):</span>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200 text-sm font-bold">
                      {subCentreCount} Units
                    </span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="400"
                    step="10"
                    value={subCentreCount}
                    onChange={(e) => setSubCentreCount(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-200 rounded-lg appearance-none"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                    <span>20 SCs</span>
                    <span>200 SCs</span>
                    <span>400 SCs</span>
                  </div>
                </div>

                {/* Slider 3: Population */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-700">Covered Rural Population:</span>
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-900 border border-slate-300 text-sm font-bold">
                      {(populationCovered / 100000).toFixed(1)} Lakhs
                    </span>
                  </div>
                  <input
                    type="range"
                    min="100000"
                    max="2000000"
                    step="50000"
                    value={populationCovered}
                    onChange={(e) => setPopulationCovered(Number(e.target.value))}
                    className="w-full accent-slate-800 cursor-pointer h-2 bg-slate-200 rounded-lg appearance-none"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                    <span>1 Lakh</span>
                    <span>10 Lakhs</span>
                    <span>20 Lakhs</span>
                  </div>
                </div>
              </div>

              {/* Output Column with Flat Stat Cards */}
              <div className="lg:col-span-6 p-8 lg:p-12 bg-slate-900 text-white flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-6 border-b border-slate-800">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Projected Annual District Outcomes
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-950 border border-emerald-500/50 text-emerald-300 text-[10px] font-bold">
                      HIGH ROI
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-6">
                    <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700">
                      <span className="text-xs text-slate-400 font-medium">Citizen Travel & Wage Savings</span>
                      <div className="text-3xl font-black text-emerald-400 mt-1">
                        ₹{calculatedSavings.travelSavingsCr} Cr
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">Out-of-pocket rural savings</span>
                    </div>

                    <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700">
                      <span className="text-xs text-slate-400 font-medium">Annual Teleconsultations</span>
                      <div className="text-3xl font-black text-blue-400 mt-1">
                        {(calculatedSavings.annualConsults / 1000).toFixed(0)}k+
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">Specialist sessions conducted</span>
                    </div>

                    <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700">
                      <span className="text-xs text-slate-400 font-medium">Wait Hours Eliminated</span>
                      <div className="text-3xl font-black text-amber-400 mt-1">
                        {(calculatedSavings.totalWaitHoursSaved / 1000).toFixed(0)}k+
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">OPD crowd congestion prevented</span>
                    </div>

                    <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700">
                      <span className="text-xs text-slate-400 font-medium">Hospital Divert Rate</span>
                      <div className="text-3xl font-black text-white mt-1">
                        {calculatedSavings.emergencyDivertRate}%
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">Resolved at primary level</span>
                    </div>
                  </div>
                </div>

                <div className="pt-8 mt-8 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                  <div className="text-xs text-slate-300 font-medium">
                    Eligible under <strong className="text-white font-bold">NHM PIP Grants & XV Finance Commission</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsRfpModalOpen(true)}
                    className="px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                  >
                    <span>Request Feasibility Study</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FIELD TESTIMONIALS & B2G ENDORSEMENTS */}
      <section className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs uppercase tracking-wider mb-3">
              <Building className="w-3.5 h-3.5 text-emerald-600" />
              Administrative Voices
            </span>
            <h2 className="text-3xl font-extrabold text-slate-950 tracking-tight sm:text-4xl">
              Trusted by Civil Servants & Healthcare Leaders
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 flex flex-col justify-between">
              <p className="text-slate-700 text-sm italic leading-relaxed mb-6">
                "In our hilly, tribal blocks, patients previously had to travel 70 kilometres for basic ultrasound reviews.
                AarogyaConnect enabled our CHOs to transmit point-of-care scans with instant tele-radiology reviews. It has
                fundamentally transformed maternal safety."
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                <div className="w-10 h-10 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-xs">
                  IAS
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Shri Alok K. Sen, IAS</div>
                  <div className="text-[11px] text-slate-500">District Magistrate & Collector</div>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 flex flex-col justify-between">
              <p className="text-slate-700 text-sm italic leading-relaxed mb-6">
                "The real-time drug buffer heatmap solved our anti-snake venom and oxytocin stockout problems. Rather than
                waiting for weekly manual phone calls, the DMO console allowed us to execute atomic inter-PHC transfers within
                hours."
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                <div className="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs">
                  CDMO
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Dr. Sunita Pattanaik</div>
                  <div className="text-[11px] text-slate-500">Chief District Medical Officer (CDMO)</div>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 flex flex-col justify-between">
              <p className="text-slate-700 text-sm italic leading-relaxed mb-6">
                "The vernacular voice intake kiosk allows illiterate villagers to describe their symptoms in their own words.
                The AI triage warns me immediately when an elderly diabetic patient is in silent ketoacidosis."
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                <div className="w-10 h-10 rounded-full bg-blue-800 text-white flex items-center justify-center font-bold text-xs">
                  CHO
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Sister Deepali Tirkey</div>
                  <div className="text-[11px] text-slate-500">Community Health Officer (Ayushman Arogya Mandir)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. GOVERNMENT PROCUREMENT & DEPLOYMENT ARCHITECTURE */}
      <section id="governance" className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-bold text-xs uppercase tracking-wider">
                <Server className="w-3.5 h-3.5 text-blue-600" />
                Enterprise Public Sector Readiness
              </span>
              <h2 className="text-3xl font-extrabold text-slate-950 tracking-tight sm:text-4xl">
                Engineered for State Governments & National Health Missions
              </h2>
              <p className="text-base text-slate-600 leading-relaxed">
                We understand the stringent requirements of public health procurement. AarogyaConnect offers
                flexible on-premise or sovereign cloud hosting, GeM listing, and end-to-end operational training.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">100% Data Sovereignty & SDC Hosting</h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Can be hosted on State Data Centres (SDC) or National Informatics Centre (NIC) MeghRaj cloud.
                      Compliant with India's Digital Personal Data Protection (DPDP) Act.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-800 mt-0.5">
                    <WifiOff className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">True Zero-Bandwidth Offline Synchronization</h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Frontline tablets store all consultation and triage data locally using encrypted IndexedDB.
                      Syncs automatically whenever the worker reaches cell tower coverage.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-slate-200 text-slate-800 mt-0.5">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">GeM Portal Listed for Direct Department Purchase</h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Fast-track public procurement via Government e-Marketplace under pre-negotiated rate contracts
                      without protracted tender delays.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Card: Deployment Timeline */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-8 shadow-lg">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-700" />
                <span>60-Day Turnkey District Rollout Plan</span>
              </h3>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-blue-200">
                <div className="relative">
                  <span className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-blue-700 ring-4 ring-blue-100" />
                  <div className="text-xs font-bold text-blue-700 uppercase">Weeks 1 – 2</div>
                  <h5 className="text-sm font-bold text-slate-900 mt-0.5">Infrastructure & Registry Mapping</h5>
                  <p className="text-xs text-slate-600 mt-1">
                    ABDM Health Facility Registry (HFR) integration, cold-chain baseline telemetry, and district server provisioning.
                  </p>
                </div>

                <div className="relative">
                  <span className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-emerald-700 ring-4 ring-emerald-100" />
                  <div className="text-xs font-bold text-emerald-700 uppercase">Weeks 3 – 4</div>
                  <h5 className="text-sm font-bold text-slate-900 mt-0.5">Frontline Training & Tablet Provisioning</h5>
                  <p className="text-xs text-slate-600 mt-1">
                    Hands-on vernacular workshops for 200+ CHOs and ANMs in local languages with simulation training.
                  </p>
                </div>

                <div className="relative">
                  <span className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-blue-700 ring-4 ring-blue-100" />
                  <div className="text-xs font-bold text-blue-700 uppercase">Weeks 5 – 6</div>
                  <h5 className="text-sm font-bold text-slate-900 mt-0.5">Teleconsultation Doctor Onboarding</h5>
                  <p className="text-xs text-slate-600 mt-1">
                    Integration with District Hospital rosters, roster scheduling, and point-of-care diagnostics setup.
                  </p>
                </div>

                <div className="relative">
                  <span className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-emerald-700 ring-4 ring-emerald-100" />
                  <div className="text-xs font-bold text-emerald-700 uppercase">Weeks 7 – 8</div>
                  <h5 className="text-sm font-bold text-slate-900 mt-0.5">Full Operational Go-Live & DMO War Room</h5>
                  <p className="text-xs text-slate-600 mt-1">
                    Live district-wide rollout with automated inventory alerts and weekly Collector review reports.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 10. HIGH-CONVERTING FINAL CTA & PILOT LAUNCH BAR */}
      <section className="py-16 bg-gradient-to-br from-blue-900 via-blue-950 to-slate-950 text-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider">
            Ready for Statewide Scale
          </span>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white max-w-3xl mx-auto leading-tight">
            Ready to Bring Digital Specialist Care to Every Village in Your State?
          </h2>

          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Partner with AarogyaConnect to implement a 60-day pilot across your target aspirational district.
            Experience how real-time AI triage and assisted teleconsultation elevate frontline health indicators.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              type="button"
              onClick={() => setIsRfpModalOpen(true)}
              className="w-full sm:w-auto px-8 py-4 rounded-xl text-sm font-bold text-slate-900 bg-white hover:bg-slate-100 shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-blue-700" />
              <span>Schedule State Department Pilot (RFP)</span>
            </button>

            <button
              type="button"
              onClick={() => onLaunchPlatform('facility_dashboard')}
              className="w-full sm:w-auto px-8 py-4 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Activity className="w-4 h-4" />
              <span>Launch Live Clinical EHR Demo</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="pt-8 text-xs text-slate-400 flex flex-wrap items-center justify-center gap-6">
            <span>Direct GeM Procurement Support</span>
            <span>•</span>
            <span>Free Technical Feasibility Audit</span>
            <span>•</span>
            <span>24/7 Dedicated State Support Team</span>
          </div>
        </div>
      </section>

      {/* 11. FOOTER */}
      <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-900 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-700 flex items-center justify-center text-white font-bold">
                <HeartPulse className="w-4 h-4 text-emerald-300" />
              </div>
              <span className="text-base font-bold text-white">AarogyaConnect</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              B2G digital health infrastructure bridging rural India and quality healthcare. Aligned with the
              National Health Mission and Ayushman Bharat Digital Mission.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-white uppercase tracking-wider mb-3">Core Modules</h4>
            <ul className="space-y-2">
              <li>
                <button
                  type="button"
                  onClick={() => onLaunchPlatform('teleconsult')}
                  className="hover:text-white transition-colors"
                >
                  Assisted Teleconsultation
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onLaunchPlatform('kiosk')}
                  className="hover:text-white transition-colors"
                >
                  Digital Triage via AI (Kiosk)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onLaunchPlatform('records')}
                  className="hover:text-white transition-colors"
                >
                  Interoperable Health Records (ABDM)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onLaunchPlatform('facility_dashboard')}
                  className="hover:text-white transition-colors"
                >
                  Real-Time Resource Tracking (DMO)
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white uppercase tracking-wider mb-3">Government Standards</h4>
            <ul className="space-y-2 text-slate-400">
              <li>ABHA (Ayushman Bharat Health Account)</li>
              <li>e-Sanjeevani Teleconsultation Protocol</li>
              <li>FHIR / HL7 Clinical Exchange</li>
              <li>DISHA & HIPAA Security Compliance</li>
              <li>GeM Category: HealthTech B2G</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white uppercase tracking-wider mb-3">Public Sector Inquiries</h4>
            <div className="space-y-2 text-slate-400">
              <p>Nodal Government Relations Desk</p>
              <p className="text-white font-mono">rfp@aarogyaconnect.gov.in</p>
              <p>Helpline: +91 1800-AAROGYA (Toll-Free)</p>
              <button
                type="button"
                onClick={() => setIsRfpModalOpen(true)}
                className="mt-2 px-3 py-1.5 bg-blue-900 text-blue-200 border border-blue-700 rounded text-[11px] font-semibold hover:bg-blue-800"
              >
                Download State Briefing Kit
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
          <div>
            © {new Date().getFullYear()} AarogyaConnect Technologies. Dedicated to Bharat's Frontline Healthcare Workers.
          </div>
          <div className="flex items-center gap-4">
            <span className="text-emerald-400">Made for Ayushman Bharat</span>
            <span>•</span>
            <button
              type="button"
              onClick={() => onLaunchPlatform('facility_dashboard')}
              className="text-blue-400 hover:underline"
            >
              Switch to Clinical Console
            </button>
          </div>
        </div>
      </footer>

      {/* 12. INTERACTIVE RFP / STATE PILOT INGESTION MODAL */}
      {isRfpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-700">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">
                    Request State Pilot Feasibility Study
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    For State Health Societies, NHM Directors & District Collectors
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsRfpModalOpen(false);
                  setRfpSubmitted(false);
                }}
                className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center font-bold text-sm cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {rfpSubmitted ? (
              <div className="py-8 text-center space-y-3">
                <div className="flex items-center justify-center w-14 h-14 bg-emerald-100 text-emerald-700 mx-auto rounded-2xl">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h5 className="text-base font-bold text-slate-900">
                  Pilot Proposal Generated Successfully!
                </h5>
                <p className="text-xs text-slate-600 max-w-sm mx-auto font-medium">
                  A tailored implementation blueprint for <strong>{rfpState}</strong> ({rfpDistrictCount} Aspirational Districts)
                  has been queued. Our B2G public health deployment director will reach out within 24 hours.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRfpModalOpen(false);
                      setRfpSubmitted(false);
                    }}
                    className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer transition-colors shadow-xs"
                  >
                    Close Window
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRfpSubmit} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">State / UT</label>
                    <select
                      value={rfpState}
                      onChange={(e) => setRfpState(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      <option value="Odisha">Odisha</option>
                      <option value="Bihar">Bihar</option>
                      <option value="Madhya Pradesh">Madhya Pradesh</option>
                      <option value="Uttar Pradesh">Uttar Pradesh</option>
                      <option value="Rajasthan">Rajasthan</option>
                      <option value="Jharkhand">Jharkhand</option>
                      <option value="Assam">Assam</option>
                      <option value="Other">Other State / Union Territory</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Target Districts</label>
                    <select
                      value={rfpDistrictCount}
                      onChange={(e) => setRfpDistrictCount(Number(e.target.value))}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      <option value={1}>1 Pilot District (25 PHCs)</option>
                      <option value={2}>2 Aspirational Districts (50 PHCs)</option>
                      <option value={5}>5 Districts (State Sub-Division)</option>
                      <option value={10}>10+ Districts (Statewide Phase 1)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Department / Mission
                  </label>
                  <input
                    type="text"
                    value={rfpDepartment}
                    onChange={(e) => setRfpDepartment(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="e.g. National Health Mission / Directorate of Health Services"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Officer Name</label>
                    <input
                      type="text"
                      value={rfpOfficerName}
                      onChange={(e) => setRfpOfficerName(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder="e.g. Dr. A. Sharma / Shri M. Verma"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Designation</label>
                    <input
                      type="text"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder="e.g. Mission Director / CDMO"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Official Email</label>
                    <input
                      type="email"
                      value={rfpEmail}
                      onChange={(e) => setRfpEmail(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder="name@gov.in or official email"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Contact Phone</label>
                    <input
                      type="tel"
                      value={rfpPhone}
                      onChange={(e) => setRfpPhone(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder="+91 98765 43210"
                      required
                    />
                  </div>
                </div>

                <div className="p-3 bg-blue-50 text-blue-900 border border-blue-200 rounded-lg text-[11px] leading-snug w-full">
                  <span className="font-bold block mb-0.5">Government Procurement Note:</span>
                  Pilot studies include complimentary tablet setup for 25 PHCs, offline PWA provisioning, and a 60-day DMO telemetry evaluation report.
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsRfpModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <SendIcon className="w-3.5 h-3.5" />
                    <span>Submit RFP Expression of Interest</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Small Send icon helper to avoid missing import
const SendIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
  </svg>
);
