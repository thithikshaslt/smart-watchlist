import { useState } from 'react'
import EmptyState from '@/components/EmptyState'
import ErrorState from '@/components/ErrorState'
import LoadingState from '@/components/LoadingState'
import PriceChart from './PriceChart'
import RangeSelector from './RangeSelector'
import { useHistory, type HistoryRange } from './useHistory'

interface PriceHistoryProps {
  instrumentId: string
}

// Ranges backed by daily candles, which only ingest once/day with no
// backfill (design.md) - so they can legitimately stay empty for days on a
// freshly-watchlisted instrument. Intraday-backed ranges (1d, 5d) fill in
// within minutes instead, so the empty-state message differs.
const DAILY_RANGES: HistoryRange[] = ['1m', '3m', '6m', '1y', '5y']

function PriceHistory({ instrumentId }: PriceHistoryProps) {
  const [range, setRange] = useState<HistoryRange>('1m')
  const { data: candles, isLoading, isError } = useHistory(instrumentId, range)

  const emptyMessage = DAILY_RANGES.includes(range)
    ? 'No historical data for this range yet - daily data is collected once a day, so this can take a few days to build up after adding an instrument.'
    : 'No historical data for this range yet - check back in a few minutes.'

  return (
    <div className="space-y-2">
      <RangeSelector value={range} onChange={setRange} />
      {isLoading && <LoadingState message="Loading chart…" />}
      {isError && <ErrorState message="Couldn't load price history." />}
      {candles && candles.length === 0 && <EmptyState message={emptyMessage} />}
      {candles && candles.length > 0 && <PriceChart candles={candles} />}
    </div>
  )
}

export default PriceHistory
