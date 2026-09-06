interface VisitDigestProps {
  previousViewedAt: string | null | undefined
  summary: { notableCount: number; broadMarketCount: number } | undefined
}

function formatVisitTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

// No digest on a watchlist's first-ever visit - there's nothing to compare
// against yet, so nothing is invented.
function VisitDigest({ previousViewedAt, summary }: VisitDigestProps) {
  if (!previousViewedAt || !summary) {
    return null
  }

  const { notableCount, broadMarketCount } = summary
  const hasChanges = notableCount > 0 || broadMarketCount > 0

  return (
    <p className="rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
      <span aria-hidden className={hasChanges ? 'mr-2 text-primary' : 'mr-2'}>
        ●
      </span>
      Since your last visit ({formatVisitTime(previousViewedAt)}):{' '}
      {hasChanges
        ? `${pluralize(notableCount, 'notable move')}, ${pluralize(broadMarketCount, 'broad-market move')}.`
        : 'nothing notable changed.'}
    </p>
  )
}

export default VisitDigest
