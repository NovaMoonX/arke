import { useState, useEffect, useCallback } from 'react';
import { logger } from '@utils/logger';

export interface NetworkStatus {
  /** Whether the browser currently reports an active connection. */
  online: boolean;
  /** Timestamp of the most recent status change, or null if unchanged. */
  lastChanged: number | null;
}

/**
 * Monitors the browser's online / offline state and exposes it reactively.
 */
export function useNetworkStatus(): NetworkStatus {
  const [online, setOnline] = useState(navigator.onLine);
  const [lastChanged, setLastChanged] = useState<number | null>(null);

  const handleOnline = useCallback(() => {
    logger.info('Network', 'Connection restored');
    setOnline(true);
    setLastChanged(Date.now());
  }, []);

  const handleOffline = useCallback(() => {
    logger.warn('Network', 'Connection lost');
    setOnline(false);
    setLastChanged(Date.now());
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  const result: NetworkStatus = { online, lastChanged };
  return result;
}
