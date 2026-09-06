import { useState } from 'react'
import { useSetWatchlistView } from './useWatchlists'
import { DEFAULT_VIEW_LENS_METRICS, type ViewLensMetric } from './types'

// `undefined` = no local override (show whatever is persisted); `null` or an
// array = an in-flight optimistic override, mirroring useWatchlistReorder's
// local-override + revert-on-failure shape.
type LocalOverride = ViewLensMetric[] | null | undefined

/**
 * Owns the display-lens toggle logic independent of any specific control's
 * markup, so a customized selection shows immediately and reverts on a
 * failed save - the same optimistic-update-with-revert shape as
 * useWatchlistReorder, applied to the view lens instead of item order.
 */
export function useWatchlistViewLens(
  watchlistId: string,
  persistedViewLens: ViewLensMetric[] | null | undefined,
) {
  const setView = useSetWatchlistView(watchlistId)
  const [localOverride, setLocalOverride] = useState<LocalOverride>(undefined)

  const [prevPersisted, setPrevPersisted] = useState(persistedViewLens)
  if (persistedViewLens !== prevPersisted) {
    setPrevPersisted(persistedViewLens)
    setLocalOverride(undefined)
  }

  const viewLens = localOverride !== undefined ? localOverride : (persistedViewLens ?? null)

  async function toggleMetric(metric: ViewLensMetric): Promise<void> {
    // Starting from the un-customized default means checking one more box
    // reads as "also show this," not "show only this" - the default's
    // metrics were already implicitly showing.
    const current = viewLens ?? DEFAULT_VIEW_LENS_METRICS
    const next = current.includes(metric)
      ? current.filter((m) => m !== metric)
      : [...current, metric]
    setLocalOverride(next)

    try {
      await setView.mutateAsync(next)
    } catch {
      setLocalOverride(undefined)
    }
  }

  return { viewLens, toggleMetric, isError: setView.isError }
}
