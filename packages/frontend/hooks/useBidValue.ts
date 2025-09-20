'use client';

import { useCallback, useMemo, useState } from 'react';
import { parseEther, formatEther } from 'viem';
import {
  useAccount,
  useChainId,
  usePublicClient,
  useSwitchChain,
  useWriteContract,
  useBalance,
} from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import MarketJson from '@/utils/abi/NftMarketplace.json';

const MarketAbi = MarketJson.abi;

// Bid presets for better UX
export const BID_PRESETS = {
  '+0.001': { increment: '0.001', label: '+0.001 ETH' },
  '+0.01': { increment: '0.01', label: '+0.01 ETH' },
  '+0.1': { increment: '0.1', label: '+0.1 ETH' },
  '+0.5': { increment: '0.5', label: '+0.5 ETH' },
  '+1': { increment: '1', label: '+1 ETH' },
} as const;

export type BidPreset = keyof typeof BID_PRESETS;

type UseBidAuctionParams = {
  nft?: `0x${string}`;
  tokenId: string | number | bigint;
  currentBidWei?: bigint;
  auctionEndTime?: number; 
  onBidded?: (txHash: `0x${string}`, bidAmount: bigint) => void;
  onStatus?: (status: string, type?: 'info' | 'success' | 'error') => void;
  enabled?: boolean;
};

export type BidStep = 'idle' | 'bidding' | 'success' | 'error';

// Minimum bid increment (in wei) - 0.001 ETH
const MIN_BID_INCREMENT = parseEther('0.001');

export function useBidAuction({
  nft,
  tokenId,
  currentBidWei = BigInt(0),
  auctionEndTime,
  onBidded,
  onStatus,
  enabled = true,
}: UseBidAuctionParams) {
  const MARKET = process.env.NEXT_PUBLIC_MARKET_ADDRESS as `0x${string}` | undefined;
  const EXPECTED_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? '11155111');

  // Validation warnings
  if (!MARKET) {
  }

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const { openConnectModal } = useConnectModal();

  // Get user's ETH balance
  const { data: balanceData } = useBalance({
    address,
    query: {
      enabled: !!address,
      refetchInterval: 10_000,
    },
  });

  // Normalize tokenId
  const tokenIdBig = useMemo(() => {
    try {
      return BigInt(tokenId);
    } catch {
      console.warn('[useBidAuction] Invalid tokenId:', tokenId);
      return BigInt(0);
    }
  }, [tokenId]);

  // Enhanced UI state
  const [open, setOpen] = useState(false);
  const [bidInput, setBidInput] = useState('');
  const [usePresetIncrement, setUsePresetIncrement] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState<BidPreset>('+0.01');
  const [currentStep, setCurrentStep] = useState<BidStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

  // Computed properties
  const minBidWei = useMemo(() => {
    return currentBidWei > BigInt(0) ? currentBidWei + MIN_BID_INCREMENT : MIN_BID_INCREMENT;
  }, [currentBidWei]);

  const minBidEth = useMemo(() => formatEther(minBidWei), [minBidWei]);

  const userBalance = balanceData?.value ?? BigInt(0);
  const userBalanceEth = formatEther(userBalance);

  const isProcessing = currentStep === 'bidding';
  const isSuccess = currentStep === 'success';
  const hasError = currentStep === 'error' || !!error;

  const canBid = useMemo(() => {
    return (
      enabled &&
      !!MARKET &&
      !!nft &&
      tokenIdBig >= BigInt(0) &&
      nft !== '0x0000000000000000000000000000000000000000' &&
      isConnected &&
      userBalance > minBidWei
    ); 
  }, [enabled, MARKET, nft, tokenIdBig, isConnected, userBalance, minBidWei]);

  const suggestedBidWei = useMemo(() => {
    if (usePresetIncrement) {
      const incrementWei = parseEther(BID_PRESETS[selectedPreset].increment);
      return currentBidWei + incrementWei;
    }
    return minBidWei;
  }, [usePresetIncrement, selectedPreset, currentBidWei, minBidWei]);

  const suggestedBidEth = formatEther(suggestedBidWei);

  // Time utilities for auction countdown
  const timeRemaining = useMemo(() => {
    if (!auctionEndTime) return null;
    const now = Math.floor(Date.now() / 1000);
    const remaining = auctionEndTime - now;
    return remaining > 0 ? remaining : 0;
  }, [auctionEndTime]);

  const isAuctionEnded = timeRemaining === 0;

  // Reset state utility
  const resetState = useCallback(() => {
    setError(null);
    setCurrentStep('idle');
    setTxHash(null);
  }, []);

  // Auto-fill suggested bid
  const fillSuggestedBid = useCallback(() => {
    setBidInput(suggestedBidEth);
  }, [suggestedBidEth]);

  const openModal = useCallback(() => {
    if (!canBid) return;
    if (!isConnected) {
      openConnectModal?.();
      return;
    }
    if (isAuctionEnded) {
      onStatus?.('⚠️ Auction has ended', 'error');
      return;
    }
    resetState();
    setBidInput('');
    setUsePresetIncrement(true);
    setSelectedPreset('+0.01');
    setOpen(true);
  }, [canBid, isConnected, isAuctionEnded, openConnectModal, onStatus, resetState]);

  const closeModal = useCallback(() => {
    if (isProcessing) return; 
    setOpen(false);
    resetState();
  }, [isProcessing, resetState]);

  const confirmBid = useCallback(async () => {
    try {
      resetState();

      if (!publicClient) {
        throw new Error('RPC client not available');
      }
      if (!MARKET) {
        throw new Error('Marketplace contract address not configured');
      }
      if (!nft) {
        throw new Error('NFT contract address required');
      }
      if (tokenIdBig < BigInt(0)) {
        throw new Error('Invalid tokenId');
      }
      if (isAuctionEnded) {
        throw new Error('Auction has ended');
      }

      const trimmed = bidInput.trim();
      if (!trimmed) {
        throw new Error('Enter a bid amount in ETH');
      }

      let valueWei: bigint;
      try {
        valueWei = parseEther(trimmed as `${number}`);
      } catch {
        throw new Error('Invalid ETH format');
      }

      if (valueWei <= minBidWei) {
        throw new Error(`Bid must be at least ${minBidEth} ETH`);
      }

      if (valueWei > userBalance) {
        throw new Error('Insufficient balance for this bid');
      }

      if (chainId !== EXPECTED_CHAIN_ID) {
        onStatus?.('Switching network…', 'info');
        await switchChainAsync?.({ chainId: EXPECTED_CHAIN_ID });
      }

      setCurrentStep('bidding');
      onStatus?.('Placing bid…', 'info');

      const tx = await writeContractAsync({
        address: MARKET,
        abi: MarketAbi,
        functionName: 'bid',
        args: [nft, tokenIdBig],
        value: valueWei,
      });

      setTxHash(tx);

      const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
      if (receipt.status !== 'success') {
        throw new Error('Bid transaction reverted');
      }

      setCurrentStep('success');
      onStatus?.('Bid placed successfully!', 'success');
      setOpen(false);
      onBidded?.(tx, valueWei);
    } catch (error: unknown) {
      setCurrentStep('error');

      let message = 'Failed to place bid';
      const type = 'error' as const;

      if (error instanceof Error) {
        if (/User denied|User rejected/i.test(error.message)) {
          message = 'Transaction rejected by user';
        } else if (/insufficient funds/i.test(error.message)) {
          message = 'Insufficient funds for gas or bid';
        } else if (/network/i.test(error.message)) {
          message = 'Network error, please try again';
        } else if (/auction.*end/i.test(error.message)) {
          message = 'Auction has ended';
        } else {
          message = error.message;
        }
      }

      setError(message);
      onStatus?.(message, type);
    }
  }, [
    resetState,
    publicClient,
    MARKET,
    nft,
    tokenIdBig,
    isAuctionEnded,
    bidInput,
    minBidWei,
    minBidEth,
    userBalance,
    chainId,
    EXPECTED_CHAIN_ID,
    onStatus,
    switchChainAsync,
    writeContractAsync,
    onBidded,
  ]);

  return {
    open,
    bidInput,
    setBidInput,
    usePresetIncrement,
    setUsePresetIncrement,
    selectedPreset,
    setSelectedPreset,
    bidPresets: BID_PRESETS,
    currentStep,
    isProcessing,
    isSuccess,
    hasError,
    error,
    txHash,
    minBidWei,
    minBidEth,
    suggestedBidWei,
    suggestedBidEth,
    userBalance,
    userBalanceEth,
    canBid,
    timeRemaining,
    isAuctionEnded,
    openModal,
    closeModal,
    confirmBid,
    fillSuggestedBid,
    resetState,
  };
}
