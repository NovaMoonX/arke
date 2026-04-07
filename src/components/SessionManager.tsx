import { useState } from 'react';
import { Button, Input, Modal, Callout } from '@moondreamsdev/dreamer-ui/components';
import { join } from '@moondreamsdev/dreamer-ui/utils';
import { useSessionContext } from '@hooks/useSessionContext';
import { QRDisplay } from '@components/QRDisplay';

interface SessionManagerProps {
  className?: string;
}

export function SessionManager({ className }: SessionManagerProps) {
  const {
    session,
    isHost,
    participants,
    createSession,
    joinSession,
    leaveSession,
    loading,
    error,
  } = useSessionContext();

  const [pinInput, setPinInput] = useState('');
  const [showQR, setShowQR] = useState(false);

  const handleCreateSession = async () => {
    await createSession();
    setShowQR(true);
  };

  const handleJoinSession = async () => {
    const trimmedPin = pinInput.trim();
    if (trimmedPin.length !== 6) return;
    await joinSession(trimmedPin);
  };

  const handleLeaveSession = async () => {
    setShowQR(false);
    await leaveSession();
  };

  // Active session view
  if (session) {
    return (
      <div className={join('space-y-6', className)}>
        {/* Session Status */}
        <Callout
          variant='success'
          description={
            <div className='text-center'>
              <p className='text-sm font-medium'>● Connected</p>
              <p className='mt-1 font-mono text-lg font-bold tracking-widest'>
                PIN: {session.pin}
              </p>
              <p className='mt-1 text-sm opacity-60'>
                {participants.length}{' '}
                {participants.length === 1 ? 'device' : 'devices'} connected
              </p>
            </div>
          }
        />

        {/* QR Modal for host */}
        {isHost && (
          <>
            <Button
              onClick={() => setShowQR(true)}
              variant='secondary'
              className='w-full'
            >
              Show QR Code
            </Button>

            <Modal
              isOpen={showQR}
              onClose={() => setShowQR(false)}
              title='Share Session'
            >
              <div className='p-4'>
                <QRDisplay pin={session.pin} />
              </div>
            </Modal>
          </>
        )}

        {/* Leave Button */}
        <Button
          onClick={handleLeaveSession}
          variant='destructive'
          className='w-full'
        >
          Leave Session
        </Button>
      </div>
    );
  }

  // No session view
  return (
    <div className={join('space-y-6', className)}>
      {/* Error Display */}
      {error && (
        <Callout variant='destructive' description={error} />
      )}

      {/* Start Sharing */}
      <Button
        onClick={handleCreateSession}
        disabled={loading}
        className='w-full'
      >
        {loading ? 'Creating...' : 'Start Sharing'}
      </Button>

      {/* Divider */}
      <div className='flex items-center gap-3'>
        <div className='h-px flex-1 bg-foreground/10' />
        <span className='text-sm text-foreground/40'>or</span>
        <div className='h-px flex-1 bg-foreground/10' />
      </div>

      {/* Join Session */}
      <div className='space-y-3'>
        <Input
          value={pinInput}
          onChange={(e) => setPinInput(e.target.value)}
          placeholder='Enter 6-digit PIN'
          maxLength={6}
          className='text-center font-mono text-lg tracking-widest'
        />
        <Button
          onClick={handleJoinSession}
          disabled={loading || pinInput.trim().length !== 6}
          variant='secondary'
          className='w-full'
        >
          {loading ? 'Joining...' : 'Join Session'}
        </Button>
      </div>
    </div>
  );
}
