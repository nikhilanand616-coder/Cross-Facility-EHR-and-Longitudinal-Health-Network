import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRightLeft,
  Building2,
  CheckCircle2,
  Cpu,
  Database,
  Download,
  FileText,
  Flame,
  LayoutDashboard,
  MapPin,
  Pill,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react';
import {
  FacilityInventoryRecord,
  DiagnosticEquipmentRecord,
  InventoryTransferRecord,
} from '../../types';
import {
  DMOFacilityNode,
  DMO_DISTRICT_FACILITIES,
  subscribeFacilityInventory,
  subscribeDiagnosticEquipment,
  subscribeInventoryTransfers,
  seedDMODataToFirestoreIfEmpty,
} from '../../lib/dmoFacilityService';
import { HeatmapComponent } from './HeatmapComponent';
import { ReRouteResourcesModal } from './ReRouteResourcesModal';
import { DiagnosticEquipmentMonitor } from './DiagnosticEquipmentMonitor';
import { AnalyticsCharts } from './AnalyticsCharts';
import { TransferLedgerTable } from './TransferLedgerTable';

interface FacilityDashboardProps {
  onNavigateTab?: (tabId: string) => void;
}

export const FacilityDashboard: React.FC<FacilityDashboardProps> = () => {
  const [facilities, setFacilities] = useState<DMOFacilityNode[]>(DMO_DISTRICT_FACILITIES);
  const [inventory, setInventory] = useState<FacilityInventoryRecord[]>([]);
  const [equipment, setEquipment] = useState<DiagnosticEquipmentRecord[]>([]);
  const [transfers, setTransfers] = useState<InventoryTransferRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeSubTab, setActiveSubTab] = useState<'heatmap' | 'equipment' | 'ledger' | 'analytics'>('heatmap');

  // Re-route modal state
  const [isRerouteModalOpen, setIsRerouteModalOpen] = useState<boolean>(false);
  const [selectedDeficitFacilityId, setSelectedDeficitFacilityId] = useState<string | undefined>();
  const [selectedMedicineId, setSelectedMedicineId] = useState<string | undefined>();
  const [selectedSurplusFacilityId, setSelectedSurplusFacilityId] = useState<string | undefined>();

  // Notification / Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Initialize Firestore listeners
  useEffect(() => {
    let isMounted = true;

    // Trigger seeding if collection is newly created
    seedDMODataToFirestoreIfEmpty();

    const unsubInventory = subscribeFacilityInventory((data) => {
      if (isMounted) {
        setInventory(data);
        setIsLoading(false);
      }
    });

    const unsubEquipment = subscribeDiagnosticEquipment((data) => {
      if (isMounted) setEquipment(data);
    });

    const unsubTransfers = subscribeInventoryTransfers((data) => {
      if (isMounted) setTransfers(data);
    });

    return () => {
      isMounted = false;
      unsubInventory();
      unsubEquipment();
      unsubTransfers();
    };
  }, []);

  // Summary counts
  const kpiData = useMemo(() => {
    const totalFacilities = facilities.length;
    const phcCount = facilities.filter((f) => f.tier === 'phc').length;
    const subCentreCount = facilities.filter((f) => f.tier === 'sub_centre').length;

    // Stockout count
    const stockoutCount = inventory.filter(
      (item) => item.status === 'stockout' || item.currentStock <= 0
    ).length;

    const lowStockCount = inventory.filter(
      (item) => item.status === 'low' && item.currentStock > 0
    ).length;

    // Equipment breakdown count
    const downEquipmentCount = equipment.filter(
      (eq) => eq.status === 'breakdown'
    ).length;

    const totalTransfers = transfers.length;

    return {
      totalFacilities,
      phcCount,
      subCentreCount,
      stockoutCount,
      lowStockCount,
      downEquipmentCount,
      totalTransfers,
    };
  }, [facilities, inventory, equipment, transfers]);

  const handleOpenRerouteModal = (
    deficitFacId?: string,
    medId?: string,
    surplusFacId?: string
  ) => {
    setSelectedDeficitFacilityId(deficitFacId);
    setSelectedMedicineId(medId);
    setSelectedSurplusFacilityId(surplusFacId);
    setIsRerouteModalOpen(true);
  };

  const handleTransferSuccess = (transferId: string) => {
    setToastMessage(`Atomic re-route transaction ${transferId} executed and recorded.`);
    setTimeout(() => setToastMessage(null), 6000);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-150">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 border border-emerald-700 animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-emerald-300" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* DMO Command Header Banner */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 text-white p-6 relative overflow-hidden shadow-xs">
        {/* Subtle background decorative shapes */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-64 h-64 bg-emerald-600/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>DISTRICT MEDICAL OFFICER COMMAND</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Firestore Real-Time Sync Active</span>
              </span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>District Healthcare Facility Dashboard</span>
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Real-time telemetry and resource ledger across all lower-tier facilities (PHCs and
              Sub-Centres) in Sundargarh District. Monitor critical drug buffer levels, diagnostic equipment
              up-times, and execute atomic inventory re-routing transfers.
            </p>

            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-300">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-blue-400" />
                <span>Sundargarh District, Odisha (HQ: DHO Sundargarh)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <span>Network: {kpiData.phcCount} PHCs • {kpiData.subCentreCount} Sub-Centres (HWCs)</span>
              </div>
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => handleOpenRerouteModal()}
              className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Re-route Resources</span>
            </button>
          </div>
        </div>

        {/* Flat KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-6 pt-5 border-t border-slate-800">
          <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700/80 transition-colors hover:border-slate-600">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Monitored Facilities</span>
            <div className="text-2xl font-black text-white mt-0.5">{kpiData.totalFacilities} Units</div>
            <span className="text-[10px] text-slate-400 font-medium">3 PHCs + 3 Sub-Centres</span>
          </div>

          <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700/80 transition-colors hover:border-slate-600">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Critical Stockouts</span>
              {kpiData.stockoutCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              )}
            </div>
            <div className={`text-2xl font-black mt-0.5 ${kpiData.stockoutCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {kpiData.stockoutCount} Items
            </div>
            <span className="text-[10px] text-rose-300/80 font-medium">Active stockout in Red</span>
          </div>

          <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700/80 transition-colors hover:border-slate-600">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Equipment Down</span>
            <div className={`text-2xl font-black mt-0.5 ${kpiData.downEquipmentCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {kpiData.downEquipmentCount} Machines
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Frontline biomedical faults</span>
          </div>

          <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700/80 transition-colors hover:border-slate-600">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Atomic Transfers</span>
            <div className="text-2xl font-black text-blue-400 mt-0.5">{kpiData.totalTransfers} Dispatched</div>
            <span className="text-[10px] text-slate-400 font-medium">DMO digital ledger</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs in Flat Segmented Rail */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 border border-slate-200 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setActiveSubTab('heatmap')}
          className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
            activeSubTab === 'heatmap'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Flame className="w-4 h-4 text-rose-500" />
          <span>Critical Supplies Heatmap</span>
          {kpiData.stockoutCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
              {kpiData.stockoutCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('equipment')}
          className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
            activeSubTab === 'equipment'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Cpu className="w-4 h-4 text-blue-500" />
          <span>Diagnostic Equipment Status</span>
          {kpiData.downEquipmentCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
              {kpiData.downEquipmentCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('ledger')}
          className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
            activeSubTab === 'ledger'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <FileText className="w-4 h-4 text-emerald-500" />
          <span>Re-routing Ledger ({transfers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('analytics')}
          className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
            activeSubTab === 'analytics'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Activity className="w-4 h-4 text-purple-500" />
          <span>Visualizations & Analytics</span>
        </button>
      </div>

      {/* Main Content Areas */}
      {activeSubTab === 'heatmap' && (
        <div className="space-y-6">
          {/* Heatmap Component */}
          <HeatmapComponent
            inventory={inventory}
            facilities={facilities}
            onOpenReroute={handleOpenRerouteModal}
          />

          {/* Quick Analytics Strip under Heatmap */}
          <AnalyticsCharts
            inventory={inventory}
            equipment={equipment}
            facilities={facilities}
          />
        </div>
      )}

      {activeSubTab === 'equipment' && (
        <div className="space-y-6">
          <DiagnosticEquipmentMonitor equipment={equipment} />
        </div>
      )}

      {activeSubTab === 'ledger' && (
        <div className="space-y-6">
          <TransferLedgerTable
            transfers={transfers}
            onOpenNewReroute={() => handleOpenRerouteModal()}
          />
        </div>
      )}

      {activeSubTab === 'analytics' && (
        <div className="space-y-6">
          <AnalyticsCharts
            inventory={inventory}
            equipment={equipment}
            facilities={facilities}
          />
          <TransferLedgerTable
            transfers={transfers}
            onOpenNewReroute={() => handleOpenRerouteModal()}
          />
        </div>
      )}

      {/* Atomic Resource Re-routing Modal */}
      <ReRouteResourcesModal
        isOpen={isRerouteModalOpen}
        onClose={() => setIsRerouteModalOpen(false)}
        inventory={inventory}
        facilities={facilities}
        initialDeficitFacilityId={selectedDeficitFacilityId}
        initialMedicineId={selectedMedicineId}
        initialSurplusFacilityId={selectedSurplusFacilityId}
        onTransferSuccess={handleTransferSuccess}
      />
    </div>
  );
};
