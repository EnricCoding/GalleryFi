// hooks/useNftData.ts
'use client';

import { useMemo, useCallback } from 'react';
import { useNftActivity } from './useNftActivity';
import { useNftMetadata } from './useNftMetadata';
import { useEthUsd } from './useEthUsd';
import { useOnchainNft } from './useOnChainNft';

/**
 * Parameters for useNftData hook
 */
type Params = {
  /** Contract address of the NFT */
  nft: `0x${string}`;
  /** Token ID as string */
  tokenId: string;
};

/**
 * NFT status enumeration for better type safety
 */
export enum NFTStatus {
  LOADING = 'loading',
  NOT_FOUND = 'not_found',
  AVAILABLE = 'available',
  LISTED = 'listed',
  AUCTION_ACTIVE = 'auction_active',
  AUCTION_ENDED = 'auction_ended',
  ERROR = 'error',
}

/**
 * NFT Metadata structure
 */
export interface NFTMetadata {
  name?: string;
  description?: string;
  image?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  [key: string]: unknown;
}

/**
 * On-chain listing structure
 */
export interface OnchainListing {
  seller: `0x${string}`;
  price: bigint;
  active?: boolean;
}

/**
 * On-chain auction structure
 */
export interface OnchainAuction {
  seller: `0x${string}`;
  end: bigint; // timestamp in seconds as bigint
  bid: bigint;
  bidder: `0x${string}`;
  active?: boolean;
}

/**
 * Subgraph data structure
 */
export interface SubgraphData {
  listings?: Array<{
    tokenURI?: string;
    price?: string;
    seller?: string;
    [key: string]: unknown;
  }>;
  auctions?: Array<{
    tokenURI?: string;
    endTime?: string;
    currentBid?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

/**
 * Activity event structure
 */
export interface ActivityEvent {
  id: string;
  type: 'listing' | 'sale' | 'auction' | 'bid' | 'transfer';
  timestamp: number;
  price?: string;
  from?: string;
  to?: string;
  [key: string]: unknown;
}

/**
 * Market contract structure
 */
export interface MarketContract {
  address: `0x${string}`;
  abi: unknown[];
  chainId: number;
}

/**
 * Enhanced NFT data structure with computed properties
 */
export interface NFTData {
  // Core data
  meta: NFTMetadata | null;
  imgUrl: string | null;
  tokenURI: string | null;
  tokenIdBig: bigint | null;
  validInputs: boolean;

  // Pricing
  ethUsd: number | null;
  currentPriceETH: string | null;
  currentPriceUSD: string | null;

  // On-chain state
  onchainListing: OnchainListing | null;
  onchainAuction: OnchainAuction | null;
  onchainOwner: `0x${string}` | null;

  // Subgraph data
  subgraphData: SubgraphData | null;
  subgraphLoading: boolean;
  activity: ActivityEvent[];

  // Status flags
  status: NFTStatus;
  listedNow: boolean;
  auctionNow: boolean;
  isForSaleNow: boolean;
  isAuctionActiveNow: boolean;
  isOwnedByUser: boolean;

  // Time information for auctions
  auctionTimeRemaining: number | null; // milliseconds
  auctionEndDate: Date | null;

  // Configuration
  expectedChainId: number;
  MARKET: MarketContract | null;

  // Actions
  refreshAllData: () => Promise<void>;
}

/**
 * Enhanced hook for comprehensive NFT data management
 * Combines on-chain data, subgraph data, metadata, and computed properties
 */
export function useNftData({ nft, tokenId }: Params): NFTData {
  const expectedChainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 11155111);

  // 1) On-chain data (normalized from hook)
  const {
    MARKET,
    tokenIdBig,
    validInputs,
    onchainListing,
    onchainAuction,
    onchainTokenURI,
    onchainOwner,
    listedNow,
    auctionNow,
    refetchOnchainData,
  } = useOnchainNft(nft, tokenId);

  // 2) Subgraph data
  const { subgraphData, subgraphLoading, activity, refetchActivity } = useNftActivity(
    nft,
    tokenIdBig,
  );

  // 3) Extract complex expressions to avoid ESLint warnings
  const firstListingTokenURI = subgraphData?.listings?.[0]?.tokenURI;
  const firstAuctionTokenURI = subgraphData?.auctions?.[0]?.tokenURI;

  // 4) tokenURI priority: on-chain > subgraph.listings > subgraph.auctions
  const tokenURI: string | null = useMemo(() => {
    const sgListingURI = firstListingTokenURI ?? null;
    const sgAuctionURI = firstAuctionTokenURI ?? null;
    return onchainTokenURI ?? sgListingURI ?? sgAuctionURI ?? null;
  }, [onchainTokenURI, firstListingTokenURI, firstAuctionTokenURI]);

  // 5) Metadata (IPFS/HTTP) and preview
  const { meta, imgUrl } = useNftMetadata(tokenURI);

  // 6) ETH → USD conversion
  const { ethUsd } = useEthUsd();

  // 7) Enhanced computed properties with proper type handling
  const isForSaleNow = useMemo(
    () => !!onchainListing && onchainListing.price > BigInt(0),
    [onchainListing],
  );

  const isAuctionActiveNow = useMemo(() => {
    if (!onchainAuction?.end) return false;

    // Convert bigint timestamp (seconds) to number (milliseconds) safely
    const endTimestamp = Number(onchainAuction.end);
    if (!Number.isFinite(endTimestamp) || endTimestamp <= 0) return false;

    return endTimestamp * 1000 > Date.now();
  }, [onchainAuction?.end]);

  // 8) Auction timing calculations
  const auctionEndDate = useMemo(() => {
    if (!onchainAuction?.end) return null;
    const endTimestamp = Number(onchainAuction.end);
    if (!Number.isFinite(endTimestamp)) return null;
    return new Date(endTimestamp * 1000);
  }, [onchainAuction?.end]);

  const auctionTimeRemaining = useMemo(() => {
    if (!auctionEndDate || !isAuctionActiveNow) return null;
    return Math.max(0, auctionEndDate.getTime() - Date.now());
  }, [auctionEndDate, isAuctionActiveNow]);

  // 9) Current pricing with USD conversion
  const currentPriceETH = useMemo(() => {
    if (onchainListing?.price) {
      // Convert wei to ETH (assuming price is in wei)
      return (Number(onchainListing.price) / 1e18).toFixed(4);
    }
    if (onchainAuction?.bid && onchainAuction.bid > BigInt(0)) {
      return (Number(onchainAuction.bid) / 1e18).toFixed(4);
    }
    return null;
  }, [onchainListing?.price, onchainAuction?.bid]);

  const currentPriceUSD = useMemo(() => {
    if (!currentPriceETH || !ethUsd) return null;
    const usdValue = parseFloat(currentPriceETH) * ethUsd;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(usdValue);
  }, [currentPriceETH, ethUsd]);

  // 10) NFT status computation
  const status = useMemo<NFTStatus>(() => {
    if (!validInputs) return NFTStatus.ERROR;
    if (subgraphLoading) return NFTStatus.LOADING;
    if (!meta && !imgUrl && !tokenURI) return NFTStatus.NOT_FOUND;
    if (isAuctionActiveNow) return NFTStatus.AUCTION_ACTIVE;
    if (onchainAuction && !isAuctionActiveNow) return NFTStatus.AUCTION_ENDED;
    if (isForSaleNow) return NFTStatus.LISTED;
    return NFTStatus.AVAILABLE;
  }, [
    validInputs,
    subgraphLoading,
    meta,
    imgUrl,
    tokenURI,
    isAuctionActiveNow,
    onchainAuction,
    isForSaleNow,
  ]);

  // 10.5) Map activity data to correct format
  const mappedActivity = useMemo<ActivityEvent[]>(() => {
    return activity.map((item: Record<string, unknown>) => ({
      id: item.id as string,
      type: ((item.activityType as string)?.toLowerCase() || 'transfer') as ActivityEvent['type'],
      timestamp: parseInt(item.timestamp as string) * 1000, // Convert to milliseconds
      price: item.price as string,
      from: item.from as string,
      to: item.to as string,
      ...item, // Keep other properties
    }));
  }, [activity]);

  // 11) Enhanced refresh function with error handling
  const refreshAllData = useCallback(async () => {
    try {
      const refreshPromises: Promise<unknown>[] = [refetchOnchainData()];

      // Only add activity refetch if available
      if (refetchActivity) {
        refreshPromises.push(refetchActivity());
      }

      await Promise.allSettled(refreshPromises);

      console.debug('NFT data refreshed successfully for', { nft, tokenId });
    } catch (error) {
      console.error('Error refreshing NFT data:', error);
      throw error; // Re-throw to allow calling components to handle
    }
  }, [nft, tokenId, refetchOnchainData, refetchActivity]);

  return {
    // Core data
    meta: meta as NFTMetadata | null,
    imgUrl,
    tokenURI,
    tokenIdBig,
    validInputs,

    // Pricing
    ethUsd,
    currentPriceETH,
    currentPriceUSD,

    // On-chain state
    onchainListing: onchainListing || null,
    onchainAuction: onchainAuction || null,
    onchainOwner: onchainOwner || null,

    // Subgraph data
    subgraphData,
    subgraphLoading,
    activity: mappedActivity,

    // Status flags
    status,
    listedNow,
    auctionNow,
    isForSaleNow,
    isAuctionActiveNow,
    isOwnedByUser: false, // TODO: Implement user address comparison

    // Time information
    auctionTimeRemaining,
    auctionEndDate,

    // Configuration
    expectedChainId,
    MARKET: MARKET
      ? {
          address: MARKET,
          abi: [],
          chainId: expectedChainId,
        }
      : null,

    // Actions
    refreshAllData,
  };
}
