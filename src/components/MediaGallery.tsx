import { useState, useEffect, useCallback } from 'react';
import { ref, onValue, type Unsubscribe } from 'firebase/database';
import { Button, Callout, Tabs, TabsContent } from '@moondreamsdev/dreamer-ui/components';
import { Trash } from '@moondreamsdev/dreamer-ui/symbols';
import { join } from '@moondreamsdev/dreamer-ui/utils';
import { useSessionContext } from '@hooks/useSessionContext';
import { auth, database } from '@lib/firebase';
import { deleteMedia, type MediaMetadata, type MediaType } from '@lib/firebase/storage';
import { LinkIcon } from '@components/icons/LinkIcon';
import { ImageIcon } from '@components/icons/ImageIcon';
import { VideoIcon } from '@components/icons/VideoIcon';
import { FileIcon } from '@components/icons/FileIcon';

type FilterType = 'all' | MediaType;

interface MediaGalleryProps {
  className?: string;
}

function deriveMediaTypeFromItem(item: MediaMetadata): MediaType {
  if (item.mediaType) return item.mediaType;
  if (item.fileType === 'text/uri-list') return 'link';
  if (item.fileType.startsWith('image/')) return 'image';
  if (item.fileType.startsWith('video/')) return 'video';
  if (item.fileType.startsWith('audio/')) return 'audio';
  return 'file';
}

const FILTER_TABS: { value: FilterType; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All', icon: null },
  { value: 'link', label: 'Links', icon: <LinkIcon className='h-3.5 w-3.5' /> },
  { value: 'image', label: 'Images', icon: <ImageIcon className='h-3.5 w-3.5' /> },
  { value: 'video', label: 'Videos', icon: <VideoIcon className='h-3.5 w-3.5' /> },
  { value: 'file', label: 'Files', icon: <FileIcon className='h-3.5 w-3.5' /> },
];

function MediaGrid({
  items,
  currentUserId,
  deleting,
  onDelete,
}: {
  items: MediaMetadata[];
  currentUserId: string | undefined;
  deleting: string | null;
  onDelete: (e: React.MouseEvent, item: MediaMetadata) => void;
}) {
  if (items.length === 0) {
    return (
      <p className='py-8 text-center text-sm text-foreground/40'>
        No items to show.
      </p>
    );
  }

  return (
    <div className='grid grid-cols-2 gap-3' role='list' aria-label='Shared items'>
      {items.map((item) => {
        const itemType = deriveMediaTypeFromItem(item);
        const isImage = itemType === 'image';
        const isVideo = itemType === 'video';
        const isLink = itemType === 'link';
        const isPDF = item.fileType === 'application/pdf';
        const isOwner = currentUserId === item.uploadedBy;

        return (
          <a
            key={item.id}
            href={item.downloadURL}
            target='_blank'
            rel='noopener noreferrer'
            className='group relative overflow-hidden rounded-lg border border-foreground/10 bg-foreground/5'
            role='listitem'
            aria-label={`Open ${item.fileName}`}
          >
            {/* Preview */}
            {isImage ? (
              <img
                src={item.downloadURL}
                alt={item.fileName}
                loading='lazy'
                className='aspect-square w-full object-cover transition-transform group-hover:scale-105'
              />
            ) : isVideo ? (
              <div className='relative aspect-square w-full overflow-hidden'>
                <video
                  src={item.downloadURL}
                  className='h-full w-full object-cover'
                  muted
                  playsInline
                  preload='metadata'
                />
                <div className='absolute inset-0 flex items-center justify-center bg-black/20'>
                  <VideoIcon className='h-10 w-10 text-white drop-shadow-md' />
                </div>
              </div>
            ) : isLink ? (
              <div className='flex aspect-square w-full flex-col items-center justify-center gap-1 p-2'>
                <LinkIcon className='h-8 w-8 text-foreground/40' />
                <span className='text-foreground/50 max-w-full truncate text-xs'>
                  {item.fileName}
                </span>
              </div>
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
                <FileIcon className='h-8 w-8 text-foreground/40' />
              </div>
            )}

            {/* File name */}
            <div className='px-2 py-1.5'>
              <p className='truncate text-xs text-foreground/70'>
                {item.fileName}
              </p>
            </div>

            {/* Delete button (owner only, not for links) */}
            {isOwner && (
              <Button
                size='sm'
                variant='destructive'
                disabled={deleting === item.id}
                onClick={(e) => onDelete(e, item)}
                className='absolute right-1 top-1 h-7 w-7 md:opacity-0 transition-opacity group-hover:opacity-100'
                aria-label={`Delete ${item.fileName}`}
              >
                <Trash className='h-3 w-3' />
              </Button>
            )}
          </a>
        );
      })}
    </div>
  );
}

export function MediaGallery({ className }: MediaGalleryProps) {
  const { session } = useSessionContext();
  const [items, setItems] = useState<MediaMetadata[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');

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

  const getFilteredItems = useCallback(
    (filterType: FilterType) => {
      if (filterType === 'all') return items;
      return items.filter((item) => deriveMediaTypeFromItem(item) === filterType);
    },
    [items],
  );

  const tabsList = FILTER_TABS.map(({ value, label, icon }) => ({
    value,
    label: (
      <span className='flex items-center gap-1'>
        {icon}
        {label}
      </span>
    ),
  }));

  return (
    <div className={join('space-y-3', className)} role='region' aria-label='Media gallery'>
      {error && (
        <Callout variant='destructive' icon={null} description={error} />
      )}

      <Tabs
        defaultValue='all'
        value={filter}
        onValueChange={(v) => setFilter(v as FilterType)}
        variant='pills'
        tabsWidth='full'
        tabsList={tabsList}
      >
        {FILTER_TABS.map(({ value }) => (
          <TabsContent key={value} value={value}>
            <MediaGrid
              items={getFilteredItems(value)}
              currentUserId={currentUserId}
              deleting={deleting}
              onDelete={handleDelete}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
