import type { Instrument } from '@/instruments/useInstrumentSearch'

export const VIEW_LENS_METRICS = [
  'price',
  'dollarChange',
  'percentChange',
  'dayRange',
  'volume',
  'freshness',
] as const

export type ViewLensMetric = (typeof VIEW_LENS_METRICS)[number]

// What renders when a watchlist has no configured lens (PriceBadge's current
// behavior). Customizing from that default should feel like adding to it,
// not replacing it wholesale - see useWatchlistViewLens.
export const DEFAULT_VIEW_LENS_METRICS: ViewLensMetric[] = [
  'price',
  'dollarChange',
  'percentChange',
  'freshness',
]

export interface Watchlist {
  id: string
  userId: string
  name: string
  createdAt: string
  updatedAt: string
  /** Absent/null means "use the default view" - unset until a user customizes it. */
  viewLens?: ViewLensMetric[] | null
  lastViewedAt?: string | null
}

export interface WatchlistItem {
  id: string
  watchlistId: string
  instrumentId: string
  position: number
  createdAt: string
  instrument: Instrument
}

export interface WatchlistWithItems extends Watchlist {
  items: WatchlistItem[]
}
