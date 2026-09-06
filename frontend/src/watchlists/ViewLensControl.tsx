import { cn } from '@/lib/utils'
import { DEFAULT_VIEW_LENS_METRICS, VIEW_LENS_METRICS, type ViewLensMetric } from './types'

const METRIC_LABELS: Record<ViewLensMetric, string> = {
  price: 'Price',
  dollarChange: '$ change',
  percentChange: '% change',
  dayRange: 'Day range',
  volume: 'Volume',
  freshness: 'Freshness',
}

interface ViewLensControlProps {
  viewLens: ViewLensMetric[] | null
  onToggleMetric: (metric: ViewLensMetric) => void
}

function ViewLensControl({ viewLens, onToggleMetric }: ViewLensControlProps) {
  const isCustomized = viewLens !== null
  const selected = viewLens ?? DEFAULT_VIEW_LENS_METRICS

  return (
    <details className="relative w-fit text-sm">
      <summary className="w-fit cursor-pointer list-none rounded-md px-2 py-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground [&::-webkit-details-marker]:hidden">
        Customize{isCustomized ? '' : ' · default'}
      </summary>
      <div className="absolute left-0 z-10 mt-1 w-56 rounded-lg border bg-popover p-1.5 text-popover-foreground shadow-md">
        {VIEW_LENS_METRICS.map((metric) => {
          const active = selected.includes(metric)
          return (
            <button
              key={metric}
              type="button"
              onClick={() => onToggleMetric(metric)}
              aria-pressed={active}
              className={cn(
                'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground',
                active && 'text-foreground',
              )}
            >
              {METRIC_LABELS[metric]}
              {active && <span aria-hidden>✓</span>}
            </button>
          )
        })}
      </div>
    </details>
  )
}

export default ViewLensControl
