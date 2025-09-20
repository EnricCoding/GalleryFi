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

  const { data: onchainOwner, refetch: refetchOwner } = useReadContract({
    address: nft,
    abi: NftAbi,
    functionName: 'ownerOf',
    args: [tokenIdBig ?? BigInt(0)],
    query: { 
      enabled: validInputs, 
      refetchInterval: 5_000, 
      staleTime: 1_000,
    }, 
  }) as { data: `0x${string}` | undefined; refetch: () => void };

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
  return {
    MARKET,
    tokenIdBig,
    validInputs,
    onchainListing, 
    onchainAuction,
    onchainTokenURI,
    onchainOwner,
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
