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

    // filtros opcionales: nft, seller, tokenId
    const nftParam = searchParams.get('nft');
    const sellerParam = searchParams.get('seller');
    const tokenIdParam = searchParams.get('tokenId');

    // construimos "where" solo con campos válidos
    const where: Record<string, unknown> = {};
    if (isHexAddress(nftParam)) where.nft = nftParam.toLowerCase();
    if (isHexAddress(sellerParam)) where.seller = sellerParam.toLowerCase();
    if (isBigIntish(tokenIdParam)) where.tokenId = tokenIdParam;

    const variables = {
      first,
      skip,
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

    const response = NextResponse.json(json.data, { status: 200 });
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
