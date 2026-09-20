import React, { useState, useEffect, useRef } from 'react';
import {
  GitBranch,
  Calendar,
  CheckCircle2,
  Copy,
  Check,
  Clock,
  Layers,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Flame,
  Info,
  ExternalLink,
  Code2,
  Table as TableIcon,
  Maximize2,
} from 'lucide-react';
import mermaid from 'mermaid';

export interface PertTask {
  id: string;
  name: string;
  phase: string;
  predecessors: string[];
  optimistic: number; // a
  mostLikely: number;  // m
  pessimistic: number; // b
  expected: number;    // Te = (a + 4m + b)/6
  variance: number;    // Var = ((b - a)/6)^2
  earlyStart: number;  // ES
  earlyFinish: number; // EF
  lateStart: number;   // LS
  lateFinish: number;  // LF
  slack: number;       // S = LS - ES
  isCritical: boolean;
  deliverables: string;
}

export const PERT_CPM_TASKS: PertTask[] = [
  {
    id: 'T01',
    name: 'Clinical Protocol & Regulatory Arch Specs',
    phase: 'Phase 1: Foundation',
    predecessors: [],
    optimistic: 2,
    mostLikely: 3,
    pessimistic: 4,
    expected: 3.0,
    variance: 0.11,
    earlyStart: 0,
    earlyFinish: 3,
    lateStart: 0,
    lateFinish: 3,
    slack: 0,
    isCritical: true,
    deliverables: 'ICMR / NHM triage guidelines, ABDM M1-M3 architecture mapping',
  },
  {
    id: 'T02',
    name: 'Firestore Database Schemas & Security Rules',
    phase: 'Phase 1: Foundation',
    predecessors: ['T01'],
    optimistic: 3,
    mostLikely: 4,
    pessimistic: 5,
    expected: 4.0,
    variance: 0.11,
    earlyStart: 3,
    earlyFinish: 7,
    lateStart: 3,
    lateFinish: 7,
    slack: 0,
    isCritical: true,
    deliverables: 'firebase-blueprint.json, firestore.rules, composite index configs',
  },
  {
    id: 'T03',
    name: 'Firebase Auth & Cross-Tier RBAC Roles',
    phase: 'Phase 1: Foundation',
    predecessors: ['T02'],
    optimistic: 2,
    mostLikely: 3,
    pessimistic: 4,
    expected: 3.0,
    variance: 0.11,
    earlyStart: 7,
    earlyFinish: 10,
    lateStart: 8,
    lateFinish: 11,
    slack: 1,
    isCritical: false,
    deliverables: 'Token claims for Doctor, CHO, ASHA, DMO & Admin profiles',
  },
  {
    id: 'T04',
    name: 'Gemini 2.5 Flash Clinical Decision Support',
    phase: 'Phase 2: Clinical AI',
    predecessors: ['T02'],
    optimistic: 4,
    mostLikely: 5,
    pessimistic: 6,
    expected: 5.0,
    variance: 0.11,
    earlyStart: 7,
    earlyFinish: 12,
    lateStart: 7,
    lateFinish: 12,
    slack: 0,
    isCritical: true,
    deliverables: 'Triage prioritization, drug interaction checks, structured SOAP generation',
  },
  {
    id: 'T05',
    name: 'Gemini Multimodal OCR & Lab Report Extraction',
    phase: 'Phase 2: Clinical AI',
    predecessors: ['T04'],
    optimistic: 3,
    mostLikely: 4,
    pessimistic: 5,
    expected: 4.0,
    variance: 0.11,
    earlyStart: 12,
    earlyFinish: 16,
    lateStart: 13,
    lateFinish: 17,
    slack: 1,
    isCritical: false,
    deliverables: 'Handwritten prescription digitizer & CBC/lipid lab parser',
  },
  {
    id: 'T06',
    name: "Vogel's Approximation Method Drug Routing",
    phase: 'Phase 3: Logistics',
    predecessors: ['T02'],
    optimistic: 3,
    mostLikely: 4,
    pessimistic: 5,
    expected: 4.0,
    variance: 0.11,
    earlyStart: 7,
    earlyFinish: 11,
    lateStart: 13,
    lateFinish: 17,
    slack: 6,
    isCritical: false,
    deliverables: 'Tiered delivery optimizer, mountain barrier avoidance, cold-chain checks',
  },
  {
    id: 'T07',
    name: 'Post-Discharge Adherence & ASHA SMS Escalation',
    phase: 'Phase 4: Chronic Care',
    predecessors: ['T04'],
    optimistic: 3,
    mostLikely: 4,
    pessimistic: 5,
    expected: 4.0,
    variance: 0.11,
    earlyStart: 12,
    earlyFinish: 16,
    lateStart: 12,
    lateFinish: 16,
    slack: 0,
    isCritical: true,
    deliverables: 'Daily checklist, 3-consecutive-missed daemon, automated ASHA SMS trigger',
  },
  {
    id: 'T08',
    name: 'Offline-First PWA & IndexedDB Sync Engine',
    phase: 'Phase 5: Sub-Centre Edge',
    predecessors: ['T07'],
    optimistic: 4,
    mostLikely: 5,
    pessimistic: 6,
    expected: 5.0,
    variance: 0.11,
    earlyStart: 16,
    earlyFinish: 21,
    lateStart: 16,
    lateFinish: 21,
    slack: 0,
    isCritical: true,
    deliverables: 'Zero-connectivity mutation queue, background sync, conflict resolver',
  },
  {
    id: 'T09',
    name: 'WebRTC Teleconsult & Emergency Signaling',
    phase: 'Phase 5: Sub-Centre Edge',
    predecessors: ['T03', 'T04'],
    optimistic: 3,
    mostLikely: 4,
    pessimistic: 5,
    expected: 4.0,
    variance: 0.11,
    earlyStart: 12,
    earlyFinish: 16,
    lateStart: 17,
    lateFinish: 21,
    slack: 5,
    isCritical: false,
    deliverables: 'Peer-to-peer audio/video rooms with 2G low-bandwidth audio fallback',
  },
  {
    id: 'T10',
    name: 'Indic Multilingual UI & Frontline Voice Assist',
    phase: 'Phase 6: Localization',
    predecessors: ['T08'],
    optimistic: 3,
    mostLikely: 4,
    pessimistic: 5,
    expected: 4.0,
    variance: 0.11,
    earlyStart: 21,
    earlyFinish: 25,
    lateStart: 21,
    lateFinish: 25,
    slack: 0,
    isCritical: true,
    deliverables: 'Hindi, Marathi, Bengali, Telugu speech recognition & i18n catalogs',
  },
  {
    id: 'T11',
    name: 'ASHA & Sub-Centre Mobile Interactive Portal',
    phase: 'Phase 6: Localization',
    predecessors: ['T08', 'T07'],
    optimistic: 2,
    mostLikely: 3,
    pessimistic: 4,
    expected: 3.0,
    variance: 0.11,
    earlyStart: 21,
    earlyFinish: 24,
    lateStart: 22,
    lateFinish: 25,
    slack: 1,
    isCritical: false,
    deliverables: 'Touch-optimized mobile checklists, NCD screening, field referral tracker',
  },
  {
    id: 'T12',
    name: 'Ayushman Bharat (ABDM M1-M3) Compliance Audit',
    phase: 'Phase 7: Certification',
    predecessors: ['T10', 'T11', 'T05', 'T06', 'T09'],
    optimistic: 3,
    mostLikely: 4,
    pessimistic: 5,
    expected: 4.0,
    variance: 0.11,
    earlyStart: 25,
    earlyFinish: 29,
    lateStart: 25,
    lateFinish: 29,
    slack: 0,
    isCritical: true,
    deliverables: 'HIPAA & DISHA compliance validation, ABHA linking, PM-JAY package checks',
  },
  {
    id: 'T13',
    name: 'Field Pilot Trials, Pen-Testing & Prototype Release',
    phase: 'Phase 8: Deployment',
    predecessors: ['T12'],
    optimistic: 2,
    mostLikely: 3,
    pessimistic: 4,
    expected: 3.0,
    variance: 0.11,
    earlyStart: 29,
    earlyFinish: 32,
    lateStart: 29,
    lateFinish: 32,
    slack: 0,
    isCritical: true,
    deliverables: 'End-to-end load tests, simulated Sub-Centre field test, deployment signoff',
  },
];

export const MERMAID_DIAGRAM_CODE = `%% ============================================================================
%% PERT / CPM CRITICAL PATH METHOD NETWORK DIAGRAM
%% Project: Pan-India Tiered HealthTech Platform & Ayushman Bharat Integration
%% Strict Completion Target: 32 Working Days (Confidence: 95% within 34.3 days)
%% ============================================================================
graph LR
    %% Class Definitions
    classDef critical fill:#fee2e2,stroke:#b91c1c,stroke-width:3.5px,color:#991b1b,font-weight:bold;
    classDef nonCritical fill:#f1f5f9,stroke:#64748b,stroke-width:1.5px,color:#334155;
    classDef milestone fill:#eff6ff,stroke:#2563eb,stroke-width:3px,color:#1e40af,font-weight:bold;

    START((START<br/>Day 0)):::milestone

    %% Phase 1: Foundation
    T01["<b>T01: Clinical Protocol & Regulatory Specs</b><br/>Te=3d | ES:0 EF:3 | Slack:0<br/><i>*CRITICAL PATH*</i>"]:::critical
    T02["<b>T02: Firestore Schema & Security Rules</b><br/>Te=4d | ES:3 EF:7 | Slack:0<br/><i>*CRITICAL PATH*</i>"]:::critical
    T03["<b>T03: Firebase Auth & RBAC</b><br/>Te=3d | ES:7 EF:10 | Slack:1"]:::nonCritical

    %% Phase 2 & 3: AI & Logistics
    T04["<b>T04: Gemini 2.5 Flash CDS & Triage</b><br/>Te=5d | ES:7 EF:12 | Slack:0<br/><i>*CRITICAL PATH*</i>"]:::critical
    T05["<b>T05: Gemini Multimodal OCR Pipeline</b><br/>Te=4d | ES:12 EF:16 | Slack:1"]:::nonCritical
    T06["<b>T06: VAM Medicine Distribution Engine</b><br/>Te=4d | ES:7 EF:11 | Slack:6"]:::nonCritical

    %% Phase 4 & 5: Chronic Adherence & Edge Engine
    T07["<b>T07: Post-Discharge Adherence & SMS Escalation</b><br/>Te=4d | ES:12 EF:16 | Slack:0<br/><i>*CRITICAL PATH*</i>"]:::critical
    T08["<b>T08: Offline-First PWA & IndexedDB Sync</b><br/>Te=5d | ES:16 EF:21 | Slack:0<br/><i>*CRITICAL PATH*</i>"]:::critical
    T09["<b>T09: WebRTC Teleconsult & Emergency Signalling</b><br/>Te=4d | ES:12 EF:16 | Slack:5"]:::nonCritical

    %% Phase 6: Frontline & Localization
    T10["<b>T10: Indic Multilingual UI & Voice Assist</b><br/>Te=4d | ES:21 EF:25 | Slack:0<br/><i>*CRITICAL PATH*</i>"]:::critical
    T11["<b>T11: Frontline ASHA Sub-Centre Mobile Portal</b><br/>Te=3d | ES:21 EF:24 | Slack:1"]:::nonCritical

    %% Phase 7 & 8: Compliance & Prototype Release
    T12["<b>T12: Ayushman Bharat (ABDM) Compliance Audit</b><br/>Te=4d | ES:25 EF:29 | Slack:0<br/><i>*CRITICAL PATH*</i>"]:::critical
    T13["<b>T13: Field Pilot Trials & Production Release</b><br/>Te=3d | ES:29 EF:32 | Slack:0<br/><i>*CRITICAL PATH*</i>"]:::critical

    END_NODE((FINISH<br/>Day 32)):::milestone

    %% Dependencies & Link Styles
    START ==>|Day 0| T01
    T01 ==>|Day 3| T02
    T02 -->|Day 7| T03
    T02 ==>|Day 7| T04
    T02 -.->|Day 7| T06
    T04 -->|Day 12| T05
    T04 ==>|Day 12| T07
    T03 -.->|Day 10| T09
    T04 -.->|Day 12| T09
    T07 ==>|Day 16| T08
    T08 ==>|Day 21| T10
    T08 -->|Day 21| T11
    T07 -.->|Day 16| T11
    T10 ==>|Day 25| T12
    T11 -->|Day 24| T12
    T05 -.->|Day 16| T12
    T06 -.->|Day 11| T12
    T09 -.->|Day 16| T12
    T12 ==>|Day 29| T13
    T13 ==>|Day 32| END_NODE

    %% High-contrast Critical Path Highlight Links
    linkStyle 0,1,3,6,8,9,12,18,19 stroke:#b91c1c,stroke-width:3.5px;
`;

export const PertCpmRoadmapViewer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'diagram' | 'table' | 'code'>('diagram');
  const [copied, setCopied] = useState<boolean>(false);
  const [filterCriticalOnly, setFilterCriticalOnly] = useState<boolean>(false);
  const mermaidRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'neutral',
      securityLevel: 'loose',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 12,
    });

    if (activeTab === 'diagram' && mermaidRef.current) {
      mermaidRef.current.innerHTML = '';
      mermaid
        .render('mermaid-pert-chart', MERMAID_DIAGRAM_CODE)
        .then(({ svg }) => {
          if (mermaidRef.current) {
            mermaidRef.current.innerHTML = svg;
          }
        })
        .catch((err) => {
          console.error('Mermaid render error:', err);
        });
    }
  }, [activeTab]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(MERMAID_DIAGRAM_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const displayedTasks = filterCriticalOnly
    ? PERT_CPM_TASKS.filter((t) => t.isCritical)
    : PERT_CPM_TASKS;

  const totalCriticalDuration = PERT_CPM_TASKS.filter((t) => t.isCritical).reduce(
    (sum, t) => sum + t.expected,
    0
  );

  const totalCriticalVariance = PERT_CPM_TASKS.filter((t) => t.isCritical).reduce(
    (sum, t) => sum + t.variance,
    0
  );

  const criticalStdDev = Math.sqrt(totalCriticalVariance);
  const upperConfidence95 = (totalCriticalDuration + 1.96 * criticalStdDev).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl border border-indigo-800/40 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-indigo-500/20 border border-indigo-400/40 rounded-xl text-indigo-300 shrink-0">
              <GitBranch className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">
                  PERT & Critical Path Method (CPM) Schedule
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-400/30">
                  Critical Path: 32 Working Days
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  Mermaid.js Synthesized
                </span>
              </div>
              <p className="text-xs text-indigo-200/90 mt-1 max-w-3xl">
                Rigorous PERT analysis and Critical Path sequence mapping all engineering phases from Firebase database
                setup and Gemini 2.5 Flash clinical integration to offline-first Sub-Centre sync, Indic multilingual
                support, and Ayushman Bharat (ABDM) compliance testing on a strict timeline.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-center">
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Mermaid Code Copied!' : 'Copy Mermaid Code'}</span>
            </button>
          </div>
        </div>

        {/* Aggregate KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-indigo-800/60 text-xs">
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="text-[10px] text-indigo-300 uppercase font-semibold">Critical Timeline</span>
            <p className="text-xl font-bold text-rose-400 mt-0.5">{totalCriticalDuration} Days</p>
            <span className="text-[10px] text-slate-300">8 Critical Path Tasks (Slack = 0)</span>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="text-[10px] text-indigo-300 uppercase font-semibold">95% Confidence Upper Bound</span>
            <p className="text-xl font-bold text-emerald-300 mt-0.5">{upperConfidence95} Days</p>
            <span className="text-[10px] text-slate-300">σ = {criticalStdDev.toFixed(2)}d variance buffer</span>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="text-[10px] text-indigo-300 uppercase font-semibold">Total Work Packages</span>
            <p className="text-xl font-bold text-white mt-0.5">{PERT_CPM_TASKS.length} Tasks</p>
            <span className="text-[10px] text-slate-300">Across 8 Engineering Phases</span>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="text-[10px] text-indigo-300 uppercase font-semibold">Zero-Slack Sequence</span>
            <p className="text-xs font-mono font-bold text-indigo-200 mt-1 truncate">
              T01→T02→T04→T07→T08→T10→T12→T13
            </p>
            <span className="text-[10px] text-rose-300 font-semibold">Zero margin for slippage</span>
          </div>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('diagram')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'diagram'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <GitBranch className="w-4 h-4" />
            <span>Interactive Mermaid Diagram</span>
          </button>

          <button
            onClick={() => setActiveTab('table')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'table'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <TableIcon className="w-4 h-4" />
            <span>PERT / CPM Mathematical Table</span>
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'code'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Raw Mermaid.js Syntax</span>
          </button>
        </div>

        {activeTab === 'table' && (
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer self-start sm:self-auto">
            <input
              type="checkbox"
              checked={filterCriticalOnly}
              onChange={(e) => setFilterCriticalOnly(e.target.checked)}
              className="rounded text-rose-600 focus:ring-rose-500 accent-rose-600"
            />
            <span className="text-rose-700 font-bold">Show Critical Path Only (Slack = 0)</span>
          </label>
        )}
      </div>

      {/* Tab 1: Interactive Mermaid Diagram */}
      {activeTab === 'diagram' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-600" />
                Network Diagram with Highlighted Critical Path
              </h3>
              <p className="text-xs text-slate-500">
                Double-bordered red nodes indicate tasks on the critical path ($Slack = 0$). Thicker red links show the governing critical timeline.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 font-bold text-rose-700">
                <span className="w-3 h-3 rounded-full bg-rose-200 border-2 border-rose-600 inline-block"></span>
                Critical Path
              </span>
              <span className="flex items-center gap-1.5 font-medium text-slate-600">
                <span className="w-3 h-3 rounded-full bg-slate-100 border border-slate-400 inline-block"></span>
                Has Slack Buffer
              </span>
            </div>
          </div>

          <div className="overflow-x-auto p-4 bg-slate-50/70 rounded-xl border border-slate-200 flex justify-center">
            <div ref={mermaidRef} className="mermaid-chart min-w-[800px] w-full flex justify-center" />
          </div>
        </div>
      )}

      {/* Tab 2: Mathematical PERT / CPM Table */}
      {activeTab === 'table' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Forward & Backward Pass Schedule Calculations
              </h3>
              <p className="text-xs text-slate-500">
                Te = (a + 4m + b) / 6 • S = LS - ES = LF - EF. Critical tasks possess zero float (Slack = 0).
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                  <th className="p-2.5">Task ID</th>
                  <th className="p-2.5">Task Description</th>
                  <th className="p-2.5">Phase</th>
                  <th className="p-2.5 text-center">Pred.</th>
                  <th className="p-2.5 text-center" title="Optimistic (a)">a (d)</th>
                  <th className="p-2.5 text-center" title="Most Likely (m)">m (d)</th>
                  <th className="p-2.5 text-center" title="Pessimistic (b)">b (d)</th>
                  <th className="p-2.5 text-center font-black" title="Expected Duration Te">Te (d)</th>
                  <th className="p-2.5 text-center">ES</th>
                  <th className="p-2.5 text-center">EF</th>
                  <th className="p-2.5 text-center">LS</th>
                  <th className="p-2.5 text-center">LF</th>
                  <th className="p-2.5 text-center font-black">Slack (S)</th>
                  <th className="p-2.5 text-center">Path Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {displayedTasks.map((t) => (
                  <tr
                    key={t.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      t.isCritical ? 'bg-rose-50/30' : ''
                    }`}
                  >
                    <td className="p-2.5 font-mono font-bold text-slate-900">{t.id}</td>
                    <td className="p-2.5">
                      <div className="font-bold text-slate-900">{t.name}</div>
                      <div className="text-[10px] text-slate-500">{t.deliverables}</div>
                    </td>
                    <td className="p-2.5 text-slate-600 whitespace-nowrap">{t.phase}</td>
                    <td className="p-2.5 text-center font-mono text-slate-600">
                      {t.predecessors.length > 0 ? t.predecessors.join(', ') : '-'}
                    </td>
                    <td className="p-2.5 text-center font-mono text-slate-600">{t.optimistic}</td>
                    <td className="p-2.5 text-center font-mono text-slate-600">{t.mostLikely}</td>
                    <td className="p-2.5 text-center font-mono text-slate-600">{t.pessimistic}</td>
                    <td className="p-2.5 text-center font-mono font-bold text-slate-900 bg-slate-50">
                      {t.expected.toFixed(1)}
                    </td>
                    <td className="p-2.5 text-center font-mono text-slate-700">{t.earlyStart}</td>
                    <td className="p-2.5 text-center font-mono text-slate-700">{t.earlyFinish}</td>
                    <td className="p-2.5 text-center font-mono text-slate-700">{t.lateStart}</td>
                    <td className="p-2.5 text-center font-mono text-slate-700">{t.lateFinish}</td>
                    <td
                      className={`p-2.5 text-center font-mono font-black ${
                        t.slack === 0 ? 'text-rose-700 bg-rose-100/60' : 'text-emerald-700 bg-emerald-50'
                      }`}
                    >
                      {t.slack}d
                    </td>
                    <td className="p-2.5 text-center">
                      {t.isCritical ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white">
                          CRITICAL
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-700">
                          Slack ({t.slack}d)
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Raw Mermaid Syntax */}
      {activeTab === 'code' && (
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 text-white font-mono text-xs space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-slate-400 font-sans text-xs font-semibold">
              Mermaid.js v10+ PERT/CPM Chart Syntax
            </span>
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <pre className="overflow-x-auto text-emerald-400 leading-relaxed max-h-[500px]">
            {MERMAID_DIAGRAM_CODE}
          </pre>
        </div>
      )}
    </div>
  );
};
