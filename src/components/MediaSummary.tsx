import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, onValue, type Unsubscribe } from 'firebase/database';
import { Button } from '@moondreamsdev/dreamer-ui/components';
import { join } from '@moondreamsdev/dreamer-ui/utils';
import { ExternalLink } from '@moondreamsdev/dreamer-ui/symbols';
import { useSessionContext } from '@hooks/useSessionContext';
import { database } from '@lib/firebase';
import type { MediaMetadata } from '@lib/firebase/storage';

interface MediaSummaryProps {
  className?: string;
}

export function MediaSummary({ className }: MediaSummaryProps) {
  const { session } = useSessionContext();
  const navigate = useNavigate();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!session || !database) return;

    const mediaRef = ref(database, `sessions/${session.pin}/media`);
    let unsub: Unsubscribe | null = null;

    unsub = onValue(
      mediaRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setCount(0);
          return;
        }
        const data = snapshot.val() as Record<string, MediaMetadata>;
        setCount(Object.keys(data).length);
      },
      () => {
        setCount(0);
      },
    );

    return () => {
      if (unsub) unsub();
    };
  }, [session]);

  if (count === 0) return null;

  return (
    <div className={join('pb-1', className)}>
      <Button
        size='sm'
        variant='tertiary'
        onClick={() => navigate('/media')}
        className='w-full text-xs'
        aria-label={`View all ${count} shared items`}
      >
        <ExternalLink className='mr-1 h-3 w-3' />
        View all shared items ({count})
      </Button>
    </div>
  );
}
