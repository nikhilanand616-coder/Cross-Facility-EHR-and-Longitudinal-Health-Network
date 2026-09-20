import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import {
  Activity,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  FileSpreadsheet,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import { Facility } from '../types';

interface AnalyticsPerformanceDashboardProps {
  facilities: Facility[];
}

export const AnalyticsPerformanceDashboard: React.FC<AnalyticsPerformanceDashboardProps> = ({
  facilities,
}) => {
  // Volume by facility
  const volumeData = [
    { name: 'Rampur Sub-C', opd: 340, referrals: 45, visits: 385 },
    { name: 'Chandanpur PHC', opd: 820, referrals: 110, visits: 930 },
    { name: 'Belpahar CHC', opd: 1450, referrals: 185, visits: 1635 },
    { name: 'Sundargarh Dist', opd: 2890, referrals: 320, visits: 3210 },
  ];

  // Referral Specialties Distribution
  const specialtyData = [
    { name: 'Obstetrics & High-Risk ANC', value: 38, color: '#ec4899' },
    { name: 'Internal Med / Cardio', value: 32, color: '#6366f1' },
    { name: 'Pediatrics / Malnutrition', value: 18, color: '#f59e0b' },
    { name: 'Emergency Trauma & Surgery', value: 12, color: '#ef4444' },
  ];

  // Diagnostic Turnaround Time (TAT) trends (Hours from sample collection to verified result)
  const tatData = [
    { day: 'Mon', pointOfCare: 0.4, phcLab: 2.1, hubDistrictLab: 6.8 },
    { day: 'Tue', pointOfCare: 0.3, phcLab: 1.9, hubDistrictLab: 5.5 },
    { day: 'Wed', pointOfCare: 0.5, phcLab: 2.4, hubDistrictLab: 6.1 },
    { day: 'Thu', pointOfCare: 0.4, phcLab: 1.8, hubDistrictLab: 5.2 },
    { day: 'Fri', pointOfCare: 0.3, phcLab: 2.0, hubDistrictLab: 5.8 },
    { day: 'Sat', pointOfCare: 0.4, phcLab: 2.2, hubDistrictLab: 6.0 },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                <Activity className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Tiered Health Network Real-Time Performance Analytics
                </h2>
                <p className="text-xs text-slate-500">
                  Continuous surveillance of patient volume, referral loops, turnaround times, and clinical quality
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => alert('Exporting Clinic Quality Performance Report (PDF/CSV)...')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Analytics Report</span>
          </button>
        </div>

        {/* Real-time KPI Cards */}
        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Network Patient Reach</span>
            <strong className="text-xl font-bold text-slate-900 mt-1 block">6,160</strong>
            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
              <TrendingUp className="w-3 h-3" /> +14.2% vs last month
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Closed-Loop Counter-Referrals</span>
            <strong className="text-xl font-bold text-indigo-700 mt-1 block">89.4%</strong>
            <span className="text-[11px] text-slate-500 mt-0.5">Feedback sent back to Sub-centres</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Avg Lab Hub Transit TAT</span>
            <strong className="text-xl font-bold text-teal-700 mt-1 block">5.9 hrs</strong>
            <span className="text-[11px] text-emerald-600 font-semibold mt-0.5">Under 8-hr statutory limit</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">EDL Medicine Availability</span>
            <strong className="text-xl font-bold text-emerald-700 mt-1 block">96.8%</strong>
            <span className="text-[11px] text-slate-500 mt-0.5">Active inter-facility rebalancing</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Outpatient & Inpatient Volume by Tier */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">
              Patient Footfall & Encounters by Health Tier
            </h3>
            <p className="text-xs text-slate-500">Comparing routine outpatient care against inter-tier escalations</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="opd" name="Primary OPD Consultations" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="referrals" name="Inbound / Outbound Referrals" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Referral Specialty Breakdown */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">
              Inter-Facility Referral Specialty Distribution
            </h3>
            <p className="text-xs text-slate-500">Leading causes of escalation to secondary & tertiary hubs</p>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={specialtyData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {specialtyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val) => `${val}%`}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Diagnostic TAT Trends */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs lg:col-span-2">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">
              Laboratory Specimen Turnaround Time (TAT) in Hours
            </h3>
            <p className="text-xs text-slate-500">
              Point of Care instant diagnostics vs Sub-centre cold-chain transit to District Hub Lab
            </p>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={tatData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit=" hrs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line
                  type="monotone"
                  dataKey="pointOfCare"
                  name="Point-of-Care Tests (Rapid)"
                  stroke="#10b981"
                  strokeWidth={2.5}
                />
                <Line
                  type="monotone"
                  dataKey="phcLab"
                  name="PHC Onsite Lab (Routine)"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                />
                <Line
                  type="monotone"
                  dataKey="hubDistrictLab"
                  name="District Central Hub Lab (Cold-Chain Transit)"
                  stroke="#d97706"
                  strokeWidth={2.5}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
