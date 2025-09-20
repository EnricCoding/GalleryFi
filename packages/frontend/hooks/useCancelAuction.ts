'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAccount, useChainId, usePublicClient, useSwitchChain, useWriteContract } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';

type UseCancelAuctionParams = {
  nft: `0x${string}`;
  tokenId: string | number | bigint;
  canCancel?: boolean;
  isOwner?: boolean;
  hasBids?: boolean;
  isLive?: boolean;
  onCanceled?: (txHash: `0x${string}`, success: boolean) => void;
  onStatus?: (status: string) => void;
  enabled?: boolean;
};

export type CancelAuctionStep =
  | 'idle'
  | 'connect'
  | 'validating'
  | 'preparing'
  | 'switching_network'
  | 'confirming'
  | 'pending'
  | 'success'
  | 'error';

export type CancelAuctionReason =
  | 'not_connected'
  | 'not_owner'
  | 'has_bids'
  | 'not_live'
  | 'cancelled_successfully'
  | 'transaction_failed'
  | 'user_rejected'
  | 'insufficient_gas'
  | 'unknown_error';

export function useCancelAuction({
  nft,
  tokenId,
  canCancel,
  isOwner = false,
  hasBids = false,
  isLive = true,
  onCanceled,
  onStatus,
  enabled = true,
}: UseCancelAuctionParams) {
  const MARKET = process.env.NEXT_PUBLIC_MARKET_ADDRESS as `0x${string}` | undefined;
  const EXPECTED_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? '11155111');

  if (!MARKET) {
    console.warn('[useCancelAuction] Missing NEXT_PUBLIC_MARKET_ADDRESS');
  }

  const { isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const { openConnectModal } = useConnectModal();

  const tokenIdBig = useMemo(() => {
    try {
      return BigInt(tokenId);
    } catch {
      console.warn('[useCancelAuction] Invalid tokenId:', tokenId);
      return BigInt(0);
    }
  }, [tokenId]);

  const [currentStep, setCurrentStep] = useState<CancelAuctionStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [cancelReason, setCancelReason] = useState<CancelAuctionReason | null>(null);

  const isNetworkCorrect = chainId === EXPECTED_CHAIN_ID;
  const canCancelComputed = useMemo(() => {
    if (canCancel !== undefined) return canCancel;
    return isOwner && !hasBids && isLive;
  }, [canCancel, isOwner, hasBids, isLive]);

  const isReady = useMemo(() => {
    return enabled && isConnected && MARKET && tokenIdBig > BigInt(0);
  }, [enabled, isConnected, MARKET, tokenIdBig]);

  const cancelAuction = useCallback(async () => {
    try {
      setError(null);
      setTxHash(null);
      setCancelReason(null);

      if (!isConnected) {
        setCurrentStep('connect');
        setCancelReason('not_connected');
        openConnectModal?.();
        return;
      }

      if (!isReady) {
        setError('Missing required configuration or invalid token ID');
        return;
      }

      setCurrentStep('validating');
      onStatus?.('Validating auction conditions...');

      if (isOwner === false) {
        setCurrentStep('error');
        setError('Only auction owner can cancel');
        setCancelReason('not_owner');
        return;
      }

      if (hasBids) {
        setCurrentStep('error');
        setError('Cannot cancel auction with existing bids');
        setCancelReason('has_bids');
        return;
      }

      if (!isLive) {
        setCurrentStep('error');
        setError('Auction is not live');
        setCancelReason('not_live');
        return;
      }

      if (!canCancelComputed) {
        setCurrentStep('error');
        setError('Auction cannot be cancelled at this time');
        return;
      }

      setCurrentStep('preparing');
      onStatus?.('Preparing to cancel auction...');

      if (!isNetworkCorrect) {
        setCurrentStep('switching_network');
        onStatus?.('Switching network...');

        try {
          await switchChainAsync({ chainId: EXPECTED_CHAIN_ID });
        } catch (switchError) {
          console.warn('[useCancelAuction] Network switch failed:', switchError);
          setError('Failed to switch network');
          setCurrentStep('idle');
          return;
        }
      }

      setCurrentStep('confirming');
      onStatus?.('Please confirm transaction...');

      const hash = await writeContractAsync({
        address: MARKET!,
        abi: [
          {
            inputs: [
              { name: 'nftAddress', type: 'address' },
              { name: 'tokenId', type: 'uint256' },
            ],
            name: 'cancelAuction',
            outputs: [],
            stateMutability: 'nonpayable',
            type: 'function',
          },
        ],
        functionName: 'cancelAuction',
        args: [nft, tokenIdBig],
      });

      setTxHash(hash);
      setCurrentStep('pending');
      onStatus?.('Transaction submitted...');

      if (!publicClient) throw new Error('Public client not available');

      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        timeout: 60_000,
      });

      if (receipt?.status === 'success') {
        setCurrentStep('success');
        setCancelReason('cancelled_successfully');
        onStatus?.('Auction cancelled successfully!');
        onCanceled?.(hash, true);
      } else {
        setCurrentStep('error');
        setError('Transaction failed');
        setCancelReason('transaction_failed');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[useCancelAuction] Error:', err);

      setCurrentStep('error');

      if (errorMessage.includes('User rejected')) {
        setError('Transaction was cancelled');
        setCancelReason('user_rejected');
      } else if (errorMessage.includes('insufficient funds')) {
        setError('Insufficient funds for gas fees');
        setCancelReason('insufficient_gas');
      } else {
        setError(errorMessage || 'Failed to cancel auction');
        setCancelReason('unknown_error');
      }

      onStatus?.(`Error: ${errorMessage || 'Failed to cancel auction'}`);
    }
  }, [
    isConnected,
    isReady,
    isOwner,
    hasBids,
    isLive,
    canCancelComputed,
    isNetworkCorrect,
    openConnectModal,
    onStatus,
    switchChainAsync,
    EXPECTED_CHAIN_ID,
    writeContractAsync,
    MARKET,
    nft,
    tokenIdBig,
    publicClient,
    onCanceled,
    setCurrentStep,
    setError,
    setTxHash,
    setCancelReason,
  ]);

  return {
    cancelAuction,
    currentStep,
    error,
    txHash,
    cancelReason,
    canCancel: canCancelComputed,
    isReady,
    isNetworkCorrect,
    isConnected,
    isIdle: currentStep === 'idle',
    isValidating: currentStep === 'validating',
    isPreparing: currentStep === 'preparing',
    isSwitchingNetwork: currentStep === 'switching_network',
    isConfirming: currentStep === 'confirming',
    isPending: currentStep === 'pending',
    isSuccess: currentStep === 'success',
    isError: currentStep === 'error',
    isConnecting: currentStep === 'connect',
    isBusy: ['validating', 'preparing', 'switching_network', 'confirming', 'pending'].includes(
      currentStep,
    ),
    busyCancel: ['validating', 'preparing', 'switching_network', 'confirming', 'pending'].includes(
      currentStep,
    ), 
  };
}
