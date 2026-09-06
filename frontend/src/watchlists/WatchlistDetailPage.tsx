import { useEffect, useMemo, useState } from 'react'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Link, useParams } from 'react-router-dom'
import EmptyState from '@/components/EmptyState'
import ErrorState from '@/components/ErrorState'
import LoadingState from '@/components/LoadingState'
import InstrumentSearch from '@/instruments/InstrumentSearch'
import { ApiError } from '@/lib/api-client'
import { useWatchlistVisit } from '@/smart-insights/useWatchlistVisit'
import type { VisitItemResult } from '@/smart-insights/useWatchlistVisit'
import VisitDigest from '@/smart-insights/VisitDigest'
import { useRemoveWatchlistItem, useWatchlist } from './useWatchlists'
import { useWatchlistReorder } from './useWatchlistReorder'
import { useWatchlistViewLens } from './useWatchlistViewLens'
import ViewLensControl from './ViewLensControl'
import WatchlistItemRow from './WatchlistItemRow'
import type { WatchlistItem } from './types'

// A stable reference so useWatchlistReorder's prop-change check doesn't see
// a "new" array (and therefore reset local state) on every render while
// there's no watchlist data yet (loading/error).
const EMPTY_ITEMS: WatchlistItem[] = []

function WatchlistDetailPage() {
  const { id } = useParams<{ id: string }>()
  const watchlistId = id ?? ''
  const { data: watchlist, isLoading, isError, error } = useWatchlist(watchlistId)
  const removeItem = useRemoveWatchlistItem(watchlistId)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const persistedItems = useMemo(
    () => watchlist?.items ?? EMPTY_ITEMS,
    [watchlist],
  )
  const { items, handleDragEnd, isError: reorderFailed } = useWatchlistReorder(
    watchlistId,
    persistedItems,
  )
  const { viewLens, toggleMetric } = useWatchlistViewLens(watchlistId, watchlist?.viewLens)

  const visit = useWatchlistVisit(watchlistId)
  const { mutate: recordVisit } = visit
  useEffect(() => {
    if (!watchlistId) {
      return
    }
    recordVisit()
    // Fires once per genuine navigation to this watchlist (mount), keyed
    // only on watchlistId - deliberately not re-run by the polling query
    // that keeps prices fresh, or by any other re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchlistId])

  const classificationByInstrumentId = useMemo(() => {
    const map = new Map<string, VisitItemResult['classification']>()
    for (const result of visit.data?.items ?? []) {
      map.set(result.instrumentId, result.classification)
    }
    return map
  }, [visit.data])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function toggleExpand(instrumentId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(instrumentId)) {
        next.delete(instrumentId)
      } else {
        next.add(instrumentId)
      }
      return next
    })
  }

  function onDragEnd(event: DragEndEvent) {
    void handleDragEnd({
      active: { id: event.active.id },
      over: event.over ? { id: event.over.id } : null,
    })
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <LoadingState message="Loading watchlist…" />
      </div>
    )
  }

  if (isError && error instanceof ApiError && error.statusCode === 404) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <ErrorState message="Watchlist not found." />
        <Link to="/watchlists" className="underline">
          Back to your watchlists
        </Link>
      </div>
    )
  }

  if (isError || !watchlist) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <ErrorState message="Couldn't load this watchlist." />
        <Link to="/watchlists" className="underline">
          Back to your watchlists
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-6">
      <header className="space-y-3">
        <Link to="/watchlists" className="text-sm text-muted-foreground hover:text-foreground">
          ← Your watchlists
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">{watchlist.name}</h1>
          <ViewLensControl viewLens={viewLens} onToggleMetric={toggleMetric} />
        </div>
      </header>

      <VisitDigest previousViewedAt={visit.data?.previousViewedAt} summary={visit.data?.summary} />

      {reorderFailed && (
        <ErrorState message="Couldn't save the new order. Please try again." />
      )}

      {items.length === 0 ? (
        <EmptyState message="This watchlist has no instruments yet. Search below to add one." />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={items.map((item) => item.instrumentId)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="overflow-hidden rounded-lg border">
              {items.map((item) => (
                <WatchlistItemRow
                  key={item.instrumentId}
                  item={item}
                  isExpanded={expandedIds.has(item.instrumentId)}
                  onToggleExpand={toggleExpand}
                  onRemove={(instrumentId) => removeItem.mutate(instrumentId)}
                  viewLens={viewLens}
                  classification={classificationByInstrumentId.get(item.instrumentId)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Add an instrument</h2>
        <InstrumentSearch
          watchlistId={watchlistId}
          existingInstrumentIds={persistedItems.map((item) => item.instrumentId)}
        />
      </section>
    </div>
  )
}

export default WatchlistDetailPage
