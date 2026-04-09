import { useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Callout } from '@moondreamsdev/dreamer-ui/components';
import { useSessionContext } from '@hooks/useSessionContext';

function Join() {
  const { pin } = useParams<{ pin: string }>();
  const navigate = useNavigate();
  const {
    session,
    joinSession,
    loading,
    authenticating,
    error,
    deviceName,
    deviceColor,
    participants,
  } = useSessionContext();
  const hasAttemptedJoin = useRef(false);
  const prevAuthenticating = useRef(true);

  const attemptJoin = useCallback(() => {
    if (pin && !session && !loading && !authenticating && !hasAttemptedJoin.current) {
      hasAttemptedJoin.current = true;
      joinSession(pin);
    }
  }, [pin, session, loading, authenticating, joinSession]);

  // Reset the join guard when auth transitions from true → false
  // so that if the first attempt failed due to auth, we can retry
  useEffect(() => {
    if (prevAuthenticating.current && !authenticating) {
      prevAuthenticating.current = false;
      if (!hasAttemptedJoin.current) return;
      // Auth just finished — if there's an auth error, allow retry
      if (error && error.includes('Not authenticated')) {
        hasAttemptedJoin.current = false;
      }
    }
  }, [authenticating, error]);

  useEffect(() => {
    attemptJoin();
  }, [attemptJoin]);

  useEffect(() => {
    if (session) {
      navigate('/', { replace: true });
    }
  }, [session, navigate]);

  // Show loading when auth or join is in progress, or before first attempt
  const showLoading = authenticating || loading || (!error && !session);

  return (
    <div className='page flex flex-col items-center justify-center'>
      <div className='max-w-md space-y-4 px-4 text-center'>
        {showLoading && !error && (
          <>
            <div
              className='mx-auto h-16 w-16 animate-spin rounded-full border-4 border-foreground/20 border-t-accent'
              role='status'
              aria-label='Joining session'
            />
            <p className='text-lg text-foreground/60'>
              Joining session {pin}...
            </p>
          </>
        )}

        {error && !authenticating && !loading && (
          <div className='space-y-4' role='alert'>
            <Callout variant='destructive' icon={null} description={error} />
            <div className='flex justify-center gap-3'>
              <Button
                onClick={() => {
                  hasAttemptedJoin.current = false;
                  attemptJoin();
                }}
                variant='primary'
                aria-label='Try joining again'
              >
                Retry
              </Button>
              <Button
                onClick={() => navigate('/', { replace: true })}
                variant='secondary'
                aria-label='Go to home page'
              >
                Go to Home
              </Button>
            </div>
          </div>
        )}

        {/* Show user info + participants after successful join while navigating */}
        {session && (
          <div className='space-y-3'>
            <p className='text-sm text-foreground/60'>
              Joined as{' '}
              <span className='font-semibold' style={{ color: deviceColor }}>
                {deviceName}
              </span>
            </p>
            {participants.length > 0 && (
              <p className='text-xs text-foreground/40'>
                {participants.length} {participants.length === 1 ? 'device' : 'devices'} in session:{' '}
                {participants.map((p) => p.name || 'Unknown').join(', ')}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Join;
