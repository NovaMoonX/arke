import { useState, useEffect, useCallback, useRef } from 'react';
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
import type { Session } from '@lib/types';
import type { Participant } from '@lib/types';

const generatePin = customAlphabet('0123456789', 6);

interface UseSessionReturn {
  session: Session | null;
  isHost: boolean;
  participants: Participant[];
  createSession: () => Promise<void>;
  joinSession: (pin: string) => Promise<void>;
  leaveSession: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function useSession(): UseSessionReturn {
  const [session, setSession] = useState<Session | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const unsubscribeRef = useRef<Unsubscribe | null>(null);
  const participantsUnsubRef = useRef<Unsubscribe | null>(null);
  const sessionPinRef = useRef<string | null>(null);

  // Authenticate anonymously
  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      }
    });

    signInAnonymously(auth).catch((err) => {
      setError(`Authentication failed: ${err.message}`);
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
    sessionPinRef.current = null;
  }, []);

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
                };
                return {
                  id,
                  deviceId: participant.deviceId,
                  joinedAt: participant.joinedAt,
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
    if (!userId || !database) {
      setError('Not authenticated');
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
          },
        },
      };

      await set(sessionRef, sessionData);

      // Set up onDisconnect to remove this participant
      const participantRef = ref(
        database,
        `sessions/${pin}/participants/${userId}`,
      );
      await onDisconnect(participantRef).remove();

      setIsHost(true);
      subscribeToSession(pin);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to create session: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [userId, subscribeToSession]);

  const joinSession = useCallback(
    async (pin: string) => {
      if (!userId || !database) {
        setError('Not authenticated');
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
        });

        // Set up onDisconnect to remove this participant
        await onDisconnect(participantRef).remove();

        setIsHost(false);
        subscribeToSession(pin);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(`Failed to join session: ${message}`);
      } finally {
        setLoading(false);
      }
    },
    [userId, subscribeToSession],
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
    loading,
    error,
  };

  return result;
}
