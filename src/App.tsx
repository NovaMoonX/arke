import { DreamerUIProvider } from '@moondreamsdev/dreamer-ui/providers';
import { RouterProvider } from 'react-router-dom';
import { router } from '@routes/AppRoutes';
import { SessionProvider } from '@contexts/SessionContext';

function App() {
  return (
    <DreamerUIProvider>
      <SessionProvider>
        <RouterProvider router={router} />
      </SessionProvider>
    </DreamerUIProvider>
  );
}

export default App;
