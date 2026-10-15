import { createBrowserRouter } from 'react-router'
import { applets } from './applets/registry.ts'
import AppletPage from './components/AppletPage.tsx'
import Layout from './components/Layout.tsx'
import Home from './pages/Home.tsx'
import NotFound from './pages/NotFound.tsx'

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      ...applets.map((applet) => ({
        path: `apps/${applet.slug}`,
        element: <AppletPage applet={applet} />,
      })),
      { path: '*', element: <NotFound /> },
    ],
  },
])
