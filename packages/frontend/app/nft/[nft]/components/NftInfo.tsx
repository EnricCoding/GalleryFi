'use client';

import { formatEther } from 'viem';
import { useState, useCallback, useMemo, memo } from 'react';
import StatusBadge from '@/components/ui/StatusBadge';
import { NftMetadata } from '@/lib/types/metadata';
import { NftActivity } from '@/lib/types/activity';

interface NftInfoProps {
    meta: NftMetadata | null;
    tokenId: string;
    contractAddress: `0x${string}`; 
    price: bigint | null;
    isOwner: boolean;
    isForSale: boolean;
    activity: NftActivity[];
    onBuyClick: () => void;
    onSellClick?: () => void;
    onShare?: () => void;
    onSaveToBookmarks?: () => void;
    isBuying: boolean;
    isSelling?: boolean;
    ownerAddress?: string;
    sellerAddress?: string;
}

const ShareIcon = memo(() => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
    </svg>
));
ShareIcon.displayName = 'ShareIcon';

const BookmarkIcon = memo(() => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
));
BookmarkIcon.displayName = 'BookmarkIcon';

const LoadingSpinner = memo(() => (
    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
));
LoadingSpinner.displayName = 'LoadingSpinner';

const ActionButton = memo(({
    onClick,
    disabled = false,
    variant = 'secondary',
    loading = false,
    children,
    ariaLabel,
    className = "",
    type = 'button',
}: {
    onClick?: () => void;
    disabled?: boolean;
    variant?: 'primary' | 'secondary' | 'success' | 'icon';
    loading?: boolean;
    children: React.ReactNode;
    ariaLabel: string;
    className?: string;
    type?: 'button' | 'submit' | 'reset';
}) => {
    const baseClasses =
        "font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50";

    const variantClasses = {
        primary: "px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white",
        secondary: "px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white",
        success: "px-8 py-4 bg-green-600 hover:bg-green-700 text-white",
        icon: "p-3 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400"
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            aria-label={ariaLabel}
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        >
            {loading && <LoadingSpinner />}
            {children}
        </button>
    );
});
ActionButton.displayName = 'ActionButton';

const DetailRow = memo(({
    label,
    value,      
    copyable = false,
    href,
    copyValue,
}: {
    label: string;
    value: string;
    copyable?: boolean;
    href?: string;
    copyValue?: string;
}) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
        if (!copyable) return;
        try {
            await navigator.clipboard.writeText(copyValue ?? value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    }, [copyable, value, copyValue]);

    const content = href ? (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
            {value}
        </a>
    ) : (
        <span className="font-mono text-sm text-gray-900 dark:text-white">{value}</span>
    );

    return (
        <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
            <span className="text-gray-600 dark:text-gray-400">{label}</span>
            <div className="flex items-center gap-2">
                {content}
                {copyable && (
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        aria-label={copied ? "Copied!" : "Copy to clipboard"}
                        title={copied ? "Copied!" : "Copy to clipboard"}
                    >
                        {copied ? (
                            <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
});
DetailRow.displayName = 'DetailRow';

const AttributeCard = memo(({ traitType, value }: { traitType: string; value: string | number }) => (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 truncate" title={traitType}>
            {traitType}
        </p>
        <p className="font-semibold text-gray-900 dark:text-white truncate" title={String(value)}>
            {value}
        </p>
    </div>
));
AttributeCard.displayName = 'AttributeCard';

const OwnerInfo = memo(({ address, isCurrentUser, label }: { address: string; isCurrentUser: boolean; label: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    }, [address]);

    const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

    return (
        <div
            className={`p-4 rounded-xl border transition-all duration-200 ${isCurrentUser
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                    : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                }`}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${isCurrentUser ? 'bg-blue-100 dark:bg-blue-800/50' : 'bg-gray-200 dark:bg-gray-600'
                            }`}
                    >
                        {isCurrentUser ? (
                            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        )}
                    </div>
                    <div>
                        <p className={`font-medium ${isCurrentUser ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-white'}`}>
                            {label} {isCurrentUser && '(You)'}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">{formatAddress(address)}</p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleCopy}
                    className="p-2 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
                    aria-label={copied ? 'Copied!' : 'Copy address'}
                    title={copied ? 'Copied!' : 'Copy address'}
                >
                    {copied ? (
                        <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    ) : (
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    )}
                </button>
            </div>
        </div>
    );
});
OwnerInfo.displayName = 'OwnerInfo';

export default function NftInfo({
    meta,
    tokenId,
    contractAddress,
    price,
    isOwner,
    isForSale,
    activity,
    onBuyClick,
    onSellClick,
    onShare,
    onSaveToBookmarks,
    isBuying,
    isSelling = false,
    ownerAddress,
    sellerAddress,
}: NftInfoProps) {
    if (process.env.NODE_ENV !== 'production') {
        console.log('NFT Info Props:', {
            meta,
            tokenId,
            contractAddress,
            price,
            isOwner,
            isForSale,
            activity,
            isBuying,
            isSelling,
            ownerAddress,
            sellerAddress,
        });
    }

    const { lastPrice, formattedPrice } = useMemo(() => {
        const lastSale = activity.find((act) => act.activityType === 'SALE');
        const lastPriceValue = lastSale ? parseFloat(formatEther(BigInt(lastSale.price || '0'))) : null;
        const currentPrice = price ? formatEther(price) : null;
        return { lastPrice: lastPriceValue, formattedPrice: currentPrice };
    }, [activity, price]);

    const statusLabel = useMemo(() => (isForSale ? 'For Sale' : isOwner ? 'Owned' : 'Not Available'), [isForSale, isOwner]);

    const explorerUrl = useMemo(() => `https://sepolia.etherscan.io/address/${contractAddress}`, [contractAddress]);

    const handleShare = useCallback(() => onShare?.(), [onShare]);
    const handleBookmark = useCallback(() => onSaveToBookmarks?.(), [onSaveToBookmarks]);
    const handleSell = useCallback(() => onSellClick?.(), [onSellClick]);

    const { showBuyButton, showListButton, showOfferDisabled } = useMemo(
        () => ({
            showBuyButton: isForSale && !isOwner && !!price,
            showListButton: isOwner,
            showOfferDisabled: !isOwner && !isForSale,
        }),
        [isForSale, isOwner, price],
    );

    const shortAddr = useCallback((addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`, []);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 p-8 transition-shadow hover:shadow-2xl">
                <div className="flex items-start justify-between mb-6">
                    <div className="flex-1 min-w-0">
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-6 truncate">{meta?.name || `Token #${tokenId}`}</h1>
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-gray-600 dark:text-gray-400">ID: {tokenId}</span>
                            <StatusBadge status={isForSale ? 'listed' : 'unlisted'} label={statusLabel} />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                        <ActionButton onClick={handleShare} variant="icon" ariaLabel="Share NFT">
                            <ShareIcon />
                        </ActionButton>
                        <ActionButton onClick={handleBookmark} variant="icon" ariaLabel="Save to bookmarks">
                            <BookmarkIcon />
                        </ActionButton>
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
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{isForSale ? 'Seller' : 'Owner'}</h3>
                        {isForSale && sellerAddress ? (
                            <OwnerInfo address={sellerAddress} isCurrentUser={isOwner} label="Listed by" />
                        ) : ownerAddress ? (
                            <OwnerInfo address={ownerAddress} isCurrentUser={isOwner} label="Owned by" />
                        ) : null}
                    </div>
                )}

                {/* Price + Actions */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Current Price</p>
                            <div className="flex items-baseline gap-2 flex-wrap">
                                <span className="text-3xl font-bold text-gray-900 dark:text-white">{formattedPrice || '---'} ETH</span>
                                {lastPrice !== null && (
                                    <span className="text-sm text-gray-500 dark:text-gray-400">Last: {lastPrice.toFixed(4)} ETH</span>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3 flex-wrap">
                            {showBuyButton && (
                                <ActionButton onClick={onBuyClick} disabled={!price} variant="primary" loading={isBuying} ariaLabel="Buy NFT now">
                                    {isBuying ? (
                                        'Buying...'
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                            </svg>
                                            Buy Now
                                        </>
                                    )}
                                </ActionButton>
                            )}

                            {showListButton && (
                                <ActionButton onClick={handleSell} variant="success" loading={isSelling} ariaLabel="List NFT for sale">
                                    {isSelling ? (
                                        'Listing...'
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                            </svg>
                                            List for Sale
                                        </>
                                    )}
                                </ActionButton>
                            )}

                            {showOfferDisabled && (
                                <ActionButton variant="secondary" disabled ariaLabel="Make offer (coming soon)">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                    </svg>
                                    Make Offer
                                </ActionButton>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 p-8 transition-shadow hover:shadow-2xl">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Details</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <DetailRow
                        label="Contract"
                        value={shortAddr(contractAddress)}
                        copyValue={contractAddress} 
                        copyable
                        href={explorerUrl}
                    />
                    <DetailRow label="Token ID" value={`#${tokenId}`} copyValue={tokenId} copyable />
                    <DetailRow label="Blockchain" value="Ethereum Sepolia" />
                    <DetailRow label="Standard" value="ERC-721" />
                </div>

                {meta?.attributes && meta.attributes.length > 0 && (
                    <div className="mt-8">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Attributes</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                            {meta.attributes
                                .filter((attr) => attr.trait_type && attr.value !== undefined)
                                .map((attr, index) => (
                                    <AttributeCard key={`${attr.trait_type}-${index}`} traitType={attr.trait_type!} value={attr.value!} />
                                ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
