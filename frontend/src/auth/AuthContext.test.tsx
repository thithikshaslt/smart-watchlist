import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { server } from '@/test/msw-server'
import { AuthProvider, useAuth } from './AuthContext'

const TOKEN_STORAGE_KEY = 'smart-watchlist:token'

function TestHarness() {
  const { isAuthenticated, login, logout } = useAuth()
  return (
    <div>
      <span>authenticated: {String(isAuthenticated)}</span>
      <button onClick={() => login('user@example.com', 'password123')}>
        Log in
      </button>
      <button onClick={logout}>Log out</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('starts unauthenticated with no stored token', async () => {
    render(
      <AuthProvider>
        <TestHarness />
      </AuthProvider>,
    )

    await waitFor(() =>
      expect(screen.getByText('authenticated: false')).toBeInTheDocument(),
    )
  })

  it('restores an authenticated session from a stored token', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'stored-token')

    render(
      <AuthProvider>
        <TestHarness />
      </AuthProvider>,
    )

    await waitFor(() =>
      expect(screen.getByText('authenticated: true')).toBeInTheDocument(),
    )
  })

  it('login sets the session and persists the token', async () => {
    server.use(
      http.post('http://localhost:3000/auth/login', () =>
        HttpResponse.json({ accessToken: 'new-token' }),
      ),
    )
    const user = userEvent.setup()

    render(
      <AuthProvider>
        <TestHarness />
      </AuthProvider>,
    )
    await waitFor(() =>
      expect(screen.getByText('authenticated: false')).toBeInTheDocument(),
    )

    await user.click(screen.getByText('Log in'))

    await waitFor(() =>
      expect(screen.getByText('authenticated: true')).toBeInTheDocument(),
    )
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe('new-token')
  })

  it('logout clears the session', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'stored-token')
    const user = userEvent.setup()

    render(
      <AuthProvider>
        <TestHarness />
      </AuthProvider>,
    )
    await waitFor(() =>
      expect(screen.getByText('authenticated: true')).toBeInTheDocument(),
    )

    await user.click(screen.getByText('Log out'))

    expect(screen.getByText('authenticated: false')).toBeInTheDocument()
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull()
  })
})
