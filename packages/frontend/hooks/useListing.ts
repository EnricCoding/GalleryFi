import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type { ListingsResponse, ListParams } from '@/lib/types/listing';
import { fetchListings } from '@/lib/services/listing';

export function useListings(params: ListParams = {}) {
  return useQuery<ListingsResponse, Error>({
    queryKey: ['listings', params],
    queryFn: ({ signal }) => fetchListings(params, { signal }),
    placeholderData: keepPreviousData,
    refetchInterval: 10_000,
    staleTime: 8_000,
    refetchOnWindowFocus: false,
    gcTime: 5 * 60 * 1000, // 5 min
  });
}
