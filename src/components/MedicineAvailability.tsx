import React, { useState } from 'react';
import {
  Pill,
  Search,
  AlertOctagon,
  Building2,
  CheckCircle2,
  ArrowRightLeft,
  Truck,
  Package,
  Calendar,
  AlertTriangle,
  Clock,
  PlusCircle,
  Check,
  RotateCw,
  TrendingDown,
  ShieldAlert,
  Send,
  Sparkles,
  Info,
  Compass,
} from 'lucide-react';
import { MedicineStockItem, Facility, MedicineRequisition } from '../types';
import { MedicineTransportationOptimizer } from './MedicineTransportationOptimizer';

interface MedicineAvailabilityProps {
  medicines: MedicineStockItem[];
  facilities: Facility[];
  currentFacility: Facility;
  onRequestTransfer: (medicineId: string, fromFacilityId: string, toFacilityId: string, quantity: number) => void;
}

export const MedicineAvailability: React.FC<MedicineAvailabilityProps> = ({
  medicines,
  facilities,
  currentFacility,
  onRequestTransfer,
}) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'expiry' | 'requisitions' | 'distribution_routing'>('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEDLOnly, setFilterEDLOnly] = useState(false);
  const [filterStockoutOnly, setFilterStockoutOnly] = useState(false);
  const [filterFacilityId, setFilterFacilityId] = useState<string>('all');

  // Requisition Modal State
  const [showRequisitionModal, setShowRequisitionModal] = useState(false);
  const [targetMedicine, setTargetMedicine] = useState<MedicineStockItem | null>(null);
  const [reqSourceFacilityId, setReqSourceFacilityId] = useState('');
  const [reqTargetFacilityId, setReqTargetFacilityId] = useState(currentFacility.id);
  const [reqQuantity, setReqQuantity] = useState('100');
  const [reqUrgency, setReqUrgency] = useState<'routine' | 'urgent' | 'emergency'>('urgent');
  const [reqReason, setReqReason] = useState<MedicineRequisition['reason']>('stockout_prevention');
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // Initial Requisitions List (Live interactive state)
  const [requisitions, setRequisitions] = useState<MedicineRequisition[]>([
    {
      id: 'REQ-2026-081',
      requisitionNumber: 'REQ-2026-081',
      medicineId: 'med_metformin_500',
      medicineName: 'Metformin Hydrochloride 500mg',
      strength: '500 mg',
      fromFacilityId: 'fac_dh_sundargarh',
      fromFacilityName: 'Sundargarh District Hospital',
      toFacilityId: 'fac_sub_rampur',
      toFacilityName: 'Rampur Health Sub-Centre',
      quantityRequested: 200,
      urgency: 'emergency',
      reason: 'stockout_prevention',
      status: 'in_transit',
      requestedDate: new Date(Date.now() - 3600000 * 5).toISOString(),
      dispatchedDate: new Date(Date.now() - 3600000 * 2).toISOString(),
      requestedBy: 'Sister Priya Nair (ASHA)',
      approvedBy: 'Dr. Debasis Das (Chief Pharmacist)',
      batchNumberAssigned: 'MET-2025-04D',
    },
    {
      id: 'REQ-2026-079',
      requisitionNumber: 'REQ-2026-079',
      medicineId: 'med_telmisartan_40',
      medicineName: 'Telmisartan Tablets 40mg',
      strength: '40 mg',
      fromFacilityId: 'fac_rh_kalyanpur',
      fromFacilityName: 'Kalyanpur Rural Hospital',
      toFacilityId: 'fac_sub_rampur',
      toFacilityName: 'Rampur Health Sub-Centre',
      quantityRequested: 150,
      urgency: 'urgent',
      reason: 'stockout_prevention',
      status: 'approved',
      requestedDate: new Date(Date.now() - 3600000 * 18).toISOString(),
      requestedBy: 'ANM Rekha Devi',
      approvedBy: 'Dr. Debasis Das (Chief Pharmacist)',
      batchNumberAssigned: 'TEL-2026-01B',
    },
    {
      id: 'REQ-2026-075',
      requisitionNumber: 'REQ-2026-075',
      medicineId: 'med_amlodipine_5',
      medicineName: 'Amlodipine Besylate 5mg',
      strength: '5 mg',
      fromFacilityId: 'fac_dh_sundargarh',
      fromFacilityName: 'Sundargarh District Hospital',
      toFacilityId: 'fac_phc_chandanpur',
      toFacilityName: 'Chandanpur Primary Health Centre',
      quantityRequested: 300,
      urgency: 'routine',
      reason: 'routine_replenishment',
      status: 'received',
      requestedDate: new Date(Date.now() - 86400000 * 2).toISOString(),
      dispatchedDate: new Date(Date.now() - 86400000).toISOString(),
      receivedDate: new Date(Date.now() - 3600000 * 4).toISOString(),
      requestedBy: 'Dr. Sunita Tripathy',
      approvedBy: 'Dr. Debasis Das',
      batchNumberAssigned: 'AML-2026-01X',
    },
  ]);

  const showNotification = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 5000);
  };

  const calculateDaysUntilExpiry = (expiryDateString: string) => {
    const today = new Date();
    const expiry = new Date(expiryDateString);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getExpiryBadge = (days: number) => {
    if (days < 0) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-800 ring-1 ring-rose-500">
          Expired ({Math.abs(days)}d ago)
        </span>
      );
    }
    if (days <= 90) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 ring-1 ring-amber-400 animate-pulse">
          Near Expiry ({days}d remaining)
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
        Healthy ({Math.round(days / 30)} mos remaining)
      </span>
    );
  };

  // Filtered medicines
  const filteredMeds = medicines.filter((med) => {
    const matchesSearch =
      med.drugName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      med.genericName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      med.category.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterEDLOnly && !med.isEssentialDrugList) return false;
    if (filterStockoutOnly) {
      const hasStockout = Object.values(med.facilityStocks).some((s: any) => s.status === 'stockout' || s.quantity === 0);
      if (!hasStockout) return false;
    }
    if (filterFacilityId !== 'all') {
      const facStock = med.facilityStocks[filterFacilityId];
      if (!facStock || facStock.quantity === 0) return false;
    }
    return true;
  });

  // Collect all batches for Expiry & FEFO management
  const allBatches: Array<{
    medicineId: string;
    drugName: string;
    genericName: string;
    facilityId: string;
    facilityName: string;
    batchNumber: string;
    expiryDate: string;
    quantity: number;
    daysRemaining: number;
  }> = [];

  medicines.forEach((med) => {
    Object.entries(med.facilityStocks).forEach(([facId, stock]: [string, any]) => {
      allBatches.push({
        medicineId: med.id,
        drugName: med.drugName,
        genericName: med.genericName,
        facilityId: facId,
        facilityName: stock.facilityName || facId,
        batchNumber: stock.batchNumber,
        expiryDate: stock.expiryDate,
        quantity: stock.quantity,
        daysRemaining: calculateDaysUntilExpiry(stock.expiryDate),
      });
    });
  });

  // Sort batches by expiry date (FEFO: First-Expiry-First-Out)
  const fefoSortedBatches = [...allBatches].sort((a, b) => a.daysRemaining - b.daysRemaining);
  const nearExpiryBatches = fefoSortedBatches.filter((b) => b.daysRemaining <= 90 && b.quantity > 0);

  // Shortage Detection: Find facilities facing stockout or low buffer
  const shortageAlerts: Array<{
    medicine: MedicineStockItem;
    facilityId: string;
    facilityName: string;
    quantity: number;
    minThreshold: number;
    surplusCandidate: { facilityId: string; facilityName: string; surplusQty: number } | null;
  }> = [];

  medicines.forEach((med) => {
    Object.entries(med.facilityStocks).forEach(([fId, s]: [string, any]) => {
      if (s.quantity < s.minThreshold || s.status === 'stockout') {
        // Find best candidate facility with surplus
        let bestCandidate: { facilityId: string; facilityName: string; surplusQty: number } | null = null;
        Object.entries(med.facilityStocks).forEach(([otherId, otherStock]: [string, any]) => {
          if (otherId !== fId && otherStock.quantity > otherStock.minThreshold * 2) {
            if (!bestCandidate || otherStock.quantity > bestCandidate.surplusQty) {
              bestCandidate = {
                facilityId: otherId,
                facilityName: otherStock.facilityName || otherId,
                surplusQty: otherStock.quantity - otherStock.minThreshold,
              };
            }
          }
        });

        shortageAlerts.push({
          medicine: med,
          facilityId: fId,
          facilityName: s.facilityName || fId,
          quantity: s.quantity,
          minThreshold: s.minThreshold,
          surplusCandidate: bestCandidate,
        });
      }
    });
  });

  // Open Requisition Modal
  const handleOpenRequisition = (med: MedicineStockItem, defTargetFacId?: string, defSourceFacId?: string) => {
    setTargetMedicine(med);
    setReqTargetFacilityId(defTargetFacId || currentFacility.id);

    // Pick best source facility with high stock
    if (defSourceFacId) {
      setReqSourceFacilityId(defSourceFacId);
    } else {
      const candidates = Object.entries(med.facilityStocks).filter(
        ([fId, s]: [string, any]) => fId !== (defTargetFacId || currentFacility.id) && s.quantity > 100
      );
      if (candidates.length > 0) {
        setReqSourceFacilityId(candidates[0][0]);
      } else {
        setReqSourceFacilityId(facilities[0]?.id || '');
      }
    }

    setReqQuantity('100');
    setReqUrgency('urgent');
    setReqReason('stockout_prevention');
    setShowRequisitionModal(true);
  };

  // Submit New Requisition
  const handleConfirmRequisition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetMedicine) return;

    const qty = parseInt(reqQuantity, 10) || 50;
    const sourceFac = facilities.find((f) => f.id === reqSourceFacilityId);
    const targetFac = facilities.find((f) => f.id === reqTargetFacilityId);

    const newReq: MedicineRequisition = {
      id: `REQ-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      requisitionNumber: `REQ-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      medicineId: targetMedicine.id,
      medicineName: targetMedicine.drugName,
      strength: targetMedicine.strength,
      fromFacilityId: reqSourceFacilityId,
      fromFacilityName: sourceFac?.name || reqSourceFacilityId,
      toFacilityId: reqTargetFacilityId,
      toFacilityName: targetFac?.name || reqTargetFacilityId,
      quantityRequested: qty,
      urgency: reqUrgency,
      reason: reqReason as any,
      status: 'approved',
      requestedDate: new Date().toISOString(),
      requestedBy: 'Frontline Clinical Officer',
      approvedBy: 'Central Drug Logistics Coordinator',
      batchNumberAssigned: `BAT-${Math.floor(1000 + Math.random() * 9000)}`,
    };

    setRequisitions([newReq, ...requisitions]);
    setShowRequisitionModal(false);
    showNotification(
      `Requisition ${newReq.id} for ${qty} units of ${targetMedicine.drugName} approved and scheduled for inter-facility dispatch.`
    );
  };

  // Requisition Status Progression
  const handleUpdateRequisitionStatus = (reqId: string, nextStatus: MedicineRequisition['status']) => {
    const req = requisitions.find((r) => r.id === reqId);
    if (!req) return;

    if (nextStatus === 'received') {
      // Execute the actual inventory stock transfer!
      onRequestTransfer(req.medicineId, req.fromFacilityId, req.toFacilityId, req.quantityRequested);
      showNotification(
        `Requisition ${req.id} marked as Received! ${req.quantityRequested} units of ${req.medicineName} added to ${req.toFacilityName}'s live inventory.`
      );
    } else if (nextStatus === 'in_transit') {
      showNotification(
        `Requisition ${req.id} dispatched from ${req.fromFacilityName}. Batch assigned: ${req.batchNumberAssigned || 'BAT-9821'}`
      );
    }

    setRequisitions((prev) =>
      prev.map((r) => {
        if (r.id === reqId) {
          return {
            ...r,
            status: nextStatus,
            dispatchedDate: nextStatus === 'in_transit' ? new Date().toISOString() : r.dispatchedDate,
            receivedDate: nextStatus === 'received' ? new Date().toISOString() : r.receivedDate,
          };
        }
        return r;
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                <Pill className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Cross-Facility Medicine Availability & Inventory Network
                </h2>
                <p className="text-xs text-slate-500">
                  Real-time stock levels, FEFO expiry tracking, and proactive shortage prevention requisitions
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (medicines.length > 0) {
                  handleOpenRequisition(medicines[0]);
                }
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Raise Medicine Requisition</span>
            </button>
          </div>
        </div>

        {notificationMsg && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notificationMsg}</span>
          </div>
        )}

        {/* Network Metrics Strip */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Formulations</span>
            <strong className="text-lg font-bold text-slate-900">{medicines.length} Drugs</strong>
          </div>
          <div className="bg-rose-50 p-3 rounded-lg border border-rose-200">
            <span className="text-rose-600 block text-[10px] uppercase font-bold">Active Shortage Risks</span>
            <strong className="text-lg font-bold text-rose-800">{shortageAlerts.length} Facilities</strong>
          </div>
          <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
            <span className="text-amber-600 block text-[10px] uppercase font-bold">Near Expiry (&lt;90d)</span>
            <strong className="text-lg font-bold text-amber-800">{nearExpiryBatches.length} Batches</strong>
          </div>
          <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200">
            <span className="text-indigo-600 block text-[10px] uppercase font-bold">In-Transit Requisitions</span>
            <strong className="text-lg font-bold text-indigo-800">
              {requisitions.filter((r) => r.status === 'dispatched' || r.status === 'approved').length} Active
            </strong>
          </div>
        </div>
      </div>

      {/* Proactive Shortage Prevention Banner */}
      {shortageAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50/60 border border-amber-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <strong className="text-xs font-bold text-amber-900">
                Automated Shortage Prevention Requisitions Available ({shortageAlerts.length} Shortfalls Detected)
              </strong>
            </div>
            <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded font-bold uppercase">
              1-Click Rebalance
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            {shortageAlerts.slice(0, 2).map((alert, idx) => (
              <div key={idx} className="bg-white p-3 rounded-lg border border-amber-200 flex items-center justify-between gap-2">
                <div>
                  <strong className="text-xs font-bold text-slate-900 block">{alert.medicine.drugName}</strong>
                  <span className="text-[11px] text-rose-700 font-semibold block">
                    {alert.facilityName}: {alert.quantity} units (Threshold: {alert.minThreshold})
                  </span>
                  {alert.surplusCandidate && (
                    <span className="text-[10px] text-emerald-700">
                      Surplus available at {alert.surplusCandidate.facilityName} ({alert.surplusCandidate.surplusQty} units)
                    </span>
                  )}
                </div>

                {alert.surplusCandidate && (
                  <button
                    onClick={() =>
                      handleOpenRequisition(
                        alert.medicine,
                        alert.facilityId,
                        alert.surplusCandidate?.facilityId
                      )
                    }
                    className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-bold cursor-pointer shrink-0 shadow-xs flex items-center gap-1"
                  >
                    <Send className="w-3 h-3" />
                    <span>Rebalance Stock</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`pb-2.5 flex items-center gap-1.5 cursor-pointer transition-colors ${
            activeTab === 'inventory'
              ? 'border-b-2 border-emerald-600 text-emerald-700 font-bold'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Real-Time Facility Inventory Matrix</span>
        </button>

        <button
          onClick={() => setActiveTab('expiry')}
          className={`pb-2.5 flex items-center gap-1.5 cursor-pointer transition-colors relative ${
            activeTab === 'expiry'
              ? 'border-b-2 border-emerald-600 text-emerald-700 font-bold'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Expiry Dates & FEFO Dispense Priority</span>
          {nearExpiryBatches.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold">
              {nearExpiryBatches.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('requisitions')}
          className={`pb-2.5 flex items-center gap-1.5 cursor-pointer transition-colors ${
            activeTab === 'requisitions'
              ? 'border-b-2 border-emerald-600 text-emerald-700 font-bold'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Requisition & Shortage Prevention Hub ({requisitions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('distribution_routing')}
          className={`pb-2.5 flex items-center gap-1.5 cursor-pointer transition-colors ${
            activeTab === 'distribution_routing'
              ? 'border-b-2 border-emerald-600 text-emerald-700 font-bold'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Weekly Distribution Routing (VAM)</span>
        </button>
      </div>

      {/* TAB 1: REAL-TIME INVENTORY MATRIX */}
      {activeTab === 'inventory' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search drug name, generic composition, or therapeutic category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-slate-50 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-3 text-xs flex-wrap">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filterEDLOnly}
                  onChange={(e) => setFilterEDLOnly(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-slate-700 font-medium">Essential Drug List (EDL) Only</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filterStockoutOnly}
                  onChange={(e) => setFilterStockoutOnly(e.target.checked)}
                  className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                />
                <span className="text-slate-700 font-medium">Show Shortages & Stockouts Only</span>
              </label>

              <select
                aria-label="Filter by facility"
                value={filterFacilityId}
                onChange={(e) => setFilterFacilityId(e.target.value)}
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 bg-slate-50"
              >
                <option value="all">All Facilities</option>
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Medicines Grid Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Drug Formulation</th>
                  <th className="py-2.5 px-3">Category & Form</th>
                  <th className="py-2.5 px-3">Total Network Stock</th>
                  {facilities.map((fac) => (
                    <th key={fac.id} className="py-2.5 px-3">
                      <span className="block truncate max-w-[120px]" title={fac.name}>
                        {fac.name}
                      </span>
                    </th>
                  ))}
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMeds.length === 0 ? (
                  <tr>
                    <td colSpan={facilities.length + 4} className="py-8 text-center text-slate-500">
                      No medicines match the selected filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredMeds.map((med) => {
                    const totalQty = Object.values(med.facilityStocks).reduce(
                      (acc: number, cur: any) => acc + (cur.quantity || 0),
                      0
                    );

                    return (
                      <tr key={med.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Drug Name & EDL */}
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{med.drugName}</div>
                          <div className="text-[10px] text-slate-500">{med.genericName} • {med.strength}</div>
                          {med.isEssentialDrugList && (
                            <span className="inline-block mt-0.5 text-[9px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                              EDL
                            </span>
                          )}
                        </td>

                        {/* Category */}
                        <td className="py-3 px-3">
                          <div className="text-slate-700">{med.category}</div>
                          <span className="text-[10px] text-slate-400 capitalize">{med.form}</span>
                        </td>

                        {/* Network Stock */}
                        <td className="py-3 px-3 font-bold text-slate-900">
                          {totalQty.toLocaleString()} units
                        </td>

                        {/* Facility Columns */}
                        {facilities.map((fac) => {
                          const facStock = med.facilityStocks[fac.id];
                          if (!facStock) {
                            return (
                              <td key={fac.id} className="py-3 px-3 text-slate-400 italic">
                                —
                              </td>
                            );
                          }

                          const isStockout = facStock.quantity === 0 || facStock.status === 'stockout';
                          const isLow = facStock.quantity < facStock.minThreshold;

                          return (
                            <td key={fac.id} className="py-3 px-3">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`w-2 h-2 rounded-full shrink-0 ${
                                    isStockout
                                      ? 'bg-rose-500 ring-2 ring-rose-200 animate-ping'
                                      : isLow
                                      ? 'bg-amber-500'
                                      : 'bg-emerald-500'
                                  }`}
                                />
                                <span
                                  className={`font-mono text-xs font-bold ${
                                    isStockout
                                      ? 'text-rose-700'
                                      : isLow
                                      ? 'text-amber-700'
                                      : 'text-slate-800'
                                  }`}
                                >
                                  {facStock.quantity}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 block font-mono">
                                Min: {facStock.minThreshold}
                              </span>
                            </td>
                          );
                        })}

                        {/* Actions */}
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleOpenRequisition(med)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 border border-slate-200 rounded text-[11px] font-semibold cursor-pointer flex items-center gap-1 ml-auto"
                          >
                            <ArrowRightLeft className="w-3 h-3" />
                            <span>Transfer / Requisition</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: EXPIRY DATES & FEFO DISPENSE PRIORITY */}
      {activeTab === 'expiry' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-600" />
                <span>First-Expiry-First-Out (FEFO) Inventory Management</span>
              </h3>
              <p className="text-xs text-slate-500">
                Prioritize dispensing earlier-expiring batches to reduce medicinal waste and facilitate timely redistribution.
              </p>
            </div>

            <span className="text-xs px-2.5 py-1 rounded bg-amber-50 text-amber-800 font-bold border border-amber-200">
              FEFO Ordering Active
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Dispense Priority</th>
                  <th className="py-2.5 px-3">Medicine & Generic</th>
                  <th className="py-2.5 px-3">Facility Location</th>
                  <th className="py-2.5 px-3">Batch Number</th>
                  <th className="py-2.5 px-3">Expiration Date</th>
                  <th className="py-2.5 px-3">Stock Remaining</th>
                  <th className="py-2.5 px-3">Shelf Life Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fefoSortedBatches.map((batch, index) => (
                  <tr key={`${batch.medicineId}-${batch.facilityId}-${batch.batchNumber}`} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3 font-bold">
                      <span
                        className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] ${
                          index < 3
                            ? 'bg-amber-500 text-white font-black ring-2 ring-amber-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        #{index + 1}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <strong className="text-slate-900 block">{batch.drugName}</strong>
                      <span className="text-[10px] text-slate-500">{batch.genericName}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 font-medium">
                      {batch.facilityName}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {batch.batchNumber}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                      {batch.expiryDate}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {batch.quantity} units
                    </td>
                    <td className="py-2.5 px-3">
                      {getExpiryBadge(batch.daysRemaining)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {batch.daysRemaining <= 90 && batch.quantity > 0 ? (
                        <button
                          onClick={() => {
                            const med = medicines.find((m) => m.id === batch.medicineId);
                            if (med) {
                              handleOpenRequisition(med, 'fac_dh_sundargarh', batch.facilityId);
                            }
                          }}
                          className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold cursor-pointer"
                          title="Redistribute to high-volume District Hospital before expiration"
                        >
                          Redistribute
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400">Regular Dispense</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: REQUISITIONS & SHORTAGE PREVENTION HUB */}
      {activeTab === 'requisitions' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Truck className="w-5 h-5 text-indigo-600" />
                <span>Inter-Facility Medicine Requisitions & Shipments</span>
              </h3>
              <p className="text-xs text-slate-500">
                Track replenishment orders, dispatch carriers, and confirm deliveries to adjust stock automatically.
              </p>
            </div>

            <button
              onClick={() => {
                if (medicines.length > 0) handleOpenRequisition(medicines[0]);
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Raise New Requisition</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Requisition #</th>
                  <th className="py-2.5 px-3">Medicine & Qty</th>
                  <th className="py-2.5 px-3">Transit Route (Source → Target)</th>
                  <th className="py-2.5 px-3">Urgency & Reason</th>
                  <th className="py-2.5 px-3">Timeline</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requisitions.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      {req.requisitionNumber}
                      <span className="block text-[10px] text-slate-400 font-sans">
                        By: {req.requestedBy.split(' ')[0]}
                      </span>
                    </td>

                    <td className="py-2.5 px-3">
                      <strong className="text-slate-900 block font-bold">{req.medicineName}</strong>
                      <span className="text-[11px] text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.2 rounded inline-block mt-0.5">
                        {req.quantityRequested} units
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-slate-700">
                      <div className="text-[11px] font-medium text-slate-600">{req.fromFacilityName}</div>
                      <div className="text-[11px] font-bold text-slate-900 flex items-center gap-1">
                        <span>→</span>
                        <span>{req.toFacilityName}</span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase block w-fit mb-1 ${
                          req.urgency === 'emergency'
                            ? 'bg-rose-100 text-rose-800 ring-1 ring-rose-400'
                            : req.urgency === 'urgent'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {req.urgency}
                      </span>
                      <span className="text-[10px] text-slate-500 capitalize">
                        {req.reason.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                      <div>Req: {new Date(req.requestedDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      {req.dispatchedDate && (
                        <div className="text-amber-700 font-medium">
                          Disp: {new Date(req.dispatchedDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                      {req.receivedDate && (
                        <div className="text-emerald-700 font-bold">
                          Recv: {new Date(req.receivedDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          req.status === 'received'
                            ? 'bg-emerald-100 text-emerald-800'
                            : req.status === 'in_transit'
                            ? 'bg-amber-100 text-amber-800 animate-pulse'
                            : req.status === 'approved'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {req.status === 'in_transit' ? 'In Transit' : req.status}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      {req.status === 'approved' && (
                        <button
                          onClick={() => handleUpdateRequisitionStatus(req.id, 'in_transit')}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-semibold cursor-pointer shadow-xs"
                        >
                          Dispatch
                        </button>
                      )}
                      {req.status === 'in_transit' && (
                        <button
                          onClick={() => handleUpdateRequisitionStatus(req.id, 'received')}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold cursor-pointer shadow-xs flex items-center gap-1 ml-auto"
                        >
                          <Check className="w-3 h-3" />
                          <span>Confirm Delivery</span>
                        </button>
                      )}
                      {req.status === 'received' && (
                        <span className="text-[11px] text-emerald-700 font-semibold">
                          ✓ Inventory Updated
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

      {/* TAB 4: WEEKLY DISTRIBUTION ROUTING (VAM OPTIMIZER) */}
      {activeTab === 'distribution_routing' && (
        <MedicineTransportationOptimizer facilities={facilities} currentFacility={currentFacility} />
      )}

      {/* MODAL: CREATE REQUISITION */}
      {showRequisitionModal && targetMedicine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-600" />
                  <span>Raise Inter-Facility Medicine Requisition</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Formulation: <strong>{targetMedicine.drugName}</strong> ({targetMedicine.genericName})
                </p>
              </div>
              <button
                onClick={() => setShowRequisitionModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmRequisition} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Supplying Facility (Source) *
                  </label>
                  <select
                    value={reqSourceFacilityId}
                    onChange={(e) => setReqSourceFacilityId(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-xs"
                  >
                    {facilities.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.tier.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Requesting Facility (Destination) *
                  </label>
                  <select
                    value={reqTargetFacilityId}
                    onChange={(e) => setReqTargetFacilityId(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-xs"
                  >
                    {facilities.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.tier.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Requisition Quantity *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="10000"
                    value={reqQuantity}
                    onChange={(e) => setReqQuantity(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Urgency Tier *
                  </label>
                  <select
                    value={reqUrgency}
                    onChange={(e) => setReqUrgency(e.target.value as any)}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-xs"
                  >
                    <option value="routine">Routine Replenishment</option>
                    <option value="urgent">Urgent (Within 24h)</option>
                    <option value="emergency">🚨 Emergency / Imminent Stockout</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Clinical Justification *
                  </label>
                  <select
                    value={reqReason}
                    onChange={(e) => setReqReason(e.target.value as any)}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-xs"
                  >
                    <option value="stockout_prevention">Stockout Prevention</option>
                    <option value="epidemic_surge">Epidemic / Seasonal Surge</option>
                    <option value="near_expiry_redistribution">Near Expiry Redistribution</option>
                    <option value="scheduled_replenishment">Scheduled Buffer Top-up</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                Authorized under National Essential Drug Stockout Mitigation protocol. Tracking manifest generated upon approval.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRequisitionModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Issue & Authorize Requisition</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
