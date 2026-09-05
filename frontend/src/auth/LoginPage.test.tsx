import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { renderWithProviders } from '@/test/render'
import { server } from '@/test/msw-server'
import LoginPage from './LoginPage'

function renderLoginRoute(initialEntries: string[] = ['/login']) {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/watchlists" element={<div>Watchlists view</div>} />
      <Route path="/some/protected/page" element={<div>Protected page</div>} />
    </Routes>,
    { initialEntries },
  )
}

describe('LoginPage', () => {
  it('navigates to /watchlists on successful login', async () => {
    server.use(
      http.post('http://localhost:3000/auth/login', () =>
        HttpResponse.json({ accessToken: 'token-123' }),
      ),
    )
    const user = userEvent.setup()
    renderLoginRoute()

    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    await waitFor(() =>
      expect(screen.getByText('Watchlists view')).toBeInTheDocument(),
    )
  })

  it('shows an inline error for invalid credentials without navigating', async () => {
    server.use(
      http.post('http://localhost:3000/auth/login', () =>
        HttpResponse.json(
          { statusCode: 401, message: 'Invalid email or password', error: 'Unauthorized' },
          { status: 401 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderLoginRoute()

    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid email or password'),
    )
    expect(screen.queryByText('Watchlists view')).not.toBeInTheDocument()
  })

  it('honors the redirect query param after a successful login', async () => {
    server.use(
      http.post('http://localhost:3000/auth/login', () =>
        HttpResponse.json({ accessToken: 'token-123' }),
      ),
    )
    const user = userEvent.setup()
    renderLoginRoute(['/login?redirect=%2Fsome%2Fprotected%2Fpage'])

    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    await waitFor(() =>
      expect(screen.getByText('Protected page')).toBeInTheDocument(),
    )
  })
})
