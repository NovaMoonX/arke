import { useContext, createContext } from 'react';
import type { UseAuthReturn } from '@hooks/useAuth';

export const AuthContext = createContext<UseAuthReturn | null>(null);

export function useAuthContext(): UseAuthReturn {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }

  return context;
}
