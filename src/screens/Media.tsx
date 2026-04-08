import { useNavigate } from 'react-router-dom';
import { Button } from '@moondreamsdev/dreamer-ui/components';
import { ChevronLeft } from '@moondreamsdev/dreamer-ui/symbols';
import { useSessionContext } from '@hooks/useSessionContext';
import { MediaGallery } from '@components/MediaGallery';

function Media() {
  const { session } = useSessionContext();
  const navigate = useNavigate();

  if (!session) {
    return (
      <div className='page flex flex-col items-center justify-center' role='alert'>
        <p className='text-foreground/60'>No active session.</p>
        <Button
          variant='secondary'
          className='mt-4'
          onClick={() => navigate('/')}
          aria-label='Go to home page'
        >
          Go Home
        </Button>
      </div>
    );
  }

  return (
    <div className='page flex flex-col overflow-y-auto'>
      <div className='mx-auto w-full max-w-md space-y-4 px-4 py-8'>
        <div className='flex items-center gap-2'>
          <Button
            size='sm'
            variant='secondary'
            onClick={() => navigate('/')}
            aria-label='Back to home'
          >
            <ChevronLeft className='h-4 w-4' />
          </Button>
          <h1 className='text-xl font-bold'>Shared Media</h1>
        </div>

        <MediaGallery />
      </div>
    </div>
  );
}

export default Media;
