import { useState, type FormEvent } from 'react'
import LogoutButton from '@/auth/LogoutButton'
import { Button } from '@/components/ui/button'
import EmptyState from '@/components/EmptyState'
import ErrorState from '@/components/ErrorState'
import LoadingState from '@/components/LoadingState'
import { Input } from '@/components/ui/input'
import { ApiError } from '@/lib/api-client'
import { useCreateWatchlist, useWatchlists } from './useWatchlists'
import WatchlistListItem from './WatchlistListItem'

const MAX_NAME_LENGTH = 100

function WatchlistsListPage() {
  const { data: watchlists, isLoading, isError } = useWatchlists()
  const createWatchlist = useCreateWatchlist()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const trimmed = name.trim()
    if (trimmed.length === 0 || trimmed.length > MAX_NAME_LENGTH) {
      setError('Enter a watchlist name up to 100 characters long.')
      return
    }

    try {
      await createWatchlist.mutateAsync(trimmed)
      setName('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Your watchlists</h1>
        <LogoutButton />
      </header>

      <form onSubmit={handleCreate} className="flex gap-2">
        <Input
          aria-label="New watchlist name"
          placeholder="New watchlist name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Button type="submit" disabled={createWatchlist.isPending}>
          Create
        </Button>
      </form>
      {error && <ErrorState message={error} />}

      {isLoading && <LoadingState message="Loading your watchlists…" />}
      {isError && <ErrorState message="Couldn't load your watchlists." />}

      {watchlists && watchlists.length === 0 && (
        <EmptyState message="You don't have any watchlists yet. Create one above to get started." />
      )}

      {watchlists && watchlists.length > 0 && (
        <ul className="divide-y rounded-md border">
          {watchlists.map((watchlist) => (
            <WatchlistListItem key={watchlist.id} watchlist={watchlist} />
          ))}
        </ul>
      )}
    </div>
  )
}

export default WatchlistsListPage
