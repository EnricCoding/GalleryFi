// lib/types/listing.ts
export interface Listing {
  id: string;
  nft: `0x${string}`;
  tokenId: string; // BigInt as string
  price: string; // Wei as string
  seller: `0x${string}`;
  timestamp: string; // unix seconds as string
}

export interface ListingsResponse {
  listings: Listing[];
}
