#!/usr/bin/env node
/**
 * Node.js Optimization Script: Tiered Medicine Distribution across Rural Geographic Barriers
 *
 * Mathematical Implementation:
 * - Vogel's Approximation Method (VAM) for linear transportation problem
 * - Haversine geodesic distance with Indian rural road tortuosity factors
 * - Rural geographic barrier modeling (Western Ghats passes, unpaved tracks, river crossings)
 * - Multi-stop vehicle routing heuristic with cold-chain and all-terrain fleet constraints
 *
 * Facility Hierarchy:
 * - Tier 1: District Hospital (DH Central Medical Stores)
 * - Tier 2: Sub-Divisional / Rural Hospital (SDH / RH Regional Depot)
 * - Tier 3: Primary Health Centre (PHC Dispensaries)
 * - Tier 4: Sub-Centres (SC / Ayushman Arogya Mandir Last-Mile Clinics)
 *
 * Usage:
 *   node scripts/optimize-medicine-distribution.js
 */

import {
  optimizeMedicineDistribution,
  solveVogelsApproximationMethod,
  calculateHaversineDistanceKm,
  estimateRoadDistanceKm,
  detectGeographicBarrier,
  calculateTransportationCostCell,
  RURAL_BARRIER_SPECS,
  LOGISTICS_COST_PARAMS,
} from '../functions/lib/medicineDistributionOptimizer.js';

console.log('================================================================================');
console.log('🚛 PAN-INDIA TIERED MEDICINE DISTRIBUTION & VAM TRANSPORTATION OPTIMIZER');
console.log('================================================================================\n');

// ----------------------------------------------------------------------------
// 1. DEFINE TIERED SUPPLY CHAIN NODES ACROSS PUNE DISTRICT & WESTERN GHATS
// ----------------------------------------------------------------------------

console.log('📍 Initializing Healthcare Facility Network Nodes Across Tiers:');

const supplyDepots = [
  {
    facilityId: 'FAC-MH-PUN-DH-001',
    facilityName: 'District Hospital Aundh, Pune (Central Drug Warehouse)',
    tier: 'district_hospital',
    district: 'Pune',
    coordinates: { latitude: 18.5793, longitude: 73.8080 },
    availableStockUnits: 3500,
    hasColdChainStorage: true,
    vehicleFleet: { refrigeratedVans: 3, allTerrain4x4s: 4, standardTrucks: 6 },
  },
  {
    facilityId: 'FAC-MH-PUN-RH-001',
    facilityName: 'Baramati Sub-District / Rural Hospital (South-East Hub)',
    tier: 'rural_hospital',
    district: 'Pune',
    coordinates: { latitude: 18.1517, longitude: 74.5772 },
    availableStockUnits: 2000,
    hasColdChainStorage: true,
    vehicleFleet: { refrigeratedVans: 1, allTerrain4x4s: 2, standardTrucks: 3 },
  },
];

const demandEndpoints = [
  {
    facilityId: 'FAC-MH-PUN-002',
    facilityName: 'Wagholi Primary Health Centre',
    tier: 'phc',
    district: 'Pune',
    coordinates: { latitude: 18.5808, longitude: 73.9787 },
    requestedQuantityUnits: 650,
    criticalityTier: 'essential_acute',
    coldChainRequired: false,
    currentStockOnHand: 120,
    minThreshold: 200,
    barrierFromSupply: 'standard_highway',
  },
  {
    facilityId: 'FAC-MH-PUN-PHC-003',
    facilityName: 'Velhe Primary Health Centre (Torna-Rajgad Foothills)',
    tier: 'phc',
    district: 'Pune',
    coordinates: { latitude: 18.2974, longitude: 73.6358 },
    requestedQuantityUnits: 800,
    criticalityTier: 'critical_life_saving',
    coldChainRequired: true, // Cold-Chain: Anti-Snake Venom (ASV) & Oxytocin
    currentStockOnHand: 40,
    minThreshold: 150,
    barrierFromSupply: 'mountain_ghat',
  },
  {
    facilityId: 'FAC-MH-PUN-SC-001',
    facilityName: 'Panshet Sub-Centre (Sahyadri Dam Catchment)',
    tier: 'sub_centre',
    district: 'Pune',
    coordinates: { latitude: 18.3756, longitude: 73.6125 },
    requestedQuantityUnits: 450,
    criticalityTier: 'critical_life_saving',
    coldChainRequired: true,
    currentStockOnHand: 25,
    minThreshold: 80,
    barrierFromSupply: 'mountain_ghat',
  },
  {
    facilityId: 'FAC-MH-PUN-SC-002',
    facilityName: 'Daund Rural Sub-Centre (Bhima River Basin)',
    tier: 'sub_centre',
    district: 'Pune',
    coordinates: { latitude: 18.4650, longitude: 74.5820 },
    requestedQuantityUnits: 500,
    criticalityTier: 'standard_chronic',
    coldChainRequired: false,
    currentStockOnHand: 80,
    minThreshold: 120,
    barrierFromSupply: 'unpaved_rural',
  },
  {
    facilityId: 'FAC-MH-PUN-PHC-004',
    facilityName: 'Junnar Primary Health Centre (Shivneri Foothills)',
    tier: 'phc',
    district: 'Pune',
    coordinates: { latitude: 19.2083, longitude: 73.8778 },
    requestedQuantityUnits: 750,
    criticalityTier: 'essential_acute',
    coldChainRequired: false,
    currentStockOnHand: 110,
    minThreshold: 200,
    barrierFromSupply: 'forest_fringe',
  },
  {
    facilityId: 'FAC-MH-PUN-SC-003',
    facilityName: 'Otur Sub-Centre / Ayushman Arogya Mandir',
    tier: 'sub_centre',
    district: 'Pune',
    coordinates: { latitude: 19.2612, longitude: 73.9856 },
    requestedQuantityUnits: 400,
    criticalityTier: 'wellness_supplement',
    coldChainRequired: false,
    currentStockOnHand: 50,
    minThreshold: 100,
    barrierFromSupply: 'unpaved_rural',
  },
];

console.log(`- Supply Depots (Tiers 1 & 2): ${supplyDepots.length}`);
supplyDepots.forEach((s) => {
  console.log(`  • [${s.tier.toUpperCase()}] ${s.facilityName} -> Capacity: ${s.availableStockUnits} units (Cold Chain: ${s.hasColdChainStorage ? 'YES' : 'NO'})`);
});

console.log(`\n- Demand Endpoints (Tiers 3 & 4): ${demandEndpoints.length}`);
demandEndpoints.forEach((d) => {
  console.log(`  • [${d.tier.toUpperCase()}] ${d.facilityName} -> Requisition: ${d.requestedQuantityUnits} units | Barrier: ${d.barrierFromSupply} | Cold Chain: ${d.coldChainRequired ? 'REQUIRED' : 'NO'}`);
});

const totalSupply = supplyDepots.reduce((a, s) => a + s.availableStockUnits, 0);
const totalDemand = demandEndpoints.reduce((a, d) => a + d.requestedQuantityUnits, 0);
console.log(`\nTotal District Supply Capacity: ${totalSupply} units`);
console.log(`Total Facility Requisition Demand: ${totalDemand} units`);
console.log(`Net District Surplus Buffer: ${totalSupply - totalDemand} units\n`);

// ----------------------------------------------------------------------------
// 2. GEOGRAPHIC BARRIER ANALYSIS & TRANSPORTATION COST MATRIX
// ----------------------------------------------------------------------------

console.log('--------------------------------------------------------------------------------');
console.log('⛰️  RURAL GEOGRAPHIC BARRIERS & UNIT TRANSPORTATION COST MATRIX [C_ij]');
console.log('--------------------------------------------------------------------------------');

const costMatrix = [];
for (let i = 0; i < supplyDepots.length; i++) {
  costMatrix[i] = [];
  for (let j = 0; j < demandEndpoints.length; j++) {
    costMatrix[i][j] = calculateTransportationCostCell(supplyDepots[i], demandEndpoints[j]);
  }
}

// Display Cost Matrix
console.log('\nMatrix of Unit Costs (₹ per 100 medicine units), Road Distance & Transit Time:');
for (let i = 0; i < supplyDepots.length; i++) {
  console.log(`\nOrigin Depot [${i + 1}]: ${supplyDepots[i].facilityName}`);
  for (let j = 0; j < demandEndpoints.length; j++) {
    const cell = costMatrix[i][j];
    const spec = RURAL_BARRIER_SPECS[cell.barrierType];
    console.log(
      `  -> Destination [${j + 1}] ${demandEndpoints[j].facilityName.padEnd(45)} | ` +
      `Dist: ${String(cell.roadDistanceKm).padStart(5)} km | ` +
      `Time: ${String(cell.transitMinutes).padStart(3)} min | ` +
      `Barrier: ${spec.name.padEnd(28)} | ` +
      `Unit Cost: ₹${cell.unitTransportationCostInr.toFixed(2)}`
    );
  }
}

// ----------------------------------------------------------------------------
// 3. EXECUTE VOGEL'S APPROXIMATION METHOD (VAM)
// ----------------------------------------------------------------------------

console.log('\n--------------------------------------------------------------------------------');
console.log("📐 EXECUTING VOGEL'S APPROXIMATION METHOD (VAM) LINEAR ALLOCATION");
console.log('--------------------------------------------------------------------------------\n');

const vamResult = solveVogelsApproximationMethod(supplyDepots, demandEndpoints, costMatrix);

console.log("Vogel's Penalty Iteration Trace:");
vamResult.auditLog.forEach((entry) => {
  console.log(
    `  Iter #${entry.iteration}: Evaluated ${entry.selectedRowOrCol.toUpperCase()} penalty = ₹${entry.penalty.toFixed(2)} | ` +
    `Allocated ${entry.allocatedUnits} units from [${entry.allocatedSupply.substring(0, 25)}...] -> [${entry.allocatedDemand.substring(0, 25)}...] @ ₹${entry.cellCost.toFixed(2)}/unit`
  );
});

console.log('\nFinal Allocations Matrix:');
let totalAllocCost = 0;
vamResult.allocations.forEach((alloc, idx) => {
  totalAllocCost += alloc.totalCostInr;
  console.log(
    `  ${idx + 1}. ${alloc.supplyFacilityName.substring(0, 28).padEnd(28)} ===(${alloc.allocatedUnits} units)====> ` +
    `${alloc.demandFacilityName.substring(0, 32).padEnd(32)} | Transit: ${alloc.transitMinutes} mins | Cost: ₹${alloc.totalCostInr.toLocaleString('en-IN')}`
  );
});

console.log(`\nTotal Optimal Transportation Cost: ₹${Math.round(totalAllocCost).toLocaleString('en-IN')}`);
console.log(`Unmet Demand: ${vamResult.unmetDemandUnits} units`);

// ----------------------------------------------------------------------------
// 4. RUN FULL END-TO-END DISTRIBUTION PLAN WITH VEHICLE ROUTING
// ----------------------------------------------------------------------------

console.log('\n--------------------------------------------------------------------------------');
console.log('🚚 MULTI-STOP VEHICLE ROUTING WITH TERRAIN & COLD CHAIN FLEET SELECTION');
console.log('--------------------------------------------------------------------------------\n');

const planResult = optimizeMedicineDistribution({
  district: 'Pune',
  state: 'Maharashtra',
  weekNumber: 37,
  year: 2026,
  supplies: supplyDepots,
  demands: demandEndpoints,
});

console.log(`Plan ID: ${planResult.planId}`);
console.log(`Plan Number: ${planResult.planNumber}`);
console.log(`Satisfaction Rate: ${planResult.allocationSatisfactionRatePercent}%`);
console.log(`Total Distance Traversed: ${planResult.totalDistanceKm} km`);
console.log(`Total Driving Duration: ${Math.round((planResult.totalTransitMinutes / 60) * 10) / 10} hours (${planResult.totalTransitMinutes} minutes)`);
console.log(`Active Dispatched Routes: ${planResult.routesCount}\n`);

planResult.routes.forEach((route, rIdx) => {
  console.log(`========================================================================`);
  console.log(`Route #${rIdx + 1}: ${route.routeNumber}`);
  console.log(`Origin: ${route.originFacilityName} [${route.originTier.toUpperCase()}]`);
  console.log(`Vehicle Assigned: ${route.vehicleType.toUpperCase()} (Capacity: ${route.vehicleCapacityUnits} units, Utilized: ${route.totalAllocatedUnits} units, ${route.capacityUtilizationPercent}%)`);
  console.log(`Total Circuit Distance: ${route.totalDistanceKm} km | Duration: ${route.totalDrivingHours} hrs | Fuel & Wear Cost: ₹${route.totalCostInr.toLocaleString('en-IN')}`);
  console.log(`Barriers Traversed: ${route.geographicBarriersTraversed.join(', ')}`);
  console.log(`\nDelivery Waypoints / Stops:`);

  route.stops.forEach((stop) => {
    console.log(
      `   Stop #${stop.stopOrder}: [${stop.tier.toUpperCase()}] ${stop.facilityName}\n` +
      `            Drop: ${stop.deliveredUnits} units (${stop.medicinesSummary.join(' | ')})\n` +
      `            Segment: +${stop.distanceFromPreviousKm} km in ${stop.segmentTransitMinutes} mins | Terrain: ${stop.barrierName}\n` +
      `            Cumulative: ${stop.cumulativeDistanceKm} km (${stop.cumulativeTransitMinutes} mins total)`
    );
  });
  console.log('');
});

// ----------------------------------------------------------------------------
// 5. VALIDATION ASSERTIONS
// ----------------------------------------------------------------------------

console.log('--------------------------------------------------------------------------------');
console.log('🧪 VERIFICATION ASSERTIONS & CONSERVATION CHECKS');
console.log('--------------------------------------------------------------------------------');

let testPasses = 0;
let totalTests = 0;

function assertCheck(condition, description) {
  totalTests++;
  if (condition) {
    console.log(`✅ [PASS] ${description}`);
    testPasses++;
  } else {
    console.error(`❌ [FAIL] ${description}`);
    process.exitCode = 1;
  }
}

// Check 1: Conservation of mass
const totalAllocated = planResult.totalAllocatedUnits;
assertCheck(
  totalAllocated === totalDemand,
  `Conservation of Demand: Total allocated (${totalAllocated}) equals total demand (${totalDemand})`
);

// Check 2: Supply limit feasibility
const allocatedBySupply = {};
planResult.allocations.forEach((a) => {
  allocatedBySupply[a.supplyId] = (allocatedBySupply[a.supplyId] || 0) + a.allocatedUnits;
});

supplyDepots.forEach((s) => {
  const used = allocatedBySupply[s.facilityId] || 0;
  assertCheck(
    used <= s.availableStockUnits,
    `Capacity Constraint: Supply from ${s.facilityName.substring(0, 20)} (${used} units) <= Available (${s.availableStockUnits} units)`
  );
});

// Check 3: Zero unmet demand when system has surplus
assertCheck(
  planResult.unmetDemandUnits === 0,
  `Unmet Demand: 0 unmet demand units achieved with ${totalSupply - totalDemand} units surplus`
);

// Check 4: Cold chain routes assign refrigerated vans
const coldChainDemands = demandEndpoints.filter((d) => d.coldChainRequired).map((d) => d.facilityId);
const coldChainRoutes = planResult.routes.filter((r) =>
  r.stops.some((s) => coldChainDemands.includes(s.facilityId))
);
assertCheck(
  coldChainRoutes.every((r) => r.vehicleType === 'refrigerated_van'),
  `Cold Chain Safety: All routes serving cold-chain facilities assigned refrigerated vans`
);

// Check 5: Mountain ghat terrain routes identify barriers
assertCheck(
  planResult.ruralBarriersSummary.mountainGhatStopsCount >= 2,
  `Barrier Detection: Correctly identified ${planResult.ruralBarriersSummary.mountainGhatStopsCount} mountain ghat stops (Torna/Panshet)`
);

console.log(`\nOptimization verification completed: ${testPasses}/${totalTests} tests passed.`);
console.log('================================================================================\n');
