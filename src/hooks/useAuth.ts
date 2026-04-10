import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth } from '@lib/firebase';
import { getUserProfile, createUserProfile } from '@lib/firebase/users';
import type { UserProfile } from '@lib/types';

export interface UseAuthReturn {
  /** The Firebase Auth user (null when signed out) */
  user: User | null;
  /** The Firestore user profile (null when no profile exists yet) */
  profile: UserProfile | null;
  /** Whether auth state is still being determined */
  loading: boolean;
  /** Whether the user needs to complete their profile (first sign-in) */
  needsProfile: boolean;
  /** Sign in with Google */
  signInWithGoogle: () => Promise<void>;
  /** Sign out */
  signOutUser: () => Promise<void>;
  /** Complete profile setup (called after display name entry) */
  completeProfile: (displayName: string) => Promise<void>;
  /** Auth error message */
  error: string | null;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  // If auth is not available, skip loading entirely
  const [loading, setLoading] = useState(() => !!auth);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Listen for auth state changes
  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && !firebaseUser.isAnonymous) {
        setUser(firebaseUser);

        // Check if user profile exists
        const existingProfile = await getUserProfile(firebaseUser.uid);
        if (existingProfile) {
          setProfile(existingProfile);
          setNeedsProfile(false);
        } else {
          setNeedsProfile(true);
        }
      } else {
        setUser(null);
        setProfile(null);
        setNeedsProfile(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!auth) {
      setError('Authentication is not available.');
      return;
    }

    setError(null);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      // Check for existing profile
      const existingProfile = await getUserProfile(firebaseUser.uid);
      if (existingProfile) {
        setProfile(existingProfile);
        setNeedsProfile(false);
      } else {
        setNeedsProfile(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-in failed.';
      // Don't show error for user-cancelled popup
      if (message.includes('popup-closed-by-user')) return;
      setError(message);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    if (!auth) return;

    try {
      await signOut(auth);
      setUser(null);
      setProfile(null);
      setNeedsProfile(false);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-out failed.';
      setError(message);
    }
  }, []);

  const completeProfile = useCallback(
    async (displayName: string) => {
      if (!user) return;

      setError(null);

      try {
        const newProfile: UserProfile = {
          uid: user.uid,
          displayName: displayName.trim(),
          email: user.email || '',
          photoURL: user.photoURL || null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        await createUserProfile(newProfile);
        setProfile(newProfile);
        setNeedsProfile(false);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to create profile.';
        setError(message);
      }
    },
    [user],
  );

  const result: UseAuthReturn = useMemo(
    () => ({
      user,
      profile,
      loading,
      needsProfile,
      signInWithGoogle,
      signOutUser,
      completeProfile,
      error,
    }),
    [
      user,
      profile,
      loading,
      needsProfile,
      signInWithGoogle,
      signOutUser,
      completeProfile,
      error,
    ],
  );

  return result;
}
