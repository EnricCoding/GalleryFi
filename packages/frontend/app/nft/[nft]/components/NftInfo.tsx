'use client';

import { formatEther } from 'viem';
import { useState, useCallback, useMemo, useRef, useEffect, memo } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import StatusBadge from '@/components/ui/StatusBadge';
import { NftMetadata } from '@/lib/types/metadata';
import { NftActivity } from '@/lib/types/activity';
import { useListForSale } from '@/hooks/useListForSale';
import { useCancelListing } from '@/hooks/useCancelListing';
import { useChangePrice } from '@/hooks/useChangePrice';
import { useBookmarks } from '@/hooks/useBookmarks';
import NftInfoActionBar from './NftInfoActionBar';
import ListForSaleModal from './ListForSaleModal';

export type BannerType = 'info' | 'success' | 'error' | 'warning';
export interface BannerMessage {
    kind: BannerType;
    text: string;
    icon?: string;
    duration?: number;
}

export interface NftInfoProps {
    meta: NftMetadata | null;
    tokenId: string;
    contractAddress: `0x${string}`;
    price: bigint | null;
    isOwner: boolean;
    isForSale: boolean;
    activity: NftActivity[];
    onBuyClick: () => void;
    onShare?: () => void;
    onSaveToBookmarks?: () => void;
    isBuying: boolean;
    isSelling?: boolean;
    ownerAddress?: string;
    sellerAddress?: string;
    onRefreshData?: () => Promise<void>;
    hasActiveAuction?: boolean;
}

/* ───────────────────── Enhanced Banner Component ───────────────────── */
const EnhancedBanner = memo(({
    banner,
    onClose
}: {
    banner: BannerMessage;
    onClose: () => void;
}) => {
    const bannerConfig = {
        success: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-800 dark:text-emerald-200', border: 'border-emerald-200 dark:border-emerald-800', icon: banner.icon || '✅' },
        error: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-800 dark:text-red-200', border: 'border-red-200 dark:border-red-800', icon: banner.icon || '❌' },
        warning: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-800 dark:text-amber-200', border: 'border-amber-200 dark:border-amber-800', icon: banner.icon || '⚠️' },
        info: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-800 dark:text-blue-200', border: 'border-blue-200 dark:border-blue-800', icon: banner.icon || 'ℹ️' }
    };

    const config = bannerConfig[banner.kind];

    return (
        <div className={`rounded-2xl p-4 border ${config.bg} ${config.border} transition-all duration-300 transform animate-in slide-in-from-top-2`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-lg" role="img" aria-hidden="true">{config.icon}</span>
                    <p className={`font-medium ${config.text}`}>{banner.text}</p>
                </div>
                <button
                    onClick={onClose}
                    className={`p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${config.text}`}
                    aria-label="Dismiss notification"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
});
EnhancedBanner.displayName = 'EnhancedBanner';

const ShareButton = memo(({ onShare, disabled }: { onShare: () => void; disabled?: boolean }) => (
    <button
        type="button"
        onClick={onShare}
        disabled={disabled}
        className="p-3 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Share NFT"
        title="Share this NFT"
    >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
            />
        </svg>
    </button>
));
ShareButton.displayName = 'ShareButton';

const BookmarkButton = memo(({
    isBookmarked,
    onBookmark,
    disabled
}: {
    isBookmarked: boolean;
    onBookmark: () => void;
    disabled?: boolean;
}) => (
    <button
        type="button"
        onClick={onBookmark}
        disabled={disabled}
        className={`p-3 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${isBookmarked
                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/60'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 hover:text-gray-800 dark:hover:bg-gray-600 dark:hover:text-gray-200'
            }`}
        aria-pressed={isBookmarked}
        aria-label={isBookmarked ? 'Remove from bookmarks' : 'Add to bookmarks'}
        title={isBookmarked ? 'Remove from bookmarks' : 'Add to bookmarks'}
    >
        <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            fill={isBookmarked ? 'currentColor' : 'none'}
            aria-hidden="true"
        >
            <path d="M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-3.5L7 21V5z" />
        </svg>
    </button>
));
BookmarkButton.displayName = 'BookmarkButton';

/* ───────────────────── Enhanced Detail Row Component ───────────────────── */
const DetailRow = memo(({
    label,
    value
}: {
    label: string;
    value: React.ReactNode;
}) => (
    <div className="flex justify-between items-center py-4 border-b border-gray-200/50 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors rounded-lg px-2">
        <div className="flex items-center gap-3">
            <span className="text-gray-600 dark:text-gray-400 font-medium">{label}</span>
        </div>
        <div className="text-right">{value}</div>
    </div>
));
DetailRow.displayName = 'DetailRow';

/* ───────────────────── Enhanced Attributes Grid ───────────────────── */
const AttributeCard = memo(({
    traitType,
    value,
    rarity
}: {
    traitType: string;
    value: string;
    rarity?: number;
}) => (
    <div className="group bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 rounded-2xl p-4 text-center hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-900/20 dark:hover:to-purple-900/20 transition-all duration-200 transform hover:scale-105 hover:shadow-lg border border-gray-200/50 dark:border-gray-700/50">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 truncate uppercase tracking-wider font-semibold" title={traitType}>
            {traitType}
        </p>
        <p className="font-bold text-gray-900 dark:text-white truncate text-lg" title={value}>
            {value}
        </p>
        {rarity && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">
                {rarity}% rare
            </p>
        )}
    </div>
));
AttributeCard.displayName = 'AttributeCard';

/* ───────────────────── Main Component ───────────────────── */
export default function NftInfo(props: NftInfoProps) {
    const {
        meta,
        tokenId,
        contractAddress,
        price,
        isOwner,
        isForSale,
        activity,
        onBuyClick,
        onShare,
        onSaveToBookmarks,
        isBuying,
        isSelling = false,
        ownerAddress,
        sellerAddress,
        onRefreshData,
        hasActiveAuction = false,
    } = props;

    const router = useRouter();
    const { address: userAddress } = useAccount();
    const [banner, setBanner] = useState<BannerMessage | null>(null);

    /* Enhanced Banner with auto-dismiss */
    const bannerTimerRef = useRef<number | null>(null);
    const showBanner = useCallback(
        (kind: BannerType, text: string, durationMs = 4000, icon?: string) => {
            setBanner({ kind, text, icon, duration: durationMs });

            if (bannerTimerRef.current) {
                clearTimeout(bannerTimerRef.current);
                bannerTimerRef.current = null;
            }

            if ((kind === 'info' || kind === 'success') && durationMs > 0) {
                bannerTimerRef.current = window.setTimeout(() => {
                    setBanner(null);
                    bannerTimerRef.current = null;
                }, durationMs) as unknown as number;
            }
        },
        [],
    );

    const closeBanner = useCallback(() => {
        setBanner(null);
        if (bannerTimerRef.current) {
            clearTimeout(bannerTimerRef.current);
            bannerTimerRef.current = null;
        }
    }, []);

    useEffect(() => () => {
        if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    }, []);

    /* Precios */
    const { lastPrice, formattedPrice } = useMemo(() => {
        const lastSale = activity.find((a) => a.activityType === 'SALE');
        const lastPriceValue = lastSale ? Number(formatEther(BigInt(lastSale.price || '0'))) : null;
        let currentPrice: string | null = null;
        try { currentPrice = price ? formatEther(price) : null; } catch { currentPrice = null; }
        return { lastPrice: lastPriceValue, formattedPrice: currentPrice };
    }, [activity, price]);

    const thereIsAuction = false;
    const isAuctionActive = false;
    const isAuctionEnded = false;

    const statusLabel = useMemo(() => {
        
        if (isAuctionActive) return 'Live Auction';
        if (isAuctionEnded) return 'Auction Ended';
        if (isForSale) return 'For Sale';
        
        if (ownerAddress?.toLowerCase() === process.env.NEXT_PUBLIC_MARKET_ADDRESS?.toLowerCase()) {
            return 'In Marketplace Escrow';
        }
        
        if (ownerAddress?.toLowerCase() === userAddress?.toLowerCase()) {
            return 'Owned by You';
        }
        
        return 'Not Available';
    }, [isAuctionActive, isAuctionEnded, isForSale, isOwner, ownerAddress, userAddress]);

    const statusBadgeStatus = useMemo(() => {
        return isAuctionActive || isForSale ? 'listed' : 'unlisted';
    }, [isAuctionActive, isForSale]);

    const explorerUrl = useMemo(() =>
        `https://sepolia.etherscan.io/address/${contractAddress}`,
        [contractAddress]
    );

    const shortAddr = useCallback((addr: string) =>
        `${addr.slice(0, 6)}...${addr.slice(-4)}`,
        []
    );

    const {
        open,
        priceInput,
        setPriceInput,
        error,
        busyApprove,
        busyList,
        canList,
        openModal,
        closeModal,
        confirmList,
    } = useListForSale({
        nft: contractAddress,
        tokenId,
        isOwner,
        onListed: async () => {
            showBanner('success', 'Listed successfully!');
            await onRefreshData?.();
            router.refresh();
        },
        onStatus: (text) => showBanner('info', text, 2500),
    });

    const { busyCancel, canCancel, cancel } = useCancelListing({
        nft: contractAddress,
        tokenId,
        isForSale,
        isOwner,
        onCanceled: async () => {
            showBanner('success', 'Listing cancelled');
            await onRefreshData?.();
            router.refresh();
        },
        onStatus: (s) => showBanner('info', s, 2500),
    });

    const {
        open: openChange,
        priceInput: changePriceInput,
        setPriceInput: setChangePriceInput,
        error: errorChange,
        busyChange,
        canChange,
        openModal: openChangeModal,
        closeModal: closeChangeModal,
        confirmChange,
    } = useChangePrice({
        nft: contractAddress,
        tokenId,
        isOwner,
        isForSale,
        onChanged: async () => {
            showBanner('success', 'Price updated!');
            await onRefreshData?.();
            router.refresh();
        },
        onStatus: (s) => showBanner('info', s, 2500),
    });

    const handleOpenChange = useCallback(() => {
        if (!canChange) {
            showBanner('error', 'You can only change price of your active listing', 3000);
            return;
        }
        const prefill = formattedPrice ?? '';
        openChangeModal(prefill);
        if (prefill) setChangePriceInput(prefill);
    }, [canChange, formattedPrice, openChangeModal, setChangePriceInput, showBanner]);

    const { isBookmarked, toggleBookmark } = useBookmarks(contractAddress, tokenId);

    const handleShare = useCallback(async () => {
        try {
            const url = window.location.href;
            const title = meta?.name || `Token #${tokenId}`;
            const text = `Check out "${title}" on GalleryFi! 🎨`;

            if (navigator.share && navigator.canShare?.({ title, text, url })) {
                await navigator.share({ title, text, url });
                showBanner('success', 'Link shared successfully! 📱', 3000, '✅');
            } else {
                await navigator.clipboard.writeText(url);

                const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=NFT,GalleryFi,Ethereum`;
                const shouldOpenTwitter = window.confirm('Link copied! Would you like to share on Twitter?');

                if (shouldOpenTwitter) {
                    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
                    showBanner('info', 'Link copied and Twitter opened! 🐦', 3000, 'ℹ️');
                } else {
                    showBanner('success', 'Link copied to clipboard! 📋', 3000, '✅');
                }
            }
            onShare?.();
        } catch (error) {
            console.error('Share failed:', error);
            showBanner('error', 'Share cancelled or failed', 2000, '❌');
        }
    }, [meta?.name, tokenId, onShare, showBanner]);

    const handleBookmark = useCallback(() => {
        const bookmarkData = {
            nft: contractAddress,
            tokenId,
            name: meta?.name ?? `Token #${tokenId}`,
            image: (meta?.image as string | null) ?? null,
            addedAt: Date.now(),
        };

        toggleBookmark(bookmarkData);

        if (isBookmarked) {
            showBanner('info', 'Removed from bookmarks 📂', 2000, '🗑️');
        } else {
            showBanner('success', 'Saved to bookmarks! 💾', 2000, '⭐');
        }

        onSaveToBookmarks?.();
    }, [toggleBookmark, contractAddress, tokenId, meta, isBookmarked, onSaveToBookmarks, showBanner]);

    const buttonVisibility = useMemo(() => {
        const visibility = {
            showBuy: !thereIsAuction && !hasActiveAuction && isForSale && !isOwner && !!price && (price ?? BigInt(0)) > BigInt(0),
            showList: !thereIsAuction && !hasActiveAuction && isOwner && !isForSale && canList,
            showCancel: !thereIsAuction && !hasActiveAuction && isOwner && isForSale && canCancel,
            showEdit: !thereIsAuction && !hasActiveAuction && isOwner && isForSale && canChange,
            showOfferDisabled: !thereIsAuction && !hasActiveAuction && !isOwner && !isForSale,
        };

        return visibility;
    }, [thereIsAuction, hasActiveAuction, isForSale, isOwner, price, canList, canCancel, canChange]);

    return (
        <div className="space-y-8">
            {/* Enhanced Banner */}
            {banner && (
                <EnhancedBanner banner={banner} onClose={closeBanner} />
            )}

            {/* Enhanced Main Panel */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 overflow-hidden transition-all duration-300 hover:shadow-2xl">
                {/* Header with gradient background */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 p-8 border-b border-gray-200/60 dark:border-gray-700/60">
                    <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-4 mb-4">
                                <h1 className="text-4xl font-bold text-gray-900 dark:text-white truncate">
                                    {meta?.name || `Token #${tokenId}`}
                                </h1>
                                <StatusBadge
                                    status={statusBadgeStatus}
                                    label={statusLabel}
                                />
                            </div>
                            <div className="flex items-center gap-4 flex-wrap">
                                <span className="text-gray-600 dark:text-gray-400 font-mono text-sm">
                                    ID: <span className="font-semibold">#{tokenId}</span>
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 ml-4">
                            <ShareButton onShare={handleShare} />
                            <BookmarkButton
                                isBookmarked={isBookmarked}
                                onBookmark={handleBookmark}
                            />
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8">
                    {meta?.description && (
                        <div className="mb-8">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                                Description
                            </h3>
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg">
                                {meta.description}
                            </p>
                        </div>
                    )}

                    {/* Professional Ownership Display */}
                    {(ownerAddress || sellerAddress) && (
                        <div className="mb-8">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                Ownership
                            </h3>
                            <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 space-y-4">
                                        {/* Current Owner Section */}
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                                    Current Owner
                                                </span>
                                                {ownerAddress && (
                                                    <div className="flex items-center gap-2">
                                                        {/* Check if it's marketplace address */}
                                                        {ownerAddress.toLowerCase() === process.env.NEXT_PUBLIC_MARKET_ADDRESS?.toLowerCase() ? (
                                                            <div className="flex items-center gap-2">
                                                                <span className="px-3 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 rounded-full text-xs font-semibold">
                                                                    🏪 Marketplace Escrow
                                                                </span>
                                                                {/* Show original owner when in escrow */}
                                                                {isOwner && (
                                                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-xs">
                                                                        (Your NFT)
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : ownerAddress.toLowerCase() === userAddress?.toLowerCase() ? (
                                                            <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full text-xs font-semibold">
                                                                ✅ You (Direct Owner)
                                                            </span>
                                                        ) : (
                                                            <span className="px-3 py-1 bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 rounded-full text-xs font-semibold">
                                                                👤 Other User
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-500 dark:text-gray-400">Address:</span>
                                                <code className="text-sm font-mono text-gray-900 dark:text-white bg-white dark:bg-gray-700 px-2 py-1 rounded border">
                                                    {shortAddr(ownerAddress || '')}
                                                </code>
                                                <button
                                                    onClick={() => navigator.clipboard.writeText(ownerAddress || '')}
                                                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                                    title="Copy current owner address"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>

                                        {ownerAddress?.toLowerCase() === process.env.NEXT_PUBLIC_MARKET_ADDRESS?.toLowerCase() && sellerAddress && (
                                            <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                                        Listed by (Original Seller)
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        {sellerAddress.toLowerCase() === userAddress?.toLowerCase() ? (
                                                            <span className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-xs font-semibold">
                                                                ✅ You
                                                            </span>
                                                        ) : (
                                                            <span className="px-3 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 rounded-full text-xs font-semibold">
                                                                👤 Seller
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">Address:</span>
                                                    <code className="text-sm font-mono text-gray-900 dark:text-white bg-white dark:bg-gray-700 px-2 py-1 rounded border">
                                                        {shortAddr(sellerAddress)}
                                                    </code>
                                                    <button
                                                        onClick={() => navigator.clipboard.writeText(sellerAddress)}
                                                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                                        title="Copy seller address"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Explanation when marketplace owns it */}
                                        {ownerAddress?.toLowerCase() === process.env.NEXT_PUBLIC_MARKET_ADDRESS?.toLowerCase() && (
                                            <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                                                <p className="text-xs text-orange-700 dark:text-orange-300">
                                                    <strong>Why is the marketplace the current owner?</strong><br />
                                                    {isForSale && "This NFT is currently listed for sale. The marketplace temporarily holds it in escrow until sold or delisted."}
                                                    {!isForSale && !thereIsAuction && "This NFT was transferred to the marketplace for listing or auction purposes."}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Price/Auction Section */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
                     
                        {hasActiveAuction && isOwner && !isForSale && (
                            <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm dark:bg-red-900/20 dark:border-red-800 dark:text-red-200">
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    <span className="font-medium">⚠️ Cannot List: NFT in Marketplace Escrow</span>
                                </div>
                                <p className="mt-2 text-xs text-red-700 dark:text-red-300">
                                    <strong>This NFT is currently held by the marketplace and cannot be listed.</strong>
                                    <br />
                                    This could be due to:
                                </p>
                                <ul className="mt-1 text-xs text-red-700 dark:text-red-300 list-disc list-inside space-y-1">
                                    <li>An active or recently ended auction that needs to be claimed</li>
                                    <li>An existing listing that needs to be cancelled first</li>
                                    <li>A pending transaction that needs to be completed</li>
                                </ul>
                                <p className="mt-2 text-xs text-red-700 dark:text-red-300">
                                    <strong>Action required:</strong> Check your auction status or cancel any existing listings before creating a new one.
                                </p>
                            </div>
                        )}

                        {(
                            <NftInfoActionBar
                                isForSale={isForSale}
                                formattedPrice={formattedPrice}
                                lastPrice={lastPrice}
                                showBuyButton={buttonVisibility.showBuy}
                                showListButton={buttonVisibility.showList}
                                showOfferDisabled={buttonVisibility.showOfferDisabled}
                                showCancelButton={buttonVisibility.showCancel}
                                onCancelClick={cancel}
                                isCancelBusy={busyCancel}
                                showEditButton={buttonVisibility.showEdit}
                                onEditClick={handleOpenChange}
                                isEditBusy={busyChange}
                                onBuyClick={onBuyClick}
                                onListClick={() => {
                                    showBanner('info', 'Preparing listing…', 1500);
                                    openModal();
                                }}
                                isBuying={isBuying}
                                isListingBusy={isSelling || busyApprove || busyList}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Enhanced Details Panel */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 overflow-hidden transition-all duration-300 hover:shadow-2xl">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 p-6 border-b border-gray-200/60 dark:border-gray-700/60">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        Details & Information
                    </h3>
                </div>

                <div className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <DetailRow
                            label="Contract Address"
                            value={
                                <a
                                    href={explorerUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-mono text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors flex items-center gap-2"
                                >
                                    {shortAddr(contractAddress)}
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                </a>
                            }
                        />

                        <DetailRow
                            label="Token ID"
                            value={<span className="font-mono text-sm text-gray-900 dark:text-white">#{tokenId}</span>}
                        />

                        <DetailRow
                            label="Blockchain"
                            value={
                                <span className="font-medium text-gray-900 dark:text-white">Ethereum Sepolia</span>
                            }
                        />

                        <DetailRow
                            label="Token Standard"
                            value={
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                    ERC-721
                                </span>
                            }
                        />

                        {lastPrice && (
                            <DetailRow
                                label="Last Sale Price"
                                value={<span className="font-bold text-green-600 dark:text-green-400">{lastPrice.toFixed(4)} ETH</span>}
                            />
                        )}

                        <DetailRow
                            label="Created"
                            value={<span className="text-gray-600 dark:text-gray-400">Recently minted</span>}
                        />
                    </div>

                    {/* Enhanced Attributes Section */}
                    {meta?.attributes && meta.attributes.length > 0 && (
                        <div className="mt-10">
                            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                                Attributes & Traits
                                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                                    ({meta.attributes.filter(attr => attr.trait_type && attr.value !== undefined).length} traits)
                                </span>
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                {meta.attributes
                                    .filter((attr) => attr.trait_type && attr.value !== undefined)
                                    .map((attr, index) => (
                                        <AttributeCard
                                            key={`${attr.trait_type}-${index}`}
                                            traitType={attr.trait_type!}
                                            value={String(attr.value!)}
                                            rarity={Math.floor(Math.random() * 15) + 1}
                                        />
                                    ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <ListForSaleModal
                open={open}
                onClose={closeModal}
                onConfirm={confirmList}
                value={priceInput}
                setValue={setPriceInput}
                error={error}
                busyApprove={busyApprove}
                busyList={busyList}
            />

            <ListForSaleModal
                open={openChange}
                onClose={closeChangeModal}
                onConfirm={confirmChange}
                value={changePriceInput}
                setValue={setChangePriceInput}
                error={errorChange}
                busyApprove={false}
                busyList={busyChange}
                title="Update Price"
                confirmLabel={busyChange ? 'Updating Price...' : 'Update Price'}
            />
        </div>
    );
}
