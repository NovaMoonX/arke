import { useState, useEffect, useCallback } from 'react';
import { Button } from '@moondreamsdev/dreamer-ui/components';
import { ref, onValue, remove, type Unsubscribe } from 'firebase/database';
import { database } from '@lib/firebase';

const HISTORY_LIMIT = 10;

interface HistoryItem {
  text: string;
  savedAt: number;
}

interface TextHistoryProps {
  sessionPin: string;
  onRestore: (text: string) => void;
  className?: string;
}

export function TextHistory({ sessionPin, onRestore, className }: TextHistoryProps) {
  const [history, setHistory] = useState<Array<HistoryItem & { key: string }>>([]);

  useEffect(() => {
    if (!database) return;

    const historyRef = ref(database, `sessions/${sessionPin}/history`);

    const unsubscribe: Unsubscribe = onValue(historyRef, (snapshot) => {
      if (!snapshot.exists()) {
        setHistory([]);
        return;
      }

      const raw = snapshot.val() as Record<string, HistoryItem>;
      const items = Object.entries(raw)
        .map(([key, value]) => ({ key, ...value }))
        .sort((a, b) => b.savedAt - a.savedAt)
        .slice(0, HISTORY_LIMIT);

      setHistory(items);
    });

    return () => unsubscribe();
  }, [sessionPin]);

  const handleDelete = useCallback(async (key: string) => {
    if (!database) return;
    const itemRef = ref(database, `sessions/${sessionPin}/history/${key}`);
    try {
      await remove(itemRef);
    } catch {
      // Silently fail
    }
  }, [sessionPin]);

  if (history.length === 0) return null;

  return (
    <div className={className}>
      <h3 className='mb-2 text-sm font-medium text-foreground/70'>
        Recent ({history.length})
      </h3>
      <ul className='space-y-2'>
        {history.map((item) => (
          <li
            key={item.key}
            className='flex items-start gap-2 rounded-md border border-foreground/10 bg-foreground/5 p-2'
          >
            <div className='min-w-0 flex-1'>
              <p className='truncate text-sm'>{item.text}</p>
              <p className='mt-0.5 text-xs text-foreground/40'>
                {new Date(item.savedAt).toLocaleTimeString()}
              </p>
            </div>
            <div className='flex shrink-0 gap-1'>
              <Button
                size='sm'
                variant='secondary'
                onClick={() => onRestore(item.text)}
              >
                Restore
              </Button>
              <Button
                size='sm'
                variant='destructive'
                onClick={() => handleDelete(item.key)}
              >
                ✕
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export type { HistoryItem };
