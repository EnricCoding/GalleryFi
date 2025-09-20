'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useReadContract } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { isAddressEqual } from 'viem';
import { formatEth, shortAddr, timeAgo } from '@/lib/ui/format';
import { ipfsToHttp } from '@/lib/ipfs';
import { getEthToUsdPrice, formatUsdPrice } from '@/lib/price';
import type { Listing } from '@/lib/types/listing';
import NftJson from '@/utils/abi/MyNFT.json';
import MarketJson from '@/utils/abi/NftMarketplace.json';

const NftAbi = NftJson.abi;
const MarketAbi = MarketJson.abi;
const ZERO = '0x0000000000000000000000000000000000000000' as const;

type NftMetadata = {
    name?: string;
    description?: string;
    image?: string;
};

async function fetchIpfsJson<T>(uri: string): Promise<T | null> {
    try {
        const url = ipfsToHttp(uri);
        if (!url) return null;
        const res = await fetch(url, { cache: 'force-cache' });
        if (!res.ok) throw new Error(`IPFS fetch failed: ${res.status}`);
        return (await res.json()) as T;
    } catch {
        return null;
    }
}

export default function ListingCard({ listing }: { listing: Listing }) {
    const router = useRouter();
    const { address, isConnected } = useAccount();
    const { openConnectModal } = useConnectModal();

    const { nft, tokenId, price, seller, timestamp, tokenURI } = listing;

    const [meta, setMeta] = useState<NftMetadata | null>(null);
    const [imgUrl, setImgUrl] = useState<string | null>(null);
    const [loadingMeta, setLoadingMeta] = useState<boolean>(!!tokenURI);
    const [ethPriceUsd, setEthPriceUsd] = useState<number | null>(null);
    const [loadingPrice, setLoadingPrice] = useState<boolean>(true);

    const MARKET_ADDRESS = process.env.NEXT_PUBLIC_MARKET_ADDRESS as `0x${string}`;

    const { data: actualOwner } = useReadContract({
        address: nft,
        abi: NftAbi,
        functionName: 'ownerOf',
        args: [BigInt(tokenId)],
        query: { enabled: !!nft && !!tokenId, refetchInterval: 30_000 },
    }) as { data: `0x${string}` | undefined };

    const { data: rawListing } = useReadContract({
        address: MARKET_ADDRESS,
        abi: MarketAbi,
        functionName: 'listings',
        args: [nft, BigInt(tokenId)],
        query: { enabled: !!MARKET_ADDRESS && !!nft && !!tokenId, refetchInterval: 30_000 },
    }) as { data: readonly [`0x${string}`, bigint] | undefined };

    // Normaliza el listing on-chain
    const onchainListing = useMemo(
        () =>
            rawListing
                ? ({ seller: rawListing[0], price: rawListing[1] } as {
                    seller: `0x${string}`;
                    price: bigint;
                })
                : undefined,
        [rawListing],
    );

    // Eres owner on-chain (si hay escrow no lo serás)
    const isOwner =
        !!address && !!actualOwner && isAddressEqual(address as `0x${string}`, actualOwner);

    // ✅ Eres el seller del listing (aunque no seas owner por escrow)
    const isSeller =
        !!address &&
        ((onchainListing?.seller &&
            isAddressEqual(address as `0x${string}`, onchainListing.seller)) ||
            isAddressEqual(address as `0x${string}`, seller as `0x${string}`));

    // Disponible si hay listing válido con price>0
    const isAvailable =
        !!onchainListing && onchainListing.price > BigInt(0) && onchainListing.seller !== ZERO;

    // Vendido si no está disponible y el owner ya no es el MARKET (ni el seller del listing)
    const wasSold =
        !isAvailable &&
        !!actualOwner &&
        !isAddressEqual(actualOwner, MARKET_ADDRESS as `0x${string}`) &&
        (!onchainListing || !isAddressEqual(actualOwner, onchainListing.seller));

    useEffect(() => {
        let cancelled = false;

        (async () => {
            if (!tokenURI) {
                setLoadingMeta(false);
                return;
            }
            setLoadingMeta(true);

            const json = await fetchIpfsJson<NftMetadata>(tokenURI);
            if (cancelled) return;

            setMeta(json);

            const rawImage = json?.image;
            const resolved = rawImage
                ? rawImage.startsWith('ipfs://')
                    ? ipfsToHttp(rawImage)
                    : rawImage
                : null;

            

            setImgUrl(resolved || null);
            setLoadingMeta(false);
        })();

        (async () => {
            try {
                setLoadingPrice(true);
                const priceUsd = await getEthToUsdPrice();
                if (!cancelled) setEthPriceUsd(priceUsd);
            } catch {
                if (!cancelled) setEthPriceUsd(2450);
            } finally {
                if (!cancelled) setLoadingPrice(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [tokenURI]);


    return (
        <Link
            href={`/nft/${nft}/${tokenId}`}
            className="group block rounded-xl overflow-hidden bg-white dark:bg-neutral-800 
                 border border-neutral-200 dark:border-neutral-700 
                 hover:shadow-2xl hover:shadow-neutral-500/10 dark:hover:shadow-neutral-900/20
                 hover:border-accent/30 dark:hover:border-accent/40
                 transition-all duration-300 ease-out hover:scale-[1.02]
                 backdrop-blur-sm"
            prefetch={false}
            aria-label={`Open NFT ${tokenId}`}
        >
            {/* Imagen / skeleton / placeholder */}
            <div className="relative aspect-[4/3] overflow-hidden">
                {imgUrl ? (
                    <Image
                        src={imgUrl}
                        alt={meta?.name || `NFT ${tokenId}`}
                        width={400}
                        height={300}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        unoptimized
                    />
                ) : loadingMeta ? (
                    <div className="h-full w-full animate-pulse bg-neutral-200 dark:bg-neutral-700 relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent 
                            -skew-x-12 animate-shimmer" />
                    </div>
                ) : (
                    <div className="h-full bg-gradient-to-br from-neutral-100 to-neutral-200 
                          dark:from-neutral-700 dark:to-neutral-800 
                          flex items-center justify-center text-neutral-600 dark:text-neutral-300">
                        <div className="text-center">
                            <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm font-medium">Token #{tokenId}</span>
                        </div>
                    </div>
                )}

                <div className="absolute top-3 left-3 flex flex-col gap-2">
                    {/* ✅ NEW: Auction indicator - highest priority */}
                    {listing.auction?.isActive && (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold 
                             backdrop-blur-sm border bg-gradient-to-r from-purple-600/95 to-blue-600/95 
                             text-white border-purple-400/30 shadow-lg shadow-purple-500/40">
                            <span className="w-1.5 h-1.5 bg-white rounded-full mr-2 animate-pulse" />
                            🔥 Live Auction
                        </span>
                    )}

                    {/* Status badge - only show if not in auction */}
                    {!listing.auction?.isActive && (
                        <span
                            className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold 
                            backdrop-blur-sm border ${isAvailable
                                    ? 'bg-green-500/90 text-white border-green-400/20 shadow-lg shadow-green-500/25'
                                    : wasSold
                                        ? 'bg-blue-500/90 text-white border-blue-400/20 shadow-lg shadow-blue-500/25'
                                        : 'bg-neutral-500/90 text-white border-neutral-400/20 shadow-lg shadow-neutral-500/25'
                                }`}
                        >
                            <span className="w-1.5 h-1.5 bg-white rounded-full mr-2 animate-pulse" />
                            {isAvailable ? 'Available' : wasSold ? 'Sold' : 'Unavailable'}
                        </span>
                    )}

                    {/* Badge para vendedor cuando no es owner por escrow */}
                    {isSeller && !isOwner && isAvailable && (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold 
                             bg-amber-500/90 text-white border border-amber-400/30 shadow-lg shadow-amber-500/25">
                            ✨ Your listing
                        </span>
                    )}

                    {/* Owner badge: solo si eres owner on-chain */}
                    {isOwner && (
                        <span
                            className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold 
                         bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600
                         text-white backdrop-blur-sm border border-amber-400/30
                         shadow-lg shadow-amber-500/30 animate-pulse"
                        >
                            <svg className="w-3 h-3 mr-1.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                            Owner
                        </span>
                    )}
                </div>

                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
            </div>

            <div className="p-5 space-y-4">
                {/* Title */}
                <div className="space-y-1">
                    <h3
                        className="text-lg font-bold text-neutral-900 dark:text-neutral-50 
                       group-hover:text-accent dark:group-hover:text-accent-light 
                       transition-colors duration-200 line-clamp-1"
                    >
                        {meta?.name || `Token #${tokenId}`}
                    </h3>
                    {meta?.description && (
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2 leading-relaxed">
                            {meta.description}
                        </p>
                    )}
                </div>

                {/* Price / Auction Info */}
                <div className="flex items-end justify-between">
                    {listing.auction?.isActive ? (
                        // ✅ NEW: Show auction info when in auction
                        <div className="space-y-1">
                            <p className="text-sm text-purple-600 dark:text-purple-400 font-medium flex items-center gap-1">
                                <span className="text-base">🔥</span>
                                Live Auction
                            </p>
                            <div className="space-y-0.5">
                                <p className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
                                    {listing.auction.currentBid && BigInt(listing.auction.currentBid) > BigInt(0)
                                        ? `${formatEth(listing.auction.currentBid)} ETH`
                                        : 'No bids yet'
                                    }
                                </p>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                    {listing.auction.currentBid && BigInt(listing.auction.currentBid) > BigInt(0) ? (
                                        loadingPrice ? (
                                            <span className="inline-block w-16 h-4 bg-neutral-200 dark:bg-neutral-600 rounded animate-pulse" />
                                        ) : ethPriceUsd ? (
                                            formatUsdPrice(formatEth(listing.auction.currentBid), ethPriceUsd)
                                        ) : (
                                            '~$-- USD'
                                        )
                                    ) : (
                                        'Place the first bid!'
                                    )}
                                </p>
                            </div>
                        </div>
                    ) : (
                        // ✅ EXISTING: Show regular marketplace price
                        <div className="space-y-1">
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">Current Price</p>
                            <div className="space-y-0.5">
                                <p className="text-xl font-bold text-neutral-900 dark:text-neutral-50">{formatEth(price)} ETH</p>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                    {loadingPrice ? (
                                        <span className="inline-block w-16 h-4 bg-neutral-200 dark:bg-neutral-600 rounded animate-pulse" />
                                    ) : ethPriceUsd ? (
                                        formatUsdPrice(formatEth(price), ethPriceUsd)
                                    ) : (
                                        '~$-- USD'
                                    )}
                                </p>
                            </div>
                        </div>
                    )}
                    
                    <div className="text-right">
                        {listing.auction?.isActive ? (
                            // ✅ NEW: Show time left for auction
                            <>
                                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1">Ends in</p>
                                <span className="text-xs text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded-md font-medium">
                                    {(() => {
                                        if (!listing.auction.timeLeft || listing.auction.timeLeft <= 0) {
                                            return 'Ended';
                                        }
                                        const hours = Math.floor(listing.auction.timeLeft / (1000 * 60 * 60));
                                        const minutes = Math.floor((listing.auction.timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                                        
                                        if (hours > 24) {
                                            const days = Math.floor(hours / 24);
                                            return `${days}d ${hours % 24}h`;
                                        } else if (hours > 0) {
                                            return `${hours}h ${minutes}m`;
                                        } else {
                                            return `${minutes}m`;
                                        }
                                    })()}
                                </span>
                            </>
                        ) : (
                            // ✅ EXISTING: Show listing time
                            <>
                                <p className="text-xs text-neutral-400 dark:text-neutral-500 font-medium mb-1">Listed</p>
                                <span className="text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-700 px-2 py-1 rounded-md">
                                    {timeAgo(timestamp)}
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Owner/Seller */}
                <div className="flex items-center space-x-3 pt-2 border-t border-neutral-100 dark:border-neutral-700">
                    <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${isOwner
                                ? 'bg-gradient-to-br from-amber-400/30 to-yellow-500/30 ring-2 ring-amber-400/40'
                                : 'bg-gradient-to-br from-accent/20 to-accent-dark/20'
                            }`}
                    >
                        {isOwner ? (
                            <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        )}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                                {wasSold ? 'Current Owner' : isOwner ? 'Owner' : 'Seller'}
                            </p>
                            {(isOwner || isSeller) && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50">
                                    ✨ You
                                </span>
                            )}
                        </div>
                        <p
                            className={`text-sm font-mono ${isOwner ? 'text-amber-700 dark:text-amber-300 font-semibold' : 'text-neutral-700 dark:text-neutral-300'
                                }`}
                        >
                            {wasSold && actualOwner ? shortAddr(actualOwner) : shortAddr(seller)}
                        </p>
                    </div>
                </div>

                {/* Action Button */}
                {!isOwner && !isSeller && (listing.auction?.isActive || isAvailable) && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!isConnected) {
                                if (openConnectModal) openConnectModal();
                                else alert('Please connect your wallet to continue.');
                                return;
                            }
                            router.push(`/nft/${nft}/${tokenId}`);
                        }}
                        className={`w-full mt-4 group/btn relative overflow-hidden
                       ${listing.auction?.isActive
                                ? 'bg-gradient-to-r from-purple-600 via-purple-600 to-blue-600 hover:from-purple-700 hover:via-purple-700 hover:to-blue-700 border-purple-500/30 hover:border-purple-500/50 hover:shadow-purple-500/40'
                                : 'bg-gradient-to-r from-accent via-accent to-accent-dark hover:from-accent-dark hover:via-accent hover:to-accent-light border-accent/30 hover:border-accent/50 hover:shadow-accent/40'
                            }
                       text-white font-bold py-3.5 px-6 rounded-xl 
                       transition-all duration-300 ease-out
                       hover:shadow-xl
                       hover:scale-[1.02] active:scale-[0.98]
                       border
                       focus:outline-none focus:ring-4 ${listing.auction?.isActive ? 'focus:ring-purple-500/20' : 'focus:ring-accent/20'}`}
                        aria-label={isConnected 
                            ? (listing.auction?.isActive ? 'Place bid' : 'Buy now')
                            : 'Connect wallet'
                        }
                    >
                        <span className="relative z-10 flex items-center justify-center gap-2.5">
                            {listing.auction?.isActive ? (
                                <>
                                    <svg className="w-4 h-4 transition-all duration-300 group-hover/btn:scale-110" 
                                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                                            d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3" />
                                    </svg>
                                    <span className="font-semibold tracking-wide">
                                        {isConnected ? 'Place Bid' : 'Connect Wallet'}
                                    </span>
                                    <span className="text-lg">🔥</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4 transition-all duration-300 group-hover/btn:scale-110 group-hover/btn:rotate-12"
                                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                                            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                    </svg>
                                    <span className="font-semibold tracking-wide">
                                        {isConnected ? 'Buy Now' : 'Connect Wallet'}
                                    </span>
                                    <svg className="w-4 h-4 transition-all duration-300 group-hover/btn:translate-x-1"
                                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </>
                            )}
                        </span>

                        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover/btn:translate-y-0 
                            transition-transform duration-300 ease-out" />
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 
                            -translate-x-full group-hover/btn:translate-x-full 
                            transition-transform duration-700 ease-out" />
                        <div className={`absolute inset-0 rounded-xl scale-0 group-hover/btn:scale-100 
                            transition-transform duration-300 ease-out animate-pulse
                            ${listing.auction?.isActive ? 'bg-purple-500/20' : 'bg-accent/20'}`} />
                    </button>
                )}

                {!isConnected && !isOwner && !isSeller && (listing.auction?.isActive || isAvailable) && (
                    <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                        {listing.auction?.isActive 
                            ? 'Connect your wallet to place a bid on this auction.'
                            : 'Connect your wallet to purchase this item.'
                        }
                    </p>
                )}

                {!isAvailable && !listing.auction?.isActive && wasSold && !isOwner && !isSeller && (
                    <p className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-medium text-center">
                        This NFT has been sold and is no longer available.
                    </p>
                )}

                {/* ✅ NEW: Special message for ended auctions */}
                {listing.auction && !listing.auction.isActive && !wasSold && (
                    <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 font-medium text-center">
                        🔥 Auction has ended. Check details to see the outcome.
                    </p>
                )}
            </div>
        </Link>
    );
}
