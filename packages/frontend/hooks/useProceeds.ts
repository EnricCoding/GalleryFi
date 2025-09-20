'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  useAccount,
  useChainId,
  usePublicClient,
  useReadContract,
  useSwitchChain,
  useWriteContract,
} from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { formatEther } from 'viem';
import MarketJson from '@/utils/abi/NftMarketplace.json';

const MarketAbi = MarketJson.abi;

type Params = {
  onStatus?: (msg: string) => void; 
  onSuccess?: (amountWei: bigint) => void;
};

export function useProceeds({ onStatus, onSuccess }: Params = {}) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const { openConnectModal } = useConnectModal();

  const MARKET = process.env.NEXT_PUBLIC_MARKET_ADDRESS as `0x${string}` | undefined;
  const EXPECTED_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? '11155111');

  if (!MARKET) {
    console.error('[useProceeds] Missing NEXT_PUBLIC_MARKET_ADDRESS');
  }

  const {
    data: balanceWeiRaw,
    isFetching: loadingBalance,
    refetch: refetchBalance,
  } = useReadContract({
    address: MARKET,
    abi: MarketAbi,
    functionName: 'proceeds',
    args: [address ?? '0x0000000000000000000000000000000000000000'],
    query: {
      enabled: !!address && !!MARKET,
      refetchInterval: 15_000,
    },
  }) as { data?: bigint; isFetching: boolean; refetch: () => Promise<unknown> };

  const balanceWei = balanceWeiRaw ?? BigInt(0);
  const balanceEth = useMemo(() => formatEther(balanceWei), [balanceWei]);

  const [busyWithdraw, setBusyWithdraw] = useState(false);

  const withdraw = useCallback(async () => {
    try {
      if (!isConnected) {
        onStatus?.('Connect your wallet to withdraw.');
        openConnectModal?.();
        return;
      }
      
      if (!MARKET) {
        onStatus?.('⚠️ Marketplace contract address not configured.');
        return;
      }
      
      if (!publicClient) {
        onStatus?.('⚠️ RPC client not available.');
        return;
      }

      if (chainId !== EXPECTED_CHAIN_ID) {
        onStatus?.('Switching network…');
        await switchChainAsync?.({ chainId: EXPECTED_CHAIN_ID });
      }

      if (balanceWei === BigInt(0)) {
        onStatus?.('No proceeds to withdraw.');
        return;
      }

      setBusyWithdraw(true);
      onStatus?.('Withdrawing proceeds…');

      const txHash = await writeContractAsync({
        address: MARKET,
        abi: MarketAbi,
        functionName: 'withdrawProceeds',
        args: [],
      });

      await publicClient.waitForTransactionReceipt({ hash: txHash });
      onStatus?.('✅ Proceeds withdrawn successfully!');
      onSuccess?.(balanceWei);
      await refetchBalance();
    } catch (error: unknown) {
      let msg = 'Failed to withdraw';
      
      if (error instanceof Error) {
        if (/User denied|User rejected/i.test(error.message)) {
          msg = 'Transaction rejected in wallet';
        } else if (/insufficient funds/i.test(error.message)) {
          msg = 'Insufficient funds for gas';
        } else if (/network/i.test(error.message)) {
          msg = 'Network error, please try again';
        } else {
          msg = error.message;
        }
      }
      
      onStatus?.(`⚠️ ${msg}`);
    } finally {
      setBusyWithdraw(false);
    }
  }, [
    isConnected,
    MARKET,
    publicClient,
    chainId,
    EXPECTED_CHAIN_ID,
    switchChainAsync,
    writeContractAsync,
    onStatus,
    onSuccess,
    refetchBalance,
    balanceWei,
    openConnectModal,
  ]);

  return {
    balanceWei,
    balanceEth,
    loadingBalance,
    busyWithdraw,
    hasProceeds: balanceWei > BigInt(0),
    canWithdraw: balanceWei > BigInt(0) && !busyWithdraw && !!MARKET && isConnected,
    withdraw,
    refetchBalance,
  };
}
