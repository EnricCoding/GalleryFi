import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type { ListingsResponse, ListParams } from '@/lib/types/listing';
import { fetchListings } from '@/lib/services/listing';

type Options = {
  onlyListed?: boolean;
  enabled?: boolean;
};

export function useListings(params: ListParams = {}, opts: Options = {}) {
  const { onlyListed = false, enabled = true } = opts;

  return useQuery<ListingsResponse, Error>({
    queryKey: ['listings', { params, onlyListed }],
    queryFn: ({ signal }) => fetchListings(params, { signal, onlyListed }),
    placeholderData: keepPreviousData,
    refetchInterval: 10_000,
    staleTime: 8_000,
    refetchOnWindowFocus: false,
    gcTime: 5 * 60 * 1000,
    enabled,
  });
}
