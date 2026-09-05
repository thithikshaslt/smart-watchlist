import { Badge } from '@/components/ui/badge'
import { useQuote } from './useQuote'

interface PriceBadgeProps {
  instrumentId: string
}

function formatChange(change: number, changePercent: number): string {
  const sign = change >= 0 ? '+' : ''
  return `${sign}${change.toFixed(2)} (${sign}${changePercent.toFixed(2)}%)`
}

function PriceBadge({ instrumentId }: PriceBadgeProps) {
  const { data, isLoading, isError } = useQuote(instrumentId)

  if (isLoading) {
    return <span className="text-sm text-muted-foreground">Loading price…</span>
  }
  if (isError) {
    return <span className="text-sm text-destructive">Price unavailable</span>
  }
  if (!data || !data.available || !data.quote) {
    return <span className="text-sm text-muted-foreground">No data yet</span>
  }

  const { quote } = data
  const isFresh = quote.freshness === 'current'
  const changeClass = quote.change >= 0 ? 'text-green-600' : 'text-red-600'

  return (
    <span className="inline-flex items-center gap-2">
      <span className="font-medium">${quote.price.toFixed(2)}</span>
      <span className={`text-sm ${changeClass}`}>
        {formatChange(quote.change, quote.changePercent)}
      </span>
      {!isFresh && (
        <Badge variant="outline">
          {quote.freshness === 'delayed' ? 'Delayed' : 'Stale'}
        </Badge>
      )}
    </span>
  )
}

export default PriceBadge
