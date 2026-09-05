import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/render'
import { server } from '@/test/msw-server'
import PriceHistory from './PriceHistory'
import type { Candle } from './useHistory'

// Lightweight Charts renders to a real canvas with real layout, neither of
// which jsdom provides; PriceHistory's own logic (range selection, empty
// state) is what this file tests, not the third-party chart internals.
vi.mock('./PriceChart', () => ({
  default: () => <div data-testid="price-chart" />,
}))

const candle: Candle = {
  timestamp: new Date('2026-01-01').toISOString(),
  open: 10,
  high: 12,
  low: 9,
  close: 11,
  volume: 1000,
}

describe('PriceHistory', () => {
  it('renders the chart for the default range', async () => {
    server.use(
      http.get('http://localhost:3000/instruments/inst-1/history', () =>
        HttpResponse.json([candle]),
      ),
    )

    renderWithProviders(<PriceHistory instrumentId="inst-1" />)

    await waitFor(() =>
      expect(screen.getByTestId('price-chart')).toBeInTheDocument(),
    )
  })

  it('requests new history data when the range changes', async () => {
    let lastRange: string | null = null
    server.use(
      http.get('http://localhost:3000/instruments/inst-1/history', ({ request }) => {
        lastRange = new URL(request.url).searchParams.get('range')
        return HttpResponse.json([candle])
      }),
    )
    const user = userEvent.setup()
    renderWithProviders(<PriceHistory instrumentId="inst-1" />)
    await waitFor(() => expect(lastRange).toBe('1m'))

    await user.click(screen.getByRole('button', { name: '6m' }))

    await waitFor(() => expect(lastRange).toBe('6m'))
  })

  it('shows an explicit empty state when no history is available for a daily-backed range', async () => {
    server.use(
      http.get('http://localhost:3000/instruments/inst-1/history', () =>
        HttpResponse.json([]),
      ),
    )

    renderWithProviders(<PriceHistory instrumentId="inst-1" />)

    await waitFor(() =>
      expect(
        screen.getByText(/daily data is collected once a day/),
      ).toBeInTheDocument(),
    )
    expect(screen.queryByTestId('price-chart')).not.toBeInTheDocument()
  })

  it('shows a different empty-state message for an intraday-backed range', async () => {
    server.use(
      http.get('http://localhost:3000/instruments/inst-1/history', () =>
        HttpResponse.json([]),
      ),
    )
    const user = userEvent.setup()

    renderWithProviders(<PriceHistory instrumentId="inst-1" />)
    await waitFor(() =>
      expect(screen.getByText(/daily data is collected once a day/)).toBeInTheDocument(),
    )
    await user.click(screen.getByRole('button', { name: '1d' }))

    await waitFor(() =>
      expect(screen.getByText(/check back in a few minutes/)).toBeInTheDocument(),
    )
  })
})
