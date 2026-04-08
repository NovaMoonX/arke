import { useState, useEffect, useCallback, useMemo } from 'react';
import { goOnline, goOffline } from 'firebase/database';
import { database } from '@lib/firebase';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { logger } from '@utils/logger';

export type ReconnectStatus = 'connected' | 'disconnected' | 'reconnecting';

export interface AutoReconnect {
  /** Current connection status. */
  status: ReconnectStatus;
  /** Whether the device has network access. */
  online: boolean;
}

/**
 * Detects network interruptions and automatically reconnects Firebase RTDB
 * when the browser regains connectivity.
 *
 * Uses the browser 'online' event (fired only on offline→online transitions)
 * to trigger a Firebase reconnect cycle.
 */
export function useAutoReconnect(): AutoReconnect {
  const { online } = useNetworkStatus();
  const [reconnecting, setReconnecting] = useState(false);

  const reconnect = useCallback(() => {
    if (!database) return;
    logger.info('Reconnect', 'Reconnecting to Firebase…');
    setReconnecting(true);

    goOffline(database);
    goOnline(database);

    setTimeout(() => {
      setReconnecting(false);
      logger.info('Reconnect', 'Reconnected');
    }, 1500);
  }, []);

  // Listen for the browser 'online' event — it only fires on actual
  // offline→online transitions, so this is effectively the "was offline" guard.
  useEffect(() => {
    const handler = () => {
      reconnect();
    };
    window.addEventListener('online', handler);
    return () => window.removeEventListener('online', handler);
  }, [reconnect]);

  const status: ReconnectStatus = useMemo(() => {
    if (reconnecting) return 'reconnecting';
    if (!online) return 'disconnected';
    return 'connected';
  }, [online, reconnecting]);

  const result: AutoReconnect = { status, online };
  return result;
}
