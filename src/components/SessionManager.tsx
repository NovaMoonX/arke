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
  onOpenSettings?: () => void;
}

export function SessionManager({ className, onOpenSettings }: SessionManagerProps) {
  const {
    session,
    isHost,
    participants,
    createSession,
    joinSession,
    leaveSession,
    loading,
    authenticating,
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
      <div className={join('space-y-2', className)} role='region' aria-label='Active session'>
        <div className='flex items-center gap-2 rounded-lg border border-foreground/10 px-3 py-2'>
          {/* Status dot + PIN */}
          <span
            className='h-2 w-2 shrink-0 rounded-full bg-green-500'
            aria-hidden='true'
          />
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

          {/* Settings */}
          {onOpenSettings && (
            <Button
              size='sm'
              variant='tertiary'
              onClick={onOpenSettings}
              className='text-xs'
              aria-label='Session settings'
            >
              <SettingsIcon className='h-4 w-4' />
            </Button>
          )}

          {/* QR + Leave */}
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
          <Button
            size='sm'
            variant='destructive'
            onClick={handleLeaveSession}
            className='text-xs'
            aria-label='Leave session'
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

/** Inline settings gear icon */
function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 15 15'
      fill='none'
      className={className}
    >
      <path
        d='M7.07.65a.85.85 0 0 0-.838.71l-.198 1.192a4.926 4.926 0 0 0-.866.5L4.09 2.61a.85.85 0 0 0-1.012.377l-.93 1.61a.85.85 0 0 0 .174 1.087l.98.832a4.979 4.979 0 0 0 0 .999l-.98.832a.85.85 0 0 0-.174 1.088l.93 1.61a.85.85 0 0 0 1.012.376l1.178-.442a4.926 4.926 0 0 0 .866.5l.198 1.192a.85.85 0 0 0 .838.71h1.86a.85.85 0 0 0 .838-.71l.198-1.192c.31-.14.6-.307.866-.5l1.178.442a.85.85 0 0 0 1.012-.377l.93-1.61a.85.85 0 0 0-.174-1.087l-.98-.832a4.978 4.978 0 0 0 0-.999l.98-.832a.85.85 0 0 0 .174-1.088l-.93-1.61a.85.85 0 0 0-1.012-.376l-1.178.442a4.926 4.926 0 0 0-.866-.5l-.198-1.192A.85.85 0 0 0 8.93.65H7.07ZM8 9.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z'
        fill='currentColor'
      />
    </svg>
  );
}
