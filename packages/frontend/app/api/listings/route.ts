// app/api/listings/route.ts
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

// Types
export interface AuctionData {
  id: string;
  nft: string;
  tokenId: string;
  seller: string;
  end: string;
  timestamp: string;
}

interface BidData {
  nft: string;
  tokenId: string;
  bidder: string;
  amount: string;
  timestamp: string;
}

interface ListingData {
  id: string;
  nft: string;
  tokenId: string;
  price: string;
  seller: string;
  tokenURI: string;
  timestamp: string;
}

interface EnhancedListing extends ListingData {
  auction: {
    id: string;
    end: string;
    currentBid: string;
    bidder: string | null;
    isActive: boolean;
    timeLeft: number;
  } | null;
}

interface SubgraphResponse {
  data: {
    listings: ListingData[];
    listingsMeta: { id: string }[];
    auctionCreateds: AuctionData[];
    bids: BidData[];
  };
  errors?: unknown;
}

interface ProcessedAuction {
  id: string;
  end: string;
  isActive: boolean;
  timeLeft: number;
  seller: string;
  timestamp: string;
}

interface ProcessedBid {
  amount: string;
  bidder: string;
  timestamp: string;
}

interface FilterResult {
  listings: EnhancedListing[];
  totalCount: number;
  hasMore: boolean;
}

// Configuration
const SUBGRAPH_URL = process.env.SUBGRAPH_URL ?? process.env.NEXT_PUBLIC_SUBGRAPH_URL;
const MAX_ITEMS_PER_REQUEST = 50;
const MAX_FETCH_ITEMS = 150;
const DEFAULT_PAGE_SIZE = 24;
const REQUEST_TIMEOUT = 12_000;
const CACHE_REVALIDATE = 10;

// Validation Sets
const ORDER_BY_WHITELIST = new Set(['timestamp', 'price', 'tokenId'] as const);
const ORDER_DIR_WHITELIST = new Set(['asc', 'desc'] as const);

type OrderBy = typeof ORDER_BY_WHITELIST extends Set<infer T> ? T : never;
type OrderDirection = typeof ORDER_DIR_WHITELIST extends Set<infer T> ? T : never;

// GraphQL Query
const LISTINGS_QUERY = `
  query Listings(
    $first: Int!
    $skip: Int!
    $orderBy: Listing_orderBy!
    $orderDirection: OrderDirection!
    $where: Listing_filter
  ) {
    listings(
      first: $first
      skip: $skip
      orderBy: $orderBy
      orderDirection: $orderDirection
      where: $where
    ) {
      id
      nft
      tokenId
      price
      seller
      tokenURI
      timestamp
    }
    
    listingsMeta: listings(where: $where) {
      id
    }
    
    auctionCreateds {
      id
      nft
      tokenId
      seller
      end
      timestamp
    }
    
    bids {
      id
      nft
      tokenId
      bidder
      amount
      timestamp
    }
  }
`;

// Utility Functions
class ValidationUtils {
  static parseIntSafe(value: string | null, defaultValue: number): number {
    const parsed = Number.parseInt(value ?? '', 10);
    return Number.isFinite(parsed) ? parsed : defaultValue;
  }

  static pickOrderBy(value: string | null): OrderBy {
    const val = (value ?? 'timestamp').trim();
    return ORDER_BY_WHITELIST.has(val as OrderBy) ? (val as OrderBy) : 'timestamp';
  }

  static pickOrderDirection(value: string | null): OrderDirection {
    const val = (value ?? 'desc').toLowerCase().trim();
    return ORDER_DIR_WHITELIST.has(val as OrderDirection) ? (val as OrderDirection) : 'desc';
  }

  static isHexAddress(value: string | null): value is `0x${string}` {
    return !!value && /^0x[a-fA-F0-9]{40}$/.test(value);
  }

  static isBigIntString(value: string | null): value is string {
    return !!value && /^[0-9]+$/.test(value);
  }
}

class AuctionProcessor {
  private static createNftKey(nft: string, tokenId: string): string {
    return `${nft.toLowerCase()}-${tokenId}`;
  }

  static processAuctions(auctionCreateds: AuctionData[]): Map<string, ProcessedAuction> {
    const auctionsMap = new Map<string, ProcessedAuction>();
    const currentTime = Math.floor(Date.now() / 1000);

    auctionCreateds.forEach((auction) => {
      const key = this.createNftKey(auction.nft, auction.tokenId);
      const endTime = parseInt(auction.end);
      const isActive = endTime > currentTime;
      const timeLeft = isActive ? (endTime - currentTime) * 1000 : 0;
      
      const auctionData: ProcessedAuction = {
        id: auction.id,
        end: auction.end,
        isActive,
        timeLeft,
        seller: auction.seller,
        timestamp: auction.timestamp
      };
      
      const existing = auctionsMap.get(key);
      if (!existing || this.shouldReplaceAuction(auctionData, existing)) {
        auctionsMap.set(key, auctionData);
      }
    });

    return auctionsMap;
  }

  private static shouldReplaceAuction(newAuction: ProcessedAuction, existing: ProcessedAuction): boolean {
    // Prefer active over inactive
    if (newAuction.isActive && !existing.isActive) return true;
    
    // If both have same status, prefer most recent
    if (newAuction.isActive === existing.isActive) {
      return parseInt(newAuction.timestamp) > parseInt(existing.timestamp);
    }
    
    return false;
  }

  static processBids(bids: BidData[]): Map<string, ProcessedBid> {
    const bidsMap = new Map<string, ProcessedBid>();

    bids.forEach((bid) => {
      const key = this.createNftKey(bid.nft, bid.tokenId);
      const existing = bidsMap.get(key);
      
      // Keep only the highest bid per NFT
      if (!existing || BigInt(bid.amount) > BigInt(existing.amount)) {
        bidsMap.set(key, {
          amount: bid.amount,
          bidder: bid.bidder,
          timestamp: bid.timestamp
        });
      }
    });

    return bidsMap;
  }

  static enhanceListings(
    listings: ListingData[], 
    auctionsMap: Map<string, ProcessedAuction>, 
    bidsMap: Map<string, ProcessedBid>
  ): EnhancedListing[] {
    return listings.map((listing) => {
      const key = this.createNftKey(listing.nft, listing.tokenId);
      const auctionData = auctionsMap.get(key);
      const bidData = bidsMap.get(key);
      
      if (auctionData) {
        return {
          ...listing,
          auction: {
            id: auctionData.id,
            end: auctionData.end,
            currentBid: bidData?.amount || '0',
            bidder: bidData?.bidder || null,
            isActive: auctionData.isActive,
            timeLeft: auctionData.timeLeft
          }
        };
      }
      
      return { ...listing, auction: null };
    });
  }
}

class ListingFilter {
  static applyAvailableFilter(listings: EnhancedListing[]): EnhancedListing[] {
    return listings.filter((listing) => {
      // Active auction - can BID
      if (listing.auction?.isActive === true) {
        return true;
      }
      
      // Pure marketplace listing - can BUY
      if (!listing.auction && listing.price && listing.price !== '0') {
        return true;
      }
      
      return false;
    });
  }

  static applyPagination(listings: EnhancedListing[], skip: number, first: number): EnhancedListing[] {
    return listings.slice(skip, skip + first);
  }
}

class SubgraphClient {
  private static async fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      return await fetch(url, {
        ...options,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  static async query(variables: Record<string, unknown>): Promise<SubgraphResponse> {
    if (!SUBGRAPH_URL) {
      throw new Error('Subgraph URL not configured');
    }

    const response = await this.fetchWithTimeout(
      SUBGRAPH_URL,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: LISTINGS_QUERY, variables }),
        next: { revalidate: CACHE_REVALIDATE },
      },
      REQUEST_TIMEOUT
    );

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Subgraph fetch failed: ${response.status} - ${text.slice(0, 500)}`);
    }

    const json = await response.json().catch(() => null);
    if (!json || typeof json !== 'object') {
      throw new Error('Invalid JSON from subgraph');
    }
    if (json.errors) {
      throw new Error(`Subgraph error: ${JSON.stringify(json.errors)}`);
    }

    return json as SubgraphResponse;
  }
}

// Helper functions
function buildWhereClause(searchParams: URLSearchParams): Record<string, string> {
  const where: Record<string, string> = {};
  
  const nftParam = searchParams.get('nft');
  const sellerParam = searchParams.get('seller');
  const tokenIdParam = searchParams.get('tokenId');
  
  if (ValidationUtils.isHexAddress(nftParam)) {
    where.nft = nftParam.toLowerCase();
  }
  if (ValidationUtils.isHexAddress(sellerParam)) {
    where.seller = sellerParam.toLowerCase();
  }
  if (ValidationUtils.isBigIntString(tokenIdParam)) {
    where.tokenId = tokenIdParam;
  }
  
  return where;
}

function applyFiltersAndPagination(
  enhancedListings: EnhancedListing[],
  shouldFilter: boolean,
  skip: number,
  first: number,
  originalCount: number
): FilterResult {
  if (shouldFilter) {
    const filteredListings = ListingFilter.applyAvailableFilter(enhancedListings);
    const paginatedListings = ListingFilter.applyPagination(filteredListings, skip, first);
    
    return {
      listings: paginatedListings,
      totalCount: filteredListings.length,
      hasMore: skip + paginatedListings.length < filteredListings.length
    };
  }
  
  return {
    listings: enhancedListings,
    totalCount: originalCount,
    hasMore: skip + enhancedListings.length < originalCount
  };
}

export async function GET(req: NextRequest) {
  try {
    if (!SUBGRAPH_URL) {
      return NextResponse.json({ error: 'Subgraph URL not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);

    // Parse and validate parameters
    const firstRaw = ValidationUtils.parseIntSafe(searchParams.get('first'), DEFAULT_PAGE_SIZE);
    const skipRaw = ValidationUtils.parseIntSafe(searchParams.get('skip'), 0);
    const first = Math.min(Math.max(firstRaw, 1), MAX_ITEMS_PER_REQUEST);
    const skip = Math.max(skipRaw, 0);
    const orderBy = ValidationUtils.pickOrderBy(searchParams.get('orderBy'));
    const orderDirection = ValidationUtils.pickOrderDirection(searchParams.get('orderDirection'));

    // Build filters
    const filters = buildWhereClause(searchParams);
    const onlyListedParam = searchParams.get('onlyListed');
    
    // Calculate fetch parameters
    const multiplier = onlyListedParam === 'true' ? 3 : 1;
    const fetchFirst = Math.min(first * multiplier, MAX_FETCH_ITEMS);
    const fetchSkip = onlyListedParam === 'true' ? 0 : skip;

    const variables = {
      first: fetchFirst,
      skip: fetchSkip,
      orderBy, 
      orderDirection, 
      where: Object.keys(filters).length ? filters : undefined,
    };

    // Fetch data from subgraph
    const data = await SubgraphClient.query(variables);
    
    // Process the data
    const { listings, listingsMeta, auctionCreateds, bids } = data.data;
    const totalCountBeforeFilter = listingsMeta?.length || 0;
    
    const auctionsMap = AuctionProcessor.processAuctions(auctionCreateds);
    const bidsMap = AuctionProcessor.processBids(bids);
    const enhancedListings = AuctionProcessor.enhanceListings(listings, auctionsMap, bidsMap);
    
    // Apply filtering and pagination
    const result = applyFiltersAndPagination(
      enhancedListings, 
      onlyListedParam === 'true', 
      skip, 
      first,
      totalCountBeforeFilter
    );

    // Build response
    const responseData = {
      listings: result.listings,
      totalCount: result.totalCount,
      hasMore: result.hasMore,
      debug: {
        originalCount: totalCountBeforeFilter,
        afterEnhancement: enhancedListings.length,
        afterFilter: result.totalCount,
        returned: result.listings.length,
        filterApplied: onlyListedParam === 'true',
        skip,
        first,
        auctionCreatedsCount: auctionCreateds?.length || 0,
        bidsCount: bids?.length || 0,
        hasAuctionData: !!(auctionCreateds?.length),
        sampleAuction: auctionCreateds?.[0] || null
      }
    };

    const response = NextResponse.json(responseData, { status: 200 });
    response.headers.set('Cache-Control', `s-maxage=${CACHE_REVALIDATE}, stale-while-revalidate=60`);
    return response;

  } catch (err) {
    const message = err instanceof Error 
      ? (err.name === 'AbortError' ? 'Upstream timeout' : err.message)
      : 'Unexpected error';
    
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
