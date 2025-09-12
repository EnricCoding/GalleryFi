'use client';

import { useCallback, useMemo, useState, memo, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useSearchParams } from 'next/navigation';
import { useNftData } from '@/hooks/useNftData';
import { useBuyNft } from '@/hooks/useBuyNft';
import { useAuctionData, type AuctionData } from '@/hooks/useAuctionData';
import { useCreateAuction } from '@/hooks/useCreateAuction';
import { useEndAuction } from '@/hooks/useEndAuction';
import { useCancelAuction } from '@/hooks/useCancelAuction';
import { useBidAuction } from '@/hooks/useBidValue';
import { NftMetadata } from '@/lib/types/metadata';
import { NftActivity } from '@/lib/types/activity';
import { CONTRACTS } from '@/config/contracts';
import { AuctionUtils, type OwnershipState, type AuctionActionValidity } from '@/types/auction';
import { analyzeAuctionForUX } from '@/lib/ui/auction-ux';
import { EnhancedAuctionSection } from '@/components/shared/EnhancedAuctionSection';
import { PerfectOwnershipDisplay } from '@/components/shared/PerfectOwnershipDisplay';
import NftImage from './NftImage';
import NftInfo from './NftInfo';
import ActivityTabs from './ActivityTabs';
import Toast from '@/components/ui/Toast';
import CreateAuctionModal from '@/components/shared/CreateAuctionModal';
import PlaceBidModal from '@/components/shared/PlaceBidModal';

interface NftDetailProps {
    nft: `0x${string}`;
    tokenId: string;
}

type ToastKind = 'success' | 'error' | 'info';
interface ToastMessage {
    message: string;
    type: ToastKind;
}

// Enhanced auction props type
interface AuctionProps {
    auction: AuctionData | null;
    auctionLive: boolean;
    auctionHasBid: boolean;
    timeLeftMs: number;
    isSellerOfAuction: boolean;
    canCreateAuction: boolean;
    canBidAuction: boolean;
    canEndAuction: boolean;
    canCancelAuction: boolean;
    onCreateAuction: () => void;
    onBidAuction: () => void;
    onEndAuction: () => void;
    onCancelAuction: () => void;
    isProcessingAuction: boolean;
}

/* ---------------- Enhanced Loading Skeleton ---------------- */
const LoadingSkeleton = memo(() => (
    <div
        className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8"
        role="status"
        aria-busy="true"
        aria-label="Loading NFT details"
    >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Image skeleton */}
                <div className="xl:col-span-6">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 overflow-hidden">
                        <div className="aspect-square bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 animate-pulse relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 animate-shimmer" />
                        </div>
                    </div>
                </div>

                {/* Info skeleton */}
                <div className="xl:col-span-6 space-y-8">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 p-8">
                        <div className="animate-pulse space-y-6">
                            {/* Title */}
                            <div className="space-y-3">
                                <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-xl w-3/4 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 animate-shimmer" />
                                </div>
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5" />
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/5" />
                            </div>

                            {/* Price/Action button */}
                            <div className="h-12 bg-gradient-to-r from-blue-200 to-purple-200 dark:from-blue-800 dark:to-purple-800 rounded-xl relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 animate-shimmer" />
                            </div>
                        </div>
                    </div>

                    {/* Additional skeleton blocks */}
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 p-6">
                        <div className="animate-pulse space-y-4">
                            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                            <div className="grid grid-cols-2 gap-4">
                                <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                                <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
));
LoadingSkeleton.displayName = 'LoadingSkeleton';

/* ---------------- Not found ---------------- */
const NotFoundError = memo(({ onGoBack }: { onGoBack: () => void }) => (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center py-8">
        <div className="max-w-md mx-auto text-center">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 p-8">
                <div className="w-16 h-16 mx-auto mb-6 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                    <svg
                        className="w-8 h-8 text-red-600 dark:text-red-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">NFT not found</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">The requested token does not exist or an error occurred.</p>
                <button
                    onClick={onGoBack}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white font-semibold rounded-xl transition-all duration-200 active:scale-95"
                >
                    Go back
                </button>
            </div>
        </div>
    </div>
));
NotFoundError.displayName = 'NotFoundError';

/* ---------------- Content ---------------- */
const NftDetailContent = memo(({
    imgUrl,
    meta,
    tokenId,
    contractAddress,
    price,
    isOwner,
    isForSale,
    activity,
    seller,
    ownerAddress,
    onBuyClick,
    isBuying,
    isRefreshing,
    isNewlyCreated,
    onRefreshData,
    auctionProps,
    // Debug props
    userAddress,
    auction,
    auctionUXAnalysis,
    ownershipState,
}: {
    imgUrl: string | null;
    meta: NftMetadata | null;
    tokenId: string;
    contractAddress: `0x${string}`;
    price: bigint | null;
    isOwner: boolean;
    isForSale: boolean;
    activity: NftActivity[];
    seller: `0x${string}` | undefined;
    ownerAddress?: `0x${string}` | undefined;
    onBuyClick: () => void;
    isBuying: boolean;
    isRefreshing?: boolean;
    isNewlyCreated: boolean;
    onRefreshData?: () => Promise<void>;
    auctionProps?: AuctionProps;
    // Debug props
    userAddress?: `0x${string}`;
    auction?: AuctionData | null;
    auctionUXAnalysis?: ReturnType<typeof analyzeAuctionForUX>;
    ownershipState?: OwnershipState;
}) => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {isRefreshing && (
                    <div className="fixed top-4 right-4 z-50 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        <span className="text-sm font-medium">Updating data...</span>
                    </div>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    <NftImage imgUrl={imgUrl} meta={meta} tokenId={tokenId} />

                    <div className="xl:col-span-6">
                        <NftInfo
                            meta={meta}
                            tokenId={tokenId}
                            contractAddress={contractAddress}
                            price={price}
                            isOwner={isOwner}
                            isForSale={isForSale}
                            activity={activity}
                            onBuyClick={onBuyClick}
                            isBuying={isBuying}
                            ownerAddress={ownerAddress}
                            sellerAddress={seller}
                            onRefreshData={onRefreshData}
                            auctionProps={auctionProps}
                        />

                        {/* ✨ Enhanced Auction Section with improved UX */}

                        
                        {auctionProps && auctionUXAnalysis && (
                            <EnhancedAuctionSection
                                uxAnalysis={auctionUXAnalysis}
                                auction={auction || null}
                                onCreateAuction={auctionProps.onCreateAuction}
                                onBidAuction={auctionProps.onBidAuction}
                                onEndAuction={auctionProps.onEndAuction}
                                onCancelAuction={auctionProps.onCancelAuction}
                                isProcessing={auctionProps.isProcessingAuction}
                                userAddress={userAddress}
                                onRefreshData={onRefreshData}
                            />
                        )}
                    </div>
                </div>

                <div className={`mt-12 transition-opacity duration-300 ${isRefreshing ? 'opacity-60' : 'opacity-100'}`}>
                    <ActivityTabs 
                        activity={activity} 
                        isNewlyCreated={isNewlyCreated}
                        onRefreshData={onRefreshData}
                    />
                </div>
            </div>
        </div>
    );
});
NftDetailContent.displayName = 'NftDetailContent';

/* ---------------- Page ---------------- */
export default function NftDetail({ nft: contractAddress, tokenId }: NftDetailProps) {
    const { address } = useAccount();
    const [toastMessage, setToastMessage] = useState<ToastMessage | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const searchParams = useSearchParams();
    const autoRefreshCompleted = useRef(false);

    const isNewlyCreated = searchParams.get('newly_created') === 'true';

    const {
        meta,
        imgUrl,
        onchainListing,
        onchainOwner,
        subgraphLoading,
        activity,
        listedNow,
        tokenIdBig,
        validInputs,
        expectedChainId,
        MARKET,
        refreshAllData,
    } = useNftData({ nft: contractAddress, tokenId });

    /* ---------- Enhanced notification system ---------- */
    const showNotification = useCallback((message: string, type: ToastKind) => {
        setToastMessage({ message, type });

        // Auto-dismiss success notifications
        if (type === 'success') {
            setTimeout(() => setToastMessage(null), 5000);
        }
    }, []);

    const handleGoBack = useCallback(() => {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = '/explore';
        }
    }, []);

    const handleCloseToast = useCallback(() => setToastMessage(null), []);

    /* ---------- Refresh wrapper ---------- */
    const enhancedRefreshData = useCallback(async () => {
        setIsRefreshing(true);
        try {
            await refreshAllData();
        } finally {
            setIsRefreshing(false);
        }
    }, [refreshAllData]);

    /* ---------- Enhanced auto-refresh para newly_created ---------- */
    useEffect(() => {
        if (!isNewlyCreated || autoRefreshCompleted.current) return;

        let refreshCount = 0;
        const maxRefreshes = 4; // Reduced from 6 to 4 refreshes
        let isActive = true;

        // Show initial loading message
        setToastMessage({ message: '🔄 Loading newly created NFT data...', type: 'info' });

        // Clear message after 3 seconds if still active
        const initialMessageTimeout = setTimeout(() => {
            if (isActive) setToastMessage(null);
        }, 3000);

        const autoRefreshInterval = setInterval(async () => {
            if (!isActive) return;

            refreshCount++;

            try {
                await refreshAllData();

                // Show progress updates
                if (refreshCount > 1 && isActive) {
                    setToastMessage({
                        message: `Still loading... (${refreshCount}/${maxRefreshes})`,
                        type: 'info'
                    });
                }

                // Check if we should stop
                if (refreshCount >= maxRefreshes) {
                    clearInterval(autoRefreshInterval);
                    autoRefreshCompleted.current = true;

                    if (isActive) {
                        setToastMessage({
                            message: 'ℹ️ Data may still be indexing. Try refreshing the page in a moment.',
                            type: 'info'
                        });

                        // Auto-dismiss this final message after 8 seconds
                        setTimeout(() => {
                            if (isActive) setToastMessage(null);
                        }, 8000);
                    }
                }
            } catch (error) {
                console.error('Auto-refresh error:', error);

                if (refreshCount >= maxRefreshes && isActive) {
                    clearInterval(autoRefreshInterval);
                    autoRefreshCompleted.current = true;
                    setToastMessage({
                        message: '⚠️ Auto-refresh completed. Data may still be indexing.',
                        type: 'info'
                    });
                }
            }
        }, 8000); // Increased from 5000ms to 8000ms (8 seconds between refreshes)

        return () => {
            isActive = false;
            clearInterval(autoRefreshInterval);
            clearTimeout(initialMessageTimeout);
        };
    }, [isNewlyCreated, refreshAllData]);

    // Success detection for newly created NFTs
    useEffect(() => {
        if (isNewlyCreated && !autoRefreshCompleted.current && activity.length > 0) {
            autoRefreshCompleted.current = true;
            setToastMessage({ message: '✅ NFT data loaded successfully!', type: 'success' });
        }
    }, [isNewlyCreated, activity.length]);

    /* ---------- BUY ---------- */
    const { busy, handleBuyNow } = useBuyNft({
        nft: contractAddress,
        tokenIdBig,
        validInputs,
        listedNow,
        onchainListing: onchainListing || undefined, // Type compatibility fix
        expectedChainId,
        MARKET: MARKET?.address || ('0x0' as `0x${string}`), // Extract address or fallback
        showNotification,
        refreshData: enhancedRefreshData,
    });

    /* ========= SUBASTAS ========= */

    // Usar configuración centralizada
    const marketplaceAddress = CONTRACTS.MARKETPLACE;

    // Lectura on-chain de la subasta + estado
    const {
        auction,
        isLive: auctionLive,
        hasBid: auctionHasBid,
        refetchAuction,
        timeLeftMs,
    } = useAuctionData({
        market: marketplaceAddress,
        nft: contractAddress,
        tokenId,
    });

    // ✅ NUEVA LÓGICA DE OWNERSHIP CORREGIDA
    const ownershipState: OwnershipState = useMemo(() => {
        return AuctionUtils.getOwnershipState(
            address,
            onchainOwner || undefined,
            marketplaceAddress,
            auction
        );
    }, [address, onchainOwner, marketplaceAddress, auction]);

    // Enhanced derived state calculation usando nueva lógica
    const { seller, price, isOwner, isForSale, tokenExists, loading } = useMemo(() => {
        const derivedSeller = onchainListing?.seller;
        const derivedPrice = onchainListing?.price;

        // 🔥 OWNERSHIP CORREGIDO: Usar ownershipState calculado
        const derivedIsOwner = ownershipState.canViewAsOwner;

        // 🚨 CRITICAL DEBUG: Log ownership calculation con nueva lógica
        if (address) {
            console.group('🔍 NEW OWNERSHIP CALCULATION DEBUG');
            console.log('Current Address:', address);
            console.log('OnChain Owner:', onchainOwner);
            console.log('Listing Seller:', derivedSeller);
            console.log('Auction Seller:', auction?.seller);
            console.log('Marketplace Address:', marketplaceAddress);
            
            console.log('🔸 Ownership State:', ownershipState);
            console.log('🔸 Final canViewAsOwner:', derivedIsOwner);
            
            // Diagnóstico detallado
            if (!ownershipState.isDirectOwner && ownershipState.isAuctionSeller) {
                console.info('✅ User is auction seller (NFT in escrow) - showing as owner for UX');
            } else if (ownershipState.isDirectOwner && !ownershipState.isAuctionSeller) {
                console.info('✅ User is direct NFT owner');
            } else if (!ownershipState.canViewAsOwner) {
                console.warn('❌ User has no ownership rights');
            }
            console.groupEnd();
        }

        const derivedIsForSale = typeof derivedPrice !== 'undefined' && derivedPrice !== null && derivedPrice > BigInt(0);
        const derivedTokenExists = validInputs && tokenIdBig !== null;
        const derivedLoading = subgraphLoading && !meta;

        return {
            seller: derivedSeller,
            price: derivedPrice,
            isOwner: derivedIsOwner,
            isForSale: derivedIsForSale,
            tokenExists: derivedTokenExists,
            loading: derivedLoading,
        };
    }, [onchainListing, ownershipState, validInputs, tokenIdBig, subgraphLoading, meta, address, onchainOwner, auction, marketplaceAddress]);

    // ✅ VALIDACIONES DE ACCIONES USANDO NUEVA LÓGICA
    const auctionActionValidity: AuctionActionValidity = useMemo(() => {
        return AuctionUtils.validateAuctionActions(
            address,
            auction,
            ownershipState,
            !!address
        );
    }, [address, auction, ownershipState]);

    // ✅ ANÁLISIS UX COMPLETO para auction interface
    const auctionUXAnalysis = useMemo(() => {
        return analyzeAuctionForUX(
            auction,
            ownershipState,
            auctionActionValidity,
            timeLeftMs
        );
    }, [auction, ownershipState, auctionActionValidity, timeLeftMs]);

    const refreshBoth = useCallback(async () => {
        await enhancedRefreshData();
        await refetchAuction();
        
        // Multiple refreshes for auction end to detect owner changes
        setTimeout(async () => {
            try {
                await enhancedRefreshData(); // First additional refresh after 3 seconds
            } catch (error) {
                console.warn('First delayed refresh failed:', error);
            }
        }, 3000);
        
        setTimeout(async () => {
            try {
                await enhancedRefreshData(); // Second additional refresh after 8 seconds
            } catch (error) {
                console.warn('Second delayed refresh failed:', error);
            }
        }, 8000);
        
        setTimeout(async () => {
            try {
                await enhancedRefreshData(); // Final refresh after 15 seconds
            } catch (error) {
                console.warn('Final delayed refresh failed:', error);
            }
        }, 15000);
    }, [enhancedRefreshData, refetchAuction]);

    const createAuctionHook = useCreateAuction({
        nft: contractAddress,
        tokenId,
        isOwner: ownershipState.hasControlRights,
        onCreated: async () => {
            showNotification('✅ Auction created! Your NFT is now safely held in escrow by the marketplace.', 'success');
            await refreshBoth();
        },
        onStatus: (s) => showNotification(s, 'info'),
    });

    const bidAuctionHook = useBidAuction({
        nft: contractAddress,
        tokenId,
        currentBidWei: auction?.bid ?? BigInt(0),
        onBidded: async () => {
            showNotification('✅ Bid placed!', 'success');
            await refreshBoth();
        },
        onStatus: (s) => showNotification(s, 'info'),
    });
    
    const nowSec = Math.floor(Date.now() / 1000);
    const canEnd = !!auction && Number(auction.end) <= nowSec;
    const { busyEnd, endAuction } = useEndAuction({
        nft: contractAddress,
        tokenId,
        auctionEndTime: auction?.end ? Number(auction.end) * 1000 : undefined, // Convert seconds to milliseconds
        hasWinner: auctionHasBid,
        onEnded: async (txHash, success) => {
            if (success) {
                if (auctionHasBid) {
                    showNotification('🏆 Auction ended! NFT transferred to highest bidder.', 'success');
                } else {
                    showNotification('📦 Auction ended with no bids. NFT returned to you.', 'info');
                }
            } else {
                showNotification('❌ Failed to end auction', 'error');
            }
            await refreshBoth();
        },
        onStatus: (s) => showNotification(s, 'info'),
    });

    const { busyCancel, cancelAuction } = useCancelAuction({
        nft: contractAddress,
        tokenId,
        isOwner: ownershipState.isAuctionSeller,
        hasBids: auctionHasBid,
        isLive: auctionLive,
        onCanceled: async () => {
            showNotification('✅ Auction cancelled', 'success');
            await refreshBoth();
        },
        onStatus: (s) => showNotification(s, 'info'),
    });

    const auctionProps = useMemo(
        () => ({
            auction,
            auctionLive,
            auctionHasBid,
            timeLeftMs: timeLeftMs, 
            isSellerOfAuction: ownershipState.isAuctionSeller,
            canCreateAuction: auctionActionValidity.canCreate,
            canBidAuction: auctionActionValidity.canBid,
            canEndAuction: auctionActionValidity.canEnd,
            canCancelAuction: auctionActionValidity.canCancel,
            onCreateAuction: () => createAuctionHook.openModal(),
            onBidAuction: () => bidAuctionHook.openModal(),
            onEndAuction: () => {
                console.debug('🔚 EndAuction button clicked:', { 
                    auction: !!auction, 
                    timeLeftMs, 
                    canEnd,
                    auctionEnd: auction?.end ? Number(auction.end) : 'N/A',
                    now: Math.floor(Date.now() / 1000),
                    ownershipState,
                    auctionActionValidity
                });
                endAuction();
            },
            onCancelAuction: () => cancelAuction(),
            isProcessingAuction: createAuctionHook.isProcessing || bidAuctionHook.isProcessing || busyEnd || busyCancel,
        }),
        [
            auction,
            auctionLive,
            auctionHasBid,
            timeLeftMs,
            ownershipState,
            auctionActionValidity,
            canEnd,
            createAuctionHook,
            bidAuctionHook,
            endAuction,
            cancelAuction,
            busyEnd,
            busyCancel,
        ],
    );

    // Debug auction props for troubleshooting

    // Enhanced debug for new ownership system
    useEffect(() => {
        if (auction || onchainOwner) {
            console.group('🔍 ENHANCED OWNERSHIP DEBUG');
            console.log('👤 User Address:', address);
            console.log('� OnChain Owner:', onchainOwner);
            console.log('🏪 Marketplace:', marketplaceAddress);
            console.log('🎯 Auction:', auction);
            
            console.log('🎛️ Ownership State:', ownershipState);
            console.log('✅ Action Validity:', auctionActionValidity);
            
            if (auction) {
                console.log('🎪 Auction Details:');
                console.log('  - Live:', auctionLive);
                console.log('  - Has Bids:', auctionHasBid);
                console.log('  - Time Left:', timeLeftMs);
            }
            
            console.groupEnd();
        }
    }, [auction, auctionLive, auctionHasBid, timeLeftMs, ownershipState, auctionActionValidity, address, onchainOwner, marketplaceAddress]);

    if (loading) return <LoadingSkeleton />;
    if (!tokenExists) return <NotFoundError onGoBack={handleGoBack} />;

    return (
        <>
            <NftDetailContent
                imgUrl={imgUrl}
                meta={meta}
                tokenId={tokenId}
                contractAddress={contractAddress}
                price={price ?? null}
                isOwner={isOwner}
                isForSale={isForSale}
                activity={activity.map(item => ({
                    ...item,
                    activityType: (item.type?.toUpperCase() || 'TRANSFER') as NftActivity['activityType'],
                    timestamp: item.timestamp ? item.timestamp.toString() : Date.now().toString()
                })) as NftActivity[]} // Type compatibility fix
                seller={seller}
                ownerAddress={onchainOwner || undefined} // Type compatibility fix
                onBuyClick={handleBuyNow}
                isBuying={busy}
                isRefreshing={isRefreshing}
                isNewlyCreated={isNewlyCreated}
                onRefreshData={enhancedRefreshData}
                auctionProps={auctionProps}
                // Debug props
                userAddress={address}
                auction={auction}
                auctionUXAnalysis={auctionUXAnalysis}
                ownershipState={ownershipState}
            />

            <CreateAuctionModal
                open={createAuctionHook.open}
                onClose={createAuctionHook.closeModal}
                nft={contractAddress}
                tokenId={tokenId}
                isOwner={isOwner}
                onCreated={async () => {
                    showNotification('✅ Auction created! Your NFT is now safely held in escrow by the marketplace.', 'success');
                    await refreshBoth();
                }}
                onStatus={(s) => showNotification(s, 'info')}
            />

            <PlaceBidModal
                open={bidAuctionHook.open}
                onClose={bidAuctionHook.closeModal}
                nft={contractAddress}
                tokenId={tokenId}
                currentBidWei={auction?.bid}
                auctionEndTime={auction?.end ? Number(auction.end) : undefined}
                onBidded={async () => {
                    showNotification('✅ Bid placed!', 'success');
                    await refreshBoth();
                }}
                onStatus={(s) => showNotification(s, 'info')}
            />

            {/* Toasts */}
            <div aria-live="polite" aria-atomic="true">
                {toastMessage && (
                    <Toast
                        message={toastMessage.message}
                        type={toastMessage.type}
                        show={true}
                        onClose={handleCloseToast}
                    />
                )}
            </div>
        </>
    );
}
