import { useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth } from '@lib/firebase';
import { getUserProfile, createUserProfile } from '@lib/firebase/users';
import { AuthContext } from '@hooks/useAuth';
import type { UserProfile } from '@lib/types';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
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
          // Auto-create profile from Google account data
          const displayName = firebaseUser.displayName?.trim() || '';
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            displayName,
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL || null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          try {
            await createUserProfile(newProfile);
            setProfile(newProfile);
            // Only prompt for name if Google didn't provide one
            setNeedsProfile(!displayName);
          } catch {
            // Profile creation failed — treat as needing profile setup
            setNeedsProfile(true);
          }
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
      await signInWithPopup(auth, provider);
      // onAuthStateChanged handles profile lookup and creation
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

  const value = {
    user,
    profile,
    loading,
    needsProfile,
    signInWithGoogle,
    signOutUser,
    completeProfile,
    error,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}
