// lib/services/listings.ts
import type { ListingsResponse } from '@/lib/types/listing';

export type OrderBy = 'timestamp' | 'price' | 'tokenId';
export type OrderDir = 'asc' | 'desc';

export interface ListParams {
  first?: number;
  skip?: number;
  orderBy?: OrderBy;
  orderDirection?: OrderDir;
}

// Pequeño helper para construir querystring
function toSearch(params: ListParams): string {
  const search = new URLSearchParams({
    first: String(params.first ?? 24),
    skip: String(params.skip ?? 0),
    orderBy: params.orderBy ?? 'timestamp',
    orderDirection: params.orderDirection ?? 'desc',
  });
  return search.toString();
}

/** Llama a nuestro proxy /api/listings */
export async function fetchListings(params: ListParams = {}): Promise<ListingsResponse> {
  const res = await fetch(`/api/listings?${toSearch(params)}`, {
    method: 'GET',
    headers: { accept: 'application/json' },
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Failed to fetch listings (${res.status}): ${detail}`);
  }

  // El proxy siempre devuelve { listings: [...] }
  const json = (await res.json()) as Partial<ListingsResponse>;
  return { listings: json.listings ?? [] };
}
