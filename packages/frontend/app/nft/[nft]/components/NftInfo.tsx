'use client';

import { formatEther } from 'viem';
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StatusBadge from '@/components/ui/StatusBadge';
import { NftMetadata } from '@/lib/types/metadata';
import { NftActivity } from '@/lib/types/activity';
import { useListForSale } from '@/hooks/useListForSale';
import { useCancelListing } from '@/hooks/useCancelListing';
import NftInfoActionBar from './NftInfoActionBar';
import ListForSaleModal from './ListForSaleModal';
import OwnerInfo from './OwnerInfo';

interface NftInfoProps {
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
}

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
    } = props;

    const router = useRouter();
    const [banner, setBanner] = useState<{ kind: 'info' | 'success' | 'error'; text: string } | null>(null);

    // --- NUEVO: temporizador para auto-cierre del banner ---
    const bannerTimerRef = useRef<number | null>(null);

    const showBanner = useCallback(
        (kind: 'info' | 'success' | 'error', text: string, durationMs = 3000) => {
            setBanner({ kind, text });

            // limpia temporizador anterior
            if (bannerTimerRef.current) {
                clearTimeout(bannerTimerRef.current);
                bannerTimerRef.current = null;
            }

            // solo auto-cierra para info/success; deja errores pegados si durationMs = 0
            if ((kind === 'info' || kind === 'success') && durationMs > 0) {
                bannerTimerRef.current = window.setTimeout(() => {
                    setBanner(null);
                    bannerTimerRef.current = null;
                }, durationMs) as unknown as number;
            }
        },
        [],
    );

    useEffect(() => {
        return () => {
            if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
        };
    }, []);
    // --- FIN NUEVO ---

    // Precios
    const { lastPrice, formattedPrice } = useMemo(() => {
        const lastSale = activity.find((a) => a.activityType === 'SALE');
        const lastPriceValue = lastSale ? Number(formatEther(BigInt(lastSale.price || '0'))) : null;
        let currentPrice: string | null = null;
        try { currentPrice = price ? formatEther(price) : null; } catch { currentPrice = null; }
        return { lastPrice: lastPriceValue, formattedPrice: currentPrice };
    }, [activity, price]);

    const statusLabel = useMemo(
        () => (isForSale ? 'For Sale' : isOwner ? 'Owned' : 'Not Available'),
        [isForSale, isOwner],
    );
    const explorerUrl = useMemo(() => `https://sepolia.etherscan.io/address/${contractAddress}`, [contractAddress]);
    const shortAddr = useCallback((addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`, []);

    // LISTAR
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
            showBanner('success', 'Listed successfully!');     // ← auto-cierra en 3s
            await onRefreshData?.();
            router.refresh();
        },
        onStatus: (text) => showBanner('info', text, 2500),  // ← info 2.5s
    });

    // CANCELAR
    const { busyCancel, canCancel, cancel } = useCancelListing({
        nft: contractAddress,
        tokenId,
        isForSale,
        isOwner,
        onCanceled: async () => {
            showBanner('success', 'Listing cancelled');        // ← auto-cierra en 3s
            await onRefreshData?.();
            router.refresh();
        },
        onStatus: (s) => showBanner('info', s, 2500),
    });

    // Visibilidad de botones
    const showBuyButton = isForSale && !isOwner && !!price && (price ?? BigInt(0)) > BigInt(0);
    const showListButton = isOwner && !isForSale && canList;
    const showCancelButton = isOwner && isForSale && canCancel;
    const showOfferDisabled = !isOwner && !isForSale;

    return (
        <div className="space-y-8">
            {/* banner */}
            {banner && (
                <div
                    className={`rounded-xl px-4 py-3 ${banner.kind === 'success'
                            ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                            : banner.kind === 'error'
                                ? 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                                : 'bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
                        }`}
                >
                    {banner.text}
                </div>
            )}

            {/* panel principal */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 p-8 transition-shadow hover:shadow-2xl">
                <div className="flex items-start justify-between mb-6">
                    <div className="flex-1 min-w-0">
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-6 truncate">
                            {meta?.name || `Token #${tokenId}`}
                        </h1>
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-gray-600 dark:text-gray-400">ID: {tokenId}</span>
                            <StatusBadge status={isForSale ? 'listed' : 'unlisted'} label={statusLabel} />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                        <button
                            type="button"
                            onClick={() => onShare?.()}
                            className="p-3 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400"
                            aria-label="Share"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                            </svg>
                        </button>
                        <button
                            type="button"
                            onClick={() => onSaveToBookmarks?.()}
                            className="p-3 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400"
                            aria-label="Bookmark"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                        </button>
                    </div>
                </div>

                {meta?.description && (
                    <div className="mb-8">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Description</h3>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{meta.description}</p>
                    </div>
                )}

                {(ownerAddress || sellerAddress) && (
                    <div className="mb-8">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            {isForSale ? 'Seller' : 'Owner'}
                        </h3>
                        {isForSale && sellerAddress ? (
                            <OwnerInfo address={sellerAddress} isCurrentUser={isOwner} label="Listed by" />
                        ) : ownerAddress ? (
                            <OwnerInfo address={ownerAddress} isCurrentUser={isOwner} label="Owned by" />
                        ) : null}
                    </div>
                )}

                {/* Price + Acciones */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <NftInfoActionBar
                        isForSale={isForSale}
                        formattedPrice={formattedPrice}
                        lastPrice={lastPrice}
                        showBuyButton={showBuyButton}
                        showListButton={showListButton}
                        showOfferDisabled={showOfferDisabled}
                        showCancelButton={showCancelButton}
                        onCancelClick={cancel}
                        isCancelBusy={busyCancel}
                        onBuyClick={onBuyClick}
                        onListClick={() => {
                            showBanner('info', 'Preparing listing…', 1500);
                            openModal();
                        }}
                        isBuying={isBuying}
                        isListingBusy={isSelling || busyApprove || busyList}
                    />
                </div>
            </div>

            {/* Details */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 p-8 transition-shadow hover:shadow-2xl">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Details</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-gray-600 dark:text-gray-400">Contract</span>
                        <div className="flex items-center gap-2">
                            <a
                                href={explorerUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-sm text-blue-600 dark:text-blue-400 hover:underline"
                            >
                                {shortAddr(contractAddress)}
                            </a>
                        </div>
                    </div>

                    <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-gray-600 dark:text-gray-400">Token ID</span>
                        <span className="font-mono text-sm text-gray-900 dark:text-white">#{tokenId}</span>
                    </div>

                    <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-gray-600 dark:text-gray-400">Blockchain</span>
                        <span className="font-mono text-sm text-gray-900 dark:text-white">Ethereum Sepolia</span>
                    </div>

                    <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-gray-600 dark:text-gray-400">Standard</span>
                        <span className="font-mono text-sm text-gray-900 dark:text-white">ERC-721</span>
                    </div>
                </div>

                {meta?.attributes && meta.attributes.length > 0 && (
                    <div className="mt-8">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Attributes</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                            {meta.attributes
                                .filter((attr) => attr.trait_type && attr.value !== undefined)
                                .map((attr, index) => (
                                    <div
                                        key={`${attr.trait_type}-${index}`}
                                        className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 truncate" title={attr.trait_type!}>
                                            {attr.trait_type}
                                        </p>
                                        <p className="font-semibold text-gray-900 dark:text-white truncate" title={String(attr.value!)}>
                                            {String(attr.value!)}
                                        </p>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal listar */}
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
        </div>
    );
}
