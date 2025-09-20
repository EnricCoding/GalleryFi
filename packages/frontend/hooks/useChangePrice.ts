'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAccount, useChainId, usePublicClient, useSwitchChain, useWriteContract } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { parseEther } from 'viem';
import MarketJson from '@/utils/abi/NftMarketplace.json';
import NftJson from '@/utils/abi/MyNFT.json';

const MarketAbi = MarketJson.abi;
const NftAbi = NftJson.abi;

type ChangePriceParams = {
  nft: `0x${string}`;
  tokenId: string;
  isOwner: boolean;
  isForSale: boolean;
  onChanged?: () => void; 
  onStatus?: (s: string) => void; 
};

export function useChangePrice({
  nft,
  tokenId,
  isOwner,
  isForSale,
  onChanged,
  onStatus,
}: ChangePriceParams) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const { openConnectModal } = useConnectModal();

  const MARKET = process.env.NEXT_PUBLIC_MARKET_ADDRESS as `0x${string}`;
  const EXPECTED_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? '11155111'); 

  const [open, setOpen] = useState(false);
  const [priceInput, setPriceInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busyChange, setBusyChange] = useState(false);

  const canChange = useMemo(
    () => isOwner && isForSale && !isNaN(Number(tokenId)) && !!MARKET,
    [isOwner, isForSale, tokenId, MARKET],
  );

  const openModal = useCallback(
    (prefillEth?: string | null) => {
      if (!canChange) return;
      if (!isConnected) {
        openConnectModal?.();
        return;
      }
      setError(null);
      setPriceInput(prefillEth ?? '');
      setOpen(true);
    },
    [canChange, isConnected, openConnectModal],
  );

  const closeModal = useCallback(() => {
    if (busyChange) return;
    setOpen(false);
  }, [busyChange]);

  const confirmChange = useCallback(async () => {
    try {
      setError(null);

      if (!publicClient) throw new Error('RPC client not available');
      if (!address) throw new Error('Connect your wallet');
      if (!MARKET) throw new Error('Missing MARKET address');
      if (!tokenId || isNaN(Number(tokenId))) throw new Error('Invalid tokenId');

      const trimmed = priceInput.trim();
      if (!trimmed) throw new Error('Enter a price in ETH');
      const eth = Number(trimmed);
      if (!isFinite(eth) || eth <= 0) throw new Error('Price must be greater than 0');

      let priceWei: bigint;
      try {
        priceWei = parseEther(trimmed as `${number}`);
      } catch {
        throw new Error('Invalid ETH format');
      }

      if (chainId !== EXPECTED_CHAIN_ID) {
        onStatus?.('Switching network…');
        await switchChainAsync?.({ chainId: EXPECTED_CHAIN_ID });
      }

      setBusyChange(true);
      onStatus?.('Changing price…');

      try {
        const tx = await writeContractAsync({
          address: MARKET,
          abi: MarketAbi,
          functionName: 'setPrice', 
          args: [nft, BigInt(tokenId), priceWei],
        });
        await publicClient.waitForTransactionReceipt({ hash: tx });
        onStatus?.('✅ Price updated!');
        setOpen(false);
        onChanged?.();
        return;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        const notFound =
          /Function "setPrice" not found on ABI|Encoded function | function selector/i.test(msg);
        if (!notFound) throw e;
      }

      onStatus?.('delisting…');
      const txDelist = await writeContractAsync({
        address: MARKET,
        abi: MarketAbi,
        functionName: 'delistItem',
        args: [nft, BigInt(tokenId)],
      });
      await publicClient.waitForTransactionReceipt({ hash: txDelist });

      const approved = (await publicClient.readContract({
        address: nft,
        abi: NftAbi,
        functionName: 'isApprovedForAll',
        args: [address, MARKET],
      })) as boolean;

      if (!approved) {
        onStatus?.('Requesting approval…');
        const txApprove = await writeContractAsync({
          address: nft,
          abi: NftAbi,
          functionName: 'setApprovalForAll',
          args: [MARKET, true],
        });
        await publicClient.waitForTransactionReceipt({ hash: txApprove });
      }

      onStatus?.('Relisting with new price…');
      const txList = await writeContractAsync({
        address: MARKET,
        abi: MarketAbi,
        functionName: 'listItem',
        args: [nft, BigInt(tokenId), priceWei],
      });
      await publicClient.waitForTransactionReceipt({ hash: txList });

      onStatus?.('✅ Price updated!');
      setOpen(false);
      onChanged?.();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const msg = /User denied|User rejected/i.test(errorMessage)
        ? 'Transaction rejected in wallet'
        : errorMessage || 'Failed to change price';
      setError(msg);
      onStatus?.(`⚠️ ${msg}`);
    } finally {
      setBusyChange(false);
    }
  }, [
    address,
    chainId,
    EXPECTED_CHAIN_ID,
    MARKET,
    nft,
    onChanged,
    onStatus,
    priceInput,
    publicClient,
    switchChainAsync,
    tokenId,
    writeContractAsync,
  ]);

  return {
    open,
    priceInput,
    setPriceInput,
    error,
    busyChange,
    canChange,
    openModal,
    closeModal,
    confirmChange,
  };
}
