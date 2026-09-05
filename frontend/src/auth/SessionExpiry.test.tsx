import { useEffect } from 'react'
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/test/render'
import { server } from '@/test/msw-server'
import { apiClient } from '@/lib/api-client'
import RequireAuth from './RequireAuth'

const TOKEN_STORAGE_KEY = 'smart-watchlist:token'

/** Stands in for any protected page that calls the API on mount. */
function PageThatCallsApi() {
  useEffect(() => {
    apiClient.get('/watchlists').catch(() => {
      // The 401 itself is what this test is about; the caller's own error
      // handling for a failed watchlists fetch is out of scope here.
    })
  }, [])
  return <div>Watchlists view</div>
}

function ProtectedApp() {
  return (
    <Routes>
      <Route path="/login" element={<div>Login view</div>} />
      <Route element={<RequireAuth />}>
        <Route path="/watchlists" element={<PageThatCallsApi />} />
      </Route>
    </Routes>
  )
}

describe('session expiry', () => {
  it('clears the session and redirects to login when the backend rejects the stored token', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'a-now-invalid-token')
    server.use(
      http.get('http://localhost:3000/watchlists', () =>
        HttpResponse.json({ statusCode: 401, message: 'Unauthorized', error: 'Unauthorized' }, { status: 401 }),
      ),
    )

    renderWithProviders(<ProtectedApp />, { initialEntries: ['/watchlists'] })

    await waitFor(() => expect(screen.getByText('Login view')).toBeInTheDocument())
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull()
  })
})
