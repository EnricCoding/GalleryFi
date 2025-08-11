'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseEther, type Log, getAddress } from 'viem';
import { useAccount, useChainId, usePublicClient, useWriteContract } from 'wagmi';

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
        <section className="space-y-6 w-full max-w-[90vw] mx-auto">
            {/* Enhanced card shell with better visual hierarchy */}
            <div className="rounded-2xl bg-white/80 dark:bg-neutral-900/70 border border-neutral-200/60 dark:border-neutral-800/60 
                          shadow-xl shadow-neutral-500/5 dark:shadow-neutral-900/20 backdrop-blur-md">
                <div className="p-8 md:p-12 lg:p-16 space-y-10">
                    {/* Enhanced header section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-accent/20 to-accent-dark/20 
                                          rounded-xl flex items-center justify-center">
                                <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                          d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-neutral-50">
                                    Create &amp; List NFT
                                </h1>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                    Mint your digital artwork and list it on the marketplace
                                </p>
                            </div>
                        </div>
                        
                        {/* Progress indicator */}
                        <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-accent rounded-full"></div>
                                <span>Upload</span>
                            </div>
                            <div className="w-4 h-px bg-neutral-300 dark:bg-neutral-700"></div>
                            <div className="flex items-center gap-1">
                                <div className={`w-2 h-2 rounded-full ${file ? 'bg-accent' : 'bg-neutral-300 dark:bg-neutral-700'}`}></div>
                                <span>Details</span>
                            </div>
                            <div className="w-4 h-px bg-neutral-300 dark:bg-neutral-700"></div>
                            <div className="flex items-center gap-1">
                                <div className={`w-2 h-2 rounded-full ${isFormValid ? 'bg-accent' : 'bg-neutral-300 dark:bg-neutral-700'}`}></div>
                                <span>List</span>
                            </div>
                        </div>
                    </div>

                    {/* Enhanced notices with better styling */}
                    {!isConnected && (
                        <div className="rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50 p-4">
                            <div className="flex items-start gap-3">
                                <div className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                        Connect Your Wallet
                                    </h3>
                                    <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                                        Please connect your wallet to start creating NFTs.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {isConnected && owner && address && address.toLowerCase() !== owner.toLowerCase() && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50 p-4">
                            <div className="flex items-start gap-3">
                                <div className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.694-.833-3.464 0L3.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-amber-900 dark:text-amber-100">
                                        Owner Access Required
                                    </h3>
                                    <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                                        Only the contract owner can create NFTs. Owner: <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded text-xs break-all">{owner}</code>
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {chainId !== expectedChainId && (
                        <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50 p-4">
                            <div className="flex items-start gap-3">
                                <div className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-red-900 dark:text-red-100">
                                        Wrong Network
                                    </h3>
                                    <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                                        You are on chain <strong>{chainId}</strong>. Please switch to <strong>{expectedChainId}</strong> (Sepolia).
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Enhanced two-column layout */}
                    <form onSubmit={onSubmit} className="grid grid-cols-1 xl:grid-cols-12 gap-12" aria-busy={busy}>
                        {/* Left: Enhanced uploader section */}
                        <div className="xl:col-span-5 space-y-6">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                                        Upload Artwork <span className="text-red-500">*</span>
                                    </label>
                                    <span className="text-xs text-neutral-500 px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-md">
                                        Step 1
                                    </span>
                                </div>
                                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                                    PNG, JPEG, WEBP or GIF. Max {MAX_MB}MB.
                                </p>
                            </div>
                            
                            <UploadCard file={file} setFile={handleFileChange} maxMb={MAX_MB} />
                            
                            {errors.file && (
                                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800">
                                    <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-sm text-red-700 dark:text-red-300">{errors.file}</p>
                                </div>
                            )}
                            
                            {/* Preview enhancement hint */}
                            {file && !errors.file && (
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800">
                                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <p className="text-sm text-green-700 dark:text-green-300">
                                        Perfect! Your artwork looks great.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Right: Enhanced form fields */}
                        <div className="xl:col-span-7 space-y-8">
                            {/* Step indicator for form fields */}
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                                    NFT Details
                                </h2>
                                <span className="text-xs text-neutral-500 px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-md">
                                    Step 2
                                </span>
                            </div>
                            
                            {/* Enhanced name field */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                                    Name <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        className={`w-full rounded-xl border-2 p-4 pr-12 focus:outline-none focus:ring-4 transition-all duration-200
                                            placeholder:text-neutral-400 dark:placeholder:text-neutral-500
                                            ${errors.name
                                                ? 'border-red-300 focus:ring-red-100 focus:border-red-500 bg-red-50 dark:bg-red-950/20 dark:border-red-700'
                                                : name.trim()
                                                ? 'border-green-300 focus:ring-green-100 focus:border-green-500 bg-green-50 dark:bg-green-950/20 dark:border-green-700'
                                                : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-accent/20 focus:border-accent'
                                            }`}
                                        placeholder="Give your NFT a memorable name..."
                                        value={name}
                                        onChange={handleNameChange}
                                        maxLength={80}
                                        required
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        {name.trim() && !errors.name ? (
                                            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : errors.name ? (
                                            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        ) : null}
                                    </div>
                                </div>
                                {errors.name && (
                                    <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800">
                                        <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <p className="text-sm text-red-700 dark:text-red-300">{errors.name}</p>
                                    </div>
                                )}
                                <div className="flex justify-between items-center">
                                    <p className="text-xs text-neutral-500">
                                        Choose a unique, descriptive name for your NFT
                                    </p>
                                    <p className="text-xs text-neutral-500 font-mono">
                                        {name.length}/80
                                    </p>
                                </div>
                            </div>

                            {/* Enhanced grid for price and royalties */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Enhanced royalties field */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                                        Royalties <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min={0}
                                            max={1000}
                                            step={1}
                                            className={`w-full rounded-xl border-2 p-4 pr-12 focus:outline-none focus:ring-4 transition-all duration-200
                                                placeholder:text-neutral-400 dark:placeholder:text-neutral-500
                                                ${errors.royalty
                                                    ? 'border-red-300 focus:ring-red-100 focus:border-red-500 bg-red-50 dark:bg-red-950/20'
                                                    : royaltyBps >= 0 && royaltyBps <= 1000
                                                    ? 'border-green-300 focus:ring-green-100 focus:border-green-500 bg-green-50 dark:bg-green-950/20'
                                                    : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-accent/20 focus:border-accent'
                                                }`}
                                            placeholder="500"
                                            value={royaltyBps}
                                            onChange={handleRoyaltyChange}
                                            required
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500">
                                            bps
                                        </div>
                                    </div>
                                    {errors.royalty && (
                                        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800">
                                            <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <p className="text-sm text-red-700 dark:text-red-300">{errors.royalty}</p>
                                        </div>
                                    )}
                                    <div className="space-y-1">
                                        <p className="text-xs text-neutral-600 dark:text-neutral-400">
                                            Earn <strong>{(royaltyBps / 100).toFixed(1)}%</strong> on future sales
                                        </p>
                                        <div className="flex gap-2">
                                            {[250, 500, 750].map((preset) => (
                                                <button
                                                    key={preset}
                                                    type="button"
                                                    onClick={() => {
                                                        setRoyaltyBps(preset);
                                                        setErrors(prev => ({ ...prev, royalty: validateRoyalty(preset) }));
                                                    }}
                                                    className={`px-2 py-1 text-xs rounded-md transition-colors
                                                        ${royaltyBps === preset 
                                                            ? 'bg-accent text-white' 
                                                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                                                        }`}
                                                >
                                                    {preset / 100}%
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Enhanced price field */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                                        Listing Price <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            className={`w-full rounded-xl border-2 p-4 pl-12 pr-16 focus:outline-none focus:ring-4 transition-all duration-200
                                                placeholder:text-neutral-400 dark:placeholder:text-neutral-500
                                                ${errors.price
                                                    ? 'border-red-300 focus:ring-red-100 focus:border-red-500 bg-red-50 dark:bg-red-950/20'
                                                    : priceEth && Number(priceEth) > 0
                                                    ? 'border-green-300 focus:ring-green-100 focus:border-green-500 bg-green-50 dark:bg-green-950/20'
                                                    : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-accent/20 focus:border-accent'
                                                }`}
                                            value={priceEth}
                                            onChange={handlePriceChange}
                                            inputMode="decimal"
                                            placeholder="0.05"
                                            required
                                        />
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2">
                                            <svg className="w-5 h-5 text-neutral-400" viewBox="0 0 320 512">
                                                <path fill="currentColor" d="M311.9 260.8L160 353.6 8 260.8 160 0l151.9 260.8zM160 383.4L8 290.6 160 512l152-221.4-152 92.8z"/>
                                            </svg>
                                        </div>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                                            ETH
                                        </div>
                                    </div>
                                    {errors.price && (
                                        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800">
                                            <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <p className="text-sm text-red-700 dark:text-red-300">{errors.price}</p>
                                        </div>
                                    )}
                                    <div className="space-y-1">
                                        <p className="text-xs text-neutral-600 dark:text-neutral-400">
                                            Set your initial listing price
                                        </p>
                                        <div className="flex gap-2">
                                            {['0.01', '0.05', '0.1', '0.5'].map((preset) => (
                                                <button
                                                    key={preset}
                                                    type="button"
                                                    onClick={() => {
                                                        setPriceEth(preset);
                                                        setErrors(prev => ({ ...prev, price: validatePrice(preset) }));
                                                    }}
                                                    className={`px-2 py-1 text-xs rounded-md transition-colors
                                                        ${priceEth === preset 
                                                            ? 'bg-accent text-white' 
                                                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                                                        }`}
                                                >
                                                    {preset} ETH
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Enhanced description field */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                                    Description <span className="text-neutral-500">(Optional)</span>
                                </label>
                                <div className="relative">
                                    <textarea
                                        className={`w-full rounded-xl border-2 p-4 focus:outline-none focus:ring-4 transition-all duration-200 resize-none
                                            placeholder:text-neutral-400 dark:placeholder:text-neutral-500
                                            ${errors.desc
                                                ? 'border-red-300 focus:ring-red-100 focus:border-red-500 bg-red-50 dark:bg-red-950/20'
                                                : desc.trim()
                                                ? 'border-green-300 focus:ring-green-100 focus:border-green-500 bg-green-50 dark:bg-green-950/20'
                                                : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-accent/20 focus:border-accent'
                                            }`}
                                        placeholder="Tell the story behind your artwork. What inspired you? What makes it special?"
                                        value={desc}
                                        onChange={handleDescChange}
                                        rows={4}
                                        maxLength={1000}
                                    />
                                </div>
                                {errors.desc && (
                                    <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800">
                                        <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <p className="text-sm text-red-700 dark:text-red-300">{errors.desc}</p>
                                    </div>
                                )}
                                <div className="flex justify-between items-center">
                                    <p className="text-xs text-neutral-600 dark:text-neutral-400">
                                        A good description helps buyers understand your NFT
                                    </p>
                                    <p className="text-xs text-neutral-500 font-mono">
                                        {desc.length}/1000
                                    </p>
                                </div>
                            </div>

                            {/* Enhanced submit section */}
                            <div className="pt-8 border-t border-neutral-200 dark:border-neutral-700">
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                                            Ready to Launch?
                                        </h3>
                                        <span className="text-xs text-neutral-500 px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-md">
                                            Step 3
                                        </span>
                                    </div>
                                    
                                    {/* Summary card */}
                                    {file && name.trim() && priceEth && !hasErrors && (
                                        <div className="p-4 rounded-xl bg-accent/5 border border-accent/20">
                                            <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                                                Summary
                                            </h4>
                                            <div className="space-y-1 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-neutral-600 dark:text-neutral-400">Name:</span>
                                                    <span className="font-medium">{name}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-neutral-600 dark:text-neutral-400">Price:</span>
                                                    <span className="font-medium">{priceEth} ETH</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-neutral-600 dark:text-neutral-400">Royalties:</span>
                                                    <span className="font-medium">{(royaltyBps / 100).toFixed(1)}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        disabled={disabled}
                                        className="w-full group relative overflow-hidden cursor-pointer disabled:cursor-not-allowed 
                                                 flex items-center justify-center gap-3
                                                 rounded-xl px-8 py-5 font-bold text-white text-lg
                                                 bg-gradient-to-r from-accent-light via-accent to-accent-dark
                                                 hover:from-accent hover:via-accent-dark hover:to-primary-dark
                                                 hover:shadow-2xl hover:shadow-accent/40
                                                 active:scale-[0.98] active:shadow-lg
                                                 transition-all duration-300 ease-out
                                                 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none
                                                 shadow-xl border border-accent/30 hover:border-accent/50
                                                 focus:outline-none focus:ring-4 focus:ring-accent/30
                                                 backdrop-blur-sm transform hover:-translate-y-1"
                                    >
                                        {busy ? (
                                            <>
                                                <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24" aria-hidden="true">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
                                                </svg>
                                                <span>Processing...</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-6 h-6 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                </svg>
                                                <span>Mint & List NFT</span>
                                                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </>
                                        )}
                                        
                                        {/* Enhanced button effects */}
                                        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                                    </button>
                                    
                                    {/* Helpful tips */}
                                    <div className="text-xs text-neutral-500 space-y-1">
                                        <p>💡 <strong>Tip:</strong> Higher quality images tend to sell better</p>
                                        <p>⚡ <strong>Gas fees:</strong> You&apos;ll need ETH for minting and listing transactions</p>
                                    </div>
                                </div>
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
