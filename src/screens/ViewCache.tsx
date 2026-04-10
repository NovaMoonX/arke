import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Callout } from '@moondreamsdev/dreamer-ui/components';
import { getCache } from '@lib/firebase/caches';
import type { Cache, CacheItem } from '@lib/types';
import { LinkIcon } from '@components/icons/LinkIcon';
import { TextIcon } from '@components/icons/TextIcon';
import { ImageIcon } from '@components/icons/ImageIcon';
import { VideoIcon } from '@components/icons/VideoIcon';
import { FileIcon } from '@components/icons/FileIcon';

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function timeUntilExpiry(expiresAt: number): string {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return 'Expired';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return `Expires in ${days}d ${hours}h`;
  if (hours > 0) return `Expires in ${hours}h`;
  return 'Expires soon';
}

function getItemIcon(item: CacheItem) {
  switch (item.type) {
    case 'text':
      return <TextIcon className='h-4 w-4 shrink-0 text-foreground/50' />;
    case 'link':
      return <LinkIcon className='h-4 w-4 shrink-0 text-foreground/50' />;
    case 'image':
      return <ImageIcon className='h-4 w-4 shrink-0 text-foreground/50' />;
    case 'video':
      return <VideoIcon className='h-4 w-4 shrink-0 text-foreground/50' />;
    default:
      return <FileIcon className='h-4 w-4 shrink-0 text-foreground/50' />;
  }
}

function CacheItemView({ item }: { item: CacheItem }) {
  if (item.type === 'text') {
    return (
      <div className='rounded-lg border border-foreground/10 p-3'>
        <div className='mb-1 flex items-center gap-1.5'>
          <TextIcon className='h-3.5 w-3.5 text-foreground/40' />
          <span className='text-xs font-medium text-foreground/40'>Text</span>
        </div>
        <p className='whitespace-pre-wrap text-sm text-foreground/80'>
          {item.content}
        </p>
      </div>
    );
  }

  if (item.type === 'link') {
    return (
      <div className='rounded-lg border border-foreground/10 p-3'>
        <div className='mb-1 flex items-center gap-1.5'>
          <LinkIcon className='h-3.5 w-3.5 text-foreground/40' />
          <span className='text-xs font-medium text-foreground/40'>Link</span>
        </div>
        <a
          href={item.content}
          target='_blank'
          rel='noopener noreferrer'
          className='text-sm text-primary underline-offset-2 hover:underline'
        >
          {item.content}
        </a>
      </div>
    );
  }

  if (item.type === 'image' && item.downloadURL) {
    return (
      <div className='rounded-lg border border-foreground/10 p-3'>
        <div className='mb-2 flex items-center gap-1.5'>
          <ImageIcon className='h-3.5 w-3.5 text-foreground/40' />
          <span className='text-xs font-medium text-foreground/40'>
            {item.fileName}
          </span>
        </div>
        <img
          src={item.downloadURL}
          alt={item.fileName || 'Image'}
          className='max-h-64 rounded-md object-contain'
          loading='lazy'
        />
      </div>
    );
  }

  if (item.type === 'video' && item.downloadURL) {
    return (
      <div className='rounded-lg border border-foreground/10 p-3'>
        <div className='mb-2 flex items-center gap-1.5'>
          <VideoIcon className='h-3.5 w-3.5 text-foreground/40' />
          <span className='text-xs font-medium text-foreground/40'>
            {item.fileName}
          </span>
        </div>
        <video
          src={item.downloadURL}
          controls
          className='max-h-64 w-full rounded-md'
          preload='metadata'
        />
      </div>
    );
  }

  // Generic file
  return (
    <div className='rounded-lg border border-foreground/10 p-3'>
      <div className='flex items-center gap-2'>
        {getItemIcon(item)}
        <span className='min-w-0 flex-1 truncate text-sm'>
          {item.fileName || 'File'}
        </span>
        {item.downloadURL && (
          <a
            href={item.downloadURL}
            target='_blank'
            rel='noopener noreferrer'
            className='shrink-0 text-xs font-medium text-primary hover:underline'
          >
            Download
          </a>
        )}
      </div>
    </div>
  );
}

export function ViewCache() {
  const { cacheId } = useParams<{ cacheId: string }>();
  const navigate = useNavigate();
  const [cache, setCache] = useState<Cache | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cacheId) {
      setError('No cache ID provided.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const data = await getCache(cacheId);
        if (cancelled) return;

        if (!data) {
          setError('Cache not found. It may have expired or been deleted.');
        } else if (data.expiresAt < Date.now()) {
          setError('This cache has expired.');
        } else {
          setCache(data);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load cache.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cacheId]);

  if (loading) {
    return (
      <div className='flex items-center justify-center py-20'>
        <p className='text-sm text-foreground/50'>Loading cache...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className='mx-auto w-full max-w-md space-y-4 px-4 py-12 text-center'>
        <Callout variant='destructive' icon={null} description={error} />
        <Button variant='secondary' onClick={() => navigate('/')}>
          Go Home
        </Button>
      </div>
    );
  }

  if (!cache) return null;

  return (
    <div className='mx-auto w-full max-w-md space-y-6 px-4 py-8'>
      {/* Header */}
      <div className='space-y-1'>
        <h1 className='text-2xl font-bold'>{cache.title}</h1>
        <p className='text-xs text-foreground/50'>
          Shared by {cache.creatorName} · {formatDate(cache.createdAt)} ·{' '}
          {timeUntilExpiry(cache.expiresAt)}
        </p>
      </div>

      {/* Items */}
      <div className='space-y-3'>
        {cache.items.map((item) => (
          <CacheItemView key={item.id} item={item} />
        ))}
      </div>

      {/* Back */}
      <Button variant='tertiary' onClick={() => navigate('/')} className='w-full'>
        Go Home
      </Button>
    </div>
  );
}

export default ViewCache;
