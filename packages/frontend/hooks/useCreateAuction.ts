'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAccount, useChainId, usePublicClient, useSwitchChain, useWriteContract } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import MarketJson from '@/utils/abi/NftMarketplace.json';
import NftJson from '@/utils/abi/MyNFT.json';

const MarketAbi = MarketJson.abi;
const NftAbi = NftJson.abi;

// Duration presets for better UX
export const DURATION_PRESETS = {
  '1': { hours: 1, label: '1 Hour' },
  '3': { hours: 3, label: '3 Hours' },
  '6': { hours: 6, label: '6 Hours' },
  '12': { hours: 12, label: '12 Hours' },
  '24': { hours: 24, label: '1 Day' },
  '72': { hours: 72, label: '3 Days' },
  '168': { hours: 168, label: '1 Week' },
} as const;

export type DurationPreset = keyof typeof DURATION_PRESETS;

type UseCreateAuctionParams = {
  nft?: `0x${string}`;
  tokenId: string | number | bigint;
  isOwner?: boolean;
  onCreated?: (txHash: `0x${string}`) => void;
  onStatus?: (status: string, type?: 'info' | 'success' | 'error') => void;
  enabled?: boolean;
};

export type CreateAuctionStep = 'idle' | 'approval' | 'creating' | 'success' | 'error';

export function useCreateAuction({
  nft,
  tokenId,
  isOwner = false,
  onCreated,
  onStatus,
  enabled = true,
}: UseCreateAuctionParams) {
  const MARKET = process.env.NEXT_PUBLIC_MARKET_ADDRESS as `0x${string}` | undefined;
  const EXPECTED_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? '11155111'); // Sepolia

  // Validation warnings
  if (!MARKET) {
    console.warn('[useCreateAuction] Missing NEXT_PUBLIC_MARKET_ADDRESS');
  }

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const { openConnectModal } = useConnectModal();

  // Enhanced UI state
  const [open, setOpen] = useState(false);
  const [durationHours, setDurationHours] = useState<DurationPreset>('24'); // Default to 1 day
  const [customDuration, setCustomDuration] = useState<string>('');
  const [useCustomDuration, setUseCustomDuration] = useState(false);
  const [currentStep, setCurrentStep] = useState<CreateAuctionStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

  // Normalize tokenId
  const tokenIdBig = useMemo(() => {
    try {
      return BigInt(tokenId);
    } catch {
      console.warn('[useCreateAuction] Invalid tokenId:', tokenId);
      return BigInt(0);
    }
  }, [tokenId]);

  // Enhanced computed properties
  const canCreate = useMemo(() => {
    return enabled && 
           isOwner && 
           !!MARKET && 
           !!nft && 
           tokenIdBig >= BigInt(0) &&
           nft !== '0x0000000000000000000000000000000000000000';
  }, [enabled, isOwner, MARKET, nft, tokenIdBig]);

  const isProcessing = currentStep === 'approval' || currentStep === 'creating';
  const isSuccess = currentStep === 'success';
  const hasError = currentStep === 'error' || !!error;

  // Get effective duration in seconds
  const durationSeconds = useMemo(() => {
    if (useCustomDuration) {
      const customHours = parseFloat(customDuration);
      return Number.isFinite(customHours) && customHours >= 1 
        ? Math.floor(customHours * 3600) 
        : 3600; // Default to 1 hour if invalid
    }
    return DURATION_PRESETS[durationHours].hours * 3600;
  }, [useCustomDuration, customDuration, durationHours]);

  const resetState = useCallback(() => {
    setError(null);
    setCurrentStep('idle');
    setTxHash(null);
  }, []);

  const openModal = useCallback(() => {
    if (!canCreate) return;
    if (!isConnected) {
      openConnectModal?.();
      return;
    }
    resetState();
    setDurationHours('24'); // Reset to default
    setUseCustomDuration(false);
    setCustomDuration('');
    setOpen(true);
  }, [canCreate, isConnected, openConnectModal, resetState]);

  const closeModal = useCallback(() => {
    if (isProcessing) return; // Don't close during processing
    setOpen(false);
    resetState();
  }, [isProcessing, resetState]);

  const confirmCreate = useCallback(async () => {
    try {
      resetState();
      
      // Validation
      if (!publicClient) {
        throw new Error('RPC client not available');
      }
      if (!address) {
        throw new Error('Connect your wallet');
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
      if (durationSeconds < 3600) {
        throw new Error('Duration must be at least 1 hour');
      }

      // Network check
      if (chainId !== EXPECTED_CHAIN_ID) {
        onStatus?.('Switching network…', 'info');
        await switchChainAsync?.({ chainId: EXPECTED_CHAIN_ID });
      }

      // Step 1: Check and handle approval
      setCurrentStep('approval');
      onStatus?.('Checking approval…', 'info');

      const approved = (await publicClient.readContract({
        address: nft,
        abi: NftAbi,
        functionName: 'isApprovedForAll',
        args: [address, MARKET],
      })) as boolean;

      if (!approved) {
        onStatus?.('Requesting approval…', 'info');
        const txApprove = await writeContractAsync({
          address: nft,
          abi: NftAbi,
          functionName: 'setApprovalForAll',
          args: [MARKET, true],
        });
        await publicClient.waitForTransactionReceipt({ hash: txApprove });
        onStatus?.('Approval confirmed', 'info');
      }

      // Step 2: Create auction
      setCurrentStep('creating');
      onStatus?.('Creating auction…', 'info');
      
      const tx = await writeContractAsync({
        address: MARKET,
        abi: MarketAbi,
        functionName: 'createAuction',
        args: [nft, tokenIdBig, BigInt(durationSeconds)],
      });
      
      setTxHash(tx);
      
      const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
      if (receipt.status !== 'success') {
        throw new Error('Auction transaction reverted');
      }

      // Success!
      setCurrentStep('success');
      onStatus?.('✅ Auction created successfully!', 'success');
      setOpen(false);
      onCreated?.(tx);
      
    } catch (error: unknown) {
      setCurrentStep('error');
      
      let message = 'Failed to create auction';
      const type = 'error' as const;
      
      if (error instanceof Error) {
        if (/User denied|User rejected/i.test(error.message)) {
          message = 'Transaction rejected by user';
        } else if (/insufficient funds/i.test(error.message)) {
          message = 'Insufficient funds for gas';
        } else if (/network/i.test(error.message)) {
          message = 'Network error, please try again';
        } else {
          message = error.message;
        }
      }
      
      setError(message);
      onStatus?.(`⚠️ ${message}`, type);
    }
  }, [
    address,
    chainId,
    durationSeconds,
    EXPECTED_CHAIN_ID,
    MARKET,
    nft,
    tokenIdBig,
    onCreated,
    onStatus,
    publicClient,
    resetState,
    switchChainAsync,
    writeContractAsync,
  ]);

  return {
    // Modal state
    open,
    
    // Duration settings
    durationHours,
    setDurationHours,
    customDuration,
    setCustomDuration,
    useCustomDuration,
    setUseCustomDuration,
    durationSeconds,
    durationPresets: DURATION_PRESETS,
    
    // Process state
    currentStep,
    isProcessing,
    isSuccess,
    hasError,
    error,
    txHash,
    
    // Computed properties
    canCreate,
    
    // Actions
    openModal,
    closeModal,
    confirmCreate,
    resetState,
  };
}
