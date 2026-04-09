import { useRouteError } from 'react-router-dom';
import { Callout, Button } from '@moondreamsdev/dreamer-ui/components';
import { logger } from '@utils/logger';

export function RouteError() {
  const error = useRouteError();
  const message =
    error instanceof Error ? error.message : 'An unexpected error occurred.';

  logger.error('RouteError', message, error);

  return (
    <div className='page flex flex-col items-center justify-center'>
      <div className='w-full max-w-md space-y-4 px-4 text-center'>
        <Callout
          variant='destructive'
          title='Something went wrong'
          description={message}
        />
        <Button onClick={() => window.location.reload()} variant='secondary'>
          Reload Page
        </Button>
      </div>
    </div>
  );
}
