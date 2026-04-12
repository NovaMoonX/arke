import { useContext, createContext } from 'react';
import type { User } from 'firebase/auth';
import type { UserProfile } from '@lib/types';

export interface AuthContextValue {
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

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
