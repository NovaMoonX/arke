import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@moondreamsdev/dreamer-ui/components';
import { Trash } from '@moondreamsdev/dreamer-ui/symbols';
import { join } from '@moondreamsdev/dreamer-ui/utils';
import { useActionModal } from '@moondreamsdev/dreamer-ui/hooks';
import { useAuthContext } from '@hooks/useAuthContext';
import { getUserCaches, deleteCache } from '@lib/firebase/caches';
import { CachePromotion } from '@components/CachePromotion';
import { ProfileSetup } from '@components/ProfileSetup';
import type { Cache } from '@lib/types';

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

  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h left`;
  return 'Expires soon';
}

export function MyCaches() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, needsProfile } = useAuthContext();
  const { confirm } = useActionModal();
  const [caches, setCaches] = useState<Cache[]>([]);
  const [loading, setLoading] = useState(() => !!profile);
  const [fetchedAt, setFetchedAt] = useState(() => Date.now());

  useEffect(() => {
    if (!profile) return;

    let cancelled = false;

    getUserCaches(profile.uid).then((data) => {
      if (cancelled) return;
      setCaches(data);
      setFetchedAt(Date.now());
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [profile]);

  const handleDelete = useCallback(
    async (cacheId: string, title: string) => {
      const confirmed = await confirm({
        title: 'Delete Cache',
        message: `Are you sure you want to delete "${title}"? This cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        destructive: true,
      });

      if (confirmed) {
        await deleteCache(cacheId);
        setCaches((prev) => prev.filter((c) => c.id !== cacheId));
      }
    },
    [confirm],
  );

  // Show loading while auth is resolving
  if (authLoading) {
    return (
      <div className='flex items-center justify-center py-20'>
        <p className='text-sm text-foreground/50'>Loading...</p>
      </div>
    );
  }

  // Show sign-in promotion for unauthenticated users
  if (!user || user.isAnonymous) {
    return (
      <div className='flex flex-col items-center justify-center px-4 py-12'>
        <CachePromotion />
      </div>
    );
  }

  // Show profile setup for new users
  if (needsProfile) {
    return <ProfileSetup />;
  }

  return (
    <div className='mx-auto w-full max-w-md space-y-6 px-4 py-8'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>My Caches</h1>
        <Button size='sm' onClick={() => navigate('/cache/new')}>
          + New Cache
        </Button>
      </div>

      {loading ? (
        <p className='py-8 text-center text-sm text-foreground/50'>
          Loading caches...
        </p>
      ) : caches.length === 0 ? (
        <div className='space-y-4 py-8 text-center'>
          <span className='text-4xl' role='img' aria-label='Empty box'>
            📦
          </span>
          <p className='text-sm text-foreground/60'>
            You haven't created any caches yet.
          </p>
          <Button onClick={() => navigate('/cache/new')}>
            Create Your First Cache
          </Button>
        </div>
      ) : (
        <div className='space-y-2'>
          {caches.map((cache) => {
            const expired = cache.expiresAt < fetchedAt;

            return (
              <div
                key={cache.id}
                className={join(
                  'flex items-center gap-3 rounded-lg border border-foreground/10 px-4 py-3',
                  expired && 'opacity-50',
                )}
              >
                <button
                  onClick={() => navigate(`/cache/${cache.id}`)}
                  className='min-w-0 flex-1 text-left'
                >
                  <p className='truncate text-sm font-medium'>{cache.title}</p>
                  <p className='text-xs text-foreground/50'>
                    {cache.items.length}{' '}
                    {cache.items.length === 1 ? 'item' : 'items'} ·{' '}
                    {expired ? 'Expired' : timeUntilExpiry(cache.expiresAt)} ·{' '}
                    {formatDate(cache.createdAt)}
                  </p>
                </button>
                <button
                  onClick={() => handleDelete(cache.id, cache.title)}
                  className='shrink-0 rounded p-1.5 text-foreground/40 hover:bg-foreground/10 hover:text-foreground/70'
                  aria-label={`Delete ${cache.title}`}
                >
                  <Trash className='h-4 w-4' />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <Button
        variant='tertiary'
        onClick={() => navigate('/')}
        className='w-full'
      >
        Back to Home
      </Button>
    </div>
  );
}

export default MyCaches;
