import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export interface Instrument {
  id: string
  symbol: string
  name: string
  exchange: string
  providerSymbol: string
  createdAt: string
}

// Matches the backend's MIN_SEARCH_QUERY_LENGTH (specs/instruments/spec.md).
export const MIN_SEARCH_QUERY_LENGTH = 2

export function useInstrumentSearch(query: string) {
  const trimmed = query.trim()

  return useQuery({
    queryKey: ['instruments', 'search', trimmed],
    queryFn: () => apiClient.get<Instrument[]>('/instruments/search', { q: trimmed }),
    enabled: trimmed.length >= MIN_SEARCH_QUERY_LENGTH,
  })
}
