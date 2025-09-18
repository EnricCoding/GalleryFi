'use client';

import { useMemo } from 'react';
import { useReadContract } from 'wagmi';
import { CONTRACTS, AUCTION_CONFIG, isValidMarketplace } from '@/config/contracts';
import { AuctionUtils, type AuctionData, type AuctionStatus, type AuctionTiming } from '@/types/auction';
import MarketJson from '@/utils/abi/NftMarketplace.json';

const MarketAbi = MarketJson.abi;

type UseAuctionDataParams = {
  market?: `0x${string}`;
  nft?: `0x${string}`;
  tokenId: string | number | bigint;
  refetchMs?: number;
  enabled?: boolean;
};

export function useAuctionData({
  market = CONTRACTS.MARKETPLACE, // Use centralized configuration as default
  nft,
  tokenId,
  refetchMs = AUCTION_CONFIG.REFETCH_INTERVAL_MS, // Use centralized refresh interval
  enabled = true,
}: UseAuctionDataParams) {
  // Validate and normalize tokenId
  const tokenIdBig = useMemo(() => {
    try {
      return BigInt(tokenId);
    } catch {
      console.warn('[useAuctionData] Invalid tokenId:', tokenId);
      return BigInt(0);
    }
  }, [tokenId]);

  // Enhanced validation for enabled state using centralized validation
  const isEnabled = useMemo(() => {
    if (!enabled || !nft || tokenIdBig < BigInt(0)) return false;
    
    try {
      return isValidMarketplace(market);
    } catch (error) {
      console.warn('[useAuctionData] Invalid market address:', market, error);
      return false;
    }
  }, [enabled, market, nft, tokenIdBig]);

  const { data, refetch, isLoading, isFetching, error } = useReadContract({
    address: market,
    abi: MarketAbi,
    functionName: 'auctions',
    args: [nft, tokenIdBig],
    query: {
      enabled: isEnabled,
      refetchInterval: refetchMs,
      staleTime: AUCTION_CONFIG.STALE_TIME_MS,
      gcTime: AUCTION_CONFIG.GC_TIME_MS,
    },
  }) as {
    data: readonly [`0x${string}`, bigint, bigint, `0x${string}`] | undefined;
    refetch: () => Promise<unknown>;
    isLoading: boolean;
    isFetching: boolean;
    error: Error | null;
  };

  // ✅ Parse auction data using centralized utility
  const auction = useMemo<AuctionData | null>(() => {
    if (!data || !Array.isArray(data) || data.length !== 4) {
      return null;
    }
    
    const [seller, end, bid, bidder] = data;
    
    const auctionData: AuctionData = {
      seller: seller as `0x${string}`,
      end: BigInt(end || 0),
      bid: BigInt(bid || 0),
      bidder: bidder as `0x${string}`,
    };
    
    // Validate using centralized utility
    const isValid = AuctionUtils.isValidAuction(auctionData);
    return isValid ? auctionData : null;
  }, [data]);

  // ✅ Enhanced status and timing using centralized utilities
  const auctionStatus: AuctionStatus = useMemo(() => {
    return AuctionUtils.getAuctionStatus(auction);
  }, [auction]);

  const auctionTiming: AuctionTiming = useMemo(() => {
    return AuctionUtils.getAuctionTiming(auction);
  }, [auction]);

  // ✅ Bidding information using centralized utilities
  const hasBid = useMemo(() => AuctionUtils.hasBids(auction), [auction]);
  
  const isLoadingOrFetching = isLoading || isFetching;

  const isLive = useMemo(() => {
    return auctionStatus === 'live';
  }, [auctionStatus]);

  return {
    // Core auction data
    auction,
    
    // Status information using new types
    status: auctionStatus,
    isLive: isLive,
    hasEnded: auctionStatus === 'ended',
    
    // Bidding information
    hasBid,
    hasValidBidder: hasBid, // Simplified since hasBids already validates bidder
    
    // Timing information using new utility
    timeLeftMs: auctionTiming.timeLeftMs,
    timeLeftSeconds: auctionTiming.timeLeftSeconds,
    hasExpired: auctionTiming.hasExpired,
    isUrgent: auctionTiming.isUrgent,
    isCritical: auctionTiming.isCritical,
    formattedTime: auctionTiming.formattedTime,
    endTimestamp: auction ? Number(auction.end) : 0,
    
    // Loading states
    loadingAuction: isLoadingOrFetching,
    isLoading,
    isFetching,
    
    // Error handling
    error,
    hasError: !!error,
    
    // Actions
    refetchAuction: refetch,
    
    // Configuration
    isEnabled,
    marketAddress: market,
  };
}

// Re-export types for backwards compatibility
export type { AuctionData } from '@/types/auction';
