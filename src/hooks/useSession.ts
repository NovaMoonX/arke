import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { customAlphabet } from 'nanoid';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import {
  ref,
  set,
  get,
  remove,
  onValue,
  onDisconnect,
  type Unsubscribe,
} from 'firebase/database';
import { auth, database } from '@lib/firebase';
import { SESSION_TTL } from '@lib/firebase/constants';
import { cleanupSessionMedia } from '@lib/firebase/storage';
import type { Session } from '@lib/types';
import type { Participant } from '@lib/types';
import { getDeviceIdentity } from '@utils/deviceIdentity';

const generatePin = customAlphabet('0123456789', 6);

interface UseSessionReturn {
  session: Session | null;
  isHost: boolean;
  participants: Participant[];
  createSession: () => Promise<void>;
  joinSession: (pin: string) => Promise<void>;
  leaveSession: () => Promise<void>;
  endSession: () => Promise<void>;
  loading: boolean;
  authenticating: boolean;
  error: string | null;
  deviceId: string | null;
  deviceName: string;
  deviceColor: string;
}

const EMPTY_IDENTITY = { name: '', color: '' };

export function useSession(): UseSessionReturn {
  const [session, setSession] = useState<Session | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [authenticating, setAuthenticating] = useState(true);

  const identity = useMemo(
    () => userId ? getDeviceIdentity(userId) : EMPTY_IDENTITY,
    [userId],
  );

  const unsubscribeRef = useRef<Unsubscribe | null>(null);
  const participantsUnsubRef = useRef<Unsubscribe | null>(null);
  const presenceUnsubRef = useRef<Unsubscribe | null>(null);
  const sessionPinRef = useRef<string | null>(null);

  // Authenticate — use existing Google user if present, otherwise sign in anonymously
  useEffect(() => {
    if (!auth) {
      setAuthenticating(false);
      return;
    }

    const firebaseAuth = auth;

    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      if (user) {
        setUserId(user.uid);
        setAuthenticating(false);
      } else {
        // No user at all — sign in anonymously for session features
        signInAnonymously(firebaseAuth).catch(() => {
          setTimeout(() => {
            signInAnonymously(firebaseAuth).catch(() => {
              setAuthenticating(false);
            });
          }, 1000);
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const cleanup = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    if (participantsUnsubRef.current) {
      participantsUnsubRef.current();
      participantsUnsubRef.current = null;
    }
    if (presenceUnsubRef.current) {
      presenceUnsubRef.current();
      presenceUnsubRef.current = null;
    }
    sessionPinRef.current = null;
  }, []);

  /**
   * Set up Firebase presence system for the current user in a session.
   * When the connection is restored after a disconnect, re-adds the
   * participant entry and re-establishes the onDisconnect handler.
   * This prevents the "0 devices" bug.
   */
  const setupPresence = useCallback(
    (pin: string, uid: string, deviceIdentity: { name: string; color: string }) => {
      if (!database) return;

      // Clean up previous presence listener
      if (presenceUnsubRef.current) {
        presenceUnsubRef.current();
        presenceUnsubRef.current = null;
      }

      const connectedRef = ref(database, '.info/connected');
      const participantRef = ref(database, `sessions/${pin}/participants/${uid}`);

      presenceUnsubRef.current = onValue(connectedRef, (snap) => {
        if (snap.val() !== true) return;

        // Re-add participant on reconnect
        const participantData = {
          deviceId: uid,
          joinedAt: Date.now(),
          name: deviceIdentity.name,
          color: deviceIdentity.color,
        };

        // First set onDisconnect, then write presence
        onDisconnect(participantRef).remove().then(() => {
          set(participantRef, participantData).catch(() => {});
        }).catch(() => {});
      });
    },
    [],
  );

  const subscribeToSession = useCallback(
    (pin: string) => {
      if (!database) return;

      const sessionRef = ref(database, `sessions/${pin}`);
      const participantsRef = ref(database, `sessions/${pin}/participants`);

      // Listen for session changes
      unsubscribeRef.current = onValue(
        sessionRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            const sessionData: Session = {
              id: pin,
              pin,
              participants: data.participants
                ? Object.keys(data.participants)
                : [],
              createdAt: data.createdAt,
              expiresAt: data.expiresAt,
            };
            setSession(sessionData);
          } else {
            // Session was deleted
            setSession(null);
            setIsHost(false);
            setParticipants([]);
            cleanup();
          }
        },
        (err) => {
          setError(`Session sync failed: ${err.message}`);
        },
      );

      // Listen for participant changes
      participantsUnsubRef.current = onValue(
        participantsRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            const participantList: Participant[] = Object.entries(data).map(
              ([id, value]) => {
                const participant = value as {
                  deviceId: string;
                  joinedAt: number;
                  name?: string;
                  color?: string;
                };
                return {
                  id,
                  deviceId: participant.deviceId,
                  joinedAt: participant.joinedAt,
                  name: participant.name,
                  color: participant.color,
                };
              },
            );
            setParticipants(participantList);
          } else {
            setParticipants([]);
          }
        },
        (err) => {
          setError(`Participant sync failed: ${err.message}`);
        },
      );

      sessionPinRef.current = pin;
    },
    [cleanup],
  );

  const createSession = useCallback(async () => {
    if (!database) {
      setError('Unable to reach database');
      return;
    }
    if (authenticating) {
      // Auth still in progress — silently wait; the caller can retry.
      return;
    }
    if (!userId) {
      setError('Not authenticated. Please try refreshing the page.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const pin = generatePin();
      const now = Date.now();
      const sessionRef = ref(database, `sessions/${pin}`);

      const sessionData = {
        createdAt: now,
        expiresAt: now + SESSION_TTL * 1000,
        hostId: userId,
        participants: {
          [userId]: {
            deviceId: userId,
            joinedAt: now,
            name: identity.name,
            color: identity.color,
          },
        },
      };

      await set(sessionRef, sessionData);

      // Set up presence monitoring (handles onDisconnect + reconnect)
      setupPresence(pin, userId, identity);

      setIsHost(true);
      subscribeToSession(pin);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to create session: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [userId, identity, subscribeToSession, authenticating, setupPresence]);

  const joinSession = useCallback(
    async (pin: string) => {
      if (!database) {
        setError('Unable to reach database');
        return;
      }
      if (authenticating) {
        // Auth still in progress — silently wait; the caller can retry.
        return;
      }
      if (!userId) {
        setError('Not authenticated. Please try refreshing the page.');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const sessionRef = ref(database, `sessions/${pin}`);
        const snapshot = await get(sessionRef);

        if (!snapshot.exists()) {
          setError('Session not found. Please check the PIN and try again.');
          return;
        }

        const data = snapshot.val();
        const now = Date.now();

        if (data.expiresAt && data.expiresAt < now) {
          setError('This session has expired.');
          return;
        }

        // Add participant
        const participantRef = ref(
          database,
          `sessions/${pin}/participants/${userId}`,
        );
        await set(participantRef, {
          deviceId: userId,
          joinedAt: now,
          name: identity.name,
          color: identity.color,
        });

        // Set up presence monitoring (handles onDisconnect + reconnect)
        setupPresence(pin, userId, identity);

        setIsHost(false);
        subscribeToSession(pin);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(`Failed to join session: ${message}`);
      } finally {
        setLoading(false);
      }
    },
    [userId, identity, subscribeToSession, authenticating, setupPresence],
  );

  const leaveSession = useCallback(async () => {
    if (!userId || !sessionPinRef.current || !database) return;

    const pin = sessionPinRef.current;

    try {
      // Remove this participant
      const participantRef = ref(
        database,
        `sessions/${pin}/participants/${userId}`,
      );
      await remove(participantRef);

      // If host, check if session should be cleaned up
      if (isHost) {
        const participantsRef = ref(
          database,
          `sessions/${pin}/participants`,
        );
        const snapshot = await get(participantsRef);

        if (!snapshot.exists() || Object.keys(snapshot.val()).length === 0) {
          // Last participant, clean up session
          const sessionRef = ref(database, `sessions/${pin}`);
          await remove(sessionRef);
        }
      }
    } catch {
      // Silently fail on cleanup
    }

    setSession(null);
    setIsHost(false);
    setParticipants([]);
    cleanup();
  }, [userId, isHost, cleanup]);

  /**
   * Host-only: end the session for everyone. Removes the entire session node
   * and cleans up associated media from Storage.
   */
  const endSession = useCallback(async () => {
    if (!userId || !sessionPinRef.current || !database || !isHost) return;

    const pin = sessionPinRef.current;

    try {
      // Clean up media files from Storage
      await cleanupSessionMedia(pin);

      // Remove the entire session node from RTDB (kicks everyone)
      const sessionRef = ref(database, `sessions/${pin}`);
      await remove(sessionRef);
    } catch {
      // Silently fail on cleanup
    }

    setSession(null);
    setIsHost(false);
    setParticipants([]);
    cleanup();
  }, [userId, isHost, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Handle tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (userId && sessionPinRef.current && database) {
        const participantRef = ref(
          database,
          `sessions/${sessionPinRef.current}/participants/${userId}`,
        );
        // Use remove directly - onDisconnect handler will also fire
        remove(participantRef).catch(() => {});
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [userId]);

  // Session expiry check
  useEffect(() => {
    if (!session?.expiresAt) return;

    const timeUntilExpiry = session.expiresAt - Date.now();

    if (timeUntilExpiry <= 0) {
      leaveSession();
      return;
    }

    const timer = setTimeout(() => {
      leaveSession();
    }, timeUntilExpiry);

    return () => clearTimeout(timer);
  }, [session?.expiresAt, leaveSession]);

  const result: UseSessionReturn = {
    session,
    isHost,
    participants,
    createSession,
    joinSession,
    leaveSession,
    endSession,
    loading,
    authenticating,
    error,
    deviceId: userId,
    deviceName: identity.name,
    deviceColor: identity.color,
  };

  return result;
}
