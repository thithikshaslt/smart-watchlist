import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/test/render'
import { server } from '@/test/msw-server'
import WatchlistsListPage from './WatchlistsListPage'
import type { WatchlistWithItems } from './types'

const techWatchlist: WatchlistWithItems = {
  id: 'wl-1',
  userId: 'user-1',
  name: 'Tech',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  items: [],
}

describe('WatchlistsListPage', () => {
  it("shows the user's watchlists", async () => {
    server.use(
      http.get('http://localhost:3000/watchlists', () =>
        HttpResponse.json([techWatchlist]),
      ),
    )

    renderWithProviders(<WatchlistsListPage />)

    await waitFor(() => expect(screen.getByText('Tech')).toBeInTheDocument())
  })

  it('shows an empty state that lets the user create their first watchlist', async () => {
    server.use(
      http.get('http://localhost:3000/watchlists', () => HttpResponse.json([])),
    )

    renderWithProviders(<WatchlistsListPage />)

    await waitFor(() =>
      expect(
        screen.getByText("You don't have any watchlists yet. Create one above to get started."),
      ).toBeInTheDocument(),
    )
    expect(screen.getByLabelText('New watchlist name')).toBeInTheDocument()
  })

  it('creates a watchlist and shows it in the list', async () => {
    server.use(
      http.get('http://localhost:3000/watchlists', () => HttpResponse.json([])),
      http.post('http://localhost:3000/watchlists', () =>
        HttpResponse.json(techWatchlist, { status: 201 }),
      ),
    )
    const user = userEvent.setup()
    renderWithProviders(<WatchlistsListPage />)
    await waitFor(() =>
      expect(screen.getByLabelText('New watchlist name')).toBeInTheDocument(),
    )

    server.use(
      http.get('http://localhost:3000/watchlists', () =>
        HttpResponse.json([techWatchlist]),
      ),
    )
    await user.type(screen.getByLabelText('New watchlist name'), 'Tech')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => expect(screen.getByText('Tech')).toBeInTheDocument())
  })

  it('shows an inline validation error for an empty name without creating a watchlist', async () => {
    server.use(
      http.get('http://localhost:3000/watchlists', () => HttpResponse.json([])),
    )
    const user = userEvent.setup()
    renderWithProviders(<WatchlistsListPage />)
    await waitFor(() =>
      expect(screen.getByLabelText('New watchlist name')).toBeInTheDocument(),
    )

    await user.click(screen.getByRole('button', { name: 'Create' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Enter a watchlist name up to 100 characters long.',
    )
  })
})
