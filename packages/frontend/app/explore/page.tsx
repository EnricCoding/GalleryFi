'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import SkeletonGrid from './components/SkeletonGrid';
import CenteredMessage from './components/CenteredMessage';
import ListingsGrid from './components/ListingGrid';
import { fetchListings, OrderBy, OrderDir } from '@/lib/services/listing';
import { useListings } from '@/hooks/useListing';
import SortSelect, { SortValue } from './components/SortSelect';

const PAGE_SIZE = 6 as const;
const DEFAULT_ORDER_BY: OrderBy = 'timestamp';
const DEFAULT_ORDER_DIR: OrderDir = 'desc';

export default function ExplorePage() {
    const [page, setPage] = useState(1);
    const [onlyListed, setOnlyListed] = useState<boolean>(false);
    const [sort, setSort] = useState<SortValue>('newest');
    const queryClient = useQueryClient();

    const { orderBy, orderDirection } = useMemo(() => {
        if (sort === 'price_asc') return { orderBy: 'price' as OrderBy, orderDirection: 'asc' as OrderDir };
        if (sort === 'price_desc') return { orderBy: 'price' as OrderBy, orderDirection: 'desc' as OrderDir };
        return { orderBy: DEFAULT_ORDER_BY, orderDirection: DEFAULT_ORDER_DIR };
    }, [sort]);

    const params = useMemo(
        () => ({
            first: PAGE_SIZE,
            skip: (page - 1) * PAGE_SIZE,
            orderBy,
            orderDirection,
        }),
        [page, orderBy, orderDirection],
    );

    // Hook: pasamos el flag onlyListed en opts
    const { data, isLoading, isFetching, error, refetch } = useListings(params, { onlyListed });
    const listings = data?.listings ?? [];
    const totalCount = data?.totalCount ?? 0;
    
    // Calcular total de páginas
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    const hasNextPage = page < totalPages;

    // Si cambian los filtros (onlyListed o sort), vuelve a página 1
    useEffect(() => {
        setPage(1);
    }, [onlyListed, sort]);

    // Prefetch de la siguiente página con los mismos filtros y orden
    useEffect(() => {
        if (page < totalPages) {
            const nextParams = { ...params, skip: page * PAGE_SIZE };
            queryClient.prefetchQuery({
                queryKey: ['listings', { params: nextParams, onlyListed }],
                queryFn: ({ signal }) => fetchListings(nextParams, { signal, onlyListed }),
            });
        }
    }, [page, totalPages, params, onlyListed, queryClient]);

    // Si la página actual queda vacía, retrocede
    useEffect(() => {
        if (!isLoading && !isFetching && page > 1 && listings.length === 0) {
            setPage((p) => Math.max(1, p - 1));
        }
    }, [isLoading, isFetching, listings.length, page]);

    if (isLoading) {
        return (
            <main className="bg-primary-light dark:bg-neutral-900 min-h-screen py-10">
                <div className="max-w-6xl mx-auto px-6 space-y-8">
                    <Header
                        onlyListed={onlyListed}
                        setOnlyListed={setOnlyListed}
                        sort={sort}
                        setSort={setSort}
                        onRefresh={() => refetch()}
                        refreshing={isFetching}
                    />
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
                <Header
                    onlyListed={onlyListed}
                    setOnlyListed={setOnlyListed}
                    sort={sort}
                    setSort={setSort}
                    onRefresh={() => refetch()}
                    refreshing={isFetching}
                />

                {listings.length === 0 ? (
                    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800 p-10 text-center">
                        <p className="text-neutral-700 dark:text-neutral-300 mb-2">
                            {onlyListed ? 'No listed items found.' : 'No active listings found.'}
                        </p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            New items will appear here as soon as they’re indexed.
                        </p>
                    </div>
                ) : (
                    <>
                        <ListingsGrid listings={listings} />

                        {/* Paginación */}
                        <nav className="mt-8" aria-label="Pagination">
                            <div className="flex items-center justify-between gap-4">
                                {/* Botón Previous */}
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

                                {/* Info central + navegación rápida */}
                                <div className="flex flex-col items-center gap-2">
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="text-sm text-neutral-600 dark:text-neutral-400">
                                            Page <strong>{page}</strong> of <strong>{totalPages}</strong>
                                        </span>
                                        <span className="text-xs text-neutral-500 dark:text-neutral-500">
                                            {totalCount} total item{totalCount !== 1 ? 's' : ''}
                                            {isFetching && <span className="ml-2 animate-pulse">…loading</span>}
                                        </span>
                                    </div>
                                    
                                    {/* Navegación rápida de páginas (solo si hay más de 3 páginas) */}
                                    {totalPages > 3 && (
                                        <div className="flex items-center gap-1">
                                            {/* Primera página */}
                                            {page > 2 && (
                                                <>
                                                    <button
                                                        onClick={() => setPage(1)}
                                                        className="w-8 h-8 text-sm rounded border border-neutral-300 dark:border-neutral-700
                                                                 text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800
                                                                 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition"
                                                    >
                                                        1
                                                    </button>
                                                    {page > 3 && <span className="text-neutral-400">…</span>}
                                                </>
                                            )}
                                            
                                            {/* Página anterior */}
                                            {page > 1 && (
                                                <button
                                                    onClick={() => setPage(page - 1)}
                                                    className="w-8 h-8 text-sm rounded border border-neutral-300 dark:border-neutral-700
                                                             text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800
                                                             hover:bg-neutral-50 dark:hover:bg-neutral-700 transition"
                                                >
                                                    {page - 1}
                                                </button>
                                            )}
                                            
                                            {/* Página actual */}
                                            <span className="w-8 h-8 text-sm rounded border-2 border-accent bg-accent text-white
                                                           flex items-center justify-center font-semibold">
                                                {page}
                                            </span>
                                            
                                            {/* Página siguiente */}
                                            {page < totalPages && (
                                                <button
                                                    onClick={() => setPage(page + 1)}
                                                    className="w-8 h-8 text-sm rounded border border-neutral-300 dark:border-neutral-700
                                                             text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800
                                                             hover:bg-neutral-50 dark:hover:bg-neutral-700 transition"
                                                >
                                                    {page + 1}
                                                </button>
                                            )}
                                            
                                            {/* Última página */}
                                            {page < totalPages - 1 && (
                                                <>
                                                    {page < totalPages - 2 && <span className="text-neutral-400">…</span>}
                                                    <button
                                                        onClick={() => setPage(totalPages)}
                                                        className="w-8 h-8 text-sm rounded border border-neutral-300 dark:border-neutral-700
                                                                 text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800
                                                                 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition"
                                                    >
                                                        {totalPages}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Botón Next */}
                                <button
                                    onClick={() => setPage((p) => p + 1)}
                                    disabled={page >= totalPages || isFetching}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700
                               text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800
                               disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-neutral-700 transition"
                                >
                                    Next
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        </nav>
                    </>
                )}
            </div>
        </main>
    );
}

/** Encabezado con toggle “Only listed”, selector de orden y botón Refresh */
function Header({
    onlyListed,
    setOnlyListed,
    sort,
    setSort,
    onRefresh,
    refreshing,
}: {
    onlyListed: boolean;
    setOnlyListed: (v: boolean) => void;
    sort: SortValue;
    setSort: (v: SortValue) => void;
    onRefresh: () => void;
    refreshing: boolean;
}) {
    return (
        <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
                Explore Listings
            </h2>

            <div className="flex items-center gap-3">
                {/* Toggle Only listed */}
                <label className="flex items-center gap-2 select-none cursor-pointer">
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">Only listed</span>
                    <span
                        className={[
                            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                            onlyListed
                                ? 'bg-[--accent-dark] dark:bg-[--accent] ring-2 ring-[--accent] shadow-sm shadow-[--accent]/40'
                                : 'bg-neutral-300 dark:bg-neutral-600',
                        ].join(' ')}
                        role="switch"
                        aria-checked={onlyListed}
                        tabIndex={0}
                        onClick={() => setOnlyListed(!onlyListed)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setOnlyListed(!onlyListed);
                            }
                        }}
                    >
                        <span
                            className={[
                                'inline-block h-5 w-5 transform rounded-full bg-white transition-transform',
                                onlyListed ? 'translate-x-5' : 'translate-x-1',
                            ].join(' ')}
                        />
                    </span>
                </label>

                {/* Selector de orden */}
                <SortSelect value={sort} onChange={setSort} />

                {/* Refresh */}
                <button
                    onClick={onRefresh}
                    className="inline-flex items-center gap-2 bg-accent text-white font-medium px-4 py-2 rounded hover:bg-accent-dark transition disabled:opacity-60"
                    disabled={refreshing}
                    aria-busy={refreshing}
                >
                    {refreshing ? (
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
        </div>
    );
}
