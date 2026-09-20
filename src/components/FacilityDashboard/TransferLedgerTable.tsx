import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Filter,
  Search,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { InventoryTransferRecord } from '../../types';

interface TransferLedgerTableProps {
  transfers: InventoryTransferRecord[];
  onOpenNewReroute: () => void;
}

export const TransferLedgerTable: React.FC<TransferLedgerTableProps> = ({
  transfers,
  onOpenNewReroute,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredTransfers = transfers.filter((trf) => {
    if (statusFilter !== 'all' && trf.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        trf.transferNumber.toLowerCase().includes(q) ||
        trf.medicineName.toLowerCase().includes(q) ||
        trf.sourceFacilityName.toLowerCase().includes(q) ||
        trf.targetFacilityName.toLowerCase().includes(q) ||
        trf.digitalSignature.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
              <FileText className="w-5 h-5" />
            </span>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              DMO Atomic Resource Re-routing Ledger
            </h3>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Immutable audit record of digital inventory transfers authorized by the District Medical Officer.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenNewReroute}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Truck className="w-4 h-4" />
            <span>New Re-route Command</span>
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Transfers ({transfers.length})</option>
            <option value="approved">Approved</option>
            <option value="in_transit">In Transit</option>
            <option value="delivered">Delivered</option>
          </select>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search transfer ID, drug, facility..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px] text-xs">
          <thead>
            <tr className="bg-slate-100/80 text-[11px] font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
              <th className="py-3 px-4">Transfer Ref</th>
              <th className="py-3 px-3">Date & Auth</th>
              <th className="py-3 px-3">Surplus Origin → Deficit Destination</th>
              <th className="py-3 px-3 text-right">Quantity & Drug</th>
              <th className="py-3 px-3 text-center">Status</th>
              <th className="py-3 px-4 text-right">Ledger Signature</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredTransfers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  No transfer ledger records match the active filter.
                </td>
              </tr>
            ) : (
              filteredTransfers.map((trf) => (
                <tr key={trf.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-800">
                    {trf.transferNumber}
                  </td>
                  <td className="py-3 px-3 text-slate-600">
                    <div className="font-medium text-slate-800">
                      {new Date(trf.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {trf.authorizedBy}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                      <span className="truncate max-w-[150px]">{trf.sourceFacilityName}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate max-w-[150px] font-semibold text-emerald-700">
                        {trf.targetFacilityName}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Reason: {trf.reason}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="font-bold text-slate-900 text-sm">
                      {trf.quantity} <span className="text-xs font-normal text-slate-500">{trf.unit}</span>
                    </div>
                    <div className="text-[11px] text-blue-700 font-medium truncate max-w-[140px] ml-auto">
                      {trf.medicineName}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        trf.status === 'delivered'
                          ? 'bg-emerald-100 text-emerald-800'
                          : trf.status === 'in_transit'
                          ? 'bg-blue-100 text-blue-800 animate-pulse'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {trf.status === 'delivered' && <CheckCircle2 className="w-3 h-3" />}
                      {trf.status === 'in_transit' && <Truck className="w-3 h-3" />}
                      {trf.status === 'approved' && <Clock className="w-3 h-3" />}
                      <span>{trf.status.replace('_', ' ')}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="font-mono text-[10px] text-slate-600 bg-slate-100 px-2 py-1 rounded inline-flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-blue-600" />
                      <span>{trf.digitalSignature}</span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
