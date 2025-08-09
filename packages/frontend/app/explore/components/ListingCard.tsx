// app/explore/components/ListingCard.tsx
'use client';

import Link from 'next/link';
import { formatEth, shortAddr, timeAgo } from '@/lib/ui/format';
import { Listing } from '@/lib/types/listing';

export default function ListingCard({ listing }: { listing: Listing }) {
    const { nft, tokenId, price, seller, timestamp } = listing;

    return (
        <Link
            href={`/nft/${nft}/${tokenId}`}
            className="block rounded-lg overflow-hidden bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:shadow-lg transition"
            prefetch={false}
            aria-label={`Open NFT ${tokenId}`}
        >
            {/* Placeholder visual hasta tener imagen/tokenURI en el subgraph */}
            <div className="h-48 bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-neutral-600 dark:text-neutral-300 text-sm">
                #{tokenId}
            </div>

            <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                    <p className="text-lg font-medium text-neutral-900 dark:text-neutral-50">
                        {formatEth(price)} ETH
                    </p>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        {timeAgo(timestamp)}
                    </span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate">
                    Seller {shortAddr(seller)}
                </p>
            </div>
        </Link>
    );
}
