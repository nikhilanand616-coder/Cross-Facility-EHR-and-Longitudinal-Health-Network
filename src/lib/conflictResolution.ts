import { ConflictResolutionStrategy, ConflictItem } from '../types';

/**
 * Detect fields that differ between local offline version and central server version.
 */
export function detectFieldConflicts(
  localObj: Record<string, any>,
  serverObj: Record<string, any>
): string[] {
  if (!localObj || !serverObj) return [];
  const conflictingKeys = new Set<string>();

  const ignoredKeys = new Set([
    'id',
    'syncStatus',
    'createdOffline',
    'syncedAt',
    'lastModifiedServerTime',
    'version',
    'offlineQueueStatus',
  ]);

  const allKeys = Array.from(new Set([...Object.keys(localObj), ...Object.keys(serverObj)]));

  for (const key of allKeys) {
    if (ignoredKeys.has(key)) continue;

    const localVal = localObj[key];
    const serverVal = serverObj[key];

    if (localVal === undefined || serverVal === undefined) {
      conflictingKeys.add(key);
      continue;
    }

    if (typeof localVal === 'object' && localVal !== null && typeof serverVal === 'object' && serverVal !== null) {
      if (JSON.stringify(localVal) !== JSON.stringify(serverVal)) {
        conflictingKeys.add(key);
      }
    } else if (localVal !== serverVal) {
      conflictingKeys.add(key);
    }
  }

  return Array.from(conflictingKeys);
}

/**
 * Strategy 1: Last-Write-Wins (LWW)
 * Compares client and server timestamps. The record with the most recent timestamp wins entirely.
 */
export function resolveLastWriteWins(
  localObj: Record<string, any>,
  serverObj: Record<string, any>
): { resolvedRecord: Record<string, any>; winner: 'local' | 'server'; explanation: string } {
  const localTime = new Date(
    localObj.updatedAt || localObj.createdOfflineAt || localObj.orderedDate || localObj.initiatedDate || 0
  ).getTime();

  const serverTime = new Date(
    serverObj.updatedAt || serverObj.lastModifiedServerTime || serverObj.orderedDate || serverObj.initiatedDate || 0
  ).getTime();

  if (localTime >= serverTime) {
    return {
      resolvedRecord: { ...serverObj, ...localObj, syncStatus: 'synced', version: (serverObj.version || 1) + 1 },
      winner: 'local',
      explanation: `Local offline record timestamp (${new Date(localTime).toLocaleTimeString()}) is newer than server timestamp (${new Date(serverTime).toLocaleTimeString()}). Local offline changes applied.`,
    };
  }

  return {
    resolvedRecord: { ...localObj, ...serverObj, syncStatus: 'synced' },
    winner: 'server',
    explanation: `Central server record timestamp (${new Date(serverTime).toLocaleTimeString()}) is newer than local offline timestamp (${new Date(localTime).toLocaleTimeString()}). Central cloud record preserved.`,
  };
}

/**
 * Strategy 2: Clinical Authority (Server-Wins)
 * Server verified specialist decisions, confirmed diagnoses, and lab results take precedence over field estimations.
 */
export function resolveClinicalAuthority(
  localObj: Record<string, any>,
  serverObj: Record<string, any>
): { resolvedRecord: Record<string, any>; winner: 'server' | 'hybrid'; explanation: string } {
  const merged = { ...serverObj };

  // If local has acute field vitals or field worker comments that don't contradict, preserve them in a note
  if (localObj.vitals && !serverObj.vitals) {
    merged.vitals = localObj.vitals;
  }
  if (localObj.notes && localObj.notes !== serverObj.notes) {
    merged.fieldNotesAppended = localObj.notes;
  }

  merged.syncStatus = 'synced';
  merged.version = (serverObj.version || 1) + 1;

  return {
    resolvedRecord: merged,
    winner: 'server',
    explanation:
      'Central facility verified clinical diagnosis and physician orders retained as authoritative. Field notes appended without overwriting verified clinical state.',
  };
}

/**
 * Strategy 3: Frontline Client Priority (Field-Wins)
 * Acute frontline emergency vitals, point-of-care test readings, and field triage urgency take precedence.
 */
export function resolveFrontlinePriority(
  localObj: Record<string, any>,
  serverObj: Record<string, any>
): { resolvedRecord: Record<string, any>; winner: 'local'; explanation: string } {
  const resolved = {
    ...serverObj,
    ...localObj,
    syncStatus: 'synced',
    version: (serverObj.version || 1) + 1,
    overriddenByFrontline: true,
  };

  return {
    resolvedRecord: resolved,
    winner: 'local',
    explanation:
      'Frontline bedside examination data prioritized over older facility records to safeguard immediate patient safety and acute triage status.',
  };
}

/**
 * Strategy 4: Intelligent Three-Way / Field-Level Merge
 * Non-conflicting fields are combined. Collections (allergies, conditions) are unioned.
 * Vitals are updated if local is more recent.
 */
export function resolveThreeWayFieldMerge(
  localObj: Record<string, any>,
  serverObj: Record<string, any>
): { resolvedRecord: Record<string, any>; winner: 'merged'; explanation: string } {
  const merged: Record<string, any> = { ...serverObj, ...localObj };

  // 1. Array Union for Allergies
  if (Array.isArray(localObj.allergies) || Array.isArray(serverObj.allergies)) {
    const localAllergies = Array.isArray(localObj.allergies) ? localObj.allergies : [];
    const serverAllergies = Array.isArray(serverObj.allergies) ? serverObj.allergies : [];
    merged.allergies = Array.from(new Set([...serverAllergies, ...localAllergies]));
  }

  // 2. Array Union for Chronic Conditions
  if (Array.isArray(localObj.chronicConditions) || Array.isArray(serverObj.chronicConditions)) {
    const localCond = Array.isArray(localObj.chronicConditions) ? localObj.chronicConditions : [];
    const serverCond = Array.isArray(serverObj.chronicConditions) ? serverObj.chronicConditions : [];
    merged.chronicConditions = Array.from(new Set([...serverCond, ...localCond]));
  }

  // 3. Vitals: Take newest physiological reading
  if (localObj.vitals && serverObj.vitals) {
    const localVitalsTime = new Date(localObj.vitals.timestamp || localObj.updatedAt || 0).getTime();
    const serverVitalsTime = new Date(serverObj.vitals.timestamp || serverObj.updatedAt || 0).getTime();
    merged.vitals = localVitalsTime >= serverVitalsTime ? localObj.vitals : serverObj.vitals;
  } else if (localObj.vitals) {
    merged.vitals = localObj.vitals;
  }

  // 4. Contact & Demographic reconciliation: preserve valid emergency contacts
  if (localObj.emergencyContact && serverObj.emergencyContact) {
    merged.emergencyContact = {
      ...serverObj.emergencyContact,
      ...localObj.emergencyContact,
    };
  }

  merged.syncStatus = 'synced';
  merged.version = (serverObj.version || 1) + 1;
  merged.lastMergedAt = new Date().toISOString();

  return {
    resolvedRecord: merged,
    winner: 'merged',
    explanation:
      'Harmonious field-level merge: unioned allergies and chronic conditions, resolved vitals by newest timestamp, and unified contact records without data loss.',
  };
}

/**
 * Execute chosen conflict strategy and return resolved record.
 */
export function applyConflictStrategy(
  strategy: ConflictResolutionStrategy,
  localObj: Record<string, any>,
  serverObj: Record<string, any>
): { resolvedRecord: Record<string, any>; explanation: string } {
  switch (strategy) {
    case 'server_clinical_authority':
      return resolveClinicalAuthority(localObj, serverObj);
    case 'frontline_client_priority':
      return resolveFrontlinePriority(localObj, serverObj);
    case 'three_way_merge':
      return resolveThreeWayFieldMerge(localObj, serverObj);
    case 'last_write_wins':
    default:
      return resolveLastWriteWins(localObj, serverObj);
  }
}
