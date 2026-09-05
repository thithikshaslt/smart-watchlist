import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/test/render'
import { server } from '@/test/msw-server'
import RegisterPage from './RegisterPage'

function renderRegisterRoute() {
  return renderWithProviders(
    <Routes>
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<div>Login view</div>} />
    </Routes>,
    { initialEntries: ['/register'] },
  )
}

describe('RegisterPage', () => {
  it('proceeds to the login page after successful registration', async () => {
    server.use(
      http.post('http://localhost:3000/auth/register', () =>
        HttpResponse.json(
          { id: '1', email: 'user@example.com', createdAt: new Date().toISOString() },
          { status: 201 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderRegisterRoute()

    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() => expect(screen.getByText('Login view')).toBeInTheDocument())
  })

  it('shows an inline error for a duplicate email without navigating', async () => {
    server.use(
      http.post('http://localhost:3000/auth/register', () =>
        HttpResponse.json(
          {
            statusCode: 409,
            message: 'An account with this email already exists',
            error: 'Conflict',
          },
          { status: 409 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderRegisterRoute()

    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'An account with this email already exists',
      ),
    )
    expect(screen.queryByText('Login view')).not.toBeInTheDocument()
  })

  it('shows an inline error for an invalid password without submitting', async () => {
    server.use(
      http.post('http://localhost:3000/auth/register', () =>
        HttpResponse.json(
          {
            statusCode: 400,
            message: ['Password must be at least 8 characters long'],
            error: 'Bad Request',
          },
          { status: 400 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderRegisterRoute()

    const passwordInput = screen.getByLabelText('Password')
    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    // Bypass the native minLength constraint so the request is actually sent,
    // exercising the backend-error rendering path this test targets.
    passwordInput.removeAttribute('minlength')
    await user.type(passwordInput, 'short')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Password must be at least 8 characters long',
      ),
    )
  })
})
