import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query'
import { useEffect } from 'react'

// Enhanced query hook with optimized caching
export function useOptimizedQuery<T>(
  queryKey: any[],
  queryFn: () => Promise<T>,
  options?: Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey,
    queryFn,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    ...options,
  })
}

// Enhanced mutation hook with optimistic updates
export function useOptimizedMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseMutationOptions<TData, Error, TVariables>
) {
  return useMutation({
    mutationFn,
    ...options,
  })
}

// Prefetch hook for related data
export function usePrefetch(queryKey: any[], queryFn: () => Promise<any>) {
  const queryClient = useQueryClient()

  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime: 5 * 60 * 1000,
    })
  }, [queryClient, queryKey, queryFn])
}

// Cache invalidation helper
export function useInvalidateQueries() {
  const queryClient = useQueryClient()

  return {
    invalidateUserData: () => queryClient.invalidateQueries({ queryKey: ['user'] }),
    invalidateAccountData: () => queryClient.invalidateQueries({ queryKey: ['account'] }),
    invalidateTransactions: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
    invalidatePayments: () => queryClient.invalidateQueries({ queryKey: ['payments'] }),
    invalidateNotifications: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    invalidateKYC: () => queryClient.invalidateQueries({ queryKey: ['kyc'] }),
    invalidateInvoices: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  }
}

// Background sync hook
export function useBackgroundSync(queryKey: any[], queryFn: () => Promise<any>, interval = 300000) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const intervalId = setInterval(() => {
      queryClient.prefetchQuery({
        queryKey,
        queryFn,
        staleTime: 0, // Force refresh
      })
    }, interval)

    return () => clearInterval(intervalId)
  }, [queryClient, queryKey, queryFn, interval])
}

// Optimistic update helper
export function useOptimisticUpdate<T>() {
  const queryClient = useQueryClient()

  return {
    setQueryData: (queryKey: any[], updater: (old: T | undefined) => T) => {
      queryClient.setQueryData(queryKey, updater)
    },
    cancelQueries: (queryKey: any[]) => {
      queryClient.cancelQueries({ queryKey })
    },
    invalidateQueries: (queryKey: any[]) => {
      queryClient.invalidateQueries({ queryKey })
    },
  }
}
