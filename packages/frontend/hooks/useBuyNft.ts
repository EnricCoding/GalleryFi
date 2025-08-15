'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useChainId, usePublicClient, useSwitchChain, useWriteContract } from 'wagmi';
import MarketJson from '@/utils/abi/NftMarketplace.json';

const MarketAbi = MarketJson.abi;

type NormalizedListing = { seller: `0x${string}`; price: bigint } | undefined;

interface UseBuyNftProps {
  nft: `0x${string}`;
  tokenIdBig: bigint | null;
  validInputs: boolean;
  listedNow: boolean;
  onchainListing: NormalizedListing; // ✅ ahora esperamos el objeto normalizado
  expectedChainId: number;
  MARKET: `0x${string}`;
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

export function useBuyNft({
  nft,
  tokenIdBig,
  validInputs,
  listedNow,
  onchainListing,
  expectedChainId,
  MARKET,
  showNotification,
}: UseBuyNftProps) {
  const router = useRouter();
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain(); // ✅ versión async
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [busy, setBusy] = useState(false);

  const handleBuyNow = async () => {
    try {
      if (!validInputs || !tokenIdBig) throw new Error('Invalid parameters');
      if (!isConnected) throw new Error('Connect your wallet');
      if (!publicClient) throw new Error('RPC client not available');

      // ✅ intenta cambiar de red y solo lanza si falla
      if (chainId !== expectedChainId) {
        try {
          await switchChainAsync?.({ chainId: expectedChainId });
        } catch {
          throw new Error(`Wrong network. Switch to chainId ${expectedChainId} (Sepolia).`);
        }
      }

      if (!listedNow || !onchainListing?.price || onchainListing.price <= BigInt(0)) {
        throw new Error('This NFT is not currently listed');
      }

      setBusy(true);
      showNotification('Processing purchase...', 'info');

      const txHash = await writeContractAsync({
        address: MARKET,
        abi: MarketAbi,
        functionName: 'buyItem',
        args: [nft, tokenIdBig],
        value: onchainListing.price, // ✅ bigint
      });

      const rcpt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      if (rcpt.status !== 'success') throw new Error('Transaction reverted');

      showNotification('Purchase successful!', 'success');
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error during purchase';
      showNotification(message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return {
    busy,
    handleBuyNow,
    isConnected,
    chainId,
    expectedChainId,
    switchChain: switchChainAsync, 
  };
}
