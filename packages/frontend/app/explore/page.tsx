'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import SkeletonGrid from './components/SkeletonGrid';
import CenteredMessage from './components/CenteredMessage';
import ListingsGrid from './components/ListingGrid';
import { fetchListings, OrderBy, OrderDir } from '@/lib/services/listing';
import { useListings } from '@/hooks/useListing';

const PAGE_SIZE = 6 as const;
const DEFAULT_ORDER_BY: OrderBy = 'timestamp';
const DEFAULT_ORDER_DIR: OrderDir = 'desc';

export default function ExplorePage() {
    const [page, setPage] = useState(1);
    const queryClient = useQueryClient();

    const params = useMemo(
        () => ({
            first: PAGE_SIZE,
            skip: (page - 1) * PAGE_SIZE,
            orderBy: DEFAULT_ORDER_BY,
            orderDirection: DEFAULT_ORDER_DIR,
        }),
        [page],
    );

    const { data, isLoading, isFetching, error, refetch } = useListings(params);
    const listings = data?.listings ?? [];

    useEffect(() => {
        if (listings.length === PAGE_SIZE) {
            const nextParams = { ...params, skip: page * PAGE_SIZE };
            queryClient.prefetchQuery({
                queryKey: ['listings', nextParams],
                queryFn: ({ signal }) => fetchListings(nextParams, { signal }),
            });
        }
    }, [listings.length, page, params, queryClient]);

    useEffect(() => {
        if (!isLoading && !isFetching && page > 1 && listings.length === 0) {
            setPage((p) => Math.max(1, p - 1));
        }
    }, [isLoading, isFetching, listings.length, page]);

    if (isLoading) {
        return (
            <main className="bg-primary-light dark:bg-neutral-900 min-h-screen py-10">
                <div className="max-w-6xl mx-auto px-6 space-y-8">
                    <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
                        Explore Listings
                    </h2>
                    <SkeletonGrid />
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <CenteredMessage variant="error">
                <div className="flex flex-col items-center gap-3">
                    <p>Error loading listings: {error.message}</p>
                    <button
                        onClick={() => refetch()}
                        className="bg-accent text-white font-semibold px-4 py-2 rounded hover:bg-accent-dark transition"
                        disabled={isFetching}
                    >
                        Retry
                    </button>
                </div>
            </CenteredMessage>
        );
    }

    return (
        <main className="bg-primary-light dark:bg-neutral-900 min-h-screen py-10">
            <div className="max-w-6xl mx-auto px-6 space-y-8">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
                        Explore Listings
                    </h2>
                    <button
                        onClick={() => refetch()}
                        className="inline-flex items-center gap-2 bg-accent text-white font-medium px-4 py-2 rounded hover:bg-accent-dark transition disabled:opacity-60"
                        disabled={isFetching}
                        aria-busy={isFetching}
                    >
                        {isFetching ? (
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden>
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
                            </svg>
                        ) : (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6" />
                            </svg>
                        )}
                        Refresh
                    </button>
                </div>

                {listings.length === 0 ? (
                    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800 p-10 text-center">
                        <p className="text-neutral-700 dark:text-neutral-300 mb-2">No active listings found.</p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            New items will appear here as soon as they’re indexed.
                        </p>
                    </div>
                ) : (
                    <>
                        <ListingsGrid listings={listings} />

                        {/* Paginador simple */}
                        <nav className="mt-8 flex items-center justify-between" aria-label="Pagination">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1 || isFetching}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700
                           text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800
                           disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-neutral-700 transition"
                            >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                Previous
                            </button>

                            <span className="text-sm text-neutral-600 dark:text-neutral-400">
                                Page <strong>{page}</strong>
                                {isFetching && <span className="ml-2 animate-pulse">…loading</span>}
                            </span>

                            <button
                                onClick={() => setPage((p) => p + 1)}
                                disabled={listings.length < PAGE_SIZE || isFetching}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700
                           text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800
                           disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-neutral-700 transition"
                            >
                                Next
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </nav>
                    </>
                )}
            </div>
        </main>
    );
}
