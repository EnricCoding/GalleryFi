// app/api/listings/route.ts
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

const SUBGRAPH_URL = process.env.SUBGRAPH_URL ?? process.env.NEXT_PUBLIC_SUBGRAPH_URL;

if (!SUBGRAPH_URL) {
  console.warn('[api/listings] Missing SUBGRAPH_URL / NEXT_PUBLIC_SUBGRAPH_URL');
}

const LISTINGS_GQL = `
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
    
    # Query para obtener el total count
    listingsMeta: listings(where: $where) {
      id
    }
    
    # ✅ SIMPLIFIED: Test auction queries one by one
    auctionCreateds {
      id
      nft
      tokenId
      seller
      end
      timestamp
    }
    
    # ✅ SIMPLIFIED: Test bids query
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

// whitelists de ordenación
const ORDER_BY_WHITELIST = new Set(['timestamp', 'price', 'tokenId']);
const ORDER_DIR_WHITELIST = new Set(['asc', 'desc']);

// helpers
function parseIntSafe(v: string | null, def: number): number {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isFinite(n) ? n : def;
}
function pickOrderBy(v: string | null): 'timestamp' | 'price' | 'tokenId' {
  const val = (v ?? 'timestamp').trim();
  return (ORDER_BY_WHITELIST.has(val) ? val : 'timestamp') as 'timestamp' | 'price' | 'tokenId';
}
function pickOrderDirection(v: string | null): 'asc' | 'desc' {
  const val = (v ?? 'desc').toLowerCase().trim();
  return (ORDER_DIR_WHITELIST.has(val) ? val : 'desc') as 'asc' | 'desc';
}
function isHexAddress(s: string | null): s is `0x${string}` {
  return !!s && /^0x[a-fA-F0-9]{40}$/.test(s);
}
function isBigIntish(s: string | null): s is string {
  return !!s && /^[0-9]+$/.test(s);
}

export async function GET(req: NextRequest) {
  
  try {
    if (!SUBGRAPH_URL) {
      return NextResponse.json({ error: 'Subgraph URL not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);

    // paginación + orden
    const firstRaw = parseIntSafe(searchParams.get('first'), 24);
    const skipRaw = parseIntSafe(searchParams.get('skip'), 0);
    const first = Math.min(Math.max(firstRaw, 1), 50); // 1..50
    const skip = Math.max(skipRaw, 0);
    const orderBy = pickOrderBy(searchParams.get('orderBy'));
    const orderDirection = pickOrderDirection(searchParams.get('orderDirection'));

    // filtros opcionales: nft, seller, tokenId, onlyListed
    const nftParam = searchParams.get('nft');
    const sellerParam = searchParams.get('seller');
    const tokenIdParam = searchParams.get('tokenId');
    const onlyListedParam = searchParams.get('onlyListed');
    // construimos "where" solo con campos válidos
    const where: Record<string, unknown> = {};
    if (isHexAddress(nftParam)) where.nft = nftParam.toLowerCase();
    if (isHexAddress(sellerParam)) where.seller = sellerParam.toLowerCase();
    if (isBigIntish(tokenIdParam)) where.tokenId = tokenIdParam;

    const multiplier = onlyListedParam === 'true' ? 3 : 1;
    const fetchFirst = Math.min(first * multiplier, 150);
    
    const fetchSkip = onlyListedParam === 'true' ? 0 : skip;

    const variables = {
      first: fetchFirst,
      skip: fetchSkip,
      orderBy, // enum Listing_orderBy en el schema
      orderDirection, // enum OrderDirection
      where: Object.keys(where).length ? where : undefined,
    };

    const body = JSON.stringify({ query: LISTINGS_GQL, variables });

    // timeout defensivo
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 12_000);

    const res = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      next: { revalidate: 10 },
      signal: controller.signal,
    }).finally(() => clearTimeout(id));

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        {
          error: 'Subgraph fetch failed',
          status: res.status,
          detail: text?.slice(0, 500),
        },
        { status: 502 },
      );
    }

    const json = await res.json().catch(() => null);
    if (!json || typeof json !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON from subgraph' }, { status: 502 });
    }
    if (json.errors) {
      return NextResponse.json({ error: 'Subgraph error', detail: json.errors }, { status: 502 });
    }

    const listings = json.data?.listings || [];
    const totalCountBeforeFilter = json.data?.listingsMeta?.length || 0;
    
    // ✅ RESTORED: Process auction data to enhance listings
    const auctionCreateds = json.data?.auctionCreateds || [];
    const bids = json.data?.bids || [];
    
    // Define types for the subgraph data
    type AuctionCreated = { id: string; nft: string; tokenId: string; seller: string; end: string; timestamp: string };
    type Bid = { nft: string; tokenId: string; bidder: string; amount: string; timestamp: string };
    type ListingData = { nft: string; tokenId: string; [key: string]: unknown };
    
    // Create a map of auctions - prioritize ACTIVE auctions, then most recent
    const auctionsMap = new Map();
    (auctionCreateds as AuctionCreated[]).forEach((auction) => {
      const key = `${auction.nft.toLowerCase()}-${auction.tokenId}`;
      const now = Math.floor(Date.now() / 1000);
      const isActive = parseInt(auction.end) > now;
      const timeLeft = isActive ? (parseInt(auction.end) - now) * 1000 : 0;
      
      const auctionData = {
        id: auction.id,
        end: auction.end,
        isActive,
        timeLeft,
        seller: auction.seller,
        timestamp: auction.timestamp
      };
      
      const existing = auctionsMap.get(key);
      if (!existing) {
        // No auction exists for this NFT, add it
        auctionsMap.set(key, auctionData);
      } else {
        // Auction exists, prioritize: 1) Active over inactive, 2) Most recent timestamp
        const shouldReplace = 
          (auctionData.isActive && !existing.isActive) || // Prefer active over inactive
          (auctionData.isActive === existing.isActive && 
           parseInt(auctionData.timestamp) > parseInt(existing.timestamp)); // If both same status, prefer most recent
        
        if (shouldReplace) {
          auctionsMap.set(key, auctionData);
        }
      }
    });
    
    // Create a map of highest bids per NFT
    const bidsMap = new Map();
    (bids as Bid[]).forEach((bid) => {
      const key = `${bid.nft.toLowerCase()}-${bid.tokenId}`;
      const existing = bidsMap.get(key);
      
      // Only keep the highest bid per NFT
      if (!existing || BigInt(bid.amount) > BigInt(existing.amount)) {
        bidsMap.set(key, {
          amount: bid.amount,
          bidder: bid.bidder,
          timestamp: bid.timestamp
        });
      }
    });
    
    // ✅ RESTORED: Enhance listings with auction data
    const enhancedListings = (listings as ListingData[]).map((listing) => {
      const key = `${listing.nft.toLowerCase()}-${listing.tokenId}`;
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
    
    // ✅ NEW: Apply server-side filtering ONLY when requested
    let filteredListings = enhancedListings;
    let totalCountAfterFilter = totalCountBeforeFilter;
    
    if (onlyListedParam === 'true') {
      
      filteredListings = enhancedListings.filter((listing) => {
        const listingWithPrice = listing as ListingData & { price?: string; auction?: { isActive?: boolean } }; // Specific type
        
        // Case 1: Active auction - can BID
        if (listingWithPrice.auction?.isActive === true) {
          return true;
        }
        
        // Case 2: Pure marketplace listing (no auction) - can BUY  
        if (!listingWithPrice.auction && listingWithPrice.price && listingWithPrice.price !== '0') {
          return true;
        }
        
        return false;
      });
      
      totalCountAfterFilter = filteredListings.length;
      // ✅ Apply pagination to FILTERED results
      const paginatedListings = filteredListings.slice(skip, skip + first);
      
      filteredListings = paginatedListings;
    } else {
      // ✅ SHOW ALL: No filtering, pagination already applied by GraphQL
     
    }

    const responseData = {
      listings: filteredListings, // ✅ Use filtered (and possibly paginated) results
      totalCount: totalCountAfterFilter, // ✅ Total count after filtering
      hasMore: onlyListedParam === 'true' 
        ? skip + filteredListings.length < totalCountAfterFilter
        : skip + filteredListings.length < totalCountBeforeFilter, // ✅ Correct hasMore logic
      debug: {
        originalCount: totalCountBeforeFilter,
        afterEnhancement: enhancedListings.length,
        afterFilter: totalCountAfterFilter,
        returned: filteredListings.length,
        filterApplied: onlyListedParam === 'true',
        skip,
        first,
        auctionCreatedsCount: json.data?.auctionCreateds?.length || 0,
        bidsCount: json.data?.bids?.length || 0,
        hasAuctionData: !!(json.data?.auctionCreateds?.length),
        sampleAuction: json.data?.auctionCreateds?.[0] || null
      }
    };

    const response = NextResponse.json(responseData, { status: 200 });
    // cache CDN
    response.headers.set('Cache-Control', 's-maxage=10, stale-while-revalidate=60');
    return response;
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.name === 'AbortError'
          ? 'Upstream timeout'
          : err.message
        : 'Unexpected error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
