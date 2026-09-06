import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export type MoveClassification = 'normal' | 'broad-market' | 'notable' | 'insufficient-history'

export interface VisitItemResult {
  instrumentId: string
  classification: MoveClassification | null
}

export interface VisitResult {
  previousViewedAt: string | null
  items: VisitItemResult[]
  summary: { notableCount: number; broadMarketCount: number }
}

/**
 * Marks a watchlist visit and returns what changed since the previous one.
 * Deliberately a plain mutation triggered by the caller (once per genuine
 * page mount, see WatchlistDetailPage) rather than a polled query - the
 * backend watermark must only advance on an explicit visit action, never on
 * the routine background refresh that keeps prices current.
 */
export function useWatchlistVisit(watchlistId: string) {
  return useMutation({
    mutationFn: () => apiClient.post<VisitResult>(`/watchlists/${watchlistId}/visits`),
  })
}
