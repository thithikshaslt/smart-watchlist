import { screen, waitFor } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/test/render'
import RequireAuth from './RequireAuth'

const TOKEN_STORAGE_KEY = 'smart-watchlist:token'

function ProtectedApp() {
  return (
    <Routes>
      <Route path="/login" element={<div>Login view</div>} />
      <Route element={<RequireAuth />}>
        <Route path="/watchlists" element={<div>Watchlists view</div>} />
      </Route>
    </Routes>
  )
}

describe('RequireAuth', () => {
  it('redirects an unauthenticated visitor to login', async () => {
    renderWithProviders(<ProtectedApp />, { initialEntries: ['/watchlists'] })

    await waitFor(() => expect(screen.getByText('Login view')).toBeInTheDocument())
  })

  it('renders the protected route for an authenticated visitor', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'a-valid-token')

    renderWithProviders(<ProtectedApp />, { initialEntries: ['/watchlists'] })

    await waitFor(() =>
      expect(screen.getByText('Watchlists view')).toBeInTheDocument(),
    )

    localStorage.removeItem(TOKEN_STORAGE_KEY)
  })
})
