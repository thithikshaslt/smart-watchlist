import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/render'
import { server } from '@/test/msw-server'
import InstrumentSearch from './InstrumentSearch'
import type { Instrument } from './useInstrumentSearch'

const aapl: Instrument = {
  id: 'inst-aapl',
  symbol: 'AAPL',
  name: 'Apple Inc.',
  exchange: 'NASDAQ',
  providerSymbol: 'AAPL',
  createdAt: new Date().toISOString(),
}
const msft: Instrument = {
  id: 'inst-msft',
  symbol: 'MSFT',
  name: 'Microsoft Corporation',
  exchange: 'NASDAQ',
  providerSymbol: 'MSFT',
  createdAt: new Date().toISOString(),
}

describe('InstrumentSearch', () => {
  it('displays matching results', async () => {
    server.use(
      http.get('http://localhost:3000/instruments/search', () =>
        HttpResponse.json([aapl]),
      ),
    )
    const user = userEvent.setup()
    renderWithProviders(
      <InstrumentSearch watchlistId="wl-1" existingInstrumentIds={[]} />,
    )

    await user.type(screen.getByLabelText('Search instruments'), 'AAPL')

    await waitFor(() => expect(screen.getByText('AAPL')).toBeInTheDocument())
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument()
  })

  it('shows an explicit empty state for no matches', async () => {
    server.use(
      http.get('http://localhost:3000/instruments/search', () =>
        HttpResponse.json([]),
      ),
    )
    const user = userEvent.setup()
    renderWithProviders(
      <InstrumentSearch watchlistId="wl-1" existingInstrumentIds={[]} />,
    )

    await user.type(screen.getByLabelText('Search instruments'), 'zzz')

    await waitFor(() =>
      expect(screen.getByText('No instruments found.')).toBeInTheDocument(),
    )
  })

  it('does not call the API or show an API error for a below-minimum-length query', async () => {
    const searchHandler = vi.fn()
    server.use(
      http.get('http://localhost:3000/instruments/search', () => {
        searchHandler()
        return HttpResponse.json([])
      }),
    )
    const user = userEvent.setup()
    renderWithProviders(
      <InstrumentSearch watchlistId="wl-1" existingInstrumentIds={[]} />,
    )

    await user.type(screen.getByLabelText('Search instruments'), 'a')

    await waitFor(() =>
      expect(screen.getByText('Keep typing to search…')).toBeInTheDocument(),
    )
    expect(searchHandler).not.toHaveBeenCalled()
  })

  it('adds a result and clears the search, ready for the next lookup', async () => {
    server.use(
      http.get('http://localhost:3000/instruments/search', () =>
        HttpResponse.json([msft]),
      ),
      http.post('http://localhost:3000/watchlists/wl-1/items', () =>
        HttpResponse.json({ id: 'wl-1', items: [] }, { status: 201 }),
      ),
    )
    const user = userEvent.setup()
    renderWithProviders(
      <InstrumentSearch watchlistId="wl-1" existingInstrumentIds={[]} />,
    )
    const input = screen.getByLabelText('Search instruments')

    await user.type(input, 'MSFT')
    await waitFor(() => expect(screen.getByText('MSFT')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Add' }))

    // The field resets on its own - the next search shouldn't require
    // backspacing out what was just typed.
    await waitFor(() => expect(input).toHaveValue(''))
    await waitFor(() => expect(screen.queryByText('MSFT')).not.toBeInTheDocument())
  })

  it('marks an already-added instrument and does not allow re-adding it', async () => {
    server.use(
      http.get('http://localhost:3000/instruments/search', () =>
        HttpResponse.json([aapl]),
      ),
    )
    const user = userEvent.setup()
    renderWithProviders(
      <InstrumentSearch watchlistId="wl-1" existingInstrumentIds={[aapl.id]} />,
    )

    await user.type(screen.getByLabelText('Search instruments'), 'AAPL')

    await waitFor(() => expect(screen.getByText('AAPL')).toBeInTheDocument())
    expect(screen.getByText('Already added')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add' })).not.toBeInTheDocument()
  })
})
