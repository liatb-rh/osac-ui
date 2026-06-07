import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@patternfly/patternfly/patternfly.css'
import '@patternfly/patternfly/patternfly-addons.css'
import './styles/global.css'
import App from './App'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

async function prepare(): Promise<void> {
  if (import.meta.env.VITE_MSW === 'true') {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { worker } = await import('./mocks/browser')
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await worker.start({
      serviceWorker: {
        url: `${import.meta.env.BASE_URL}mockServiceWorker.js`,
      },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      onUnhandledRequest(request: Request, print: { warning: () => void }) {
        // Navigation requests (HTML documents) are handled by Vite's dev server,
        // not MSW — silently ignore them to avoid "Failed to fetch" errors.
        if (request.headers.get('accept')?.includes('text/html')) return
        print.warning()
      },
    })
  }
}

prepare().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>,
  )
})
