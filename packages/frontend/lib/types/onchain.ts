import type { Address } from './common';

export interface OnchainListingTuple {
  0: Address; // seller
  1: bigint; // price (uint96)
  seller: Address;
  price: bigint;
}

export interface OnchainAuctionTuple {
  0: Address; // seller
  1: bigint; // end (uint40) en segundos
  2: bigint; // bid (uint96)
  3: Address; // bidder
  seller: Address;
  end: bigint;
  bid: bigint;
  bidder: Address;
}
