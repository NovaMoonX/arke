import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, onValue, type Unsubscribe } from 'firebase/database';
import { Button } from '@moondreamsdev/dreamer-ui/components';
import { join } from '@moondreamsdev/dreamer-ui/utils';
import { useSessionContext } from '@hooks/useSessionContext';
import { database } from '@lib/firebase';
import type { MediaMetadata } from '@lib/firebase/storage';

interface MediaSummaryProps {
  className?: string;
}

export function MediaSummary({ className }: MediaSummaryProps) {
  const { session } = useSessionContext();
  const navigate = useNavigate();
  const [items, setItems] = useState<MediaMetadata[]>([]);

  useEffect(() => {
    if (!session || !database) return;

    const mediaRef = ref(database, `sessions/${session.pin}/media`);
    let unsub: Unsubscribe | null = null;

    unsub = onValue(
      mediaRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setItems([]);
          return;
        }
        const data = snapshot.val() as Record<string, MediaMetadata>;
        setItems(Object.values(data));
      },
      () => {
        setItems([]);
      },
    );

    return () => {
      if (unsub) unsub();
    };
  }, [session]);

  if (items.length === 0) return null;

  const imageCount = items.filter((i) =>
    i.fileType.startsWith('image/'),
  ).length;
  const pdfCount = items.filter(
    (i) => i.fileType === 'application/pdf',
  ).length;

  const parts: string[] = [];
  if (imageCount > 0) {
    parts.push(`${imageCount} ${imageCount === 1 ? 'image' : 'images'}`);
  }
  if (pdfCount > 0) {
    parts.push(`${pdfCount} ${pdfCount === 1 ? 'PDF' : 'PDFs'}`);
  }
  const summary = `Shared ${parts.join(' and ')}`;

  return (
    <div
      className={join(
        'flex items-center justify-between rounded-lg border border-foreground/10 px-3 py-2',
        className,
      )}
    >
      <button
        onClick={() => navigate('/media')}
        className='text-sm text-primary underline-offset-2 hover:underline'
      >
        {summary}
      </button>
      <Button size='sm' variant='secondary' onClick={() => navigate('/media')}>
        View All Media
      </Button>
    </div>
  );
}
