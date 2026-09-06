import { DEFAULT_VIEW_LENS_METRICS, type ViewLensMetric } from '@/watchlists/types'
import { Badge } from '@/components/ui/badge'
import { useQuote } from './useQuote'

interface PriceBadgeProps {
  instrumentId: string
  /** null/omitted = today's default view (price, $/% change, freshness). */
  viewLens?: ViewLensMetric[] | null
}

function PriceBadge({ instrumentId, viewLens }: PriceBadgeProps) {
  const { data, isLoading, isError } = useQuote(instrumentId)
  const metrics = viewLens ?? DEFAULT_VIEW_LENS_METRICS

  if (isLoading) {
    return <span className="text-sm text-muted-foreground">Loading…</span>
  }
  if (isError) {
    return <span className="text-sm text-destructive">Price unavailable</span>
  }
  if (!data || !data.available || !data.quote) {
    return <span className="text-sm text-muted-foreground">No data yet</span>
  }

  const { quote } = data
  const isFresh = quote.freshness === 'current'
  const isUp = quote.change >= 0
  const changeClass = isUp ? 'text-emerald-500' : 'text-rose-500'
  const sign = isUp ? '+' : ''
  const showDollarChange = metrics.includes('dollarChange')
  const showPercentChange = metrics.includes('percentChange')

  return (
    <div className="flex flex-col items-end gap-0.5">
      <div className="flex items-baseline gap-2">
        {metrics.includes('price') && (
          <span className="text-base font-semibold tabular-nums">
            ${quote.price.toFixed(2)}
          </span>
        )}
        {(showDollarChange || showPercentChange) && (
          <span className={`text-sm tabular-nums ${changeClass}`}>
            {showDollarChange && `${sign}${quote.change.toFixed(2)}`}
            {showDollarChange && showPercentChange && ' '}
            {showPercentChange && `(${sign}${quote.changePercent.toFixed(2)}%)`}
          </span>
        )}
      </div>
      {(metrics.includes('dayRange') ||
        metrics.includes('volume') ||
        (metrics.includes('freshness') && !isFresh)) && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {metrics.includes('dayRange') &&
            (quote.dayRange ? (
              <span>
                Range: ${quote.dayRange.low.toFixed(2)}–${quote.dayRange.high.toFixed(2)}
              </span>
            ) : (
              <span>Range: n/a</span>
            ))}
          {metrics.includes('volume') &&
            (quote.volume !== null ? (
              <span>Vol: {quote.volume.toLocaleString('en-US')}</span>
            ) : (
              <span>Vol: n/a</span>
            ))}
          {metrics.includes('freshness') && !isFresh && (
            <Badge variant="outline" className="text-xs">
              {quote.freshness === 'delayed' ? 'Delayed' : 'Stale'}
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}

export default PriceBadge
