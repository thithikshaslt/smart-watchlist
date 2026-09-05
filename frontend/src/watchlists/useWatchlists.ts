import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { Watchlist, WatchlistWithItems } from './types'

export function watchlistsQueryKey() {
  return ['watchlists'] as const
}

export function watchlistQueryKey(id: string) {
  return ['watchlist', id] as const
}

export function useWatchlists() {
  return useQuery({
    queryKey: watchlistsQueryKey(),
    queryFn: () => apiClient.get<WatchlistWithItems[]>('/watchlists'),
  })
}

export function useWatchlist(id: string) {
  return useQuery({
    queryKey: watchlistQueryKey(id),
    queryFn: () => apiClient.get<WatchlistWithItems>(`/watchlists/${id}`),
  })
}

export function useCreateWatchlist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => apiClient.post<Watchlist>('/watchlists', { name }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: watchlistsQueryKey() })
    },
  })
}

export function useRenameWatchlist(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => apiClient.patch<Watchlist>(`/watchlists/${id}`, { name }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: watchlistsQueryKey() })
      void queryClient.invalidateQueries({ queryKey: watchlistQueryKey(id) })
    },
  })
}

export function useDeleteWatchlist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<void>(`/watchlists/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: watchlistsQueryKey() })
    },
  })
}

export function useRemoveWatchlistItem(watchlistId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (instrumentId: string) =>
      apiClient.delete<void>(`/watchlists/${watchlistId}/items/${instrumentId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: watchlistQueryKey(watchlistId) })
    },
  })
}

export function useReorderWatchlistItems(watchlistId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (instrumentIds: string[]) =>
      apiClient.patch<WatchlistWithItems>(
        `/watchlists/${watchlistId}/items/reorder`,
        { instrumentIds },
      ),
    onSuccess: (data) => {
      queryClient.setQueryData(watchlistQueryKey(watchlistId), data)
    },
  })
}
