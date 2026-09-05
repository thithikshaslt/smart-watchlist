import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/test/render'
import { server } from '@/test/msw-server'
import WatchlistListItem from './WatchlistListItem'
import type { Watchlist } from './types'

const watchlist: Watchlist = {
  id: 'wl-1',
  userId: 'user-1',
  name: 'Tech',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

function renderInList(w: Watchlist = watchlist) {
  return renderWithProviders(
    <ul>
      <WatchlistListItem watchlist={w} />
    </ul>,
  )
}

describe('WatchlistListItem', () => {
  it('renames the watchlist and shows the updated name', async () => {
    server.use(
      http.patch('http://localhost:3000/watchlists/wl-1', () =>
        HttpResponse.json({ ...watchlist, name: 'Renamed' }),
      ),
    )
    const user = userEvent.setup()
    renderInList()

    await user.click(screen.getByRole('button', { name: 'Rename' }))
    const input = screen.getByLabelText('Rename Tech')
    await user.clear(input)
    await user.type(input, 'Renamed')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(screen.getByText('Renamed')).toBeInTheDocument())
  })

  it('requires confirmation before deleting, then removes it from the list', async () => {
    let deleteCalled = false
    server.use(
      http.delete('http://localhost:3000/watchlists/wl-1', () => {
        deleteCalled = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const user = userEvent.setup()
    renderInList()

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    // Confirmation dialog is open; the destructive action hasn't fired yet.
    expect(deleteCalled).toBe(false)
    const dialog = screen.getByRole('dialog')

    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(deleteCalled).toBe(true))
  })
})
