import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/test/render'
import RequireAuth from './RequireAuth'
import LogoutButton from './LogoutButton'

const TOKEN_STORAGE_KEY = 'smart-watchlist:token'

function AppWithLogout() {
  return (
    <Routes>
      <Route path="/login" element={<div>Login view</div>} />
      <Route element={<RequireAuth />}>
        <Route path="/watchlists" element={<LogoutButton />} />
      </Route>
    </Routes>
  )
}

describe('LogoutButton', () => {
  it('clears the session and returns to login; the protected page is no longer reachable', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'a-valid-token')
    const user = userEvent.setup()

    renderWithProviders(<AppWithLogout />, { initialEntries: ['/watchlists'] })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument(),
    )

    await user.click(screen.getByRole('button', { name: 'Log out' }))

    await waitFor(() => expect(screen.getByText('Login view')).toBeInTheDocument())
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull()
  })
})
