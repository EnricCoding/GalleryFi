'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseEther, type Log, getAddress } from 'viem';
import { useAccount, useChainId, usePublicClient, useWriteContract } from 'wagmi';
import Callout from '@/components/ui/Callout';

import MyNFT from '@/utils/abi/MyNFT.json';
import Market from '@/utils/abi/NftMarketplace.json';
const MyNFTAbi = MyNFT.abi;
const MarketAbi = Market.abi;

import { extractTokenIdFromLogs } from '@/lib/contracts';
import UploadCard from './UploadCard';
import { ToastStack } from './Toast';

type Props = {
    nftAddress: `0x${string}`;
    marketAddress: `0x${string}`;
    expectedChainId: number;
};

type Status = { kind: 'idle' | 'info' | 'success' | 'error'; msg: string };
type Toast = { id: number; kind: Exclude<Status['kind'], 'idle'>; msg: string; sticky?: boolean };

const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const MAX_MB = 15;

export default function MintListForm({ nftAddress, marketAddress, expectedChainId }: Props) {
    const router = useRouter();
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const publicClient = usePublicClient();
    const { writeContractAsync } = useWriteContract();

    const [owner, setOwner] = useState<`0x${string}` | null>(null);

    const [file, setFile] = useState<File | null>(null);
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [royaltyBps, setRoyaltyBps] = useState<number>(500);
    const [priceEth, setPriceEth] = useState<string>('0.05');

    const [busy, setBusy] = useState(false);
    const [status] = useState<Status>({ kind: 'idle', msg: '' });

    // Field validation errors
    const [errors, setErrors] = useState<{
        file?: string;
        name?: string;
        desc?: string;
        royalty?: string;
        price?: string;
    }>({});

    // toasts (simple en el padre)
    const [toasts, setToasts] = useState<Toast[]>([]);
    const pushToast = (t: Omit<Toast, 'id'>) => {
        const id = Date.now() + Math.floor(Math.random() * 1000);
        const toast = { ...t, id };
        setToasts((p) => [...p, toast]);
        if (!t.sticky) setTimeout(() => setToasts((p) => p.filter((x) => x.id !== id)), t.kind === 'error' ? 6000 : 3500);
    };
    const removeToast = (id: number) => setToasts((p) => p.filter((t) => t.id !== id));

    // Normalize & validate addresses once
    const safe = useMemo(() => {
        try {
            return {
                nft: getAddress(nftAddress),
                mkt: getAddress(marketAddress),
            };
        } catch {
            return null;
        }
    }, [nftAddress, marketAddress]);

    const canMint = useMemo(
        () => !!address && !!owner && address.toLowerCase() === owner.toLowerCase(),
        [address, owner]
    );

    // Debug logs
    useEffect(() => {
        console.log('[MintListForm] props:', { nftAddress, marketAddress, expectedChainId });
    }, [nftAddress, marketAddress, expectedChainId]);

    useEffect(() => {
        console.log('[MintListForm] wallet:', { address, isConnected, chainId });
    }, [address, isConnected, chainId]);

    // Read owner() using normalized address
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                if (!publicClient || !safe) return;
                console.log('[MintListForm] reading owner() on', safe.nft);
                const o = (await publicClient.readContract({
                    address: safe.nft,
                    abi: MyNFTAbi,
                    functionName: 'owner',
                })) as `0x${string}`;
                if (!cancelled) setOwner(o);
            } catch (err) {
                console.warn('[MintListForm] owner() failed:', err);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [publicClient, safe]);

    const validateInputs = (): string | null => {
        if (!file) return 'Upload an image.';
        if (!ALLOWED_TYPES.has(file.type)) return 'Unsupported type. Use PNG, JPEG, WEBP or GIF.';
        if (file.size > MAX_MB * 1024 * 1024) return `File too large. Max ${MAX_MB}MB.`;
        if (!name.trim()) return 'Name is required.';
        if (name.trim().length > 80) return 'Name must be ≤ 80 characters.';
        if (desc.trim().length > 1000) return 'Description must be ≤ 1000 characters.';
        if (!Number.isFinite(Number(priceEth)) || Number(priceEth) <= 0) return 'Invalid price.';
        if (!Number.isInteger(royaltyBps) || royaltyBps < 0 || royaltyBps > 1000) return 'Royalties out of range (0–1000 bps).';
        return null;
    };

    // Individual field validators
    const validateFile = (file: File | null): string | undefined => {
        if (!file) return 'Image is required';
        if (!ALLOWED_TYPES.has(file.type)) return 'Only PNG, JPEG, WEBP, or GIF files are allowed';
        if (file.size > MAX_MB * 1024 * 1024) return `File size must be less than ${MAX_MB}MB`;
        return undefined;
    };

    const validateName = (name: string): string | undefined => {
        const trimmed = name.trim();
        if (!trimmed) return 'Name is required';
        if (trimmed.length < 2) return 'Name must be at least 2 characters';
        if (trimmed.length > 80) return 'Name must be 80 characters or less';
        if (!/^[a-zA-Z0-9\s\-_.()]+$/.test(trimmed)) return 'Name contains invalid characters';
        return undefined;
    };

    const validateDescription = (desc: string): string | undefined => {
        if (desc.trim().length > 1000) return 'Description must be 1000 characters or less';
        return undefined;
    };

    const validateRoyalty = (bps: number): string | undefined => {
        if (!Number.isInteger(bps)) return 'Royalty must be a whole number';
        if (bps < 0) return 'Royalty cannot be negative';
        if (bps > 1000) return 'Royalty cannot exceed 10% (1000 bps)';
        return undefined;
    };

    const validatePrice = (price: string): string | undefined => {
        if (!price.trim()) return 'Price is required';
        const num = Number(price);
        if (!Number.isFinite(num)) return 'Invalid price format';
        if (num <= 0) return 'Price must be greater than 0';
        if (num > 1000) return 'Price seems unreasonably high';
        if (!/^\d*\.?\d{0,6}$/.test(price)) return 'Price can have at most 6 decimal places';
        return undefined;
    };

    // Field change handlers with validation
    const handleFileChange = (newFile: File | null) => {
        setFile(newFile);
        const error = validateFile(newFile);
        setErrors(prev => ({ ...prev, file: error }));
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setName(value);
        const error = validateName(value);
        setErrors(prev => ({ ...prev, name: error }));
    };

    const handleDescChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setDesc(value);
        const error = validateDescription(value);
        setErrors(prev => ({ ...prev, desc: error }));
    };

    const handleRoyaltyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number(e.target.value);
        setRoyaltyBps(value);
        const error = validateRoyalty(value);
        setErrors(prev => ({ ...prev, royalty: error }));
    };

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        // Only allow numbers and decimal point
        if (!/^[\d.]*$/.test(value)) return;
        setPriceEth(value);
        const error = validatePrice(value);
        setErrors(prev => ({ ...prev, price: error }));
    };

    // Check if form has any errors
    const hasErrors = Object.values(errors).some(error => error !== undefined);
    const isFormValid = file && name.trim() && priceEth.trim() && !hasErrors;

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (busy) return;
        if (!safe) return pushToast({ kind: 'error', msg: 'Invalid contract addresses. Check envs.' });
        if (!isConnected) return pushToast({ kind: 'error', msg: 'Connect your wallet.' });
        if (!publicClient) return pushToast({ kind: 'error', msg: 'Public client unavailable.' });
        if (!canMint) return pushToast({ kind: 'error', msg: 'Only the contract owner can create NFTs for now.' });
        if (chainId !== expectedChainId) return pushToast({ kind: 'error', msg: `Switch to chainId ${expectedChainId}.` });

        const validationError = validateInputs();
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

            // Mint
            console.log('[MintListForm] mintWithRoyalty args:', {
                to: address,
                tokenURI,
                receiver: address,
                bps: royaltyBps,
            });
            pushToast({ kind: 'info', msg: 'Signing mint…' });
            const mintHash = await writeContractAsync({
                address: safe.nft,
                abi: MyNFTAbi,
                functionName: 'mintWithRoyalty',
                args: [address!, tokenURI, address!, BigInt(royaltyBps)],
            });
            console.log('[MintListForm] mint tx hash:', mintHash);
            const mintRcpt = await publicClient.waitForTransactionReceipt({ hash: mintHash });

            const logs = mintRcpt.logs as ReadonlyArray<Pick<Log, 'address' | 'topics'>>;
            const tokenId = extractTokenIdFromLogs(safe.nft, logs);
            console.log('[MintListForm] tokenId:', tokenId?.toString());

            // Approval
            pushToast({ kind: 'info', msg: 'Checking approval…' });
            const approved = (await publicClient.readContract({
                address: safe.nft,
                abi: MyNFTAbi,
                functionName: 'isApprovedForAll',
                args: [address!, safe.mkt],
            })) as boolean;
            console.log('[MintListForm] isApprovedForAll?', approved);

            if (!approved) {
                pushToast({ kind: 'info', msg: 'Approving marketplace…' });
                const approveHash = await writeContractAsync({
                    address: safe.nft,
                    abi: MyNFTAbi,
                    functionName: 'setApprovalForAll',
                    args: [safe.mkt, true],
                });
                console.log('[MintListForm] approve tx hash:', approveHash);
                await publicClient.waitForTransactionReceipt({ hash: approveHash });
            }

            // List
            pushToast({ kind: 'info', msg: 'Listing NFT…' });
            const priceWei = parseEther(priceEth);
            console.log('[MintListForm] listItem args:', {
                nft: safe.nft,
                tokenId: tokenId?.toString(),
                priceWei: priceWei.toString(),
            });
            const listHash = await writeContractAsync({
                address: safe.mkt,
                abi: MarketAbi,
                functionName: 'listItem',
                args: [safe.nft, tokenId, priceWei],
            });
            console.log('[MintListForm] list tx hash:', listHash);
            await publicClient.waitForTransactionReceipt({ hash: listHash });

            pushToast({ kind: 'success', msg: 'Mint & List completed.' });
            router.push(`/nft/${safe.nft}/${tokenId.toString()}`);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Unexpected error';
            console.error('[MintListForm] onSubmit error:', err);
            pushToast({ kind: 'error', msg, sticky: true });
        } finally {
            setBusy(false);
        }
    }

    const disabled =
        busy || !isConnected || !address || !owner || chainId !== expectedChainId || !canMint || !isFormValid;

    return (
        <section className="space-y-5">
            {/* Card shell */}
            <div className="rounded-2xl bg-white/70 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <div className="p-6 md:p-8 space-y-6">
                    <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">Create &amp; List NFT</h1>

                    {/* Notices */}
                    {!isConnected && <Callout>Connect your wallet to continue.</Callout>}
                    {isConnected && owner && address && address.toLowerCase() !== owner.toLowerCase() && (
                        <Callout variant="warning">
                            Only the <b>contract owner</b> can create NFTs for now. Owner: <code className="break-all">{owner}</code>
                        </Callout>
                    )}
                    {chainId !== expectedChainId && (
                        <Callout variant="warning">
                            You are on chainId <b>{chainId}</b>. Please switch to <b>{expectedChainId}</b> (Sepolia).
                        </Callout>
                    )}

                    {/* Two-column layout */}
                    <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6" aria-busy={busy}>
                        {/* Left: uploader + preview (componente) */}
                        <div className="lg:col-span-5 space-y-2">
                            <UploadCard file={file} setFile={handleFileChange} maxMb={MAX_MB} />
                            {errors.file && (
                                <p className="text-sm text-error">{errors.file}</p>
                            )}
                        </div>

                        {/* Right: fields */}
                        <div className="lg:col-span-7 flex flex-col space-y-4">
                            <div>
                                <label className="block text-sm font-medium">
                                    Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    className={`mt-1 w-full rounded-lg border p-2.5 focus:outline-none focus:ring-2 transition-colors
                                        ${errors.name
                                            ? 'border-error focus:ring-error/30 focus:border-error bg-error/5'
                                            : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-accent/30 focus:border-accent'
                                        }`}
                                    placeholder="Enter NFT title (2-80 characters)"
                                    value={name}
                                    onChange={handleNameChange}
                                    maxLength={80}
                                    required
                                />
                                {errors.name && (
                                    <p className="mt-1 text-sm text-error">{errors.name}</p>
                                )}
                                <p className="mt-1 text-xs text-neutral-500">
                                    {name.length}/80 characters
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block">
                                        <span className="text-sm font-medium">
                                            Royalties (bps) <span className="text-red-500">*</span>
                                        </span>
                                        <input
                                            type="number"
                                            min={0}
                                            max={1000}
                                            step={1}
                                            className={`mt-1 w-full rounded-lg border p-2.5 focus:outline-none focus:ring-2 transition-colors
                                                ${errors.royalty
                                                    ? 'border-error focus:ring-error/30 focus:border-error bg-error/5'
                                                    : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-accent/30 focus:border-accent'
                                                }`}
                                            placeholder="500"
                                            value={royaltyBps}
                                            onChange={handleRoyaltyChange}
                                            required
                                        />
                                        {errors.royalty && (
                                            <p className="mt-1 text-sm text-error">{errors.royalty}</p>
                                        )}
                                        <p className="mt-1 text-xs text-neutral-500">
                                            {royaltyBps / 100}% royalty fee
                                        </p>
                                    </label>
                                </div>

                                <div>
                                    <label className="block">
                                        <span className="text-sm font-medium">
                                            Listing price (ETH) <span className="text-red-500">*</span>
                                        </span>
                                        <input
                                            className={`mt-1 w-full rounded-lg border p-2.5 focus:outline-none focus:ring-2 transition-colors
                                                ${errors.price
                                                    ? 'border-error focus:ring-error/30 focus:border-error bg-error/5'
                                                    : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-accent/30 focus:border-accent'
                                                }`}
                                            value={priceEth}
                                            onChange={handlePriceChange}
                                            inputMode="decimal"
                                            placeholder="0.05"
                                            required
                                        />
                                        {errors.price && (
                                            <p className="mt-1 text-sm text-error">{errors.price}</p>
                                        )}
                                        <p className="mt-1 text-xs text-neutral-500">
                                            Price in ETH (max 6 decimals)
                                        </p>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block">
                                    <span className="text-sm font-medium">Description</span>
                                    <textarea
                                        className={`mt-1 w-full rounded-lg border p-2.5 focus:outline-none focus:ring-2 transition-colors resize-none
                                            ${errors.desc
                                                ? 'border-error focus:ring-error/30 focus:border-error bg-error/5'
                                                : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-accent/30 focus:border-accent'
                                            }`}
                                        placeholder="Describe your NFT (optional)"
                                        value={desc}
                                        onChange={handleDescChange}
                                        rows={4}
                                        maxLength={1000}
                                    />
                                    {errors.desc && (
                                        <p className="mt-1 text-sm text-error">{errors.desc}</p>
                                    )}
                                    <p className="mt-1 text-xs text-neutral-500">
                                        {desc.length}/1000 characters
                                    </p>
                                </label>
                            </div>

                            <div className="flex-grow" />

                            <div className="pt-4">
                                <button
                                    disabled={disabled}
                                    className="w-full cursor-pointer disabled:cursor-not-allowed 
                             flex items-center justify-center gap-3
                             rounded-xl px-6 py-4 font-bold text-white text-lg
                             bg-gradient-to-r from-accent-light via-accent to-accent-dark
                             hover:from-accent hover:via-accent-dark hover:to-primary-dark
                             hover:shadow-xl hover:shadow-accent/30
                             active:scale-[0.98] active:shadow-lg
                             transition-all duration-200 ease-out
                             disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none
                             shadow-lg border border-accent/20 hover:border-accent/40
                             focus:outline-none focus:ring-4 focus:ring-accent/30
                             backdrop-blur-sm transform hover:-translate-y-0.5"
                                >
                                    {busy ? (
                                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                    )}
                                    <span>{busy ? 'Processing...' : 'Mint & List NFT'}</span>
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            {/* Optional status text */}
            {status.msg && (
                <p
                    className={
                        status.kind === 'error'
                            ? 'text-error'
                            : status.kind === 'success'
                                ? 'text-success'
                                : 'text-neutral-600 dark:text-neutral-300'
                    }
                >
                    {status.msg}
                </p>
            )}

            {/* Toasts (componente) */}
            <ToastStack toasts={toasts} onDismiss={removeToast} />

            <div className="text-xs text-neutral-500">
                Contracts: <code>{safe?.nft || nftAddress}</code> (NFT) · <code>{safe?.mkt || marketAddress}</code> (Marketplace)
            </div>
        </section>
    );
}
