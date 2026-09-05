import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/msw-server'
import { useWatchlistReorder } from './useWatchlistReorder'
import type { WatchlistItem } from './types'

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

function buildItem(instrumentId: string, position: number): WatchlistItem {
  return {
    id: `item-${instrumentId}`,
    watchlistId: 'wl-1',
    instrumentId,
    position,
    createdAt: new Date().toISOString(),
    instrument: {
      id: instrumentId,
      symbol: instrumentId.toUpperCase(),
      name: `${instrumentId} Inc.`,
      exchange: 'NASDAQ',
      providerSymbol: instrumentId.toUpperCase(),
      createdAt: new Date().toISOString(),
    },
  }
}

const items = [buildItem('aapl', 0), buildItem('msft', 1)]

describe('useWatchlistReorder', () => {
  it('persists the new order and reflects it immediately', async () => {
    server.use(
      http.patch('http://localhost:3000/watchlists/wl-1/items/reorder', () =>
        HttpResponse.json({ id: 'wl-1', items: [] }),
      ),
    )
    const { result } = renderHook(() => useWatchlistReorder('wl-1', items), { wrapper })

    await act(async () => {
      await result.current.handleDragEnd({ active: { id: 'msft' }, over: { id: 'aapl' } })
    })

    expect(result.current.items.map((item) => item.instrumentId)).toEqual([
      'msft',
      'aapl',
    ])
  })

  it('reverts to the persisted order and surfaces an error when the reorder fails', async () => {
    server.use(
      http.patch('http://localhost:3000/watchlists/wl-1/items/reorder', () =>
        HttpResponse.json(
          { statusCode: 400, message: 'bad request', error: 'Bad Request' },
          { status: 400 },
        ),
      ),
    )
    const { result } = renderHook(() => useWatchlistReorder('wl-1', items), { wrapper })

    await act(async () => {
      await result.current.handleDragEnd({ active: { id: 'msft' }, over: { id: 'aapl' } })
    })

    expect(result.current.items.map((item) => item.instrumentId)).toEqual([
      'aapl',
      'msft',
    ])
    expect(result.current.isError).toBe(true)
  })

  it('does nothing when dropped on itself', async () => {
    const { result } = renderHook(() => useWatchlistReorder('wl-1', items), { wrapper })

    await act(async () => {
      await result.current.handleDragEnd({ active: { id: 'aapl' }, over: { id: 'aapl' } })
    })

    expect(result.current.items.map((item) => item.instrumentId)).toEqual([
      'aapl',
      'msft',
    ])
  })
})
