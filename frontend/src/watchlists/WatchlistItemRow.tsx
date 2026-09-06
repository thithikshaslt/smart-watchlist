import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import PriceBadge from '@/market-data/PriceBadge'
import PriceHistory from '@/market-data/PriceHistory'
import MoveBadge from '@/smart-insights/MoveBadge'
import type { MoveClassification } from '@/smart-insights/useWatchlistVisit'
import type { ViewLensMetric, WatchlistItem } from './types'

interface WatchlistItemRowProps {
  item: WatchlistItem
  isExpanded: boolean
  onToggleExpand: (instrumentId: string) => void
  onRemove: (instrumentId: string) => void
  viewLens?: ViewLensMetric[] | null
  classification?: MoveClassification | null
}

function WatchlistItemRow({
  item,
  isExpanded,
  onToggleExpand,
  onRemove,
  viewLens,
  classification,
}: WatchlistItemRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.instrumentId,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'border-b bg-card p-3 transition-colors last:border-b-0 hover:bg-accent/40',
        isDragging && 'relative z-10 shadow-lg',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Reorder ${item.instrument.symbol}`}
            className="cursor-grab touch-none px-1 text-muted-foreground/60 hover:text-muted-foreground"
          >
            ⠿
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{item.instrument.symbol}</span>
              <MoveBadge classification={classification} />
            </div>
            <span className="block truncate text-sm text-muted-foreground">
              {item.instrument.name}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <PriceBadge instrumentId={item.instrumentId} viewLens={viewLens} />
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleExpand(item.instrumentId)}
            >
              {isExpanded ? 'Hide chart' : 'Chart'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => onRemove(item.instrumentId)}
            >
              Remove
            </Button>
          </div>
        </div>
      </div>
      {isExpanded && (
        <div className="mt-3">
          <PriceHistory instrumentId={item.instrumentId} />
        </div>
      )}
    </li>
  )
}

export default WatchlistItemRow
