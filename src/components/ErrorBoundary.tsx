import { ErrorBoundary as DreamerErrorBoundary } from '@moondreamsdev/dreamer-ui/components';
import type { ReactNode } from 'react';
import { logger } from '@utils/logger';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

/**
 * Top-level error boundary that wraps the entire app.
 * Uses the Dreamer UI ErrorBoundary with app-specific configuration.
 */
export function AppErrorBoundary({ children }: AppErrorBoundaryProps) {
  return (
    <DreamerErrorBoundary
      showRetry
      fallbackMessage='Something went wrong. Please reload the page or try again.'
      onRetry={() => window.location.reload()}
      onError={(error, errorInfo) => {
        logger.error('ErrorBoundary', error.message, {
          stack: error.stack,
          componentStack: errorInfo.componentStack,
        });
      }}
      inDevEnv={import.meta.env.DEV}
    >
      {children}
    </DreamerErrorBoundary>
  );
}
