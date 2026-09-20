import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  onSnapshot,
  serverTimestamp,
  enableNetwork,
  disableNetwork,
  writeBatch,
  Firestore,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { SyncQueueItem } from '../types';

// Enums and error tracking matching Firebase integration guidelines
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

// 1. Initialize Firebase App and Firestore with persistentMultipleTabManager offline cache
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);

/**
 * Configure Firestore with persistentLocalCache and persistentMultipleTabManager
 * for seamless web client offline persistence across tabs and reloads.
 */
let firestoreDb: Firestore;
try {
  firestoreDb = initializeFirestore(
    app,
    {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    },
    firebaseConfig.firestoreDatabaseId
  );
} catch (e) {
  console.warn('Firestore already initialized, retrieving existing instance:', e);
  // In dev / HMR environments if already initialized
  firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

export const db = firestoreDb;

/**
 * Standardized Firestore error handler adhering to Firebase guidelines
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Toggle Firestore network connection to simulate offline field work or sync upon reconnect
 */
export async function setFirestoreNetworkOnline(online: boolean): Promise<void> {
  try {
    if (online) {
      await enableNetwork(db);
    } else {
      await disableNetwork(db);
    }
  } catch (err) {
    console.warn(`Error toggling Firestore network (online=${online}):`, err);
  }
}

/**
 * Auto-sync optimistic UI queue items to Firestore with server timestamps.
 * Handles concurrent updates by applying authoritative server timestamps (request.time / serverTimestamp())
 * and merging document mutations.
 */
export async function syncQueueItemToFirestore(item: SyncQueueItem): Promise<boolean> {
  const path = `${item.collection}/${item.id}`;
  try {
    const docRef = doc(db, item.collection, item.id);
    const payload = {
      ...item.data,
      id: item.id,
      syncedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastModifiedServerTime: serverTimestamp(),
      createdOffline: item.data?.createdOffline ?? true,
      offlineQueueStatus: 'synced',
    };

    // Use merge: true to gracefully reconcile concurrent mutations from multiple field workers
    await setDoc(docRef, payload, { merge: true });
    return true;
  } catch (error) {
    console.error(`Failed to sync queued item ${item.id} to Firestore:`, error);
    return false;
  }
}

/**
 * Batch synchronization helper for all pending optimistic queue items
 */
export async function syncBatchQueueToFirestore(
  queue: SyncQueueItem[]
): Promise<{ successCount: number; failedIds: string[] }> {
  if (!queue || queue.length === 0) {
    return { successCount: 0, failedIds: [] };
  }

  let successCount = 0;
  const failedIds: string[] = [];

  for (const item of queue) {
    const ok = await syncQueueItemToFirestore(item);
    if (ok) {
      successCount++;
    } else {
      failedIds.push(item.id);
    }
  }

  return { successCount, failedIds };
}
