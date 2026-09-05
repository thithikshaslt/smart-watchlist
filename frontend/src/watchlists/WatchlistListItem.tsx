import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import ErrorState from '@/components/ErrorState'
import { ApiError } from '@/lib/api-client'
import { useDeleteWatchlist, useRenameWatchlist } from './useWatchlists'
import type { Watchlist } from './types'

interface WatchlistListItemProps {
  watchlist: Watchlist
}

function WatchlistListItem({ watchlist }: WatchlistListItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(watchlist.name)
  const [error, setError] = useState<string | null>(null)
  const renameWatchlist = useRenameWatchlist(watchlist.id)
  const deleteWatchlist = useDeleteWatchlist()

  // Shows the rename immediately, independent of when the parent's
  // watchlists query (and therefore the `watchlist` prop) next refetches.
  // Adjusted during render (React's recommended pattern for resetting
  // state when a prop changes) rather than via an effect.
  const [prevName, setPrevName] = useState(watchlist.name)
  const [displayName, setDisplayName] = useState(watchlist.name)
  if (watchlist.name !== prevName) {
    setPrevName(watchlist.name)
    setDisplayName(watchlist.name)
  }

  async function handleRename(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      const updated = await renameWatchlist.mutateAsync(name)
      setDisplayName(updated.name)
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    }
  }

  if (isEditing) {
    return (
      <li className="p-3">
        <form onSubmit={handleRename} className="flex gap-2">
          <Input
            aria-label={`Rename ${watchlist.name}`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <Button type="submit" size="sm" disabled={renameWatchlist.isPending}>
            Save
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setIsEditing(false)
              setName(watchlist.name)
              setError(null)
            }}
          >
            Cancel
          </Button>
        </form>
        {error && (
          <div className="mt-1">
            <ErrorState message={error} />
          </div>
        )}
      </li>
    )
  }

  return (
    <li className="flex items-center justify-between gap-2 p-3">
      <Link
        to={`/watchlists/${watchlist.id}`}
        className="font-medium underline-offset-2 hover:underline"
      >
        {displayName}
      </Link>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
          Rename
        </Button>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              Delete
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete &ldquo;{watchlist.name}&rdquo;?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              This removes the watchlist and all of its items. This can&apos;t be undone.
            </p>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                variant="destructive"
                onClick={() => deleteWatchlist.mutate(watchlist.id)}
                disabled={deleteWatchlist.isPending}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </li>
  )
}

export default WatchlistListItem
