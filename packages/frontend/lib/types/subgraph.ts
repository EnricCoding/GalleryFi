import type { Address, BigIntString } from './common';

/** Mint (inmutable) */
export interface SgMint {
  id: string; 
  nft: Address;
  tokenId: BigIntString;
  to: Address;
  tokenURI: string;
  timestamp: BigIntString; 
}

/** Listing (mutable) */
export interface SgListing {
  id: string; 
  nft: Address;
  tokenId: BigIntString;
  seller: Address;
  price: BigIntString;
  tokenURI?: string | null;
  name?: string | null;
  description?: string | null;
  image?: string | null;
  timestamp: BigIntString;
}

/** Sale (inmutable) */
export interface SgSale {
  id: string;
  nft: Address;
  tokenId: BigIntString;
  buyer: Address;
  price: BigIntString;
  timestamp: BigIntString;
}

/** Bid (inmutable) */
export interface SgBid {
  id: string;
  nft: Address;
  tokenId: BigIntString;
  bidder: Address;
  amount: BigIntString;
  timestamp: BigIntString;
}

/** AuctionCreated (inmutable) */
export interface SgAuctionCreated {
  id: string;
  nft: Address;
  tokenId: BigIntString;
  seller: Address;
  end: BigIntString; 
  timestamp: BigIntString;
}

/** AuctionEnded (inmutable) */
export interface SgAuctionEnded {
  id: string;
  nft: Address;
  tokenId: BigIntString;
  winner?: Address | null;
  amount?: BigIntString | null;
  timestamp: BigIntString;
}

/** Respuesta compuesta usada en NftDetail */
export interface SgNftActivityResponse {
  listings?: SgListing[];
  sales?: SgSale[];
  bids?: SgBid[];
  auctionCreateds?: SgAuctionCreated[];
  auctionEndeds?: SgAuctionEnded[];
}
