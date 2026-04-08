import { useState, useEffect, useCallback } from 'react';
import { ref, onValue, type Unsubscribe } from 'firebase/database';
import { Button, Callout } from '@moondreamsdev/dreamer-ui/components';
import { Trash } from '@moondreamsdev/dreamer-ui/symbols';
import { join } from '@moondreamsdev/dreamer-ui/utils';
import { useSessionContext } from '@hooks/useSessionContext';
import { auth, database } from '@lib/firebase';
import { deleteMedia, type MediaMetadata } from '@lib/firebase/storage';

interface MediaGalleryProps {
  className?: string;
}

export function MediaGallery({ className }: MediaGalleryProps) {
  const { session } = useSessionContext();
  const [items, setItems] = useState<MediaMetadata[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to real-time media updates
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
        const sorted = Object.values(data).sort(
          (a, b) => b.uploadedAt - a.uploadedAt,
        );
        setItems(sorted);
      },
      () => {
        setError('Failed to load media.');
      },
    );

    return () => {
      if (unsub) unsub();
    };
  }, [session]);

  const handleDelete = useCallback(
    async (e: React.MouseEvent, item: MediaMetadata) => {
      e.preventDefault();
      e.stopPropagation();
      if (!session) return;

      setDeleting(item.id);
      setError(null);
      try {
        await deleteMedia(session.pin, item.id, item.storagePath);
      } catch {
        setError('Failed to delete file.');
      } finally {
        setDeleting(null);
      }
    },
    [session],
  );

  const currentUserId = auth?.currentUser?.uid;

  return (
    <div className={join('space-y-3', className)}>
      {error && (
        <Callout variant='destructive' icon={null} description={error} />
      )}

      {items.length === 0 ? (
        <p className='py-8 text-center text-sm text-foreground/40'>
          No media shared yet.
        </p>
      ) : (
        <div className='grid grid-cols-2 gap-3'>
          {items.map((item) => {
            const isImage = item.fileType.startsWith('image/');
            const isPDF = item.fileType === 'application/pdf';
            const isOwner = currentUserId === item.uploadedBy;

            return (
              <a
                key={item.id}
                href={item.downloadURL}
                target='_blank'
                rel='noopener noreferrer'
                className='group relative overflow-hidden rounded-lg border border-foreground/10 bg-foreground/5'
              >
                {/* Preview */}
                {isImage ? (
                  <img
                    src={item.downloadURL}
                    alt={item.fileName}
                    loading='lazy'
                    className='aspect-square w-full object-cover transition-transform group-hover:scale-105'
                  />
                ) : isPDF ? (
                  <div className='aspect-square w-full overflow-hidden'>
                    <iframe
                      src={item.downloadURL + '#toolbar=0&navpanes=0&scrollbar=0'}
                      title={item.fileName}
                      className='pointer-events-none h-full w-full scale-105'
                    />
                  </div>
                ) : (
                  <div className='flex aspect-square w-full flex-col items-center justify-center p-2'>
                    <span className='text-3xl'>📄</span>
                  </div>
                )}

                {/* File name */}
                <div className='px-2 py-1.5'>
                  <p className='truncate text-xs text-foreground/70'>
                    {item.fileName}
                  </p>
                </div>

                {/* Delete button (owner only) */}
                {isOwner && (
                  <Button
                    size='sm'
                    variant='destructive'
                    disabled={deleting === item.id}
                    onClick={(e) => handleDelete(e, item)}
                    className='absolute right-1 top-1 h-7 w-7 md:opacity-0 transition-opacity group-hover:opacity-100'
                  >
                    <Trash className='h-3 w-3' />
                  </Button>
                )}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
