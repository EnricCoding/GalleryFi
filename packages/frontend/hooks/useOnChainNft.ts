'use client';

import { useMemo } from 'react';
import { useReadContract } from 'wagmi';
import { isAddress } from 'viem';
import MarketJson from '@/utils/abi/NftMarketplace.json';
import NftJson from '@/utils/abi/MyNFT.json';

const MarketAbi = MarketJson.abi;
const NftAbi = NftJson.abi;
const ZERO: `0x${string}` = '0x0000000000000000000000000000000000000000';

type ListingTuple = readonly [`0x${string}`, bigint]; 
type AuctionTuple = readonly [`0x${string}`, bigint, bigint, `0x${string}`]; 

export function useOnchainNft(nft: `0x${string}`, tokenId: string) {
  const MARKET = process.env.NEXT_PUBLIC_MARKET_ADDRESS as `0x${string}`;

  const tokenIdBig = useMemo<bigint | null>(() => {
    const t = tokenId?.trim?.() ?? '';
    if (!/^\d+$/.test(t)) return null;
    try {
      return BigInt(t);
    } catch {
      return null;
    }
  }, [tokenId]);

  const validInputs = isAddress(nft) && !!tokenIdBig && isAddress(MARKET);

  const { data: rawListing, refetch: refetchListing } = useReadContract({
    address: MARKET,
    abi: MarketAbi,
    functionName: 'listings',
    args: [nft, tokenIdBig ?? BigInt(0)],
    query: { enabled: validInputs, refetchInterval: 10_000 }, 
  }) as { data: ListingTuple | undefined; refetch: () => void };

  const { data: rawAuction, refetch: refetchAuction } = useReadContract({
    address: MARKET,
    abi: MarketAbi,
    functionName: 'auctions',
    args: [nft, tokenIdBig ?? BigInt(0)],
    query: { enabled: validInputs, refetchInterval: 10_000 }, 
  }) as { data: AuctionTuple | undefined; refetch: () => void };

  const { data: onchainTokenURI, refetch: refetchTokenURI } = useReadContract({
    address: nft,
    abi: NftAbi,
    functionName: 'tokenURI',
    args: [tokenIdBig ?? BigInt(0)],
    query: { enabled: validInputs },
  }) as { data: string | undefined; refetch: () => void };

  const { data: onchainOwner, refetch: refetchOwner, isLoading: isOwnerLoading, error: ownerError } = useReadContract({
    address: nft,
    abi: NftAbi,
    functionName: 'ownerOf',
    args: [tokenIdBig ?? BigInt(0)],
    query: { 
      enabled: validInputs, 
      refetchInterval: 5_000, 
      staleTime: 1_000,
      retry: (failureCount, error) => {
        console.log(`🔄 [useOnChainNft] Retry attempt ${failureCount} for token ${tokenId}`, error)
        return failureCount < 3
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
    }, 
  }) as { data: `0x${string}` | undefined; refetch: () => void; isLoading: boolean; error: Error | null };

  const onchainListing = useMemo(
    () => (rawListing ? { seller: rawListing[0], price: rawListing[1] } : undefined),
    [rawListing],
  );

  const onchainAuction = useMemo(
    () =>
      rawAuction
        ? { seller: rawAuction[0], end: rawAuction[1], bid: rawAuction[2], bidder: rawAuction[3] }
        : undefined,
    [rawAuction],
  );

  const listedNow = !!onchainListing && onchainListing.seller !== ZERO && onchainListing.price > BigInt(0);

  const auctionNow =
    !!onchainAuction &&
    onchainAuction.seller !== ZERO &&
    Number(onchainAuction.end) > Math.floor(Date.now() / 1000);

  // Enhanced debug logging for ownership detection (moved after variable declarations)
  if (typeof window !== 'undefined' && validInputs && tokenIdBig) {
    console.log('🔍 [useOnchainNft] Enhanced Debug Info:', {
      nft,
      tokenId: tokenIdBig.toString(),
      onchainOwner,
      marketplaceAddress: MARKET,
      hasValidInputs: validInputs,
      isOwnerLoading,
      ownerError: ownerError?.message,
      ownerErrorDetails: ownerError,
      // LISTING DATA
      onchainListing: rawListing,
      listingSeller: rawListing?.[0],
      listingPrice: rawListing?.[1]?.toString(),
      listedNow,
      // AUCTION DATA  
      onchainAuction: rawAuction,
      auctionSeller: rawAuction?.[0],
      auctionNow,
      timestamp: new Date().toISOString()
    });

    // Warning si no hay owner después de cargar
    if (!isOwnerLoading && !onchainOwner && !ownerError) {
      console.warn('⚠️ [useOnChainNft] No owner found after loading completed for NFT', {
        nft,
        tokenId: tokenIdBig.toString()
      });
    }

    // Info sobre listing/auction estado
    if (rawListing && rawListing[0] !== ZERO) {
      console.log('📋 [useOnChainNft] NFT is LISTED by:', rawListing[0]);
    }
    if (rawAuction && rawAuction[0] !== ZERO) {
      console.log('🏛️ [useOnChainNft] NFT has AUCTION by:', rawAuction[0]);
    }
  }
  return {
    MARKET,
    tokenIdBig,
    validInputs,
    onchainListing, 
    onchainAuction,
    onchainTokenURI,
    onchainOwner,
    isOwnerLoading,
    ownerError,
    listedNow,
    auctionNow,
    refetchOnchainData: async () => {
      await Promise.all([
        refetchListing(),
        refetchAuction(),
        refetchTokenURI(),
        refetchOwner(),
      ]);
    },
  };
}
