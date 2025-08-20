'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAccount, useChainId, usePublicClient, useSwitchChain, useWriteContract } from 'wagmi';
import MarketJson from '@/utils/abi/NftMarketplace.json';

const MarketAbi = MarketJson.abi;

type Params = {
  nft: `0x${string}`;
  tokenId: string; 
  isForSale: boolean; 
  isOwner: boolean;
  onCanceled?: () => void; 
  onStatus?: (s: string) => void; 
};

export function useCancelListing({
  nft,
  tokenId,
  isForSale,
  isOwner,
  onCanceled,
  onStatus,
}: Params) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const MARKET = process.env.NEXT_PUBLIC_MARKET_ADDRESS as `0x${string}`;
  const EXPECTED_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? '11155111'); // Sepolia

  const [busyCancel, setBusyCancel] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCancel = useMemo(
    () => isOwner && isForSale && !!MARKET && tokenId !== '' && !isNaN(Number(tokenId)),
    [isOwner, isForSale, MARKET, tokenId],
  );

  const cancel = useCallback(async () => {
    try {
      setError(null);

      if (!canCancel) throw new Error('Not cancellable right now');
      if (!isConnected) throw new Error('Connect your wallet');
      if (!publicClient) throw new Error('RPC client not available');

      // Red
      if (chainId !== EXPECTED_CHAIN_ID) {
        onStatus?.('Switching network…');
        await switchChainAsync?.({ chainId: EXPECTED_CHAIN_ID });
      }

      // Ejecuta delistItem(nft, id)
      setBusyCancel(true);
      onStatus?.('Cancelling listing…');

      const txHash = await writeContractAsync({
        address: MARKET,
        abi: MarketAbi,
        functionName: 'delistItem', // ← NOMBRE CORRECTO EN TU CONTRATO
        args: [nft, BigInt(tokenId)],
      });

      const rcpt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      if (rcpt.status !== 'success') throw new Error('Cancel transaction reverted');

      onStatus?.('✅ Listing cancelled');
      onCanceled?.();
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err);
      const msg = /User denied|User rejected/i.test(raw)
        ? 'Transaction rejected in wallet'
        : raw || 'Failed to cancel listing';
      setError(msg);
      onStatus?.(`⚠️ ${msg}`);
    } finally {
      setBusyCancel(false);
    }
  }, [
    canCancel,
    isConnected,
    publicClient,
    chainId,
    EXPECTED_CHAIN_ID,
    switchChainAsync,
    MARKET,
    nft,
    tokenId,
    writeContractAsync,
    onCanceled,
    onStatus,
  ]);

  return {
    // estado
    busyCancel,
    error,
    canCancel,
    // acción
    cancel,
  };
}
