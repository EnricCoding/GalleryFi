import { Address } from './common';

export interface Listing {
  id: string;
  nft: `0x${string}`;
  tokenId: string;
  price: string;
  seller: `0x${string}`;
  timestamp: string;
  tokenURI?: string | null;
  name?: string | null;
  description?: string | null;
  image?: string | null;
  // ✅ NEW: Auction data if this NFT is in auction
  auction?: {
    id: string;
    end: string; // timestamp when auction ends
    currentBid?: string; // current highest bid amount
    bidder?: `0x${string}`; // current highest bidder
    isActive: boolean; // true if auction is still live
    timeLeft?: number; // milliseconds left (calculated)
  } | null;
}

export interface ListingsResponse {
  listings: Listing[];
  totalCount?: number;
  hasMore: boolean;
}

export interface ListParams {
  first?: number; 
  skip?: number;
  orderBy?: 'timestamp' | 'price' | 'tokenId';
  orderDirection?: 'asc' | 'desc';
  nft?: Address;
  seller?: Address;
  tokenId?: string; 
}
