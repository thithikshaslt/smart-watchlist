import { useQuery } from '@tanstack/react-query'
import { apiClient } from './api-client'

interface HealthResponse {
  status: string
}

/** Smoke-tests the apiClient + TanStack Query wiring against the backend. */
export function HealthStatus() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['health'],
    queryFn: () => apiClient.get<HealthResponse>('/health'),
  })

  if (isLoading) return <span>Checking...</span>
  if (isError) return <span>Unavailable</span>
  return <span>{data?.status}</span>
}
