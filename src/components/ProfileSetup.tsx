import { useState, type FormEvent } from 'react';
import { Button, Input, Callout } from '@moondreamsdev/dreamer-ui/components';
import { useAuthContext } from '@hooks/useAuthContext';

export function ProfileSetup() {
  const { user, completeProfile, error } = useAuthContext();
  const [displayName, setDisplayName] = useState(
    user?.displayName || '',
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const trimmed = displayName.trim();
    if (!trimmed) return;

    setSaving(true);
    await completeProfile(trimmed);
    setSaving(false);
  };

  return (
    <div className='mx-auto w-full max-w-sm space-y-6 px-4 py-12 text-center'>
      <div className='space-y-2'>
        <span className='text-5xl' role='img' aria-label='Wave'>
          👋
        </span>
        <h2 className='text-2xl font-bold'>Welcome!</h2>
        <p className='text-sm text-foreground/60'>
          Set up your display name to get started.
        </p>
      </div>

      {error && <Callout variant='destructive' icon={null} description={error} />}

      <form onSubmit={handleSubmit} className='space-y-4'>
        <Input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder='Your display name'
          maxLength={50}
          aria-label='Display name'
          autoFocus
        />
        <Button
          type='submit'
          disabled={!displayName.trim() || saving}
          className='w-full'
        >
          {saving ? 'Saving...' : 'Continue'}
        </Button>
      </form>
    </div>
  );
}
