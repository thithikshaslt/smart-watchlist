import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/test/render'
import LandingPage from './LandingPage'

function renderLandingRoute() {
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<div>Login page</div>} />
      <Route path="/register" element={<div>Register page</div>} />
      <Route path="/watchlists" element={<div>Watchlists page</div>} />
    </Routes>,
    { initialEntries: ['/'] },
  )
}

describe('LandingPage', () => {
  it('shows the tagline and both entry points for a signed-out visitor', () => {
    renderLandingRoute()

    expect(screen.getByText('Watchlyst')).toBeInTheDocument()
    expect(screen.getByText('See what actually moved.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Get started' })).toHaveAttribute(
      'href',
      '/register',
    )
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login')
  })

  it('redirects a signed-in visitor straight to their watchlists', () => {
    localStorage.setItem('smart-watchlist:token', 'fake-token')

    renderLandingRoute()

    expect(screen.getByText('Watchlists page')).toBeInTheDocument()
    expect(screen.queryByText('Watchlyst')).not.toBeInTheDocument()

    localStorage.clear()
  })
})
