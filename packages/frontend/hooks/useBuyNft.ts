'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useChainId, usePublicClient, useSwitchChain, useWriteContract } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import MarketJson from '@/utils/abi/NftMarketplace.json';

const MarketAbi = MarketJson.abi;

type NormalizedListing = { seller: `0x${string}`; price: bigint } | undefined;

interface UseBuyNftProps {
  nft: `0x${string}`;
  tokenIdBig: bigint | null;
  validInputs: boolean;
  listedNow: boolean;
  onchainListing: NormalizedListing;
  expectedChainId: number;
  MARKET: `0x${string}`;
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  refreshData?: () => Promise<void>;
  refetchListing?: () => Promise<unknown>;
  refetchOwner?: () => Promise<unknown>;
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
  refreshData,
  refetchListing,
  refetchOwner,
}: UseBuyNftProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [busy, setBusy] = useState(false);

  const handleBuyNow = async () => {
    if (busy) return; 
    try {
      if (!validInputs || !tokenIdBig) throw new Error('Invalid parameters');
      if (!isConnected) throw new Error('Connect your wallet');
      if (!publicClient) throw new Error('RPC client not available');

      if (
        address &&
        onchainListing?.seller &&
        address.toLowerCase() === onchainListing.seller.toLowerCase()
      ) {
        throw new Error('You are the seller of this NFT.');
      }

      // Asegura red correcta
      if (chainId !== expectedChainId) {
        try {
          showNotification(`Switching network to ${expectedChainId}…`, 'info');
          await switchChainAsync?.({ chainId: expectedChainId });
        } catch {
          throw new Error(`Wrong network. Switch to chainId ${expectedChainId} (Sepolia).`);
        }
      }

      const price = onchainListing?.price ?? BigInt(0);
      const sellerOk =
        !!onchainListing?.seller &&
        onchainListing.seller !== ('0x0000000000000000000000000000000000000000' as `0x${string}`);
      if (!listedNow || !sellerOk || price <= BigInt(0)) {
        throw new Error('This NFT is not currently listed');
      }

      setBusy(true);
      showNotification('Processing purchase...', 'info');

      const txHash = await writeContractAsync({
        address: MARKET,
        abi: MarketAbi,
        functionName: 'buyItem',
        args: [nft, tokenIdBig],
        value: price,
      });

      const rcpt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      if (rcpt.status !== 'success') throw new Error('Transaction reverted');

      showNotification('🎉 Purchase successful! Updating information…', 'success');

      await Promise.allSettled([refetchListing?.(), refetchOwner?.()]);
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      if (refreshData) {
        try {
          await refreshData(); 
          setTimeout(() => {
            refreshData().catch(() => {
            });
          }, 3000); 
        } catch {
          router.refresh();
        }
      } else {
        router.refresh();
      }
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err);
      const message = /You are the seller/i.test(raw)
        ? 'You cannot buy your own listing.'
        : /User rejected|User denied|rejected/i.test(raw)
          ? 'Transaction rejected in wallet.'
          : /insufficient funds|gas/i.test(raw)
            ? 'Insufficient funds for gas or value.'
            : raw || 'Unknown error during purchase';
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
  };
}
