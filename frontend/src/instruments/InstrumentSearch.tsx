import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import EmptyState from '@/components/EmptyState'
import ErrorState from '@/components/ErrorState'
import LoadingState from '@/components/LoadingState'
import { Input } from '@/components/ui/input'
import { apiClient } from '@/lib/api-client'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import {
  MIN_SEARCH_QUERY_LENGTH,
  useInstrumentSearch,
} from './useInstrumentSearch'

interface InstrumentSearchProps {
  watchlistId: string
  existingInstrumentIds: string[]
}

function InstrumentSearch({ watchlistId, existingInstrumentIds }: InstrumentSearchProps) {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 300)
  const { data: results, isLoading, isError } = useInstrumentSearch(debouncedQuery)
  const queryClient = useQueryClient()
  // Confirms an add immediately, independent of when the parent's watchlist
  // query (and therefore existingInstrumentIds) next refetches.
  const [justAddedIds, setJustAddedIds] = useState<Set<string>>(new Set())

  const addMutation = useMutation({
    mutationFn: (instrumentId: string) =>
      apiClient.post(`/watchlists/${watchlistId}/items`, { instrumentId }),
    onSuccess: (_data, instrumentId) => {
      setJustAddedIds((prev) => new Set(prev).add(instrumentId))
      void queryClient.invalidateQueries({ queryKey: ['watchlist', watchlistId] })
    },
  })

  const trimmedLength = debouncedQuery.trim().length
  const existingIds = new Set([...existingInstrumentIds, ...justAddedIds])
  const showResultsArea = trimmedLength >= MIN_SEARCH_QUERY_LENGTH

  return (
    <div className="space-y-3">
      <Input
        placeholder="Search instruments to add..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label="Search instruments"
      />
      {trimmedLength > 0 && trimmedLength < MIN_SEARCH_QUERY_LENGTH && (
        <p className="text-sm text-muted-foreground">Keep typing to search…</p>
      )}
      {showResultsArea && isLoading && <LoadingState message="Searching…" />}
      {showResultsArea && isError && (
        <ErrorState message="Couldn't search instruments right now." />
      )}
      {showResultsArea && results && results.length === 0 && (
        <EmptyState message="No instruments found." />
      )}
      {showResultsArea && results && results.length > 0 && (
        <ul className="divide-y rounded-md border">
          {results.map((instrument) => {
            const alreadyAdded = existingIds.has(instrument.id)
            return (
              <li
                key={instrument.id}
                className="flex items-center justify-between gap-2 p-2"
              >
                <div>
                  <span className="font-medium">{instrument.symbol}</span>{' '}
                  <span className="text-muted-foreground">{instrument.name}</span>
                </div>
                {alreadyAdded ? (
                  <Badge variant="secondary">Already added</Badge>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => addMutation.mutate(instrument.id)}
                    disabled={addMutation.isPending}
                  >
                    Add
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default InstrumentSearch
