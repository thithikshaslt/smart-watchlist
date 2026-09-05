import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/test/render'
import { server } from '@/test/msw-server'
import { HealthStatus } from './HealthStatus'

describe('HealthStatus', () => {
  it('renders the backend health status once the query resolves', async () => {
    server.use(
      http.get('http://localhost:3000/health', () =>
        HttpResponse.json({ status: 'ok' }),
      ),
    )

    renderWithProviders(<HealthStatus />)

    expect(screen.getByText('Checking...')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('ok')).toBeInTheDocument())
  })

  it('renders an error state when the request fails', async () => {
    server.use(
      http.get('http://localhost:3000/health', () =>
        HttpResponse.json({ statusCode: 500, message: 'boom', error: 'Internal Server Error' }, { status: 500 }),
      ),
    )

    renderWithProviders(<HealthStatus />)

    await waitFor(() => expect(screen.getByText('Unavailable')).toBeInTheDocument())
  })
})
