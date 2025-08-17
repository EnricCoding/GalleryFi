// hooks/useNftData.ts
'use client';

import { useMemo } from 'react';
import { useNftActivity } from './useNftActivity';
import { useNftMetadata } from './useNftMetadata';
import { useEthUsd } from './useEthUsd';
import { useOnchainNft } from './useOnChainNft';

type Params = {
  nft: `0x${string}`;
  tokenId: string;
};

export function useNftData({ nft, tokenId }: Params) {
  const expectedChainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 11155111);

  // 1) On-chain (normalize tuplas → objetos con props nombradas)
  const {
    MARKET,
    tokenIdBig,
    validInputs,
    onchainListing, // { seller, price } | undefined
    onchainAuction, // { seller, end, bid, bidder } | undefined
    onchainTokenURI, // string | undefined
    onchainOwner, // `0x...` | undefined
    listedNow,
    auctionNow,
    refetchOnchainData,
  } = useOnchainNft(nft, tokenId);

  // 2) Subgraph
  const { subgraphData, subgraphLoading, activity, refetchActivity } = useNftActivity(nft, tokenIdBig);

  // 3) tokenURI preferente y metadata IPFS
  const tokenURI: string | null = useMemo(() => {
    // Dependemos sólo de los campos que cambian realmente
    const sgTokenURI = subgraphData?.listings?.[0]?.tokenURI ?? null;
    return onchainTokenURI ?? sgTokenURI ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onchainTokenURI, subgraphData?.listings?.[0]?.tokenURI]);

  const { meta, imgUrl } = useNftMetadata(tokenURI);

  // 4) ETH → USD (opcional en UI)
  const { ethUsd } = useEthUsd();

  return {
    // Data derivada
    meta,
    imgUrl,
    ethUsd,
    tokenURI,
    tokenIdBig,
    validInputs,

    // On-chain
    onchainListing, // { seller, price } normalizado
    onchainAuction, // { seller, end, bid, bidder } normalizado
    onchainOwner, // holder actual (puede ser el marketplace si está listado)

    // Subgraph
    subgraphData,
    subgraphLoading,
    activity,

    // Estado
    listedNow,
    auctionNow,

    // Config
    expectedChainId,
    MARKET,

    // Refetch functions for manual data refresh
    refreshAllData: async () => {
      try {
        await Promise.all([
          refetchOnchainData(),
          refetchActivity(),
        ]);
      } catch (error) {
        console.warn('Error refreshing NFT data:', error);
      }
    },
  };
}
