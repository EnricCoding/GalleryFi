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
}

export interface ListingsResponse {
  listings: Listing[];
}

/** Parámetros soportados por /api/listings y hooks */
export interface ListParams {
  first?: number; 
  skip?: number;
  orderBy?: 'timestamp' | 'price' | 'tokenId';
  orderDirection?: 'asc' | 'desc';
  nft?: Address;
  seller?: Address;
  tokenId?: string; 
}
