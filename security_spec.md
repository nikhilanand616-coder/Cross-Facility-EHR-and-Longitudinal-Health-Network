# Security Specification: Multi-Role HealthTech RBAC Platform

## 1. Data Invariants & Access Control Policy
1. **Zero-Trust Identity**: Users are authenticated via Firebase Auth. Roles are retrieved from the trusted `/users/$(request.auth.uid)` document, never from untrusted client JWT claims.
2. **Role 1: 'Patient'**:
   - Strictly restricted to reading their own records (`resource.data.patientId == request.auth.uid` or `patientId == request.auth.uid`).
   - May only read their own user profile `/users/$(request.auth.uid)`.
   - Cannot read other patients' records, facility inventory, internal transfer ledgers, or audit logs.
   - Cannot write/create triage records or modify facility inventory.
3. **Role 2: 'FrontlineWorker' (ASHA/ANM)**:
   - Must have a non-empty `assignedFacilityId` in `/users/$(request.auth.uid)`.
   - Permitted to create clinical triage tickets (`/triage_tickets`) strictly where `incoming().facilityId == getUserFacilityId()`.
   - Permitted to update inventory stock and create stock logs strictly for their assigned facility node (`facilityId == getUserFacilityId()`).
   - Forbidden from modifying inventory or creating triage tickets for other facilities.
   - Forbidden from authorizing inter-facility resource transfers.
4. **Role 3: 'MedicalOfficer'**:
   - Must have a non-empty `designatedDistrict` in `/users/$(request.auth.uid)`.
   - Has broad read and write permissions across all facilities, facility inventories, diagnostic equipment, triage tickets, and inventory transfer ledgers matching their designated district (`district == getUserDistrict()`).
   - Permitted to authorize and execute inter-facility atomic inventory re-routing within their district.
5. **Privilege Escalation Prevention**:
   - Users cannot modify their own `role`, `assignedFacilityId`, or `designatedDistrict` once created.
   - Self-assignment of elevated roles ('FrontlineWorker' or 'MedicalOfficer') on initial registration is rejected unless verified by an Admin or default to 'Patient'.
6. **Master Deny**:
   - All unmatched collections and documents are denied by default (`match /{document=**} { allow read, write: if false; }`).

---

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Payload 1 (Patient Cross-Tenant Read)**:
   - *Attack*: Patient A (UID: `pat-001`) attempts `get()` on `/patients/pat-002` or queries `/patients` with no owner filter.
   - *Expected*: `PERMISSION_DENIED`.
2. **Payload 2 (Patient Unauthorized Triage Injection)**:
   - *Attack*: Patient attempts `create` on `/triage_tickets/tt-999` masquerading as a clinician.
   - *Expected*: `PERMISSION_DENIED` (only FrontlineWorker or MedicalOfficer can create triage tickets).
3. **Payload 3 (FrontlineWorker Facility Hopping Triage)**:
   - *Attack*: FrontlineWorker with assigned facility `FAC-PHC-001` attempts to create a triage ticket with `facilityId: "FAC-PHC-999"`.
   - *Expected*: `PERMISSION_DENIED` (facilityId must equal `getUserFacilityId()`).
4. **Payload 4 (FrontlineWorker Cross-Facility Inventory Tampering)**:
   - *Attack*: FrontlineWorker attempts to update stock at `/facility_inventory/INV-RURAL-002` where facility is not their assigned node.
   - *Expected*: `PERMISSION_DENIED`.
5. **Payload 5 (MedicalOfficer Cross-District Breach)**:
   - *Attack*: MedicalOfficer assigned to district `"Sundargarh"` attempts to modify `/facility_inventory/INV-PUN-001` situated in district `"Mayurbhanj"`.
   - *Expected*: `PERMISSION_DENIED` (district mismatch).
6. **Payload 6 (Privilege Escalation via Profile Update)**:
   - *Attack*: Patient sends update to `/users/pat-001` with `role: "MedicalOfficer"` or alters `assignedFacilityId`.
   - *Expected*: `PERMISSION_DENIED` (role and RBAC fields are immutable).
7. **Payload 7 (FrontlineWorker Unauthorized Transfer Authorization)**:
   - *Attack*: FrontlineWorker attempts to write to `/inventory_transfers/TR-001` to authorize drug reallocation.
   - *Expected*: `PERMISSION_DENIED` (only MedicalOfficers can authorize resource transfers).
8. **Payload 8 (Ghost Field / Shadow Update Attack)**:
   - *Attack*: FrontlineWorker attempts to inject an unexpected field (`isApprovedByMinistry: true`) into inventory document.
   - *Expected*: `PERMISSION_DENIED` (`affectedKeys().hasOnly(['currentStock', 'status', 'lastUpdated'])` blocks unlisted fields).
9. **Payload 9 (ID Poisoning Attack)**:
   - *Attack*: Attacker submits a document ID containing special path traversal characters `../../passwords` or exceeding 128 characters.
   - *Expected*: `PERMISSION_DENIED` (`isValidId()` regex guard fails).
10. **Payload 10 (Negative / Non-Numeric Inventory Poisoning)**:
    - *Attack*: User attempts to set `currentStock: -500` or `currentStock: "unlimited"`.
    - *Expected*: `PERMISSION_DENIED` (strict schema type and boundary validation).
11. **Payload 11 (Unauthenticated Scrape / Blanket List Attack)**:
    - *Attack*: Unauthenticated user or non-district actor attempts `list` on `/facility_inventory`.
    - *Expected*: `PERMISSION_DENIED` (query enforcer requires authenticated role and matching boundaries).
12. **Payload 12 (Immutable Transfer Record Tampering)**:
    - *Attack*: Modifying `sourceFacilityId`, `targetFacilityId`, or `quantity` on an already approved transfer.
    - *Expected*: `PERMISSION_DENIED` (only `status` transition allowed for in-flight transfers).
