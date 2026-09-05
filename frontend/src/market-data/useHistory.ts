import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

// Matches the backend's supported ranges (specs/market-data/spec.md).
export type HistoryRange = '1d' | '5d' | '1m' | '3m' | '6m' | '1y' | '5y'

export interface Candle {
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

// Intraday candles ingest every 5 minutes (design.md); poll somewhat more
// often than that so a newly-available range appears without a manual
// reload, without refetching on every render.
const HISTORY_REFETCH_INTERVAL_MS = 60_000

export function useHistory(instrumentId: string, range: HistoryRange) {
  return useQuery({
    queryKey: ['history', instrumentId, range],
    queryFn: () =>
      apiClient.get<Candle[]>(`/instruments/${instrumentId}/history`, { range }),
    refetchInterval: HISTORY_REFETCH_INTERVAL_MS,
  })
}
