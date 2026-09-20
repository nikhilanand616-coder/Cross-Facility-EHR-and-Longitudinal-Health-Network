import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { BarChart3, PieChart as PieChartIcon, Activity } from 'lucide-react';
import { FacilityInventoryRecord, DiagnosticEquipmentRecord } from '../../types';
import { DMOFacilityNode } from '../../lib/dmoFacilityService';

interface AnalyticsChartsProps {
  inventory: FacilityInventoryRecord[];
  equipment: DiagnosticEquipmentRecord[];
  facilities: DMOFacilityNode[];
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  inventory,
  equipment,
  facilities,
}) => {
  // Aggregate stock vs minThreshold per critical medicine
  const medicineAggregates = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        currentStock: number;
        minThreshold: number;
        unit: string;
        stockoutCount: number;
      }
    >();

    inventory.forEach((item) => {
      const existing = map.get(item.medicineId) || {
        name: item.medicineName.split(' ')[0] + ' ' + (item.medicineName.split(' ')[1] || ''),
        currentStock: 0,
        minThreshold: 0,
        unit: item.unit,
        stockoutCount: 0,
      };

      existing.currentStock += item.currentStock;
      existing.minThreshold += item.minThreshold;
      if (item.status === 'stockout' || item.currentStock <= 0) {
        existing.stockoutCount += 1;
      }

      map.set(item.medicineId, existing);
    });

    return Array.from(map.values());
  }, [inventory]);

  // Equipment operational distribution
  const equipmentDistribution = useMemo(() => {
    let operational = 0;
    let breakdown = 0;
    let maintenance = 0;
    let calibration = 0;

    equipment.forEach((eq) => {
      if (eq.status === 'operational') operational++;
      else if (eq.status === 'breakdown') breakdown++;
      else if (eq.status === 'maintenance_needed') maintenance++;
      else if (eq.status === 'calibration_due') calibration++;
    });

    return [
      { name: 'Operational', value: operational, color: '#10b981' },
      { name: 'Breakdown (Down)', value: breakdown, color: '#f43f5e' },
      { name: 'Maintenance Needed', value: maintenance, color: '#f59e0b' },
      { name: 'Calibration Due', value: calibration, color: '#f97316' },
    ].filter((item) => item.value > 0);
  }, [equipment]);

  // Facility stock sufficiency rate
  const facilitySufficiency = useMemo(() => {
    return facilities.map((fac) => {
      const facItems = inventory.filter((i) => i.facilityId === fac.id);
      const totalItems = facItems.length || 1;
      const optimalItems = facItems.filter((i) => i.status === 'optimal').length;
      const score = Math.round((optimalItems / totalItems) * 100);

      return {
        name: fac.name.replace(' Primary Health Centre', ' PHC').replace(' Health Sub-Centre (HWC)', ' SC'),
        score,
        tier: fac.tier === 'phc' ? 'PHC' : 'Sub-Centre',
      };
    });
  }, [facilities, inventory]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 1. Critical Supplies Stock vs Threshold Chart */}
      <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                <BarChart3 className="w-4 h-4" />
              </span>
              <h4 className="text-sm font-bold text-slate-900">
                District Stock Buffer vs Min-Threshold Aggregate
              </h4>
            </div>
            <span className="text-[11px] text-slate-500">Real-time units across district</span>
          </div>
          <p className="text-xs text-slate-600 mb-4">
            Aggregated drug stockpile in circulation compared to cumulative safety threshold buffer.
          </p>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={medicineAggregates} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#475569' }}
                interval={0}
                angle={-15}
                textAnchor="end"
              />
              <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="currentStock" name="Current Stock" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="minThreshold" name="Safety Threshold" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Diagnostic Equipment Readiness Donut Chart */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
              <PieChartIcon className="w-4 h-4" />
            </span>
            <h4 className="text-sm font-bold text-slate-900">
              Equipment Operational Readiness
            </h4>
          </div>
          <p className="text-xs text-slate-600 mb-2">
            Breakdown of active biomedical machines across lower-tier centers.
          </p>
        </div>

        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={equipmentDistribution}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={3}
              >
                {equipmentDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '11px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
          {equipmentDistribution.map((item) => (
            <div key={item.name} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-slate-600 truncate">{item.name}:</span>
              <span className="font-bold text-slate-800">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
