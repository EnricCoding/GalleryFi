// hooks/useNftActivity.ts
'use client';

import { gql, useQuery } from '@apollo/client';

export interface SaleEvent {
  id: string;
  buyer: `0x${string}`;
  price: string;
  timestamp: string;
}
export interface BidEvent {
  id: string;
  bidder: `0x${string}`;
  amount: string;
  timestamp: string;
}
export interface ListingEvent {
  id: string;
  seller: `0x${string}`;
  price: string;
  tokenURI?: string | null;
  timestamp: string;
}

export type NftActivity =
  | { id: string; activityType: 'SALE'; price: string; to: `0x${string}`; timestamp: string }
  | { id: string; activityType: 'BID'; price: string; from: `0x${string}`; timestamp: string }
  | { id: string; activityType: 'LISTING'; price: string; from: `0x${string}`; timestamp: string };

const NFT_ACTIVITY = gql`
  query NftActivity($nft: Bytes!, $tokenId: BigInt!) {
    listings(
      first: 1
      orderBy: timestamp
      orderDirection: desc
      where: { nft: $nft, tokenId: $tokenId }
    ) {
      id
      seller
      price
      tokenURI
      timestamp
    }
    sales(orderBy: timestamp, orderDirection: desc, where: { nft: $nft, tokenId: $tokenId }) {
      id
      buyer
      price
      timestamp
    }
    bids(orderBy: timestamp, orderDirection: desc, where: { nft: $nft, tokenId: $tokenId }) {
      id
      bidder
      amount
      timestamp
    }
    auctionCreateds(
      first: 1
      orderBy: timestamp
      orderDirection: desc
      where: { nft: $nft, tokenId: $tokenId }
    ) {
      id
      seller
      end
      timestamp
    }
    auctionEndeds(
      first: 1
      orderBy: timestamp
      orderDirection: desc
      where: { nft: $nft, tokenId: $tokenId }
    ) {
      id
      winner
      amount
      timestamp
    }
  }
`;

function toActivity(input?: {
  sales?: SaleEvent[];
  bids?: BidEvent[];
  listings?: ListingEvent[];
}): NftActivity[] {
  if (!input) return [];
  const out: NftActivity[] = [];
  input.sales?.forEach((s) =>
    out.push({
      id: s.id,
      activityType: 'SALE',
      price: s.price,
      to: s.buyer,
      timestamp: s.timestamp,
    }),
  );
  input.bids?.forEach((b) =>
    out.push({
      id: b.id,
      activityType: 'BID',
      price: b.amount,
      from: b.bidder,
      timestamp: b.timestamp,
    }),
  );
  input.listings?.forEach((l) =>
    out.push({
      id: l.id,
      activityType: 'LISTING',
      price: l.price,
      from: l.seller,
      timestamp: l.timestamp,
    }),
  );
  out.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
  return out;
}

export function useNftActivity(nft: `0x${string}`, tokenIdBig: bigint | null) {
  const { data: subgraphData, loading: subgraphLoading, refetch } = useQuery(NFT_ACTIVITY, {
    variables: { nft: nft.toLowerCase(), tokenId: tokenIdBig?.toString() },
    skip: !tokenIdBig,
    fetchPolicy: 'cache-and-network',
    // Enable polling for better real-time updates
    pollInterval: 30000, // Poll every 30 seconds
  });

  const activity = toActivity({
    listings: subgraphData?.listings,
    sales: subgraphData?.sales,
    bids: subgraphData?.bids,
  });

  // Enhanced refetch with fresh network data
  const refetchActivity = async () => {
    try {
      await refetch({
        fetchPolicy: 'network-only', // Force fresh data from network
      });
    } catch (error) {
      console.warn('Failed to refetch activity:', error);
      // Fallback to regular refetch if network-only fails
      return refetch();
    }
  };

  return { 
    subgraphData, 
    subgraphLoading, 
    activity,
    refetchActivity,
  };
}
