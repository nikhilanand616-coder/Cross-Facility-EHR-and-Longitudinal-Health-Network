import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  Filter,
  Flame,
  Info,
  Layers,
  Sparkles,
  Building2,
  Search,
} from 'lucide-react';
import { FacilityInventoryRecord, FacilityTier } from '../../types';
import { DMOFacilityNode } from '../../lib/dmoFacilityService';

interface HeatmapComponentProps {
  inventory: FacilityInventoryRecord[];
  facilities: DMOFacilityNode[];
  onOpenReroute: (
    deficitFacilityId?: string,
    medicineId?: string,
    surplusFacilityId?: string
  ) => void;
}

export const HeatmapComponent: React.FC<HeatmapComponentProps> = ({
  inventory,
  facilities,
  onOpenReroute,
}) => {
  const [tierFilter, setTierFilter] = useState<'all' | 'phc' | 'sub_centre'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hoveredCell, setHoveredCell] = useState<{
    facilityId: string;
    medicineId: string;
  } | null>(null);

  // Distinct critical medicines tracked in the district
  const criticalMedicines = useMemo(() => {
    const map = new Map<
      string,
      { medicineId: string; medicineName: string; category: string; unit: string }
    >();
    inventory.forEach((item) => {
      if (!map.has(item.medicineId)) {
        map.set(item.medicineId, {
          medicineId: item.medicineId,
          medicineName: item.medicineName,
          category: item.category,
          unit: item.unit,
        });
      }
    });
    return Array.from(map.values());
  }, [inventory]);

  // Filtered facilities
  const filteredFacilities = useMemo(() => {
    return facilities.filter((fac) => {
      if (tierFilter !== 'all' && fac.tier !== tierFilter) return false;
      if (
        searchQuery &&
        !fac.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !fac.block.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [facilities, tierFilter, searchQuery]);

  // Filtered medicines
  const filteredMedicines = useMemo(() => {
    return criticalMedicines.filter((med) => {
      if (categoryFilter === 'all') return true;
      return med.category === categoryFilter;
    });
  }, [criticalMedicines, categoryFilter]);

  // Lookup map for fast inventory cell retrieval: key = `${facilityId}_${medicineId}`
  const inventoryLookup = useMemo(() => {
    const map = new Map<string, FacilityInventoryRecord>();
    inventory.forEach((item) => {
      map.set(`${item.facilityId}_${item.medicineId}`, item);
    });
    return map;
  }, [inventory]);

  // Summary counts for the heat status
  const summaryMetrics = useMemo(() => {
    let criticalRed = 0;
    let warningAmber = 0;
    let optimalGreen = 0;

    filteredFacilities.forEach((fac) => {
      filteredMedicines.forEach((med) => {
        const item = inventoryLookup.get(`${fac.id}_${med.medicineId}`);
        if (!item || item.currentStock <= 0 || item.status === 'stockout') {
          criticalRed++;
        } else if (item.currentStock <= item.minThreshold || item.status === 'low') {
          warningAmber++;
        } else {
          optimalGreen++;
        }
      });
    });

    return { criticalRed, warningAmber, optimalGreen, total: criticalRed + warningAmber + optimalGreen };
  }, [filteredFacilities, filteredMedicines, inventoryLookup]);

  return (
    <div id="facility-supply-heatmap" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header & Controls */}
      <div className="p-5 border-b border-slate-200 bg-slate-50/60">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center p-1.5 bg-rose-100 text-rose-700 rounded-lg">
                <Flame className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                Critical Supplies & Stockout Heatmap
              </h3>
            </div>
            <p className="text-sm text-slate-600 mt-1 max-w-3xl">
              Live district matrix monitoring essential medicines across lower-tier facilities (PHCs and
              Sub-Centres). Facilities highlighted in <span className="font-semibold text-rose-600">Red</span> are
              facing active stockouts or critical deficits below safety buffer thresholds.
            </p>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span>{summaryMetrics.criticalRed} Critical Stockouts</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>{summaryMetrics.warningAmber} Low Buffer</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>{summaryMetrics.optimalGreen} Optimal</span>
            </div>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="mt-4 pt-4 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5" /> Filter:
            </span>

            {/* Tier filter */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setTierFilter('all')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  tierFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Facilities ({facilities.length})
              </button>
              <button
                type="button"
                onClick={() => setTierFilter('phc')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  tierFilter === 'phc' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                PHCs Only ({facilities.filter((f) => f.tier === 'phc').length})
              </button>
              <button
                type="button"
                onClick={() => setTierFilter('sub_centre')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  tierFilter === 'sub_centre' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sub-Centres Only ({facilities.filter((f) => f.tier === 'sub_centre').length})
              </button>
            </div>

            {/* Category filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Drug Categories</option>
              <option value="hydration">Hydration / ORS</option>
              <option value="vaccine">Cold-Chain Vaccines</option>
              <option value="antibiotic">Antibiotics</option>
              <option value="maternal">Maternal Emergency</option>
              <option value="analgesic">Analgesics & Antipyretics</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search facility or block..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Heatmap Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[850px]">
          <thead>
            <tr className="bg-slate-100/90 text-[11px] font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
              <th className="py-3 px-4 w-72 sticky left-0 bg-slate-100/95 z-10 shadow-[1px_0_0_0_#e2e8f0]">
                Lower-Tier Facility
              </th>
              {filteredMedicines.map((med) => (
                <th key={med.medicineId} className="py-3 px-3 text-center min-w-[130px]">
                  <div className="font-semibold text-slate-800 text-xs truncate" title={med.medicineName}>
                    {med.medicineName.split(' ')[0]} {med.medicineName.split(' ')[1] || ''}
                  </div>
                  <div className="text-[10px] text-slate-500 font-normal uppercase tracking-tight">
                    {med.category} ({med.unit})
                  </div>
                </th>
              ))}
              <th className="py-3 px-3 text-center w-36">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs">
            {filteredFacilities.map((fac) => {
              // Check if this facility has any critical stockouts
              const facilityStockouts = filteredMedicines.filter((med) => {
                const item = inventoryLookup.get(`${fac.id}_${med.medicineId}`);
                return !item || item.currentStock <= 0 || item.status === 'stockout';
              });

              const isDeficitFacility = facilityStockouts.length > 0;

              return (
                <tr key={fac.id} className="hover:bg-slate-50/70 transition-colors group">
                  {/* Facility Identification Column */}
                  <td className="py-3.5 px-4 sticky left-0 bg-white group-hover:bg-slate-50/90 z-10 shadow-[1px_0_0_0_#e2e8f0]">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
                          <span>{fac.name}</span>
                          {isDeficitFacility && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 animate-pulse">
                              ALERT
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span
                            className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-medium uppercase ${
                              fac.tier === 'phc'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}
                          >
                            {fac.tier === 'phc' ? 'PHC' : 'Sub-Centre'}
                          </span>
                          <span>• {fac.block}</span>
                          <span>• {fac.distanceFromDHO} km away</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Supply Matrix Cells */}
                  {filteredMedicines.map((med) => {
                    const item = inventoryLookup.get(`${fac.id}_${med.medicineId}`);
                    const stock = item?.currentStock ?? 0;
                    const threshold = item?.minThreshold ?? 50;
                    const unit = item?.unit ?? med.unit;
                    const isCritical = !item || stock <= 0 || item.status === 'stockout';
                    const isLow = !isCritical && (stock <= threshold || item?.status === 'low');
                    const isSurplus = stock >= threshold * 2.5;

                    return (
                      <td
                        key={med.medicineId}
                        className="py-2.5 px-2 text-center align-middle"
                        onMouseEnter={() =>
                          setHoveredCell({ facilityId: fac.id, medicineId: med.medicineId })
                        }
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (isCritical || isLow) {
                              // Click on deficit cell -> open transfer modal with this facility as deficit
                              onOpenReroute(fac.id, med.medicineId);
                            } else if (isSurplus) {
                              // Click on surplus cell -> open transfer modal with this facility as source
                              onOpenReroute(undefined, med.medicineId, fac.id);
                            }
                          }}
                          className={`w-full py-2 px-2.5 rounded-lg border transition-all duration-150 flex flex-col items-center justify-center relative cursor-pointer group/cell ${
                            isCritical
                              ? 'bg-rose-500 text-white border-rose-600 shadow-sm ring-2 ring-rose-300 ring-offset-1 hover:bg-rose-600'
                              : isLow
                              ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                              : isSurplus
                              ? 'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100'
                              : 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                          }`}
                          title={`Click to initiate re-routing for ${med.medicineName} (${fac.name})`}
                        >
                          <div className="flex items-center gap-1 font-bold text-sm leading-none">
                            {isCritical && <AlertTriangle className="w-3.5 h-3.5 animate-bounce text-white" />}
                            <span>{stock}</span>
                            <span className="text-[10px] font-normal opacity-85">{unit}</span>
                          </div>

                          <div
                            className={`text-[10px] mt-0.5 font-medium leading-none ${
                              isCritical ? 'text-rose-100 font-semibold' : 'text-slate-500'
                            }`}
                          >
                            {isCritical
                              ? 'STOCKOUT'
                              : isLow
                              ? `Low (<${threshold})`
                              : isSurplus
                              ? `Surplus (>${threshold * 2})`
                              : `Safe (min ${threshold})`}
                          </div>

                          {/* Quick re-route badge on hover */}
                          <div className="absolute inset-0 bg-black/80 rounded-lg text-white text-[10px] font-semibold items-center justify-center hidden group-hover/cell:flex gap-1 z-20">
                            <ArrowRightLeft className="w-3 h-3" />
                            <span>{isCritical || isLow ? 'Replenish' : 'Transfer'}</span>
                          </div>
                        </button>
                      </td>
                    );
                  })}

                  {/* Row Re-route CTA */}
                  <td className="py-2.5 px-3 text-center align-middle">
                    <button
                      type="button"
                      onClick={() => {
                        const firstDeficit = facilityStockouts[0];
                        if (firstDeficit) {
                          onOpenReroute(fac.id, firstDeficit.medicineId);
                        } else {
                          onOpenReroute(fac.id);
                        }
                      }}
                      className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all w-full ${
                        isDeficitFacility
                          ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                      }`}
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>{isDeficitFacility ? 'Resolve Deficit' : 'Re-route'}</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Heatmap Legend & DMO Guidance */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-semibold text-slate-700">Heatmap Legend:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-rose-500 border border-rose-600 inline-block" />
            <span className="font-medium text-slate-700">Critical Red (Stockout / &lt;25% Buffer)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-amber-100 border border-amber-300 inline-block" />
            <span>Amber (Low / Approaching Min Threshold)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-emerald-50 border border-emerald-200 inline-block" />
            <span>Emerald (Optimal Stock)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-blue-50 border border-blue-200 inline-block" />
            <span>Blue (Surplus / Available for Re-routing)</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-slate-500">
          <Info className="w-4 h-4 text-blue-500 shrink-0" />
          <span>Click any red cell to launch instant atomic stock transfer</span>
        </div>
      </div>
    </div>
  );
};
