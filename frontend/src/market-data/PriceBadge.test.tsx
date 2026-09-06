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
  dayRange: { high: 152, low: 148.5 },
  volume: 1_234_567,
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

  it('defaults to price, change, and freshness when no lens is configured', async () => {
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
    expect(screen.queryByText(/Vol:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Range:/)).not.toBeInTheDocument()
  })

  it('renders only the metrics selected by a customized lens', async () => {
    const response: QuoteResponse = {
      available: true,
      quote: { ...baseQuote, freshness: 'delayed' },
    }
    server.use(
      http.get('http://localhost:3000/instruments/inst-1/quote', () =>
        HttpResponse.json(response),
      ),
    )

    renderWithProviders(
      <PriceBadge instrumentId="inst-1" viewLens={['volume', 'dayRange']} />,
    )

    await waitFor(() =>
      expect(screen.getByText('Vol: 1,234,567')).toBeInTheDocument(),
    )
    expect(screen.getByText('Range: $148.50–$152.00')).toBeInTheDocument()
    expect(screen.queryByText('$150.25')).not.toBeInTheDocument()
    expect(screen.queryByText('Delayed')).not.toBeInTheDocument()
  })
})
