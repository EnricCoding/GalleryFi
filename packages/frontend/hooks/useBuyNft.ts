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
  onchainListing: NormalizedListing; 
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
  const { switchChain } = useSwitchChain(); 
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [busy, setBusy] = useState(false);

  const handleBuyNow = async () => {
    try {
      if (!validInputs || !tokenIdBig) throw new Error('Invalid parameters');
      if (!isConnected) throw new Error('Connect your wallet');
      if (!publicClient) throw new Error('RPC client not available');

      if (chainId !== expectedChainId) {
        try {
          switchChain?.({ chainId: expectedChainId });
          showNotification(`Switching network to ${expectedChainId}…`, 'info');
          return; 
        } catch {
          throw new Error(`Wrong network. Switch to chainId ${expectedChainId} (Sepolia).`);
        }
      }

      const price = onchainListing?.price ?? BigInt(0);
      if (!listedNow || price <= BigInt(0)) {
        throw new Error('This NFT is not currently listed');
      }

      setBusy(true);
      showNotification('Processing purchase...', 'info');

      const txHash = await writeContractAsync({
        address: MARKET,
        abi: MarketAbi,
        functionName: 'buyItem',
        args: [nft, tokenIdBig],
        value: price, // bigint
      });

      const rcpt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      if (rcpt.status !== 'success') throw new Error('Transaction reverted');

      showNotification('Purchase successful!', 'success');
      router.refresh();
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err);
      // Mensajes más claros
      const message = /User rejected|User denied|rejected/i.test(raw)
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
