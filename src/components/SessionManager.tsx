import { useState } from 'react';
import {
  Button,
  Input,
  Modal,
  Callout,
  CopyButton,
} from '@moondreamsdev/dreamer-ui/components';
import { join } from '@moondreamsdev/dreamer-ui/utils';
import { useSessionContext } from '@hooks/useSessionContext';
import { QRDisplay } from '@components/QRDisplay';
import { QRCodeIcon } from '@components/icons/QRCodeIcon';

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

  // Active session — compact inline bar
  if (session) {
    return (
      <div className={join('space-y-2', className)}>
        <div className='flex items-center gap-2 rounded-lg border border-foreground/10 px-3 py-2'>
          {/* Status dot + PIN */}
          <span className='h-2 w-2 shrink-0 rounded-full bg-green-500' />
          <span className='font-mono text-sm font-bold tracking-widest'>
            {session.pin}
          </span>

          <CopyButton
            textToCopy={session.pin}
            size='icon'
            variant='tertiary'
            iconSize={12}
          />

          {/* Device count */}
          <span className='text-xs text-foreground/50'>
            · {participants.length}{' '}
            {participants.length === 1 ? 'device' : 'devices'}
          </span>

          {/* Spacer */}
          <span className='flex-1' />

          {/* QR + Leave */}
          {isHost && (
            <Button
              size='sm'
              variant='tertiary'
              onClick={() => setShowQR(true)}
              className='text-xs'
            >
              <QRCodeIcon className='h-4 w-4' />
            </Button>
          )}
          <Button
            size='sm'
            variant='destructive'
            onClick={handleLeaveSession}
            className='text-xs'
          >
            Leave
          </Button>
        </div>

        {/* QR modal */}
        {isHost && (
          <Modal
            isOpen={showQR}
            onClose={() => setShowQR(false)}
            title='Share Session'
          >
            <div className='p-4'>
              <QRDisplay pin={session.pin} />
            </div>
          </Modal>
        )}
      </div>
    );
  }

  // No session view
  return (
    <div className={join('space-y-6', className)}>
      {/* Error Display */}
      {error && (
        <Callout variant='destructive' icon={null} description={error} />
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
