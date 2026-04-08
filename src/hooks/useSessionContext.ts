import { useContext, createContext } from 'react';
import type { Session } from '@lib/types';
import type { Participant } from '@lib/types';

export interface SessionContextValue {
  session: Session | null;
  isHost: boolean;
  participants: Participant[];
  createSession: () => Promise<void>;
  joinSession: (pin: string) => Promise<void>;
  leaveSession: () => Promise<void>;
  loading: boolean;
  error: string | null;
  deviceId: string | null;
  deviceName: string;
  deviceColor: string;
}

export const SessionContext = createContext<SessionContextValue | null>(null);

export function useSessionContext(): SessionContextValue {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error('useSessionContext must be used within a SessionProvider');
  }

  return context;
}
