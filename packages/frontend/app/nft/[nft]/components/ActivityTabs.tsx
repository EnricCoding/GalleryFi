'use client';

import { useState, useMemo, useCallback } from 'react';
import { formatEther } from 'viem';
import type { NftActivity } from '@/lib/types/activity';

interface ActivityTabsProps {
    activity: NftActivity[];
    isNewlyCreated?: boolean;
    className?: string;
    showStatsSummary?: boolean;
    onRefreshData?: () => Promise<void>;
}

type TabId = 'activity' | 'offers' | 'history';

interface TabConfig {
    id: TabId;
    label: string;
    count: number;
    ariaLabel: string;
}

interface StatsSummary {
    totalSales: number;
    totalVolume: string;
    averagePrice: string;
    lastSalePrice: string | null;
}

const ACTIVITY_CONFIG = {
    SALE: {
        label: 'Sale',
        icon: (
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
            </div>
        ),
    },
    LISTING: {
        label: 'Listing',
        icon: (
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
            </div>
        ),
    },
    TRANSFER: {
        label: 'Transfer',
        icon: (
            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
            </div>
        ),
    },
    BID: {
        label: 'Bid',
        icon: (
            <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2h-2" />
                </svg>
            </div>
        ),
    },
    AUCTION_CREATED: {
        label: 'Auction created',
        icon: (
            <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v8m-4-4h8M5 3h14a2 2 0 012 2v7a7 7 0 11-14 0V5a2 2 0 00-2-2z" />
                </svg>
            </div>
        ),
    },
    AUCTION_ENDED: {
        label: 'Auction ended',
        icon: (
            <div className="w-8 h-8 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v8m-4-4h8M5 3h14a2 2 0 012 2v7a7 7 0 11-14 0V5a2 2 0 00-2-2z" />
                </svg>
            </div>
        ),
    },
} as const;

const DEFAULT_ACTIVITY_ICON = (
    <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
        <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    </div>
);

export default function ActivityTabs({
    activity,
    isNewlyCreated,
    className = '',
    showStatsSummary = false,
    onRefreshData
}: ActivityTabsProps) {
    const [activeTab, setActiveTab] = useState<TabId>('activity');

    /* ─────────── Navegación por teclado ─────────── */
    const handleKeyDown = useCallback((event: React.KeyboardEvent, tabId: TabId) => {
        const tabs: TabId[] = ['activity', 'offers', 'history'];
        const currentIndex = tabs.indexOf(tabId);

        switch (event.key) {
            case 'ArrowLeft':
                event.preventDefault();
                const prevIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
                setActiveTab(tabs[prevIndex]);
                break;
            case 'ArrowRight':
                event.preventDefault();
                const nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
                setActiveTab(tabs[nextIndex]);
                break;
            case 'Home':
                event.preventDefault();
                setActiveTab(tabs[0]);
                break;
            case 'End':
                event.preventDefault();
                setActiveTab(tabs[tabs.length - 1]);
                break;
        }
    }, []);

    const formatAddress = useCallback((address: string) => {
        if (!address) return 'Unknown';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }, []);

    const formatTime = useCallback((timestamp: string) => {
        try {
            const date = new Date(parseInt(timestamp, 10) * 1000);
            if (isNaN(date.getTime())) return 'Invalid date';

            return new Intl.DateTimeFormat('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            }).format(date);
        } catch {
            return 'Invalid date';
        }
    }, []);

    const formatPrice = useCallback((wei?: string | null) => {
        if (!wei) return null;
        try {
            const value = formatEther(BigInt(wei));
            const numValue = parseFloat(value);

            if (numValue === 0) return '0 ETH';
            if (numValue < 0.0001) return '< 0.0001 ETH';

            return `${numValue.toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 4
            })} ETH`;
        } catch (error) {
            return null;
        }
    }, []);

    const explorerBase = useMemo(() => {
        const cid = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 11155111);
        return cid === 11155111 ? 'https://sepolia.etherscan.io' : 'https://etherscan.io';
    }, []);

    const txUrl = useCallback(
        (hash?: string | null) => (hash ? `${explorerBase}/tx/${hash}` : null),
        [explorerBase],
    );

    const sortedActivity = useMemo(
        () =>
            [...activity].sort(
                (a, b) => Number(b.timestamp || '0') - Number(a.timestamp || '0'),
            ),
        [activity],
    );

    const salesHistory = useMemo(
        () => sortedActivity.filter((i) => i.activityType === 'SALE'),
        [sortedActivity],
    );

    const bids = useMemo(
        () => sortedActivity.filter((i) => i.activityType === 'BID'),
        [sortedActivity],
    );

    const stats = useMemo((): StatsSummary => {
        const sales = salesHistory;
        const totalSales = sales.length;

        if (totalSales === 0) {
            return {
                totalSales: 0,
                totalVolume: '0 ETH',
                averagePrice: '0 ETH',
                lastSalePrice: null
            };
        }

        let totalVolumeWei = BigInt(0);
        for (const sale of sales) {
            if (sale.price) {
                try {
                    totalVolumeWei += BigInt(sale.price);
                } catch {
                    // Skip invalid prices
                }
            }
        }

        const totalVolume = formatPrice(totalVolumeWei.toString()) || '0 ETH';
        const averageVolumeWei = totalSales > 0 ? totalVolumeWei / BigInt(totalSales) : BigInt(0);
        const averagePrice = formatPrice(averageVolumeWei.toString()) || '0 ETH';
        const lastSalePrice = sales[0]?.price ? formatPrice(sales[0].price) : null;

        return {
            totalSales,
            totalVolume,
            averagePrice,
            lastSalePrice
        };
    }, [salesHistory, formatPrice]);

    const tabs: TabConfig[] = useMemo(
        () => [
            {
                id: 'activity',
                label: 'Activity',
                count: sortedActivity.length,
                ariaLabel: `Activity tab with ${sortedActivity.length} items`
            },
            {
                id: 'offers',
                label: 'Offers',
                count: bids.length,
                ariaLabel: `Offers tab with ${bids.length} items`
            },
            {
                id: 'history',
                label: 'History',
                count: salesHistory.length,
                ariaLabel: `History tab with ${salesHistory.length} items`
            },
        ],
        [sortedActivity.length, bids.length, salesHistory.length],
    );

    const getActivityIcon = useCallback(
        (type: string) => ACTIVITY_CONFIG[type as keyof typeof ACTIVITY_CONFIG]?.icon || DEFAULT_ACTIVITY_ICON,
        [],
    );

    const getActivityLabel = useCallback(
        (type: string) => ACTIVITY_CONFIG[type as keyof typeof ACTIVITY_CONFIG]?.label || type,
        [],
    );

    const getPrimaryLine = useCallback((type: string, price?: string | null) => {
        const p = formatPrice(price);
        switch (type) {
            case 'SALE':
                return p ? `Sold for ${p}` : 'Sold';
            case 'LISTING':
                return p ? `Listed for ${p}` : 'Listed';
            case 'BID':
                return p ? `Bid of ${p}` : 'Bid placed';
            case 'TRANSFER':
                return 'Transfer';
            case 'AUCTION_CREATED':
                return 'Auction created';
            case 'AUCTION_ENDED':
                return 'Auction ended';
            default:
                return getActivityLabel(type);
        }
    }, [formatPrice, getActivityLabel]);

    /* ─────────── Componente de estadísticas ─────────── */
    const StatsCard = useCallback(() => (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl border border-blue-200/50 dark:border-blue-700/50">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Sales Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Sales</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.totalSales}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Volume</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.totalVolume}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Average</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.averagePrice}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Last Sale</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {stats.lastSalePrice || 'N/A'}
                    </p>
                </div>
            </div>
        </div>
    ), [stats]);

    const EmptyState = useCallback(
        ({
            icon,
            title,
            description,
        }: {
            icon: React.ReactNode;
            title: string;
            description: string;
        }) => (
            <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    {icon}
                </div>
                <p className="text-gray-600 dark:text-gray-300 font-medium">{title}</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{description}</p>
            </div>
        ),
        [],
    );

    const ActivityItem = useCallback(
        ({ item, showType = true }: { item: NftActivity; showType?: boolean }) => {
            const primary = getPrimaryLine(item.activityType, item.price);
            const url = txUrl(item.txHash);
            return (
                <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-600/50">
                    {getActivityIcon(item.activityType)}

                    <div className="flex-1">
                        <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0">
                                <p className="font-semibold text-gray-900 dark:text-white truncate">
                                    {showType ? getActivityLabel(item.activityType) : 'Sale'}
                                </p>
                                <p className="text-sm text-gray-700 dark:text-gray-300">{primary}</p>

                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
                                    {item.from && <span>From: {formatAddress(item.from)}</span>}
                                    {'to' in item && item.to && (
                                        <>
                                            <span className="text-gray-400">→</span>
                                            <span>To: {formatAddress(item.to)}</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="text-right shrink-0">
                                <p className="text-sm text-gray-500 dark:text-gray-400">{formatTime(item.timestamp)}</p>
                                {url && (
                                    <a
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline mt-1 transition-colors duration-200"
                                        aria-label="View transaction on blockchain explorer"
                                    >
                                        View tx
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h6m0 0v6m0-6L10 16" />
                                        </svg>
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            );
        },
        [formatAddress, formatTime, getActivityIcon, getActivityLabel, getPrimaryLine, txUrl],
    );

    return (
        <div
            className={`bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 ${className}`}
            role="region"
            aria-label="NFT Activity Information"
        >
            <div
                className="flex border-b border-gray-200 dark:border-gray-700"
                role="tablist"
                aria-label="Activity sections"
            >
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        onKeyDown={(e) => handleKeyDown(e, tab.id)}
                        className={`flex-1 px-6 py-4 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset ${activeTab === tab.id
                            ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/10'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                            }`}
                        aria-selected={activeTab === tab.id}
                        aria-controls={`${tab.id}-panel`}
                        aria-label={tab.ariaLabel}
                        role="tab"
                        tabIndex={activeTab === tab.id ? 0 : -1}
                    >
                        <span>{tab.label}</span>
                        {tab.count > 0 && (
                            <span
                                className="ml-2 px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 rounded-full"
                                aria-label={`${tab.count} items`}
                            >
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            <div className="p-6">
                {showStatsSummary && stats.totalSales > 0 && <StatsCard />}

                {activeTab === 'activity' && (
                    <div
                        className="space-y-4"
                        role="tabpanel"
                        id="activity-panel"
                        aria-labelledby="activity-tab"
                        tabIndex={0}
                    >
                        {sortedActivity.length > 0 ? (
                            <>
                                <div className="sr-only" aria-live="polite">
                                    Showing {sortedActivity.length} activity items
                                </div>
                                {sortedActivity.map((item, index) => (
                                    <div key={item.id} aria-posinset={index + 1} aria-setsize={sortedActivity.length}>
                                        <ActivityItem item={item} />
                                    </div>
                                ))}
                            </>
                        ) : (
                            <EmptyState
                                icon={
                                    isNewlyCreated ? (
                                        <svg className="w-8 h-8 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    ) : (
                                        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                    )
                                }
                                title={isNewlyCreated ? 'Loading activity...' : 'No activity yet'}
                                description={
                                    isNewlyCreated
                                        ? 'Your NFT data is being indexed. This may take a few moments.'
                                        : 'Activity will appear here when it occurs.'
                                }
                            />
                        )}
                    </div>
                )}

                {activeTab === 'offers' && (
                    <div
                        className="space-y-4"
                        role="tabpanel"
                        id="offers-panel"
                        aria-labelledby="offers-tab"
                        tabIndex={0}
                    >
                        {bids.length > 0 ? (
                            <>
                                <div className="sr-only" aria-live="polite">
                                    Showing {bids.length} offer items
                                </div>
                                {bids.map((item, index) => (
                                    <div key={item.id} aria-posinset={index + 1} aria-setsize={bids.length}>
                                        <ActivityItem item={item} />
                                    </div>
                                ))}
                            </>
                        ) : (
                            <div>
                                <EmptyState
                                    icon={
                                        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={1.5}
                                                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                                            />
                                        </svg>
                                    }
                                    title="No offers yet"
                                    description="Bids and offers will appear here when they are placed."
                                />
                                
                                {/* Enhanced troubleshooting section */}
                                <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
                                    <div className="flex items-center gap-2 mb-3">
                                        <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                                            Troubleshooting Bids
                                        </span>
                                    </div>
                                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-3">
                                        If you recently placed auction bids but don&apos;t see them here, it might be due to subgraph indexing delays.
                                    </p>
                                    {onRefreshData && (
                                        <button
                                            onClick={() => {
                                                onRefreshData();
                                            }}
                                            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-yellow-700 dark:text-yellow-200 hover:text-yellow-900 dark:hover:text-yellow-100 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 rounded-lg transition-colors duration-200 border border-yellow-300 dark:border-yellow-700"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                            Force Refresh Bid Data
                                        </button>
                                    )}
                                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                                        📊 Check browser console for detailed subgraph data logs
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'history' && (
                    <div
                        className="space-y-4"
                        role="tabpanel"
                        id="history-panel"
                        aria-labelledby="history-tab"
                        tabIndex={0}
                    >
                        {salesHistory.length > 0 ? (
                            <>
                                <div className="sr-only" aria-live="polite">
                                    Showing {salesHistory.length} sales history items
                                </div>
                                {salesHistory.map((item, index) => (
                                    <div key={item.id} aria-posinset={index + 1} aria-setsize={salesHistory.length}>
                                        <ActivityItem item={item} showType={false} />
                                    </div>
                                ))}
                            </>
                        ) : (
                            <EmptyState
                                icon={
                                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={1.5}
                                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2"
                                        />
                                    </svg>
                                }
                                title="No sales history"
                                description="Sales transactions will appear here when they occur."
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
