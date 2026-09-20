import React, { useState, useMemo } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  Filter,
  Phone,
  Search,
  Settings,
  Sparkles,
  Wrench,
  Building2,
  RefreshCw,
} from 'lucide-react';
import { DiagnosticEquipmentRecord, FacilityTier } from '../../types';
import { updateDiagnosticEquipmentStatus } from '../../lib/dmoFacilityService';

interface DiagnosticEquipmentMonitorProps {
  equipment: DiagnosticEquipmentRecord[];
  onRefresh?: () => void;
}

export const DiagnosticEquipmentMonitor: React.FC<DiagnosticEquipmentMonitorProps> = ({
  equipment,
  onRefresh,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEquipmentForAction, setSelectedEquipmentForAction] = useState<DiagnosticEquipmentRecord | null>(null);
  const [actionNotes, setActionNotes] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Filtered equipment list
  const filteredEquipment = useMemo(() => {
    return equipment.filter((eq) => {
      if (statusFilter !== 'all' && eq.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && eq.category !== categoryFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          eq.name.toLowerCase().includes(query) ||
          eq.facilityName.toLowerCase().includes(query) ||
          eq.serialNumber.toLowerCase().includes(query) ||
          (eq.reportedIssue && eq.reportedIssue.toLowerCase().includes(query))
        );
      }
      return true;
    });
  }, [equipment, statusFilter, categoryFilter, searchQuery]);

  // Overall metrics
  const metrics = useMemo(() => {
    const total = equipment.length;
    const operational = equipment.filter((e) => e.status === 'operational').length;
    const breakdown = equipment.filter((e) => e.status === 'breakdown').length;
    const maintenance = equipment.filter((e) => e.status === 'maintenance_needed').length;
    const calibration = equipment.filter((e) => e.status === 'calibration_due').length;
    const avgUptime =
      total > 0
        ? Math.round(equipment.reduce((sum, e) => sum + (e.uptimePercent || 90), 0) / total)
        : 95;

    return { total, operational, breakdown, maintenance, calibration, avgUptime };
  }, [equipment]);

  const handleUpdateStatus = async (
    newStatus: DiagnosticEquipmentRecord['status']
  ) => {
    if (!selectedEquipmentForAction) return;
    setIsUpdating(true);
    await updateDiagnosticEquipmentStatus(selectedEquipmentForAction.id, newStatus, actionNotes);
    setIsUpdating(false);
    setSelectedEquipmentForAction(null);
    setActionNotes('');
    if (onRefresh) onRefresh();
  };

  return (
    <div id="equipment-status-monitor" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-200 bg-slate-50/60">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                <Cpu className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                Diagnostic & Cold-Chain Equipment Registry
              </h3>
            </div>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Real-time operational status, calibration schedule, and uptime across all lower-tier facilities (PHCs &
              Sub-Centres).
            </p>
          </div>

          {/* Quick Stats Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{metrics.operational} Operational</span>
            </div>
            {metrics.breakdown > 0 && (
              <div className="px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs font-semibold flex items-center gap-1.5 animate-pulse">
                <AlertOctagon className="w-4 h-4 text-rose-600" />
                <span>{metrics.breakdown} Breakdown (Down)</span>
              </div>
            )}
            {metrics.maintenance > 0 && (
              <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs font-semibold flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-amber-600" />
                <span>{metrics.maintenance} Maint. Needed</span>
              </div>
            )}
            <div className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 text-xs font-semibold">
              District Uptime: {metrics.avgUptime}%
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="mt-4 pt-4 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-500 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Status:
            </span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({equipment.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('breakdown')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === 'breakdown' ? 'bg-rose-600 text-white' : 'text-rose-700 hover:bg-rose-50'
                }`}
              >
                Down ({metrics.breakdown})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('maintenance_needed')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === 'maintenance_needed' ? 'bg-amber-600 text-white' : 'text-amber-700 hover:bg-amber-50'
                }`}
              >
                Service ({metrics.maintenance})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('operational')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === 'operational' ? 'bg-emerald-600 text-white' : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                Ready ({metrics.operational})
              </button>
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Modalities</option>
              <option value="cold_chain">Cold-Chain (ILRs & Carriers)</option>
              <option value="point_of_care">Point of Care (Hemoglobin / Gluco)</option>
              <option value="laboratory">Laboratory Analyzers</option>
              <option value="maternal_care">Maternal & Infant Care</option>
              <option value="imaging">Imaging (USG / ECG)</option>
            </select>
          </div>

          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search equipment or serial..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Equipment Cards Grid */}
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEquipment.map((eq) => {
          const isDown = eq.status === 'breakdown';
          const isMaintenance = eq.status === 'maintenance_needed';
          const isCalibrationDue = eq.status === 'calibration_due';
          const isOperational = eq.status === 'operational';

          return (
            <div
              key={eq.id}
              className={`rounded-xl border p-4 transition-all duration-150 flex flex-col justify-between ${
                isDown
                  ? 'bg-rose-50/70 border-rose-300 ring-1 ring-rose-400'
                  : isMaintenance
                  ? 'bg-amber-50/60 border-amber-300'
                  : isCalibrationDue
                  ? 'bg-orange-50/50 border-orange-200'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                {/* Status Badge & Modality */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      isDown
                        ? 'bg-rose-600 text-white animate-pulse'
                        : isMaintenance
                        ? 'bg-amber-500 text-white'
                        : isCalibrationDue
                        ? 'bg-orange-500 text-white'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {isDown && <AlertOctagon className="w-3 h-3" />}
                    {isMaintenance && <Wrench className="w-3 h-3" />}
                    {isCalibrationDue && <Clock className="w-3 h-3" />}
                    {isOperational && <CheckCircle2 className="w-3 h-3" />}
                    <span>{eq.status.replace('_', ' ')}</span>
                  </span>

                  <span className="text-[10px] text-slate-500 font-mono">
                    SN: {eq.serialNumber}
                  </span>
                </div>

                {/* Equipment Name */}
                <h4 className="text-sm font-bold text-slate-900 leading-snug">
                  {eq.name}
                </h4>

                {/* Facility location */}
                <div className="text-xs text-slate-600 flex items-center gap-1.5 mt-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-medium text-slate-700 truncate">{eq.facilityName}</span>
                </div>

                {/* Reported Issue for breakdown */}
                {eq.reportedIssue && (
                  <div className="mt-2.5 p-2 bg-white/90 rounded-lg border border-rose-200 text-[11px] text-rose-800">
                    <span className="font-semibold block">Fault Diagnosis:</span>
                    <span>{eq.reportedIssue}</span>
                  </div>
                )}

                {/* Telemetry / Uptime */}
                <div className="mt-3 pt-2.5 border-t border-slate-200/80 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                  <div>
                    <span>Uptime:</span>{' '}
                    <span
                      className={`font-semibold ${
                        eq.uptimePercent < 75 ? 'text-rose-600' : 'text-emerald-700'
                      }`}
                    >
                      {eq.uptimePercent}%
                    </span>
                  </div>
                  <div>
                    <span>Last Serviced:</span>{' '}
                    <span className="font-medium text-slate-700">{eq.lastServicedDate}</span>
                  </div>
                </div>

                {/* Technician Contact */}
                {eq.technicianContact && (
                  <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-1 truncate">
                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>Nodal Desk: {eq.technicianContact}</span>
                  </div>
                )}
              </div>

              {/* DMO Action Button */}
              <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedEquipmentForAction(eq)}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Settings className="w-3 h-3" />
                  <span>Manage Status</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Dialog */}
      {selectedEquipmentForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 border border-slate-200 shadow-xl text-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h4 className="text-sm font-bold text-slate-900">
                Update Equipment Status
              </h4>
              <button
                type="button"
                onClick={() => setSelectedEquipmentForAction(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div>
              <span className="text-slate-500">Equipment:</span>{' '}
              <span className="font-bold text-slate-800">{selectedEquipmentForAction.name}</span>
              <div className="text-slate-500 mt-0.5">
                Facility: {selectedEquipmentForAction.facilityName}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Technician Action Notes / Service Resolution
              </label>
              <textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="e.g. Optical sensor replaced and calibrated against standard control..."
                rows={3}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => handleUpdateStatus('operational')}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark Operational</span>
              </button>

              <button
                type="button"
                disabled={isUpdating}
                onClick={() => handleUpdateStatus('breakdown')}
                className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg flex items-center justify-center gap-1.5"
              >
                <AlertOctagon className="w-4 h-4" />
                <span>Report Breakdown</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
