import { Button } from '@/components/ui/button'
import type { HistoryRange } from './useHistory'

const RANGES: HistoryRange[] = ['1d', '5d', '1m', '3m', '6m', '1y', '5y']

interface RangeSelectorProps {
  value: HistoryRange
  onChange: (range: HistoryRange) => void
}

function RangeSelector({ value, onChange }: RangeSelectorProps) {
  return (
    <div role="group" aria-label="Chart time range" className="flex gap-1">
      {RANGES.map((range) => (
        <Button
          key={range}
          type="button"
          size="sm"
          variant={range === value ? 'default' : 'outline'}
          aria-pressed={range === value}
          onClick={() => onChange(range)}
        >
          {range}
        </Button>
      ))}
    </div>
  )
}

export default RangeSelector
