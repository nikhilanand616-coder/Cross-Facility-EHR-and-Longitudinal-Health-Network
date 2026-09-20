/**
 * Firestore Healthcare Facility Registry Types & Query Signatures
 * Collection: `facilities`
 */

export type FirestoreFacilityTier = 'sub_centre' | 'phc' | 'rural_hospital' | 'district_hospital';

export type FirestoreOperationalStatus = 'active' | 'offline' | 'over capacity';

export interface FirestoreInventorySummary {
  essentialDrugsStock: boolean;
  diagnosticLabAvailable: boolean;
}

export interface FirestoreActiveStaffCount {
  doctors: number;
  nurses: number;
  ashaWorkers: number;
}

export interface FirestoreCoordinates {
  latitude: number;
  longitude: number;
}

/**
 * Exact Firestore Document Schema for `/facilities/{facilityId}`
 */
export interface FirestoreFacilityDocument {
  facilityId: string;
  name: string;
  tier: FirestoreFacilityTier;
  state: string;
  district: string;
  pincode: string;
  coordinates: FirestoreCoordinates; // Stored as admin.firestore.GeoPoint in DB
  operationalStatus: FirestoreOperationalStatus;
  inventorySummary: FirestoreInventorySummary;
  activeStaffCount: FirestoreActiveStaffCount;
}

/**
 * Filter Parameters matching the Composite Query Index [state + district + tier]
 */
export interface FacilityFilterQuery {
  state: string;
  district: string;
  tier: FirestoreFacilityTier;
  operationalStatus?: FirestoreOperationalStatus;
}
