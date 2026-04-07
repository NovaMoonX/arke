import { useState, useEffect, useCallback, useRef } from 'react';
import { Textarea } from '@moondreamsdev/dreamer-ui/components';
import { CopyButton } from '@moondreamsdev/dreamer-ui/components';
import { join } from '@moondreamsdev/dreamer-ui/utils';
import { ref, set, get, onValue, type Unsubscribe } from 'firebase/database';
import { database } from '@lib/firebase';
import { useDebounce } from '@hooks/useDebounce';
import { useClipboard } from '@hooks/useClipboard';

const HISTORY_LIMIT = 10;
const DEBOUNCE_DELAY = 150;

interface HistoryItem {
  text: string;
  savedAt: number;
}

interface TextPortalProps {
  sessionPin: string;
  className?: string;
}

type SyncStatus = 'synced' | 'syncing';

export function TextPortal({ sessionPin, className }: TextPortalProps) {
  const [localText, setLocalText] = useState('');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const isRemoteUpdateRef = useRef(false);
  const prevTextRef = useRef('');

  const debouncedText = useDebounce(localText, DEBOUNCE_DELAY);
  const { readFromClipboard } = useClipboard();

  // Listen for remote updates
  useEffect(() => {
    if (!database) return;

    const textRef = ref(database, `sessions/${sessionPin}/text`);

    const unsubscribe: Unsubscribe = onValue(textRef, (snapshot) => {
      const remoteText: string = snapshot.exists() ? (snapshot.val() as string) : '';
      // Only update local state if the change came from a remote device
      setLocalText((current) => {
        if (current !== remoteText) {
          isRemoteUpdateRef.current = true;
          return remoteText;
        }
        return current;
      });
      // Mark as synced whenever Firebase acknowledges any value
      setSyncStatus('synced');
    });

    return () => unsubscribe();
  }, [sessionPin]);

  // Write debounced text to Firebase (skip if triggered by remote update)
  useEffect(() => {
    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      prevTextRef.current = debouncedText;
      // Status was already set by onValue callback — no setState needed here
      return;
    }

    if (debouncedText === prevTextRef.current) return;

    if (!database) return;

    const textRef = ref(database, `sessions/${sessionPin}/text`);

    set(textRef, debouncedText)
      .then(() => {
        setSyncStatus('synced');
        // Save to history when text changes meaningfully (non-empty)
        if (debouncedText.trim()) {
          saveToHistory(sessionPin, debouncedText);
        }
      })
      .catch(() => {
        setSyncStatus('synced');
      });

    prevTextRef.current = debouncedText;
  }, [debouncedText, sessionPin]);

  // Show syncing status immediately on local change
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setSyncStatus('syncing');
      setLocalText(e.target.value);
    },
    [],
  );

  // Keyboard shortcut: Ctrl/Cmd+V → paste from system clipboard into portal
  const handleKeyDown = useCallback(
    async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        const clipboardText = await readFromClipboard();
        if (clipboardText) {
          setLocalText(clipboardText);
          setSyncStatus('syncing');
        }
      }
    },
    [readFromClipboard],
  );

  const syncLabel = syncStatus === 'syncing' ? 'Syncing…' : 'Synced';

  return (
    <div className={join('space-y-2', className)}>
      {/* Sync status indicator */}
      <div className='flex items-center justify-between'>
        <span className='text-sm font-medium text-foreground/70'>
          Text Portal
        </span>
        <span
          className={join(
            'flex items-center gap-1 text-xs',
            syncStatus === 'syncing'
              ? 'text-yellow-500'
              : 'text-green-500',
          )}
        >
          <span
            className={join(
              'inline-block h-2 w-2 rounded-full',
              syncStatus === 'syncing' ? 'bg-yellow-500' : 'bg-green-500',
            )}
          />
          {syncLabel}
        </span>
      </div>

      <Textarea
        autoExpand
        value={localText}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder='Type or paste text here — it syncs instantly to all devices…'
        rows={5}
      />

      {/* Copy button */}
      <div className='flex justify-end'>
        <CopyButton
          textToCopy={localText}
          showCopyText
          variant='secondary'
          size='sm'
          disabled={!localText}
        >
          Copy
        </CopyButton>
      </div>
    </div>
  );
}

/** Persist a history entry in RTDB, keeping only the last HISTORY_LIMIT items. */
async function saveToHistory(pin: string, text: string): Promise<void> {
  if (!database) return;

  try {
    const historyRef = ref(database, `sessions/${pin}/history`);

    // Read current history
    const snapshot = await get(historyRef);

    let items: HistoryItem[] = [];
    if (snapshot.exists()) {
      const raw = snapshot.val() as Record<string, HistoryItem>;
      items = Object.values(raw);
    }

    // Add new entry and trim to limit — new entry always has the latest timestamp
    const newItem: HistoryItem = { text, savedAt: Date.now() };
    items.push(newItem);
    const trimmed = items.slice(-HISTORY_LIMIT);

    // Rebuild as an indexed object
    const updated: Record<string, HistoryItem> = {};
    trimmed.forEach((item, index) => {
      updated[index.toString()] = item;
    });

    await set(historyRef, updated);
  } catch {
    // Silently fail — history is non-critical
  }
}
