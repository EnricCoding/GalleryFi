// lib/hooks/useListings.ts
import { useQuery } from '@tanstack/react-query';
import type { ListingsResponse } from '@/lib/types/listing';
import { fetchListings, ListParams } from '@/lib/services/listing';

export function useListings(params: ListParams = {}) {
  return useQuery<ListingsResponse, Error>({
    queryKey: ['listings', params],
    queryFn: () => fetchListings(params),
    refetchInterval: 10_000,
    staleTime: 8_000,
  });
}
