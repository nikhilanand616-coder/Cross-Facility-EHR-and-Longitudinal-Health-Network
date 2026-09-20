import React, { useState, useMemo, useEffect } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  CheckCircle2,
  Lock,
  ShieldCheck,
  Truck,
  X,
  Building2,
  Pill,
  Sparkles,
} from 'lucide-react';
import { FacilityInventoryRecord } from '../../types';
import { DMOFacilityNode, executeAtomicResourceReroute } from '../../lib/dmoFacilityService';

interface ReRouteResourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: FacilityInventoryRecord[];
  facilities: DMOFacilityNode[];
  initialDeficitFacilityId?: string;
  initialMedicineId?: string;
  initialSurplusFacilityId?: string;
  onTransferSuccess?: (transferId: string) => void;
}

export const ReRouteResourcesModal: React.FC<ReRouteResourcesModalProps> = ({
  isOpen,
  onClose,
  inventory,
  facilities,
  initialDeficitFacilityId,
  initialMedicineId,
  initialSurplusFacilityId,
  onTransferSuccess,
}) => {
  const [selectedMedicineId, setSelectedMedicineId] = useState<string>('med_ors');
  const [sourceFacilityId, setSourceFacilityId] = useState<string>('');
  const [targetFacilityId, setTargetFacilityId] = useState<string>('');
  const [transferQuantity, setTransferQuantity] = useState<number>(50);
  const [transferReason, setTransferReason] = useState<string>(
    'Emergency stockout mitigation ordered by DMO to prevent healthcare delivery disruption'
  );
  const [dmoOfficerName, setDmoOfficerName] = useState<string>(
    'Dr. K. Patnaik, District Medical Officer (DMO)'
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successReceipt, setSuccessReceipt] = useState<{
    transferId: string;
    sourceName: string;
    targetName: string;
    medicineName: string;
    quantity: number;
    unit: string;
    digitalSignature: string;
  } | null>(null);

  // Available medicines in inventory
  const medicinesList = useMemo(() => {
    const map = new Map<string, { id: string; name: string; category: string; unit: string }>();
    inventory.forEach((item) => {
      if (!map.has(item.medicineId)) {
        map.set(item.medicineId, {
          id: item.medicineId,
          name: item.medicineName,
          category: item.category,
          unit: item.unit,
        });
      }
    });
    return Array.from(map.values());
  }, [inventory]);

  // When modal opens or initial props change, configure default source & target
  useEffect(() => {
    if (!isOpen) {
      setSuccessReceipt(null);
      setSubmitError(null);
      return;
    }

    const medId = initialMedicineId || (medicinesList[0]?.id ?? 'med_ors');
    setSelectedMedicineId(medId);

    // If initial deficit facility specified, set target
    if (initialDeficitFacilityId) {
      setTargetFacilityId(initialDeficitFacilityId);
    } else {
      // Find a facility that has a deficit in this medicine
      const deficitItem = inventory.find(
        (i) => i.medicineId === medId && (i.status === 'stockout' || i.status === 'low')
      );
      if (deficitItem) {
        setTargetFacilityId(deficitItem.facilityId);
      } else {
        setTargetFacilityId(facilities[1]?.id ?? '');
      }
    }

    // Set surplus source facility
    if (initialSurplusFacilityId) {
      setSourceFacilityId(initialSurplusFacilityId);
    } else {
      // Find facility with highest stock of this medicine
      const itemsForMed = inventory.filter((i) => i.medicineId === medId);
      itemsForMed.sort((a, b) => b.currentStock - a.currentStock);
      const topSurplus = itemsForMed.find((i) => i.facilityId !== initialDeficitFacilityId);
      if (topSurplus) {
        setSourceFacilityId(topSurplus.facilityId);
      } else {
        setSourceFacilityId(facilities[0]?.id ?? '');
      }
    }
  }, [isOpen, initialDeficitFacilityId, initialMedicineId, initialSurplusFacilityId, inventory, facilities, medicinesList]);

  // Currently selected medicine object
  const currentMed = useMemo(() => {
    return (
      medicinesList.find((m) => m.id === selectedMedicineId) || {
        id: selectedMedicineId,
        name: 'Essential Supply',
        category: 'essential',
        unit: 'units',
      }
    );
  }, [medicinesList, selectedMedicineId]);

  // Source stock record
  const sourceStockRecord = useMemo(() => {
    return inventory.find(
      (i) => i.facilityId === sourceFacilityId && i.medicineId === selectedMedicineId
    );
  }, [inventory, sourceFacilityId, selectedMedicineId]);

  // Target stock record
  const targetStockRecord = useMemo(() => {
    return inventory.find(
      (i) => i.facilityId === targetFacilityId && i.medicineId === selectedMedicineId
    );
  }, [inventory, targetFacilityId, selectedMedicineId]);

  const sourceAvailableStock = sourceStockRecord?.currentStock ?? 0;
  const sourceThreshold = sourceStockRecord?.minThreshold ?? 50;
  const targetCurrentStock = targetStockRecord?.currentStock ?? 0;
  const targetThreshold = targetStockRecord?.minThreshold ?? 50;

  // Max safely transferable without dropping source below its own minThreshold
  const safeSurplus = Math.max(0, sourceAvailableStock - sourceThreshold);

  // Recommended quantity to bring target to optimal threshold
  const recommendedReplenishQty = Math.max(
    10,
    targetThreshold * 1.5 - targetCurrentStock
  );

  // Automatically adjust default quantity to reasonable value when selection changes
  useEffect(() => {
    if (sourceAvailableStock > 0) {
      const reasonable = Math.min(
        safeSurplus > 0 ? safeSurplus : sourceAvailableStock,
        Math.max(10, Math.round(recommendedReplenishQty))
      );
      setTransferQuantity(reasonable > 0 ? reasonable : Math.min(10, sourceAvailableStock));
    }
  }, [selectedMedicineId, sourceFacilityId, targetFacilityId, sourceAvailableStock, safeSurplus, recommendedReplenishQty]);

  // Post-transfer projections
  const projectedSourceStock = sourceAvailableStock - transferQuantity;
  const projectedTargetStock = targetCurrentStock + transferQuantity;

  // Source and target facility names
  const sourceFacilityName =
    facilities.find((f) => f.id === sourceFacilityId)?.name || 'Surplus Facility';
  const targetFacilityName =
    facilities.find((f) => f.id === targetFacilityId)?.name || 'Deficit Facility';

  // Handle atomic transaction submission
  const handleExecuteAtomicTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!sourceFacilityId || !targetFacilityId) {
      setSubmitError('Please select both a source surplus facility and a target deficit facility.');
      return;
    }

    if (sourceFacilityId === targetFacilityId) {
      setSubmitError('Source and target facilities must be different.');
      return;
    }

    if (transferQuantity <= 0) {
      setSubmitError('Transfer quantity must be greater than 0.');
      return;
    }

    if (transferQuantity > sourceAvailableStock) {
      setSubmitError(
        `Source facility only has ${sourceAvailableStock} ${currentMed.unit}. Cannot transfer ${transferQuantity}.`
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await executeAtomicResourceReroute({
        sourceFacilityId,
        sourceFacilityName,
        targetFacilityId,
        targetFacilityName,
        medicineId: selectedMedicineId,
        medicineName: currentMed.name,
        quantity: transferQuantity,
        unit: currentMed.unit,
        reason: transferReason,
        dmoOfficerName,
      });

      if (result.success && result.transfer) {
        setSuccessReceipt({
          transferId: result.transfer.transferNumber,
          sourceName: sourceFacilityName,
          targetName: targetFacilityName,
          medicineName: currentMed.name,
          quantity: transferQuantity,
          unit: currentMed.unit,
          digitalSignature: result.transfer.digitalSignature,
        });
        if (onTransferSuccess) {
          onTransferSuccess(result.transfer.transferNumber);
        }
      } else {
        setSubmitError(result.error || 'Failed to execute atomic transaction.');
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unknown transaction error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
              <ArrowRightLeft className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Digital Resource Re-routing Command
              </h3>
              <p className="text-xs text-slate-500">
                Single atomic Firestore ledger transaction with cryptographic DMO audit signature
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        {successReceipt ? (
          <div className="p-6 space-y-5">
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">
                Atomic Inventory Transfer Executed Successfully
              </h4>
              <p className="text-xs text-slate-600 mt-1">
                Firestore ledger updated in a single atomic transaction. Both facility stock balances and audit
                records have been synchronized.
              </p>
            </div>

            {/* Receipt Card */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-2.5">
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500">Transaction ID:</span>
                <span className="font-mono font-bold text-slate-800">{successReceipt.transferId}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500">Critical Supply:</span>
                <span className="font-semibold text-slate-800">
                  {successReceipt.medicineName} ({successReceipt.quantity} {successReceipt.unit})
                </span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500">Surplus Source (Decremented):</span>
                <span className="font-medium text-slate-800">{successReceipt.sourceName}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500">Deficit Destination (Incremented):</span>
                <span className="font-semibold text-emerald-700">{successReceipt.targetName}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-500">DMO Digital Signature:</span>
                <span className="font-mono text-[11px] font-semibold text-blue-700">
                  {successReceipt.digitalSignature}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors shadow-xs"
              >
                Close & Return to Dashboard
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleExecuteAtomicTransfer} className="p-6 space-y-5 text-xs">
            {submitError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-start gap-2 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <div>
                  <span className="font-bold">Transaction Failed: </span>
                  {submitError}
                </div>
              </div>
            )}

            {/* 1. Select Supply to Re-route */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5 text-blue-600" />
                <span>1. Select Essential Supply / Critical Medicine</span>
              </label>
              <select
                value={selectedMedicineId}
                onChange={(e) => setSelectedMedicineId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              >
                {medicinesList.map((med) => (
                  <option key={med.id} value={med.id}>
                    {med.name} ({med.category.toUpperCase()} • {med.unit})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Source & Target Facility Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Surplus Source */}
              <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-blue-900 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    Source Facility (Surplus)
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">
                    STOCK: {sourceAvailableStock} {currentMed.unit}
                  </span>
                </div>
                <select
                  value={sourceFacilityId}
                  onChange={(e) => setSourceFacilityId(e.target.value)}
                  className="w-full px-2.5 py-2 bg-white border border-blue-300 rounded-lg text-slate-800 font-medium text-xs focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Choose Surplus Facility --</option>
                  {facilities.map((fac) => {
                    const item = inventory.find(
                      (i) => i.facilityId === fac.id && i.medicineId === selectedMedicineId
                    );
                    const stock = item?.currentStock ?? 0;
                    return (
                      <option key={fac.id} value={fac.id} disabled={fac.id === targetFacilityId}>
                        {fac.name} ({stock} {currentMed.unit})
                      </option>
                    );
                  })}
                </select>
                <div className="mt-2 text-[11px] text-blue-700 flex justify-between">
                  <span>Min Buffer Safety: {sourceThreshold} {currentMed.unit}</span>
                  <span className="font-semibold">Safe Surplus: {safeSurplus} {currentMed.unit}</span>
                </div>
              </div>

              {/* Deficit Destination */}
              <div className="p-3.5 bg-rose-50/50 rounded-xl border border-rose-200">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-rose-900 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-rose-600" />
                    Destination Facility (Deficit)
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      targetCurrentStock <= 0
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    STOCK: {targetCurrentStock} {currentMed.unit}
                  </span>
                </div>
                <select
                  value={targetFacilityId}
                  onChange={(e) => setTargetFacilityId(e.target.value)}
                  className="w-full px-2.5 py-2 bg-white border border-rose-300 rounded-lg text-slate-800 font-medium text-xs focus:ring-2 focus:ring-rose-500"
                >
                  <option value="">-- Choose Deficit Facility --</option>
                  {facilities.map((fac) => {
                    const item = inventory.find(
                      (i) => i.facilityId === fac.id && i.medicineId === selectedMedicineId
                    );
                    const stock = item?.currentStock ?? 0;
                    const isLow = stock <= (item?.minThreshold ?? 50);
                    return (
                      <option key={fac.id} value={fac.id} disabled={fac.id === sourceFacilityId}>
                        {fac.name} ({stock} {currentMed.unit}) {isLow ? '⚠️ DEFICIT' : ''}
                      </option>
                    );
                  })}
                </select>
                <div className="mt-2 text-[11px] text-rose-700 flex justify-between">
                  <span>Target Threshold: {targetThreshold} {currentMed.unit}</span>
                  <span className="font-semibold">
                    Needed to Buffer: {Math.max(0, targetThreshold - targetCurrentStock)} {currentMed.unit}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Transfer Quantity & Real-Time Projection */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-800">
                  Transfer Quantity ({currentMed.unit}):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max={sourceAvailableStock}
                    value={transferQuantity}
                    onChange={(e) => setTransferQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-24 px-2.5 py-1 text-right font-bold text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-slate-500 font-medium">{currentMed.unit}</span>
                </div>
              </div>

              {/* Slider */}
              <input
                type="range"
                min="1"
                max={Math.max(1, sourceAvailableStock)}
                value={transferQuantity}
                onChange={(e) => setTransferQuantity(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />

              {/* Live Projections Preview */}
              <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-4 text-[11px]">
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <div className="text-slate-500">Source Post-Transfer:</div>
                  <div className="font-bold text-slate-800 mt-0.5">
                    {sourceAvailableStock} →{' '}
                    <span className={projectedSourceStock < sourceThreshold ? 'text-amber-600 font-extrabold' : 'text-slate-900'}>
                      {projectedSourceStock} {currentMed.unit}
                    </span>
                  </div>
                  {projectedSourceStock < sourceThreshold && (
                    <div className="text-[10px] text-amber-600 mt-0.5">
                      ⚠️ Will dip below surplus buffer threshold
                    </div>
                  )}
                </div>

                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <div className="text-slate-500">Destination Post-Transfer:</div>
                  <div className="font-bold text-emerald-700 mt-0.5">
                    {targetCurrentStock} → {projectedTargetStock} {currentMed.unit}
                  </div>
                  <div className="text-[10px] text-emerald-600 mt-0.5 font-medium">
                    ✅ Deficit resolved to optimal stock
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Reason & Authorization */}
            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Clinical Re-routing Justification / Dispatch Order
                </label>
                <input
                  type="text"
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 text-xs focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Diarrhea outbreak response, antenatal clinic replenishment..."
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Authorizing District Officer Name
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={dmoOfficerName}
                    onChange={(e) => setDmoOfficerName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 shrink-0 px-2 py-1 bg-slate-100 rounded-lg">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Digital Cert</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting || transferQuantity <= 0 || transferQuantity > sourceAvailableStock}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Executing Atomic Transaction...</span>
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="w-4 h-4" />
                    <span>Execute Atomic Re-routing</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
