import type { Instrument } from '@/instruments/useInstrumentSearch'

export interface Watchlist {
  id: string
  userId: string
  name: string
  createdAt: string
  updatedAt: string
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
