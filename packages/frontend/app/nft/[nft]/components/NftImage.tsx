'use client';

import { NftMetadata } from '@/lib/types/metadata';
import Image from 'next/image';
import { useState, useCallback, memo } from 'react';

interface NftImageProps {
    imgUrl: string | null;
    meta: NftMetadata | null;
    tokenId: string;
    onLike?: () => void;
    onShare?: () => void;
    isLiked?: boolean;
}

const HeartIcon = memo(({ filled = false }: { filled?: boolean }) => (
    <svg className="w-5 h-5" fill={filled ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
));
HeartIcon.displayName = 'HeartIcon';

const ShareIcon = memo(() => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
    </svg>
));
ShareIcon.displayName = 'ShareIcon';

const ImageIcon = memo(() => (
    <svg className="w-8 h-8 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
));
ImageIcon.displayName = 'ImageIcon';

// Action button component
const ActionButton = memo(({
    onClick,
    ariaLabel,
    children,
    className = ""
}: {
    onClick?: () => void;
    ariaLabel: string;
    children: React.ReactNode;
    className?: string;
}) => (
    <button
        onClick={onClick}
        aria-label={ariaLabel}
        className={`p-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-lg hover:scale-110 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${className}`}
    >
        {children}
    </button>
));
ActionButton.displayName = 'ActionButton';

// Loading skeleton component
const ImageSkeleton = memo(() => (
    <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center animate-pulse">
        <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-300 dark:bg-gray-600 rounded-2xl flex items-center justify-center">
                <ImageIcon />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">Loading image...</p>
        </div>
    </div>
));
ImageSkeleton.displayName = 'ImageSkeleton';

// Error state component
const ImageError = memo(({ onRetry }: { onRetry?: () => void }) => (
    <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 flex items-center justify-center">
        <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
            </div>
            <p className="text-red-600 dark:text-red-400 font-medium mb-2">Failed to load image</p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500/50 rounded"
                >
                    Try again
                </button>
            )}
        </div>
    </div>
));
ImageError.displayName = 'ImageError';

export default function NftImage({
    imgUrl,
    meta,
    tokenId,
    onLike,
    onShare,
    isLiked = false
}: NftImageProps) {
    const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading');
    const [showActions, setShowActions] = useState(false);

    const handleImageLoad = useCallback(() => {
        setImageState('loaded');
    }, []);

    const handleImageError = useCallback(() => {
        setImageState('error');
    }, []);

    const handleRetry = useCallback(() => {
        setImageState('loading');
    }, []);

    return (
        <div className="xl:col-span-6 lg:col-span-5 md:col-span-6">
            <div className="sticky top-8">
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 overflow-hidden transition-shadow duration-300 hover:shadow-2xl">
                    <div
                        className="relative aspect-square group cursor-pointer"
                        onMouseEnter={() => setShowActions(true)}
                        onMouseLeave={() => setShowActions(false)}
                    >
                        {/* Main Image */}
                        {imgUrl ? (
                            <Image
                                src={imgUrl}
                                alt={meta?.name || `NFT Token #${tokenId}`}
                                fill
                                className={`object-cover transition-all duration-700 ${imageState === 'loaded'
                                        ? 'group-hover:scale-105 opacity-100'
                                        : 'opacity-0'
                                    }`}
                                priority
                                onLoad={handleImageLoad}
                                onError={handleImageError}
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 40vw"
                            />
                        ) : null}

                        {/* Loading State */}
                        {(!imgUrl || imageState === 'loading') && <ImageSkeleton />}

                        {/* Error State */}
                        {imageState === 'error' && <ImageError onRetry={handleRetry} />}

                        {/* Overlay with Quick Actions */}
                        <div
                            className={`absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent transition-all duration-300 ${showActions && imageState === 'loaded' ? 'opacity-100' : 'opacity-0'
                                }`}
                        >
                            {/* Image Info Overlay */}
                            {meta?.name && (
                                <div className="absolute bottom-4 left-4 right-4">
                                    <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl p-4">
                                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                            {meta.name}
                                        </h3>
                                        {meta.description && (
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                                {meta.description}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
