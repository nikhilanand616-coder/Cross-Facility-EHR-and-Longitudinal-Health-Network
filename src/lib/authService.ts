import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';

export type RbacRole = 'Patient' | 'FrontlineWorker' | 'MedicalOfficer' | 'Admin';

export interface UserProfileDoc {
  id: string;
  email: string;
  name: string;
  role: RbacRole;
  assignedFacilityId?: string;
  designatedDistrict?: string;
  patientId?: string;
  phone?: string;
  createdAt?: any;
  updatedAt?: any;
}

export const DEMO_RBAC_ACCOUNTS: Record<
  'Patient' | 'FrontlineWorker' | 'MedicalOfficer',
  {
    role: RbacRole;
    name: string;
    email: string;
    assignedFacilityId?: string;
    designatedDistrict?: string;
    badge: string;
    description: string;
  }
> = {
  Patient: {
    role: 'Patient',
    name: 'Savitri Devi (Rural Citizen)',
    email: 'patient.savitri@aarogyaconnect.in',
    assignedFacilityId: undefined,
    designatedDistrict: 'Sundargarh',
    badge: 'Patient (Self-Access Only)',
    description: 'Restricted strictly to personal longitudinal records, appointments, and triage summaries.',
  },
  FrontlineWorker: {
    role: 'FrontlineWorker',
    name: 'Sunita Tirkey (ASHA / ANM)',
    email: 'asha.sunita@aarogyaconnect.in',
    assignedFacilityId: 'FAC-MH-PUN-001',
    designatedDistrict: 'Sundargarh',
    badge: 'Frontline Worker (Assigned Node)',
    description: 'Authorized to triage patients and update inventory strictly at Nuagaon Sub-Centre (FAC-MH-PUN-001).',
  },
  MedicalOfficer: {
    role: 'MedicalOfficer',
    name: 'Dr. Alok Mohanty (District Medical Officer)',
    email: 'dmo.mohanty@aarogyaconnect.in',
    assignedFacilityId: undefined,
    designatedDistrict: 'Sundargarh',
    badge: 'Medical Officer (District-Wide)',
    description: 'Full administrative read/write authority across all facilities in Sundargarh district.',
  },
};

/**
 * Fetch user profile from Firestore /users/{uid}
 */
export async function getUserProfile(uid: string): Promise<UserProfileDoc | null> {
  const path = `users/${uid}`;
  try {
    const userDocRef = doc(db, 'users', uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data() as UserProfileDoc;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return null;
  }
}

/**
 * Create or sync user profile with RBAC role, facility, and district
 */
export async function syncUserProfile(
  uid: string,
  email: string,
  name: string,
  role: RbacRole = 'Patient',
  assignedFacilityId?: string,
  designatedDistrict?: string
): Promise<UserProfileDoc> {
  const path = `users/${uid}`;
  try {
    const userDocRef = doc(db, 'users', uid);
    const existing = await getUserProfile(uid);

    const payload: UserProfileDoc = {
      id: uid,
      email: email || 'anonymous@aarogyaconnect.in',
      name: name || 'Public Healthcare User',
      role: existing?.role || role,
      assignedFacilityId: assignedFacilityId || existing?.assignedFacilityId || (role === 'FrontlineWorker' ? 'FAC-MH-PUN-001' : undefined),
      designatedDistrict: designatedDistrict || existing?.designatedDistrict || 'Sundargarh',
      patientId: uid,
      updatedAt: new Date().toISOString(),
    };

    if (!existing) {
      payload.createdAt = new Date().toISOString();
    }

    await setDoc(userDocRef, payload, { merge: true });
    return payload;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    throw err;
  }
}

/**
 * Sign in using Google OAuth Popup
 */
export async function signInWithGoogle(): Promise<User | null> {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await signInWithPopup(auth, provider);
    if (cred.user) {
      // Default new logins to Patient or MedicalOfficer if email matches admin
      const isSuperAdmin = cred.user.email === 'nikhilanand616@gmail.com';
      await syncUserProfile(
        cred.user.uid,
        cred.user.email || '',
        cred.user.displayName || 'Healthcare Specialist',
        isSuperAdmin ? 'MedicalOfficer' : 'Patient',
        'FAC-MH-PUN-001',
        'Sundargarh'
      );
    }
    return cred.user;
  } catch (error) {
    console.error('Firebase Google Sign-In error:', error);
    throw error;
  }
}

/**
 * Sign out current user
 */
export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Set active RBAC profile for the currently logged in session (or simulated demo)
 */
export async function setActiveRbacRole(
  role: 'Patient' | 'FrontlineWorker' | 'MedicalOfficer',
  assignedFacilityId: string = 'FAC-MH-PUN-001',
  designatedDistrict: string = 'Sundargarh'
): Promise<UserProfileDoc> {
  const currentUid = auth.currentUser?.uid || `demo-user-${role.toLowerCase()}`;
  const config = DEMO_RBAC_ACCOUNTS[role];

  return await syncUserProfile(
    currentUid,
    config.email,
    config.name,
    role,
    role === 'FrontlineWorker' ? assignedFacilityId : undefined,
    designatedDistrict
  );
}

/**
 * Listen for auth state & active user profile
 */
export function onAuthAndProfileChanged(
  callback: (user: User | null, profile: UserProfileDoc | null) => void
) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      let profile = await getUserProfile(user.uid);
      if (!profile) {
        profile = await syncUserProfile(
          user.uid,
          user.email || '',
          user.displayName || 'Healthcare User',
          user.email === 'nikhilanand616@gmail.com' ? 'MedicalOfficer' : 'Patient',
          'FAC-MH-PUN-001',
          'Sundargarh'
        );
      }
      callback(user, profile);
    } else {
      callback(null, null);
    }
  });
}
