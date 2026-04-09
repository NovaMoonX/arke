import { createBrowserRouter } from 'react-router-dom';
import { RouteError } from '@components/RouteError';

import Home from '@screens/Home';
import Layout from '@ui/Layout';
import Loading from '@ui/Loading';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      // About page (lazy loaded)
      {
        path: 'about',
        HydrateFallback: Loading,
        lazy: async () => {
          const { default: About } = await import('@screens/About');
          return { Component: About };
        },
      },
      // Media gallery (lazy loaded)
      {
        path: 'media',
        HydrateFallback: Loading,
        lazy: async () => {
          const { default: Media } = await import('@screens/Media');
          return { Component: Media };
        },
      },
      // Join session by PIN (lazy loaded)
      {
        path: 'join/:pin',
        HydrateFallback: Loading,
        lazy: async () => {
          const { default: Join } = await import('@screens/Join');
          return { Component: Join };
        },
      },
    ],
  },
]);
