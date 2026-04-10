import { Button, Callout } from '@moondreamsdev/dreamer-ui/components';
import { useAuth } from '@hooks/useAuth';

/**
 * Promotion banner encouraging anonymous users to sign in
 * so they can use the Cache feature.
 */
export function CachePromotion() {
  const { signInWithGoogle, loading, error } = useAuth();

  return (
    <div className='mx-auto w-full max-w-md space-y-4 rounded-xl border border-foreground/10 p-5'>
      <div className='space-y-1 text-center'>
        <span className='text-3xl' role='img' aria-label='Package'>
          📦
        </span>
        <h3 className='text-lg font-semibold'>Arke Cache</h3>
        <p className='text-sm text-foreground/60'>
          Upload text, links, images, and files — then share a link with anyone.
          Caches auto-delete after 7 days.
        </p>
      </div>

      {error && (
        <Callout variant='destructive' icon={null} description={error} />
      )}

      <Button
        onClick={signInWithGoogle}
        disabled={loading}
        className='w-full'
        aria-label='Sign in with Google to create caches'
      >
        {loading ? 'Signing in...' : 'Sign in with Google'}
      </Button>

      <p className='text-center text-xs text-foreground/40'>
        A Google account is required to create and manage caches.
      </p>
    </div>
  );
}
