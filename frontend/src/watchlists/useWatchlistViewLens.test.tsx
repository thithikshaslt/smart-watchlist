import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/msw-server'
import { useWatchlistViewLens } from './useWatchlistViewLens'

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useWatchlistViewLens', () => {
  it('shows the persisted lens (or null for the default) until toggled', () => {
    const { result } = renderHook(() => useWatchlistViewLens('wl-1', null), { wrapper })
    expect(result.current.viewLens).toBeNull()
  })

  it('adds a metric on top of the default set rather than replacing it', async () => {
    server.use(
      http.patch('http://localhost:3000/watchlists/wl-1/view', () =>
        HttpResponse.json({
          id: 'wl-1',
          viewLens: ['price', 'dollarChange', 'percentChange', 'freshness', 'volume'],
        }),
      ),
    )
    const { result } = renderHook(() => useWatchlistViewLens('wl-1', null), { wrapper })

    await act(async () => {
      await result.current.toggleMetric('volume')
    })

    expect(result.current.viewLens).toEqual([
      'price',
      'dollarChange',
      'percentChange',
      'freshness',
      'volume',
    ])
  })

  it('reverts to the persisted lens when the save fails', async () => {
    server.use(
      http.patch('http://localhost:3000/watchlists/wl-1/view', () =>
        HttpResponse.json(
          { statusCode: 400, message: 'bad request', error: 'Bad Request' },
          { status: 400 },
        ),
      ),
    )
    const { result } = renderHook(() => useWatchlistViewLens('wl-1', null), { wrapper })

    await act(async () => {
      await result.current.toggleMetric('volume')
    })

    expect(result.current.viewLens).toBeNull()
    expect(result.current.isError).toBe(true)
  })

  it('removes an already-selected metric on toggle', async () => {
    server.use(
      http.patch('http://localhost:3000/watchlists/wl-1/view', () =>
        HttpResponse.json({ id: 'wl-1', viewLens: [] }),
      ),
    )
    // Declared outside the hook callback so it's the same reference across
    // re-renders, matching how a real caller gets it from the query cache
    // (see useWatchlistReorder.test.tsx's `items` for the same convention).
    const persisted: ('volume')[] = ['volume']
    const { result } = renderHook(
      () => useWatchlistViewLens('wl-1', persisted),
      { wrapper },
    )

    await act(async () => {
      await result.current.toggleMetric('volume')
    })

    expect(result.current.viewLens).toEqual([])
  })
})
