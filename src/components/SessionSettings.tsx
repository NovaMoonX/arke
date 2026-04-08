import { useState } from 'react';
import { Button, Modal, Toggle } from '@moondreamsdev/dreamer-ui/components';
import { useToast } from '@moondreamsdev/dreamer-ui/hooks';
import { Trash, Download } from '@moondreamsdev/dreamer-ui/symbols';
import { ref, remove, get } from 'firebase/database';
import { database } from '@lib/firebase';
import { useSessionContext } from '@hooks/useSessionContext';
import { cleanupSessionMedia } from '@lib/firebase/storage';

interface SessionSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SessionSettings({ isOpen, onClose }: SessionSettingsProps) {
  const { session, leaveSession, isHost } = useSessionContext();
  const { addToast } = useToast();
  const [historyEnabled, setHistoryEnabled] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [ending, setEnding] = useState(false);

  const handleClearContent = async () => {
    if (!session || !database) return;
    setClearing(true);
    try {
      const messagesRef = ref(database, `sessions/${session.pin}/messages`);
      await remove(messagesRef);
      await cleanupSessionMedia(session.pin);
      addToast({ title: 'All content cleared', type: 'success' });
    } catch {
      addToast({ title: 'Failed to clear content', type: 'error' });
    } finally {
      setClearing(false);
    }
  };

  const handleEndSession = async () => {
    if (!session || !database) return;
    setEnding(true);
    try {
      // Remove entire session node
      const sessionRef = ref(database, `sessions/${session.pin}`);
      await remove(sessionRef);
      await cleanupSessionMedia(session.pin);
      addToast({ title: 'Session ended', type: 'info' });
      onClose();
    } catch {
      addToast({ title: 'Failed to end session', type: 'error' });
    } finally {
      setEnding(false);
    }
  };

  const handleExport = async () => {
    if (!session || !database) return;
    try {
      const messagesRef = ref(database, `sessions/${session.pin}/messages`);
      const snapshot = await get(messagesRef);
      const data = snapshot.exists() ? snapshot.val() : {};

      const exportData = {
        pin: session.pin,
        exportedAt: new Date().toISOString(),
        messages: data,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `arke-session-${session.pin}.json`;
      a.click();
      URL.revokeObjectURL(url);

      addToast({ title: 'Session exported', type: 'success' });
    } catch {
      addToast({ title: 'Failed to export session', type: 'error' });
    }
  };

  const handleLeaveSession = async () => {
    await leaveSession();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title='Session Settings'
      ariaLabelledBy='session-settings-title'
    >
      <div className='space-y-5 p-4'>
        {/* History toggle */}
        <div className='flex items-center justify-between'>
          <div>
            <p className='text-sm font-medium'>Message History</p>
            <p className='text-xs text-foreground/50'>
              Keep messages visible after sending
            </p>
          </div>
          <Toggle
            checked={historyEnabled}
            onCheckedChange={setHistoryEnabled}
            size='sm'
            aria-label='Toggle message history'
          />
        </div>

        {/* Clear content */}
        <div className='space-y-1'>
          <Button
            variant='secondary'
            className='w-full'
            onClick={handleClearContent}
            disabled={clearing}
            aria-label='Clear all shared content'
          >
            <Trash className='mr-2 h-4 w-4' />
            {clearing ? 'Clearing…' : 'Clear All Content'}
          </Button>
          <p className='text-xs text-foreground/40'>
            Removes all messages and shared media
          </p>
        </div>

        {/* Export */}
        <Button
          variant='secondary'
          className='w-full'
          onClick={handleExport}
          aria-label='Export session data'
        >
          <Download className='mr-2 h-4 w-4' />
          Export Session Data
        </Button>

        {/* End session (host only) */}
        {isHost && (
          <Button
            variant='destructive'
            className='w-full'
            onClick={handleEndSession}
            disabled={ending}
            aria-label='End session for all participants'
          >
            {ending ? 'Ending…' : 'End Session'}
          </Button>
        )}

        {/* Leave session */}
        {!isHost && (
          <Button
            variant='destructive'
            className='w-full'
            onClick={handleLeaveSession}
            aria-label='Leave session'
          >
            Leave Session
          </Button>
        )}
      </div>
    </Modal>
  );
}
