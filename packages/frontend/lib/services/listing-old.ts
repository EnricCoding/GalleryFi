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

function isPositivePrice(price: unknown): boolean {
  try {
    if (typeof price === 'bigint') return price > BigInt(0);
    if (typeof price === 'number') return Number.isFinite(price) && price > 0;
    if (typeof price === 'string') {
      return BigInt(price) > BigInt(0);
    }
    return false;
  } catch {
    return false;
  }
}

function canPurchaseOrBid(listing: Listing): boolean {
  const auction = (listing as Listing & { auction?: { isActive?: boolean } }).auction;
  
  // Case 1: NFT in active auction - can BID
  if (auction?.isActive === true) {
    console.log(`🔥 CAN BID:`, {
      nft: listing.nft,
      tokenId: listing.tokenId,
      reason: 'Active auction'
    });
    return true;
  }
  
  // Case 2: NFT with marketplace listing - can BUY
  if (isPositivePrice(listing.price)) {
    console.log(`💰 CAN BUY:`, {
      nft: listing.nft,
      tokenId: listing.tokenId,
      price: listing.price,
      reason: 'Marketplace listing'
    });
    return true;
  }
  
  // Not available for purchase or bidding
  console.log(`❌ NOT AVAILABLE:`, {
    nft: listing.nft,
    tokenId: listing.tokenId,
    reason: 'No active auction and no marketplace price'
  });
  return false;
}
  const auction = (listing as Listing & { auction?: { isActive?: boolean } }).auction;
  const hasActiveAuction = auction?.isActive === true;
  
  // Case 1: Has active auction - always considered active
  if (hasActiveAuction) {
    console.log(`🔥 AUCTION ACTIVE:`, {
      nft: listing.nft,
      tokenId: listing.tokenId,
      auctionActive: true
    });
    return true;
  }
  
  // Case 2: Has marketplace listing (positive price)
  const hasPositivePrice = isPositivePrice(listing.price);
  
  // Case 3: Check if it's NOT sold (in a real scenario, we'd check if owner != marketplace)
  // For now, we assume if it has positive price from subgraph, it's active
  const isMarketplaceListing = hasPositivePrice;
  
  const isActive = isMarketplaceListing;
  
  console.log(`� MARKETPLACE CHECK:`, {
    nft: listing.nft,
    tokenId: listing.tokenId,
    price: listing.price,
    hasPositivePrice,
    finalResult: isActive
  });
  
  return isActive;
}

export async function fetchListings(
  params: ListParams = {},
  opts: { signal?: AbortSignal; onlyListed?: boolean } = {},
): Promise<ListingsResponse> {
  const { qs, first, skip } = buildQuery(params);
  const { onlyListed } = opts;
  // ✅ REMOVED: No longer sending listed=1 parameter since API doesn't handle it
  const url = `/api/listings?${qs}`;

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
    sampleListing: json.listings?.[0] ? {
      nft: json.listings[0].nft,
      tokenId: json.listings[0].tokenId,
      price: json.listings[0].price,
      hasAuction: !!(json.listings[0] as Listing & { auction?: unknown }).auction,
      auctionActive: !!(json.listings[0] as Listing & { auction?: { isActive?: boolean } }).auction?.isActive,
      isActive: canPurchaseOrBid(json.listings[0])
    } : null
  });

  let listings = json.listings ?? [];
  
  // ✅ SIMPLE FILTER: Only show NFTs that can be purchased or bid on
  if (onlyListed) {
    console.log('🎯 FILTERING: Only NFTs you can BUY or BID on');
    console.log('📋 BEFORE FILTER:', listings.length, 'total NFTs');
    
    const beforeCount = listings.length;
    listings = listings.filter((l: Listing) => canPurchaseOrBid(l));
    
    console.log('📊 FILTER RESULTS:', {
      before: beforeCount,
      after: listings.length,
      filtered: beforeCount - listings.length
    });
  }

  const totalCount = json.totalCount;

  const hasMore =
    typeof totalCount === 'number'
      ? skip + listings.length < totalCount
      : listings.length === first;

  return { listings, totalCount, hasMore };
}
