import type { ReactNode } from 'react';
import { useAuth } from '@hooks/useAuth';
import { AuthContext } from '@hooks/useAuthContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const authValue = useAuth();

  return (
    <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
  );
}
