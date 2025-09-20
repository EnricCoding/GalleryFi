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
      first: 10
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
    sales(first: 10, orderBy: timestamp, orderDirection: desc, where: { nft: $nft, tokenId: $tokenId }) {
      id
      buyer
      price
      timestamp
    }
    bids(first: 10, orderBy: timestamp, orderDirection: desc, where: { nft: $nft, tokenId: $tokenId }) {
      id
      bidder
      amount
      timestamp
    }
    auctionCreateds(
      first: 10
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
      first: 10
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
    fetchPolicy: 'cache-first', 
    pollInterval: 30000, 
    errorPolicy: 'all', 
    notifyOnNetworkStatusChange: false, 
  });

  const { data: debugBidsData } = useQuery(gql`
    query DebugBids($nft: Bytes!) {
      bids(first: 20, orderBy: timestamp, orderDirection: desc, where: { nft: $nft }) {
        id
        nft
        tokenId
        bidder
        amount
        timestamp
      }
    }
  `, {
    variables: { nft: nft.toLowerCase() },
    skip: !tokenIdBig,
    pollInterval: 60000,
    errorPolicy: 'all',
  });

  const activity = toActivity({
    listings: subgraphData?.listings,
    sales: subgraphData?.sales,
    bids: subgraphData?.bids,
  });

  if (typeof window !== 'undefined' && !subgraphLoading && tokenIdBig) {
    const w = window as Window & { galleryfiSubgraphTested?: boolean };
    if (!w.galleryfiSubgraphTested) {
      w.galleryfiSubgraphTested = true;
    
    const testSubgraphConnectivity = async () => {
      const testQuery = `
        query TestSubgraphConnectivity {
          bids(first: 10) { id nft tokenId bidder amount timestamp }
          listings(first: 5) { id nft tokenId seller price timestamp }
          _meta { 
            block { 
              number 
              hash 
              timestamp 
            }
            deployment
            hasIndexingErrors
          }
        }
      `;
      
      try {
        const response = await fetch('https://api.studio.thegraph.com/query/117753/gallery-fi/0.0.5', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: testQuery })
        });
        
        const result = await response.json();
        
        const currentEthBlock = 9069669; 
        const subgraphBlock = result.data?._meta?.block?.number || 0;
        const blockDiff = currentEthBlock - subgraphBlock;

        if (blockDiff > 1000) {
          console.warn(`Subgraph is ${blockDiff} blocks behind! This explains why recent bids don't appear.`);
        } else if (blockDiff > 100) {
          console.warn(`Subgraph is ${blockDiff} blocks behind. Recent bids may not appear yet.`);
        } else {

        }
        
      } catch (error) {
        console.error('Direct subgraph test failed:', error);
      }
    };
    
    setTimeout(testSubgraphConnectivity, 3000); 
    }
  }

  const refetchActivity = async () => {
    try {
      const result = await refetch({
        fetchPolicy: 'network-only',
      });
      
      return result;
    } catch (error) {
      console.warn('Network-only refetch failed, trying cache-first fallback:', error);
      try {
        return await refetch();
      } catch (fallbackError) {
        console.error('All refetch attempts failed:', fallbackError);
        throw fallbackError;
      }
    }
  };

  return { 
    subgraphData, 
    subgraphLoading, 
    activity,
    refetchActivity,
  };
}
