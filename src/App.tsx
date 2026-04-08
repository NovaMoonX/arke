import { DreamerUIProvider } from '@moondreamsdev/dreamer-ui/providers';
import { RouterProvider } from 'react-router-dom';
import { router } from '@routes/AppRoutes';
import { SessionProvider } from '@contexts/SessionContext';
import { AppErrorBoundary } from '@components/ErrorBoundary';
import { NetworkBanner } from '@components/NetworkBanner';

function App() {
  return (
    <DreamerUIProvider>
      <AppErrorBoundary>
        <NetworkBanner />
        <SessionProvider>
          <RouterProvider router={router} />
        </SessionProvider>
      </AppErrorBoundary>
    </DreamerUIProvider>
  );
}

export default App;
