// hooks/useOnchainNft.ts
'use client';

import { useMemo } from 'react';
import { useReadContract } from 'wagmi';
import { isAddress } from 'viem';
import MarketJson from '@/utils/abi/NftMarketplace.json';
import NftJson from '@/utils/abi/MyNFT.json';

const MarketAbi = MarketJson.abi;
const NftAbi = NftJson.abi;
const ZERO: `0x${string}` = '0x0000000000000000000000000000000000000000';

type ListingTuple = readonly [`0x${string}`, bigint]; // (seller, price)
type AuctionTuple = readonly [`0x${string}`, bigint, bigint, `0x${string}`]; // (seller, end, bid, bidder)

export function useOnchainNft(nft: `0x${string}`, tokenId: string) {
  const MARKET = process.env.NEXT_PUBLIC_MARKET_ADDRESS as `0x${string}`;

  // Parse tokenId -> bigint
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

  /* ---------- Reads on-chain (RAW) ---------- */

  // listings(nft, id) -> tuple
  const { data: rawListing, refetch: refetchListing } = useReadContract({
    address: MARKET,
    abi: MarketAbi,
    functionName: 'listings',
    args: [nft, tokenIdBig ?? BigInt(0)],
    query: { enabled: validInputs, refetchInterval: 10_000 }, // refresca cada 10s
  }) as { data: ListingTuple | undefined; refetch: () => void };

  // auctions(nft, id) -> tuple (seller, end, bid, bidder)
  const { data: rawAuction, refetch: refetchAuction } = useReadContract({
    address: MARKET,
    abi: MarketAbi,
    functionName: 'auctions',
    args: [nft, tokenIdBig ?? BigInt(0)],
    query: { enabled: validInputs, refetchInterval: 10_000 }, // refresca cada 10s
  }) as { data: AuctionTuple | undefined; refetch: () => void };

  // tokenURI(id)
  const { data: onchainTokenURI, refetch: refetchTokenURI } = useReadContract({
    address: nft,
    abi: NftAbi,
    functionName: 'tokenURI',
    args: [tokenIdBig ?? BigInt(0)],
    query: { enabled: validInputs }, // normalmente no cambia
  }) as { data: string | undefined; refetch: () => void };

  // ownerOf(id)
  const { data: onchainOwner, refetch: refetchOwner } = useReadContract({
    address: nft,
    abi: NftAbi,
    functionName: 'ownerOf',
    args: [tokenIdBig ?? BigInt(0)],
    query: { enabled: validInputs, refetchInterval: 15_000 }, // puede cambiar tras comprar
  }) as { data: `0x${string}` | undefined; refetch: () => void };

  /* ---------- Normalización ---------- */

  // Siempre devuelve objetos con props nombradas
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

  /* ---------- Estado derivado ---------- */

  const listedNow = !!onchainListing && onchainListing.seller !== ZERO && onchainListing.price > BigInt(0);

  const auctionNow =
    !!onchainAuction &&
    onchainAuction.seller !== ZERO &&
    Number(onchainAuction.end) > Math.floor(Date.now() / 1000); // end es bigint (uint40), seguro convertir a number

  return {
    MARKET,
    tokenIdBig,
    validInputs,
    onchainListing, // { seller, price }
    onchainAuction, // { seller, end, bid, bidder }
    onchainTokenURI, // string | undefined
    onchainOwner, // `0x...` | undefined
    listedNow,
    auctionNow,
    // Refetch functions for manual data refresh
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
