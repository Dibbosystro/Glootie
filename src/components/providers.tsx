'use client'

import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { ThemeProvider } from 'next-themes'
import { useState, type ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            // Keep cached data around long enough to survive reloads so the
            // localStorage persister can repaint instantly (stale-while-revalidate).
            gcTime: 24 * 60 * 60 * 1000,
            // Tab back into the app -> refetch anything stale so it feels live.
            refetchOnWindowFocus: true,
          },
        },
      })
  )

  // Persist the cache to localStorage so the Inbox (and other lists) paint the
  // last-known data the instant you open them, then revalidate in the background.
  // storage is undefined during SSR -> the persister no-ops, which is safe.
  const [persister] = useState(() =>
    createSyncStoragePersister({
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      key: 'glootie-rq-cache',
    })
  )

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister, maxAge: 24 * 60 * 60 * 1000, buster: 'v1' }}
      >
        {children}
      </PersistQueryClientProvider>
    </ThemeProvider>
  )
}
