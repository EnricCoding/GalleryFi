// hooks/types.ts
import type { Address, ChainId } from '@/lib/types/common';
import type { OnchainListingTuple, OnchainAuctionTuple } from '@/lib/types/onchain';
import type { SgNftActivityResponse } from '@/lib/types/subgraph';
import type { NftMetadata } from '@/lib/types/metadata';
import type { UiActivityItem } from '@/lib/types/activity';

/** Salida del agregador useNftData (la API que consume NftDetail) */
export interface UseNftDataResult {
  // Derivados
  meta: NftMetadata | null;
  imgUrl: string | null;
  ethUsd: number | null;
  tokenURI: string | null;
  tokenIdBig: bigint | null;
  validInputs: boolean;

  // On-chain
  onchainListing?: OnchainListingTuple;
  onchainAuction?: OnchainAuctionTuple;
  onchainOwner?: Address;

  // Subgraph
  subgraphData?: SgNftActivityResponse;
  subgraphLoading: boolean;
  activity: UiActivityItem[]; 

  // Estado
  listedNow: boolean;
  auctionNow: boolean;

  // Config
  expectedChainId: ChainId;
  MARKET: Address;
}

/** Salida de useOnchainNft (hook base on-chain) */
export interface UseOnchainNftResult {
  MARKET: Address;
  tokenIdBig: bigint | null;
  validInputs: boolean;
  onchainListing?: OnchainListingTuple;
  onchainAuction?: OnchainAuctionTuple;
  onchainTokenURI?: string;
  onchainOwner?: Address;
  listedNow: boolean;
  auctionNow: boolean;
}
