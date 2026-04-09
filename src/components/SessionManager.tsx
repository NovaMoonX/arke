import { useState } from 'react';
import {
  Button,
  Input,
  Modal,
  Callout,
  Popover,
} from '@moondreamsdev/dreamer-ui/components';
import { join } from '@moondreamsdev/dreamer-ui/utils';
import { useActionModal } from '@moondreamsdev/dreamer-ui/hooks';
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
    endSession,
    loading,
    authenticating,
    error,
  } = useSessionContext();

  const { confirm } = useActionModal();
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

  const handleEndSession = async () => {
    const confirmed = await confirm({
      title: 'End Session',
      message:
        'This will terminate the session for all connected devices. All shared messages and media will be permanently removed.',
      confirmText: 'End Session',
      cancelText: 'Cancel',
      destructive: true,
    });

    if (confirmed) {
      setShowQR(false);
      await endSession();
    }
  };

  // Active session — compact inline bar
  if (session) {
    return (
      <div className={join('space-y-2', className)} role='region' aria-label='Active session'>
        <div className='flex items-center gap-2 rounded-lg border border-foreground/10 px-3 py-2'>
          {/* Status indicator */}
          <span
            className='h-2 w-2 shrink-0 rounded-full bg-green-500'
            aria-hidden='true'
          />

          {/* Host badge */}
          {isHost && (
            <span className='rounded-full bg-primary/15 px-1.5 py-0.5 text-xs font-medium text-primary'>
              Host
            </span>
          )}

          {/* Device count — clickable to show participants */}
          <Popover
            trigger={
              <button className='text-xs text-foreground/60 underline-offset-2 hover:underline'>
                {participants.length} {participants.length === 1 ? 'device' : 'devices'}
              </button>
            }
            placement='bottom'
            alignment='start'
            className='max-w-60'
          >
            <div className='space-y-1.5 p-3'>
              <p className='text-xs font-semibold text-foreground/80'>Connected Devices</p>
              {participants.map((p) => (
                <div key={p.id} className='flex items-center gap-1.5'>
                  <span
                    className='inline-block h-2 w-2 shrink-0 rounded-full'
                    style={{ backgroundColor: p.color || '#888' }}
                    aria-hidden='true'
                  />
                  <span className='text-xs text-foreground/70'>{p.name || 'Unknown'}</span>
                </div>
              ))}
            </div>
          </Popover>

          {/* Spacer */}
          <span className='flex-1' />

          {/* Actions: QR + Leave/End */}
          {isHost && (
            <Button
              size='sm'
              variant='tertiary'
              onClick={() => setShowQR(true)}
              className='text-xs'
              aria-label='Show QR code'
            >
              <QRCodeIcon className='h-4 w-4' />
            </Button>
          )}
          {isHost ? (
            <Button
              size='sm'
              variant='destructive'
              onClick={handleEndSession}
              className='text-xs'
              aria-label='End session for all'
            >
              End Session
            </Button>
          ) : (
            <Button
              size='sm'
              variant='destructive'
              onClick={handleLeaveSession}
              className='text-xs'
              aria-label='Leave session'
            >
              Leave
            </Button>
          )}
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
    <div className={join('space-y-6', className)} role='region' aria-label='Session controls'>
      {/* Error Display */}
      {error && !authenticating && (
        <Callout variant='destructive' icon={null} description={error} />
      )}

      {/* Start Sharing */}
      <Button
        onClick={handleCreateSession}
        disabled={loading || authenticating}
        className='w-full'
        aria-label='Create a new sharing session'
      >
        {loading ? 'Creating...' : 'Start Sharing'}
      </Button>

      {/* Divider */}
      <div className='flex items-center gap-3' aria-hidden='true'>
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
          aria-label='Session PIN'
        />
        <Button
          onClick={handleJoinSession}
          disabled={loading || authenticating || pinInput.trim().length !== 6}
          variant='secondary'
          className='w-full'
          aria-label='Join an existing session'
        >
          {loading ? 'Joining...' : 'Join Session'}
        </Button>
      </div>
    </div>
  );
}
