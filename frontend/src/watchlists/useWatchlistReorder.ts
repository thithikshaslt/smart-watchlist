import { arrayMove } from '@dnd-kit/sortable'
import { useState } from 'react'
import { useReorderWatchlistItems } from './useWatchlists'
import type { WatchlistItem } from './types'

export interface DragEndLike {
  active: { id: string | number }
  over: { id: string | number } | null
}

/**
 * Owns the reorder logic independent of dnd-kit's gesture layer, so the
 * order computation, optimistic update, and failure revert can be unit
 * tested directly rather than by driving dnd-kit's pointer/keyboard
 * sensors through jsdom (which lacks the real layout they depend on).
 */
export function useWatchlistReorder(watchlistId: string, persistedItems: WatchlistItem[]) {
  const reorderItems = useReorderWatchlistItems(watchlistId)
  const [localOrder, setLocalOrder] = useState<WatchlistItem[] | null>(null)

  // A successful reorder updates the ['watchlist', id] cache (via
  // setQueryData in useReorderWatchlistItems), which flows back here as a
  // new persistedItems value - that's the moment the optimistic override
  // is no longer needed. Clearing it eagerly, right when mutateAsync
  // resolves, would risk a visible flash back to the old order in the gap
  // before the parent's data actually updates. Adjusted during render
  // (React's recommended pattern for resetting state when a prop changes)
  // rather than via an effect.
  const [prevPersistedItems, setPrevPersistedItems] = useState(persistedItems)
  if (persistedItems !== prevPersistedItems) {
    setPrevPersistedItems(persistedItems)
    setLocalOrder(null)
  }

  const items = localOrder ?? persistedItems

  async function handleDragEnd(event: DragEndLike): Promise<void> {
    const { active, over } = event
    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = items.findIndex((item) => item.instrumentId === active.id)
    const newIndex = items.findIndex((item) => item.instrumentId === over.id)
    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    const reordered = arrayMove(items, oldIndex, newIndex)
    setLocalOrder(reordered)

    try {
      await reorderItems.mutateAsync(reordered.map((item) => item.instrumentId))
    } catch {
      // Revert to the last persisted order immediately.
      setLocalOrder(null)
    }
  }

  return { items, handleDragEnd, isError: reorderItems.isError }
}
