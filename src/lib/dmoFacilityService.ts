import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import {
  FacilityInventoryRecord,
  DiagnosticEquipmentRecord,
  InventoryTransferRecord,
  FacilityTier,
} from '../types';

// ============================================================================
// CURATED INITIAL DATA FOR LOWER-TIER FACILITIES (PHCs & SUB-CENTRES)
// ============================================================================

export interface DMOFacilityNode {
  id: string;
  name: string;
  tier: FacilityTier;
  district: string;
  state: string;
  block: string;
  distanceFromDHO: number; // km
  contactPerson: string;
  phone: string;
  activeStatus: 'active' | 'offline';
}

export const DMO_DISTRICT_FACILITIES: DMOFacilityNode[] = [
  {
    id: 'fac_phc_chandanpur',
    name: 'Chandanpur Primary Health Centre',
    tier: 'phc',
    district: 'Sundargarh',
    state: 'Odisha',
    block: 'Sundargarh Sadar',
    distanceFromDHO: 14,
    contactPerson: 'Dr. Vivek Sengupta (Medical Officer In-Charge)',
    phone: '+91 6622 245100',
    activeStatus: 'active',
  },
  {
    id: 'fac_sub_rampur',
    name: 'Rampur Health Sub-Centre (HWC)',
    tier: 'sub_centre',
    district: 'Sundargarh',
    state: 'Odisha',
    block: 'Sundargarh Sadar',
    distanceFromDHO: 28,
    contactPerson: 'Sister Priya Nair (CHO / ASHA Lead)',
    phone: '+91 94371 82910',
    activeStatus: 'active',
  },
  {
    id: 'fac_phc_bargaon',
    name: 'Bargaon Primary Health Centre',
    tier: 'phc',
    district: 'Sundargarh',
    state: 'Odisha',
    block: 'Bargaon Block',
    distanceFromDHO: 36,
    contactPerson: 'Dr. Ananya Mishra (Medical Officer)',
    phone: '+91 6622 261890',
    activeStatus: 'active',
  },
  {
    id: 'fac_sub_koira',
    name: 'Koira Health Sub-Centre (HWC)',
    tier: 'sub_centre',
    district: 'Sundargarh',
    state: 'Odisha',
    block: 'Koira Mining Sector',
    distanceFromDHO: 64,
    contactPerson: 'ANM Sunita Mahato',
    phone: '+91 98610 33412',
    activeStatus: 'active',
  },
  {
    id: 'fac_phc_lahunipara',
    name: 'Lahunipara Primary Health Centre',
    tier: 'phc',
    district: 'Sundargarh',
    state: 'Odisha',
    block: 'Lahunipara Block',
    distanceFromDHO: 52,
    contactPerson: 'Dr. Subhashree Jena (Medical Officer)',
    phone: '+91 6622 277310',
    activeStatus: 'active',
  },
  {
    id: 'fac_sub_bonai',
    name: 'Bonai Sub-Centre & Health Post',
    tier: 'sub_centre',
    district: 'Sundargarh',
    state: 'Odisha',
    block: 'Bonaigarh Sub-Division',
    distanceFromDHO: 48,
    contactPerson: 'CHO Rajesh Behera',
    phone: '+91 94370 11984',
    activeStatus: 'active',
  },
];

export const INITIAL_INVENTORY_ITEMS: FacilityInventoryRecord[] = [
  // --- Chandanpur PHC (Surplus Hub) ---
  {
    id: 'fac_phc_chandanpur_med_ors',
    facilityId: 'fac_phc_chandanpur',
    facilityName: 'Chandanpur Primary Health Centre',
    district: 'Sundargarh',
    tier: 'phc',
    medicineId: 'med_ors',
    medicineName: 'ORS (Oral Rehydration Salts) Sachets',
    category: 'hydration',
    currentStock: 920,
    minThreshold: 200,
    unit: 'sachets',
    status: 'optimal',
    batchNumber: 'ORS-2025-11B',
    expiryDate: '2027-10-31',
    daysOfSupplyRemaining: 45,
    lastUpdated: '2026-09-10T01:00:00Z',
  },
  {
    id: 'fac_phc_chandanpur_med_vaccine_penta',
    facilityId: 'fac_phc_chandanpur',
    facilityName: 'Chandanpur Primary Health Centre',
    district: 'Sundargarh',
    tier: 'phc',
    medicineId: 'med_vaccine_penta',
    medicineName: 'Pentavalent Vaccine Vials (DPT-HepB-Hib)',
    category: 'vaccine',
    currentStock: 340,
    minThreshold: 80,
    unit: 'vials',
    status: 'optimal',
    batchNumber: 'PV-2026-04A',
    expiryDate: '2027-04-30',
    daysOfSupplyRemaining: 55,
    lastUpdated: '2026-09-10T01:00:00Z',
  },
  {
    id: 'fac_phc_chandanpur_med_amoxicillin_500',
    facilityId: 'fac_phc_chandanpur',
    facilityName: 'Chandanpur Primary Health Centre',
    district: 'Sundargarh',
    tier: 'phc',
    medicineId: 'med_amoxicillin_500',
    medicineName: 'Amoxicillin Trihydrate 500mg',
    category: 'antibiotic',
    currentStock: 1400,
    minThreshold: 350,
    unit: 'capsules',
    status: 'optimal',
    batchNumber: 'AMX-2025-08D',
    expiryDate: '2027-08-31',
    daysOfSupplyRemaining: 40,
    lastUpdated: '2026-09-10T01:00:00Z',
  },
  {
    id: 'fac_phc_chandanpur_med_oxytocin_10',
    facilityId: 'fac_phc_chandanpur',
    facilityName: 'Chandanpur Primary Health Centre',
    district: 'Sundargarh',
    tier: 'phc',
    medicineId: 'med_oxytocin_10',
    medicineName: 'Oxytocin Injection 10 IU/mL',
    category: 'maternal',
    currentStock: 180,
    minThreshold: 50,
    unit: 'ampoules',
    status: 'optimal',
    batchNumber: 'OXY-2026-02',
    expiryDate: '2027-02-28',
    daysOfSupplyRemaining: 60,
    lastUpdated: '2026-09-10T01:00:00Z',
  },
  {
    id: 'fac_phc_chandanpur_med_paracetamol_500',
    facilityId: 'fac_phc_chandanpur',
    facilityName: 'Chandanpur Primary Health Centre',
    district: 'Sundargarh',
    tier: 'phc',
    medicineId: 'med_paracetamol_500',
    medicineName: 'Paracetamol 500mg Tablets',
    category: 'analgesic',
    currentStock: 2500,
    minThreshold: 500,
    unit: 'tablets',
    status: 'optimal',
    batchNumber: 'PCM-2026-01',
    expiryDate: '2028-01-31',
    daysOfSupplyRemaining: 70,
    lastUpdated: '2026-09-10T01:00:00Z',
  },

  // --- Rampur Sub-Centre (CRITICAL DEFICIT in ORS & Antibiotics) ---
  {
    id: 'fac_sub_rampur_med_ors',
    facilityId: 'fac_sub_rampur',
    facilityName: 'Rampur Health Sub-Centre (HWC)',
    district: 'Sundargarh',
    tier: 'sub_centre',
    medicineId: 'med_ors',
    medicineName: 'ORS (Oral Rehydration Salts) Sachets',
    category: 'hydration',
    currentStock: 8,
    minThreshold: 120,
    unit: 'sachets',
    status: 'stockout', // RED FLAG
    batchNumber: 'ORS-2024-12C',
    expiryDate: '2026-11-30',
    daysOfSupplyRemaining: 1,
    lastUpdated: '2026-09-10T01:15:00Z',
  },
  {
    id: 'fac_sub_rampur_med_vaccine_penta',
    facilityId: 'fac_sub_rampur',
    facilityName: 'Rampur Health Sub-Centre (HWC)',
    district: 'Sundargarh',
    tier: 'sub_centre',
    medicineId: 'med_vaccine_penta',
    medicineName: 'Pentavalent Vaccine Vials (DPT-HepB-Hib)',
    category: 'vaccine',
    currentStock: 12,
    minThreshold: 40,
    unit: 'vials',
    status: 'low', // AMBER FLAG
    batchNumber: 'PV-2025-09B',
    expiryDate: '2026-12-31',
    daysOfSupplyRemaining: 4,
    lastUpdated: '2026-09-10T01:15:00Z',
  },
  {
    id: 'fac_sub_rampur_med_amoxicillin_500',
    facilityId: 'fac_sub_rampur',
    facilityName: 'Rampur Health Sub-Centre (HWC)',
    district: 'Sundargarh',
    tier: 'sub_centre',
    medicineId: 'med_amoxicillin_500',
    medicineName: 'Amoxicillin Trihydrate 500mg',
    category: 'antibiotic',
    currentStock: 0,
    minThreshold: 150,
    unit: 'capsules',
    status: 'stockout', // RED FLAG
    batchNumber: 'AMX-2024-10A',
    expiryDate: '2026-10-31',
    daysOfSupplyRemaining: 0,
    lastUpdated: '2026-09-10T01:15:00Z',
  },
  {
    id: 'fac_sub_rampur_med_oxytocin_10',
    facilityId: 'fac_sub_rampur',
    facilityName: 'Rampur Health Sub-Centre (HWC)',
    district: 'Sundargarh',
    tier: 'sub_centre',
    medicineId: 'med_oxytocin_10',
    medicineName: 'Oxytocin Injection 10 IU/mL',
    category: 'maternal',
    currentStock: 18,
    minThreshold: 20,
    unit: 'ampoules',
    status: 'low',
    batchNumber: 'OXY-2025-06',
    expiryDate: '2027-01-31',
    daysOfSupplyRemaining: 6,
    lastUpdated: '2026-09-10T01:15:00Z',
  },
  {
    id: 'fac_sub_rampur_med_paracetamol_500',
    facilityId: 'fac_sub_rampur',
    facilityName: 'Rampur Health Sub-Centre (HWC)',
    district: 'Sundargarh',
    tier: 'sub_centre',
    medicineId: 'med_paracetamol_500',
    medicineName: 'Paracetamol 500mg Tablets',
    category: 'analgesic',
    currentStock: 120,
    minThreshold: 250,
    unit: 'tablets',
    status: 'low',
    batchNumber: 'PCM-2025-04',
    expiryDate: '2027-04-30',
    daysOfSupplyRemaining: 5,
    lastUpdated: '2026-09-10T01:15:00Z',
  },

  // --- Bargaon PHC (Surplus Vaccines & Hydration) ---
  {
    id: 'fac_phc_bargaon_med_ors',
    facilityId: 'fac_phc_bargaon',
    facilityName: 'Bargaon Primary Health Centre',
    district: 'Sundargarh',
    tier: 'phc',
    medicineId: 'med_ors',
    medicineName: 'ORS (Oral Rehydration Salts) Sachets',
    category: 'hydration',
    currentStock: 680,
    minThreshold: 180,
    unit: 'sachets',
    status: 'optimal',
    batchNumber: 'ORS-2025-09A',
    expiryDate: '2027-09-30',
    daysOfSupplyRemaining: 38,
    lastUpdated: '2026-09-10T01:00:00Z',
  },
  {
    id: 'fac_phc_bargaon_med_vaccine_penta',
    facilityId: 'fac_phc_bargaon',
    facilityName: 'Bargaon Primary Health Centre',
    district: 'Sundargarh',
    tier: 'phc',
    medicineId: 'med_vaccine_penta',
    medicineName: 'Pentavalent Vaccine Vials (DPT-HepB-Hib)',
    category: 'vaccine',
    currentStock: 280,
    minThreshold: 75,
    unit: 'vials',
    status: 'optimal',
    batchNumber: 'PV-2026-02C',
    expiryDate: '2027-02-28',
    daysOfSupplyRemaining: 48,
    lastUpdated: '2026-09-10T01:00:00Z',
  },
  {
    id: 'fac_phc_bargaon_med_amoxicillin_500',
    facilityId: 'fac_phc_bargaon',
    facilityName: 'Bargaon Primary Health Centre',
    district: 'Sundargarh',
    tier: 'phc',
    medicineId: 'med_amoxicillin_500',
    medicineName: 'Amoxicillin Trihydrate 500mg',
    category: 'antibiotic',
    currentStock: 890,
    minThreshold: 250,
    unit: 'capsules',
    status: 'optimal',
    batchNumber: 'AMX-2025-11B',
    expiryDate: '2027-11-30',
    daysOfSupplyRemaining: 32,
    lastUpdated: '2026-09-10T01:00:00Z',
  },
  {
    id: 'fac_phc_bargaon_med_oxytocin_10',
    facilityId: 'fac_phc_bargaon',
    facilityName: 'Bargaon Primary Health Centre',
    district: 'Sundargarh',
    tier: 'phc',
    medicineId: 'med_oxytocin_10',
    medicineName: 'Oxytocin Injection 10 IU/mL',
    category: 'maternal',
    currentStock: 110,
    minThreshold: 40,
    unit: 'ampoules',
    status: 'optimal',
    batchNumber: 'OXY-2026-01',
    expiryDate: '2027-01-31',
    daysOfSupplyRemaining: 42,
    lastUpdated: '2026-09-10T01:00:00Z',
  },
  {
    id: 'fac_phc_bargaon_med_paracetamol_500',
    facilityId: 'fac_phc_bargaon',
    facilityName: 'Bargaon Primary Health Centre',
    district: 'Sundargarh',
    tier: 'phc',
    medicineId: 'med_paracetamol_500',
    medicineName: 'Paracetamol 500mg Tablets',
    category: 'analgesic',
    currentStock: 1950,
    minThreshold: 400,
    unit: 'tablets',
    status: 'optimal',
    batchNumber: 'PCM-2025-12',
    expiryDate: '2027-12-31',
    daysOfSupplyRemaining: 50,
    lastUpdated: '2026-09-10T01:00:00Z',
  },

  // --- Koira Sub-Centre (CRITICAL DEFICIT in Vaccines & Oxytocin) ---
  {
    id: 'fac_sub_koira_med_ors',
    facilityId: 'fac_sub_koira',
    facilityName: 'Koira Health Sub-Centre (HWC)',
    district: 'Sundargarh',
    tier: 'sub_centre',
    medicineId: 'med_ors',
    medicineName: 'ORS (Oral Rehydration Salts) Sachets',
    category: 'hydration',
    currentStock: 24,
    minThreshold: 100,
    unit: 'sachets',
    status: 'low',
    batchNumber: 'ORS-2025-01A',
    expiryDate: '2027-01-31',
    daysOfSupplyRemaining: 4,
    lastUpdated: '2026-09-10T01:20:00Z',
  },
  {
    id: 'fac_sub_koira_med_vaccine_penta',
    facilityId: 'fac_sub_koira',
    facilityName: 'Koira Health Sub-Centre (HWC)',
    district: 'Sundargarh',
    tier: 'sub_centre',
    medicineId: 'med_vaccine_penta',
    medicineName: 'Pentavalent Vaccine Vials (DPT-HepB-Hib)',
    category: 'vaccine',
    currentStock: 0,
    minThreshold: 35,
    unit: 'vials',
    status: 'stockout', // RED FLAG
    batchNumber: 'PV-2025-05A',
    expiryDate: '2026-11-30',
    daysOfSupplyRemaining: 0,
    lastUpdated: '2026-09-10T01:20:00Z',
  },
  {
    id: 'fac_sub_koira_med_amoxicillin_500',
    facilityId: 'fac_sub_koira',
    facilityName: 'Koira Health Sub-Centre (HWC)',
    district: 'Sundargarh',
    tier: 'sub_centre',
    medicineId: 'med_amoxicillin_500',
    medicineName: 'Amoxicillin Trihydrate 500mg',
    category: 'antibiotic',
    currentStock: 25,
    minThreshold: 120,
    unit: 'capsules',
    status: 'stockout', // RED FLAG
    batchNumber: 'AMX-2025-02B',
    expiryDate: '2027-02-28',
    daysOfSupplyRemaining: 2,
    lastUpdated: '2026-09-10T01:20:00Z',
  },
  {
    id: 'fac_sub_koira_med_oxytocin_10',
    facilityId: 'fac_sub_koira',
    facilityName: 'Koira Health Sub-Centre (HWC)',
    district: 'Sundargarh',
    tier: 'sub_centre',
    medicineId: 'med_oxytocin_10',
    medicineName: 'Oxytocin Injection 10 IU/mL',
    category: 'maternal',
    currentStock: 2,
    minThreshold: 15,
    unit: 'ampoules',
    status: 'stockout', // RED FLAG
    batchNumber: 'OXY-2025-04',
    expiryDate: '2026-10-31',
    daysOfSupplyRemaining: 1,
    lastUpdated: '2026-09-10T01:20:00Z',
  },
  {
    id: 'fac_sub_koira_med_paracetamol_500',
    facilityId: 'fac_sub_koira',
    facilityName: 'Koira Health Sub-Centre (HWC)',
    district: 'Sundargarh',
    tier: 'sub_centre',
    medicineId: 'med_paracetamol_500',
    medicineName: 'Paracetamol 500mg Tablets',
    category: 'analgesic',
    currentStock: 80,
    minThreshold: 200,
    unit: 'tablets',
    status: 'low',
    batchNumber: 'PCM-2025-06',
    expiryDate: '2027-06-30',
    daysOfSupplyRemaining: 3,
    lastUpdated: '2026-09-10T01:20:00Z',
  },

  // --- Lahunipara PHC ---
  {
    id: 'fac_phc_lahunipara_med_ors',
    facilityId: 'fac_phc_lahunipara',
    facilityName: 'Lahunipara Primary Health Centre',
    district: 'Sundargarh',
    tier: 'phc',
    medicineId: 'med_ors',
    medicineName: 'ORS (Oral Rehydration Salts) Sachets',
    category: 'hydration',
    currentStock: 410,
    minThreshold: 180,
    unit: 'sachets',
    status: 'optimal',
    batchNumber: 'ORS-2025-07A',
    expiryDate: '2027-07-31',
    daysOfSupplyRemaining: 24,
    lastUpdated: '2026-09-10T01:00:00Z',
  },
  {
    id: 'fac_phc_lahunipara_med_vaccine_penta',
    facilityId: 'fac_phc_lahunipara',
    facilityName: 'Lahunipara Primary Health Centre',
    district: 'Sundargarh',
    tier: 'phc',
    medicineId: 'med_vaccine_penta',
    medicineName: 'Pentavalent Vaccine Vials (DPT-HepB-Hib)',
    category: 'vaccine',
    currentStock: 18,
    minThreshold: 60,
    unit: 'vials',
    status: 'low',
    batchNumber: 'PV-2025-08B',
    expiryDate: '2026-12-31',
    daysOfSupplyRemaining: 5,
    lastUpdated: '2026-09-10T01:00:00Z',
  },
  {
    id: 'fac_phc_lahunipara_med_amoxicillin_500',
    facilityId: 'fac_phc_lahunipara',
    facilityName: 'Lahunipara Primary Health Centre',
    district: 'Sundargarh',
    tier: 'phc',
    medicineId: 'med_amoxicillin_500',
    medicineName: 'Amoxicillin Trihydrate 500mg',
    category: 'antibiotic',
    currentStock: 15,
    minThreshold: 200,
    unit: 'capsules',
    status: 'stockout', // RED FLAG
    batchNumber: 'AMX-2025-01C',
    expiryDate: '2027-01-31',
    daysOfSupplyRemaining: 1,
    lastUpdated: '2026-09-10T01:00:00Z',
  },
  {
    id: 'fac_phc_lahunipara_med_oxytocin_10',
    facilityId: 'fac_phc_lahunipara',
    facilityName: 'Lahunipara Primary Health Centre',
    district: 'Sundargarh',
    tier: 'phc',
    medicineId: 'med_oxytocin_10',
    medicineName: 'Oxytocin Injection 10 IU/mL',
    category: 'maternal',
    currentStock: 65,
    minThreshold: 35,
    unit: 'ampoules',
    status: 'optimal',
    batchNumber: 'OXY-2025-11',
    expiryDate: '2027-11-30',
    daysOfSupplyRemaining: 28,
    lastUpdated: '2026-09-10T01:00:00Z',
  },
  {
    id: 'fac_phc_lahunipara_med_paracetamol_500',
    facilityId: 'fac_phc_lahunipara',
    facilityName: 'Lahunipara Primary Health Centre',
    district: 'Sundargarh',
    tier: 'phc',
    medicineId: 'med_paracetamol_500',
    medicineName: 'Paracetamol 500mg Tablets',
    category: 'analgesic',
    currentStock: 840,
    minThreshold: 350,
    unit: 'tablets',
    status: 'optimal',
    batchNumber: 'PCM-2025-09',
    expiryDate: '2027-09-30',
    daysOfSupplyRemaining: 30,
    lastUpdated: '2026-09-10T01:00:00Z',
  },

  // --- Bonai Sub-Centre (CRITICAL DEFICIT in ORS & Vaccines) ---
  {
    id: 'fac_sub_bonai_med_ors',
    facilityId: 'fac_sub_bonai',
    facilityName: 'Bonai Sub-Centre & Health Post',
    district: 'Sundargarh',
    tier: 'sub_centre',
    medicineId: 'med_ors',
    medicineName: 'ORS (Oral Rehydration Salts) Sachets',
    category: 'hydration',
    currentStock: 14,
    minThreshold: 110,
    unit: 'sachets',
    status: 'stockout', // RED FLAG
    batchNumber: 'ORS-2025-03',
    expiryDate: '2027-03-31',
    daysOfSupplyRemaining: 2,
    lastUpdated: '2026-09-10T01:25:00Z',
  },
  {
    id: 'fac_sub_bonai_med_vaccine_penta',
    facilityId: 'fac_sub_bonai',
    facilityName: 'Bonai Sub-Centre & Health Post',
    district: 'Sundargarh',
    tier: 'sub_centre',
    medicineId: 'med_vaccine_penta',
    medicineName: 'Pentavalent Vaccine Vials (DPT-HepB-Hib)',
    category: 'vaccine',
    currentStock: 4,
    minThreshold: 35,
    unit: 'vials',
    status: 'stockout', // RED FLAG
    batchNumber: 'PV-2025-04A',
    expiryDate: '2026-10-31',
    daysOfSupplyRemaining: 1,
    lastUpdated: '2026-09-10T01:25:00Z',
  },
  {
    id: 'fac_sub_bonai_med_amoxicillin_500',
    facilityId: 'fac_sub_bonai',
    facilityName: 'Bonai Sub-Centre & Health Post',
    district: 'Sundargarh',
    tier: 'sub_centre',
    medicineId: 'med_amoxicillin_500',
    medicineName: 'Amoxicillin Trihydrate 500mg',
    category: 'antibiotic',
    currentStock: 180,
    minThreshold: 100,
    unit: 'capsules',
    status: 'optimal',
    batchNumber: 'AMX-2025-07',
    expiryDate: '2027-07-31',
    daysOfSupplyRemaining: 22,
    lastUpdated: '2026-09-10T01:25:00Z',
  },
  {
    id: 'fac_sub_bonai_med_oxytocin_10',
    facilityId: 'fac_sub_bonai',
    facilityName: 'Bonai Sub-Centre & Health Post',
    district: 'Sundargarh',
    tier: 'sub_centre',
    medicineId: 'med_oxytocin_10',
    medicineName: 'Oxytocin Injection 10 IU/mL',
    category: 'maternal',
    currentStock: 22,
    minThreshold: 15,
    unit: 'ampoules',
    status: 'optimal',
    batchNumber: 'OXY-2025-08',
    expiryDate: '2027-08-31',
    daysOfSupplyRemaining: 18,
    lastUpdated: '2026-09-10T01:25:00Z',
  },
  {
    id: 'fac_sub_bonai_med_paracetamol_500',
    facilityId: 'fac_sub_bonai',
    facilityName: 'Bonai Sub-Centre & Health Post',
    district: 'Sundargarh',
    tier: 'sub_centre',
    medicineId: 'med_paracetamol_500',
    medicineName: 'Paracetamol 500mg Tablets',
    category: 'analgesic',
    currentStock: 310,
    minThreshold: 200,
    unit: 'tablets',
    status: 'optimal',
    batchNumber: 'PCM-2025-08',
    expiryDate: '2027-08-31',
    daysOfSupplyRemaining: 19,
    lastUpdated: '2026-09-10T01:25:00Z',
  },
];

export const INITIAL_DIAGNOSTIC_EQUIPMENT: DiagnosticEquipmentRecord[] = [
  // Chandanpur PHC
  {
    id: 'eq_chandanpur_ilr',
    facilityId: 'fac_phc_chandanpur',
    facilityName: 'Chandanpur Primary Health Centre',
    district: 'Sundargarh',
    tier: 'phc',
    name: 'Solar Direct Drive Vaccine Refrigerator (ILR)',
    category: 'cold_chain',
    status: 'operational',
    uptimePercent: 99.4,
    serialNumber: 'ILR-SDD-2024-9182',
    lastServicedDate: '2026-08-14',
    nextScheduledService: '2026-11-14',
    technicianContact: 'BioMed Eng. S. Mohapatra (+91 94371 00214)',
  },
  {
    id: 'eq_chandanpur_centrifuge',
    facilityId: 'fac_phc_chandanpur',
    facilityName: 'Chandanpur Primary Health Centre',
    district: 'Sundargarh',
    tier: 'phc',
    name: 'Clinical Centrifuge Machine (12-Tube Microhematocrit)',
    category: 'laboratory',
    status: 'operational',
    uptimePercent: 98.1,
    serialNumber: 'CFG-LAB-12-004',
    lastServicedDate: '2026-07-20',
    nextScheduledService: '2026-10-20',
  },
  {
    id: 'eq_chandanpur_ecg',
    facilityId: 'fac_phc_chandanpur',
    facilityName: 'Chandanpur Primary Health Centre',
    district: 'Sundargarh',
    tier: 'phc',
    name: 'Digital 12-Lead Portable ECG Monitor',
    category: 'point_of_care',
    status: 'operational',
    uptimePercent: 96.5,
    serialNumber: 'ECG-12L-PORT-88',
    lastServicedDate: '2026-08-01',
    nextScheduledService: '2026-11-01',
  },
  {
    id: 'eq_chandanpur_bioanalyzer',
    facilityId: 'fac_phc_chandanpur',
    facilityName: 'Chandanpur Primary Health Centre',
    district: 'Sundargarh',
    tier: 'phc',
    name: 'Semi-Automated Clinical Biochemistry Analyzer',
    category: 'laboratory',
    status: 'maintenance_needed',
    uptimePercent: 88.2,
    serialNumber: 'BIO-SA-500-22',
    lastServicedDate: '2026-06-10',
    nextScheduledService: '2026-09-15',
    reportedIssue: 'Photometer optical lamp calibration drift detected (>5% variance)',
    technicianContact: 'District BioMed Cell (+91 6622 250100)',
  },

  // Rampur Sub-Centre
  {
    id: 'eq_rampur_hemoglobin',
    facilityId: 'fac_sub_rampur',
    facilityName: 'Rampur Health Sub-Centre (HWC)',
    district: 'Sundargarh',
    tier: 'sub_centre',
    name: 'Digital Hemoglobinometer (TrueHb Photometric)',
    category: 'point_of_care',
    status: 'breakdown', // DOWN EQUIPMENT
    uptimePercent: 42.0,
    serialNumber: 'HB-DIG-THB-310',
    lastServicedDate: '2026-05-18',
    reportedIssue: 'Optical sensor error E-04; battery leakage. Frontline antenatal anemia tests stalled.',
    technicianContact: 'Nodal CHC BioMed Desk',
  },
  {
    id: 'eq_rampur_glucometer',
    facilityId: 'fac_sub_rampur',
    facilityName: 'Rampur Health Sub-Centre (HWC)',
    district: 'Sundargarh',
    tier: 'sub_centre',
    name: 'Point-of-Care Blood Glucose Meter',
    category: 'point_of_care',
    status: 'operational',
    uptimePercent: 97.0,
    serialNumber: 'GLUC-POC-901',
    lastServicedDate: '2026-08-10',
  },
  {
    id: 'eq_rampur_vaccine_carrier',
    facilityId: 'fac_sub_rampur',
    facilityName: 'Rampur Health Sub-Centre (HWC)',
    district: 'Sundargarh',
    tier: 'sub_centre',
    name: 'Cold-Chain Vaccine Carrier (WHO PQS Certified)',
    category: 'cold_chain',
    status: 'operational',
    uptimePercent: 100.0,
    serialNumber: 'VCC-WHO-44L',
    lastServicedDate: '2026-08-01',
  },

  // Bargaon PHC
  {
    id: 'eq_bargaon_ilr',
    facilityId: 'fac_phc_bargaon',
    facilityName: 'Bargaon Primary Health Centre',
    district: 'Sundargarh',
    tier: 'phc',
    name: 'Solar Direct Drive Vaccine Refrigerator (ILR)',
    category: 'cold_chain',
    status: 'operational',
    uptimePercent: 99.8,
    serialNumber: 'ILR-SDD-2023-8821',
    lastServicedDate: '2026-07-28',
    technicianContact: 'BioMed Eng. S. Mohapatra (+91 94371 00214)',
  },
  {
    id: 'eq_bargaon_ultrasound',
    facilityId: 'fac_phc_bargaon',
    facilityName: 'Bargaon Primary Health Centre',
    district: 'Sundargarh',
    tier: 'phc',
    name: 'Portable Obstetric Ultrasound Scanner (USG)',
    category: 'imaging',
    status: 'operational',
    uptimePercent: 96.2,
    serialNumber: 'USG-OBS-P40',
    lastServicedDate: '2026-08-20',
  },
  {
    id: 'eq_bargaon_warmer',
    facilityId: 'fac_phc_bargaon',
    facilityName: 'Bargaon Primary Health Centre',
    district: 'Sundargarh',
    tier: 'phc',
    name: 'Infant Radiant Baby Warmer (NBSU Care)',
    category: 'maternal_care',
    status: 'calibration_due',
    uptimePercent: 91.0,
    serialNumber: 'IRW-NBSU-12',
    lastServicedDate: '2026-04-12',
    nextScheduledService: '2026-09-12',
    reportedIssue: 'Annual skin probe temperature calibration overdue by 14 days',
  },

  // Koira Sub-Centre
  {
    id: 'eq_koira_hemoglobin',
    facilityId: 'fac_sub_koira',
    facilityName: 'Koira Health Sub-Centre (HWC)',
    district: 'Sundargarh',
    tier: 'sub_centre',
    name: 'Digital Hemoglobinometer (TrueHb Photometric)',
    category: 'point_of_care',
    status: 'operational',
    uptimePercent: 98.4,
    serialNumber: 'HB-DIG-THB-512',
    lastServicedDate: '2026-08-15',
  },
  {
    id: 'eq_koira_fetal_doppler',
    facilityId: 'fac_sub_koira',
    facilityName: 'Koira Health Sub-Centre (HWC)',
    district: 'Sundargarh',
    tier: 'sub_centre',
    name: 'Handheld Pocket Fetal Heart Doppler',
    category: 'maternal_care',
    status: 'breakdown', // DOWN EQUIPMENT
    uptimePercent: 54.0,
    serialNumber: 'FHD-PKT-091',
    lastServicedDate: '2026-03-22',
    reportedIssue: 'Speaker amplifier broken; no acoustic output during antenatal auscultation',
    technicianContact: 'Koira Mobile Repair Unit',
  },

  // Lahunipara PHC
  {
    id: 'eq_lahunipara_microscope',
    facilityId: 'fac_phc_lahunipara',
    facilityName: 'Lahunipara Primary Health Centre',
    district: 'Sundargarh',
    tier: 'phc',
    name: 'Binocular Diagnostic Microscope (Malaria & Sputum)',
    category: 'laboratory',
    status: 'operational',
    uptimePercent: 97.5,
    serialNumber: 'MIC-BIN-088',
    lastServicedDate: '2026-07-15',
  },
  {
    id: 'eq_lahunipara_ilr',
    facilityId: 'fac_phc_lahunipara',
    facilityName: 'Lahunipara Primary Health Centre',
    district: 'Sundargarh',
    tier: 'phc',
    name: 'Solar Direct Drive Vaccine Refrigerator (ILR)',
    category: 'cold_chain',
    status: 'maintenance_needed',
    uptimePercent: 82.0,
    serialNumber: 'ILR-SDD-2022-7719',
    lastServicedDate: '2026-06-05',
    reportedIssue: 'Battery backup inverter fan vibrating; chamber temp elevated to +7.2°C (safe range +2°C to +8°C)',
    technicianContact: 'BioMed Eng. S. Mohapatra (+91 94371 00214)',
  },

  // Bonai Sub-Centre
  {
    id: 'eq_bonai_glucometer',
    facilityId: 'fac_sub_bonai',
    facilityName: 'Bonai Sub-Centre & Health Post',
    district: 'Sundargarh',
    tier: 'sub_centre',
    name: 'Point-of-Care Blood Glucose Meter',
    category: 'point_of_care',
    status: 'operational',
    uptimePercent: 99.0,
    serialNumber: 'GLUC-POC-112',
    lastServicedDate: '2026-08-25',
  },
  {
    id: 'eq_bonai_hemoglobin',
    facilityId: 'fac_sub_bonai',
    facilityName: 'Bonai Sub-Centre & Health Post',
    district: 'Sundargarh',
    tier: 'sub_centre',
    name: 'Digital Hemoglobinometer (TrueHb Photometric)',
    category: 'point_of_care',
    status: 'operational',
    uptimePercent: 98.6,
    serialNumber: 'HB-DIG-THB-708',
    lastServicedDate: '2026-08-18',
  },
];

export const INITIAL_TRANSFERS: InventoryTransferRecord[] = [
  {
    id: 'TRF-2026-0901',
    transferNumber: 'TRF-2026-0901',
    sourceFacilityId: 'fac_phc_chandanpur',
    sourceFacilityName: 'Chandanpur Primary Health Centre',
    targetFacilityId: 'fac_sub_rampur',
    targetFacilityName: 'Rampur Health Sub-Centre (HWC)',
    district: 'Sundargarh',
    medicineId: 'med_paracetamol_500',
    medicineName: 'Paracetamol 500mg Tablets',
    quantity: 300,
    unit: 'tablets',
    reason: 'Pre-emptive fever clinic buffer replenishment',
    status: 'delivered',
    authorizedBy: 'Dr. K. Patnaik, District Medical Officer (DMO)',
    digitalSignature: 'DMO-AUTH-2026-A109',
    sourceStockBefore: 2800,
    sourceStockAfter: 2500,
    targetStockBefore: 50,
    targetStockAfter: 350,
    createdAt: '2026-09-08T10:30:00Z',
  },
  {
    id: 'TRF-2026-0902',
    transferNumber: 'TRF-2026-0902',
    sourceFacilityId: 'fac_phc_bargaon',
    sourceFacilityName: 'Bargaon Primary Health Centre',
    targetFacilityId: 'fac_sub_koira',
    targetFacilityName: 'Koira Health Sub-Centre (HWC)',
    district: 'Sundargarh',
    medicineId: 'med_ors',
    medicineName: 'ORS (Oral Rehydration Salts) Sachets',
    quantity: 150,
    unit: 'sachets',
    reason: 'Monsoon diarrheal vulnerability surge mitigation',
    status: 'in_transit',
    authorizedBy: 'Dr. K. Patnaik, District Medical Officer (DMO)',
    digitalSignature: 'DMO-AUTH-2026-B224',
    sourceStockBefore: 830,
    sourceStockAfter: 680,
    targetStockBefore: 10,
    targetStockAfter: 160,
    createdAt: '2026-09-09T14:15:00Z',
  },
];

// ============================================================================
// FIRESTORE REAL-TIME REPOSITORY & ATOMIC TRANSACTIONS
// ============================================================================

/**
 * Seed initial inventory, equipment, and transfer records into Firestore if absent.
 */
export async function seedDMODataToFirestoreIfEmpty(): Promise<void> {
  try {
    const invSnap = await getDocs(collection(db, 'facility_inventory'));
    if (invSnap.empty) {
      for (const item of INITIAL_INVENTORY_ITEMS) {
        await setDoc(doc(db, 'facility_inventory', item.id), {
          ...item,
          updatedAt: serverTimestamp(),
        });
      }
    }

    const eqSnap = await getDocs(collection(db, 'diagnostic_equipment'));
    if (eqSnap.empty) {
      for (const eq of INITIAL_DIAGNOSTIC_EQUIPMENT) {
        await setDoc(doc(db, 'diagnostic_equipment', eq.id), {
          ...eq,
          updatedAt: serverTimestamp(),
        });
      }
    }

    const trfSnap = await getDocs(collection(db, 'inventory_transfers'));
    if (trfSnap.empty) {
      for (const trf of INITIAL_TRANSFERS) {
        await setDoc(doc(db, 'inventory_transfers', trf.id), {
          ...trf,
          serverTimestamp: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    console.warn('Firestore initial seeding skipped or offline:', error);
  }
}

/**
 * Subscribe in real-time to essential medicine inventory across all lower-tier facilities
 */
export function subscribeFacilityInventory(
  onUpdate: (inventory: FacilityInventoryRecord[]) => void
): () => void {
  const collectionPath = 'facility_inventory';
  return onSnapshot(
    collection(db, collectionPath),
    (snapshot) => {
      if (snapshot.empty) {
        onUpdate(INITIAL_INVENTORY_ITEMS);
        return;
      }
      const records: FacilityInventoryRecord[] = [];
      snapshot.forEach((docSnap) => {
        records.push(docSnap.data() as FacilityInventoryRecord);
      });
      onUpdate(records);
    },
    (error) => {
      console.warn('Firestore inventory listener falling back to local dataset:', error);
      onUpdate(INITIAL_INVENTORY_ITEMS);
    }
  );
}

/**
 * Subscribe in real-time to diagnostic equipment status
 */
export function subscribeDiagnosticEquipment(
  onUpdate: (equipment: DiagnosticEquipmentRecord[]) => void
): () => void {
  const collectionPath = 'diagnostic_equipment';
  return onSnapshot(
    collection(db, collectionPath),
    (snapshot) => {
      if (snapshot.empty) {
        onUpdate(INITIAL_DIAGNOSTIC_EQUIPMENT);
        return;
      }
      const records: DiagnosticEquipmentRecord[] = [];
      snapshot.forEach((docSnap) => {
        records.push(docSnap.data() as DiagnosticEquipmentRecord);
      });
      onUpdate(records);
    },
    (error) => {
      console.warn('Firestore equipment listener falling back to local dataset:', error);
      onUpdate(INITIAL_DIAGNOSTIC_EQUIPMENT);
    }
  );
}

/**
 * Subscribe in real-time to DMO Resource Re-routing transfers ledger
 */
export function subscribeInventoryTransfers(
  onUpdate: (transfers: InventoryTransferRecord[]) => void
): () => void {
  const collectionPath = 'inventory_transfers';
  return onSnapshot(
    collection(db, collectionPath),
    (snapshot) => {
      if (snapshot.empty) {
        onUpdate(INITIAL_TRANSFERS);
        return;
      }
      const records: InventoryTransferRecord[] = [];
      snapshot.forEach((docSnap) => {
        records.push(docSnap.data() as InventoryTransferRecord);
      });
      // Sort newest first
      records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(records);
    },
    (error) => {
      console.warn('Firestore transfers listener falling back to local dataset:', error);
      onUpdate(INITIAL_TRANSFERS);
    }
  );
}

// ============================================================================
// ATOMIC RESOURCE RE-ROUTING TRANSACTION
// ============================================================================

export interface AtomicRerouteParams {
  sourceFacilityId: string;
  sourceFacilityName: string;
  targetFacilityId: string;
  targetFacilityName: string;
  medicineId: string;
  medicineName: string;
  quantity: number;
  unit: string;
  reason: string;
  dmoOfficerName: string;
  district?: string;
}

/**
 * Executes a single atomic Firestore transaction to transfer inventory
 * from a surplus facility to a deficit facility.
 *
 * Atomically:
 * 1. Reads source facility inventory and verifies surplus >= quantity
 * 2. Reads target facility inventory
 * 3. Decrements source facility stock
 * 4. Increments target facility stock
 * 5. Writes an immutable audit transfer ledger record into `inventory_transfers`
 */
export async function executeAtomicResourceReroute(
  params: AtomicRerouteParams
): Promise<{ success: boolean; transfer?: InventoryTransferRecord; error?: string }> {
  const {
    sourceFacilityId,
    sourceFacilityName,
    targetFacilityId,
    targetFacilityName,
    medicineId,
    medicineName,
    quantity,
    unit,
    reason,
    dmoOfficerName,
    district = 'Sundargarh',
  } = params;

  if (sourceFacilityId === targetFacilityId) {
    return { success: false, error: 'Source and target facility cannot be identical.' };
  }

  if (quantity <= 0) {
    return { success: false, error: 'Re-routing quantity must be greater than zero.' };
  }

  const sourceDocId = `${sourceFacilityId}_${medicineId}`;
  const targetDocId = `${targetFacilityId}_${medicineId}`;
  const sourceDocRef = doc(db, 'facility_inventory', sourceDocId);
  const targetDocRef = doc(db, 'facility_inventory', targetDocId);

  const transferNumber = `TRF-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const transferDocRef = doc(db, 'inventory_transfers', transferNumber);

  try {
    const executedTransfer = await runTransaction(db, async (transaction) => {
      // Step 1: Read source inventory
      const sourceSnap = await transaction.get(sourceDocRef);
      let sourceStock = 0;
      let sourceThreshold = 100;
      let sourceCategory: FacilityInventoryRecord['category'] = 'essential';

      if (sourceSnap.exists()) {
        const sourceData = sourceSnap.data() as Partial<FacilityInventoryRecord>;
        sourceStock = Number(sourceData.currentStock) || 0;
        sourceThreshold = Number(sourceData.minThreshold) || 100;
        sourceCategory = sourceData.category || 'essential';
      } else {
        // Fallback to local item if firestore document not yet created
        const localItem = INITIAL_INVENTORY_ITEMS.find((i) => i.id === sourceDocId);
        if (localItem) {
          sourceStock = localItem.currentStock;
          sourceThreshold = localItem.minThreshold;
          sourceCategory = localItem.category;
        } else {
          throw new Error(`Inventory item for source facility ${sourceFacilityName} not found.`);
        }
      }

      if (sourceStock < quantity) {
        throw new Error(
          `Insufficient stock at surplus facility: Available stock is ${sourceStock} ${unit}, requested transfer is ${quantity} ${unit}.`
        );
      }

      // Step 2: Read target inventory
      const targetSnap = await transaction.get(targetDocRef);
      let targetStock = 0;
      let targetThreshold = 100;
      let targetCategory: FacilityInventoryRecord['category'] = 'essential';

      if (targetSnap.exists()) {
        const targetData = targetSnap.data() as Partial<FacilityInventoryRecord>;
        targetStock = Number(targetData.currentStock) || 0;
        targetThreshold = Number(targetData.minThreshold) || 100;
        targetCategory = targetData.category || 'essential';
      } else {
        const localItem = INITIAL_INVENTORY_ITEMS.find((i) => i.id === targetDocId);
        if (localItem) {
          targetStock = localItem.currentStock;
          targetThreshold = localItem.minThreshold;
          targetCategory = localItem.category;
        }
      }

      // Step 3: Compute post-transfer stock & status
      const newSourceStock = sourceStock - quantity;
      const newTargetStock = targetStock + quantity;

      const newSourceStatus: FacilityInventoryRecord['status'] =
        newSourceStock <= 0
          ? 'stockout'
          : newSourceStock <= sourceThreshold
          ? 'low'
          : 'optimal';

      const newTargetStatus: FacilityInventoryRecord['status'] =
        newTargetStock <= 0
          ? 'stockout'
          : newTargetStock <= targetThreshold
          ? 'low'
          : 'optimal';

      const nowIso = new Date().toISOString();

      // Step 4: Atomically update source
      if (sourceSnap.exists()) {
        transaction.update(sourceDocRef, {
          currentStock: newSourceStock,
          status: newSourceStatus,
          lastUpdated: nowIso,
          updatedAt: serverTimestamp(),
        });
      } else {
        transaction.set(sourceDocRef, {
          id: sourceDocId,
          facilityId: sourceFacilityId,
          facilityName: sourceFacilityName,
          district,
          tier: sourceFacilityId.includes('phc') ? 'phc' : 'sub_centre',
          medicineId,
          medicineName,
          category: sourceCategory,
          currentStock: newSourceStock,
          minThreshold: sourceThreshold,
          unit,
          status: newSourceStatus,
          lastUpdated: nowIso,
          updatedAt: serverTimestamp(),
        });
      }

      // Step 5: Atomically update target
      if (targetSnap.exists()) {
        transaction.update(targetDocRef, {
          currentStock: newTargetStock,
          status: newTargetStatus,
          lastUpdated: nowIso,
          updatedAt: serverTimestamp(),
        });
      } else {
        transaction.set(targetDocRef, {
          id: targetDocId,
          facilityId: targetFacilityId,
          facilityName: targetFacilityName,
          district,
          tier: targetFacilityId.includes('phc') ? 'phc' : 'sub_centre',
          medicineId,
          medicineName,
          category: targetCategory,
          currentStock: newTargetStock,
          minThreshold: targetThreshold,
          unit,
          status: newTargetStatus,
          lastUpdated: nowIso,
          updatedAt: serverTimestamp(),
        });
      }

      // Step 6: Create atomic ledger record in inventory_transfers
      const digitalSignature = `DMO-SIG-${Date.now().toString(36).toUpperCase()}-${Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase()}`;

      const transferRecord: InventoryTransferRecord = {
        id: transferNumber,
        transferNumber,
        sourceFacilityId,
        sourceFacilityName,
        targetFacilityId,
        targetFacilityName,
        district,
        medicineId,
        medicineName,
        quantity,
        unit,
        reason,
        status: 'approved',
        authorizedBy: dmoOfficerName,
        digitalSignature,
        sourceStockBefore: sourceStock,
        sourceStockAfter: newSourceStock,
        targetStockBefore: targetStock,
        targetStockAfter: newTargetStock,
        createdAt: nowIso,
      };

      transaction.set(transferDocRef, {
        ...transferRecord,
        serverTimestamp: serverTimestamp(),
      });

      return transferRecord;
    });

    return { success: true, transfer: executedTransfer };
  } catch (error) {
    console.error('Atomic re-route transaction error:', error);
    try {
      handleFirestoreError(error, OperationType.WRITE, `facility_inventory/${sourceDocId}`);
    } catch {
      // Logged
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Atomic Firestore transaction failed.',
    };
  }
}

/**
 * Update diagnostic equipment status (e.g., mark as serviced or report breakdown)
 */
export async function updateDiagnosticEquipmentStatus(
  equipmentId: string,
  newStatus: DiagnosticEquipmentRecord['status'],
  reportedIssue?: string
): Promise<boolean> {
  const docRef = doc(db, 'diagnostic_equipment', equipmentId);
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      await updateDoc(docRef, {
        status: newStatus,
        reportedIssue: reportedIssue ?? '',
        lastServicedDate: newStatus === 'operational' ? new Date().toISOString().split('T')[0] : snap.data()?.lastServicedDate,
        updatedAt: serverTimestamp(),
      });
    } else {
      // Fallback
      const localEq = INITIAL_DIAGNOSTIC_EQUIPMENT.find((e) => e.id === equipmentId);
      if (localEq) {
        await setDoc(docRef, {
          ...localEq,
          status: newStatus,
          reportedIssue: reportedIssue ?? '',
          updatedAt: serverTimestamp(),
        });
      }
    }
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `diagnostic_equipment/${equipmentId}`);
    return false;
  }
}
