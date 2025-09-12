'use client';

import { formatEther } from 'viem';
import { useState, useCallback, useMemo, useRef, useEffect, memo } from 'react';
import { useRouter } from 'next/navigation';
import StatusBadge from '@/components/ui/StatusBadge';
import { NftMetadata } from '@/lib/types/metadata';
import { NftActivity } from '@/lib/types/activity';
import { useListForSale } from '@/hooks/useListForSale';
import { useCancelListing } from '@/hooks/useCancelListing';
import { useChangePrice } from '@/hooks/useChangePrice';
import { useBookmarks } from '@/hooks/useBookmarks';
import NftInfoActionBar from './NftInfoActionBar';
import ListForSaleModal from './ListForSaleModal';

/* ───────────────────── Enhanced Types ───────────────────── */
export type AuctionData = {
    seller: `0x${string}`;
    end: bigint;            // epoch seconds
    bid: bigint;            // wei
    bidder?: `0x${string}`; // opcional
};

export type AuctionProps = {
    auction?: AuctionData | null;
    auctionLive?: boolean;
    auctionHasBid?: boolean;
    timeLeftMs?: number;
    isSellerOfAuction?: boolean;
    canCreateAuction?: boolean;
    canBidAuction?: boolean;
    canEndAuction?: boolean;
    canCancelAuction?: boolean;
    busyCreate?: boolean;
    busyBid?: boolean;
    busyEnd?: boolean;
    busyCancel?: boolean;
    openCreate?: () => void;
    openBid?: () => void;
    onCreateAuction?: () => void;
    onBidAuction?: () => void;
    onEndAuction?: () => void;
    onCancelAuction?: () => void;
    isProcessingAuction?: boolean;
};

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
    auctionProps?: AuctionProps;
}

/* ───────────────────── Enhanced Time Formatting ───────────────────── */
function fmtTimeLeft(ms?: number): { display: string; isUrgent: boolean; isEnded: boolean } {
    if (ms == null) return { display: '--:--', isUrgent: false, isEnded: false };
    if (ms <= 0) return { display: 'Ended', isUrgent: false, isEnded: true };
    
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    
    const display = h > 0 ? `${h}h ${m}m ${sec}s` : `${m}m ${sec}s`;
    const isUrgent = ms < 300000; // Less than 5 minutes
    
    return { display, isUrgent, isEnded: false };
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

/* ───────────────────── Enhanced Auction Action Bar ───────────────────── */
const AuctionActionBar = memo(({
    auction,
    auctionLive,
    auctionHasBid,
    timeLeftMs,
    isSellerOfAuction,
    openCreate,
    openBid,
    onEndAuction,
    onCancelAuction,
    busyCreate,
    busyBid,
    busyEnd,
    busyCancel,
    isOwner,
    isForSale,
}: AuctionProps & { isOwner: boolean; isForSale: boolean }) => {
    const timeInfo = fmtTimeLeft(timeLeftMs);
    
    if (auction) {
        const hasBid = (auction.bid ?? BigInt(0)) > BigInt(0);
        
        return (
            <div className="space-y-6">
                {/* Auction Status Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            {auctionLive ? 'Live Auction' : 'Auction Ended'}
                        </h3>
                    </div>
                    <div className={`px-4 py-2 rounded-full text-sm font-bold ${
                        auctionLive 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                    }`}>
                        {auctionLive ? '🟢 Active' : '🔴 Ended'}
                    </div>
                </div>

                {/* Auction Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-6 border border-blue-200/50 dark:border-blue-800/50">
                        <div className="flex items-center gap-3 mb-3">
                            <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                {hasBid ? 'Winning Bid' : 'Current Bid'}
                            </h4>
                        </div>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                            {hasBid ? formatEther(auction.bid) : '0'} ETH
                        </p>
                        {hasBid && auction.bidder ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                by {auction.bidder.slice(0, 6)}...{auction.bidder.slice(-4)}
                            </p>
                        ) : (
                            <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                                No bids received
                            </p>
                        )}
                    </div>

                    <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-2xl p-6 border border-orange-200/50 dark:border-orange-800/50">
                        <div className="flex items-center gap-3 mb-3">
                            <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                Status
                            </h4>
                        </div>
                        <p className={`text-3xl font-bold mb-2 ${
                            timeInfo.isUrgent && auctionLive
                                ? 'text-red-600 dark:text-red-400 animate-pulse'
                                : auctionLive 
                                ? 'text-gray-900 dark:text-white'
                                : 'text-gray-600 dark:text-gray-400'
                        }`}>
                            {auctionLive ? timeInfo.display : 'Ended'}
                        </p>
                        {!auctionLive && (
                            <p className={`text-sm font-medium ${
                                hasBid 
                                    ? 'text-green-600 dark:text-green-400' 
                                    : 'text-orange-600 dark:text-orange-400'
                            }`}>
                                {hasBid ? '✅ Ready to finalize' : '🔄 Needs retrieval'}
                            </p>
                        )}
                        {timeInfo.isUrgent && auctionLive && (
                            <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                                ⚡ Ending soon!
                            </p>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-4">
                    {auctionLive && !isSellerOfAuction && (
                        <button
                            type="button"
                            onClick={openBid}
                            disabled={!!busyBid}
                            className="flex-1 min-w-[140px] px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-blue-400 disabled:to-purple-400 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed"
                            aria-label="Place bid on auction"
                        >
                            {busyBid ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Placing Bid...
                                </div>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    🎯 Place Bid
                                </span>
                            )}
                        </button>
                    )}

                    {auctionLive && isSellerOfAuction && !auctionHasBid && (
                        <button
                            type="button"
                            onClick={onCancelAuction}
                            disabled={!!busyCancel}
                            className="px-6 py-4 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100"
                            aria-label="Cancel auction"
                        >
                            {busyCancel ? 'Cancelling...' : '❌ Cancel Auction'}
                        </button>
                    )}

                    {/* End Auction Button - Only for auction seller */}
                    {!auctionLive && isSellerOfAuction && (
                        <button
                            type="button"
                            onClick={onEndAuction}
                            disabled={!!busyEnd}
                            className="flex-1 min-w-[140px] px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-green-400 disabled:to-emerald-400 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100"
                            aria-label="End auction and finalize"
                        >
                            {busyEnd ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    {hasBid ? 'Finalizing Sale...' : 'Retrieving NFT...'}
                                </div>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    {hasBid ? '🏁 Finalize Sale' : '🔄 Retrieve NFT'}
                                </span>
                            )}
                        </button>
                    )}

                    {/* Information for non-sellers when auction ended */}
                    {!auctionLive && !isSellerOfAuction && (
                        <div className="flex-1 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                            <div className="text-center">
                                <div className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    ⏰ Auction Ended
                                </div>
                                {hasBid ? (
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        Waiting for seller to finalize the sale...
                                    </div>
                                ) : (
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        No bids received. Seller can retrieve their NFT.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // No auction exists - creation interface
    if (isOwner && !isForSale) {
        return (
            <div className="text-center py-12">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-full flex items-center justify-center">
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    Create an Auction
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
                    Set up a timed auction to let others bid competitively on your NFT. Great for discovering true market value.
                </p>
                <button
                    type="button"
                    onClick={openCreate}
                    disabled={!!busyCreate}
                    className="px-10 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-purple-400 disabled:to-blue-400 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100"
                    aria-label="Create new auction"
                >
                    {busyCreate ? (
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Creating Auction...
                        </div>
                    ) : (
                        <span className="flex items-center gap-2">
                            🚀 Create Auction
                        </span>
                    )}
                </button>
            </div>
        );
    }

    return null;
});
AuctionActionBar.displayName = 'AuctionActionBar';

/* ───────────────────── Enhanced Share & Bookmark Components ───────────────────── */
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
        className={`p-3 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
            isBookmarked
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
        auctionProps, // ← NEW
    } = props;

    const router = useRouter();
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

    /* Enhanced status and computed properties */
    const thereIsAuction = useMemo(() => {
        const hasAuction = !!auctionProps?.auction || auctionProps?.auctionLive;
        return hasAuction;
    }, [auctionProps]);

    const statusLabel = useMemo(() => {
        if (thereIsAuction) return 'In Auction';
        if (isForSale) return 'For Sale';
        if (isOwner) return 'Owned by You';
        return 'Not Available';
    }, [thereIsAuction, isForSale, isOwner]);

    const statusBadgeStatus = useMemo(() => {
        return thereIsAuction || isForSale ? 'listed' : 'unlisted';
    }, [thereIsAuction, isForSale]);

    const explorerUrl = useMemo(() => 
        `https://sepolia.etherscan.io/address/${contractAddress}`, 
        [contractAddress]
    );

    const shortAddr = useCallback((addr: string) => 
        `${addr.slice(0, 6)}...${addr.slice(-4)}`, 
        []
    );

    /* LISTAR */
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

    /* CANCELAR LISTING */
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

    /* CAMBIAR PRECIO */
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

    /* BOOKMARKS */
    const { isBookmarked, toggleBookmark } = useBookmarks(contractAddress, tokenId);

    /* Enhanced Share functionality with better UX */
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
                
                // Optional: Open Twitter share
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

    /* Enhanced bookmark functionality with better feedback */
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

    /* Enhanced button visibility with memoization */
    const buttonVisibility = useMemo(() => {
        const visibility = {
            showBuy: !thereIsAuction && isForSale && !isOwner && !!price && (price ?? BigInt(0)) > BigInt(0),
            showList: !thereIsAuction && isOwner && !isForSale && canList,
            showCancel: !thereIsAuction && isOwner && isForSale && canCancel,
            showEdit: !thereIsAuction && isOwner && isForSale && canChange,
            showOfferDisabled: !thereIsAuction && !isOwner && !isForSale,
        };
        
        return visibility;
    }, [thereIsAuction, isForSale, isOwner, price, canList, canCancel, canChange]);

    return (
        <div className="space-y-8">
            {/* Enhanced Banner */}
            {banner && (
                <EnhancedBanner banner={banner} onClose={closeBanner} />
            )}

            {/* Critical Action Required Banner for stuck NFTs */}
            {ownerAddress?.toLowerCase() === process.env.NEXT_PUBLIC_MARKET_ADDRESS?.toLowerCase() && 
             thereIsAuction && !auctionProps?.auctionLive && 
             auctionProps?.isSellerOfAuction && (
                <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-6 shadow-lg">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                                <span className="text-2xl">⚠️</span>
                            </div>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-red-800 dark:text-red-200 mb-2">
                                Action Required: Your NFT Needs Retrieval
                            </h3>
                            <p className="text-red-700 dark:text-red-300 mb-4">
                                {auctionProps?.auctionHasBid 
                                    ? "Your auction ended successfully! Click the button below to finalize the sale and transfer the NFT to the winning bidder."
                                    : "Your auction ended without any bids. Click the button below to retrieve your NFT back to your wallet."
                                }
                            </p>
                            <div className="bg-red-100 dark:bg-red-900/30 rounded-lg p-3 text-sm text-red-800 dark:text-red-200">
                                <strong>Why is this necessary?</strong> The marketplace holds your NFT in escrow during auctions. 
                                You must manually complete this final step to {auctionProps?.auctionHasBid ? 'receive payment and transfer ownership' : 'get your NFT back'}.
                            </div>
                        </div>
                    </div>
                </div>
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
                                {thereIsAuction && (
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                        <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                                            Live Auction
                                        </span>
                                    </div>
                                )}
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
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                                Owned by
                                            </span>
                                            {ownerAddress && (
                                                <div className="flex items-center gap-2">
                                                    {/* Check if it's marketplace address */}
                                                    {ownerAddress.toLowerCase() === process.env.NEXT_PUBLIC_MARKET_ADDRESS?.toLowerCase() ? (
                                                        <div className="flex items-center gap-2">
                                                            <span className="px-3 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 rounded-full text-xs font-semibold">
                                                                🏪 Marketplace Escrow
                                                            </span>
                                                        </div>
                                                    ) : isOwner ? (
                                                        <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full text-xs font-semibold">
                                                            ✅ You
                                                        </span>
                                                    ) : (
                                                        <span className="px-3 py-1 bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 rounded-full text-xs font-semibold">
                                                            👤 Other User
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-500 dark:text-gray-400">Address:</span>
                                                <code className="text-sm font-mono text-gray-900 dark:text-white bg-white dark:bg-gray-700 px-2 py-1 rounded border">
                                                    {shortAddr(ownerAddress || '')}
                                                </code>
                                                <button
                                                    onClick={() => navigator.clipboard.writeText(ownerAddress || '')}
                                                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                                    title="Copy address"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                </button>
                                            </div>
                                            
                                            {/* Explanation when marketplace owns it */}
                                            {ownerAddress?.toLowerCase() === process.env.NEXT_PUBLIC_MARKET_ADDRESS?.toLowerCase() && (
                                                <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                                                    <p className="text-xs text-orange-700 dark:text-orange-300">
                                                        <strong>Why is the marketplace the owner?</strong><br/>
                                                        {isForSale && "This NFT is currently listed for sale. The marketplace temporarily holds it in escrow until sold or delisted."}
                                                        {thereIsAuction && auctionProps?.auctionLive && "This NFT is in an active auction. The marketplace holds it in escrow until the auction ends."}
                                                        {thereIsAuction && !auctionProps?.auctionLive && (
                                                            <>
                                                                This NFT&apos;s auction has ended. 
                                                                {auctionProps?.auctionHasBid 
                                                                    ? " The seller needs to finalize the sale to transfer it to the winning bidder."
                                                                    : " The seller needs to retrieve their NFT since no bids were received."
                                                                }
                                                            </>
                                                        )}
                                                        {!isForSale && !thereIsAuction && "This NFT was transferred to the marketplace for listing or auction purposes."}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Price/Auction Section */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
                        {thereIsAuction ? (
                            <AuctionActionBar
                                {...auctionProps}
                                isOwner={isOwner}
                                isForSale={isForSale}
                            />
                        ) : (
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
                                            rarity={Math.floor(Math.random() * 15) + 1} // Mock rarity for demo
                                        />
                                    ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Enhanced Modal Components with improved UX */}
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
