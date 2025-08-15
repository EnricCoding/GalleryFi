'use client';

import { useCallback, useMemo, useState, memo } from 'react';
import { useAccount } from 'wagmi';
import { isAddressEqual } from 'viem';
import { useNftData } from '@/hooks/useNftData';
import { useBuyNft } from '@/hooks/useBuyNft';
import { NftMetadata } from '@/lib/types/metadata';
import { NftActivity } from '@/lib/types/activity';
import NftImage from './NftImage';
import NftInfo from './NftInfo';
import ActivityTabs from './ActivityTabs';
import Toast from '@/components/ui/Toast';

interface NftDetailProps {
    nft: `0x${string}`;
    tokenId: string;
}

type ToastKind = 'success' | 'error' | 'info';
interface ToastMessage {
    message: string;
    type: ToastKind;
}

/* ---------------- Loading skeleton ---------------- */
const LoadingSkeleton = memo(() => (
    <div
        className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8"
        role="status"
        aria-busy="true"
        aria-label="Loading NFT details"
    >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                <div className="xl:col-span-6">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 overflow-hidden">
                        <div className="aspect-square bg-gray-200 dark:bg-gray-700 animate-pulse" />
                    </div>
                </div>
                <div className="xl:col-span-6 space-y-8">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 p-8">
                        <div className="animate-pulse space-y-4">
                            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
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
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    NFT not found
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    The requested token does not exist or an error occurred.
                </p>
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
    isBuying
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
}) => (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* NFT Image */}
                <NftImage imgUrl={imgUrl} meta={meta} tokenId={tokenId} />

                {/* NFT Info and Actions */}
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
                    />
                </div>
            </div>

            <div className="mt-12">
                <ActivityTabs activity={activity} />
            </div>
        </div>
    </div>
));
NftDetailContent.displayName = 'NftDetailContent';

export default function NftDetail({ nft: contractAddress, tokenId }: NftDetailProps) {
    const { address } = useAccount();
    const [toastMessage, setToastMessage] = useState<ToastMessage | null>(null);

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
    } = useNftData({ nft: contractAddress, tokenId });

    // Derivados memoizados
    const { seller, price, isOwner, isForSale, tokenExists, loading } = useMemo(() => {
        const derivedSeller = onchainListing?.seller;
        const derivedPrice = onchainListing?.price;

        // ✅ fuerza booleanos
        const isSellerMatch = !!(address && derivedSeller && isAddressEqual(address, derivedSeller));
        const isHolderMatch = !!(address && onchainOwner && isAddressEqual(address, onchainOwner));
        const derivedIsOwner = isSellerMatch || isHolderMatch;

        const derivedIsForSale =
            typeof derivedPrice !== 'undefined' && derivedPrice !== null && derivedPrice > BigInt(0);

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
    }, [onchainListing, onchainOwner, address, validInputs, tokenIdBig, subgraphLoading, meta]);

    // Callbacks
    const showNotification = useCallback((message: string, type: ToastKind) => {
        setToastMessage({ message, type });
    }, []);

    const handleGoBack = useCallback(() => {
        window.history.back();
    }, []);

    const handleCloseToast = useCallback(() => {
        setToastMessage(null);
    }, []);

    const { busy, handleBuyNow } = useBuyNft({
        nft: contractAddress,
        tokenIdBig,
        validInputs,
        listedNow,
        onchainListing,
        expectedChainId,
        MARKET,
        showNotification,
    });

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
                activity={activity}
                seller={seller}
                ownerAddress={onchainOwner}
                onBuyClick={handleBuyNow}
                isBuying={busy}
            />

            {/* Toast notifications */}
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
