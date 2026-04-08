import { useState, useEffect, useCallback } from 'react';
import { ref, onValue, type Unsubscribe } from 'firebase/database';
import { Button, Modal, Callout } from '@moondreamsdev/dreamer-ui/components';
import { Trash, Download } from '@moondreamsdev/dreamer-ui/symbols';
import { join } from '@moondreamsdev/dreamer-ui/utils';
import { useSessionContext } from '@hooks/useSessionContext';
import { useWebShare } from '@hooks/useWebShare';
import { auth, database } from '@lib/firebase';
import { deleteMedia, type MediaMetadata } from '@lib/firebase/storage';

interface MediaGalleryProps {
  className?: string;
}

export function MediaGallery({ className }: MediaGalleryProps) {
  const { session } = useSessionContext();
  const { shareFile } = useWebShare();
  const [items, setItems] = useState<MediaMetadata[]>([]);
  const [viewItem, setViewItem] = useState<MediaMetadata | null>(null);
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
    async (item: MediaMetadata) => {
      if (!session) return;

      setDeleting(item.id);
      setError(null);
      try {
        await deleteMedia(session.pin, item.id, item.storagePath);
        if (viewItem?.id === item.id) setViewItem(null);
      } catch {
        setError('Failed to delete file.');
      } finally {
        setDeleting(null);
      }
    },
    [session, viewItem],
  );

  const handleDownload = useCallback(
    (item: MediaMetadata) => {
      shareFile(item.downloadURL, item.fileName);
    },
    [shareFile],
  );

  const currentUserId = auth?.currentUser?.uid;

  if (items.length === 0) return null;

  return (
    <div className={join('space-y-3', className)}>
      <h3 className='text-sm font-medium text-foreground/60'>
        Shared Media ({items.length})
      </h3>

      {error && <Callout variant='destructive' description={error} />}

      {/* Grid */}
      <div className='grid grid-cols-3 gap-2'>
        {items.map((item) => (
          <div
            key={item.id}
            className='group relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-foreground/5'
            onClick={() => setViewItem(item)}
          >
            {item.fileType.startsWith('image/') ? (
              <img
                src={item.downloadURL}
                alt={item.fileName}
                loading='lazy'
                className='h-full w-full object-cover transition-transform group-hover:scale-105'
              />
            ) : (
              <div className='flex h-full w-full flex-col items-center justify-center p-2'>
                <span className='text-3xl'>📄</span>
                <span className='mt-1 truncate text-xs text-foreground/60'>
                  {item.fileName}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Full-size viewer modal */}
      <Modal
        isOpen={!!viewItem}
        onClose={() => setViewItem(null)}
        title={viewItem?.fileName}
        className='max-w-2xl'
      >
        {viewItem && (
          <div className='space-y-4 p-4'>
            {viewItem.fileType.startsWith('image/') ? (
              <img
                src={viewItem.downloadURL}
                alt={viewItem.fileName}
                className='mx-auto max-h-[60vh] rounded-lg object-contain'
              />
            ) : (
              <div className='flex flex-col items-center py-8'>
                <span className='text-6xl'>📄</span>
                <p className='mt-2 text-foreground/80'>{viewItem.fileName}</p>
              </div>
            )}

            <div className='flex justify-center gap-2'>
              <Button
                size='sm'
                variant='secondary'
                onClick={() => handleDownload(viewItem)}
              >
                <Download className='mr-1 h-4 w-4' />
                Download
              </Button>

              {currentUserId === viewItem.uploadedBy && (
                <Button
                  size='sm'
                  variant='destructive'
                  disabled={deleting === viewItem.id}
                  onClick={() => handleDelete(viewItem)}
                >
                  <Trash className='mr-1 h-4 w-4' />
                  {deleting === viewItem.id ? 'Deleting…' : 'Delete'}
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
