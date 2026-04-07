import type { ReactNode } from 'react';
import { useSession } from '@hooks/useSession';
import { SessionContext } from '@hooks/useSessionContext';

export function SessionProvider({ children }: { children: ReactNode }) {
  const sessionValue = useSession();

  return (
    <SessionContext.Provider value={sessionValue}>
      {children}
    </SessionContext.Provider>
  );
}
