import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/test/render'
import { server } from '@/test/msw-server'
import PriceBadge from './PriceBadge'
import type { QuoteResponse } from './useQuote'

const baseQuote = {
  instrumentId: 'inst-1',
  price: 150.25,
  change: 1.5,
  changePercent: 1.01,
  providerTimestamp: new Date().toISOString(),
  ingestedAt: new Date().toISOString(),
}

describe('PriceBadge', () => {
  it('displays a current quote without a staleness warning', async () => {
    const response: QuoteResponse = {
      available: true,
      quote: { ...baseQuote, freshness: 'current' },
    }
    server.use(
      http.get('http://localhost:3000/instruments/inst-1/quote', () =>
        HttpResponse.json(response),
      ),
    )

    renderWithProviders(<PriceBadge instrumentId="inst-1" />)

    await waitFor(() => expect(screen.getByText('$150.25')).toBeInTheDocument())
    expect(screen.queryByText('Delayed')).not.toBeInTheDocument()
    expect(screen.queryByText('Stale')).not.toBeInTheDocument()
  })

  it('shows the last known price with a visible staleness indicator when delayed', async () => {
    const response: QuoteResponse = {
      available: true,
      quote: { ...baseQuote, freshness: 'delayed' },
    }
    server.use(
      http.get('http://localhost:3000/instruments/inst-1/quote', () =>
        HttpResponse.json(response),
      ),
    )

    renderWithProviders(<PriceBadge instrumentId="inst-1" />)

    await waitFor(() => expect(screen.getByText('$150.25')).toBeInTheDocument())
    expect(screen.getByText('Delayed')).toBeInTheDocument()
  })

  it('shows the last known price with a visible staleness indicator when stale', async () => {
    const response: QuoteResponse = {
      available: true,
      quote: { ...baseQuote, freshness: 'stale' },
    }
    server.use(
      http.get('http://localhost:3000/instruments/inst-1/quote', () =>
        HttpResponse.json(response),
      ),
    )

    renderWithProviders(<PriceBadge instrumentId="inst-1" />)

    await waitFor(() => expect(screen.getByText('$150.25')).toBeInTheDocument())
    expect(screen.getByText('Stale')).toBeInTheDocument()
  })

  it('shows an explicit no-data state when the instrument has never been ingested', async () => {
    const response: QuoteResponse = { available: false, quote: null }
    server.use(
      http.get('http://localhost:3000/instruments/inst-1/quote', () =>
        HttpResponse.json(response),
      ),
    )

    renderWithProviders(<PriceBadge instrumentId="inst-1" />)

    await waitFor(() => expect(screen.getByText('No data yet')).toBeInTheDocument())
  })
})
