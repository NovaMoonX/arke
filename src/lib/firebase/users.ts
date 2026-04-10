import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { firestore } from '@lib/firebase';
import type { UserProfile } from '@lib/types';

/**
 * Fetch a user profile from Firestore by UID.
 */
export async function getUserProfile(
  uid: string,
): Promise<UserProfile | null> {
  if (!firestore) return null;

  try {
    const docRef = doc(firestore, 'users', uid);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) return null;

    const data = snapshot.data() as UserProfile;
    return data;
  } catch {
    return null;
  }
}

/**
 * Create or overwrite a user profile in Firestore.
 */
export async function createUserProfile(
  profile: UserProfile,
): Promise<void> {
  if (!firestore) return;

  const docRef = doc(firestore, 'users', profile.uid);
  await setDoc(docRef, {
    ...profile,
    createdAt: profile.createdAt || Date.now(),
    updatedAt: Date.now(),
  });
}

/**
 * Update specific fields on a user profile.
 */
export async function updateUserProfile(
  uid: string,
  updates: Partial<Pick<UserProfile, 'displayName' | 'photoURL'>>,
): Promise<void> {
  if (!firestore) return;

  const docRef = doc(firestore, 'users', uid);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}
