'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAccount, useChainId, usePublicClient, useSwitchChain, useWriteContract } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';

type UseEndAuctionParams = {
  nft: `0x${string}`;
  tokenId: string | number | bigint;
  auctionEndTime?: number; 
  hasWinner?: boolean;
  isOwner?: boolean;
  onEnded?: (txHash: `0x${string}`, success: boolean) => void;
  onStatus?: (status: string) => void;
  enabled?: boolean;
};

export type EndAuctionStep =
  | 'idle'
  | 'connect'
  | 'preparing'
  | 'switching_network'
  | 'confirming'
  | 'pending'
  | 'success'
  | 'error';

export type AuctionEndReason =
  | 'not_connected'
  | 'ended_successfully'
  | 'transaction_failed'
  | 'user_rejected'
  | 'insufficient_gas'
  | 'unknown_error';

export function useEndAuction({
  nft,
  tokenId,
  auctionEndTime,
  hasWinner,
  onEnded,
  onStatus,
  enabled = true,
}: UseEndAuctionParams) {
  const MARKET = process.env.NEXT_PUBLIC_MARKET_ADDRESS as `0x${string}` | undefined;
  const EXPECTED_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? '11155111');

  if (!MARKET) {
    console.warn('[useEndAuction] Missing NEXT_PUBLIC_MARKET_ADDRESS');
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
      console.warn('[useEndAuction] Invalid tokenId:', tokenId);
      return BigInt(0);
    }
  }, [tokenId]);

  const [currentStep, setCurrentStep] = useState<EndAuctionStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [endReason, setEndReason] = useState<AuctionEndReason | null>(null);

  const isNetworkCorrect = chainId === EXPECTED_CHAIN_ID;
  const canEnd = useMemo(() => {
    if (!auctionEndTime) {

      return false;
    }
    const result = Date.now() >= auctionEndTime;
    console.debug('[useEndAuction] canEnd calculation:', {
      auctionEndTime,
      currentTime: Date.now(),
      canEnd: result,
      timeLeft: auctionEndTime - Date.now()
    });
    return result;
  }, [auctionEndTime]);

  const isReady = useMemo(() => {
    return enabled && isConnected && MARKET && tokenIdBig > BigInt(0);
  }, [enabled, isConnected, MARKET, tokenIdBig]);

  const endAuction = useCallback(async () => {
    try {
      setError(null);
      setTxHash(null);
      setEndReason(null);

      // Connection validation
      if (!isConnected) {
        console.warn('[useEndAuction] User not connected');
        setCurrentStep('connect');
        setEndReason('not_connected');
        openConnectModal?.();
        return;
      }

      if (!isReady) {
        console.warn('[useEndAuction] Not ready:', { enabled, isConnected, MARKET, tokenIdBig });
        setError('Missing required configuration or invalid token ID');
        return;
      }

      if (!canEnd) {
        console.warn('[useEndAuction] Cannot end auction yet:', { canEnd, auctionEndTime, now: Date.now() });
        setError('Auction cannot be ended yet');
        return;
      }

      setCurrentStep('preparing');
      onStatus?.('Preparing to end auction...');

      // Network validation
      if (!isNetworkCorrect) {
        setCurrentStep('switching_network');
        onStatus?.('Switching network...');

        try {
          await switchChainAsync({ chainId: EXPECTED_CHAIN_ID });
        } catch (switchError) {
          console.warn('[useEndAuction] Network switch failed:', switchError);
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
            name: 'endAuction',
            outputs: [],
            stateMutability: 'nonpayable',
            type: 'function',
          },
        ],
        functionName: 'endAuction',
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
        setEndReason('ended_successfully');
        
        if (hasWinner) {
          onStatus?.('Auction ended - NFT transferred to winner!');
        } else {
          onStatus?.('Auction ended - NFT returned to seller (no bids)');
        }
        
        onEnded?.(hash, true);
      } else {
        setCurrentStep('error');
        setError('Transaction failed');
        setEndReason('transaction_failed');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[useEndAuction] Error:', err);

      setCurrentStep('error');

      if (errorMessage.includes('User rejected')) {
        setError('Transaction was cancelled');
        setEndReason('user_rejected');
      } else if (errorMessage.includes('insufficient funds')) {
        setError('Insufficient funds for gas fees');
        setEndReason('insufficient_gas');
      } else {
        setError(errorMessage || 'Failed to end auction');
        setEndReason('unknown_error');
      }

      onStatus?.(`Error: ${errorMessage || 'Failed to end auction'}`);
    }
  }, [
    isConnected,
    isReady,
    canEnd,
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
    onEnded,
    setCurrentStep,
    setError,
    setTxHash,
    setEndReason,
    auctionEndTime,
    enabled,
    hasWinner,
  ]);

  return {
    endAuction,
    currentStep,
    error,
    txHash,
    endReason,
    canEnd,
    isReady,
    isNetworkCorrect,
    isConnected,
    isIdle: currentStep === 'idle',
    isPreparing: currentStep === 'preparing',
    isSwitchingNetwork: currentStep === 'switching_network',
    isConfirming: currentStep === 'confirming',
    isPending: currentStep === 'pending',
    isSuccess: currentStep === 'success',
    isError: currentStep === 'error',
    isConnecting: currentStep === 'connect',
    isBusy: ['preparing', 'switching_network', 'confirming', 'pending'].includes(currentStep),
    busyEnd: ['preparing', 'switching_network', 'confirming', 'pending'].includes(currentStep), // Legacy compatibility
  };
}
