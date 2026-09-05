import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/test/render'
import { server } from '@/test/msw-server'
import WatchlistDetailPage from './WatchlistDetailPage'
import type { WatchlistWithItems } from './types'

const watchlistWithItems: WatchlistWithItems = {
  id: 'wl-1',
  userId: 'user-1',
  name: 'Tech',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  items: [
    {
      id: 'item-1',
      watchlistId: 'wl-1',
      instrumentId: 'inst-aapl',
      position: 0,
      createdAt: new Date().toISOString(),
      instrument: {
        id: 'inst-aapl',
        symbol: 'AAPL',
        name: 'Apple Inc.',
        exchange: 'NASDAQ',
        providerSymbol: 'AAPL',
        createdAt: new Date().toISOString(),
      },
    },
  ],
}

const emptyWatchlist: WatchlistWithItems = { ...watchlistWithItems, items: [] }

function renderDetailRoute(path = '/watchlists/wl-1') {
  return renderWithProviders(
    <Routes>
      <Route path="/watchlists/:id" element={<WatchlistDetailPage />} />
      <Route path="/watchlists" element={<div>Watchlists list view</div>} />
    </Routes>,
    { initialEntries: [path] },
  )
}

function mockQuote(available = false) {
  server.use(
    http.get('http://localhost:3000/instruments/:id/quote', () =>
      HttpResponse.json({ available, quote: null }),
    ),
  )
}

describe('WatchlistDetailPage', () => {
  it("shows the watchlist's items with symbol, name, and price", async () => {
    server.use(
      http.get('http://localhost:3000/watchlists/wl-1', () =>
        HttpResponse.json(watchlistWithItems),
      ),
    )
    mockQuote()

    renderDetailRoute()

    await waitFor(() => expect(screen.getByText('AAPL')).toBeInTheDocument())
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('No data yet')).toBeInTheDocument())
  })

  it('shows an empty state with a way to add an instrument', async () => {
    server.use(
      http.get('http://localhost:3000/watchlists/wl-1', () =>
        HttpResponse.json(emptyWatchlist),
      ),
    )

    renderDetailRoute()

    await waitFor(() =>
      expect(
        screen.getByText('This watchlist has no instruments yet. Search below to add one.'),
      ).toBeInTheDocument(),
    )
    expect(screen.getByLabelText('Search instruments')).toBeInTheDocument()
  })

  it('removes an item without requiring a manual reload', async () => {
    server.use(
      http.get('http://localhost:3000/watchlists/wl-1', () =>
        HttpResponse.json(watchlistWithItems),
      ),
      http.delete('http://localhost:3000/watchlists/wl-1/items/inst-aapl', () =>
        new HttpResponse(null, { status: 204 }),
      ),
    )
    mockQuote()
    const user = userEvent.setup()
    renderDetailRoute()
    await waitFor(() => expect(screen.getByText('AAPL')).toBeInTheDocument())

    server.use(
      http.get('http://localhost:3000/watchlists/wl-1', () =>
        HttpResponse.json(emptyWatchlist),
      ),
    )
    await user.click(screen.getByRole('button', { name: 'Remove' }))

    await waitFor(() => expect(screen.queryByText('AAPL')).not.toBeInTheDocument())
  })

  it('shows a not-found state for a watchlist the user does not own or that does not exist', async () => {
    server.use(
      http.get('http://localhost:3000/watchlists/wl-missing', () =>
        HttpResponse.json(
          { statusCode: 404, message: 'Watchlist wl-missing not found', error: 'Not Found' },
          { status: 404 },
        ),
      ),
    )

    renderDetailRoute('/watchlists/wl-missing')

    await waitFor(() =>
      expect(screen.getByText('Watchlist not found.')).toBeInTheDocument(),
    )
  })
})
