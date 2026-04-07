import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@moondreamsdev/dreamer-ui/components';
import { useSessionContext } from '@hooks/useSessionContext';

function Join() {
  const { pin } = useParams<{ pin: string }>();
  const navigate = useNavigate();
  const { session, joinSession, loading, error } = useSessionContext();

  useEffect(() => {
    if (pin && !session && !loading) {
      joinSession(pin);
    }
  }, [pin, session, loading, joinSession]);

  useEffect(() => {
    if (session) {
      navigate('/', { replace: true });
    }
  }, [session, navigate]);

  return (
    <div className='page flex flex-col items-center justify-center'>
      <div className='max-w-md space-y-4 px-4 text-center'>
        {loading && (
          <>
            <div className='mx-auto h-16 w-16 animate-spin rounded-full border-4 border-foreground/20 border-t-accent' />
            <p className='text-lg text-foreground/60'>
              Joining session {pin}...
            </p>
          </>
        )}

        {error && (
          <div className='space-y-4'>
            <p className='text-lg font-medium text-destructive'>{error}</p>
            <Button
              onClick={() => navigate('/', { replace: true })}
              variant='secondary'
            >
              Go to Home
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Join;
