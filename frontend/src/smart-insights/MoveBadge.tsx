import { Badge } from '@/components/ui/badge'
import type { MoveClassification } from './useWatchlistVisit'

interface MoveBadgeProps {
  classification: MoveClassification | null | undefined
}

// Only notable/broad-market moves get a badge - normal and
// insufficient-history stay unbadged so the badge itself stays meaningful.
function MoveBadge({ classification }: MoveBadgeProps) {
  if (classification === 'notable') {
    return <Badge variant="destructive">⚡ Notable</Badge>
  }
  if (classification === 'broad-market') {
    return <Badge variant="secondary">~ Moved with market</Badge>
  }
  return null
}

export default MoveBadge
