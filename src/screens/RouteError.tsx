import { useRouteError, Link } from 'react-router-dom';
import { Button } from '@moondreamsdev/dreamer-ui/components';
import { logger } from '@utils/logger';
import { APP_TITLE } from '@lib/app';

export default function RouteError() {
  const error = useRouteError();
  const message =
    error instanceof Error ? error.message : 'Something unexpected happened.';

  logger.error('RouteError', message, error);

  return (
    <div className='page flex flex-col items-center justify-center'>
      <div className='w-full max-w-md space-y-6 px-4 text-center'>
        <p className='text-6xl'>😵</p>
        <h1 className='text-3xl font-bold'>Oops!</h1>
        <p className='text-foreground/60'>
          Something went wrong while loading this page. Don&rsquo;t worry — you
          can head back and try again.
        </p>
        <Link to='/'>
          <Button className='w-full'>Back to {APP_TITLE}</Button>
        </Link>
      </div>
    </div>
  );
}
