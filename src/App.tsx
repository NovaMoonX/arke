import { DreamerUIProvider } from '@moondreamsdev/dreamer-ui/providers';
import { RouterProvider } from 'react-router-dom';
import { router } from '@routes/AppRoutes';
import { SessionProvider } from '@contexts/SessionContext';
import { AuthProvider } from '@contexts/AuthContext';

function App() {
  return (
    <DreamerUIProvider>
      <AuthProvider>
        <SessionProvider>
          <RouterProvider router={router} />
        </SessionProvider>
      </AuthProvider>
    </DreamerUIProvider>
  );
}

export default App;
