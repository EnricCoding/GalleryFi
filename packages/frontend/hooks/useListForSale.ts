'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAccount, useChainId, usePublicClient, useSwitchChain, useWriteContract } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { parseEther } from 'viem';
import MarketJson from '@/utils/abi/NftMarketplace.json';
import NftJson from '@/utils/abi/MyNFT.json';

const MarketAbi = MarketJson.abi;
const NftAbi = NftJson.abi;

type ListForSaleParams = {
  nft: `0x${string}`;
  tokenId: string;
  isOwner: boolean;
  onListed?: () => void; // callback opcional tras listar
  onStatus?: (s: string) => void; // para pintar banners/toasts fuera
};

export function useListForSale({ nft, tokenId, isOwner, onListed, onStatus }: ListForSaleParams) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const { openConnectModal } = useConnectModal();

  const MARKET = process.env.NEXT_PUBLIC_MARKET_ADDRESS as `0x${string}`;
  const EXPECTED_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? '11155111'); // Sepolia

  // UI state
  const [open, setOpen] = useState(false);
  const [priceInput, setPriceInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busyApprove, setBusyApprove] = useState(false);
  const [busyList, setBusyList] = useState(false);

  const canList = useMemo(
    () => isOwner && !isNaN(Number(tokenId)) && !!MARKET,
    [isOwner, tokenId, MARKET],
  );

  const openModal = useCallback(() => {
    if (!canList) return;
    if (!isConnected) {
      openConnectModal?.();
      return;
    }
    setError(null);
    setPriceInput('');
    setOpen(true);
  }, [canList, isConnected, openConnectModal]);

  const closeModal = useCallback(() => {
    if (busyApprove || busyList) return;
    setOpen(false);
  }, [busyApprove, busyList]);

  const confirmList = useCallback(async () => {
    try {
      setError(null);

      if (!publicClient) throw new Error('RPC client not available');
      if (!address) throw new Error('Connect your wallet');
      if (!MARKET) throw new Error('Missing MARKET address');
      if (!tokenId || isNaN(Number(tokenId))) throw new Error('Invalid tokenId');

      // Validar precio
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

      // Red
      if (chainId !== EXPECTED_CHAIN_ID) {
        onStatus?.('Switching network…');
        await switchChainAsync?.({ chainId: EXPECTED_CHAIN_ID });
      }

      // Approval
      setBusyApprove(true);
      onStatus?.('Checking approval…');

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
      setBusyApprove(false);

      // Listar
      setBusyList(true);
      onStatus?.('Listing NFT…');
      const txList = await writeContractAsync({
        address: MARKET,
        abi: MarketAbi,
        functionName: 'listItem',
        args: [nft, BigInt(tokenId), priceWei],
      });
      const rcpt = await publicClient.waitForTransactionReceipt({ hash: txList });
      if (rcpt.status !== 'success') throw new Error('Listing transaction reverted');

      onStatus?.('✅ Listed successfully!');
      setOpen(false);
      onListed?.();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const msg = /User denied|User rejected/i.test(errorMessage)
        ? 'Transaction rejected in wallet'
        : errorMessage || 'Failed to list NFT';
      setError(msg);
      onStatus?.(`⚠️ ${msg}`);
    } finally {
      setBusyApprove(false);
      setBusyList(false);
    }
  }, [
    address,
    chainId,
    EXPECTED_CHAIN_ID,
    MARKET,
    nft,
    onListed,
    onStatus,
    priceInput,
    publicClient,
    switchChainAsync,
    tokenId,
    writeContractAsync,
  ]);

  return {
    // state
    open,
    priceInput,
    setPriceInput,
    error,
    busyApprove,
    busyList,
    canList,
    // actions
    openModal,
    closeModal,
    confirmList,
  };
}
