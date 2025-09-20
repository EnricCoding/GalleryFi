'use client';

import { useEffect, useMemo, useState } from 'react';
import { getAddress, isAddressEqual, parseEther, type Log } from 'viem';
import { useAccount, useChainId, usePublicClient, useReadContract, useWriteContract } from 'wagmi';

import MyNFT from '@/utils/abi/MyNFT.json';
import Market from '@/utils/abi/NftMarketplace.json';
import { extractTokenIdFromLogs } from '@/lib/contracts';
import { validateAll } from '@/lib/validations/formValidation';

const MyNFTAbi = MyNFT.abi;
const MarketAbi = Market.abi;

type SafeAddresses = { nft: `0x${string}`; mkt: `0x${string}` } | null;

export function useMintList(
  nftAddress: `0x${string}`,
  marketAddress: `0x${string}`,
  expectedChainId: number,
  pushToast: (t: { kind: 'info' | 'success' | 'error'; msg: string; sticky?: boolean }) => void,
) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const safe: SafeAddresses = useMemo(() => {
    try {
      return {
        nft: getAddress(nftAddress),
        mkt: getAddress(marketAddress),
      } as SafeAddresses;
    } catch {
      return null;
    }
  }, [nftAddress, marketAddress]);

  const { data: owner } = useReadContract({
    address: safe?.nft,
    abi: MyNFTAbi,
    functionName: 'owner',
    query: { enabled: !!safe },
  }) as { data: `0x${string}` | undefined };

  const canMint = !!(address && owner && isAddressEqual(address, owner));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
  }, [nftAddress, marketAddress, expectedChainId, address, isConnected, chainId]);

  async function submit(params: {
    file: File | null;
    name: string;
    desc: string;
    royaltyBps: number;
    priceEth: string;
  }) {
    const { file, name, desc, royaltyBps, priceEth } = params;

    if (busy) return;
    if (!safe) return pushToast({ kind: 'error', msg: 'Invalid contract addresses. Check envs.' });
    if (!isConnected) return pushToast({ kind: 'error', msg: 'Connect your wallet.' });
    if (!publicClient) return pushToast({ kind: 'error', msg: 'Public client unavailable.' });
    if (!canMint)
      return pushToast({ kind: 'error', msg: 'Only the contract owner can create NFTs for now.' });
    if (chainId !== expectedChainId)
      return pushToast({ kind: 'error', msg: `Switch to chainId ${expectedChainId}.` });

    const validationError = validateAll(file, name, desc, royaltyBps, priceEth);
    if (validationError) return pushToast({ kind: 'error', msg: validationError });

    try {
      setBusy(true);
      pushToast({ kind: 'info', msg: 'Uploading to IPFS…' });
      const form = new FormData();
      form.append('file', file!);
      form.append('name', name.trim().slice(0, 80));
      form.append('description', desc.trim().slice(0, 1000));

      const res = await fetch('/api/ipfs', { method: 'POST', body: form });
      const data: { metadataCid?: string; error?: string } = await res.json();
      if (!res.ok || !data.metadataCid) throw new Error(data?.error || 'Failed to upload to IPFS');
      const tokenURI = `ipfs://${data.metadataCid}`;

      pushToast({ kind: 'info', msg: 'Signing mint…' });
      const mintHash = await writeContractAsync({
        address: safe.nft,
        abi: MyNFTAbi,
        functionName: 'mintWithRoyalty',
        args: [address!, tokenURI, address!, BigInt(royaltyBps)],
      });
      const mintRcpt = await publicClient.waitForTransactionReceipt({ hash: mintHash });

      const logs = mintRcpt.logs as ReadonlyArray<Pick<Log, 'address' | 'topics'>>;
      const tokenId = extractTokenIdFromLogs(safe.nft, logs);
      if (tokenId == null) throw new Error('Could not determine tokenId from mint logs.');

      const approved = (await publicClient.readContract({
        address: safe.nft,
        abi: MyNFTAbi,
        functionName: 'isApprovedForAll',
        args: [address!, safe.mkt],
      })) as boolean;

      if (!approved) {
        pushToast({ kind: 'info', msg: 'Approving marketplace…' });
        const approveHash = await writeContractAsync({
          address: safe.nft,
          abi: MyNFTAbi,
          functionName: 'setApprovalForAll',
          args: [safe.mkt, true],
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      pushToast({ kind: 'info', msg: 'Listing NFT…' });
      const priceWei = parseEther(priceEth);
      const listHash = await writeContractAsync({
        address: safe.mkt,
        abi: MarketAbi,
        functionName: 'listItem',
        args: [safe.nft, tokenId, priceWei],
      });
      await publicClient.waitForTransactionReceipt({ hash: listHash });

      pushToast({ kind: 'success', msg: 'Mint & List completed.' });
      return { tokenId };
    } finally {
      setBusy(false);
    }
  }

  return {
    busy,
    canMint,
    owner,
    expectedChainId,
    chainId,
    isConnected,
    submit,
  };
}
