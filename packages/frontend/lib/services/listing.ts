import type { ListingsResponse, Listing } from '@/lib/types/listing';

export type OrderBy = 'timestamp' | 'price' | 'tokenId';
export type OrderDir = 'asc' | 'desc';

export interface ListParams {
  first?: number;
  skip?: number;
  orderBy?: OrderBy;
  orderDirection?: OrderDir;
}

type ApiResponse = {
  listings?: Listing[];
  totalCount?: number;
  debug?: unknown;
};

function buildQuery(params: ListParams): {
  qs: string;
  first: number;
  skip: number;
  orderBy: OrderBy;
  orderDirection: OrderDir;
} {
  const allowedOrderBy: OrderBy[] = ['timestamp', 'price', 'tokenId'];
  const allowedOrderDir: OrderDir[] = ['asc', 'desc'];

  const rawFirst = Number(params.first ?? 24);
  const rawSkip = Number(params.skip ?? 0);

  const first = Number.isFinite(rawFirst) ? Math.max(1, Math.min(rawFirst, 100)) : 24;
  const skip = Number.isFinite(rawSkip) ? Math.max(0, rawSkip) : 0;

  const orderBy = allowedOrderBy.includes(params.orderBy as OrderBy)
    ? (params.orderBy as OrderBy)
    : 'timestamp';

  const orderDirection = allowedOrderDir.includes(params.orderDirection as OrderDir)
    ? (params.orderDirection as OrderDir)
    : 'desc';

  const search = new URLSearchParams({
    first: String(first),
    skip: String(skip),
    orderBy,
    orderDirection,
  });

  return { qs: search.toString(), first, skip, orderBy, orderDirection };
}

/**
 * DEPRECATED: Price checking now done server-side
 */
// function isPositivePrice(price: unknown): boolean { ... }

/**
 * DEPRECATED: Filter now done server-side
 * Check if an NFT can be purchased or bid on right now
 */
// function canPurchaseOrBid(listing: Listing): boolean { ... }

export async function fetchListings(
  params: ListParams = {},
  opts: { signal?: AbortSignal; onlyListed?: boolean } = {},
): Promise<ListingsResponse> {
  const { qs, first, skip } = buildQuery(params);
  const { onlyListed } = opts;
  
  // ✅ NEW: Add onlyListed parameter to URL
  const urlParams = new URLSearchParams(qs);
  if (onlyListed) {
    urlParams.set('onlyListed', 'true');
  }
  const url = `/api/listings?${urlParams.toString()}`;

  console.log('🚀 FETCH REQUEST:', {
    url,
    params,
    onlyListed,
    fullUrl: url
  });

  const res = await fetch(url, {
    method: 'GET',
    headers: { accept: 'application/json' },
    cache: 'no-store',
    signal: opts.signal,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Failed to fetch listings (${res.status}): ${detail}`);
  }

  const json = (await res.json()) as ApiResponse;

  console.log('🌐 FETCH LISTINGS RESPONSE:', {
    url,
    listingsCount: json.listings?.length || 0,
    totalCount: json.totalCount,
    onlyListed,
    debug: json.debug // ✅ NEW: Log server debug info
  });

  const listings = json.listings ?? [];
  
  // ✅ REMOVED: Client-side filtering now done server-side
  console.log('✅ SERVER-SIDE FILTERING APPLIED:', {
    receivedCount: listings.length,
    totalCount: json.totalCount,
    serverDebug: json.debug
  });

  const totalCount = json.totalCount;

  const hasMore =
    typeof totalCount === 'number'
      ? skip + listings.length < totalCount
      : listings.length === first;

  return { listings, totalCount, hasMore };
}