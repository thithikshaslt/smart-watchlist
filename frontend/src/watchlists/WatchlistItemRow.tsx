import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import PriceBadge from '@/market-data/PriceBadge'
import PriceHistory from '@/market-data/PriceHistory'
import type { WatchlistItem } from './types'

interface WatchlistItemRowProps {
  item: WatchlistItem
  isExpanded: boolean
  onToggleExpand: (instrumentId: string) => void
  onRemove: (instrumentId: string) => void
}

function WatchlistItemRow({
  item,
  isExpanded,
  onToggleExpand,
  onRemove,
}: WatchlistItemRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: item.instrumentId,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <li ref={setNodeRef} style={style} className="border-b p-3 last:border-b-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Reorder ${item.instrument.symbol}`}
            className="cursor-grab touch-none px-1 text-muted-foreground"
          >
            ⠿
          </button>
          <div>
            <span className="font-medium">{item.instrument.symbol}</span>{' '}
            <span className="text-sm text-muted-foreground">{item.instrument.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PriceBadge instrumentId={item.instrumentId} />
          <Button variant="outline" size="sm" onClick={() => onToggleExpand(item.instrumentId)}>
            {isExpanded ? 'Hide chart' : 'Chart'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => onRemove(item.instrumentId)}>
            Remove
          </Button>
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
