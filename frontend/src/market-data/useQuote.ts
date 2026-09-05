import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export type Freshness = 'current' | 'delayed' | 'stale'

export interface Quote {
  instrumentId: string
  price: number
  change: number
  changePercent: number
  providerTimestamp: string
  ingestedAt: string
  freshness: Freshness
}

export interface QuoteResponse {
  available: boolean
  quote: Quote | null
}

// Backend ingestion is a rate-limited, best-effort queue (design.md), so a
// quote can go from unavailable to available - or get a fresher price - at
// any time without any user action. Poll so that shows up without a manual
// reload (docs/architecture.md: "the frontend periodically requests updated
// data through the API using TanStack Query").
const QUOTE_REFETCH_INTERVAL_MS = 30_000

export function useQuote(instrumentId: string) {
  return useQuery({
    queryKey: ['quote', instrumentId],
    queryFn: () => apiClient.get<QuoteResponse>(`/instruments/${instrumentId}/quote`),
    refetchInterval: QUOTE_REFETCH_INTERVAL_MS,
  })
}
