// lib/types/buy.ts
import type { Address } from './common';
import type { OnchainListingTuple } from './onchain';

export interface UseBuyNftArgs {
  nft: Address;
  tokenIdBig: bigint | null;
  validInputs: boolean;
  listedNow: boolean;
  onchainListing?: OnchainListingTuple;
  expectedChainId: number;
  MARKET: Address;
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}
